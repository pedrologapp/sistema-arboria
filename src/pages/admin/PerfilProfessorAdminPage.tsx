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
  Check,
  CheckSquare
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface Inteligencia {
  id: number;
  nome: string;
  codigo: string;
  emoji?: string;
}

interface ProfessorCasa {
  id: string;
  casa_id: number;
  eh_mentor_principal: boolean;
  ativo: boolean;
}

interface Turma {
  id: string;
  nome: string;
  serie: number;
  turma_letra: string;
}

type Segmento = 'infantil' | 'fundamental1' | 'fundamental2';

const segmentoLabels: Record<Segmento, string> = {
  infantil: 'Infantil',
  fundamental1: 'Fundamental 1',
  fundamental2: 'Fundamental 2',
};

const SERIES_POR_SEGMENTO: Record<Segmento, number[]> = {
  infantil: [2, 3, 4, 5],
  fundamental1: [1, 2, 3, 4, 5],
  fundamental2: [6, 7, 8, 9],
};

const PerfilProfessorAdminPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Form state
  const [nome, setNome] = useState('');
  const [sobrenome, setSobrenome] = useState('');
  const [email, setEmail] = useState('');
  const [segmento, setSegmento] = useState<Segmento>('fundamental2');
  const [casaId, setCasaId] = useState<number | null>(null);
  const [ehMentorPrincipal, setEhMentorPrincipal] = useState(true);
  const [turmasSelecionadas, setTurmasSelecionadas] = useState<string[]>([]);
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

  // Buscar turmas vinculadas do professor (para Infantil/F1)
  const { data: turmasVinculadas } = useQuery({
    queryKey: ['professor-turmas-vinculadas', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('professor_turma')
        .select(`
          turma_id,
          turmas (id, nome, serie, turma_letra)
        `)
        .eq('professor_id', id)
        .eq('ativo', true);
      
      return data?.map(v => v.turmas as Turma) || [];
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
        .select('id, nome, codigo, emoji')
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

  // Buscar turmas disponíveis para o segmento
  const { data: turmasDisponiveis } = useQuery({
    queryKey: ['turmas-por-segmento', segmento, adminProfile?.institution_id],
    queryFn: async () => {
      const series = SERIES_POR_SEGMENTO[segmento] || [];
      
      const { data } = await supabase
        .from('turmas')
        .select('id, nome, serie, turma_letra')
        .eq('institution_id', adminProfile?.institution_id)
        .in('serie', series)
        .order('serie')
        .order('turma_letra');
      
      return data || [];
    },
    enabled: !!adminProfile?.institution_id && segmento !== 'fundamental2'
  });

  // Preencher form quando carregar
  useEffect(() => {
    if (professor) {
      setNome(professor.nome || '');
      setSobrenome(professor.sobrenome || '');
      setSegmento((professor.segmento as Segmento) || 'fundamental2');
      
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

  // Preencher turmas selecionadas
  useEffect(() => {
    if (turmasVinculadas && turmasVinculadas.length > 0) {
      setTurmasSelecionadas(turmasVinculadas.map(t => t.id));
    }
  }, [turmasVinculadas]);

  useEffect(() => {
    if (userEmail) {
      setEmail(userEmail);
    }
  }, [userEmail]);

  const toggleTurma = (turmaId: string) => {
    setTurmasSelecionadas(prev => 
      prev.includes(turmaId)
        ? prev.filter(tid => tid !== turmaId)
        : [...prev, turmaId]
    );
    setHasChanges(true);
  };

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
          sobrenome,
          segmento
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // 2. Se for fundamental2, atualizar vínculo com casa
      if (segmento === 'fundamental2') {
        // Desativar todos os vínculos de casa existentes
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

        // Limpar vínculos de turma (professor não é mais de Infantil/F1)
        await supabase
          .from('professor_turma')
          .update({ ativo: false })
          .eq('professor_id', id);

      } else {
        // Para infantil/fundamental1, atualizar vínculos de turma
        // Desativar vínculos de casa
        await supabase
          .from('professor_casa')
          .update({ ativo: false })
          .eq('professor_id', id);

        // Desativar todos os vínculos de turma existentes
        await supabase
          .from('professor_turma')
          .update({ ativo: false })
          .eq('professor_id', id);

        // Criar novos vínculos de turma
        if (turmasSelecionadas.length > 0 && adminProfile?.institution_id) {
          const novosVinculos = turmasSelecionadas.map(turmaId => ({
            professor_id: id,
            turma_id: turmaId,
            institution_id: adminProfile.institution_id,
            ano_letivo: new Date().getFullYear(),
            eh_regente: true,
            ativo: true
          }));

          const { error: turmaError } = await supabase
            .from('professor_turma')
            .upsert(novosVinculos, {
              onConflict: 'professor_id,turma_id,ano_letivo'
            });

          if (turmaError) throw turmaError;
        }
      }
    },
    onSuccess: () => {
      toast.success('Alterações salvas com sucesso');
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ['admin-professor-perfil', id] });
      queryClient.invalidateQueries({ queryKey: ['professor-turmas-vinculadas', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-professores'] });
      queryClient.invalidateQueries({ queryKey: ['quadro-turmas-professores'] });
      queryClient.invalidateQueries({ queryKey: ['quadro-casas-mentores'] });
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
      const turmasOriginais = turmasVinculadas?.map(t => t.id).sort().join(',') || '';
      const turmasAtuais = turmasSelecionadas.sort().join(',');
      
      const mudou = 
        nome !== (professor.nome || '') ||
        sobrenome !== (professor.sobrenome || '') ||
        segmento !== (professor.segmento || 'fundamental2') ||
        casaId !== (vinculoAtivo?.casa_id || null) ||
        ehMentorPrincipal !== (vinculoAtivo?.eh_mentor_principal ?? true) ||
        turmasOriginais !== turmasAtuais ||
        (userEmail && email !== userEmail);
      setHasChanges(mudou);
    }
  }, [nome, sobrenome, segmento, casaId, ehMentorPrincipal, email, turmasSelecionadas, professor, userEmail, turmasVinculadas]);

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
    const casa = casas?.find(c => c.id === casaIdParam);
    return casa ? `${casa.emoji || ''} ${casa.nome}` : 'Sem casa';
  };

  const getSubtitulo = () => {
    if (segmento === 'fundamental2') {
      return vinculoAtivo ? `Mentor: ${getNomeCasa(vinculoAtivo.casa_id)}` : 'Sem casa';
    }
    const numTurmas = turmasVinculadas?.length || 0;
    return numTurmas > 0 ? `${numTurmas} turma(s) vinculada(s)` : 'Sem turmas';
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
              Professor • {segmentoLabels[segmento]} • {getSubtitulo()}
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

        {/* Segmento */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <h2 className="text-white font-medium mb-4">
            Segmento
          </h2>

          <select
            value={segmento}
            onChange={(e) => {
              const novoSegmento = e.target.value as Segmento;
              setSegmento(novoSegmento);
              // Limpar vínculos anteriores ao mudar segmento
              if (novoSegmento === 'fundamental2') {
                setTurmasSelecionadas([]);
              } else {
                setCasaId(null);
              }
              setHasChanges(true);
            }}
            className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm"
          >
            {Object.entries(segmentoLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        {/* Casa Vinculada (apenas F2) */}
        {segmento === 'fundamental2' && (
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
                    <option key={c.id} value={c.id}>{c.emoji} {c.nome}</option>
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
        )}

        {/* Turmas Vinculadas (Infantil / F1) */}
        {segmento !== 'fundamental2' && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <h2 className="text-white font-medium mb-4">
              Turmas Vinculadas
            </h2>

            {turmasDisponiveis && turmasDisponiveis.length > 0 ? (
              <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                {turmasDisponiveis.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleTurma(t.id)}
                    className={`p-3 rounded-lg border text-sm flex items-center gap-2 transition-colors ${
                      turmasSelecionadas.includes(t.id)
                        ? 'bg-white/20 border-white text-white'
                        : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    <CheckSquare className={`w-4 h-4 ${
                      turmasSelecionadas.includes(t.id) ? 'text-green-400' : 'text-white/30'
                    }`} />
                    {t.nome}
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-center">
                <p className="text-amber-400 text-sm">
                  Nenhuma turma cadastrada para {segmentoLabels[segmento]}
                </p>
              </div>
            )}

            {turmasSelecionadas.length > 0 && (
              <p className="text-xs text-white/40 mt-3">
                {turmasSelecionadas.length} turma(s) selecionada(s)
              </p>
            )}
          </div>
        )}

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
