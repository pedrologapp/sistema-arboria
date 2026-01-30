
# Plano: Refatoração Completa - Card de Sugestão N8N

## Diagnóstico dos Erros de Build

O hook `usePerfilAluno.ts` tem erros de sintaxe na linha 539, onde há uma chave `}` extra fechando o bloco prematuramente:

```typescript
// Linha 538
}));
}
}  // <-- LINHA 539: Esta chave extra quebra o código
```

## Arquitetura da Refatoração

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                     REFATORAÇÃO COMPLETA                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. CORRIGIR ERROS DE BUILD                                              │
│     → Remover chave extra na linha 539                                   │
│                                                                          │
│  2. CRIAR INTERFACE TYPESCRIPT FIXA                                      │
│     → SugestaoN8NPayload                                                 │
│     → Contrato de dados exato                                            │
│                                                                          │
│  3. ATUALIZAR EDGE FUNCTION                                              │
│     → Aceitar campos novos                                               │
│     → tipo_recomendacao, nome_recomendacao                               │
│     → o_que_fazer_agora, use_a_forca                                     │
│                                                                          │
│  4. CRIAR COMPONENTE COM SLOTS FIXOS                                     │
│     → SugestaoN8NCard.tsx                                                │
│     → Mapeamento direto: campo → slot                                    │
│                                                                          │
│  5. INTEGRAR COM FLUXO EXISTENTE                                         │
│     → Hook extrai dados do dados_contexto                                │
│     → Page renderiza SugestaoN8NCard quando geradoPorN8N                 │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Corrigir Erros de Build

### Arquivo: `src/hooks/usePerfilAluno.ts`

**Problema**: Linha 539 tem uma chave extra `}` que fecha o bloco prematuramente.

**Correção**: Remover a linha 539 (o `}` extra).

```typescript
// ANTES (linhas 537-540):
}));
}
}  // <-- REMOVER ESTA LINHA
          
// DEPOIS (linhas 537-539):
}));
}
```

---

## 2. Interface TypeScript Fixa

### Criar: `src/types/sugestaoN8N.ts`

```typescript
// Contrato de dados exato que o N8N envia
export interface SugestaoN8NPayload {
  // Identificação
  aluno_id?: string;
  aluno_matricula?: string;
  
  // Estado geral
  estado: 'precisa_atencao' | 'celebrar' | 'neutro' | 'aguardando_explicacao';
  prioridade: 'urgente' | 'importante' | 'normal';
  
  // Cabeçalho da recomendação
  tipo_recomendacao: string;        // Ex: "INVESTIGAÇÃO GENTIL"
  nome_recomendacao: string;        // Ex: "Resgate da Confiança Linguística"
  
  // Elemento de ponte
  elemento_ponte: {
    forcas: string;                 // Ex: "Linguística"
    area_dificuldade: string;       // Ex: "comunicação e engajamento"
  };
  
  // Justificativa
  por_que_este_tipo: string;
  
  // Ação principal
  o_que_fazer_agora: {
    objetivo: string;
    contexto: string;
    script_principal: string;       // FRASE EXATA para o professor dizer
    como_escutar: string;
  };
  
  // Opções alternativas
  use_a_forca: {
    forcas_utilizadas: string;
    opcao_a: {
      nome: string;
      script: string;               // FRASE EXATA
      por_que_funciona: string;
    };
    opcao_b: {
      nome: string;
      script: string;               // FRASE EXATA
      por_que_funciona: string;
    };
  };
  
  // Reações
  como_reagir: {
    se_aceitar: string;
    se_recusar: string;
    alerta: string;
  };
  
  // Proibições
  o_que_nao_fazer: string[];
  
  // Mensagem final
  mensagem_professor: string;
  
  // Padrão detectado
  padrao_identificado: {
    nome: string;
    significado: string;
  };
  
  // Sinal gatilho
  sinal_principal: string;
  sinal_codigo: string;
}

// Interface para props do componente (mapeamento direto)
export interface SugestaoN8NCardProps {
  // Header
  tipoRecomendacao: string;
  nomeRecomendacao: string;
  prioridade: 'urgente' | 'importante' | 'normal';
  
  // Elemento de ponte
  elementoPonte: {
    forcas: string;
    areaDificuldade: string;
  };
  
  // Padrão
  padraoIdentificado: {
    nome: string;
    significado: string;
  };
  
  // Justificativa
  porQueEsteTipo: string;
  
  // Ação principal
  oQueFazerAgora: {
    objetivo: string;
    contexto: string;
    scriptPrincipal: string;
    comoEscutar: string;
  };
  
  // Opções
  useAForca: {
    forcasUtilizadas: string;
    opcaoA: {
      nome: string;
      script: string;
      porQueFunciona: string;
    };
    opcaoB: {
      nome: string;
      script: string;
      porQueFunciona: string;
    };
  };
  
  // Reações
  comoReagir: {
    seAceitar: string;
    seRecusar: string;
    alerta: string;
  };
  
  // Proibições
  oQueNaoFazer: string[];
  
  // Mensagem
  mensagemProfessor: string;
  
  // Ações
  onRegistrarAcao?: () => void;
}
```

