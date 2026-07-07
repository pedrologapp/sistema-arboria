import { useEffect, useState } from 'react';
import { X, ChevronLeft, Feather, Sprout } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MECANISMOS_INFANTIL } from '@/lib/infantilMecanismos';
import { infantilTheme as t } from '@/styles/infantilTheme';

const TOTAL_FASES = 8;

export interface ViradaDados {
  ordemFechada: number;       // 1..total; a POSIÇÃO da fase que acabou de fechar
  faseFechadaNome: string;
  turmaLabel: string;
  momentos: number | null;    // null = contagem indisponível (degrada sem números)
  criancasObservadas: number;
  totalCriancas: number;
  multiAutores: boolean;      // >1 professora escreveu na fase → "vocês enxergaram"
  dataInicio: string | null;  // ISO, quando a fase fechada começou
  momentosAno: number | null; // só usado na última fase (encerramento do ano)
  /** Nº de fases ATIVAS da turma. Opcional: ausente = 8 (trilha padrão). */
  totalFases?: number;
  /**
   * Inteligência (id) da PRÓXIMA posição, para a abertura. Opcional: ausente =
   * fallback canônico (ordemFechada + 1). `null` quando não há próxima.
   */
  proximaIntelId?: number | null;
}

const fmtDia = (iso: string) => {
  try {
    return format(parseISO(iso), "d 'de' MMMM", { locale: ptBR });
  } catch {
    return '';
  }
};

/** Bloco com entrada em cascata (fade + rise, delays escalonados). */
const Casc = ({ i, children, className = '' }: { i: number; children: React.ReactNode; className?: string }) => (
  <div className={`vf-rise ${className}`} style={{ animationDelay: `${i * 120}ms` }}>
    {children}
  </div>
);

/**
 * VIRADA DE FASE: o momento de pico do Infantil, em 2 tempos.
 *
 * "O caderno que fecha à noite e abre numa página nova": o Tempo 1 (Fechamento)
 * escurece para o índigo profundo do tema e celebra o que a PROFESSORA enxergou;
 * o Tempo 2 (Abertura) amanhece de volta ao claro e apresenta o próximo mecanismo.
 * Fase 8 → o Tempo 2 vira o encerramento do ano.
 *
 * LEI DO MODELO nesta tela: números só afirmativos (nunca "X de Y" como fração/
 * barra), silêncio nunca em cor de alerta (pena, não triângulo), zero nunca vira
 * numeral, datas como memória (nunca métrica de velocidade), sem lista nominal,
 * sem confete: a solenidade É a recompensa. X/Esc sempre disponíveis: o rito
 * nunca prende a professora que está com a turma esperando.
 */
