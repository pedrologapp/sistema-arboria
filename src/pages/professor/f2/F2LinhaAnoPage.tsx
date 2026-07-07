import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, CalendarRange } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useProfessor } from '@/contexts/ProfessorContext';
import { infantilTheme as t } from '@/styles/infantilTheme';
import { corDaCasa, F2_REFORMA_ATIVA } from '@/config/f2Reforma';
import { formatTurmaLabel } from '@/lib/infantil';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * A LINHA DO ANO da turma (Fundamental 2, reforma, atrás do flag F2_REFORMA_ATIVA).
 *
 * O mentor toca "ver o ano" numa turma e vê o ano inteiro: as Casas na ordem da
 * trilha DAQUELA turma, a DATA REAL de cada capítulo (capitulo_turma_config.
 * data_evento, a mesma que ele preenche em Administrar capítulo), onde a turma
 * está agora, e a VEZ dele destacada, pra se programar.
 *
 * SÓ LEITURA. Nenhuma escrita, nenhuma RPC. Toda leitura é tolerante: sem
 * configuração de ordem, cai no fallback canônico (8 Casas, posicao == id, como
 * useFaseTurma / useTurmasDaCasaAtiva). Onde não há data, mostra "a definir"
 * (NUNCA inventa).
 */

// Tabelas/colunas da reforma podem não estar nos tipos gerados: via `sb` (any),
// como as demais telas do F2, para o build não quebrar por tipagem.
const sb = supabase as any;

const TOTAL_PADRAO = 8;

interface TurmaInfo {
  id: string;
  nome: string;
  serie: string | null;
  turma_letra: string | null;
}

type EstadoCasa = 'concluida' | 'agora' | 'caminho';

interface PassoTrilha {
  posicao: number; // 1..N
  inteligenciaId: number;
  nome: string;
  cor: string;
  /** 'YYYY-MM-DD' do capítulo desta Casa nesta turma, ou null = a definir. */
  data: string | null;
  estado: EstadoCasa;
  ehMentor: boolean;
}

interface LinhaAnoDados {
  ordemAtual: number;
  total: number;
  passos: PassoTrilha[];
  /** índice 0-based do passo do mentor; -1 se a Casa dele não está na trilha. */
  mentorIdx: number;
}

/** Data curta: "4 ago". Meio-dia local evita salto de fuso do 'YYYY-MM-DD'. */
const dataCurta = (d: string | null): string | null =>
  d ? format(new Date(`${d}T12:00:00`), 'd MMM', { locale: ptBR }) : null;

/** Data por extenso: "4 de agosto". */
const dataLonga = (d: string | null): string | null =>
  d ? format(new Date(`${d}T12:00:00`), "d 'de' MMMM", { locale: ptBR }) : null;

