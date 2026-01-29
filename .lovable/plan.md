
# Plano: Remover Pontuação e Ajustar Status para Infantil/Fundamental 1

## ✅ CONCLUÍDO

### Objetivo

Ajustar a lista de alunos e perfil para Infantil/F1 removendo todos os elementos de pontuação e alterando a lógica de status para ser baseada em **observações** em vez de entregas.

### Mudanças Implementadas

#### 1. Lista de Alunos (`AlunosPageSimplificado.tsx`)

**Removido:**
- ✅ Ícone de troféu e título "Ranking de Pontos"
- ✅ Estrela amarela com pontos ao lado do nome
- ✅ Numeração de posição (1, 2, 3...)

**Mantido:**
- ✅ Avatar com bolinha de status (verde = tem observações, cinza = sem observações)
- ✅ Nome + Série/Turma
- ✅ Seta de navegação

#### 2. Perfil do Aluno (`PerfilAlunoPageSimplificado.tsx`)

**Removido:**
- ✅ Cards de "Pontos" e "Ranking"
- ✅ StatusCard (que mencionava entregas e média)

**Mantido:**
- ✅ Seção de Inteligências (8 barras de progresso)
- ✅ Seção de Observações do Professor (FeedbackEstadoCard + histórico)

#### 3. Hook (`useAlunosTurmasComStatus.ts`)

**Alterado:**
- ✅ Status baseado em observações (não pontos)
- ✅ `status: 'com_observacao' | 'sem_observacao'`
- ✅ Ordenação por nome alfabético (não por pontos)

#### 4. Hook (`usePerfilAlunoSimplificado.ts`)

**Removido:**
- ✅ `pontosTotais`
- ✅ `ranking`
- ✅ `totalAlunosTurma`
- ✅ `percentualEntregas`
- ✅ `mediaNotas`
- ✅ `status`

**Adicionado:**
- ✅ `quantidadeObservacoes`
- ✅ `temObservacoes` (boolean)

### Nova Lógica de Status

| Condição | Status | Cor | Descrição |
|----------|--------|-----|-----------|
| Tem observações | `com_observacao` | Verde | Aluno está sendo acompanhado |
| Sem observações | `sem_observacao` | Cinza | "Nenhuma observação registrada" |

### Resumo

Para Infantil/Fundamental 1:
1. ✅ Lista de alunos mostra apenas avatar, nome, série/turma e seta
2. ✅ Perfil do aluno mostra apenas série/turma (sem pontos/ranking)
3. ✅ Status baseado em observações (não entregas)
4. ✅ Cores: verde se tem observações, cinza se não tem
