

## Plano: Sistema de Logs/Histórico de Atividades no Admin

### Visão geral
Criar tabela `activity_logs`, uma função utilitária `logActivity()`, inserir chamadas nos pontos estratégicos do app, e criar uma página "Atividades" no painel Admin com filtros, cards resumo e timeline.

---

### 1. Migração SQL — Tabela + Índices + RLS

```sql
CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  details jsonb DEFAULT '{}',
  ip_address text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Admin pode ler tudo
CREATE POLICY "admin_read_logs" ON public.activity_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Qualquer autenticado pode inserir (registrar próprias ações)
CREATE POLICY "authenticated_insert_logs" ON public.activity_logs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_logs_created ON public.activity_logs(created_at DESC);
CREATE INDEX idx_logs_user_action ON public.activity_logs(user_id, action);
CREATE INDEX idx_logs_action ON public.activity_logs(action);
```

### 2. Utilitário — `src/utils/logActivity.ts`

Função fire-and-forget que faz `supabase.from('activity_logs').insert(...)`. Aceita `userId`, `action`, `details`. Detecta device (mobile/desktop) automaticamente para login.

### 3. Pontos de inserção de logs

| Local | Ação | Arquivo |
|-------|------|---------|
| Login bem-sucedido | `login` | `src/contexts/AuthContext.tsx` (signIn) |
| Logout | `logout` | `src/contexts/AuthContext.tsx` (signOut) |
| Entrega de missão | `missao_entrega` | `src/pages/aluno/MissaoDetalhePage.tsx` (handleEnviar) |
| Avaliação de entrega | `missao_avaliada` | `src/pages/professor/AvaliarEntregaPage.tsx` (mutation onSuccess) |
| Envio de mensagem canal | `chat_mensagem` | `src/pages/aluno/CanalChatPage.tsx` (enviarMensagem) |
| Atualização de perfil/avatar | `perfil_atualizado` | `src/components/aluno/AvatarUpload.tsx` |

Não vou alterar lógica existente — apenas adicionar uma chamada `logActivity(...)` após cada ação bem-sucedida.

### 4. Admin Header — Adicionar link "Atividades"

**Arquivo:** `src/components/AdminHeader.tsx`
- Adicionar `{ title: 'Atividades', href: '/admin/atividades', icon: Activity }` ao array `navItems` (já importa `Activity`)

**Arquivo:** `src/components/AdminBottomNav.tsx`
- Adicionar item de navegação correspondente

### 5. Rota Admin

**Arquivo:** `src/App.tsx`
- Importar `AtividadesPage` e adicionar rota `/admin/atividades` com `AdminLayout`

### 6. Página — `src/pages/admin/AtividadesPage.tsx`

Layout conforme especificado:

- **Filtros em linha**: Tipo de ação (select), Casa (select com inteligências), Período (Hoje/7d/30d), Busca por nome
- **4 Cards resumo**: Logins, Entregas, Mensagens, Observações — contagens do período filtrado
- **Timeline**: Lista cronológica reversa, 20 itens por vez, "Carregar mais"
  - Cada item: ícone colorido + horário + nome (via join com profiles) + ação + detalhes
  - Cores: verde=login, amarelo=entrega, roxo=chat, azul=observação, laranja=avaliação
  - Click expande detalhes (jsonb)
- Query com filtros dinâmicos e `.range()` para paginação

### 7. Visão por aluno (inline na timeline)

Ao clicar no nome do aluno na timeline, navega para `/admin/pessoas/aluno/:id` (já existe). Não criarei uma nova página — os dados de log ficam acessíveis pela timeline filtrada por busca de nome.

---

### Arquivos criados/editados

| Arquivo | Ação |
|---------|------|
| Migração SQL | Criar tabela + RLS + índices |
| `src/utils/logActivity.ts` | Criar |
| `src/pages/admin/AtividadesPage.tsx` | Criar |
| `src/contexts/AuthContext.tsx` | Editar (add log em signIn/signOut) |
| `src/pages/aluno/MissaoDetalhePage.tsx` | Editar (add log em entrega) |
| `src/pages/professor/AvaliarEntregaPage.tsx` | Editar (add log em avaliação) |
| `src/pages/aluno/CanalChatPage.tsx` | Editar (add log em mensagem) |
| `src/components/aluno/AvatarUpload.tsx` | Editar (add log em avatar) |
| `src/components/AdminHeader.tsx` | Editar (add nav item) |
| `src/components/AdminBottomNav.tsx` | Editar (add nav item) |
| `src/App.tsx` | Editar (add rota) |

