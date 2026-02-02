
# Plano: Incluir "Precisa de justificativa" no Badge de "Meus Alunos"

## Problema Identificado

O badge exibido no card "Meus Alunos" (dashboard) e no ícone "Alunos" (barra de navegação) **não inclui** a contagem de alertas do tipo `aguardando_explicacao` (Precisa de justificativa).

### Código Atual

```typescript
// ProfessorDashboard.tsx (linha 41-45)
const totalAlertas = (badgesAtivos?.precisaAtencao || 0) + 
                     (badgesAtivos?.celebrar || 0) + 
                     (badgesAtivos?.naoEsquecer || 0) + 
                     (badgesAtivos?.atencaoFaseAnterior || 0);
// ❌ Falta: badgesAtivos?.aguardandoExplicacao

// ProfessorBottomNav.tsx (linha 22-26)
const totalAlertas = (badgesAtivos?.precisaAtencao || 0) + 
                     (badgesAtivos?.celebrar || 0) + 
                     (badgesAtivos?.naoEsquecer || 0) + 
                     (badgesAtivos?.atencaoFaseAnterior || 0);
// ❌ Falta: badgesAtivos?.aguardandoExplicacao
```

O hook `useAlertasAlunos` já retorna corretamente `badgesAtivos.aguardandoExplicacao`, mas esses dois componentes não o utilizam na soma.

---

## Solução

Adicionar `badgesAtivos?.aguardandoExplicacao` ao cálculo do `totalAlertas` em ambos os arquivos.

---

## Arquivos a Modificar

### 1. `src/pages/professor/ProfessorDashboard.tsx`

**Linha 41-45** - Adicionar `aguardandoExplicacao`:

```typescript
// ANTES:
const totalAlertas = (badgesAtivos?.precisaAtencao || 0) + 
                     (badgesAtivos?.celebrar || 0) + 
                     (badgesAtivos?.naoEsquecer || 0) + 
                     (badgesAtivos?.atencaoFaseAnterior || 0);

// DEPOIS:
const totalAlertas = (badgesAtivos?.precisaAtencao || 0) + 
                     (badgesAtivos?.celebrar || 0) + 
                     (badgesAtivos?.naoEsquecer || 0) + 
                     (badgesAtivos?.atencaoFaseAnterior || 0) +
                     (badgesAtivos?.aguardandoExplicacao || 0);
```

### 2. `src/components/professor/ProfessorBottomNav.tsx`

**Linha 22-26** - Adicionar `aguardandoExplicacao`:

```typescript
// ANTES:
const totalAlertas = (badgesAtivos?.precisaAtencao || 0) + 
                     (badgesAtivos?.celebrar || 0) + 
                     (badgesAtivos?.naoEsquecer || 0) + 
                     (badgesAtivos?.atencaoFaseAnterior || 0);

// DEPOIS:
const totalAlertas = (badgesAtivos?.precisaAtencao || 0) + 
                     (badgesAtivos?.celebrar || 0) + 
                     (badgesAtivos?.naoEsquecer || 0) + 
                     (badgesAtivos?.atencaoFaseAnterior || 0) +
                     (badgesAtivos?.aguardandoExplicacao || 0);
```

---

## Resultado Esperado

| Cenário | Badge Antes | Badge Depois |
|---------|-------------|--------------|
| 1 alerta de celebrar + 1 aguardando explicação | **1** | **2** |
| Somente 1 aguardando explicação | **0** | **1** |
| 2 precisa atenção + 1 aguardando | **2** | **3** |

---

## Impacto

- **Card "Meus Alunos"** no Dashboard: Badge incluirá justificativas pendentes
- **Ícone "Alunos"** na BottomNav: Badge incluirá justificativas pendentes
- **Sem mudanças visuais** além do número incrementado
- **Consistente** com a lógica de exclusão mútua já implementada
