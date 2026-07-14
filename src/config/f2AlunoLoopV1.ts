/**
 * FLAG do primeiro tijolo do LOOP DE FEEDBACK (pesquisa "Arboria investivel",
 * unlock nº1 das 4 lentes): reformular o estado da missao ENVIADA para que o
 * aluno leia "Recebido, em análise" em vez de "Enviada. Aguardando avaliação".
 * Mata a sensacao de vacuo ("mandei e ninguem olhou") sem nenhuma mudanca de
 * backend. Passos seguintes do loop (devolutiva da IA + notificacao) virao depois.
 *
 * DEFAULT FALSE: desligado, os textos ficam EXATAMENTE como hoje. So o Fundador
 * liga (localhost primeiro; nunca commitar true).
 */
export const F2_ALUNO_LOOP_V1 = true; // LIVE em producao (ordem do Fundador 13/07). Reversivel: false + deploy.
