

## Plano: Corrigir PDF bloqueado pelo Chrome

### Problema
O `<iframe>` aponta diretamente para a URL do Supabase Storage (`missao.arquivo_pdf_url`), que o Chrome bloqueia por políticas cross-origin.

### Solução

**Arquivo:** `src/pages/aluno/MissaoDetalhePage.tsx` (linhas 726-753)

Substituir o iframe direto por Google Docs Viewer com fallback:

1. **Adicionar state** `pdfStatus` com valores `'loading' | 'loaded' | 'error'`
2. **Substituir o iframe** (linha 737-742):
   - `src` passa a ser `https://docs.google.com/gview?url=${encodeURIComponent(pdfUrl)}&embedded=true`
   - Adicionar `onLoad` que seta status para `'loaded'`
3. **Timer de fallback**: `useEffect` que após 8s, se ainda estiver `'loading'`, seta para `'error'`
4. **UI de fallback** (quando `pdfStatus === 'error'`): Card com ícone de PDF, botão "Abrir Missão" (`window.open`) e botão "Baixar PDF"
5. **Loading state**: Mostrar skeleton/spinner enquanto `pdfStatus === 'loading'`

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/aluno/MissaoDetalhePage.tsx` | Google Docs Viewer + fallback com timer 8s |