---

## 3. Atualizar Edge Function

### Arquivo: `supabase/functions/receber-sugestao-n8n/index.ts`

**Adicionar campos à interface:**

```typescript
interface SugestaoPayload {
  // ... campos existentes ...
  
  // NOVOS CAMPOS
  tipo_recomendacao?: string;
  nome_recomendacao?: string;
  por_que_este_tipo?: string;
  
  o_que_fazer_agora?: {
    objetivo: string;
    contexto: string;
    script_principal: string;
    como_escutar: string;
  };
  
  use_a_forca?: {
    forcas_utilizadas: string;
    opcao_a: {
      nome: string;
      script: string;
      por_que_funciona: string;
    };
    opcao_b: {
      nome: string;
      script: string;
      por_que_funciona: string;
    };
  };
}
```

**Adicionar ao dadosContexto:**

```typescript
const dadosContexto = {
  // ... campos existentes ...
  
  // NOVOS CAMPOS
  tipo_recomendacao: payload.tipo_recomendacao || null,
  nome_recomendacao: payload.nome_recomendacao || null,
  por_que_este_tipo: payload.por_que_este_tipo || null,
  o_que_fazer_agora: payload.o_que_fazer_agora || null,
  use_a_forca: payload.use_a_forca || null,
};
```

---

## 4. Criar Componente SugestaoN8NCard

### Arquivo: `src/components/professor/SugestaoN8NCard.tsx`

**Estrutura de Slots Fixos:**

| Slot | Componente | Comportamento |
|------|------------|---------------|
| HEADER | Tipo + Nome + Badge | Sempre visível |
| ELEMENTO DE PONTE | Força → Dificuldade | Sempre visível |
| PADRÃO DETECTADO | Nome + Significado | Sempre visível |
| JUSTIFICATIVA | Por que este tipo | Colapsável (fechado) |
| AÇÃO PRINCIPAL | Objetivo + Script | Sempre aberto |
| OPÇÃO A | Script A | Colapsável (fechado) |
| OPÇÃO B | Script B | Colapsável (fechado) |
| COMO REAGIR | Aceitar/Recusar/Alerta | Sempre visível |
| O QUE NÃO FAZER | Lista de 5 itens | Sempre visível |
| MENSAGEM | Texto final | Sempre visível |
| AÇÃO | Botão registrar | Sempre visível |

**Código do Componente:**

