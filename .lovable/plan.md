

## Melhorar seletor Série/Turma no F2 para mobile

**Problema**: Os dois `<Select>` lado a lado (Série + Turma) usam dropdowns nativos do Radix que não são ideais em telas pequenas — os menus podem ficar apertados e difíceis de tocar.

**Solução**: Trocar os dois selects por **botões pill/toggle inline** (como os botões de semana S1-S4 já existentes na página), que são muito mais amigáveis no celular.

### Layout proposto

```text
Série:   [6º] [7º] [8º] [9º]       ← pills horizontais
Turma:   [6ºA] [6ºB] [6ºC]         ← pills horizontais (aparece após escolher série)
```

### Alteração em `MapaDesenvolvimentoPage.tsx`

Substituir o bloco de seletores F2 (linhas 347-371) por:

1. **Série** — Uma row de botões `rounded-full` com estilo igual aos botões de semana. O selecionado fica com `bg-primary text-primary-foreground`, os demais `bg-white/10 text-white/60`.

2. **Turma** — Aparece abaixo apenas quando há série selecionada e turmas disponíveis. Mesma estética de pills, usando `turma_letra` ou `nome` como label. Se só houver 1 turma, auto-seleciona.

Nenhum outro arquivo precisa mudar — apenas o JSX dos seletores F2 nesta página.

