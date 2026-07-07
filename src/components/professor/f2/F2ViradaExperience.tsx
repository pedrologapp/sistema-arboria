import { useEffect, useState } from 'react';
import { X, ChevronLeft, TreePine, Eye, ClipboardCheck, BellRing, Shield } from 'lucide-react';
import { corDaCasa } from '@/config/f2Reforma';
import { infantilTheme as t } from '@/styles/infantilTheme';

/**
 * Dados da VIRADA ENTRE MENTORES (F2). Voltado ao PROFESSOR (mentor), nunca à
 * criança/família. Tudo que for número é AFIRMATIVO; o que não estiver disponível
 * degrada com elegância (nunca inventa), como faz a virada do Infantil.
 */
export interface F2ViradaDados {
  turmaLabel: string;

  /** Casa que FECHA (a Casa do mentor logado, cuja vez acabou). */
  casaFechaId: number;
  casaFechaNome: string;
  ordemFechada: number; // posição 1..total que acabou de fechar
  totalFases: number;

  /**
   * Nº de alunos observados AO VIVO na culminância (distintos, nas observacoes
   * ligadas à fase que fechou). `null` = contagem indisponível: degrada sem número.
   */
  alunosObservados: number | null;
  /**
   * Nº de missões entregues na fase pela turma. `null`/0 = sem sinal confiável:
   * a linha some (nunca afirmar entrega que não houve).
   */
  missoesEntregues: number | null;

  /** true = era a ÚLTIMA posição da trilha: Tempo 2 vira o encerramento do ano. */
  anoCompleto: boolean;
  proximaCasaId: number | null;
  proximaCasaNome: string | null;
  /**
   * Primeiro nome do mentor principal da próxima Casa (já notificado pelo motor).
   * `null` = Casa sem mentor amarrado: a coordenação foi avisada (espelha a RPC).
   */
  proximoMentorNome: string | null;
}

