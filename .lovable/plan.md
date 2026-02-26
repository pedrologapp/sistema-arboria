

# Corrigir Visão Geral: Turmas do Infantil + Múltiplos Professores

## Problema

1. **Turmas do infantil não existem** no banco. Só existem turmas com `segmento='fundamental1'` (séries 1-5) e `segmento='fundamental2'` (séries 6-9). Nenhuma turma com `segmento='infantil'`.
2. **O código só mostra 1 professor por turma** (usa `.find()` que retorna o primeiro vínculo). Para o infantil, precisa mostrar múltiplos professores.

## Alterações

### 1. Criar turmas do Infantil no banco (migração)

Inserir as turmas do infantil com `segmento='infantil'`:
- Maternal II (serie=2, turmas A e B)
- Maternal III (serie=3, turmas A e B)  
- Grupo IV (serie=4, turmas A e B)
- Grupo V (serie=5, turmas A e B)

Usando a `institution_id` existente: `902876e9-b263-4c01-9013-aeef7b6d24e1`

### 2. `src/components/admin/TabelaVisaoGeralProfessores.tsx`

- Na query, usar `.filter()` em vez de `.find()` para coletar **todos** os vínculos de professores por turma
- Mapear cada turma com um array `professores: {id, nome}[]` em vez de um único `professor_id`/`professor_nome`
- Na coluna "Professor" da tabela, renderizar a lista de nomes separados por vírgula (ou badges)
- Para o segmento infantil, mostrar indicador visual de quantos professores estão vinculados
- Ajustar estatísticas: "turma atribuída" = tem pelo menos 1 professor

### Visual esperado

```text
Turma             Professores              Status
Maternal II A     Ana Silva, João Santos   ✅ 2 prof.
Maternal III B    -                        ❌ Sem professor
Grupo IV A        Maria Lima               ✅ 1 prof.
```

