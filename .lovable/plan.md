

## Exportar Credenciais dos Alunos F2

Sim, é totalmente possível. As senhas são geradas de forma determinística (`sobrenome + "123"`, sem acentos), então podemos reconstruí-las a partir dos dados do perfil.

### O que será feito

Adicionar na página de **Relatórios** um botão "Exportar Credenciais F2" que gera um PDF (usando jsPDF + autoTable, já instalados) com uma tabela contendo:

| Nome | Série | Turma | Casa | Email (login) | Senha |
|------|-------|-------|------|---------------|-------|
| João Silva | 6º | A | Linguística | joao.silva.12345@aluno.arboria.com | silva123 |

### Funcionamento

1. Buscar todos os profiles com `segmento = 'fundamental2'` e `conta_criada = true` da instituição do admin
2. Reconstruir a senha usando a mesma lógica determinística: normalizar sobrenome (remover acentos, preposições) + "123"
3. Gerar PDF com jsPDF-autoTable, agrupado por série/turma
4. Opção adicional de exportar como CSV (via papaparse, também já instalado)

### Arquivos alterados
- `src/pages/admin/RelatoriosPage.tsx` — substituir placeholder por funcionalidade real com botão de exportação PDF/CSV das credenciais

