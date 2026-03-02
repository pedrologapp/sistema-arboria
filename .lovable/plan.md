

# Adicionar Mapa ao painel F2 do Professor

## Resumo
Adicionar o "Mapa de Desenvolvimento" à navegação do professor Fundamental 2, com fluxo de seleção Série → Turma antes de exibir o mapa. A nav passa de 5 para 6 itens: **Home - Missões - Avaliar - Observar - Mapa - Alunos**.

## Alterações

### 1. Renomear "Círculo" para "Observar" no nav F2
No `ProfessorBottomNav.tsx`, trocar o label do item `circulo` de "Círculo" para "Observar" (alinhando com o padrão do infantil/F1).

### 2. Adicionar item "Mapa" na nav F2
No `ProfessorBottomNav.tsx`, inserir o item Mapa entre Observar e Alunos:
```
Home - Missões - Avaliar - Observar - Mapa - Alunos
```
Com ícone `LayoutGrid` e path `/professor/mapa`. Atualizar `getActiveIndex` para incluir o novo índice.

### 3. Adaptar `MapaDesenvolvimentoPage` para F2
Atualmente a página usa `turmasVinculadas` do `ProfessorContext` (que funciona para infantil/F1). Para F2, o professor é mentor de casa, não vinculado a turmas via `professor_turma`. O fluxo precisa:

- Detectar se é F2 (sem `turmasVinculadas` ou via `segmento`)
- Se F2: mostrar seletor de **Série** (6º ao 9º), depois **Turma** (buscar turmas da série), e então exibir o mapa com alunos daquela turma filtrados pela casa do mentor
- Se infantil/F1: manter comportamento atual (turmas vinculadas direto)

A busca de alunos para F2 filtrará por `turma_id` + `casa_id` do mentor (alunos da casa do professor naquela turma).

### 4. Reduzir tamanho dos ícones/labels para 6 itens
Com 6 itens na nav, reduzir o `size` dos ícones de 20 para 18 e o padding para que caibam confortavelmente.

## Arquivos a editar
- `src/components/professor/ProfessorBottomNav.tsx` — adicionar Mapa, renomear Círculo→Observar, ajustar layout 6 itens
- `src/pages/professor/MapaDesenvolvimentoPage.tsx` — adicionar lógica de seleção Série→Turma para F2

