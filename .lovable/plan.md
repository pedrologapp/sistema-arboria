

# Plano: Painel de Professor para Infantil e Fundamental 1 (Com Vínculo por Turmas)

## Resumo da Arquitetura

| Segmento | Vínculo | Tabela | Acesso |
|----------|---------|--------|--------|
| **Fundamental 2** | Casa (mentor) | `professor_casa` | Alunos da mesma casa |
| **Infantil / Fund. 1** | Turma(s) | `professor_turma` (NOVA) | Alunos das turmas vinculadas |

## Fase 1: Estrutura de Banco de Dados

### 1.1 Criar tabela `professor_turma`

```sql
CREATE TABLE professor_turma (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  turma_id UUID NOT NULL REFERENCES turmas(id) ON DELETE CASCADE,
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  ano_letivo SMALLINT NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  eh_regente BOOLEAN DEFAULT true,  -- professor titular da turma
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(professor_id, turma_id, ano_letivo)
);
```

### 1.2 Criar políticas RLS

```sql
-- Professor pode ver seus próprios vínculos
CREATE POLICY "Professor vê suas turmas"
  ON professor_turma FOR SELECT
  USING (professor_id = auth.uid());

-- Admin pode gerenciar todos
CREATE POLICY "Admin gerencia vínculos"
  ON professor_turma FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
```

### 1.3 Criar função helper (evitar recursão em RLS)

```sql
CREATE OR REPLACE FUNCTION get_professor_turma_ids()
RETURNS UUID[] AS $$
  SELECT ARRAY_AGG(turma_id) 
  FROM professor_turma 
  WHERE professor_id = auth.uid() AND ativo = true;
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

## Fase 2: Atualizar Edge Function de Criação de Professor

### Arquivo: `supabase/functions/create-professor/index.ts`

Adicionar parâmetro `turma_ids` (array de UUIDs) para Infantil/F1:

```typescript
// Novo parâmetro
const { 
  email, nome, sobrenome, password, 
  institution_id, segmento,
  casa_id,       // Para F2
  turma_ids,     // NOVO: Para Infantil/F1 (array de UUIDs)
  ano_letivo = 2025 
} = await req.json()

// Validação
if ((segmento === 'infantil' || segmento === 'fundamental1') && 
    (!turma_ids || turma_ids.length === 0)) {
  return error('Turmas são obrigatórias para professores de Infantil/F1')
}

// Inserção após criar usuário
if (segmento !== 'fundamental2' && turma_ids?.length > 0) {
  const turmaLinks = turma_ids.map(turma_id => ({
    professor_id: userId,
    turma_id,
    institution_id,
    ano_letivo,
    eh_regente: true,
    ativo: true
  }))
  
  await supabaseAdmin.from('professor_turma').insert(turmaLinks)
}
```

## Fase 3: Atualizar ProfessorContext

### Arquivo: `src/contexts/ProfessorContext.tsx`

Adicionar busca das turmas do professor:

```typescript
interface ProfessorContextType {
  // ... existentes
  turmasVinculadas: Turma[] | null;  // NOVO
}

// Para Infantil/F1, buscar turmas vinculadas
if (segmento !== 'fundamental2') {
  const { data: turmasData } = await supabase
    .from('professor_turma')
    .select(`
      turma_id,
      turmas!inner (
        id, nome, serie, turma_letra
      )
    `)
    .eq('professor_id', user.id)
    .eq('ativo', true)
  
  setTurmasVinculadas(turmasData?.map(t => t.turmas))
}
```

## Fase 4: Criar Componentes Simplificados

### 4.1 Layout Simplificado

**Novo arquivo:** `src/layouts/ProfessorLayoutSimplificado.tsx`

- Sem referência a casa/mentor
- Header com nome do professor e fase atual
- BottomNav com apenas 3 itens

### 4.2 BottomNav Simplificado

**Novo arquivo:** `src/components/professor/ProfessorBottomNavSimplificado.tsx`

| Ícone | Label | Rota |
|-------|-------|------|
| Home | Home | /professor |
| Sparkles | Círculo | /professor/circulo |
| Users | Alunos | /professor/alunos |

### 4.3 Dashboard Simplificado

**Novo arquivo:** `src/pages/professor/ProfessorDashboardSimplificado.tsx`

Conteúdo:
- Saudação: "Olá, {nome}!"
- Card da Fase Atual (inteligência sendo trabalhada)
- Minhas Turmas (cards com série + letra)
- Ações: "Fazer Observação", "Ver Alunos", "Conteúdo"

### 4.4 Roteador no Layout Principal

**Arquivo:** `src/layouts/ProfessorLayout.tsx`

```typescript
const ProfessorLayoutContent = ({ children }) => {
  const { segmento } = useProfessor();
  
  if (segmento === 'infantil' || segmento === 'fundamental1') {
    return <ProfessorLayoutSimplificado>{children}</ProfessorLayoutSimplificado>;
  }
  
  return <ProfessorLayoutF2Content>{children}</ProfessorLayoutF2Content>;
};
```

## Fase 5: Adaptar Fluxo do Círculo

### 5.1 CirculoPage Dinâmico

**Arquivo:** `src/pages/professor/CirculoPage.tsx`

Para Infantil/F1, mostrar **apenas as turmas vinculadas** (não todas as séries):

```typescript
// Se tem turmas vinculadas, mostrar cards das turmas
if (turmasVinculadas?.length > 0) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {turmasVinculadas.map(turma => (
        <TurmaCard 
          key={turma.id}
          turma={turma}
          onClick={() => navigate(`/professor/circulo/turma/${turma.id}`)}
        />
      ))}
    </div>
  )
}
```

### 5.2 Nova Rota: /professor/circulo/turma/:turmaId

**Novo arquivo:** `src/pages/professor/circulo/CirculoTurmaDirectPage.tsx`

Busca alunos diretamente pelo `turma_id` da tabela `aluno_turma`:

```typescript
const { data: alunos } = await supabase
  .from('aluno_turma')
  .select(`
    aluno_id,
    profiles!inner (
      id, full_name, avatar_url, serie, turma
    )
  `)
  .eq('turma_id', turmaId)
  .eq('ativo', true)
