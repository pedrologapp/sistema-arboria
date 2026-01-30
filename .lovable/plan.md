
# Plano: Exibição Completa das Sugestões N8N com Cards Expansíveis

## Resumo

O N8N está enviando dados ricos (scripts, opções A/B, como reagir, elemento de ponte) mas o frontend não está extraindo nem renderizando esses campos. Este plano implementa a exibição completa com cards expansíveis e scripts destacados.

---

## Diagnóstico Técnico

### Problema 1: Edge Function - Campos Faltando
A Edge Function `receber-sugestao-n8n` **não aceita** os campos:
- `como_reagir`
- `elemento_ponte`
- Campos ricos dentro de `acoes_sugeridas` (script, objetivo, contexto, como_escutar, por_que_funciona)

### Problema 2: Hook - Extração Incompleta
O hook `usePerfilAluno.ts` (linhas 502-512) extrai apenas:
```typescript
{ acao: string; prioridade: string }
```
Ignora: `script`, `objetivo`, `contexto`, `como_escutar`, `por_que_funciona`

### Problema 3: Componente - Falta de Renderização
O `FeedbackEstadoCard.tsx` não renderiza:
- Cards expansíveis com scripts destacados
- Seção "COMO REAGIR"
- Seção "ELEMENTO DE PONTE"

---

## Arquitetura da Solução

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                          FLUXO CORRIGIDO                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  N8N envia payload completo                                              │
│       ↓                                                                  │
│  Edge Function (ATUALIZAR)                                               │
│    → Aceitar: como_reagir, elemento_ponte                                │
│    → Salvar campos ricos de acoes_sugeridas                              │
│       ↓                                                                  │
│  dados_contexto (JSONB já correto)                                       │
│       ↓                                                                  │
│  Hook usePerfilAluno (ATUALIZAR)                                         │
│    → Expandir interface AcaoSugerida                                     │
│    → Extrair: como_reagir, elemento_ponte                                │
│       ↓                                                                  │
│  FeedbackEstadoCard (ATUALIZAR)                                          │
│    → Props expandidas                                                    │
│    → Cards expansíveis com script em destaque                            │
│    → Seção COMO REAGIR                                                   │
│    → Seção ELEMENTO DE PONTE                                             │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Edge Function: Aceitar Novos Campos

### Arquivo: `supabase/functions/receber-sugestao-n8n/index.ts`

**Adicionar à interface SugestaoPayload:**
```typescript
// Novos campos ricos
como_reagir?: {
  se_aceitar: string;
  se_recusar: string;
  alerta?: string;
};

elemento_ponte?: {
  forcas: string | string[];
  area_dificuldade: string;
};
```

**Adicionar ao dadosContexto:**
```typescript
como_reagir: payload.como_reagir || null,
elemento_ponte: payload.elemento_ponte || null,
```

---

## 2. Hook: Expandir Interfaces e Extração

### Arquivo: `src/hooks/usePerfilAluno.ts`

**Expandir interface AcaoSugerida (linha ~14):**
```typescript
interface AcaoSugerida {
  titulo: string;
  icone: string;
  codigo: string;
  prioridade?: 'alta' | 'media' | 'baixa';
  // Campos ricos do N8N
  script?: string;
  objetivo?: string;
  contexto?: string;
  comoEscutar?: string;
  porQueFunciona?: string;
}
```

**Adicionar novos campos ao AlertaAtivo (linha ~52):**
```typescript
// Novos campos ricos do N8N
comoReagir?: {
  seAceitar: string;
  seRecusar: string;
  alerta?: string;
};
elementoPonte?: {
  forcas: string | string[];
  areaDificuldade: string;
};
```

**Atualizar extração de acoes_sugeridas (linha ~502-512):**
```typescript
if (geradoPorN8N && dadosContexto?.acoes_sugeridas) {
  const acoesN8N = dadosContexto.acoes_sugeridas as Array<{
    acao: string;
    prioridade: 'alta' | 'media' | 'baixa';
    script?: string;
    objetivo?: string;
    contexto?: string;
    como_escutar?: string;
    por_que_funciona?: string;
  }>;
  acoesSugeridas = acoesN8N.map(a => ({
    titulo: a.acao,
    icone: 'MessageCircle',
    codigo: a.acao,
    prioridade: a.prioridade,
    script: a.script,
    objetivo: a.objetivo,
    contexto: a.contexto,
    comoEscutar: a.como_escutar,
    porQueFunciona: a.por_que_funciona
  }));
}
```

**Adicionar extração de novos campos (linha ~670):**
```typescript
// Novos campos ricos do N8N
comoReagir: dadosContexto?.como_reagir ? {
  seAceitar: (dadosContexto.como_reagir as any).se_aceitar,
  seRecusar: (dadosContexto.como_reagir as any).se_recusar,
  alerta: (dadosContexto.como_reagir as any).alerta
} : undefined,
elementoPonte: dadosContexto?.elemento_ponte ? {
  forcas: (dadosContexto.elemento_ponte as any).forcas,
  areaDificuldade: (dadosContexto.elemento_ponte as any).area_dificuldade
} : undefined,
```

