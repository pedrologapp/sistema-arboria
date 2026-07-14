/**
 * FLAG do Mural da Casa (aba Casa do aluno F2, dentro do visor novo).
 * O Mural e um feed dos feitos COLETIVOS recentes da Casa (missoes concluidas
 * por membros), pra a Casa deixar de ser estatica e virar time vivo. Coletivo
 * por doutrina: sem ranking individual, sem pontos por pessoa, sem comparacao.
 *
 * DEFAULT FALSE: desligada, a aba Casa renderiza EXATAMENTE como hoje, sem
 * regressao. So o Fundador liga (localhost primeiro; nunca commitar true).
 * Depende de F2_ALUNO_VISOR_NOVO (o Mural so existe no visor novo).
 */
export const F2_ALUNO_MURAL_CASA = true; // LIVE em producao (ordem do Fundador 13/07). Reversivel: false + deploy.
