// ============================================================
// ArenaProjeto (/arenaarboria/p/:numero) — a sala de um projeto.
//
// POR QUE E' UMA ROTA E NAO UM ACORDEAO NA FAIXA. Tres razoes, nesta ordem:
// abrir dentro da lista devolveria a altura variavel que a faixa fixa existe
// para evitar; cada equipe precisa de um endereco proprio para mandar a
// familia; e a votacao da etapa 2 se pendura no endereco do projeto.
//
// A ORDEM DOS BLOCOS E' A HIERARQUIA: video, fotos, texto. O que se ve' vem
// primeiro porque e' a prova de que a coisa funciona; o texto explica depois.
// Ordem definida pelo Fundador em 10/09. O texto vem do jeito que a equipe
// escreveu, com o rotulo "Nas palavras da equipe" e um filete na cor do
// projeto, que e' o que diz que aquilo e' fala deles e nao texto do site.
//
// O PROJETO SEM VIDEO nao ganha caixa vazia nem aviso de falta: a capa grande
// ocupa o lugar e ninguem percebe ausencia nenhuma. Ausencia desenhada vira
// demerito, e nenhum projeto aqui vale menos que outro.
// ============================================================
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  carregarArena, votar, votoGuardado, guardarVoto, type ProjetoArena,
} from './fonteArena';
import { Moldura, caminhoGaleria, caminhoProjeto } from './Moldura';
import { DESTAQUES, MAX_DESTAQUES } from './destaques';

/**
 * Quebra um paragrafo realcando a PRIMEIRA aparicao de cada termo. O conjunto
 * `usados` viaja entre paragrafos de proposito: o termo que ja' foi realcado no
 * primeiro paragrafo nao volta a acender no quarto.
 */
function comDestaques(texto: string, termos: string[], usados: Set<string>) {
  const pendentes = termos.filter((t) => !usados.has(t.toLowerCase()));
  if (pendentes.length === 0) return texto;

  // Termo maior primeiro: assim "energia limpa" ganha de "energia".
  const ordenados = [...pendentes].sort((a, b) => b.length - a.length);
  const escapado = ordenados.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  // As bordas sao lookarounds de LETRA, e nao \b. Com acento, \b se perde: em
  // "história" ele acharia "ia" no fim da palavra e pintaria meia silaba de
  // verde. Aqui um termo so' casa quando nao tem letra grudada nos dois lados.
  const regra = new RegExp(`(?<!\\p{L})(${escapado.join('|')})(?!\\p{L})`, 'iu');

  const pedacos: Array<string | { chave: string }> = [];
  let resto = texto;
  let guarda = 0;
  while (guarda++ < MAX_DESTAQUES * 2) {
    const achou = resto.match(regra);
    if (!achou || achou.index === undefined) break;
    const termo = achou[0];
    if (usados.has(termo.toLowerCase())) break;
    usados.add(termo.toLowerCase());
    pedacos.push(resto.slice(0, achou.index), { chave: termo });
    resto = resto.slice(achou.index + termo.length);
  }
  pedacos.push(resto);

  return pedacos.map((p, i) =>
    typeof p === 'string'
      ? <span key={i}>{p}</span>
      : <b key={i} className="ar-chave">{p.chave}</b>);
}

/** rascunho: ainda nao clicou | confirmando: perguntou se tem certeza */
type PassoVoto = 'rascunho' | 'confirmando' | 'enviando' | 'pronto' | 'recusado';