```tsx
import { useState } from 'react';
import { ChevronDown, ChevronUp, Target, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SugestaoN8NCardProps } from '@/types/sugestaoN8N';

export function SugestaoN8NCard({
  tipoRecomendacao,
  nomeRecomendacao,
  prioridade,
  elementoPonte,
  padraoIdentificado,
  porQueEsteTipo,
  oQueFazerAgora,
  useAForca,
  comoReagir,
  oQueNaoFazer,
  mensagemProfessor,
  onRegistrarAcao
}: SugestaoN8NCardProps) {
  // Estados para colapsáveis
  const [justificativaAberta, setJustificativaAberta] = useState(false);
  const [opcaoAAberta, setOpcaoAAberta] = useState(false);
  const [opcaoBAberta, setOpcaoBAberta] = useState(false);
  
  // Cor do badge de prioridade
  const prioridadeConfig = {
    urgente: { bg: 'bg-red-500', text: 'text-white' },
    importante: { bg: 'bg-amber-500', text: 'text-black' },
    normal: { bg: 'bg-blue-500', text: 'text-white' }
  };
  
  return (
    <div className="rounded-xl border-2 border-red-600 bg-[#7F1D1D] overflow-hidden">
      {/* SLOT: HEADER */}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-5 h-5 text-red-300" />
          <span className="text-xs font-semibold uppercase tracking-wider text-white">
            ALERTA ATIVO
          </span>
          <span className={cn(
            'ml-auto text-xs font-semibold px-2 py-0.5 rounded',
            prioridadeConfig[prioridade].bg,
            prioridadeConfig[prioridade].text
          )}>
            {prioridade.toUpperCase()}
          </span>
        </div>
        
        {/* Tipo + Nome da Recomendação */}
        {tipoRecomendacao && (
          <div className="mb-4 p-3 bg-amber-900/30 rounded-lg border border-amber-500/30">
            <p className="text-amber-400 text-xs uppercase tracking-wide font-semibold">
              🎯 {tipoRecomendacao}
            </p>
            {nomeRecomendacao && (
              <p className="text-white font-medium mt-1">
                {nomeRecomendacao}
              </p>
            )}
          </div>
        )}
        
        {/* SLOT: ELEMENTO DE PONTE */}
        {elementoPonte && (
          <div className="mb-4 p-3 bg-purple-900/20 rounded-lg border border-purple-500/20">
            <p className="text-purple-400 text-xs font-semibold uppercase tracking-wide mb-2">
              🔗 PONTE
            </p>
            <div className="flex items-center gap-2 text-sm flex-wrap">
              <span className="text-white font-medium">
                {elementoPonte.forcas}
              </span>
              <span className="text-purple-400">→</span>
              <span className="text-white/80">
                {elementoPonte.areaDificuldade}
              </span>
            </div>
          </div>
        )}
        
        {/* SLOT: PADRÃO DETECTADO */}
        {padraoIdentificado && (
          <div className="mb-4 p-3 bg-black/30 rounded-lg border border-white/10">
            <p className="text-xs font-semibold text-amber-400 uppercase tracking-wide mb-1">
              📊 Padrão Detectado
            </p>
            <p className="text-white text-sm font-medium">
              {padraoIdentificado.nome}
            </p>
            <p className="text-white/60 text-xs mt-1">
              {padraoIdentificado.significado}
            </p>
          </div>
        )}
        
        {/* SLOT: JUSTIFICATIVA (Colapsável) */}
        {porQueEsteTipo && (
          <div className="mb-4">
            <button
              onClick={() => setJustificativaAberta(!justificativaAberta)}
              className="w-full p-3 bg-black/20 rounded-lg flex items-center justify-between hover:bg-black/30 transition-colors"
            >
              <span className="text-white/60 text-xs font-semibold uppercase">
                💡 Por que este tipo
              </span>
              {justificativaAberta ? (
                <ChevronUp className="w-4 h-4 text-white/40" />
              ) : (
                <ChevronDown className="w-4 h-4 text-white/40" />
              )}
            </button>
            {justificativaAberta && (
              <div className="mt-2 p-3 bg-black/10 rounded-lg">
                <p className="text-white/80 text-sm leading-relaxed">
                  {porQueEsteTipo}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* SLOT: AÇÃO PRINCIPAL (Sempre aberto) */}
      {oQueFazerAgora && (
        <div className="px-4 pb-4">
          <div className="p-4 bg-black/30 rounded-lg border border-white/20">
            <h4 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
              📌 O QUE FAZER AGORA
            </h4>
            
            {oQueFazerAgora.objetivo && (
              <p className="text-white/80 text-sm mb-2">
                <strong>Objetivo:</strong> {oQueFazerAgora.objetivo}
              </p>
            )}
            
            {oQueFazerAgora.contexto && (
              <p className="text-white/60 text-sm mb-3">
                <strong>Contexto:</strong> {oQueFazerAgora.contexto}
              </p>
            )}
            
            {/* SCRIPT EM DESTAQUE */}
            {oQueFazerAgora.scriptPrincipal && (
              <div className="p-3 bg-blue-900/40 rounded-lg border border-blue-500/30 mb-3">
                <p className="text-blue-400 text-xs font-semibold mb-1">💬 DIGA:</p>
                <p className="text-white text-sm leading-relaxed italic">
                  "{oQueFazerAgora.scriptPrincipal}"
                </p>
              </div>
            )}
            
            {oQueFazerAgora.comoEscutar && (
              <p className="text-white/70 text-sm">
                <span className="text-amber-400">👂</span> {oQueFazerAgora.comoEscutar}
              </p>
            )}
          </div>
        </div>
      )}
      
      {/* SLOT: OPÇÃO A (Colapsável) */}
      {useAForca?.opcaoA && (
        <div className="px-4 pb-2">
          <div className="rounded-lg border border-amber-500/30 bg-amber-900/20 overflow-hidden">
            <button
              onClick={() => setOpcaoAAberta(!opcaoAAberta)}
              className="w-full p-3 flex items-center justify-between hover:bg-white/5"
            >
              <span className="text-white text-sm font-medium">
                🅰️ {useAForca.opcaoA.nome}
              </span>
              {opcaoAAberta ? (
                <ChevronUp className="w-4 h-4 text-white/40" />
              ) : (
                <ChevronDown className="w-4 h-4 text-white/40" />
              )}
            </button>
            {opcaoAAberta && (
              <div className="px-3 pb-3 space-y-2 border-t border-white/10">
                <div className="p-3 bg-blue-900/40 rounded-lg border border-blue-500/30 mt-3">
                  <p className="text-blue-400 text-xs font-semibold mb-1">💬 SCRIPT:</p>
                  <p className="text-white text-sm leading-relaxed italic">
                    "{useAForca.opcaoA.script}"
                  </p>
                </div>
                <p className="text-green-400/80 text-sm">
                  <span className="text-green-400">✓</span> {useAForca.opcaoA.porQueFunciona}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* SLOT: OPÇÃO B (Colapsável) */}
      {useAForca?.opcaoB && (
        <div className="px-4 pb-4">
          <div className="rounded-lg border border-amber-500/30 bg-amber-900/20 overflow-hidden">
            <button
              onClick={() => setOpcaoBAberta(!opcaoBAberta)}
              className="w-full p-3 flex items-center justify-between hover:bg-white/5"
            >
              <span className="text-white text-sm font-medium">
                🅱️ {useAForca.opcaoB.nome}
              </span>
              {opcaoBAberta ? (
                <ChevronUp className="w-4 h-4 text-white/40" />
              ) : (
                <ChevronDown className="w-4 h-4 text-white/40" />
              )}
            </button>
            {opcaoBAberta && (
              <div className="px-3 pb-3 space-y-2 border-t border-white/10">
                <div className="p-3 bg-blue-900/40 rounded-lg border border-blue-500/30 mt-3">
                  <p className="text-blue-400 text-xs font-semibold mb-1">💬 SCRIPT:</p>
                  <p className="text-white text-sm leading-relaxed italic">
                    "{useAForca.opcaoB.script}"
                  </p>
                </div>
                <p className="text-green-400/80 text-sm">
                  <span className="text-green-400">✓</span> {useAForca.opcaoB.porQueFunciona}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* SLOT: COMO REAGIR */}
      {comoReagir && (
        <div className="px-4 pb-4">
          <div className="p-3 bg-emerald-900/20 rounded-lg border border-emerald-500/20">
            <h4 className="text-sm font-semibold mb-3 text-emerald-400">
              🔄 COMO REAGIR
            </h4>
            <div className="space-y-2">
              <p className="text-sm text-white/90">
                <span className="text-green-400 mr-2">✅</span>
                <strong>Se aceitar:</strong> "{comoReagir.seAceitar}"
              </p>
              <p className="text-sm text-white/90">
                <span className="text-red-400 mr-2">❌</span>
                <strong>Se recusar:</strong> "{comoReagir.seRecusar}"
              </p>
              {comoReagir.alerta && (
                <p className="text-sm text-amber-400 font-semibold mt-2">
                  ⚠️ {comoReagir.alerta}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* SLOT: O QUE NÃO FAZER */}
      {oQueNaoFazer && oQueNaoFazer.length > 0 && (
        <div className="px-4 pb-4">
          <div className="p-3 bg-red-900/20 rounded-lg border border-red-500/20">
            <h4 className="text-sm font-semibold mb-2 text-red-400">
              ⚠️ O QUE NÃO FAZER
            </h4>
            <ul className="space-y-1">
              {oQueNaoFazer.map((item, i) => (
                <li key={i} className="text-sm text-white/80 flex items-start gap-2">
                  <span className="text-red-400 flex-shrink-0">✗</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      
      {/* SLOT: MENSAGEM PROFESSOR */}
      {mensagemProfessor && (
        <div className="px-4 pb-4">
          <div className="p-3 bg-blue-900/20 rounded-lg border border-blue-500/20">
            <h4 className="text-sm font-semibold mb-2 text-blue-400">
              💬 MENSAGEM PARA VOCÊ
            </h4>
            <p className="text-sm text-white/90 leading-relaxed italic">
              "{mensagemProfessor}"
            </p>
          </div>
        </div>
      )}
      
      {/* SLOT: BOTÃO AÇÃO */}
      {onRegistrarAcao && (
        <div className="px-4 pb-4">
          <button
            onClick={onRegistrarAcao}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 
                       hover:from-blue-500 hover:to-blue-400 transition-all duration-200
                       flex items-center justify-center gap-2 shadow-lg border border-blue-400/30"
          >
            <Target className="w-4 h-4 text-white" />
            <span className="text-white font-semibold">Registrar minha ação</span>
          </button>
        </div>
      )}
    </div>
  );
}
```

