import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Check,
  Loader2,
  Route,
  ListChecks,
  AlertTriangle,
  Plus,
  Minus,
  RotateCcw,
  Layers,
  Square,
  CheckSquare,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { infantilTheme as t } from '@/styles/infantilTheme';

// As 8 inteligências (id == id na tabela inteligencias). Mesma lista/cores do
// banco de atividades, para coerência visual entre as telas do dono.
const INTELIGENCIAS = [
  { id: 1, nome: 'Linguística', cor: '#1E3A8A' },
  { id: 2, nome: 'Lógico-Matemática', cor: '#047857' },
  { id: 3, nome: 'Espacial', cor: '#7C3AED' },
  { id: 4, nome: 'Musical', cor: '#7F1D1D' },
  { id: 5, nome: 'Corporal-Cinestésica', cor: '#B8860B' },
  { id: 6, nome: 'Naturalista', cor: '#78350F' },
  { id: 7, nome: 'Interpessoal', cor: '#0891B2' },
  { id: 8, nome: 'Intrapessoal', cor: '#EA580C' },
];
const intelById = (id: number) => INTELIGENCIAS.find((i) => i.id === id) ?? null;
const ORDEM_PADRAO = INTELIGENCIAS.map((i) => i.id); // [1..8] canônica

// Segmentos: mesmos rótulos/ids da tela de Logins (AdminLoginsProfessoresPage).
// Turmas com segmento null caem em "Outras turmas", nunca ficam invisíveis. Como
// as atividades do banco são por segmento, filtrar aqui deixa o banco coerente.
const SEGMENTOS: { id: string; label: string }[] = [
  { id: 'infantil', label: 'Infantil' },
  { id: 'fundamental1', label: 'Fundamental 1' },
  { id: 'fundamental2', label: 'Fundamental 2' },
  { id: 'outros', label: 'Outras turmas' },
];
const segDaTurma = (tt: TurmaOption): string => tt.segmento || 'outros';

// A tabela turma_atividade_plano (e, dependendo do ambiente, turma_fase_ordem)
// pode não estar nos tipos gerados. Acesso destipado + leituras tolerantes.
const fromAny = (tb: string) =>
  (supabase.from as never as (tb: string) => ReturnType<typeof supabase.from>)(tb);

interface Instituicao {
  id: string;
  name: string;
}
interface TurmaOption {
  id: string;
  nome: string;
  serie: string;
  turma_letra: string;
  segmento: string | null;
}
interface Atividade {
  id: string;
  inteligencia_id: number;
  segmento: string | null;
  faixa: string | null;
  ordem: number;
  nome: string;
  objetivo: string | null;
  ativo: boolean;
}

// Chama a edge function dos logins (service role) para listar instituições e
// turmas. Mesma razão da tela de Logins: a RLS de `turmas` exige a instituição
// do usuário, e o dono (super_admin) não tem uma.
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
        /* mantém a mensagem genérica */
      }
    }
    throw new Error(msg);
  }
  const d = (data || {}) as { error?: string };
  if (d.error) throw new Error(d.error);
  return d as Record<string, unknown>;
}

const nomeTurma = (tt: TurmaOption): string => tt.nome || `${tt.serie} ${tt.turma_letra}`;

const colunaCss: React.CSSProperties = {
  backgroundColor: t.surface,
  border: `1px solid ${t.border}`,
  boxShadow: t.shadowSm,
};
const linhaBase = 'w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors';

/**
 * DEFINIÇÃO DE TRILHA (Painel Arboria, só do dono): por TURMA, monta
 *  (a) a ORDEM das 8 inteligências/fases da turma (turma_fase_ordem) e
 *  (b) QUAIS atividades do banco entram em cada fase, e em que ORDEM
 *      (turma_atividade_plano).
 * É esta tela que faz a atividade cadastrada no banco chegar à professora,
 * criando o vínculo turma + fase + atividade que hoje não existe.
 */
