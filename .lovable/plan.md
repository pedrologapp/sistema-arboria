

# Plano: Ajustar nomes dos alunos e posição do botão Salvar

## Mudanças

### 1. Nome + Primeira letra do sobrenome nos chips

**Onde**: Query de alunos (linha 58) e mapeamento (linhas 62-69)

- Alterar o select para incluir `sobrenome` do profiles
- No mapeamento, gerar `nome` como "Nome S." (primeiro nome + inicial do sobrenome com ponto)
- Adicionar campo `nomeCompleto` ao `AlunoSimples` para o long-press

### 2. Long press mostra nome completo

**Onde**: Componente `AlunoChip` (linhas 196-213)

- Adicionar `title={aluno.nomeCompleto}` no botão (tooltip nativo em desktop)
- Implementar long-press com state + `onTouchStart`/`onTouchEnd` com timeout de ~500ms
- Ao segurar, mostrar um pequeno tooltip/toast temporário com o nome completo

### 3. Botão Salvar inline (não fixo)

**Onde**: Botão Salvar (linhas 378-396)

- Remover `fixed bottom-20 left-0 right-0` e `z-40`
- Tornar o botão um elemento normal no fluxo da página, logo abaixo da seção de alunos não posicionados
- Remover o `pb-36` extra do container principal (reduzir para `pb-24` para o bottom nav)

