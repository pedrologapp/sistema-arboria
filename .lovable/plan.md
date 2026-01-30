
# Plano: Sincronização de Scores de Inteligência com N8N

## Visão Geral

Adicionar ao Painel de Monitoramento (`MonitorPage.tsx`) um recurso completo para sincronizar os scores de inteligência dos alunos com o sistema externo N8N.

---

## Arquitetura da Solução

```text
┌──────────────────────────────────────────────────────────────────────┐
│                         MonitorPage.tsx                              │
│  ┌────────────────────────────────────────────────────────────┐      │
│  │  ModalSincronizarScores                                    │      │
│  │  - Seletor de tipo (aluno/turma/série/todos)              │      │
│  │  - Seletores dinâmicos                                     │      │
│  │  - Prévia de quantidade                                    │      │
│  │  - Botão sincronizar                                       │      │
│  └─────────────────────────┬──────────────────────────────────┘      │
│                            │                                          │
│                            ▼                                          │
│  ┌────────────────────────────────────────────────────────────┐      │
│  │  Função buscarDadosSincronizacao()                         │      │
│  │  - Query de alunos com filtro                              │      │
│  │  - Query de scores (perfil_inteligencias_aluno)            │      │
│  │  - Monta payload JSON                                      │      │
│  └─────────────────────────┬──────────────────────────────────┘      │
│                            │                                          │
│                            ▼                                          │
│  ┌────────────────────────────────────────────────────────────┐      │
│  │  POST → https://n8n.vinirossa.com.br/webhook/arboria-sync  │      │
│  └────────────────────────────────────────────────────────────┘      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Componentes a Criar/Modificar

### 1. Novo Componente: `ModalSincronizarScores.tsx`
**Local:** `src/components/admin/ModalSincronizarScores.tsx`

Interface com:
- Radio buttons para tipo de sincronização (aluno/turma/série/todos)
- Select de aluno (quando tipo = aluno)
- Select de turma (quando tipo = turma)
- Select de série (quando tipo = série)
- Select de ano letivo
- Card de prévia mostrando quantidade de alunos e registros
- Botões Cancelar e Sincronizar Agora
- Estados de loading, sucesso e erro

### 2. Modificar: `MonitorPage.tsx`
**Local:** `src/pages/admin/MonitorPage.tsx`

Transformar a página placeholder em dashboard funcional:
- Header com título e botão "Sincronizar Scores"
- Seção para o recurso de sincronização
- Integração com o modal

---

## Estrutura de Dados

### Payload a Enviar
```json
{
  "tipo": "sincronizar_scores",
  "instituicao_id": "902876e9-b263-4c01-9013-aeef7b6d24e1",
  "data_sincronizacao": "2026-01-30T15:00:00Z",
  "filtro": {
    "tipo": "turma",
    "valor": "6º Ano - A"
  },
  "alunos": [
    {
      "aluno_id": "uuid",
      "aluno_matricula": "2287.2026",
      "aluno_nome": "Nome Completo",
      "serie": "6º Ano",
      "turma": "A",
      "casa_id": 1,
      "casa_nome": "Linguística",
      "ano_letivo": 2026,
      "scores": [
        {
          "inteligencia_id": 1,
          "inteligencia_codigo": "linguistica",
          "inteligencia_nome": "Linguística",
          "score_atual": 42.50,
          "score_ultima_fase": 55.00,
          "total_evidencias": 5,
          "fase_atual": 2,
          "eh_casa_do_aluno": true
        }
        // ... 8 inteligências
      ]
    }
  ],
  "resumo": {
    "total_alunos": 25,
    "total_registros": 200
  }
}
```

---

## Queries SQL Necessárias

### Query 1: Buscar Alunos com Filtros
```sql
SELECT 
  p.id as aluno_id,
  p.matricula_externa,
  p.full_name,
  p.serie,
  p.turma,
  p.casa_id,
  i.nome as casa_nome
FROM profiles p
LEFT JOIN inteligencias i ON i.id = p.casa_id
JOIN user_roles ur ON ur.user_id = p.id AND ur.role = 'user'
WHERE p.institution_id = $institution_id
  AND ($serie IS NULL OR p.serie = $serie)
  AND ($turma IS NULL OR p.turma = $turma)
  AND ($aluno_id IS NULL OR p.id = $aluno_id)
