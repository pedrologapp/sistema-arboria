import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Sparkles, RefreshCw, ArrowLeft, X } from 'lucide-react';
import {
  LEQUE_COMECOS,
  LEQUE_OUTRO,
  LEQUE_CAMINHOS,
  sortearMecanismo,
  type LequeOpcao,
} from '@/lib/lequeObservacao';
import { infantilTheme as t } from '@/styles/infantilTheme';

/**
 * O LEQUE DE OBSERVAÇÃO: um menu radial (marking menu) DENTRO da aula.
 *
 * Assistente ADITIVO do editor por aluno da Rajada (Infantil e F1): a professora
 * abre um círculo, toca as opções e cada toque INSERE o texto no mesmo campo que
 * ela já usa. A digitação livre continua intacta: o leque só empurra texto pra
 * dentro; ela edita/apaga normal no teclado depois. Aprovado pelo Fundador 07/07.
 *
 * Cascata (dados em src/lib/lequeObservacao.ts):
 *  - passo 1: LEQUE_COMECOS (abre a frase) → ao tocar, insere e avança.
 *  - passo 2: 3 cenas sorteadas do mecanismo da fase + "outro caminho" (sem
 *    destaque). Cena de mecanismo conclui; "outro caminho" avança. Hub = trocar
 *    (re-sorteia 3). Fase sem mecanismo (id nulo ou conjunto vazio): degrada pra
 *    só o "outro caminho".
 *  - passo 3: LEQUE_CAMINHOS (os 8, como comportamento) → ao tocar, conclui.
 *
 * Tema CLARO (caderno de campo). A cor da inteligência da fase entra só como
 * acento (hub + foco). Acessível: gatilho e opções são <button>, foco por
 * teclado visível, Esc/scrim fecham, respeita prefers-reduced-motion (CSS).
 */

export interface LequeCores {
  /** acento legível sobre claro (ex.: santuario.corDia) */
  acento?: string;
  /** lavagem suave pra fundo do hub/foco (ex.: santuario.corLavagem) */
  lavagem?: string;
  /** borda tingida (ex.: santuario.corBorda) */
  borda?: string;
}

interface LequeObservacaoProps {
  /** id da inteligência da fase (1..8) ou null se não resolveu */
  inteligenciaId: number | null;
  /** texto atual do campo, só pra preview vivo (o campo segue sendo a fonte) */
  valorAtual: string;
  /** insere o trecho no campo (o pai concatena com espaço) */
  onInserir: (trecho: string) => void;
  cores?: LequeCores;
  /** rótulo curto do sujeito (ex.: primeiro nome) só pro texto de apoio */
  className?: string;
}

type Passo = 1 | 2 | 3;

/** Distribui N pontos num círculo, começando no topo e girando no sentido horário. */
const posNoCirculo = (i: number, n: number, raio: number) => {
  const ang = (-90 + (i * 360) / n) * (Math.PI / 180);
  return { x: Math.cos(ang) * raio, y: Math.sin(ang) * raio };
};

