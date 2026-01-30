import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  ArrowLeft, 
  Key, 
  Trash2, 
  Loader2,
  Save,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { toast } from 'sonner';
import AdminAvatarUpload from '@/components/admin/AdminAvatarUpload';

const SERIES = ['6º ano', '7º ano', '8º ano', '9º ano'];
const TURMAS = ['A', 'B', 'C', 'D'];

interface Inteligencia {
  id: number;
  nome: string;
  codigo: string;
  cor_hex: string | null;
}

const PerfilAlunoAdminPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Form state
  const [nome, setNome] = useState('');
  const [sobrenome, setSobrenome] = useState('');
  const [email, setEmail] = useState('');
  const [serie, setSerie] = useState('');
  const [turma, setTurma] = useState('');
  const [casaId, setCasaId] = useState<number | null>(null);
  const [scores, setScores] = useState<Record<number, number>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showConfirmResetDados, setShowConfirmResetDados] = useState(false);
  const [confirmacaoNome, setConfirmacaoNome] = useState('');

  // Buscar dados do aluno
  const { data: aluno, isLoading } = useQuery({
    queryKey: ['admin-aluno-perfil', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id
  });

  // Buscar email do usuário
  const { data: userEmail } = useQuery({
    queryKey: ['admin-aluno-email', id],
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
        .select('id, nome, codigo, cor_hex')
        .order('id');
      return (data || []) as Inteligencia[];
    }
  });

  // Buscar scores de inteligência do aluno
  const { data: inteligenciaScores } = useQuery({
    queryKey: ['admin-aluno-scores', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inteligencia_scores')
        .select('inteligencia_id, score_atual')
        .eq('aluno_id', id);

      if (error) throw error;
      
      const scoresMap: Record<number, number> = {};
      data?.forEach(item => {
        scoresMap[item.inteligencia_id] = Math.round(item.score_atual);
      });
      return scoresMap;
    },
    enabled: !!id
  });

  // Preencher form quando carregar
  useEffect(() => {
    if (aluno) {
      setNome(aluno.nome || '');
      setSobrenome(aluno.sobrenome || '');
      setSerie(aluno.serie || '');
      setTurma(aluno.turma || '');
      setCasaId(aluno.casa_id);
    }
  }, [aluno]);

  useEffect(() => {
    if (userEmail) {
      setEmail(userEmail);
    }
  }, [userEmail]);

  useEffect(() => {
    if (inteligenciaScores) {
      setScores(inteligenciaScores);
    }
  }, [inteligenciaScores]);

  // Atualizar score de inteligência
  const handleScoreChange = (intId: number, valor: string) => {
    const num = Math.min(100, Math.max(0, parseInt(valor) || 0));
    setScores(prev => ({ ...prev, [intId]: num }));
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
          serie,
          turma,
          casa: casaId
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // 2. Atualizar scores de inteligência
      const anoLetivo = new Date().getFullYear();
      for (const [intId, scoreAtual] of Object.entries(scores)) {
        const { error: scoreError } = await supabase
          .from('inteligencia_scores')
          .upsert({
            aluno_id: id,
            inteligencia_id: parseInt(intId),
            score_atual: scoreAtual,
            ano_letivo: anoLetivo,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'aluno_id,inteligencia_id,ano_letivo'
          });

        if (scoreError) {
          console.error('Erro ao atualizar score:', scoreError);
        }
      }
    },
    onSuccess: () => {
      toast.success('Alterações salvas com sucesso');
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ['admin-aluno-perfil', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-aluno-scores', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-alunos'] });
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

  // Excluir aluno
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
      toast.success('Aluno excluído com sucesso');
      navigate('/admin/pessoas');
    },
    onError: (error) => {
      toast.error('Erro ao excluir: ' + error.message);
    }
  });

  // Resetar dados do aluno (zera observações, alertas, scores)
  const resetarDadosMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Não autenticado');

      const { data, error } = await supabase.functions.invoke('reset-aluno-dados', {
        body: { 
          alunoId: id,
          confirmacaoNome: confirmacaoNome.trim()
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      const { resumo } = data;
      toast.success(
        `Aluno resetado! ${resumo.observacoes} obs, ${resumo.alertas} alertas, ${resumo.scores_resetados} scores.`,
        { duration: 5000 }
      );
      setShowConfirmResetDados(false);
      setConfirmacaoNome('');
      queryClient.invalidateQueries({ queryKey: ['admin-aluno-perfil', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-aluno-scores', id] });
    },
    onError: (error) => {
      toast.error('Erro ao resetar: ' + error.message);
    }
  });

  // Detectar mudanças
  useEffect(() => {
    if (aluno) {
      const mudou = 
        nome !== (aluno.nome || '') ||
        sobrenome !== (aluno.sobrenome || '') ||
        serie !== (aluno.serie || '') ||
        turma !== (aluno.turma || '') ||
        casaId !== aluno.casa_id ||
        (userEmail && email !== userEmail);
      
      // Check scores changes
      if (inteligenciaScores) {
        const scoresChanged = Object.entries(scores).some(([intId, score]) => {
          return inteligenciaScores[parseInt(intId)] !== score;
        });
        setHasChanges(mudou || scoresChanged);
      } else {
        setHasChanges(mudou);
      }
    }
  }, [nome, sobrenome, serie, turma, casaId, email, aluno, userEmail, scores, inteligenciaScores]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  if (!aluno) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <p className="text-white/60">Aluno não encontrado</p>
      </div>
    );
  }

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
          <AdminAvatarUpload
            userId={id!}
            currentAvatarUrl={aluno.avatar_url}
            onUploadSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['admin-aluno-perfil', id] });
            }}
            size="md"
          />
          <div>
            <h1 className="text-xl font-semibold text-white">
              {aluno.full_name || `${aluno.nome} ${aluno.sobrenome}`}
            </h1>
            <p className="text-white/60 text-sm">
              {aluno.serie} {aluno.turma} • {getNomeCasa(aluno.casa_id)}
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-white/60 text-sm mb-1 block">Série</label>
                <select
                  value={serie}
                  onChange={(e) => { setSerie(e.target.value); setHasChanges(true); }}
                  className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm"
                >
                  <option value="">Selecione</option>
                  {SERIES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-white/60 text-sm mb-1 block">Turma</label>
                <select
                  value={turma}
                  onChange={(e) => { setTurma(e.target.value); setHasChanges(true); }}
                  className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm"
                >
                  <option value="">Selecione</option>
                  {TURMAS.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-white/60 text-sm mb-1 block">Casa</label>
              <select
                value={casaId || ''}
                onChange={(e) => { setCasaId(Number(e.target.value) || null); setHasChanges(true); }}
                className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm"
              >
                <option value="">Sem casa</option>
                {casas?.map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Inteligências */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <h2 className="text-white font-medium mb-4">
            Inteligências (%)
          </h2>

          <div className="space-y-4">
            {casas?.map((casa) => {
              const valor = scores[casa.id] ?? 35;
              
              return (
                <div key={casa.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-white/80 text-sm">{casa.nome}</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={valor}
                      onChange={(e) => handleScoreChange(casa.id, e.target.value)}
                      className="w-16 p-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm text-center"
                    />
                  </div>
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-300"
                      style={{ 
                        width: `${valor}%`,
                        backgroundColor: casa.cor_hex || '#6366f1'
                      }}
                    />
                  </div>
                </div>
              );
            })}
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
              onClick={() => setShowConfirmResetDados(true)}
              className="w-full p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl text-left hover:bg-orange-500/20 transition-colors"
            >
              <div className="flex items-center gap-3">
                <RotateCcw className="w-5 h-5 text-orange-500" />
                <div>
                  <p className="text-orange-400 font-medium">Resetar Dados</p>
                  <p className="text-orange-400/60 text-sm">Zera observações, alertas e scores</p>
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
                  <p className="text-red-400 font-medium">Excluir Aluno</p>
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
              O aluno precisará trocar a senha no próximo login.
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
              <h3 className="text-white text-lg font-medium">Excluir Aluno</h3>
            </div>
            
            <p className="text-white/60 text-sm mb-6">
              Tem certeza que deseja excluir <strong className="text-white">{aluno.full_name}</strong>? 
              Esta ação não pode ser desfeita e todos os dados serão perdidos.
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

      {/* Modal Confirmar Reset de Dados */}
      {showConfirmResetDados && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-[#1A1A1A] rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center">
                <RotateCcw className="w-6 h-6 text-orange-500" />
              </div>
              <h3 className="text-white text-lg font-medium">Resetar Aluno</h3>
            </div>
            
            <p className="text-white/60 text-sm mb-4">
              Você está prestes a resetar:
            </p>
            
            <p className="text-white font-semibold text-lg mb-4 text-center bg-white/5 p-3 rounded-lg">
              {aluno.full_name || `${aluno.nome} ${aluno.sobrenome}`}
            </p>
            
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 mb-4">
              <p className="text-orange-400 text-sm font-medium mb-2">
                Isso irá DELETAR permanentemente:
              </p>
              <ul className="text-orange-400/80 text-sm space-y-1">
                <li>• Todas as observações</li>
                <li>• Todos os alertas/sugestões da IA</li>
                <li>• Todas as ações registradas</li>
                <li>• Todas as evidências de inteligência</li>
                <li>• Histórico de scores</li>
              </ul>
              <p className="text-orange-400/80 text-sm mt-2">
                Os scores serão resetados para 35 (inicial).
              </p>
            </div>
            
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
              <p className="text-red-400 text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Esta ação NÃO pode ser desfeita!
              </p>
            </div>
            
            <div className="mb-4">
              <label className="text-white/60 text-sm mb-2 block">
                Para confirmar, digite o nome do aluno:
              </label>
              <input
                type="text"
                value={confirmacaoNome}
                onChange={(e) => setConfirmacaoNome(e.target.value)}
                placeholder={aluno.full_name || `${aluno.nome} ${aluno.sobrenome}`}
                className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-white/30"
              />
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowConfirmResetDados(false);
                  setConfirmacaoNome('');
                }}
                className="flex-1 p-3 bg-white/10 text-white rounded-xl"
              >
                Cancelar
              </button>
              <button
                onClick={() => resetarDadosMutation.mutate()}
                disabled={
                  resetarDadosMutation.isPending || 
                  confirmacaoNome.toLowerCase().trim() !== (aluno.full_name || `${aluno.nome} ${aluno.sobrenome}`).toLowerCase().trim()
                }
                className="flex-1 p-3 bg-orange-500 text-white font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resetarDadosMutation.isPending ? 'Resetando...' : 'Confirmar Reset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PerfilAlunoAdminPage;
