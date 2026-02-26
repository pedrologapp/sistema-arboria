

# Adicionar Botão de Download nos Arquivos do ConteudoModal

## Alteração

### Arquivo: `src/components/professor/ConteudoModal.tsx`

1. Importar o ícone `Download` do lucide-react
2. Em cada item de conteúdo (linha 217-238), adicionar um botão de download ao lado do ícone de link externo
3. O botão de download vai usar `fetch` + `blob` para forçar o download do arquivo em vez de apenas abrir em nova aba
4. Separar a ação de "abrir" (clique no card) da ação de "baixar" (clique no ícone de download)

### Lógica de download

```typescript
const handleDownload = async (url: string, nome: string) => {
  const response = await fetch(url);
  const blob = await response.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nome;
  a.click();
  URL.revokeObjectURL(a.href);
};
```

### Visual

Cada item terá dois ícones à direita:
- `ExternalLink` — abre em nova aba (comportamento atual do clique no card)
- `Download` — faz download direto do arquivo

Ambos serão botões separados para evitar conflito de ações.

