import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

/**
 * TOUR IMERSIVO DO ALUNO ("Help"): percurso de 6 telas de tela cheia que
 * apresenta o Arboria na voz de um educador. Mesmo acabamento da ArenaBoasVindas
 * (overlay #0F0F1E, acento pela cor da Casa, titulos serif, entrada em cascata,
 * X e Esc pra fechar). Texto na regua "pertencimento sem rotulo": nenhuma tela
 * diz "voce e", nem fecha o aluno num jeito so.
 *
 * Aberto pelo "?" no header (no lugar do sino) e auto-surge na 1a vez (o header
 * controla o auto-surge via localStorage).
 */

const Casc = ({ i, children, className = '' }: { i: number; children: React.ReactNode; className?: string }) => (
  <div className={`vf-rise ${className}`} style={{ animationDelay: `${i * 110}ms` }}>
    {children}
  </div>
);

interface Passo {
  eyebrow: string;
  titulo: string;
  corpo: string;
  glyph: JSX.Element;
}

const svgProps = {
  className: 'w-7 h-7',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const PASSOS: Passo[] = [
  {
    eyebrow: 'Bem-vindo',
    titulo: 'Isto é o Arboria',
    corpo: 'Um lugar que repara em como você pensa, não no quanto você vale. Aqui, cada jeito de pensar tem espaço.',
    glyph: (
      <svg viewBox="0 0 24 24" {...svgProps}>
        <path d="M12 22v-6" />
        <path d="M12 16a5 5 0 0 0 5-5c0-3.2-2.2-6-5-8-2.8 2-5 4.8-5 8a5 5 0 0 0 5 5z" />
      </svg>
    ),
  },
  {
    eyebrow: 'Onde você entra',
    titulo: 'Sua Casa',
    corpo: 'Você faz parte de uma Casa: um time onde o seu jeito de pensar é natural e encontra os seus. Não é um rótulo. É onde você começa.',
    glyph: (
      <svg viewBox="0 0 24 24" {...svgProps}>
        <path d="M12 3l7 3v5c0 4-3 7.2-7 9-4-1.8-7-5-7-9V6l7-3z" />
      </svg>
    ),
  },
  {
    eyebrow: 'O ano inteiro',
    titulo: 'As oito fases',
    corpo: 'Ao longo do ano, sua turma atravessa as oito Casas, uma de cada vez. Cada fase exercita um jeito de pensar. Todos moram em você.',
    glyph: (
      <svg viewBox="0 0 24 24" {...svgProps}>
        <circle cx="4.5" cy="12" r="1.8" />
        <circle cx="12" cy="12" r="1.8" />
        <circle cx="19.5" cy="12" r="1.8" />
        <path d="M6.6 12h3.3M14.1 12h3.3" />
      </svg>
    ),
  },
  {
    eyebrow: 'O que você faz',
    titulo: 'As missões',
    corpo: 'O que importa não é só o que você entrega. É como você chegou lá. Mostre o seu caminho.',
    glyph: (
      <svg viewBox="0 0 24 24" {...svgProps}>
        <circle cx="12" cy="12" r="8.2" />
        <path d="M15.2 8.8l-2 4.4-4.4 2 2-4.4 4.4-2z" />
      </svg>
    ),
  },
  {
    eyebrow: 'Juntos',
    titulo: 'Os capítulos',
    corpo: 'De tempos em tempos, a Casa inteira se junta num grande projeto. A ideia é de vocês. O resto é construir.',
    glyph: (
      <svg viewBox="0 0 24 24" {...svgProps}>
        <circle cx="9" cy="8" r="2.6" />
        <path d="M3.5 19.5c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
        <path d="M16.5 6.2a2.8 2.8 0 0 1 0 5.6" />
        <path d="M20.5 19.5c0-2.2-1-3.9-2.8-4.6" />
      </svg>
    ),
  },
  {
    eyebrow: 'Ao longo dos anos',
    titulo: 'O que fica',
    corpo: 'Tudo o que você faz vira a sua história aqui, crescendo ano após ano. Este é o começo dela.',
    glyph: (
      <svg viewBox="0 0 24 24" {...svgProps}>
        <path d="M4 5c2.4-1 5-1 8 .3 3-1.3 5.6-1.3 8-.3v13.4c-2.4-1-5-1-8 .3-3-1.3-5.6-1.3-8-.3z" />
        <path d="M12 5.3v13.4" />
      </svg>
    ),
  },
];

interface AlunoTourProps {
  casaColor: string;
  onFechar: () => void;
}

const AlunoTour = ({ casaColor, onFechar }: AlunoTourProps) => {
  const [passo, setPasso] = useState(0);
  const total = PASSOS.length;
  const ultimo = passo === total - 1;
  const p = PASSOS[passo];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFechar();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onFechar]);

  const avancar = () => {
    if (ultimo) onFechar();
    else setPasso((s) => s + 1);
  };

  return (
    <div
      className="fixed inset-0 z-[60] overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Como o Arboria funciona"
      style={{
        backgroundColor: '#0F0F1E',
        backgroundImage: `radial-gradient(ellipse at center top, ${casaColor}26 0%, #0F0F1E 70%)`,
      }}
    >
      <div className="min-h-full flex flex-col max-w-sm mx-auto px-6 pt-14 pb-8 pb-safe">
        <button
          onClick={onFechar}
          className="absolute top-4 right-4 p-2.5 rounded-full text-white/60"
          aria-label="Fechar"
        >
          <X size={20} />
        </button>

        {/* Conteudo: re-monta por passo (key) pra re-disparar a cascata */}
        <div key={passo} className="flex-1 flex flex-col justify-center text-center">
          <Casc i={0}>
            <div
              className="mx-auto mb-7 w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{
                background: `linear-gradient(160deg, ${casaColor}26, ${casaColor}0a)`,
                border: `1px solid ${casaColor}55`,
                color: casaColor,
              }}
            >
              {p.glyph}
            </div>
          </Casc>

          <Casc i={1}>
            <p className="text-[11px] uppercase font-semibold" style={{ color: casaColor, letterSpacing: '0.32em' }}>
              {p.eyebrow}
            </p>
          </Casc>

          <Casc i={2} className="mt-3">
            <h2 className="font-serif text-[28px] leading-tight text-white" tabIndex={-1}>
              {p.titulo}
            </h2>
          </Casc>

          <Casc i={3} className="mt-4">
            <p className="text-[14px] leading-relaxed text-white/75 max-w-[280px] mx-auto">
              {p.corpo}
            </p>
          </Casc>

          <Casc i={4} className="mt-5">
            <div
              className="mx-auto"
              style={{ width: 44, height: 1, background: `linear-gradient(90deg, transparent, ${casaColor}, transparent)` }}
            />
          </Casc>
        </div>

        {/* Passos (dots) + acao */}
        <div className="mt-auto">
          <div className="flex gap-1.5 justify-center mb-6">
            {PASSOS.map((_, i) => (
              <span
                key={i}
                className="h-1.5 rounded-full transition-all duration-300"
                style={{ width: i === passo ? 18 : 6, backgroundColor: i === passo ? casaColor : 'rgba(255,255,255,0.2)' }}
              />
            ))}
          </div>
          <button
            onClick={avancar}
            autoFocus
            className="w-full rounded-2xl py-3.5 text-[15px] font-semibold text-white active:scale-[0.99] transition-transform"
            style={{ backgroundColor: casaColor, boxShadow: `0 8px 30px ${casaColor}44` }}
          >
            {ultimo ? 'Começar' : 'Continuar'}
          </button>
          {!ultimo && (
            <button onClick={onFechar} className="w-full mt-2 py-2 text-[13px] text-white/40 hover:text-white/60 transition-colors">
              pular
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AlunoTour;
