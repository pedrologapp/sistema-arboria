// Servidor local que serve a MESMA resposta da Edge Function arena-site.
//
// POR QUE ELE EXISTE. A maquina nao tem Docker nem Deno rodando, entao nao da'
// para servir a Edge Function de verdade aqui. Este arquivo faz o mesmo, em
// Node, so' para a previa no localhost. Ele NAO vai para producao: la' quem
// responde e' supabase/functions/arena-site.
//
// COMO RODAR, da raiz do projeto:
//   node scripts/arena-local.mjs
// Ele le' a chave secreta de supabase/functions/.env.local, que esta' fora do
// Git. Sem esse arquivo preenchido, ele nao sobe.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const ENV = path.join(AQUI, '..', 'supabase', 'functions', '.env.local');
const env = Object.fromEntries(
  fs.readFileSync(ENV, 'utf8').split(/\r?\n/)
    .filter((l) => l && !l.trimStart().startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }),
);

const URL_BASE = env.ARENA_SUPABASE_URL;
const CHAVE = env.ARENA_SERVICE_KEY;
const MISSAO = 'ddaf54d2-7781-4ab6-b3e7-2a54749329a5';
const BUCKET = 'arena-2fase';          // a pasta viva do aluno, so' de reserva
const BUCKET_PUBLICO = 'arena-publico'; // a copia conferida, que e' o que vai ao ar
const VALIDADE = 3600;

const FICHAS = {
  '9224884e-15a1-4f5e-8c70-a51579910be6': { numero: 1, titulo: 'Empire Box' },
  'b22a1bf4-31ed-429d-9cc7-31b10d450165': { numero: 2, titulo: 'Caixa de Som Ecológica' },
  '3e2f6da9-d51f-4266-9ae2-cd23380eba80': { numero: 3, titulo: 'Decoder: Terminal Lógico' },
  'bc3c4687-8877-40d3-bded-f34004cc7880': { numero: 4, titulo: 'Metrô Sustentável' },
  '58c15371-af5d-4293-9982-eccf129c1685': { numero: 5, titulo: 'ReMember' },
  'f96e6023-9bbe-4811-aaa9-e09bf562fe8a': { numero: 6, titulo: 'O Caso do Policial Billy' },
  '474821f0-b13f-4ac2-a009-c9c6a7d774e4': { numero: 7, titulo: 'PulsePay' },
  '0ff2ae29-0289-4991-949f-de458dd4d55f': { numero: 8, titulo: 'Chacina na Fazenda' },
  'ae187cce-14b1-44bb-aaca-528639754fbe': { numero: 9, titulo: 'Global Trade Coin' },
  '40578b2f-08b1-4d93-8aa4-ea66910d22d1': { numero: 10, titulo: 'Projeto Pirólise' },
  '85eb8a94-b5f8-4c2b-8337-23fa444d6ac9': { numero: 11, titulo: 'Song Maker' },
};
const CORES = ['34,211,238', '167,139,250', '245,184,75', '52,211,153',
  '251,113,133', '129,140,248', '94,224,208', '244,114,182'];

const cab = { apikey: CHAVE, Authorization: `Bearer ${CHAVE}` };

async function rest(caminho) {
  const r = await fetch(`${URL_BASE}/rest/v1/${caminho}`, { headers: cab });
  if (!r.ok) throw new Error(`${caminho} -> ${r.status} ${await r.text()}`);
  return r.json();
}

function primeiraFrase(texto) {
  const limpo = texto.replace(/\s+/g, ' ').trim();
  const frases = limpo.split(/(?<=[.!?])\s+/);
  let f = frases[0] ?? limpo;
  if (f.length < 45 && frases[1]) f = `${f} ${frases[1]}`;
  if (f.length > 190) f = `${f.slice(0, 187).trimEnd()}...`;
  return f;
}

