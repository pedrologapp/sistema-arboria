/**
 * FLAG do Perfil novo do aluno F2: troca as barras de porcentagem por
 * inteligencia (score de valor) pela Arvore de Talentos e adiciona a linha do
 * tempo pessoal "Seu ano". Vive DENTRO do visor novo (F2_ALUNO_VISOR_NOVO).
 *
 * Doutrina: a arvore e a linha sao o "eu" do aluno, privado e aditivo. Sem
 * porcentagem, sem nota, sem ranking, sem comparacao com colega.
 *
 * DEFAULT FALSE: desligada, o Perfil renderiza EXATAMENTE como hoje (barras),
 * sem regressao. So o Fundador liga (localhost primeiro; nunca commitar true).
 */
export const F2_ALUNO_PERFIL_ARVORE = false; // DESLIGADA por ordem do Fundador (13/07): nao gostou de como a arvore ficou, e assunto delicado. Volta so com um design novo aprovado. O "Seu ano" e independente (F2_ALUNO_PERFIL_SEU_ANO).
