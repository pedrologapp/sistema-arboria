/**
 * FLAG das reacoes rapidas no chat de canal do aluno F2.
 * Quando ligada, cada mensagem do canal ganha um affordance UNIFORME de reagir
 * (um "+" discreto, igual em toda mensagem, no hover/long-press) que abre um
 * seletor com 4 reacoes curadas e positivas: curtir, apoiar, joia e combinado.
 * As reacoes existentes aparecem como chips com contagem no proprio balao, no
 * estilo WhatsApp (da pra ver quem reagiu).
 *
 * REGRA INEGOCIAVEL (Riscos): a feature NUNCA renderiza a AUSENCIA. Mensagem com
 * zero reacao fica visualmente identica a uma mensagem de antes da feature: sem
 * "0", sem contador vazio, sem placeholder. So o affordance de reagir (igual em
 * todas) aparece, entao as vazias nao ficam marcadas. Sem agregado, sem ranking,
 * sem leitura sociometrica pro adulto: a reacao so vive no balao do chat do aluno.
 *
 * Isolamento (Riscos): os dados de reacao NAO alimentam IA/perfil/serie
 * longitudinal. Sem trigger, sem webhook, fora de qualquer view do pipeline n8n.
 * Retencao curta (expurgo junto das mensagens de canal).
 *
 * DEFAULT FALSE: desligada, o chat renderiza EXATAMENTE como hoje, sem regressao.
 * So o Fundador liga (localhost primeiro; nunca commitar true).
 */
export const F2_ALUNO_REACOES = true; // LIVE em producao (ordem do Fundador 13/07, testado no localhost). Migration aplicada. Reversivel: false + deploy.
