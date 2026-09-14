// ============================================================
// VotarModal — a tela de escolher o projeto e votar.
//
// POR QUE O VOTO NAO ACONTECE NA PAGINA DO PROJETO. Votar ali e' votar no que
// esta' na frente, e quem acabou de ler um projeto tende a votar nele por
// estar ali. Abrir a grade com todos obriga a escolha a ser uma ESCOLHA: a
// pessoa ve' os onze de novo, lado a lado, e decide entre eles.
//
// O voto continua sendo FINAL, e a confirmacao continua existindo. O que muda
// e' o que se ve' antes de confirmar.
// ============================================================
import { useEffect, useState } from 'react';
import { votar, type ProjetoArena } from './fonteArena';

type Passo = 'escolhendo' | 'confirmando' | 'enviando' | 'pronto' | 'recusado';

interface Props {
  projetos: ProjetoArena[];
  /** O projeto de onde a pessoa veio, ja' marcado na grade. */
  sugerido?: number;
  aoFechar: () => void;
  aoVotar: (numero: number) => void;
}

export default function VotarModal({ projetos, sugerido, aoFechar, aoVotar }: Props) {
  const [escolhido, setEscolhido] = useState<number | null>(sugerido ?? null);
  const [passo, setPasso] = useState<Passo>('escolhendo');
  const [recusa, setRecusa] = useState<string | null>(null);

  // Enquanto a tela de votar esta' aberta, a pagina atras nao rola.
  useEffect(() => {
    const raiz = document.querySelector('.ar-raiz') as HTMLElement | null;
    const antes = raiz?.style.overflowY;
    if (raiz) raiz.style.overflowY = 'hidden';
    return () => { if (raiz) raiz.style.overflowY = antes ?? 'auto'; };
  }, []);

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && passo !== 'enviando' && passo !== 'pronto') aoFechar();
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [aoFechar, passo]);

  const projeto = projetos.find((p) => p.numero === escolhido) ?? null;

  async function confirmar() {
    if (!projeto?.id) { setRecusa('projeto_indisponivel'); setPasso('recusado'); return; }
    setPasso('enviando');
    const r = await votar(projeto.id);
    if (r.ok) {
      setPasso('pronto');
      aoVotar(projeto.numero);
      return;
    }
    if (r.motivo === 'ja_votou') aoVotar(0);
    setRecusa(r.motivo ?? 'falhou');
    setPasso('recusado');
  }

  return (
    <div className="ar-votacao" role="dialog" aria-modal="true" aria-label="Escolha o projeto">
      {passo === 'pronto' ? (
        <div className="ar-festa">
          {/* O certo e' desenhado por animacao de traco, e nao um emoji: ele
              termina de se desenhar no tempo de quem esta' olhando, e isso e'
              o que faz o momento parecer um momento. */}
          <svg className="ar-certo" viewBox="0 0 120 120" aria-hidden="true">
            <circle className="ar-certo-anel" cx="60" cy="60" r="52" />
            <path className="ar-certo-traco" d="M36 62 L53 79 L85 44" />
          </svg>
          <h2>Voto registrado</h2>
          <p>Seu voto está em <b>{projeto?.titulo}</b>.</p>
          <p className="ar-miudo">Cada aparelho vota uma vez só, e o voto não pode ser trocado.</p>
          <button type="button" className="ar-votar" onClick={aoFechar}>Fechar</button>
        </div>
      ) : (
        <>
          <header className="ar-votacao-topo">
            <div>
              <h2>Escolha o projeto</h2>
              <p>Um voto por aparelho, e ele não pode ser trocado depois.</p>
            </div>
            <button type="button" className="ar-fechar-votacao" onClick={aoFechar}
              aria-label="Fechar">×</button>
          </header>

          <div className="ar-grade-votos">
            {projetos.map((p) => (
              <button
                key={p.numero}
                type="button"
                className={p.numero === escolhido ? 'ar-opcao ar-marcada' : 'ar-opcao'}
                style={{ ['--ar-cor' as string]: p.cor }}
                aria-pressed={p.numero === escolhido}
                onClick={() => { setEscolhido(p.numero); setPasso('escolhendo'); }}
              >
                <span className="ar-opcao-foto ar-foto"
                  style={{ ['--foto' as string]: p.capa ? `url("${p.capa}")` : 'none' }}>
                  {p.capa && <img src={p.capa} alt="" loading="lazy" />}
                </span>
                <span className="ar-opcao-nome">{p.titulo}</span>
              </button>
            ))}
          </div>

          <footer className="ar-votacao-pe">
            {passo === 'recusado' && (
              <p className="ar-recusa">
                {recusa === 'ja_votou' ? 'Este aparelho já votou.'
                  : recusa === 'fora_da_janela' ? 'A votação não está aberta agora.'
                  : recusa === 'teto_da_rede' ? 'Muitos votos vieram desta rede em pouco tempo. Tente daqui a pouco.'
                  : 'Não deu para registrar. Tente de novo daqui a pouco.'}
              </p>
            )}

            {passo === 'confirmando' ? (
              <>
                <p className="ar-confirma">Confirmar o voto em <b>{projeto?.titulo}</b>?</p>
                <div className="ar-botoes">
                  <button type="button" className="ar-votar" onClick={() => void confirmar()}>
                    Sim, é esse
                  </button>
                  <button type="button" className="ar-desistir" onClick={() => setPasso('escolhendo')}>
                    Voltar
                  </button>
                </div>
              </>
            ) : (
              <button
                type="button"
                className="ar-votar"
                disabled={!escolhido || passo === 'enviando'}
                onClick={() => setPasso('confirmando')}
              >
                {passo === 'enviando' ? 'Registrando...'
                  : escolhido ? `Votar em ${projeto?.titulo}` : 'Escolha um projeto'}
              </button>
            )}
          </footer>
        </>
      )}
    </div>
  );
}
