/**
 * FLAG: a fase atual na HOME DO ALUNO passa a vir da TRILHA da turma (a mesma que
 * o professor ve), via RPC fase_atual_do_aluno(), em vez da fase por data.
 *
 * DEFAULT FALSE. Desligada, o aluno ve EXATAMENTE o que ve hoje (fase por data) e
 * a query do RPC nem roda. Separada do F2_REFORMA_ATIVA (que e o painel do
 * professor). So o Fundador liga, e apenas depois de: (1) validacao do texto pelo
 * setor de Conteudo (texto visivel a crianca) e (2) ordem explicita dele. Nunca
 * commitar como true sem essa dupla aprovacao.
 */
export const F2_ALUNO_FASE_TRILHA = true; // LIVE em producao desde o lancamento da fase do aluno F2 (ordem do Fundador 11/07). Reversivel: false + deploy.
