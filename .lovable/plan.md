
# Plano: Otimizar Grid de Alunos na Aba Círculo

## Objetivo

Ajustar o layout da grade de alunos em `CirculoTurmaDirectPage.tsx` para caber 4-5 alunos por linha, reduzindo o tamanho dos avatares e espaçamentos para diminuir a necessidade de scroll.

## Mudanças

### Arquivo: `src/pages/professor/circulo/CirculoTurmaDirectPage.tsx`

| Elemento | Antes | Depois |
|----------|-------|--------|
| Grid | `grid-cols-3 sm:grid-cols-4 md:grid-cols-5` | `grid-cols-4 sm:grid-cols-5` |
| Gap | `gap-4` | `gap-2` |
| Avatar | `h-20 w-20` (80px) | `h-14 w-14` (56px) |
| Fonte iniciais | `text-xl` | `text-base` |
| Fonte nome | `text-sm` | `text-xs` |
| Padding botão | `p-2` | `p-1.5` |
| Skeleton | `w-20 h-20` | `w-14 h-14` |

### Layout Final

**Em mobile (4 por linha):**
```text
[AC] [AC] [AC] [EF]
[EH] [ET] [FF] [HC]
[JN] [JG] [LF] [LV]
[LM] [MV] [MA] [...]
```

**Em telas maiores (5 por linha):**
```text
[AC] [AC] [AC] [EF] [EH]
[ET] [FF] [HC] [JN] [JG]
[LF] [LV] [LM] [MV] [MA]
```

## Benefícios

- 21 alunos cabem em 5-6 linhas (4/linha) ou 4-5 linhas (5/linha)
- Menos scroll para o professor
- Nome abreviado mantido legível ("Abraão C.")
- Iniciais no círculo permanecem visíveis

## Código Alterado

**Grid e gaps (linha ~123):**
```typescript
// De:
<div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">

// Para:
<div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
```

**Botão/Card do aluno (linhas ~125-143):**
```typescript
// De:
<button className="... p-2 ...">
  <Avatar className="h-20 w-20 ...">
    <AvatarFallback className="... text-xl ...">
  </Avatar>
  <span className="... text-sm ...">

// Para:
<button className="... p-1.5 ...">
  <Avatar className="h-14 w-14 ...">
    <AvatarFallback className="... text-base ...">
  </Avatar>
  <span className="... text-xs ...">
```

**Skeletons de loading (linhas ~111-118):**
```typescript
// De:
<div className="grid grid-cols-3 gap-4">
  <div className="w-20 h-20 ...">

// Para:
<div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
  <div className="w-14 h-14 ...">
```