---

## 3. Componente: Props Expandidas

### Arquivo: `src/components/professor/FeedbackEstadoCard.tsx`

**Expandir interface AcaoSugerida (linha ~27):**
```typescript
interface AcaoSugerida {
  acao: string;
  prioridade: 'alta' | 'media' | 'baixa';
  // Campos ricos do N8N
  script?: string;
  objetivo?: string;
  contexto?: string;
  comoEscutar?: string;
  porQueFunciona?: string;
}
```

**Adicionar novas props (linha ~50):**
```typescript
comoReagir?: {
  seAceitar: string;
  seRecusar: string;
  alerta?: string;
};
elementoPonte?: {
  forcas: string | string[];
  areaDificuldade: string;
};
```

---

## 4. Componente: Renderização Expandida

### Layout Visual Proposto

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  ⚠️ ALERTA ATIVO                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  🔗 ELEMENTO DE PONTE                                               │ │
│  │  Força: Linguística → Dificuldade: comunicação e engajamento       │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  "🎯 INVESTIGAÇÃO GENTIL — Resgate da Confiança Linguística..."         │
│  [Ler mais/menos]                                                        │
│                                                                          │
│  ┌ Padrão Detectado ─────────────────────────────────────────────────┐  │
│  │ Sinais de Atenção Consecutivos                                     │  │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  [Ver mais ▼]                                                            │
│                                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│  EXPANDIDO:                                                              │
│                                                                          │
│  ═════════════════════════════════════════════════════════════════════  │
│  📌 O QUE FAZER AGORA                                        [ALTA] [▲] │
│  ───────────────────────────────────────────────────────────────────── │
│  Objetivo: Reconectar Adryan com ambiente de aprendizagem               │
│  Contexto: Encontrar momento privado...                                  │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ 💬 DIGA:                                                           │ │
│  │ "Adryan Samuel, quero te ouvir. Quer escrever três palavras..."   │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  👂 Como escutar: ESCUTE SEM JULGAR. Observe o tom, o ritmo.            │
│  ═════════════════════════════════════════════════════════════════════  │
│                                                                          │
│  🅰️ Opção A: Escrita Livre                                    [ALTA] [▼] │
│  (clicável para expandir script)                                         │
│                                                                          │
│  🅱️ Opção B: Registro Privado                                [MÉDIA] [▼] │
│  (clicável para expandir script)                                         │
│                                                                          │
│  ═════════════════════════════════════════════════════════════════════  │
│  🔄 COMO REAGIR                                                          │
│  ───────────────────────────────────────────────────────────────────── │
│  ✅ Se aceitar: "Valeu por compartilhar. Me ajudou a entender."          │
│  ❌ Se recusar: "Tudo bem. Quando quiser, me avisa."                     │
│  ⚠️ NÃO INSISTA.                                                         │
│  ═════════════════════════════════════════════════════════════════════  │
│                                                                          │
│  ⚠️ O QUE NÃO FAZER                                                      │
│  ✗ Não perguntar diretamente...                                          │
│                                                                          │
│  💬 MENSAGEM PARA VOCÊ                                                   │
│  "Adryan precisa de espaço e acolhimento..."                             │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  🎯 Registrar minha ação                                           │ │
│  └────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

### Implementação das Novas Seções

**4.1 ELEMENTO DE PONTE (após o header, antes do texto):**
```tsx
{geradoPorN8N && elementoPonte && (
  <div className="mb-4 p-3 bg-purple-900/20 rounded-lg border border-purple-500/20">
    <div className="flex items-center gap-2 mb-1">
      <span className="text-purple-400 text-xs font-semibold uppercase tracking-wide">
        🔗 Elemento de Ponte
      </span>
    </div>
    <div className="flex items-center gap-2 text-sm">
      <span className="text-white font-medium">
        Força: {Array.isArray(elementoPonte.forcas) 
          ? elementoPonte.forcas.join(', ') 
          : elementoPonte.forcas}
      </span>
      <span className="text-purple-400">→</span>
      <span className="text-white/80">
        Dificuldade: {elementoPonte.areaDificuldade}
      </span>
    </div>
  </div>
)}
```

