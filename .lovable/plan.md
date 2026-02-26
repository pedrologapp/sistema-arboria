

# Adicionar Função (Cargo) na Gestão de Alunos do Admin

## Contexto

A tabela `cargos_casa` já existe no banco com os campos necessários (`aluno_id`, `casa_id`, `cargo`, `institution_id`, `ano_letivo`, `ativo`). Está vazia. Não precisa de migração.

## Alterações

### 1. `src/pages/admin/PerfilAlunoAdminPage.tsx`

- Adicionar state `funcao` com valor atual do cargo do aluno
- Query para buscar o cargo ativo do aluno na tabela `cargos_casa`
- Adicionar select com opções: `membro` (default), `coordenador`, `líder`
- Na mutation `salvar`, fazer upsert na `cargos_casa` ao salvar:
  - Se `funcao = 'membro'`: deletar registro existente (membro é o default, não precisa de registro)
  - Se `funcao = 'coordenador'` ou `'líder'`: upsert com `cargo`, `casa_id`, `institution_id`, `ano_letivo`

### 2. `src/pages/admin/PessoasPage.tsx`

- Na query `admin-alunos`, buscar também os cargos ativos da `cargos_casa` para a instituição
- Adicionar filtro de "Função" nos dropdowns (Membro / Coordenador / Líder)
- Exibir o cargo ao lado do nome do aluno na lista (badge colorido para coordenador/líder)
- Alunos sem registro em `cargos_casa` são considerados "membro" por padrão

### 3. Visual dos badges na lista

```text
Nome do Aluno  [👑 Líder]     6º A   Intrapessoal
Nome do Aluno  [⭐ Coord.]   7º B   Musical
Nome do Aluno                 8º A   Espacial     ← membro (sem badge)
```

### Nenhuma migração necessária

A tabela `cargos_casa` já tem a estrutura perfeita e as RLS policies necessárias (admin pode gerenciar, leitura pública na instituição).

