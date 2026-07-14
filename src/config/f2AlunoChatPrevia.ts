/**
 * FLAG da previa da ultima mensagem real na lista de canais da Chat do aluno F2.
 * Quando ligada, a segunda linha de cada card de canal (visor novo) mostra a
 * ULTIMA mensagem de verdade ("Nome: texto"), no lugar da descricao fixa. Da a
 * sensacao de app vivo. So le dados (nenhum esquema novo).
 *
 * Seguranca: a previa so aparece para canais que o aluno ja pode ver. Canais
 * travados (Lideranca/Conselho) nao entram na consulta e mantem o texto neutro
 * de hoje. A RLS de mensagens_canal e a barreira real; isto e defesa em camadas.
 *
 * DEFAULT FALSE: desligada, a lista renderiza EXATAMENTE como hoje (descricao
 * fixa), sem regressao. So o Fundador liga (localhost primeiro; nunca commitar
 * true).
 */
export const F2_ALUNO_CHAT_PREVIA = true; // LIVE em producao (ordem do Fundador 13/07). Reversivel: false + deploy.
