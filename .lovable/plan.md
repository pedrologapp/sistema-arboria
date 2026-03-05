

## Plano: Adicionar opção "Sem casa" no filtro de Casa (Admin)

### Alteração

**Arquivo**: `src/pages/admin/PessoasPage.tsx`

1. **Filtro select (linhas 368-372)**: Adicionar uma opção `<option value="sem_casa">Sem designação</option>` após a opção padrão "Casa" e antes das casas existentes.

2. **Lógica de filtragem (linha 250)**: Ajustar `matchCasa` para tratar o valor `"sem_casa"` verificando `aluno.casa_id === null`, mantendo o comportamento atual para IDs numéricos.

