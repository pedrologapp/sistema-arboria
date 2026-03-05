

## Plano: Sistema de Comunicação Admin-Líderes (Conselho de Líderes)

Este é um recurso grande com 3 partes principais. Vou dividir em etapas claras.

---

### Parte 1: Banco de Dados

**Migração 1 — Tornar `casa_id` nullable em `canais_casa`:**
- Atualmente `casa_id` é obrigatório (NOT NULL). Para criar um canal global (Conselho de Líderes) que não pertence a nenhuma casa, precisamos torná-lo nullable.
- `ALTER TABLE canais_casa ALTER COLUMN casa_id DROP NOT NULL;`

**Migração 2 — Inserir o canal "Conselho de Líderes":**
- Insert com `tipo = 'conselho_lideres'`, `casa_id = NULL`, `nome = 'Conselho de Líderes'`, `icone = '👑'`, `apenas_lideranca = true`.
- Precisamos do `institution_id` da instituição existente.

**Migração 3 — Atualizar RLS de `mensagens_canal`:**
- Política de SELECT: permitir se o canal é de uma casa do usuário (existente) OU se o canal é tipo `conselho_lideres` e o usuário é admin ou tem cargo `lider` ativo.
- Política de INSERT: mesma lógica para escrita.
- Criar função security definer `pode_acessar_conselho(p_user_id uuid)` que verifica se é admin (via `user_roles`) ou líder (via `cargos_casa` com cargo='lider' e ativo=true).

**Migração 4 — Atualizar RLS de `canais_casa`:**
- Permitir SELECT do canal conselho para todos os alunos da instituição (todos veem que existe).

---

### Parte 2: Chat dos Alunos (`ChatPage.tsx`)

**Alterações:**
1. Nova query para buscar canal do tipo `conselho_lideres` da instituição do aluno.
2. Nova query para verificar se o aluno tem cargo `lider` ativo.
3. Adicionar seção "👑 CANAIS DA DIRETORIA" **acima** da seção "Canais de Texto" existente.
4. Se é líder: canal clicável, navega para `CanalChatPage` normalmente. Visual premium (borda dourada).
5. Se NÃO é líder: canal com cadeado, ao clicar mostra modal/toast com mensagem aspiracional. Visual esmaecido.

**Arquivos:**
- `src/pages/aluno/ChatPage.tsx` — adicionar seção Diretoria
- `src/components/chat/ConselhoLideresLocked.tsx` — novo componente para o modal de bloqueio

---

### Parte 3: Chat no Admin

**Novos arquivos:**
- `src/pages/admin/AdminChatPage.tsx` — página principal com 2 abas:
  - Aba "👑 Conselho de Líderes": reutiliza a mesma lógica de `CanalChatPage` mas adaptada para o admin (sem restrição de casa)
  - Aba "🏠 Casas": seletor das 8 casas → ao selecionar, lista os canais daquela casa → ao clicar num canal, abre o chat
- `src/pages/admin/AdminCanalChatPage.tsx` — visualização de canal para o admin (pode ler e escrever em qualquer canal)

**Alterações em arquivos existentes:**
- `src/App.tsx` — adicionar rotas `/admin/chat` e `/admin/chat/canal/:canalId`
- `src/components/AdminBottomNav.tsx` — adicionar item "Chat" com ícone `MessageCircle` (substituir um item existente ou adicionar)
- `src/components/AdminHeader.tsx` — adicionar link Chat no header desktop

**Lógica do Admin no canal:**
- Admin usa `mensagens_canal` normalmente para enviar mensagens
- Na visualização de casas, admin busca canais de qualquer `casa_id` via query sem filtro de casa (RLS precisa permitir admin ver todos)
- Mensagens no Conselho mostram o brasão/cor da casa do remetente (join com `profiles.casa_id` → `inteligencias`)

---

### Alterações em `CanalChatPage.tsx` e `MensagemBubble.tsx`

Para o Conselho de Líderes, as mensagens precisam mostrar o brasão da casa do autor:
- No query de mensagens, incluir join com `inteligencias` via `profiles.casa_id`
- No `MensagemBubble`, renderizar badge colorido da casa quando o canal é tipo `conselho_lideres`

---

### Resumo de arquivos

| Arquivo | Ação |
|---------|------|
| DB Migration (4 statements) | Criar |
| `src/pages/aluno/ChatPage.tsx` | Editar — seção Diretoria |
| `src/components/chat/ConselhoLideresLocked.tsx` | Criar — modal bloqueio |
| `src/pages/admin/AdminChatPage.tsx` | Criar — página chat admin |
| `src/pages/admin/AdminCanalChatPage.tsx` | Criar — chat de canal admin |
| `src/App.tsx` | Editar — rotas admin chat |
| `src/components/AdminBottomNav.tsx` | Editar — item Chat |
| `src/components/chat/MensagemBubble.tsx` | Editar — badge casa no conselho |

