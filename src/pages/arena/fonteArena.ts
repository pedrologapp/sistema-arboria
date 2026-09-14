// ============================================================
// fonteArena — de onde o site da Arena tira os projetos.
//
// DOIS CAMINHOS, NESTA ORDEM.
//
// 1. O CAMINHO DE VERDADE, que e' o do site publicado: um fetch simples na
//    funcao 'arena-site'. Sem login, sem sessao, sem tocar no banco. E' assim
//    que a pessoa que abrir o site vai ler os projetos, porque e' um site
//    publico e nao existe conta nenhuma do outro lado.
//
// 2. O ANDAIME, so' enquanto a funcao nao estiver servindo: le' o banco
//    autenticado. So' funciona para quem ja' esta' logado com permissao, e
//    existe apenas para nao deixar a tela morta durante a construcao. Ele
//    some junto com o andaime.
//
// A funcao nasce TRAVADA e responde 503 ate' alguem ligar o segredo
// ARENA_NO_AR. Ligar essa trava e' a decisao de publicar, e publicar esta'
// suspenso pelo parecer de Riscos de 10/09/2026 ate' existirem o termo dos
// responsaveis, a copia sanitizada dos arquivos e a conferencia de cada foto e
// cada video. Rodando a funcao na maquina, o site abre sem login e sem nada
// sair dali.
//
// O QUE ESTE ARQUIVO RESOLVE ALEM DE LER:
//  1. A missao da 2a fase nao e' entrega coletiva, entao cada integrante podia
//     enviar por conta propria. Um grupo do 8o ano enviou QUATRO vezes, com o
//     mesmo texto e os anexos crescendo. Sem juntar por grupo, o mesmo projeto
//     apareceria quatro vezes na galeria. A juncao e' por (turma, papel, grupo)
//     e vence a entrega mais completa, e em caso de empate a mais recente.
//  2. O numero do projeto e' IDENTIDADE, nunca colocacao: vem fixo da lista em
//     titulos.ts e nao muda de visita para visita.
// ============================================================
import { supabase } from '@/integrations/supabase/client';
import { TITULOS, TITULO_PROVISORIO } from './titulos';

export const MISSAO_2FASE = 'ddaf54d2-7781-4ab6-b3e7-2a54749329a5';
const BUCKET = 'arena-2fase';

// Uma hora, o prazo travado pelo parecer de Riscos. Curto o bastante para que
// despublicar valha rapido, longo o bastante para o video de 2 minutos ser
// assistido com a pagina aberta ha' 50.
const VALIDADE_LINK_SEGUNDOS = 3600;

// As oito cores do mockup. Cor e' ritmo visual, nunca identificacao: o numero e
// o nome e' que dizem qual projeto e' qual.
const CORES = [
  '34,211,238', '167,139,250', '245,184,75', '52,211,153',
  '251,113,133', '129,140,248', '94,224,208', '244,114,182',
];

// O endereco da funcao publica. Em branco, vale o do proprio projeto Supabase.
// Para rodar a funcao na maquina, basta apontar para o servidor local no .env:
//   VITE_ARENA_API=http://127.0.0.1:54321/functions/v1/arena-site
const API_ARENA = (import.meta.env.VITE_ARENA_API as string | undefined)
  || `${import.meta.env.VITE_SUPABASE_URL ?? ''}/functions/v1/arena-site`;

export interface ProjetoArena {
  /** Identidade fixa do projeto. Nunca colocacao. */
  numero: number;
  /** Id da linha de publicacao. E' nele que o voto se pendura. */
  id?: string | null;
  /** So' existe no andaime autenticado. A funcao publica nao devolve isto. */
  entregaId?: string;
  titulo: string;
  /** Primeira frase do texto do aluno, literal. Nunca reescrita. */
  gancho: string;
  paragrafos: string[];
  capa: string | null;
  portfolio: string[];
  video: string | null;
  /** 'r,g,b' */
  cor: string;
}

interface LinhaEntrega { id: string; aluno_id: string; texto_resposta: string | null; created_at: string }
interface LinhaAlocacao { aluno_id: string; turma_id: string | null; papel_id: string; grupo: number | null }
interface LinhaArquivo { entrega_id: string; nome_storage: string; tipo_arquivo: string }