---

## 5. Atualizar Hook para Extrair Dados

### Arquivo: `src/hooks/usePerfilAluno.ts`

**Adicionar campos à interface AlertaAtivo:**

```typescript
interface AlertaAtivo {
  // ... campos existentes ...
  
  // Campos N8N completos
  tipoRecomendacao?: string;
  nomeRecomendacao?: string;
  porQueEsteTipo?: string;
  oQueFazerAgora?: {
    objetivo: string;
    contexto: string;
    scriptPrincipal: string;
    comoEscutar: string;
  };
  useAForca?: {
    forcasUtilizadas: string;
    opcaoA?: { nome: string; script: string; porQueFunciona: string };
    opcaoB?: { nome: string; script: string; porQueFunciona: string };
  };
}
```

**Extrair dados do dados_contexto (após linha 680):**

```typescript
// Novos campos estruturados do N8N
tipoRecomendacao: (dadosContexto?.tipo_recomendacao as string) || undefined,
nomeRecomendacao: (dadosContexto?.nome_recomendacao as string) || undefined,
porQueEsteTipo: (dadosContexto?.por_que_este_tipo as string) || undefined,
oQueFazerAgora: dadosContexto?.o_que_fazer_agora ? {
  objetivo: (dadosContexto.o_que_fazer_agora as any).objetivo,
  contexto: (dadosContexto.o_que_fazer_agora as any).contexto,
  scriptPrincipal: (dadosContexto.o_que_fazer_agora as any).script_principal,
  comoEscutar: (dadosContexto.o_que_fazer_agora as any).como_escutar
} : undefined,
useAForca: dadosContexto?.use_a_forca ? {
  forcasUtilizadas: (dadosContexto.use_a_forca as any).forcas_utilizadas,
  opcaoA: (dadosContexto.use_a_forca as any).opcao_a ? {
    nome: (dadosContexto.use_a_forca as any).opcao_a.nome,
    script: (dadosContexto.use_a_forca as any).opcao_a.script,
    porQueFunciona: (dadosContexto.use_a_forca as any).opcao_a.por_que_funciona
  } : undefined,
  opcaoB: (dadosContexto.use_a_forca as any).opcao_b ? {
    nome: (dadosContexto.use_a_forca as any).opcao_b.nome,
    script: (dadosContexto.use_a_forca as any).opcao_b.script,
    porQueFunciona: (dadosContexto.use_a_forca as any).opcao_b.por_que_funciona
  } : undefined
} : undefined,
```

