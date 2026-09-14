// ============================================================
// Gera a COPIA CONFERIDA e sobe para o balde derivado 'arena-publico'.
//
// O QUE ACONTECE COM CADA ARQUIVO:
//  - foto: reconvertida, o que apaga metadado (o GPS que a camera do celular
//    grava e' o item que mais importa aqui), e recebe caminho novo aleatorio,
//    sem o aluno_id que o balde vivo carrega no caminho;
//  - video: ja' vem convertido para 720p por arena-comprimir-videos.mjs;
//  - as tres fotos com nome de crianca escrito levam um borrao na regiao do
//    nome, e SO' nela. Nenhuma foto e' removida.
//
// O ORIGINAL DO ALUNO NAO E' TOCADO em momento nenhum.
//
// COMO RODAR, da raiz do projeto:
//   node scripts/arena-subir-copia.mjs
// ============================================================
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
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
const cab = { apikey: CHAVE, Authorization: `Bearer ${CHAVE}` };
const BUCKET = 'arena-publico';

const FOTOS = process.env.ARENA_FOTOS;   // pasta com as fotos baixadas
const VIDEOS = process.env.ARENA_VIDEOS; // pasta com os videos leves
const TRABALHO = process.env.ARENA_TRABALHO || path.join(AQUI, '..', '..', 'arena-copia');
if (!FOTOS || !VIDEOS) throw new Error('defina ARENA_FOTOS e ARENA_VIDEOS');
fs.mkdirSync(TRABALHO, { recursive: true });

// As regioes com nome de crianca escrito, por arquivo. Cada uma e' um retangulo
// [largura, altura, x, y] na imagem original. Foram achadas a olho, uma a uma.
const BORROES = {
  'p02-capa-1.jpg': [[150, 310, 1200, 325]],
  'p02-portfolio-1.jpg': [[150, 310, 1200, 325]],
  'p04-portfolio-1.jpg': [[200, 260, 240, 175], [120, 320, 30, 1180]],
};

const rest = async (caminho) => {
  const r = await fetch(`${URL_BASE}/rest/v1/${caminho}`, { headers: cab });
  if (!r.ok) throw new Error(`${caminho} -> ${r.status} ${await r.text()}`);
  return r.json();
};

const edicao = (await rest("arena_edicao?nome=like.TESTE*&select=id&limit=1"))[0];
if (!edicao) throw new Error('nenhuma edicao encontrada');
const projetos = await rest(`arena_projeto?edicao_id=eq.${edicao.id}&select=id,numero`);
const idPorNumero = new Map(projetos.map((p) => [p.numero, p.id]));
console.log(`edicao ${edicao.id}, ${projetos.length} projetos`);

async function subir(local, destino, tipoMime) {
  const corpo = fs.readFileSync(local);
  const r = await fetch(`${URL_BASE}/storage/v1/object/${BUCKET}/${destino}`, {
    method: 'POST',
    headers: { ...cab, 'Content-Type': tipoMime, 'x-upsert': 'true' },
    body: corpo,
  });
  if (!r.ok) throw new Error(`subir ${destino} -> ${r.status} ${await r.text()}`);
  return { bytes: corpo.length, sha256: crypto.createHash('sha256').update(corpo).digest('hex') };
}

const linhas = [];

// ------------------------------------------------------------------- fotos
for (const nome of fs.readdirSync(FOTOS).sort()) {
  const m = nome.match(/^p(\d+)-(capa|portfolio)-(\d+)\.(\w+)$/);
  if (!m) continue;
  const [, nn, tipo, ordem] = m;
  const numero = Number(nn);
  const projetoId = idPorNumero.get(numero);
  if (!projetoId) { console.log(`p${nn}: sem projeto no banco, pulado`); continue; }

  const limpa = path.join(TRABALHO, nome.replace(/\.\w+$/, '.jpg'));
  const regioes = BORROES[nome];
  const args = ['-y', '-v', 'error', '-i', path.join(FOTOS, nome)];
  if (regioes) {
    // split em N+1 saidas, um boxblur por regiao, e overlays em cadeia.
    const n = regioes.length;
    const partes = [`[0:v]split=${n + 1}[base]${regioes.map((_, i) => `[c${i}]`).join('')}`];
    regioes.forEach((r, i) => partes.push(`[c${i}]crop=${r[0]}:${r[1]}:${r[2]}:${r[3]},boxblur=16:3[b${i}]`));
    let atual = 'base';
    regioes.forEach((r, i) => {
      const saida = i === n - 1 ? 'out' : `m${i}`;
      partes.push(`[${atual}][b${i}]overlay=${r[2]}:${r[3]}[${saida}]`);
      atual = saida;
    });
    args.push('-filter_complex', partes.join(';'), '-map', '[out]');
  }
  args.push('-map_metadata', '-1', '-q:v', '3', limpa);
  execFileSync('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });

  const destino = `${projetoId}/${tipo}-${ordem}-${crypto.randomBytes(6).toString('hex')}.jpg`;
  const { bytes, sha256 } = await subir(limpa, destino, 'image/jpeg');
  linhas.push({ projeto_id: projetoId, tipo, caminho: destino, sha256, bytes,
                ordem: tipo === 'capa' ? 0 : Number(ordem), conferido_por: null });
  console.log(`${nome}${regioes ? ' (borrado)' : ''} -> ${(bytes / 1024).toFixed(0)} kB`);
}

// ------------------------------------------------------------------ videos
for (const nome of fs.readdirSync(VIDEOS).sort()) {
  const m = nome.match(/^p(\d+)\.mp4$/);
  if (!m) continue;
  const projetoId = idPorNumero.get(Number(m[1]));
  if (!projetoId) continue;
  const destino = `${projetoId}/video-0-${crypto.randomBytes(6).toString('hex')}.mp4`;
  const { bytes, sha256 } = await subir(path.join(VIDEOS, nome), destino, 'video/mp4');
  linhas.push({ projeto_id: projetoId, tipo: 'video', caminho: destino, sha256, bytes,
                ordem: 0, conferido_por: null });
  console.log(`${nome} -> ${(bytes / 1048576).toFixed(1)} MB`);
}

console.log(`\n${linhas.length} arquivos no balde. Gravando o indice...`);
fs.writeFileSync(path.join(TRABALHO, 'midia.json'), JSON.stringify(linhas, null, 2));
console.log(`indice em ${path.join(TRABALHO, 'midia.json')}`);
