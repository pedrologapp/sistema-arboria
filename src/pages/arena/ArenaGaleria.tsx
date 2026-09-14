// ============================================================
// ArenaGaleria (/arenaarboria) — a galeria publica da Arena Arboria.
//
// PREVIA. Ainda nao e' o site publico: le' o banco autenticado e so' abre para
// professor, admin e super_admin. O parecer de Riscos de 10/09/2026 suspendeu a
// publicacao ate' existirem o termo dos responsaveis, a copia sanitizada dos
// arquivos e a conferencia humana de cada foto e cada video.
//
// TRES DECISOES DE DESENHO QUE SAO DOUTRINA, NAO GOSTO:
//  1. Faixas IGUAIS, de altura fixa. Ninguem se sobressai, e o texto mais longo
//     nao ganha mais tela que o mais curto.
//  2. A ORDEM EMBARALHA a cada visita, e a pagina diz isso em voz alta. O
//     numero do projeto e' identidade e fica preso a ele; ordem nao e' merito.
//  3. Nada de nome de aluno, turma, serie, Casa, inteligencia ou mecanismo. E
//     nada de total: dizer quantos aparecem, sabendo quantos foram
//     selecionados, expoe pela ausencia quem nao entregou.
// ============================================================
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { carregarArena, votoGuardado, type ProjetoArena } from './fonteArena';
import { Moldura, Seta, caminhoProjeto } from './Moldura';

/**
 * Sorteia a ordem. Roda a cada vez que a galeria e' aberta, entao a lista
 * chega diferente em toda visita, inclusive ao voltar de um projeto. E' o que
 * garante que nenhum projeto tenha o privilegio de estar sempre em cima.
 *
 * O preco, assumido: quem volta da pagina de um projeto nao reencontra a lista
 * do jeito que deixou. Com onze faixas, e' barato.
 */
function ordemSorteada<T>(itens: T[]): T[] {
  const copia = [...itens];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

function selo(p: ProjetoArena): string {
  const partes: string[] = [];
  if (p.video) partes.push('Vídeo');
  if (p.portfolio.length > 0) partes.push(`${p.portfolio.length} fotos`);
  return partes.join(' · ');
}

export default function ArenaGaleria() {
  const [projetos, setProjetos] = useState<ProjetoArena[] | null>(null);
  const [votacaoAberta, setVotacaoAberta] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const jaVotou = votoGuardado();

  useEffect(() => {
    document.title = 'Arena Arboria';
    let vivo = true;
    carregarArena()
      .then(({ projetos: lista, votacao }) => {
        if (!vivo) return;
        setProjetos(lista);
        setVotacaoAberta(votacao.aberta);
      })
      .catch((e: unknown) => {
        if (!vivo) return;
        setErro(e instanceof Error ? e.message : 'Não foi possível carregar os projetos.');
      });
    return () => { vivo = false; };
  }, []);

  const ordenados = useMemo(
    () => (projetos ? ordemSorteada(projetos) : []),
    [projetos],
  );

  return (
    <Moldura>
      <div className="ar-wrap">
        <div className="ar-topo">
          <div className="ar-marca"><span>Arena Arboria</span></div>
          {/* A linha de estado. Ela nunca diz quantos projetos existem: com a
              escola sabendo quantos foram convidados, um total entrega pela
              ausencia quem nao entregou. */}
          <span className="ar-pill">
            <i />
            {!votacaoAberta ? 'A ordem muda a cada visita'
              : jaVotou ? 'Seu voto já foi registrado'
              : 'Votação aberta'}
          </span>
        </div>

        <header className="ar-hero">
          <div className="ar-sobrenome">Projetos do Fundamental 2</div>
          <div className="ar-wordmark"><b>Arena</b><b>Arboria</b></div>
          <p className="ar-tagline">Vote no seu projeto preferido.</p>
        </header>

        <div className="ar-cabecalho">
          <h2>Os projetos</h2>
          <span>Toque em um para ver por dentro</span>
        </div>

        {erro && (
          <p style={{ color: '#F5B84B', fontSize: 14.5, lineHeight: 1.7, maxWidth: '60ch' }}>
            Não foi possível carregar os projetos. A função que serve o site ainda
            não está respondendo, e a leitura de reserva exige alguém logado com
            permissão. Detalhe técnico: {erro}
          </p>
        )}

        {!projetos && !erro && (
          <div className="ar-galeria" aria-busy="true" aria-label="Carregando os projetos">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="ar-esqueleto" />)}
          </div>
        )}

        {projetos && projetos.length === 0 && !erro && (
          <p style={{ color: '#A6A5B8', fontSize: 15 }}>Nenhum projeto para mostrar ainda.</p>
        )}

        {ordenados.length > 0 && (
          <div className="ar-galeria">
            {ordenados.map((p) => (
              <Link
                key={p.numero}
                to={caminhoProjeto(p.numero)}
                className="ar-faixa"
                style={{ ['--ar-cor' as string]: p.cor }}
              >
                <div
                  className="ar-capa ar-foto"
                  style={{ ['--foto' as string]: p.capa ? `url("${p.capa}")` : 'none' }}
                >
                  {p.capa
                    ? <img src={p.capa} alt={`Foto principal do projeto ${p.titulo}`} loading="lazy" />
                    : null}
                </div>
                <div className="ar-corpo">
                  <h3 className="ar-titulo">{p.titulo}</h3>
                  <p className="ar-gancho">{p.gancho}</p>
                  <div className="ar-acao">
                    <b>Ver o projeto <Seta /></b>
                    {selo(p) && <span className="ar-selo">{selo(p)}</span>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

      </div>
    </Moldura>
  );
}
