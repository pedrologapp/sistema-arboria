
# Plano: Webhook para N8N ao Registrar Observações

## Resumo

Criar um trigger de banco de dados que dispara automaticamente um webhook para o N8N (`https://n8n.escolaamadeus.com/webhook-test/projetoarboria`) toda vez que um professor registrar uma observação de um aluno.

## Arquitetura Atual

O sistema já possui:
- **5 triggers** na tabela `observacoes` que disparam após INSERT
- **pg_net** habilitado (v0.19.5) - permite fazer chamadas HTTP de dentro do banco
- **Padrão estabelecido** em `trigger_analisar_observacao_ia` que já usa `net.http_post()`

## O Que Será Implementado

### 1. Função de Webhook

```text
┌─────────────────────────────────────────────────────────────────┐
│  trigger_notificar_n8n_observacao()                            │
├─────────────────────────────────────────────────────────────────┤
│  • Dispara após cada INSERT na tabela observacoes              │
│  • Envia HTTP POST para N8N com dados completos                │
│  • Inclui dados do aluno, sinal, professor e contexto          │
│  • Falha silenciosa (não bloqueia o registro)                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Payload Enviado ao N8N

O webhook enviará um JSON completo com:

| Campo | Descrição | Exemplo |
|-------|-----------|---------|
| `evento` | Tipo do evento | `"observacao_criada"` |
| `observacao_id` | ID único da observação | `"uuid..."` |
| `aluno_id` | ID do aluno | `"uuid..."` |
| `aluno_nome` | Nome completo do aluno | `"João Silva"` |
| `aluno_serie` | Série do aluno | `"7ano"` |
| `aluno_turma` | Turma do aluno | `"A"` |
| `professor_id` | ID do professor | `"uuid..."` |
| `professor_nome` | Nome do professor | `"Maria Souza"` |
| `sinal_id` | ID do sinal | `1` |
| `sinal_codigo` | Código do sinal | `"brilhou"` |
| `sinal_label` | Label do sinal | `"Brilhou"` |
| `valencia` | Tipo (positivo/atenção) | `"positivo"` |
| `pilar` | Pilar do sinal | `"cognitivo"` |
| `inteligencia_expressa` | Casa que demonstrou | `3` |
| `inteligencia_fase` | Casa da fase atual | `5` |
| `foi_cross_im` | Foi cross-inteligência? | `true` |
| `observacao_texto` | Nota opcional | `"Participou muito..."` |
| `data_observacao` | Data do registro | `"2026-01-28"` |
| `created_at` | Timestamp completo | `"2026-01-28T15:30:00Z"` |

### 3. Fluxo de Dados

```text
┌──────────────┐    ┌─────────────┐    ┌─────────────┐    ┌──────────────┐
│  Professor   │───►│   Lovable   │───►│  Supabase   │───►│     N8N      │
│  registra    │    │   (app)     │    │  (trigger)  │    │  (webhook)   │
│  observação  │    │             │    │             │    │              │
└──────────────┘    └─────────────┘    └─────────────┘    └──────────────┘
                                              │
                                              ▼
                                    ┌─────────────────┐
                                    │ Payload JSON    │
                                    │ com dados       │
                                    │ completos       │
                                    └─────────────────┘
```

---

## Detalhes Técnicos

### Migration SQL

Será criada uma migration contendo:

1. **Função `trigger_notificar_n8n_observacao()`**
   - Usa `net.http_post()` para enviar dados ao N8N
   - Faz JOINs para buscar nomes do aluno, professor e dados do sinal
   - Usa bloco `EXCEPTION` para falhar silenciosamente

2. **Trigger `trg_notificar_n8n_observacao`**
   - `AFTER INSERT ON observacoes`
   - `FOR EACH ROW`
   - Executa a função acima

### Tratamento de Erros

- Se o N8N estiver offline, o registro da observação **não é afetado**
- Erros são logados via `RAISE WARNING` para debugging
- O fluxo principal do app continua normalmente

### Segurança

- O webhook é público (padrão N8N para webhook-test)
- Se você precisar de autenticação, podemos adicionar um header de API key
- Os dados enviados são os mesmos que um professor já tem acesso

---

## Resultado Esperado

Após a implementação:

1. Professor registra observação normalmente no app
2. Trigger dispara automaticamente (assíncrono)
3. N8N recebe POST com payload JSON completo
4. N8N pode processar, armazenar ou rotear os dados

### Exemplo de Payload Real

```json
{
  "evento": "observacao_criada",
  "observacao_id": "a1b2c3d4-...",
  "timestamp": "2026-01-28T15:30:00Z",
  "aluno": {
    "id": "uuid-aluno",
    "nome": "João Silva",
    "serie": "7ano",
    "turma": "A"
  },
  "professor": {
    "id": "uuid-professor",
    "nome": "Maria Souza"
  },
  "sinal": {
    "id": 1,
    "codigo": "brilhou",
    "label": "Brilhou",
    "valencia": "positivo",
    "pilar": "cognitivo"
  },
  "inteligencias": {
    "expressa": 3,
    "fase": 5,
    "foi_cross_im": true
  },
  "texto": "Participou ativamente da discussão",
  "data_observacao": "2026-01-28"
}
```

---

## Próximos Passos

Após aprovação, criarei:
1. Migration SQL com função e trigger
2. Documentação do payload para configurar no N8N
