
# Plano: Remover Pontuação e Ajustar Status para Infantil/Fundamental 1

## Objetivo

Ajustar a lista de alunos e perfil para Infantil/F1 removendo todos os elementos de pontuação e alterando a lógica de status para ser baseada em **observações** em vez de entregas.

## Mudanças Necessárias

### 1. Lista de Alunos (`AlunosPageSimplificado.tsx`)

**Remover:**
- Ícone de troféu e título "Ranking de Pontos"
- Estrela amarela com pontos ao lado do nome
- Numeração de posição (1, 2, 3...)

**Manter:**
- Avatar com bolinha de status
- Nome + Série/Turma
- Seta de navegação

**Layout final de cada linha:**
```
  (A)  Adryan Samuel da Silva   5º A   >
   🔴
```

### 2. Perfil do Aluno (`PerfilAlunoPageSimplificado.tsx`)

**Remover:**
- Cards de "Pontos" e "Ranking"
- StatusCard atual (que menciona entregas e média)

**Alterar Status:**
- Se tem observações → mostrar mensagem informativa
- Se não tem observações → mostrar "Nenhuma observação registrada" (neutro, não vermelho "em risco")

**Layout do perfil:**
```
┌─────────────────────────────────────┐
│  ←                              💬  │
│                                     │
│               (  A  )               │
│          Adryan Samuel da Silva     │
│              5º Ano A               │
│                                     │  ← SEM cards de pontos/ranking
│                                     │
│  ▪ INTELIGÊNCIAS                    │
│  [barras de progresso]              │
│                                     │
│  ▪ OBSERVAÇÕES DO PROFESSOR         │
│  [cards de estado/histórico]        │
│                                     │
│  [  ⊕ Registrar observação  ]      │
└─────────────────────────────────────┘
```

### 3. Hook (`useAlunosTurmasComStatus.ts`)

**Alterar lógica de status:**
- Buscar contagem de observações do aluno
- Se tem observações → `regular` (amarelo) ou sem status
- Se não tem observações → mostrar estado neutro (cinza)

### 4. Hook (`usePerfilAlunoSimplificado.ts`)

**Remover:**
- `pontosTotais`
- `ranking`
- `totalAlunosTurma`
- `percentualEntregas`
- `mediaNotas`

**Adicionar:**
- `quantidadeObservacoes`
- `temObservacoes` (boolean)

## Arquivos a Modificar

| Arquivo | Alterações |
|---------|------------|
| `src/pages/professor/AlunosPageSimplificado.tsx` | Remover pontos, ranking, troféu. Simplificar linha do aluno |
| `src/pages/professor/PerfilAlunoPageSimplificado.tsx` | Remover cards pontos/ranking e StatusCard. Manter só inteligências + observações |
| `src/hooks/useAlunosTurmasComStatus.ts` | Mudar lógica de status para baseada em observações |
| `src/hooks/usePerfilAlunoSimplificado.ts` | Remover campos de pontuação |

## Nova Lógica de Status

| Condição | Status | Cor | Descrição |
|----------|--------|-----|-----------|
| Tem observações recentes | `regular` | Amarelo | Aluno está sendo acompanhado |
| Sem observações | `sem_observacao` | Cinza | "Nenhuma observação registrada" |

### Detalhes Técnicos

**Hook useAlunosTurmasComStatus - Nova Query:**
```typescript
// Buscar contagem de observações por aluno
const { data: observacoesData } = await supabase
  .from('observacoes')
  .select('aluno_id')
  .in('aluno_id', alunoIds);

// Criar mapa de quantidade
const obsMap = new Map<string, number>();
for (const o of observacoesData || []) {
  const atual = obsMap.get(o.aluno_id) || 0;
  obsMap.set(o.aluno_id, atual + 1);
}

// Status baseado em observações
const quantidadeObs = obsMap.get(alunoId) || 0;
const status = quantidadeObs > 0 ? 'regular' : 'sem_observacao';
```

**Componente de linha simplificado:**
```typescript
// Sem numeração, sem pontos
<button className="w-full flex items-center gap-3 py-2.5 px-3">
  {/* Avatar com bolinha de status */}
  <div className="relative">
    <Avatar />
    <StatusDot />
  </div>
  
  {/* Nome + Série/Turma */}
  <div className="flex-1 flex items-center gap-2">
    <span>{aluno.nome}</span>
    <span className="text-white/40">{aluno.serie} {aluno.turma}</span>
  </div>
  
  {/* Seta */}
  <ChevronRight />
</button>
```

## Resumo

Para Infantil/Fundamental 1:
1. Lista de alunos mostra apenas avatar, nome, série/turma e seta
2. Perfil do aluno mostra apenas série/turma (sem pontos/ranking)
3. Status baseado em observações (não entregas)
4. Cores: amarelo se tem observações, cinza se não tem
