import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Search, Users, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useStudent } from '@/contexts/StudentContext';
import { MembroCard } from '@/components/chat/MembroCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { getStatusOnline } from '@/utils/statusOnline';
import { toast } from 'sonner';

const CARGO_ORDER = ['lider', 'vice', 'coordenador', 'embaixador'];

const MembrosPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile, casa, casaColor } = useStudent();
  const [searchTerm, setSearchTerm] = useState('');

  // Debug: Log do contexto
  console.log('[MembrosPage] Context:', { 
    casaId: casa?.id, 
    institutionId: profile?.institution_id 
  });

  // Query: Buscar mentor da casa (professor)
  const { data: mentorCasa } = useQuery({
    queryKey: ['mentor-casa-membros', casa?.id, profile?.institution_id],
    queryFn: async () => {
      if (!casa?.id || !profile?.institution_id) return null;
      
      const { data, error } = await supabase
        .from('professor_casa')
        .select(`
          professor_id,
          profiles!professor_casa_professor_id_fkey(
            id, full_name, nome, sobrenome, avatar_url
          )
        `)
        .eq('casa_id', casa.id)
        .eq('institution_id', profile.institution_id)
        .eq('ativo', true)
        .eq('eh_mentor_principal', true)
        .maybeSingle();
      
      if (error) {
        console.error('Erro ao buscar mentor:', error);
        return null;
      }
      
      const profileData = data?.profiles as { id: string; full_name: string | null; nome: string | null; sobrenome: string | null; avatar_url: string | null } | null;
      return profileData || null;
    },
    staleTime: 60000,
    enabled: !!casa?.id && !!profile?.institution_id,
  });

  // Query: Buscar membros da casa com cargos
  const { data: membrosCasa = [], isLoading, error } = useQuery({
    queryKey: ['membros-casa-completo', casa?.id, profile?.institution_id],
    queryFn: async () => {
      console.log('[MembrosPage] Executando query:', { 
        casaId: casa?.id, 
        institutionId: profile?.institution_id 
      });
      
      if (!casa?.id || !profile?.institution_id) {
        console.warn('[MembrosPage] Dados não disponíveis ainda!');
        return [];
      }
      
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          nome,
          sobrenome,
          full_name,
          avatar_url,
          ultima_atividade,
          cargos_casa!cargos_casa_aluno_id_fkey(cargo, ativo)
        `)
        .eq('casa_id', casa.id)
        .eq('institution_id', profile.institution_id);
      
      if (error) {
        console.error('[MembrosPage] Erro na query:', error);
        throw error;
      }
      
      console.log('[MembrosPage] Membros encontrados:', data?.length);
      return data || [];
    },
    enabled: !!casa?.id && !!profile?.institution_id,
    staleTime: 30000,
    refetchOnMount: 'always',
  });

  // Calcular membros online
  const membrosOnline = useMemo(() => {
    return membrosCasa.filter(m => getStatusOnline(m.ultima_atividade).label === 'Online').length;
  }, [membrosCasa]);

  // Agrupar membros: Liderança vs Membros comuns
  const { lideranca, membrosComuns } = useMemo(() => {
    const lideranca = membrosCasa
      .filter(m => m.cargos_casa?.some(c => c.ativo && CARGO_ORDER.includes(c.cargo)))
      .sort((a, b) => {
        const cargoA = a.cargos_casa?.find(c => c.ativo)?.cargo || '';
        const cargoB = b.cargos_casa?.find(c => c.ativo)?.cargo || '';
        return CARGO_ORDER.indexOf(cargoA) - CARGO_ORDER.indexOf(cargoB);
      });

    const membrosComuns = membrosCasa
      .filter(m => !m.cargos_casa?.some(c => c.ativo && CARGO_ORDER.includes(c.cargo)))
      .sort((a, b) => {
        const nomeA = a.nome || a.full_name || '';
        const nomeB = b.nome || b.full_name || '';
        return nomeA.localeCompare(nomeB);
      });

    return { lideranca, membrosComuns };
  }, [membrosCasa]);

  // Filtrar mentor por busca
  const mentorFiltrado = useMemo(() => {
    if (!mentorCasa) return null;
    if (!searchTerm) return mentorCasa;
    const termo = searchTerm.toLowerCase();
    const nome = (mentorCasa.nome || mentorCasa.full_name || '').toLowerCase();
    return nome.includes(termo) ? mentorCasa : null;
  }, [mentorCasa, searchTerm]);

  // Filtrar por busca (nome e cargo)
  const liderancaFiltrada = useMemo(() => {
    if (!searchTerm) return lideranca;
    const termo = searchTerm.toLowerCase();
    return lideranca.filter(m => {
      const nome = (m.nome || m.full_name || '').toLowerCase();
      const sobrenome = (m.sobrenome || '').toLowerCase();
      const cargo = m.cargos_casa?.find(c => c.ativo)?.cargo || '';
      return nome.includes(termo) || sobrenome.includes(termo) || cargo.includes(termo);
    });
  }, [lideranca, searchTerm]);

  const membrosComunsFiltrados = useMemo(() => {
    if (!searchTerm) return membrosComuns;
    const termo = searchTerm.toLowerCase();
    return membrosComuns.filter(m => {
      const nome = (m.nome || m.full_name || '').toLowerCase();
      const sobrenome = (m.sobrenome || '').toLowerCase();
      return nome.includes(termo) || sobrenome.includes(termo);
    });
  }, [membrosComuns, searchTerm]);

  // Função para iniciar conversa privada
  const iniciarConversa = async (outroUsuarioId: string) => {
    console.log('=== INICIANDO CONVERSA (MembrosPage) ===');
    console.log('1. Outro usuário ID:', outroUsuarioId);
    console.log('2. Meu ID:', profile?.id);
    console.log('3. Institution ID:', profile?.institution_id);

    if (!profile?.id || !profile?.institution_id) {
      console.error('❌ ERRO: userId ou institution_id não definido!');
      toast.error('Erro: dados do usuário não carregados');
      return;
    }

    try {
      // 1. Buscar conversas do usuário atual
      console.log('4. Buscando minhas conversas...');
      const { data: minhasConversas, error: erroMinhas } = await supabase
        .from('conversa_participantes')
        .select('conversa_id')
        .eq('usuario_id', profile.id);

      console.log('5. Minhas conversas:', minhasConversas);
      if (erroMinhas) console.error('ERRO ao buscar minhas conversas:', erroMinhas);

      if (minhasConversas?.length) {
        // 2. Verificar se o outro usuário está em alguma dessas conversas
        console.log('6. Verificando se existe conversa com o outro...');
        const { data: conversaComum, error: erroComum } = await supabase
          .from('conversa_participantes')
          .select('conversa_id')
          .eq('usuario_id', outroUsuarioId)
          .in('conversa_id', minhasConversas.map(c => c.conversa_id))
          .limit(1)
          .maybeSingle();

        console.log('7. Conversa existente:', conversaComum);
        if (erroComum) console.error('ERRO ao buscar conversa existente:', erroComum);

        if (conversaComum) {
          console.log('8. ✅ Conversa já existe! Navegando para:', conversaComum.conversa_id);
          navigate(`/aluno/chat/dm/${conversaComum.conversa_id}`);
          return;
        }
      }

      // 3. Criar nova conversa - gerar UUID no frontend para evitar problema de RLS no SELECT
      console.log('9. Criando nova conversa...');
      const novaConversaId = crypto.randomUUID();
      
      const { error: erroConversa } = await supabase
        .from('conversas_privadas')
        .insert({ id: novaConversaId, institution_id: profile.institution_id });

      console.log('10. Nova conversa ID:', novaConversaId);
      if (erroConversa) {
        console.error('❌ ERRO ao criar conversa:', erroConversa);
        toast.error('Erro ao criar conversa: ' + erroConversa.message);
        return;
      }

      // 4. Adicionar participantes
      console.log('11. Adicionando participantes...');
      const { error: erroParticipantes } = await supabase
        .from('conversa_participantes')
        .insert([
          { conversa_id: novaConversaId, usuario_id: profile.id },
          { conversa_id: novaConversaId, usuario_id: outroUsuarioId }
        ]);

      if (erroParticipantes) {
        console.error('❌ ERRO ao adicionar participantes:', erroParticipantes);
        toast.error('Erro ao adicionar participantes: ' + erroParticipantes.message);
        return;
      }

      console.log('12. ✅ SUCESSO! Navegando para:', novaConversaId);
      navigate(`/aluno/chat/dm/${novaConversaId}`);
    } catch (error) {
      console.error('❌ ERRO GERAL:', error);
      toast.error('Erro ao iniciar conversa');
    }
  };

  const totalFiltrado = liderancaFiltrada.length + membrosComunsFiltrados.length;

  return (
    <div className="py-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/aluno/chat')}
            className="text-white/60 hover:text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold text-white">Membros</h1>
            <p className="text-xs text-white/50">
              {membrosOnline} online de {membrosCasa.length}
            </p>
          </div>
        </div>
      </div>

      {/* Campo de busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
        <Input
          placeholder="Buscar por nome ou cargo..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/50" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-red-400 mb-2">Erro ao carregar membros</p>
          <p className="text-white/50 text-sm mb-4">{(error as Error).message}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['membros-casa-completo'] })}
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Tentar novamente
          </Button>
        </div>
      ) : totalFiltrado === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Users className="w-12 h-12 text-white/20 mb-3" />
          <p className="text-white/50">
            {searchTerm ? 'Nenhum membro encontrado' : 'Nenhum membro na casa'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Seção: Mentor da Casa */}
          {mentorFiltrado && (
            <div className="space-y-1">
              <h3 className="text-xs font-medium text-white/50 uppercase tracking-wider px-1 flex items-center gap-1.5 mb-2">
                <span>🎓</span> Mentor da Casa
              </h3>
              <div className="space-y-1 bg-white/5 rounded-lg overflow-hidden">
                <MembroCard
                  membro={{
                    id: mentorFiltrado.id,
                    nome: mentorFiltrado.nome,
                    sobrenome: mentorFiltrado.sobrenome,
                    full_name: mentorFiltrado.full_name,
                    avatar_url: mentorFiltrado.avatar_url,
                    ultima_atividade: null,
                    cargos_casa: []
                  }}
                  isMe={false}
                  hideStatus={true}
                  onIniciarConversa={iniciarConversa}
                  casaColor={casaColor}
                />
              </div>
            </div>
          )}

          {/* Seção: Liderança */}
          {liderancaFiltrada.length > 0 && (
            <div className="space-y-1">
              <h3 className="text-xs font-medium text-white/50 uppercase tracking-wider px-1 flex items-center gap-1.5 mb-2">
                <span>🦅</span> Liderança
              </h3>
              <div className="space-y-1 bg-white/5 rounded-lg overflow-hidden">
                {liderancaFiltrada.map((membro) => (
                  <MembroCard
                    key={membro.id}
                    membro={membro}
                    isMe={membro.id === profile?.id}
                    onIniciarConversa={iniciarConversa}
                    casaColor={casaColor}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Seção: Membros */}
          {membrosComunsFiltrados.length > 0 && (
            <div className="space-y-1">
              <h3 className="text-xs font-medium text-white/50 uppercase tracking-wider px-1 flex items-center gap-1.5 mb-2">
                <span>👥</span> Membros ({membrosComunsFiltrados.length})
              </h3>
              <div className="space-y-1 bg-white/5 rounded-lg overflow-hidden">
                {membrosComunsFiltrados.map((membro) => (
                  <MembroCard
                    key={membro.id}
                    membro={membro}
                    isMe={membro.id === profile?.id}
                    onIniciarConversa={iniciarConversa}
                    casaColor={casaColor}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MembrosPage;