const useLinhaAno = (turmaId?: string, institutionId?: string | null, casaMentorId?: number | null) =>
  useQuery<LinhaAnoDados>({
    queryKey: ['f2-linha-ano', turmaId, institutionId],
    enabled: !!turmaId && !!institutionId,
    queryFn: async (): Promise<LinhaAnoDados> => {
      const ano = new Date().getFullYear();

      // 1. Posição atual da turma.
      const { data: trilha } = await sb
        .from('turma_trilha')
        .select('ordem_atual')
        .eq('turma_id', turmaId!)
        .eq('ano_letivo', ano)
        .maybeSingle();
      const ordemAtual = (trilha?.ordem_atual as number | undefined) ?? 0;

      // 2. Ordem/subconjunto configurados (tolerante -> fallback canônico 1..8).
      let config: Array<{ posicao: number; inteligencia_id: number }> = [];
      try {
        const { data } = await sb
          .from('turma_fase_ordem')
          .select('posicao, inteligencia_id')
          .eq('turma_id', turmaId!)
          .eq('ano_letivo', ano)
          .order('posicao');
        if (Array.isArray(data)) {
          config = (data as Array<{ posicao: number; inteligencia_id: number }>)
            .slice()
            .sort((a, b) => a.posicao - b.posicao);
        }
      } catch {
        /* fallback canônico */
      }

      const temConfig = config.length > 0;
      const total = temConfig ? config.length : TOTAL_PADRAO;
      const posParaIntel: Array<{ posicao: number; inteligencia_id: number }> = temConfig
        ? config
        : Array.from({ length: TOTAL_PADRAO }, (_, i) => ({ posicao: i + 1, inteligencia_id: i + 1 }));

      const intelIds = posParaIntel.map((p) => p.inteligencia_id);

      // 3. Nomes das Casas (inteligências).
      const { data: intelRaw } = await sb.from('inteligencias').select('id, nome');
      const nomePorIntel = new Map<number, string>();
      ((intelRaw as { id: number; nome: string }[]) ?? []).forEach((i) => nomePorIntel.set(i.id, i.nome));

      // 4. Datas dos capítulos: inteligência -> fase -> capítulo ativo -> config da turma.
      //    Cadeia tolerante; qualquer elo ausente vira "a definir" (data null).
      const dataPorIntel = new Map<number, string | null>();
      try {
        const { data: fasesRaw } = await sb
          .from('fases')
          .select('id, inteligencia_id')
          .eq('institution_id', institutionId!)
          .eq('segmento', 'fundamental2')
          .eq('ano_letivo', ano)
          .in('inteligencia_id', intelIds);
        const faseIdParaIntel = new Map<string, number>();
        const faseIds: string[] = [];
        ((fasesRaw as { id: string; inteligencia_id: number }[]) ?? []).forEach((f) => {
          faseIdParaIntel.set(f.id, f.inteligencia_id);
          faseIds.push(f.id);
        });

        if (faseIds.length) {
          const { data: capsRaw } = await sb
            .from('capitulos')
            .select('id, fase_id')
            .eq('institution_id', institutionId!)
            .eq('ativo', true)
            .in('fase_id', faseIds);
          const capIdParaIntel = new Map<string, number>();
          const capIds: string[] = [];
          ((capsRaw as { id: string; fase_id: string }[]) ?? []).forEach((c) => {
            const intel = faseIdParaIntel.get(c.fase_id);
            if (intel != null) {
              capIdParaIntel.set(c.id, intel);
              capIds.push(c.id);
            }
          });

          if (capIds.length) {
            const { data: cfgRaw } = await sb
              .from('capitulo_turma_config')
              .select('capitulo_id, data_evento')
              .eq('turma_id', turmaId!)
              .in('capitulo_id', capIds);
            ((cfgRaw as { capitulo_id: string; data_evento: string | null }[]) ?? []).forEach((cfg) => {
              const intel = capIdParaIntel.get(cfg.capitulo_id);
              if (intel != null) dataPorIntel.set(intel, cfg.data_evento ?? null);
            });
          }
        }
      } catch {
        /* datas degradam para "a definir" */
      }

      const estadoDe = (posicao: number): EstadoCasa => {
        if (ordemAtual >= 1 && posicao === ordemAtual) return 'agora';
        if (ordemAtual >= 1 && posicao < ordemAtual) return 'concluida';
        return 'caminho';
      };

      const passos: PassoTrilha[] = posParaIntel.map((p) => ({
        posicao: p.posicao,
        inteligenciaId: p.inteligencia_id,
        nome: nomePorIntel.get(p.inteligencia_id) ?? `Casa ${p.inteligencia_id}`,
        cor: corDaCasa(p.inteligencia_id),
        data: dataPorIntel.get(p.inteligencia_id) ?? null,
        estado: estadoDe(p.posicao),
        ehMentor: casaMentorId != null && p.inteligencia_id === casaMentorId,
      }));

      const mentorIdx = passos.findIndex((p) => p.ehMentor);

      return { ordemAtual, total, passos, mentorIdx };
    },
  });

