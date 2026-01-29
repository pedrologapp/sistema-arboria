
# Plano: Associar Alunos às Turmas para Professores de Infantil/Fundamental 1

## Problema Identificado

A política RLS atual de `aluno_turma` permite que professores vejam alunos apenas através do vínculo `professor_casa` (usado pelo Fundamental 2). Professores de Infantil e Fundamental 1 que usam `professor_turma` **não conseguem ver seus alunos** porque não existe uma política RLS para esse cenário.

### Política Atual (Fundamental 2 apenas)

```sql
-- Só funciona para F2 (via professor_casa)
"Professores veem aluno_turma da sua casa" → verifica professor_casa.casa_id = aluno.casa_id
```

### Dados Atuais no Banco

| Tabela | Status |
|--------|--------|
| `aluno_turma` | Alunos vinculados às turmas (1º A = 18 alunos, 5º A = 21 alunos, etc.) |
| `professor_turma` | Rita de Cássia vinculada ao 5º A e 5º B |

O problema é que a **política RLS bloqueia** a visualização para professores de Infantil/F1.

## Solução

Criar uma nova política RLS que permita professores verem alunos das turmas às quais estão vinculados via `professor_turma`.

### 1. Nova Política RLS

```sql
CREATE POLICY "Professores veem aluno_turma das suas turmas"
ON aluno_turma
FOR SELECT
USING (
  has_role(auth.uid(), 'professor') 
  AND turma_id = ANY(get_professor_turma_ids())
);
```

Esta política usa a função `get_professor_turma_ids()` que já existe e retorna um array com os IDs das turmas do professor logado.

### 2. Verificação da Função Helper

A função `get_professor_turma_ids()` já existe no banco:

```sql
-- Função existente (criada anteriormente)
CREATE OR REPLACE FUNCTION get_professor_turma_ids()
RETURNS UUID[] AS $$
  SELECT COALESCE(ARRAY_AGG(turma_id), ARRAY[]::UUID[])
  FROM professor_turma 
  WHERE professor_id = auth.uid() AND ativo = true;
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

## Arquivo de Migração

Criar uma migração SQL com a nova política:

```sql
-- Política para professores de Infantil/F1 verem alunos das suas turmas
CREATE POLICY "Professores veem aluno_turma das suas turmas vinculadas"
ON public.aluno_turma
FOR SELECT
USING (
  has_role(auth.uid(), 'professor'::app_role) 
  AND turma_id = ANY(public.get_professor_turma_ids())
);
```

## Resultado Esperado

Após a migração:

```text
1. Professora Rita de Cássia (Fundamental 1) faz login
2. Sistema detecta segmento = 'fundamental1'
3. Carrega turmas vinculadas: [5º A, 5º B]
4. Ao acessar /professor/circulo:
   └─> Vê cards: [5º A] [5º B]
5. Clica em "5º A"
   └─> Query busca aluno_turma WHERE turma_id = '...' AND ativo = true
   └─> RLS permite (turma_id está em get_professor_turma_ids())
   └─> Exibe 21 alunos do 5º A
```

## Resumo Técnico

| Item | Ação |
|------|------|
| **Migração SQL** | Criar política RLS para `aluno_turma` usando `professor_turma` |
| **Função Helper** | Já existe: `get_professor_turma_ids()` |
| **Código Frontend** | Nenhuma alteração necessária (hooks já estão corretos) |

## Arquivos Modificados

- **Nova migração SQL**: Política RLS para professores de Infantil/F1
