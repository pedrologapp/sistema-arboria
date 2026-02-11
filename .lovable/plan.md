

# Plano: Adicionar Camada de Séries nas Fases do Admin

## Resumo

Atualmente, ao clicar num segmento (Infantil, Fund.1, Fund.2), as 8 fases aparecem diretamente. A mudança adiciona uma **camada intermediária de séries**: o admin primeiro escolhe a série, depois vê as 8 fases daquela série.

**Fluxo novo:**
```text
Segmento (aba) --> Grid de Séries --> 8 Fases da série selecionada
```

## Séries por Segmento

| Segmento | Séries |
|----------|--------|
| Infantil | Maternal II, Maternal III, Grupo IV, Grupo V |
| Fundamental 1 | 1 ANO, 2 ANO, 3 ANO, 4 ANO, 5 ANO |
| Fundamental 2 | 6 ANO, 7 ANO, 8 ANO, 9 ANO |

---

## Alterações Necessarias

### 1. Banco de Dados - Adicionar coluna `serie` na tabela `fases`

```sql
ALTER TABLE public.fases ADD COLUMN serie smallint;
```

A coluna sera nullable inicialmente para nao quebrar as 8 fases existentes do fundamental2 (que ficam sem serie ate serem reorganizadas).

### 2. Atualizar FasesPage.tsx - Tela de listagem

**Comportamento novo:**

Ao selecionar um segmento, em vez de mostrar as 8 fases diretamente, mostra um **grid de cards com as series** daquele segmento.

Ao clicar numa serie, mostra as 8 fases filtradas por `segmento + serie`.

Adicionar estado `serieSelecionada` e logica de navegacao entre series e fases:

```typescript
const [serieSelecionada, setSerieSelecionada] = useState<number | null>(null);
```

**Mapa de series:**
```typescript
const SERIES_POR_SEGMENTO: Record<Segmento, { numero: number; label: string }[]> = {
  infantil: [
    { numero: 2, label: 'Maternal II' },
    { numero: 3, label: 'Maternal III' },
    { numero: 4, label: 'Grupo IV' },
    { numero: 5, label: 'Grupo V' },
  ],
  fundamental1: [
    { numero: 1, label: '1 ANO' },
    { numero: 2, label: '2 ANO' },
    { numero: 3, label: '3 ANO' },
    { numero: 4, label: '4 ANO' },
    { numero: 5, label: '5 ANO' },
  ],
  fundamental2: [
    { numero: 6, label: '6 ANO' },
    { numero: 7, label: '7 ANO' },
    { numero: 8, label: '8 ANO' },
    { numero: 9, label: '9 ANO' },
  ],
};
```

**Quando nenhuma serie esta selecionada**, renderizar grid de cards das series:

```text
+------------------+------------------+
|   Maternal II    |   Maternal III   |
|   (X fases)      |   (X fases)      |
+------------------+------------------+
|    Grupo IV      |    Grupo V       |
|   (X fases)      |   (X fases)      |
+------------------+------------------+
```

Cada card mostra:
- Nome da serie
- Quantas fases estao configuradas (ex: "3 de 8 fases")
- Indicador se tem fase ativa

**Quando uma serie e selecionada**, mostrar as 8 fases (como funciona hoje) com um botao "Voltar" para retornar a lista de series.

A funcao `gerarFasesSegmento` passa a receber tambem o parametro `serie` e filtrar por `f.segmento === segmento && f.serie === serie`.

### 3. Atualizar FaseNovaPage.tsx - Criacao de fase

- Receber `serie` no `LocationState` alem de `segmento`
- Incluir `serie` no INSERT da fase
- Exibir a serie no header da pagina

### 4. Atualizar FaseDetalhesPage.tsx - Detalhes da fase

- O botao "Voltar" deve considerar a serie na navegacao
- A query de "fase ativa" deve filtrar por segmento E serie (cada serie tem sua propria fase ativa)

### 5. Visibilidade do Professor

O professor so vera o conteudo das fases da serie da turma vinculada. Isso ja funciona parcialmente pelo filtro de `serie` nas missoes/conteudo. Com a nova coluna `serie` na tabela `fases`, as queries do professor precisam ser ajustadas:

- No `ProfessorContext.tsx`: a busca da fase ativa precisa considerar a serie do professor (baseada nas turmas vinculadas)
- O conteudo pedagogico ja filtra por serie, entao continuara funcionando

### 6. Resetar `serieSelecionada` ao trocar de segmento

Quando o usuario trocar a aba de segmento, a serie selecionada deve ser resetada para `null`, voltando ao grid de series.

---

## Detalhes Tecnicos

### Migracao SQL

```sql
-- Adicionar coluna serie na tabela fases
ALTER TABLE public.fases ADD COLUMN serie smallint;

-- Atualizar fases existentes do fundamental2 (assumir que sao para todas as series)
-- O admin tera que reconfigurar manualmente as fases por serie
```

### Mudanca na Constraint de Unicidade

Atualmente, a combinacao unica pode ser `(institution_id, inteligencia_id, ano_letivo, segmento)`. Com a serie, passa a ser `(institution_id, inteligencia_id, ano_letivo, segmento, serie)`.

### Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| Migracao SQL | Adicionar coluna `serie` na tabela `fases` |
| `src/pages/admin/FasesPage.tsx` | Adicionar grid de series, estado `serieSelecionada`, filtrar fases por serie |
| `src/pages/admin/FaseNovaPage.tsx` | Receber e salvar `serie` |
| `src/pages/admin/FaseDetalhesPage.tsx` | Ajustar navegacao e filtro de fase ativa por serie |

### Impacto no Professor

A busca de fase ativa do professor (em `ProfessorContext.tsx`) precisara considerar a serie das turmas vinculadas para mostrar a fase correta. Isso sera tratado apos a estrutura base estar funcionando.

