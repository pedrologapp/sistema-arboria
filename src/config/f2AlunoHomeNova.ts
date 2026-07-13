/**
 * FLAG: nova HOME DO ALUNO (Fundamental 2), reordenada em torno da jornada.
 *
 * DEFAULT FALSE. Desligada, a home do aluno se comporta EXATAMENTE como hoje
 * (nenhuma regressao: mesmos cartoes, mesma ordem). Ligada, renderiza a HomeNova:
 * jornada no topo (Casa + fase da turma + placar discreto), o Capitulo da vez como
 * destaque, missoes, e o restante (avisos, cross-im, check-in, relatos) recolhido
 * mais abaixo.
 *
 * So o Fundador vira este flag (localhost primeiro; nunca em producao sem ordem).
 * NAO commitar true (producao = false). Rascunho para avaliacao do Fundador.
 */
export const F2_ALUNO_HOME_NOVA = true; // LIVE em producao desde o lancamento do visor novo (ordem do Fundador 13/07). Reversivel: false + deploy.