const ViradaFaseExperience = ({ dados, onFechar }: { dados: ViradaDados; onFechar: () => void }) => {
  const [tempo, setTempo] = useState<1 | 2>(1);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFechar();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onFechar]);

  // total = nº de fases ativas da turma (8 no fallback). A trilha pode ser um
  // subconjunto; a próxima inteligência vem configurada (proximaIntelId).
  const total = dados.totalFases ?? TOTAL_FASES;
  const anoCompleto = dados.ordemFechada >= total;
  const proximaId = dados.proximaIntelId ?? dados.ordemFechada + 1;
  const proxima = anoCompleto || proximaId == null ? null : MECANISMOS_INFANTIL[proximaId];

  const silencio =
    dados.momentos == null ? null : Math.max(0, dados.totalCriancas - dados.criancasObservadas);
  const semRegistros = dados.momentos === 0;
  const contagemIndisponivel = dados.momentos == null;

  const escuro = tempo === 1;

  return (
    <div
      className="fixed inset-0 z-[60] overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Virada de fase"
      style={{
        backgroundColor: escuro ? t.accentDeep : t.bg,
        transition: 'background-color 500ms ease-in-out',
      }}
    >
      {tempo === 1 ? (
        /* ============ TEMPO 1. FECHAMENTO (o caderno escurece) ============ */
        <div key="t1" className="min-h-full flex flex-col max-w-sm mx-auto px-6 pt-14 pb-8 pb-safe">
          <button
            onClick={onFechar}
            className="absolute top-4 right-4 p-2.5 rounded-full"
            style={{ color: 'rgba(255,255,255,0.6)' }}
            aria-label="Fechar"
          >
            <X size={20} />
          </button>

          <Casc i={0}>
            <p
              className="text-[11px] uppercase font-semibold text-center"
              style={{ color: 'rgba(255,255,255,0.75)', letterSpacing: '0.35em' }}
            >
              Virada de exploração
            </p>
            <div
              className="vf-draw mx-auto mt-3"
              style={{ width: 48, height: 2, backgroundColor: 'rgba(255,255,255,0.35)', animationDelay: '300ms' }}
            />
          </Casc>

          <Casc i={1} className="mt-6">
            <h2
              className="font-serif text-[28px] leading-tight text-center"
              style={{ color: '#FFFFFF' }}
              tabIndex={-1}
            >
              A Exploração {dados.faseFechadaNome} se encerra.
            </h2>
          </Casc>

          <Casc i={2} className="mt-4">
            <p className="text-xs text-center leading-relaxed" style={{ color: 'rgba(255,255,255,0.75)' }}>
              Exploração {dados.ordemFechada} de {total} · {dados.turmaLabel}
              {dados.dataInicio && (
                <>
                  <br />
                  {fmtDia(dados.dataInicio)}: {fmtDia(new Date().toISOString())}
                </>
              )}
            </p>
          </Casc>

          {semRegistros || contagemIndisponivel ? (
            /* Zero nunca vira numeral: a tela encurta e segue, sem culpa. */
            <Casc i={3} className="my-auto py-10">
              <p
                className="font-serif italic text-[15px] leading-relaxed text-center max-w-[260px] mx-auto"
                style={{ color: 'rgba(255,255,255,0.85)' }}
              >
                {contagemIndisponivel && !semRegistros
                  ? 'O que você enxergou nesta exploração vive no Diário de cada criança, e segue com a turma.'
                  : 'Esta exploração se encerra sem registros no diário, e o diário é só uma parte do olhar. O que você viveu com a turma não se perde. A próxima exploração abre uma página nova.'}
              </p>
            </Casc>
          ) : (
            <>
              <Casc i={3} className="mt-8">
                <p className="font-serif text-[44px] leading-none text-center" style={{ color: '#FFFFFF' }}>
                  {dados.momentos}
                </p>
                <p className="text-[13px] text-center mt-1.5" style={{ color: 'rgba(255,255,255,0.85)' }}>
                  {dados.momentos === 1 ? 'momento guardado no diário' : 'momentos guardados no diário'}
                </p>
              </Casc>

              <Casc i={4} className="mt-6">
                <p className="font-serif text-[44px] leading-none text-center" style={{ color: '#FFFFFF' }}>
                  {dados.criancasObservadas}
                </p>
                <p className="text-[13px] text-center mt-1.5" style={{ color: 'rgba(255,255,255,0.85)' }}>
                  {dados.criancasObservadas === 1 ? 'criança aparece nesta exploração' : 'crianças aparecem nesta exploração'}
                </p>
              </Casc>

              <Casc i={5} className="mt-7">
                {silencio != null && silencio > 0 ? (
                  /* O cuidado: pena, não alerta. Sem nomes: a superfície nominal é o Diário. */
                  <div
                    className="rounded-2xl p-4 flex gap-3"
                    style={{ backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)' }}
                  >
                    <Feather size={18} strokeWidth={1.5} className="flex-shrink-0 mt-0.5" style={{ color: 'rgba(255,255,255,0.85)' }} />
                    <div>
                      <p className="text-sm font-semibold leading-snug" style={{ color: '#FFFFFF' }}>
                        {silencio === 1
                          ? '1 criança atravessou a exploração em silêncio no diário.'
                          : `${silencio} crianças atravessaram a exploração em silêncio no diário.`}
                      </p>
                      <p className="text-[13px] leading-relaxed mt-1 texto-justificado" style={{ color: 'rgba(255,255,255,0.85)' }}>
                        Silêncio não é ausência: às vezes o canal ainda não abriu. Leve um olhar
                        especial para elas na próxima exploração.
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-center" style={{ color: 'rgba(255,255,255,0.85)' }}>
                    Todas as {dados.totalCriancas} crianças da turma aparecem no diário desta fase.
                  </p>
                )}
              </Casc>

              <Casc i={6} className="mt-7 mb-8">
                <p
                  className="font-serif italic text-[15px] leading-relaxed text-center max-w-[250px] mx-auto"
                  style={{ color: 'rgba(255,255,255,0.85)' }}
                >
                  {dados.multiAutores
                    ? 'Nada do que vocês enxergaram se perde. Agora é história da turma.'
                    : 'Nada do que você enxergou se perde. Agora é história da turma.'}
                </p>
              </Casc>
            </>
          )}

          <Casc i={7} className="mt-auto">
            <button
              onClick={() => setTempo(2)}
              autoFocus
              className="w-full rounded-2xl py-3.5 text-[15px] font-semibold active:scale-[0.99] transition-transform"
              style={{ backgroundColor: '#FFFFFF', color: t.accentDeep }}
            >
              {anoCompleto ? 'Ver o encerramento do ano' : 'Abrir a próxima exploração'}
            </button>
          </Casc>
        </div>
      ) : (
        /* ============ TEMPO 2. ABERTURA (o amanhecer) ============ */
        <div key="t2" className="min-h-full flex flex-col max-w-sm mx-auto px-6 pt-5 pb-8 pb-safe">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => setTempo(1)}
              className="flex items-center gap-0.5 text-[13px] py-2.5 pr-2"
              style={{ color: t.textMuted }}
            >
              <ChevronLeft size={16} /> Rever o fechamento
            </button>
            <button onClick={onFechar} className="p-2.5 rounded-full" style={{ color: t.textFaint }} aria-label="Fechar">
              <X size={19} />
            </button>
          </div>

          {/* Régua: o ponto novo acende por último, com o broto */}
          <Casc i={0}>
            <div className="flex items-center justify-center mb-6" aria-hidden="true">
              {Array.from({ length: total }).map((_, i) => {
                const n = i + 1;
                const ordemNova = anoCompleto ? total : dados.ordemFechada + 1;
                const aceso = anoCompleto ? true : n <= dados.ordemFechada;
                const novo = n === ordemNova;
                return (
                  <span key={n} className="flex items-center">
                    <span
                      className={novo ? 'sprout-in' : ''}
                      style={{
                        width: novo ? 11 : 7,
                        height: novo ? 11 : 7,
                        borderRadius: '50%',
                        backgroundColor: aceso || novo ? t.accent : t.silencio,
                        boxShadow: novo ? `0 0 0 3px ${t.accentSoft}` : 'none',
                        animationDelay: novo ? '1100ms' : undefined,
                      }}
                    />
                    {n < total && <span style={{ width: 16, height: 1, backgroundColor: t.border }} />}
                  </span>
                );
              })}
            </div>
          </Casc>

          {anoCompleto ? (
            /* --------- EXPLORAÇÃO 8 → ENCERRAMENTO DO ANO --------- */
            <>
              <Casc i={1}>
                <p
                  className="text-[11px] uppercase font-semibold text-center"
                  style={{ color: t.accentText, letterSpacing: '0.35em' }}
                >
                  Ano completo
                </p>
                <div className="vf-draw mx-auto mt-3" style={{ width: 48, height: 2, backgroundColor: t.accentBorder, animationDelay: '400ms' }} />
              </Casc>
              <Casc i={2} className="mt-6">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ backgroundColor: t.accentSoft }}
                >
                  <Sprout size={26} strokeWidth={1.5} style={{ color: t.accent }} />
                </div>
                <h2 className="font-serif text-2xl leading-tight text-center" style={{ color: t.text }}>
                  As 8 explorações do ano se completam.
                </h2>
              </Casc>
              {dados.momentosAno != null && dados.momentosAno > 0 && (
                <Casc i={3} className="mt-7">
                  <p className="font-serif text-[44px] leading-none text-center" style={{ color: t.accentDeep }}>
                    {dados.momentosAno}
                  </p>
                  <p className="text-[13px] text-center mt-1.5 max-w-[230px] mx-auto" style={{ color: t.textMuted }}>
                    {dados.momentosAno === 1
                      ? 'momento guardado no diário desta turma ao longo do ano'
                      : 'momentos guardados no diário desta turma ao longo do ano'}
                  </p>
                </Casc>
              )}
              <Casc i={4} className="mt-7 mb-8">
                <p
                  className="font-serif italic text-[15px] leading-relaxed text-center max-w-[260px] mx-auto"
                  style={{ color: t.textMuted }}
                >
                  A turma atravessou os 8 inteligências com você. O que você enxergou vive no Diário
                  de cada criança, e segue com elas.
                </p>
              </Casc>
              <Casc i={5} className="mt-auto">
                <button
                  onClick={onFechar}
                  className="w-full rounded-2xl py-3.5 text-[15px] font-semibold active:scale-[0.99] transition-transform"
                  style={{ backgroundColor: t.accent, color: '#FFFFFF', boxShadow: t.shadowMd }}
                >
                  Voltar ao Arboria
                </button>
              </Casc>
            </>
          ) : (
            proxima && (
              /* --------- ABERTURA DA PRÓXIMA FASE --------- */
              <>
                <Casc i={1}>
                  <p
                    className="text-[11px] uppercase font-semibold text-center"
                    style={{ color: t.accentText, letterSpacing: '0.35em' }}
                  >
                    Exploração {dados.ordemFechada + 1} de {total} · Abertura
                  </p>
                  <div className="vf-draw mx-auto mt-3" style={{ width: 48, height: 2, backgroundColor: t.accentBorder, animationDelay: '400ms' }} />
                </Casc>

                <Casc i={2} className="mt-6">
                  <h2 className="font-serif text-[28px] leading-tight text-center" style={{ color: t.text }}>
                    Exploração {proxima.nome}
                  </h2>
                </Casc>

                <Casc i={3} className="mt-3">
                  <p
                    className="font-serif italic text-[15px] leading-relaxed text-center max-w-[250px] mx-auto"
                    style={{ color: t.textMuted }}
                  >
                    {proxima.ancora}
                  </p>
                </Casc>

                <Casc i={4} className="mt-7">
                  <h3
                    className="text-[11px] uppercase tracking-wide font-semibold mb-2"
                    style={{ color: t.accentText }}
                  >
                    A inteligência
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: t.text }}>
                    {proxima.mecanismo}
                  </p>
                </Casc>

                <Casc i={5} className="mt-5">
                  <h3
                    className="text-[11px] uppercase tracking-wide font-semibold mb-2"
                    style={{ color: t.accentText }}
                  >
                    Onde reparar
                  </h3>
                  <ul className="space-y-1.5">
                    {proxima.reparar.map((r, idx) => (
                      <li key={idx} className="text-sm leading-relaxed flex gap-2" style={{ color: t.text }}>
                        <span className="font-bold flex-shrink-0" style={{ color: t.accent }}>
                          ·
                        </span>
                        {r}
                      </li>
                    ))}
                  </ul>
                </Casc>

                <Casc i={6} className="mt-6 mb-7">
                  <div
                    className="rounded-2xl p-4 flex gap-3"
                    style={{ backgroundColor: t.accentSoft, border: `1px solid ${t.accentBorder}` }}
                  >
                    <Sprout size={18} strokeWidth={1.75} className="flex-shrink-0 mt-0.5" style={{ color: t.accent }} />
                    <div>
                      <p className="text-sm font-semibold" style={{ color: t.text }}>
                        Prepare o terreno
                      </p>
                      <p className="text-[13px] leading-relaxed mt-1 texto-justificado" style={{ color: t.textMuted }}>
                        As atividades desta exploração chegam com o banco de atividades. Por enquanto,
                        comece pelo olhar: repare onde essa inteligência aparece na sua sala; o
                        diário faz o resto.
                      </p>
                    </div>
                  </div>
                </Casc>

                <Casc i={7} className="mt-auto">
                  <button
                    onClick={onFechar}
                    className="w-full rounded-2xl py-3.5 text-[15px] font-semibold active:scale-[0.99] transition-transform"
                    style={{ backgroundColor: t.accent, color: '#FFFFFF', boxShadow: t.shadowMd }}
                  >
                    Começar a Exploração {proxima.nome}
                  </button>
                </Casc>
              </>
            )
          )}
        </div>
      )}
    </div>
  );
};

export default ViradaFaseExperience;
