
# Plano: Edge Function `delete-alunos-por-segmento`

## Objetivo

Criar uma Edge Function segura que permite ao administrador deletar todos os alunos de um segmento específico (infantil, fundamental1, fundamental2) de uma instituição, facilitando reimportações limpas.

---

## Especificações da Função

### Endpoint
```
POST /functions/v1/delete-alunos-por-segmento
```

### Parâmetros (Body JSON)
```json
{
  "institutionId": "uuid",
  "segmento": "infantil" | "fundamental1" | "fundamental2"
}
```

### Headers Obrigatórios
```
Authorization: Bearer <token>
X-Confirm-Delete: true
```

### Resposta de Sucesso
```json
{
  "success": true,
  "segmento": "infantil",
  "total_deletados": 60,
  "message": "60 alunos do segmento infantil foram excluídos com sucesso"
}
```

---

## Fluxo de Execução

```text
┌─────────────────────────────────────────────────────────────────┐
│                    DELETE ALUNOS POR SEGMENTO                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. VALIDAÇÕES                                                  │
│     ├─ Verificar Authorization header                           │
│     ├─ Verificar X-Confirm-Delete: true                         │
│     ├─ Verificar se usuário é admin                             │
│     ├─ Validar institutionId (UUID válido)                      │
│     └─ Validar segmento (infantil|fundamental1|fundamental2)    │
│                                                                 │
│  2. BUSCAR ALUNOS DO SEGMENTO                                   │
│     ├─ SELECT id FROM profiles                                  │
│     │   WHERE institution_id = ? AND segmento = ?               │
│     │   AND id IN (SELECT user_id FROM user_roles               │
│     │              WHERE role = 'user')                         │
│     └─ Guardar lista de IDs                                     │
│                                                                 │
│  3. DELETAR DEPENDÊNCIAS (em lote)                              │
│     ├─ score_ajustes_log                                        │
│     ├─ inteligencia_evidencias                                  │
│     ├─ inteligencia_historico                                   │
│     ├─ inteligencia_scores                                      │
│     ├─ entregas                                                 │
│     ├─ observacoes                                              │
│     ├─ alertas_alunos                                           │
│     ├─ acoes_professor                                          │
│     ├─ acoes_celebracao                                         │
│     ├─ aluno_turma                                              │
│     ├─ cargos_casa                                              │
│     ├─ missao_destinatarios                                     │
│     ├─ bonus_solicitacoes                                       │
│     ├─ pontos_gerais                                            │
│     ├─ mensagens_canal                                          │
│     ├─ mensagens_privadas                                       │
│     ├─ conversa_participantes                                   │
│     └─ canal_leituras                                           │
│                                                                 │
│  4. DELETAR AUTH USERS (em paralelo, batches de 10)             │
│     └─ supabaseAdmin.auth.admin.deleteUser(userId)              │
│        (CASCADE deleta profiles e user_roles automaticamente)   │
│                                                                 │
│  5. RETORNAR RESUMO                                             │
│     └─ { success, segmento, total_deletados, message }          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Arquivo a Criar

### `supabase/functions/delete-alunos-por-segmento/index.ts`

```typescript
// Estrutura principal
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-confirm-delete",
};

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Validar headers
    const authHeader = req.headers.get("Authorization");
    const confirmHeader = req.headers.get("X-Confirm-Delete");
    
    if (!authHeader) return error(401, "Não autorizado");
    if (confirmHeader !== "true") return error(400, "Header X-Confirm-Delete: true é obrigatório");

    // 2. Verificar admin
    // ... (verificar role via supabaseClient)

    // 3. Validar body
    const { institutionId, segmento } = await req.json();
    if (!institutionId || !segmento) return error(400, "institutionId e segmento são obrigatórios");
    if (!["infantil", "fundamental1", "fundamental2"].includes(segmento)) {
      return error(400, "Segmento inválido");
    }

    // 4. Buscar alunos do segmento
    // ... (query com join em user_roles para pegar só role='user')

    // 5. Deletar dependências em batch
    // ... (Promise.all com deletes em cada tabela)

    // 6. Deletar auth users em paralelo
    // ... (batches de 10 para evitar timeout)

    // 7. Retornar resumo
    return success({ segmento, total_deletados, message: "..." });
  } catch (error) {
    return error(500, "Erro interno");
  }
});
```

---

## Configuração

### `supabase/config.toml`
```toml
[functions.delete-alunos-por-segmento]
verify_jwt = false
```

---

## Segurança Implementada

| Camada | Proteção |
|--------|----------|
| Autenticação | Requer Bearer token válido |
| Autorização | Verifica role = 'admin' na tabela user_roles |
| Confirmação | Requer header X-Confirm-Delete: true |
| Validação | Verifica segmento contra lista permitida |
| Escopo | Só deleta usuários com role = 'user' (nunca admin/professor) |

---

## Tabelas de Dependência (Ordem de Deleção)

Baseado na função `delete-users-bulk` existente:

```text
1. score_ajustes_log      (aluno_id)
2. inteligencia_evidencias (aluno_id)
3. inteligencia_historico  (aluno_id)
4. inteligencia_scores     (aluno_id)
5. entregas               (aluno_id)
6. observacoes            (aluno_id)
7. alertas_alunos         (aluno_id)
8. acoes_professor        (aluno_id)
9. acoes_celebracao       (aluno_id)
10. aluno_turma           (aluno_id)
11. cargos_casa           (aluno_id)
12. missao_destinatarios  (aluno_id)
13. bonus_solicitacoes    (aluno_id)
14. pontos_gerais         (aluno_id)
15. mensagens_canal       (autor_id)
16. mensagens_privadas    (autor_id)
17. conversa_participantes (usuario_id)
18. canal_leituras        (usuario_id)
```

Após deletar dependências, `deleteUser()` do Auth faz CASCADE em:
- `profiles` (ON DELETE CASCADE)
- `user_roles` (ON DELETE CASCADE)

---

## Exemplo de Uso (Frontend)

```typescript
const response = await fetch(
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-alunos-por-segmento`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Confirm-Delete': 'true',
    },
    body: JSON.stringify({
      institutionId: '902876e9-b263-4c01-9013-aeef7b6d24e1',
      segmento: 'infantil',
    }),
  }
);

const result = await response.json();
// { success: true, segmento: 'infantil', total_deletados: 60, ... }
```

---

## Diferença da `delete-users-bulk`

| Aspecto | delete-users-bulk | delete-alunos-por-segmento |
|---------|-------------------|---------------------------|
| Escopo | Todos os alunos da instituição | Apenas alunos de 1 segmento |
| Parâmetro | institutionId | institutionId + segmento |
| Uso | Reset total | Reimportação parcial |
| Segurança extra | deleteAllStudents: true | X-Confirm-Delete header |

---

## Resumo de Implementação

1. **Criar arquivo**: `supabase/functions/delete-alunos-por-segmento/index.ts`
2. **Atualizar config**: Adicionar entrada em `supabase/config.toml`
3. **Deploy automático**: Lovable faz deploy ao salvar

A função será útil para:
- Reimportar alunos do infantil sem afetar fundamental
- Limpar dados de teste por segmento
- Migração gradual entre sistemas
