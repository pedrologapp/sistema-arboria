
# Plano: Atualizar Aba de Alunos para Infantil/Fundamental 1

## Objetivo

Atualizar a página de alunos (`AlunosPageSimplificado.tsx`) para ter o mesmo layout do Fundamental 2 (lista com ranking, avatar, nome, série/turma e pontos), e criar uma página de perfil adaptada que:
- **NÃO** mostra informações de Casa
- **NÃO** mostra seção de Missões
- Mostra Série e Turma
- Mantém seções de Status, Inteligências e Observações do Professor

## Referência Visual

### Lista de Alunos (imagem 1)
```text
┌─────────────────────────────────────────────┐
│  TURMA    [Todas] [A] [B] [C]               │
│  ┌──────────────────────────────────────┐   │
│  │  🔍 Buscar aluno...                  │   │
│  └──────────────────────────────────────┘   │
│                                             │
│  1   (A)  Adryan ...   6º AnoA  ⭐ 0pts  >  │
│       🔴                                    │
│                                             │
│          1 de 1 alunos                      │
└─────────────────────────────────────────────┘
```

### Perfil do Aluno (imagens 2 e 3)
```text
┌─────────────────────────────────────────────┐
│  ←                              💬          │
│                                             │
│               (  A  )                       │
│          Adryan Samuel da Silva             │
│              5º Ano A                       │
│                                             │
│     ┌─────────┐   ┌─────────┐               │
│     │   0     │   │   #1    │               │
│     │ Pontos  │   │  de 21  │               │
│     └─────────┘   └─────────┘               │
│                                             │
│  ▪ STATUS                                   │
│  ┌─────────────────────────────────────┐    │
│  │ ⚠️ EM RISCO                          │    │
│  │ 0% entregas • Média 0.0              │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  ▪ INTELIGÊNCIAS                            │
│  [barras de progresso das 8 inteligências]  │
│                                             │
│  ▪ OBSERVAÇÕES DO PROFESSOR                 │
│  ┌─────────────────────────────────────┐    │
│  │ 👁️ AGUARDANDO SEU OLHAR               │    │
│  │ Adryan ainda não foi observado       │    │
│  │ nesta fase.                          │    │
│  │ Registre sua primeira observação.    │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  [  ⊕ Registrar observação  ]              │
│                                             │
│  ❌ NÃO MOSTRA MISSÕES DA FASE              │
└─────────────────────────────────────────────┘
```

## Arquivos a Modificar

| Arquivo | Ação |
|---------|------|
| `src/pages/professor/AlunosPageSimplificado.tsx` | **Modificar** - Novo layout com ranking e AlunoStatusLinha |
| `src/pages/professor/PerfilAlunoPageSimplificado.tsx` | **Criar** - Versão adaptada sem Casa e sem Missões |
| `src/hooks/usePerfilAlunoSimplificado.ts` | **Criar** - Hook adaptado para Infantil/F1 |
| `src/pages/professor/AlunosPageWrapper.tsx` | **Modificar** - Usar página correta de perfil |
| `src/App.tsx` | **Modificar** - Adicionar rota condicional de perfil |

## Detalhes Técnicos

### 1. AlunosPageSimplificado - Novo Layout

Baseado no `AlunosPage.tsx` (F2), mas adaptado:

```typescript
// Mudanças principais:
// - Adicionar título "Ranking de Pontos" com ícone Trophy
// - Usar componente AlunoStatusLinha para cada aluno
// - Ordenar por pontuação decrescente
// - Navegar para /professor/alunos/{id} ao clicar

// Filtros:
// - TURMA: baseado nas turmasVinculadas do professor
// - Campo de busca por nome
```

### 2. Novo Hook: usePerfilAlunoSimplificado

Hook similar ao `usePerfilAluno`, mas:
- Ranking calculado dentro da TURMA (não da Casa)
- `totalAlunosTurma` em vez de `totalAlunosCasa`
- Sem buscar `casaNome`, `casaCor`, `casaEmoji`
- Cor padrão fixa (ex: indigo `#6366f1`)
- Omite busca de missões

