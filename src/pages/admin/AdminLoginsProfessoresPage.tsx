import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { KeyRound, Plus, X, Copy, Check, RefreshCw, Ban, Pencil, Dices } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const DOMINIO_EMAIL = '.amadeus@arboria.com';

interface TurmaOption {
  id: string;
  nome: string;
  serie: string;
  turma_letra: string;
  segmento: string | null;
}

interface LoginProfessor {
  userId: string;
  email: string;
  nomeExibicao: string;
  segmento: string | null;
  bloqueado: boolean;
  turmas: TurmaOption[];
}

const SEGMENTOS: { id: string; label: string }[] = [
  { id: 'infantil', label: 'Infantil' },
  { id: 'fundamental1', label: 'Fundamental 1' },
  { id: 'fundamental2', label: 'Fundamental 2' },
  // Turmas sem segmento definido caem aqui (a coluna e nullable); assim
  // nunca ficam invisiveis e sem poder ser vinculadas.
  { id: 'outros', label: 'Outras turmas' },
];

const normalizarPrefixo = (texto: string): string =>
  texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const nomeTurma = (t: TurmaOption): string => t.nome || `${t.serie} ${t.turma_letra}`;

const sugerirPrefixo = (t: TurmaOption): string => normalizarPrefixo(`${t.serie}${t.turma_letra}`);

// Senha provisoria: 'arboria' + 6 caracteres aleatorios, sem simbolos ambiguos
// (0/o, 1/l/i) pra facilitar a leitura na apostila impressa.
const gerarSenha = (): string => {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let sufixo = '';
  const rnd = new Uint32Array(6);
  crypto.getRandomValues(rnd);
  for (let i = 0; i < 6; i++) sufixo += chars[rnd[i] % chars.length];
  return `arboria${sufixo}`;
};

const AdminLoginsProfessoresPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Modais
  const [showCriar, setShowCriar] = useState(false);
  const [loginParaTurmas, setLoginParaTurmas] = useState<LoginProfessor | null>(null);
  const [loginParaSenha, setLoginParaSenha] = useState<LoginProfessor | null>(null);
  const [loginParaDesativar, setLoginParaDesativar] = useState<LoginProfessor | null>(null);
  const [credenciais, setCredenciais] = useState<{ email: string; senha: string; nome: string } | null>(null);

  // Form: criar
  const [turmasSelecionadas, setTurmasSelecionadas] = useState<string[]>([]);
  const [prefixoEmail, setPrefixoEmail] = useState('');
  const [prefixoEditado, setPrefixoEditado] = useState(false);
  const [senha, setSenha] = useState('');
  const [nomeExibicao, setNomeExibicao] = useState('');
  const [nomeEditado, setNomeEditado] = useState(false);

  // Form: ajustar turmas
  const [turmasAjuste, setTurmasAjuste] = useState<string[]>([]);

  // Form: resetar senha
  const [novaSenha, setNovaSenha] = useState('');

  const [processando, setProcessando] = useState(false);
  const [copiado, setCopiado] = useState<string | null>(null);

  const { data: institutionId } = useQuery({
    queryKey: ['admin-institution', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('institution_id').eq('id', user!.id).single();
      return data?.institution_id;
    },
    enabled: !!user?.id,
  });

  const { data: turmas = [] } = useQuery({
    queryKey: ['admin-logins-turmas', institutionId],
    queryFn: async () => {
      if (!institutionId) return [];
      const { data } = await supabase
        .from('turmas')
        .select('id, nome, serie, turma_letra, segmento')
        .eq('institution_id', institutionId)
        .order('serie')
        .order('turma_letra');
      return (data || []) as TurmaOption[];
    },
    enabled: !!institutionId,
  });

  const { data: logins = [], isLoading: loadingLogins } = useQuery({
    queryKey: ['admin-logins-professores'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('admin-logins-professor', {
        body: { acao: 'listar' },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return (data?.logins || []) as LoginProfessor[];
    },
  });

  const turmasPorSegmento = useMemo(() => {
    const grupos: Record<string, TurmaOption[]> = {};
    turmas.forEach((t) => {
      const seg = t.segmento || 'outros';
      if (!grupos[seg]) grupos[seg] = [];
      grupos[seg].push(t);
    });
    return grupos;
  }, [turmas]);

  const turmaMap = useMemo(() => new Map(turmas.map((t) => [t.id, t])), [turmas]);

  const copiarTexto = async (texto: string, chave: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(chave);
      setTimeout(() => setCopiado(null), 1500);
    } catch {
      toast.error('Falha ao copiar');
    }
  };

  const abrirCriar = () => {
    setTurmasSelecionadas([]);
    setPrefixoEmail('');
    setPrefixoEditado(false);
    setSenha(gerarSenha());
    setNomeExibicao('');
    setNomeEditado(false);
    setShowCriar(true);
  };

  const toggleTurmaCriar = (turmaId: string) => {
    setTurmasSelecionadas((prev) => {
      const nova = prev.includes(turmaId) ? prev.filter((id) => id !== turmaId) : [...prev, turmaId];
      const primeira = nova.length > 0 ? turmaMap.get(nova[0]) : null;
      if (primeira) {
        if (!prefixoEditado) setPrefixoEmail(sugerirPrefixo(primeira));
        if (!nomeEditado) setNomeExibicao(`Professor(a) ${nomeTurma(primeira)}`);
      } else {
        if (!prefixoEditado) setPrefixoEmail('');
        if (!nomeEditado) setNomeExibicao('');
      }
      return nova;
    });
  };

  const toggleTurmaAjuste = (turmaId: string) => {
    setTurmasAjuste((prev) =>
      prev.includes(turmaId) ? prev.filter((id) => id !== turmaId) : [...prev, turmaId]
    );
  };

  const invalidar = () => queryClient.invalidateQueries({ queryKey: ['admin-logins-professores'] });

  const criarLogin = async () => {
    const email = `${prefixoEmail}${DOMINIO_EMAIL}`;
    if (!prefixoEmail || turmasSelecionadas.length === 0 || !nomeExibicao.trim()) {
      toast.error('Selecione as turmas e preencha email e nome de exibicao');
      return;
    }
    if (senha.length < 8) {
      toast.error('A senha deve ter pelo menos 8 caracteres');
      return;
    }
    setProcessando(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-logins-professor', {
        body: { acao: 'criar', email, senha, nomeExibicao: nomeExibicao.trim(), turmaIds: turmasSelecionadas },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setShowCriar(false);
      setCredenciais({ email, senha, nome: nomeExibicao.trim() });
      toast.success('Login criado');
      invalidar();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar o login');
    } finally {
      setProcessando(false);
    }
  };

  const salvarTurmas = async () => {
    if (!loginParaTurmas) return;
    if (turmasAjuste.length === 0) {
      toast.error('Selecione pelo menos uma turma');
      return;
    }
    setProcessando(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-logins-professor', {
        body: { acao: 'vincular', userId: loginParaTurmas.userId, turmaIds: turmasAjuste },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setLoginParaTurmas(null);
      toast.success('Turmas atualizadas');
      invalidar();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar turmas');
    } finally {
      setProcessando(false);
    }
  };

  const resetarSenha = async () => {
    if (!loginParaSenha) return;
    if (novaSenha.length < 8) {
      toast.error('A senha deve ter pelo menos 8 caracteres');
      return;
    }
    setProcessando(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-logins-professor', {
        body: { acao: 'resetar_senha', userId: loginParaSenha.userId, senha: novaSenha },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const email = loginParaSenha.email;
      setLoginParaSenha(null);
      setCredenciais({ email, senha: novaSenha, nome: 'Senha resetada' });
      toast.success('Senha resetada');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao resetar a senha');
    } finally {
      setProcessando(false);
    }
  };

  const desativarLogin = async () => {
    if (!loginParaDesativar) return;
    setProcessando(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-logins-professor', {
        body: { acao: 'desativar', userId: loginParaDesativar.userId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setLoginParaDesativar(null);
      toast.success('Login desativado');
      invalidar();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao desativar o login');
    } finally {
      setProcessando(false);
    }
  };

  const renderSeletorTurmas = (selecionadas: string[], onToggle: (id: string) => void) => (
    <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
      {SEGMENTOS.map((seg) => {
        const lista = turmasPorSegmento[seg.id] || [];
        if (lista.length === 0) return null;
        return (
          <div key={seg.id}>
            <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1.5">{seg.label}</p>
            <div className="flex flex-wrap gap-1.5">
              {lista.map((t) => {
                const ativa = selecionadas.includes(t.id);
                const ordem = selecionadas.indexOf(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onToggle(t.id)}
                    className={cn(
                      'px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-colors',
                      ativa
                        ? 'bg-violet-500/25 border-violet-500/40 text-violet-200'
                        : 'bg-white/[0.04] border-white/10 text-white/40 hover:bg-white/[0.08]'
                    )}
                  >
                    {nomeTurma(t)}
                    {ativa && ordem === 0 && selecionadas.length > 1 && (
                      <span className="ml-1 text-[9px] text-violet-300/70">1a</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      {turmas.length === 0 && <p className="text-xs text-white/30">Nenhuma turma cadastrada</p>}
    </div>
  );

  const renderCampoSenha = (valor: string, onChange: (v: string) => void) => (
    <div className="flex gap-2">
      <input
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Minimo 8 caracteres"
        className="flex-1 bg-white/[0.06] border border-violet-500/10 rounded-lg px-3 py-2 text-sm text-white font-mono placeholder:text-white/20 outline-none"
      />
      <button
        type="button"
        onClick={() => onChange(gerarSenha())}
        title="Gerar senha"
        className="px-2.5 rounded-lg bg-white/[0.06] border border-violet-500/10 text-white/50 hover:text-white transition-colors"
      >
        <Dices className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => copiarTexto(valor, 'senha-form')}
        title="Copiar senha"
        className="px-2.5 rounded-lg bg-white/[0.06] border border-violet-500/10 text-white/50 hover:text-white transition-colors"
      >
        {copiado === 'senha-form' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
      </button>
    </div>
  );

  return (
    <div className="p-4 space-y-4 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Logins de Professores</h1>
          <p className="text-xs text-white/30 mt-0.5">
            {logins.length} {logins.length === 1 ? 'login' : 'logins'} · um login pode ter varias turmas
          </p>
        </div>
        <div className="p-2.5 rounded-xl bg-violet-500/15">
          <KeyRound className="w-5 h-5 text-violet-300" />
        </div>
      </div>

      <button
        onClick={abrirCriar}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-violet-500/15 text-violet-300 border border-violet-500/25 hover:bg-violet-500/25 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" /> Criar login
      </button>

      {loadingLogins ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-white/5 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : logins.length === 0 ? (
        <div className="p-6 rounded-xl bg-[#252547] border border-violet-500/10 text-center">
          <p className="text-white/30 text-sm">Nenhum login de professor ainda</p>
          <p className="text-white/20 text-xs mt-1">Crie o primeiro com o botao acima</p>
        </div>
      ) : (
        <div className="space-y-2">
          {logins.map((login) => (
            <div
              key={login.userId}
              className={cn(
                'p-3.5 rounded-xl bg-[#252547] border border-violet-500/10 space-y-2.5',
                login.bloqueado && 'opacity-50'
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm text-white font-medium truncate">{login.nomeExibicao || 'Sem nome'}</p>
                  <p className="text-[11px] text-white/40 font-mono truncate">{login.email}</p>
                </div>
                {login.bloqueado && (
                  <span className="shrink-0 px-2 py-0.5 rounded-full text-[9px] font-medium bg-red-500/15 text-red-300 border border-red-500/25">
                    Desativado
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-1">
                {login.turmas.length === 0 ? (
                  <span className="text-[10px] text-amber-400/60">Sem turma vinculada</span>
                ) : (
                  login.turmas.map((t) => (
                    <span
                      key={t.id}
                      className="px-2 py-0.5 rounded-full text-[10px] bg-violet-500/10 text-violet-300/80 border border-violet-500/20"
                    >
                      {nomeTurma(t)}
                    </span>
                  ))
                )}
              </div>

              {!login.bloqueado && (
                <div className="flex gap-1.5 flex-wrap">
                  <button
                    onClick={() => {
                      setLoginParaTurmas(login);
                      setTurmasAjuste(login.turmas.map((t) => t.id));
                    }}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-blue-500/10 text-blue-300 border border-blue-500/20 hover:bg-blue-500/20 transition-colors"
                  >
                    <Pencil className="w-3 h-3" /> Ajustar turmas
                  </button>
                  <button
                    onClick={() => {
                      setLoginParaSenha(login);
                      setNovaSenha(gerarSenha());
                    }}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" /> Resetar senha
                  </button>
                  <button
                    onClick={() => setLoginParaDesativar(login)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-red-500/10 text-red-300 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                  >
                    <Ban className="w-3 h-3" /> Desativar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal: Criar login */}
      {showCriar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#1E1E3A] border border-violet-500/10 p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Criar login de professor</p>
                <p className="text-[10px] text-white/40 mt-0.5">O mesmo login pode atender mais de uma turma</p>
              </div>
              <button onClick={() => setShowCriar(false)} className="p-1 text-white/30 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-white/30 block mb-1.5">Turmas do login</label>
                {renderSeletorTurmas(turmasSelecionadas, toggleTurmaCriar)}
              </div>

              <div>
                <label className="text-[10px] text-white/30 block mb-1">Email de acesso</label>
                <div className="flex items-center gap-1">
                  <input
                    value={prefixoEmail}
                    onChange={(e) => {
                      setPrefixoEmail(normalizarPrefixo(e.target.value));
                      setPrefixoEditado(true);
                    }}
                    placeholder="5anoc"
                    className="flex-1 min-w-0 bg-white/[0.06] border border-violet-500/10 rounded-lg px-3 py-2 text-sm text-white font-mono placeholder:text-white/20 outline-none"
                  />
                  <span className="text-[11px] text-white/40 font-mono shrink-0">{DOMINIO_EMAIL}</span>
                </div>
                <p className="text-[9px] text-white/25 mt-1">
                  Sugerido pela primeira turma. Com mais de uma turma, edite como preferir.
                </p>
              </div>

              <div>
                <label className="text-[10px] text-white/30 block mb-1">Senha provisoria</label>
                {renderCampoSenha(senha, setSenha)}
              </div>

              <div>
                <label className="text-[10px] text-white/30 block mb-1">Nome de exibicao</label>
                <input
                  value={nomeExibicao}
                  onChange={(e) => {
                    setNomeExibicao(e.target.value);
                    setNomeEditado(true);
                  }}
                  placeholder="Professor(a) 5o Ano C"
                  className="w-full bg-white/[0.06] border border-violet-500/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 outline-none"
                />
              </div>
            </div>

            <button
              onClick={criarLogin}
              disabled={processando || turmasSelecionadas.length === 0 || !prefixoEmail || !nomeExibicao.trim() || senha.length < 8}
              className="w-full py-2.5 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-500 transition-colors disabled:opacity-40"
            >
              {processando ? 'Criando...' : 'Criar login'}
            </button>
          </div>
        </div>
      )}

      {/* Modal: Ajustar turmas */}
      {loginParaTurmas && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#1E1E3A] border border-violet-500/10 p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Ajustar turmas</p>
                <p className="text-[10px] text-white/40 mt-0.5 font-mono">{loginParaTurmas.email}</p>
              </div>
              <button onClick={() => setLoginParaTurmas(null)} className="p-1 text-white/30 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {renderSeletorTurmas(turmasAjuste, toggleTurmaAjuste)}

            <button
              onClick={salvarTurmas}
              disabled={processando || turmasAjuste.length === 0}
              className="w-full py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 transition-colors disabled:opacity-40"
            >
              {processando ? 'Salvando...' : 'Salvar turmas'}
            </button>
          </div>
        </div>
      )}

      {/* Modal: Resetar senha */}
      {loginParaSenha && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#1E1E3A] border border-amber-500/15 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Resetar senha</p>
                <p className="text-[10px] text-white/40 mt-0.5 font-mono">{loginParaSenha.email}</p>
              </div>
              <button onClick={() => setLoginParaSenha(null)} className="p-1 text-white/30 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="text-[10px] text-white/30 block mb-1">Nova senha</label>
              {renderCampoSenha(novaSenha, setNovaSenha)}
            </div>

            <button
              onClick={resetarSenha}
              disabled={processando || novaSenha.length < 8}
              className="w-full py-2.5 rounded-xl bg-amber-600 text-white text-sm font-medium hover:bg-amber-500 transition-colors disabled:opacity-40"
            >
              {processando ? 'Resetando...' : 'Resetar senha'}
            </button>
          </div>
        </div>
      )}

      {/* Modal: Confirmar desativacao */}
      {loginParaDesativar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#1E1E3A] border border-red-500/15 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-white font-medium">Desativar login</p>
              <button onClick={() => setLoginParaDesativar(null)} className="p-1 text-white/30 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-white/60 leading-relaxed">
              O login <span className="font-mono text-white/80">{loginParaDesativar.email}</span> sera bloqueado e os
              vinculos com as turmas serao desativados. O historico de observacoes e preservado.
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => setLoginParaDesativar(null)}
                className="flex-1 py-2.5 rounded-xl bg-white/[0.06] text-white/60 text-sm font-medium hover:bg-white/[0.1] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={desativarLogin}
                disabled={processando}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-500 transition-colors disabled:opacity-40"
              >
                {processando ? 'Desativando...' : 'Desativar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Credenciais criadas */}
      {credenciais && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#1E1E3A] border border-emerald-500/20 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Credenciais prontas</p>
                <p className="text-[10px] text-white/50 mt-0.5">{credenciais.nome}</p>
              </div>
              <button onClick={() => setCredenciais(null)} className="p-1 text-white/30 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <div className="rounded-lg bg-white/[0.04] border border-emerald-500/10 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-white/40">Email</p>
                    <p className="text-sm text-white font-mono truncate">{credenciais.email}</p>
                  </div>
                  <button
                    onClick={() => copiarTexto(credenciais.email, 'cred-email')}
                    className="p-1.5 text-white/40 hover:text-white"
                  >
                    {copiado === 'cred-email' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="rounded-lg bg-white/[0.04] border border-emerald-500/10 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-white/40">Senha</p>
                    <p className="text-sm text-white font-mono truncate">{credenciais.senha}</p>
                  </div>
                  <button
                    onClick={() => copiarTexto(credenciais.senha, 'cred-senha')}
                    className="p-1.5 text-white/40 hover:text-white"
                  >
                    {copiado === 'cred-senha' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={() => copiarTexto(`Email: ${credenciais.email}\nSenha: ${credenciais.senha}`, 'cred-tudo')}
              className="w-full py-2 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 text-xs font-medium hover:bg-emerald-500/25 transition-colors"
            >
              {copiado === 'cred-tudo' ? 'Copiado' : 'Copiar email e senha'}
            </button>

            <p className="text-[10px] text-amber-400/70 text-center">
              Anote agora: a senha nao podera ser vista de novo depois de fechar.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLoginsProfessoresPage;
