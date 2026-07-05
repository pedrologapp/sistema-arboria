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

// Email de um GRUPO de turmas: 1 turma -> serie+letra (5anoc); varias da mesma
// serie -> serie + letras juntas (1anoab); series diferentes -> concatena tudo.
const prefixoDeGrupo = (grupoTurmas: TurmaOption[]): string => {
  if (grupoTurmas.length === 0) return '';
  const series = [...new Set(grupoTurmas.map((t) => t.serie))];
  if (series.length === 1) {
    const letras = grupoTurmas.map((t) => t.turma_letra).sort().join('');
    return normalizarPrefixo(`${series[0]}${letras}`);
  }
  return normalizarPrefixo(grupoTurmas.map((t) => `${t.serie}${t.turma_letra}`).join(''));
};

// Nome de exibicao de um grupo: "Professor(a) 1º Ano A e B" / "Professor(a) 5º Ano C".
const nomeDeGrupo = (grupoTurmas: TurmaOption[]): string => {
  if (grupoTurmas.length === 0) return 'Professor(a)';
  const series = [...new Set(grupoTurmas.map((t) => t.serie))];
  if (series.length === 1) {
    const letras = grupoTurmas.map((t) => t.turma_letra).sort();
    const juntas =
      letras.length === 1
        ? letras[0]
        : `${letras.slice(0, -1).join(', ')} e ${letras[letras.length - 1]}`;
    return `Professor(a) ${series[0]} ${juntas}`;
  }
  return `Professor(a) ${grupoTurmas.map(nomeTurma).join(' e ')}`;
};

interface GrupoLogin {
  id: string;
  turmaIds: string[];
  senha: string;
}

