import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Shield, ChevronDown, Paperclip, Settings2, Route, Clock, Flag, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useProfessor } from '@/contexts/ProfessorContext';
import { infantilTheme as t } from '@/styles/infantilTheme';
import { corDaCasa } from '@/config/f2Reforma';
import { formatTurmaLabel } from '@/lib/infantil';
import { Skeleton } from '@/components/ui/skeleton';
import { useTurmasDaCasaAtiva, type TurmaDaCasaAtiva, type StatusTurmaCasa } from '@/hooks/useTurmasDaCasaAtiva';
import { useF2Panorama } from '@/hooks/useF2Panorama';
import F2Panorama from '@/components/professor/f2/F2Panorama';
import F2ViradaExperience, { type F2ViradaDados } from '@/components/professor/f2/F2ViradaExperience';

// Tabelas da reforma (capitulo_encontros/anexos/turma) e colunas novas podem
// não estar nos tipos gerados; via `sb` (any) para o build não quebrar.
const sb = supabase as any;

interface Encontro {
  id: string;
  ordem: number;
  titulo: string;
  objetivo: string | null;
  instrucoes: string | null;
}
interface Anexo {
  id: string;
  encontro_id: string;
  url: string;
  nome: string | null;
  tipo: string | null;
}
interface CapaCapitulo {
  capitulo: { id: string; numero: number; nome: string; frase_ancora: string | null; descricao: string | null } | null;
  encontros: Encontro[];
  anexosPorEncontro: Record<string, Anexo[]>;
  atualEncontroId: string | null;
}

const SELO: Record<StatusTurmaCasa, { texto: string; forte: boolean }> = {
  vez: { texto: 'Sua vez', forte: true },
  caminho: { texto: 'A caminho', forte: false },
  depois: { texto: 'Depois', forte: false },
};

/** Escudo da Casa: usa o brasão real se houver, senão um escudo na cor da Casa. */
const EscudoCasa = ({
  casaId,
  brasao,
  size = 40,
}: {
  casaId: number | null;
  brasao: string | null;
  size?: number;
}) => {
  const cor = corDaCasa(casaId);
  if (brasao) {
    return (
      <img
        src={brasao}
        alt=""
        className="object-contain flex-shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="rounded-xl flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size, backgroundColor: `${cor}1A` }}
    >
      <Shield size={size * 0.55} style={{ color: cor }} strokeWidth={1.75} />
    </span>
  );
};

/** Cartão de turma na grade. `compact` = grade menor (3 colunas). */
const CartaoTurma = ({
  turma,
  ativo,
  onClick,
  compact = false,
}: {
  turma: TurmaDaCasaAtiva;
  ativo: boolean;
  onClick: () => void;
  compact?: boolean;
}) => {
  const selo = SELO[turma.status];
  // "Depois" polui a grade (quase toda turma cai nesse estado): mostra so o nome.
  const mostrarSelo = turma.status !== 'depois';
  const cor = corDaCasa(turma.casaAtualId);
  // Selecionada = card indigo (fundo do acento), com texto claro.
  const corTexto = ativo ? '#FFFFFF' : t.text;
  const corSub = ativo ? 'rgba(255,255,255,0.72)' : t.textFaint;
  return (
    <button
      onClick={onClick}
      className={`w-full h-full rounded-2xl text-left transition-transform active:scale-[0.99] ${compact ? 'p-2.5' : 'p-3'}`}
      style={{
        backgroundColor: ativo ? t.accent : t.surface,
        border: ativo ? `1.5px solid ${t.accent}` : `1px solid ${t.border}`,
        boxShadow: ativo ? t.shadowMd : t.shadowSm,
      }}
      aria-pressed={ativo}
    >
      <div className="flex items-center gap-2">
        <EscudoCasa casaId={turma.casaAtualId} brasao={turma.casaAtualBrasao} size={compact ? 30 : 38} />
        <div className="min-w-0">
          <p className={`font-bold truncate ${compact ? 'text-[13px]' : 'text-sm'}`} style={{ color: corTexto }}>
            {formatTurmaLabel(turma.serie, turma.turma_letra) || turma.nome}
          </p>
          {turma.casaAtualNome && !compact && (
            <p className="text-[11px] truncate" style={{ color: corSub }}>
              Casa {turma.casaAtualNome}
            </p>
          )}
        </div>
      </div>
      {mostrarSelo && (
        <span
          className={`inline-block uppercase tracking-wide font-bold rounded-full ${
            compact ? 'mt-2 text-[9px] px-1.5 py-0.5' : 'mt-2.5 text-[10px] px-2 py-0.5'
          }`}
          style={
            ativo
              ? { backgroundColor: 'rgba(255,255,255,0.2)', color: '#FFFFFF' }
              : selo.forte
                ? { backgroundColor: t.accent, color: '#FFFFFF' }
                : { backgroundColor: `${cor}14`, color: cor }
          }
        >
          {selo.texto}
        </span>
      )}
    </button>
  );
};

