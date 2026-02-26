

# Associar Conteúdos do Professor à Sua Casa Mentor

## Problema

O `ConteudoModal` atualmente busca conteúdos baseado na inteligência da **fase ativa** (`faseAtual.inteligencia.id`). Isso significa que se a fase ativa é "Linguística", todos os professores veem conteúdos de Linguística — mesmo o professor mentor da Intrapessoal.

O correto é: cada professor deve ver apenas os PDFs da **sua casa mentor**. O professor da Intrapessoal deve ver os conteúdos da Intrapessoal.

## Solução

Alterar o `ConteudoModal` para usar a inteligência da **casa do professor** (`casaMentor.id`) em vez da inteligência da fase ativa.

## Alterações

### Arquivo: `src/components/professor/ConteudoModal.tsx`

1. Importar `useProfessor` do contexto
2. Dentro do componente, obter `casaMentor` via `useProfessor()`
3. Substituir `faseAtual.inteligencia.id` por `casaMentor.id` na query de fases
4. Atualizar o header do modal para mostrar o nome da casa do professor em vez da fase atual
5. Remover o filtro `ativo = true` da query de fases — o professor precisa ver os conteúdos independente de a fase estar ativa ou não, pois os PDFs são associados às fases da sua inteligência

Lógica atualizada da query:

```typescript
const { casaMentor } = useProfessor();

// Buscar fases da inteligência do professor (sua casa mentor)
const { data: fasesData } = await supabase
  .from('fases')
  .select('id, serie')
  .eq('inteligencia_id', casaMentor.id)  // ← casa do professor
  .eq('segmento', 'fundamental2')
  .in('serie', [6, 7, 8, 9]);
```

### Nenhuma alteração nos dashboards

Os arquivos `ProfessorDashboard.tsx` e `ProfessorDashboardSimplificado.tsx` continuam passando `faseAtual` normalmente. A prop `faseAtual` pode até ser removida no futuro, mas por ora o modal simplesmente ignora a inteligência dela e usa `casaMentor` internamente.

