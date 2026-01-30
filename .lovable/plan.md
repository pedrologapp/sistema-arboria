

# Plano: Enviar Ação do Professor para Webhook N8N (Payload Estruturado)

## Objetivo

Quando o professor salvar a ação no modal, enviar para o N8N com payload estruturado que segue o mesmo padrão das observações normais.

---

## Alterações Necessárias

### 1. Arquivo: `src/hooks/usePerfilAluno.ts`

**Adicionar campos à interface e query**

| Campo | Descrição |
|-------|-----------|
| `matriculaExterna` | Matrícula externa do aluno |
| `segmento` | Segmento educacional |
| `turmaId` | ID da turma do aluno |
| `institutionId` | ID da instituição |
| `faseAtualId` | ID da fase atual |

**Mudanças na interface `PerfilAlunoData` (linhas 64-103):**
```typescript
// Adicionar campos
matriculaExterna?: string;
segmento?: string;
turmaId?: string;
institutionId?: string;
faseAtualId?: string;
```

**Mudanças na query (linhas 157-171):**
```typescript
// Adicionar ao SELECT
matricula_externa,
segmento,
turma_id
```

**Mudanças no retorno (linhas 808-834):**
```typescript
matriculaExterna: aluno.matricula_externa || undefined,
segmento: aluno.segmento || undefined,
turmaId: aluno.turma_id || undefined,
institutionId: aluno.institution_id || undefined,
faseAtualId: faseAtual?.id || undefined
```

---

### 2. Arquivo: `src/components/professor/RegistrarAcaoModal.tsx`

**Expandir interface de props:**

```typescript
interface RegistrarAcaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  nomeAluno: string;
  alunoId: string;
  alertaId: string;
  onSalvar: () => void;
  // Novos campos para o payload N8N
  alunoData?: {
    matricula?: string;
    serie?: string;
    turma?: string;
    casaId?: number;
    turmaId?: string;
    segmento?: string;
    institutionId?: string;
    faseId?: string;
  };
}
```

**Adicionar função `enviarParaN8N`:**

```typescript
const enviarParaN8N = async () => {
  const timestampAtual = new Date().toISOString();
  const dataAtual = timestampAtual.split('T')[0]; // YYYY-MM-DD
  
  const payload = {
    evento: 'acao_professor_registrada',
    
    aluno: {
      id: alunoId,
      nome: nomeAluno,
      matricula: alunoData?.matricula || '',
      serie: alunoData?.serie || '',
      turma: alunoData?.turma || '',
      casa_id: alunoData?.casaId || 0
    },
    
    contexto: {
      fase_id: alunoData?.faseId || '',
      turma_id: alunoData?.turmaId || '',
      turma_completa: `${alunoData?.serie || ''} ${alunoData?.turma || ''}`.trim(),
      segmento: alunoData?.segmento || '',
      institution_id: alunoData?.institutionId || profile?.institution_id || ''
    },
    
    professor: {
      id: profile?.id || '',
      nome: profile?.full_name || profile?.nome || ''
    },
    
    acao: {
      tipo_registro: 'acao_professor',
      descricao: descricao.trim(),
      causa_provavel: categoria,
      status_aluno: statusAluno === 'melhorou' ? 'melhorou' : 'em_acompanhamento',
      alerta_id: alertaId
    },
    
    sinal: {
      codigo: 'acao_professor',
      nome: 'Ação do Professor',
      valencia: 'acao'
    },
    
    timestamp: timestampAtual,
    data_observacao: dataAtual
  };
  
  try {
    await fetch('https://n8n.escolaamadeus.com/webhook-test/projetoarboria', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    console.log('Ação enviada para N8N:', payload);
  } catch (error) {
    console.warn('Falha ao enviar para N8N (não crítico):', error);
  }
};
```

**Modificar `handleSalvar` (após linha 103):**

```typescript
// Após onSalvar() e antes de onClose()
// Enviar para N8N de forma assíncrona (fire-and-forget)
enviarParaN8N();
```

---

### 3. Arquivo: `src/pages/professor/PerfilAlunoPage.tsx`

**Passar dados adicionais para o modal (linhas 394-402):**

```tsx
<RegistrarAcaoModal
  isOpen={modalRegistrarOpen}
  onClose={() => setModalRegistrarOpen(false)}
  nomeAluno={aluno.nome}  // Nome completo
  alunoId={aluno.id}
  alertaId={aluno.alertaAtivo?.alertaId || ''}
  onSalvar={handleSalvarAcao}
  alunoData={{
    matricula: aluno.matriculaExterna,
    serie: aluno.serie,
    turma: aluno.turma,
    casaId: aluno.casaId,
    turmaId: aluno.turmaId,
    segmento: aluno.segmento,
    institutionId: aluno.institutionId,
    faseId: aluno.faseAtualId
  }}
/>
```

---

## Payload Final Enviado ao N8N

```json
{
  "evento": "acao_professor_registrada",
  
  "aluno": {
    "id": "84938726-22bb-48fe-9263-4a20cc2af164",
    "nome": "Adryan Gabriel Dias Guimarães",
    "matricula": "22872026",
    "serie": "6º Ano",
    "turma": "A",
    "casa_id": 1
  },
  
  "contexto": {
    "fase_id": "uuid-da-fase",
    "turma_id": "uuid-da-turma",
    "turma_completa": "6º Ano A",
    "segmento": "fundamental2",
    "institution_id": "uuid-da-instituicao"
  },
  
  "professor": {
    "id": "uuid-do-professor",
    "nome": "Professora Maria"
  },
  
  "acao": {
    "tipo_registro": "acao_professor",
    "descricao": "Conversei em particular com o aluno...",
    "causa_provavel": "fator_escolar",
    "status_aluno": "em_acompanhamento",
    "alerta_id": "uuid-do-alerta"
  },
  
  "sinal": {
    "codigo": "acao_professor",
    "nome": "Ação do Professor",
    "valencia": "acao"
  },
  
  "timestamp": "2026-01-30T14:30:00.000Z",
  "data_observacao": "2026-01-30"
}
```

---

## Fluxo de Execução

```text
┌─────────────────────────────────────────────────────────────┐
│ Professor preenche formulário e clica "Salvar"              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. Inserir em acoes_professor (banco local)                 │
│ 2. Atualizar alertas_alunos (status)                        │
│ 3. Invalidar queries                                        │
│ 4. Toast de sucesso                                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Fire-and-forget: POST para N8N                           │
│    - Não bloqueia o fluxo                                   │
│    - Log de warning se falhar                               │
│    - Payload estruturado igual observações                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. Fechar modal                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/hooks/usePerfilAluno.ts` | Adicionar campos: `matriculaExterna`, `segmento`, `turmaId`, `institutionId`, `faseAtualId` |
| `src/components/professor/RegistrarAcaoModal.tsx` | Nova prop `alunoData`, função `enviarParaN8N()` |
| `src/pages/professor/PerfilAlunoPage.tsx` | Passar `alunoData` com todos os campos ao modal |

---

## Comportamento de Erro

- Se o webhook falhar, **não bloqueia** o fluxo principal
- O salvamento local sempre funciona primeiro
- `console.warn` para debugging
- Professor não vê erro (ação foi salva localmente)

