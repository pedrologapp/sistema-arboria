// ============================================================
// Baixa os videos da 2a fase e gera a copia leve, para 720p.
//
// POR QUE COMPRIMIR. Os dez originais somam 649 MB, e o maior tem 298 MB. Num
// celular no 4G isso e' minuto de espera e rombo no pacote de dados de quem
// abrir. O conteudo foi gravado a 11 Mbps, qualidade de cinema para um video
// que ninguem vai ver em tela grande.
//
// O EFEITO COLATERAL E' O QUE A GENTE QUERIA. Reconverter o arquivo apaga TODO
// o metadado: a coordenada do GPS que a camera do celular grava, o modelo do
// aparelho, a data. Essa era uma exigencia separada, e sai de graca aqui.
//
// O original do aluno NAO e' tocado. Isto escreve so' em pasta local.
//
// COMO RODAR, da raiz do projeto, com o servidor local de pe':
//   node scripts/arena-comprimir-videos.mjs
// ============================================================
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const DESTINO = process.env.ARENA_SAIDA || path.join(AQUI, '..', '..', 'arena-videos');
const API = process.env.VITE_ARENA_API || 'http://127.0.0.1:54321';

fs.mkdirSync(path.join(DESTINO, 'original'), { recursive: true });
fs.mkdirSync(path.join(DESTINO, 'leve'), { recursive: true });

const r = await fetch(API, { cache: 'no-store' });
const { projetos } = await r.json();
const comVideo = projetos.filter((p) => p.video);
console.log(`${comVideo.length} videos para processar`);

const mb = (b) => (b / 1024 / 1024).toFixed(1);
let antes = 0, depois = 0;

for (const p of comVideo) {
  const n = String(p.numero).padStart(2, '0');
  const bruto = path.join(DESTINO, 'original', `p${n}.mp4`);
  const leve = path.join(DESTINO, 'leve', `p${n}.mp4`);

  if (!fs.existsSync(bruto)) {
    process.stdout.write(`p${n} ${p.titulo}: baixando... `);
    const resp = await fetch(p.video);
    if (!resp.ok) { console.log(`FALHOU ${resp.status}`); continue; }
    fs.writeFileSync(bruto, Buffer.from(await resp.arrayBuffer()));
  } else {
    process.stdout.write(`p${n} ${p.titulo}: ja' baixado. `);
  }
  const tamBruto = fs.statSync(bruto).size;

  if (!fs.existsSync(leve)) {
    process.stdout.write('convertendo... ');
    execFileSync('ffmpeg', [
      '-y', '-v', 'error', '-i', bruto,
      // 720p de altura, largura par calculada sozinha. Nao AUMENTA video que
      // ja' seja menor: o -2 com min evita esticar um 480p para 720p.
      '-vf', "scale='min(1280,iw)':'min(720,ih)':force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2",
      '-c:v', 'libx264', '-crf', '28', '-preset', 'medium',
      '-c:a', 'aac', '-b:a', '96k',
      // O indice vai para o COMECO do arquivo. Sem isto, o navegador precisa
      // baixar quase tudo antes de mostrar o primeiro quadro.
      '-movflags', '+faststart',
      // Zera o metadado: some GPS, modelo do aparelho e data da gravacao.
      '-map_metadata', '-1',
      leve,
    ], { stdio: ['ignore', 'ignore', 'pipe'] });
  } else {
    process.stdout.write('ja convertido. ');
  }
  const tamLeve = fs.statSync(leve).size;

  antes += tamBruto; depois += tamLeve;
  console.log(`${mb(tamBruto)} MB -> ${mb(tamLeve)} MB`);
}

console.log(`\nTOTAL: ${mb(antes)} MB -> ${mb(depois)} MB`);
console.log(`Copias leves em: ${path.join(DESTINO, 'leve')}`);
