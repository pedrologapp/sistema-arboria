
# Plano: Corrigir Sincronizacao de Alunos com Emails Duplicados

## Problema Identificado

Quando a função tenta criar um novo aluno e o email `nome.sobrenome@aluno.arboria.com` já existe no auth.users, ela falha. Isso acontece porque:
- Alunos com mesmo primeiro nome e sobrenome geram emails iguais
- Ex: "João Silva Costa" e "João Silva Neto" → ambos geram `joao.silva@aluno.arboria.com`

## Solução: Verificar Email Existente + Vincular ao Profile

### Lógica Proposta:

```text
1. Verificar se aluno existe por matricula_externa
   ├─ SIM → ATUALIZAR dados no profile
   └─ NÃO → Tentar criar novo usuário
              ├─ SUCESSO → Atualizar profile com matricula_externa
              └─ ERRO (email existe) → 
                   ├─ Buscar user existente pelo email
                   ├─ Verificar se profile já tem matricula_externa
                   │   ├─ NÃO tem → Vincular matricula_externa a esse profile
                   │   └─ JÁ tem outra → Gerar email alternativo (nome.sobrenome2@...)
                   └─ Contar como "atualizado"
```

### Estratégia para Emails Duplicados:

Quando o email base já existe e está vinculado a outra matrícula, adicionar sufixo numérico:

```typescript
// Tentar: joao.silva@aluno.arboria.com
// Se existe: joao.silva2@aluno.arboria.com
// Se existe: joao.silva3@aluno.arboria.com
```

## Alterações na Edge Function

### 1. Adicionar função para buscar usuário por email

```typescript
async function buscarUserPorEmail(supabaseAdmin, email: string) {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers();
  if (error) return null;
  return data.users.find(u => u.email === email);
}
```

### 2. Adicionar lógica de email alternativo

```typescript
async function gerarEmailUnico(supabaseAdmin, nome: string, sobrenome: string): Promise<string> {
  const baseEmail = gerarEmail(nome, sobrenome);
  let email = baseEmail;
  let suffix = 1;
  
  while (suffix <= 10) {
    const existingUser = await buscarUserPorEmail(supabaseAdmin, email);
    if (!existingUser) return email;
    
    // Gerar próximo email
    suffix++;
    const [local, domain] = baseEmail.split('@');
    email = `${local}${suffix}@${domain}`;
  }
  
  throw new Error('Muitos usuários com mesmo nome');
}
```

### 3. Modificar fluxo de criação

Quando `createUser` falhar com email duplicado:

```typescript
if (createError?.message?.includes('email address has already been registered')) {
  // Buscar usuário existente
  const existingUser = await buscarUserPorEmail(supabaseAdmin, email);
  
  if (existingUser) {
    // Verificar se profile desse user já tem matricula_externa
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('matricula_externa')
      .eq('id', existingUser.id)
      .single();
    
    if (!profile?.matricula_externa) {
      // Profile sem matrícula → vincular esta matrícula
      await supabaseAdmin
        .from('profiles')
        .update({ 
          matricula_externa: aluno.matricula,
          nome, sobrenome, serie, turma, segmento 
        })
        .eq('id', existingUser.id);
      
      result.atualizados++;
      continue;
    } else {
      // Profile já tem outra matrícula → criar com email alternativo
      const novoEmail = await gerarEmailUnico(supabaseAdmin, nome, sobrenome);
      // Tentar createUser com novoEmail...
    }
  }
}
```

## Resultado Esperado

| Cenário | Antes | Depois |
|---------|-------|--------|
| Matrícula existe | ✅ Atualiza | ✅ Atualiza |
| Matrícula nova, email livre | ✅ Cria | ✅ Cria |
| Matrícula nova, email existe sem matrícula | ❌ Erro | ✅ Vincula |
| Matrícula nova, email existe com outra matrícula | ❌ Erro | ✅ Cria com sufixo |

## Resposta da API

```json
{
  "success": true,
  "total": 100,
  "criados": 45,
  "atualizados": 55,
  "erros": []
}
```

## Arquivo a Modificar
- `supabase/functions/sync-alunos-externos/index.ts`
