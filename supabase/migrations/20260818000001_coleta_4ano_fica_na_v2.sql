-- ============================================================
-- O 4o ANO FICA NO INSTRUMENTO ANTIGO
--
-- A entrevista do 4o ano foi feita em 18/08 antes de as perguntas novas irem
-- para producao, entao o app serviu as perguntas do Infantil (versao 2) e as 8
-- respostas ficaram gravadas sob as chaves v2_*. Marcar a ficha como versao 2
-- e' registrar o que de fato aconteceu: assim as respostas continuam aparecendo
-- ao lado das perguntas que as geraram, em vez de a ficha parecer vazia.
--
-- Decisao do Fundador em 18/08: o 4o ano fica como esta'; o instrumento novo
-- roda no 1o, 2o e 3o (versao 3) e no 5o (versao 4), que e' a mesma faixa do
-- 4o e cobre o que faltou.
-- ============================================================

update public.coleta_descoberta
   set versao = 2
 where segmento = 'fundamental1'
   and serie = '4º Ano';

select serie, versao, status,
       (select count(*) from jsonb_each_text(coalesce(respostas,'{}'::jsonb)) e
         where trim(e.value) <> '') as respondidas
  from public.coleta_descoberta
 where segmento = 'fundamental1'
 order by ordem;
