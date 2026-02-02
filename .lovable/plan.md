

# Plano: Corrigir Duplicação de Sugestões nos Cards de Alertas

## Diagnóstico Completo

### Dados no Banco (Aluno Adryan - 84938726)

| ID | tipo_alerta | motivo | status | gerado_por |
|----|-------------|--------|--------|------------|
| 95097e37... | `aguardando_explicacao` | analise_n8n | ativo | n8n |
| e4af66db... | `celebrar` | confirmacao | ativo | NULL |

**Problema:** Dois alertas ativos para o mesmo aluno, causando contagem em 2 cards.

### Causa Raiz

1. **Triggers internos** criam alertas com `motivo: 'confirmacao'` (não são do N8N)
2. **Edge Function** só arquiva alertas com `motivo: 'analise_n8n'` (linha 274-283)
3. **Quando N8N envia `aguardando_explicacao`**, o alerta antigo de `celebrar` (confirmacao) permanece ativo

### Comportamento Esperado

Quando uma sugestão tem `tipo_alerta = 'aguardando_explicacao'` (justificativa pendente):
- Deve aparecer **SOMENTE** no card "Precisa de justificativa"
- **NÃO** deve ser contada em "Celebre", "Precisam de você", etc.

---

## Solução Proposta

### Arquivo: `src/hooks/useAlertasAlunos.ts`

Modificar a lógica de agrupamento para garantir **exclusão mútua** baseada na prioridade de justificativa.

#### Alteração 1: Identificar Alunos com Justificativa Pendente (Linha ~337)

Antes de agrupar por tipo, criar um Set com IDs dos alunos que têm `aguardando_explicacao`:

```typescript
// 10.1 Extrair alertas de aguardando_explicacao
const aguardandoExplicacao: AlertaExplicacao[] = alertasFaseAtual
  .filter(a => a.tipo_alerta === 'aguardando_explicacao')
  .map(alerta => ({ /* ... mapping */ }));

// NOVO: IDs de alunos com justificativa pendente
const alunosComJustificativaPendente = new Set(
  aguardandoExplicacao.map(a => a.aluno.id)
);
```

#### Alteração 2: Filtrar Outros Cards Excluindo Alunos com Justificativa (Linhas 332-335)

```typescript
// 10. Agrupar alertas da fase atual por tipo
// EXCLUIR alunos que já estão em "aguardando_explicacao"
const precisaAtencao = alertasFaseAtual.filter(a => 
  a.tipo_alerta === 'precisa_atencao' && 
  !alunosComJustificativaPendente.has(a.aluno.id)
);

const celebrarDb = alertasFaseAtual.filter(a => 
  a.tipo_alerta === 'celebrar' && 
  !alunosComJustificativaPendente.has(a.aluno.id)
);

const naoEsquecerDb = alertasFaseAtual.filter(a => 
  a.tipo_alerta === 'nao_esquecer' && 
  !alunosComJustificativaPendente.has(a.aluno.id)
);
```

#### Alteração 3: Celebrações Dinâmicas Também Devem Ser Excluídas (Linha ~353)

```typescript
for (const aluno of alunosCasa || []) {
  // Pular se já tem alerta de celebração no banco
  if (alunosJaCelebrados.has(aluno.id)) continue;
  
  // NOVO: Pular se tem justificativa pendente
  if (alunosComJustificativaPendente.has(aluno.id)) continue;
  
  // ... resto da lógica
}
```

#### Alteração 4: "Não Esqueça" Calculado Dinamicamente (Linha ~225)

```typescript
const alunosNaoEsquecer: AlertaAluno[] = (alunosCasa || [])
  .filter(aluno => {
    // NOVO: Excluir alunos com justificativa pendente
    // (precisamos mover esta filtragem para após o cálculo do aguardandoExplicacao)
    // ... lógica existente
  })
```

### Refatoração da Ordem de Execução

Para aplicar o filtro corretamente, a ordem das operações precisa ser ajustada:

```text
ANTES:
1. Buscar alertas do banco
2. Separar por fase atual vs anterior
3. Calcular "Não esqueça" dinâmico
4. Agrupar por tipo (precisa_atencao, celebrar, etc.)
5. Extrair aguardando_explicacao

DEPOIS:
1. Buscar alertas do banco
2. Separar por fase atual vs anterior
3. **Extrair aguardando_explicacao PRIMEIRO**
4. **Criar Set de alunos com justificativa pendente**
5. Calcular "Não esqueça" dinâmico (excluindo set)
6. Agrupar por tipo (excluindo set)
```

---

## Correção na Edge Function (Prevenção Futura)

### Arquivo: `supabase/functions/receber-sugestao-n8n/index.ts`

Atualmente (linha 274-283):
```typescript
.eq("motivo", "analise_n8n")
```

**Problema:** Só arquiva alertas N8N, deixando alertas de triggers internos ativos.

**Solução:** Quando receber `aguardando_explicacao`, arquivar TODOS os alertas ativos do aluno:

```typescript
// 7. Archive active alerts for this student
// For 'aguardando_explicacao', archive ALL alerts (not just N8N)
// For other types, archive only N8N alerts
const archiveQuery = supabase
  .from("alertas_alunos")
  .update({
    status: "arquivado",
    notificacao_ativa: false,
    updated_at: new Date().toISOString(),
  })
  .eq("aluno_id", aluno.id)
  .eq("status", "ativo");

// Se é justificativa, arquiva TODOS os alertas
if (tipoAlertaFinal === 'aguardando_explicacao') {
  await archiveQuery;
} else {
  // Para outros tipos, arquiva apenas os do N8N
  await archiveQuery.eq("motivo", "analise_n8n");
}
```

---

## Correção Imediata dos Dados

Para limpar a duplicação existente no banco:

```sql
-- Arquivar alertas duplicados onde o aluno já tem aguardando_explicacao
UPDATE alertas_alunos a1
SET status = 'arquivado', 
    notificacao_ativa = false,
    updated_at = NOW()
WHERE a1.status = 'ativo'
  AND a1.tipo_alerta != 'aguardando_explicacao'
  AND EXISTS (
    SELECT 1 FROM alertas_alunos a2
    WHERE a2.aluno_id = a1.aluno_id
      AND a2.tipo_alerta = 'aguardando_explicacao'
      AND a2.status = 'ativo'
  );
```

---

## Resultado Esperado

### Cenário: Adryan com Justificativa Pendente

| Card | Contagem ANTES | Contagem DEPOIS |
|------|----------------|-----------------|
| Celebre | 1 | **0** |
| Precisa de justificativa | 1 | **1** |

### Regra de Exclusão Mútua

```text
Para cada aluno:
  SE existe alerta ativo com tipo = 'aguardando_explicacao':
    → Aparece APENAS em "Precisa de justificativa"
    → IGNORADO em todos os outros cards
  SENÃO:
    → Aparece no card correspondente ao seu tipo
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/useAlertasAlunos.ts` | Reordenar lógica e adicionar filtro de exclusão |
| `supabase/functions/receber-sugestao-n8n/index.ts` | Arquivar todos alertas para aguardando_explicacao |
| **SQL (Cloud View)** | Limpar duplicações existentes |

---

## Impacto

- **Nenhuma mudança visual** - Apenas corrige contagens
- **Backward compatible** - Lógica existente mantida para outros tipos
- **Prevents future issues** - Edge Function passa a arquivar corretamente

