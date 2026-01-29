
## Situação atual (o que eu já confirmei no backend)

1) A função **`public.trigger_notificar_n8n_observacao()`** que está ativa no banco **já contém** os blocos `aluno` e `sinal` no `jsonb_build_object(...)` (exatamente como no diff que você enviou).

2) Os triggers em `observacoes` **estão ativos** e incluem:
- `trg_notificar_n8n_observacao` → chama `trigger_notificar_n8n_observacao()`

3) A estrutura das tabelas bate com o código da função:
- `observacoes.aluno_id` (uuid, NOT NULL)
- `observacoes.sinal_id` (smallint, NOT NULL)
- `sinais` tem `id, codigo, emoji, label_pt, valencia, pilar, peso_inteligencia`
- `profiles` tem `matricula_externa`, `segmento`, etc.

4) Fiz um “preview” do payload via SQL (reconstruindo o JSON a partir da última observação) e **`aluno` e `sinal` aparecem corretamente** no JSON gerado dentro do banco.

Conclusão: do lado do banco, **as queries do aluno e do sinal têm dados e deveriam montar os objetos**. Como o N8N está mostrando “faltando aluno e sinal”, a causa mais provável é:
- o N8N está exibindo o payload **depois** de algum node que “filtra/Set” campos (e ele removeu `aluno` e `sinal`), ou
- algum comportamento de parsing/transformação no N8N está descartando esses dois objetos (por exemplo, “keep only set”, ou um Function node que retorna só parte do JSON).

Mesmo assim, dá para “blindar” e principalmente **provar** o que está sendo enviado, com um log do payload no backend.

---

## Objetivo desta correção

1) Garantir que **sempre** exista `aluno` e `sinal` no payload (mesmo se algum lookup falhar em algum caso extremo).
2) Criar um mecanismo de auditoria para confirmar **o JSON exato** que o backend enviou para o N8N (para eliminar dúvidas).

---

## Mudanças propostas (implementação)

### A) Criar uma tabela de log/outbox do webhook (somente para auditoria)
Criar tabela (ex.: `public.webhook_n8n_logs`) com:
- `id` (bigserial / identity)
- `created_at` (timestamptz default now())
- `observacao_id` (uuid)
- `endpoint_url` (text)
- `request_id` (bigint, id retornado por `net.http_post`)
- `payload` (jsonb)

Segurança:
- Habilitar RLS e **não criar políticas de leitura** (fica privada; só o sistema/admin consegue ver no backend).
- Isso evita exposição do payload para usuários comuns.

Retenção:
- Para evitar crescimento infinito, adicionar uma limpeza simples (ex.: apagar logs com mais de 7 ou 14 dias) ou manter apenas os últimos N registros por instituição. (Decidiremos o critério mais seguro e barato em performance.)

### B) Reescrever a função para ser “à prova de falhas” e registrar o payload
Atualizar `public.trigger_notificar_n8n_observacao()` para:

1. Buscar aluno e sinal e capturar se “FOUND” foi true/false:
- `SELECT ... INTO v_aluno ...;`
- `IF NOT FOUND THEN v_aluno_json := jsonb_build_object('id', NEW.aluno_id); ELSE ... END IF;`
- mesmo padrão para `sinal`

2. Construir o payload usando variáveis JSON prontas:
- `v_payload := jsonb_build_object(..., 'aluno', v_aluno_json, 'sinal', v_sinal_json, ...)`

3. Executar o POST guardando o `request_id`:
- `v_request_id := net.http_post(...);`

4. Inserir o payload no log (com `observacao_id` e `request_id`) **antes ou depois** do POST:
- Preferência: inserir **depois** do POST para salvar também o `request_id`.
- Em caso de exception, salvar uma linha com `error_msg` (se criarmos esse campo) ou ao menos logar warning.

Observação importante:
- Isso **não muda** o contrato do webhook para o N8N (o payload continua com o formato desejado). O log é interno.

---

## Como vamos validar (passo a passo)

1) Você registra uma nova observação (por exemplo, na tela onde você está agora: `/professor/circulo/serie/6/turma/A`).

2) Eu verifico no backend (via consulta) o registro mais recente em `webhook_n8n_logs.payload` e confirmo:
- `payload->'aluno'` existe e está preenchido
- `payload->'sinal'` existe e está preenchido

3) Você confere no N8N:
- No node Webhook (trigger), olhar o “Raw Body” / “JSON” recebido diretamente.
- Se no N8N continuar faltando `aluno` e `sinal`, mas no log do backend eles estiverem presentes, então o problema está **no fluxo do N8N após o recebimento** (ex.: Set node mantendo só alguns campos, Function node retornando parcial, etc.). Aí a correção é 100% do lado do N8N.

---

## Entregáveis (o que vai mudar de fato)

- Nova migration SQL criando `public.webhook_n8n_logs` + RLS (privado).
- Nova migration SQL atualizando `public.trigger_notificar_n8n_observacao()`:
  - “FOUND checks” para aluno e sinal
  - `request_id` do `net.http_post`
  - persistência do payload na tabela de log (com retenção simples)

---

## Riscos e mitigação

- **Overhead de escrita**: cada observação gera 1 insert extra (log). Mitigação: retenção e payload só para auditoria; se quiser, depois podemos desativar/remoção do log com outra migration quando estiver 100% estável.
- **Dados sensíveis**: payload pode conter nomes; mitigação: tabela privada (RLS sem políticas de select).

