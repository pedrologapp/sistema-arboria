
# Plano: Adicionar Upload de Foto de Perfil para Professor e Aluno (Admin)

## Objetivo

1. **Professor**: Adicionar opção para o professor alterar sua própria foto na página de Configurações
2. **Admin**: Adicionar opção para o admin alterar a foto do aluno no perfil do aluno

## Alterações Necessárias

### 1. Banco de Dados - Nova Política RLS para Admin

O bucket `avatars` atualmente só permite que o próprio usuário faça upload. Precisamos adicionar uma política que permita que **admins** façam upload de fotos para qualquer usuário.

```sql
-- Admin pode fazer upload de avatars de qualquer usuário
CREATE POLICY "Admin can upload any avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND 
  public.has_role(auth.uid(), 'admin')
);

-- Admin pode deletar avatars de qualquer usuário
CREATE POLICY "Admin can delete any avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND 
  public.has_role(auth.uid(), 'admin')
);

-- Admin pode atualizar avatars de qualquer usuário
CREATE POLICY "Admin can update any avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND 
  public.has_role(auth.uid(), 'admin')
);
```

### 2. Página de Configurações do Professor

**Arquivo:** `src/pages/professor/ProfessorConfiguracoesPage.tsx`

**Alterações:**
- Importar o componente `AvatarUpload`
- Importar `useAuth` para obter o `user.id`
- Substituir o Avatar estático pelo componente `AvatarUpload`
- Usar `refreshData` do `useProfessor()` como callback de sucesso

**Layout Atualizado:**

```text
┌──────────────────────────────────────────┐
│  ← Voltar               Configurações    │
├──────────────────────────────────────────┤
│  MEU PERFIL                              │
│  ┌────────────────────────────────────┐  │
│  │                                    │  │
│  │         [    FOTO    ]             │  │  ← Clicável para upload
│  │         📷 Alterar Foto            │  │
│  │                                    │  │
│  │   Professor Fulano                 │  │
│  │   🏛 Mentor - Casa Linguística     │  │
│  │                                    │  │
│  └────────────────────────────────────┘  │
│                                          │
│  SEGURANÇA                               │
│  [ 🔒 Alterar Senha               →  ]   │
│                                          │
└──────────────────────────────────────────┘
```

### 3. Criar Componente AdminAvatarUpload

**Arquivo:** `src/components/admin/AdminAvatarUpload.tsx`

O componente `AvatarUpload` existente foi feito para o aluno editar sua própria foto. Para o admin, precisamos de um componente similar que:
- Receba o `userId` do aluno/professor que está sendo editado
- Possa fazer upload para qualquer usuário (graças à nova política RLS)
- Tenha visual adaptado para o contexto admin (sem a cor da casa)

**Props:**
```typescript
interface AdminAvatarUploadProps {
  userId: string;
  currentAvatarUrl: string | null;
  onUploadSuccess: () => void;
  size?: 'sm' | 'md' | 'lg';
}
```

### 4. Página de Perfil do Aluno (Admin)

**Arquivo:** `src/pages/admin/PerfilAlunoAdminPage.tsx`

**Alterações:**
- Importar o componente `AdminAvatarUpload`
- Substituir o avatar estático (linhas 293-300) pelo componente de upload
- Invalidar query `admin-aluno-perfil` após upload

**Layout Atualizado:**

```text
┌──────────────────────────────────────────┐
│  ← Voltar                                │
│                                          │
│   [    FOTO    ] 📷     Nome Aluno       │  ← Clicável para upload
│                         6º A • Linguística│
│                                          │
├──────────────────────────────────────────┤
│  Informações                             │
│  ...                                     │
└──────────────────────────────────────────┘
```

## Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `src/components/admin/AdminAvatarUpload.tsx` | Componente de upload de avatar para uso pelo admin |

## Arquivos a Modificar

| Arquivo | Alterações |
|---------|------------|
| `src/pages/professor/ProfessorConfiguracoesPage.tsx` | Adicionar AvatarUpload na seção "Meu Perfil" |
| `src/pages/admin/PerfilAlunoAdminPage.tsx` | Adicionar AdminAvatarUpload no header |

## Fluxo de Upload

```text
Professor (Configurações)           Admin (Perfil do Aluno)
        │                                    │
        ▼                                    ▼
   AvatarUpload                      AdminAvatarUpload
        │                                    │
        ▼                                    ▼
  bucket: avatars                     bucket: avatars
  path: {userId}/avatar.ext           path: {alunoId}/avatar.ext
        │                                    │
        ▼                                    ▼
  Atualiza profiles.avatar_url       Atualiza profiles.avatar_url
        │                                    │
        ▼                                    ▼
  refreshData()                      invalidateQueries()
```

## Resumo

1. **Nova migração SQL**: Políticas RLS para admin poder fazer upload de avatars
2. **Novo componente**: `AdminAvatarUpload` para uso nas páginas de admin
3. **Professor**: Integrar `AvatarUpload` na página de Configurações
4. **Admin Aluno**: Integrar `AdminAvatarUpload` no perfil do aluno
