import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { KeyRound, Plus, X, Copy, Check, RefreshCw, Ban, Pencil, Dices } from 'lucide-react';
import { cn } from '@/lib/utils';
import { infantilTheme as t } from '@/styles/infantilTheme';
import { toast } from 'sonner';

const DOMINIO_EMAIL = '.amadeus@arboria.com';

// Cores semânticas (só nos estados; o acento do app é o índigo do infantilTheme).
const OK = { text: '#177A50', bg: '#E9F6F0', border: '#C7E9D8' };
const DANGER = { text: '#B4231F', bg: '#FBEAEA', border: '#F2CFCE' };
const AMBER = { text: '#8A5A12', bg: '#FBF3E6', border: '#EAD9B8' };

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
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const nomeTurma = (t2: TurmaOption): string => t2.nome || `${t2.serie} ${t2.turma_letra}`;

const sugerirPrefixo = (t2: TurmaOption): string => normalizarPrefixo(`${t2.serie}${t2.turma_letra}`);

// Email de um GRUPO de turmas: 1 turma -> serie+letra (5anoc); varias da mesma
// serie -> serie + letras juntas (1anoab); series diferentes -> concatena tudo.
const prefixoDeGrupo = (grupoTurmas: TurmaOption[]): string => {
  if (grupoTurmas.length === 0) return '';
  const series = [...new Set(grupoTurmas.map((tt) => tt.serie))];
  if (series.length === 1) {
    const letras = grupoTurmas.map((tt) => tt.turma_letra).sort().join('');
    return normalizarPrefixo(`${series[0]}${letras}`);
  }
  return normalizarPrefixo(grupoTurmas.map((tt) => `${tt.serie}${tt.turma_letra}`).join(''));
};

// Nome de exibicao de um grupo: "Professor(a) 1º Ano A e B" / "Professor(a) 5º Ano C".
const nomeDeGrupo = (grupoTurmas: TurmaOption[]): string => {
  if (grupoTurmas.length === 0) return 'Professor(a)';
  const series = [...new Set(grupoTurmas.map((tt) => tt.serie))];
  if (series.length === 1) {
    const letras = grupoTurmas.map((tt) => tt.turma_letra).sort();
    const juntas =
      letras.length === 1
        ? letras[0]
        : `${letras.slice(0, -1).join(', ')} e ${letras[letras.length - 1]}`;
    return `Professor(a) ${series[0]} ${juntas}`;
  }
  return `Professor(a) ${grupoTurmas.map(nomeTurma).join(' e ')}`;
};

const gerarSenha = (): string => {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let sufixo = '';
  const rnd = new Uint32Array(6);
  crypto.getRandomValues(rnd);
  for (let i = 0; i < 6; i++) sufixo += chars[rnd[i] % chars.length];
  return `arboria${sufixo}`;
};

// Chama a edge function e SEMPRE extrai a mensagem real de erro (o
// functions.invoke devolve "non-2xx status code" generico; a mensagem util
// esta no corpo da resposta).
async function invocar(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.functions.invoke('admin-logins-professor', { body });
  if (error) {
    let msg = error.message;
    const ctx = (error as { context?: { json?: () => Promise<unknown> } }).context;
    if (ctx?.json) {
      try {
        const b = (await ctx.json()) as { error?: string };
        if (b?.error) msg = b.error;
      } catch {
        /* mantem a mensagem generica */
      }
    }
    throw new Error(msg);
  }
  const d = (data || {}) as { error?: string };
  if (d.error) throw new Error(d.error);
  return d as Record<string, unknown>;
}

// Segmento provavel a partir do texto da serie (pra acrescentar turma nova).
const segmentoDaSerie = (serie: string): string | null => {
  const s = serie
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
  if (/mater|grupo|infantil|jardim|bercar|pre/.test(s)) return 'infantil';
  if (/[1-5]\s*(o|a|º|ª)?\s*ano/.test(s) || /^[1-5]\b/.test(s.trim())) return 'fundamental1';
  if (/[6-9]\s*(o|a|º|ª)?\s*ano/.test(s) || /^[6-9]\b/.test(s.trim())) return 'fundamental2';
  return null;
};

