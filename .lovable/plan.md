

## Plano: Adicionar aba "Mapa" no Monitoramento do Admin

### Contexto

A `MonitorPage` atualmente exibe apenas o feed de observações. Os dados do Mapa de Desenvolvimento (`mapa_desenvolvimento`) não aparecem para o admin. A tabela `mapa_desenvolvimento` já tem `institution_id`, `professor_id`, `turma_id`, `quadrante`, `semana_numero`, `created_at`.

### Alteração necessária

**Arquivo**: `src/pages/admin/MonitorPage.tsx`

1. **Adicionar Tabs** (Observações | Mapa) usando o componente `Tabs` de `@/components/ui/tabs`, substituindo o card fixo de "Atividade Recente" por duas abas.

2. **Aba "Observações"** (👁️): Mantém o feed atual de observações exatamente como está (filtros de tempo, lista de obs, realtime).

3. **Aba "Mapa"** (🗺️): Nova query que busca registros de `mapa_desenvolvimento` agrupados por `professor_id + turma_id + semana_numero + updated_at` (registros salvos juntos). Para cada "salvamento", exibir:
   - Avatar + nome do professor
   - Nome da turma
   - Semana N
   - Resumo dos quadrantes (ex: "3 Surpreendeu, 5 Foi bem, 2 Dificuldades, 1 Atenção")
   - Tempo relativo

4. **Realtime** para `mapa_desenvolvimento`: adicionar listener no mesmo channel para invalidar a query do mapa ao receber INSERT/UPDATE.

5. **Filtros de tempo**: reutilizar o mesmo padrão (hoje/7dias/todas) para a aba Mapa, com estado independente.

### Migração SQL

Necessária uma política RLS para o admin ler `mapa_desenvolvimento`:
- Verificar se já existe — se não, criar policy SELECT para admin da instituição.

### Estrutura visual

```text
┌─────────────────────────────────────┐
│ Monitoramento           [Sync btn] │
├─────────────────────────────────────┤
│ [Sync card]                         │
├─────────────────────────────────────┤
│ 👁️ Observações  |  🗺️ Mapa        │  ← Tabs
├─────────────────────────────────────┤
│ [filtros: hoje|7d|todas]            │
│ Feed items...                       │
└─────────────────────────────────────┘
```

### Arquivos alterados
- `src/pages/admin/MonitorPage.tsx` — adicionar Tabs, query do mapa, realtime do mapa
- Possível migração SQL — RLS policy para admin ler `mapa_desenvolvimento`

