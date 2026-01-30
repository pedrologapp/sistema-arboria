
# Plano: Corrigir Bug de Celebração Automática ao Resolver Alerta

## Problema Identificado

Quando o professor marca "Melhorou" no modal de Registrar Ação:

1. O alerta é atualizado para `status: 'resolvido'`
2. A query de alertas ativos filtra por `status IN ('ativo', 'visualizado', 'em_acompanhamento')`
3. Como 'resolvido' não está nessa lista, nenhum alerta é encontrado
4. O sistema entra no fallback (linhas 676-751) que calcula o estado baseado nas observações
5. Se as últimas 2 observações forem positivas, gera um card de CELEBRAÇÃO incorretamente

## Comportamento Correto

Quando "Melhorou" é marcado:
- O alerta deve ser arquivado
- A seção "Observações do Professor" deve ficar **limpa/vazia**
- Nenhum novo estado deve ser calculado automaticamente
- O próximo estado deve vir de uma nova observação real ou do N8N

## Solução

Verificar se existe um alerta **recentemente resolvido** para o aluno antes de calcular um estado fallback. Se existir, não mostrar nada.

---

## Alteração Necessária

### Arquivo: `src/hooks/usePerfilAluno.ts`

**Localização:** Linhas 676-751 (bloco `else` que calcula estado quando não há alerta ativo)

**Mudança:**

Antes de calcular o estado baseado em observações, verificar se existe um alerta resolvido recentemente (ex: nas últimas 24h). Se existir, não calcular nenhum estado - deixar `alertaAtivo` como `null`.

```typescript
// Linha 676-752 - ANTES (resumido):
} else {
  // Se não há alerta no banco, calcular estado baseado nas observações
  const estadoCalculado = calcularEstadoBaseadoEmObservacoes(observacoes, casaCodigo, faseAtualCodigo);
  if (estadoCalculado && temObsFaseAtual) {
    // ... gera alertaAtivo calculado
  }
}

// DEPOIS:
} else {
  // Verificar se há alerta RESOLVIDO recentemente (últimas 24h)
  // Se sim, não calcular estado - aguardar próxima observação
  const { data: alertaResolvido } = await supabase
    .from('alertas_alunos')
    .select('id, resolved_at')
    .eq('aluno_id', alunoId)
    .eq('institution_id', aluno.institution_id)
    .eq('status', 'resolvido')
    .order('resolved_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  
  // Se foi resolvido nas últimas 24h, NÃO calcular estado
  // Deixar a seção limpa até próxima observação
  const foiResolvidoRecentemente = alertaResolvido?.resolved_at && 
    (Date.now() - new Date(alertaResolvido.resolved_at).getTime()) < 24 * 60 * 60 * 1000;
  
  if (!foiResolvidoRecentemente) {
    // Apenas calcular estado SE NÃO houve resolução recente
    const estadoCalculado = calcularEstadoBaseadoEmObservacoes(observacoes, casaCodigo, faseAtualCodigo);
    if (estadoCalculado && temObsFaseAtual) {
      // ... código existente de geração de alertaAtivo
    }
  }
  // Se foiResolvidoRecentemente, alertaAtivo permanece null (tela limpa)
}
```

---

## Fluxo Corrigido

```text
┌────────────────────────────────────────────────────────┐
│ Professor marca "Melhorou"                             │
│                    ↓                                   │
│ 1. Alerta atualizado: status = 'resolvido'             │
│ 2. resolved_at = agora                                 │
└────────────────────────────────────────────────────────┘
                    ↓
┌────────────────────────────────────────────────────────┐
│ Próxima renderização do perfil                         │
│                    ↓                                   │
│ Query alertas ativos → Nenhum encontrado               │
│                    ↓                                   │
│ Verifica alerta resolvido nas últimas 24h → SIM        │
│                    ↓                                   │
│ NÃO calcula estado → alertaAtivo = null                │
│                    ↓                                   │
│ Seção "Observações" fica LIMPA                         │
└────────────────────────────────────────────────────────┘
                    ↓
┌────────────────────────────────────────────────────────┐
│ Professor registra NOVA observação                     │
│                    ↓                                   │
│ Trigger dispara análise                                │
│                    ↓                                   │
│ Se positiva → N8N pode gerar celebração                │
│ Se atenção → Novo alerta de atenção                    │
└────────────────────────────────────────────────────────┘
```

---

## Resumo

| Cenário | Antes (Bug) | Depois (Correto) |
|---------|-------------|------------------|
| Alerta resolvido há 1 hora | Calcula celebração | Tela limpa |
| Alerta resolvido há 25 horas | Calcula celebração | Calcula normalmente |
| Nova observação positiva | Celebração | Celebração (se N8N enviar) |
| Nova observação atenção | Alerta atenção | Alerta atenção |

---

## Alternativa Mais Simples (sem janela de tempo)

Se preferir uma abordagem mais simples, podemos:

1. Verificar se a **última observação é mais recente** que o `resolved_at` do último alerta resolvido
2. Só calcular estado se houver observação nova após a resolução

Esta abordagem é mais precisa pois depende de uma ação real (nova observação) em vez de tempo.

```typescript
// Verificar se existe observação mais recente que a última resolução
const ultimaObsDate = observacoes[0]?.dataHora ? new Date(observacoes[0].dataHora).getTime() : 0;
const resolvidoDate = alertaResolvido?.resolved_at ? new Date(alertaResolvido.resolved_at).getTime() : 0;

// Só calcular se há observação DEPOIS da resolução
if (ultimaObsDate > resolvidoDate) {
  const estadoCalculado = calcularEstadoBaseadoEmObservacoes(...);
  // ...
}
```

Esta segunda abordagem é mais elegante e recomendada.

---

## Arquivo a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/hooks/usePerfilAluno.ts` | Adicionar verificação de alerta resolvido antes de calcular estado fallback (linhas 676-751) |
