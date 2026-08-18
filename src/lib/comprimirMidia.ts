// ============================================================
// Compressao de midia ANTES do upload, no proprio navegador.
//
// Por que no navegador e nao no servidor: o Arboria e' um SPA em Vite, entao
// nao existe "codigo do servidor" no frontend. Comprimir depois exigiria uma
// Edge Function recebendo o arquivo inteiro, e o guia em privado/arena/README.md
// e' explicito: arquivo grande vai DIRETO do navegador para o Storage, nunca
// atraves da funcao (base64 infla 33% e derruba a funcao sem erro util).
//
// O ganho real: foto de celular hoje sai com 4 a 12 MB. Reduzida para 1600px no
// lado maior e qualidade 0.82, ela cai para 300 a 700 KB sem diferenca visivel
// numa galeria de site. Um grupo com 5 fotos economiza uns 40 MB de upload, o
// que no 4G da escola e' a diferenca entre enviar e desistir.
// ============================================================

const LADO_MAXIMO = 1600;   // px no lado maior: suficiente para o site e para impressao pequena
const QUALIDADE = 0.82;     // acima disso o arquivo cresce sem ganho visivel

export interface MidiaPronta {
  arquivo: File;
  bytesAntes: number;
  bytesDepois: number;
}

/**
 * Reduz uma imagem mantendo a proporcao. Se o arquivo nao for imagem, ou se a
 * compressao falhar (formato exotico, HEIC que o navegador nao decodifica),
 * devolve o original: e' melhor subir grande do que nao subir.
 */
export async function comprimirImagem(file: File): Promise<MidiaPronta> {
  const bytesAntes = file.size;
  if (!file.type.startsWith('image/')) return { arquivo: file, bytesAntes, bytesDepois: bytesAntes };

  try {
    const bitmap = await criarBitmap(file);
    const escala = Math.min(1, LADO_MAXIMO / Math.max(bitmap.width, bitmap.height));

    // Ja' e' pequena o bastante: nao recodifica, porque recodificar sem reduzir
    // so' perde qualidade sem ganhar tamanho.
    if (escala === 1 && bytesAntes < 900_000) {
      bitmap.close?.();
      return { arquivo: file, bytesAntes, bytesDepois: bytesAntes };
    }

    const largura = Math.round(bitmap.width * escala);
    const altura = Math.round(bitmap.height * escala);
    const tela = document.createElement('canvas');
    tela.width = largura;
    tela.height = altura;
    const ctx = tela.getContext('2d');
    if (!ctx) return { arquivo: file, bytesAntes, bytesDepois: bytesAntes };
    ctx.drawImage(bitmap, 0, 0, largura, altura);
    bitmap.close?.();

    const blob = await new Promise<Blob | null>((ok) => tela.toBlob(ok, 'image/jpeg', QUALIDADE));
    if (!blob || blob.size >= bytesAntes) return { arquivo: file, bytesAntes, bytesDepois: bytesAntes };

    const nome = file.name.replace(/\.[^.]+$/, '') + '.jpg';
    return {
      arquivo: new File([blob], nome, { type: 'image/jpeg' }),
      bytesAntes,
      bytesDepois: blob.size,
    };
  } catch {
    // HEIC de iPhone antigo, imagem corrompida, memoria insuficiente: sobe o original.
    return { arquivo: file, bytesAntes, bytesDepois: bytesAntes };
  }
}

/**
 * createImageBitmap resolve a orientacao EXIF sozinho, que e' o motivo de foto
 * de celular chegar deitada. O caminho pelo <img> nao resolve, entao ele so'
 * existe como reserva para navegador antigo.
 */
async function criarBitmap(file: File): Promise<ImageBitmap & { close?: () => void }> {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions);
    } catch {
      // cai para o caminho de reserva
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, erro) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = erro;
      i.src = url;
    });
    return img as unknown as ImageBitmap;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export const emMB = (bytes: number) => (bytes / 1024 / 1024).toFixed(1).replace('.', ',') + ' MB';

/** Conta palavras de verdade: espaco, quebra de linha e pontuacao nao contam. */
export const contarPalavras = (texto: string) => (texto.trim().match(/\S+/g) || []).length;
