-- ============================================================
-- INSTRUMENTO PROPRIO PARA O FUNDAMENTAL 1
--
-- As 5 fichas do F1 foram criadas em 14/08 com versao 2, que e' o instrumento
-- escrito para o Infantil. Rodar assim perguntaria a uma professora de 5o ano
-- sobre crianca que "quis contar e nao achava a palavra": cena de 3 anos. A
-- professora responde por educacao e a resposta nao serve para escrever o
-- questionario dos pais.
--
-- versao 3 = 1o ao 3o ano.
-- versao 4 = 4o e 5o: o mesmo instrumento mais o bloco do que a crianca ja'
--            diz de si mesma, que e' o material do Acreditar e so' existe
--            quando ela ja' tem opiniao formada sobre o proprio desempenho.
--
-- Seguro de rodar: nenhuma das 5 tem resposta gravada, entao nao ha' texto
-- orfao apontando para pergunta que deixou de existir. A condicao no WHERE
-- garante isso mesmo se alguem responder antes de a migracao rodar.
-- ============================================================

update public.coleta_descoberta
   set versao = 3
 where segmento = 'fundamental1'
   and serie in ('1º Ano', '2º Ano', '3º Ano')
   and coalesce(respostas, '{}'::jsonb) = '{}'::jsonb;

update public.coleta_descoberta
   set versao = 4
 where segmento = 'fundamental1'
   and serie in ('4º Ano', '5º Ano')
   and coalesce(respostas, '{}'::jsonb) = '{}'::jsonb;

select serie, versao, status,
       coalesce(respostas, '{}'::jsonb) = '{}'::jsonb as vazia
  from public.coleta_descoberta
 where segmento = 'fundamental1'
 order by ordem;