---

## 6. Integrar na Página

### Arquivo: `src/pages/professor/PerfilAlunoPage.tsx`

**Lógica de renderização:**

```tsx
import { SugestaoN8NCard } from '@/components/professor/SugestaoN8NCard';

// Na renderização:
{aluno.alertaAtivo && aluno.alertaAtivo.geradoPorN8N && aluno.alertaAtivo.tipoRecomendacao ? (
  // NOVO COMPONENTE com mapeamento direto
  <SugestaoN8NCard
    tipoRecomendacao={aluno.alertaAtivo.tipoRecomendacao}
    nomeRecomendacao={aluno.alertaAtivo.nomeRecomendacao || ''}
    prioridade={(aluno.alertaAtivo.prioridade as any) || 'normal'}
    elementoPonte={aluno.alertaAtivo.elementoPonte ? {
      forcas: Array.isArray(aluno.alertaAtivo.elementoPonte.forcas) 
        ? aluno.alertaAtivo.elementoPonte.forcas.join(', ')
        : aluno.alertaAtivo.elementoPonte.forcas,
      areaDificuldade: aluno.alertaAtivo.elementoPonte.areaDificuldade
    } : { forcas: '', areaDificuldade: '' }}
    padraoIdentificado={aluno.alertaAtivo.padrao || { nome: '', significado: '' }}
    porQueEsteTipo={aluno.alertaAtivo.porQueEsteTipo || ''}
    oQueFazerAgora={aluno.alertaAtivo.oQueFazerAgora || {
      objetivo: '',
      contexto: '',
      scriptPrincipal: '',
      comoEscutar: ''
    }}
    useAForca={aluno.alertaAtivo.useAForca || {
      forcasUtilizadas: '',
      opcaoA: { nome: '', script: '', porQueFunciona: '' },
      opcaoB: { nome: '', script: '', porQueFunciona: '' }
    }}
    comoReagir={aluno.alertaAtivo.comoReagir || {
      seAceitar: '',
      seRecusar: '',
      alerta: ''
    }}
    oQueNaoFazer={aluno.alertaAtivo.oQueNaoFazer || []}
    mensagemProfessor={aluno.alertaAtivo.mensagemProfessor || ''}
    onRegistrarAcao={() => setShowRegistrarAcao(true)}
  />
) : aluno.alertaAtivo ? (
  // COMPONENTE ANTIGO para alertas não-N8N
  <FeedbackEstadoCard ... />
) : null}
```

