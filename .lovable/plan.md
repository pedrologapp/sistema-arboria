

# Corrigir Turmas do Infantil + Coordenadores por Turma

## Diagnóstico

1. **`turmas.serie` é `smallint`** — impossível armazenar "Grupo IV", "Maternal(3)" etc. Por isso as turmas do infantil nunca foram inseridas.
2. **Profiles do infantil** usam serie como texto: `Maternalzinho(2)`, `Maternal(3)`, `Grupo IV`, `Grupo V`.
3. **CasasPage** mostra coordenadores por série, não por turma A/B.

## Alterações

### 1. Migração: mudar `turmas.serie` de `smallint` para `text`

- `ALTER TABLE turmas ALTER COLUMN serie TYPE text USING serie::text;`
- Valores existentes do fundamental (1, 2, ..., 9) ficam como texto "1", "2", ..., "9" — sem impacto funcional.

### 2. Inserir turmas do infantil (via insert tool)

8 registros com serie correspondendo ao que está em `profiles.serie`:

| nome | serie | turma_letra | segmento |
|---|---|---|---|
| Maternalzinho A | Maternalzinho(2) | A | infantil |
| Maternalzinho B | Maternalzinho(2) | B | infantil |
| Maternal III A | Maternal(3) | A | infantil |
| Maternal III B | Maternal(3) | B | infantil |
| Grupo IV A | Grupo IV | A | infantil |
| Grupo IV B | Grupo IV | B | infantil |
| Grupo V A | Grupo V | A | infantil |
| Grupo V B | Grupo V | B | infantil |

### 3. Atualizar função `ensure_turma_exists`

- Parar de extrair número da serie — receber e comparar como texto
- Adicionar parâmetro `p_segmento` para diferenciar infantil de fundamental1
- Ajustar a query de busca: `WHERE serie = p_serie AND segmento = p_segmento`

### 4. Atualizar função `sync_profile_to_aluno_turma`

- Passar `profiles.serie` diretamente (texto) em vez de extrair número
- Passar `profiles.segmento` para a função `ensure_turma_exists`

### 5. Atualizar `TabelaVisaoGeralProfessores.tsx`

- Remover `SERIES_POR_SEGMENTO` (não é mais necessário — filtragem já usa `turma.segmento`)
- A tabela já exibe `turma.nome` — funcionará automaticamente com as turmas inseridas

### 6. Atualizar `CasasPage.tsx` — coordenadores por turma A/B

- Na seção de cargos, iterar por série **E** turma
- Cada linha mostra: `6º A ⭐ Coordenador | 6º B ⭐ Coordenador`
- Buscar turma do aluno junto com o cargo (via `profiles.turma`)

