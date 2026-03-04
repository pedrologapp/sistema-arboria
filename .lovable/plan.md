

## Correção: Alunos do Maternal III A não aparecem

### Causa raiz

A aluna Ruamma Nicole (perfil `cfd66763`) tem `institution_id = NULL`. Quando a professora consulta os alunos via `aluno_turma`, o RLS bloqueia esse perfil, retornando `null`. O código no `.map()` (linha 150) acessa `at.profiles.nome` sem verificar se `at.profiles` é `null` — isso causa um erro JavaScript que **derruba toda a lista**, impedindo que os 8 alunos válidos sejam exibidos.

A turma B funciona porque nenhum aluno dela tem esse problema.

Há também uma matrícula duplicada da mesma aluna (dois registros ativos na `aluno_turma` para a mesma turma).

### Correções

**1. Migração SQL** — corrigir dados:
- Atualizar `institution_id` do perfil `cfd66763` para `902876e9-b263-4c01-9013-aeef7b6d24e1`
- Desativar a matrícula duplicada do perfil `cfd66763` na turma Maternal III A (manter apenas o perfil `0bfb28c5` que já tem institution_id correto)

**2. Código defensivo** em `MapaDesenvolvimentoPage.tsx` (linha ~149):
- Adicionar verificação de null no `at.profiles` dentro do `.map()`, retornando `null` quando o perfil não é acessível pelo RLS, para que o `.filter(Boolean)` existente o remova sem derrubar a consulta inteira

### Arquivo alterado
- `src/pages/professor/MapaDesenvolvimentoPage.tsx` — null check no map de alunos
- Migração SQL — corrigir institution_id e matrícula duplicada

