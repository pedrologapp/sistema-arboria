import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Play, ClipboardList, CalendarClock, Check, ChevronRight, ChevronDown, Flag, Route, Sprout } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useProfessor } from '@/contexts/ProfessorContext';
import { useFaseTurma, type FaseDaTurma } from '@/hooks/useFaseTurma';
import { formatTurmaLabel, getTurmaPreferida, salvarTurmaPreferida } from '@/lib/infantil';
import { ACADEMIA_F1, nomeAcademia, palavraPoderPlural } from '@/lib/f1';
import ViradaFaseExperience, { type ViradaDados } from '@/pages/professor/infantil/ViradaFaseExperience';
import { Skeleton } from '@/components/ui/skeleton';
import { infantilTheme as t } from '@/styles/infantilTheme';

const TOTAL_FASES = 8;
// Sequência recomendada das 8 inteligências (id == ordem na tabela inteligencias)
const TRILHA = [
  'Linguística',
  'Lógico-Matemática',
  'Espacial',
  'Musical',
  'Corporal-Cinestésica',
  'Naturalista',
  'Interpessoal',
  'Intrapessoal',
];

type View = 'hoje' | 'ano';

// Atividades FICTÍCIAS, só para visualizar o conceito de "fluxo" do módulo.
// No futuro vêm do banco de atividades.
const ATIVIDADES_EXEMPLO: { nome: string; estado: 'feita' | 'atual' | 'proxima' }[] = [
  { nome: 'A mesa de tesouros', estado: 'feita' },
  { nome: 'Caça aos sons da natureza', estado: 'atual' },
  { nome: 'Nossa coleção da turma', estado: 'proxima' },
  { nome: 'Roda das descobertas', estado: 'proxima' },
];

/** Régua das 8 fases (mapa, não placar). No cockpit é pequena e clicável → leva ao "O ano". */
const Regua = ({ atual, onClick }: { atual: number; onClick: () => void }) => (
  <button onClick={onClick} className="w-full flex items-center justify-between px-1 py-1" aria-label="Ver o ano">
    {Array.from({ length: TOTAL_FASES }).map((_, i) => {
      const n = i + 1;
      const passou = n < atual;
      const eAtual = n === atual;
      return (
        <div key={n} className="flex items-center flex-1 last:flex-none">
          <span
            className="rounded-full transition-all"
            style={{
              width: eAtual ? 11 : 7,
              height: eAtual ? 11 : 7,
              backgroundColor: passou || eAtual ? t.accent : t.silencio,
              boxShadow: eAtual ? `0 0 0 3px ${t.accentSoft}` : 'none',
            }}
          />
          {n < TOTAL_FASES && <span className="flex-1 h-px mx-1" style={{ backgroundColor: t.border }} />}
        </div>
      );
    })}
  </button>
);

