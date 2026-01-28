
# Plano: Adicionar Exclusao em Massa de Alunos no Painel Admin

## Objetivo
Permitir que administradores excluam todos os alunos da instituicao de uma vez, com confirmacao de seguranca para evitar exclusoes acidentais.

## Interface do Usuario

### Novo Botao na Aba Alunos
- Adicionar botao vermelho "Excluir Todos" na area de acoes
- Botao so aparece quando ha alunos cadastrados
- Icone de lixeira para indicar acao destrutiva

### Modal de Confirmacao (2 etapas)
1. **Primeira tela**: Mostra quantidade de alunos que serao excluidos e pede confirmacao
2. **Segunda tela**: Exige digitar "EXCLUIR" para confirmar (previne cliques acidentais)

### Feedback Visual
- Loading spinner durante exclusao
- Toast de sucesso/erro apos conclusao
- Atualiza lista automaticamente

## Implementacao Tecnica

### 1. Nova Edge Function: `delete-users-bulk`
Cria uma nova edge function otimizada para exclusao em massa:
- Recebe array de IDs ou parametro `deleteAllStudents: true`
- Usa mesma logica de limpeza de dependencias do `delete-user`
- Processa em lote para melhor performance
- Retorna contagem de sucessos/falhas

```typescript
// Payload esperado
{
  "institutionId": "uuid",
  "deleteAllStudents": true
}
```

### 2. Novo Componente: `ModalExcluirAlunosMassa`
- Modal com design escuro consistente com o restante da UI
- Estado de confirmacao em 2 etapas
- Campo de texto para digitar "EXCLUIR"
- Botoes Cancelar e Confirmar

### 3. Atualizacao do PessoasPage
- Importar novo modal
- Adicionar estado para controlar modal
- Adicionar botao de exclusao em massa
- Invalidar query apos exclusao bem-sucedida

## Fluxo de Seguranca

```text
[Clique em "Excluir Todos"]
        |
        v
[Modal - Etapa 1: Confirmacao]
"Tem certeza? X alunos serao excluidos permanentemente"
        |
        v
[Modal - Etapa 2: Digite EXCLUIR]
Campo de texto + validacao
        |
        v
[Chamada Edge Function]
        |
        v
[Feedback: Sucesso/Erro]
```

## Arquivos a Criar/Modificar

| Arquivo | Acao |
|---------|------|
| `supabase/functions/delete-users-bulk/index.ts` | Criar |
| `src/components/admin/ModalExcluirAlunosMassa.tsx` | Criar |
| `src/pages/admin/PessoasPage.tsx` | Modificar |

## Consideracoes de Seguranca

- Apenas admins autenticados podem executar
- Verificacao de institution_id para nao afetar outras instituicoes
- Log de operacao para auditoria
- Timeout adequado para operacoes grandes (ate 300 alunos)
