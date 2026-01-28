

# Plano: Integração ActiveSoft → Arboria

## Resumo
Criar infraestrutura para sincronizar ~400 alunos do sistema ActiveSoft com o Arboria, usando `matricula_externa` como identificador único e uma Edge Function para receber dados via N8N.

---

## Parte 1: Alteração no Banco de Dados

### 1.1 Criar campo `matricula_externa`
Adicionar coluna na tabela `profiles` para vincular alunos com o sistema externo:

```sql
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS matricula_externa VARCHAR(50);

-- Índice único para garantir não duplicar
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_matricula_externa 
ON profiles(matricula_externa) WHERE matricula_externa IS NOT NULL;
```

**Por que UNIQUE parcial?** Permite que alunos criados manualmente (sem matrícula externa) tenham o campo NULL, mas garante que matrículas externas sejam únicas.

---

## Parte 2: Edge Function `sync-alunos-externos`

### 2.1 Criar a função
Arquivo: `supabase/functions/sync-alunos-externos/index.ts`

**Funcionalidades:**
- Recebe array de alunos via POST
- Autenticação via **token secreto** (header `X-Sync-Token`)
- Para cada aluno:
  - Se `matricula_externa` NÃO existe → Cria usuário completo
  - Se `matricula_externa` EXISTE → Atualiza apenas profiles

### 2.2 Payload esperado
```json
{
  "alunos": [
    {
      "matricula": "2169.2025",
      "nome": "Abner Gabriel",
      "sobrenome": "Tomaz da Silva Araújo",
      "sexo": "M",
      "data_nascimento": "2019-05-07",
      "serie": "1º Ano",
      "turma": "B",
      "segmento": "fundamental1",
      "institution_id": "uuid-da-instituicao"
    }
  ]
}
```

### 2.3 Fluxo de criação de aluno novo
```text
1. Verificar se existe aluno com matricula_externa = matricula
2. Se NÃO existe:
   ├── Gerar email temporário: {matricula}@aluno.arboria.com
   ├── Gerar senha: sobrenome_normalizado + "123"
   ├── Criar em auth.users via admin.createUser()
   ├── Atualizar profiles com dados + matricula_externa
   └── Criar user_roles com role = 'user'
3. Se EXISTE:
   └── Atualizar nome, sobrenome, serie, turma em profiles
```

### 2.4 Resposta
```json
{
  "success": true,
  "total": 400,
  "criados": 350,
  "atualizados": 45,
  "erros": [
    "Linha 5: 2169.2025 - Sobrenome muito curto"
  ]
}
```

---

## Parte 3: Configuração

### 3.1 Adicionar ao `config.toml`
```toml
[functions.sync-alunos-externos]
verify_jwt = false
```

### 3.2 Criar secret para autenticação
Criar secret `SYNC_ALUNOS_TOKEN` com um token seguro (ex: UUID gerado) para o N8N usar.

---

## Parte 4: URL e Documentação

### URL da Edge Function
```
https://uoxcnkqjxthivsvxqonj.supabase.co/functions/v1/sync-alunos-externos
```

### Headers necessários no N8N
| Header | Valor |
|--------|-------|
| `Content-Type` | `application/json` |
| `X-Sync-Token` | `{valor do secret SYNC_ALUNOS_TOKEN}` |

### Exemplo de chamada cURL
```bash
curl -X POST \
  'https://uoxcnkqjxthivsvxqonj.supabase.co/functions/v1/sync-alunos-externos' \
  -H 'Content-Type: application/json' \
  -H 'X-Sync-Token: seu-token-secreto-aqui' \
  -d '{
    "alunos": [
      {
        "matricula": "2169.2025",
        "nome": "Abner Gabriel",
        "sobrenome": "Tomaz da Silva Araújo",
        "serie": "1º Ano",
        "turma": "B",
        "institution_id": "uuid-da-instituicao"
      }
    ]
  }'
```

---

## Detalhes Técnicos

### Geração de Email Temporário
Como o ActiveSoft não fornece email, a função gerará emails no formato:
```
{matricula_sem_pontos}@aluno.arboria.app
```
Exemplo: `2169.2025` → `21692025@aluno.arboria.app`

### Geração de Senha
Seguindo o padrão existente do projeto:
```
senha = sobrenome_normalizado + "123"
```
Exemplo: "Tomaz da Silva Araújo" → `tomazdasilvaaraujo123`

### Mapeamento de Segmento para Série (opcional)
Se quiser atribuir casa automaticamente baseado no segmento:
| Segmento | Séries | Casa sugerida |
|----------|--------|---------------|
| infantil | 1º-2º | Aleatória |
| fundamental1 | 3º-5º | Aleatória |
| fundamental2 | 6º-9º | Aleatória |
| medio | 1º-3º EM | Aleatória |

---

## Arquivos a serem criados/modificados

1. **Migration SQL** - Adicionar campo `matricula_externa`
2. **`supabase/functions/sync-alunos-externos/index.ts`** - Edge Function
3. **`supabase/config.toml`** - Adicionar configuração da função
4. **Secret** - Criar `SYNC_ALUNOS_TOKEN` para autenticação

---

## Próximos Passos após Implementação

1. Você cria o secret `SYNC_ALUNOS_TOKEN` com um valor seguro
2. Você configura o N8N para chamar a Edge Function com esse token
3. Teste com 1-2 alunos primeiro
4. Execute a sincronização completa dos ~400 alunos

