// ============================================================
// estiloArena — o CSS do site publico da Arena, num bloco so'.
//
// POR QUE NAO E' TAILWIND. Esta pagina e' a unica do projeto que vive fora do
// tema do app: fundo proprio, tipografia propria, e um dia origem propria. Um
// bloco de CSS com prefixo 'ar-' nao colide com nada e viaja inteiro se o site
// for separado do app. Nada aqui vaza para o resto: todo seletor comeca em
// .ar-raiz.
//
// DUAS REGRAS DE DESENHO QUE NAO SAO ESTETICA:
//  1. A faixa fechada tem ALTURA FIXA. Os textos vao de 997 a 3840 caracteres:
//     se a faixa crescesse com o texto, quem escreveu mais ocuparia quatro
//     vezes mais tela, e a galeria criaria um podio sem ninguem decidir isso.
//  2. Nada abaixo de 12px, e o cinza mais escuro do mockup (#6B6A7E) subiu para
//     #8A8899. O original reprovava em contraste, e isto e' pagina publica.
// ============================================================

export const CSS_ARENA = `
.ar-raiz{
  --ar-bg:#08080C; --ar-ink:#F3F2F8; --ar-ink2:#A6A5B8; --ar-mut:#8A8899;
  --ar-prosa:#E6E5EE; --ar-gancho:#C9C8D6;
  --ar-line:rgba(255,255,255,0.09); --ar-line2:rgba(255,255,255,0.16);
  --ar-acc:#5EE0D0; --ar-acc-rgb:94,224,208;
  --ar-ease:cubic-bezier(.22,.61,.36,1);
  position:fixed; inset:0; overflow-y:auto; overflow-x:hidden;
  background:var(--ar-bg); color:var(--ar-ink);
  font-family:"SF Pro Display","Segoe UI",system-ui,-apple-system,Roboto,Helvetica,Arial,sans-serif;
  line-height:1.5; -webkit-font-smoothing:antialiased;
}
.ar-raiz *{box-sizing:border-box}
.ar-fundo{position:fixed;inset:0;z-index:0;pointer-events:none;
  background:
    radial-gradient(85% 55% at 12% -8%, rgba(var(--ar-acc-rgb),0.16), transparent 55%),
    radial-gradient(70% 55% at 100% 6%, rgba(167,139,250,0.10), transparent 60%);}
.ar-wrap{position:relative;z-index:1;max-width:1120px;margin:0 auto;padding:0 22px}

/* ---------------------------------------------------------------- topo */
.ar-topo{display:flex;align-items:center;justify-content:space-between;padding:22px 0;gap:16px}
.ar-marca{display:flex;align-items:center;gap:9px;text-decoration:none}
.ar-marca span{font-size:12px;letter-spacing:.24em;text-transform:uppercase;color:var(--ar-ink2);font-weight:600}
.ar-pill{display:inline-flex;align-items:center;gap:8px;font-size:12px;color:var(--ar-ink2);
  border:1px solid var(--ar-line2);border-radius:99px;padding:7px 14px;white-space:nowrap}
.ar-pill i{width:7px;height:7px;border-radius:50%;background:var(--ar-acc);animation:ar-pulse 2s infinite}
@keyframes ar-pulse{
  0%{box-shadow:0 0 0 0 rgba(var(--ar-acc-rgb),.5)}
  70%{box-shadow:0 0 0 7px rgba(var(--ar-acc-rgb),0)}
  100%{box-shadow:0 0 0 0 rgba(var(--ar-acc-rgb),0)}}

/* ---------------------------------------------------------------- hero */
.ar-hero{padding:34px 0 26px;text-align:center}
.ar-sobrenome{font-size:12.5px;letter-spacing:.42em;text-transform:uppercase;color:var(--ar-acc);font-weight:700}
.ar-wordmark{font-weight:800;letter-spacing:-.055em;line-height:.82;margin:16px 0 0;
  font-size:clamp(58px,17vw,220px);
  filter:drop-shadow(0 12px 80px rgba(var(--ar-acc-rgb),0.28))}
.ar-wordmark b{display:block;font-weight:800}
.ar-wordmark b:last-child{color:var(--ar-acc)}
.ar-tagline{font-size:clamp(15px,2vw,20px);color:var(--ar-ink2);max-width:540px;margin:22px auto 0}

/* ------------------------------------------------------------- galeria */
.ar-cabecalho{display:flex;align-items:baseline;justify-content:space-between;gap:16px;margin:46px 0 20px}
.ar-cabecalho h2{font-weight:800;letter-spacing:-.02em;font-size:23px;margin:0}
.ar-cabecalho span{font-size:12.5px;color:var(--ar-mut)}
.ar-galeria{display:flex;flex-direction:column;gap:22px;padding-bottom:8px}

.ar-faixa{display:flex;align-items:stretch;border-radius:24px;overflow:hidden;
  border:1px solid var(--ar-line);background:rgba(255,255,255,0.025);
  text-decoration:none;color:inherit;height:300px;
  transition:border-color .3s var(--ar-ease),transform .3s var(--ar-ease)}
.ar-faixa:nth-child(even){flex-direction:row-reverse}
.ar-faixa:hover{border-color:rgba(var(--ar-cor),.45)}
.ar-faixa:focus-visible{outline:2px solid rgb(var(--ar-cor));outline-offset:2px}
/* ------------------------------------------------- foto sem corte
   As fotos chegam em proporcoes diferentes: retrato de celular, print de tela
   deitado, colagem quadrada. Cortar perde pedaco do projeto, e deixar barra
   preta faz cada faixa parecer de um tamanho. A saida e' a mesma foto duas
   vezes: uma ampliada e desfocada preenchendo o fundo, e a foto inteira por
   cima, sem corte. O quadro fica sempre do mesmo tamanho e nada se perde. */
.ar-foto{position:relative;overflow:hidden;background:#0A0A11}
.ar-foto::before{content:'';position:absolute;inset:-10%;
  background-image:var(--foto);background-size:cover;background-position:center;
  filter:blur(28px) saturate(.8) brightness(.5)}
.ar-foto > img,.ar-foto > video{position:absolute;inset:0;z-index:1;
  width:100%;height:100%;object-fit:contain;display:block}

.ar-capa{flex:0 0 46%;
  background:linear-gradient(160deg, rgba(var(--ar-cor),.14), #0A0A11)}
.ar-capa img{transition:transform .5s var(--ar-ease)}
.ar-faixa:hover .ar-capa img{transform:scale(1.03)}
/* O numero do projeto saiu da tela por decisao do Fundador em 10/09. Ele
   continua existindo no endereco de cada projeto, que precisa ser estavel, mas
   nao aparece mais em lugar nenhum: numero na tela era lido como colocacao. */
.ar-corpo{flex:1 1 auto;display:flex;flex-direction:column;justify-content:center;
  gap:12px;padding:40px;min-width:0}
.ar-titulo{margin:0;font-size:clamp(26px,3vw,40px);font-weight:800;letter-spacing:-.02em;
  line-height:1.1;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.ar-gancho{margin:0;font-size:16.5px;color:var(--ar-gancho);max-width:46ch;
  display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.ar-acao{display:flex;align-items:center;justify-content:space-between;gap:14px;height:44px;margin-top:2px}
.ar-acao b{font-size:14.5px;font-weight:800;color:var(--ar-ink);display:inline-flex;align-items:center;gap:8px}
.ar-acao b svg{transition:transform .3s var(--ar-ease)}
.ar-faixa:hover .ar-acao b svg{transform:translateX(4px)}
/* O selo mora no canto que a votacao vai ocupar na etapa 2. Slot com conteudo
   util nao parece buraco, e a troca depois nao mexe na altura da linha. */
.ar-selo{display:inline-flex;align-items:center;gap:7px;font-size:12px;color:var(--ar-ink2);
  border:1px solid var(--ar-line2);border-radius:99px;padding:6px 12px;white-space:nowrap}

/* ------------------------------------------------------ sala do projeto */
.ar-barra{position:sticky;top:0;z-index:5;height:56px;display:flex;align-items:center;
  justify-content:space-between;gap:16px;padding:0 22px;
  background:rgba(8,8,12,.78);backdrop-filter:blur(12px);
  border-bottom:1px solid var(--ar-line)}
.ar-barra a{color:var(--ar-ink2);text-decoration:none;font-size:13px;display:inline-flex;
  align-items:center;gap:8px}
.ar-barra a:hover{color:var(--ar-ink)}
.ar-barra-marca{font-size:12px;letter-spacing:.24em;text-transform:uppercase;
  color:var(--ar-mut);font-weight:600}
/* Alvo de 44px de altura, que e' o minimo para o dedo, com a area de toque
   maior que o texto. A seta anda para tras no hover, na direcao do gesto. */
.ar-voltar{min-height:44px;padding:0 14px 0 10px;margin-left:-10px;border-radius:12px;
  font-weight:700;font-size:13.5px}
.ar-voltar:hover{background:rgba(255,255,255,0.06)}
.ar-voltar svg{transition:transform .3s var(--ar-ease)}
.ar-voltar:hover svg{transform:translateX(-3px)}
.ar-voltar:focus-visible{outline:2px solid var(--ar-acc);outline-offset:2px}
.ar-sala{max-width:900px;margin:0 auto;padding:34px 22px 80px}
.ar-sala h1{margin:14px 0 0;font-size:clamp(30px,5vw,52px);font-weight:800;letter-spacing:-.03em;line-height:1.05}
.ar-sala .ar-gancho{font-size:19px;-webkit-line-clamp:unset;display:block;max-width:60ch;margin-top:16px}
.ar-bloco{margin-top:40px}
.ar-rotulo{font-size:12px;letter-spacing:.24em;text-transform:uppercase;font-weight:700;
  color:rgb(var(--ar-cor));margin:0 0 14px;display:flex;align-items:center;gap:10px}
.ar-rotulo b{font-weight:600;letter-spacing:.14em;color:var(--ar-mut)}
.ar-rotulo b::before{content:'·';margin-right:10px}
.ar-fotos{position:relative}
.ar-midia{width:100%;aspect-ratio:16/9;border-radius:18px;
  border:1px solid var(--ar-line)}
/* O escurecido e' mais forte do que o de antes, e isso nao e' gosto: a capa
   costuma ser uma peça colorida e cheia de texto, e o play sumia dentro dela. */
.ar-play{position:absolute;inset:0;z-index:2;display:flex;flex-direction:column;gap:14px;
  align-items:center;justify-content:center;border:0;cursor:pointer;color:#0a0a10;
  background:radial-gradient(60% 60% at 50% 50%, rgba(6,6,10,.62), rgba(6,6,10,.34));
  transition:background .3s var(--ar-ease)}
.ar-play:hover{background:radial-gradient(60% 60% at 50% 50%, rgba(6,6,10,.70), rgba(6,6,10,.42))}
.ar-play i{width:84px;height:84px;border-radius:50%;background:var(--ar-acc);
  display:flex;align-items:center;justify-content:center;padding-left:5px;
  box-shadow:0 10px 50px rgba(var(--ar-acc-rgb),.55);
  transition:transform .3s var(--ar-ease)}
.ar-play:hover i{transform:scale(1.06)}
.ar-play span{font-size:14px;font-weight:800;letter-spacing:.02em;color:var(--ar-ink);
  text-shadow:0 2px 14px rgba(0,0,0,.7)}
.ar-play:focus-visible{outline:2px solid var(--ar-acc);outline-offset:-4px}
/* O anel de carregamento, por cima da capa. Sem ele, um arquivo pesado vira um
   retangulo preto e a pessoa acha que quebrou. */
.ar-progresso{position:absolute;inset:0;z-index:3;display:flex;flex-direction:column;
  align-items:center;justify-content:center;gap:16px;pointer-events:none;
  background:radial-gradient(60% 60% at 50% 50%, rgba(6,6,10,.66), rgba(6,6,10,.38))}
.ar-progresso p{margin:0;font-size:13.5px;font-weight:700;color:var(--ar-ink);
  text-shadow:0 2px 14px rgba(0,0,0,.7)}
/* O anel e' um disco pintado por conic-gradient ate' a fracao --p, com um furo
   no meio feito por mascara. Sem imagem, sem biblioteca. */
.ar-medidor{position:relative;width:92px;height:92px;display:grid;place-items:center}
/* O numero e' IRMAO do anel, e nao filho: a mascara que abre o furo no meio
   apagaria qualquer coisa desenhada dentro dele. */
.ar-anel{position:absolute;inset:0;border-radius:50%;
  background:conic-gradient(var(--ar-acc) calc(var(--p) * 1%), rgba(255,255,255,.16) 0);
  -webkit-mask:radial-gradient(circle, transparent 0 32px, #000 33px);
  mask:radial-gradient(circle, transparent 0 32px, #000 33px);
  transition:background .25s linear}
.ar-medidor span{position:relative;z-index:1;font-size:15px;font-weight:800;
  color:var(--ar-ink);text-shadow:0 2px 12px rgba(0,0,0,.8)}
/* Enquanto nao da' para calcular fracao, o anel gira em vez de mentir numero. */
.ar-girando{animation:ar-gira 1.1s linear infinite;
  background:conic-gradient(var(--ar-acc) 0 25%, rgba(255,255,255,.16) 0)}
@keyframes ar-gira{to{transform:rotate(360deg)}}
/* O filete e' o que diz "isto e' fala deles", sem aspas e sem assinatura. */
.ar-prosa{max-width:64ch;border-left:2px solid rgb(var(--ar-cor));padding-left:20px}
.ar-prosa p{margin:0 0 18px;font-size:17.5px;line-height:1.75;color:var(--ar-prosa)}
.ar-prosa p:last-child{margin-bottom:0}
/* A abertura maior e' o degrau que impede o bloco de parecer parede. */
.ar-prosa .ar-abertura{font-size:20.5px;line-height:1.65;color:var(--ar-ink);margin-bottom:22px}
/* A palavra realcada usa o verde da Arena. Peso 700 e nao 800: o destaque
   precisa puxar o olho sem transformar a frase num aviso. E sem sublinhado,
   senao passa a parecer link e a pessoa tenta clicar. */
.ar-chave{color:var(--ar-acc);font-weight:700;text-decoration:none}
.ar-grade{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.ar-grade button{padding:0;border:1px solid var(--ar-line);border-radius:12px;
  cursor:pointer;aspect-ratio:4/3}
.ar-fecho{margin-top:52px;border:1px solid var(--ar-line2);border-radius:22px;padding:30px;
  text-align:center;background:rgba(255,255,255,0.02)}
.ar-fecho p{margin:0;font-size:clamp(17px,2.4vw,22px);color:var(--ar-ink);font-weight:700}
.ar-fecho .ar-aviso{margin-top:10px;font-size:14px;font-weight:500;color:var(--ar-ink2)}
.ar-votar{margin-top:18px;border:0;border-radius:13px;padding:15px 28px;cursor:pointer;
  font-size:15px;font-weight:800;color:#0a0a10;background:var(--ar-acc);min-height:48px;
  transition:transform .2s var(--ar-ease),filter .2s var(--ar-ease)}
.ar-votar:hover{filter:brightness(1.08);transform:translateY(-1px)}
.ar-votar:focus-visible{outline:2px solid var(--ar-ink);outline-offset:3px}
.ar-desistir{margin-top:18px;border:1px solid var(--ar-line2);border-radius:13px;
  padding:15px 22px;cursor:pointer;font-size:15px;font-weight:700;min-height:48px;
  color:var(--ar-ink2);background:transparent}
.ar-desistir:hover{color:var(--ar-ink)}
.ar-botoes{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
.ar-passos{display:flex;justify-content:space-between;gap:12px;margin-top:28px}
.ar-passo{flex:1 1 0;min-width:0;display:flex;align-items:center;gap:12px;min-height:56px;
  color:var(--ar-ink2);text-decoration:none;
  border:1px solid var(--ar-line);border-radius:16px;padding:10px 14px;
  background:rgba(255,255,255,0.02);
  transition:border-color .25s var(--ar-ease),background .25s var(--ar-ease)}
.ar-passo:hover{border-color:rgba(var(--ar-cor),.5);background:rgba(255,255,255,0.045)}
.ar-passo:focus-visible{outline:2px solid rgb(var(--ar-cor));outline-offset:2px}
/* A seta num disco proprio: e' o que diferencia "andar para o lado" de um link
   de texto qualquer, e da' o alvo de toque sem depender do tamanho da frase. */
.ar-passo i{flex:0 0 auto;width:34px;height:34px;border-radius:50%;
  display:flex;align-items:center;justify-content:center;
  background:rgba(var(--ar-cor),.14);color:rgb(var(--ar-cor));
  transition:transform .25s var(--ar-ease)}
.ar-volta{transform:rotate(180deg)}
.ar-passo:hover i{transform:translateX(3px)}
.ar-passo:hover .ar-volta{transform:rotate(180deg) translateX(3px)}
.ar-passo span{min-width:0;display:flex;flex-direction:column;gap:2px;
  font-size:14px;font-weight:700;color:var(--ar-ink);
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ar-passo span b{font-size:10.5px;font-weight:700;letter-spacing:.2em;
  text-transform:uppercase;color:var(--ar-mut)}
.ar-passo.ar-fim{justify-content:flex-end;text-align:right}
.ar-passo.ar-fim span{align-items:flex-end}
.ar-sobre{margin-top:40px;color:var(--ar-mut);font-size:13.5px;max-width:62ch;line-height:1.7}

/* ------------------------------------------------------------- a votacao */
.ar-votacao{position:fixed;inset:0;z-index:70;overflow-y:auto;
  background:rgba(6,6,10,.94);backdrop-filter:blur(14px);
  display:flex;flex-direction:column;gap:22px;padding:26px 22px 30px;
  animation:ar-sobe .35s var(--ar-ease)}
@keyframes ar-sobe{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
.ar-votacao-topo{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;
  max-width:1120px;width:100%;margin:0 auto}
.ar-votacao-topo h2{margin:0;font-size:clamp(23px,4vw,34px);font-weight:800;letter-spacing:-.02em}
.ar-votacao-topo p{margin:8px 0 0;font-size:14px;color:var(--ar-ink2)}
.ar-fechar-votacao{flex:0 0 auto;width:44px;height:44px;border-radius:50%;cursor:pointer;
  border:1px solid var(--ar-line2);background:transparent;color:var(--ar-ink);font-size:22px}
.ar-fechar-votacao:hover{background:rgba(255,255,255,.06)}

.ar-grade-votos{display:grid;gap:14px;max-width:1120px;width:100%;margin:0 auto;
  grid-template-columns:repeat(auto-fill,minmax(190px,1fr))}
.ar-opcao{padding:0;border:2px solid var(--ar-line);border-radius:18px;overflow:hidden;
  background:rgba(255,255,255,.025);cursor:pointer;text-align:left;
  display:flex;flex-direction:column;
  transition:border-color .25s var(--ar-ease),transform .25s var(--ar-ease)}
.ar-opcao:hover{border-color:rgba(var(--ar-cor),.55);transform:translateY(-2px)}
.ar-opcao:focus-visible{outline:2px solid rgb(var(--ar-cor));outline-offset:2px}
/* A marcada muda BORDA e ganha um sinal, e nao so' cor: cor sozinha nao serve
   para quem nao a distingue. */
.ar-marcada{border-color:rgb(var(--ar-cor))}
.ar-opcao-foto{position:relative;display:block;width:100%;aspect-ratio:4/3;overflow:hidden}
.ar-marcada .ar-opcao-foto::after{content:'\\2713';position:absolute;top:10px;right:10px;z-index:2;
  width:30px;height:30px;border-radius:50%;background:rgb(var(--ar-cor));color:#0a0a10;
  display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:800}
.ar-opcao-nome{display:block;padding:12px 14px 14px;font-size:14.5px;font-weight:800;
  color:var(--ar-ink);line-height:1.25}

.ar-votacao-pe{max-width:1120px;width:100%;margin:0 auto;text-align:center;
  display:flex;flex-direction:column;align-items:center;gap:4px}
.ar-votacao-pe .ar-votar:disabled{opacity:.4;cursor:not-allowed;transform:none;filter:none}
.ar-confirma{margin:0;font-size:17px;font-weight:700;color:var(--ar-ink)}
.ar-recusa{margin:0 0 6px;font-size:14px;color:#F5B84B;max-width:52ch}

/* ------------------------------------------------------------ a comemoracao */
.ar-festa{margin:auto;text-align:center;display:flex;flex-direction:column;align-items:center;
  gap:10px;animation:ar-brota .45s var(--ar-ease)}
@keyframes ar-brota{from{opacity:0;transform:scale(.9)}to{opacity:1;transform:none}}
.ar-festa h2{margin:10px 0 0;font-size:clamp(26px,5vw,40px);font-weight:800;letter-spacing:-.02em}
.ar-festa p{margin:0;font-size:16px;color:var(--ar-ink2);max-width:40ch}
.ar-festa .ar-miudo{font-size:13px;color:var(--ar-mut);margin-top:6px}
.ar-certo{width:132px;height:132px}
.ar-certo circle,.ar-certo path{fill:none;stroke-linecap:round;stroke-linejoin:round}
.ar-certo-anel{stroke:var(--ar-acc);stroke-width:4;opacity:.35;
  stroke-dasharray:327;stroke-dashoffset:327;
  animation:ar-traco .7s var(--ar-ease) forwards}
.ar-certo-traco{stroke:var(--ar-acc);stroke-width:9;
  stroke-dasharray:80;stroke-dashoffset:80;
  animation:ar-traco .45s .55s var(--ar-ease) forwards}
@keyframes ar-traco{to{stroke-dashoffset:0}}

@media (max-width:860px){
  .ar-grade-votos{grid-template-columns:repeat(2,1fr);gap:10px}
  .ar-opcao-nome{padding:10px;font-size:13px}
  .ar-votacao{padding:18px 16px 24px;gap:18px}
  .ar-certo{width:108px;height:108px}
}

/* ---------------------------------------------------------------- visor */
.ar-visor{position:fixed;inset:0;z-index:60;background:rgba(4,4,8,.94);
  display:flex;align-items:center;justify-content:center;padding:44px 64px}
.ar-visor img{max-width:100%;max-height:100%;object-fit:contain;border-radius:10px}
.ar-visor button{position:absolute;border:1px solid var(--ar-line2);background:rgba(12,12,18,.7);
  color:var(--ar-ink);border-radius:50%;width:46px;height:46px;font-size:20px;cursor:pointer;
  display:flex;align-items:center;justify-content:center}
.ar-visor .ar-fechar{top:20px;right:20px}
.ar-visor .ar-ant{left:12px}
.ar-visor .ar-prox{right:12px}
.ar-visor .ar-conta{position:absolute;bottom:20px;left:0;right:0;text-align:center;
  font-size:12.5px;color:var(--ar-ink2)}

/* ---------------------------------------------------------------- rodape */
.ar-rodape{margin-top:60px;padding:26px 0 44px;border-top:1px solid var(--ar-line);
  color:var(--ar-mut);font-size:12.5px;line-height:1.7}

/* -------------------------------------------------------------- esqueleto */
.ar-esqueleto{height:300px;border-radius:24px;border:1px solid var(--ar-line);
  background:linear-gradient(100deg,rgba(255,255,255,.02),rgba(255,255,255,.06),rgba(255,255,255,.02));
  background-size:220% 100%;animation:ar-brilho 1.5s infinite linear}
@keyframes ar-brilho{from{background-position:180% 0}to{background-position:-40% 0}}

/* --------------------------------------------------------------- celular */
@media (max-width:860px){
  .ar-faixa,.ar-faixa:nth-child(even){flex-direction:column;height:auto}
  .ar-capa{flex:0 0 auto;width:100%;aspect-ratio:16/10}
  .ar-corpo{padding:20px;gap:10px}
  .ar-titulo{font-size:22px}
  .ar-gancho{font-size:15.5px;-webkit-line-clamp:2}
  .ar-acao{flex-wrap:wrap;height:auto;gap:10px}
  /* No celular a marca toma a largura toda. E' a unica coisa na primeira tela,
     entao ela e' a primeira tela. O 25vw faz "Arboria", que e' a palavra mais
     longa, encostar nas duas bordas sem estourar. */
  .ar-hero{padding:10px 0 16px}
  .ar-wordmark{font-size:25vw;line-height:.86;margin-top:6px}
  .ar-tagline{margin-top:16px}
  .ar-grade{display:flex;gap:12px;overflow-x:auto;scroll-snap-type:x mandatory;
    padding-bottom:6px;padding-right:34px;-webkit-overflow-scrolling:touch;
    scrollbar-width:none}
  .ar-grade::-webkit-scrollbar{display:none}
  /* 82% e alinhamento no comeco: a foto seguinte fica sempre espiando na
     direita, que e' o que ensina que o carrossel anda. */
  .ar-grade button{flex:0 0 82%;scroll-snap-align:start}
  /* Degrade fixo na borda direita. Some com a barra de rolagem e devolve o
     aviso de "tem mais" por imagem, que e' o que funciona no toque. */
  .ar-fotos::after{content:'';position:absolute;top:0;right:0;bottom:6px;width:44px;
    pointer-events:none;
    background:linear-gradient(90deg,rgba(8,8,12,0),rgba(8,8,12,.92))}
  .ar-visor{padding:16px}
  /* No celular eles continuam LADO A LADO. Empilhados, viravam duas linhas
     logo abaixo do botao de votar e pareciam parte dele. O nome do projeto
     encolhe e corta; a seta e o rotulo seguram o sentido. */
  .ar-passos{gap:10px}
  .ar-passo{padding:8px 10px;min-height:52px;gap:9px}
  .ar-passo i{width:30px;height:30px}
  .ar-passo span{font-size:12.5px}
  .ar-passo span b{font-size:9.5px;letter-spacing:.16em}
  .ar-fecho{padding:22px}
}

@media (prefers-reduced-motion:reduce){
  .ar-raiz *,.ar-raiz *::before,.ar-raiz *::after{
    animation-duration:.001ms !important;animation-iteration-count:1 !important;
    transition-duration:.001ms !important}
}
`;