**4.2 CARDS DE AÇÃO EXPANSÍVEIS (substituir renderização atual):**
```tsx
{acoesSugeridas.map((acao, i) => {
  const isExpanded = acoesExpandidas[i] ?? (i === 0); // Primeira aberta por padrão
  const temConteudoRico = acao.script || acao.objetivo || acao.contexto;
  
  return (
    <div key={i} className={cn(
      'rounded-lg border overflow-hidden transition-all',
      acao.prioridade === 'alta' ? 'border-red-500/30 bg-red-900/20' :
      acao.prioridade === 'media' ? 'border-amber-500/30 bg-amber-900/20' :
      'border-green-500/30 bg-green-900/20'
    )}>
      <button
        onClick={() => toggleAcao(i)}
        className="w-full p-3 flex items-start gap-3 text-left hover:bg-white/5"
      >
        {/* Badge de prioridade */}
        <span className={cn(
          'text-[10px] font-semibold uppercase px-2 py-1 rounded',
          acao.prioridade === 'alta' ? 'bg-red-500 text-white' :
          acao.prioridade === 'media' ? 'bg-amber-500 text-black' :
          'bg-green-500 text-white'
        )}>
          {acao.prioridade === 'alta' ? 'Alta' : 
           acao.prioridade === 'media' ? 'Média' : 'Baixa'}
        </span>
        
        <span className="flex-1 text-sm font-medium text-white">{acao.acao}</span>
        
        {temConteudoRico && (
          <ChevronDown className={cn(
            'w-4 h-4 text-white/40 transition-transform',
            isExpanded && 'rotate-180'
          )} />
        )}
      </button>
      
      {/* Conteúdo expandido */}
      {isExpanded && temConteudoRico && (
        <div className="px-3 pb-3 space-y-3 border-t border-white/10">
          {/* Objetivo */}
          {acao.objetivo && (
            <p className="text-white/80 text-sm pt-3">
              <strong className="text-white">Objetivo:</strong> {acao.objetivo}
            </p>
          )}
          
          {/* Contexto */}
          {acao.contexto && (
            <p className="text-white/60 text-sm">
              <strong className="text-white/80">Contexto:</strong> {acao.contexto}
            </p>
          )}
          
          {/* SCRIPT EM DESTAQUE */}
          {acao.script && (
            <div className="p-3 bg-blue-900/40 rounded-lg border border-blue-500/30">
              <p className="text-blue-400 text-xs font-semibold mb-1">💬 DIGA:</p>
              <p className="text-white text-sm leading-relaxed italic">
                "{acao.script}"
              </p>
            </div>
          )}
          
          {/* Como escutar */}
          {acao.comoEscutar && (
            <p className="text-white/70 text-sm">
              <span className="text-amber-400">👂</span> {acao.comoEscutar}
            </p>
          )}
          
          {/* Por que funciona */}
          {acao.porQueFunciona && (
            <p className="text-green-400/80 text-sm">
              <span className="text-green-400">✓</span> Por que funciona: {acao.porQueFunciona}
            </p>
          )}
        </div>
      )}
    </div>
  );
})}
```

**4.3 SEÇÃO COMO REAGIR (após ações, antes de "o que não fazer"):**
```tsx
{geradoPorN8N && comoReagir && (
  <div className="p-3 bg-emerald-900/20 rounded-lg border border-emerald-500/20">
    <h4 className="text-sm font-semibold mb-3 flex items-center gap-2 text-emerald-400">
      🔄 Como Reagir
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
)}
```

---

## 5. Atualizar Passagem de Props

### Arquivo: `src/pages/professor/PerfilAlunoPage.tsx`

**Adicionar novas props ao FeedbackEstadoCard (linha ~339):**
```tsx
<FeedbackEstadoCard
  // ... props existentes ...
  comoReagir={aluno.alertaAtivo?.comoReagir}
  elementoPonte={aluno.alertaAtivo?.elementoPonte}
/>
```

### Arquivo: `src/pages/professor/PerfilAlunoPageSimplificado.tsx`

**Mesma atualização (paridade).**

---

## 6. Estado Inicial dos Colapsáveis

**Primeira ação aberta por padrão:**
```typescript
const [acoesExpandidas, setAcoesExpandidas] = useState<Record<number, boolean>>({
  0: true // Primeira ação (O QUE FAZER AGORA) aberta
});
```

---

## 7. Arquivos a Modificar

| Arquivo | Alterações |
|---------|------------|
| `supabase/functions/receber-sugestao-n8n/index.ts` | Aceitar `como_reagir`, `elemento_ponte` |
| `src/hooks/usePerfilAluno.ts` | Expandir interfaces + extração |
| `src/components/professor/FeedbackEstadoCard.tsx` | Props + renderização expandida |
| `src/pages/professor/PerfilAlunoPage.tsx` | Passar novas props |
| `src/pages/professor/PerfilAlunoPageSimplificado.tsx` | Paridade |

---

## 8. Ordem de Implementação

1. **Edge Function** - Aceitar novos campos
2. **Hook** - Expandir interfaces e extração
3. **Componente** - Props e estado de colapsáveis
4. **Componente** - Renderização ELEMENTO DE PONTE
5. **Componente** - Cards de ação expansíveis com scripts
6. **Componente** - Seção COMO REAGIR
7. **Pages** - Passar novas props
8. **Deploy** - Edge function

---

## 9. Comportamento dos Colapsáveis

| Ação | Comportamento |
|------|---------------|
| Primeira ação (📌) | Aberta por padrão |
| Demais ações | Fechadas por padrão |
| Clique | Toggle individual |
| Múltiplas abertas | Permitido |

---

## Detalhes Técnicos

### Destaque do Script
O script terá fundo azul (`bg-blue-900/40`) com borda (`border-blue-500/30`) para destacar visualmente a frase exata que o professor deve dizer.

### Responsividade
Todo o layout usa Tailwind e funcionará em mobile e desktop.

### Fallback
Se o N8N não enviar `como_reagir` ou `elemento_ponte`, as seções simplesmente não aparecem (graceful degradation).
