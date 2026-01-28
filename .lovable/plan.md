
# Correção: Webhook N8N Não Disparando

## Problema Identificado

O webhook não está chegando ao N8N porque a função `trigger_notificar_n8n_observacao()` está passando o parâmetro `body` como **TEXT** quando deveria ser **JSONB**.

### Código Atual (incorreto)
```sql
PERFORM net.http_post(
  url := 'https://n8n.escolaamadeus.com/webhook-test/projetoarboria',
  body := v_payload::text,  -- ❌ Tipo errado
  headers := jsonb_build_object('Content-Type', 'application/json')
);
```

### Assinatura Correta do pg_net
```sql
http_post(
  url text,
  body jsonb,           -- ✅ Espera JSONB, não TEXT
  params jsonb,
  headers jsonb,
  timeout_milliseconds integer
)
```

## Solução

Atualizar a função para passar o payload diretamente como JSONB.

### Código Corrigido
```sql
PERFORM net.http_post(
  url := 'https://n8n.escolaamadeus.com/webhook-test/projetoarboria',
  body := v_payload,    -- ✅ Já é JSONB
  headers := jsonb_build_object('Content-Type', 'application/json')
);
```

## Migration SQL

Será criada uma migration para atualizar a função existente:

```text
┌─────────────────────────────────────────────────────────────────┐
│  CREATE OR REPLACE FUNCTION trigger_notificar_n8n_observacao() │
├─────────────────────────────────────────────────────────────────┤
│  Correção única:                                                │
│  - Mudar body := v_payload::text                               │
│  - Para body := v_payload (JSONB direto)                       │
└─────────────────────────────────────────────────────────────────┘
```

## Fluxo Após Correção

```text
Professor           App              Supabase            N8N
    │                │                   │                │
    ├──registra──────►                   │                │
    │                ├──INSERT──────────►│                │
    │                │                   ├──trigger───────►
    │                │                   │                │
    │                │                   │   body: JSONB  │
    │                │                   │       ✅        │
    │                │                   │                │
    │                │                   │◄───200 OK──────┤
    │◄──sucesso──────┤                   │                │
```

## Verificação

Após a correção:
1. Fazer uma nova observação no Círculo
2. Verificar no N8N se o webhook chegou
3. O payload JSON completo estará disponível
