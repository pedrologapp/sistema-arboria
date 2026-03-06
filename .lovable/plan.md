

## Plano: Deletar mensagens de Adryan Samuel dos canais

### Dados encontrados

Adryan Samuel da Silva Dantas (ID: `84938726-22bb-48fe-9263-4a20cc2af164`) tem **2 mensagens** em canais de chat:

| Mensagem | Canal | Data |
|----------|-------|------|
| "Oi" | `fdc2dc7d...` | 10/02/2026 |
| "Estou com uma duvida na missao semanal da linguistica" | `14546d75...` | 10/02/2026 |

Não há mensagens privadas (DMs) dele.

### Ação

Executar DELETE no banco de dados para remover as 2 mensagens:

```sql
DELETE FROM mensagens_canal
WHERE autor_id = '84938726-22bb-48fe-9263-4a20cc2af164';
```

Também verificar e limpar activity_logs relacionados, se houver:

```sql
DELETE FROM activity_logs
WHERE user_id = '84938726-22bb-48fe-9263-4a20cc2af164'
  AND action = 'chat_mensagem';
```

Nenhuma alteração de código necessária.