async function montar() {
  const entregas = await rest(`entregas?missao_id=eq.${MISSAO}&select=id,aluno_id,texto_resposta,created_at`);
  if (entregas.length === 0) return [];
  const alunos = entregas.map((e) => e.aluno_id).join(',');
  const alocacoes = await rest(`capitulo_alocacoes?aluno_id=in.(${alunos})&select=aluno_id,turma_id,papel_id,grupo`);
  const ids = entregas.map((e) => e.id).join(',');
  const arquivos = await rest(`entrega_arquivos?entrega_id=in.(${ids})&select=entrega_id,nome_storage,tipo_arquivo`);

  const porEntrega = new Map();
  for (const a of arquivos) {
    const l = porEntrega.get(a.entrega_id) ?? [];
    l.push(a); porEntrega.set(a.entrega_id, l);
  }
  const chave = new Map();
  for (const a of alocacoes) {
    if (chave.has(a.aluno_id)) continue;
    chave.set(a.aluno_id, `${a.turma_id ?? 'sem'}::${a.papel_id}::${a.grupo ?? 0}`);
  }
  const venc = new Map();
  for (const e of entregas) {
    const k = chave.get(e.aluno_id);
    if (!k) continue;
    const at = venc.get(k);
    if (!at) { venc.set(k, e); continue; }
    const nN = porEntrega.get(e.id)?.length ?? 0;
    const nA = porEntrega.get(at.id)?.length ?? 0;
    if (nN > nA || (nN === nA && e.created_at > at.created_at)) venc.set(k, e);
  }

  const escolhidas = [...venc.values()];
  const caminhos = escolhidas.flatMap((e) => (porEntrega.get(e.id) ?? []).map((a) => a.nome_storage));
  const url = new Map();
  if (caminhos.length) {
    const r = await fetch(`${URL_BASE}/storage/v1/object/sign/${BUCKET}`, {
      method: 'POST',
      headers: { ...cab, 'Content-Type': 'application/json' },
      body: JSON.stringify({ expiresIn: VALIDADE, paths: caminhos }),
    });
    if (!r.ok) throw new Error(`assinar -> ${r.status} ${await r.text()}`);
    for (const linha of await r.json()) {
      if (linha.signedURL) url.set(linha.path, `${URL_BASE}/storage/v1${linha.signedURL}`);
    }
  }

  const projetos = escolhidas.map((e) => {
    const meus = porEntrega.get(e.id) ?? [];
    const ficha = FICHAS[e.id];
    const capa = meus.find((a) => a.tipo_arquivo === 'capa');
    const video = meus.find((a) => a.tipo_arquivo === 'video');
    const texto = e.texto_resposta ?? '';
    return {
      numero: ficha?.numero ?? 0,
      titulo: ficha?.titulo ?? 'Projeto sem nome cadastrado',
      gancho: primeiraFrase(texto),
      paragrafos: texto.split(/\n+/).map((p) => p.trim()).filter(Boolean),
      capa: capa ? url.get(capa.nome_storage) ?? null : null,
      portfolio: meus.filter((a) => a.tipo_arquivo === 'portfolio')
        .map((a) => url.get(a.nome_storage)).filter(Boolean),
      video: video ? url.get(video.nome_storage) ?? null : null,
      cor: '',
    };
  });
  let prox = Math.max(0, ...projetos.map((p) => p.numero));
  for (const p of projetos) if (p.numero === 0) p.numero = ++prox;
  projetos.sort((a, b) => a.numero - b.numero);
  projetos.forEach((p, i) => { p.cor = CORES[i % CORES.length]; });

  // Casa cada projeto com a linha de publicacao no banco, que e' onde o voto se
  // pendura. Sem edicao aberta, o site continua funcionando: so' nao aparece o
  // botao de votar.
  const ed = await edicaoAberta();
  if (ed) {
    const pubs = await rest(
      `arena_projeto?edicao_id=eq.${ed.id}&estado=eq.publicado`
      + `&select=id,numero,titulo,corpo,arena_projeto_midia(tipo,caminho,ordem)`
    );
    const porNumero = new Map(pubs.map((p) => [p.numero, p]));

    // A MIDIA CONFERIDA GANHA DA PASTA VIVA. Quando a copia existe, e' ela que
    // o site serve: arquivo imutavel, metadado apagado, caminho sem o id do
    // aluno. A pasta viva so' aparece se a copia ainda nao tiver sido feita.
    const daCopia = [];
    for (const pub of pubs) for (const m of pub.arena_projeto_midia ?? []) daCopia.push(m.caminho);
    const urlCopia = new Map();
    if (daCopia.length) {
      const r = await fetch(`${URL_BASE}/storage/v1/object/sign/${BUCKET_PUBLICO}`, {
        method: 'POST',
        headers: { ...cab, 'Content-Type': 'application/json' },
        body: JSON.stringify({ expiresIn: VALIDADE, paths: daCopia }),
      });
      if (r.ok) for (const linha of await r.json()) {
        if (linha.signedURL) urlCopia.set(linha.path, `${URL_BASE}/storage/v1${linha.signedURL}`);
      }
    }

    for (const p of projetos) {
      const pub = porNumero.get(p.numero);
      p.id = pub?.id ?? null;
      if (pub?.titulo) p.titulo = pub.titulo;
      // O CORPO PUBLICADO GANHA DO ORIGINAL quando existe. E' nele que vive o
      // texto sem os nomes das criancas. A entrega do aluno continua intacta
      // no banco; o que muda e' so' o que o site mostra.
      if (pub?.corpo) {
        p.paragrafos = String(pub.corpo).split(/\n+/).map((x) => x.trim()).filter(Boolean);
        p.gancho = primeiraFrase(String(pub.corpo));
      }
      const midia = (pub?.arena_projeto_midia ?? []).filter((m) => urlCopia.has(m.caminho));
      if (midia.length) {
        const capa = midia.find((m) => m.tipo === 'capa');
        const video = midia.find((m) => m.tipo === 'video');
        p.capa = capa ? urlCopia.get(capa.caminho) : null;
        p.video = video ? urlCopia.get(video.caminho) : null;
        p.portfolio = midia.filter((m) => m.tipo === 'portfolio')
          .sort((a, b) => a.ordem - b.ordem)
          .map((m) => urlCopia.get(m.caminho));
      }
    }
  }
  return { projetos, edicao: ed };
}

