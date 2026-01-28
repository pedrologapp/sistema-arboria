
# Plano: Estrutura de 3 Segmentos (Infantil, Fundamental1, Fundamental2)

## Resumo Executivo

Vamos adaptar o sistema para suportar **3 painéis de professores separados por segmento** e **3 conjuntos de fases independentes** gerenciáveis pelo Admin. Cada segmento terá seu próprio ciclo de fases, e os professores só verão as fases do seu segmento.

---

## Estrutura Atual vs Nova

### Hoje
- Professores têm `casa_id` (via `professor_casa`) mas **não têm segmento** definido
- Fases são globais por instituição (não separadas por segmento)
- Só existe 1 painel de professor (fundamental2)

### Depois
- Professores terão campo `segmento` no `profiles` (infantil, fundamental1, fundamental2)
- Fases terão campo `segmento` para separar os ciclos
- Professores do **fundamental2** → têm casa associada (como já funciona)
- Professores do **infantil e fundamental1** → NÃO têm casa, participam de todas as fases do seu segmento
- Admin verá **3 colunas de fases** (uma por segmento)

---

## Mudanças no Banco de Dados

### 1. Adicionar coluna `segmento` na tabela `fases`

```sql
ALTER TABLE public.fases 
ADD COLUMN segmento text NOT NULL DEFAULT 'fundamental2';

-- Criar índice para performance
CREATE INDEX idx_fases_segmento ON public.fases(segmento);

-- Constraint para valores válidos
ALTER TABLE public.fases 
ADD CONSTRAINT fases_segmento_check 
CHECK (segmento IN ('infantil', 'fundamental1', 'fundamental2'));
```

### 2. Atualizar professores existentes com segmento

```sql
-- Julianeide e Oceni são do fundamental2
UPDATE public.profiles 
SET segmento = 'fundamental2'
WHERE id IN (
  SELECT user_id FROM user_roles WHERE role = 'professor'
);
```

### 3. Adicionar coluna `segmento` opcionalmente na `professor_casa`

Não é estritamente necessário pois o segmento fica no `profiles`, mas pode ajudar para queries futuras.

---

## Arquivos a Modificar

### Backend (Edge Functions)

#### `supabase/functions/create-professor/index.ts`
- Adicionar campo `segmento` (obrigatório) no body
- Salvar `segmento` no profile
- Tornar `casa_id` **opcional** (só obrigatório para fundamental2)
- Se `segmento != 'fundamental2'`, não criar registro em `professor_casa`

### Frontend - Admin

#### `src/pages/admin/FasesPage.tsx`
- Redesenhar layout para **3 colunas** (ou tabs/accordion em mobile)
- Cada coluna mostra as 8 fases do respectivo segmento
- Seletor de ano permanece global
- Ao criar fase nova, incluir o segmento

#### `src/pages/admin/FaseDetalhesPage.tsx`
- Garantir que ao editar/criar fase, o campo `segmento` seja salvo

#### `src/components/admin/ModalAdicionarUsuario.tsx`
- Adicionar campo **Segmento** (obrigatório para professor)
- Mostrar campo **Casa** somente se segmento = 'fundamental2'
- Atualizar validação do formulário

### Frontend - Professor

#### `src/contexts/ProfessorContext.tsx`
- Adicionar `segmento` no Profile interface
- Buscar `segmento` do profile
- Filtrar `faseAtual` também por `segmento` do professor
- Para professores sem casa (infantil/fundamental1):
  - Não buscar `casaMentor` 
  - Buscar todas as fases do segmento como "suas fases"

#### `src/layouts/ProfessorLayout.tsx`
- Ajustar para funcionar sem `casaMentor` (quando professor é de infantil/fundamental1)

#### `src/components/professor/ProfessorHeader.tsx`
- Mostrar segmento no header (opcional, para clareza)
- Remover referência a casa se não existir

#### `src/hooks/useAlunosCasa.ts`
- Renomear ou adaptar para `useAlunosSegmento.ts`
- Para professores de infantil/fundamental1: buscar alunos por segmento (não por casa)

---

## Fluxo de Criação de Professor (Novo)

