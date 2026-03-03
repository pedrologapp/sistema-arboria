

## Fix: Aluna Ruamma não aparece — `institution_id` NULL

### Causa raiz
O modal envia `institution_id` (snake_case) no body da requisição, mas a edge function `create-user` lê `institutionId` (camelCase). Resultado: o campo fica `undefined` e o profile é criado com `institution_id = NULL`. Como a listagem filtra por `institution_id`, a aluna não aparece.

### Solução (2 partes)

#### 1. Corrigir a edge function `create-user/index.ts`
Na linha 64, adicionar `institution_id` ao destructuring e usá-lo como fallback:
```typescript
const { email, nome, sobrenome, institutionId, institution_id, role, serie, turma, casa, turma_id, segmento, casa_id } = await req.json();
const resolvedInstitutionId = institutionId || institution_id || null;
```
Usar `resolvedInstitutionId` em todos os lugares onde `institutionId` é referenciado.

#### 2. Corrigir o profile da Ruamma já criada
Executar uma migração SQL para atualizar o `institution_id` da aluna que já foi criada com valor NULL:
```sql
UPDATE profiles 
SET institution_id = (SELECT institution_id FROM profiles WHERE id IN (SELECT user_id FROM user_roles WHERE role = 'admin') LIMIT 1)
WHERE id = 'cfd66763-c24f-4a2b-b75e-06039242b8f2' AND institution_id IS NULL;
```

### Arquivos a editar
- `supabase/functions/create-user/index.ts` — aceitar tanto `institutionId` quanto `institution_id`
- 1 migração SQL — corrigir o profile da Ruamma