const ArboriaTrilhaPage = () => {
  // Cascata: Instituição -> Segmento -> Série -> Turma
  const [instSel, setInstSel] = useState<string | null>(null);
  const [segmentoSel, setSegmentoSel] = useState<string | null>(null);
  const [serieSel, setSerieSel] = useState<string | null>(null);
  const [turmaSel, setTurmaSel] = useState<string | null>(null);

  // Aplicar a trilha em lote a outras turmas do mesmo segmento
  const [loteSel, setLoteSel] = useState<Set<string>>(new Set());
  const [aplicandoLote, setAplicandoLote] = useState(false);

  // Trilha da turma: ordem das inteligências ATIVAS (subconjunto). A ordem é
  // implícita (posicao 1..N = posição no array). Inteligências fora do array
  // estão DESATIVADAS (não entram na trilha da turma).
  const [ordem, setOrdem] = useState<number[]>(ORDEM_PADRAO);
  const [ordemBase, setOrdemBase] = useState<number[]>(ORDEM_PADRAO);
  const [temConfig, setTemConfig] = useState(false); // turma tem trilha personalizada gravada?
  const [temConfigBase, setTemConfigBase] = useState(false);
  const [salvandoOrdem, setSalvandoOrdem] = useState(false);

  // Plano de atividades por fase (mapa inteligenciaId -> atividadeIds em ordem)
  const [plano, setPlano] = useState<Record<number, string[]>>({});
  const [faseAberta, setFaseAberta] = useState<number | null>(null);
  const [salvandoFase, setSalvandoFase] = useState<number | null>(null);
  const [planoIndisponivel, setPlanoIndisponivel] = useState(false);

  const anoLetivo = new Date().getFullYear();

  // ===== Instituições =====
  const { data: instituicoes = [] } = useQuery({
    queryKey: ['trilha-instituicoes'],
    queryFn: async () => {
      const d = await invocar({ acao: 'listar_instituicoes' });
      return (d.instituicoes || []) as Instituicao[];
    },
  });
  useEffect(() => {
    if (!instSel && instituicoes.length === 1) setInstSel(instituicoes[0].id);
  }, [instituicoes, instSel]);

  // ===== Turmas da instituição =====
  const { data: turmas = [] } = useQuery({
    queryKey: ['trilha-turmas', instSel],
    enabled: !!instSel,
    queryFn: async () => {
      const d = await invocar({ acao: 'listar_turmas', institutionId: instSel ?? undefined });
      return (d.turmas || []) as TurmaOption[];
    },
  });
  const turmaMap = useMemo(() => new Map(turmas.map((tt) => [tt.id, tt])), [turmas]);
  // Segmentos que têm ao menos uma turma nesta instituição (na ordem canônica).
  const segmentosComTurmas = useMemo(() => {
    const set = new Set(turmas.map((tt) => segDaTurma(tt)));
    return SEGMENTOS.filter((s) => set.has(s.id));
  }, [turmas]);
  // Turmas do segmento em foco.
  const turmasDoSegmento = useMemo(
    () => turmas.filter((tt) => segDaTurma(tt) === segmentoSel),
    [turmas, segmentoSel]
  );
  const seriesDoSegmento = useMemo(
    () => [...new Set(turmasDoSegmento.map((tt) => tt.serie))],
    [turmasDoSegmento]
  );
  const turmasDaSerie = useMemo(
    () => turmasDoSegmento.filter((tt) => tt.serie === serieSel),
    [turmasDoSegmento, serieSel]
  );
  const turmaFocada = turmaSel ? turmaMap.get(turmaSel) ?? null : null;
  // Outras turmas do MESMO segmento (alvos possíveis do "aplicar em lote").
  const outrasTurmasDoSegmento = useMemo(
    () => turmasDoSegmento.filter((tt) => tt.id !== turmaSel),
    [turmasDoSegmento, turmaSel]
  );

  // ===== Banco de atividades da instituição =====
  const { data: atividades = [] } = useQuery({
    queryKey: ['trilha-atividades', instSel],
    enabled: !!instSel,
    queryFn: async () => {
      const { data, error } = await fromAny('atividades')
        .select('id, inteligencia_id, segmento, faixa, ordem, nome, objetivo, ativo')
        .eq('institution_id', instSel!)
        .order('ordem');
      if (error) throw error;
      return (data as unknown as Atividade[]) ?? [];
    },
  });

  // ===== Trilha gravada da turma (tolerante) =====
  // Retorna o subconjunto ATIVO na ordem gravada + se há config. Sem linhas =
  // turma usa a trilha PADRÃO (as 8, ordem canônica) via fallback do app.
  const { data: ordemData } = useQuery({
    queryKey: ['trilha-ordem', turmaSel, anoLetivo],
    enabled: !!turmaSel,
    retry: false,
    queryFn: async (): Promise<{ ativos: number[]; temConfig: boolean }> => {
      try {
        const { data, error } = await fromAny('turma_fase_ordem')
          .select('posicao, inteligencia_id')
          .eq('turma_id', turmaSel!)
          .eq('ano_letivo', anoLetivo)
          .order('posicao');
        if (error || !data) return { ativos: ORDEM_PADRAO, temConfig: false };
        const rows = data as unknown as Array<{ posicao: number; inteligencia_id: number }>;
        if (rows.length === 0) return { ativos: ORDEM_PADRAO, temConfig: false };
        const ativos = rows.sort((a, b) => a.posicao - b.posicao).map((r) => r.inteligencia_id);
        return { ativos, temConfig: true };
      } catch {
        return { ativos: ORDEM_PADRAO, temConfig: false };
      }
    },
  });

  // ===== Plano gravado da turma (tolerante) =====
  const { data: planoData } = useQuery({
    queryKey: ['trilha-plano', turmaSel, anoLetivo],
    enabled: !!turmaSel,
    retry: false,
    queryFn: async (): Promise<Record<number, string[]>> => {
      try {
        const { data, error } = await fromAny('turma_atividade_plano')
          .select('inteligencia_id, atividade_id, ordem, ativo')
          .eq('turma_id', turmaSel!)
          .eq('ano_letivo', anoLetivo)
          .eq('ativo', true)
          .order('ordem');
        if (error) {
          setPlanoIndisponivel(true);
          return {};
        }
        setPlanoIndisponivel(false);
        const rows = (data as unknown as Array<{ inteligencia_id: number; atividade_id: string; ordem: number }>) ?? [];
        const mapa: Record<number, string[]> = {};
        rows
          .sort((a, b) => a.ordem - b.ordem)
          .forEach((r) => {
            (mapa[r.inteligencia_id] ||= []).push(r.atividade_id);
          });
        return mapa;
      } catch {
        setPlanoIndisponivel(true);
        return {};
      }
    },
  });

  // Hidrata os estados editáveis quando a turma (ou os dados) mudam
  useEffect(() => {
    const ativos = ordemData?.ativos ?? ORDEM_PADRAO;
    const cfg = ordemData?.temConfig ?? false;
    setOrdem(ativos);
    setOrdemBase(ativos);
    setTemConfig(cfg);
    setTemConfigBase(cfg);
  }, [ordemData, turmaSel]);
  useEffect(() => {
    setPlano(planoData ?? {});
    setFaseAberta(null);
  }, [planoData, turmaSel]);
  // Ao trocar de turma (ou de segmento), zera a seleção de turmas do lote.
  useEffect(() => {
    setLoteSel(new Set());
  }, [turmaSel, segmentoSel]);

  // Atividades do banco que servem esta fase para esta turma (intel + segmento + faixa)
  const atividadesDaFase = (intelId: number): Atividade[] => {
    const seg = turmaFocada?.segmento ?? null;
    const serie = turmaFocada?.serie ?? null;
    return atividades
      .filter((a) => a.inteligencia_id === intelId && a.ativo)
      .filter((a) => !seg || !a.segmento || a.segmento === seg)
      .filter((a) => !a.faixa || a.faixa === serie)
      .sort((a, b) => a.ordem - b.ordem);
  };

  // Inteligências DESATIVADAS (fora da trilha da turma), na ordem canônica.
  const inativos = useMemo(
    () => INTELIGENCIAS.filter((i) => !ordem.includes(i.id)),
    [ordem]
  );
  const ordemMudou = useMemo(() => ordem.join(',') !== ordemBase.join(','), [ordem, ordemBase]);

  const moverOrdem = (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= ordem.length) return;
    setOrdem((prev) => {
      const arr = [...prev];
      [arr[idx], arr[j]] = [arr[j], arr[idx]];
      return arr;
    });
  };

  // Ativar uma inteligência: entra no fim da trilha. Desativar: sai (nunca deixa
  // a trilha vazia, precisa de ao menos 1 fase).
  const ativar = (intelId: number) => setOrdem((prev) => (prev.includes(intelId) ? prev : [...prev, intelId]));
  const desativar = (intelId: number) => {
    setOrdem((prev) => {
      if (prev.length <= 1) {
        toast.error('A trilha precisa de ao menos uma inteligência ativa.');
        return prev;
      }
      return prev.filter((id) => id !== intelId);
    });
  };

  const salvarOrdem = async () => {
    if (!turmaSel || !turmaFocada || !instSel) return;
    if (ordem.length === 0) {
      toast.error('Ative ao menos uma inteligência antes de salvar.');
      return;
    }
    setSalvandoOrdem(true);
    try {
      // Grava SÓ as fases ATIVAS, posicao 1..N contígua na ordem do array. As
      // UNIQUE (turma+ano+posicao) e (turma+ano+inteligencia) aceitam o
      // subconjunto. Delete+insert atômico do ponto de vista do dono
      // (ferramenta mono-usuário): apaga a trilha antiga e reinsere a atual.
      const del = await fromAny('turma_fase_ordem')
        .delete()
        .eq('turma_id', turmaSel)
        .eq('ano_letivo', anoLetivo);
      if (del.error) throw del.error;
      const linhas = ordem.map((intelId, i) => ({
        institution_id: instSel,
        turma_id: turmaSel,
        ano_letivo: anoLetivo,
        posicao: i + 1,
        inteligencia_id: intelId,
      }));
      const ins = await fromAny('turma_fase_ordem').insert(linhas as never);
      if (ins.error) throw ins.error;
      setOrdemBase(ordem);
      setTemConfig(true);
      setTemConfigBase(true);
      toast.success('Trilha da turma salva.');
    } catch (e) {
      toast.error((e as Error).message || 'Não foi possível salvar a trilha.');
    } finally {
      setSalvandoOrdem(false);
    }
  };

  // Voltar para a trilha PADRÃO: apaga a config -> a turma passa a usar o
  // fallback do app (8 inteligências, ordem canônica).
  const restaurarPadrao = async () => {
    if (!turmaSel) return;
    setSalvandoOrdem(true);
    try {
      const del = await fromAny('turma_fase_ordem')
        .delete()
        .eq('turma_id', turmaSel)
        .eq('ano_letivo', anoLetivo);
      if (del.error) throw del.error;
      setOrdem(ORDEM_PADRAO);
      setOrdemBase(ORDEM_PADRAO);
      setTemConfig(false);
      setTemConfigBase(false);
      toast.success('Trilha padrão restaurada (as 8 inteligências).');
    } catch (e) {
      toast.error((e as Error).message || 'Não foi possível restaurar a trilha padrão.');
    } finally {
      setSalvandoOrdem(false);
    }
  };

  // ===== Plano por fase =====
  const atividadeSelecionada = (intelId: number, ativId: string) =>
    (plano[intelId] ?? []).includes(ativId);

  const toggleAtividade = (intelId: number, ativId: string) => {
    setPlano((prev) => {
      const atual = prev[intelId] ?? [];
      const nova = atual.includes(ativId)
        ? atual.filter((id) => id !== ativId)
        : [...atual, ativId];
      return { ...prev, [intelId]: nova };
    });
  };

  const moverAtividade = (intelId: number, idx: number, dir: -1 | 1) => {
    setPlano((prev) => {
      const atual = [...(prev[intelId] ?? [])];
      const j = idx + dir;
      if (j < 0 || j >= atual.length) return prev;
      [atual[idx], atual[j]] = [atual[j], atual[idx]];
      return { ...prev, [intelId]: atual };
    });
  };

  const salvarFase = async (intelId: number) => {
    if (!turmaSel || !instSel) return;
    setSalvandoFase(intelId);
    try {
      // Substitui o plano da fase: apaga o que havia e reinsere a seleção em
      // ordem. Idempotente e simples (curadoria do dono).
      const del = await fromAny('turma_atividade_plano')
        .delete()
        .eq('turma_id', turmaSel)
        .eq('ano_letivo', anoLetivo)
        .eq('inteligencia_id', intelId);
      if (del.error) throw del.error;
      const ids = plano[intelId] ?? [];
      if (ids.length > 0) {
        const linhas = ids.map((ativId, i) => ({
          institution_id: instSel,
          turma_id: turmaSel,
          ano_letivo: anoLetivo,
          inteligencia_id: intelId,
          atividade_id: ativId,
          ordem: i + 1,
          ativo: true,
        }));
        const ins = await fromAny('turma_atividade_plano').insert(linhas as never);
        if (ins.error) throw ins.error;
      }
      setPlanoIndisponivel(false);
      toast.success('Atividades desta fase salvas.');
    } catch (e) {
      setPlanoIndisponivel(true);
      toast.error(
        (e as Error).message ||
          'Não foi possível salvar. Aplique a migration turma_atividade_plano.'
      );
    } finally {
      setSalvandoFase(null);
    }
  };

  // ===== Aplicar a trilha em lote a outras turmas do mesmo segmento =====
  // Grava, numa turma alvo, exatamente a config mostrada na tela (a ordem das
  // fases + o plano de atividades por fase). Reusa o mesmo mecanismo das duas
  // funções de salvar acima: delete + insert de turma_fase_ordem e de
  // turma_atividade_plano. Lança em erro para o chamador tratar por turma.
  const gravarConfigNaTurma = async (alvoTurmaId: string) => {
    if (!instSel) throw new Error('Instituição não selecionada.');

    // (a) Ordem das fases: apaga a trilha antiga da turma alvo e reinsere a atual.
    const delOrdem = await fromAny('turma_fase_ordem')
      .delete()
      .eq('turma_id', alvoTurmaId)
      .eq('ano_letivo', anoLetivo);
    if (delOrdem.error) throw delOrdem.error;
    const linhasOrdem = ordem.map((intelId, i) => ({
      institution_id: instSel,
      turma_id: alvoTurmaId,
      ano_letivo: anoLetivo,
      posicao: i + 1,
      inteligencia_id: intelId,
    }));
    const insOrdem = await fromAny('turma_fase_ordem').insert(linhasOrdem as never);
    if (insOrdem.error) throw insOrdem.error;

    // (b) Plano de atividades: apaga todo o plano da turma alvo e reinsere as
    // fases ATIVAS na ordem atual. Fases fora da trilha não entram.
    const delPlano = await fromAny('turma_atividade_plano')
      .delete()
      .eq('turma_id', alvoTurmaId)
      .eq('ano_letivo', anoLetivo);
    if (delPlano.error) throw delPlano.error;
    const linhasPlano: Record<string, unknown>[] = [];
    ordem.forEach((intelId) => {
      (plano[intelId] ?? []).forEach((ativId, i) => {
        linhasPlano.push({
          institution_id: instSel,
          turma_id: alvoTurmaId,
          ano_letivo: anoLetivo,
          inteligencia_id: intelId,
          atividade_id: ativId,
          ordem: i + 1,
          ativo: true,
        });
      });
    });
    if (linhasPlano.length > 0) {
      const insPlano = await fromAny('turma_atividade_plano').insert(linhasPlano as never);
      if (insPlano.error) throw insPlano.error;
    }
  };

  const toggleLote = (turmaId: string) => {
    setLoteSel((prev) => {
      const nova = new Set(prev);
      if (nova.has(turmaId)) nova.delete(turmaId);
      else nova.add(turmaId);
      return nova;
    });
  };
  const marcarTodasDoLote = () =>
    setLoteSel(new Set(outrasTurmasDoSegmento.map((tt) => tt.id)));
  const limparLote = () => setLoteSel(new Set());

  const aplicarEmLote = async () => {
    if (!turmaSel || !instSel || loteSel.size === 0) return;
    if (ordem.length === 0) {
      toast.error('Ative ao menos uma inteligência antes de aplicar.');
      return;
    }
    setAplicandoLote(true);
    const alvos = [...loteSel];
    // Sequencial e tolerante: uma turma que falhar não aborta o restante. O
    // motivo do erro NÃO é engolido: guardamos a mensagem por turma para o toast
    // (antes um `catch {}` vazio escondia a causa e a falha ficava invisível).
    const falhas: { id: string; msg: string }[] = [];
    for (const alvoId of alvos) {
      try {
        await gravarConfigNaTurma(alvoId);
      } catch (e) {
        falhas.push({ id: alvoId, msg: (e as Error)?.message || 'erro desconhecido' });
      }
    }
    setAplicandoLote(false);
    const falhasIds = falhas.map((f) => f.id);
    const ok = alvos.length - falhasIds.length;
    const nomesFalhas = falhasIds.map((id) => {
      const tt = turmaMap.get(id);
      return tt ? nomeTurma(tt) : id;
    });
    // Motivo (a mensagem mais comum entre as falhas) para o dono ver a causa real.
    const motivo = falhas.length ? falhas[0].msg : '';
    if (falhasIds.length === 0) {
      toast.success(`Trilha aplicada a ${ok} turma${ok === 1 ? '' : 's'}.`);
      setLoteSel(new Set());
    } else if (ok === 0) {
      toast.error(
        `Não foi possível aplicar. Falhou em: ${nomesFalhas.join(', ')}.${motivo ? ` Motivo: ${motivo}` : ''}`
      );
      setLoteSel(new Set(falhasIds));
    } else {
      toast.warning(
        `Trilha aplicada a ${ok} turma${ok === 1 ? '' : 's'}. Falhou em: ${nomesFalhas.join(', ')}.${motivo ? ` Motivo: ${motivo}` : ''}`
      );
      // Mantém marcadas só as que falharam, para reenvio.
      setLoteSel(new Set(falhasIds));
    }
  };

  return (
    <div className="pb-10">
      <div className="mb-1">
        <h1 className="font-serif text-[22px]" style={{ color: t.text }}>
          Definição de Trilha
        </h1>
      </div>
      <p className="text-sm mb-4" style={{ color: t.textMuted }}>
        Escolha a instituição, o segmento, a série e a turma. Depois monte a ordem das fases e, em cada
        fase, quais atividades do banco entram e em que sequência.
      </p>

      {/* CASCATA: instituição -> segmento -> série -> turma */}
      <div className="flex gap-3 overflow-x-auto pb-2 items-start">
        {/* Instituição */}
        <div className="w-48 flex-shrink-0 rounded-2xl overflow-hidden" style={colunaCss}>
          <p className="px-3 py-2 text-[10px] uppercase tracking-wider font-semibold" style={{ color: t.textFaint }}>
            Instituição
          </p>
          {instituicoes.map((inst) => {
            const ativa = inst.id === instSel;
            return (
              <button
                key={inst.id}
                onClick={() => {
                  setInstSel(inst.id);
                  setSegmentoSel(null);
                  setSerieSel(null);
                  setTurmaSel(null);
                }}
                className={linhaBase}
                style={{
                  backgroundColor: ativa ? t.accentSoft : 'transparent',
                  borderLeft: `3px solid ${ativa ? t.accent : 'transparent'}`,
                  borderBottom: `1px solid ${t.border}`,
                }}
              >
                <span
                  className="flex-1 text-[13px] truncate"
                  style={{ color: ativa ? t.text : t.textMuted, fontWeight: ativa ? 700 : 500 }}
                >
                  {inst.name}
                </span>
                {ativa && <ChevronRight size={14} style={{ color: t.accent }} />}
              </button>
            );
          })}
          {instituicoes.length === 0 && (
            <p className="px-3 py-4 text-[11px]" style={{ color: t.textFaint }}>
              Carregando…
            </p>
          )}
        </div>

        {/* Segmento */}
        <div className="w-44 flex-shrink-0 rounded-2xl overflow-hidden" style={colunaCss}>
          <p className="px-3 py-2 text-[10px] uppercase tracking-wider font-semibold" style={{ color: t.textFaint }}>
            Segmento
          </p>
          {!instSel ? (
            <p className="px-3 py-4 text-[11px]" style={{ color: t.textFaint }}>
              Escolha a instituição
            </p>
          ) : segmentosComTurmas.length === 0 ? (
            <p className="px-3 py-4 text-[11px]" style={{ color: t.textFaint }}>
              Nenhuma turma
            </p>
          ) : (
            segmentosComTurmas.map((seg) => {
              const ativa = seg.id === segmentoSel;
              return (
                <button
                  key={seg.id}
                  onClick={() => {
                    setSegmentoSel(seg.id);
                    setSerieSel(null);
                    setTurmaSel(null);
                  }}
                  className={linhaBase}
                  style={{
                    backgroundColor: ativa ? t.accentSoft : 'transparent',
                    borderLeft: `3px solid ${ativa ? t.accent : 'transparent'}`,
                    borderBottom: `1px solid ${t.border}`,
                  }}
                >
                  <span
                    className="flex-1 text-[13px] truncate"
                    style={{ color: ativa ? t.text : t.textMuted, fontWeight: ativa ? 700 : 500 }}
                  >
                    {seg.label}
                  </span>
                  {ativa && <ChevronRight size={14} style={{ color: t.accent }} />}
                </button>
              );
            })
          )}
        </div>

        {/* Série */}
        <div className="w-40 flex-shrink-0 rounded-2xl overflow-hidden" style={colunaCss}>
          <p className="px-3 py-2 text-[10px] uppercase tracking-wider font-semibold" style={{ color: t.textFaint }}>
            Série
          </p>
          {!segmentoSel ? (
            <p className="px-3 py-4 text-[11px]" style={{ color: t.textFaint }}>
              Escolha o segmento
            </p>
          ) : seriesDoSegmento.length === 0 ? (
            <p className="px-3 py-4 text-[11px]" style={{ color: t.textFaint }}>
              Nenhuma série
            </p>
          ) : (
            seriesDoSegmento.map((serie) => {
              const ativa = serie === serieSel;
              return (
                <button
                  key={serie}
                  onClick={() => {
                    setSerieSel(serie);
                    setTurmaSel(null);
                  }}
                  className={linhaBase}
                  style={{
                    backgroundColor: ativa ? t.accentSoft : 'transparent',
                    borderLeft: `3px solid ${ativa ? t.accent : 'transparent'}`,
                    borderBottom: `1px solid ${t.border}`,
                  }}
                >
                  <span
                    className="flex-1 text-[13px] truncate"
                    style={{ color: ativa ? t.text : t.textMuted, fontWeight: ativa ? 700 : 500 }}
                  >
                    {serie}
                  </span>
                  {ativa && <ChevronRight size={14} style={{ color: t.accent }} />}
                </button>
              );
            })
          )}
        </div>

        {/* Turma */}
        <div className="w-40 flex-shrink-0 rounded-2xl overflow-hidden" style={colunaCss}>
          <p className="px-3 py-2 text-[10px] uppercase tracking-wider font-semibold" style={{ color: t.textFaint }}>
            Turma
          </p>
          {!serieSel ? (
            <p className="px-3 py-4 text-[11px]" style={{ color: t.textFaint }}>
              Escolha a série
            </p>
          ) : (
            turmasDaSerie.map((tt) => {
              const ativa = tt.id === turmaSel;
              return (
                <button
                  key={tt.id}
                  onClick={() => setTurmaSel(tt.id)}
                  className={linhaBase}
                  style={{
                    backgroundColor: ativa ? t.accentSoft : 'transparent',
                    borderLeft: `3px solid ${ativa ? t.accent : 'transparent'}`,
                    borderBottom: `1px solid ${t.border}`,
                  }}
                >
                  <span
                    className="flex-1 text-[13px] truncate"
                    style={{ color: ativa ? t.text : t.textMuted, fontWeight: ativa ? 700 : 500 }}
                  >
                    Turma {tt.turma_letra}
                  </span>
                  {ativa && <ChevronRight size={14} style={{ color: t.accent }} />}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* DETALHE DA TURMA */}
      {!turmaFocada ? (
        <div className="rounded-2xl p-8 mt-3 text-center" style={colunaCss}>
          <p className="text-[13px]" style={{ color: t.textFaint }}>
            Escolha uma turma para montar a trilha dela.
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <p className="text-sm font-semibold" style={{ color: t.text }}>
            {nomeTurma(turmaFocada)}
          </p>

          {planoIndisponivel && (
            <div
              className="rounded-xl p-3 flex gap-2.5"
              style={{ backgroundColor: '#FBF3E6', border: '1px solid #EAD9B8' }}
            >
              <AlertTriangle size={18} style={{ color: '#8A5A12' }} className="flex-shrink-0 mt-0.5" />
              <p className="text-xs leading-relaxed" style={{ color: '#8A5A12' }}>
                A tabela do plano de atividades ainda não está disponível neste ambiente. A tela funciona,
                mas o salvamento das atividades por fase só grava depois que a migration
                turma_atividade_plano for aplicada.
              </p>
            </div>
          )}

          {/* SEÇÃO A: trilha da turma (ativar/desativar + ordem) */}
          <section className="rounded-2xl p-4" style={colunaCss}>
            <div className="flex items-center gap-2 mb-1">
              <Route size={18} style={{ color: t.accent }} strokeWidth={1.75} />
              <h2 className="text-sm font-semibold" style={{ color: t.text }}>
                Trilha da turma
              </h2>
            </div>
            <p className="text-xs mb-3" style={{ color: t.textMuted }}>
              Escolha QUAIS inteligências esta turma percorre no ano e em que ORDEM. Ative ou
              desative cada uma; reordene as ativas com as setas.
            </p>

            {/* Estado da trilha: padrão (sem config) vs personalizada */}
            <div
              className="rounded-xl px-3 py-2 mb-3 flex items-center gap-2"
              style={{
                backgroundColor: temConfig ? t.accentSoft : t.surfaceSunken,
                border: `1px solid ${temConfig ? t.accentBorder : t.border}`,
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: temConfig ? t.accent : t.textFaint }}
              />
              <p className="text-[12px]" style={{ color: temConfig ? t.accentText : t.textMuted }}>
                {temConfig
                  ? `Trilha personalizada: ${ordem.length} de 8 inteligências ativas, na ordem abaixo.`
                  : 'Esta turma usa a trilha padrão: as 8 inteligências, na ordem canônica. Personalize abaixo.'}
              </p>
            </div>

            {/* Ativas, em ordem */}
            <p className="text-[10px] uppercase tracking-wide font-semibold mb-1.5" style={{ color: t.textFaint }}>
              Na trilha (percorridas em ordem)
            </p>
            <ol className="space-y-1.5">
              {ordem.map((intelId, idx) => {
                const intel = intelById(intelId);
                return (
                  <li
                    key={intelId}
                    className="rounded-xl p-2.5 flex items-center gap-2.5"
                    style={{ backgroundColor: t.surfaceAlt, border: `1px solid ${t.border}` }}
                  >
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                      style={{ backgroundColor: `${intel?.cor ?? t.accent}18`, color: intel?.cor ?? t.accent }}
                    >
                      {idx + 1}
                    </span>
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: intel?.cor ?? t.accent }} />
                    <span className="flex-1 text-sm font-medium truncate" style={{ color: t.text }}>
                      {intel?.nome ?? `Inteligência ${intelId}`}
                    </span>
                    <div className="flex items-center flex-shrink-0">
                      <button
                        onClick={() => moverOrdem(idx, -1)}
                        disabled={idx === 0}
                        className="p-1.5 disabled:opacity-25"
                        style={{ color: t.textFaint }}
                        aria-label={`Subir ${intel?.nome ?? ''}`}
                      >
                        <ChevronUp size={16} />
                      </button>
                      <button
                        onClick={() => moverOrdem(idx, 1)}
                        disabled={idx === ordem.length - 1}
                        className="p-1.5 disabled:opacity-25"
                        style={{ color: t.textFaint }}
                        aria-label={`Descer ${intel?.nome ?? ''}`}
                      >
                        <ChevronDown size={16} />
                      </button>
                      <button
                        onClick={() => desativar(intelId)}
                        disabled={ordem.length <= 1}
                        className="p-1.5 disabled:opacity-25 ml-0.5"
                        style={{ color: t.textFaint }}
                        aria-label={`Desativar ${intel?.nome ?? ''}`}
                        title="Tirar da trilha"
                      >
                        <Minus size={16} />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ol>

            {/* Desativadas */}
            {inativos.length > 0 && (
              <>
                <p className="text-[10px] uppercase tracking-wide font-semibold mt-4 mb-1.5" style={{ color: t.textFaint }}>
                  Fora da trilha (toque para ativar)
                </p>
                <div className="space-y-1.5">
                  {inativos.map((intel) => (
                    <button
                      key={intel.id}
                      onClick={() => ativar(intel.id)}
                      className="w-full rounded-xl p-2.5 flex items-center gap-2.5 text-left"
                      style={{ backgroundColor: t.surface, border: `1px dashed ${t.silencio}` }}
                      aria-label={`Ativar ${intel.nome}`}
                    >
                      <span
                        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ border: `1px dashed ${t.silencio}`, color: t.textFaint }}
                      >
                        <Plus size={14} />
                      </span>
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: `${intel.cor}66` }} />
                      <span className="flex-1 text-sm font-medium truncate" style={{ color: t.textMuted }}>
                        {intel.nome}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}

            <div className="flex flex-wrap items-center gap-2 mt-4">
              <button
                onClick={salvarOrdem}
                disabled={!ordemMudou || salvandoOrdem}
                className="rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-40 flex items-center gap-2"
                style={{ backgroundColor: t.accent, color: '#FFFFFF' }}
              >
                {salvandoOrdem && <Loader2 size={15} className="animate-spin" />}
                Salvar trilha
              </button>
              {ordemMudou && !salvandoOrdem && (
                <button
                  onClick={() => setOrdem(ordemBase)}
                  className="rounded-xl px-3 py-2 text-sm font-medium"
                  style={{ backgroundColor: t.surfaceSunken, color: t.textMuted }}
                >
                  Desfazer
                </button>
              )}
              {(temConfig || temConfigBase) && !salvandoOrdem && (
                <button
                  onClick={restaurarPadrao}
                  className="rounded-xl px-3 py-2 text-sm font-medium flex items-center gap-1.5"
                  style={{ backgroundColor: t.surfaceSunken, color: t.textMuted }}
                >
                  <RotateCcw size={14} /> Restaurar trilha padrão
                </button>
              )}
            </div>
          </section>

          {/* SEÇÃO B: atividades por fase */}
          <section className="rounded-2xl p-4" style={colunaCss}>
            <div className="flex items-center gap-2 mb-1">
              <ListChecks size={18} style={{ color: t.accent }} strokeWidth={1.75} />
              <h2 className="text-sm font-semibold" style={{ color: t.text }}>
                Atividades de cada fase
              </h2>
            </div>
            <p className="text-xs mb-3" style={{ color: t.textMuted }}>
              Abra uma fase e escolha, do banco, quais atividades entram e em que ordem. Só o que estiver
              selecionado chega à professora.
            </p>

            <div className="space-y-2">
              {ordem.map((intelId, idx) => {
                const intel = intelById(intelId);
                const disponiveis = atividadesDaFase(intelId);
                const selecionados = plano[intelId] ?? [];
                const aberta = faseAberta === intelId;
                const mapaAtiv = new Map(disponiveis.map((a) => [a.id, a]));
                // seleção ordenada (só ids que ainda existem no banco)
                const selOrdenados = selecionados.filter((id) => mapaAtiv.has(id));
                const naoSelecionados = disponiveis.filter((a) => !selecionados.includes(a.id));

                return (
                  <div key={intelId} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${t.border}` }}>
                    <button
                      onClick={() => setFaseAberta(aberta ? null : intelId)}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left"
                      style={{ backgroundColor: aberta ? `${intel?.cor ?? t.accent}0F` : t.surface }}
                      aria-expanded={aberta}
                    >
                      <span
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                        style={{ backgroundColor: `${intel?.cor ?? t.accent}18`, color: intel?.cor ?? t.accent }}
                      >
                        {idx + 1}
                      </span>
                      <span className="flex-1 text-sm font-medium truncate" style={{ color: t.text }}>
                        {intel?.nome ?? `Inteligência ${intelId}`}
                      </span>
                      <span
                        className="text-[11px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                        style={{
                          backgroundColor: selOrdenados.length > 0 ? `${intel?.cor ?? t.accent}18` : t.surfaceSunken,
                          color: selOrdenados.length > 0 ? intel?.cor ?? t.accent : t.textFaint,
                        }}
                      >
                        {selOrdenados.length} escolhida{selOrdenados.length === 1 ? '' : 's'}
                      </span>
                      {aberta ? (
                        <ChevronDown size={16} style={{ color: t.textFaint }} />
                      ) : (
                        <ChevronRight size={16} style={{ color: t.textFaint }} />
                      )}
                    </button>

                    {aberta && (
                      <div className="p-3 space-y-3" style={{ backgroundColor: t.surfaceAlt }}>
                        {disponiveis.length === 0 ? (
                          <p className="text-xs py-2" style={{ color: t.textFaint }}>
                            Nenhuma atividade no banco para {intel?.nome ?? 'esta inteligência'} nesta série. Cadastre
                            no Banco de atividades primeiro.
                          </p>
                        ) : (
                          <>
                            {/* Selecionadas, em ordem */}
                            {selOrdenados.length > 0 && (
                              <div>
                                <p className="text-[10px] uppercase tracking-wide font-semibold mb-1.5" style={{ color: t.textFaint }}>
                                  No caminho desta fase
                                </p>
                                <div className="space-y-1.5">
                                  {selOrdenados.map((id, i) => {
                                    const a = mapaAtiv.get(id)!;
                                    return (
                                      <div
                                        key={id}
                                        className="rounded-lg p-2 flex items-center gap-2"
                                        style={{ backgroundColor: t.surface, border: `1px solid ${intel?.cor ?? t.accent}44` }}
                                      >
                                        <span
                                          className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                                          style={{ backgroundColor: `${intel?.cor ?? t.accent}18`, color: intel?.cor ?? t.accent }}
                                        >
                                          {i + 1}
                                        </span>
                                        <span className="flex-1 text-[13px] truncate" style={{ color: t.text }}>
                                          {a.nome}
                                        </span>
                                        <button
                                          onClick={() => moverAtividade(intelId, i, -1)}
                                          disabled={i === 0}
                                          className="p-1 disabled:opacity-25"
                                          style={{ color: t.textFaint }}
                                          aria-label="Subir atividade"
                                        >
                                          <ChevronUp size={15} />
                                        </button>
                                        <button
                                          onClick={() => moverAtividade(intelId, i, 1)}
                                          disabled={i === selOrdenados.length - 1}
                                          className="p-1 disabled:opacity-25"
                                          style={{ color: t.textFaint }}
                                          aria-label="Descer atividade"
                                        >
                                          <ChevronDown size={15} />
                                        </button>
                                        <button
                                          onClick={() => toggleAtividade(intelId, id)}
                                          className="p-1"
                                          style={{ color: intel?.cor ?? t.accent }}
                                          aria-label="Tirar do caminho"
                                        >
                                          <Check size={16} />
                                        </button>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Disponíveis (não selecionadas) */}
                            {naoSelecionados.length > 0 && (
                              <div>
                                <p className="text-[10px] uppercase tracking-wide font-semibold mb-1.5" style={{ color: t.textFaint }}>
                                  No banco (toque para incluir)
                                </p>
                                <div className="space-y-1.5">
                                  {naoSelecionados.map((a) => (
                                    <button
                                      key={a.id}
                                      onClick={() => toggleAtividade(intelId, a.id)}
                                      className="w-full rounded-lg p-2 flex items-center gap-2 text-left"
                                      style={{ backgroundColor: t.surface, border: `1px dashed ${t.silencio}` }}
                                    >
                                      <span
                                        className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                                        style={{ border: `1px dashed ${t.silencio}`, color: t.textFaint }}
                                      >
                                        <span className="block w-2 h-2 rounded-full" style={{ backgroundColor: 'transparent' }} />
                                      </span>
                                      <span className="flex-1 min-w-0">
                                        <span className="block text-[13px] truncate" style={{ color: t.text }}>
                                          {a.nome}
                                        </span>
                                        {a.objetivo && (
                                          <span className="block text-[11px] truncate" style={{ color: t.textFaint }}>
                                            {a.objetivo}
                                          </span>
                                        )}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            <button
                              onClick={() => salvarFase(intelId)}
                              disabled={salvandoFase === intelId}
                              className="w-full rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                              style={{ backgroundColor: t.accent, color: '#FFFFFF' }}
                            >
                              {salvandoFase === intelId && <Loader2 size={15} className="animate-spin" />}
                              Salvar atividades desta fase
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* SEÇÃO C: aplicar esta trilha a outras turmas do mesmo segmento */}
          <section className="rounded-2xl p-4" style={colunaCss}>
            <div className="flex items-center gap-2 mb-1">
              <Layers size={18} style={{ color: t.accent }} strokeWidth={1.75} />
              <h2 className="text-sm font-semibold" style={{ color: t.text }}>
                Aplicar esta trilha a outras turmas
              </h2>
            </div>
            <p className="text-xs mb-3" style={{ color: t.textMuted }}>
              Copia a trilha e as atividades por fase, exatamente como estão nesta tela, para as turmas
              marcadas. Só turmas do mesmo segmento, porque as atividades são por segmento. Cada turma
              marcada tem sua trilha e seu plano substituídos.
            </p>

            {outrasTurmasDoSegmento.length === 0 ? (
              <p className="text-xs py-2" style={{ color: t.textFaint }}>
                Não há outras turmas neste segmento para receber a trilha.
              </p>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <button
                    onClick={marcarTodasDoLote}
                    className="text-[12px] font-medium rounded-lg px-2.5 py-1"
                    style={{ backgroundColor: t.surfaceSunken, color: t.textMuted }}
                  >
                    Marcar todas
                  </button>
                  {loteSel.size > 0 && (
                    <button
                      onClick={limparLote}
                      className="text-[12px] font-medium rounded-lg px-2.5 py-1"
                      style={{ backgroundColor: t.surfaceSunken, color: t.textMuted }}
                    >
                      Limpar
                    </button>
                  )}
                  <span className="text-[11px] ml-auto" style={{ color: t.textFaint }}>
                    {loteSel.size} marcada{loteSel.size === 1 ? '' : 's'}
                  </span>
                </div>

                <div className="space-y-1.5">
                  {outrasTurmasDoSegmento.map((tt) => {
                    const marcada = loteSel.has(tt.id);
                    return (
                      <button
                        key={tt.id}
                        onClick={() => toggleLote(tt.id)}
                        disabled={aplicandoLote}
                        className="w-full rounded-xl p-2.5 flex items-center gap-2.5 text-left disabled:opacity-60"
                        style={{
                          backgroundColor: marcada ? t.accentSoft : t.surface,
                          border: `1px solid ${marcada ? t.accentBorder : t.border}`,
                        }}
                        aria-pressed={marcada}
                      >
                        {marcada ? (
                          <CheckSquare size={18} style={{ color: t.accent }} className="flex-shrink-0" />
                        ) : (
                          <Square size={18} style={{ color: t.textFaint }} className="flex-shrink-0" />
                        )}
                        <span
                          className="flex-1 text-[13px] truncate"
                          style={{ color: marcada ? t.accentText : t.text, fontWeight: marcada ? 700 : 500 }}
                        >
                          {nomeTurma(tt)}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={aplicarEmLote}
                  disabled={loteSel.size === 0 || aplicandoLote}
                  className="w-full mt-3 rounded-xl py-2.5 text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
                  style={{ backgroundColor: t.accent, color: '#FFFFFF' }}
                >
                  {aplicandoLote && <Loader2 size={15} className="animate-spin" />}
                  Aplicar a {loteSel.size} turma{loteSel.size === 1 ? '' : 's'}
                </button>
              </>
            )}
          </section>
        </div>
      )}

      {atividades.length === 0 && instSel && turmaFocada && (
        <div className="mt-3">
          <Skeleton className="h-4 w-40 rounded" />
        </div>
      )}
    </div>
  );
};

export default ArboriaTrilhaPage;
