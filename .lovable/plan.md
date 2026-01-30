
# Plano: Funcionalidade de Reset de Aluno (Admin)

## Resumo

Implementar botão "Resetar Aluno" no perfil do aluno (área admin) que zera todos os dados de testes (observações, alertas, scores) mantendo os dados cadastrais, com confirmação segura via digitação do nome.

---

## Arquitetura do Fluxo

```text
┌─────────────────────────────────────────────────────────────────────┐
│                      FLUXO DO RESET DE ALUNO                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Admin clica em "Resetar Aluno" (botão laranja)                     │
│       ↓                                                              │
│  Modal abre mostrando:                                               │
│    - Nome do aluno                                                   │
│    - Lista do que será deletado                                      │
│    - Campo para digitar nome de confirmação                          │
│       ↓                                                              │
│  Admin digita nome do aluno corretamente                             │
│       ↓                                                              │
│  Botão "Confirmar Reset" é habilitado                                │
│       ↓                                                              │
│  Clica → Chama Edge Function reset-aluno-dados                       │
│       ↓                                                              │
│  Edge Function:                                                      │
│    1. Verifica se é admin                                            │
│    2. Deleta dados na ordem correta                                  │
│    3. Reseta scores para 35                                          │
│    4. Registra log de auditoria                                      │
│    5. Retorna contagem do que foi deletado                           │
│       ↓                                                              │
│  Toast de sucesso com resumo                                         │
│       ↓                                                              │
│  Página recarrega os dados do aluno                                  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 1. Alterações no Banco de Dados

### 1.1 Criar tabela `admin_logs`

```sql
CREATE TABLE admin_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL,
  admin_id uuid NOT NULL,
  acao text NOT NULL,
  alvo_id uuid,
  alvo_tipo text,
  detalhes jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Índices para consultas
CREATE INDEX idx_admin_logs_institution ON admin_logs(institution_id);
CREATE INDEX idx_admin_logs_admin ON admin_logs(admin_id);
CREATE INDEX idx_admin_logs_created ON admin_logs(created_at DESC);

-- RLS
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;

-- Apenas admins podem ver/inserir logs
CREATE POLICY "Admin pode inserir logs" ON admin_logs
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin pode ver logs da instituição" ON admin_logs
  FOR SELECT USING (
    institution_id = get_user_institution_id() 
    AND has_role(auth.uid(), 'admin')
  );
