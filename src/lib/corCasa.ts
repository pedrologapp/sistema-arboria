// ============================================================
// Derivação de cor por Casa (contraste / legibilidade).
//
// FONTE DA VERDADE: src/pages/professor/f2/F2CapituloPage.tsx — estas funções são
// um PORTE FIEL das que já estão provadas lá. Se a regra mudar no professor, ela
// muda aqui também (mantenha os dois em sincronia).
//
// Por quê: as 8 cores canônicas das Casas variam muito de luminância (ouro
// #B8860B, ciano #0891B2, vinho #7F1D1D, verde #047857, marrom #78350F...). Usar
// a cor CRUA como TEXTO sobre o fundo escuro (#1A1A2E) deixa as Casas escuras
// ilegíveis. Derivamos por HSL pra garantir contraste nas 8:
//  - corAcento: versão CLARA e saturada, pra TEXTO / ícone / borda sobre o escuro;
//  - corSolida: cor RICA pra preenchimento com TEXTO BRANCO (botão cheio),
//    escurecida só nas Casas claras o bastante pro branco passar (~5:1);
//  - corFundo / corFundoTopo: fundo profundo na matiz da Casa.
//
// Funções PURAS, sem dependências.
// ============================================================
type RGB = [number, number, number];

const _hexToRgb = (hex: string): RGB => {
  const h = hex.replace('#', '');
  const n = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const int = parseInt(n, 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
};
const _toHex = (v: number): string =>
  Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0');
const _rgbToHex = ([r, g, b]: RGB): string => `#${_toHex(r)}${_toHex(g)}${_toHex(b)}`;

const _rgbToHsl = ([r, g, b]: RGB): [number, number, number] => {
  const rr = r / 255,
    gg = g / 255,
    bb = b / 255;
  const max = Math.max(rr, gg, bb),
    min = Math.min(rr, gg, bb);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0, l];
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rr) h = (gg - bb) / d + (gg < bb ? 6 : 0);
  else if (max === gg) h = (bb - rr) / d + 2;
  else h = (rr - gg) / d + 4;
  return [h / 6, s, l];
};
const _hue = (p: number, q: number, t: number): number => {
  let tt = t;
  if (tt < 0) tt += 1;
  if (tt > 1) tt -= 1;
  if (tt < 1 / 6) return p + (q - p) * 6 * tt;
  if (tt < 1 / 2) return q;
  if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
  return p;
};
const _hslToRgb = ([h, s, l]: [number, number, number]): RGB => {
  if (s === 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [_hue(p, q, h + 1 / 3) * 255, _hue(p, q, h) * 255, _hue(p, q, h - 1 / 3) * 255];
};
const _relLum = ([r, g, b]: RGB): number => {
  const f = (c: number) => {
    const cc = c / 255;
    return cc <= 0.03928 ? cc / 12.92 : Math.pow((cc + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};

/** Fundo imersivo PROFUNDO na matiz da Casa (texto branco lê bem nas 8). */
export const corFundo = (base: string): string => {
  const [h, s] = _rgbToHsl(_hexToRgb(base));
  return _rgbToHex(_hslToRgb([h, Math.min(s, 0.55), 0.11]));
};

/** Topo do gradiente: a mesma matiz, um tico mais viva. */
export const corFundoTopo = (base: string): string => {
  const [h, s] = _rgbToHsl(_hexToRgb(base));
  return _rgbToHex(_hslToRgb([h, Math.min(s, 0.6), 0.17]));
};

/** Acento LEGÍVEL: matiz da Casa, clara e saturada, pra TEXTO / ícones / traços /
 *  bordas sobre o fundo escuro. Nunca deixe a cor CRUA no corpo do texto. */
export const corAcento = (base: string): string => {
  const [h, s] = _rgbToHsl(_hexToRgb(base));
  return _rgbToHex(_hslToRgb([h, Math.max(s, 0.55), 0.66]));
};

/** Acento SÓLIDO: cor rica da Casa pra PREENCHIMENTO com TEXTO BRANCO (botão
 *  cheio, brasão). Só escurece as Casas claras o bastante pro branco passar
 *  (AA ~5:1); as escuras ficam como estão. */
export const corSolida = (base: string): string => {
  const rgb = _hexToRgb(base);
  if (_relLum(rgb) <= 0.16) return base;
  const [h, s] = _rgbToHsl(rgb);
  let l = 0.3;
  let out = _hslToRgb([h, s, l]);
  while (_relLum(out) > 0.16 && l > 0.08) {
    l -= 0.02;
    out = _hslToRgb([h, s, l]);
  }
  return _rgbToHex(out);
};

/** "#a78bfa" -> "167, 139, 250": alimenta CSS vars como --sf-accent-rgb. */
export const hexParaRgb = (hex: string): string => {
  const [r, g, b] = _hexToRgb(hex);
  return `${r}, ${g}, ${b}`;
};