/**
 * A primeira frase do texto, do jeito que a equipe escreveu. Se ela for curta
 * demais para dizer alguma coisa, junta a seguinte. Nunca reescreve nada: o
 * gancho e' sempre um trecho literal da prosa.
 */
function primeiraFrase(texto: string): string {
  const limpo = texto.replace(/\s+/g, ' ').trim();
  const frases = limpo.split(/(?<=[.!?])\s+/);
  let frase = frases[0] ?? limpo;
  if (frase.length < 45 && frases[1]) frase = `${frase} ${frases[1]}`;
  if (frase.length > 190) frase = `${frase.slice(0, 187).trimEnd()}...`;
  return frase;
}

function paragrafosDe(texto: string): string[] {
  return texto
    .split(/\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

// A previa refaz as assinaturas a cada carga da pagina. Guardar em memoria
// evita reassinar 70 arquivos ao andar entre a galeria e a sala do projeto.
let cache: { quando: number; projetos: ProjetoArena[]; votacao: EstadoVotacao } | null = null;

export function limparCacheArena() { cache = null; }

export interface EstadoVotacao { aberta: boolean; fecha_em?: string }

/**
 * O caminho do site publicado: um GET sem login, sem cabecalho e sem nenhum
 * parametro. Se a funcao ainda nao estiver servindo, ou estiver travada, isto
 * falha de proposito e quem responde e' o andaime.
 */
async function lerDaFuncaoPublica(): Promise<{ projetos: ProjetoArena[]; votacao: EstadoVotacao }> {
  const resposta = await fetch(API_ARENA, { method: 'GET', cache: 'no-store' });
  if (!resposta.ok) throw new Error(`a funcao respondeu ${resposta.status}`);
  const corpo = await resposta.json() as { projetos?: ProjetoArena[]; votacao?: EstadoVotacao };
  if (!Array.isArray(corpo.projetos)) throw new Error('resposta sem projetos');
  return { projetos: corpo.projetos, votacao: corpo.votacao ?? { aberta: false } };
}

export async function carregarArena(): Promise<{ projetos: ProjetoArena[]; votacao: EstadoVotacao }> {
  if (cache && Date.now() - cache.quando < VALIDADE_LINK_SEGUNDOS * 500) {
    return { projetos: cache.projetos, votacao: cache.votacao };
  }
  try {
    const { projetos, votacao } = await lerDaFuncaoPublica();
    cache = { quando: Date.now(), projetos, votacao };
    return { projetos, votacao };
  } catch {
    // A funcao ainda nao esta' servindo. Cai no andaime, que exige login e nao
    // conhece votacao nenhuma.
    const projetos = await lerAutenticado();
    return { projetos, votacao: { aberta: false } };
  }
}

// --------------------------------------------------------------- o voto
//
// A MARCA DO APARELHO e' um valor aleatorio sem significado nenhum, gerado
// aqui e guardado so' neste navegador. Ela nao identifica pessoa, nao viaja em
// cabecalho e nao vira sessao. Serve para uma coisa so': lembrar que este
// aparelho ja' votou.
//
// SE O ARMAZENAMENTO ESTIVER BLOQUEADO (aba anonima, navegador travado), o
// voto CONTINUA funcionando com uma marca de memoria. Perde-se a lembranca,
// nunca o direito de votar: barrar quem nao deixa guardar seria excluir gente
// honesta para nao segurar ninguem.
const CHAVE_MARCA = 'ar-marca';
let marcaDeMemoria: string | null = null;

function marcaDoAparelho(): string {
  try {
    const guardada = localStorage.getItem(CHAVE_MARCA);
    if (guardada) return guardada;
    const nova = crypto.randomUUID();
    localStorage.setItem(CHAVE_MARCA, nova);
    return nova;
  } catch {
    if (!marcaDeMemoria) marcaDeMemoria = crypto.randomUUID();
    return marcaDeMemoria;
  }
}

const CHAVE_VOTADO = 'ar-votei';

/**
 * Em qual projeto este aparelho ja' votou. Devolve null se nao votou, o numero
 * do projeto se sabemos qual, e 0 quando o banco disse que ja' havia voto mas
 * nao sabemos em quem. O 0 existe para a pagina nunca afirmar, na tela, um
 * projeto que talvez nao seja o votado.
 */
export function votoGuardado(): number | null {
  try {
    const bruto = localStorage.getItem(CHAVE_VOTADO);
    if (bruto === null) return null;
    const n = Number(bruto);
    return Number.isFinite(n) && n >= 0 ? n : null;
  } catch { return null; }
}

export function guardarVoto(numero: number) {
  try { localStorage.setItem(CHAVE_VOTADO, String(numero)); } catch { /* sem memoria */ }
}

export interface RespostaVoto { ok: boolean; motivo?: string }

interface Desafio {
  semente: string; expira: number; dificuldade: number; assinatura: string; nonce?: number;
}

async function sha256Hex(texto: string): Promise<string> {
  const bytes = new TextEncoder().encode(texto);
  const resumo = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(resumo)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * O desafio antirrobo. O servidor manda uma semente assinada e o navegador
 * precisa achar um numero que produza um resumo comecando com N zeros. Nao ha'
 * atalho: e' forca bruta, e e' esse o ponto. Para quem vota uma vez custa uma
 * fracao de segundo; para quem quer disparar mil votos, custa mil vezes isso.
 *
 * NAO E' UM CAPTCHA DE CLICAR, e isso e' de proposito: captcha de mercado manda
 * dado do visitante para um terceiro e pontua o comportamento dele, o que foi
 * vetado numa pagina sobre trabalho de crianca. Aqui nada sai daqui.
 */
async function resolverDesafio(d: Desafio): Promise<Desafio> {
  const alvo = '0'.repeat(d.dificuldade);
  for (let nonce = 0; nonce < 50_000_000; nonce++) {
    if ((await sha256Hex(`${d.semente}:${nonce}`)).startsWith(alvo)) {
      return { ...d, nonce };
    }
  }
  throw new Error('desafio nao resolvido');
}

export async function votar(projetoId: string): Promise<RespostaVoto> {
  let desafio: Desafio;
  try {
    const r = await fetch(`${API_ARENA}/desafio`, { cache: 'no-store' });
    if (!r.ok) throw new Error(String(r.status));
    desafio = await resolverDesafio(await r.json() as Desafio);
  } catch {
    return { ok: false, motivo: 'bilhete_invalido' };
  }

  const resposta = await fetch(`${API_ARENA}/voto`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({ projeto: projetoId, marca: marcaDoAparelho(), desafio }),
  });
  if (!resposta.ok) return { ok: false, motivo: 'falhou' };
  return await resposta.json() as RespostaVoto;
}

async function lerAutenticado(): Promise<ProjetoArena[]> {
  const { data: entregasRaw, error: erroEntregas } = await supabase
    .from('entregas')
    .select('id, aluno_id, texto_resposta, created_at')
    .eq('missao_id', MISSAO_2FASE);
  if (erroEntregas) throw erroEntregas;
  const entregas = (entregasRaw ?? []) as unknown as LinhaEntrega[];
  if (entregas.length === 0) return [];

  // capitulo_alocacoes nao esta' no types.ts gerado, que so' e' regerado de vez
  // em quando. O resto do projeto contorna do mesmo jeito (ver useGrupoChat e
  // CapituloPage): a tipagem de verdade e' a interface logo acima.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data: alocRaw, error: erroAloc } = await sb
    .from('capitulo_alocacoes')
    .select('aluno_id, turma_id, papel_id, grupo')
    .in('aluno_id', entregas.map((e) => e.aluno_id));
  if (erroAloc) throw erroAloc;
  const alocacoes = (alocRaw ?? []) as unknown as LinhaAlocacao[];

  const { data: arqRaw, error: erroArq } = await supabase
    .from('entrega_arquivos')
    .select('entrega_id, nome_storage, tipo_arquivo')
    .in('entrega_id', entregas.map((e) => e.id));
  if (erroArq) throw erroArq;
  const arquivos = (arqRaw ?? []) as unknown as LinhaArquivo[];

  const arquivosPorEntrega = new Map<string, LinhaArquivo[]>();
  for (const a of arquivos) {
    const lista = arquivosPorEntrega.get(a.entrega_id) ?? [];
    lista.push(a);
    arquivosPorEntrega.set(a.entrega_id, lista);
  }

  // A chave do projeto. Um aluno pode ter alocacao em mais de um capitulo, e
  // por isso a busca e' pela alocacao que existe: se houver mais de uma, a
  // primeira serve, porque a 2a fase so' foi enderecada aos integrantes dos
  // projetos da Arena.
  const chaveDoAluno = new Map<string, string>();
  for (const a of alocacoes) {
    if (chaveDoAluno.has(a.aluno_id)) continue;
    chaveDoAluno.set(a.aluno_id, `${a.turma_id ?? 'sem-turma'}::${a.papel_id}::${a.grupo ?? 0}`);
  }

  // Vence a entrega mais completa do grupo; empatou, vence a mais recente.
  const vencedoraPorGrupo = new Map<string, LinhaEntrega>();
  for (const e of entregas) {
    const chave = chaveDoAluno.get(e.aluno_id);
    if (!chave) continue;
    const atual = vencedoraPorGrupo.get(chave);
    if (!atual) { vencedoraPorGrupo.set(chave, e); continue; }
    const nNova = arquivosPorEntrega.get(e.id)?.length ?? 0;
    const nAtual = arquivosPorEntrega.get(atual.id)?.length ?? 0;
    const ganha = nNova > nAtual || (nNova === nAtual && e.created_at > atual.created_at);
    if (ganha) vencedoraPorGrupo.set(chave, e);
  }

  const vencedoras = [...vencedoraPorGrupo.values()];

  // Uma assinatura so' para todos os caminhos. createSignedUrls devolve na
  // mesma ordem que recebeu, e por isso o casamento e' por indice.
  const caminhos = vencedoras.flatMap((e) => (arquivosPorEntrega.get(e.id) ?? []).map((a) => a.nome_storage));
  const urlPorCaminho = new Map<string, string>();
  if (caminhos.length > 0) {
    const { data: assinadas, error: erroAssinar } = await supabase
      .storage.from(BUCKET).createSignedUrls(caminhos, VALIDADE_LINK_SEGUNDOS);
    if (erroAssinar) throw erroAssinar;
    (assinadas ?? []).forEach((linha, i) => {
      if (linha?.signedUrl) urlPorCaminho.set(caminhos[i], linha.signedUrl);
    });
  }

  const projetos: ProjetoArena[] = vencedoras.map((e) => {
    const meus = arquivosPorEntrega.get(e.id) ?? [];
    const url = (a: LinhaArquivo) => urlPorCaminho.get(a.nome_storage) ?? null;
    const capa = meus.find((a) => a.tipo_arquivo === 'capa');
    const video = meus.find((a) => a.tipo_arquivo === 'video');
    const texto = e.texto_resposta ?? '';
    const ficha = TITULOS[e.id];
    return {
      numero: ficha?.numero ?? 0,
      entregaId: e.id,
      titulo: ficha?.titulo ?? TITULO_PROVISORIO,
      gancho: primeiraFrase(texto),
      paragrafos: paragrafosDe(texto),
      capa: capa ? url(capa) : null,
      portfolio: meus.filter((a) => a.tipo_arquivo === 'portfolio')
        .map(url).filter((u): u is string => !!u),
      video: video ? url(video) : null,
      cor: '',
    };
  });

  // Projeto sem ficha em titulos.ts entra no fim, com numero proprio, para
  // nunca sumir da galeria por falta de cadastro.
  let proximoNumero = Math.max(0, ...projetos.map((p) => p.numero));
  for (const p of projetos) if (p.numero === 0) p.numero = ++proximoNumero;

  projetos.sort((a, b) => a.numero - b.numero);
  projetos.forEach((p, i) => { p.cor = CORES[i % CORES.length]; });

  // O ANDAIME NAO ENTRA NO CACHE, de proposito. Ele so' roda quando a funcao
  // esta' fora do ar, e guardar o que ele devolveu faria o resultado pobre
  // grudar por meia hora depois de a funcao voltar. Quem tem cache e' o
  // caminho de verdade.
  return projetos;
}
