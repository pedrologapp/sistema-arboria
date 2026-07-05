/**
 * Utilidades do FUNDAMENTAL 1 (a Academia).
 *
 * No F1 cada turma vive uma "Academia": 1º-3º ano = Academia de Superpoderes;
 * 4º-5º = Academia de Talentos. A trilha do ano continua sendo as 8
 * inteligências (mesma turma_trilha/fases do Infantil), mas cada uma é
 * apresentada com um nome de ação (o "módulo").
 */

/** Nome de ação de cada inteligência (id 1..8, mesma ordem da tabela inteligencias). */
export const ACADEMIA_F1: Record<number, string> = {
  1: 'A Palavra na Medida',
  2: 'O Detetive de Padrões',
  3: 'O Mapa da Mente',
  4: 'O Ouvido de Radar',
  5: 'A Oficina das Mãos',
  6: 'O Olhar de Lupa',
  7: 'O Radar de Gente',
  8: 'A Bússola de Dentro',
};

/** Nome de ação a partir do NOME técnico da inteligência (como vem do banco). */
export const ACADEMIA_POR_NOME: Record<string, string> = {
  'Linguística': ACADEMIA_F1[1],
  'Lógico-Matemática': ACADEMIA_F1[2],
  'Espacial': ACADEMIA_F1[3],
  'Musical': ACADEMIA_F1[4],
  'Corporal-Cinestésica': ACADEMIA_F1[5],
  'Naturalista': ACADEMIA_F1[6],
  'Interpessoal': ACADEMIA_F1[7],
  'Intrapessoal': ACADEMIA_F1[8],
};

/** Rótulo de módulo pra exibição: nome de ação quando conhecido, senão o técnico. */
export const nomeModulo = (nomeInteligencia: string) =>
  ACADEMIA_POR_NOME[nomeInteligencia] ?? nomeInteligencia;

/** 1º-3º ano ("1º Ano".."3º Ano") = faixa 1. */
export const ehFaixa1 = (serie?: string | null) => /^[1-3]/.test((serie ?? '').trim());

/** Turma sem série identificável cai em "Academia de Talentos" (inofensivo). */
export const nomeAcademia = (serie?: string | null) =>
  ehFaixa1(serie) ? 'Academia de Superpoderes' : 'Academia de Talentos';

export const palavraPoder = (serie?: string | null) =>
  ehFaixa1(serie) ? 'superpoder' : 'talento';

export const palavraPoderPlural = (serie?: string | null) =>
  ehFaixa1(serie) ? 'superpoderes' : 'talentos';
