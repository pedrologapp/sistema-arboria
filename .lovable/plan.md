

## Plano: Corrigir busca de fases na aba Missões do aluno

### Diagnóstico

Dois problemas na query de `MissoesPage.tsx`:

**Problema 1 — `ano_letivo_atual` desatualizado:** A tabela `institution_settings` tem `ano_letivo_atual = 2025`, mas as fases estão cadastradas com `ano_letivo = 2026`. A query filtra `.eq('ano_letivo', 2025)` e não encontra nada.

**Problema 2 — Filtro de série exclui fases sem série:** As 8 fases do fundamental2 para 2026 estão assim:
- Fase 1 (Intrapessoal): `serie = 6`, `serie = 7`, `serie = 8`, `serie = 9` (uma linha por série)
- Fases 2-8: `serie = NULL` (compartilhadas entre todas as séries)

A query atual usa `.eq('serie', 6)` que exclui as 7 fases com `serie = NULL`. Precisa usar `.or('serie.eq.6,serie.is.null')`.

### Alteração: `src/pages/aluno/MissoesPage.tsx`

Na função `fetchData` (linhas 70-92):

1. **Ano letivo**: Usar `new Date().getFullYear()` como fallback principal em vez de confiar no `ano_letivo_atual` da settings (que está desatualizado). Melhor ainda: buscar ambos os anos ou simplesmente não filtrar por ano e deixar as datas determinarem o status.

2. **Filtro de série**: Trocar `.eq('serie', serieNum)` por `.or(`serie.eq.${serieNum},serie.is.null`)` para incluir fases genéricas (sem série definida) junto com as específicas da série do aluno.

3. **Deduplicação**: Como pode haver uma fase com `serie=6` E outra com `serie=null` para o mesmo `numero_fase`, agrupar por `numero_fase` e dar preferência à fase com série específica.

### Arquivo alterado

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/aluno/MissoesPage.tsx` | Corrigir filtro de ano_letivo e serie na query de fases |

