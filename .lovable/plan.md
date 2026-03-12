

## Plano: Resetar dados da Semana 2 e permitir edição da Semana 1

### Parte 1 — Deletar dados da Semana 2 (Grupo IV, professora Jaqueline)

Executar via insert tool (operação de dados):

```sql
DELETE FROM mapa_desenvolvimento
WHERE semana_numero = 2
  AND turma_id IN (
    SELECT id FROM turmas WHERE serie = 'Grupo IV' OR serie = '4'
  )
  AND professor_id = '7050e5ee-07e8-4d23-b6a9-45be22e2f6f6';
```

Isso apaga todas as alocações de quadrante da semana 2 feitas pela Jaqueline para o Grupo IV.

### Parte 2 — Permitir edição de semanas passadas (não travar semana 1)

Atualmente em `MapaDesenvolvimentoPage.tsx`, a lógica na linha 135 restringe edição de semanas passadas:

```typescript
const canEdit = !isSemanaFutura && (!isSemanaPassada || (isSemanaPassada && selectedSemana === semanaAtual - 1 && isEditing));
```

Isso só permite editar **uma** semana anterior (semanaAtual - 1). Se a fase está na semana 3, o professor não pode editar semana 1.

**Alteração**: Remover a restrição de "apenas semana anterior". Semanas passadas serão editáveis ao clicar em "Editar":

```typescript
const canEdit = !isSemanaFutura && (!isSemanaPassada || isEditing);
```

E na UI (linha 475), remover a condição `selectedSemana === semanaAtual - 1` do botão "Editar" para que apareça em **qualquer** semana passada:

```typescript
// Antes
{selectedSemana === semanaAtual - 1 && (
  <button onClick={() => setIsEditing(true)} ...>Editar</button>
)}

// Depois
<button onClick={() => setIsEditing(true)} ...>Editar</button>
```

Também no `CirculoTurmaDirectPage.tsx`, as semanas futuras continuam desabilitadas, mas semanas passadas já são acessíveis — sem mudança necessária ali.

### Parte 3 — Semana sem dados deve aparecer como editável (não read-only)

Já funciona assim: quando `savedAlocacoes` está vazio, `hasSavedData` é `false` e `isReadOnly` é `false`, permitindo edição. Sem alteração necessária.

### Resumo de arquivos alterados

- **Dados**: DELETE no `mapa_desenvolvimento` (semana 2, Grupo IV, Jaqueline)
- **Código**: `src/pages/professor/MapaDesenvolvimentoPage.tsx` — 2 linhas alteradas para desbloquear edição de qualquer semana passada

