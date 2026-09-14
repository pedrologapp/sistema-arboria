// ============================================================
// Moldura — o casco compartilhado das duas telas do site da Arena.
//
// Injeta o CSS uma vez so', pinta o fundo e segura o rodape'. Existe para a
// galeria e a sala do projeto nao repetirem o mesmo cabecalho, e para o dia em
// que este site sair do app: leva-se esta pasta inteira e mais nada.
// ============================================================
import { useEffect } from 'react';
import { CSS_ARENA } from './estiloArena';

const ID_ESTILO = 'ar-estilo';

/**
 * A Arena vive em dois enderecos e os caminhos internos mudam com ele.
 *
 * No endereco proprio (arenaarboria.escolaamadeus.com) ela ocupa a raiz: a
 * galeria e' "/" e um projeto e' "/p/7". Dentro do app da escola ela e' uma
 * rota entre outras: "/arenaarboria" e "/arenaarboria/p/7".
 *
 * Sem isto, o botao de voltar levaria para um endereco que nao existe naquele
 * dominio, e o link que uma equipe manda para a familia quebraria.
 */
export function noSiteProprio(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.hostname.startsWith('arenaarboria.');
}

/**
 * Volta a pagina ao topo.
 *
 * window.scrollTo NAO serve aqui: quem rola nao e' a janela, e' o container
 * .ar-raiz, que e' position:fixed com overflow proprio. Chamar a janela nao
 * fazia nada, e trocar de projeto mantinha a rolagem onde estava, no meio do
 * texto do projeto anterior.
 */
export function voltarAoTopo() {
  document.querySelector('.ar-raiz')?.scrollTo({ top: 0, behavior: 'auto' });
  window.scrollTo(0, 0);
}

export const caminhoGaleria = () => (noSiteProprio() ? '/' : '/arenaarboria');
export const caminhoProjeto = (numero: number) =>
  (noSiteProprio() ? `/p/${numero}` : `/arenaarboria/p/${numero}`);

export function Moldura({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (document.getElementById(ID_ESTILO)) return;
    const tag = document.createElement('style');
    tag.id = ID_ESTILO;
    tag.textContent = CSS_ARENA;
    document.head.appendChild(tag);
  }, []);

  useEffect(() => {
    const antes = document.title;
    return () => { document.title = antes; };
  }, []);

  return (
    <div className="ar-raiz" lang="pt-BR">
      <div className="ar-fundo" aria-hidden="true" />
      {children}
    </div>
  );
}

// O RODAPE SAIU por decisao do Fundador em 10/09. Fica registrado o que ele
// carregava, porque duas dessas coisas sao exigencia do parecer de Riscos e
// precisam voltar, em alguma forma, ANTES de o site ir ao ar: dizer que o
// responsavel pela publicacao e' o Centro Educacional Amadeus, e oferecer um
// caminho visivel para uma familia pedir a retirada de um projeto. A terceira,
// explicar o que e' a Arena, e' escolha editorial e pode ficar de fora.

export function Seta({ tamanho = 16 }: { tamanho?: number }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}
