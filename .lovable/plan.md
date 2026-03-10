

## Plano: Tornar anexo opcional e texto obrigatório na entrega de missão

### Arquivo: `src/pages/aluno/MissaoDetalhePage.tsx`

**1. Validação (linhas 482-495)** — Alterar a função `validar()`:
- Remover a regra "pelo menos texto OU arquivo" (linha 486-488)
- Remover a regra `requer_arquivo` (linhas 490-492)
- Adicionar: texto obrigatório — `if (!textoResposta.trim()) erros.push('Escreva sua resposta antes de enviar')`

**2. Botão de enviar (linha 1186-1187)** — Adicionar `disabled` quando texto vazio:
- `disabled={enviando || !textoResposta.trim()}`

**3. Label do textarea (linha 1151)** — Trocar de "Comentário (opcional)" para "Sua resposta *" (indicando obrigatório)

**4. Instrução (linha 1065-1067)** — Atualizar texto para: "Escreva sua resposta. Você também pode anexar fotos ou arquivos."