// ------------------------------------------------------------ a votacao
// O segredo do HMAC vive aqui, fora do banco: o banco guarda digesto e nunca
// tem como voltar ao valor original. Em producao ele e' um segredo da funcao;
// aqui, um arquivo local, e se mudar todos os votos de teste viram outros.
const SEGREDO = env.ARENA_SEGREDO_HMAC || 'segredo-local-de-teste';
const digesto = (valor) =>
  crypto.createHmac('sha256', SEGREDO).update(String(valor)).digest('hex');

// ------------------------------------------------- o desafio antirrobo
//
// POR QUE NAO E' UM CAPTCHA DE CLICAR. Todo captcha de mercado (reCAPTCHA,
// hCaptcha) manda dado do visitante para um terceiro e pontua o comportamento
// dele. Numa pagina sobre trabalho de crianca isso foi vetado. Este desafio
// roda inteiro entre o navegador e este servidor: nada sai, ninguem e' perfilado
// e nao ha' contrato de dados para assinar.
//
// COMO FUNCIONA. O servidor entrega uma semente assinada e com validade curta.
// O navegador precisa achar um numero que, junto com a semente, produza um
// resumo comecando com N zeros. So' existe forca bruta, entao custa um tempinho
// de processador. Para quem vota uma vez, e' imperceptivel. Para quem quer
// disparar mil votos, o custo multiplica por mil.
//
// O QUE ELE NAO FAZ: nao prova que e' uma pessoa, prova que alguem gastou
// trabalho. Ele encarece a enxurrada automatica; nao impede quem insiste.
const DIFICULDADE = 3;          // zeros hexadecimais exigidos no resumo
const VALIDADE_DESAFIO = 120;   // segundos

const resumo = (texto) => crypto.createHash('sha256').update(texto).digest('hex');

function novoDesafio() {
  const semente = crypto.randomBytes(16).toString('hex');
  const expira = Math.floor(Date.now() / 1000) + VALIDADE_DESAFIO;
  const assinatura = digesto(`${semente}|${expira}|${DIFICULDADE}`);
  return { semente, expira, dificuldade: DIFICULDADE, assinatura };
}

function desafioValido(d) {
  if (!d || typeof d.semente !== 'string' || !Number.isFinite(Number(d.expira))) return false;
  if (Number(d.expira) < Math.floor(Date.now() / 1000)) return false;
  const esperada = digesto(`${d.semente}|${d.expira}|${DIFICULDADE}`);
  if (d.assinatura !== esperada) return false;
  const alvo = '0'.repeat(DIFICULDADE);
  return resumo(`${d.semente}:${d.nonce}`).startsWith(alvo);
}

