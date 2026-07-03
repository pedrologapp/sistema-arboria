import { useState, useRef, useEffect } from 'react';
import { Feather, Library, ChevronLeft } from 'lucide-react';
import { useProfessor } from '@/contexts/ProfessorContext';
import { useFaseTurma } from '@/hooks/useFaseTurma';
import { getTurmaPreferida } from '@/lib/infantil';
import { SANTUARIO_INFANTIL, ATIVIDADE_OITO_CAMINHOS } from '@/lib/infantilSantuario';
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

  // Scroll pro TOPO em toda troca de mecanismo — sem isso, quem troca no meio
  // da página continua lendo achando que é o mecanismo anterior (simulação r2)
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [lendo]);

  // Swipe DENTRO do santuário troca de MECANISMO (o modelo mental natural aqui;
  // o swipe de abas do layout ignora esta rota)
  const toqueRef = useRef<{ x: number; y: number; t: number } | null>(null);

  // GATE de carregamento: nunca renderizar um mecanismo "default" que depois
  // troca sozinho (a simulação mostrou que isso assusta quem teme apertar errado)
  const carregando = faseTurma === undefined && !!turmaId && !!profile?.institution_id;
  if (carregando) {
    return (
      <>
        <div
          className="fixed inset-0 z-0"
          style={{ background: 'radial-gradient(120% 90% at 50% -10%, #322B8F 0%, #2B2580 100%)' }}
          aria-hidden="true"
        />
        <div className="relative z-10 pt-24 flex justify-center">
          <div
            className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2"
            style={{ borderColor: 'rgba(255,255,255,0.6)' }}
          />
        </div>
      </>
    );
  }

  const atual = lendo ?? (faseAtualValida || 1);
  const m = SANTUARIO_INFANTIL[atual];

  const kicker =
    faseAtualValida === 0
      ? 'Conheça os 8 mecanismos'
      : atual === faseAtualValida
        ? `Fase atual · ${atual} de ${TOTAL}`
        : `Mecanismo · ${m.nome}`;

  const onTouchStart = (e: React.TouchEvent) => {
    const t0 = e.touches[0];
    toqueRef.current = { x: t0.clientX, y: t0.clientY, t: Date.now() };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const ini = toqueRef.current;
    toqueRef.current = null;
    if (!ini) return;
    const fim = e.changedTouches[0];
    const dx = fim.clientX - ini.x;
    const dy = fim.clientY - ini.y;
    const dt = Date.now() - ini.t;
    if (Math.abs(dx) < 64 || Math.abs(dx) < Math.abs(dy) * 1.8 || dt > 600) return;
    const destino = dx < 0 ? atual + 1 : atual - 1;
    if (destino >= 1 && destino <= TOTAL) setLendo(destino);
  };

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

      <div className="relative z-10 pt-4 pb-6" key={atual} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {/* Seletor dos 8 — com CORPO DE BOTÃO e a cor de cada mecanismo
            (a simulação mostrou: círculos transparentes liam como decoração) */}
        <div className="flex gap-1.5 justify-center flex-wrap mb-2 vf-rise">
          {Array.from({ length: TOTAL }).map((_, i) => {
            const n = i + 1;
            const ehLido = n === atual;
            const ehFaseAtual = n === faseAtualValida;
            return (
              <button
                key={n}
                onClick={() => setLendo(n)}
                className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold transition-all active:scale-95"
                style={{
                  backgroundColor: ehLido ? '#FFFFFF' : `${SANTUARIO_INFANTIL[n].cor}55`,
                  color: ehLido ? SANTUARIO_INFANTIL[n].cor : '#FFFFFF',
                  border: `1.5px solid ${ehLido ? '#FFFFFF' : 'rgba(255,255,255,0.4)'}`,
                  boxShadow: ehFaseAtual
                    ? '0 0 0 3px rgba(255,255,255,0.35)'
                    : '0 2px 6px rgba(0,0,0,0.25)',
                }}
                aria-label={`${SANTUARIO_INFANTIL[n].nome}${ehFaseAtual ? ' (fase atual da turma)' : ''}`}
                aria-pressed={ehLido}
              >
                {n}
              </button>
            );
          })}
        </div>

        {/* Dica de toque — 12 palavras que dobram a descoberta dos 8 */}
        <p className="text-[11px] text-center mb-1 vf-rise" style={{ color: 'rgba(255,255,255,0.65)' }}>
          Toque num número para conhecer outro mecanismo
        </p>
        {/* Legenda dos dois destaques (simulação r2: "meu é o branco ou o que brilha?") */}
        <p className="text-[10px] text-center mb-3 vf-rise" style={{ color: 'rgba(255,255,255,0.5)' }}>
          {faseAtualValida > 0
            ? 'Branco = você está lendo · Anel = a fase da sua turma'
            : 'Branco = você está lendo'}
        </p>

        {/* Pílula "voltar" — sempre que estiver visitando outro mecanismo */}
        {faseAtualValida > 0 && atual !== faseAtualValida && (
          <div className="flex justify-center mb-3 vf-rise">
            <button
              onClick={() => setLendo(faseAtualValida)}
              className="flex items-center gap-1 rounded-full px-3.5 py-1.5 text-xs font-semibold"
              style={{ backgroundColor: 'rgba(255,255,255,0.14)', color: '#FFFFFF', border: '1px solid rgba(255,255,255,0.25)' }}
            >
              <ChevronLeft size={13} /> Voltar à fase atual ({SANTUARIO_INFANTIL[faseAtualValida].nome})
            </button>
          </div>
        )}

        {/* Turma ainda em planejamento — diz explicitamente (sem "você está aqui" fantasma) */}
        {faseAtualValida === 0 && (
          <p className="text-[11px] text-center mb-3 vf-rise" style={{ color: 'rgba(255,255,255,0.55)' }}>
            Sua turma ainda não começou a trilha — comece na aba Arboria.
          </p>
        )}

        <div className="vf-rise" style={{ animationDelay: '80ms' }}>
          <p
            className="text-[10.5px] uppercase font-semibold text-center"
            style={{ color: 'rgba(255,255,255,0.8)', letterSpacing: '0.32em' }}
          >
            {kicker}
          </p>
          <h1 className="font-serif text-[27px] leading-tight text-center mt-4" style={{ color: '#FFFFFF' }}>
            {m.nome}
          </h1>
          {/* Assinatura de COR do mecanismo — grossa e abaixo do nome (pedido do
              Fundador: a professora precisa VER a cor daquele mecanismo) */}
          <div
            className="vf-draw mx-auto mt-3 mb-6 rounded-full"
            style={{ width: 76, height: 6, backgroundColor: m.corAcento, animationDelay: '250ms' }}
          />
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

        {/* UMA ATIVIDADE, OITO CAMINHOS — a peça que produz o "aha" (simulação r2),
            PROMOVIDA pra logo depois de "O mecanismo": entender é comparar. */}
        <section className="mb-5 vf-rise" style={{ animationDelay: '300ms' }}>
          <h2 className="text-[13.5px] uppercase tracking-[0.14em] font-bold mb-1" style={{ color: m.corAcento }}>
            {ATIVIDADE_OITO_CAMINHOS.titulo}
          </h2>
          <p className="text-[12.5px] italic mb-3" style={{ color: 'rgba(255,255,255,0.7)' }}>
            {ATIVIDADE_OITO_CAMINHOS.intro}
          </p>
          <div className="space-y-1.5">
            {Array.from({ length: TOTAL }).map((_, i) => {
              const n = i + 1;
              const ehAtual = n === atual;
              const mec = SANTUARIO_INFANTIL[n];
              return (
                <button
                  key={n}
                  onClick={() => !ehAtual && setLendo(n)}
                  className="w-full text-left rounded-xl px-3 py-2.5 flex gap-2.5 transition-colors"
                  style={{
                    backgroundColor: ehAtual ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${ehAtual ? 'rgba(255,255,255,0.3)' : 'transparent'}`,
                  }}
                >
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0 mt-1"
                    style={{ backgroundColor: mec.cor, boxShadow: '0 0 0 1.5px rgba(255,255,255,0.35)' }}
                    aria-hidden="true"
                  />
                  <span className="min-w-0">
                    <span className="block text-[12px] font-bold" style={{ color: ehAtual ? '#FFFFFF' : 'rgba(255,255,255,0.85)' }}>
                      {mec.nome}
                    </span>
                    <span className="block text-[12.5px] leading-relaxed" style={{ color: ehAtual ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.72)' }}>
                      {ATIVIDADE_OITO_CAMINHOS.caminhos[n]}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          {/* Anti-veredito: a caixa de blocos não é teste de uma tentativa */}
          <p className="text-[11.5px] italic mt-2.5 text-center" style={{ color: 'rgba(255,255,255,0.6)' }}>
            Uma torre não diz nada — dez torres começam a dizer.
          </p>
        </section>

        <section className="mb-5 vf-rise" style={{ animationDelay: '320ms' }}>
          <h2 className="text-[13.5px] uppercase tracking-[0.14em] font-bold mb-2.5" style={{ color: m.corAcento }}>
            O que NÃO é sinal deste mecanismo
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
          {/* Anti-"estilos de aprendizagem" (simulação r2: ~24/100 saíam com o
              modelo de canal único — "com ela agora só faço atividade de movimento") */}
          <p
            className="text-[12.5px] font-semibold mt-2.5 pt-2.5"
            style={{ color: '#FFFFFF', borderTop: '1px solid rgba(255,255,255,0.2)' }}
          >
            Ela usa as oito portas — esta é a que abre mais fácil. Nunca ofereça só uma.
          </p>
        </div>

        <section className="mb-5 vf-rise" style={{ animationDelay: '640ms' }}>
          <h2 className="text-[13.5px] uppercase tracking-[0.14em] font-bold mb-2.5" style={{ color: m.corAcento }}>
            Como observar na sua sala
          </h2>
          {/* Antídoto NO TOPO da lista (a simulação mostrou: no fim, só protege quem lê tudo) */}
          <p className="text-[12.5px] italic mb-2.5" style={{ color: 'rgba(255,255,255,0.75)' }}>
            Isto não é lista pra marcar criança — registre a cena; a leitura vem depois.
          </p>
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
            Atividades desta fase · em breve
          </p>
          <p className="text-xs leading-relaxed mt-0.5" style={{ color: 'rgba(255,255,255,0.65)' }}>
            Aqui vão morar as atividades prontas para usar na sala — uma a uma, com tudo que
            você precisa.
          </p>
        </div>
      </div>
    </>
  );
};

export default InfantilFasePage;
