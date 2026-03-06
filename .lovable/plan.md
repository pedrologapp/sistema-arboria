

## Plano: Corrigir prazo nas missões semanais por casa

### Problema
No `MissoesPorCasa.tsx`, a query que busca missões individuais (linha 154) **não inclui `data_prazo`** no `select`:

```
.select('id, fase_id, semana, tipo_missao, casa_id, titulo, contexto, instrucoes, pontos_base, requer_texto, requer_arquivo, status, arquivo_pdf_url, arquivo_pdf_nome')
```

Quando o admin edita uma missão, `(missao as any).data_prazo` é `undefined`, então o campo de prazo sempre mostra o valor padrão (fim da semana) em vez do prazo salvo. Ao salvar sem alterar, o prazo é sobrescrito.

### Solução

**Arquivo:** `src/components/admin/MissoesPorCasa.tsx`

1. **Linha 154** — Adicionar `data_prazo` ao select da query
2. **Interface `Missao`** (linhas 41-56) — Adicionar campo `data_prazo: string | null`
3. **Linha 196** — Remover cast `as any`, usar `missao.data_prazo` diretamente (agora tipado)

Uma única edição, três linhas afetadas.