async function edicaoAberta() {
  const linhas = await rest(
    'arena_edicao?estado=eq.aberta&select=id,nome,abre_em,fecha_em&limit=1'
  );
  return linhas[0] ?? null;
}

// O endereco de quem vota nunca e' guardado: vira digesto antes de sair daqui.
// IPv6 e' truncado no /64, senao cada aparelho da mesma casa viraria uma rede
// diferente e o teto nao seguraria nada.
function redeDe(req) {
  const bruto = (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
    || req.socket.remoteAddress || 'desconhecido';
  const limpo = bruto.replace(/^::ffff:/, '');
  if (limpo.includes(':')) return limpo.split(':').slice(0, 4).join(':');
  return limpo;
}

async function registrarVoto({ edicaoId, projetoId, marca, rede }) {
  const r = await fetch(`${URL_BASE}/rest/v1/rpc/arena_registrar_voto`, {
    method: 'POST',
    headers: { ...cab, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      p_edicao: edicaoId,
      p_projeto: projetoId,
      p_marca_hash: digesto(marca),
      p_rede_hash: digesto(rede),
    }),
  });
  if (!r.ok) throw new Error(`voto -> ${r.status} ${await r.text()}`);
  return r.json();
}

function lerCorpo(req) {
  return new Promise((resolve, reject) => {
    let dados = '';
    req.on('data', (p) => {
      dados += p;
      if (dados.length > 4096) { req.destroy(); reject(new Error('corpo grande demais')); }
    });
    req.on('end', () => { try { resolve(JSON.parse(dados || '{}')); } catch { resolve({}); } });
    req.on('error', reject);
  });
}

http.createServer(async (req, res) => {
  const cors = {
    'Access-Control-Allow-Origin': req.headers.origin ?? '*',
    'Access-Control-Allow-Headers': 'content-type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json',
  };
  if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
  const caminho = (req.url || '/').split('?')[0];

  try {
    // --------------------------------------------------------- o desafio
    if (caminho === '/desafio') {
      res.writeHead(200, cors);
      return res.end(JSON.stringify(novoDesafio()));
    }

    // ------------------------------------------------------------- o voto
    if (caminho === '/voto') {
      if (req.method !== 'POST') {
        res.writeHead(405, cors);
        return res.end(JSON.stringify({ ok: false, motivo: 'metodo' }));
      }
      const corpo = await lerCorpo(req);
      const ed = await edicaoAberta();
      if (!ed) {
        res.writeHead(200, cors);
        return res.end(JSON.stringify({ ok: false, motivo: 'fora_da_janela' }));
      }
      // A marca vem do aparelho e e' um valor aleatorio sem significado. Aqui
      // ela nunca e' guardada: vira digesto antes de chegar ao banco.
      const marca = String(corpo.marca || '');
      if (!/^[a-z0-9-]{8,64}$/i.test(marca)) {
        res.writeHead(200, cors);
        return res.end(JSON.stringify({ ok: false, motivo: 'marca_invalida' }));
      }
      // O desafio e' conferido ANTES de falar com o banco: voto sem trabalho
      // feito nao chega nem a bater na funcao.
      if (!desafioValido(corpo.desafio)) {
        res.writeHead(200, cors);
        return res.end(JSON.stringify({ ok: false, motivo: 'bilhete_invalido' }));
      }
      const r = await registrarVoto({
        edicaoId: ed.id,
        projetoId: String(corpo.projeto || ''),
        marca,
        rede: redeDe(req),
      });
      console.log(`[arena] voto: ${r.ok ? 'aceito' : r.motivo}`);
      res.writeHead(200, cors);
      return res.end(JSON.stringify(r));
    }

    // --------------------------------------------------------- os projetos
    const { projetos, edicao } = await montar();
    res.writeHead(200, cors);
    res.end(JSON.stringify({
      projetos,
      votacao: edicao ? { aberta: true, fecha_em: edicao.fecha_em } : { aberta: false },
    }));
    console.log(`[arena] ${projetos.length} projetos servidos${edicao ? ' (votacao aberta)' : ''}`);
  } catch (e) {
    console.error('[arena] falhou:', e.message);
    res.writeHead(500, cors);
    res.end(JSON.stringify({ erro: String(e.message) }));
  }
}).listen(54321, () => console.log('[arena] servindo em http://127.0.0.1:54321'));
