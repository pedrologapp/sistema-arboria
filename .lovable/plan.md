

# Plano: Card "Precisa de justificativa" em formato retangular largo

## Resumo

Modificar o card "Aguardando você" para:
1. Renomear para **"Precisa de justificativa"**
2. Layout em **retângulo horizontal** (largura total, altura pequena)
3. Posicionado **abaixo do grid 2x2** dos outros alertas

---

## Alterações

### 1. Arquivo: `src/components/professor/AlertBoxes.tsx`

**Mudanças:**

1. **Atualizar label** no `alertConfigs` (linha 49):
   - De: `'Aguardando você'`
   - Para: `'Precisa de justificativa'`

2. **Separar o card de justificativa** do grid 2x2:
   - Remover `aguardando_explicacao` do array `alertConfigs`
   - Criar array separado para os 4 cards do grid
   - Renderizar o card de justificativa **fora do grid**, em um componente inline próprio

3. **Novo layout:**

```text
┌─────────────────────────────────────────┐
│           ALERTAS DA CASA               │
├─────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐       │
│  │ 🔴 Precisam │  │ ✨ Celebre  │       │
│  │   de você   │  │             │       │
│  └─────────────┘  └─────────────┘       │
│  ┌─────────────┐  ┌─────────────┐       │
│  │ 🟡 Não      │  │ ⚠️ Fase     │       │
│  │   esqueça   │  │   anterior  │       │
│  └─────────────┘  └─────────────┘       │
│                                          │
│  ┌──────────────────────────────────┐   │ ← NOVO: retângulo largo e baixo
│  │ 💬 2   Precisa de justificativa  │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

---

### 2. Estrutura do Card Largo

O card terá:
- **Altura pequena:** ~48px (py-2)
- **Largura total:** 100% (col-span-2 ou fora do grid)
- **Layout horizontal:** ícone + número + label em uma linha
- **Mesma cor roxa:** `#6B21A8`
- **Badge de notificação** posicionado à direita

```tsx
{/* Card retangular largo para Justificativa */}
<motion.button
  onClick={() => handleCardClick('aguardando_explicacao')}
  disabled={getCountByType('aguardando_explicacao') === 0}
  whileHover={{ scale: 1.01 }}
  whileTap={{ scale: 0.99 }}
  className="relative w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl transition-all"
  style={{
    backgroundColor: count > 0 ? '#6B21A8' : '#2A2A2A',
    cursor: count > 0 ? 'pointer' : 'default'
  }}
>
  {/* Badge */}
  {hasBadge && (...)}
  
  {/* Ícone */}
  <span className="text-lg">💬</span>
  
  {/* Número */}
  <span className="text-xl font-bold text-white">{count}</span>
  
  {/* Label */}
  <span className="text-sm font-medium text-white/90">
    Precisa de justificativa
  </span>
</motion.button>
```

---

### 3. Arquivo: `src/components/professor/AlertBoxesTurmas.tsx`

Mesmas alterações para manter paridade.

---

### 4. Arquivo: `src/components/professor/AlertaDetalheModal.tsx`

Atualizar o título do modal:
- De: `'Aguardando você'`
- Para: `'Precisa de justificativa'`

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/professor/AlertBoxes.tsx` | Separar card, layout horizontal |
| `src/components/professor/AlertBoxesTurmas.tsx` | Paridade |
| `src/components/professor/AlertaDetalheModal.tsx` | Atualizar título |

---

## Visual Final

| Propriedade | Valor |
|-------------|-------|
| Nome | "Precisa de justificativa" |
| Ícone | 💬 |
| Cor ativa | `#6B21A8` (Purple) |
| Altura | ~48px (compacto) |
| Largura | 100% (borda a borda) |
| Posição | Abaixo do grid 2x2 |

