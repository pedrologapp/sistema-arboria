
# Plano: Corrigir Geração de Senha para Sobrenomes com Preposições

## Problema Identificado

A função `generatePassword` usa o **primeiro fragmento** do sobrenome para criar a senha. Quando o sobrenome começa com preposições como "de", "do", "da", etc., a senha fica muito curta:

| Sobrenome | Fragmento usado | Senha gerada | Caracteres |
|-----------|-----------------|--------------|------------|
| de Lima Albino | "de" | de123 | 5 ❌ |
| do Nascimento de Alexandria | "do" | do123 | 5 ❌ |
| de França Oliveira | "de" | de123 | 5 ❌ |

O Auth exige **mínimo 6 caracteres** para senhas.

## Solução

Modificar a função `generatePassword` para **ignorar preposições comuns** e usar o primeiro fragmento significativo do sobrenome:

### Mudanças no Código

**Arquivo:** `supabase/functions/import-alunos-rapido/index.ts`

```typescript
// Lista de preposições a ignorar
const PREPOSICOES = ['de', 'da', 'do', 'dos', 'das', 'e', 'del', 'di'];

function generatePassword(sobrenome: string): string {
  const partes = sobrenome.split(' ');
  
  // Encontrar o primeiro fragmento que NÃO é preposição
  let fragmentoSenha = partes[0];
  for (const parte of partes) {
    if (!PREPOSICOES.includes(parte.toLowerCase())) {
      fragmentoSenha = parte;
      break;
    }
  }
  
  return normalizeText(fragmentoSenha) + '123';
}
```

### Resultado Esperado

| Sobrenome | Fragmento usado | Senha gerada | Caracteres |
|-----------|-----------------|--------------|------------|
| de Lima Albino | "Lima" | lima123 | 7 ✅ |
| do Nascimento de Alexandria | "Nascimento" | nascimento123 | 13 ✅ |
| de França Oliveira | "Franca" | franca123 | 9 ✅ |

## Aplicar Mesma Lógica no Email

Para consistência, a geração de email também deve ignorar preposições:

**Antes:** `marina.de.22672026@aluno.arboria.com`
**Depois:** `marina.lima.22672026@aluno.arboria.com`

## Arquivos a Modificar

1. **`supabase/functions/import-alunos-rapido/index.ts`**
   - Adicionar constante `PREPOSICOES`
   - Atualizar `generatePassword()` para pular preposições
   - Atualizar `generateDeterministicEmail()` para pular preposições no sobrenome

## Após a Correção

Os 3 alunos que falharam poderão ser importados normalmente ao fazer um novo upload do arquivo.
