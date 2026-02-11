

# Plano: Adicionar Conteudo Geral da Fase no TabConteudo

## Resumo

A aba "Conteudo" dentro dos detalhes da fase ja permite upload de PDFs para as 4 semanas. A unica alteracao necessaria e adicionar uma secao de **"Conteudo Geral"** no topo, para o material introdutorio/geral da fase.

---

## Como Funciona

Ao clicar numa fase (ex: 6 ANO > Linguistica), o admin ve 3 abas: Periodo, Conteudo, Missoes. Na aba **Conteudo**, o layout ficara:

```text
+------------------------------------------+
|  CONTEUDO GERAL DA FASE                  |
|  [PDF upload ou visualizacao]            |
+------------------------------------------+
|                                          |
|  MATERIAL POR SEMANA                     |
|                                          |
|  Semana 1 - 10/02 a 16/02               |
|  [PDF upload ou visualizacao]            |
|                                          |
|  Semana 2 - 17/02 a 23/02               |
|  [PDF upload ou visualizacao]            |
|                                          |
|  Semana 3 - 24/02 a 02/03               |
|  [PDF upload ou visualizacao]            |
|                                          |
|  Semana 4 - 03/03 a 09/03               |
|  [PDF upload ou visualizacao]            |
+------------------------------------------+
```

## Alteracao Tecnica

### Arquivo: `src/components/admin/TabConteudo.tsx`

O componente ja usa a tabela `fase_conteudos` com campo `semana` (smallint). Para o conteudo geral, usaremos **semana = 0**.

Alteracoes:
1. Adicionar secao "Conteudo Geral da Fase" no topo, usando `semana = 0`
2. Reutilizar toda a logica de upload/visualizacao/remocao ja existente (mesmas funcoes `abrirModal`, `uploadMutation`, etc.)
3. A query ja busca todos os conteudos da fase ordenados por semana, entao `semana = 0` sera retornado automaticamente

### Nenhuma migracao de banco necessaria

A tabela `fase_conteudos` ja suporta qualquer valor de `semana`. Usar `semana = 0` para o conteudo geral funciona sem alteracoes no schema.

### Visibilidade do Professor

O professor ja acessa os conteudos da fase via `ConteudoModal` ou `TabConteudo`. Como a query busca todos os conteudos da fase, o conteudo geral (semana 0) sera exibido automaticamente -- basta ajustar o componente do professor para mostrar essa secao tambem.

---

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/admin/TabConteudo.tsx` | Adicionar secao "Conteudo Geral" (semana=0) acima das 4 semanas |

