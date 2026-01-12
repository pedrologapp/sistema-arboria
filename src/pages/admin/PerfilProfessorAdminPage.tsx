import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  ArrowLeft, 
  User, 
  Key, 
  Trash2, 
  Loader2,
  Save,
  AlertTriangle,
  Check
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface Inteligencia {
  id: number;
  nome: string;
  codigo: string;
}

interface ProfessorCasa {
  id: string;
  casa_id: number;
  eh_mentor_principal: boolean;
  ativo: boolean;
}

const PerfilProfessorAdminPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Form state
  const [nome, setNome] = useState('');
  const [sobrenome, setSobrenome] = useState('');
  const [email, setEmail] = useState('');
  const [casaId, setCasaId] = useState<number | null>(null);
  const [ehMentorPrincipal, setEhMentorPrincipal] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  // Buscar dados do professor
  const { data: professor, isLoading } = useQuery({
    queryKey: ['admin-professor-perfil', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          professor_casa (
            id,
            casa_id,
            eh_mentor_principal,
            ativo
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as typeof data & { professor_casa: ProfessorCasa[] };
    },
    enabled: !!id
  });

  // Buscar email do usuário
  const { data: userEmail } = useQuery({
    queryKey: ['admin-professor-email', id],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;

      const { data, error } = await supabase.functions.invoke('get-user-email', {
        body: { userId: id }
      });
      
      if (error) throw error;
      return data?.email || null;
    },
    enabled: !!id
  });

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

  // Buscar institution_id do admin
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

  // Preencher form quando carregar
  useEffect(() => {
    if (professor) {
      setNome(professor.nome || '');
      setSobrenome(professor.sobrenome || '');
      
      const vinculoAtivo = professor.professor_casa?.find((pc) => pc.ativo);
      if (vinculoAtivo) {
        setCasaId(vinculoAtivo.casa_id);
        setEhMentorPrincipal(vinculoAtivo.eh_mentor_principal);
      } else {
        setCasaId(null);
        setEhMentorPrincipal(true);
      }
    }
  }, [professor]);

  useEffect(() => {
    if (userEmail) {
      setEmail(userEmail);
    }
  }, [userEmail]);

  // Salvar alterações
  const salvarMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Não autenticado');

      // 1. Atualizar dados via edge function
      const { data, error } = await supabase.functions.invoke('update-user', {
        body: {
          userId: id,
          email: email !== userEmail ? email : undefined,
          nome,
          sobrenome
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // 2. Atualizar vínculo com casa
      // Primeiro desativar todos os vínculos existentes
      await supabase
        .from('professor_casa')
        .update({ ativo: false })
        .eq('professor_id', id);

      // Se tem casa selecionada, criar/atualizar vínculo
      if (casaId && adminProfile?.institution_id) {
        const { error: casaError } = await supabase
          .from('professor_casa')
          .upsert({
            professor_id: id,
            casa_id: casaId,
            institution_id: adminProfile.institution_id,
            ano_letivo: new Date().getFullYear(),
            eh_mentor_principal: ehMentorPrincipal,
            ativo: true
          }, {
            onConflict: 'professor_id,casa_id,ano_letivo'
          });

        if (casaError) throw casaError;
      }
    },
    onSuccess: () => {
      toast.success('Alterações salvas com sucesso');
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ['admin-professor-perfil', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-professores'] });
    },
    onError: (error) => {
      toast.error('Erro ao salvar: ' + error.message);
    }
  });

  // Resetar senha
  const resetarSenhaMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Não autenticado');

      const { data, error } = await supabase.functions.invoke('reset-user-password', {
        body: { userId: id }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Senha resetada para: ${data?.newPassword || 'sobrenome123'}`);
      setShowConfirmReset(false);
    },
    onError: (error) => {
      toast.error('Erro ao resetar senha: ' + error.message);
    }
  });

  // Excluir professor
  const excluirMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Não autenticado');

      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId: id }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      toast.success('Professor excluído com sucesso');
      navigate('/admin/pessoas');
    },
    onError: (error) => {
      toast.error('Erro ao excluir: ' + error.message);
    }
  });

  // Detectar mudanças
  useEffect(() => {
    if (professor) {
      const vinculoAtivo = professor.professor_casa?.find((pc) => pc.ativo);
      const mudou = 
        nome !== (professor.nome || '') ||
        sobrenome !== (professor.sobrenome || '') ||
        casaId !== (vinculoAtivo?.casa_id || null) ||
        ehMentorPrincipal !== (vinculoAtivo?.eh_mentor_principal ?? true) ||
        (userEmail && email !== userEmail);
      setHasChanges(mudou);
    }
  }, [nome, sobrenome, casaId, ehMentorPrincipal, email, professor, userEmail]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  if (!professor) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <p className="text-white/60">Professor não encontrado</p>
      </div>
    );
  }

  const vinculoAtivo = professor.professor_casa?.find((pc) => pc.ativo);
  const getNomeCasa = (casaIdParam: number | null) => {
    if (!casaIdParam) return 'Sem casa';
    return casas?.find(c => c.id === casaIdParam)?.nome || 'Sem casa';
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] pb-24">
      {/* Header */}
      <div className="p-4">
        <button
          onClick={() => navigate('/admin/pessoas')}
          className="flex items-center gap-2 text-white/60 hover:text-white mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          Voltar
        </button>

        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center overflow-hidden">
            {professor.avatar_url ? (
              <img src={professor.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <User className="w-10 h-10 text-white/40" />
            )}
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">
              {professor.full_name || `${professor.nome} ${professor.sobrenome}`}
            </h1>
            <p className="text-white/60 text-sm">
              Professor • {vinculoAtivo ? `Mentor: ${getNomeCasa(vinculoAtivo.casa_id)}` : 'Sem casa'}
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Informações Básicas */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <h2 className="text-white font-medium mb-4">
            Informações
          </h2>

          <div className="space-y-4">
            <div>
              <label className="text-white/60 text-sm mb-1 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setHasChanges(true); }}
                className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm"
              />
            </div>

            <div>
              <label className="text-white/60 text-sm mb-1 block">Nome</label>
              <input
                type="text"
                value={nome}
                onChange={(e) => { setNome(e.target.value); setHasChanges(true); }}
                className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm"
              />
            </div>

            <div>
              <label className="text-white/60 text-sm mb-1 block">Sobrenome</label>
              <input
                type="text"
                value={sobrenome}
                onChange={(e) => { setSobrenome(e.target.value); setHasChanges(true); }}
                className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm"
              />
            </div>
          </div>
        </div>

        {/* Casa Vinculada */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <h2 className="text-white font-medium mb-4">
            Casa Vinculada
          </h2>

          <div className="space-y-4">
            <div>
              <label className="text-white/60 text-sm mb-1 block">Casa (Mentor)</label>
              <select
                value={casaId || ''}
                onChange={(e) => { setCasaId(Number(e.target.value) || null); setHasChanges(true); }}
                className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm"
              >
                <option value="">Sem casa atribuída</option>
                {casas?.map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>

            {casaId && (
              <button
                onClick={() => { setEhMentorPrincipal(!ehMentorPrincipal); setHasChanges(true); }}
                className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl w-full text-left"
              >
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                  ehMentorPrincipal ? 'bg-white border-white' : 'border-white/30'
                }`}>
                  {ehMentorPrincipal && <Check className="w-3 h-3 text-black" />}
                </div>
                <span className="text-white text-sm">É mentor principal desta casa</span>
              </button>
            )}
          </div>
        </div>

        {/* Ações */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <h2 className="text-white font-medium mb-4">
            Ações
          </h2>

          <div className="space-y-3">
            <button
              onClick={() => setShowConfirmReset(true)}
              className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-left hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Key className="w-5 h-5 text-yellow-500" />
                <div>
                  <p className="text-white font-medium">Resetar Senha</p>
                  <p className="text-white/40 text-sm">Volta para: sobrenome123</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setShowConfirmDelete(true)}
              className="w-full p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-left hover:bg-red-500/20 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Trash2 className="w-5 h-5 text-red-500" />
                <div>
                  <p className="text-red-400 font-medium">Excluir Professor</p>
                  <p className="text-red-400/60 text-sm">Esta ação não pode ser desfeita</p>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Botão Salvar */}
        {hasChanges && (
          <button
            onClick={() => salvarMutation.mutate()}
            disabled={salvarMutation.isPending}
            className="w-full p-4 bg-white text-black font-medium rounded-xl flex items-center justify-center gap-2"
          >
            {salvarMutation.isPending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Salvar Alterações
              </>
            )}
          </button>
        )}
      </div>

      {/* Modal Confirmar Reset Senha */}
      {showConfirmReset && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-[#1A1A1A] rounded-2xl p-6 w-full max-w-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
                <Key className="w-6 h-6 text-yellow-500" />
              </div>
              <h3 className="text-white text-lg font-medium">Resetar Senha</h3>
            </div>
            
            <p className="text-white/60 text-sm mb-6">
              A senha será resetada para <strong className="text-white">sobrenome123</strong>.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmReset(false)}
                className="flex-1 p-3 bg-white/10 text-white rounded-xl"
              >
                Cancelar
              </button>
              <button
                onClick={() => resetarSenhaMutation.mutate()}
                disabled={resetarSenhaMutation.isPending}
                className="flex-1 p-3 bg-yellow-500 text-black font-medium rounded-xl"
              >
                {resetarSenhaMutation.isPending ? 'Resetando...' : 'Resetar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmar Exclusão */}
      {showConfirmDelete && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-[#1A1A1A] rounded-2xl p-6 w-full max-w-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-white text-lg font-medium">Excluir Professor</h3>
            </div>
            
            <p className="text-white/60 text-sm mb-6">
              Tem certeza que deseja excluir <strong className="text-white">{professor.full_name}</strong>?
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmDelete(false)}
                className="flex-1 p-3 bg-white/10 text-white rounded-xl"
              >
                Cancelar
              </button>
              <button
                onClick={() => excluirMutation.mutate()}
                disabled={excluirMutation.isPending}
                className="flex-1 p-3 bg-red-500 text-white font-medium rounded-xl"
              >
                {excluirMutation.isPending ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PerfilProfessorAdminPage;