---

## 7. Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/types/sugestaoN8N.ts` | **Criar** | Interface TypeScript fixa |
| `src/components/professor/SugestaoN8NCard.tsx` | **Criar** | Novo componente com slots fixos |
| `src/hooks/usePerfilAluno.ts` | **Modificar** | Corrigir erro + extrair campos |
| `supabase/functions/receber-sugestao-n8n/index.ts` | **Modificar** | Aceitar novos campos |
| `src/pages/professor/PerfilAlunoPage.tsx` | **Modificar** | Renderizar novo componente |
| `src/pages/professor/PerfilAlunoPageSimplificado.tsx` | **Modificar** | Paridade |

---

## 8. Regras de Mapeamento

| Campo N8N | Campo Props | Slot |
|-----------|-------------|------|
| `tipo_recomendacao` | `tipoRecomendacao` | HEADER |
| `nome_recomendacao` | `nomeRecomendacao` | HEADER |
| `prioridade` | `prioridade` | HEADER Badge |
| `elemento_ponte.forcas` | `elementoPonte.forcas` | PONTE |
| `elemento_ponte.area_dificuldade` | `elementoPonte.areaDificuldade` | PONTE |
| `padrao_identificado.nome` | `padraoIdentificado.nome` | PADRÃO |
| `por_que_este_tipo` | `porQueEsteTipo` | JUSTIFICATIVA |
| `o_que_fazer_agora.objetivo` | `oQueFazerAgora.objetivo` | AÇÃO PRINCIPAL |
| `o_que_fazer_agora.script_principal` | `oQueFazerAgora.scriptPrincipal` | AÇÃO PRINCIPAL (DIGA) |
| `use_a_forca.opcao_a.script` | `useAForca.opcaoA.script` | OPÇÃO A (SCRIPT) |
| `use_a_forca.opcao_b.script` | `useAForca.opcaoB.script` | OPÇÃO B (SCRIPT) |
| `como_reagir.se_aceitar` | `comoReagir.seAceitar` | COMO REAGIR |
| `como_reagir.alerta` | `comoReagir.alerta` | COMO REAGIR (⚠️) |
| `o_que_nao_fazer[]` | `oQueNaoFazer[]` | O QUE NÃO FAZER |
| `mensagem_professor` | `mensagemProfessor` | MENSAGEM |

