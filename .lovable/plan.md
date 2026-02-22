

# Corrigir Constraint de Semana na Tabela fase_conteudos

## Problema

A tabela `fase_conteudos` tem um CHECK constraint (`fase_conteudos_semana_check`) que provavelmente so permite valores de 1 a 4 no campo `semana`. O "Conteudo Geral" usa `semana = 0`, que e rejeitado por essa constraint.

## Solucao

Remover a constraint existente e criar uma nova que aceite valores de 0 a 4:

```sql
ALTER TABLE public.fase_conteudos DROP CONSTRAINT fase_conteudos_semana_check;
ALTER TABLE public.fase_conteudos ADD CONSTRAINT fase_conteudos_semana_check CHECK (semana >= 0 AND semana <= 4);
```

## Nenhuma alteracao de codigo necessaria

O componente `TabConteudo.tsx` ja usa `semana = 0` corretamente. Apenas a constraint do banco precisa ser ajustada.

