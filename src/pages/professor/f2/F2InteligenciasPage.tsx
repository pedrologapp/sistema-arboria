import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Feather } from 'lucide-react';
import { SANTUARIO_F2, ATIVIDADE_OITO_CAMINHOS_F2 as ATIVIDADE_OITO_CAMINHOS } from '@/lib/f2Santuario';
import { infantilTheme as t } from '@/styles/infantilTheme';

const TOTAL = 8;

/**
 * Aba INTELIGÊNCIAS (Fundamental 2, reforma): o SANTUÁRIO DAS 8 CASAS.
 *
 * ESPELHA exatamente o F1FasePage (mesmas seções, mesma ordem, mesmo tratamento):
 * fundo índigo profundo com o véu na cor da Casa, seletor das 8 no topo, swipe pra
 * trocar, cada Casa ABRINDO com a história do gênio (a cena), depois o mecanismo,
 * o "uma atividade, oito caminhos", o que NÃO é sinal, como se revela, como vê o
 * mundo, o que o mentor cultiva, como observar, e o Cuidado.
 *
 * Diferença de segmento: no F2 TODO mentor vê as oito Casas iguais (não há
 * "módulo atual da turma" a destacar; a aba é estudo e identidade). Conteúdo em
 * src/lib/f2Santuario.ts (gênios do F1 verbatim + conteúdo aprovado do F2).
 */
