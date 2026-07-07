import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Shield, ChevronDown, Paperclip, Settings2, Route, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useProfessor } from '@/contexts/ProfessorContext';
import { infantilTheme as t } from '@/styles/infantilTheme';
import { corDaCasa } from '@/config/f2Reforma';
import { formatTurmaLabel } from '@/lib/infantil';
import { Skeleton } from '@/components/ui/skeleton';
import { useTurmasDaCasaAtiva, type TurmaDaCasaAtiva, type StatusTurmaCasa } from '@/hooks/useTurmasDaCasaAtiva';

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

/** Cartão de turma na grade. */
const CartaoTurma = ({
  turma,
  ativo,
  onClick,
}: {
  turma: TurmaDaCasaAtiva;
  ativo: boolean;
  onClick: () => void;
}) => {
  const selo = SELO[turma.status];
  const cor = corDaCasa(turma.casaAtualId);
  return (
    <button
      onClick={onClick}
      className="rounded-2xl p-3 text-left transition-transform active:scale-[0.99]"
      style={{
        backgroundColor: t.surface,
        border: ativo ? `1.5px solid ${t.accent}` : `1px solid ${t.border}`,
        boxShadow: ativo ? t.shadowMd : t.shadowSm,
      }}
      aria-pressed={ativo}
    >
      <div className="flex items-center gap-2.5">
        <EscudoCasa casaId={turma.casaAtualId} brasao={turma.casaAtualBrasao} size={38} />
        <div className="min-w-0">
          <p className="text-sm font-bold truncate" style={{ color: t.text }}>
            {formatTurmaLabel(turma.serie, turma.turma_letra) || turma.nome}
          </p>
          {turma.casaAtualNome && (
            <p className="text-[11px] truncate" style={{ color: t.textFaint }}>
              Casa {turma.casaAtualNome}
            </p>
          )}
        </div>
      </div>
      <span
        className="inline-block mt-2.5 text-[10px] uppercase tracking-wide font-bold px-2 py-0.5 rounded-full"
        style={
          selo.forte
            ? { backgroundColor: t.accent, color: '#FFFFFF' }
            : { backgroundColor: `${cor}14`, color: cor }
        }
      >
        {selo.texto}
      </span>
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
}: {
  turma: TurmaDaCasaAtiva;
  casaMentorNome: string | null;
  onAdministrar: () => void;
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
 * Aba ARBORIA (Fundamental 2, reforma). A grade das turmas do mentor e, para a
 * turma cuja vez é dele, a capa do capítulo com a jornada de etapas.
 */
const F2ArboriaPage = () => {
  const navigate = useNavigate();
  const { isLoading, profile, casaMentor } = useProfessor();
  const { data: turmas, isLoading: turmasLoading } = useTurmasDaCasaAtiva(
    profile?.institution_id,
    casaMentor?.id
  );

  const [turmaSel, setTurmaSel] = useState<string | null>(null);

  const turmaAtiva = useMemo(() => {
    if (!turmas || turmas.length === 0) return null;
    const escolhida = turmaSel && turmas.find((x) => x.turma_id === turmaSel);
    return escolhida || turmas.find((x) => x.status === 'vez') || turmas[0];
  }, [turmas, turmaSel]);

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
          {/* Grade das turmas do mentor */}
          <div>
            <p className="text-[11px] uppercase tracking-wide font-semibold mb-2 px-1" style={{ color: t.textFaint }}>
              Suas turmas
            </p>
            <div className="grid grid-cols-2 gap-2">
              {turmas.map((turma) => (
                <CartaoTurma
                  key={turma.turma_id}
                  turma={turma}
                  ativo={turmaAtiva?.turma_id === turma.turma_id}
                  onClick={() => setTurmaSel(turma.turma_id)}
                />
              ))}
            </div>
          </div>

          {/* Detalhe da turma selecionada */}
          {turmaAtiva && (
            <div>
              {turmaAtiva.status === 'vez' ? (
                <CapaCapituloTurma
                  turma={turmaAtiva}
                  casaMentorNome={casaMentor.nome}
                  onAdministrar={() => navigate(`/professor/f2/capitulo/${turmaAtiva.turma_id}`)}
                />
              ) : (
                <CartaoNaFila turma={turmaAtiva} />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default F2ArboriaPage;
