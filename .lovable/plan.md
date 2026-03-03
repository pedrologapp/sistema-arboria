

## Adicionar aluna Ruamma ao Maternal III A

### Problema
O modal "Adicionar Aluno" atualmente só suporta séries do Fundamental 2 (6º-9º ano). Não há opção para cadastrar alunos do segmento Infantil (Maternal III, Grupo IV, etc.).

### Solução em 2 partes

#### 1. Cadastrar a aluna imediatamente
Usar a edge function `create-user` para criar a conta e depois inserir o vínculo na tabela `aluno_turma` com a turma "Maternal III A" (`turma_id: 9f9bfa20-3a49-4b21-af5d-0b060710e43a`).

- **Nome**: Ruamma Nicole
- **Sobrenome**: Silva do Nascimento Souza
- **Email**: gerado automaticamente (ex: `ruamma.souza.xxx@aluno.arboria.com`)
- **Senha**: `souza123` (baseada no sobrenome significativo)
- **Série/Turma**: Maternal III / A
- **Segmento**: infantil

#### 2. Atualizar o modal para suportar todos os segmentos
Modificar `ModalAdicionarUsuario.tsx` para que, ao cadastrar alunos:
- Adicionar seletor de **segmento** (Infantil, Fundamental 1, Fundamental 2)
- As opções de **série** mudam conforme o segmento selecionado (Maternalzinho, Maternal III, Grupo IV, Grupo V para Infantil; 1º-5º para F1; 6º-9º para F2)
- Turma continua sendo A/B/C/D
- Remover campo "Casa" para alunos que não são F2
- Após criar o usuário, inserir automaticamente o registro em `aluno_turma` vinculando à turma correta

### Arquivos a editar
- `src/components/admin/ModalAdicionarUsuario.tsx` — adicionar seletor de segmento e séries dinâmicas
- `supabase/functions/create-user/index.ts` — aceitar `turma_id` e criar vínculo `aluno_turma` automaticamente

