

## Plano: Capturar IP e garantir logs de TODOS os acessos

### Problema atual
- A tabela `activity_logs` tem coluna `ip_address` mas ela nunca é preenchida
- O `logActivity` faz insert direto pelo cliente, que não tem acesso ao IP do usuário
- Apenas 1 login foi registrado no total (16 logs no sistema inteiro)

### Solução

**1. Criar edge function `log-activity`** que captura o IP do header da requisição e insere no banco:

```typescript
// supabase/functions/log-activity/index.ts
// Recebe { action, details } via POST
// Extrai IP de req.headers (x-forwarded-for / x-real-ip)
// Extrai user_id do JWT
// Insere em activity_logs com ip_address preenchido
```

**2. Atualizar `src/utils/logActivity.ts`** para chamar a edge function em vez de insert direto:

```typescript
export async function logActivity(userId, action, details) {
  await supabase.functions.invoke('log-activity', {
    body: { action, details: { ...details, device: getDevice(), user_agent: navigator.userAgent } }
  });
}
```

**3. Atualizar `src/pages/admin/AtividadesPage.tsx`** para exibir IP e user agent nos detalhes expandidos:
- Mostrar IP no card expandido
- Mostrar dispositivo/navegador

**4. Configurar `verify_jwt = false`** no config.toml para a function e validar o JWT manualmente dentro dela (para poder ler o IP mesmo assim pegando o user do token).

### Resultado
- Todo login, logout e ação registra o IP real do usuário
- O admin pode ver de onde cada pessoa acessou
- Dados de navegador/dispositivo ficam visíveis nos detalhes

