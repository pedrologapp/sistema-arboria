

## Plano: Ajustes na página de Alunos e Dashboard do Professor

### 1. Dashboard do Professor - Fase/Semana já está implementada
O sub-card de fase e semana (linhas 201-227 do `ProfessorDashboard.tsx`) já existe abaixo do título "Mentora". Se não está aparecendo, é porque `faseAtual` está null — o fix anterior no `ProfessorContext` deveria resolver isso. Vou verificar se o fix está aplicado corretamente.

### 2. Página de Alunos (`AlunosPage.tsx`)

**Alterações no header (linhas 197-215):**
- Trocar "Alunos da Casa" → "Alunos"
- Remover o subtítulo com brasão e nome da casa (linhas 203-213)

**Alteração no título da seção (linhas 240-246):**
- Trocar "Ranking de Pontos" + ícone Trophy → "Lista de Alunos" + ícone Users

**Adicionar filtro por Casa (linhas 248-317):**
- Novo estado `casaFiltro` (string | null)
- Buscar lista de casas (inteligências) via query
- Adicionar linha de filtro "Casa" com pills (Todas + cada casa)
- Adicionar `casaFiltro` na lógica de `alunosFiltrados`: filtrar por `aluno.casaNome`

### Arquivos alterados
- `src/pages/professor/AlunosPage.tsx`

