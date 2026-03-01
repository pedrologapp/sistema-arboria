

# Revisão Completa do Painel do Professor (Infantil) — Problemas Encontrados

## Resumo dos Problemas Críticos

Encontrei **5 problemas**, sendo **3 críticos** que impedirão o uso correto do sistema.

---

## Problema 1 — CRÍTICO: Observação falha ao salvar (CirculoRegistrarPage)

**Arquivo**: `src/pages/professor/circulo/CirculoRegistrarPage.tsx` (linhas 101-160)

A página de registrar observação usa `aluno.casa_id` como `inteligencia_expressa` (NOT NULL no banco). Alunos do Infantil **não têm casa** (`casa_id = null`), então o INSERT vai falhar com erro de constraint.

Além disso, a busca da turma faz `eq('serie', aluno.serie)` passando valores como `"Grupo V"`, mas a tabela `turmas` tem `serie = "Grupo V"` — isso funciona. Porém o fallback `aluno.serie || '6'` é incorreto para Infantil.

**Solução**: Para Infantil, usar `inteligencia_fase` como valor de `inteligencia_expressa` (já que não há casa). Buscar `turma_id` via `aluno_turma` em vez de tentar fazer match por texto.

---

## Problema 2 — CRÍTICO: Rota inexistente no Dashboard (link quebrado)

**Arquivo**: `src/pages/professor/ProfessorDashboardSimplificado.tsx` (linha 202)

O `AlertBoxesTurmas` navega para `/professor/aluno/${alunoId}` — mas essa rota **não existe**. A rota correta é `/professor/alunos/${alunoId}`.

**Solução**: Corrigir para `/professor/alunos/${alunoId}`.

---

## Problema 3 — CRÍTICO: Exibição errada da série no Dashboard

**Arquivo**: `src/pages/professor/ProfessorDashboardSimplificado.tsx` (linha 190)

O card de turma mostra `{turma.serie}º {turma.turma_letra}`, mas `turma.serie` é texto como `"Grupo V"`, resultando em **"Grupo Vº A"** — incorreto.

**Solução**: Exibir `{turma.nome}` ou formatar condicionalmente: se o segmento é infantil, mostrar `{turma.nome}` diretamente em vez de `{turma.serie}º {turma.turma_letra}`.

---

## Problema 4 — MENOR: CirculoTurmaDirectPage header mostra série errada

**Arquivo**: `src/pages/professor/circulo/CirculoTurmaDirectPage.tsx` (linha 94)

Similar ao problema 3: mostra `{turmaInfo.serie}º Ano {turmaInfo.turma_letra}` — para Infantil resulta em "Grupo Vº Ano A".

**Solução**: Usar `turmaInfo.nome` quando segmento é infantil.

---

## Problema 5 — MENOR: Falta Maternal 3 na lista de séries do CirculoPage

**Arquivo**: `src/pages/professor/CirculoPage.tsx` (linhas 6-10)

A constante `SERIES_POR_SEGMENTO.infantil` lista Maternal 2, Grupo IV e Grupo V — falta **Maternal 3**. Porém esse código só é usado como fallback (quando não há turmas vinculadas), então impacto é baixo.

---

## Funcionalidades que estão OK

- Login e autenticação do professor (ProfessorProtectedRoute)
- Layout simplificado (header + bottom nav)
- Navegação do bottom nav (Home, Círculo, Conteúdo, Alunos)
- Listagem de alunos (AlunosPageSimplificado) — usa `aluno_turma` corretamente
- Perfil do aluno simplificado (sem missões/casa)
- Página de configurações e logout
- Página de conteúdo
- Vinculação de dados via `aluno_turma` (92 alunos corretos)
- Fluxo Círculo → Turma → Alunos (CirculoPage → CirculoTurmaDirectPage)
- RLS policies para acesso por turma

## Plano de Correção

1. **CirculoRegistrarPage**: Adaptar para Infantil — usar `inteligencia_fase` como fallback para `inteligencia_expressa`, e buscar `turma_id` via `aluno_turma` ao invés de match por texto
2. **ProfessorDashboardSimplificado**: Corrigir rota `/professor/aluno/` → `/professor/alunos/` e corrigir exibição de série
3. **CirculoTurmaDirectPage**: Corrigir exibição de série para Infantil
4. **CirculoPage**: Adicionar Maternal 3 à lista de séries do Infantil

