# Plano: Exibir Todos os Campos Ricos do N8N

## ✅ STATUS: IMPLEMENTADO

---

## Problema Resolvido

1. **Duplicação de alertas** - A Edge Function agora arquiva TODOS os alertas ativos do aluno (não só os de N8N)
2. **Dados não exibidos** - O hook e componente agora mapeiam e exibem todos os campos ricos

---

## Alterações Realizadas

### 1. Edge Function (`supabase/functions/receber-sugestao-n8n/index.ts`)
- ✅ Removido filtro `.eq("motivo", "analise_n8n")` - agora arquiva qualquer alerta ativo
- ✅ Adicionado campo `o_que_nao_fazer` ao payload e dados_contexto

### 2. Hook (`src/hooks/usePerfilAluno.ts`)
- ✅ Interface `AcaoSugerida` agora inclui `prioridade`
- ✅ Interface `AlertaAtivo` agora inclui:
  - `mensagemProfessor?: string`
  - `oQueNaoFazer?: string[]`
- ✅ Prioriza dados do N8N para:
  - Hipóteses (com perguntas)
  - Ações sugeridas (com prioridade)
  - Arquétipo completo
- ✅ Extrai `padraoIdentificado` do dados_contexto
- ✅ Prioriza `texto_acontecendo` do N8N

### 3. Componente (`src/components/professor/FeedbackEstadoCard.tsx`)
- ✅ Novas props: `mensagemProfessor`, `oQueNaoFazer`
- ✅ Nova variável: `ehAlerta` para estados de alerta
- ✅ Novas seções visuais na área expandida:
  - **O Que NÃO Fazer** (fundo vermelho, ícone AlertOctagon)
  - **Mensagem para Você** (fundo azul, ícone MessageCircle)
- ✅ `temDetalhes` atualizado para considerar novos campos

### 4. Página (`src/pages/professor/PerfilAlunoPage.tsx`)
- ✅ Passa `mensagemProfessor` e `oQueNaoFazer` para FeedbackEstadoCard
- ✅ Passa `prioridade` das ações sugeridas corretamente

---

## Dados Agora Exibidos

| Campo N8N | Seção na UI |
|-----------|-------------|
| `texto_acontecendo` | Texto principal do card |
| `hipoteses` (com perguntas) | Ver Mais → Hipóteses (com 💬 perguntas) |
| `acoes_sugeridas` (com prioridade) | Ver Mais → Ações Sugeridas (badges coloridos) |
| `arquetipo` | Ver Mais → Arquétipo |
| `padrao_identificado` | Card de Padrão |
| `o_que_nao_fazer` | Ver Mais → O Que NÃO Fazer (nova seção) |
| `mensagem_professor` | Ver Mais → Mensagem para Você (nova seção) |

---

## Como Testar

1. Envie uma sugestão do N8N com todos os campos:
```json
{
  "aluno_matricula": "22872026",
  "estado": "precisa_atencao",
  "texto_acontecendo": "Descrição detalhada...",
  "hipoteses": [
    {
      "titulo": "Hipótese 1",
      "descricao": "Descrição",
      "perguntas": ["Pergunta para investigar?"]
    }
  ],
  "acoes_sugeridas": [
    {"acao": "Conversar com o aluno", "prioridade": "alta"},
    {"acao": "Observar mais", "prioridade": "media"}
  ],
  "o_que_nao_fazer": [
    "Expor publicamente",
    "Pressionar por resposta"
  ],
  "mensagem_professor": "Você está fazendo a coisa certa..."
}
```

2. Acesse o perfil do aluno e clique em "Ver mais" no card de alerta
3. Verifique se todas as seções aparecem corretamente

---

## Observações

- O alerta duplicado de Adryan foi arquivado manualmente
- Novos alertas do N8N vão arquivar automaticamente qualquer alerta existente