```

## Fase 6: Adaptar Lista de Alunos

### Arquivo: `src/pages/professor/AlunosPage.tsx` (ou novo simplificado)

Para Infantil/F1, buscar alunos das turmas vinculadas:

```typescript
const alunosDasTurmas = await supabase
  .from('aluno_turma')
  .select('profiles(*)')
  .in('turma_id', turmasVinculadas.map(t => t.id))
  .eq('ativo', true)
```

## Fase 7: Atualizar Tela de Cadastro de Professor (Admin)

### Arquivo: `src/pages/admin/PessoasPage.tsx` (ou modal específico)

Quando segmento = Infantil ou F1:
- Esconder campo "Casa"
- Mostrar multi-select de "Turmas"

```tsx
{segmento !== 'fundamental2' && (
  <MultiSelectTurmas
    turmas={turmasDisponiveis}
    selected={turmasSelecionadas}
    onChange={setTurmasSelecionadas}
  />
)}
```

## Resumo de Arquivos

### Novos Arquivos

| Arquivo | Descrição |
|---------|-----------|
| `src/layouts/ProfessorLayoutSimplificado.tsx` | Layout sem casa/mentor |
| `src/components/professor/ProfessorBottomNavSimplificado.tsx` | Nav com 3 itens |
| `src/pages/professor/ProfessorDashboardSimplificado.tsx` | Home focada em turmas |
| `src/pages/professor/circulo/CirculoTurmaDirectPage.tsx` | Lista alunos por turma_id |
| `src/hooks/useAlunosTurmas.ts` | Hook para buscar alunos das turmas |

### Arquivos Modificados

| Arquivo | Mudança |
|---------|---------|
| Migration SQL | Criar tabela `professor_turma` |
| `supabase/functions/create-professor/index.ts` | Aceitar `turma_ids` |
| `src/contexts/ProfessorContext.tsx` | Buscar turmas vinculadas |
| `src/layouts/ProfessorLayout.tsx` | Roteamento por segmento |
| `src/pages/professor/CirculoPage.tsx` | Mostrar turmas vinculadas |
| `src/App.tsx` | Nova rota `/professor/circulo/turma/:turmaId` |

## Fluxo de Uso (Professor Infantil/F1)

```text
1. Admin cadastra professor
   └─> Seleciona segmento "Infantil"
   └─> Seleciona turmas: "Grupo IV A" e "Grupo IV B"

2. Professor faz login
   └─> Sistema detecta segmento = 'infantil'
   └─> Carrega Layout Simplificado

3. Dashboard mostra:
   └─> "Olá, Maria!"
   └─> Fase 3: Inteligência Espacial
   └─> Minhas Turmas: [Grupo IV A] [Grupo IV B]

4. Clica em "Fazer Observação"
   └─> Vê cards: [Grupo IV A] [Grupo IV B]
   └─> Clica em "Grupo IV A"
   └─> Vê lista de alunos dessa turma
   └─> Seleciona aluno → Registra observação
```

## Resultado Esperado

- Professores de Infantil/F1 veem **apenas suas turmas**
- Interface limpa, sem missões ou referência a casas
- Funcionalidade de observação totalmente preservada
- Cadastro de professor adaptado por segmento

