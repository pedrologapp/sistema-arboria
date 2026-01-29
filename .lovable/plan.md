

# Plano: Atualizar Webhook de Observações com Payload Enriquecido

## Objetivo

Atualizar a função `trigger_notificar_n8n_observacao` para incluir todos os campos solicitados no payload do webhook N8N.

---

## Análise: Campos Disponíveis no Banco

| Campo Solicitado | Tabela Origem | Disponível |
|------------------|---------------|------------|
| `aluno.matricula_externa` | `profiles.matricula_externa` | ✅ |
| `aluno.segmento` | `profiles.segmento` | ✅ |
| `aluno.casa_nome` | `inteligencias.nome` (via casa_id) | ✅ |
| `sinal.emoji` | `sinais.emoji` | ✅ |
| `sinal.peso` | `sinais.peso_inteligencia` | ✅ |
| `inteligencias.expressa_nome/emoji` | `inteligencias` (via inteligencia_expressa) | ✅ |
| `inteligencias.fase_nome/emoji` | `inteligencias` (via inteligencia_fase) | ✅ |
| `contexto.fase_numero` | `fases.numero_fase` | ✅ |
| `contexto.turma_completa` | `turmas.nome` ou concat | ✅ |

---

## Alteração: Nova Função SQL

Substituir a função `trigger_notificar_n8n_observacao` por uma versão enriquecida com JOINs adicionais.

### Mudanças Principais

1. **Query do Aluno**: Adicionar `matricula_externa`, `segmento` e JOIN com `inteligencias` para `casa_nome`
2. **Query do Sinal**: Adicionar `emoji` e `peso_inteligencia`
3. **Novas Queries**: Buscar dados das inteligências `expressa` e `fase`
4. **Query da Fase**: Buscar `numero_fase`
5. **Query da Turma**: Buscar `nome` (turma_completa)

### Nova Estrutura do Payload

```json
{
  "evento": "observacao_criada",
  "observacao_id": "uuid",
  "timestamp": "2026-01-29T10:30:00Z",
  
  "aluno": {
    "id": "uuid",
    "matricula_externa": "2169.2025",
    "nome": "João Silva",
    "serie": "6º Ano",
    "turma": "A",
    "segmento": "fundamental2",
    "casa_id": 1,
    "casa_nome": "Linguística"
  },
  
  "professor": {
    "id": "uuid",
    "nome": "Maria Santos"
  },
  
  "sinal": {
    "id": 5,
    "codigo": "brilhou",
    "emoji": "⭐",
    "label": "Brilhou",
    "valencia": "positivo",
    "pilar": "cognitivo",
    "peso": 15
  },
  
  "inteligencias": {
    "expressa_id": 1,
    "expressa_nome": "Linguística",
    "expressa_emoji": "📝",
    "fase_id": 2,
    "fase_nome": "Lógico-Matemática",
    "fase_emoji": "🔢",
    "foi_cross_im": true
  },
  
  "observacao": {
    "texto": "Participou ativamente...",
    "data": "2026-01-29",
    "intensidade": "normal"
  },
  
  "contexto": {
    "institution_id": "uuid",
    "fase_id": "uuid",
    "fase_numero": 2,
    "turma_id": "uuid",
    "turma_completa": "6º A"
  }
}
```

---

## SQL da Nova Função