// ============================================================
// Resumo do topo: a vez do mentor nesta turma
// ============================================================
const ResumoSuaVez = ({
  dados,
  casaMentorNome,
}: {
  dados: LinhaAnoDados;
  casaMentorNome: string | null;
}) => {
  const { ordemAtual, mentorIdx, passos } = dados;

  // A Casa do mentor não percorre esta turma.
  if (mentorIdx < 0) {
    return (
      <div
        className="rounded-2xl p-4"
        style={{ backgroundColor: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadowSm }}
      >
        <p className="text-[10px] uppercase tracking-wide font-bold" style={{ color: t.textFaint }}>
          Sua vez nesta turma
        </p>
        <p className="text-sm mt-1.5 leading-relaxed" style={{ color: t.textMuted }}>
          A sua Casa{casaMentorNome ? ` ${casaMentorNome}` : ''} não está na trilha desta turma neste ano.
        </p>
      </div>
    );
  }

  const passoMentor = passos[mentorIdx];
  const cor = passoMentor.cor;
  const mentorPos = passoMentor.posicao;
  const dataExtenso = dataLonga(passoMentor.data);

  let situacao: string;
  if (ordemAtual >= 1 && mentorPos < ordemAtual) situacao = 'A sua vez com esta turma já passou.';
  else if (ordemAtual >= 1 && mentorPos === ordemAtual) situacao = 'É agora: esta turma está no seu capítulo.';
  else {
    const faltam = mentorPos - Math.max(ordemAtual, 0);
    situacao = `Daqui a ${faltam} ${faltam === 1 ? 'capítulo' : 'capítulos'}`;
  }

  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: `linear-gradient(180deg, ${cor}12, ${t.surface})`,
        border: `1px solid ${cor}40`,
        boxShadow: t.shadowSm,
      }}
    >
      <p className="text-[10px] uppercase tracking-wide font-bold" style={{ color: cor }}>
        Sua vez nesta turma
      </p>
      <div className="flex items-baseline gap-2 mt-1.5 flex-wrap">
        <span className="text-2xl font-bold leading-none" style={{ color: t.text }}>
          {dataExtenso ?? 'A definir'}
        </span>
        <span className="text-sm" style={{ color: t.textMuted }}>
          Casa {passoMentor.nome}
        </span>
      </div>
      <p className="text-[13px] font-semibold mt-1.5" style={{ color: cor }}>
        {situacao}
      </p>
    </div>
  );
};

// ============================================================
// Timeline: uma linha por Casa da trilha
// ============================================================
const ROTULO_ESTADO: Record<EstadoCasa, string> = {
  concluida: 'concluída',
  agora: 'nesta turma',
  caminho: 'a caminho',
};

const NoTrilha = ({ passo }: { passo: PassoTrilha }) => {
  const base = {
    width: 15,
    height: 15,
    borderRadius: '50%',
    backgroundColor: t.surface,
    border: `2px solid ${t.border}`,
  } as React.CSSProperties;

  if (passo.ehMentor) {
    return <span style={{ ...base, backgroundColor: passo.cor, borderColor: passo.cor }} />;
  }
  if (passo.estado === 'concluida') {
    return <span style={{ ...base, backgroundColor: passo.cor, borderColor: 'transparent' }} />;
  }
  if (passo.estado === 'agora') {
    return (
      <span
        style={{
          ...base,
          width: 19,
          height: 19,
          backgroundColor: passo.cor,
          borderColor: passo.cor,
          boxShadow: `0 0 0 4px ${passo.cor}2E`,
        }}
      />
    );
  }
  // a caminho: contorno na cor da Casa
  return <span style={{ ...base, borderColor: passo.cor }} />;
};

const LinhaCasa = ({ passo, primeiro, ultimo }: { passo: PassoTrilha; primeiro: boolean; ultimo: boolean }) => {
  const concluida = passo.estado === 'concluida';
  const nomeCor = passo.ehMentor ? passo.cor : concluida ? t.textFaint : t.text;
  const curta = dataCurta(passo.data);

  return (
    <li
      className="grid items-center gap-3 relative"
      style={{
        gridTemplateColumns: '26px 1fr auto',
        padding: '9px 8px',
        marginLeft: -8,
        marginRight: -8,
        borderRadius: 14,
        backgroundColor: passo.ehMentor ? `${passo.cor}12` : 'transparent',
      }}
    >
      {/* trilho + nó */}
      <span className="relative flex justify-center self-stretch">
        <span
          aria-hidden
          className="absolute w-0.5"
          style={{
            backgroundColor: t.border,
            top: primeiro ? '50%' : -9,
            bottom: ultimo ? '50%' : -9,
          }}
        />
        <span className="relative z-10 self-center">
          <NoTrilha passo={passo} />
        </span>
      </span>

      {/* nome + sub */}
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-semibold leading-tight" style={{ color: nomeCor }}>
            Casa {passo.nome}
          </span>
          {passo.ehMentor && (
            <span
              className="text-[9px] uppercase tracking-wide font-bold px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: passo.cor, color: '#FFFFFF' }}
            >
              Sua vez
            </span>
          )}
          {!passo.ehMentor && passo.estado === 'agora' && (
            <span
              className="text-[9px] uppercase tracking-wide font-bold px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: passo.cor, color: '#FFFFFF' }}
            >
              Agora
            </span>
          )}
        </span>
        <span className="block text-[11px] mt-0.5" style={{ color: t.textFaint }}>
          {passo.ehMentor ? 'o seu capítulo nesta turma' : ROTULO_ESTADO[passo.estado]}
        </span>
      </span>

      {/* data */}
      <span className="text-right whitespace-nowrap">
        {curta ? (
          <span
            className="text-[13px] tabular-nums"
            style={{ color: passo.ehMentor ? passo.cor : concluida ? t.textFaint : t.text, fontWeight: passo.ehMentor ? 700 : 400 }}
          >
            {curta}
          </span>
        ) : (
          <span className="text-[13px] italic" style={{ color: t.textFaint }}>
            a definir
          </span>
        )}
      </span>
    </li>
  );
};

