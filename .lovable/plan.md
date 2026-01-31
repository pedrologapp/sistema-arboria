

# Plano: Mostrar Apenas Sugestões do N8N

## Resumo

O sistema atual tem **duas fontes de alertas**:
1. **IA Interna (Gemini)** - Gera alertas automaticamente quando uma observação é registrada
2. **N8N** - Envia sugestões estruturadas via webhook

Você quer que **apenas as sugestões do N8N apareçam**. A IA interna não deve interferir.

---

## Solução

Vou modificar os hooks para **filtrar e ignorar alertas da IA interna**, mostrando apenas quando `gerado_por === 'n8n'` ou `motivo === 'analise_n8n'`.

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/usePerfilAluno.ts` | Ignorar alertas da IA interna |
| `src/hooks/usePerfilAlunoSimplificado.ts` | Mesma alteração (paridade) |

---

## Implementação

### Opção 1: Filtrar na Query (Recomendado)

Adicionar filtro na query do Supabase para buscar apenas alertas do N8N:

```typescript
// Antes (linha 442-451):
const { data: alertaData } = await supabase
  .from('alertas_alunos')
  .select('*')
  .eq('aluno_id', alunoId)
  .eq('institution_id', aluno.institution_id)
  .in('tipo_alerta', ['precisa_atencao', 'celebrar', ...])
  .in('status', ['ativo', 'visualizado', 'em_acompanhamento'])
  .order('created_at', { ascending: false })
  .limit(1)
  .maybeSingle();

// Depois:
const { data: alertaData } = await supabase
  .from('alertas_alunos')
  .select('*')
  .eq('aluno_id', alunoId)
  .eq('institution_id', aluno.institution_id)
  .eq('motivo', 'analise_n8n')  // ← APENAS ALERTAS DO N8N
  .in('status', ['ativo', 'visualizado', 'em_acompanhamento'])
  .order('created_at', { ascending: false })
  .limit(1)
  .maybeSingle();
```

---

## Resultado Esperado

| Cenário | Antes | Depois |
|---------|-------|--------|
| Alerta da IA interna (`gerado_por: 'ia'`) | Aparece no perfil | **Não aparece** |
| Alerta do N8N (`gerado_por: 'n8n'`) | Aparece no perfil | Aparece no perfil |
| Sem alerta | Mostra estado "aguardando" | Mostra estado "aguardando" |

---

## Sobre o Trigger Automático

O trigger `trigger_observacao_analisar_ia` continuará existindo e gerando alertas no banco, mas eles serão **ignorados pelo frontend**. Se você quiser desativar completamente a IA interna no futuro, posso remover o trigger também.

---

## Próximos Passos

1. Implementar o filtro nos hooks
2. Testar com um aluno sem alertas N8N (deve mostrar estado "aguardando")
3. Enviar um payload de teste do N8N para verificar se o `SugestaoN8NCard` funciona

