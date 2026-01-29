
# Plano: Painel de Alertas para Professores de Infantil/Fundamental 1

## Objetivo

Adicionar o painel de alertas (igual ao da imagem) no dashboard de professores de Infantil e Fundamental 1, mostrando alertas dos alunos das **turmas vinculadas** ao professor (em vez da Casa, usada no Fundamental 2).

## Arquitetura Atual

| Segmento | Vínculo | Alertas baseados em |
|----------|---------|---------------------|
| **Fundamental 2** | `professor_casa` (Casa) | Alunos da Casa (`profiles.casa_id`) |
| **Infantil / F1** | `professor_turma` (Turmas) | Alunos das Turmas (`aluno_turma`) |

O hook `useAlertasAlunos` atual só funciona para F2, pois busca alunos via `casa_id`.

## Mudanças Necessárias

### 1. Novo Hook: `useAlertasAlunosTurmas`

Criar um hook específico para buscar alertas baseados nas turmas do professor.

**Arquivo:** `src/hooks/useAlertasAlunosTurmas.ts`

```typescript
// Lógica principal:
// 1. Buscar turmas do professor via ProfessorContext
// 2. Buscar alunos via aluno_turma (turma_id IN turmasVinculadas)
// 3. Processar alertas da mesma forma que useAlertasAlunos
```

Diferenças do hook original:
- Usa `turmasVinculadas` do contexto em vez de `casaMentor`
- Busca alunos via `aluno_turma` (JOIN com profiles)
- Query key inclui IDs das turmas

### 2. Novo Componente: `AlertBoxesTurmas`

Componente para renderizar o grid de alertas com título adaptado.

**Arquivo:** `src/components/professor/AlertBoxesTurmas.tsx`

Mudanças visuais:
- Título: "ALERTAS DAS TURMAS" (em vez de "Alertas da Casa")
- Mesmo grid 2x2 com os 4 tipos de alertas
- Reutiliza `AlertGridCard` e `AlertaDetalheModal`

### 3. Atualizar Dashboard Simplificado

Adicionar a seção de alertas no `ProfessorDashboardSimplificado`.

**Arquivo:** `src/pages/professor/ProfessorDashboardSimplificado.tsx`

Adicionar entre a seção "Minhas Turmas" e "Ações Rápidas":
- Componente `AlertBoxesTurmas`
- Navegação para perfil do aluno ao clicar

## Fluxo de Dados

```text
1. Professor de Infantil/F1 faz login
2. ProfessorContext carrega turmasVinculadas: [{id: '5A', ...}, {id: '5B', ...}]
3. useAlertasAlunosTurmas busca:
   └─> aluno_turma WHERE turma_id IN ('5A', '5B') AND ativo = true
   └─> profiles dos alunos encontrados
   └─> observacoes da fase atual
   └─> alertas_alunos ativos
4. Calcula totais por categoria
5. AlertBoxesTurmas renderiza grid 2x2
```

## Categorias de Alertas (mesmas do F2)

| Categoria | Ícone | Lógica |
|-----------|-------|--------|
| Precisam de você | 🔴 | Alerta `precisa_atencao` ativo |
| Celebre | ✨ | Alerta `celebrar` ou 2 positivos consecutivos |
| Não esqueça | 🟡 | 14+ dias sem observação na fase |
| Fase anterior | ⚠️ | Alertas pendentes de fase anterior |

## Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `src/hooks/useAlertasAlunosTurmas.ts` | **Criar** - Hook para alertas por turma |
| `src/components/professor/AlertBoxesTurmas.tsx` | **Criar** - Componente do grid de alertas |
| `src/pages/professor/ProfessorDashboardSimplificado.tsx` | **Modificar** - Adicionar seção de alertas |

## Layout Visual Final

```text
┌─────────────────────────────────────┐
│  Olá, Rita!                     ⚙️  │
│  Professora • Fundamental 1         │
├─────────────────────────────────────┤
│  MINHAS TURMAS                      │
│  ┌─────────┐  ┌─────────┐           │
│  │  5º A   │  │  5º B   │           │
│  └─────────┘  └─────────┘           │
├─────────────────────────────────────┤
│  ALERTAS DAS TURMAS          ← NOVO │
│  ┌─────────┐  ┌─────────┐           │
│  │🔴 0     │  │✨ 0     │           │
│  │Precisam │  │Celebre  │           │
│  └─────────┘  └─────────┘           │
│  ┌─────────┐  ┌─────────┐           │
│  │🟡 0     │  │⚠️ 0     │           │
│  │Não esq. │  │Fase ant.│           │
│  └─────────┘  └─────────┘           │
├─────────────────────────────────────┤
│  AÇÕES RÁPIDAS                      │
│  [📋 Fazer Observação]              │
│  [👥 Meus Alunos]                   │
│  [📖 Conteúdo]                      │
└─────────────────────────────────────┘
```

## Detalhes Técnicos

### Query para buscar alunos das turmas

```typescript
const turmaIds = turmasVinculadas?.map(t => t.id) || [];

// Buscar vínculos ativos
const { data: alunosTurma } = await supabase
  .from('aluno_turma')
  .select('aluno_id')
  .in('turma_id', turmaIds)
  .eq('ativo', true);

const alunoIds = alunosTurma?.map(a => a.aluno_id) || [];

// Buscar profiles dos alunos
const { data: alunos } = await supabase
  .from('profiles')
  .select('id, nome, sobrenome, avatar_url, serie, turma')
  .in('id', alunoIds);
```

### Condição de habilitação do hook

```typescript
enabled: !!profile?.institution_id && 
         !!turmasVinculadas && 
         turmasVinculadas.length > 0
```

### Query key com turmas

```typescript
queryKey: [
  'alertas-alunos-turmas', 
  profile?.institution_id, 
  turmasVinculadas?.map(t => t.id).join(','),
  faseAtual?.id
]
```

## Resumo

O plano adiciona o painel de alertas ao dashboard de professores de Infantil/F1, usando a mesma interface visual do F2 mas com dados baseados nas turmas vinculadas ao professor. A lógica de cálculo de alertas permanece a mesma (14 dias sem observação, 2 positivos consecutivos, etc.).
