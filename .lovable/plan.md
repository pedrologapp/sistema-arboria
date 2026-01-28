

# Plano: Remover Alunos de Teste

## Objetivo
Excluir os 3 alunos de teste existentes para preparar o sistema para importação dos alunos reais via N8N.

## Alunos a serem removidos

| Nome | ID | Série/Turma |
|------|----|-------------|
| Lucas Freire | `8f6cf7bd-0847-430f-9cb2-ba31023eba8c` | 6º ano A |
| Lucas Silva | `88de4658-3bc1-4457-afc1-fbf7aac6e2ad` | 6º ano A |
| Pedro Luciano | `b5607cb6-94e2-48b7-89af-104ddaa447f7` | 6º ano A |

## Método de Exclusão
Utilizarei a Edge Function `delete-user` existente, que já realiza a limpeza completa de todos os registros relacionados:
- `score_ajustes_log`
- `inteligencia_evidencias`, `inteligencia_historico`, `inteligencia_scores`
- `entregas`, `observacoes`, `alertas_alunos`
- `acoes_professor`, `acoes_celebracao`
- `aluno_turma`, `cargos_casa`, `missao_destinatarios`
- `bonus_solicitacoes`, `pontos_gerais`
- `mensagens_canal`, `mensagens_privadas`, `conversa_participantes`, `canal_leituras`
- E finalmente o usuário do Auth (que cascateia para `profiles` e `user_roles`)

## Implementação
Farei 3 chamadas à Edge Function `delete-user` com os IDs dos alunos.

## Resultado Esperado
Sistema limpo e pronto para receber os ~400 alunos reais do ActiveSoft via sincronização N8N.

