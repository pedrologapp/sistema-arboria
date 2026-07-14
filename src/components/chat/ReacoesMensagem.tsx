import { useRef, useState, type ReactNode } from 'react';
import { ThumbsUp, HeartHandshake, Gem, Handshake, Plus, type LucideIcon } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';

/**
 * Reacoes rapidas do chat de canal do aluno F2 (gated por F2_ALUNO_REACOES).
 *
 * So reacoes POSITIVAS e curadas. Icones vetoriais (lucide), nunca emoji.
 *
 * REGRA INEGOCIAVEL: nunca renderizar a AUSENCIA. Quando a mensagem tem zero
 * reacao, este componente NAO desenha chip, contador, "0" nem placeholder, e NAO
 * ocupa espaco no fluxo (o cluster so entra quando ha reacao). Em repouso, a
 * mensagem fica identica a uma de antes da feature. O unico extra e o affordance
 * "+", ABSOLUTO (nao empurra layout) e OPACO em repouso: so aparece no hover
 * (desktop) ou no long-press (toque), igual em toda mensagem, entao as vazias
 * nao ficam marcadas.
 *
 * Gestos:
 *  - "+" (hover) ou long-press no balao: abre o SELETOR (curtir/apoiar/joia/combinado).
 *  - Tocar no cluster de reacoes: abre "Quem reagiu" (nomes por reacao, estilo WhatsApp).
 * Trocar/tirar reacao acontece pelo seletor (o proprio tipo destacado, tocar de novo tira).
 */

export type ReacaoTipo = 'curtir' | 'apoiar' | 'joia' | 'combinado';

export const REACOES_ORDEM: ReacaoTipo[] = ['curtir', 'apoiar', 'joia', 'combinado'];

const REACAO_META: Record<ReacaoTipo, { Icone: LucideIcon; rotulo: string }> = {
  curtir: { Icone: ThumbsUp, rotulo: 'Curtir' },
  apoiar: { Icone: HeartHandshake, rotulo: 'Apoiar' },
  joia: { Icone: Gem, rotulo: 'Joia' },
  combinado: { Icone: Handshake, rotulo: 'Combinado' },
};

export interface ReacaoAgregada {
  tipo: ReacaoTipo;
  nomes: string[];
  euReagi: boolean;
}

interface ReacoesMensagemProps {
  /** Apenas tipos com contagem >= 1. Vazio = nada e renderizado (regra da ausencia). */
  reacoes: ReacaoAgregada[];
  /** Reacao do proprio usuario nesta mensagem, se houver. */
  minhaReacao: ReacaoTipo | null;
  /** Alterna a reacao: mesma reacao tira; outra troca; nenhuma adiciona. */
  onToggle: (tipo: ReacaoTipo) => void;
  /** O balao da mensagem. O long-press aqui abre o seletor. */
  children: ReactNode;
}

const LONG_PRESS_MS = 450;

export const ReacoesMensagem = ({
  reacoes,
  minhaReacao,
  onToggle,
  children,
}: ReacoesMensagemProps) => {
  const [seletorAberto, setSeletorAberto] = useState(false);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const temReacoes = reacoes.length > 0;

  const iniciarPress = () => {
    limparPress();
    pressTimer.current = setTimeout(() => setSeletorAberto(true), LONG_PRESS_MS);
  };
  const limparPress = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  const escolher = (tipo: ReacaoTipo) => {
    setSeletorAberto(false);
    onToggle(tipo);
  };

  return (
    <div className="group relative">
      {/* Balao: long-press abre o seletor no toque */}
      <div
        onPointerDown={iniciarPress}
        onPointerUp={limparPress}
        onPointerMove={limparPress}
        onPointerCancel={limparPress}
        onPointerLeave={limparPress}
      >
        {children}
      </div>

      {/* Cluster de reacoes: SO entra no fluxo quando ha reacao (nunca a ausencia). */}
      {temReacoes && (
        <div className="flex items-center gap-1.5 pl-[56px] pr-2 mt-1">
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1 rounded-full bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.06] px-2 py-0.5 transition-colors"
                aria-label="Ver quem reagiu"
              >
                {reacoes.map(({ tipo, nomes, euReagi }) => {
                  const { Icone } = REACAO_META[tipo];
                  return (
                    <span key={tipo} className="flex items-center gap-0.5">
                      <Icone className={`w-3.5 h-3.5 ${euReagi ? 'text-violet-300' : 'text-white/60'}`} />
                      {nomes.length > 1 && (
                        <span className={`text-[11px] tabular-nums ${euReagi ? 'text-violet-300' : 'text-white/50'}`}>
                          {nomes.length}
                        </span>
                      )}
                    </span>
                  );
                })}
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-56 p-0 bg-[#1b1830] border-white/10 text-white">
              <div className="px-3 py-2 border-b border-white/10">
                <p className="text-xs font-medium text-white/70">Quem reagiu</p>
              </div>
              <div className="max-h-64 overflow-y-auto py-1">
                {reacoes.map(({ tipo, nomes }) => {
                  const { Icone, rotulo } = REACAO_META[tipo];
                  return (
                    <div key={tipo} className="px-3 py-1.5">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Icone className="w-3.5 h-3.5 text-violet-300" />
                        <span className="text-[11px] text-white/40">{rotulo}</span>
                      </div>
                      <ul className="pl-5 space-y-0.5">
                        {nomes.map((nome, i) => (
                          <li key={`${tipo}-${i}`} className="text-sm text-white/80">{nome}</li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      )}

      {/* Affordance "+" UNIFORME: absoluto (nao empurra layout), opaco em repouso. */}
      <Popover open={seletorAberto} onOpenChange={setSeletorAberto}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Reagir"
            className={`absolute top-1 right-2 flex items-center justify-center w-6 h-6 rounded-full bg-[#221d38] text-white/40 hover:text-white/80 hover:bg-white/[0.12] transition-all
              ${seletorAberto ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100'}`}
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-auto p-1 bg-[#1b1830] border-white/10">
          <div className="flex items-center gap-0.5">
            {REACOES_ORDEM.map((tipo) => {
              const { Icone, rotulo } = REACAO_META[tipo];
              const ativa = minhaReacao === tipo;
              return (
                <button
                  key={tipo}
                  type="button"
                  onClick={() => escolher(tipo)}
                  aria-label={rotulo}
                  aria-pressed={ativa}
                  title={rotulo}
                  className={`flex items-center justify-center w-9 h-9 rounded-lg transition-colors
                    ${ativa ? 'bg-violet-500/25 text-violet-200' : 'text-white/70 hover:bg-white/[0.08] hover:text-white'}`}
                >
                  <Icone className="w-5 h-5" />
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
