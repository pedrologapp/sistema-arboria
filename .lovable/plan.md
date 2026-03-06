

## Plano: Popular logs históricos a partir de dados existentes

### Situação atual
O `logActivity()` só registra ações **a partir de agora**. Mas os dados históricos já existem nas tabelas do sistema:

| Tabela existente | Ação de log | Campos disponíveis |
|-----------------|-------------|-------------------|
| `mensagens_canal` | `chat_mensagem` | `autor_id`, `canal_id`, `created_at` |
| `entregas` | `missao_entrega` | `aluno_id`, `missao_id`, `created_at` |
| `entregas` (com avaliação) | `missao_avaliada` | `avaliado_por`, `nota`, `data_avaliacao` |
| `observacoes` | `observacao_criada` | `professor_id`, `aluno_id`, `created_at` |

### Solução

**Uma única migração SQL** que insere registros retroativos na `activity_logs` a partir dessas tabelas:

```sql
-- 1. Chat: cada mensagem vira um log
INSERT INTO activity_logs (user_id, action, details, created_at)
SELECT autor_id, 'chat_mensagem',
       jsonb_build_object('canal_id', canal_id), created_at
FROM mensagens_canal;

-- 2. Entregas de missão
INSERT INTO activity_logs (user_id, action, details, created_at)
SELECT e.aluno_id, 'missao_entrega',
       jsonb_build_object('missao_id', e.missao_id, 'missao_titulo', m.titulo),
       e.created_at
FROM entregas e LEFT JOIN missoes m ON m.id = e.missao_id;

-- 3. Avaliações (entregas que foram avaliadas)
INSERT INTO activity_logs (user_id, action, details, created_at)
SELECT e.avaliado_por, 'missao_avaliada',
       jsonb_build_object('missao_id', e.missao_id, 'nota', e.nota,
                          'aluno_id', e.aluno_id),
       e.data_avaliacao
FROM entregas e WHERE e.avaliado_por IS NOT NULL AND e.data_avaliacao IS NOT NULL;

-- 4. Observações
INSERT INTO activity_logs (user_id, action, details, created_at)
SELECT o.professor_id, 'observacao_criada',
       jsonb_build_object('aluno_id', o.aluno_id), o.created_at
FROM observacoes o;
```

### O que NÃO é possível recuperar
- **Logins/logouts passados**: não há tabela local com esse histórico (só nos auth logs do backend, que não são acessíveis via SQL)
- **Atualizações de perfil/avatar passadas**: sem registro

### Resultado
Ao abrir a tela de Atividades, o admin verá todo o histórico de entregas, avaliações, mensagens e observações desde o início do uso do sistema, além dos novos eventos em tempo real.

### Arquivos
| Arquivo | Ação |
|---------|------|
| Migração SQL | Criar (backfill de logs históricos) |

