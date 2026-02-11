

# Corrigir Constraint de Unicidade da Tabela Fases

## Problema

A constraint atual e `UNIQUE (institution_id, ano_letivo, numero_fase)`, ou seja, so permite um `numero_fase = 1` por ano em toda a instituicao. Com a nova estrutura de series independentes, cada serie precisa ter seu proprio conjunto de fases (1 a 8).

## Solucao

Atualizar a constraint para incluir `segmento` e `serie`:

```text
Antes:  UNIQUE (institution_id, ano_letivo, numero_fase)
Depois: UNIQUE (institution_id, ano_letivo, segmento, serie, numero_fase)
```

## Alteracoes

### 1. Migracao SQL

```sql
ALTER TABLE public.fases DROP CONSTRAINT fases_institution_id_ano_letivo_numero_fase_key;
ALTER TABLE public.fases ADD CONSTRAINT fases_institution_id_ano_letivo_segmento_serie_numero_fase_key 
  UNIQUE (institution_id, ano_letivo, segmento, serie, numero_fase);
```

### 2. Nenhuma alteracao de codigo necessaria

O codigo em `FaseNovaPage.tsx` ja filtra por `segmento` e `serie` ao calcular o proximo `numero_fase`, entao a logica esta correta. Apenas a constraint do banco precisa ser ajustada.