```text
┌─────────────────────────────────────────────────────────────────┐
│                    Adicionar Professor                          │
├─────────────────────────────────────────────────────────────────┤
│  Nome: [________]    Sobrenome: [________]                      │
│  Email: [__________________________]                            │
│                                                                 │
│  Segmento: [ Infantil ▼ ]                                       │
│            [ Fundamental 1 ]                                    │
│            [ Fundamental 2 ]                                    │
│                                                                 │
│  ┌─────────────────────────────────────────┐                    │
│  │ Casa: [ Linguística ▼ ]                 │  ← Só aparece      │
│  │       (obrigatório para Fundamental 2)  │    se Fundamental2 │
│  └─────────────────────────────────────────┘                    │
│                                                                 │
│  [ Cancelar ]                    [ Criar ]                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Layout da Página de Fases (Admin)

### Desktop (3 colunas)

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  Fases                                                     [ 2026 ▼ ]       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────┐  ┌───────────────────┐  ┌───────────────────┐       │
│  │    INFANTIL       │  │   FUNDAMENTAL 1   │  │   FUNDAMENTAL 2   │       │
│  ├───────────────────┤  ├───────────────────┤  ├───────────────────┤       │
│  │ 1. Linguística    │  │ 1. Linguística    │  │ 1. Linguística ●  │       │
│  │    Não config.    │  │    01 fev - 28 fev│  │    01 fev - 28 fev│       │
│  ├───────────────────┤  ├───────────────────┤  ├───────────────────┤       │
│  │ 2. Lógico-mat.    │  │ 2. Lógico-mat.    │  │ 2. Lógico-mat.    │       │
│  │    Não config.    │  │    Não config.    │  │    01 mar - 28 mar│       │
│  ├───────────────────┤  ├───────────────────┤  ├───────────────────┤       │
│  │ ...               │  │ ...               │  │ ...               │       │
│  └───────────────────┘  └───────────────────┘  └───────────────────┘       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Mobile (Tabs ou Accordion)

```text
┌─────────────────────────────────────────┐
│  Fases                     [ 2026 ▼ ]   │
├─────────────────────────────────────────┤
│  ┌─────────┬─────────┬─────────┐        │
│  │Infantil │ Fund. 1 │ Fund. 2 │        │
│  └─────────┴─────────┴─────────┘        │
│                                         │
│  1. 🎭 Linguística                      │
│     01 fev - 28 fev          Em andamento│
│  ─────────────────────────────────────  │
│  2. 🔢 Lógico-matemática                │
│     01 mar - 28 mar          Próxima    │
│  ─────────────────────────────────────  │
│  ...                                    │
└─────────────────────────────────────────┘
```

---

## Regras de Negócio

| Segmento | Tem Casa? | Vê Alunos de... | Fases |
|----------|-----------|-----------------|-------|
| infantil | ❌ Não | Todos do segmento infantil | Fases com `segmento='infantil'` |
| fundamental1 | ❌ Não | Todos do segmento fundamental1 | Fases com `segmento='fundamental1'` |
| fundamental2 | ✅ Sim (obrigatório) | Apenas da sua Casa | Fases com `segmento='fundamental2'` |

---

## Ordem de Implementação

1. **Migração do banco** - Adicionar coluna `segmento` em `fases` e atualizar professores existentes
2. **Edge Function `create-professor`** - Aceitar segmento, tornar casa opcional
3. **Modal de criação de professor** - Campo segmento + lógica condicional de casa
4. **Página de Fases (Admin)** - Layout com 3 colunas/tabs por segmento
5. **ProfessorContext** - Buscar segmento e filtrar fases corretamente
6. **Adaptar hooks de alunos** - Suportar busca por segmento (sem casa)

---

## Observações Importantes

- Os **painéis de professor para infantil e fundamental1** serão implementados posteriormente (você mencionou que só o fundamental2 está pronto)
- Esta implementação foca na **infraestrutura base**: banco de dados, criação de professor com segmento, e visualização de fases separadas no Admin
- A lógica de casas permanece **exclusiva do fundamental2**
- Professores sem segmento definido serão tratados como `fundamental2` (compatibilidade com dados existentes)