```

---

## 2. Backend (Edge Function)

### 2.1 Criar `supabase/functions/reset-aluno-dados/index.ts`

**Responsabilidades:**
- Verificar se o usuário é admin
- Executar deletes na ordem correta (respeitando dependências)
- Resetar scores para valor inicial (35)
- Registrar log de auditoria
- Retornar contagem de registros afetados

**Payload esperado:**
```typescript
{
  alunoId: string;
  confirmacaoNome: string; // nome digitado pelo admin para confirmar
}
```

**Resposta:**
```typescript
{
  success: true;
  resumo: {
    observacoes: number;
    alertas: number;
    acoes_professor: number;
    acoes_celebracao: number;
    evidencias: number;
    historico: number;
    scores_resetados: number;
  };
  aluno_nome: string;
}
```

**Lógica (ordem das operações):**
1. Buscar dados do aluno (nome, institution_id)
2. Validar que confirmacaoNome corresponde ao nome completo do aluno
3. Deletar na ordem:
   - `acoes_professor` → retornar count
   - `acoes_celebracao` → retornar count
   - `alertas_alunos` → retornar count
   - `inteligencia_evidencias` → retornar count
   - `observacoes` → retornar count
   - `inteligencia_historico` → retornar count
4. Update em `inteligencia_scores`:
   - `score_atual = 35.00`
   - `score_ultima_fase = 0`
   - `total_evidencias = 0`
5. Inserir registro em `admin_logs`:
   ```json
   {
     "institution_id": "...",
     "admin_id": "...",
     "acao": "reset_aluno_dados",
     "alvo_id": "aluno_id",
     "alvo_tipo": "aluno",
     "detalhes": {
       "aluno_nome": "...",
       "resumo": { ... }
     }
   }
   ```
6. Retornar sucesso com resumo

---

## 3. Frontend

### 3.1 Atualizar `src/pages/admin/PerfilAlunoAdminPage.tsx`

**Mudanças:**

1. **Adicionar import:**
   - `RotateCcw` do lucide-react (ícone de refresh)

2. **Adicionar state** (linha ~40):
   ```typescript
   const [showConfirmResetDados, setShowConfirmResetDados] = useState(false);
   const [confirmacaoNome, setConfirmacaoNome] = useState('');
   ```

3. **Criar mutation** para reset de dados:
   ```typescript
   const resetarDadosMutation = useMutation({
     mutationFn: async () => {
       const { data, error } = await supabase.functions.invoke('reset-aluno-dados', {
         body: { 
           alunoId: id,
           confirmacaoNome: confirmacaoNome.trim()
         }
       });
       if (error) throw error;
       if (data?.error) throw new Error(data.error);
       return data;
     },
     onSuccess: (data) => {
       const { resumo } = data;
       toast.success(
         `Aluno resetado! ${resumo.observacoes} obs, ${resumo.alertas} alertas, ${resumo.scores_resetados} scores.`,
         { duration: 5000 }
       );
       setShowConfirmResetDados(false);
       setConfirmacaoNome('');
       // Invalidar queries para recarregar dados
       queryClient.invalidateQueries({ queryKey: ['admin-aluno-perfil', id] });
       queryClient.invalidateQueries({ queryKey: ['admin-aluno-scores', id] });
     },
     onError: (error) => {
       toast.error('Erro ao resetar: ' + error.message);
     }
   });
   ```

4. **Adicionar botão** na seção "Ações" (após resetar senha, antes de excluir):
   ```tsx
   <button
     onClick={() => setShowConfirmResetDados(true)}
     className="w-full p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl text-left hover:bg-orange-500/20 transition-colors"
   >
     <div className="flex items-center gap-3">
       <RotateCcw className="w-5 h-5 text-orange-500" />
       <div>
         <p className="text-orange-400 font-medium">Resetar Dados</p>
         <p className="text-orange-400/60 text-sm">Zera observações, alertas e scores</p>
       </div>
     </div>
   </button>
   ```

5. **Adicionar modal** de confirmação (após modal de excluir):

```tsx
{/* Modal Confirmar Reset de Dados */}
{showConfirmResetDados && (
  <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
    <div className="bg-[#1A1A1A] rounded-2xl p-6 w-full max-w-md">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center">
          <AlertTriangle className="w-6 h-6 text-orange-500" />
        </div>
        <h3 className="text-white text-lg font-medium">Resetar Aluno</h3>
      </div>
      
      <p className="text-white/60 text-sm mb-4">
        Você está prestes a resetar:
      </p>
      
      <p className="text-white font-semibold text-lg mb-4 text-center bg-white/5 p-3 rounded-lg">
        {aluno.full_name || `${aluno.nome} ${aluno.sobrenome}`}
      </p>
      
      <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 mb-4">
        <p className="text-orange-400 text-sm font-medium mb-2">
          Isso irá DELETAR permanentemente:
        </p>
        <ul className="text-orange-400/80 text-sm space-y-1">
          <li>• Todas as observações</li>
          <li>• Todos os alertas/sugestões da IA</li>
          <li>• Todas as ações registradas</li>
          <li>• Todas as evidências de inteligência</li>
          <li>• Histórico de scores</li>
        </ul>
        <p className="text-orange-400/80 text-sm mt-2">
          Os scores serão resetados para 35 (inicial).
        </p>
      </div>
      
      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
        <p className="text-red-400 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Esta ação NÃO pode ser desfeita!
        </p>
      </div>
      
      <div className="mb-4">
        <label className="text-white/60 text-sm mb-2 block">
          Para confirmar, digite o nome do aluno:
        </label>
        <input
          type="text"
          value={confirmacaoNome}
          onChange={(e) => setConfirmacaoNome(e.target.value)}
          placeholder={aluno.full_name || `${aluno.nome} ${aluno.sobrenome}`}
          className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-white/30"
        />
      </div>
      
      <div className="flex gap-3">
        <button
          onClick={() => {
            setShowConfirmResetDados(false);
            setConfirmacaoNome('');
          }}
          className="flex-1 p-3 bg-white/10 text-white rounded-xl"
        >
          Cancelar
        </button>
        <button
          onClick={() => resetarDadosMutation.mutate()}
          disabled={
            resetarDadosMutation.isPending || 
            confirmacaoNome.toLowerCase().trim() !== (aluno.full_name || `${aluno.nome} ${aluno.sobrenome}`).toLowerCase().trim()
          }
          className="flex-1 p-3 bg-orange-500 text-white font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {resetarDadosMutation.isPending ? 'Resetando...' : 'Confirmar Reset'}
        </button>
      </div>
    </div>
  </div>
)}
```

---

## 4. Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `supabase/functions/reset-aluno-dados/index.ts` | Edge function para executar o reset |

---

## 5. Arquivos a Modificar

| Arquivo | Alterações |
|---------|------------|
| `src/pages/admin/PerfilAlunoAdminPage.tsx` | Botão, modal e mutation de reset |

---

## 6. Migração SQL

```sql
-- Criar tabela de logs administrativos
CREATE TABLE admin_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL,
  admin_id uuid NOT NULL,
  acao text NOT NULL,
  alvo_id uuid,
  alvo_tipo text,
  detalhes jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Índices
CREATE INDEX idx_admin_logs_institution ON admin_logs(institution_id);
CREATE INDEX idx_admin_logs_admin ON admin_logs(admin_id);
CREATE INDEX idx_admin_logs_created ON admin_logs(created_at DESC);

-- RLS
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin pode inserir logs" ON admin_logs
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin pode ver logs da instituição" ON admin_logs
  FOR SELECT USING (
    institution_id = get_user_institution_id() 
    AND has_role(auth.uid(), 'admin')
  );
```

---

## 7. Visual Final

### Botão na Seção "Ações"

| Ordem | Botão | Cor | Ícone |
|-------|-------|-----|-------|
| 1 | Resetar Senha | Amarelo | Key |
| **2** | **Resetar Dados** | **Laranja** | **RotateCcw** |
| 3 | Excluir Aluno | Vermelho | Trash2 |

### Modal de Confirmação

- Fundo escuro `#1A1A1A`
- Ícone laranja (AlertTriangle)
- Nome do aluno em destaque
- Lista do que será deletado em box laranja
- Aviso "não pode ser desfeita" em box vermelho
- Campo de texto para confirmar
- Botão desabilitado até nome bater

---

## 8. Detalhes de Segurança

1. **Verificação de Role**: Edge function verifica `user_roles` antes de executar
2. **Confirmação por Nome**: Evita cliques acidentais
3. **Log de Auditoria**: Registra quem fez, quando e o que foi deletado
4. **Apenas Admin**: RLS garante que só admins acessam

---

## 9. Resumo de Dependências

A ordem de deleção respeita as dependências:
1. `acoes_professor` (referencia alertas)
2. `acoes_celebracao` (referencia alertas)  
3. `alertas_alunos` (referenciado por ações)
4. `inteligencia_evidencias` (referencia observações)
5. `observacoes` (referenciada por evidências)
6. `inteligencia_historico` (independente)
7. UPDATE `inteligencia_scores` (não deleta, apenas reseta)
