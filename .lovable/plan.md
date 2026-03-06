

## Plano: Reformular Missões (Criação + Visualização)

### 1. Migração SQL

Adicionar à tabela `missoes`:
- `lente_especial` text nullable
- `itens` jsonb nullable (array de `{nome, descricao}`)

Adicionar à tabela `entregas`:
- `respostas_itens` jsonb nullable (array de `{item_index, resposta}`)
- `reflexao_resposta` text nullable

**Mapeamento com campos existentes** (sem renomear colunas):
- `contexto` (já existe) → campo CONTEXTO
- `instrucoes` (já existe) → campo INSTRUÇÃO DA MISSÃO
- `reflexao` (já existe) → campo REFLEXÃO FINAL
- `descricao` → mantida para backward compat (missões antigas que usavam descricao como contexto continuam funcionando)
- `dicas` → removida do formulário novo, mas campo permanece no banco

### 2. Reformular `src/pages/professor/NovaMissaoPage.tsx`

Seção "Conteúdo da Missão" reestruturada:

1. **Título** * — manter, atualizar placeholder
2. **Contexto** * — usar campo `contexto` (em vez de `descricao`), novo placeholder e dica
3. **Lente Especial** — novo, campo de texto curto
4. **Instrução da Missão** * — usar campo `instrucoes`, novo placeholder
5. **Itens para Registrar** — novo, lista dinâmica com botão "+ Adicionar item". Cada item tem `nome` (input) + `descricao` (textarea curta). Botão remover por item. Armazenado como JSONB.
6. **Reflexão Final** — usar campo `reflexao`, novo placeholder
7. **PDF** — manter
8. **Pontuação + Prazo** — manter (já existem)

Atualizar preview modal e `salvarMissao()` para os novos campos.

### 3. Reformular `src/pages/aluno/MissaoDetalhePage.tsx`

Reestruturar a visualização em cards separados:

1. **Header** — cor da casa, pontos, prazo
2. **Card Título** — título grande com emoji
3. **Card CONTEXTO** — fundo sutil, ícone 📖
4. **Card LENTE ESPECIAL** — ícone 🔍, texto itálico (só se preenchido)
5. **Card SUA MISSÃO** — ícone 🎯, instrução em destaque (só se preenchido)
6. **Card O QUE REGISTRAR** — ícone 📝, itens numerados com campo de resposta individual cada (só se há itens)
7. **Card REFLEXÃO FINAL** — ícone 💭, fundo diferenciado, textarea grande (só se preenchido)
8. **Botão Enviar** — fixo no bottom, cor da casa

Formulário de entrega: em vez de um único textarea, coletar `respostas_itens` (uma resposta por item) + `reflexao_resposta` + manter textarea geral e upload de arquivos existentes.

Backward compat: missões antigas sem os novos campos mostram layout simplificado (Título + Descrição/Contexto + Instruções).

Buscar novos campos na query: `lente_especial`, `itens`, `reflexao`, `contexto`.

### 4. Atualizar `src/pages/professor/AvaliarEntregaPage.tsx`

Mostrar `respostas_itens` e `reflexao_resposta` na tela de avaliação (se existirem), para o professor ver cada resposta do aluno organizada por item.

### Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| Migração SQL | `lente_especial`, `itens` em missoes; `respostas_itens`, `reflexao_resposta` em entregas |
| `src/pages/professor/NovaMissaoPage.tsx` | Reformular seção de conteúdo com novos campos |
| `src/pages/aluno/MissaoDetalhePage.tsx` | Reformular visualização em cards + formulário por item |
| `src/pages/professor/AvaliarEntregaPage.tsx` | Mostrar respostas por item na avaliação |

