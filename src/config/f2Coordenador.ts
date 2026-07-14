/**
 * FLAG do VISOR DO COORDENADOR (papel novo "coordenador", só leitura).
 *
 * DEFAULT FALSE. Com o flag DESLIGADO, nada do coordenador é montado: as rotas
 * /coordenador redirecionam como qualquer rota protegida sem permissão e o papel
 * não altera nenhum fluxo existente. Produção intocada.
 *
 * Com o flag LIGADO, quem tem o papel `coordenador` (user_roles) acessa a árvore
 * /coordenador: layout DARK próprio, barra de 3 abas (Gestão, Inteligências,
 * Diário) e o painel de monitoramento por segmento. O escopo (quais turmas o
 * coordenador enxerga) é imposto no BANCO (RLS + coordenador_segmento), nunca só
 * na interface.
 *
 * Só o Fundador vira este flag (localhost primeiro; nunca em produção sem ordem).
 */
export const F2_COORDENADOR = true; // LOCAL/TESTE: ligado so no working copy do Pedro. NAO commitar true (producao = false).
