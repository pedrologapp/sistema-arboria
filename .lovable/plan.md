

## Plano: Separadores de data entre mensagens no chat

### Abordagem

Adicionar um componente `DateSeparator` que renderiza uma linha horizontal com a data centralizada (estilo Discord/WhatsApp). Ele será inserido automaticamente entre mensagens de dias diferentes.

### Componente novo: `src/components/chat/DateSeparator.tsx`

Um componente simples que recebe uma data string e exibe algo como:

```
——— Hoje ———
——— Ontem ———
——— 08 de março ———
```

Usando `date-fns` + `ptBR` locale para formatar. Lógica:
- Se é hoje → "Hoje"
- Se é ontem → "Ontem"  
- Caso contrário → "dd 'de' MMMM" (ou "dd 'de' MMMM 'de' yyyy" se for outro ano)

### Onde inserir

Nos 3 arquivos que renderizam `mensagensNormais.map(...)`:

1. `src/pages/aluno/CanalChatPage.tsx`
2. `src/pages/professor/ProfessorCanalViewPage.tsx`
3. `src/pages/admin/AdminCanalChatPage.tsx`

Em cada `.map()`, antes de renderizar o `MensagemBubble`, verificar se a data mudou em relação à mensagem anterior. Se mudou, renderizar o `DateSeparator` antes.

### Visual

```text
─────────── Ontem ───────────
  [avatar] João · 14:32
           Olá pessoal!
  [avatar] Maria · 14:35
           Oi João!
─────────── Hoje ───────────
  [avatar] Pedro · 09:10
           Bom dia!
```

Linha branca/10% opacity com texto centralizado em `text-white/40 text-xs`.

