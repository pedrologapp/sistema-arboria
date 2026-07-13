/**
 * FLAG do tour imersivo do aluno F2 (o "Help"): um percurso de 6 telas que
 * explica o Arboria, aberto pelo "?" no header (no lugar do sino) e que surge
 * sozinho na primeira vez que o aluno entra.
 *
 * DEFAULT FALSE: desligado, o header mantem o sino EXATAMENTE como hoje, sem
 * regressao, e nenhum tour aparece. So o Fundador liga (localhost primeiro;
 * nunca commitar true). Texto de crianca aprovado; ponto de entrada aprovado
 * (Fundador 13/07: "?" no lugar do sino).
 */
export const F2_ALUNO_TOUR = true; // LIVE em producao desde o lancamento do tour (ordem do Fundador 13/07). Substitui o OnboardingModal antigo. Reversivel: false + deploy.
