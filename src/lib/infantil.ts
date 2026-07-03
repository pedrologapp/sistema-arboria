/** Utilidades compartilhadas das telas do Infantil (evita cópias divergindo). */

/** Busca sem acento: "joao" acha "João" (teclado de celular quase nunca acentua). */
export const normalizarBusca = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

export const getIniciais = (nome?: string | null) => {
  if (!nome) return '?';
  const parts = nome.split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

/**
 * Rótulo de turma que respeita a linguagem do segmento:
 * série numérica → "5º A"; série textual (Infantil: "Grupo IV") → "Grupo IV · A".
 */
export const formatTurmaLabel = (serie?: string | number | null, letra?: string | null) => {
  if (serie == null || serie === '') return letra || '';
  const s = String(serie);
  const rotulo = /^\d+$/.test(s) ? `${s}º` : s;
  if (!letra) return rotulo;
  return /^\d+$/.test(s) ? `${rotulo} ${letra}` : `${rotulo} · ${letra}`;
};

const TURMA_KEY = 'infantil-turma-sel';

/** Turma selecionada: sobrevive a remontagens (Arboria e Rajada compartilham). */
export const getTurmaPreferida = (): string | null => {
  try {
    return sessionStorage.getItem(TURMA_KEY);
  } catch {
    return null;
  }
};

export const salvarTurmaPreferida = (turmaId: string) => {
  try {
    sessionStorage.setItem(TURMA_KEY, turmaId);
  } catch {
    /* segue só em memória */
  }
};

const VIEW_KEY = 'infantil-view-criancas';

/** Preferência lista/círculos compartilhada entre Rajada e Diário. */
export const getViewModePreferido = (): 'lista' | 'circulos' => {
  try {
    return localStorage.getItem(VIEW_KEY) === 'circulos' ? 'circulos' : 'lista';
  } catch {
    return 'lista';
  }
};

export const salvarViewModePreferido = (modo: 'lista' | 'circulos') => {
  try {
    localStorage.setItem(VIEW_KEY, modo);
  } catch {
    /* sem localStorage (modo privado antigo): segue só em memória */
  }
};
