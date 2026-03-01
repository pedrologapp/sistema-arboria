

# Adicionar Professoras Auxiliares no Infantil

## Contexto
A tabela `professor_turma` já possui a coluna `eh_regente` (boolean). Atualmente todos os professores são cadastrados como `eh_regente = true`. A ideia é usar essa mesma coluna para diferenciar: `eh_regente = true` = professora titular, `eh_regente = false` = professora auxiliar.

## Alterações

### 1. `TabelaVisaoGeralProfessores.tsx` — Nova coluna "Auxiliar"
- Buscar `eh_regente` junto com os vínculos em `professor_turma`
- Na tabela do Infantil, adicionar coluna "Auxiliar" ao lado de "Professor"
- Separar professores regentes dos auxiliares na exibição
- Atualizar resumo: "X turmas com auxiliar / Y sem auxiliar"

### 2. `ModalAdicionarUsuario.tsx` — Opção "Tipo de vínculo"
- Quando segmento = `infantil`, exibir um toggle/select "Regente" vs "Auxiliar"
- Se auxiliar, enviar `eh_regente: false` no body da requisição

### 3. `create-professor` edge function — Aceitar `eh_regente`
- Receber parâmetro opcional `eh_regente` (default `true`)
- Usar esse valor ao inserir em `professor_turma`

### 4. `PerfilProfessorAdminPage.tsx` — Exibir tipo no perfil
- Ao adicionar turma ao professor existente, permitir escolher se é regente ou auxiliar

Nenhuma migração de banco necessária — a coluna `eh_regente` já existe em `professor_turma`.

