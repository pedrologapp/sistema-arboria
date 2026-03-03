import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { X, Loader2, Check, Copy, Eye, EyeOff, CheckSquare } from 'lucide-react';
import { toast } from 'sonner';

interface ModalAdicionarUsuarioProps {
  tipo: 'aluno' | 'professor' | 'admin';
  institutionId: string;
  onClose: () => void;
}

type Segmento = 'infantil' | 'fundamental1' | 'fundamental2';

const segmentoLabels: Record<Segmento, string> = {
  infantil: 'Infantil',
  fundamental1: 'Fundamental 1',
  fundamental2: 'Fundamental 2',
};

const seriesPorSegmento: Record<Segmento, string[]> = {
  infantil: ['Maternalzinho(2)', 'Maternal(3)', 'Grupo IV', 'Grupo V'],
  fundamental1: ['1º ano', '2º ano', '3º ano', '4º ano', '5º ano'],
  fundamental2: ['6º ano', '7º ano', '8º ano', '9º ano'],
};

const ModalAdicionarUsuario = ({ tipo, institutionId, onClose }: ModalAdicionarUsuarioProps) => {
  const queryClient = useQueryClient();
  const [nome, setNome] = useState('');
  const [sobrenome, setSobrenome] = useState('');
  const [email, setEmail] = useState('');
  const [serie, setSerie] = useState('');
  const [turma, setTurma] = useState('');
  const [casaId, setCasaId] = useState('');
  const [segmento, setSegmento] = useState<Segmento>('fundamental2');
  const [turmasSelecionadas, setTurmasSelecionadas] = useState<string[]>([]);
  const [ehRegente, setEhRegente] = useState(true);
  const [senhaGerada, setSenhaGerada] = useState<string | null>(null);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [criando, setCriando] = useState(false);

  // Buscar casas
  const { data: casas } = useQuery({
    queryKey: ['inteligencias'],
    queryFn: async () => {
      const { data } = await supabase
        .from('inteligencias')
        .select('id, nome, codigo, emoji')
        .order('id');
      return data || [];
    }
  });

  // Buscar turmas disponíveis para o segmento
  const { data: turmasDisponiveis } = useQuery({
    queryKey: ['turmas-por-segmento', segmento, institutionId],
    queryFn: async () => {
      const { data } = await supabase
        .from('turmas')
        .select('id, nome, serie, turma_letra, segmento')
        .eq('institution_id', institutionId)
        .eq('segmento', segmento)
        .order('serie')
        .order('turma_letra');
      
      return data || [];
    },
    enabled: (tipo === 'professor' && segmento !== 'fundamental2') || tipo === 'aluno'
  });

  const toggleTurma = (turmaId: string) => {
    setTurmasSelecionadas(prev => 
      prev.includes(turmaId)
        ? prev.filter(id => id !== turmaId)
        : [...prev, turmaId]
    );
  };

  const series = seriesPorSegmento[segmento];
  const turmasLetras = ['A', 'B', 'C', 'D'];

  // Gerar senha baseada no sobrenome
  const gerarSenha = (sobrenome: string): string => {
    const sobrenomeNormalizado = sobrenome
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z]/g, '')
      .toLowerCase();
    return sobrenomeNormalizado + '123';
  };

  const criarMutation = useMutation({
    mutationFn: async () => {
      setCriando(true);
      
      const senha = gerarSenha(sobrenome);
      
      // Determinar qual edge function usar
      const functionName = tipo === 'professor' ? 'create-professor' : 'create-user';
      
      const body: Record<string, unknown> = {
        email,
        nome,
        sobrenome,
        password: senha,
        institution_id: institutionId
      };

      if (tipo === 'aluno') {
        body.serie = serie;
        body.turma = turma;
        body.segmento = segmento;
        if (segmento === 'fundamental2' && casaId) {
          body.casa_id = parseInt(casaId);
        }
        body.role = 'user';
        // Find matching turma_id from turmasDisponiveis
        const matchingTurma = turmasDisponiveis?.find(
          t => t.serie === serie && t.turma_letra === turma
        );
        if (matchingTurma) {
          body.turma_id = matchingTurma.id;
        }
      } else if (tipo === 'professor') {
        body.segmento = segmento;
        // Para fundamental2, casa é obrigatória
        if (segmento === 'fundamental2' && casaId) {
          body.casa_id = parseInt(casaId);
        }
        // Para infantil/fundamental1, turmas são obrigatórias
        if (segmento !== 'fundamental2' && turmasSelecionadas.length > 0) {
          body.turma_ids = turmasSelecionadas;
          body.eh_regente = ehRegente;
        }
      } else if (tipo === 'admin') {
        body.role = 'admin';
      }

      const { data, error } = await supabase.functions.invoke(functionName, {
        body
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return { ...data, senha };
    },
    onSuccess: (data) => {
      setSenhaGerada(data.senha);
      toast.success(`${tipo === 'aluno' ? 'Aluno' : tipo === 'professor' ? 'Professor' : 'Admin'} criado com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ['admin-alunos'] });
      queryClient.invalidateQueries({ queryKey: ['admin-professores'] });
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar usuário: ' + error.message);
    },
    onSettled: () => {
      setCriando(false);
    }
  });

  const copiarSenha = () => {
    if (senhaGerada) {
      navigator.clipboard.writeText(senhaGerada);
      toast.success('Senha copiada!');
    }
  };

  const isFormValid = () => {
    if (!nome.trim() || !sobrenome.trim() || !email.trim()) return false;
    if (tipo === 'aluno') {
      if (!serie || !turma) return false;
      if (segmento === 'fundamental2' && !casaId) return false;
    }
    if (tipo === 'professor') {
      if (!segmento) return false;
      if (segmento === 'fundamental2' && !casaId) return false;
      if (segmento !== 'fundamental2' && turmasSelecionadas.length === 0) return false;
    }
    return true;
  };

  // Tela de sucesso com senha
  if (senhaGerada) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
        <div className="w-full max-w-md bg-[#0A0A0A] border border-white/10 rounded-2xl overflow-hidden">
          <div className="p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
              <Check className="w-8 h-8 text-green-400" />
            </div>
            
            <h2 className="text-xl font-semibold text-white mb-2">
              {tipo === 'aluno' ? 'Aluno' : tipo === 'professor' ? 'Professor' : 'Admin'} criado!
            </h2>
            
            <p className="text-white/60 text-sm mb-6">
              Compartilhe os dados de acesso abaixo com o usuário.
            </p>

            <div className="space-y-3 mb-6">
              <div className="p-3 bg-white/5 rounded-lg text-left">
                <p className="text-xs text-white/40 mb-1">Email</p>
                <p className="text-white">{email}</p>
              </div>
              
              <div className="p-3 bg-white/5 rounded-lg">
                <p className="text-xs text-white/40 mb-1">Senha temporária</p>
                <div className="flex items-center gap-2">
                  <p className="flex-1 text-white font-mono">
                    {mostrarSenha ? senhaGerada : '••••••••'}
                  </p>
                  <button
                    onClick={() => setMostrarSenha(!mostrarSenha)}
                    className="p-1.5 hover:bg-white/10 rounded"
                  >
                    {mostrarSenha ? (
                      <EyeOff className="w-4 h-4 text-white/40" />
                    ) : (
                      <Eye className="w-4 h-4 text-white/40" />
                    )}
                  </button>
                  <button
                    onClick={copiarSenha}
                    className="p-1.5 hover:bg-white/10 rounded"
                  >
                    <Copy className="w-4 h-4 text-white/40" />
                  </button>
                </div>
              </div>
            </div>

            <p className="text-xs text-amber-400/80 mb-6">
              O usuário deverá alterar a senha no primeiro acesso.
            </p>

            <button
              onClick={onClose}
              className="w-full p-3 bg-white text-black font-medium rounded-xl"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-md bg-[#0A0A0A] border border-white/10 rounded-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">
            Adicionar {tipo === 'aluno' ? 'Aluno' : tipo === 'professor' ? 'Professor' : 'Admin'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <X className="w-5 h-5 text-white/60" />
          </button>
        </div>

        {/* Formulário */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-white/60 mb-1.5">Nome</label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="João"
                className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30"
              />
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-1.5">Sobrenome</label>
              <input
                type="text"
                value={sobrenome}
                onChange={(e) => setSobrenome(e.target.value)}
                placeholder="Silva"
                className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-white/60 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="joao@escola.com"
              className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30"
            />
          </div>

          {tipo === 'aluno' && (
            <>
              {/* Segmento selector */}
              <div>
                <label className="block text-sm text-white/60 mb-1.5">Segmento</label>
                <select
                  value={segmento}
                  onChange={(e) => {
                    const newSeg = e.target.value as Segmento;
                    setSegmento(newSeg);
                    setSerie('');
                    setTurma('');
                    setCasaId('');
                  }}
                  className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white"
                >
                  {Object.entries(segmentoLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-white/60 mb-1.5">Série</label>
                  <select
                    value={serie}
                    onChange={(e) => setSerie(e.target.value)}
                    className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white"
                  >
                    <option value="">Selecione</option>
                    {series.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-1.5">Turma</label>
                  <select
                    value={turma}
                    onChange={(e) => setTurma(e.target.value)}
                    className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white"
                  >
                    <option value="">Selecione</option>
                    {turmasLetras.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Casa - only for F2 */}
              {segmento === 'fundamental2' && (
                <div>
                  <label className="block text-sm text-white/60 mb-1.5">Casa</label>
                  <select
                    value={casaId}
                    onChange={(e) => setCasaId(e.target.value)}
                    className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white"
                  >
                    <option value="">Selecione a casa</option>
                    {casas?.map(c => (
                      <option key={c.id} value={c.id}>{c.emoji} {c.nome}</option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}

          {tipo === 'professor' && (
            <>
              {/* Campo Segmento */}
              <div>
                <label className="block text-sm text-white/60 mb-1.5">Segmento</label>
                <select
                  value={segmento}
                  onChange={(e) => {
                    setSegmento(e.target.value as Segmento);
                    // Limpar seleções anteriores
                    if (e.target.value !== 'fundamental2') {
                      setCasaId('');
                    } else {
                      setTurmasSelecionadas([]);
                    }
                  }}
                  className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white"
                >
                  {Object.entries(segmentoLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Campo Casa - só aparece para fundamental2 */}
              {segmento === 'fundamental2' && (
                <div>
                  <label className="block text-sm text-white/60 mb-1.5">
                    Casa (mentor principal)
                  </label>
                  <select
                    value={casaId}
                    onChange={(e) => setCasaId(e.target.value)}
                    className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white"
                  >
                    <option value="">Selecione a casa</option>
                    {casas?.map(c => (
                      <option key={c.id} value={c.id}>{c.emoji} {c.nome}</option>
                    ))}
                  </select>
                  <p className="text-xs text-white/40 mt-1">
                    Professores do Fundamental 2 são mentores de uma casa específica
                  </p>
                </div>
              )}

              {/* Tipo de vínculo - só para infantil */}
              {segmento === 'infantil' && (
                <div>
                  <label className="block text-sm text-white/60 mb-1.5">Tipo de Vínculo</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEhRegente(true)}
                      className={`flex-1 p-3 rounded-xl border text-sm font-medium transition-colors ${
                        ehRegente
                          ? 'bg-white/20 border-white text-white'
                          : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                      }`}
                    >
                      👩‍🏫 Regente
                    </button>
                    <button
                      type="button"
                      onClick={() => setEhRegente(false)}
                      className={`flex-1 p-3 rounded-xl border text-sm font-medium transition-colors ${
                        !ehRegente
                          ? 'bg-white/20 border-white text-white'
                          : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                      }`}
                    >
                      🤝 Auxiliar
                    </button>
                  </div>
                  <p className="text-xs text-white/40 mt-1">
                    {ehRegente ? 'Professora titular da turma' : 'Professora auxiliar de apoio'}
                  </p>
                </div>
              )}

              {/* Campo Turmas - aparece para infantil e fundamental1 */}
              {segmento !== 'fundamental2' && (
                <div>
                  <label className="block text-sm text-white/60 mb-1.5">
                    Turmas Vinculadas
                  </label>
                  {turmasDisponiveis && turmasDisponiveis.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 bg-white/5 rounded-xl border border-white/10">
                      {turmasDisponiveis.map(t => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => toggleTurma(t.id)}
                          className={`p-2 rounded-lg border text-sm flex items-center gap-2 transition-colors ${
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
                    <p className="text-xs text-white/40 mt-2">
                      {turmasSelecionadas.length} turma(s) selecionada(s)
                    </p>
                  )}
                </div>
              )}
            </>
          )}

          {sobrenome && (
            <div className="p-3 bg-white/5 rounded-lg">
              <p className="text-xs text-white/40 mb-1">Senha que será gerada:</p>
              <p className="text-white font-mono">{gerarSenha(sobrenome)}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 p-3 bg-white/5 text-white rounded-xl hover:bg-white/10 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => criarMutation.mutate()}
            disabled={!isFormValid() || criando}
            className="flex-1 p-3 bg-white text-black font-medium rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {criando ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Criando...
              </>
            ) : (
              'Criar'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalAdicionarUsuario;