```sql
CREATE OR REPLACE FUNCTION public.trigger_notificar_n8n_observacao()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_aluno RECORD;
  v_casa RECORD;
  v_professor RECORD;
  v_sinal RECORD;
  v_im_expressa RECORD;
  v_im_fase RECORD;
  v_fase RECORD;
  v_turma RECORD;
  v_payload JSONB;
BEGIN
  -- 1. Buscar dados do aluno (com campos adicionais)
  SELECT id, full_name, nome, serie, turma, casa_id, 
         matricula_externa, segmento
  INTO v_aluno
  FROM profiles
  WHERE id = NEW.aluno_id;

  -- 2. Buscar nome da casa do aluno
  SELECT nome, emoji INTO v_casa
  FROM inteligencias
  WHERE id = v_aluno.casa_id;

  -- 3. Buscar dados do professor
  SELECT id, full_name, nome
  INTO v_professor
  FROM profiles
  WHERE id = NEW.professor_id;

  -- 4. Buscar dados do sinal (com emoji e peso)
  SELECT id, codigo, emoji, label_pt, valencia, pilar, peso_inteligencia
  INTO v_sinal
  FROM sinais
  WHERE id = NEW.sinal_id;

  -- 5. Buscar inteligência EXPRESSA
  SELECT id, nome, emoji INTO v_im_expressa
  FROM inteligencias
  WHERE id = NEW.inteligencia_expressa;

  -- 6. Buscar inteligência da FASE
  SELECT id, nome, emoji INTO v_im_fase
  FROM inteligencias
  WHERE id = NEW.inteligencia_fase;

  -- 7. Buscar dados da fase
  SELECT id, numero_fase INTO v_fase
  FROM fases
  WHERE id = NEW.fase_id;

  -- 8. Buscar dados da turma
  SELECT id, nome INTO v_turma
  FROM turmas
  WHERE id = NEW.turma_id;

  -- Montar payload JSON estruturado e enriquecido
  v_payload := jsonb_build_object(
    'evento', 'observacao_criada',
    'observacao_id', NEW.id,
    'timestamp', NEW.created_at,
    
    'aluno', jsonb_build_object(
      'id', v_aluno.id,
      'matricula_externa', v_aluno.matricula_externa,
      'nome', COALESCE(v_aluno.full_name, v_aluno.nome),
      'serie', v_aluno.serie,
      'turma', v_aluno.turma,
      'segmento', v_aluno.segmento,
      'casa_id', v_aluno.casa_id,
      'casa_nome', v_casa.nome
    ),
    
    'professor', jsonb_build_object(
      'id', v_professor.id,
      'nome', COALESCE(v_professor.full_name, v_professor.nome)
    ),
    
    'sinal', jsonb_build_object(
      'id', v_sinal.id,
      'codigo', v_sinal.codigo,
      'emoji', v_sinal.emoji,
      'label', v_sinal.label_pt,
      'valencia', v_sinal.valencia,
      'pilar', v_sinal.pilar,
      'peso', v_sinal.peso_inteligencia
    ),
    
    'inteligencias', jsonb_build_object(
      'expressa_id', v_im_expressa.id,
      'expressa_nome', v_im_expressa.nome,
      'expressa_emoji', v_im_expressa.emoji,
      'fase_id', v_im_fase.id,
      'fase_nome', v_im_fase.nome,
      'fase_emoji', v_im_fase.emoji,
      'foi_cross_im', NEW.foi_cross_im
    ),
    
    'observacao', jsonb_build_object(
      'texto', NEW.observacao_texto,
      'data', NEW.data_observacao,
      'intensidade', NEW.intensidade
    ),
    
    'contexto', jsonb_build_object(
      'institution_id', NEW.institution_id,
      'fase_id', NEW.fase_id,
      'fase_numero', v_fase.numero_fase,
      'turma_id', NEW.turma_id,
      'turma_completa', v_turma.nome
    )
  );

  -- Enviar para N8N via pg_net (assíncrono)
  PERFORM net.http_post(
    url := 'https://n8n.escolaamadeus.com/webhook-test/projetoarboria',
    body := v_payload,
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    )
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Falha silenciosa - não bloqueia o registro da observação
  RAISE WARNING 'Webhook N8N falhou: %', SQLERRM;
  RETURN NEW;
END;
$function$;
```

---

## Resultado

| Antes | Depois |
|-------|--------|
| 12 campos no payload | 28 campos no payload |
| Apenas IDs de inteligências | Nomes + Emojis das inteligências |
| Sem matrícula externa | ✅ `matricula_externa` para match externo |
| Sem segmento | ✅ `segmento` para filtros |
| Sem informações visuais | ✅ Emojis de sinais e inteligências |
| Texto solto | ✅ Objeto `observacao` estruturado |

---

## Implementação

Uma única migração SQL para substituir a função existente:

| Arquivo | Ação |
|---------|------|
| Nova migração SQL | `CREATE OR REPLACE FUNCTION trigger_notificar_n8n_observacao()` |

O trigger existente `trg_notificar_n8n_observacao` continuará funcionando automaticamente com a nova função.

