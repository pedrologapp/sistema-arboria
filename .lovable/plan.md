

# Plano: Corrigir Payload do Webhook de Explicação do Professor

## Diagnóstico

### Estrutura Real do `dados_contexto` no Banco

Baseado na query do banco, o N8N envia:

```json
{
  "estado": "aguardando_explicacao",
  "gerado_por": "n8n",
  "prioridade": "urgente",
  "requer_resposta": true,
  "mensagem_professor": "Professor(a), você registrou...",
  "texto_acontecendo": "**O QUE HAVIA ANTES:**\nAdryan...",
  "timestamp_analise": "2026-02-02T14:56:06.220Z",
  
  // CAMPOS QUE ESTÃO NULL NO BANCO:
  "tipo_contradicao": null,
  "sugestao_anterior_resumo": null,
  "observacao_nova": null,
  "perguntas_professor": [],
  "observacao_gatilho_id": null
}
```

### Problema Identificado

O payload atual tenta usar campos que estão vazios/null no banco:

| Campo no Payload | Valor Atual | Motivo |
|------------------|-------------|--------|
| `explicacao.tipo_contradicao` | `""` | N8N não envia este campo estruturado |
| `explicacao.perguntas_apresentadas` | `[]` | N8N não envia array de perguntas |
| `explicacao.sugestao_anterior_resumo` | `""` | N8N não envia este campo |
| `explicacao.observacao_nova` | `""` | N8N não envia este campo |
| `sugestao_anterior` | `null` | N8N não envia objeto estruturado |
| `observacao_contraditoria` | `null` | N8N não envia objeto estruturado |
| `aluno.casa_nome` | `undefined` | Não estava sendo buscado |

---

## Solução

### 1. Melhorar Query de Dados do Aluno

O modal já faz uma query para buscar dados do aluno, mas não inclui o JOIN com `inteligencias` para pegar `casa_nome`:

**De:**
```typescript
const { data: alunoData } = await supabase
  .from('profiles')
  .select('id, nome, sobrenome, serie, turma, casa_id, matricula_externa, segmento')
  .eq('id', alerta.aluno.id)
  .single();
```

**Para:**
```typescript
const { data: alunoData } = await supabase
  .from('profiles')
  .select(`
    id, nome, sobrenome, serie, turma, casa_id, matricula_externa, segmento,
    inteligencias:inteligencias!profiles_casa_id_fkey (
      id, nome, emoji
    )
  `)
  .eq('id', alerta.aluno.id)
  .single();
```

### 2. Inferir `tipo_contradicao` do Texto

Como o N8N não envia `tipo_contradicao` estruturado, inferir a partir do `texto_acontecendo`:

```typescript
const inferirTipoContradicao = (): string => {
  const texto = alerta.texto_acontecendo?.toLowerCase() || '';
  // Estava em atenção → registrou positivo
  if (texto.includes('atenção') && texto.includes('positivo')) {
    return 'atencao_para_celebracao';
  }
  // Estava em celebração → registrou negativo
  if ((texto.includes('celebr') || texto.includes('positiv')) && 
      (texto.includes('negativo') || texto.includes('dificuldade'))) {
    return 'celebracao_para_atencao';
  }
  return 'contradicao_detectada';
};
```

### 3. Montar Payload Completo

**Arquivo:** `src/components/professor/ExplicacaoContradicaoModal.tsx`

