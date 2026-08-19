-- Maternal 3 e Grupo V ganham o bloco "Onde essa idade fica".
--
-- As duas nao tem entrevista e serao escritas como mescla das vizinhas. Em vez
-- de recolher a faixa inteira, o bloco novo pergunta onde ela FICA entre as
-- duas ja conhecidas, com duas ancoras de delta (o que ja faz que a de tras nao
-- fazia, o que ainda nao faz que a da frente ja faz) e as duvidas especificas
-- que a leitura das entrevistas vizinhas deixou em aberto.
--
-- Versoes separadas porque as ancoras sao diferentes: Maternal 3 se posiciona
-- entre Maternal 2 e Grupo IV, e Grupo V entre Grupo IV e 1o ano.
--
-- Seguro: as duas fichas estao vazias, entao nao ha resposta orfa. A condicao
-- no WHERE garante isso mesmo se alguem responder antes de rodar.

update public.coleta_descoberta
   set versao = 5
 where segmento = 'infantil' and serie = 'Maternal 3'
   and coalesce(respostas, '{}'::jsonb) = '{}'::jsonb;

update public.coleta_descoberta
   set versao = 6
 where segmento = 'infantil' and serie = 'Grupo V'
   and coalesce(respostas, '{}'::jsonb) = '{}'::jsonb;

select serie, versao, status,
       coalesce(respostas, '{}'::jsonb) = '{}'::jsonb as vazia
  from public.coleta_descoberta
 where segmento = 'infantil'
 order by ordem;
