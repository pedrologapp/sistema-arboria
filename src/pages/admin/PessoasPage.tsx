import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Users, 
  GraduationCap, 
  Shield,
  Search,
  Plus,
  Upload,
  Loader2
} from 'lucide-react';
import PessoaCard from '@/components/admin/PessoaCard';
import ModalImportarCSV from '@/components/admin/ModalImportarCSV';
import ModalAdicionarUsuario from '@/components/admin/ModalAdicionarUsuario';

type TabType = 'alunos' | 'professores' | 'admins';

interface Inteligencia {
  id: number;
  nome: string;
  codigo: string;
}

const PessoasPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tabAtiva, setTabAtiva] = useState<TabType>('alunos');
  const [busca, setBusca] = useState('');
  const [filtroSerie, setFiltroSerie] = useState('');
  const [filtroTurma, setFiltroTurma] = useState('');
  const [filtroCasa, setFiltroCasa] = useState('');
  const [modalImportarAberto, setModalImportarAberto] = useState(false);
  const [modalAdicionarAberto, setModalAdicionarAberto] = useState(false);
  const [tipoAdicionar, setTipoAdicionar] = useState<'aluno' | 'professor' | 'admin'>('aluno');

  // Buscar institution_id do admin logado
  const { data: adminProfile } = useQuery({
    queryKey: ['admin-profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('institution_id')
        .eq('id', user?.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  const institutionId = adminProfile?.institution_id;

  // Buscar casas/inteligências
  const { data: casas } = useQuery({
    queryKey: ['inteligencias'],
    queryFn: async () => {
      const { data } = await supabase
        .from('inteligencias')
        .select('id, nome, codigo')
        .order('id');
      return (data || []) as Inteligencia[];
    }
  });

  // Buscar alunos (role = 'user')
  const { data: alunos, isLoading: loadingAlunos } = useQuery({
    queryKey: ['admin-alunos', institutionId],
    queryFn: async () => {
      // Primeiro buscar user_ids com role = 'user'
      const { data: roleUsers, error: roleError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'user');
      
      if (roleError) throw roleError;
      
      const userIds = roleUsers?.map(r => r.user_id) || [];
      
      if (userIds.length === 0) return [];
      
      // Buscar profiles desses users na instituição
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, nome, sobrenome, full_name, serie, turma, casa_id, avatar_url, created_at')
        .eq('institution_id', institutionId)
        .in('id', userIds)
        .order('full_name');
      
      if (profileError) throw profileError;
      return profiles || [];
    },
    enabled: !!institutionId
  });

  // Buscar professores (role = 'professor')
  const { data: professores, isLoading: loadingProfessores } = useQuery({
    queryKey: ['admin-professores', institutionId],
    queryFn: async () => {
      // Primeiro buscar user_ids com role = 'professor'
      const { data: roleUsers, error: roleError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'professor');
      
      if (roleError) throw roleError;
      
      const userIds = roleUsers?.map(r => r.user_id) || [];
      
      if (userIds.length === 0) return [];
      
      // Buscar profiles desses users na instituição
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, nome, sobrenome, full_name, avatar_url, created_at')
        .eq('institution_id', institutionId)
        .in('id', userIds)
        .order('full_name');
      
      if (profileError) throw profileError;
      
      // Buscar vínculos professor_casa
      const { data: vinculos } = await supabase
        .from('professor_casa')
        .select('professor_id, casa_id, eh_mentor_principal, ativo')
        .eq('institution_id', institutionId)
        .eq('ativo', true);
      
      // Combinar dados
      return profiles?.map(prof => ({
        ...prof,
        professor_casa: vinculos?.filter(v => v.professor_id === prof.id) || []
      })) || [];
    },
    enabled: !!institutionId
  });

  // Buscar admins (role = 'admin')
  const { data: admins, isLoading: loadingAdmins } = useQuery({
    queryKey: ['admin-admins', institutionId],
    queryFn: async () => {
      const { data: roleUsers, error: roleError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');
      
      if (roleError) throw roleError;
      
      const userIds = roleUsers?.map(r => r.user_id) || [];
      
      if (userIds.length === 0) return [];
      
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, nome, sobrenome, full_name, avatar_url, created_at')
        .eq('institution_id', institutionId)
        .in('id', userIds)
        .order('full_name');
      
      if (profileError) throw profileError;
      return profiles || [];
    },
    enabled: !!institutionId
  });

  // Obter nome da casa pelo ID
  const getNomeCasa = (casaId: number | null): string | null => {
    if (!casaId) return null;
    return casas?.find(c => c.id === casaId)?.nome || null;
  };

  // Filtrar alunos
  const alunosFiltrados = alunos?.filter(aluno => {
    const matchBusca = !busca || 
      aluno.full_name?.toLowerCase().includes(busca.toLowerCase()) ||
      aluno.nome?.toLowerCase().includes(busca.toLowerCase()) ||
      aluno.sobrenome?.toLowerCase().includes(busca.toLowerCase());
    const matchSerie = !filtroSerie || aluno.serie === filtroSerie;
    const matchTurma = !filtroTurma || aluno.turma === filtroTurma;
    const matchCasa = !filtroCasa || aluno.casa_id === Number(filtroCasa);
    
    return matchBusca && matchSerie && matchTurma && matchCasa;
  });

  // Séries e turmas únicas
  const seriesUnicas = [...new Set(alunos?.map(a => a.serie).filter(Boolean))].sort();
  const turmasUnicas = [...new Set(alunos?.map(a => a.turma).filter(Boolean))].sort();

  const tabs = [
    { id: 'alunos' as TabType, label: 'Alunos', icon: GraduationCap, count: alunos?.length || 0 },
    { id: 'professores' as TabType, label: 'Professores', icon: Users, count: professores?.length || 0 },
    { id: 'admins' as TabType, label: 'Admins', icon: Shield, count: admins?.length || 0 },
  ];

  const handleAdicionar = (tipo: 'aluno' | 'professor' | 'admin') => {
    setTipoAdicionar(tipo);
    setModalAdicionarAberto(true);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] px-4 py-6 pb-24">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Pessoas</h1>
        <p className="text-white/60 text-sm mt-1">
          Gerencie alunos e professores
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 mb-6">
        {tabs.map((tab) => {
          const IconTab = tab.icon;
          const isActive = tabAtiva === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => setTabAtiva(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                isActive 
                  ? 'text-white border-b-2 border-white' 
                  : 'text-white/40 hover:text-white/60'
              }`}
            >
              <IconTab className="w-4 h-4" />
              {tab.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                isActive ? 'bg-white/20' : 'bg-white/10'
              }`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Conteúdo */}
      <div className="space-y-4">
        {/* Tab Alunos */}
        {tabAtiva === 'alunos' && (
          <>
            {/* Filtros */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              <select
                value={filtroSerie}
                onChange={(e) => setFiltroSerie(e.target.value)}
                className="p-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm min-w-[100px]"
              >
                <option value="">Série</option>
                {seriesUnicas.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              
              <select
                value={filtroTurma}
                onChange={(e) => setFiltroTurma(e.target.value)}
                className="p-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm min-w-[90px]"
              >
                <option value="">Turma</option>
                {turmasUnicas.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              
              <select
                value={filtroCasa}
                onChange={(e) => setFiltroCasa(e.target.value)}
                className="p-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm min-w-[120px]"
              >
                <option value="">Casa</option>
                {casas?.map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>

            {/* Busca */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por nome..."
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-white/30"
              />
            </div>

            {/* Total */}
            <p className="text-sm text-white/50">
              {alunosFiltrados?.length || 0} alunos encontrados
            </p>

            {/* Lista Compacta - Estilo Discord */}
            {loadingAlunos ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 text-white/40 animate-spin" />
              </div>
            ) : (
              <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                {/* Header */}
                <div className="flex items-center px-4 py-2 border-b border-white/10 bg-white/5">
                  <span className="text-white/30 text-xs uppercase font-medium flex-1">Aluno</span>
                  <span className="text-white/30 text-xs uppercase font-medium w-24 text-right">Casa</span>
                </div>
                
                {/* Lista */}
                <div className="max-h-[50vh] overflow-y-auto">
                  {alunosFiltrados?.map((aluno) => (
                    <button
                      key={aluno.id}
                      onClick={() => navigate(`/admin/pessoas/aluno/${aluno.id}`)}
                      className="w-full flex items-center gap-3 py-2.5 px-4 hover:bg-white/5 transition-colors border-b border-white/5 last:border-b-0"
                    >
                      {/* Avatar 28px */}
                      {aluno.avatar_url ? (
                        <img 
                          src={aluno.avatar_url} 
                          alt={aluno.nome}
                          className="w-7 h-7 rounded-full object-cover flex-shrink-0" 
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                          {aluno.nome?.charAt(0).toUpperCase()}
                        </div>
                      )}
                      
                      {/* Nome + Série/Turma inline */}
                      <div className="flex-1 min-w-0 flex items-center">
                        <span className="text-white text-sm font-medium truncate">
                          {aluno.full_name || `${aluno.nome} ${aluno.sobrenome}`}
                        </span>
                        <span className="text-white/40 text-xs ml-2 flex-shrink-0">
                          {aluno.serie?.replace(' ano', '')} {aluno.turma}
                        </span>
                      </div>
                      
                      {/* Casa */}
                      <span className="text-white/50 text-xs w-24 text-right truncate">
                        {getNomeCasa(aluno.casa_id) || '-'}
                      </span>
                    </button>
                  ))}
                </div>
                
                {alunosFiltrados?.length === 0 && (
                  <div className="text-center py-12">
                    <GraduationCap className="w-12 h-12 text-white/20 mx-auto mb-3" />
                    <p className="text-white/40">Nenhum aluno encontrado</p>
                  </div>
                )}
              </div>
            )}

            {/* Botões de Ação */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => handleAdicionar('aluno')}
                className="flex-1 p-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Adicionar
              </button>
              <button
                onClick={() => setModalImportarAberto(true)}
                className="flex-1 p-3 bg-white text-black font-medium rounded-xl hover:bg-white/90 transition-colors flex items-center justify-center gap-2"
              >
                <Upload className="w-5 h-5" />
                Importar CSV
              </button>
            </div>
          </>
        )}

        {/* Tab Professores */}
        {tabAtiva === 'professores' && (
          <>
            {/* Total */}
            <p className="text-sm text-white/50">
              {professores?.length || 0} professores
            </p>

            {/* Lista */}
            {loadingProfessores ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 text-white/40 animate-spin" />
              </div>
            ) : (
              <div className="space-y-2">
                {professores?.map((prof) => {
                  const casaVinculo = prof.professor_casa?.find((pc: any) => pc.ativo);
                  return (
                    <PessoaCard
                      key={prof.id}
                      nome={prof.full_name || `${prof.nome} ${prof.sobrenome}`}
                      avatarUrl={prof.avatar_url}
                      subtitulo={casaVinculo 
                        ? `Mentor: ${getNomeCasa(casaVinculo.casa_id)}`
                        : 'Sem casa atribuída'
                      }
                      onClick={() => navigate(`/admin/pessoas/professor/${prof.id}`)}
                    />
                  );
                })}
                
                {professores?.length === 0 && (
                  <div className="text-center py-12">
                    <Users className="w-12 h-12 text-white/20 mx-auto mb-3" />
                    <p className="text-white/40">Nenhum professor cadastrado</p>
                  </div>
                )}
              </div>
            )}

            {/* Botões */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => handleAdicionar('professor')}
                className="flex-1 p-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Adicionar
              </button>
              <button
                onClick={() => setModalImportarAberto(true)}
                className="flex-1 p-3 bg-white text-black font-medium rounded-xl hover:bg-white/90 transition-colors flex items-center justify-center gap-2"
              >
                <Upload className="w-5 h-5" />
                Importar CSV
              </button>
            </div>
          </>
        )}

        {/* Tab Admins */}
        {tabAtiva === 'admins' && (
          <>
            {/* Total */}
            <p className="text-sm text-white/50">
              {admins?.length || 0} administradores
            </p>

            {/* Lista */}
            {loadingAdmins ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 text-white/40 animate-spin" />
              </div>
            ) : (
              <div className="space-y-2">
                {admins?.map((admin) => (
                  <PessoaCard
                    key={admin.id}
                    nome={admin.full_name || `${admin.nome} ${admin.sobrenome}`}
                    avatarUrl={admin.avatar_url}
                    subtitulo="Administrador"
                    onClick={() => {}}
                  />
                ))}
                
                {admins?.length === 0 && (
                  <div className="text-center py-12">
                    <Shield className="w-12 h-12 text-white/20 mx-auto mb-3" />
                    <p className="text-white/40">Nenhum admin cadastrado</p>
                  </div>
                )}
              </div>
            )}

            {/* Botão */}
            <div className="pt-4">
              <button
                onClick={() => handleAdicionar('admin')}
                className="w-full p-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Adicionar Admin
              </button>
            </div>
          </>
        )}
      </div>

      {/* Modal Importar CSV */}
      {modalImportarAberto && institutionId && (
        <ModalImportarCSV
          tipo={tabAtiva === 'professores' ? 'professores' : 'alunos'}
          institutionId={institutionId}
          onClose={() => setModalImportarAberto(false)}
        />
      )}

      {/* Modal Adicionar Usuário */}
      {modalAdicionarAberto && institutionId && (
        <ModalAdicionarUsuario
          tipo={tipoAdicionar}
          institutionId={institutionId}
          onClose={() => setModalAdicionarAberto(false)}
        />
      )}
    </div>
  );
};

export default PessoasPage;
