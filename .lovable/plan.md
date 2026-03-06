

## Plano: Mostrar nome e sobrenome no chat

O `MembroCard` usa apenas `membro.nome` (primeiro nome). O `sobrenome` está disponível nos dados mas não é exibido. Também o `DmItem` já concatena nome + sobrenome corretamente.

### Alteração: `src/components/chat/MembroCard.tsx`

Linha 35 — mudar de:
```ts
const nomeExibido = membro.nome || membro.full_name || 'Usuário';
```
Para:
```ts
const nomeExibido = (membro.nome && membro.sobrenome) 
  ? `${membro.nome} ${membro.sobrenome}` 
  : membro.full_name || membro.nome || 'Usuário';
```

Isso mostra "João Silva" em vez de apenas "João" em todas as listas de membros do chat (aluno e professor).

### Arquivo alterado

| Arquivo | Alteração |
|---------|-----------|
| `src/components/chat/MembroCard.tsx` | Concatenar nome + sobrenome na exibição |