/** rgba a partir de um hex #RRGGBB. */
const hexA = (hex: string, alpha: number): string => {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

/** Clareia um hex misturando com branco (para legibilidade sobre fundo escuro). */
const clarear = (hex: string, amt = 0.45): string => {
  const h = hex.replace('#', '');
  const mix = (c: number) => Math.round(c + (255 - c) * amt);
  const r = mix(parseInt(h.slice(0, 2), 16));
  const g = mix(parseInt(h.slice(2, 4), 16));
  const b = mix(parseInt(h.slice(4, 6), 16));
  return `rgb(${r}, ${g}, ${b})`;
};

/** Bloco com entrada em cascata (fade + rise; respeita prefers-reduced-motion via CSS). */
const Casc = ({ i, children, className = '' }: { i: number; children: React.ReactNode; className?: string }) => (
  <div className={`vf-rise ${className}`} style={{ animationDelay: `${i * 120}ms` }}>
    {children}
  </div>
);

/**
 * A VIRADA ENTRE MENTORES: o momento de pico do F2, em 2 tempos.
 *
 * Tempo 1 (Fechamento): escurece na cor da Casa que fecha; celebra o capítulo do
 * mentor (o que ele observou ao vivo na culminância e as missões entregues).
 * Tempo 2 (Passagem): amanhece na cor da PRÓXIMA Casa e passa o bastão, avisando
 * que o próximo mentor já foi notificado. Última Casa da trilha -> o Tempo 2 vira
 * o encerramento do capítulo do ano da turma, sem próxima Casa.
 *
 * LEI DO MODELO (idêntica à do Infantil): números só afirmativos (nunca fração/
 * placar/ranking de mentor), silêncio nunca em cor de alerta, X/Esc sempre
 * disponíveis (o rito nunca prende o mentor que está com a turma). A solenidade
 * É a recompensa: sem confete, sem velocímetro.
 */
const F2ViradaExperience = ({ dados, onFechar }: { dados: F2ViradaDados; onFechar: () => void }) => {
  const [tempo, setTempo] = useState<1 | 2>(1);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFechar();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onFechar]);

  const corFecha = corDaCasa(dados.casaFechaId);
  const corFechaClara = clarear(corFecha, 0.5); // legível sobre o véu escuro
  const corProx = dados.proximaCasaId != null ? corDaCasa(dados.proximaCasaId) : t.accent;
  // Encerramento do ano usa o índigo neutro do shell (nenhuma Casa "vence" o ano).
  const corPassagem = dados.anoCompleto ? t.accent : corProx;

  const semObservacao = dados.alunosObservados === 0;
  const observacaoIndisponivel = dados.alunosObservados == null;
  const temMissoes = dados.missoesEntregues != null && dados.missoesEntregues > 0;

  const escuro = tempo === 1;

  return (
    <div
      className="fixed inset-0 z-[60] overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Virada entre mentores"
      style={{
        backgroundColor: escuro ? '#0E0B07' : t.bg,
        transition: 'background-color 500ms ease-in-out',
      }}
    >
      {tempo === 1 ? (
        /* ============ TEMPO 1. FECHAMENTO (o capítulo fecha, na cor da Casa) ============ */
        <div
          key="t1"
          className="min-h-full flex flex-col max-w-sm mx-auto px-6 pt-14 pb-8 pb-safe"
          style={{
            backgroundImage: `radial-gradient(120% 80% at 50% -5%, ${hexA(corFecha, 0.34)} 0%, ${hexA(
              corFecha,
              0.06
            )} 45%, rgba(0,0,0,0) 78%)`,
          }}
        >
          <button
            onClick={onFechar}
            className="absolute top-4 right-4 p-2.5 rounded-full"
            style={{ color: 'rgba(255,255,255,0.6)' }}
            aria-label="Fechar"
          >
            <X size={20} />
          </button>

          <Casc i={0}>
            <div
              className="rounded-2xl flex items-center justify-center mx-auto"
              style={{
                width: 52,
                height: 52,
                backgroundColor: hexA(corFecha, 0.18),
                border: `1px solid ${hexA(corFecha, 0.5)}`,
              }}
            >
              <TreePine size={26} strokeWidth={1.5} style={{ color: corFechaClara }} />
            </div>
          </Casc>

          <Casc i={1} className="mt-5 text-center">
            <p
              className="text-[11px] uppercase font-semibold"
              style={{ color: corFechaClara, letterSpacing: '0.28em' }}
            >
              Casa {dados.casaFechaNome}
            </p>
            <p className="font-serif text-[14px] mt-1" style={{ color: 'rgba(246,246,248,0.65)' }}>
              o seu capítulo, mentor
            </p>
          </Casc>

          <Casc i={2} className="mt-5">
            <h2
              className="font-serif text-[27px] leading-tight text-center"
              style={{ color: '#FFFFFF' }}
              tabIndex={-1}
            >
              O seu capítulo com o {dados.turmaLabel} se encerra.
            </h2>
          </Casc>

          <Casc i={3} className="mt-3">
            <p className="text-xs text-center" style={{ color: 'rgba(246,246,248,0.6)' }}>
              Casa {dados.ordemFechada} de {dados.totalFases} na trilha da turma
            </p>
          </Casc>

          {observacaoIndisponivel || semObservacao ? (
            /* Sem número confiável: a tela encurta e segue, sem culpa nem placar. */
            <Casc i={4} className="my-auto py-10">
              <p
                className="font-serif italic text-[15px] leading-relaxed text-center max-w-[270px] mx-auto"
                style={{ color: 'rgba(246,246,248,0.85)' }}
              >
                O que você viu nesta fase vira parte do rio de cada aluno, e segue com a turma. A
                leitura com a IA vem depois, com calma.
              </p>
            </Casc>
          ) : (
            <div className="mt-8 space-y-5">
              {/* Alunos observados ao vivo na culminância. */}
              <Casc i={4}>
                <div className="flex gap-3.5 items-start">
                  <span
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: hexA(corFecha, 0.16) }}
                  >
                    <Eye size={18} strokeWidth={1.75} style={{ color: corFechaClara }} />
                  </span>
                  <p className="text-[14px] leading-relaxed" style={{ color: 'rgba(246,246,248,0.92)' }}>
                    Na culminância, você observou ao vivo{' '}
                    <span className="font-semibold" style={{ color: '#FFFFFF' }}>
                      {dados.alunosObservados}{' '}
                      {dados.alunosObservados === 1 ? 'aluno' : 'alunos'}
                    </span>
                    , cada um no seu papel.
                  </p>
                </div>
              </Casc>

              {/* Missões entregues (some sem sinal confiável). */}
              {temMissoes && (
                <Casc i={5}>
                  <div className="flex gap-3.5 items-start">
                    <span
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: hexA(corFecha, 0.16) }}
                    >
                      <ClipboardCheck size={18} strokeWidth={1.75} style={{ color: corFechaClara }} />
                    </span>
                    <p className="text-[14px] leading-relaxed" style={{ color: 'rgba(246,246,248,0.92)' }}>
                      <span className="font-semibold" style={{ color: '#FFFFFF' }}>
                        {dados.missoesEntregues}{' '}
                        {dados.missoesEntregues === 1 ? 'missão entregue' : 'missões entregues'}
                      </span>{' '}
                      pela turma nesta fase.
                    </p>
                  </div>
                </Casc>
              )}

              <Casc i={6}>
                <p
                  className="font-serif italic text-[14px] leading-relaxed text-center max-w-[270px] mx-auto pt-1"
                  style={{ color: 'rgba(246,246,248,0.7)' }}
                >
                  O que você viu vira parte do rio de cada aluno. A leitura com a IA vem depois, com
                  calma.
                </p>
              </Casc>
            </div>
          )}

          <Casc i={7} className="mt-auto pt-8">
            <button
              onClick={() => setTempo(2)}
              autoFocus
              className="w-full rounded-2xl py-3.5 text-[15px] font-semibold active:scale-[0.99] transition-transform"
              style={{ backgroundColor: '#FFFFFF', color: '#1A130B' }}
            >
              {dados.anoCompleto ? 'Ver o encerramento do ano' : 'Passar o bastão'}
            </button>
          </Casc>
        </div>
      ) : (
        /* ============ TEMPO 2. PASSAGEM (amanhece na cor da próxima Casa) ============ */
        <div
          key="t2"
          className="min-h-full flex flex-col max-w-sm mx-auto px-6 pt-5 pb-8 pb-safe"
          style={{
            backgroundImage: `radial-gradient(120% 80% at 50% -5%, ${hexA(corPassagem, 0.12)} 0%, #FFFFFF 55%)`,
          }}
        >
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

          <Casc i={0}>
            <div
              className="rounded-2xl flex items-center justify-center mx-auto"
              style={{
                width: 52,
                height: 52,
                backgroundColor: hexA(corPassagem, 0.1),
                border: `1px solid ${hexA(corPassagem, 0.35)}`,
              }}
            >
              {dados.anoCompleto ? (
                <TreePine size={26} strokeWidth={1.5} style={{ color: corPassagem }} />
              ) : (
                <Shield size={26} strokeWidth={1.5} style={{ color: corPassagem }} />
              )}
            </div>
          </Casc>

          {dados.anoCompleto ? (
            /* --------- ÚLTIMA CASA -> ENCERRAMENTO DO ANO DA TURMA --------- */
            <>
              <Casc i={1} className="mt-6 text-center">
                <p
                  className="text-[11px] uppercase font-semibold"
                  style={{ color: t.accentText, letterSpacing: '0.28em' }}
                >
                  Trilha completa
                </p>
              </Casc>
              <Casc i={2} className="mt-4">
                <h2 className="font-serif text-[28px] leading-tight text-center" style={{ color: t.text }}>
                  As Casas percorreram o ano com o {dados.turmaLabel}.
                </h2>
              </Casc>
              <Casc i={3} className="mt-4">
                <p
                  className="font-serif italic text-[15px] leading-relaxed text-center max-w-[280px] mx-auto"
                  style={{ color: t.textMuted }}
                >
                  Cada Casa deixou a sua marca, e nenhuma apaga a anterior. O que os mentores viram
                  vive no Diário de cada aluno, e segue com eles.
                </p>
              </Casc>
              <Casc i={4} className="mt-auto pt-8">
                <button
                  onClick={onFechar}
                  className="w-full rounded-2xl py-3.5 text-[15px] font-semibold active:scale-[0.99] transition-transform"
                  style={{ backgroundColor: t.accent, color: '#FFFFFF', boxShadow: t.shadowMd }}
                >
                  Concluir a virada
                </button>
              </Casc>
            </>
          ) : (
            /* --------- PASSAGEM PARA A PRÓXIMA CASA --------- */
            <>
              <Casc i={1} className="mt-6 text-center">
                <p
                  className="text-[11px] uppercase font-semibold"
                  style={{ color: corProx, letterSpacing: '0.28em' }}
                >
                  A próxima Casa nesta turma
                </p>
              </Casc>

              <Casc i={2} className="mt-4">
                <h2 className="font-serif text-[29px] leading-tight text-center" style={{ color: t.text }}>
                  Agora é a vez da Casa {dados.proximaCasaNome ?? ''}.
                </h2>
              </Casc>

              <Casc i={3} className="mt-6">
                {dados.proximoMentorNome ? (
                  <div
                    className="rounded-2xl p-4 flex gap-3 items-start"
                    style={{ backgroundColor: hexA(corProx, 0.07), border: `1px solid ${hexA(corProx, 0.28)}` }}
                  >
                    <span
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: hexA(corProx, 0.12) }}
                    >
                      <BellRing size={18} strokeWidth={1.75} style={{ color: corProx }} />
                    </span>
                    <p className="text-[14px] leading-relaxed" style={{ color: t.text }}>
                      Avisamos{' '}
                      <span className="font-semibold" style={{ color: corProx }}>
                        {dados.proximoMentorNome}
                      </span>
                      : nesta turma, o próximo capítulo é da Casa {dados.proximaCasaNome ?? ''}.
                    </p>
                  </div>
                ) : (
                  <div
                    className="rounded-2xl p-4 flex gap-3 items-start"
                    style={{ backgroundColor: t.surfaceAlt, border: `1px solid ${t.border}` }}
                  >
                    <span
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: hexA(corProx, 0.12) }}
                    >
                      <BellRing size={18} strokeWidth={1.75} style={{ color: corProx }} />
                    </span>
                    <p className="text-[14px] leading-relaxed" style={{ color: t.text }}>
                      A Casa {dados.proximaCasaNome ?? 'seguinte'} ainda não tem um mentor principal.
                      A coordenação foi avisada para definir quem conduz.
                    </p>
                  </div>
                )}
              </Casc>

              <Casc i={4} className="mt-5">
                <p
                  className="font-serif italic text-[14px] leading-relaxed text-center max-w-[280px] mx-auto"
                  style={{ color: t.textMuted }}
                >
                  A turma segue no seu ritmo. Cada Casa deixa a sua marca no ano, e nenhuma apaga a
                  anterior.
                </p>
              </Casc>

              <Casc i={5} className="mt-auto pt-8">
                <button
                  onClick={onFechar}
                  className="w-full rounded-2xl py-3.5 text-[15px] font-semibold active:scale-[0.99] transition-transform"
                  style={{ backgroundColor: corProx, color: '#FFFFFF', boxShadow: t.shadowMd }}
                >
                  Concluir a virada
                </button>
              </Casc>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default F2ViradaExperience;
