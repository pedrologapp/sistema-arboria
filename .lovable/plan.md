

# Plano: Ajustar Edge Function para Receber Sugestão do N8N

## Análise da Situação Atual

### O que existe na tabela `alertas_alunos`:
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | uuid | PK |
| `institution_id` | uuid | FK instituição |
| `aluno_id` | uuid | FK aluno |
| `tipo_alerta` | ENUM | precisa_atencao, celebrar, nao_esquecer, fase_anterior, aguardando_explicacao, etc. |
| `motivo` | text | Origem: 'analise_n8n', 'analise_ia', 'ultimas_2_atencao' |
| `status` | ENUM | ativo, visualizado, em_acompanhamento, resolvido, arquivado |
| `fase_id` | uuid | Fase atual |
| `fase_origem_id` | uuid | Fase de origem (para alertas de fase anterior) |
| `dados_contexto` | jsonb | Conteúdo rico da sugestão |
| `notificacao_ativa` | boolean | Badge visível |

### Colunas que NÃO existem mas estão na especificação:
- `turma_id` ❌ (será armazenada em dados_contexto)
- `prioridade` ❌ (será armazenada em dados_contexto)

---

## Mapeamento: tipo_alerta → Dashboard

| `tipo_alerta` (N8N envia) | Hook filtra | Card no Dashboard |
|---------------------------|-------------|-------------------|
| `precisa_atencao` | linha 332 | 🔴 **Precisam de você** |
| `celebrar` | linha 333 | ✨ **Celebre** |
| `aguardando_explicacao` | linha 337-347 | 💬 **Precisa de justificativa** |
| `fase_anterior` | linha 284-287 | 🕐 **Fase Anterior** |
| `nao_esquecer` | dinâmico (14+ dias) | ⏰ **Não esqueça** |

---

## Problema Identificado

A Edge Function atual usa `payload.estado` para definir `tipo_alerta`:

```typescript
// Linha 278 da edge function atual
tipo_alerta: payload.estado,  // ← PROBLEMA: "estado" não é igual a "tipo_alerta"
```

A especificação pede que o N8N envie `tipo_alerta` diretamente.

---

## Solução

### 1. Atualizar Interface da Edge Function

Adicionar campo `tipo_alerta` explícito (usado para determinar onde aparece) enquanto `estado` continua sendo salvo em `dados_contexto`:

```typescript
interface SugestaoPayload {
  // CAMPOS CRÍTICOS (determinam onde aparece)
  tipo_alerta?: 'precisa_atencao' | 'celebrar' | 'aguardando_explicacao';
  
  // CAMPOS EXISTENTES
  aluno_id?: string;
  aluno_matricula?: string;
  estado: 'precisa_atencao' | 'celebrar' | 'neutro' | 'aguardando_explicacao';
  
  // CAMPOS OPCIONAIS PARA FASE ANTERIOR
  fase_id?: string | null;
  fase_origem_id?: string | null;  // Se diferente de fase_id = vai para "Fase Anterior"
  turma_id?: string | null;
  
  // ... demais campos
}
```

### 2. Lógica de Mapeamento

```typescript
// Determinar tipo_alerta (prioridade: campo explícito > estado)
const tipoAlertaFinal = payload.tipo_alerta || payload.estado;

// Validar que é um valor aceito
const tiposValidos = ['precisa_atencao', 'celebrar', 'aguardando_explicacao'];
if (!tiposValidos.includes(tipoAlertaFinal)) {
  return new Response({ error: 'tipo_alerta inválido' });
}
```

### 3. Salvar campos que não existem na tabela dentro de `dados_contexto`

```typescript
const dadosContexto = {
  // ... campos existentes ...
  turma_id: payload.turma_id || null,
  prioridade: payload.prioridade || 'normal',
  professor_id: payload.professor_id || null,
};
```

### 4. Lógica especial para "Fase Anterior"

Se o N8N enviar `fase_origem_id` diferente da `fase_id` atual, o hook já vai reconhecer como alerta de fase anterior (linhas 284-287 do hook):

```typescript
const alertasFaseAnteriorRaw = alertasFiltrados.filter(a => 
  a.tipo_alerta === 'fase_anterior' ||
  (a.fase_origem_id && a.fase_origem_id !== faseAtual?.id)
);
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/receber-sugestao-n8n/index.ts` | Aceitar `tipo_alerta`, `fase_origem_id`, `turma_id` |

---

## Código da Edge Function Atualizada

