
# Plano: Melhorias na Importacao e Listagem de Alunos

## Resumo das Alteracoes

1. **Novo formato de email**: `nome.sobrenome@aluno.arboria.com`
2. **Exibir segmento** na listagem de alunos
3. **Ordenar por**: Serie, Turma, Nome

---

## 1. Alterar Formato do Email na Sincronizacao

### Arquivo: `supabase/functions/sync-alunos-externos/index.ts`

**Antes:**
```typescript
function gerarEmailTemporario(matricula: string): string {
  const matriculaSemPontos = matricula.replace(/\./g, '');
  return `${matriculaSemPontos}@aluno.arboria.app`;
}
```

**Depois:**
```typescript
function gerarEmail(nome: string, sobrenome: string): string {
  // Pega primeiro nome e primeiro sobrenome
  const primeiroNome = nome.trim().split(' ')[0];
  const primeiroSobrenome = sobrenome.trim().split(' ')[0];
  
  // Normaliza: remove acentos, lowercase, remove caracteres especiais
  const normalizar = (str: string) => str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z]/g, '')
    .toLowerCase();
  
  return `${normalizar(primeiroNome)}.${normalizar(primeiroSobrenome)}@aluno.arboria.com`;
}
```

Usar na criacao:
```typescript
const email = gerarEmail(aluno.nome, aluno.sobrenome);
```

---

## 2. Incluir Segmento na Listagem de Alunos

### Arquivo: `src/pages/admin/PessoasPage.tsx`

Alterar a query de alunos para incluir `segmento`:

```typescript
.select('id, nome, sobrenome, full_name, serie, turma, casa_id, avatar_url, created_at, segmento')
```

Exibir na lista compacta junto com Serie/Turma:

```typescript
<span className="text-white/40 text-xs ml-2 flex-shrink-0">
  {aluno.segmento && `${aluno.segmento} - `}{aluno.serie?.replace(' ano', '')} {aluno.turma}
</span>
```

---

## 3. Ordenar por Serie, Turma, Nome

### Arquivo: `src/pages/admin/PessoasPage.tsx`

**Antes:**
```typescript
.order('full_name')
```

**Depois:**
```typescript
.order('serie')
.order('turma')
.order('full_name')
```

E para os alunos filtrados no frontend (manter consistencia):
```typescript
const alunosFiltrados = alunos
  ?.filter(aluno => { ... })
  ?.sort((a, b) => {
    // Primeiro por serie
    if (a.serie !== b.serie) return (a.serie || '').localeCompare(b.serie || '');
    // Depois por turma
    if (a.turma !== b.turma) return (a.turma || '').localeCompare(b.turma || '');
    // Por fim por nome
    return (a.full_name || '').localeCompare(b.full_name || '');
  });
```

---

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `supabase/functions/sync-alunos-externos/index.ts` | Mudar funcao de email para usar nome.sobrenome |
| `src/pages/admin/PessoasPage.tsx` | Incluir segmento, ordenar por serie/turma/nome |

---

## Exemplo de Como Ficara na Lista

```
6º ano A
  Ana Silva - Fundamental 2 - Casa Linguistica
  Bruno Santos - Fundamental 2 - Casa Musical

6º ano B
  Carlos Oliveira - Fundamental 2 - Casa Logica
  Diana Costa - Fundamental 2 - Casa Espacial
```

