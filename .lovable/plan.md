

# Plano: Corrigir Filtro de Segmento Infantil na Visão Geral

## Problema Identificado

O filtro de segmento "Infantil" na visão geral de turmas e professores **não está funcionando corretamente** porque:

1. A tabela `turmas` **não possui uma coluna `segmento`**
2. As séries 2, 3, 4 e 5 são compartilhadas entre **Infantil** e **Fundamental 1**
3. O filtro atual usa apenas o número da série, causando ambiguidade

### Exemplo do problema:
- "2º A" (série 2) aparece tanto no Infantil quanto no Fundamental 1
- "5º B" (série 5) também aparece em ambos

---

## Solução Proposta

### Opção A: Adicionar coluna `segmento` na tabela `turmas` (Recomendado)

Criar uma nova coluna na tabela `turmas` para identificar corretamente o segmento de cada turma.

**Vantagens:**
- Solução definitiva e correta
- Permite diferenciação clara entre segmentos
- Alinha com a lógica de outras tabelas (profiles tem segmento)

**Alterações necessárias:**
1. Migração SQL para adicionar coluna `segmento`
2. Popular dados existentes (turmas 1-5 como fundamental1, 6-9 como fundamental2)
3. Atualizar componente para usar novo campo

---

## Plano de Implementação

### Passo 1: Migração do Banco de Dados

Adicionar coluna `segmento` na tabela `turmas`:

```sql
-- Adicionar coluna segmento
ALTER TABLE turmas 
ADD COLUMN segmento TEXT CHECK (segmento IN ('infantil', 'fundamental1', 'fundamental2'));

-- Popular dados baseado na série atual
-- Séries 1-5 serão fundamental1 (não há turmas do infantil cadastradas ainda)
-- Séries 6-9 serão fundamental2
UPDATE turmas SET segmento = 
  CASE 
    WHEN serie >= 6 THEN 'fundamental2'
    ELSE 'fundamental1'
  END
WHERE segmento IS NULL;

-- Criar índice para otimizar consultas
CREATE INDEX idx_turmas_segmento ON turmas(segmento);
```

### Passo 2: Atualizar Query do Componente

Modificar `TabelaVisaoGeralProfessores.tsx` para buscar turmas pelo segmento:

```typescript
// ANTES (linha 33-38):
const { data: turmas } = await supabase
  .from('turmas')
  .select('id, nome, serie, turma_letra')
  .eq('institution_id', institutionId)
  .order('serie');

// DEPOIS:
const { data: turmas } = await supabase
  .from('turmas')
  .select('id, nome, serie, turma_letra, segmento')
  .eq('institution_id', institutionId)
  .order('serie');
```

### Passo 3: Atualizar Lógica de Filtragem

Substituir filtragem por série para filtragem por segmento:

```typescript
// ANTES (linhas 123-127):
const turmasFiltradas = turmasData?.filter(turma => {
  const series = SERIES_POR_SEGMENTO[segmentoVisao];
  return series.includes(turma.serie);
}) || [];

// DEPOIS:
const turmasFiltradas = turmasData?.filter(turma => 
  turma.segmento === segmentoVisao
) || [];
```

### Passo 4: Remover Mapeamento Obsoleto

O objeto `SERIES_POR_SEGMENTO` não será mais necessário para a filtragem principal e pode ser simplificado ou removido.

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| **Migração SQL** | Adicionar coluna `segmento` na tabela `turmas` |
| `src/components/admin/TabelaVisaoGeralProfessores.tsx` | Atualizar query e lógica de filtragem |

---

## Impacto em Outras Áreas

A adição da coluna `segmento` na tabela `turmas` pode beneficiar outras funcionalidades:

1. **Importação de turmas** - Validar segmento ao criar turmas
2. **Gestão de professores** - Filtrar turmas disponíveis por segmento
3. **Relatórios** - Agrupar dados por segmento corretamente

---

## Resultado Esperado

Após a implementação:

| Segmento Selecionado | Turmas Exibidas |
|---------------------|-----------------|
| **Infantil** | Apenas turmas com `segmento = 'infantil'` |
| **Fund. I** | Apenas turmas com `segmento = 'fundamental1'` |
| **Fund. II** | Mostra as 8 casas (comportamento atual mantido) |

---

## Observação Importante

Como **não existem turmas do segmento Infantil cadastradas** atualmente no banco de dados (todas são 1º-5º ano do Fundamental ou 6º-9º ano), o admin precisará:

1. Cadastrar as turmas do Infantil manualmente, ou
2. Atualizar o segmento das turmas existentes que pertencem ao Infantil

A migração definirá todas as turmas 1-5 como `fundamental1` por padrão. Se houver turmas do Infantil misturadas, o admin poderá ajustar posteriormente.

