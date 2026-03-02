

## Diagnóstico: Por que os alunos não aparecem

### Causa raiz
O hook `useAlunosCasa` (usado pelo `AlunosPage`) filtra com `.eq('casa_id', casaMentor.id)`. A professora Oceni é mentora da **Casa 8 (Intrapessoal)**, mas dos 159 alunos do F2, apenas **4 têm casa atribuída** (todos na Linguística). Os outros **155 estão com `casa_id = NULL`**. Resultado: 0 alunos aparecem para Oceni.

A RLS do banco **não** é o problema — a policy "Usuários veem perfis da mesma instituição" já permite que professores vejam todos os perfis. O filtro restritivo está no código frontend.

### Solução

Como você quer que o professor F2 veja **todos os alunos** (todas as casas + sem casa), vamos:

#### 1. Modificar `useAlunosCasa` — remover filtro por `casa_id`
- Remover `.eq('casa_id', casaMentor.id)` da query de perfis
- Em vez disso, buscar alunos via tabela `aluno_turma` (que tem todos os alunos matriculados no F2), ou filtrar por `segmento = 'fundamental2'` na mesma instituição
- Adicionar campo `casaNome` ao tipo `AlunoComStatus` (nome da casa ou `null`)

#### 2. Mostrar a casa de cada aluno na lista
- No `AlunoStatusLinha` ou diretamente no `AlunosPage`, exibir o nome da casa ao lado do aluno
- Se `casa_id` for `null`, mostrar "Não designado" em cinza
- Se tiver casa, mostrar o nome (ex: "Linguística", "Intrapessoal")

#### 3. Filtros existentes continuam funcionando
- Os filtros de Série (6º-9º) e Turma (A-C) já filtram no frontend e continuarão funcionando normalmente com a lista completa

### Arquivos a editar
- `src/hooks/useAlunosCasa.ts` — remover filtro por casa, buscar via `aluno_turma` com join em turmas F2, adicionar `casaNome`
- `src/components/professor/AlunoStatusLinha.tsx` — exibir nome da casa (ou "Não designado")

