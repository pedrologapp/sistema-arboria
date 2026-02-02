
# Plano: Corrigir Renderização do Conteúdo do N8N no Modal de Explicação

## Diagnóstico Detalhado

### Dados Confirmados no Banco
Os campos `mensagem_professor` e `texto_acontecendo` estão preenchidos corretamente no `dados_contexto`:

```
mensagem_professor: "Professor(a), você registrou uma observação que contradiz...
1. **O que motivou você a registrar "Conectou"?**
..."

texto_acontecendo: "**O QUE HAVIA ANTES:**
Adryan Samuel da Silva Dantas estava em um momento de ATENÇÃO...
**O QUE VOCÊ REGISTROU AGORA:**
Você acabou de registrar "Conectou"..."
```

### Mapeamento no Hook
Os hooks `useAlertasAlunos.ts` e `useAlertasAlunosTurmas.ts` já mapeiam corretamente:
```typescript
mensagem_professor: (alerta.dados_contexto?.mensagem_professor as string) || '',
texto_acontecendo: (alerta.dados_contexto?.texto_acontecendo as string) || ''
```

### Problema Identificado: Função de Renderização

A função `renderizarTextoFormatado` atual **não preserva quebras de linha** (`\n`):

```typescript
const renderizarTextoFormatado = (texto: string): ReactNode[] => {
  const partes = texto.split(/(\*\*[^*]+\*\*)/g);
  return partes.map((parte, i) => {
    if (parte.startsWith('**') && parte.endsWith('**')) {
      return <strong key={i} className="text-white font-semibold">{parte.slice(2, -2)}</strong>;
    }
    return <span key={i}>{parte}</span>;
  });
};
```

**Problemas:**
1. Não trata `\n` como quebra de linha
2. Retorna array dentro de `<p>`, causando problemas de layout
3. `whitespace-pre-line` no CSS não funciona bem com spans inline

---

## Solução

### Arquivo: `src/components/professor/ExplicacaoContradicaoModal.tsx`

Reescrever a função `renderizarTextoFormatado` para:
1. Primeiro quebrar por `\n` em parágrafos
2. Dentro de cada parágrafo, aplicar formatação de negrito

#### Nova Implementação

```typescript
// Renderiza texto com markdown básico:
// - **texto** -> negrito
// - \n -> quebra de parágrafo
const renderizarTextoFormatado = (texto: string): ReactNode => {
  // Separar por quebras de linha
  const linhas = texto.split('\n');
  
  return linhas.map((linha, lineIndex) => {
    // Linha vazia = espaçamento
    if (linha.trim() === '') {
      return <div key={lineIndex} className="h-2" />;
    }
    
    // Processar negritos dentro da linha
    const partes = linha.split(/(\*\*[^*]+\*\*)/g);
    const conteudo = partes.map((parte, i) => {
      if (parte.startsWith('**') && parte.endsWith('**')) {
        return (
          <strong key={i} className="text-white font-semibold">
            {parte.slice(2, -2)}
          </strong>
        );
      }
      return <span key={i}>{parte}</span>;
    });
    
    return (
      <div key={lineIndex} className="mb-1">
        {conteudo}
      </div>
    );
  });
};
```

### Atualização do JSX de Renderização

Ajustar os containers para usar `<div>` ao invés de `<p>`:

```tsx
{/* Bloco "O que aconteceu" */}
{alerta.texto_acontecendo && (
  <div className="space-y-2">
    <div className="flex items-center gap-2 text-amber-400/80 text-xs font-medium uppercase tracking-wider">
      <ClipboardList className="w-3.5 h-3.5" />
      O que aconteceu
    </div>
    <div className="bg-amber-900/20 rounded-lg p-3 border border-amber-600/30">
      <div className="text-amber-100/90 text-sm leading-relaxed">
        {renderizarTextoFormatado(alerta.texto_acontecendo)}
      </div>
    </div>
  </div>
)}

{/* Bloco "Mensagem para você" */}
{alerta.mensagem_professor && (
  <div className="space-y-2">
    <div className="flex items-center gap-2 text-purple-400/80 text-xs font-medium uppercase tracking-wider">
      <MessageCircle className="w-3.5 h-3.5" />
      Mensagem para você
    </div>
    <div className="bg-purple-900/30 rounded-lg p-3 border border-purple-600/40">
      <div className="text-purple-100/90 text-sm leading-relaxed">
        {renderizarTextoFormatado(alerta.mensagem_professor)}
      </div>
    </div>
  </div>
)}
```

---

## Resultado Visual Esperado

```
┌─────────────────────────────────────────────┐
│  [AS]  💬 Explicação necessária         [X] │
│        Adryan Samuel da Silva Dantas        │
│        [Contradição detectada]              │
│                                             │
│  📋 O QUE ACONTECEU                         │
│  ┌─────────────────────────────────────┐    │
│  │ **O QUE HAVIA ANTES:**              │    │
│  │ Adryan Samuel estava em ATENÇÃO...  │    │
│  │                                     │    │
│  │ **O QUE VOCÊ REGISTROU AGORA:**     │    │
│  │ Você registrou "Conectou"...        │    │
│  │                                     │    │
│  │ **POR QUE ISSO É IMPORTANTE:**      │    │
│  │ Essa contradição indica...          │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  💬 MENSAGEM PARA VOCÊ                      │
│  ┌─────────────────────────────────────┐    │
│  │ Professor(a), você registrou...     │    │
│  │                                     │    │
│  │ PRECISO QUE VOCÊ EXPLIQUE:          │    │
│  │                                     │    │
│  │ 1. **O que motivou você a           │    │
│  │    registrar "Conectou"?**          │    │
│  │                                     │    │
│  │ 2. **O que aconteceu com Adryan?**  │    │
│  │                                     │    │
│  │ 3. **Detalhe o que aconteceu**      │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  💬 SUA EXPLICAÇÃO *                        │
│  ┌─────────────────────────────────────┐    │
│  │ Descreva o que aconteceu...         │    │
│  └─────────────────────────────────────┘    │
│                                             │
│     [Cancelar]    [✈ Enviar explicação]     │
└─────────────────────────────────────────────┘
```

---

## Arquivo a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/professor/ExplicacaoContradicaoModal.tsx` | Corrigir função `renderizarTextoFormatado` para tratar quebras de linha e atualizar containers para `<div>` |

---

## Resumo Técnico

O código atual já está buscando os dados corretamente do banco e passando para o modal. O problema está na **renderização visual**: a função de formatação não tratava quebras de linha (`\n`), fazendo com que todo o texto aparecesse em uma única linha ilegível. 

A correção envolve apenas o componente do modal, sem necessidade de alterar hooks ou banco de dados.
