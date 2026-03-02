

## Plano: Visibilidade completa de alunos F2 (Mapa, Observar, Entregas)

### Problema identificado — 2 camadas

**Camada 1 — Frontend (filtros no código)**:
- `MapaDesenvolvimentoPage.tsx` linha 151: filtra `if (isF2 && casaMentor && p.casa_id !== casaMentor.id) return null` — exclui alunos sem casa ou de outra casa
- `CirculoAlunosPage.tsx` linha 40: `.eq('casa_id', casaMentor.id)` — só busca alunos da casa do mentor
- `CirculoTurmaPage.tsx` linha 31: `.eq('casa_id', casaMentor.id)` — idem

**Camada 2 — RLS no banco (bloqueio silencioso)**:
- **`aluno_turma`**: A policy "Professores veem aluno_turma da sua casa" exige `casa_id` match. Professores F2 **não têm** entradas em `professor_turma`, então a outra policy também não funciona. Resultado: alunos com `casa_id = NULL` são invisíveis.
- **`entregas`**: A policy "Professor vê entregas da sua casa" exige `p.casa_id = pc.casa_id`. Alunos sem casa → entregas invisíveis.
- **`observacoes`**: A policy "Professor vê observações da sua casa" → mesmo problema. Professor não consegue nem criar observações para alunos sem casa.

### Solução

#### 1. Novas RLS policies (3 tabelas)
Adicionar policies que permitam professores que são mentores (`professor_casa`) ver todos os dados da mesma instituição:

**`aluno_turma`** — nova policy SELECT:
```sql
-- Mentores veem aluno_turma de turmas da sua instituição
CREATE POLICY "Mentores veem aluno_turma da instituição"
ON aluno_turma FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'professor'::app_role)
  AND EXISTS (
    SELECT 1 FROM turmas t
    WHERE t.id = aluno_turma.turma_id
    AND t.institution_id = get_user_institution_id()
  )
  AND EXISTS (
    SELECT 1 FROM professor_casa pc
    WHERE pc.professor_id = auth.uid() AND pc.ativo = true
  )
);
```

**`entregas`** — nova policy SELECT + UPDATE:
```sql
-- Mentores veem entregas da instituição
CREATE POLICY "Mentores veem entregas da instituição"
ON entregas FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'professor'::app_role)
  AND EXISTS (
    SELECT 1 FROM missoes m
    WHERE m.id = entregas.missao_id
    AND m.institution_id = get_user_institution_id()
  )
  AND EXISTS (
    SELECT 1 FROM professor_casa pc
    WHERE pc.professor_id = auth.uid() AND pc.ativo = true
  )
);

-- Mentores podem avaliar entregas da instituição  
CREATE POLICY "Mentores podem avaliar entregas da instituição"
ON entregas FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'professor'::app_role)
  AND EXISTS (
    SELECT 1 FROM missoes m
    WHERE m.id = entregas.missao_id
    AND m.institution_id = get_user_institution_id()
  )
  AND EXISTS (
    SELECT 1 FROM professor_casa pc
    WHERE pc.professor_id = auth.uid() AND pc.ativo = true
  )
);
```

**`observacoes`** — nova policy SELECT:
```sql
CREATE POLICY "Mentores veem observações da instituição"
ON observacoes FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'professor'::app_role)
  AND institution_id = get_user_institution_id()
  AND EXISTS (
    SELECT 1 FROM professor_casa pc
    WHERE pc.professor_id = auth.uid() AND pc.ativo = true
  )
);
```

#### 2. Frontend — remover filtros por casa_id (3 arquivos)

- **`MapaDesenvolvimentoPage.tsx`**: Remover linha 151 (`if (isF2 && casaMentor && p.casa_id !== casaMentor.id) return null`)
- **`CirculoAlunosPage.tsx`**: Remover `.eq('casa_id', casaMentor.id)` e buscar alunos via `aluno_turma` (como já funciona no `CirculoTurmaDirectPage`)
- **`CirculoTurmaPage.tsx`**: Remover `.eq('casa_id', casaMentor.id)` e buscar turmas da instituição F2 diretamente da tabela `turmas`

#### 3. Entregas — verificação
O `EntregasPage.tsx` não filtra por `casa_id` no frontend (usa missões + entregas). Com a nova RLS, passará a funcionar automaticamente para alunos sem casa.

### Arquivos a editar
- `src/pages/professor/MapaDesenvolvimentoPage.tsx`
- `src/pages/professor/circulo/CirculoAlunosPage.tsx`
- `src/pages/professor/circulo/CirculoTurmaPage.tsx`
- 1 migração SQL (6 policies novas)

