import { useState } from 'react';
import { Feather, Library } from 'lucide-react';
import { useProfessor } from '@/contexts/ProfessorContext';
import { useFaseTurma } from '@/hooks/useFaseTurma';
import { getTurmaPreferida } from '@/lib/infantil';
import { SANTUARIO_INFANTIL } from '@/lib/infantilSantuario';
import { infantilTheme as t } from '@/styles/infantilTheme';

const TOTAL = 8;

/**
 * Aba FASE (Infantil) — o SANTUÁRIO DO MECANISMO.
 *
 * Imersiva: índigo profundo com o véu da COR OFICIAL de cada inteligência
 * (a mesma cor que um dia será a Casa da criança no F2 — a cor é a língua
 * comum dos 12 anos; brasões são exclusivos do F2). Conteúdo do tópico 3.2
 * do mestre na voz do caderno, aprovado pelo Fundador em 02/07/2026.
 *
 * A fase ATUAL da turma ganha o anel no seletor; a professora pode visitar
 * os outros 7 mecanismos a qualquer momento — a aba vive o ano inteiro.
 */
const InfantilFasePage = () => {
  const { profile, turmasVinculadas } = useProfessor();

  // Fase atual da TURMA preferida (mesma seleção da aba Arboria/Rajada)
  const turmaPref = getTurmaPreferida();
  const turmaValida = turmaPref && turmasVinculadas?.some((tv) => tv.id === turmaPref);
  const turmaId = (turmaValida ? turmaPref : null) ?? turmasVinculadas?.[0]?.id ?? null;
  const { data: faseTurma } = useFaseTurma(turmaId, profile?.institution_id);
  const ordemAtual = faseTurma?.ordem ?? 0;
  const faseAtualValida = ordemAtual >= 1 && ordemAtual <= 8 ? ordemAtual : 0;

  const [lendo, setLendo] = useState<number | null>(null);
  const atual = lendo ?? (faseAtualValida || 1);
  const m = SANTUARIO_INFANTIL[atual];

  const kicker =
    atual === faseAtualValida ? `Fase atual · ${atual} de ${TOTAL}` : `Mecanismo · ${m.nome}`;

  return (
    <>
      {/* Fundo full-bleed — atrás do conteúdo, sob o chrome glass. O véu da cor
          do mecanismo se mescla ao índigo; transição suave na troca. */}
      <div
        className="fixed inset-0 z-0"
        style={{
          backgroundColor: t.accentDeep,
          background: `radial-gradient(120% 90% at 50% -10%, ${m.corVeu} 0%, #322B8F 52%, #2B2580 100%)`,
          transition: 'background 600ms ease',
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 pt-4 pb-6" key={atual}>
        {/* Seletor dos 8 — a fase atual da turma tem o anel; o lido fica sólido */}
        <div className="flex gap-1.5 justify-center flex-wrap mb-5 vf-rise">
          {Array.from({ length: TOTAL }).map((_, i) => {
            const n = i + 1;
            const ehLido = n === atual;
            const ehFaseAtual = n === faseAtualValida;
            return (
              <button
                key={n}
                onClick={() => setLendo(n)}
                className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold transition-all"
                style={{
                  backgroundColor: ehLido ? '#FFFFFF' : 'transparent',
                  color: ehLido ? SANTUARIO_INFANTIL[n].cor : 'rgba(255,255,255,0.75)',
                  border: `1.5px solid ${ehLido ? '#FFFFFF' : 'rgba(255,255,255,0.3)'}`,
                  boxShadow: ehFaseAtual ? '0 0 0 3px rgba(255,255,255,0.22)' : 'none',
                }}
                aria-label={`${SANTUARIO_INFANTIL[n].nome}${ehFaseAtual ? ' (fase atual da turma)' : ''}`}
                aria-pressed={ehLido}
              >
                {n}
              </button>
            );
          })}
        </div>

        <div className="vf-rise" style={{ animationDelay: '80ms' }}>
          <p
            className="text-[10.5px] uppercase font-semibold text-center"
            style={{ color: 'rgba(255,255,255,0.8)', letterSpacing: '0.32em' }}
          >
            {kicker}
          </p>
          <div className="vf-draw mx-auto mt-3" style={{ width: 48, height: 2, backgroundColor: m.corAcento, animationDelay: '250ms' }} />
          <h1 className="font-serif text-[27px] leading-tight text-center mt-4 mb-5" style={{ color: '#FFFFFF' }}>
            {m.nome}
          </h1>
        </div>

        {/* A Cena */}
        <div
          className="rounded-r-2xl p-4 mb-5 vf-rise"
          style={{
            backgroundColor: 'rgba(255,255,255,0.07)',
            borderLeft: `3px solid ${m.corAcento}`,
            animationDelay: '160ms',
          }}
        >
          <p className="font-serif italic text-[13.5px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.9)' }}>
            {m.cena}
          </p>
        </div>

        <section className="mb-5 vf-rise" style={{ animationDelay: '240ms' }}>
          <h2 className="text-[13.5px] uppercase tracking-[0.14em] font-bold mb-2.5" style={{ color: m.corAcento }}>
            O mecanismo
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.92)' }}>
            {m.mecanismo}
          </p>
        </section>

        <section className="mb-5 vf-rise" style={{ animationDelay: '320ms' }}>
          <h2 className="text-[13.5px] uppercase tracking-[0.14em] font-bold mb-2.5" style={{ color: m.corAcento }}>
            O que não define
          </h2>
          <ul className="space-y-1.5">
            {m.naoDefine.map((x, i) => (
              <li key={i} className="text-sm leading-relaxed flex gap-2" style={{ color: 'rgba(255,255,255,0.92)' }}>
                <span className="flex-shrink-0 text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>✗</span>
                {x}
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-5 vf-rise" style={{ animationDelay: '400ms' }}>
          <h2 className="text-[13.5px] uppercase tracking-[0.14em] font-bold mb-2.5" style={{ color: m.corAcento }}>
            Como se revela de verdade
          </h2>
          <ul className="space-y-2">
            {m.revela.map((x, i) => (
              <li key={i} className="text-sm leading-relaxed flex gap-2" style={{ color: 'rgba(255,255,255,0.92)' }}>
                <span className="flex-shrink-0 text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.6)' }}>→</span>
                {x}
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-5 vf-rise" style={{ animationDelay: '480ms' }}>
          <h2 className="text-[13.5px] uppercase tracking-[0.14em] font-bold mb-2.5" style={{ color: m.corAcento }}>
            Como a criança vê o mundo
          </h2>
          <p className="font-serif italic text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.88)' }}>
            {m.veMundo}
          </p>
        </section>

        {/* A seção nova — com a cor do mecanismo */}
        <div
          className="rounded-2xl p-4 mb-5 vf-rise"
          style={{
            backgroundColor: `${m.cor}44`,
            border: '1px solid rgba(255,255,255,0.22)',
            animationDelay: '560ms',
          }}
        >
          <h2 className="text-[13.5px] uppercase tracking-[0.14em] font-bold mb-2.5" style={{ color: '#FFFFFF' }}>
            O que essa lente muda na sua aula
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.95)' }}>
            {m.lente}
          </p>
        </div>

        <section className="mb-5 vf-rise" style={{ animationDelay: '640ms' }}>
          <h2 className="text-[13.5px] uppercase tracking-[0.14em] font-bold mb-2.5" style={{ color: m.corAcento }}>
            Como observar na sua sala
          </h2>
          <ul className="space-y-1.5">
            {m.observar.map((x, i) => (
              <li key={i} className="text-sm leading-relaxed flex gap-2" style={{ color: 'rgba(255,255,255,0.92)' }}>
                <span className="flex-shrink-0 font-bold" style={{ color: '#FFFFFF' }}>·</span>
                {x}
              </li>
            ))}
          </ul>
        </section>

        {/* Cuidado — pena, nunca alerta */}
        <div
          className="rounded-2xl p-4 flex gap-3 mb-5 vf-rise"
          style={{
            backgroundColor: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.18)',
            animationDelay: '720ms',
          }}
        >
          <Feather size={17} strokeWidth={1.5} className="flex-shrink-0 mt-0.5" style={{ color: 'rgba(255,255,255,0.85)' }} />
          <div>
            <p className="text-[13px] font-semibold mb-1" style={{ color: '#FFFFFF' }}>
              Cuidado
            </p>
            <p className="text-[13px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.85)' }}>
              {m.cuidado}
            </p>
          </div>
        </div>

        {/* Moldura do banco de atividades */}
        <div
          className="rounded-2xl p-4 text-center vf-rise"
          style={{ border: '1px dashed rgba(255,255,255,0.35)', animationDelay: '800ms' }}
        >
          <Library size={16} strokeWidth={1.5} className="mx-auto mb-1.5" style={{ color: 'rgba(255,255,255,0.7)' }} />
          <p className="text-[13px] font-semibold" style={{ color: 'rgba(255,255,255,0.9)' }}>
            Atividades desta fase
          </p>
          <p className="text-xs leading-relaxed mt-0.5" style={{ color: 'rgba(255,255,255,0.65)' }}>
            Chegam com o banco de atividades — cards com PDF, direto daqui.
          </p>
        </div>
      </div>
    </>
  );
};

export default InfantilFasePage;
