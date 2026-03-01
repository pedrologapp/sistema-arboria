

# Diagnóstico: "Nenhuma fase ativa" para Professora Auriete

## Problema Raiz

Incompatibilidade de tipo entre `turmas.serie` (TEXT: `"Grupo V"`) e `fases.serie` (SMALLINT: `5`).

No `ProfessorContext.tsx`, o fluxo para professores do segmento infantil/fundamental1 é:
1. Busca a série da turma vinculada → obtém `"Grupo V"` (texto)
2. Tenta usar esse valor para filtrar `fases` com `.eq('serie', serieDosProfessor)` → compara `"Grupo V"` com `5` → **nenhum resultado**
3. Resultado: `faseAtual = null` → dashboard mostra "Nenhuma fase ativa"

## Detalhes Técnicos

- `turmas.serie` é `TEXT` (ex: `"Grupo V"`, `"Maternal II"`, `"1º Ano"`)
- `fases.serie` é `SMALLINT` (ex: `5`, `2`, `1`)
- O código em `ProfessorContext.tsx` (linha 157-169) trata `turma.serie` como `number`, mas o valor real é texto
- Precisa de uma função de conversão que extraia o número de strings como `"Grupo V"` → `5`, `"Maternal II"` → `2`, `"1º Ano"` → `1`

## Solução

### 1. Corrigir `ProfessorContext.tsx` — converter serie texto para número

Adicionar uma função helper que converta nomes de série para o número correspondente (usando a mesma lógica que já existe em outros lugares do sistema, como `get_missoes_do_aluno`). Depois, usar esse número para filtrar as fases.

Lógica de conversão:
- `"Grupo V"` → extrair algarismo romano ou número → `5`
- `"Maternal II"` → `2`
- `"1º Ano"` → `1`
- Fallback: tentar extrair qualquer dígito da string

### 2. Segundo problema: falta de atualização em tempo real

Quando o admin ativa uma fase, o professor só vê a mudança se recarregar a página, pois `ProfessorContext` só busca dados uma vez (no mount). 

Solução: adicionar um listener de realtime na tabela `fases` para que mudanças (ativação/desativação) disparem um `refreshData()` automaticamente no contexto do professor.

### Arquivos a editar
- `src/contexts/ProfessorContext.tsx` (converter serie texto→número + adicionar realtime listener)

