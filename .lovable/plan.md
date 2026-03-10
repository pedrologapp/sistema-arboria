

## Plano: Remover entrega incorreta de Ana Sophia Targino Severiano

### O que encontrei

A aluna **Ana Sophia Targino Severiano** (6º ano A, Casa Linguística) tem uma entrega registrada para a missão **"A Voz do Personagem"** (Intrapessoal, semana 1) que foi enviada por engano.

**Registros a remover:**
- **Arquivo:** `SeminárioNEEL2026 (13).png` (2.3 MB) no storage `entregas/`
- **Registro do arquivo:** tabela `entrega_arquivos` (id: `639fa555-...`)
- **Registro da entrega:** tabela `entregas` (id: `4cd0de12-...`)

### Ações

1. **Migração SQL** para deletar o registro em `entrega_arquivos` e depois a `entrega`
2. **Deletar o arquivo físico** do storage bucket `entregas` (path: `2afa8000-b694-4a87-a883-7289012c08e4/4cd0de12-8b50-419a-ac94-4de8dca3364d/`)

Isso vai limpar completamente a entrega incorreta, permitindo que a aluna envie novamente se necessário.

