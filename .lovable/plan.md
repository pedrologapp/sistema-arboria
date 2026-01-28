
# Plano: Edge Function `sync-alunos-pull`

## Objetivo

Criar uma Edge Function que **busca automaticamente** os alunos de um Supabase externo (seu banco) e sincroniza com o Lovable, eliminando a necessidade de enviar dados manualmente via request body.

---

## Arquitetura

```text
┌─────────────────────────────────────────────────────────────────┐
│                      sync-alunos-pull                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. VALIDAÇÃO                                                   │
│     ├─ Verificar X-Sync-Token                                   │
│     └─ Validar parâmetros (institution_id, segmento opcional)   │
│                                                                 │
│  2. CONECTAR NO SUPABASE EXTERNO                                │
│     ├─ URL: EXTERNAL_SUPABASE_URL (secret)                      │
│     ├─ Key: EXTERNAL_SUPABASE_KEY (secret)                      │
│     └─ createClient(url, key)                                   │
│                                                                 │
│  3. BUSCAR ALUNOS                                               │
│     ├─ SELECT * FROM arboria_alunos                             │
│     ├─ WHERE segmento = ? (opcional)                            │
│     └─ Retornar lista de alunos                                 │
│                                                                 │
│  4. SINCRONIZAR NO LOVABLE                                      │
│     ├─ Reutilizar lógica de sync-alunos-externos                │
│     ├─ UPSERT em profiles                                       │
│     ├─ Criar auth users (se necessário)                         │
│     └─ Garantir roles e scores                                  │
│                                                                 │
│  5. RETORNAR RESUMO                                             │
│     └─ { success, total, criados, atualizados, erros }          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Secrets Necessários (novos)

Você precisará adicionar 2 novos secrets:

| Secret | Descrição |
|--------|-----------|
| `EXTERNAL_SUPABASE_URL` | URL do seu Supabase externo (ex: `https://abc123.supabase.co`) |
| `EXTERNAL_SUPABASE_KEY` | Anon Key ou Service Role Key do seu Supabase externo |

---

## Endpoint

```
POST /functions/v1/sync-alunos-pull
```

### Headers
```
X-Sync-Token: [seu_token_atual]
Content-Type: application/json
```

### Body (parâmetros)
```json
{
  "institutionId": "902876e9-b263-4c01-9013-aeef7b6d24e1",
  "segmento": "infantil"  // opcional - filtra por segmento
}
```

### Resposta
```json
{
  "success": true,
  "total": 60,
  "criados": 55,
  "atualizados": 5,
  "vinculados": 0,
  "erros": [],
  "fonte": "arboria_alunos"
}
```

---

## Estrutura Esperada da Tabela Externa

A tabela `arboria_alunos` no seu Supabase deve ter estas colunas:

```sql
CREATE TABLE arboria_alunos (
  id SERIAL PRIMARY KEY,
  matricula TEXT NOT NULL,
  nome TEXT NOT NULL,
  sobrenome TEXT NOT NULL,
  sexo TEXT,
  data_nascimento DATE,
  serie TEXT,
  turma TEXT,
  segmento TEXT,  -- 'infantil', 'fundamental1', 'fundamental2'
  ativo BOOLEAN DEFAULT true
);
```

**Nota**: Você NÃO precisa ter `institution_id` na tabela externa - ele é passado como parâmetro na chamada.

---

## Código da Edge Function

### `supabase/functions/sync-alunos-pull/index.ts`

```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-sync-token',
};

// Reutilizar funções auxiliares de sync-alunos-externos
// (normalizeSobrenome, gerarEmail, criarNovoUsuario, etc.)

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Validar token
    const syncToken = Deno.env.get('SYNC_ALUNOS_TOKEN');
    const providedToken = req.headers.get('X-Sync-Token');
    if (providedToken !== syncToken) {
      return error(401, 'Token inválido');
    }

    // 2. Ler parâmetros
    const { institutionId, segmento } = await req.json();
    if (!institutionId) {
      return error(400, 'institutionId é obrigatório');
    }

    // 3. Conectar no Supabase EXTERNO
    const externalUrl = Deno.env.get('EXTERNAL_SUPABASE_URL');
    const externalKey = Deno.env.get('EXTERNAL_SUPABASE_KEY');
    
    if (!externalUrl || !externalKey) {
      return error(500, 'Credenciais do Supabase externo não configuradas');
    }

    const externalClient = createClient(externalUrl, externalKey);

    // 4. Buscar alunos da tabela arboria_alunos
    let query = externalClient
      .from('arboria_alunos')
      .select('*')
      .eq('ativo', true);

    if (segmento) {
      query = query.eq('segmento', segmento);
    }

    const { data: alunosExternos, error: fetchError } = await query;

    if (fetchError) {
      return error(500, `Erro ao buscar alunos: ${fetchError.message}`);
    }

    // 5. Conectar no Supabase LOCAL (Lovable)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // 6. Sincronizar cada aluno (mesma lógica de sync-alunos-externos)
    const result = {
      success: true,
      total: alunosExternos.length,
      criados: 0,
      atualizados: 0,
      vinculados: 0,
      erros: [],
      fonte: 'arboria_alunos'
    };

    for (const aluno of alunosExternos) {
      // Adicionar institution_id aos dados
      const alunoComInstitution = {
        ...aluno,
        institution_id: institutionId
      };
      
      // Reutilizar lógica de UPSERT...
    }

    return success(result);
  } catch (error) {
    return error(500, error.message);
  }
});
```

---

## Configuração

### `supabase/config.toml`
```toml
[functions.sync-alunos-pull]
verify_jwt = false
```

---

## Fluxo de Uso

```text
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   Seu Supabase   │     │  sync-alunos-pull │     │  Lovable Cloud   │
│   (externo)      │────▶│  (Edge Function)  │────▶│  (profiles)      │
│                  │     │                   │     │                  │
│  arboria_alunos  │     │  SELECT + UPSERT  │     │  profiles        │
│  60 alunos       │     │                   │     │  auth.users      │
└──────────────────┘     └──────────────────┘     └──────────────────┘
```

---

## Exemplo de Chamada

```bash
curl -X POST \
  https://uoxcnkqjxthivsvxqonj.supabase.co/functions/v1/sync-alunos-pull \
  -H "Content-Type: application/json" \
  -H "X-Sync-Token: [SEU_TOKEN]" \
  -d '{
    "institutionId": "902876e9-b263-4c01-9013-aeef7b6d24e1",
    "segmento": "infantil"
  }'
```

---

## Passos de Implementação

1. **Adicionar Secrets** (você precisará informar):
   - `EXTERNAL_SUPABASE_URL`
   - `EXTERNAL_SUPABASE_KEY`

2. **Criar Edge Function**: `supabase/functions/sync-alunos-pull/index.ts`

3. **Atualizar config.toml**

4. **Deploy automático**

---

## Vantagens desta Abordagem

| Antes (sync-alunos-externos) | Depois (sync-alunos-pull) |
|------------------------------|---------------------------|
| Você precisa extrair dados | Função busca automaticamente |
| Enviar via request body | Apenas chamar a função |
| Manual ou via script N8N | Uma única chamada HTTP |
| Limite de tamanho do body | Query direta no banco |

---

## Próximos Passos

Antes de implementar, preciso que você:

1. **Confirme a URL do seu Supabase externo** (ex: `https://xyz.supabase.co`)
2. **Confirme a chave** (Anon Key ou Service Role Key)
3. **Confirme a estrutura da tabela `arboria_alunos`**

Assim posso criar a função e configurar os secrets corretamente.
