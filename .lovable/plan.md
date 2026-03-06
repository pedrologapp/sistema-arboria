

## Plano: Cards resumo clicáveis como filtro

Tornar os 4 cards de resumo (Logins, Entregas, Mensagens, Observações) clicáveis para filtrar a timeline pelo tipo de ação correspondente. Clicar novamente no card ativo volta para "Todos".

### Alterações em `src/pages/admin/AtividadesPage.tsx`

1. Adicionar campo `actionValue` ao array `summaryCards` mapeando cada card ao filtro correto:
   - Logins → `login`, Entregas → `missao_entrega`, Mensagens → `chat_mensagem`, Observações → `observacao_criada`

2. Tornar cada card um `button` com `onClick` que:
   - Se `actionFilter === card.actionValue` → volta para `'all'`
   - Senão → seta `actionFilter` para o valor do card

3. Adicionar estilo visual de "selecionado" (borda colorida ou ring) quando o card está ativo, usando `cn()`.

Nenhuma outra funcionalidade será alterada.

