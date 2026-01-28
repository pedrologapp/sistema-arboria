

# Plano: Simplificar Importação Excel - Geração Automática de Email e Senha

## Objetivo

Reformular o sistema de importação Excel para receber apenas dados básicos do aluno, gerando automaticamente emails e senhas após a importação. O formato será compatível com a estrutura da imagem que você enviou (matricula, nome, sobrenome, serie, turma, segmento).

---

## Novo Formato do Excel

### Colunas Obrigatórias (apenas 6):

| Coluna | Descrição | Exemplo |
|--------|-----------|---------|
| `matricula` | Matrícula do aluno (identificador único) | 2267.2026 |
| `nome` | Primeiro nome | Alice |
| `sobrenome` | Sobrenome | Barros Gomes |
| `serie` | Série/turma | Maternalzinho(2) |
| `turma` | Turma | B |
| `segmento` | Nível educacional | infantil |

### Colunas Opcionais (inteligências):
- `casa_id` (1-8)
- `int_intrapessoal`, `int_interpessoal`, `int_naturalista`, etc. (0-100)

---

## Geração Automática

| Campo | Regra de Geração |
|-------|------------------|
| **Email** | `primeironome.primeirosobrenome@aluno.arboria.com` |
| **Senha** | `sobrenomenormalizado + 123` |

Exemplos:
- Alice Barros Gomes → `alice.barros@aluno.arboria.com` / `barrosgomes123`
- João Silva → `joao.silva@aluno.arboria.com` / `silva123`

---

## Arquivos a Modificar

### 1. Modal de Importação (`ModalImportarCSV.tsx`)

**Mudanças:**
- Remover `email` das colunas obrigatórias
- Adicionar `matricula` e `segmento` como obrigatórias
- Tornar `casa_id` opcional
- Atualizar modelo Excel para download
- Atualizar preview e validações

### 2. Modal de Instruções (`ModalInstrucoesImportacao.tsx`)

**Mudanças:**
- Atualizar lista de colunas
- Mostrar que email/senha são gerados automaticamente
- Novo exemplo visual

### 3. Edge Function (`import-users/index.ts`)

**Mudanças:**
- Aceitar `matricula` e `segmento` nos dados
- Gerar email automaticamente usando função `gerarEmail()`
- Gerar senha a partir do sobrenome
- Salvar `matricula_externa` no profile
- Lidar com colisões de email (adicionar sufixo numérico)

---

## Estrutura Técnica

```text
┌─────────────────────────────────────────────────────────────┐
│                    FLUXO DE IMPORTAÇÃO                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. USUÁRIO PREPARA EXCEL                                   │
│     ├─ matricula: 2267.2026                                 │
│     ├─ nome: Alice                                          │
│     ├─ sobrenome: Barros Gomes                              │
│     ├─ serie: Maternalzinho(2)                              │
│     ├─ turma: B                                             │
│     └─ segmento: infantil                                   │
│                                                             │
│  2. FRONTEND VALIDA E ENVIA                                 │
│     └─ Chama import-users com dados simplificados           │
│                                                             │
│  3. EDGE FUNCTION PROCESSA                                  │
│     ├─ Gera email: alice.barros@aluno.arboria.com           │
│     ├─ Gera senha: barrosgomes123                           │
│     ├─ Cria usuário no Auth                                 │
│     ├─ Salva matricula_externa no profile                   │
│     ├─ Adiciona role 'user'                                 │
│     └─ Inicializa inteligencia_scores                       │
│                                                             │
│  4. RETORNA RESULTADO                                       │
│     └─ { criados: 92, erros: [] }                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Modelo Excel Atualizado

### Aba "Dados":

| matricula | nome | sobrenome | serie | turma | segmento | casa_id |
|-----------|------|-----------|-------|-------|----------|---------|
| 2267.2026 | Alice | Barros Gomes | Maternalzinho(2) | B | infantil | |
| 2268.2026 | João | Silva | 1º ano | A | fundamental1 | 1 |

### Aba "Instruções":
- Explicação clara que email e senha são gerados automaticamente
- Formato do email: `nome.sobrenome@aluno.arboria.com`
- Formato da senha: `sobrenome + 123` (sem acentos)
- Tabela de IDs das casas (opcional)

---

## Tratamento de Colisões

Se existir um email igual (ex: dois "João Silva"):

1. Primeiro: `joao.silva@aluno.arboria.com`
2. Segundo: `joao.silva2@aluno.arboria.com`
3. Terceiro: `joao.silva3@aluno.arboria.com`

A Edge Function já implementa essa lógica (reutilizada de `sync-alunos-pull`).

---

## Implementação

### Arquivo 1: `src/components/admin/ModalImportarCSV.tsx`

- Atualizar interfaces `AlunoCSV` e `ProfessorCSV`
- Mudar `colunasObrigatoriasAlunos` para: `['matricula', 'nome', 'sobrenome', 'serie', 'turma', 'segmento']`
- Atualizar `baixarModeloExcel()` com novo formato
- Atualizar `importarMutation` para enviar dados sem email

### Arquivo 2: `src/components/admin/ModalInstrucoesImportacao.tsx`

- Atualizar lista de colunas
- Adicionar nota sobre geração automática de email/senha
- Novo exemplo visual

### Arquivo 3: `supabase/functions/import-users/index.ts`

- Importar funções de geração de email do `sync-alunos-pull`
- Modificar para gerar email quando não fornecido
- Salvar `matricula_externa` e `segmento` no profile
- Lidar com colisões de email

---

## Benefícios

| Antes | Depois |
|-------|--------|
| Usuário precisa criar emails | Sistema gera automaticamente |
| Usuário define senhas | Sistema gera: sobrenome+123 |
| Mais chance de erro | Dados simples do sistema escolar |
| Sem vínculo com sistema externo | Matricula_externa permite sync futuro |