ORDER BY p.serie, p.turma, p.full_name;
```

### Query 2: Buscar Scores por Aluno
```sql
SELECT 
  s.aluno_id,
  s.inteligencia_id,
  i.codigo as inteligencia_codigo,
  i.nome as inteligencia_nome,
  s.score_atual,
  s.score_ultima_fase,
  s.total_evidencias,
  s.fase_atual,
  p.casa_id = s.inteligencia_id as eh_casa_do_aluno
FROM inteligencia_scores s
JOIN inteligencias i ON i.id = s.inteligencia_id
JOIN profiles p ON p.id = s.aluno_id
WHERE s.aluno_id = ANY($aluno_ids)
  AND s.ano_letivo = $ano_letivo
ORDER BY s.aluno_id, i.ordem;
```

---

## Fluxo de Implementação

### Passo 1: Criar o Modal
Criar `src/components/admin/ModalSincronizarScores.tsx` com:
- Props: `institutionId`, `onClose`, `onSuccess`
- Estados para tipo de filtro, seleções, loading, resultado
- Queries para buscar listas de alunos, turmas, séries
- Função para calcular prévia
- Função para executar sincronização

### Passo 2: Atualizar MonitorPage
Modificar `src/pages/admin/MonitorPage.tsx`:
- Adicionar botão no header para abrir modal
- Gerenciar estado do modal
- Buscar `institutionId` do admin logado
- Manter visual escuro consistente com o resto do admin

### Passo 3: Implementar Envio ao N8N
No modal, função `handleSincronizar`:
1. Buscar alunos conforme filtro selecionado
2. Buscar scores de todos os alunos encontrados
3. Montar payload no formato especificado
4. Fazer POST para o endpoint N8N
5. Tratar resposta (sucesso/erro)

---

## Detalhes Técnicos

### Endpoint N8N
```
POST https://n8n.vinirossa.com.br/webhook/arboria-sync-scores
Headers:
  Content-Type: application/json
  X-Arboria-Token: (opcional, pode ser adicionado depois)
```

### Permissões
- Página já protegida por `ProtectedRoute requireAdmin`
- Apenas admins da instituição terão acesso
- Não precisa de RLS adicional pois usa consultas server-side seguras

### Performance
- Alunos buscados em batch (não um por um)
- Scores agrupados por aluno_id
- Limite de 500 alunos por sincronização (se necessário)

---

## Interface Visual

```text
┌─────────────────────────────────────────────────────────────┐
│  🔄 Sincronizar Scores de Inteligência              [✕]    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Sincronizar:                                               │
│  ◉ Um aluno       [ Buscar aluno...           ▼]           │
│  ○ Uma turma      [ Selecionar turma          ▼]           │
│  ○ Uma série      [ Selecionar série          ▼]           │
│  ○ Todos os alunos                                         │
│                                                             │
│  Ano letivo: [ 2026 ▼ ]                                    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📊 Prévia                                          │   │
│  │  25 alunos  •  200 registros de inteligência       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ⚠️ Esta operação pode levar alguns segundos.              │
│                                                             │
│           [ Cancelar ]    [ 🔄 Sincronizar Agora ]         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/components/admin/ModalSincronizarScores.tsx` | Criar | Modal completo de sincronização |
| `src/pages/admin/MonitorPage.tsx` | Modificar | Adicionar botão e integrar modal |

---

## Considerações de Segurança

1. **Autenticação**: Página protegida por `ProtectedRoute requireAdmin`
2. **Dados sensíveis**: Payload contém nomes de alunos - OK pois é sincronização interna
3. **Rate limiting**: Considerar adicionar delay se muitos alunos
4. **Token de segurança**: Campo preparado para `X-Arboria-Token` (implementar depois se necessário)

---

## Testes Recomendados

Após implementação:
1. Testar sincronização de 1 aluno específico
2. Testar sincronização de 1 turma (ex: 6º A)
3. Testar sincronização de 1 série (ex: 6º Ano)
4. Verificar no N8N se payload chegou completo
5. Verificar feedback de sucesso/erro na interface
