

# Plano: Refinamentos Visuais e Tipográficos do Card de Alerta

## Resumo das Melhorias

O card de alerta precisa de refinamentos para melhorar a legibilidade e profissionalismo:
1. Texto "acontecendo" truncado sem opção de expandir
2. Ações com texto longo difícil de escanear
3. Badges de prioridade pouco visíveis
4. Fonte atual (Lexend) com traços arredondados que diminuem a sofisticação

---

## Alterações Propostas

### 1. Mudança de Fonte: Lexend para Inter

A fonte Inter é mais moderna, profissional e tem melhor legibilidade em interfaces.

| Arquivo | Mudança |
|---------|---------|
| `index.html` | Substituir link Google Fonts de Lexend por Inter |
| `tailwind.config.ts` | Alterar `font-sans` de Lexend para Inter |

**Nova hierarquia tipográfica:**
- Títulos (ALERTA ATIVO): `font-semibold` (600), 14-16px, caixa alta
- Subtítulos (Hipóteses): `font-medium` (500), 14px
- Texto corpo: `font-normal` (400), 14px
- Descrições secundárias: `font-normal` (400), 12-13px, cor `text-white/60`
- Labels/badges: `font-semibold` (600), 11-12px, caixa alta

---

### 2. Texto "Acontecendo" Expansível

O texto será mostrado completo com botão "Ler menos" ou truncado com "Ler mais":

```text
┌─────────────────────────────────────────────────┐
│ ⚠️ ALERTA ATIVO                                 │
│                                                  │
│ Adryan demonstra capacidade cognitiva clara     │
│ (3x 'pegou rápido'), mas apresentou             │
│ isolamento seguido de travamento.               │
│                                     [Ler mais ↓]│
└─────────────────────────────────────────────────┘
```

**Novo estado no componente:**
```typescript
const [textoExpandido, setTextoExpandido] = useState(false);
```

**Lógica:**
- Se texto tem mais de 150 caracteres, mostrar truncado com botão "Ler mais"
- Botão toggle entre "Ler mais" e "Ler menos"

---

### 3. Ações com Título e Descrição Separados

Separar pelo caractere ":" quando presente:
- **Antes do ":"** = Título (sempre visível, negrito)
- **Depois do ":"** = Descrição (colapsável, cinza claro)

```text
┌─────────────────────────────────────────────────┐
│ ✅ AÇÕES SUGERIDAS                               │
│                                                  │
│ ┌───────────────────────────────────────────────┐│
│ │ [ALTA]  Conversa Privada de Investigação      ││
│ │ Chame Adryan SOZINHO, em momento neutro...  [▸]││
│ └───────────────────────────────────────────────┘│
│                                                  │
│ ┌───────────────────────────────────────────────┐│
│ │ [ALTA]  Estratégia da Escrita Protegida       ││
│ │ Crie um 'diário do observador'...          [▸]││
│ └───────────────────────────────────────────────┘│
│                                                  │
│ ┌───────────────────────────────────────────────┐│
│ │ [MÉDIA] Ponte Linguística                     ││
│ │ Narrar para Destravar...                   [▸]││
│ └───────────────────────────────────────────────┘│
└─────────────────────────────────────────────────┘
```

**Lógica de parsing:**
```typescript
const parseAcao = (acao: string) => {
  const colonIndex = acao.indexOf(':');
  if (colonIndex === -1) {
    return { titulo: acao, descricao: null };
  }
  return {
    titulo: acao.substring(0, colonIndex).trim(),
    descricao: acao.substring(colonIndex + 1).trim()
  };
};
```

**Estado para ações colapsáveis:**
```typescript
const [acoesExpandidas, setAcoesExpandidas] = useState<Record<number, boolean>>({});
```

---

### 4. Badges de Prioridade Mais Visíveis

Substituir bolinhas pequenas por chips coloridos com texto:

| Prioridade | Estilo |
|------------|--------|
| ALTA | `bg-red-500 text-white font-semibold text-xs px-2 py-0.5 rounded` |
| MÉDIA | `bg-amber-500 text-black font-semibold text-xs px-2 py-0.5 rounded` |
| BAIXA | `bg-green-500 text-white font-semibold text-xs px-2 py-0.5 rounded` |

```text
[ALTA]  Conversa Privada de Investigação
[MÉDIA] Ponte Linguística
[BAIXA] Observar mais
```

---

## Arquivos a Modificar

| Arquivo | Mudanças |
|---------|----------|
| `index.html` | Trocar fonte Lexend por Inter no Google Fonts |
| `tailwind.config.ts` | Alterar `fontFamily.sans` para Inter |
| `src/components/professor/FeedbackEstadoCard.tsx` | Novo layout para N8N: texto expansível, ações com título/descrição, badges grandes |

---

## Detalhes Técnicos

### index.html
```html
<!-- ANTES -->
<link href="https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400;1,400&display=swap" rel="stylesheet">

<!-- DEPOIS -->
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400;1,400&display=swap" rel="stylesheet">
```