const F2InteligenciasPage = () => {
  const navigate = useNavigate();

  // A Casa VISTA agora (o mentor navega as 8; abre na primeira).
  const [atual, setAtual] = useState(1);

  // Scroll pro TOPO em toda troca de Casa: sem isso, quem troca no meio da
  // página segue lendo achando que é a Casa anterior.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [atual]);

  // Swipe DENTRO do santuário troca de Casa (o modelo mental natural aqui; o
  // swipe de abas do layout ignora esta rota). Só dispara com gesto claramente
  // horizontal e rápido, pra não roubar o scroll vertical.
  const toqueRef = useRef<{ x: number; y: number; t: number } | null>(null);
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
    if (destino >= 1 && destino <= TOTAL) setAtual(destino);
  };

  const m = SANTUARIO_F2[atual];

  return (
    <>
      {/* Fundo full-bleed: atrás do conteúdo, sob o chrome glass. O véu da cor da
          Casa se mescla ao índigo; transição suave na troca. Igual ao F1. */}
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
        {/* Entrada da FORMAÇÃO ARBORIA: no topo, visível em todas as Casas (a
            Formação é compartilhada entre segmentos). Igual ao F1. */}
        <div className="flex items-center justify-between mb-2 vf-rise">
          <p
            className="text-[11px] uppercase font-semibold"
            style={{ color: 'rgba(255,255,255,0.6)', letterSpacing: '0.24em' }}
          >
            Inteligências
          </p>
          <button
            onClick={() => navigate('/professor/formacao')}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-semibold active:scale-95"
            style={{
              backgroundColor: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.3)',
              color: '#FFFFFF',
            }}
          >
            <svg viewBox="0 0 100 100" style={{ width: 12, height: 12 }} aria-hidden="true">
              <path
                d="M30 79 L50 27 L70 79"
                stroke="#FFFFFF"
                strokeWidth="10"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              <path d="M50 27 C50 16 58 9 68 8 C69 19 61 26 50 27 Z" fill="#FFFFFF" />
            </svg>
            Treinamentos
          </button>
        </div>

        {/* Seletor das 8 Casas: corpo de botão na cor de cada Casa. TODO mentor vê
            as oito; a selecionada fica branca. */}
        <div
          className="flex gap-1.5 justify-center flex-wrap mb-2 vf-rise"
          role="tablist"
          aria-label="As 8 Casas"
        >
          {Array.from({ length: TOTAL }).map((_, i) => {
            const n = i + 1;
            const ehLido = n === atual;
            return (
              <button
                key={n}
                role="tab"
                onClick={() => setAtual(n)}
                className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold transition-all active:scale-95"
                style={{
                  backgroundColor: ehLido ? '#FFFFFF' : `${SANTUARIO_F2[n].cor}55`,
                  color: ehLido ? SANTUARIO_F2[n].cor : '#FFFFFF',
                  border: `1.5px solid ${ehLido ? '#FFFFFF' : 'rgba(255,255,255,0.4)'}`,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
                }}
                aria-label={`Casa ${SANTUARIO_F2[n].nome}`}
                aria-selected={ehLido}
              >
                {n}
              </button>
            );
          })}
        </div>

        {/* Dica de toque */}
        <p className="text-[11px] text-center mb-5 vf-rise" style={{ color: 'rgba(255,255,255,0.65)' }}>
          Toque num número para conhecer outra Casa
        </p>

        <div className="vf-rise" style={{ animationDelay: '80ms' }}>
          <p
            className="text-[10.5px] uppercase font-semibold text-center"
            style={{ color: 'rgba(255,255,255,0.8)', letterSpacing: '0.32em' }}
          >
            Casa {atual} de {TOTAL}
          </p>
          <h1 className="font-serif text-[27px] leading-tight text-center mt-4" style={{ color: '#FFFFFF' }}>
            Casa {m.nome}
          </h1>
          {/* Assinatura de COR da Casa: grossa e abaixo do nome */}
          <div
            className="vf-draw mx-auto mt-3 mb-6 rounded-full"
            style={{ width: 76, height: 6, backgroundColor: m.corAcento, animationDelay: '250ms' }}
          />
        </div>

        {/* A Cena: abre com a história do gênio */}
        <div
          className="rounded-r-2xl p-4 mb-5 vf-rise"
          style={{
            backgroundColor: 'rgba(255,255,255,0.07)',
            borderLeft: `3px solid ${m.corAcento}`,
            animationDelay: '160ms',
          }}
        >
          <p className="font-serif italic text-[13.5px] leading-relaxed texto-justificado" style={{ color: 'rgba(255,255,255,0.9)' }}>
            {m.cena}
          </p>
        </div>

        <section className="mb-5 vf-rise" style={{ animationDelay: '240ms' }}>
          <h2 className="text-[13.5px] uppercase tracking-[0.14em] font-bold mb-2.5" style={{ color: m.corAcento }}>
            O mecanismo
          </h2>
          <p className="text-sm leading-relaxed texto-justificado" style={{ color: 'rgba(255,255,255,0.92)' }}>
            {m.mecanismo}
          </p>
        </section>

        {/* UMA ATIVIDADE, OITO CAMINHOS: a peça que produz o "aha"; entender é
            comparar. Mesmo lugar e formato do F1. */}
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
              const casa = SANTUARIO_F2[n];
              return (
                <button
                  key={n}
                  onClick={() => !ehAtual && setAtual(n)}
                  className="w-full text-left rounded-xl px-3 py-2.5 flex gap-2.5 transition-colors"
                  style={{
                    backgroundColor: ehAtual ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${ehAtual ? 'rgba(255,255,255,0.3)' : 'transparent'}`,
                  }}
                >
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0 mt-1"
                    style={{ backgroundColor: casa.cor, boxShadow: '0 0 0 1.5px rgba(255,255,255,0.35)' }}
                    aria-hidden="true"
                  />
                  <span className="min-w-0">
                    <span className="block text-[12px] font-bold" style={{ color: ehAtual ? '#FFFFFF' : 'rgba(255,255,255,0.85)' }}>
                      Casa {casa.nome}
                    </span>
                    <span className="block text-[12.5px] leading-relaxed" style={{ color: ehAtual ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.72)' }}>
                      {ATIVIDADE_OITO_CAMINHOS.caminhos[n]}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          {/* Anti-veredito: a leitura de uma tarefa não fecha nada sozinha */}
          <p className="text-[11.5px] italic mt-2.5 text-center" style={{ color: 'rgba(255,255,255,0.6)' }}>
            Um projeto não diz nada: uma série deles começa a dizer.
          </p>
        </section>

        <section className="mb-5 vf-rise" style={{ animationDelay: '320ms' }}>
          <h2 className="text-[13.5px] uppercase tracking-[0.14em] font-bold mb-2.5" style={{ color: m.corAcento }}>
            O que NÃO é sinal desta Casa
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
            Como se revela no adolescente
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
            Como o adolescente vê o mundo
          </h2>
          <p className="font-serif italic text-sm leading-relaxed texto-justificado" style={{ color: 'rgba(255,255,255,0.88)' }}>
            {m.veMundo}
          </p>
        </section>

        {/* O que o mentor cultiva: com a cor da Casa (o slot da "lente" do F1) */}
        <div
          className="rounded-2xl p-4 mb-5 vf-rise"
          style={{
            backgroundColor: `${m.cor}44`,
            border: '1px solid rgba(255,255,255,0.22)',
            animationDelay: '560ms',
          }}
        >
          <h2 className="text-[13.5px] uppercase tracking-[0.14em] font-bold mb-2.5" style={{ color: '#FFFFFF' }}>
            O que o mentor cultiva
          </h2>
          <p className="text-sm leading-relaxed texto-justificado" style={{ color: 'rgba(255,255,255,0.95)' }}>
            {m.lente}
          </p>
          {/* Anti-"estilos de aprendizagem" / "toda pessoa tem as oito" */}
          <p
            className="text-[12.5px] font-semibold mt-2.5 pt-2.5"
            style={{ color: '#FFFFFF', borderTop: '1px solid rgba(255,255,255,0.2)' }}
          >
            Ele usa as oito portas: esta é a que abre mais fácil. Nunca ofereça só uma.
          </p>
        </div>

        <section className="mb-5 vf-rise" style={{ animationDelay: '640ms' }}>
          <h2 className="text-[13.5px] uppercase tracking-[0.14em] font-bold mb-2.5" style={{ color: m.corAcento }}>
            Como observar na sua turma
          </h2>
          {/* Antídoto NO TOPO da lista */}
          <p className="text-[12.5px] italic mb-2.5" style={{ color: 'rgba(255,255,255,0.75)' }}>
            Isto não é lista pra marcar aluno: registre a cena; a leitura vem depois.
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

        {/* Cuidado: pena, nunca alerta. A guarda anti-rótulo (mesma em toda Casa);
            "toda pessoa tem as oito" fica aqui, junto do conteúdo. */}
        <div
          className="rounded-2xl p-4 flex gap-3 vf-rise"
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
            <p className="text-[13px] leading-relaxed texto-justificado" style={{ color: 'rgba(255,255,255,0.85)' }}>
              {m.cuidado}
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default F2InteligenciasPage;