export default function ArenaProjeto() {
  const { numero } = useParams<{ numero: string }>();
  const [projetos, setProjetos] = useState<ProjetoArena[] | null>(null);
  const [votacaoAberta, setVotacaoAberta] = useState(false);
  const [erro, setErro] = useState(false);
  const [tocando, setTocando] = useState(false);
  const [quadroPronto, setQuadroPronto] = useState(false);
  const refVideo = useRef<HTMLVideoElement | null>(null);
  const [progresso, setProgresso] = useState(0);
  const [visor, setVisor] = useState<number | null>(null);
  const [passo, setPasso] = useState<PassoVoto>('rascunho');
  const [recusa, setRecusa] = useState<string | null>(null);
  const [votadoEm, setVotadoEm] = useState<number | null>(votoGuardado());

  useEffect(() => {
    let vivo = true;
    carregarArena()
      .then(({ projetos: l, votacao }) => {
        if (!vivo) return;
        setProjetos(l);
        setVotacaoAberta(votacao.aberta);
      })
      .catch(() => { if (vivo) setErro(true); });
    return () => { vivo = false; };
  }, []);

  const alvo = Number(numero);
  const projeto = projetos?.find((p) => p.numero === alvo) ?? null;
  const indice = projetos && projeto ? projetos.indexOf(projeto) : -1;
  const anterior = projetos && indice > 0 ? projetos[indice - 1] : null;
  const proximo = projetos && indice >= 0 && indice < projetos.length - 1 ? projetos[indice + 1] : null;

  useEffect(() => {
    if (projeto) document.title = `${projeto.titulo} · Arena Arboria`;
  }, [projeto]);

  // Trocar de projeto pelas setas do rodape' precisa recomecar a sala: sem
  // isto o video do projeto anterior continuaria montado no proximo.
  useEffect(() => {
    setTocando(false); setQuadroPronto(false); setProgresso(0);
    setVisor(null); window.scrollTo(0, 0);
    setPasso('rascunho'); setRecusa(null);
  }, [numero]);

  async function confirmarVoto(projeto: ProjetoArena) {
    if (!projeto.id) { setRecusa('projeto_indisponivel'); setPasso('recusado'); return; }
    setPasso('enviando');
    const r = await votar(projeto.id);
    if (r.ok) {
      guardarVoto(projeto.numero);
      setVotadoEm(projeto.numero);
      setPasso('pronto');
      return;
    }
    // 'ja_votou' nao e' erro: e' a trava funcionando. Guarda 0, e nao o numero
    // deste projeto, porque o voto anterior pode ter sido em outro.
    if (r.motivo === 'ja_votou') { guardarVoto(0); setVotadoEm(0); }
    setRecusa(r.motivo ?? 'falhou');
    setPasso('recusado');
  }

  const fechar = useCallback(() => setVisor(null), []);

  useEffect(() => {
    if (visor === null || !projeto) return;
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') fechar();
      if (e.key === 'ArrowRight') setVisor((v) => (v === null ? v : (v + 1) % projeto.portfolio.length));
      if (e.key === 'ArrowLeft') setVisor((v) => (v === null ? v : (v - 1 + projeto.portfolio.length) % projeto.portfolio.length));
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [visor, projeto, fechar]);

  if (erro || (projetos && !projeto)) {
    return (
      <Moldura>
        <div className="ar-sala">
          <h1 style={{ fontSize: 28 }}>Projeto não encontrado</h1>
          <p style={{ color: '#A6A5B8', marginTop: 14 }}>
            <Link to={caminhoGaleria()} style={{ color: '#5EE0D0' }}>Voltar para a galeria</Link>
          </p>
        </div>
      </Moldura>
    );
  }

  if (!projeto) {
    return (
      <Moldura>
        <div className="ar-sala" aria-busy="true">
          <div className="ar-esqueleto" style={{ height: 160, borderRadius: 18 }} />
        </div>
      </Moldura>
    );
  }


  return (
    <Moldura>
      <div style={{ ['--ar-cor' as string]: projeto.cor }}>
        {/* Botao de voltar no canto esquerdo. Quem chega por link direto nao
            passou pela galeria e precisa de uma porta visivel para ela. */}
        <nav className="ar-barra">
          <Link to={caminhoGaleria()} className="ar-voltar">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M19 12H5M11 18l-6-6 6-6" />
            </svg>
            Voltar
          </Link>
          <span className="ar-barra-marca">Arena Arboria</span>
        </nav>

        <article className="ar-sala">
          <h1>{projeto.titulo}</h1>
          <p className="ar-gancho">{projeto.gancho}</p>

          {projeto.video ? (
            <div className="ar-bloco">
              {/* O bloco do video era o unico sem rotulo, e por isso ninguem
                  entendia que aquilo ali e' um video e nao uma foto grande.
                  Os outros dois blocos ja' se apresentam; este passa a fazer
                  o mesmo. */}
              <p className="ar-rotulo">O projeto funcionando<b>Vídeo</b></p>
              <div className="ar-midia ar-foto"
                style={{ ['--foto' as string]: projeto.capa ? `url("${projeto.capa}")` : 'none' }}>
                {/* O VIDEO E' MONTADO JA' NA ABERTURA DA PAGINA, e nao no
                    clique. Com preload de metadados, o navegador ja' busca o
                    cabecalho e o primeiro trecho enquanto a pessoa le' o
                    titulo. Quando ela toca no play, o video comeca do ponto em
                    que ja' esta', em vez de comecar a pensar naquele momento.
                    A capa segue por cima ate' o primeiro quadro existir. */}
                <video
                  ref={refVideo}
                  src={projeto.video}
                  poster={projeto.capa ?? undefined}
                  controls={tocando}
                  playsInline
                  preload="metadata"
                  // O quadro so' e' dado por pronto quando o navegador diz que
                  // consegue TOCAR, e nao quando o primeiro quadro existe. A
                  // diferenca importa: com o primeiro quadro so', o video
                  // comecaria e travaria em seguida.
                  onCanPlay={() => setQuadroPronto(true)}
                  onProgress={() => {
                    const v = refVideo.current;
                    if (!v || !v.buffered.length || !isFinite(v.duration) || v.duration === 0) return;
                    const fim = v.buffered.end(v.buffered.length - 1);
                    setProgresso(Math.min(100, Math.round((fim / v.duration) * 100)));
                  }}
                />
                {(!tocando || !quadroPronto) && projeto.capa && (
                  <img src={projeto.capa} alt="" />
                )}
                {!tocando && (
                  <button type="button" className="ar-play"
                    onClick={() => {
                      setTocando(true);
                      // O play e' pedido no codigo, e nao pelo atributo
                      // autoPlay: com som o navegador recusa autoplay, e o
                      // atributo so' serviria para a pessoa achar que travou.
                      void refVideo.current?.play().catch(() => { /* recusado */ });
                    }}
                    aria-label={`Assistir ao vídeo do projeto ${projeto.titulo}`}>
                    <i>
                      <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </i>
                    <span>Assistir ao vídeo</span>
                  </button>
                )}
                {/* O ANEL DE CARREGAMENTO. A porcentagem e' quanto do video ja'
                    esta' na memoria do navegador, e nao um relogio inventado.
                    Quando o arquivo nao informa a duracao, nao ha' como calcular
                    fracao: nesse caso o anel gira sem numero, em vez de mentir
                    uma porcentagem. */}
                {tocando && !quadroPronto && (
                  <div className="ar-progresso" role="status" aria-live="polite">
                    <div className="ar-medidor">
                      <div className={progresso > 0 ? 'ar-anel' : 'ar-anel ar-girando'}
                        style={{ ['--p' as string]: String(progresso) }} />
                      {progresso > 0 && <span>{progresso}%</span>}
                    </div>
                    <p>Carregando o vídeo</p>
                  </div>
                )}
              </div>
              <p style={{ color: '#8A8899', fontSize: 13, marginTop: 12, maxWidth: '62ch' }}>
                O que o vídeo mostra está descrito no texto abaixo, escrito pela
                própria equipe.
              </p>
            </div>
          ) : projeto.capa ? (
            <div className="ar-bloco">
              <div className="ar-midia ar-foto"
                style={{ aspectRatio: '16 / 10', ['--foto' as string]: `url("${projeto.capa}")` }}>
                <img src={projeto.capa} alt={`Foto principal do projeto ${projeto.titulo}`} />
              </div>
            </div>
          ) : null}

          {projeto.portfolio.length > 0 && (
            <div className="ar-bloco">
              <p className="ar-rotulo">
                O projeto por dentro
                <b>{projeto.portfolio.length} fotos</b>
              </p>
              {/* No celular isto vira carrossel. A foto seguinte fica meio
                  visivel e a borda ganha um degrade: sao os dois sinais de que
                  ha' mais coisa para o lado, sem precisar escrever "arraste". */}
              <div className="ar-fotos">
                <div className="ar-grade">
                  {projeto.portfolio.map((foto, i) => (
                    <button key={foto} type="button" onClick={() => setVisor(i)}
                      className="ar-foto"
                      style={{ ['--foto' as string]: `url("${foto}")` }}
                      aria-label={`Abrir a foto ${i + 1} de ${projeto.portfolio.length}`}>
                      <img src={foto} alt="" loading="lazy" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="ar-bloco">
            <p className="ar-rotulo">Nas palavras da equipe</p>
            {/* O primeiro paragrafo entra maior. E' o que tira do texto a cara
                de parede: o olho tem por onde comecar, e o resto respira. */}
            <div className="ar-prosa">
              {(() => {
                const termos = (DESTAQUES[projeto.numero] ?? []).slice(0, MAX_DESTAQUES);
                const usados = new Set<string>();
                return projeto.paragrafos.map((par, i) => (
                  <p key={i} className={i === 0 ? 'ar-abertura' : undefined}>
                    {comDestaques(par, termos, usados)}
                  </p>
                ));
              })()}
            </div>
          </div>

          {/* A caixa de fecho e' onde o voto entra na etapa 2. Hoje ela fecha a
              leitura com a pergunta do site; amanha a mesma caixa, mesma borda
              e mesmo espaco, recebe o campo de e-mail. */}
          <div className="ar-fecho">
            {!votacaoAberta && <p>Vote no seu projeto preferido.</p>}

            {/* Logo depois de votar quem fala e' o agradecimento, mais abaixo.
                Esta linha e' para quem VOLTA ao projeto em que ja' votou. */}
            {votacaoAberta && votadoEm === projeto.numero && passo !== 'pronto' && (
              <p>Seu voto está neste projeto.</p>
            )}

            {/* Quem ja' votou precisa ver isso em QUALQUER projeto que abrir,
                senao fica procurando o botao que nao vai aparecer. O 0 e' o
                caso em que o banco disse que ja' havia voto mas nao sabemos
                em qual projeto: por isso a frase nao nomeia nenhum. */}
            {votacaoAberta && votadoEm !== null && votadoEm !== projeto.numero && (
              <>
                <p>Seu voto já foi computado.</p>
                <p className="ar-aviso">
                  {votadoEm === 0
                    ? 'Cada aparelho vota uma vez só.'
                    : 'Você votou em outro projeto, e o voto não pode ser trocado.'}
                </p>
              </>
            )}

            {votacaoAberta && votadoEm === null && (
              <>
                {passo === 'rascunho' && (
                  <>
                    <p>Este é o seu preferido?</p>
                    <button type="button" className="ar-votar"
                      onClick={() => setPasso('confirmando')}>
                      Votar neste projeto
                    </button>
                  </>
                )}

                {/* A tela de confirmacao existe porque o voto e' FINAL. Poder
                    trocar depois obrigaria a guardar quem votou, e a tabela
                    deixaria de ser anonima so' para oferecer uma comodidade. */}
                {passo === 'confirmando' && (
                  <>
                    <p>Votar em {projeto.titulo}?</p>
                    {/* Diz "por aparelho" e nao "por pessoa" de proposito. A
                        trava e' uma marca neste navegador: ela segura o clique
                        repetido, nao a pessoa determinada. Prometer na tela uma
                        garantia que o sistema nao tem seria entregar o
                        argumento pronto a quem quiser contestar o resultado. */}
                    <p className="ar-aviso">
                      É um voto só por aparelho, e ele não pode ser trocado depois.
                    </p>
                    <div className="ar-botoes">
                      <button type="button" className="ar-votar"
                        onClick={() => void confirmarVoto(projeto)}>
                        Confirmar meu voto
                      </button>
                      <button type="button" className="ar-desistir"
                        onClick={() => setPasso('rascunho')}>
                        Ainda não
                      </button>
                    </div>
                  </>
                )}

                {/* O desafio antirrobo roda aqui dentro, e leva um instante.
                    O texto fala de verificacao para a espera nao parecer
                    travamento. */}
                {passo === 'enviando' && <p>Verificando e registrando o seu voto...</p>}

                {passo === 'recusado' && (
                  <>
                    <p>Não deu para registrar.</p>
                    <p className="ar-aviso">
                      {recusa === 'fora_da_janela' ? 'A votação não está aberta agora.'
                        : recusa === 'projeto_indisponivel' ? 'Este projeto não está recebendo votos.'
                        : recusa === 'teto_da_rede' ? 'Muitos votos vieram desta rede em pouco tempo. Tente daqui a pouco.'
                        : 'Tente de novo daqui a pouco.'}
                    </p>
                  </>
                )}
              </>
            )}

            {votacaoAberta && passo === 'pronto' && (
              <p className="ar-aviso">Obrigado. Seu voto foi registrado.</p>
            )}

            <div className="ar-passos">
              {anterior ? (
                <Link to={caminhoProjeto(anterior.numero)}>
                  <span>Anterior: {anterior.titulo}</span>
                </Link>
              ) : <span />}
              {proximo ? (
                <Link to={caminhoProjeto(proximo.numero)} className="ar-fim">
                  <span>Próximo: {proximo.titulo}</span>
                </Link>
              ) : <span />}
            </div>
          </div>

        </article>

        {visor !== null && (
          <div className="ar-visor" role="dialog" aria-modal="true" aria-label="Foto do projeto"
            onClick={fechar}>
            <img src={projeto.portfolio[visor]} alt="" onClick={(e) => e.stopPropagation()} />
            <button type="button" className="ar-fechar" onClick={fechar} aria-label="Fechar">×</button>
            {projeto.portfolio.length > 1 && (
              <>
                <button type="button" className="ar-ant" aria-label="Foto anterior"
                  onClick={(e) => { e.stopPropagation(); setVisor((v) => (v === null ? v : (v - 1 + projeto.portfolio.length) % projeto.portfolio.length)); }}>‹</button>
                <button type="button" className="ar-prox" aria-label="Próxima foto"
                  onClick={(e) => { e.stopPropagation(); setVisor((v) => (v === null ? v : (v + 1) % projeto.portfolio.length)); }}>›</button>
                <span className="ar-conta">{visor + 1} de {projeto.portfolio.length}</span>
              </>
            )}
          </div>
        )}
      </div>
    </Moldura>
  );
}
