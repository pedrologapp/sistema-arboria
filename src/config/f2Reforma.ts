/**
 * FLAG da reforma do painel do professor no Fundamental 2.
 *
 * DEFAULT FALSE. Com o flag DESLIGADO, o F2 continua EXATAMENTE como hoje:
 * layout escuro (ProfessorLayoutF2), barra de 7 abas (ProfessorBottomNav) e
 * ProfessorDashboard. Nada da reforma é montado. Produção intocada.
 *
 * Com o flag LIGADO, o segmento fundamental2 passa a usar o shell claro novo
 * (4 abas: Arboria, Inteligências, Diário, Sua Casa) e a nova aba Arboria.
 *
 * Só o Fundador vira este flag (localhost primeiro; nunca em produção sem ordem).
 * Infantil e F1 NÃO são afetados por este flag em nenhum estado.
 */
export const F2_REFORMA_ATIVA = true; // LOCAL/TESTE: ligado so no working copy do Pedro. NAO commitar true (producao = false).

/**
 * Cores canônicas das 8 inteligências (por id), definidas pelo Fundador para a
 * reforma do F2. Uso: escudo/brasão de fallback e acentos das Casas.
 */
export const COR_INTELIGENCIA: Record<number, string> = {
  1: '#1E3A8A',
  2: '#047857',
  3: '#7C3AED',
  4: '#7F1D1D',
  5: '#B8860B',
  6: '#78350F',
  7: '#0891B2',
  8: '#EA580C',
};

/** Cor da Casa por id, com fallback índigo neutro se o id for desconhecido. */
export const corDaCasa = (inteligenciaId?: number | null): string =>
  (inteligenciaId != null && COR_INTELIGENCIA[inteligenciaId]) || '#4F46E5';