### tailwind.config.ts
```typescript
fontFamily: {
  sans: ['Inter', 'sans-serif'],  // Antes era 'Lexend'
  fantasy: ['Playfair Display', 'Georgia', 'serif'],
},
```

### FeedbackEstadoCard.tsx - Novos Estados
```typescript
const [textoExpandido, setTextoExpandido] = useState(false);
const [acoesExpandidas, setAcoesExpandidas] = useState<Record<number, boolean>>({});
```

### FeedbackEstadoCard.tsx - Texto Acontecendo Expansível
```tsx
{/* Texto acontecendo com "Ler mais/menos" */}
{textoAcontecendo.length > 150 ? (
  <div>
    <p className="text-sm text-white leading-relaxed">
      {textoExpandido ? textoAcontecendo : `${textoAcontecendo.substring(0, 150)}...`}
    </p>
    <button
      onClick={() => setTextoExpandido(!textoExpandido)}
      className="mt-1 text-xs text-white/60 hover:text-white/80 flex items-center gap-1"
    >
      {textoExpandido ? 'Ler menos' : 'Ler mais'}
      {textoExpandido ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
    </button>
  </div>
) : (
  <p className="text-sm text-white leading-relaxed">{textoAcontecendo}</p>
)}
```

### FeedbackEstadoCard.tsx - Ações com Cards
```tsx
{/* Ações Sugeridas - Layout de Cards */}
{acoesSugeridas && acoesSugeridas.length > 0 && (
  <div>
    <h4 className="text-xs font-semibold uppercase tracking-wide text-white/60 mb-3 flex items-center gap-2">
      <Target className="w-3.5 h-3.5" />
      Ações Sugeridas
    </h4>
    <div className="space-y-2">
      {acoesSugeridas.map((acao, i) => {
        const { titulo, descricao } = parseAcao(acao.acao);
        const isExpanded = acoesExpandidas[i];
        
        return (
          <div 
            key={i} 
            className={cn(
              'rounded-lg border overflow-hidden',
              acao.prioridade === 'alta' ? 'border-red-500/30 bg-red-900/20' :
              acao.prioridade === 'media' ? 'border-amber-500/30 bg-amber-900/20' :
              'border-green-500/30 bg-green-900/20'
            )}
          >
            <button
              onClick={() => setAcoesExpandidas(prev => ({ ...prev, [i]: !prev[i] }))}
              className="w-full p-3 flex items-start gap-3 text-left"
            >
              {/* Badge de prioridade */}
              <span className={cn(
                'text-xs font-semibold uppercase px-2 py-0.5 rounded flex-shrink-0',
                acao.prioridade === 'alta' ? 'bg-red-500 text-white' :
                acao.prioridade === 'media' ? 'bg-amber-500 text-black' :
                'bg-green-500 text-white'
              )}>
                {acao.prioridade === 'alta' ? 'Alta' : acao.prioridade === 'media' ? 'Média' : 'Baixa'}
              </span>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{titulo}</p>
                {descricao && (
                  <p className={cn(
                    'text-xs text-white/60 mt-1',
                    !isExpanded && 'line-clamp-1'
                  )}>
                    {descricao}
                  </p>
                )}
              </div>
              
              {descricao && (
                <ChevronDown className={cn(
                  'w-4 h-4 text-white/40 flex-shrink-0 transition-transform',
                  isExpanded && 'rotate-180'
                )} />
              )}
            </button>
          </div>
        );
      })}
    </div>
  </div>
)}
```

---

## Hierarquia Visual Final

```text
┌──────────────────────────────────────────────────────┐
│ ⚠️ ALERTA ATIVO                      ← font-semibold │
│                                         text-xs       │
│                                         uppercase     │
├──────────────────────────────────────────────────────┤
│                                                       │
│ Adryan demonstra capacidade cognitiva ← font-normal  │
│ clara (3x 'pegou rápido'), mas                       │
│ apresentou isolamento seguido de                     │
│ travamento em um curto período...    [Ler mais ↓]   │
│                                                       │
│ ┌───────────────────────────────────────────────────┐│
│ │ 🔍 PADRÃO DETECTADO              ← font-semibold  ││
│ │ Sinais de Atenção Consecutivos   ← font-medium    ││
│ │ "Isolou-se" e "Travou"           ← text-white/60  ││
│ └───────────────────────────────────────────────────┘│
│                                                       │
│              [Ver mais ↓]                            │
└──────────────────────────────────────────────────────┘
```

---

## Resumo das Mudanças

1. **Fonte**: Lexend → Inter (mais moderna e profissional)
2. **Texto acontecendo**: Expansível com "Ler mais/menos"
3. **Ações**: Cards com título separado da descrição
4. **Badges**: Chips coloridos [ALTA] [MÉDIA] [BAIXA]
5. **Descrições**: Colapsáveis, fonte menor, cor cinza
6. **Hierarquia**: Títulos semibold, descrições regular + opacity

