import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Check, Sprout, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfessor } from '@/contexts/ProfessorContext';
import { TREINAMENTOS as TREINAMENTOS_INFANTIL, type TreinamentoFormacao } from '@/lib/infantilFormacao';
import { TREINAMENTOS as TREINAMENTOS_F2 } from '@/lib/f2Formacao';
import { F2_REFORMA_ATIVA } from '@/config/f2Reforma';
import { infantilTheme as t } from '@/styles/infantilTheme';

const MarcaA = ({ size = 48, cor = t.accent }: { size?: number; cor?: string }) => (
  <svg viewBox="0 0 100 100" style={{ width: size, height: size }} aria-hidden="true">
    <path
      d="M30 79 L50 27 L70 79"
      stroke={cor}
      strokeWidth="8.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <path d="M50 27 C50 16 58 9 68 8 C69 19 61 26 50 27 Z" fill={cor} />
  </svg>
);

type Etapa =
  | { tela: 'lista' }
  | { tela: 'capa'; tr: TreinamentoFormacao }
  | { tela: 'licao'; tr: TreinamentoFormacao; idx: number }
  | { tela: 'situacao'; tr: TreinamentoFormacao; idx: number }
  | { tela: 'conquista'; tr: TreinamentoFormacao };

/**
 * FORMAÇÃO ARBORIA: o treinamento que mora dentro do app (aprovado em mockup 03/07).
 * Situações reais de sala, escolha comentada, conclusão vira conquista.
 * Grava SÓ a conclusão em `professor_formacao`; respostas nunca são gravadas.
 */
const InfantilFormacaoPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, segmento } = useProfessor();

  // Formação POR SEGMENTO: o professor do Fundamental 2 (sob o flag da reforma)
  // recebe a Formação do F2. Infantil e F1 seguem com a Formação IDÊNTICA de
  // sempre. A tela de renderização é a mesma; muda só a fonte do conteúdo.
  const ehF2 = F2_REFORMA_ATIVA && segmento === 'fundamental2';
  const TREINAMENTOS = ehF2 ? TREINAMENTOS_F2 : TREINAMENTOS_INFANTIL;
  // O selo da situação nomeia a categoria por segmento: no F2 são "Casas",
  // no Infantil/F1 seguem "Inteligências" (texto inalterado para eles).
  const seloPrefixo = ehF2 ? 'Casa em cena' : 'Inteligência em cena';

  const [etapa, setEtapa] = useState<Etapa>({ tela: 'lista' });
  const [concluidos, setConcluidos] = useState<Record<number, string>>({});
  const [respostaSel, setRespostaSel] = useState<number | null>(null);
  const [acertou, setAcertou] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await (supabase.from as never as (tb: string) => ReturnType<typeof supabase.from>)(
        'professor_formacao'
      )
        .select('treinamento_id, concluido_em')
        .eq('professor_id', user.id);
      const mapa: Record<number, string> = {};
      (data as { treinamento_id: number; concluido_em: string }[] | null)?.forEach((r) => {
        mapa[r.treinamento_id] = r.concluido_em;
      });
      setConcluidos(mapa);
    })();
  }, [user?.id]);

  const gravarConclusao = async (tr: TreinamentoFormacao) => {
    if (!user?.id) return;
    // idempotente: refazer o treinamento não duplica nem muda a data original
    if (concluidos[tr.id]) return;
    const agora = new Date().toISOString();
    setConcluidos((c) => ({ ...c, [tr.id]: agora }));
    const { error } = await (supabase.from as never as (tb: string) => ReturnType<typeof supabase.from>)(
      'professor_formacao'
    ).insert({
      professor_id: user.id,
      institution_id: profile?.institution_id ?? null,
      treinamento_id: tr.id,
    } as never);
    if (error && !`${error.message}`.includes('duplicate')) {
      toast.error('A conclusão não foi gravada agora; tente abrir o treinamento de novo mais tarde.');
    }
  };

  const abrirSituacao = (tr: TreinamentoFormacao, idx: number) => {
    setRespostaSel(null);
    setAcertou(false);
    setEtapa({ tela: 'situacao', tr, idx });
  };

  const fmtData = (iso?: string) => {
    try {
      return format(new Date(iso ?? Date.now()), "d 'de' MMMM", { locale: ptBR });
    } catch {
      return '';
    }
  };

  /* ============ LISTA ============ */
  if (etapa.tela === 'lista') {
    return (
      <div className="pt-4 pb-8">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[11px] uppercase tracking-wide font-semibold" style={{ color: t.accentText }}>
            Formação Arboria
          </p>
          <button
            onClick={() => navigate('/professor/fase')}
            className="flex items-center gap-0.5 text-sm p-2 -m-2"
            style={{ color: t.textFaint }}
          >
            <ChevronLeft size={15} /> Voltar
          </button>
        </div>

        <h1 className="font-serif text-[23px] leading-snug mb-2" style={{ color: t.text }}>
          Treinamentos
        </h1>
        <p className="text-sm leading-relaxed mb-5" style={{ color: t.textMuted }}>
          Curtos, práticos e no seu ritmo. Cada um usa cenas reais de sala para treinar o
          olhar que o diário pede.
        </p>

        <div className="space-y-2.5">
          {TREINAMENTOS.map((tr) => {
            const feito = !!concluidos[tr.id];
            return (
              <button
                key={tr.id}
                onClick={() => tr.disponivel && setEtapa({ tela: 'capa', tr })}
                disabled={!tr.disponivel}
                className="w-full flex items-center gap-3 rounded-2xl p-3.5 text-left disabled:opacity-55"
                style={{
                  backgroundColor: t.surface,
                  border: `1px solid ${feito ? t.presente : t.border}`,
                  boxShadow: t.shadowSm,
                }}
              >
                <span
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={
                    feito
                      ? { backgroundColor: t.presente, color: '#FFFFFF' }
                      : { backgroundColor: t.accentSoft, color: t.accentText }
                  }
                >
                  {feito ? <Check size={14} strokeWidth={3} /> : tr.id}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: t.text }}>
                    <span className="truncate">{tr.titulo}</span>
                    {tr.nivel && (
                      <span
                        className="flex-shrink-0 text-[9px] uppercase tracking-wide font-bold px-1.5 py-0.5 rounded-full"
                        style={{ backgroundColor: t.accentSoft, color: t.accentText }}
                      >
                        {tr.nivel}
                      </span>
                    )}
                  </span>
                  <span
                    className="block text-xs mt-0.5"
                    style={{ color: feito ? t.presenteText : t.textFaint }}
                  >
                    {feito ? `Concluído em ${fmtData(concluidos[tr.id])}` : tr.subtitulo}
                  </span>
                </span>
                {!tr.disponivel && (
                  <span
                    className="flex-shrink-0 text-[9px] uppercase tracking-wide font-bold px-1.5 py-0.5 rounded"
                    style={{ color: t.textFaint, border: `1px dashed ${t.silencio}` }}
                  >
                    em breve
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  /* ============ CAPA ============ */
  if (etapa.tela === 'capa') {
    const { tr } = etapa;
    return (
      <div className="pt-4 pb-8 flex flex-col min-h-[70vh]">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[11px] uppercase tracking-wide font-semibold" style={{ color: t.accentText }}>
            Formação Arboria
          </p>
          <button
            onClick={() => setEtapa({ tela: 'lista' })}
            className="flex items-center gap-1 text-sm p-2 -m-2"
            style={{ color: t.textFaint }}
          >
            Sair <X size={14} />
          </button>
        </div>

        <div
          className="rounded-2xl flex items-center justify-center mb-5"
          style={{ backgroundColor: t.accentSoft, height: 160 }}
        >
          <MarcaA size={52} />
        </div>

        <h1 className="font-serif text-[23px] leading-snug mb-3" style={{ color: t.text }}>
          {tr.nivel ? (
            <>
              {tr.titulo}
              <br />
              <span className="text-[17px]" style={{ color: t.accentText }}>
                Nível {tr.nivel}
              </span>
            </>
          ) : (
            <>
              Treinamento {tr.id}
              <br />
              {tr.titulo}
            </>
          )}
        </h1>
        <p className="text-sm leading-relaxed texto-justificado" style={{ color: t.textMuted }}>
          {tr.capa}
        </p>

        <div className="mt-auto pt-6">
          <button
            onClick={() =>
              tr.licoes.length > 0
                ? setEtapa({ tela: 'licao', tr, idx: 0 })
                : abrirSituacao(tr, 0)
            }
            className="w-full rounded-xl py-3.5 text-sm font-semibold"
            style={{ backgroundColor: t.accent, color: '#FFFFFF', boxShadow: t.shadowMd }}
          >
            Começar
          </button>
          <p className="text-center text-[11px] mt-2.5" style={{ color: t.textFaint }}>
            Isto não é uma avaliação. Não há nota nem tempo.
          </p>
        </div>
      </div>
    );
  }

  /* ============ LIÇÃO (a instrução vem antes da prática) ============ */
  if (etapa.tela === 'licao') {
    const { tr, idx } = etapa;
    const licao = tr.licoes[idx];
    const ultima = idx === tr.licoes.length - 1;

    return (
      <div className="pt-4 pb-8 flex flex-col min-h-[70vh]">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[11px] uppercase tracking-wide font-semibold" style={{ color: t.accentText }}>
            Lição {idx + 1} de {tr.licoes.length}
          </p>
          <button
            onClick={() => setEtapa({ tela: 'lista' })}
            className="flex items-center gap-1 text-sm p-2 -m-2"
            style={{ color: t.textFaint }}
          >
            Sair <X size={14} />
          </button>
        </div>

        <h1 className="font-serif text-[22px] leading-snug mb-3" style={{ color: t.text }}>
          {licao.titulo}
        </h1>

        {licao.paragrafos.map((p, i) => (
          <p
            key={i}
            className="text-sm leading-relaxed texto-justificado mb-3"
            style={{ color: t.textMuted }}
          >
            {p}
          </p>
        ))}

        {licao.itens && (
          <div className="space-y-2 mb-3">
            {licao.itens.map((item, i) => (
              <div
                key={i}
                className="rounded-xl p-3"
                style={{ backgroundColor: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadowSm }}
              >
                {item.titulo && (
                  <p className="flex items-center gap-1.5 text-[12.5px] font-bold mb-0.5" style={{ color: item.cor ?? t.text }}>
                    {item.cor && (
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: item.cor }}
                      />
                    )}
                    {item.titulo}
                  </p>
                )}
                <p className="text-[13px] leading-relaxed" style={{ color: t.textMuted }}>
                  {item.texto}
                </p>
              </div>
            ))}
          </div>
        )}

        {licao.destaque && (
          <p
            className="font-serif italic text-[15.5px] leading-relaxed text-center px-4 py-3 rounded-2xl"
            style={{ color: t.accentText, backgroundColor: t.accentSoft }}
          >
            {licao.destaque}
          </p>
        )}

        <div className="mt-auto pt-5 flex items-center gap-2">
          <button
            onClick={() =>
              idx === 0 ? setEtapa({ tela: 'capa', tr }) : setEtapa({ tela: 'licao', tr, idx: idx - 1 })
            }
            className="flex items-center gap-0.5 text-sm py-3 px-3"
            style={{ color: t.textFaint }}
          >
            <ChevronLeft size={15} /> Voltar
          </button>
          <button
            onClick={() =>
              ultima ? abrirSituacao(tr, 0) : setEtapa({ tela: 'licao', tr, idx: idx + 1 })
            }
            className="flex-1 rounded-xl py-3.5 text-sm font-semibold"
            style={{ backgroundColor: t.accent, color: '#FFFFFF', boxShadow: t.shadowMd }}
          >
            {ultima ? 'Agora, praticar' : 'Avançar'}
          </button>
        </div>
      </div>
    );
  }

  /* ============ SITUAÇÃO ============ */
  if (etapa.tela === 'situacao') {
    const { tr, idx } = etapa;
    const s = tr.situacoes[idx];
    const ultima = idx === tr.situacoes.length - 1;
    const fb = respostaSel != null ? s.alternativas[respostaSel] : null;

    return (
      <div className="pt-4 pb-8 flex flex-col min-h-[70vh]">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[11px] uppercase tracking-wide font-semibold" style={{ color: t.accentText }}>
            Situação {idx + 1} de {tr.situacoes.length}
          </p>
          <button
            onClick={() => setEtapa({ tela: 'lista' })}
            className="flex items-center gap-1 text-sm p-2 -m-2"
            style={{ color: t.textFaint }}
          >
            Sair <X size={14} />
          </button>
        </div>

        <div
          className="rounded-2xl p-4 mb-3"
          style={{ backgroundColor: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadowSm }}
        >
          {/* Selo só quando a inteligência é declarada (no T2, identificá-la
              É o exercício: mostrar o selo entregaria a resposta) */}
          {s.inteligencia && s.cor && (
            <p
              className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide font-bold mb-2"
              style={{ color: s.cor }}
            >
              <span
                className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: s.cor }}
              />
              {seloPrefixo}: {s.inteligencia}
            </p>
          )}
          <p className="font-serif italic text-[15px] leading-relaxed" style={{ color: t.text }}>
            {s.cena}
          </p>
        </div>

        <p className="text-xs font-semibold mb-2.5" style={{ color: t.textMuted }}>
          {s.pergunta ?? 'O que você registraria no diário?'}
        </p>

        <div className="space-y-2">
          {s.alternativas.map((alt, i) => {
            const sel = respostaSel === i;
            return (
              <button
                key={i}
                onClick={() => {
                  if (acertou) return;
                  setRespostaSel(i);
                  if (alt.correta) setAcertou(true);
                }}
                disabled={acertou && !sel}
                className="w-full text-left rounded-xl p-3 text-[13px] leading-relaxed transition-colors"
                style={{
                  backgroundColor: sel ? (alt.correta ? '#E9F6F0' : '#FBF3E6') : t.surface,
                  border: `1px solid ${sel ? (alt.correta ? t.presente : '#E6D6AC') : t.border}`,
                  color: t.text,
                  opacity: acertou && !sel ? 0.55 : 1,
                }}
              >
                {alt.texto}
              </button>
            );
          })}
        </div>

        {fb && (
          <div
            className="rounded-xl p-3 mt-3 text-[12.5px] leading-relaxed"
            style={
              fb.correta
                ? { backgroundColor: '#E9F6F0', color: t.presenteText }
                : { backgroundColor: '#FBF3E6', color: '#8A5A12' }
            }
          >
            <b>{fb.correta ? 'Bem observado. ' : 'Ainda não. '}</b>
            {fb.feedback}
          </div>
        )}

        <div className="mt-auto pt-5">
          {acertou ? (
            <button
              onClick={() => {
                if (ultima) {
                  gravarConclusao(tr);
                  setEtapa({ tela: 'conquista', tr });
                } else {
                  abrirSituacao(tr, idx + 1);
                }
              }}
              className="w-full rounded-xl py-3.5 text-sm font-semibold"
              style={{ backgroundColor: t.accent, color: '#FFFFFF', boxShadow: t.shadowMd }}
            >
              {ultima ? 'Concluir treinamento' : 'Próxima situação'}
            </button>
          ) : (
            respostaSel != null && (
              <p className="text-center text-xs" style={{ color: t.textFaint }}>
                Escolha outra resposta. O erro faz parte do estudo.
              </p>
            )
          )}
        </div>
      </div>
    );
  }

  /* ============ CONQUISTA ============ */
  const { tr } = etapa;
  // Próximo pela ORDEM DA TRILHA (o array), não pelo id: os níveis do T2
  // usam ids próprios no banco mas vêm em sequência na lista
  const proximo = TREINAMENTOS[TREINAMENTOS.indexOf(tr) + 1];
  return (
    <div
      className="pt-4 pb-8 flex flex-col items-center text-center min-h-[78vh] -mx-4 px-6"
      style={{
        background: `radial-gradient(110% 60% at 50% -5%, ${t.accentSoft} 0%, transparent 60%)`,
      }}
    >
      <div className="w-full flex justify-end">
        <button
          onClick={() => setEtapa({ tela: 'lista' })}
          className="p-2 -m-2"
          style={{ color: t.textFaint }}
          aria-label="Fechar"
        >
          <X size={18} />
        </button>
      </div>

      <div
        className="w-[92px] h-[92px] rounded-full flex items-center justify-center mt-8 mb-5 vf-rise"
        style={{
          backgroundColor: t.surface,
          border: `2.5px solid ${t.presente}`,
          boxShadow: '0 8px 24px rgba(34,160,107,0.25)',
        }}
      >
        <MarcaA size={46} cor={t.presente} />
      </div>

      <p className="text-[11px] uppercase tracking-wide font-semibold vf-rise" style={{ color: t.accentText }}>
        Formação Arboria
      </p>
      <h1
        className="font-serif text-[24px] leading-snug mt-1 vf-rise"
        style={{ color: t.text, animationDelay: '80ms' }}
      >
        {tr.nivel ? (
          <>
            Você completou o<br />
            nível {tr.nivel}
          </>
        ) : (
          <>
            Você completou o<br />
            Treinamento {tr.id}
          </>
        )}
      </h1>
      <p
        className="font-serif italic text-[17px] mt-1.5 vf-rise"
        style={{ color: t.presenteText, animationDelay: '160ms' }}
      >
        "{tr.titulo}"
      </p>
      <p className="text-xs mt-2.5 vf-rise" style={{ color: t.textFaint, animationDelay: '220ms' }}>
        {fmtData(concluidos[tr.id])}
      </p>

      {proximo && (
        <div
          className="w-full rounded-2xl p-3.5 mt-8 vf-rise"
          style={{
            backgroundColor: t.surface,
            border: `1px dashed ${t.border}`,
            animationDelay: '300ms',
          }}
        >
          <p className="text-[10px] uppercase tracking-wide font-bold" style={{ color: t.textFaint }}>
            Próximo treinamento
          </p>
          <p className="text-sm font-semibold mt-0.5" style={{ color: t.text }}>
            {proximo.id} · {proximo.titulo}
          </p>
        </div>
      )}

      <div className="mt-auto w-full pt-8">
        <button
          onClick={() => setEtapa({ tela: 'lista' })}
          className="w-full rounded-xl py-3.5 text-sm font-semibold flex items-center justify-center gap-1.5"
          style={{ backgroundColor: t.accent, color: '#FFFFFF', boxShadow: t.shadowMd }}
        >
          Ver meus treinamentos <Sprout size={15} />
        </button>
      </div>
    </div>
  );
};

export default InfantilFormacaoPage;