```typescript
interface SugestaoPayload {
  // === IDENTIFICAÇÃO ===
  aluno_id?: string;
  aluno_matricula?: string;
  
  // === CAMPOS CRÍTICOS PARA ALERTAS ===
  tipo_alerta?: 'precisa_atencao' | 'celebrar' | 'aguardando_explicacao';
  estado: 'precisa_atencao' | 'celebrar' | 'neutro' | 'aguardando_explicacao';
  prioridade?: 'alta' | 'media' | 'baixa';
  
  // === CAMPOS DE FASE ===
  fase_id?: string | null;
  fase_origem_id?: string | null;
  turma_id?: string | null;
  
  // === DEMAIS CAMPOS ===
  // ... (mantém os existentes)
}

// No insert:
const tipoAlertaFinal = payload.tipo_alerta || payload.estado;

// Se estado é 'neutro', não criar alerta
if (tipoAlertaFinal === 'neutro') {
  return new Response({
    success: true,
    message: 'Estado neutro: nenhum alerta criado'
  });
}

const { data: novoAlerta } = await supabase
  .from("alertas_alunos")
  .insert({
    institution_id: aluno.institution_id,
    aluno_id: aluno.id,
    tipo_alerta: tipoAlertaFinal,           // ← CAMPO CRÍTICO
    motivo: "analise_n8n",                   // ← IDENTIFICA ORIGEM
    status: "ativo",                          // ← SEMPRE ATIVO
    notificacao_ativa: true,                  // ← MOSTRA BADGE
    fase_id: payload.fase_id || faseAtualId,  // ← FASE ATUAL
    fase_origem_id: payload.fase_origem_id || null,  // ← PARA FASE ANTERIOR
    dados_contexto: {
      ...dadosContexto,
      turma_id: payload.turma_id,
      prioridade: payload.prioridade || 'normal',
    },
  })
```

---

## Resultado Esperado

| N8N envia... | Aparece em... |
|--------------|---------------|
| `tipo_alerta: 'precisa_atencao'` | 🔴 Precisam de você |
| `tipo_alerta: 'celebrar'` | ✨ Celebre |
| `tipo_alerta: 'aguardando_explicacao'` | 💬 Precisa de justificativa |
| `fase_origem_id: '<UUID diferente>'` | 🕐 Fase Anterior |
| `estado: 'neutro'` | (não cria alerta) |

---

## Exemplo de Payload Completo do N8N

```json
{
  "aluno_matricula": "2024001234",
  "tipo_alerta": "precisa_atencao",
  "estado": "precisa_atencao",
  "prioridade": "alta",
  "fase_id": "uuid-fase-atual",
  "fase_origem_id": null,
  "turma_id": "uuid-turma",
  
  "tipo_recomendacao": "INVESTIGAÇÃO GENTIL",
  "nome_recomendacao": "Resgate da Confiança",
  "texto_acontecendo": "Adryan apresentou sinais de atenção consecutivos",
  "por_que_este_tipo": "Os sinais indicam possível bloqueio...",
  
  "elemento_ponte": {
    "forcas": "Linguística",
    "area_dificuldade": "comunicação"
  },
  
  "o_que_fazer_agora": {
    "objetivo": "Reconectar com ambiente",
    "contexto": "Momento privado",
    "script_principal": "Adryan, quero te ouvir...",
    "como_escutar": "ESCUTE SEM JULGAR"
  },
  
  "use_a_forca": {
    "forcas_utilizadas": "Linguística",
    "opcao_a": {
      "nome": "Escrita Livre",
      "script": "Escreve algo que só você vai ler",
      "por_que_funciona": "Permite expressão sem pressão"
    },
    "opcao_b": {
      "nome": "Registro Privado",
      "script": "Quer fazer um registro secreto?",
      "por_que_funciona": "Oferece controle e espaço"
    }
  },
  
  "como_reagir": {
    "se_aceitar": "Valeu por compartilhar",
    "se_recusar": "Tudo bem. Quando quiser, me avisa",
    "alerta": "NÃO INSISTA"
  },
  
  "o_que_nao_fazer": [
    "Não perguntar 'o que aconteceu?'",
    "Não demonstrar ansiedade",
    "Não comparar com antes",
    "Não forçar explicações",
    "Não fazer perguntas que sugiram problema"
  ],
  
  "mensagem_professor": "Adryan precisa de espaço e acolhimento",
  
  "padrao_identificado": {
    "nome": "Sinais de Atenção Consecutivos",
    "significado": "Apresentou 'Estava pesado' e 'Conflitou'"
  }
}
```

---

## Ordem de Implementação

1. **Atualizar Edge Function** - Aceitar `tipo_alerta` explícito
2. **Testar via curl** - Enviar payload de teste
3. **Verificar dashboard** - Confirmar que alerta aparece no card correto

