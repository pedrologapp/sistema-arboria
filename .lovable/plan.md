

# Problema: Alunos do Infantil sem vínculo com turmas

## Diagnóstico

A professora Auriete está corretamente vinculada às turmas **Grupo V A** e **Grupo V B** via `professor_turma`. Porém, **nenhum aluno do Infantil** está vinculado a turmas na tabela `aluno_turma` — são **0 registros** para todos os 92 alunos do segmento:

| Série | Turma | Alunos | Vinculados |
|-------|-------|--------|------------|
| Maternalzinho(2) | A | 4 | 0 |
| Maternalzinho(2) | B | 9 | 0 |
| Maternal(3) | A | 6 | 0 |
| Maternal(3) | B | 13 | 0 |
| Grupo IV | A | 7 | 0 |
| Grupo IV | B | 17 | 0 |
| Grupo V | A | 15 | 0 |
| Grupo V | B | 21 | 0 |

Os alunos têm `serie` e `turma` preenchidos no `profiles`, mas falta o registro correspondente em `aluno_turma` que liga cada aluno à sua turma. Como o sistema de professores do Infantil usa `aluno_turma` + `professor_turma` para determinar quais alunos cada professor vê, nenhum aluno aparece.

## Solução

Inserir os registros em `aluno_turma` para todos os 92 alunos do Infantil, fazendo o match entre `profiles.serie` + `profiles.turma` e `turmas.serie` + `turmas.turma_letra`:

```sql
INSERT INTO aluno_turma (aluno_id, turma_id, ano_letivo, ativo)
SELECT p.id, t.id, 2025, true
FROM profiles p
JOIN user_roles ur ON ur.user_id = p.id AND ur.role = 'user'
JOIN turmas t ON t.serie = p.serie 
  AND t.turma_letra = p.turma
  AND t.institution_id = p.institution_id
  AND t.segmento = 'infantil'
WHERE p.segmento = 'infantil'
  AND p.institution_id = '902876e9-b263-4c01-9013-aeef7b6d24e1'
ON CONFLICT DO NOTHING;
```

Isso é uma operação de dados (INSERT), sem mudanças de schema. Após a inserção, a professora Auriete (e todos os demais professores do Infantil) verão automaticamente seus alunos.

