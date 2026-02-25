

# Reestruturar Modal de Conteudo com Divisao por Serie (6o ao 9o ano)

## Problema Atual

O `ConteudoModal` que abre ao clicar em "Conteudo" no Home do professor mostra materiais hardcoded (semanas 1-4 com URLs estaticas). Nao busca dados reais do banco (`fase_conteudos`) e nao divide por serie.

## Solucao

Reescrever o `ConteudoModal` para:
1. Mostrar as 4 series (6o, 7o, 8o, 9o ano) como cards clicaveis
2. Ao clicar numa serie, expandir (accordion) mostrando o conteudo real do banco: Conteudo Geral (semana 0) + Semanas 1-4
3. Buscar dados da tabela `fase_conteudos` via join com `fases` para a fase ativa do professor

## Estrutura Visual do Modal

```text
┌──────────────────────────────┐
│ 📖 Conteúdo                  │
│ Materiais da fase atual      │
├──────────────────────────────┤
│                              │
│ ┌─ Essência do Arboria ────┐ │
│ │  (manter como está)      │ │
│ └──────────────────────────┘ │
│                              │
│ MATERIAIS POR SÉRIE          │
│                              │
│ ┌──────────────────────────┐ │
│ │ 📘 6º ano            ▼  │ │
│ ├──────────────────────────┤ │
│ │  📄 Conteúdo Geral       │ │
│ │  📄 Semana 1             │ │
│ │  📄 Semana 2             │ │
│ └──────────────────────────┘ │
│                              │
│ ┌──────────────────────────┐ │
│ │ 📗 7º ano            ▶  │ │
│ └──────────────────────────┘ │
│                              │
│ ┌──────────────────────────┐ │
│ │ 📙 8º ano            ▶  │ │
│ └──────────────────────────┘ │
│                              │
│ ┌──────────────────────────┐ │
│ │ 📕 9º ano            ▶  │ │
│ └──────────────────────────┘ │
│                              │
├──────────────────────────────┤
│         [ Fechar ]           │
└──────────────────────────────┘
```

## Alteracoes Tecnicas

### Arquivo: `src/components/professor/ConteudoModal.tsx`

1. **Adicionar dependencias**: `useState`, `useQuery`, `supabase`, `useAuth`, `Loader2`, `ChevronDown`, `Download`
2. **Buscar fase ativa**: Query na tabela `fases` onde `ativo = true` e `institution_id` do professor
3. **Buscar conteudos por serie**: Para cada serie (6-9), query em `fase_conteudos` via join com `fases` (filtrando pela inteligencia da fase ativa e pela serie)
4. **State de serie expandida**: `serieAberta` para controlar qual accordion esta aberto
5. **Remover materiais hardcoded**: Substituir pela lista real vinda do banco
6. **Manter secao "Essencia do Arboria"** intacta
7. **Cada item de conteudo**: Ao clicar, abre o PDF em nova aba (usando `arquivo_url`)

### Props do modal (sem alteracao)

A interface `ConteudoModalProps` permanece igual. A `faseAtual` ja traz a inteligencia necessaria para filtrar os conteudos.

### Logica de busca

```typescript
// Buscar fase ativa para obter inteligencia_id
// Depois buscar fase_conteudos onde:
//   fase.inteligencia_id = faseAtual.inteligencia.id
//   fase.serie IN (6, 7, 8, 9)
//   fase.segmento = 'fundamental2'
// Agrupando resultados por serie
```

### Nenhuma alteracao nos dashboards

`ProfessorDashboard.tsx` e `ProfessorDashboardSimplificado.tsx` continuam chamando `ConteudoModal` da mesma forma.

