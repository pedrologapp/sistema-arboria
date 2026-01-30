

# Plano: Receptor de Sugestões do N8N

## Objetivo
Criar uma Edge Function que receba sugestões geradas pela IA do N8N e as salve na tabela `alertas_alunos`, onde o professor já visualiza no perfil do aluno.

---

## Arquitetura

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                                  N8N                                        │
│  1. Recebe observacao via webhook                                          │
│  2. Busca contexto do aluno                                                │
│  3. Chama IA (OpenAI/Gemini)                                               │
│  4. Gera sugestao                                                          │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
                                     ▼ POST
┌─────────────────────────────────────────────────────────────────────────────┐
│     Edge Function: receber-sugestao-n8n                                     │
│                                                                             │
│  1. Valida X-Arboria-Secret                                                │
│  2. Valida payload                                                          │
│  3. Arquiva alertas antigos do aluno                                        │
│  4. Insere novo alerta em alertas_alunos                                   │
│  5. (Opcional) Envia push notification ao professor                         │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Tabela: alertas_alunos                                                     │
│  - tipo_alerta: precisa_atencao | celebrar | neutro                        │
│  - dados_contexto: JSONB com hipoteses, acoes, etc                         │
│  - notificacao_ativa: true                                                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Professor abre perfil do aluno                                             │
│  FeedbackEstadoCard exibe a sugestao                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Edge Function: receber-sugestao-n8n

### Endpoint
```
POST https://uoxcnkqjxthivsvxqonj.supabase.co/functions/v1/receber-sugestao-n8n
```

### Headers Obrigatorios
```
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
X-Arboria-Secret: <token_compartilhado>
```

### Payload Aceito
```json
{
  "aluno_id": "uuid-do-aluno (obrigatorio)",
  "observacao_gatilho_id": "uuid-da-observacao-que-disparou (opcional)",
  
  "estado": "precisa_atencao | celebrar | neutro",
  "texto_acontecendo": "Descricao do que esta acontecendo...",
  
  "sinal_principal": "Nome do sinal principal",
  "sinal_codigo": "codigo_snake_case",
  
  "hipoteses": [
    {
      "titulo": "Titulo da Hipotese",
      "descricao": "Explicacao detalhada",
      "perguntas": ["Pergunta para investigar"]
    }
  ],
  
  "acoes_sugeridas": [
    {
      "acao": "Descricao da acao",
      "prioridade": "alta | media | baixa"
    }
  ],
  
  "padrao_identificado": {
    "nome": "Nome do padrao",
    "significado": "O que esse padrao indica"
  },
  
  "arquetipo": {
    "nome_arquetipo": "O Mestre das Palavras",
    "tipo": "descoberta | confirmacao",
    "significado": "Explicacao",
    "potencializar": ["Dica 1", "Dica 2"],
    "sugestao_conversa": "Frase sugerida para o professor"
  },
  
  "prioridade": "importante | normal | baixa",
  "mensagem_professor": "Mensagem de encorajamento ao professor"
}
```

### Resposta de Sucesso
```json
{
  "success": true,
  "alerta_id": "uuid-do-alerta-criado",
  "message": "Sugestao recebida e salva com sucesso"
}
```

### Resposta de Erro
```json
{
  "success": false,
  "error": "Descricao do erro"
}
```

---

## Logica da Edge Function

### 1. Validar Secret
```typescript
const secret = req.headers.get('X-Arboria-Secret');
if (secret !== Deno.env.get('N8N_WEBHOOK_SECRET')) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
}
```

### 2. Validar Campos Obrigatorios
```typescript
if (!payload.aluno_id || !payload.estado || !payload.texto_acontecendo) {
  return new Response(JSON.stringify({ error: 'Campos obrigatorios ausentes' }), { status: 400 });
}
```

### 3. Buscar Dados do Aluno
```typescript
const { data: aluno } = await supabase
  .from('profiles')
  .select('id, institution_id, casa_id')
  .eq('id', payload.aluno_id)
  .single();
```

### 4. Arquivar Alertas Antigos
```typescript
await supabase
  .from('alertas_alunos')
  .update({ status: 'arquivado', notificacao_ativa: false })
  .eq('aluno_id', payload.aluno_id)
  .eq('status', 'ativo');
```

### 5. Inserir Novo Alerta
```typescript
const dadosContexto = {
  estado: payload.estado,
  sinal_principal: payload.sinal_principal,
  sinal_codigo: payload.sinal_codigo,
  texto_acontecendo: payload.texto_acontecendo,
  hipoteses: payload.hipoteses,
  acoes_sugeridas: payload.acoes_sugeridas,
  padrao_identificado: payload.padrao_identificado,
  arquetipo: payload.arquetipo,
  mensagem_professor: payload.mensagem_professor,
  gerado_por: 'n8n',
  timestamp_analise: new Date().toISOString()
};

await supabase.from('alertas_alunos').insert({
  institution_id: aluno.institution_id,
  aluno_id: payload.aluno_id,
  tipo_alerta: payload.estado,
  motivo: 'analise_n8n',
  status: 'ativo',
  notificacao_ativa: true,
  fase_id: faseAtualId,
  dados_contexto: dadosContexto
});
```

---

## Secret para Autenticacao

Sera necessario adicionar um secret no projeto:
- **Nome**: `N8N_WEBHOOK_SECRET`
- **Valor**: Token seguro compartilhado com o N8N (ex: `arboria_n8n_2026_secret_token`)

---

## Webhook de Feedback (Opcional - Fase 2)

Quando o professor registrar uma acao ou conversa, o sistema pode enviar um POST de volta para o N8N:

```
POST https://n8n.vinirossa.com.br/webhook/arboria-feedback
```

```json
{
  "tipo": "acao_professor",
  "alerta_id": "uuid",
  "aluno_id": "uuid",
  "professor_id": "uuid",
  "acao_tomada": "conversa_individual",
  "notas": "Texto do professor",
  "created_at": "2026-01-30T15:00:00Z"
}
```

---

## Arquivos a Criar

| Arquivo | Descricao |
|---------|-----------|
| `supabase/functions/receber-sugestao-n8n/index.ts` | Edge Function receptora |

---

## Teste Apos Implementacao

1. Fazer POST de teste para o endpoint
2. Verificar se o alerta aparece na tabela `alertas_alunos`
3. Abrir perfil do aluno no app e verificar se a sugestao aparece
4. Registrar acao/conversa e verificar se status atualiza

