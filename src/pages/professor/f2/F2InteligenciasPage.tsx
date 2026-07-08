import { useState, useRef, useEffect } from 'react';
import { Feather, Shield, Info } from 'lucide-react';
import { SANTUARIO_F2, MOLDURA_F2 } from '@/lib/f2Santuario';
import { infantilTheme as t } from '@/styles/infantilTheme';

const TOTAL = 8;

/**
 * Aba INTELIGÊNCIAS (Fundamental 2, reforma): o SANTUÁRIO DAS 8 CASAS.
 *
 * Mesmo santuário imersivo do Infantil/F1 (fundo índigo profundo, véu na cor da
 * Casa), na voz do adolescente. TODO mentor vê as oito Casas (não filtra pela
 * Casa dele): a aba é estudo e identidade, nunca checklist para classificar aluno.
 * A moldura do topo e a linha de Cuidado por Casa blindam contra o rótulo rápido.
 * Conteúdo aprovado pelo Fundador (src/lib/f2Santuario.ts).
 */
const F2InteligenciasPage = () => {
  // A Casa VISTA agora (o mentor navega as 8; abre na primeira).
  const [casaSel, setCasaSel] = useState(1);

  const c = SANTUARIO_F2[casaSel];

  // Fallback do brasão: se a imagem não carregar, cai pro escudo na cor da Casa.
  const [brasaoOk, setBrasaoOk] = useState(true);
  useEffect(() => {
    setBrasaoOk(true);
  }, [casaSel]);

  // Scroll pro TOPO em toda troca de Casa: sem isso, quem troca no meio da
  // página segue lendo achando que é a Casa anterior.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [casaSel]);

  // Swipe DENTRO do santuário troca de Casa (modelo mental natural). Só dispara
  // com gesto claramente horizontal e rápido, pra não roubar o scroll vertical.
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
    const destino = dx < 0 ? casaSel + 1 : casaSel - 1;
    if (destino >= 1 && destino <= TOTAL) setCasaSel(destino);
  };

  return (
    <>
      {/* Fundo full-bleed imersivo: o véu da cor da Casa mesclado ao índigo,
          transição suave na troca. Igual ao santuário do Infantil/F1. */}
      <div
        className="fixed inset-0 z-0"
        style={{
          backgroundColor: t.accentDeep,
          background: `radial-gradient(120% 90% at 50% -10%, ${c.corVeu} 0%, #322B8F 52%, #2B2580 100%)`,
          transition: 'background 600ms ease',
        }}
        aria-hidden="true"
      />

      <div
        className="relative z-10 pt-4 pb-6"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <p
          className="text-[11px] uppercase font-semibold mb-3 vf-rise"
          style={{ color: 'rgba(255,255,255,0.6)', letterSpacing: '0.24em' }}
        >
          Inteligências
        </p>

        {/* MOLDURA de estudo: o que esta aba NÃO é. Fixa no topo, sempre visível:
            deixa claro que é identidade, nunca checklist (blindagem anti-rótulo). */}
        <div
          className="rounded-2xl p-4 mb-4 flex gap-3 vf-rise"
          style={{
            backgroundColor: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.16)',
          }}
        >
          <Info size={16} strokeWidth={1.75} className="flex-shrink-0 mt-0.5" style={{ color: 'rgba(255,255,255,0.8)' }} />
          <p className="text-[12.5px] leading-relaxed texto-justificado" style={{ color: 'rgba(255,255,255,0.82)' }}>
            <span className="font-semibold" style={{ color: '#FFFFFF' }}>{MOLDURA_F2.titulo} </span>
            {MOLDURA_F2.corpo}
          </p>
        </div>

        {/* Seletor das 8 Casas: corpo de botão na cor de cada Casa; a selecionada
            fica branca. Todo mentor vê as oito. */}
        <div
          className="flex gap-1.5 justify-center flex-wrap mb-2 vf-rise"
          role="tablist"
          aria-label="As 8 Casas"
        >
          {Array.from({ length: TOTAL }).map((_, i) => {
            const n = i + 1;
            const ehSel = n === casaSel;
            const casa = SANTUARIO_F2[n];
            return (
              <button
                key={n}
                role="tab"
                onClick={() => setCasaSel(n)}
                className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold transition-all active:scale-95"
                style={{
                  backgroundColor: ehSel ? '#FFFFFF' : `${casa.cor}55`,
                  color: ehSel ? casa.cor : '#FFFFFF',
                  border: `1.5px solid ${ehSel ? '#FFFFFF' : 'rgba(255,255,255,0.4)'}`,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
                }}
                aria-label={`Casa ${casa.casaNome}`}
                aria-selected={ehSel}
              >
                {n}
              </button>
            );
          })}
        </div>

        <p className="text-[11px] text-center mb-5 vf-rise" style={{ color: 'rgba(255,255,255,0.65)' }}>
          Toque num número para conhecer outra Casa
        </p>

        {/* Cabeçalho da Casa: brasão (ou escudo na cor) + nome. key força a
            reentrada da animação na troca. */}
        <div key={casaSel} className="flex flex-col items-center text-center">
          <div className="vf-rise" aria-hidden="true">
            {brasaoOk ? (
              <img
                src={c.brasao}
                alt=""
                onError={() => setBrasaoOk(false)}
                className="object-contain"
                style={{ width: 68, height: 68, filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.35))' }}
              />
            ) : (
              <span
                className="rounded-2xl flex items-center justify-center"
                style={{ width: 68, height: 68, backgroundColor: `${c.cor}44`, border: '1px solid rgba(255,255,255,0.22)' }}
              >
                <Shield size={34} style={{ color: '#FFFFFF' }} strokeWidth={1.75} />
              </span>
            )}
          </div>

          <p
            className="text-[10.5px] uppercase font-semibold mt-4 vf-rise"
            style={{ color: 'rgba(255,255,255,0.8)', letterSpacing: '0.32em' }}
          >
            Casa {casaSel} de {TOTAL}
          </p>
          <h1 className="font-serif text-[27px] leading-tight mt-2 vf-rise" style={{ color: '#FFFFFF' }}>
            Casa {c.casaNome}
          </h1>
          {/* Assinatura de cor da Casa */}
          <div
            className="vf-draw mx-auto mt-3 mb-6 rounded-full"
            style={{ width: 76, height: 6, backgroundColor: c.cor, animationDelay: '200ms' }}
          />
        </div>

        {/* Essência (voz editorial, itálico) */}
        <div
          className="rounded-r-2xl p-4 mb-5 vf-rise"
          style={{
            backgroundColor: 'rgba(255,255,255,0.07)',
            borderLeft: `3px solid ${c.cor}`,
            animationDelay: '120ms',
          }}
        >
          <p className="font-serif italic text-[13.5px] leading-relaxed texto-justificado" style={{ color: 'rgba(255,255,255,0.9)' }}>
            {c.essencia}
          </p>
        </div>

        <section className="mb-5 vf-rise" style={{ animationDelay: '200ms' }}>
          <h2 className="text-[13.5px] uppercase tracking-[0.14em] font-bold mb-2.5" style={{ color: '#FFFFFF' }}>
            O mecanismo
          </h2>
          <p className="text-sm leading-relaxed texto-justificado" style={{ color: 'rgba(255,255,255,0.92)' }}>
            {c.mecanismo}
          </p>
        </section>

        <section className="mb-5 vf-rise" style={{ animationDelay: '280ms' }}>
          <h2 className="text-[13.5px] uppercase tracking-[0.14em] font-bold mb-2.5" style={{ color: '#FFFFFF' }}>
            Como se revela no adolescente
          </h2>
          <ul className="space-y-2">
            {c.revela.map((x, i) => (
              <li key={i} className="text-sm leading-relaxed flex gap-2.5" style={{ color: 'rgba(255,255,255,0.92)' }}>
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-2"
                  style={{ backgroundColor: c.cor, boxShadow: '0 0 0 1.5px rgba(255,255,255,0.35)' }}
                  aria-hidden="true"
                />
                {x}
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-5 vf-rise" style={{ animationDelay: '360ms' }}>
          <h2 className="text-[13.5px] uppercase tracking-[0.14em] font-bold mb-2.5" style={{ color: '#FFFFFF' }}>
            O que o mentor cultiva
          </h2>
          <p className="text-sm leading-relaxed texto-justificado" style={{ color: 'rgba(255,255,255,0.92)' }}>
            {c.cultiva}
          </p>
        </section>

        {/* Referência (o gênio): fecha o mecanismo com a âncora dos 12 anos */}
        <section
          className="mb-5 pt-4 vf-rise"
          style={{ borderTop: '1px solid rgba(255,255,255,0.16)', animationDelay: '440ms' }}
        >
          <h2 className="text-[13.5px] uppercase tracking-[0.14em] font-bold mb-2.5" style={{ color: '#FFFFFF' }}>
            Referência
          </h2>
          <p className="text-[13.5px] leading-relaxed texto-justificado" style={{ color: 'rgba(255,255,255,0.82)' }}>
            {c.referencia}
          </p>
        </section>

        {/* Cuidado: a guarda anti-rótulo, mesma em toda Casa. "Toda pessoa tem as
            oito" fica aqui, junto do conteúdo. Pena, nunca alerta. */}
        <div
          className="rounded-2xl p-4 flex gap-3 vf-rise"
          style={{
            backgroundColor: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.18)',
            animationDelay: '520ms',
          }}
        >
          <Feather size={17} strokeWidth={1.5} className="flex-shrink-0 mt-0.5" style={{ color: 'rgba(255,255,255,0.85)' }} />
          <div>
            <p className="text-[13px] font-semibold mb-1" style={{ color: '#FFFFFF' }}>
              Cuidado
            </p>
            <p className="text-[13px] leading-relaxed texto-justificado" style={{ color: 'rgba(255,255,255,0.85)' }}>
              {c.cuidado}
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default F2InteligenciasPage;