```typescript
export interface PerfilAlunoSimplificadoData {
  id: string;
  nome: string;
  serie: string;
  turma: string;
  turmaId: string;
  avatarUrl?: string;
  pontosTotais: number;
  ranking: number;
  totalAlunosTurma: number;
  status: 'destaque' | 'regular' | 'risco';
  percentualEntregas: number;
  mediaNotas: number;
  inteligencias: { id: number; nome: string; emoji: string; cor: string; score: number }[];
  observacoes: Observacao[];
  alertaAtivo: AlertaAtivo | null;
  ultimaObservacao: { sinal: string; dataHora: string } | null;
  temObsFaseAtual: boolean;
  faseAtualNome?: string;
  conversaRegistrada?: ConversaRegistrada | null;
}
```

### 3. Novo Componente: PerfilAlunoPageSimplificado

Cópia do `PerfilAlunoPage.tsx` com estas diferenças:

| Elemento | F2 (Original) | Infantil/F1 (Simplificado) |
|----------|---------------|----------------------------|
| Subtítulo | "6º Ano A • Linguística" | "5º Ano A" (só série/turma) |
| Ranking | "#1 de 45" (da Casa) | "#1 de 21" (da Turma) |
| Cor do avatar/bordas | `casaCor` dinâmica | `#6366f1` (indigo fixo) |
| Seção Missões da Fase | ✅ Exibe | ❌ Omitida |
| Seção Inteligências | ✅ Exibe | ✅ Exibe |
| Seção Observações | ✅ Exibe | ✅ Exibe |

### 4. Roteamento Condicional

No `App.tsx`, a rota `/professor/alunos/:id` precisa renderizar a página correta baseada no segmento do professor:

```typescript
// Opção 1: Criar um wrapper que detecta o segmento
// PerfilAlunoPageWrapper.tsx
const { segmento } = useProfessor();
return segmento === 'fundamental2' 
  ? <PerfilAlunoPage /> 
  : <PerfilAlunoPageSimplificado />;
```

## Fluxo de Navegação

```text
Professor de Fundamental 1 logado:
  │
  ├─> /professor/alunos
  │     │
  │     └─> AlunosPageSimplificado
  │           │
  │           └─> Lista com ranking (1, 2, 3...)
  │                 │
  │                 └─> Clica em aluno
  │                       │
  │                       └─> /professor/alunos/{id}
  │                             │
  │                             └─> PerfilAlunoPageSimplificado
  │                                   │
  │                                   ├─> Avatar + Nome
  │                                   ├─> Série/Turma (sem Casa)
  │                                   ├─> Pontos + Ranking na Turma
  │                                   ├─> Status (Destaque/Regular/Risco)
  │                                   ├─> Inteligências (8 barras)
  │                                   ├─> Observações do Professor
  │                                   └─> ❌ Sem Missões
```

## Dados de Status e Ranking

### Cálculo do Status (mantém a mesma lógica)
- **Destaque**: ≥75% de entregas E média ≥7.0
- **Regular**: Entre 50-75% de entregas OU média entre 5.0-7.0
- **Risco**: <50% de entregas OU média <5.0

### Cálculo do Ranking (adaptado para Turma)
```typescript
// Buscar todos alunos da mesma turma
const { data: alunosTurma } = await supabase
  .from('aluno_turma')
  .select('aluno_id')
  .eq('turma_id', alunoTurmaId)
  .eq('ativo', true);

// Comparar pontos para determinar posição
```

## Resumo de Arquivos

| Arquivo | Ação |
|---------|------|
| `src/pages/professor/AlunosPageSimplificado.tsx` | **Modificar** |
| `src/hooks/usePerfilAlunoSimplificado.ts` | **Criar** |
| `src/pages/professor/PerfilAlunoPageSimplificado.tsx` | **Criar** |
| `src/pages/professor/PerfilAlunoPageWrapper.tsx` | **Criar** |
| `src/App.tsx` | **Modificar** (usar wrapper) |