---

## 9. Comportamento dos Slots

| Slot | Dados Existem | Dados Ausentes |
|------|---------------|----------------|
| HEADER | ✅ Renderiza | ✅ Renderiza título "ALERTA ATIVO" |
| ELEMENTO DE PONTE | ✅ Renderiza | ❌ Não renderiza |
| PADRÃO | ✅ Renderiza | ❌ Não renderiza |
| JUSTIFICATIVA | ✅ Colapsável | ❌ Não renderiza |
| AÇÃO PRINCIPAL | ✅ Sempre aberto | ❌ Não renderiza |
| OPÇÃO A | ✅ Colapsável | ❌ Não renderiza |
| OPÇÃO B | ✅ Colapsável | ❌ Não renderiza |
| COMO REAGIR | ✅ Renderiza | ❌ Não renderiza |
| O QUE NÃO FAZER | ✅ Renderiza lista | ❌ Não renderiza |
| MENSAGEM | ✅ Renderiza | ❌ Não renderiza |
| BOTÃO AÇÃO | ✅ Renderiza | ✅ Renderiza |

---

## 10. Ordem de Implementação

1. **Corrigir build** - Remover `}` extra no hook (linha 539)
2. **Criar interface** - `src/types/sugestaoN8N.ts`
3. **Criar componente** - `SugestaoN8NCard.tsx`
4. **Atualizar Edge Function** - Aceitar campos novos
5. **Atualizar Hook** - Extrair campos novos
6. **Atualizar Pages** - Renderizar novo componente
7. **Testar** - Enviar payload de teste do N8N
8. **Deploy** - Edge function