/** Uma etapa (encontro) da jornada do capítulo. Clicável: abre instruções e anexos. */
const EtapaEncontro = ({
  encontro,
  posicao,
  atual,
  anexos,
  aberto,
  onToggle,
}: {
  encontro: Encontro;
  posicao: number;
  atual: boolean;
  anexos: Anexo[];
  aberto: boolean;
  onToggle: () => void;
}) => (
  <div
    className="rounded-xl overflow-hidden"
    style={{
      border: atual ? `1.5px solid ${t.accent}` : `1px solid ${t.border}`,
      backgroundColor: atual ? t.accentSoft : t.surface,
    }}
  >
    <button onClick={onToggle} className="w-full flex items-center gap-2.5 p-3 text-left">
      <span
        className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
        style={{
          backgroundColor: atual ? t.accent : t.surfaceSunken,
          color: atual ? '#FFFFFF' : t.textMuted,
        }}
      >
        {posicao}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold truncate" style={{ color: t.text }}>
          {encontro.titulo}
        </span>
        {atual && (
          <span className="block text-[10px] uppercase tracking-wide font-bold" style={{ color: t.accentText }}>
            Etapa atual
          </span>
        )}
      </span>
      <ChevronDown
        size={16}
        style={{ color: t.textFaint, transform: aberto ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}
      />
    </button>

    {aberto && (
      <div className="px-3 pb-3 space-y-2.5" style={{ borderTop: `1px solid ${t.border}` }}>
        {encontro.objetivo && (
          <p className="text-xs mt-2.5 leading-relaxed" style={{ color: t.textMuted }}>
            <span className="font-semibold" style={{ color: t.text }}>Objetivo. </span>
            {encontro.objetivo}
          </p>
        )}
        {encontro.instrucoes ? (
          <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: t.textMuted }}>
            {encontro.instrucoes}
          </p>
        ) : (
          <p className="text-xs italic" style={{ color: t.textFaint }}>
            Sem instruções cadastradas para esta etapa.
          </p>
        )}

        {anexos.length > 0 && (
          <div className="space-y-1.5 pt-1">
            {anexos.map((a) => (
              <a
                key={a.id}
                href={a.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm"
                style={{ backgroundColor: t.surfaceAlt, color: t.accentText }}
              >
                <Paperclip size={14} strokeWidth={2} />
                <span className="truncate">{a.nome || a.tipo || 'Anexo'}</span>
              </a>
            ))}
          </div>
        )}
      </div>
    )}
  </div>
);

