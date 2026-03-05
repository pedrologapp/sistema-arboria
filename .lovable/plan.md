

## Plano: Corrigir Missões (filtrar por série) + Corrigir Cargos na Casa

### Diagnóstico

**Missões**: A query atual busca fases sem filtrar por `serie` do aluno. Como a tabela `fases` tem uma fase por série (6, 7, 8, 9), o aluno pode ver apenas 1 fase (ou fases de outras séries). Precisa filtrar por `profile.serie` (extraindo o número) para mostrar as 8 fases corretas da série do aluno.

**Casa**: O código já separa por cargo (líder, coordenador, embaixador, membro) — linhas 286-349. O problema é que o `ano_letivo` está **hardcoded como 2025** (linha 90), mas estamos em 2026. Os cargos não carregam, então todos aparecem como "membro".

---

### Alteração 1: `src/pages/aluno/MissoesPage.tsx`

**Problema**: Query em linhas 85-89 não filtra por `serie`.

**Solução**:
- Extrair número da série do `profile.serie` (ex: `"6º ano"` → `6`)
- Adicionar `.eq('serie', serieNum)` na query de fases
- Adicionar também `segmento` se disponível no profile
- Isso garante que o aluno do 6º veja as 8 fases do 6º, não de outras séries

Também incluir `data_inicio` e `data_fim` na query de fases para determinar status por datas (como pedido: `data_fim < hoje` = passada, `data_inicio > hoje` = futura) em vez de depender apenas do campo `ativo`.

### Alteração 2: `src/pages/aluno/CasaPage.tsx`

**Problema**: Linha 90 tem `.eq('ano_letivo', 2025)` hardcoded.

**Solução**: Usar `new Date().getFullYear()` ou buscar `ano_letivo_atual` do `institution_settings`. Para simplicidade, usar o ano atual dinamicamente.

Também adicionar fallback visual quando não há líder: "Nenhum líder eleito ainda".

---

### Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/aluno/MissoesPage.tsx` | Filtrar fases por série do aluno; usar datas para status |
| `src/pages/aluno/CasaPage.tsx` | Corrigir ano_letivo hardcoded; fallback sem líder |

