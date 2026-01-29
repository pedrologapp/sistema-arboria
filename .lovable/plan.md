
# Plano Revisado: Importação Rápida com Criação Auth em Lotes Paralelos

## O Problema Descoberto

A estrutura do banco de dados atual tem uma **constraint crítica**:

```
profiles.id → auth.users (FK obrigatória)
user_roles.user_id → auth.users (FK obrigatória)
```

Isso significa que **não é possível** inserir um aluno na tabela `profiles` sem primeiro criar uma conta no Auth. Por isso a importação de 92 alunos falhou - os UUIDs gerados não existiam no `auth.users`.

## Nova Estratégia: Criação Auth Paralela + Service Role

Em vez de remover as FKs (mudança arriscada), vou otimizar a criação de contas Auth usando:

1. **Paralelismo controlado**: Criar 10 contas Auth simultaneamente em vez de 1 por vez
2. **Email determinístico**: Usar `nome.sobrenome.matricula@aluno.arboria.com` (já implementado)
3. **Inserções SQL em batch**: Após criar as contas Auth, inserir roles e scores em uma única query

### Fluxo Otimizado

```text
┌───────────────────────────────────────────────────────────────┐
│  NOVO FLUXO (10-15x mais rápido)                              │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  1. Receber array de 92 alunos                                │
│  2. Dividir em grupos de 10                                   │
│  3. Para cada grupo (em paralelo):                            │
│     └─ Promise.all([                                          │
│          createUser(aluno1),                                  │
│          createUser(aluno2),                                  │
│          ... até 10                                           │
│        ])                                                     │
│  4. Após todos criados: INSERT batch em profiles              │
│  5. INSERT batch em user_roles                                │
│  6. INSERT batch em inteligencia_scores                       │
│                                                               │
│  Tempo estimado: 92 alunos / 10 paralelo × 0.5s = ~5 segundos │
└───────────────────────────────────────────────────────────────┘
```

## Mudanças Técnicas

### 1. Atualizar Edge Function `import-alunos-rapido`

Modificar para:
- Criar conta Auth para cada aluno usando `supabaseAdmin.auth.admin.createUser()`
- Processar em grupos de 10 com `Promise.all()`
- Usar o UUID retornado pelo Auth (não gerar próprio)
- Após Auth criado, fazer batch insert nas tabelas dependentes

### 2. Manter Estrutura do Banco

Não mexer nas FKs existentes - são necessárias para integridade referencial.

### 3. Tratamento de Erros

- Se um aluno falhar no Auth (email já existe), pular e continuar
- Retornar lista de erros no final
- Permitir re-importação (upsert) se a matrícula já existir

## Benefícios

| Métrica | Versão Anterior | Nova Versão |
|---------|-----------------|-------------|
| **92 alunos** | Timeout (~60s+) | ~5-10 segundos |
| **Paralelismo** | 1 por vez | 10 simultâneos |
| **Colisões** | Loop verificando | Email determinístico |
| **Integridade** | Parcial (falhas) | Completa (FK respeitada) |

## Arquivos a Modificar

1. **`supabase/functions/import-alunos-rapido/index.ts`**
   - Adicionar criação de Auth em paralelo
   - Usar UUID do Auth retornado
   - Batch inserts após sucesso do Auth

## Código-Chave da Solução

A função processará assim:

```typescript
// Processar em grupos de 10 em paralelo
const BATCH_SIZE = 10;
for (let i = 0; i < alunos.length; i += BATCH_SIZE) {
  const batch = alunos.slice(i, i + BATCH_SIZE);
  
  const results = await Promise.allSettled(
    batch.map(aluno => createAuthUser(aluno))
  );
  
  // Coletar UUIDs dos criados com sucesso
  for (const result of results) {
    if (result.status === 'fulfilled') {
      successfulUsers.push(result.value);
    }
  }
}

// Batch insert em profiles (todos de uma vez)
await supabaseAdmin.from('profiles').insert(profilesData);
await supabaseAdmin.from('user_roles').insert(rolesData);
await supabaseAdmin.from('inteligencia_scores').insert(scoresData);
```

## Senha dos Alunos

Mantém o padrão: `sobrenome123` (primeira letra maiúscula)

Exemplo: João Silva → Senha: `Silva123`

## Resultado Esperado

Ao aprovar este plano:
1. Importação de 92 alunos em ~5-10 segundos
2. Todos aparecem na lista imediatamente
3. Todos já têm login funcional
4. Scores inicializados (35 ou valor do CSV)
