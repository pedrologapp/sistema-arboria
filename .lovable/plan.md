
# Plano: Corrigir Exibição do Nome na Lista de Alunos

## Problema Identificado

Na lista de alunos do admin, aparece apenas a **inicial do nome** (ex: "A") ao lado do avatar, em vez do nome completo (ex: "Ana Beatriz Barbosa Ferreira").

## Causa Raiz

O layout CSS está causando o problema:

```html
<div className="flex-1 min-w-0 flex items-center">
  <span className="truncate">{nome}</span>              <!-- Encolhe demais! -->
  <span className="flex-shrink-0">{segmento + série}</span>  <!-- Não encolhe -->
</div>
```

O segundo span com `flex-shrink-0` (ex: "infantil · Grupo IV A") ocupa todo o espaço disponível, forçando o span do nome a ter largura quase zero, exibindo apenas 1 letra devido ao `truncate`.

## Solução

Reorganizar o layout para que o **nome tenha prioridade** e o segmento possa encolher/truncar se necessário:

### Opção Escolhida

Colocar o nome como prioridade com largura mínima garantida, e permitir que o segmento seja truncado:

```tsx
{/* Nome + Segmento + Série/Turma inline */}
<div className="flex-1 min-w-0 flex items-center gap-2">
  <span className="text-white text-sm font-medium truncate min-w-[80px] max-w-[60%]">
    {aluno.full_name || `${aluno.nome} ${aluno.sobrenome}`}
  </span>
  <span className="text-white/40 text-xs truncate">
    {aluno.segmento && `${aluno.segmento} · `}{aluno.serie?.replace(' ano', '')} {aluno.turma}
  </span>
</div>
```

### Mudanças

1. **Nome**: Adicionar `min-w-[80px]` para garantir pelo menos 80px de largura
2. **Nome**: Adicionar `max-w-[60%]` para não ocupar tudo
3. **Segmento**: Remover `flex-shrink-0` e adicionar `truncate` para permitir encolher
4. **Container**: Adicionar `gap-2` para espaçamento consistente

## Arquivo a Modificar

- `src/pages/admin/PessoasPage.tsx` (linhas 369-375)

## Resultado Esperado

| Antes | Depois |
|-------|--------|
| Avatar + **A** + infantil · Grupo IV A | Avatar + **Ana Beatriz** + infantil · Grupo IV A |
