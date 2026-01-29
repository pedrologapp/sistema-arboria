
# Plano: Importação Rápida de Alunos (Sem Criação de Conta Auth)

## Contexto do Problema

A Edge Function atual está lenta porque:
1. **Cria conta Auth para cada aluno** - operação lenta (~2-3s cada)
2. **Gera email único verificando colisões** - múltiplas queries
3. **A função falha por timeout** antes de completar

## Nova Estratégia: Importação em 2 Fases

Com base nas suas respostas:
- **Não precisa de login imediato** após importação
- **Email usa matrícula** para ser determinístico e evitar colisões

A solução é importar os dados cadastrais diretamente no banco (sem criar conta Auth), e ter um botão separado para "Gerar Contas" quando necessário.

```text
┌──────────────────────────────────────────────────────────────────┐
│                    NOVA ARQUITETURA                              │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  FASE 1: IMPORTAÇÃO RÁPIDA (segundos)                            │
│  ├─ Insere dados diretamente na tabela profiles                  │
│  ├─ Usa SQL batch (INSERT ... ON CONFLICT para upsert)           │
│  ├─ NÃO cria conta Auth (sem email/senha)                        │
│  ├─ Alunos aparecem na lista imediatamente                       │
│  └─ Velocidade: ~500 alunos/segundo                              │
│                                                                  │
│  FASE 2: GERAÇÃO DE CONTAS (separado, opcional)                  │
│  ├─ Botão "Gerar Contas" na tela de Pessoas                      │
│  ├─ Processa em background ou lotes pequenos                     │
│  ├─ Cria Auth user para cada aluno sem conta                     │
│  └─ Pode ser feito por segmento ou turma                         │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

## Mudanças Técnicas

### 1. Edge Function `import-alunos-rapido` (nova)

Uma função simplificada que:
- Recebe array de alunos
- Usa SQL batch para inserir/atualizar profiles
- Gera UUID para cada aluno (id do profile)
- Adiciona role 'user' em user_roles
- Inicializa inteligencia_scores
- **Não toca no Auth** (sem email/senha)

**Formato do email (determinístico):**
```
nome.sobrenome.matricula@aluno.arboria.com
```
Exemplo: `joao.silva.22672026@aluno.arboria.com`

### 2. Tabela profiles

Os alunos ficarão na tabela profiles com:
- `id`: UUID gerado (não vinculado ao Auth ainda)
- `matricula_externa`: matrícula do arquivo
- `email_gerado`: email determinístico (para uso futuro)
- `conta_criada`: boolean indicando se já tem Auth

### 3. Edge Function `gerar-contas-alunos` (nova)

Para quando quiser criar logins:
- Recebe filtro (segmento, turma, ou IDs específicos)
- Para cada aluno sem conta:
  - Cria Auth user com email_gerado
  - Atualiza id do profile para vincular ao Auth
  - Marca conta_criada = true

### 4. Frontend `ModalImportarCSV.tsx`

Simplifica drasticamente:
- Envia todos os dados de uma vez (sem lotes)
- Função retorna em segundos
- Mostra resultado imediato

### 5. UI: Botão "Gerar Contas"

Na tela de Pessoas, após importar:
- Mostra quantos alunos não têm conta
- Botão "Gerar Contas (92 alunos)" 
- Processa em background com progresso

## Esquema Visual do Fluxo

```text
ANTES (lento):
Excel → Frontend → Edge Function → [Auth + Profile + Role + Scores] × N
                                    ↑ 3 segundos cada = TIMEOUT

DEPOIS (rápido):
Excel → Frontend → Edge Function → SQL Batch [Profiles + Roles + Scores]
                                    ↑ 0.5 segundos TOTAL para 500 alunos

Depois (quando precisar):
Botão "Gerar Contas" → Edge Function → [Auth × N em lotes]
```

## Arquivos a Criar/Modificar

### Novos Arquivos

1. `supabase/functions/import-alunos-rapido/index.ts`
   - SQL batch insert/upsert
   - Gera UUIDs e email determinístico
   - Insere roles e scores em batch

2. `supabase/functions/gerar-contas-alunos/index.ts`
   - Cria Auth users para alunos existentes
   - Processa em lotes pequenos
   - Retorna progresso

### Modificar

1. `src/components/admin/ModalImportarCSV.tsx`
   - Chama nova função `import-alunos-rapido`
   - Remove lógica de lotes (não precisa mais)
   - Resultado instantâneo

2. `src/pages/admin/PessoasPage.tsx`
   - Adiciona contador de "alunos sem conta"
   - Botão "Gerar Contas" que abre modal de progresso

### Banco de Dados

1. Adicionar coluna `email_gerado` na tabela profiles
2. Adicionar coluna `conta_criada` (boolean, default false)
3. Índice em `email_gerado` para lookup rápido

## Benefícios

| Métrica | Atual | Nova Solução |
|---------|-------|--------------|
| **92 alunos** | ~5 min + timeout | < 2 segundos |
| **2000 alunos** | Impossível | < 10 segundos |
| **Colisão de email** | Verificação lenta | Zero (matrícula única) |
| **Feedback** | Lotes com falhas | Instantâneo |
| **Contas Auth** | Criadas na hora | Sob demanda |

## Fluxo de Teste

1. Upload do Excel com 92 alunos
2. Clique em "Importar" → sucesso em 2 segundos
3. Lista mostra 92 alunos imediatamente
4. Badge: "92 alunos sem conta de acesso"
5. Botão "Gerar Contas" → processa quando quiser

## Considerações de Segurança

- Alunos sem conta Auth não conseguem fazer login
- Apenas admins podem gerar contas
- Email determinístico evita conflitos
- Senha continua sendo sobrenome + 123
