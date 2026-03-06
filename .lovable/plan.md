

## Plano: Reformular Missões — PDF Inline + Resposta Multimídia

### Resumo

Transformar a experiência de missões: o conteúdo principal passa a ser um **PDF renderizado inline** na tela do aluno, com área de resposta multimídia (fotos, arquivos, texto) abaixo. Simplificar o formulário do professor para focar no PDF como conteúdo principal.

### 1. Professor — Simplificar `NovaMissaoPage.tsx`

Reestruturar a seção "Conteúdo da Missão" (linhas 801-929):

**Novos campos (em ordem):**
1. **Título** * — manter, atualizar placeholder
2. **PDF da Missão** * — novo upload de PDF (campo principal, usa storage bucket `fase-conteudos`). Mostra preview do nome do arquivo após upload. Salva em `arquivo_pdf_url` e `arquivo_pdf_nome` (campos já existem na tabela)
3. **Pontuação** * — manter (categoria principal/secundária/bônus)
4. **Prazo** * — manter
5. **Descrição curta** — opcional, texto que aparece no card da lista (usa campo `descricao`)

**Campos antigos** (Contexto, Lente Especial, Instrução, Itens, Reflexão) movidos para seção colapsável "Campos avançados (opcional)" para backward compatibility. Validação atualizada: não exigir mais `contexto` e `instrucoes` como obrigatórios se PDF estiver presente.

**Upload do PDF:** Usar a mesma estratégia de upload via fetch/blob com timeout de 90s (conforme memory de storage). Bucket: `fase-conteudos` (público, já configurado). Path: `missoes/{missaoId}/{timestamp}_{filename}`.

### 2. Aluno — Reformular `MissaoDetalhePage.tsx`

Reestruturar completamente o corpo da página (linhas 634-1205):

**Novo layout:**

1. **Header** — manter (cor da casa, pontos, prazo, status)

2. **PDF Viewer Inline** — se `arquivo_pdf_url` existe:
   - Renderizar `<iframe src={pdfUrl} />` com altura ~70vh, bordas arredondadas, sombra
   - Botão "⬇️ Baixar PDF" discreto abaixo (já existe a função `baixarPDF`)

3. **Fallback texto** — se não tem PDF, mostrar conteúdo em texto como antes (Contexto, Lente, Instrução, Itens, Reflexão) — backward compat

4. **Separador visual**

5. **Seção "📤 SUA RESPOSTA"** — reformulada:
   - **Botões de upload em linha**: 📷 Foto (accept image/*, capture=environment) | 📎 Arquivo (accept any) | 📝 Texto (toggle textarea)
   - **Grid de previews** dos arquivos anexados (miniaturas para imagens, ícone+nome para outros)
   - **Textarea "Comentário"** — opcional, sempre visível
   - Validação: pelo menos um arquivo OU texto (não exigir texto sempre como hoje)

6. **Botão "📤 Enviar Entrega"** — fixo no bottom, cor da casa

7. **Estados pós-envio** — manter lógica existente (pendente, aprovada, refazer) mas mostrar dentro da seção "SUA RESPOSTA"

**Mudança de validação** (linha 405-418): Remover obrigatoriedade de texto. Exigir pelo menos texto OU arquivo.

### 3. Sem alterações no banco de dados

Os campos `arquivo_pdf_url` e `arquivo_pdf_nome` já existem na tabela `missoes`. Os campos de upload de entrega já funcionam via `entrega_arquivos`. Nenhuma migração SQL necessária.

### Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/professor/NovaMissaoPage.tsx` | Simplificar form: PDF como campo principal, campos texto em seção colapsável |
| `src/pages/aluno/MissaoDetalhePage.tsx` | PDF viewer inline + área de resposta multimídia com botões foto/arquivo |