/** Capa do capítulo da turma cuja vez é do mentor. */
const CapaCapituloTurma = ({
  turma,
  casaMentorNome,
  onAdministrar,
  onFinalizarFase,
}: {
  turma: TurmaDaCasaAtiva;
  casaMentorNome: string | null;
  onAdministrar: () => void;
  onFinalizarFase: () => void;
}) => {
  const { profile, casaMentor } = useProfessor();
  const [aberto, setAberto] = useState<string | null>(null);

  const { data, isLoading } = useQuery<CapaCapitulo>({
    queryKey: ['f2-capa-capitulo', profile?.institution_id, casaMentor?.id, turma.turma_id],
    enabled: !!profile?.institution_id && !!casaMentor?.id,
    queryFn: async (): Promise<CapaCapitulo> => {
      const ano = new Date().getFullYear();
      const vazio: CapaCapitulo = { capitulo: null, encontros: [], anexosPorEncontro: {}, atualEncontroId: null };

      const { data: fase } = await sb
        .from('fases')
        .select('id')
        .eq('institution_id', profile!.institution_id)
        .eq('segmento', 'fundamental2')
        .eq('ano_letivo', ano)
        .eq('inteligencia_id', casaMentor!.id)
        .maybeSingle();
      if (!fase) return vazio;

      const { data: cap } = await sb
        .from('capitulos')
        .select('id, numero, nome, frase_ancora, descricao_convocacao')
        .eq('institution_id', profile!.institution_id)
        .eq('fase_id', fase.id)
        .eq('ativo', true)
        .maybeSingle();
      if (!cap) return vazio;

      const { data: encRaw } = await sb
        .from('capitulo_encontros')
        .select('id, ordem, titulo, objetivo, instrucoes')
        .eq('capitulo_id', cap.id)
        .order('ordem');
      const encontros = (encRaw as Encontro[]) ?? [];
      const encontroIds = encontros.map((e) => e.id);

      const [anexosRes, instRes] = await Promise.all([
        encontroIds.length
          ? sb
              .from('capitulo_encontro_anexos')
              .select('id, encontro_id, url, nome, tipo, ordem')
              .in('encontro_id', encontroIds)
              .order('ordem')
          : Promise.resolve({ data: [] }),
        encontroIds.length
          ? sb
              .from('capitulo_encontro_turma')
              .select('encontro_id, realizado')
              .eq('turma_id', turma.turma_id)
              .in('encontro_id', encontroIds)
          : Promise.resolve({ data: [] }),
      ]);

      const anexosPorEncontro: Record<string, Anexo[]> = {};
      ((anexosRes.data as Anexo[]) ?? []).forEach((a) => {
        (anexosPorEncontro[a.encontro_id] ||= []).push(a);
      });

      // Etapa atual: primeira ainda não realizada (por ordem); senão a primeira.
      const realizados = new Set(
        ((instRes.data as { encontro_id: string; realizado: boolean }[]) ?? [])
          .filter((r) => r.realizado)
          .map((r) => r.encontro_id)
      );
      const atual = encontros.find((e) => !realizados.has(e.id)) ?? encontros[0] ?? null;

      return {
        capitulo: {
          id: cap.id,
          numero: cap.numero,
          nome: cap.nome,
          frase_ancora: cap.frase_ancora ?? null,
          descricao: cap.descricao_convocacao ?? null,
        },
        encontros,
        anexosPorEncontro,
        atualEncontroId: atual?.id ?? null,
      };
    },
  });

  const cor = corDaCasa(casaMentor?.id);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-14 w-full rounded-xl" />
        <Skeleton className="h-14 w-full rounded-xl" />
      </div>
    );
  }

  if (!data?.capitulo) {
    return (
      <div
        className="rounded-2xl p-5 text-center"
        style={{ backgroundColor: t.surface, border: `1px solid ${t.border}` }}
      >
        <EscudoCasa casaId={casaMentor?.id ?? null} brasao={turma.casaAtualBrasao} size={44} />
        <h2 className="text-base font-bold mt-3" style={{ color: t.text }}>
          Sem capítulo ativo nesta fase
        </h2>
        <p className="text-sm mt-1.5 max-w-xs mx-auto" style={{ color: t.textMuted }}>
          Quando a fase da sua Casa tiver um capítulo cadastrado, ele aparece aqui como a capa da
          jornada da turma.
        </p>
      </div>
    );
  }

  const { capitulo, encontros, anexosPorEncontro, atualEncontroId } = data;

  return (
    <div className="space-y-4">
      {/* Capa */}
      <div
        className="rounded-2xl p-5"
        style={{ backgroundColor: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadowMd }}
      >
        <div className="flex items-start gap-3">
          <EscudoCasa casaId={casaMentor?.id ?? null} brasao={turma.casaAtualBrasao} size={48} />
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide font-semibold" style={{ color: cor }}>
              Casa {casaMentorNome ?? turma.casaAtualNome ?? ''} · {formatTurmaLabel(turma.serie, turma.turma_letra) || turma.nome}
            </p>
            <h1 className="text-xl font-bold mt-0.5 leading-tight" style={{ color: t.text }}>
              {capitulo.nome}
            </h1>
            <p className="text-[11px] uppercase tracking-wide mt-0.5" style={{ color: t.textFaint }}>
              Capítulo {String(capitulo.numero).padStart(2, '0')}
            </p>
          </div>
        </div>

        {(capitulo.descricao || capitulo.frase_ancora) && (
          <p className="text-sm mt-3 leading-relaxed" style={{ color: t.textMuted }}>
            {capitulo.descricao || capitulo.frase_ancora}
          </p>
        )}

        <button
          onClick={onAdministrar}
          className="w-full mt-4 rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-1.5"
          style={{ backgroundColor: t.accent, color: '#FFFFFF', boxShadow: t.shadowSm }}
        >
          <Settings2 size={16} /> Administrar capítulo
        </button>

        {/* Passagem de bastão: ação DELIBERADA (confirmação leve antes da virada).
            Só aparece aqui, onde a capa é da turma cuja vez é do mentor logado
            (status 'vez' == mentor principal da Casa atual). A RPC revalida no
            backend; a UI não oferece a quem não pode. */}
        <button
          onClick={onFinalizarFase}
          className="w-full mt-2 rounded-xl py-2.5 text-sm font-medium flex items-center justify-center gap-1.5"
          style={{ backgroundColor: t.surfaceSunken, color: t.textMuted }}
        >
          <Flag size={15} /> Finalizar fase e passar o bastão
        </button>
      </div>

      {/* Jornada de etapas */}
      <div>
        <div className="flex items-center gap-2 mb-2 px-1">
          <Route size={16} style={{ color: t.accent }} strokeWidth={1.75} />
          <h2 className="text-sm font-semibold" style={{ color: t.text }}>
            A jornada do capítulo
          </h2>
        </div>

        {encontros.length === 0 ? (
          <div
            className="rounded-xl p-4 text-sm"
            style={{ backgroundColor: t.surface, border: `1px dashed ${t.border}`, color: t.textFaint }}
          >
            As etapas deste capítulo ainda não foram cadastradas.
          </div>
        ) : (
          <div className="space-y-2">
            {encontros.map((e, i) => (
              <EtapaEncontro
                key={e.id}
                encontro={e}
                posicao={i + 1}
                atual={e.id === atualEncontroId}
                anexos={anexosPorEncontro[e.id] ?? []}
                aberto={aberto === e.id}
                onToggle={() => setAberto(aberto === e.id ? null : e.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/** Turma que ainda não é a vez do mentor: quem conduz agora e a posição na fila. */
const CartaoNaFila = ({ turma }: { turma: TurmaDaCasaAtiva }) => {
  const faltam = turma.mentorPos - Math.max(turma.ordemAtual, 0);
  return (
    <div
      className="rounded-2xl p-5"
      style={{ backgroundColor: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadowSm }}
    >
      <div className="flex items-center gap-3">
        <EscudoCasa casaId={turma.casaAtualId} brasao={turma.casaAtualBrasao} size={44} />
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wide font-semibold" style={{ color: t.textFaint }}>
            {formatTurmaLabel(turma.serie, turma.turma_letra) || turma.nome}
          </p>
          <h2 className="text-base font-bold" style={{ color: t.text }}>
            {turma.casaAtualNome ? `Casa ${turma.casaAtualNome} conduz agora` : 'A trilha ainda não começou'}
          </h2>
        </div>
      </div>

      <div
        className="flex items-center gap-2 mt-4 rounded-xl p-3"
        style={{ backgroundColor: t.surfaceAlt }}
      >
        <Clock size={18} style={{ color: t.accent }} strokeWidth={1.75} className="flex-shrink-0" />
        <p className="text-sm" style={{ color: t.textMuted }}>
          {turma.status === 'caminho'
            ? 'Sua Casa é a próxima nesta turma.'
            : `Sua Casa entra na posição ${turma.mentorPos} da trilha${faltam > 0 ? `, faltam ${faltam} ${faltam === 1 ? 'Casa' : 'Casas'}.` : '.'}`}
        </p>
      </div>
    </div>
  );
};

/**
 * Confirmação DELIBERADA da virada (substitui um window.confirm acidental).
 * Tom editorial/sóbrio, tema claro, acento na cor da Casa. O objeto é a TURMA.
 * A experiência da virada é que vem depois: aqui só a intenção consciente.
 */
const FinalizarFaseModal = ({
  turmaLabel,
  casaNome,
  casaId,
  loading,
  onConfirmar,
  onFechar,
}: {
  turmaLabel: string;
  casaNome: string;
  casaId: number;
  loading: boolean;
  onConfirmar: () => void;
  onFechar: () => void;
}) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFechar();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onFechar]);

  const cor = corDaCasa(casaId);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md"
      style={{ backgroundColor: 'rgba(28,34,48,0.30)' }}
      onClick={onFechar}
      role="dialog"
      aria-modal="true"
      aria-label={`Finalizar a fase da Casa ${casaNome} para o ${turmaLabel}`}
    >
      <div
        className="w-full max-w-[360px] rounded-2xl overflow-hidden"
        style={{ backgroundColor: t.surface, boxShadow: t.shadowLg }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ height: 3, backgroundColor: cor }} />

        <div className="p-5 space-y-4">
          <div className="space-y-1.5">
            <p className="text-[11px] uppercase tracking-wide font-semibold" style={{ color: cor }}>
              Virada entre mentores
            </p>
            <h2 className="text-lg font-bold leading-snug" style={{ color: t.text }}>
              Encerrar o seu capítulo com o {turmaLabel}?
            </h2>
          </div>

          <p className="text-sm leading-relaxed italic" style={{ color: t.textMuted }}>
            Finalizar fecha a fase da sua Casa e passa o bastão para a próxima Casa da trilha, que
            será avisada. Antes de seguir, você vai ver o que este capítulo deixou.
          </p>

          <div className="space-y-2 pt-1">
            <button
              onClick={onConfirmar}
              disabled={loading}
              className="w-full rounded-xl py-3 text-sm font-semibold disabled:opacity-60"
              style={{ backgroundColor: cor, color: '#FFFFFF', boxShadow: t.shadowMd }}
            >
              Encerrar e passar o bastão
            </button>
            <button
              onClick={onFechar}
              disabled={loading}
              autoFocus
              className="w-full rounded-xl py-3 text-sm font-medium disabled:opacity-60"
              style={{ backgroundColor: 'transparent', color: t.textMuted }}
            >
              Voltar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Aba ARBORIA (Fundamental 2, reforma). A grade das turmas do mentor e, para a
 * turma cuja vez é dele, a capa do capítulo com a jornada de etapas.
 */
const F2ArboriaPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isLoading, profile, casaMentor } = useProfessor();
  const { data: turmas, isLoading: turmasLoading } = useTurmasDaCasaAtiva(
    profile?.institution_id,
    casaMentor?.id
  );
  const { data: panorama } = useF2Panorama(profile?.institution_id, casaMentor?.id);

  const [turmaSel, setTurmaSel] = useState<string | null>(null);
  const [confirmarOpen, setConfirmarOpen] = useState(false);
  const [acaoLoading, setAcaoLoading] = useState(false);
  const [virada, setVirada] = useState<F2ViradaDados | null>(null);

  const detalheRef = useRef<HTMLDivElement>(null);

  const turmaAtiva = useMemo(() => {
    if (!turmas || turmas.length === 0) return null;
    const escolhida = turmaSel && turmas.find((x) => x.turma_id === turmaSel);
    return escolhida || turmas.find((x) => x.status === 'vez') || turmas[0];
  }, [turmas, turmaSel]);

  /**
   * Toque numa turma (na grade OU no calendário): se ela está na fila do mentor,
   * seleciona e rola até o detalhe (capa/administrar). Se a Casa do mentor já
   * passou nela (não entra na lista), abre a linha do ano da turma, que existe
   * para qualquer turma e mostra as datas.
   */
  const selecionarTurma = (id: string) => {
    const naFila = turmas?.some((x) => x.turma_id === id);
    if (naFila) {
      setTurmaSel(id);
      requestAnimationFrame(() => detalheRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    } else {
      navigate(`/professor/f2/linha-ano/${id}`);
    }
  };

  /**
   * Dados do FECHAMENTO (Tempo 1) e da PASSAGEM (Tempo 2) da virada, lidos DA
   * turma que fecha (a `turmaAtiva` na hora de finalizar). Toda contagem é
   * tolerante: falha aqui NUNCA bloqueia o rito, degrada sem número (como o
   * Infantil). Chamado DEPOIS da RPC ter avançado a trilha; usa o snapshot
   * pré-virada da posição.
   */
  const carregarDadosVirada = async (
    turma: TurmaDaCasaAtiva,
    casaId: number,
    casaNome: string
  ): Promise<F2ViradaDados> => {
    const ano = new Date().getFullYear();
    const instId = profile!.institution_id!;
    const ordemFechada = turma.ordemAtual;
    const turmaLabel = formatTurmaLabel(turma.serie, turma.turma_letra) || turma.nome;

    const base: F2ViradaDados = {
      turmaLabel,
      casaFechaId: casaId,
      casaFechaNome: casaNome,
      ordemFechada,
      totalFases: 8,
      alunosObservados: null,
      missoesEntregues: null,
      anoCompleto: false,
      proximaCasaId: null,
      proximaCasaNome: null,
      proximoMentorNome: null,
    };

    try {
      // Total e ordem de fases da turma (subconjunto configurado; fallback ordinal).
      let ordemRows: Array<{ posicao: number; inteligencia_id: number }> = [];
      try {
        const { data } = await sb
          .from('turma_fase_ordem')
          .select('posicao, inteligencia_id')
          .eq('turma_id', turma.turma_id)
          .eq('ano_letivo', ano)
          .order('posicao');
        if (Array.isArray(data)) ordemRows = data as typeof ordemRows;
      } catch {
        /* fallback ordinal */
      }
      const total = ordemRows.length ? Math.max(...ordemRows.map((r) => r.posicao)) : 8;
      const intelDaPos = (pos: number) =>
        ordemRows.find((r) => r.posicao === pos)?.inteligencia_id ?? pos;

      base.totalFases = total;
      const proxPos = ordemFechada + 1;
      base.anoCompleto = proxPos > total;
      base.proximaCasaId = base.anoCompleto ? null : intelDaPos(proxPos);

      // Fase (Casa) que fechou: base das contagens.
      const { data: faseFecha } = await sb
        .from('fases')
        .select('id')
        .eq('institution_id', instId)
        .eq('segmento', 'fundamental2')
        .eq('ano_letivo', ano)
        .eq('inteligencia_id', casaId)
        .maybeSingle();

      if (faseFecha?.id) {
        // Alunos observados AO VIVO (distintos) nas observacoes da fase que fechou.
        const obsRes = await supabase
          .from('observacoes')
          .select('aluno_id')
          .eq('fase_id', faseFecha.id)
          .eq('turma_id', turma.turma_id)
          .is('excluida_em' as never, null);
        base.alunosObservados = obsRes.error
          ? null
          : new Set((obsRes.data ?? []).map((o: any) => o.aluno_id)).size;

        // Missões entregues pela turma nesta fase (some sem sinal confiável).
        try {
          const { data: missoes } = await sb.from('missoes').select('id').eq('fase_id', faseFecha.id);
          const missaoIds = ((missoes as { id: string }[]) ?? []).map((m) => m.id);
          if (missaoIds.length) {
            const { data: alunosTurma } = await sb
              .from('aluno_turma')
              .select('aluno_id')
              .eq('turma_id', turma.turma_id)
              .eq('ativo', true);
            const alunoIds = ((alunosTurma as { aluno_id: string }[]) ?? []).map((a) => a.aluno_id);
            if (alunoIds.length) {
              const { count } = await supabase
                .from('entregas')
                .select('id', { count: 'exact', head: true })
                .in('missao_id', missaoIds)
                .in('aluno_id', alunoIds);
              base.missoesEntregues = count ?? null;
            }
          }
        } catch {
          /* missões degradam: a linha some */
        }
      }

      // Próxima Casa: nome + mentor principal já notificado (ou null = sem mentor).
      if (base.proximaCasaId != null) {
        const { data: intel } = await sb
          .from('inteligencias')
          .select('nome')
          .eq('id', base.proximaCasaId)
          .maybeSingle();
        base.proximaCasaNome = (intel as { nome?: string } | null)?.nome ?? null;

        const { data: pc } = await sb
          .from('professor_casa')
          .select('professor_id')
          .eq('casa_id', base.proximaCasaId)
          .eq('ano_letivo', ano)
          .eq('ativo', true)
          .eq('eh_mentor_principal', true)
          .eq('institution_id', instId)
          .order('created_at')
          .limit(1)
          .maybeSingle();
        const proxMentorId = (pc as { professor_id?: string } | null)?.professor_id ?? null;
        if (proxMentorId) {
          const { data: prof } = await supabase
            .from('profiles')
            .select('nome, full_name')
            .eq('id', proxMentorId)
            .maybeSingle();
          const p = prof as { nome?: string | null; full_name?: string | null } | null;
          base.proximoMentorNome = p?.nome || p?.full_name?.split(' ')[0] || null;
        }
      }
    } catch {
      /* segue com a base degradada: o rito acontece mesmo sem números */
    }

    return base;
  };

  const confirmarFinalizar = async () => {
    if (!turmaAtiva || !casaMentor) return;
    const turma = turmaAtiva;
    const casaId = casaMentor.id;
    const casaNome = casaMentor.nome;

    setAcaoLoading(true);
    const { error } = await supabase.rpc('finalizar_fase_turma', { p_turma_id: turma.turma_id });
    if (error) {
      // Não-mentor / gate do backend: mensagem clara, modal segue aberto.
      setAcaoLoading(false);
      toast.error(error.message || 'Não foi possível finalizar a fase desta turma.');
      return;
    }

    const dados = await carregarDadosVirada(turma, casaId, casaNome);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['turmas-casa-ativa'] }),
      queryClient.invalidateQueries({ queryKey: ['fase-turma'] }),
      queryClient.invalidateQueries({ queryKey: ['f2-capa-capitulo'] }),
      queryClient.invalidateQueries({ queryKey: ['notificacoes'] }),
    ]);
    setAcaoLoading(false);
    setConfirmarOpen(false);
    setVirada(dados); // sem toast: a experiência É a confirmação
  };

  if (isLoading || turmasLoading) {
    return (
      <div className="pt-5 space-y-4">
        <Skeleton className="h-8 w-40 rounded" />
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
        </div>
        <Skeleton className="h-28 w-full rounded-2xl" />
      </div>
    );
  }

  if (!casaMentor) {
    return (
      <div className="pt-12 text-center px-6">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto"
          style={{ backgroundColor: t.accentSoft }}
        >
          <Shield size={28} style={{ color: t.accent }} strokeWidth={1.5} />
        </div>
        <h1 className="text-lg font-bold mt-3" style={{ color: t.text }}>
          Você ainda não é mentor de uma Casa
        </h1>
        <p className="text-sm mt-1.5 max-w-xs mx-auto" style={{ color: t.textMuted }}>
          Quando a coordenação vincular você como mentor de uma Casa, as turmas que a percorrem
          aparecem aqui.
        </p>
      </div>
    );
  }

  const primeiroNome = profile?.nome || profile?.full_name?.split(' ')[0] || 'Mentor';
  const hora = new Date().getHours();
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';

  return (
    <div className="pt-4 space-y-5">
      <div>
        <p className="text-lg" style={{ color: t.text }}>
          {saudacao}, <span className="font-bold">{primeiroNome}</span>
        </p>
        <p className="text-[11px] uppercase tracking-wide font-semibold" style={{ color: t.accentText }}>
          Casa {casaMentor.nome}
        </p>
      </div>

      {(!turmas || turmas.length === 0) ? (
        <div
          className="rounded-2xl p-5 text-center"
          style={{ backgroundColor: t.surface, border: `1px solid ${t.border}` }}
        >
          <h2 className="text-base font-bold" style={{ color: t.text }}>
            Nenhuma turma na sua fila agora
          </h2>
          <p className="text-sm mt-1.5 max-w-xs mx-auto" style={{ color: t.textMuted }}>
            Nenhuma turma do Fundamental 2 está na fase da sua Casa ou a caminho dela neste momento.
          </p>
        </div>
      ) : (
        <>
          {/* CALENDÁRIO: botão secundário que abre o panorama completo em tela
              cheia (todas as turmas no tempo). Não toma a aba com o gráfico. */}
          {panorama && panorama.turmas.length > 0 && (
            <div>
              <p className="text-[11px] uppercase tracking-wide font-semibold mb-2 px-1" style={{ color: t.textFaint }}>
                Veja o calendário
              </p>
              <F2Panorama
                mode="button"
                turmas={panorama.turmas}
                cadenciaDias={panorama.cadenciaDias}
                mentorCor={corDaCasa(casaMentor.id)}
                onTurmaClick={selecionarTurma}
                turmaSel={turmaAtiva?.turma_id ?? null}
              />
            </div>
          )}

          {/* Suas turmas: grade de DUAS LINHAS que rola na horizontal. As turmas
              preenchem 2 linhas e seguem pra a direita; deslize pra ver o resto. */}
          <div>
            <p className="text-[11px] uppercase tracking-wide font-semibold mb-2 px-1" style={{ color: t.textFaint }}>
              Escolha aqui sua turma
            </p>
            <div
              tabIndex={0}
              role="group"
              aria-label="Suas turmas. Deslize para o lado para ver mais."
              className="overflow-x-auto -mx-4 px-4 py-1"
              style={{ scrollSnapType: 'x proximity', WebkitOverflowScrolling: 'touch' }}
            >
              <div
                className="grid grid-flow-col auto-cols-max gap-2"
                style={{ gridTemplateRows: 'repeat(2, minmax(0, 1fr))' }}
              >
                {turmas.map((turma) => (
                  <div key={turma.turma_id} style={{ width: 132, scrollSnapAlign: 'start' }}>
                    <CartaoTurma
                      turma={turma}
                      compact
                      ativo={turmaAtiva?.turma_id === turma.turma_id}
                      onClick={() => selecionarTurma(turma.turma_id)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Âncora do detalhe da turma selecionada (alvo do scroll ao tocar). */}
          <div ref={detalheRef} />

          {/* O card "Ver o ano do <turma>" foi removido: o Calendario ja da a
              visao do ano de todas as turmas, e tocar numa turma leva ao detalhe. */}

          {/* Detalhe da turma selecionada */}
          {turmaAtiva && (
            <div>
              {turmaAtiva.status === 'vez' ? (
                <CapaCapituloTurma
                  turma={turmaAtiva}
                  casaMentorNome={casaMentor.nome}
                  onAdministrar={() => navigate(`/professor/f2/capitulo/${turmaAtiva.turma_id}`)}
                  onFinalizarFase={() => setConfirmarOpen(true)}
                />
              ) : (
                <CartaoNaFila turma={turmaAtiva} />
              )}
            </div>
          )}
        </>
      )}

      {/* Confirmação deliberada da virada (só a turma cuja vez é do mentor). */}
      {confirmarOpen && turmaAtiva && turmaAtiva.status === 'vez' && (
        <FinalizarFaseModal
          turmaLabel={formatTurmaLabel(turmaAtiva.serie, turmaAtiva.turma_letra) || turmaAtiva.nome}
          casaNome={casaMentor.nome}
          casaId={casaMentor.id}
          loading={acaoLoading}
          onConfirmar={confirmarFinalizar}
          onFechar={() => setConfirmarOpen(false)}
        />
      )}

      {/* A virada em 2 tempos (o momento de pico). */}
      {virada && <F2ViradaExperience dados={virada} onFechar={() => setVirada(null)} />}
    </div>
  );
};

export default F2ArboriaPage;
