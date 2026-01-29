
# Plano: Corrigir Atualização da Lista Após Importação

## Diagnóstico

Após analisar os logs e o código, identifiquei que:

1. **A importação está funcionando corretamente** - os logs mostram:
   ```
   [import-alunos-rapido] Concluído: 0 criados, 92 atualizados, 0 erros
   ```

2. **O modal fecha automaticamente** após sucesso (linha 313)

3. **O problema real**: a lista de alunos não é atualizada porque falta invalidar o cache do React Query após a importação

## Causa Raiz

O `ModalImportarCSV` não invalida a query `admin-alunos` após importar. Por isso:
- A importação funciona
- O modal fecha
- O toast de sucesso aparece
- **Mas a lista continua mostrando os dados antigos**

Outros modais como `ModalExcluirAlunosMassa` e `ModalGerarContas` fazem isso corretamente via callback `onSuccess`.

## Solução

Adicionar prop `onSuccess` ao `ModalImportarCSV` para invalidar o cache após importação.

### Mudanças no Código

**Arquivo: `src/components/admin/ModalImportarCSV.tsx`**

1. Adicionar prop `onSuccess` opcional:
```typescript
interface ModalImportarCSVProps {
  tipo: 'alunos' | 'professores';
  institutionId: string;
  onClose: () => void;
  onSuccess?: () => void;  // NOVO
}
```

2. Chamar `onSuccess` após importação bem-sucedida:
```typescript
if ((data?.errors?.length || 0) === 0) {
  toast.success(`${total} alunos importados!...`);
  onSuccess?.();  // NOVO - chamar antes de fechar
  onClose();
}
```

**Arquivo: `src/pages/admin/PessoasPage.tsx`**

3. Passar callback para invalidar queries:
```typescript
<ModalImportarCSV
  tipo={tabAtiva === 'professores' ? 'professores' : 'alunos'}
  institutionId={institutionId}
  onClose={() => setModalImportarAberto(false)}
  onSuccess={() => {
    queryClient.invalidateQueries({ queryKey: ['admin-alunos'] });
    queryClient.invalidateQueries({ queryKey: ['admin-professores'] });
  }}
/>
```

## Resultado Esperado

Após a correção:
1. Importação executa (como já está funcionando)
2. Modal fecha automaticamente 
3. Toast de sucesso aparece
4. **Lista de alunos atualiza imediatamente** mostrando os 92 alunos
