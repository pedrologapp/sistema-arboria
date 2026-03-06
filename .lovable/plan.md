

## Plano: Canal "Liderança" por Casa

### Resumo

Criar um canal `tipo = 'lideranca_casa'` por casa (8 canais), com acesso restrito a líder + coordenadores + mentor + admin. Membros comuns veem o canal com cadeado mas não acessam.

### 1. Migração SQL

Inserir 8 canais na tabela `canais_casa` (um por casa) com:
- `nome`: 'Liderança'
- `icone`: '⚡'
- `tipo`: 'lideranca_casa'
- `casa_id`: 1-8
- `ordem`: -1 (aparecer antes dos canais normais)
- `apenas_lideranca`: true

Criar função `pode_acessar_lideranca_casa(p_user_id uuid, p_casa_id smallint)` (SECURITY DEFINER):
- Retorna true se:
  - `has_role(p_user_id, 'admin')` OR
  - Cargo `lider` ou `coordenador` ativo na `cargos_casa` para a mesma casa OR
  - Professor mentor da casa (`professor_casa` com `eh_mentor_principal = true`)

Atualizar RLS de `canais_casa` (SELECT): incluir `tipo = 'lideranca_casa'` visível para alunos da mesma casa (todos veem, mas acesso controlado no frontend).

Atualizar RLS de `mensagens_canal`:
- SELECT: adicionar condição para `lideranca_casa` usando `pode_acessar_lideranca_casa`
- INSERT: adicionar condição para `lideranca_casa` usando `pode_acessar_lideranca_casa`

### 2. Frontend — `src/pages/aluno/ChatPage.tsx`

Adicionar query para buscar canal `lideranca_casa` da casa do aluno. Adicionar `useMemo` para verificar se aluno é líder ou coordenador (`isLiderancaCasa`).

Renderizar seção "⚡ LIDERANÇA DA CASA" entre "Canais da Diretoria" e "Canais de Texto":
- Se `isLiderancaCasa`: canal clicável, navega para `/aluno/chat/canal/{id}`
- Se membro comum: canal com cadeado, ao clicar mostra modal com mensagem "Este canal é exclusivo para a Liderança da Casa..."

Criar componente `LiderancaCasaLocked` (similar ao `ConselhoLideresLocked`) com visual usando ⚡ e cor da casa.

### 3. Frontend — `src/pages/admin/AdminChatPage.tsx`

Na aba "Casas", quando uma casa é selecionada, buscar também o canal `lideranca_casa` dessa casa e mostrá-lo com destaque antes dos canais normais.

### 4. Frontend — `src/pages/professor/ProfessorChatPage.tsx`

Buscar canal `lideranca_casa` da casa do mentor. Renderizar seção "⚡ LIDERANÇA DA CASA" antes dos "Canais de Texto", clicável (professor mentor tem acesso total de leitura e escrita).

### Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| Migração SQL | Inserir 8 canais + função `pode_acessar_lideranca_casa` + atualizar RLS |
| `src/components/chat/LiderancaCasaLocked.tsx` | Novo — modal de canal bloqueado |
| `src/pages/aluno/ChatPage.tsx` | Seção "Liderança da Casa" com lógica de acesso |
| `src/pages/admin/AdminChatPage.tsx` | Mostrar canal liderança ao visualizar canais de uma casa |
| `src/pages/professor/ProfessorChatPage.tsx` | Seção "Liderança da Casa" com acesso total |

