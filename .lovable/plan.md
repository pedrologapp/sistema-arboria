

# Plano: Corrigir Dois Botões X no Modal de Observação

## Problema Identificado

O modal "Adicionar observação?" exibe **dois ícones X** porque:

1. Há um botão X **customizado** na linha 79 do `ConfirmarObservacaoModal.tsx`
2. O componente `DialogContent` do Radix UI já inclui um botão X **automático** por padrão

---

## Solução

Adicionar a prop `hideCloseButton` ao `DialogContent` para ocultar o botão X automático do Radix, mantendo apenas o botão customizado que já está posicionado corretamente dentro do título.

---

## Alteração

**Arquivo:** `src/components/professor/circulo/ConfirmarObservacaoModal.tsx`

**Linha 75** - Adicionar `hideCloseButton`:

```typescript
// DE:
<DialogContent className="bg-[#1a1a2e] border-white/10 text-white max-w-sm">

// PARA:
<DialogContent className="bg-[#1a1a2e] border-white/10 text-white max-w-sm" hideCloseButton>
```

---

## Resultado Visual

```text
ANTES (dois X):                    DEPOIS (um X):
┌────────────────────────┐        ┌────────────────────────┐
│ Adicionar observação? ✕│ ✕      │ Adicionar observação? ✕│
│                        │        │                        │
│ Sinal: Desistiu        │        │ Sinal: Desistiu        │
│ Aluno: Adryan Samuel   │        │ Aluno: Adryan Samuel   │
└────────────────────────┘        └────────────────────────┘
      ↑           ↑                         ↑
   customizado  Radix                   apenas um
```

---

## Arquivos Afetados

| Arquivo | Alteração |
|---------|-----------|
| `src/components/professor/circulo/ConfirmarObservacaoModal.tsx` | Adicionar `hideCloseButton` na linha 75 |

---

## Detalhes Técnicos

- O componente `DialogContent` em `src/components/ui/dialog.tsx` já suporta a prop `hideCloseButton` (linhas 30-35)
- Quando `hideCloseButton={true}` ou `hideCloseButton` é passado, o botão X padrão do Radix não é renderizado
- O botão customizado na linha 79 permanece funcionando normalmente

