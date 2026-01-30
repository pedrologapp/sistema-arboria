

# Plano: Pop-up de Aviso para Qualquer Alerta Ativo

## Problema

Atualmente, o pop-up só aparece quando `aluno.alertaAtivo?.tipo === 'precisa_atencao'`. Para alunos com outros tipos de alerta (como "celebre"), o sistema navega direto para a página de observação sem avisar.

---

## Solução

Alterar a condição para verificar se **existe qualquer alerta ativo** (`aluno.alertaAtivo` não é null/undefined), em vez de verificar apenas o tipo específico `precisa_atencao`.

---

## Alterações

### 1. Arquivo: `src/pages/professor/PerfilAlunoPage.tsx`

**Linha 188-195** - Modificar condição:

```typescript
// DE:
const handleRegistrarObservacao = () => {
  if (aluno.alertaAtivo?.tipo === 'precisa_atencao') {
    setModalSugestaoAtiva(true);
  } else {
    navigate(`/professor/circulo/aluno/${id}`);
  }
};

// PARA:
const handleRegistrarObservacao = () => {
  // Se tem QUALQUER alerta ativo, mostrar modal de aviso primeiro
  if (aluno.alertaAtivo) {
    setModalSugestaoAtiva(true);
  } else {
    navigate(`/professor/circulo/aluno/${id}`);
  }
};
```

### 2. Arquivo: `src/pages/professor/PerfilAlunoPageSimplificado.tsx`

**Mesma alteração** - Modificar a condição de `aluno.alertaAtivo?.tipo === 'precisa_atencao'` para `aluno.alertaAtivo`.

---

## Comportamento Após Alteração

| Situação do Aluno | Antes | Depois |
|-------------------|-------|--------|
| "Precisam de você" (atenção) | Mostra pop-up | Mostra pop-up |
| "Celebre" (celebração) | Navega direto | Mostra pop-up |
| "Não esqueça" (esquecimento) | Navega direto | Mostra pop-up |
| Sem alerta ativo | Navega direto | Navega direto |

---

## Arquivos Afetados

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/professor/PerfilAlunoPage.tsx` | Linha 190: trocar condição |
| `src/pages/professor/PerfilAlunoPageSimplificado.tsx` | Mesma alteração |

