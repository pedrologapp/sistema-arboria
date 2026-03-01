

## Configurar webhook do Mapa de Desenvolvimento

**Problema**: A URL do webhook está referenciando uma variável de ambiente (`VITE_WEBHOOK_MAPA_URL`) que não está definida, então o webhook nunca dispara.

**Solução**: Substituir pela URL hardcoded `https://webhook.escolaamadeus.com/webhook/projetoarboria`, seguindo o mesmo padrão já usado nos outros webhooks do sistema (`RegistrarAcaoModal.tsx` e `ExplicacaoContradicaoModal.tsx`).

### Alteração em `src/pages/professor/MapaDesenvolvimentoPage.tsx`

**Linha 163** — trocar:
```typescript
const webhookUrl = import.meta.env.VITE_WEBHOOK_MAPA_URL;
if (webhookUrl) {
```
por:
```typescript
const webhookUrl = 'https://webhook.escolaamadeus.com/webhook/projetoarboria';
{
```

Isso é tudo. O payload já está completo com evento, professor, turma, fase, alocações e resumo.

