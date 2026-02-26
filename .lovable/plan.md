

# Turmas do Infantil + Turmas no Painel de Casas

## Problemas identificados

1. **Turmas do infantil não existem no banco** — a inserção anterior não foi efetivada. A tabela `turmas` só tem `fundamental1` e `fundamental2`.
2. **Painel de Casas** — mostra membros agrupados por série (6º, 7º...) mas não diferencia turmas A e B.

## Alterações

### 1. Migração: inserir turmas do infantil

```sql
INSERT INTO turmas (institution_id, nome, serie, turma_letra, segmento, ano_letivo)
VALUES
  ('902876e9-b263-4c01-9013-aeef7b6d24e1', 'Maternal II A', 2, 'A', 'infantil', 2025),
  ('902876e9-b263-4c01-9013-aeef7b6d24e1', 'Maternal II B', 2, 'B', 'infantil', 2025),
  ('902876e9-b263-4c01-9013-aeef7b6d24e1', 'Maternal III A', 3, 'A', 'infantil', 2025),
  ('902876e9-b263-4c01-9013-aeef7b6d24e1', 'Maternal III B', 3, 'B', 'infantil', 2025),
  ('902876e9-b263-4c01-9013-aeef7b6d24e1', 'Grupo IV A', 4, 'A', 'infantil', 2025),
  ('902876e9-b263-4c01-9013-aeef7b6d24e1', 'Grupo IV B', 4, 'B', 'infantil', 2025),
  ('902876e9-b263-4c01-9013-aeef7b6d24e1', 'Grupo V A', 5, 'A', 'infantil', 2025),
  ('902876e9-b263-4c01-9013-aeef7b6d24e1', 'Grupo V B', 5, 'B', 'infantil', 2025);
```

### 2. `src/pages/admin/CasasPage.tsx` — mostrar turma (A/B) nos membros

- Buscar `turma_letra` dos alunos via `aluno_turma` (ou do campo `serie` se já contém a letra)
- No accordion de membros, agrupar por série E turma: "6º A", "6º B" em vez de só "6º ano"
- Buscar vínculos `aluno_turma` para mapear cada aluno à sua turma_letra

### 3. Nenhuma alteração no `TabelaVisaoGeralProfessores.tsx`

O componente já filtra por `turma.segmento === segmentoVisao`. Com as turmas inseridas no banco, o infantil passará a aparecer automaticamente.

