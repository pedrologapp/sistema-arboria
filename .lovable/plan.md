

## Plano: Corrigir visualização de logs ao filtrar por tipo

### Problema
O filtro de período padrão é "Hoje". Os dados históricos de mensagens (backfill) têm datas antigas, então ao clicar em "Mensagens" com período "Hoje" não aparece nada.

### Solução

**Arquivo:** `src/pages/admin/AtividadesPage.tsx`

1. Adicionar opção **"Total"** (todo o histórico) ao `PERIOD_OPTIONS`:
   ```typescript
   { value: 'all', label: 'Total' }
   ```

2. Atualizar `getDateFilter` para retornar uma data bem antiga quando `period === 'all'` (ex: `2020-01-01`).

3. Alterar o período padrão de `'today'` para `'30d'` para que os dados históricos apareçam ao abrir a página.

Nenhuma outra alteração necessária — o filtro por ação (`chat_mensagem`) já funciona corretamente, o problema é apenas o período restritivo.