/** Sub-aba "Hoje": o cockpit do agora. Aqui o professor CONDUZ. */
const CockpitHoje = ({
  faseAtual,
  atualOrdem,
  irParaAno,
  onIniciarAula,
}: {
  faseAtual: FaseDaTurma | null;
  atualOrdem: number;
  irParaAno: () => void;
  onIniciarAula: () => void;
}) => {
  // ANO COMPLETO: a fase 8 foi finalizada. O maior momento do ano da turma
  // NUNCA pode regredir pra "seu ano ainda não começou".
  if (atualOrdem > TOTAL_FASES) {
    return (
      <div className="pt-8 text-center space-y-4">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mx-auto"
          style={{ backgroundColor: t.accentSoft }}
        >
          <Sprout size={28} style={{ color: t.accent }} strokeWidth={1.5} />
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide font-semibold" style={{ color: t.accentText }}>
            Ano completo
          </p>
          <h1 className="text-xl font-bold mt-1" style={{ color: t.text }}>
            Os 8 módulos do ano foram concluídos.
          </h1>
          <p className="text-sm mt-2 max-w-xs mx-auto italic leading-relaxed" style={{ color: t.textMuted }}>
            A turma atravessou as 8 inteligências com você. O que você enxergou este ano vive no
            Diário de cada aluno, e segue com eles.
          </p>
        </div>
        <button
          onClick={irParaAno}
          className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold"
          style={{ backgroundColor: t.accent, color: '#FFFFFF', boxShadow: t.shadowMd }}
        >
          Rever o caminho do ano <ChevronRight size={16} />
        </button>
      </div>
    );
  }

  if (!faseAtual) {
    return (
      <div className="pt-8 text-center space-y-3">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mx-auto"
          style={{ backgroundColor: t.accentSoft }}
        >
          <CalendarClock size={28} style={{ color: t.accent }} strokeWidth={1.5} />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: t.text }}>
            Seu ano ainda não começou
          </h1>
          <p className="text-sm mt-1 max-w-xs mx-auto" style={{ color: t.textMuted }}>
            Comece o primeiro módulo na trilha do ano.
          </p>
        </div>
        <button
          onClick={irParaAno}
          className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold mt-1"
          style={{ backgroundColor: t.accent, color: '#FFFFFF', boxShadow: t.shadowMd }}
        >
          Traçar o caminho do ano <ChevronRight size={16} />
        </button>
      </div>
    );
  }

  const ordemFase = atualOrdem || faseAtual.numero_fase;
  const moduloNome = ACADEMIA_F1[ordemFase] ?? `Módulo ${faseAtual.numero_fase}`;
  const mecanismo = faseAtual.inteligencia?.nome ?? null;
  const hojeFmt = format(new Date(), "d 'de' MMM", { locale: ptBR });

  return (
    <div className="space-y-5">
      <Regua atual={atualOrdem} onClick={irParaAno} />

      <p className="text-[11px] uppercase tracking-wide" style={{ color: t.textFaint }}>
        Hoje · {hojeFmt} · Módulo {ordemFase} de {TOTAL_FASES}
      </p>

      <div className="-mt-3">
        <h1 className="text-2xl font-bold" style={{ color: t.text }}>
          {moduloNome}
        </h1>
        {/* A professora PODE ver o nome técnico; quem nunca vê são as crianças */}
        {mecanismo && (
          <p className="text-[11px] uppercase tracking-wide mt-0.5" style={{ color: t.textFaint }}>
            Inteligência {mecanismo}
          </p>
        )}
        <p className="text-sm mt-1 leading-relaxed" style={{ color: t.textMuted }}>
          Hoje você conduz o módulo {moduloNome}.
        </p>
      </div>

      {/* HERÓI. Iniciar aula */}
      <div>
        <button
          onClick={onIniciarAula}
          className="w-full rounded-2xl p-5 flex items-center gap-3 text-left transition-transform active:scale-[0.99]"
          style={{ backgroundColor: t.accent, color: '#FFFFFF', boxShadow: t.shadowLg }}
        >
          <span
            className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}
          >
            <Play size={22} strokeWidth={2.25} fill="#FFFFFF" />
          </span>
          <span className="min-w-0">
            <span className="block text-base font-semibold">Iniciar aula</span>
            <span className="block text-sm" style={{ color: 'rgba(255,255,255,0.85)' }}>
              Registre a turma no ritmo da sala
            </span>
          </span>
        </button>
      </div>

      {/* Detalhe da atividade: as especificações da atividade ATUAL (nome,
          materiais, objetivo, como conduzir, o que observar). Alimentado pelo
          banco de atividades: por ora, moldura fantasma. */}
      <section
        className="rounded-2xl p-4"
        style={{ backgroundColor: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadowSm }}
      >
        <div className="flex items-center gap-2 mb-2">
          <ClipboardList size={18} style={{ color: t.accent }} strokeWidth={1.75} />
          <h2 className="text-sm font-semibold" style={{ color: t.text }}>
            Detalhe da atividade
          </h2>
        </div>
        <p className="text-sm leading-relaxed" style={{ color: t.textFaint }}>
          Use qualquer atividade sua: o Arboria registra o seu olhar sobre os alunos, não
          a atividade. Quando o banco de atividades chegar, as especificações da aula
          aparecem aqui.
        </p>
      </section>

      {/* O caminho deste módulo: o plano (atividades em sequência) do módulo atual */}
      <section
        className="rounded-2xl p-4"
        style={{ backgroundColor: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadowSm }}
      >
        <div className="flex items-center gap-2 mb-1">
          <Route size={18} style={{ color: t.accent }} strokeWidth={1.75} />
          <h2 className="text-sm font-semibold" style={{ color: t.text }}>
            O caminho deste módulo
          </h2>
        </div>
        <p className="text-sm mb-3 font-medium" style={{ color: t.textMuted }}>
          Estas atividades são só ILUSTRAÇÃO, não prepare nenhuma delas. As suas atividades
          reais chegam com o banco de atividades.
        </p>

        {/* Fluxo de atividades. FANTASMA (nomes plausíveis demais → selo por item) */}
        <div aria-hidden="true">
          {ATIVIDADES_EXEMPLO.map((a, i) => {
            const ultimo = i === ATIVIDADES_EXEMPLO.length - 1;
            return (
              <div key={i}>
                <div
                  className="rounded-xl p-3 flex items-center gap-2.5"
                  style={{ border: `1px dashed ${t.silencio}`, backgroundColor: 'transparent' }}
                >
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                    style={{
                      backgroundColor: t.surface,
                      color: t.textFaint,
                      border: `1px dashed ${t.silencio}`,
                    }}
                  >
                    {i + 1}
                  </span>
                  <span className="text-sm flex-1 min-w-0" style={{ color: t.textFaint }}>
                    {a.nome}
                  </span>
                  <span
                    className="flex-shrink-0 text-[9px] uppercase tracking-wide font-bold px-1.5 py-0.5 rounded"
                    style={{ color: t.textFaint, border: `1px dashed ${t.silencio}` }}
                  >
                    exemplo
                  </span>
                </div>
                {!ultimo && (
                  <div className="flex justify-center py-0.5">
                    <ChevronDown size={16} style={{ color: t.silencio }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

    </div>
  );
};

/** Sub-aba "O ano": a trilha dos 8 módulos. Aqui o professor VÊ o caminho. */
const TrilhaAno = ({
  atualOrdem,
  serie,
  irParaHoje,
  onIniciar,
  onFinalizar,
  acaoLoading,
}: {
  atualOrdem: number;
  serie?: string | null;
  irParaHoje: () => void;
  onIniciar: () => void;
  onFinalizar: () => void;
  acaoLoading: boolean;
}) => {
  return (
    <div className="space-y-1">
      <div className="mb-4">
        <h1 className="text-xl font-bold" style={{ color: t.text }}>
          Os 8 {palavraPoderPlural(serie)} do ano
        </h1>
        <p className="text-sm mt-0.5" style={{ color: t.textMuted }}>
          {atualOrdem > TOTAL_FASES
            ? 'Ano completo: os 8 módulos concluídos.'
            : atualOrdem > 0
              ? 'Você está aqui.'
              : 'Sua trilha começa no primeiro módulo.'}
        </p>
      </div>

      {TRILHA.map((nome, i) => {
        const n = i + 1;
        const concluida = atualOrdem > 0 && n < atualOrdem;
        const emCurso = n === atualOrdem;
        const aSeguir = n > atualOrdem || atualOrdem === 0;
        const isLast = n === TOTAL_FASES;

        const dotBg = concluida || emCurso ? t.accent : t.surface;
        const dotBorder = aSeguir && !emCurso ? `2px solid ${t.silencio}` : 'none';

        return (
          <div key={n} className="flex gap-3">
            {/* Trilho à esquerda: nó + linha */}
            <div className="flex flex-col items-center pt-0.5">
              <span
                className="rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  width: emCurso ? 28 : 24,
                  height: emCurso ? 28 : 24,
                  backgroundColor: dotBg,
                  border: dotBorder,
                  boxShadow: emCurso ? `0 0 0 3px ${t.accentSoft}` : 'none',
                  color: concluida || emCurso ? '#FFFFFF' : t.textMuted,
                }}
              >
                {concluida ? (
                  <Check size={13} strokeWidth={3} />
                ) : (
                  <span className="text-[11px] font-bold">{n}</span>
                )}
              </span>
              {!isLast && <span className="w-px flex-1 my-1" style={{ backgroundColor: t.border }} />}
            </div>

            {/* Conteúdo */}
            <div className="flex-1 pb-4 min-w-0">
              {emCurso ? (
                <div
                  className="rounded-2xl p-4"
                  style={{
                    backgroundColor: t.surface,
                    border: `1px solid ${t.accent}`,
                    boxShadow: t.shadowMd,
                  }}
                >
                  <p className="text-[11px] uppercase tracking-wide" style={{ color: t.accentText }}>
                    Em andamento
                  </p>
                  <h3 className="text-base font-bold mt-0.5" style={{ color: t.text }}>
                    {ACADEMIA_F1[n]}
                  </h3>
                  <p className="text-[11px] uppercase tracking-wide mt-0.5" style={{ color: t.textFaint }}>
                    {nome}
                  </p>
                  <p className="text-sm mt-1" style={{ color: t.textMuted }}>
                    Você está conduzindo este módulo.
                  </p>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={irParaHoje}
                      className="flex-1 rounded-xl py-2 text-sm font-semibold"
                      style={{ backgroundColor: t.accent, color: '#FFFFFF' }}
                    >
                      Ir para Hoje
                    </button>
                    <button
                      onClick={onFinalizar}
                      disabled={acaoLoading}
                      className="flex-1 rounded-xl py-2 text-sm font-medium flex items-center justify-center gap-1.5 disabled:opacity-50"
                      style={{ backgroundColor: t.surfaceSunken, color: t.textMuted }}
                    >
                      <Flag size={14} /> Encerrar módulo
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="min-w-0">
                    <span
                      className="block text-sm font-medium"
                      style={{ color: concluida ? t.textFaint : t.text }}
                    >
                      {ACADEMIA_F1[n]}
                    </span>
                    <span className="block text-[10.5px]" style={{ color: t.textFaint }}>
                      {nome}
                    </span>
                  </span>
                  {concluida ? (
                    <span className="text-[11px] flex-shrink-0" style={{ color: t.textFaint }}>
                      concluído
                    </span>
                  ) : atualOrdem === 0 && n === 1 ? (
                    <button
                      onClick={onIniciar}
                      disabled={acaoLoading}
                      className="text-xs font-semibold rounded-full px-3 py-1 disabled:opacity-50 flex-shrink-0"
                      style={{ backgroundColor: t.accentSoft, color: t.accentText }}
                    >
                      Começar
                    </button>
                  ) : (
                    <span className="text-[11px] flex-shrink-0" style={{ color: t.textFaint }}>
                      a seguir
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/**
 * Modal de FINALIZAR módulo: a virada (substitui o window.confirm).
 * Tom editorial/sóbrio. O objeto é sempre a TURMA, nunca o aluno.
 *
 * `pendentes`: quantos "momentos previstos" do módulo ainda não aconteceram.
 *  - null  → sinal ainda não existe (hoje). NÃO mostra bloco de pendência.
 *  - >0    → informa, NUNCA bloqueia.
 */
const FinalizarModal = ({
  moduloNome,
  pendentes,
  loading,
  onConfirmar,
  onFechar,
}: {
  moduloNome: string;
  pendentes: number | null;
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

  const temPendencia = pendentes != null && pendentes > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md"
      style={{ backgroundColor: 'rgba(28,34,48,0.30)' }}
      onClick={onFechar}
      role="dialog"
      aria-modal="true"
      aria-label={`Finalizar o módulo ${moduloNome}`}
    >
      <div
        className="w-full max-w-[360px] rounded-2xl overflow-hidden"
        style={{ backgroundColor: t.surface, boxShadow: t.shadowLg }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Assinatura da virada, sem gráfico de árvore */}
        <div style={{ height: 3, backgroundColor: t.accent }} />

        <div className="p-5 space-y-4">
          <div className="space-y-1.5">
            <p className="text-[11px] uppercase tracking-wide font-semibold" style={{ color: t.accentText }}>
              Virada de módulo
            </p>
            <h2 className="text-lg font-bold leading-snug" style={{ color: t.text }}>
              Finalizar o módulo {moduloNome} para a turma?
            </h2>
          </div>

          {/* Pendências, só quando há sinal REAL (>0). Nunca em vermelho/falta. */}
          {temPendencia && (
            <div
              className="rounded-xl p-3 flex gap-2.5"
              style={{ backgroundColor: t.surfaceAlt, border: `1px solid ${t.border}` }}
            >
              <CalendarClock size={18} style={{ color: t.accent }} strokeWidth={1.75} className="flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold" style={{ color: t.text }}>
                  Ainda há {pendentes} {pendentes === 1 ? 'momento previsto' : 'momentos previstos'} neste módulo.
                </p>
                <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>
                  Você decide o ritmo da turma: a trilha acompanha, não cobra.
                </p>
              </div>
            </div>
          )}

          <p className="text-sm leading-relaxed italic" style={{ color: t.textMuted }}>
            Finalizar fecha este módulo e abre o próximo. Antes de seguir, você vai ver o que este módulo deixou.
          </p>

          <div className="space-y-2 pt-1">
            <button
              onClick={onConfirmar}
              disabled={loading}
              className="w-full rounded-xl py-3 text-sm font-semibold disabled:opacity-60"
              style={{ backgroundColor: t.accent, color: '#FFFFFF', boxShadow: t.shadowMd }}
            >
              {temPendencia ? 'Finalizar mesmo assim' : 'Encerrar módulo'}
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
 * Aba ARBORIA (Fundamental 1): a PRÁTICA do dia, em duas faces:
 * "Hoje" (cockpit: você conduz) e "O ano" (a trilha; você vê o caminho).
 * Cópia fiel do Infantil com a língua da Academia (módulos/superpoderes/talentos).
 */
const F1ArboriaPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isLoading, profile, turmasVinculadas } = useProfessor();
  const [view, setView] = useState<View>('hoje');
  const [acaoLoading, setAcaoLoading] = useState(false);
  const [confirmarOpen, setConfirmarOpen] = useState(false);
  // Seleção sobrevive a remontagens (sessionStorage), sem isso, o refresh do
  // contexto devolvia a professora pra 1ª turma no meio do trabalho.
  const [turmaSel, setTurmaSelState] = useState<string | null>(getTurmaPreferida());
  const setTurmaSel = (id: string) => {
    setTurmaSelState(id);
    salvarTurmaPreferida(id);
  };
  const [virada, setVirada] = useState<ViradaDados | null>(null);

  // A fase é DA TURMA selecionada (cada turma tem sua trilha), nunca do contexto
  // global, que só enxerga a primeira turma vinculada.
  const turmaValida = turmaSel && turmasVinculadas?.some((tv) => tv.id === turmaSel);
  const turmaId = (turmaValida ? turmaSel : null) ?? turmasVinculadas?.[0]?.id ?? null;
  const { data: faseTurma } = useFaseTurma(turmaId, profile?.institution_id, 'fundamental1');
  const faseCarregando = faseTurma === undefined && !!turmaId && !!profile?.institution_id;

  const turmaSelecionada = turmasVinculadas?.find((tv) => tv.id === turmaId) ?? null;
  const serieSel = turmaSelecionada?.serie != null ? String(turmaSelecionada.serie) : null;

  if (isLoading || faseCarregando) {
    return (
      <div className="pt-5 space-y-4">
        <Skeleton className="h-9 w-full rounded-full" />
        <Skeleton className="h-8 w-40 rounded" />
        <Skeleton className="h-20 w-full rounded-2xl" />
      </div>
    );
  }

  const faseAtual = faseTurma?.fase ?? null;
  const atualOrdem = faseTurma?.ordem ?? 0; // 0 = não começou · 1..8 = em curso · 9 = ano completo

  const primeiroNome = profile?.nome || profile?.full_name?.split(' ')[0] || 'Professora';
  const hora = new Date().getHours();
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';

  const moverTrilha = async (rpc: 'iniciar_fase_turma' | 'finalizar_fase_turma'): Promise<boolean> => {
    if (!turmaId) {
      toast.error('Não encontrei a turma.');
      return false;
    }
    setAcaoLoading(true);
    const { error } = await supabase.rpc(rpc, { p_turma_id: turmaId });
    setAcaoLoading(false);
    if (error) {
      toast.error(error.message || 'Não foi possível atualizar o módulo.');
      return false;
    }
    // SÓ o hook da trilha: refreshData aqui recarregava o contexto inteiro e
    // (via layout) desmontava a página, resetando a turma selecionada.
    await queryClient.invalidateQueries({ queryKey: ['fase-turma', turmaId] });
    return true;
  };

  const onIniciar = async () => {
    if (await moverTrilha('iniciar_fase_turma')) toast.success('Primeiro módulo começou.');
  };

  const onFinalizar = () => setConfirmarOpen(true);

  // Contagens do FECHAMENTO (Tempo 1 da Virada): dados da fase que fecha.
  // Falha aqui NUNCA bloqueia o rito: degrada pro layout sem números.
  const carregarDadosVirada = async (
    faseFechada: FaseDaTurma,
    ordemFechada: number
  ): Promise<ViradaDados> => {
    const base: ViradaDados = {
      ordemFechada,
      faseFechadaNome: faseFechada.inteligencia?.nome ?? `Fase ${faseFechada.numero_fase}`,
      turmaLabel: (() => {
        const tv = turmasVinculadas?.find((x) => x.id === turmaId);
        return tv ? formatTurmaLabel(tv.serie, tv.turma_letra) : '';
      })(),
      momentos: null,
      criancasObservadas: 0,
      totalCriancas: 0,
      multiAutores: false,
      dataInicio: null,
      momentosAno: null,
    };
    try {
      const [obsRes, turmaRes, evRes] = await Promise.all([
        supabase
          .from('observacoes')
          .select('aluno_id, professor_id')
          .eq('fase_id', faseFechada.id)
          .eq('turma_id', turmaId!)
          .is('excluida_em' as never, null),
        supabase
          .from('aluno_turma')
          .select('aluno_id', { count: 'exact', head: true })
          .eq('turma_id', turmaId!)
          .eq('ativo', true),
        (supabase.from as any)('turma_fase_evento')
          .select('ocorrido_em')
          .eq('turma_id', turmaId!)
          .eq('ordem', ordemFechada)
          .eq('evento', 'iniciou')
          .order('ocorrido_em', { ascending: true })
          .limit(1)
          .maybeSingle(),
      ]);
      const obs = obsRes.data ?? [];
      base.momentos = obsRes.error ? null : obs.length;
      base.criancasObservadas = new Set(obs.map((o: any) => o.aluno_id)).size;
      base.totalCriancas = turmaRes.count ?? 0;
      base.multiAutores = new Set(obs.map((o: any) => o.professor_id)).size > 1;
      base.dataInicio = evRes?.data?.ocorrido_em ?? null;

      // Fase 8: o Tempo 2 vira o encerramento do ano; contagem anual da turma
      if (ordemFechada >= 8) {
        const inicioAno = new Date(new Date().getFullYear(), 0, 1).toISOString();
        const { count } = await supabase
          .from('observacoes')
          .select('id', { count: 'exact', head: true })
          .eq('turma_id', turmaId!)
          .is('excluida_em' as never, null)
          .gte('created_at', inicioAno);
        base.momentosAno = count ?? null;
      }
    } catch {
      /* segue com base degradada: o rito acontece mesmo sem números */
    }
    return base;
  };

  const confirmarFinalizar = async () => {
    const faseFechada = faseAtual;
    const ordemFechada = atualOrdem;
    if (!faseFechada || !turmaId) return;

    setAcaoLoading(true);
    const { error } = await supabase.rpc('finalizar_fase_turma', { p_turma_id: turmaId });
    if (error) {
      setAcaoLoading(false);
      toast.error(error.message || 'Não foi possível atualizar o módulo.');
      return; // modal fica aberto: permite tentar de novo ou Voltar
    }

    const dados = await carregarDadosVirada(faseFechada, ordemFechada);
    await queryClient.invalidateQueries({ queryKey: ['fase-turma', turmaId] });
    setAcaoLoading(false);
    setConfirmarOpen(false);
    setVirada(dados); // sem toast: a experiência É a confirmação
  };

  return (
    <div className="pt-4">
      {/* Saudação ao professor */}
      <p className="text-lg mb-1" style={{ color: t.text }}>
        {saudacao}, <span className="font-bold">{primeiroNome}</span>
      </p>

      {/* O nome da Academia da turma selecionada: o cabeçalho do cockpit no F1 */}
      <p className="text-[11px] uppercase tracking-wide font-semibold mb-3" style={{ color: t.accentText }}>
        {nomeAcademia(serieSel)}
      </p>

      {/* Seletor de turma: cada turma tem sua própria trilha. Em GRADE, na cor
          do acento, e com RÓTULO-GUIA (professora comum: tudo falado diretamente). */}
      {turmasVinculadas && turmasVinculadas.length > 1 && (
        <p
          className="text-[11px] uppercase tracking-wide font-semibold mb-1.5"
          style={{ color: t.accentText }}
        >
          Escolha a turma
        </p>
      )}
      {turmasVinculadas && turmasVinculadas.length > 1 && (
        <div className="grid grid-cols-2 gap-2 mb-4">
          {turmasVinculadas.map((tv) => {
            const ativo = turmaId === tv.id;
            return (
              <button
                key={tv.id}
                onClick={() => setTurmaSel(tv.id)}
                className="rounded-xl py-3 px-3 text-sm font-semibold transition-colors"
                style={
                  ativo
                    ? { backgroundColor: t.accent, color: '#FFFFFF', boxShadow: t.shadowMd }
                    : { backgroundColor: t.surface, color: t.textMuted, border: `1px solid ${t.border}` }
                }
                aria-pressed={ativo}
              >
                {formatTurmaLabel(tv.serie, tv.turma_letra)}
              </button>
            );
          })}
        </div>
      )}

      {/* Seletor de sub-abas: com rótulo-guia e explicação breve (professora comum) */}
      <p
        className="text-[11px] uppercase tracking-wide font-semibold mb-1.5"
        style={{ color: t.accentText }}
      >
        O que você quer ver
      </p>
      <div className="flex p-1 rounded-full" style={{ backgroundColor: t.surfaceSunken }}>
        {([['hoje', 'Hoje'], ['ano', 'O ano']] as [View, string][]).map(([k, label]) => {
          const ativo = view === k;
          return (
            <button
              key={k}
              onClick={() => setView(k)}
              className="flex-1 py-1.5 rounded-full text-sm font-semibold transition-colors"
              style={
                ativo
                  ? { backgroundColor: t.accent, color: '#FFFFFF', boxShadow: t.shadowSm }
                  : { color: t.textMuted, backgroundColor: 'transparent' }
              }
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Explicação breve do que a visão atual mostra */}
      <p className="text-xs mt-2 px-1" style={{ color: t.textFaint }}>
        {view === 'hoje'
          ? 'A prática de agora: o módulo da turma e o registro da aula.'
          : 'O caminho do ano: os 8 módulos da turma, do começo ao fim.'}
      </p>

      <div className="mt-5">
        {view === 'hoje' ? (
          <CockpitHoje
            faseAtual={faseAtual}
            atualOrdem={atualOrdem}
            irParaAno={() => setView('ano')}
            onIniciarAula={() => navigate('/professor/aula', { state: { turmaId } })}
          />
        ) : (
          <TrilhaAno
            atualOrdem={atualOrdem}
            serie={serieSel}
            irParaHoje={() => setView('hoje')}
            onIniciar={onIniciar}
            onFinalizar={onFinalizar}
            acaoLoading={acaoLoading}
          />
        )}
      </div>

      {confirmarOpen && faseAtual && (
        <FinalizarModal
          moduloNome={ACADEMIA_F1[atualOrdem] ?? `Módulo ${faseAtual.numero_fase}`}
          pendentes={null}
          loading={acaoLoading}
          onConfirmar={confirmarFinalizar}
          onFechar={() => setConfirmarOpen(false)}
        />
      )}

      {virada && <ViradaFaseExperience dados={virada} onFechar={() => setVirada(null)} />}
    </div>
  );
};

export default F1ArboriaPage;
