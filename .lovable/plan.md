
# Correção: Tabela de Visão Geral não Atualiza

## Problema Identificado

A query no componente `TabelaVisaoGeralProfessores.tsx` está falhando com erro 400 porque tenta fazer um JOIN inválido:

```typescript
// ❌ Erro: não existe relação direta professor_turma → profiles
.select(`
  turma_id,
  professor_id,
  profiles:professor_id (full_name)  // <- FALHA AQUI
`)
```

O erro retornado:
> "Could not find a relationship between 'professor_turma' and 'professor_id' in the schema cache"

Isso acontece porque `professor_turma.professor_id` referencia `auth.users(id)`, não `profiles(id)`.

## Solução

Dividir a busca em duas queries separadas:
1. Buscar os vínculos `professor_turma`
2. Buscar os nomes dos professores da tabela `profiles` usando os IDs

## Arquivo Modificado

**`src/components/admin/TabelaVisaoGeralProfessores.tsx`**

### Mudança na Query de Turmas (linhas 31-65)

```typescript
// ANTES (falha):
const { data: vinculos } = await supabase
  .from('professor_turma')
  .select(`turma_id, professor_id, profiles:professor_id (full_name)`)
  ...

// DEPOIS (funciona):
// 1. Buscar vínculos
const { data: vinculos } = await supabase
  .from('professor_turma')
  .select('professor_id, turma_id')
  .eq('institution_id', institutionId)
  .eq('ativo', true);

// 2. Buscar nomes dos professores
const professorIds = [...new Set(vinculos?.map(v => v.professor_id) || [])];
const { data: professores } = await supabase
  .from('profiles')
  .select('id, full_name')
  .in('id', professorIds);

// 3. Mapear nomes
const professorMap = new Map(professores?.map(p => [p.id, p.full_name]) || []);

const turmasComProfessor = turmas?.map(turma => {
  const vinculo = vinculos?.find(v => v.turma_id === turma.id);
  return {
    ...turma,
    professor_id: vinculo?.professor_id || null,
    professor_nome: vinculo ? professorMap.get(vinculo.professor_id) || null : null
  };
}) || [];
```

### Mudança na Query de Casas (linhas 69-103)

Aplicar a mesma correção para `professor_casa`:

```typescript
// 1. Buscar mentores
const { data: mentores } = await supabase
  .from('professor_casa')
  .select('casa_id, professor_id, eh_mentor_principal')
  .eq('institution_id', institutionId)
  .eq('ativo', true);

// 2. Buscar nomes
const mentorIds = [...new Set(mentores?.map(m => m.professor_id) || [])];
const { data: mentoresProfiles } = await supabase
  .from('profiles')
  .select('id, full_name')
  .in('id', mentorIds);

// 3. Mapear
const mentorMap = new Map(mentoresProfiles?.map(p => [p.id, p.full_name]) || []);
```

## Resultado

Após a correção:
- A tabela de visão geral carregará corretamente os vínculos
- Os nomes dos professores aparecerão nas turmas atribuídas
- A atualização será refletida imediatamente após atribuir um professor

## Fluxo Corrigido

```text
1. Admin atribui professora ao 5º Ano A e B
2. Dados são salvos em professor_turma ✓
3. Tabela busca vínculos (sem JOIN) ✓
4. Busca nomes dos professores separadamente ✓
5. Exibe: "5º Ano A - Professora X - ✓ Atribuído"
```
