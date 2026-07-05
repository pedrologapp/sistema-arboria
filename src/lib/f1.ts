/**
 * Utilidades do FUNDAMENTAL 1 (a Academia).
 *
 * No F1 cada turma vive uma "Academia": 1º-3º ano = Academia de Superpoderes;
 * 4º-5º = Academia de Talentos. A trilha do ano continua sendo as 8
 * inteligências (mesma turma_trilha/fases do Infantil), mas cada uma é
 * apresentada com um nome de ação (o "módulo").
 */

/**
 * Rótulo de cada módulo da trilha (id 1..8, mesma ordem da tabela inteligencias).
 * Decisão do Fundador (05/07): a trilha se chama "Os 8 superpoderes/talentos",
 * mas cada módulo é lido pelo nome REAL da inteligência. Sem nomes fictícios:
 * nome inventado vira rótulo, e rótulo é o que o Arboria não faz.
 */
export const ACADEMIA_F1: Record<number, string> = {
  1: 'Inteligência Linguística',
  2: 'Inteligência Lógico-Matemática',
  3: 'Inteligência Espacial',
  4: 'Inteligência Musical',
  5: 'Inteligência Corporal-Cinestésica',
  6: 'Inteligência Naturalista',
  7: 'Inteligência Interpessoal',
  8: 'Inteligência Intrapessoal',
};

/** Rótulo de módulo a partir do nome técnico vindo do banco ("Linguística" -> "Inteligência Linguística"). */
export const nomeModulo = (nomeInteligencia: string) =>
  nomeInteligencia.startsWith('Inteligência') ? nomeInteligencia : `Inteligência ${nomeInteligencia}`;

/** 1º-3º ano ("1º Ano".."3º Ano") = faixa 1. */
export const ehFaixa1 = (serie?: string | null) => /^[1-3]/.test((serie ?? '').trim());

/** Turma sem série identificável cai em "Academia de Talentos" (inofensivo). */
export const nomeAcademia = (serie?: string | null) =>
  ehFaixa1(serie) ? 'Academia de Superpoderes' : 'Academia de Talentos';

export const palavraPoder = (serie?: string | null) =>
  ehFaixa1(serie) ? 'superpoder' : 'talento';

export const palavraPoderPlural = (serie?: string | null) =>
  ehFaixa1(serie) ? 'superpoderes' : 'talentos';