// ============================================================
// Página
// ============================================================
const F2LinhaAnoPage = () => {
  const navigate = useNavigate();
  const { turmaId } = useParams<{ turmaId: string }>();
  const { profile, casaMentor, segmento, isLoading: ctxLoading } = useProfessor();

  // Só o F2 reformado entra aqui. Segmento errado / flag off: volta pra home.
  useEffect(() => {
    if (ctxLoading) return;
    if (!F2_REFORMA_ATIVA || segmento !== 'fundamental2') navigate('/professor', { replace: true });
  }, [ctxLoading, segmento, navigate]);

  const { data: turma } = useQuery<TurmaInfo | null>({
    queryKey: ['f2-linha-ano-turma', turmaId],
    enabled: !!turmaId,
    queryFn: async () => {
      const { data } = await sb.from('turmas').select('id, nome, serie, turma_letra').eq('id', turmaId!).maybeSingle();
      return (data as TurmaInfo | null) ?? null;
    },
  });

  const { data, isLoading } = useLinhaAno(turmaId, profile?.institution_id, casaMentor?.id);

  const turmaLabel = turma ? formatTurmaLabel(turma.serie, turma.turma_letra) || turma.nome : '';

  const Voltar = (
    <button
      onClick={() => navigate('/professor')}
      className="inline-flex items-center gap-1.5 text-sm font-medium rounded-lg px-2 py-1 -ml-2"
      style={{ color: t.textMuted }}
    >
      <ArrowLeft size={16} /> Voltar
    </button>
  );

  if (ctxLoading || isLoading) {
    return (
      <div className="pt-4 space-y-4">
        {Voltar}
        <Skeleton className="h-8 w-40 rounded" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="pt-4">
        {Voltar}
        <div
          className="rounded-2xl p-5 text-center mt-3"
          style={{ backgroundColor: t.surface, border: `1px solid ${t.border}` }}
        >
          <h2 className="text-base font-bold" style={{ color: t.text }}>
            Não foi possível montar a linha do ano
          </h2>
          <p className="text-sm mt-1.5 max-w-xs mx-auto" style={{ color: t.textMuted }}>
            Tente novamente em instantes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-4 pb-10 space-y-4">
      {Voltar}

      {/* Cabeçalho */}
      <div>
        <p className="text-[10px] uppercase tracking-wide font-bold flex items-center gap-1.5" style={{ color: t.textFaint }}>
          <CalendarRange size={13} strokeWidth={2} /> A linha do ano
        </p>
        <h1 className="text-2xl font-bold mt-0.5 leading-tight" style={{ color: t.text }}>
          {turmaLabel || 'Turma'}
        </h1>
      </div>

      {/* Resumo: a vez do mentor */}
      <ResumoSuaVez dados={data} casaMentorNome={casaMentor?.nome ?? null} />

      {/* Timeline das Casas */}
      <div>
        <p className="text-[10px] uppercase tracking-wide font-bold mb-2 px-1" style={{ color: t.textFaint }}>
          {turmaLabel ? `O ano do ${turmaLabel}` : 'O ano da turma'}
        </p>
        <div
          className="rounded-2xl px-4 py-2"
          style={{ backgroundColor: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadowSm }}
        >
          <ul>
            {data.passos.map((p, i) => (
              <LinhaCasa key={`${p.posicao}-${p.inteligenciaId}`} passo={p} primeiro={i === 0} ultimo={i === data.passos.length - 1} />
            ))}
          </ul>
        </div>
      </div>

      <p className="text-center text-[11px]" style={{ color: t.textFaint }}>
        As datas vêm da data do capítulo que você preenche em Administrar capítulo. Onde ainda não há data, fica "a definir".
      </p>
    </div>
  );
};

export default F2LinhaAnoPage;
