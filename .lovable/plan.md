

## Plano: Histórico de Observações na tela da Turma (CirculoTurmaDirectPage)

### O que será feito

Adicionar ao `CirculoTurmaDirectPage.tsx` (tela que a professora do Infantil/F1 vê ao clicar em uma turma):
1. **Botões S1/S2/S3/S4** abaixo do grid de alunos, sincronizados com a fase atual via `calcularSemanaAtualDaFase`
2. **Seção "Histórico de Observações"** filtrada pela semana selecionada
3. **Seção "Ainda não observados"** listando alunos sem observação na semana

### Arquivos a criar/editar

**1. Novo componente: `src/components/professor/circulo/HistoricoObservacoesTurma.tsx`**

Componente que recebe `turmaId`, `faseId`, `semanaSelecionada`, `dataInicioFase` e `alunos[]` como props.

- Query na tabela `observacoes` filtrando por `turma_id`, `fase_id` e calculando a semana da observação com base em `data_observacao` vs `data_inicio` da fase
- Join com `sinais` (via `sinal_id`) para obter emoji e label
- Join com `profiles` (via `aluno_id`) para nome do aluno
- Exibe lista cronológica: emoji + label do sinal, nome do aluno, data, flag cross-IM, e texto da observação (`observacao_texto`) em fonte menor se presente
- Seção "Ainda não observados": compara lista de alunos da turma com alunos que têm observação na semana, mostra os faltantes com fundo diferenciado
- Estado vazio: "Nenhuma observação registrada nesta semana ainda."

**2. Editar: `src/pages/professor/circulo/CirculoTurmaDirectPage.tsx`**

- Importar `useProfessor` para acessar `faseAtual` (já importado)
- Adicionar estado `semanaSelecionada` inicializado com `faseAtual.semana_atual`
- Renderizar botões S1-S4 após o grid de alunos:
  - Semana atual: destacada (cor accent)
  - Semanas passadas: clicáveis (estilo mais sutil)
  - Semanas futuras: desabilitadas (opacity reduzida)
  - Botão "Todas": para ver observações de todas as semanas
- Renderizar `<HistoricoObservacoesTurma>` abaixo dos botões

### Query de observações (lógica)

```sql
SELECT o.*, s.emoji, s.label_pt, s.valencia, p.full_name, p.nome, p.sobrenome
FROM observacoes o
JOIN sinais s ON s.id = o.sinal_id
JOIN profiles p ON p.id = o.aluno_id
WHERE o.turma_id = :turmaId
  AND o.fase_id = :faseId
ORDER BY o.created_at DESC
```

Filtragem de semana feita no frontend: calcular em qual semana cai cada `data_observacao` comparando com `data_inicio` da fase (mesma lógica de `calcularSemanaAtualDaFase` mas aplicada a cada observação).

### Detecção cross-IM

O campo `foi_cross_im` (boolean) na tabela `observacoes` já indica se a observação foi cross-IM. Exibir badge "Cross-IM" quando `true`.

