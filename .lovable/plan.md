
# Plano: Aplicar Layout Grid Compacto na Aba de Alunos

## Objetivo

Transformar a lista de alunos (linhas) em um **grid de avatares compactos** igual ao da aba Círculo, com 4-5 alunos por linha.

## Mudanças em `AlunosPageSimplificado.tsx`

### De (Lista em linhas):
```text
(A)  Adryan Samuel da Silva   5ºA   >
 🔴
(B)  Bruno Costa Santos       5ºA   >
 🟢
```

### Para (Grid 4-5 por linha):
```text
[AC] [BS] [CF] [DG]
[EH] [FI] [GJ] [HK]
```

## Alterações

| Elemento | Antes | Depois |
|----------|-------|--------|
| Layout | Lista vertical (1 por linha) | Grid 4-5 colunas |
| Container | `space-y-0.5` | `grid grid-cols-4 sm:grid-cols-5 gap-2` |
| Avatar | `w-10 h-10` (40px) | `h-14 w-14` (56px) |
| Nome | Em linha com série/turma | Abaixo do avatar, abreviado |
| Série/Turma | Visível na linha | Removido (só nome) |
| Seta | `ChevronRight` | Removida |
| Bolinha status | No avatar | Mantida no avatar |
| Skeletons | Linha horizontal | Círculos em grid |

## Componente Simplificado

```typescript
// Novo card de aluno (estilo círculo)
<button
  onClick={() => handleAlunoClick(aluno.id)}
  className="flex flex-col items-center gap-1 p-1.5 rounded-xl
    hover:bg-white/5 transition-all duration-200 
    active:scale-95 group"
>
  <div className="relative">
    <Avatar className="h-14 w-14 ring-2 ring-transparent group-hover:ring-white/20">
      {/* Avatar ou iniciais */}
    </Avatar>
    {/* Bolinha de status */}
    <div 
      className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#0d0d0d]"
      style={{ backgroundColor: statusColor }}
    />
  </div>
  <span className="text-white/80 text-xs font-medium text-center leading-tight">
    {nomeAbreviado}
  </span>
</button>
```

## Função para Abreviar Nome

```typescript
const getAbreviatedName = (nome: string) => {
  const parts = nome.split(' ');
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
};

// "Adryan Samuel da Silva" → "Adryan S."
```

## Skeletons Atualizados

```typescript
// De: linhas horizontais
// Para: grid de círculos
<div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
  {[1,2,3,4,5,6,7,8].map(i => (
    <div className="flex flex-col items-center gap-1">
      <Skeleton className="w-14 h-14 rounded-full" />
      <Skeleton className="w-12 h-3 rounded" />
    </div>
  ))}
</div>
```

## Resumo Visual Final

**Mobile (4 por linha):**
```text
[AS] [BC] [CD] [DE]
[EF] [FG] [GH] [HI]
```

**Telas maiores (5 por linha):**
```text
[AS] [BC] [CD] [DE] [EF]
[FG] [GH] [HI] [IJ] [JK]
```

## Arquivo a Modificar

- `src/pages/professor/AlunosPageSimplificado.tsx`
