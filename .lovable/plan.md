
# Plano: Adicionar Secret SYNC_ALUNOS_TOKEN

## Objetivo
Criar o secret de autenticação para a Edge Function `sync-alunos-externos`.

## Ação
Adicionar secret no Lovable Cloud:
- **Nome:** `SYNC_ALUNOS_TOKEN`
- **Valor:** `arboria-sync-2026-X7k9Lm2pQr`

## Resultado
Após criação, a Edge Function estará pronta para receber requisições do N8N com autenticação via header `X-Sync-Token`.

## URL para N8N
```
https://uoxcnkqjxthivsvxqonj.supabase.co/functions/v1/sync-alunos-externos
```

## Headers necessários
| Header | Valor |
|--------|-------|
| Content-Type | application/json |
| X-Sync-Token | arboria-sync-2026-X7k9Lm2pQr |