interface ResultadoGeracao {
  email: string;
  senha: string;
  nome: string;
  ok: boolean;
  erro?: string;
}

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
  const { user, isSuperAdmin } = useAuth();
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

  // Gerador de logins por serie (fluxo em lote, sem digitar)
  const [showGerador, setShowGerador] = useState(false);
  const [selInline, setSelInline] = useState<string[]>([]);
  const [grupos, setGrupos] = useState<GrupoLogin[]>([]);
  const [resultados, setResultados] = useState<ResultadoGeracao[] | null>(null);

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
    queryKey: ['admin-logins-turmas', institutionId, isSuperAdmin],
    queryFn: async () => {
      // Admin de escola: so as turmas da propria instituicao.
      // Dono (super_admin, sem institution_id): todas as turmas (escola unica hoje;
      // quando existir multi-escola, entra um seletor de escola antes).
      let query = supabase
        .from('turmas')
        .select('id, nome, serie, turma_letra, segmento')
        .order('serie')
        .order('turma_letra');
      if (institutionId) {
        query = query.eq('institution_id', institutionId);
      }
      const { data } = await query;
      return (data || []) as TurmaOption[];
    },
    // Roda quando ja sabemos a instituicao OU quando e o dono sem instituicao.
    enabled: !!institutionId || isSuperAdmin,
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

  // Turmas agrupadas por serie (pro gerador: "vejo todas as series")
  const seriesOrdenadas = useMemo(() => {
    const grupos: Record<string, TurmaOption[]> = {};
    turmas.forEach((t) => {
      if (!grupos[t.serie]) grupos[t.serie] = [];
      grupos[t.serie].push(t);
    });
    return Object.entries(grupos).map(([serie, ts]) => ({ serie, turmas: ts }));
  }, [turmas]);

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

  // ===== Gerador de logins por serie =====
  const idGrupo = () => `g-${crypto.getRandomValues(new Uint32Array(1))[0].toString(36)}`;

  const abrirGerador = () => {
    setSelInline([]);
    setGrupos([]);
    setResultados(null);
    setShowGerador(true);
  };

  const toggleInline = (turmaId: string) => {
    setSelInline((prev) =>
      prev.includes(turmaId) ? prev.filter((id) => id !== turmaId) : [...prev, turmaId]
    );
  };

  // Turmas ja colocadas em algum grupo (nao podem entrar em dois logins)
  const turmasEmGrupos = useMemo(
    () => new Set(grupos.flatMap((g) => g.turmaIds)),
    [grupos]
  );

  // Junta as turmas selecionadas num UNICO login
  const adicionarGrupoJuntas = () => {
    const novas = selInline.filter((id) => !turmasEmGrupos.has(id));
    if (novas.length === 0) return;
    setGrupos((prev) => [...prev, { id: idGrupo(), turmaIds: novas, senha: gerarSenha() }]);
    setSelInline([]);
  };

  // Cria um login SEPARADO para cada turma selecionada
  const adicionarGruposSeparados = () => {
    const novas = selInline.filter((id) => !turmasEmGrupos.has(id));
    if (novas.length === 0) return;
    setGrupos((prev) => [
      ...prev,
      ...novas.map((id) => ({ id: idGrupo(), turmaIds: [id], senha: gerarSenha() })),
    ]);
    setSelInline([]);
  };

  const removerGrupo = (gid: string) => setGrupos((prev) => prev.filter((g) => g.id !== gid));

  const regenerarSenhaGrupo = (gid: string) =>
    setGrupos((prev) => prev.map((g) => (g.id === gid ? { ...g, senha: gerarSenha() } : g)));

  const gerarTodos = async () => {
    if (grupos.length === 0) return;
    setProcessando(true);
    const saidas: ResultadoGeracao[] = [];
    for (const g of grupos) {
      const turmasDoGrupo = g.turmaIds.map((id) => turmaMap.get(id)).filter(Boolean) as TurmaOption[];
      const email = `${prefixoDeGrupo(turmasDoGrupo)}${DOMINIO_EMAIL}`;
      const nome = nomeDeGrupo(turmasDoGrupo);
      try {
        const { data, error } = await supabase.functions.invoke('admin-logins-professor', {
          body: { acao: 'criar', email, senha: g.senha, nomeExibicao: nome, turmaIds: g.turmaIds },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        saidas.push({ email, senha: g.senha, nome, ok: true });
      } catch (err: unknown) {
        saidas.push({ email, senha: g.senha, nome, ok: false, erro: err instanceof Error ? err.message : 'erro' });
      }
    }
    setResultados(saidas);
    setProcessando(false);
    invalidar();
    const okCount = saidas.filter((s) => s.ok).length;
    if (okCount === saidas.length) toast.success(`${okCount} login(s) gerado(s)`);
    else toast.warning(`${okCount} de ${saidas.length} gerados; veja os erros`);
  };

  const copiarTodosResultados = () => {
    if (!resultados) return;
    const texto = resultados
      .filter((r) => r.ok)
      .map((r) => `${r.nome}\n${r.email}\n${r.senha}`)
      .join('\n\n');
    copiarTexto(texto, 'todos');
  };

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
    // Fundo escuro proprio: no /admin fica escuro-sobre-escuro (sem costura),
    // e no painel /arboria (tema claro) garante legibilidade dos cards escuros.
    <div className="p-4 space-y-4 pb-24 bg-[#1A1A2E] text-white rounded-2xl min-h-[70vh]">
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

      <div className="flex flex-wrap gap-2">
        <button
          onClick={abrirGerador}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-violet-500 text-white hover:bg-violet-400 transition-colors"
        >
          <Dices className="w-3.5 h-3.5" /> Gerar logins por serie
        </button>
        <button
          onClick={abrirCriar}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-violet-500/15 text-violet-300 border border-violet-500/25 hover:bg-violet-500/25 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Criar um login
        </button>
      </div>

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

      {/* Modal: Gerador de logins por serie */}
      {showGerador && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#1E1E3A] border border-violet-500/15 p-5 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Gerar logins por serie</p>
                <p className="text-[10px] text-white/40 mt-0.5">Centro Educacional Amadeus</p>
              </div>
              <button onClick={() => setShowGerador(false)} className="p-1 text-white/30 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Passo 1: os resultados (quando ja gerou) */}
            {resultados ? (
              <div className="space-y-3">
                <p className="text-xs text-white/60">
                  {resultados.filter((r) => r.ok).length} de {resultados.length} login(s) gerado(s). Anote agora:
                  as senhas nao aparecem de novo.
                </p>
                <div className="space-y-2">
                  {resultados.map((r, i) => (
                    <div
                      key={i}
                      className={cn(
                        'rounded-lg px-3 py-2 border',
                        r.ok
                          ? 'bg-white/[0.04] border-emerald-500/15'
                          : 'bg-red-500/10 border-red-500/25'
                      )}
                    >
                      <p className="text-[11px] text-white/50">{r.nome}</p>
                      {r.ok ? (
                        <>
                          <p className="text-sm text-white font-mono truncate">{r.email}</p>
                          <p className="text-xs text-violet-300 font-mono">senha: {r.senha}</p>
                        </>
                      ) : (
                        <p className="text-xs text-red-300 mt-0.5">Falhou: {r.erro}</p>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  onClick={copiarTodosResultados}
                  className="w-full py-2 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 text-xs font-medium hover:bg-emerald-500/25 transition-colors"
                >
                  {copiado === 'todos' ? 'Copiado' : 'Copiar todos (nome, email, senha)'}
                </button>
                <button
                  onClick={() => setShowGerador(false)}
                  className="w-full py-2.5 rounded-xl bg-white/[0.06] text-white/60 text-sm font-medium hover:bg-white/[0.1] transition-colors"
                >
                  Fechar
                </button>
              </div>
            ) : (
              <>
                {/* Passo 1: escolher turmas por serie */}
                <div>
                  <p className="text-[11px] text-white/40 mb-2">
                    Toque nas turmas, depois escolha se viram um login juntas ou separadas.
                  </p>
                  <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                    {seriesOrdenadas.map(({ serie, turmas: ts }) => (
                      <div key={serie}>
                        <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1.5">{serie}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {ts.map((t) => {
                            const jaUsada = turmasEmGrupos.has(t.id);
                            const ativa = selInline.includes(t.id);
                            return (
                              <button
                                key={t.id}
                                type="button"
                                disabled={jaUsada}
                                onClick={() => toggleInline(t.id)}
                                className={cn(
                                  'px-2.5 py-1 rounded-lg text-xs border transition-colors',
                                  jaUsada
                                    ? 'bg-white/[0.03] border-white/5 text-white/25 line-through cursor-not-allowed'
                                    : ativa
                                    ? 'bg-violet-500 border-violet-500 text-white'
                                    : 'bg-white/[0.06] border-violet-500/10 text-white/70 hover:border-violet-500/30'
                                )}
                              >
                                {t.turma_letra}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    {seriesOrdenadas.length === 0 && (
                      <p className="text-xs text-white/30">Nenhuma turma cadastrada</p>
                    )}
                  </div>
                </div>

                {/* Acoes de agrupamento */}
                {selInline.length > 0 && (
                  <div className="flex gap-2">
                    <button
                      onClick={adicionarGrupoJuntas}
                      className="flex-1 py-2 rounded-lg bg-violet-500/20 text-violet-200 border border-violet-500/30 text-xs font-medium hover:bg-violet-500/30 transition-colors"
                    >
                      Juntar num login ({selInline.length})
                    </button>
                    <button
                      onClick={adicionarGruposSeparados}
                      className="flex-1 py-2 rounded-lg bg-white/[0.06] text-white/70 border border-violet-500/10 text-xs font-medium hover:bg-white/[0.12] transition-colors"
                    >
                      Um login pra cada
                    </button>
                  </div>
                )}

                {/* Passo 2: os logins que serao gerados */}
                {grupos.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] text-white/40 uppercase tracking-wider">
                      {grupos.length} login(s) a gerar
                    </p>
                    {grupos.map((g) => {
                      const ts = g.turmaIds.map((id) => turmaMap.get(id)).filter(Boolean) as TurmaOption[];
                      const email = `${prefixoDeGrupo(ts)}${DOMINIO_EMAIL}`;
                      return (
                        <div key={g.id} className="rounded-lg bg-white/[0.04] border border-violet-500/10 px-3 py-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] text-white/50 truncate">{nomeDeGrupo(ts)}</p>
                              <p className="text-sm text-white font-mono truncate">{email}</p>
                              <p className="text-xs text-violet-300 font-mono">senha: {g.senha}</p>
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <button
                                onClick={() => regenerarSenhaGrupo(g.id)}
                                title="Nova senha"
                                className="p-1.5 text-white/40 hover:text-white"
                              >
                                <Dices className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => removerGrupo(g.id)}
                                title="Remover"
                                className="p-1.5 text-white/40 hover:text-red-300"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <button
                  onClick={gerarTodos}
                  disabled={processando || grupos.length === 0}
                  className="w-full py-2.5 rounded-xl bg-violet-500 text-white text-sm font-semibold hover:bg-violet-400 transition-colors disabled:opacity-40"
                >
                  {processando
                    ? 'Gerando...'
                    : grupos.length === 0
                    ? 'Escolha as turmas acima'
                    : `Gerar ${grupos.length} login(s)`}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLoginsProfessoresPage;
