import { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * ARENA ARBORIA: tela imersiva de boas-vindas do capítulo no formato TIMES.
 *
 * Espelha o rito de pico do Infantil (ViradaFaseExperience): overlay de tela
 * cheia, entrada em cascata (vf-rise / vf-draw), X e Esc para fechar, tom solene.
 * MAS na linguagem visual do ALUNO: fundo escuro #0F0F1E/#1A1A2E, acentos pela
 * cor da Casa, títulos serif, o mesmo clima sci-fi do CapituloPage.
 *
 * Por ora o "?" no topo do capítulo abre/reabre esta tela (prévia). Auto-abrir na
 * alocação é passo futuro.
 */

/** Bloco com entrada em cascata (fade + rise, delays escalonados). */
const Casc = ({ i, children, className = '' }: { i: number; children: React.ReactNode; className?: string }) => (
  <div className={`vf-rise ${className}`} style={{ animationDelay: `${i * 120}ms` }}>
    {children}
  </div>
);

interface ArenaBoasVindasProps {
  capituloNome: string;
  timeNome: string | null;
  timeDescricao: string | null;
  casaColor: string;
  onFechar: () => void;
}

const ArenaBoasVindas = ({
  capituloNome, timeNome, timeDescricao, casaColor, onFechar
}: ArenaBoasVindasProps) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFechar();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onFechar]);

  return (
    <div
      className="fixed inset-0 z-[60] overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Boas-vindas da Arena"
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

        <Casc i={0}>
          <p
            className="text-[11px] uppercase font-semibold text-center text-white/70"
            style={{ letterSpacing: '0.35em' }}
          >
            Você foi convocado
          </p>
          <div
            className="vf-draw mx-auto mt-3"
            style={{ width: 48, height: 2, backgroundColor: `${casaColor}88`, animationDelay: '300ms' }}
          />
        </Casc>

        <Casc i={1} className="mt-6">
          <h2 className="font-serif text-[30px] leading-tight text-center text-white" tabIndex={-1}>
            {capituloNome}
          </h2>
        </Casc>

        <Casc i={2} className="mt-4">
          <p className="text-sm text-center leading-relaxed text-white/75 max-w-[280px] mx-auto">
            Uma competição de projetos. Seu time cria uma ideia e prova, no dia, que ela funciona.
          </p>
        </Casc>

        {timeNome && (
          <Casc i={3} className="mt-8">
            <div
              className="rounded-2xl p-4"
              style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: `1px solid ${casaColor}55` }}
            >
              <p
                className="text-[10px] uppercase font-semibold text-center mb-1.5"
                style={{ color: casaColor, letterSpacing: '0.3em' }}
              >
                Seu time
              </p>
              <p className="font-serif text-xl text-center text-white leading-snug">
                {timeNome}
              </p>
              {timeDescricao && (
                <p className="text-[13px] text-center leading-relaxed text-white/70 mt-2">
                  {timeDescricao}
                </p>
              )}
            </div>
          </Casc>
        )}

        <Casc i={4} className="mt-8 mb-8">
          <p className="font-serif italic text-[16px] leading-relaxed text-center text-white/85 max-w-[270px] mx-auto">
            O melhor projeto ganha. A ideia é de vocês. Agora é construir.
          </p>
        </Casc>

        <Casc i={5} className="mt-auto">
          <button
            onClick={onFechar}
            autoFocus
            className="w-full rounded-2xl py-3.5 text-[15px] font-semibold text-white active:scale-[0.99] transition-transform"
            style={{ backgroundColor: casaColor, boxShadow: `0 8px 30px ${casaColor}44` }}
          >
            Entrar na Arena
          </button>
        </Casc>
      </div>
    </div>
  );
};

export default ArenaBoasVindas;
