/**
 * FLAG de PRÉVIA do formato TIMES no Capítulo do aluno (Fundamental 2).
 *
 * DEFAULT FALSE. Com o flag DESLIGADO, nada muda: o Capítulo do aluno se comporta
 * exatamente como hoje. Quando o capítulo for do formato TIMES (papéis com
 * categoria 'time', ex.: Arena Arboria), os stages SeuTime/OsTimes já aparecem
 * normalmente; a prévia NÃO é necessária para isso.
 *
 * A prévia serve apenas para o Fundador VER o stage SeuTime preenchido no
 * localhost SEM ter uma alocação real: com o flag LIGADO, se o capítulo for de
 * TIMES e o aluno ainda não estiver alocado, o PRIMEIRO time (por ordem) é
 * tratado como "seu time", com um selo discreto "prévia".
 *
 * Só o Fundador vira este flag (localhost primeiro; nunca em produção sem ordem).
 * NÃO commitar true (produção = false).
 */
export const F2_ALUNO_CAPITULO_PREVIEW = false;