```typescript
const handleEnviar = async () => {
  // 1. Buscar dados COMPLETOS do aluno (com JOIN para casa)
  const { data: alunoData } = await supabase
    .from('profiles')
    .select(`
      id, nome, sobrenome, serie, turma, casa_id, matricula_externa, segmento,
      inteligencias:inteligencias!profiles_casa_id_fkey (id, nome, emoji)
    `)
    .eq('id', alerta.aluno.id)
    .single();

  // 2. Extrair dados da casa
  const casaInfo = alunoData?.inteligencias as { id: number; nome: string; emoji: string } | null;
  
  // 3. Inferir valencia e tipo de contradição
  const valencia = inferirValencia();
  const tipoContradicao = alerta.tipo_contradicao || inferirTipoContradicao();
  
  // 4. Montar turma completa
  const turmaCompleta = `${alunoData?.serie || ''} ${alunoData?.turma || ''}`.trim();

  // 5. Payload COMPLETO
  const webhookPayload = {
    evento: 'explicacao_professor_enviada',
    tipo: 'resposta_explicacao',
    
    aluno: {
      id: alunoData?.id || alerta.aluno.id,
      nome: alunoData ? `${alunoData.nome} ${alunoData.sobrenome}`.trim() : alerta.aluno.nome,
      matricula: alunoData?.matricula_externa || null,
      serie: alunoData?.serie || alerta.aluno.serie,
      turma: alunoData?.turma || alerta.aluno.turma,
      turma_completa: turmaCompleta,
      casa_id: alunoData?.casa_id || null,
      casa_nome: casaInfo?.nome || null,
      casa_emoji: casaInfo?.emoji || null,
      segmento: alunoData?.segmento || null
    },
    
    contexto: {
      fase_id: faseAtual?.id || null,
      fase_numero: faseAtual?.numero_fase || null,
      inteligencia_fase: faseAtual?.inteligencia?.nome || null,
      institution_id: profile.institution_id
    },
    
    professor: {
      id: profile.id,
      nome: profile.full_name || profile.nome || 'Professor'
    },
    
    explicacao: {
      tipo_registro: 'explicacao_professor',
      tipo_contradicao: tipoContradicao,
      perguntas_apresentadas: alerta.perguntas_professor?.length > 0 
        ? alerta.perguntas_professor 
        : null,
      sugestao_anterior_resumo: alerta.sugestao_anterior_resumo || null,
      observacao_nova: alerta.observacao_nova || null,
      resposta_professor: explicacao.trim(),
      acao_escolhida: acaoSelecionada,
      valencia: valencia,
      alerta_id: alerta.id
    },
    
    // Contexto estruturado (quando disponível do N8N)
    sugestao_anterior: alerta.sugestao_anterior || null,
    observacao_contraditoria: alerta.observacao_contraditoria || null,
    
    // Contexto de texto (sempre disponível do N8N)
    texto_acontecendo: alerta.texto_acontecendo || null,
    mensagem_professor_original: alerta.mensagem_professor || null,
    
    timestamp: new Date().toISOString()
  };
};
```

---

## Resultado Esperado

**Payload Anterior (incompleto):**
```json
{
  "aluno": { "id": "...", "nome": "Adryan", "casa_id": 1 },
  "explicacao": { "tipo_contradicao": "", "valencia": "positiva" },
  "sugestao_anterior": null,
  "observacao_contraditoria": null
}
```

**Payload Corrigido (completo):**
```json
{
  "aluno": {
    "id": "84938726-...",
    "nome": "Adryan Samuel da Silva Dantas",
    "matricula": "22872026",
    "serie": "6º Ano",
    "turma": "A",
    "turma_completa": "6º Ano A",
    "casa_id": 1,
    "casa_nome": "Linguística",
    "casa_emoji": "📝",
    "segmento": "fundamental2"
  },
  "contexto": {
    "fase_id": "9e1574c5-...",
    "fase_numero": 5,
    "inteligencia_fase": "Linguística",
    "institution_id": "902876e9-..."
  },
  "explicacao": {
    "tipo_registro": "explicacao_professor",
    "tipo_contradicao": "atencao_para_celebracao",
    "resposta_professor": "Adryan melhorou...",
    "acao_escolhida": "confirmar",
    "valencia": "positiva",
    "alerta_id": "95097e37-..."
  },
  "texto_acontecendo": "**O QUE HAVIA ANTES:** Adryan...",
  "mensagem_professor_original": "Professor(a), você registrou...",
  "timestamp": "2026-02-02T16:59:58.771Z"
}
```

---

## Arquivo a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/professor/ExplicacaoContradicaoModal.tsx` | Melhorar query do aluno com JOIN, adicionar função `inferirTipoContradicao`, expandir payload do webhook |

---

## Campos Adicionados ao Payload

| Campo | Fonte | Descrição |
|-------|-------|-----------|
| `aluno.turma_completa` | Calculado | "6º Ano A" |
| `aluno.casa_nome` | JOIN inteligencias | "Linguística" |
| `aluno.casa_emoji` | JOIN inteligencias | "📝" |
| `contexto.fase_numero` | ProfessorContext | 5 |
| `contexto.inteligencia_fase` | ProfessorContext | "Linguística" |
| `explicacao.tipo_contradicao` | Inferido do texto | "atencao_para_celebracao" |
| `texto_acontecendo` | dados_contexto N8N | Texto formatado |
| `mensagem_professor_original` | dados_contexto N8N | Perguntas do N8N |

