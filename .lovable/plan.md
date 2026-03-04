

## Correção: Erro ao registrar observação + verificação do webhook

### Problema identificado

A coluna `foi_cross_im` na tabela `observacoes` é uma **coluna gerada** (computed) pelo banco de dados. O código está tentando inserir `foi_cross_im: false` manualmente, o que o PostgreSQL rejeita com erro.

### Sobre o webhook

O webhook para o N8N **já está configurado** via trigger no banco de dados (`trigger_notificar_n8n_observacao`). Toda vez que uma observação é inserida com sucesso na tabela `observacoes`, o trigger dispara automaticamente o envio ao endpoint do N8N. O problema é que como o insert falha (por causa do `foi_cross_im`), o webhook nunca chega a ser disparado.

### Correção

Remover `foi_cross_im: false` dos dois inserts em `CirculoRegistrarPage.tsx`:

1. **Linha 153** — no `handleConfirm` (observação padrão)
2. **Linha 236** — no `handleConfirmPersonalizado` (observação personalizada)

Ao remover, o banco calculará o valor automaticamente e o insert funcionará, disparando o webhook normalmente.

### Arquivo alterado
- `src/pages/professor/circulo/CirculoRegistrarPage.tsx` — remover 2 linhas com `foi_cross_im: false`

