-- Theo Henrique e Joao Lucas (6o B): projeto EmpireOS.
--
-- Ficaram de fora da lista original porque a selecao saiu das 36 ENTREGAS da
-- missao "Apresentem seu projeto", e este grupo nunca entregou. O projeto
-- existe e foi apresentado; o registro no app e' que nao existe. Correcao
-- apontada pelo Fundador em 18/08.
insert into public.missao_destinatarios (missao_id, aluno_id)
values
  ('ddaf54d2-7781-4ab6-b3e7-2a54749329a5','53d55517-d271-495f-9ef5-0d55aece105b'),
  ('ddaf54d2-7781-4ab6-b3e7-2a54749329a5','3c3c4b03-e87b-4f3e-a44b-5eb62f299fc5')
on conflict do nothing;

select count(*) as total_na_2a_fase
  from public.missao_destinatarios
 where missao_id = 'ddaf54d2-7781-4ab6-b3e7-2a54749329a5';