interface Instituicao {
  id: string;
  name: string;
}

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

// Estilos reaproveitados (tema claro do app)
const inputStyle: React.CSSProperties = {
  backgroundColor: t.surfaceSunken,
  border: `1px solid ${t.border}`,
  color: t.text,
};
const cardStyle: React.CSSProperties = {
  backgroundColor: t.surface,
  border: `1px solid ${t.border}`,
  boxShadow: t.shadowSm,
};
const modalStyle: React.CSSProperties = {
  backgroundColor: t.surface,
  border: `1px solid ${t.border}`,
  boxShadow: t.shadowMd,
};

const AdminLoginsProfessoresPage = () => {
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
  const [geradorEtapa, setGeradorEtapa] = useState<'instituicao' | 'turmas'>('instituicao');
  const [selInline, setSelInline] = useState<string[]>([]);
  const [grupos, setGrupos] = useState<GrupoLogin[]>([]);
  const [resultados, setResultados] = useState<ResultadoGeracao[] | null>(null);

  // Instituicao ativa (o dono escolhe qual escola antes de gerar)
  const [institucaoSel, setInstitucaoSel] = useState<string | null>(null);

  // Acrescentar turma nova
  const [showNovaTurma, setShowNovaTurma] = useState(false);
  const [novaSerie, setNovaSerie] = useState('');
  const [novaLetra, setNovaLetra] = useState('');

  const [processando, setProcessando] = useState(false);
  const [copiado, setCopiado] = useState<string | null>(null);

  const { data: instituicoes = [] } = useQuery({
    queryKey: ['admin-logins-instituicoes'],
    queryFn: async () => {
      const d = await invocar({ acao: 'listar_instituicoes' });
      return (d.instituicoes || []) as Instituicao[];
    },
  });

  // Turmas vêm pela edge function (service role): a RLS de `turmas` exige a
  // instituição do usuário, e o dono (super_admin) não tem uma, então uma
  // consulta direta voltaria vazia. Escopo pela instituição escolhida.
  const { data: turmas = [] } = useQuery({
    queryKey: ['admin-logins-turmas', institucaoSel],
    queryFn: async () => {
      const d = await invocar({ acao: 'listar_turmas', institutionId: institucaoSel ?? undefined });
      return (d.turmas || []) as TurmaOption[];
    },
    enabled: !!institucaoSel,
  });

  // Instituição única (Amadeus hoje): já seleciona sozinha, pra criar/ajustar
  // funcionarem sem forçar o passo. O gerador ainda mostra a escolha.
  useEffect(() => {
    if (!institucaoSel && instituicoes.length === 1) {
      setInstitucaoSel(instituicoes[0].id);
    }
  }, [instituicoes, institucaoSel]);

  const { data: logins = [], isLoading: loadingLogins } = useQuery({
    queryKey: ['admin-logins-professores'],
    queryFn: async () => {
      const d = await invocar({ acao: 'listar' });
      return (d.logins || []) as LoginProfessor[];
    },
  });

  const turmasPorSegmento = useMemo(() => {
    const gruposSeg: Record<string, TurmaOption[]> = {};
    turmas.forEach((tt) => {
      const seg = tt.segmento || 'outros';
      if (!gruposSeg[seg]) gruposSeg[seg] = [];
      gruposSeg[seg].push(tt);
    });
    return gruposSeg;
  }, [turmas]);

  const turmaMap = useMemo(() => new Map(turmas.map((tt) => [tt.id, tt])), [turmas]);

  // Turmas agrupadas por serie (pro gerador: "vejo todas as series")
  const seriesOrdenadas = useMemo(() => {
    const gruposSerie: Record<string, TurmaOption[]> = {};
    turmas.forEach((tt) => {
      if (!gruposSerie[tt.serie]) gruposSerie[tt.serie] = [];
      gruposSerie[tt.serie].push(tt);
    });
    return Object.entries(gruposSerie).map(([serie, ts]) => ({ serie, turmas: ts }));
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
    setShowNovaTurma(false);
    // Com uma instituição só, já entra nas turmas; com várias, pede a escolha.
    setGeradorEtapa(instituicoes.length > 1 ? 'instituicao' : 'turmas');
    setShowGerador(true);
  };

  const criarTurma = async () => {
    if (!institucaoSel) {
      toast.error('Escolha a instituicao primeiro');
      return;
    }
    if (!novaSerie.trim() || !novaLetra.trim()) {
      toast.error('Informe a serie e a letra');
      return;
    }
    setProcessando(true);
    try {
      await invocar({
        acao: 'criar_turma',
        institutionId: institucaoSel,
        serie: novaSerie.trim(),
        turma_letra: novaLetra.trim(),
        segmento: segmentoDaSerie(novaSerie),
      });
      await queryClient.invalidateQueries({ queryKey: ['admin-logins-turmas'] });
      setNovaSerie('');
      setNovaLetra('');
      setShowNovaTurma(false);
      toast.success('Turma acrescentada');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao acrescentar turma');
    } finally {
      setProcessando(false);
    }
  };

  const toggleInline = (turmaId: string) => {
    setSelInline((prev) =>
      prev.includes(turmaId) ? prev.filter((id) => id !== turmaId) : [...prev, turmaId]
    );
  };

  // Turmas ja colocadas em algum grupo (nao podem entrar em dois logins)
  const turmasEmGrupos = useMemo(() => new Set(grupos.flatMap((g) => g.turmaIds)), [grupos]);

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
        await invocar({ acao: 'criar', email, senha: g.senha, nomeExibicao: nome, turmaIds: g.turmaIds });
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
      await invocar({ acao: 'criar', email, senha, nomeExibicao: nomeExibicao.trim(), turmaIds: turmasSelecionadas });
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
      await invocar({ acao: 'vincular', userId: loginParaTurmas.userId, turmaIds: turmasAjuste });
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
      await invocar({ acao: 'resetar_senha', userId: loginParaSenha.userId, senha: novaSenha });
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
      await invocar({ acao: 'desativar', userId: loginParaDesativar.userId });
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
            <p className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: t.textFaint }}>
              {seg.label}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {lista.map((tt) => {
                const ativa = selecionadas.includes(tt.id);
                const ordem = selecionadas.indexOf(tt.id);
                return (
                  <button
                    key={tt.id}
                    type="button"
                    onClick={() => onToggle(tt.id)}
                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-colors"
                    style={
                      ativa
                        ? { backgroundColor: t.accent, borderColor: t.accent, color: '#FFFFFF' }
                        : { backgroundColor: t.surfaceSunken, borderColor: t.border, color: t.textMuted }
                    }
                  >
                    {nomeTurma(tt)}
                    {ativa && ordem === 0 && selecionadas.length > 1 && (
                      <span className="ml-1 text-[9px] opacity-80">1a</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      {turmas.length === 0 && (
        <p className="text-xs" style={{ color: t.textFaint }}>
          Nenhuma turma cadastrada
        </p>
      )}
    </div>
  );

  const renderCampoSenha = (valor: string, onChange: (v: string) => void) => (
    <div className="flex gap-2">
      <input
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Minimo 8 caracteres"
        className="flex-1 rounded-lg px-3 py-2 text-sm font-mono outline-none"
        style={inputStyle}
      />
      <button
        type="button"
        onClick={() => onChange(gerarSenha())}
        title="Gerar senha"
        className="px-2.5 rounded-lg border transition-colors"
        style={{ backgroundColor: t.surfaceSunken, borderColor: t.border, color: t.textMuted }}
      >
        <Dices className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => copiarTexto(valor, 'senha-form')}
        title="Copiar senha"
        className="px-2.5 rounded-lg border transition-colors"
        style={{ backgroundColor: t.surfaceSunken, borderColor: t.border, color: t.textMuted }}
      >
        {copiado === 'senha-form' ? (
          <Check className="w-4 h-4" style={{ color: OK.text }} />
        ) : (
          <Copy className="w-4 h-4" />
        )}
      </button>
    </div>
  );

  return (
    <div className="space-y-4 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-[22px]" style={{ color: t.text }}>
            Logins de Professores
          </h1>
          <p className="text-xs mt-0.5" style={{ color: t.textFaint }}>
            {logins.length} {logins.length === 1 ? 'login' : 'logins'} · um login pode ter varias turmas
          </p>
        </div>
        <div className="p-2.5 rounded-xl" style={{ backgroundColor: t.accentSoft }}>
          <KeyRound className="w-5 h-5" style={{ color: t.accentText }} />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={abrirGerador}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors"
          style={{ backgroundColor: t.accent, color: '#FFFFFF' }}
        >
          <Dices className="w-3.5 h-3.5" /> Gerar logins por serie
        </button>
        <button
          onClick={abrirCriar}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors"
          style={{ backgroundColor: t.accentSoft, borderColor: t.accentBorder, color: t.accentText }}
        >
          <Plus className="w-3.5 h-3.5" /> Criar um login
        </button>
      </div>

      {loadingLogins ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-xl animate-pulse" style={{ backgroundColor: t.surfaceSunken }} />
          ))}
        </div>
      ) : logins.length === 0 ? (
        <div className="p-6 rounded-xl text-center" style={cardStyle}>
          <p className="text-sm" style={{ color: t.textMuted }}>
            Nenhum login de professor ainda
          </p>
          <p className="text-xs mt-1" style={{ color: t.textFaint }}>
            Comece pelo botao "Gerar logins por serie"
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {logins.map((login) => (
            <div
              key={login.userId}
              className={cn('p-3.5 rounded-xl space-y-2.5', login.bloqueado && 'opacity-60')}
              style={cardStyle}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: t.text }}>
                    {login.nomeExibicao || 'Sem nome'}
                  </p>
                  <p className="text-[11px] font-mono truncate" style={{ color: t.textFaint }}>
                    {login.email}
                  </p>
                </div>
                {login.bloqueado && (
                  <span
                    className="shrink-0 px-2 py-0.5 rounded-full text-[9px] font-medium border"
                    style={{ backgroundColor: DANGER.bg, color: DANGER.text, borderColor: DANGER.border }}
                  >
                    Desativado
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-1">
                {login.turmas.length === 0 ? (
                  <span className="text-[10px]" style={{ color: AMBER.text }}>
                    Sem turma vinculada
                  </span>
                ) : (
                  login.turmas.map((tt) => (
                    <span
                      key={tt.id}
                      className="px-2 py-0.5 rounded-full text-[10px] border"
                      style={{ backgroundColor: t.accentSoft, color: t.accentText, borderColor: t.accentBorder }}
                    >
                      {nomeTurma(tt)}
                    </span>
                  ))
                )}
              </div>

              {!login.bloqueado && (
                <div className="flex gap-1.5 flex-wrap">
                  <button
                    onClick={() => {
                      setLoginParaTurmas(login);
                      setTurmasAjuste(login.turmas.map((tt) => tt.id));
                    }}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium border transition-colors"
                    style={{ backgroundColor: t.accentSoft, color: t.accentText, borderColor: t.accentBorder }}
                  >
                    <Pencil className="w-3 h-3" /> Ajustar turmas
                  </button>
                  <button
                    onClick={() => {
                      setLoginParaSenha(login);
                      setNovaSenha(gerarSenha());
                    }}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium border transition-colors"
                    style={{ backgroundColor: AMBER.bg, color: AMBER.text, borderColor: AMBER.border }}
                  >
                    <RefreshCw className="w-3 h-3" /> Resetar senha
                  </button>
                  <button
                    onClick={() => setLoginParaDesativar(login)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium border transition-colors"
                    style={{ backgroundColor: DANGER.bg, color: DANGER.text, borderColor: DANGER.border }}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto" style={modalStyle}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium" style={{ color: t.text }}>
                  Criar login de professor
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: t.textFaint }}>
                  O mesmo login pode atender mais de uma turma
                </p>
              </div>
              <button onClick={() => setShowCriar(false)} className="p-1" style={{ color: t.textFaint }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] block mb-1.5" style={{ color: t.textFaint }}>
                  Turmas do login
                </label>
                {renderSeletorTurmas(turmasSelecionadas, toggleTurmaCriar)}
              </div>

              <div>
                <label className="text-[10px] block mb-1" style={{ color: t.textFaint }}>
                  Email de acesso
                </label>
                <div className="flex items-center gap-1">
                  <input
                    value={prefixoEmail}
                    onChange={(e) => {
                      setPrefixoEmail(normalizarPrefixo(e.target.value));
                      setPrefixoEditado(true);
                    }}
                    placeholder="5anoc"
                    className="flex-1 min-w-0 rounded-lg px-3 py-2 text-sm font-mono outline-none"
                    style={inputStyle}
                  />
                  <span className="text-[11px] font-mono shrink-0" style={{ color: t.textMuted }}>
                    {DOMINIO_EMAIL}
                  </span>
                </div>
                <p className="text-[9px] mt-1" style={{ color: t.textFaint }}>
                  Sugerido pela primeira turma. Com mais de uma turma, edite como preferir.
                </p>
              </div>

              <div>
                <label className="text-[10px] block mb-1" style={{ color: t.textFaint }}>
                  Senha provisoria
                </label>
                {renderCampoSenha(senha, setSenha)}
              </div>

              <div>
                <label className="text-[10px] block mb-1" style={{ color: t.textFaint }}>
                  Nome de exibicao
                </label>
                <input
                  value={nomeExibicao}
                  onChange={(e) => {
                    setNomeExibicao(e.target.value);
                    setNomeEditado(true);
                  }}
                  placeholder="Professor(a) 5o Ano C"
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                  style={inputStyle}
                />
              </div>
            </div>

            <button
              onClick={criarLogin}
              disabled={processando || turmasSelecionadas.length === 0 || !prefixoEmail || !nomeExibicao.trim() || senha.length < 8}
              className="w-full py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-40"
              style={{ backgroundColor: t.accent, color: '#FFFFFF' }}
            >
              {processando ? 'Criando...' : 'Criar login'}
            </button>
          </div>
        </div>
      )}

      {/* Modal: Ajustar turmas */}
      {loginParaTurmas && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto" style={modalStyle}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium" style={{ color: t.text }}>
                  Ajustar turmas
                </p>
                <p className="text-[10px] mt-0.5 font-mono" style={{ color: t.textFaint }}>
                  {loginParaTurmas.email}
                </p>
              </div>
              <button onClick={() => setLoginParaTurmas(null)} className="p-1" style={{ color: t.textFaint }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            {renderSeletorTurmas(turmasAjuste, toggleTurmaAjuste)}

            <button
              onClick={salvarTurmas}
              disabled={processando || turmasAjuste.length === 0}
              className="w-full py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-40"
              style={{ backgroundColor: t.accent, color: '#FFFFFF' }}
            >
              {processando ? 'Salvando...' : 'Salvar turmas'}
            </button>
          </div>
        </div>
      )}

      {/* Modal: Resetar senha */}
      {loginParaSenha && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl p-5 space-y-4" style={modalStyle}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium" style={{ color: t.text }}>
                  Resetar senha
                </p>
                <p className="text-[10px] mt-0.5 font-mono" style={{ color: t.textFaint }}>
                  {loginParaSenha.email}
                </p>
              </div>
              <button onClick={() => setLoginParaSenha(null)} className="p-1" style={{ color: t.textFaint }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="text-[10px] block mb-1" style={{ color: t.textFaint }}>
                Nova senha
              </label>
              {renderCampoSenha(novaSenha, setNovaSenha)}
            </div>

            <button
              onClick={resetarSenha}
              disabled={processando || novaSenha.length < 8}
              className="w-full py-2.5 rounded-xl text-white text-sm font-medium transition-colors disabled:opacity-40"
              style={{ backgroundColor: AMBER.text }}
            >
              {processando ? 'Resetando...' : 'Resetar senha'}
            </button>
          </div>
        </div>
      )}

      {/* Modal: Confirmar desativacao */}
      {loginParaDesativar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl p-5 space-y-4" style={modalStyle}>
            <div className="flex items-center justify-between">
              <p className="font-medium" style={{ color: t.text }}>
                Desativar login
              </p>
              <button onClick={() => setLoginParaDesativar(null)} className="p-1" style={{ color: t.textFaint }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs leading-relaxed" style={{ color: t.textMuted }}>
              O login <span className="font-mono" style={{ color: t.text }}>{loginParaDesativar.email}</span> sera
              bloqueado e os vinculos com as turmas serao desativados. O historico de observacoes e preservado.
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => setLoginParaDesativar(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors"
                style={{ backgroundColor: t.surfaceSunken, color: t.textMuted }}
              >
                Cancelar
              </button>
              <button
                onClick={desativarLogin}
                disabled={processando}
                className="flex-1 py-2.5 rounded-xl text-white text-sm font-medium transition-colors disabled:opacity-40"
                style={{ backgroundColor: DANGER.text }}
              >
                {processando ? 'Desativando...' : 'Desativar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Credenciais criadas */}
      {credenciais && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl p-5 space-y-4" style={{ ...modalStyle, borderColor: OK.border }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium" style={{ color: t.text }}>
                  Credenciais prontas
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: t.textMuted }}>
                  {credenciais.nome}
                </p>
              </div>
              <button onClick={() => setCredenciais(null)} className="p-1" style={{ color: t.textFaint }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <div className="rounded-lg px-3 py-2" style={{ backgroundColor: OK.bg, border: `1px solid ${OK.border}` }}>
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px]" style={{ color: t.textMuted }}>
                      Email
                    </p>
                    <p className="text-sm font-mono truncate" style={{ color: t.text }}>
                      {credenciais.email}
                    </p>
                  </div>
                  <button onClick={() => copiarTexto(credenciais.email, 'cred-email')} className="p-1.5" style={{ color: t.textMuted }}>
                    {copiado === 'cred-email' ? <Check className="w-4 h-4" style={{ color: OK.text }} /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="rounded-lg px-3 py-2" style={{ backgroundColor: OK.bg, border: `1px solid ${OK.border}` }}>
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px]" style={{ color: t.textMuted }}>
                      Senha
                    </p>
                    <p className="text-sm font-mono truncate" style={{ color: t.text }}>
                      {credenciais.senha}
                    </p>
                  </div>
                  <button onClick={() => copiarTexto(credenciais.senha, 'cred-senha')} className="p-1.5" style={{ color: t.textMuted }}>
                    {copiado === 'cred-senha' ? <Check className="w-4 h-4" style={{ color: OK.text }} /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={() => copiarTexto(`Email: ${credenciais.email}\nSenha: ${credenciais.senha}`, 'cred-tudo')}
              className="w-full py-2 rounded-lg text-xs font-medium border transition-colors"
              style={{ backgroundColor: OK.bg, color: OK.text, borderColor: OK.border }}
            >
              {copiado === 'cred-tudo' ? 'Copiado' : 'Copiar email e senha'}
            </button>

            <p className="text-[10px] text-center" style={{ color: AMBER.text }}>
              Anote agora: a senha nao podera ser vista de novo depois de fechar.
            </p>
          </div>
        </div>
      )}

      {/* Modal: Gerador de logins por serie */}
      {showGerador && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl p-5 space-y-4 max-h-[92vh] overflow-y-auto" style={modalStyle}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium" style={{ color: t.text }}>
                  Gerar logins por serie
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: t.textFaint }}>
                  {instituicoes.find((i) => i.id === institucaoSel)?.name || 'Escolha a instituicao'}
                </p>
              </div>
              <button onClick={() => setShowGerador(false)} className="p-1" style={{ color: t.textFaint }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            {resultados ? (
              <div className="space-y-3">
                <p className="text-xs" style={{ color: t.textMuted }}>
                  {resultados.filter((r) => r.ok).length} de {resultados.length} login(s) gerado(s). Anote agora:
                  as senhas nao aparecem de novo.
                </p>
                <div className="space-y-2">
                  {resultados.map((r, i) => (
                    <div
                      key={i}
                      className="rounded-lg px-3 py-2 border"
                      style={
                        r.ok
                          ? { backgroundColor: OK.bg, borderColor: OK.border }
                          : { backgroundColor: DANGER.bg, borderColor: DANGER.border }
                      }
                    >
                      <p className="text-[11px]" style={{ color: t.textMuted }}>
                        {r.nome}
                      </p>
                      {r.ok ? (
                        <>
                          <p className="text-sm font-mono truncate" style={{ color: t.text }}>
                            {r.email}
                          </p>
                          <p className="text-xs font-mono" style={{ color: t.accentText }}>
                            senha: {r.senha}
                          </p>
                        </>
                      ) : (
                        <p className="text-xs mt-0.5" style={{ color: DANGER.text }}>
                          Falhou: {r.erro}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  onClick={copiarTodosResultados}
                  className="w-full py-2 rounded-lg text-xs font-medium border transition-colors"
                  style={{ backgroundColor: OK.bg, color: OK.text, borderColor: OK.border }}
                >
                  {copiado === 'todos' ? 'Copiado' : 'Copiar todos (nome, email, senha)'}
                </button>
                <button
                  onClick={() => setShowGerador(false)}
                  className="w-full py-2.5 rounded-xl text-sm font-medium transition-colors"
                  style={{ backgroundColor: t.surfaceSunken, color: t.textMuted }}
                >
                  Fechar
                </button>
              </div>
            ) : geradorEtapa === 'instituicao' ? (
              <div className="space-y-3">
                <p className="text-[11px]" style={{ color: t.textFaint }}>
                  Escolha a instituicao para gerar os logins.
                </p>
                <div className="space-y-2">
                  {instituicoes.map((inst) => (
                    <button
                      key={inst.id}
                      onClick={() => {
                        setInstitucaoSel(inst.id);
                        setGeradorEtapa('turmas');
                      }}
                      className="w-full text-left px-4 py-3 rounded-xl border transition-colors"
                      style={
                        institucaoSel === inst.id
                          ? { backgroundColor: t.accentSoft, borderColor: t.accentBorder, color: t.accentText }
                          : { backgroundColor: t.surface, borderColor: t.border, color: t.text }
                      }
                    >
                      <span className="text-sm font-medium">{inst.name}</span>
                    </button>
                  ))}
                  {instituicoes.length === 0 && (
                    <p className="text-xs" style={{ color: t.textFaint }}>
                      Nenhuma instituicao encontrada
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px]" style={{ color: t.textFaint }}>
                    Toque nas turmas, depois escolha se viram um login juntas ou separadas.
                  </p>
                  <button
                    onClick={() => setShowNovaTurma((v) => !v)}
                    className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium border transition-colors"
                    style={{ backgroundColor: t.accentSoft, color: t.accentText, borderColor: t.accentBorder }}
                  >
                    <Plus className="w-3 h-3" /> Nova turma
                  </button>
                </div>

                {showNovaTurma && (
                  <div className="rounded-xl p-3 space-y-2" style={{ backgroundColor: t.surfaceSunken, border: `1px solid ${t.border}` }}>
                    <div className="flex gap-2">
                      <input
                        value={novaSerie}
                        onChange={(e) => setNovaSerie(e.target.value)}
                        placeholder="Serie (ex.: 5º Ano)"
                        className="flex-1 min-w-0 rounded-lg px-3 py-2 text-sm outline-none"
                        style={{ backgroundColor: t.surface, border: `1px solid ${t.border}`, color: t.text }}
                      />
                      <input
                        value={novaLetra}
                        onChange={(e) => setNovaLetra(e.target.value.toUpperCase().slice(0, 2))}
                        placeholder="Letra"
                        className="w-16 rounded-lg px-3 py-2 text-sm outline-none text-center"
                        style={{ backgroundColor: t.surface, border: `1px solid ${t.border}`, color: t.text }}
                      />
                    </div>
                    <button
                      onClick={criarTurma}
                      disabled={processando || !novaSerie.trim() || !novaLetra.trim()}
                      className="w-full py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-40"
                      style={{ backgroundColor: t.accent, color: '#FFFFFF' }}
                    >
                      {processando ? 'Acrescentando...' : 'Acrescentar turma'}
                    </button>
                  </div>
                )}

                  <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                    {seriesOrdenadas.map(({ serie, turmas: ts }) => (
                      <div key={serie}>
                        <p className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: t.textFaint }}>
                          {serie}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {ts.map((tt) => {
                            const jaUsada = turmasEmGrupos.has(tt.id);
                            const ativa = selInline.includes(tt.id);
                            return (
                              <button
                                key={tt.id}
                                type="button"
                                disabled={jaUsada}
                                onClick={() => toggleInline(tt.id)}
                                className={cn(
                                  'px-2.5 py-1 rounded-lg text-xs border transition-colors',
                                  jaUsada && 'line-through cursor-not-allowed'
                                )}
                                style={
                                  jaUsada
                                    ? { backgroundColor: t.surfaceSunken, borderColor: t.border, color: t.textFaint }
                                    : ativa
                                    ? { backgroundColor: t.accent, borderColor: t.accent, color: '#FFFFFF' }
                                    : { backgroundColor: t.surfaceSunken, borderColor: t.border, color: t.textMuted }
                                }
                              >
                                {tt.turma_letra}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    {seriesOrdenadas.length === 0 && (
                      <p className="text-xs" style={{ color: t.textFaint }}>
                        Nenhuma turma cadastrada
                      </p>
                    )}
                  </div>

                {selInline.length > 0 && (
                  <div className="flex gap-2">
                    <button
                      onClick={adicionarGrupoJuntas}
                      className="flex-1 py-2 rounded-lg text-xs font-medium border transition-colors"
                      style={{ backgroundColor: t.accentSoft, color: t.accentText, borderColor: t.accentBorder }}
                    >
                      Juntar num login ({selInline.length})
                    </button>
                    <button
                      onClick={adicionarGruposSeparados}
                      className="flex-1 py-2 rounded-lg text-xs font-medium border transition-colors"
                      style={{ backgroundColor: t.surfaceSunken, color: t.textMuted, borderColor: t.border }}
                    >
                      Um login pra cada
                    </button>
                  </div>
                )}

                {grupos.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] uppercase tracking-wider" style={{ color: t.textFaint }}>
                      {grupos.length} login(s) a gerar
                    </p>
                    {grupos.map((g) => {
                      const ts = g.turmaIds.map((id) => turmaMap.get(id)).filter(Boolean) as TurmaOption[];
                      const email = `${prefixoDeGrupo(ts)}${DOMINIO_EMAIL}`;
                      return (
                        <div key={g.id} className="rounded-lg px-3 py-2" style={{ backgroundColor: t.surfaceSunken, border: `1px solid ${t.border}` }}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] truncate" style={{ color: t.textMuted }}>
                                {nomeDeGrupo(ts)}
                              </p>
                              <p className="text-sm font-mono truncate" style={{ color: t.text }}>
                                {email}
                              </p>
                              <p className="text-xs font-mono" style={{ color: t.accentText }}>
                                senha: {g.senha}
                              </p>
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <button onClick={() => regenerarSenhaGrupo(g.id)} title="Nova senha" className="p-1.5" style={{ color: t.textMuted }}>
                                <Dices className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => removerGrupo(g.id)} title="Remover" className="p-1.5" style={{ color: DANGER.text }}>
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
                  className="w-full py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-40"
                  style={{ backgroundColor: t.accent, color: '#FFFFFF' }}
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