const LequeObservacao = ({
  inteligenciaId,
  valorAtual,
  onInserir,
  cores,
  className,
}: LequeObservacaoProps) => {
  const acento = cores?.acento ?? t.accentText;
  const lavagem = cores?.lavagem ?? t.accentSoft;
  const borda = cores?.borda ?? t.accentBorder;

  const [aberto, setAberto] = useState(false);
  const [passo, setPasso] = useState<Passo>(1);
  const [mecSorteado, setMecSorteado] = useState<LequeOpcao[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const primeiraOpcaoRef = useRef<HTMLButtonElement>(null);
  const gatilhoRef = useRef<HTMLButtonElement>(null);

  const temMecanismo = useMemo(
    () => !!inteligenciaId && sortearMecanismo(inteligenciaId, 1).length > 0,
    [inteligenciaId]
  );

  const resortear = useCallback(() => {
    setMecSorteado(inteligenciaId ? sortearMecanismo(inteligenciaId, 3) : []);
  }, [inteligenciaId]);

  const abrir = () => {
    setPasso(1);
    setMecSorteado([]);
    setAberto(true);
  };

  const fechar = useCallback(() => {
    setAberto(false);
    setPasso(1);
    // devolve o foco pro gatilho (teclado não fica órfão)
    requestAnimationFrame(() => gatilhoRef.current?.focus());
  }, []);

  // Esc fecha; Tab cicla dentro do leque (trap leve)
  useEffect(() => {
    if (!aberto) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        fechar();
        return;
      }
      if (e.key === 'Tab') {
        const nodes = containerRef.current?.querySelectorAll<HTMLButtonElement>('button');
        if (!nodes || nodes.length === 0) return;
        const list = Array.from(nodes);
        const first = list[0];
        const last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [aberto, fechar]);

  // Foca a primeira opção ao abrir e a cada troca de passo
  useEffect(() => {
    if (!aberto) return;
    const id = requestAnimationFrame(() => primeiraOpcaoRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [aberto, passo]);

  // Monta as opções do passo corrente como comportamento (ação por toque)
  type ItemLeque = { opt: LequeOpcao; onClick: () => void };
  const itens: ItemLeque[] = useMemo(() => {
    if (passo === 1) {
      return LEQUE_COMECOS.map((opt) => ({
        opt,
        onClick: () => {
          onInserir(opt.t);
          resortear();
          setPasso(2);
        },
      }));
    }
    if (passo === 2) {
      const cenas: ItemLeque[] = mecSorteado.map((opt) => ({
        opt,
        onClick: () => {
          onInserir(opt.t);
          fechar();
        },
      }));
      // "outro caminho" SEM destaque: mesma pele das cenas, e avança pro Cross-IM
      cenas.push({
        opt: LEQUE_OUTRO,
        onClick: () => {
          onInserir(LEQUE_OUTRO.t);
          setPasso(3);
        },
      });
      return cenas;
    }
    return LEQUE_CAMINHOS.map((opt) => ({
      opt,
      onClick: () => {
        onInserir(opt.t);
        fechar();
      },
    }));
  }, [passo, mecSorteado, onInserir, resortear, fechar]);

  const instrucao =
    passo === 1
      ? 'Toque um começo'
      : passo === 2
      ? 'Como a criança chegou'
      : 'Por qual caminho';

  // Raio do círculo: folgado o bastante pra o chip não encostar no hub central.
  const raio = itens.length > 5 ? 130 : 122;

  return (
    <>
      {/* Gatilho discreto, ao lado do campo. Continua tudo funcionando sem ele. */}
      <button
        ref={gatilhoRef}
        type="button"
        onClick={abrir}
        className={`flex items-center gap-1.5 text-xs font-medium rounded-lg px-2 py-2 focus:outline-none focus-visible:ring-2 ${className ?? ''}`}
        style={{ color: acento, ['--tw-ring-color' as string]: acento }}
        aria-haspopup="menu"
        aria-expanded={aberto}
      >
        <Sparkles size={16} strokeWidth={1.9} /> Sugerir
      </button>

      {aberto && (
        <div className="fixed inset-0 z-[80] flex flex-col" role="dialog" aria-modal="true" aria-label="Leque de observação">
          {/* Scrim: a turma esmaece atrás; tocar fora fecha */}
          <button
            type="button"
            onClick={fechar}
            aria-label="Fechar leque"
            className="absolute inset-0 leque-scrim"
            style={{ backgroundColor: 'rgba(28,34,48,0.32)', backdropFilter: 'blur(2px)' }}
          />

          <div ref={containerRef} className="relative z-10 flex flex-col h-full pointer-events-none">
            {/* Cabeçalho: passo + fechar */}
            <div className="flex items-center justify-between px-4 pt-4 pointer-events-auto">
              <span
                className="text-[11px] uppercase tracking-wide font-bold rounded-full px-3 py-1"
                style={{ backgroundColor: t.surface, color: acento, boxShadow: t.shadowSm }}
              >
                {instrucao}
              </span>
              <button
                type="button"
                onClick={fechar}
                aria-label="Fechar leque"
                className="rounded-full p-2 focus:outline-none focus-visible:ring-2"
                style={{ backgroundColor: t.surface, color: t.textMuted, boxShadow: t.shadowSm, ['--tw-ring-color' as string]: acento }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Preview vivo: o campo de texto segue visível enquanto ela toca */}
            <div className="px-4 pt-3 pointer-events-auto">
              <div
                className="mx-auto max-w-[420px] rounded-xl px-3 py-2 text-sm leading-snug"
                style={{ backgroundColor: t.surface, border: `1px solid ${t.border}`, color: valorAtual ? t.text : t.textFaint, boxShadow: t.shadowSm }}
              >
                {valorAtual ? valorAtual : 'A cena vai aparecendo aqui conforme você toca.'}
              </div>
            </div>

            {/* Palco do radial */}
            <div className="flex-1 relative pointer-events-none">
              <div className="absolute left-1/2 top-1/2 pointer-events-auto" style={{ transform: 'translate(-50%, -50%)' }}>
                {/* Hub central */}
                <div className="relative" style={{ width: 1, height: 1 }}>
                  {passo === 2 && temMecanismo ? (
                    <button
                      type="button"
                      onClick={resortear}
                      className="absolute rounded-full flex flex-col items-center justify-center gap-0.5 focus:outline-none focus-visible:ring-2 leque-hub"
                      style={{
                        width: 76,
                        height: 76,
                        left: -38,
                        top: -38,
                        backgroundColor: lavagem,
                        border: `1.5px solid ${acento}`,
                        color: acento,
                        boxShadow: t.shadowMd,
                        ['--tw-ring-color' as string]: acento,
                      }}
                      aria-label="Trocar as sugestões"
                    >
                      <RefreshCw size={18} strokeWidth={2} />
                      <span className="text-[10px] font-semibold">trocar</span>
                    </button>
                  ) : passo === 3 ? (
                    <button
                      type="button"
                      onClick={() => setPasso(2)}
                      className="absolute rounded-full flex flex-col items-center justify-center gap-0.5 focus:outline-none focus-visible:ring-2 leque-hub"
                      style={{
                        width: 76,
                        height: 76,
                        left: -38,
                        top: -38,
                        backgroundColor: lavagem,
                        border: `1.5px solid ${acento}`,
                        color: acento,
                        boxShadow: t.shadowMd,
                        ['--tw-ring-color' as string]: acento,
                      }}
                      aria-label="Voltar"
                    >
                      <ArrowLeft size={18} strokeWidth={2} />
                      <span className="text-[10px] font-semibold">voltar</span>
                    </button>
                  ) : (
                    <div
                      className="absolute rounded-full flex items-center justify-center leque-hub"
                      style={{
                        width: 68,
                        height: 68,
                        left: -34,
                        top: -34,
                        backgroundColor: lavagem,
                        border: `1.5px solid ${borda}`,
                        color: acento,
                      }}
                      aria-hidden="true"
                    >
                      <Sparkles size={22} strokeWidth={1.8} />
                    </div>
                  )}

                  {/* Opções ao redor */}
                  {itens.map((item, i) => {
                    const { x, y } = posNoCirculo(i, itens.length, raio);
                    // No passo 3 (Cross-IM), cada caminho sai NA COR da sua
                    // inteligência: borda + texto na cor, fundo bem claro derivado.
                    const corItem = item.opt.cor;
                    return (
                      <button
                        key={`${passo}-${item.opt.l}-${i}`}
                        ref={i === 0 ? primeiraOpcaoRef : undefined}
                        type="button"
                        onClick={item.onClick}
                        className="absolute whitespace-nowrap rounded-full px-2.5 py-1.5 text-[13px] font-semibold leque-opt focus:outline-none focus-visible:ring-2 active:scale-95"
                        style={{
                          left: x,
                          top: y,
                          transform: 'translate(-50%, -50%)',
                          minWidth: 44,
                          minHeight: 44,
                          // caminhos (passo 3): sólidos na cor da IM, texto branco.
                          // outros passos: pele clara do caderno.
                          backgroundColor: corItem ?? t.surface,
                          border: `1px solid ${corItem ?? borda}`,
                          color: corItem ? '#FFFFFF' : t.text,
                          boxShadow: t.shadowMd,
                          animationDelay: `${i * 28}ms`,
                          ['--tw-ring-color' as string]: corItem ?? acento,
                        }}
                      >
                        {item.opt.l}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default LequeObservacao;
