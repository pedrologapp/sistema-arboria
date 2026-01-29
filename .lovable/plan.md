
# Plano: Importação Robusta de Alunos em Lotes

## Problema Identificado

A Edge Function `import-users` tem 3 problemas críticos:

1. **Timeout**: Processa sequencialmente (~7 operações/aluno), causando timeout em ~60 alunos
2. **Sem UPSERT**: Não verifica se aluno já existe pela matrícula antes de criar
3. **Sem progresso**: Usuário não sabe quantos foram processados se der erro

---

## Solução Proposta: Processamento em Lotes no Frontend

Em vez de enviar todos os alunos de uma vez para a Edge Function, o frontend divide em lotes menores e processa sequencialmente com feedback visual.

```text
┌──────────────────────────────────────────────────────────────────┐
│                    NOVA ARQUITETURA                              │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  FRONTEND (ModalImportarCSV.tsx)                                 │
│  ├─ Divide 92 alunos em lotes de 20                              │
│  ├─ Envia lote 1 (1-20) → aguarda resposta                       │
│  ├─ Atualiza barra de progresso: 20/92                           │
│  ├─ Envia lote 2 (21-40) → aguarda resposta                      │
│  ├─ Atualiza barra de progresso: 40/92                           │
│  ├─ ... continua até completar                                   │
│  └─ Mostra resultado final consolidado                           │
│                                                                  │
│  EDGE FUNCTION (import-users)                                    │
│  ├─ Recebe lote de 20 alunos                                     │
│  ├─ Para cada aluno:                                             │
│  │   ├─ Verifica se existe pela matricula_externa                │
│  │   ├─ SE EXISTE: atualiza dados (UPSERT)                       │
│  │   └─ SE NÃO EXISTE: cria novo usuário                         │
│  └─ Retorna resultado do lote                                    │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Mudanças Necessárias

### 1. Frontend: `ModalImportarCSV.tsx`

**Novo fluxo de importação em lotes:**

- Adicionar estado para progresso (`processados`, `totalLotes`, `loteAtual`)
- Dividir dados em lotes de 20 alunos
- Processar lotes sequencialmente com `for await`
- Mostrar barra de progresso visual durante importação
- Acumular resultados de cada lote
- Permitir continuar mesmo se um lote falhar

**Novo estado:**
```typescript
const [progresso, setProgresso] = useState({
  processados: 0,
  total: 0,
  loteAtual: 0,
  totalLotes: 0,
  sucessos: 0,
  erros: [] as string[]
});
```

**Nova UI de progresso:**
- Barra de progresso animada
- Contador: "Processando lote 3 de 5..."
- Contador: "45/92 alunos processados"

### 2. Edge Function: `import-users/index.ts`

**Adicionar lógica de UPSERT por matrícula:**

```typescript
// ANTES de criar usuário:
// 1. Verificar se já existe profile com esta matricula_externa + institution_id
const { data: existingProfile } = await supabaseAdmin
  .from('profiles')
  .select('id')
  .eq('matricula_externa', user.matricula)
  .eq('institution_id', institutionId)
  .maybeSingle();

if (existingProfile) {
  // ATUALIZAR dados do aluno existente
  await supabaseAdmin
    .from('profiles')
    .update({ nome, sobrenome, serie, turma, segmento, ... })
    .eq('id', existingProfile.id);
  
  // Garantir scores e role
  await garantirScores(supabaseAdmin, existingProfile.id, anoLetivo);
  await garantirRoleUser(supabaseAdmin, existingProfile.id);
  
  updatedCount++;
} else {
  // CRIAR novo usuário (fluxo atual)
  createdCount++;
}
```

**Novo retorno com métricas detalhadas:**
```typescript
return {
  success: true,
  total: users.length,
  criados: createdCount,
  atualizados: updatedCount,
  erros: errors
}
```

### 3. Limpar Alunos Órfãos

Antes de testar, precisamos limpar os 60 alunos que foram criados parcialmente:

```sql
-- Deletar todos os profiles do infantil desta instituição
-- para começar do zero (via dashboard Lovable Cloud)
```

---

## Benefícios da Solução

| Métrica | Antes | Depois |
|---------|-------|--------|
| **Alunos por lote** | 92 (todos) | 20 |
| **Timeout** | Frequente | Nunca |
| **Feedback** | Nenhum | Barra de progresso |
| **Duplicatas** | Erro | UPSERT automático |
| **Recuperação** | Perdido | Continua do lote |
| **Escala** | ~60 max | 2000+ |

---

## Arquivos a Modificar

### Arquivo 1: `src/components/admin/ModalImportarCSV.tsx`

- Adicionar estados de progresso
- Nova função `processarEmLotes()` que divide array e processa
- Nova UI com barra de progresso durante importação
- Acumular resultados de múltiplos lotes
- Mostrar resultados finais consolidados

### Arquivo 2: `supabase/functions/import-users/index.ts`

- Importar lógica de UPSERT do `sync-alunos-pull`
- Verificar matrícula antes de criar usuário
- Atualizar dados se aluno já existir
- Retornar contadores separados (criados vs atualizados)
- Manter funções auxiliares `garantirScores` e `garantirRoleUser`

---

## Fluxo de Teste

1. Limpar alunos existentes do teste (60 do infantil)
2. Fazer upload do Excel com 92 alunos
3. Observar barra de progresso: "Lote 1/5 - 20/92 processados"
4. Verificar resultado: "92 alunos importados (92 criados, 0 atualizados)"
5. Reimportar mesmo arquivo
6. Verificar: "92 alunos importados (0 criados, 92 atualizados)"

---

## Considerações Técnicas

### Tamanho do Lote

- **20 alunos por lote**: Margem segura para o timeout de 60s
- Cada aluno leva ~2-3s (Auth + Profile + Role + Scores)
- 20 × 3s = 60s máximo, mas geralmente menos

### Tratamento de Erros

- Se um lote falhar, os anteriores já foram salvos
- Usuário pode tentar novamente (UPSERT não duplica)
- Erros são acumulados e mostrados no final

### Paralelização Futura

- Esta solução usa processamento sequencial por segurança
- Pode ser otimizada no futuro com Promise.all dentro do lote
- Mantém simplicidade e debugging fácil

---

## Resumo da Implementação

| Componente | Mudança |
|------------|---------|
| `ModalImportarCSV.tsx` | Processamento em lotes de 20 + barra de progresso |
| `import-users/index.ts` | UPSERT por matrícula + métricas detalhadas |
| Banco de dados | Limpar 60 alunos de teste antes de reimportar |
