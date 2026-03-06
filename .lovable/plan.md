

## Plano: Filtrar missões por fase ativa + série do aluno

### Problema raiz
A função SQL `get_missoes_do_aluno` não verifica a série da **fase** (`fases.serie`). As missões têm `serie_filtro = NULL` (campo da missão), mas pertencem a fases com `serie` específica (6, 7, 8, 9). Como o filtro só checa `m.serie_filtro`, todas as 4 missões passam.

Dados atuais do Adryan (6º Ano, Casa Linguística = casa_id 1):
- "A Voz do Personagem" → fase serie=6 ✅ deveria ver
- "O Poder das Palavras nas Emoções" → fase serie=7 ❌
- "O Poder das Palavras nas Emoções Invisíveis" → fase serie=8 ❌
- "O Poder das Palavras nos Paradoxos" → fase serie=9 ❌

### Correções

**1. Função SQL `get_missoes_do_aluno`** (migração)

Adicionar JOIN com `fases` e filtrar:
- Se a missão tem `fase_id`, a fase deve ter `serie` compatível com o aluno (`fases.serie = v_serie_num` OU `fases.serie IS NULL`)
- A fase deve estar no período ativo (`data_inicio <= now()` e `data_fim >= now()`)

```sql
-- Adicionar ao WHERE existente:
AND (
  m.fase_id IS NULL
  OR EXISTS (
    SELECT 1 FROM fases f
    WHERE f.id = m.fase_id
      AND f.data_inicio <= v_now::date
      AND f.data_fim >= v_now::date
      AND (f.serie IS NULL OR f.serie = v_serie_num)
  )
)
```

**2. `src/hooks/useNotificacoes.ts`**

Atualizar a construção de `faseIdsValidos` para também filtrar por série do aluno. Extrair o número da série do `profile.serie` e adicionar `.eq('serie', serieNum)` na query de fases (com fallback para `serie IS NULL`). Isso garante que as contagens de badges só considerem missões da fase correta.

### Resultado esperado
Adryan (6º Ano) verá apenas 1 missão (da fase 1 do 6º Ano) e o badge mostrará 1 notificação.

