

# Plano: Ajustar SugestaoN8NCard com Cores por Estado

## Diagnóstico

O componente `SugestaoN8NCard` **existe e está recebendo todos os dados corretamente**. Porém, ele foi criado apenas para alertas de atenção (vermelho) e **não distingue celebrações** (dourado).

### Dados no Banco (Adryan)
```json
{
  "tipo_alerta": "celebrar",
  "dados_contexto": {
    "estado": "celebrar",
    "tipo_recomendacao": "RECONHECIMENTO PRIVADO",
    "nome_recomendacao": "Celebração da Liderança Linguística",
    "o_que_fazer_agora": {
      "objetivo": "Reforçar a confiança...",
      "script_principal": "Adryan Samuel, percebi algo especial..."
    },
    "use_a_forca": { "opcao_a": {...}, "opcao_b": {...} },
    "o_que_nao_fazer": ["Não fazer perguntas invasivas...", ...],
    "mensagem_professor": "Momento delicado de reconhecimento..."
  }
}
```

### Problemas Atuais

1. **Falta prop `estado`** na interface do componente
2. **Cores sempre vermelhas** (linha 54 do componente: `bg-[#7F1D1D]`, `border-red-600`)
3. **Header sempre diz "ALERTA ATIVO"** com ícone de alerta
4. **Seção "O que não fazer" sempre aberta** (deveria ser colapsável)

---

## Alterações Necessárias

### Arquivo 1: `src/types/sugestaoN8N.ts`

Adicionar prop `estado` na interface:

```typescript
export interface SugestaoN8NCardProps {
  // Estado (determina cor do card)
  estado?: 'celebrar' | 'precisa_atencao' | 'aguardando_explicacao';
  
  // ... resto das props existentes
}
```

---

### Arquivo 2: `src/components/professor/SugestaoN8NCard.tsx`

#### A) Aceitar prop `estado` e definir cores dinâmicas

```typescript
export function SugestaoN8NCard({
  estado = 'precisa_atencao',  // ← NOVA PROP
  tipoRecomendacao,
  // ...resto
}: SugestaoN8NCardProps) {

  // Cores baseadas no estado
  const corConfig = {
    celebrar: {
      bg: 'bg-gradient-to-br from-yellow-900/40 to-amber-900/30',
      border: 'border-yellow-500/50',
      headerBg: 'bg-yellow-500/20',
      headerText: 'text-yellow-400',
      headerLabel: 'CELEBRE!',
      icon: Sparkles  // ícone de celebração
    },
    precisa_atencao: {
      bg: 'bg-[#7F1D1D]',
      border: 'border-red-600',
      headerBg: 'bg-red-500/20',
      headerText: 'text-red-300',
      headerLabel: 'ALERTA ATIVO',
      icon: AlertTriangle
    },
    aguardando_explicacao: {
      bg: 'bg-gradient-to-br from-amber-900/40 to-orange-900/30',
      border: 'border-amber-500/50',
      headerBg: 'bg-amber-500/20',
      headerText: 'text-amber-400',
      headerLabel: 'JUSTIFIQUE',
      icon: MessageCircleQuestion
    }
  };

  const cor = corConfig[estado] || corConfig.precisa_atencao;
  const IconeHeader = cor.icon;
```

#### B) Aplicar cores dinâmicas no container

```typescript
// Antes (linha 54):
<div className="rounded-xl border-2 border-red-600 bg-[#7F1D1D] overflow-hidden">

// Depois:
<div className={cn(
  "rounded-xl border-2 overflow-hidden",
  cor.border,
  cor.bg
)}>
```

#### C) Ajustar header dinâmico

```typescript
// Antes (linhas 57-68):
<AlertTriangle className="w-5 h-5 text-red-300" />
<span className="text-xs font-semibold uppercase tracking-wider text-white">
  ALERTA ATIVO
</span>

// Depois:
<IconeHeader className={cn("w-5 h-5", cor.headerText)} />
<span className={cn("text-xs font-semibold uppercase tracking-wider", cor.headerText)}>
  {cor.headerLabel}
</span>
```

#### D) Tornar "O que não fazer" colapsável

```typescript
// Adicionar estado
const [oQueNaoFazerAberto, setOQueNaoFazerAberto] = useState(false);

// Substituir seção (linhas 293-309):
{temOQueNaoFazer && (
  <div className="px-4 pb-4">
    <div className="rounded-lg border border-red-500/20 bg-red-900/20 overflow-hidden">
      <button
        onClick={() => setOQueNaoFazerAberto(!oQueNaoFazerAberto)}
        className="w-full p-3 flex items-center justify-between hover:bg-white/5"
      >
        <span className="text-red-400 text-sm font-semibold">
          O QUE NAO FAZER
        </span>
        {oQueNaoFazerAberto ? (
          <ChevronUp className="w-4 h-4 text-white/40" />
        ) : (
          <ChevronDown className="w-4 h-4 text-white/40" />
        )}
      </button>
      {oQueNaoFazerAberto && (
        <ul className="px-3 pb-3 space-y-1 border-t border-white/10 pt-2">
          {oQueNaoFazer!.map((item, i) => (
            <li key={i} className="text-sm text-white/80 flex items-start gap-2">
              <span className="text-red-400 flex-shrink-0">x</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  </div>
)}
```

---

### Arquivo 3: `src/pages/professor/PerfilAlunoPage.tsx`

Passar a prop `estado` para o componente:

```typescript
// Linha 329-350 - Adicionar estado
<SugestaoN8NCard
  estado={aluno.alertaAtivo.tipo as 'celebrar' | 'precisa_atencao' | 'aguardando_explicacao'}
  tipoRecomendacao={aluno.alertaAtivo.tipoRecomendacao}
  // ...resto das props
/>
```

---

### Arquivo 4: `src/pages/professor/PerfilAlunoPageSimplificado.tsx`

Mesma alteração (paridade).

---

## Resultado Visual Esperado

### Celebrar (Dourado)
```text
+-----------------------------------------------------+
|  Sparkles  CELEBRE!                     [MEDIA]     |
+-----------------------------------------------------+
|  [Tipo + Nome da Recomendacao - fundo amarelo]      |
|  [Elemento de Ponte]                                |
|  [Padrao Detectado]                                 |
|  [O QUE FAZER AGORA - sempre aberto]                |
|  [Opcao A] [v]                                      |
|  [Opcao B] [v]                                      |
|  [COMO REAGIR]                                      |
|  [O QUE NAO FAZER] [v] <- colapsavel                |
|  [MENSAGEM PARA VOCE]                               |
|  [Registrar minha acao]                             |
+-----------------------------------------------------+
```

### Precisa Atencao (Vermelho)
```text
+-----------------------------------------------------+
|  AlertTriangle  ALERTA ATIVO            [URGENTE]   |
+-----------------------------------------------------+
|  [Mesmo layout, cores vermelhas]                    |
+-----------------------------------------------------+
```

---

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/types/sugestaoN8N.ts` | Adicionar prop `estado` |
| `src/components/professor/SugestaoN8NCard.tsx` | Cores dinamicas + colapsavel |
| `src/pages/professor/PerfilAlunoPage.tsx` | Passar prop `estado` |
| `src/pages/professor/PerfilAlunoPageSimplificado.tsx` | Paridade |

