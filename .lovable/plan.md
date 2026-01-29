
# Plano: Mostrar Fase Atual no Dashboard do Professor

## Problema

No dashboard do professor simplificado (Infantil/F1), a linha abaixo do nome mostra:
```
Professora • Fundamental 1
```

O usuário deseja que mostre a **fase atual** em vez do segmento.

## Solução

Alterar a linha 99 do `ProfessorDashboardSimplificado.tsx` para exibir a fase atual.

## Resultado Esperado

```text
Antes:  "Professora • Fundamental 1"
Depois: "Professora • Fase Linguística" (ou nome da fase ativa)
```

Se não houver fase ativa, pode manter um fallback genérico.

## Alteração em `ProfessorDashboardSimplificado.tsx`

**Linha 99 - de:**
```tsx
<p className="text-white/50 text-sm mb-4">{titulo} • {segmentoLabel}</p>
```

**Linha 99 - para:**
```tsx
<p className="text-white/50 text-sm mb-4">
  {titulo} • {faseAtual?.inteligencia?.nome 
    ? `Fase ${faseAtual.inteligencia.nome}` 
    : 'Nenhuma fase ativa'}
</p>
```

## Visual Final

```text
┌──────────────────────────────────────────┐
│                                     ⚙️   │
│                                          │
│         Olá, Julianeide!                 │
│     Professora • Fase Linguística        │  ← Mostra fase atual
│                                          │
│  ┌────────────────────────────────────┐  │
│  │  ℹ️ Você está na fase Linguística  │  │
│  └────────────────────────────────────┘  │
│                                          │
│  MINHAS TURMAS                           │
│  ...                                     │
└──────────────────────────────────────────┘
```

## Arquivo a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/professor/ProfessorDashboardSimplificado.tsx` | Substituir `segmentoLabel` pelo nome da fase atual |

## Opcional: Cor dinâmica

Podemos também colorir o nome da fase com a cor da inteligência para dar mais destaque visual:

```tsx
<p className="text-white/50 text-sm mb-4">
  {titulo} • <span style={{ color: faseAtual?.inteligencia?.cor_hex || '#fff' }}>
    {faseAtual?.inteligencia?.nome 
      ? `Fase ${faseAtual.inteligencia.nome}` 
      : 'Nenhuma fase ativa'}
  </span>
</p>
```

Isso criaria um efeito visual onde o nome da fase aparece com a cor correspondente à inteligência (ex: Linguística em azul, Musical em roxo, etc.).
