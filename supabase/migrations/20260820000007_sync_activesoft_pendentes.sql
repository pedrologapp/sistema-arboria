-- ============================================================
-- OS CASOS QUE A SINCRONIZACAO NAO RESOLVEU SOZINHA
--
-- Nenhum deles tinha matricula gravada no Arboria, e sem ela nao havia como
-- afirmar nada. Resolvidos um a um, conferidos antes de escrever.
--
-- Nada e apagado aqui tambem. Aluno que saiu perde o vinculo com a turma e
-- mantem perfil, observacoes e entregas.
-- ============================================================

-- ------------------------------------------------- 1. a Ketelyn duplicada
-- Ela tem DOIS perfis. O de abril e' o verdadeiro: tem a matricula e ela entrou
-- com ele em 21/04. O de julho nasceu de alguma importacao manual, nunca foi
-- acessado, e foi ele que ficou com a turma do 6o B.
--
-- A turma vai para o perfil que ela usa. O duplicado fica sem vinculo e inerte;
-- nao e' apagado aqui de proposito, porque apagar perfil com login e' decisao do
-- Fundador e nao tem volta.
update public.aluno_turma
   set aluno_id = '0a8760f9-0000-0000-0000-000000000000'
 where false;  -- placeholder trocado abaixo pelo id real

do $$
declare v_orig uuid; v_dup uuid;
begin
  select id into v_orig from public.profiles
   where full_name = 'Ketelyn Lohane Aires Barbosa' and matricula_externa = '1308.2017';
  select id into v_dup  from public.profiles
   where full_name = 'Ketelyn Lohane Aires Barbosa' and matricula_externa is null;

  if v_orig is not null and v_dup is not null then
    update public.aluno_turma set aluno_id = v_orig
     where aluno_id = v_dup and ativo and ano_letivo = 2026;
    update public.profiles set data_nascimento = '2013-09-10' where id = v_orig;
  end if;
end $$;

-- --------------------------------------------------- 2. a Ana Beatriz
-- Existe uma so' vez, sem matricula, e trocou do 7o A para o 7o B.
update public.profiles
   set matricula_externa = '1123.2015', data_nascimento = '2012-07-02'
 where full_name = 'Ana Beatriz Monteiro de Oliveira' and matricula_externa is null;

-- ------------------------------------------------ 3. quem saiu, e nao tinha
-- matricula para a regra automatica pegar
update public.aluno_turma at
   set ativo = false,
       data_saida = coalesce(at.data_saida, current_date),
       motivo_saida = coalesce(at.motivo_saida, 'Sem matricula ativa no ActiveSoft em 20/08/2026')
  from public.profiles p
 where at.aluno_id = p.id and at.ativo and at.ano_letivo = 2026
   and p.full_name in ('Letícia Beatriz Maia Cavalcante Santana', 'Isabella Ferreira de Araújo');

-- ---------------------------------------------------- 4. trocas de turma
-- Quatro alunos estavam na turma do ano passado dentro do Arboria. O vinculo
-- antigo e' encerrado com data, e um novo e' criado: assim a linha da crianca
-- guarda que ela esteve nas duas, que e' o que a ancora na crianca exige.
do $$
declare
  r record;
  v_aluno uuid;
begin
  for r in
    select * from (values
      ('Liz Maria Silva de Vasconcelos',   'c89538b7-8a01-45a7-8482-d5504ff34a2a'::uuid),
      ('José Isaac Lopes Barreto',         '2f91c375-efd9-40f5-bbae-0f162171a026'::uuid),
      ('Luiz Davi Lopes Barreto',          '12e0ca63-2559-44c5-a80c-329184884b6c'::uuid),
      ('Ana Beatriz Monteiro de Oliveira', '56bb2e34-5437-415a-981b-b6d6740d38ed'::uuid)
    ) as x(nome, turma_nova)
  loop
    select id into v_aluno from public.profiles where full_name = r.nome limit 1;
    if v_aluno is null then continue; end if;

    update public.aluno_turma
       set ativo = false, data_saida = current_date,
           motivo_saida = 'Trocou de turma (ActiveSoft, 20/08/2026)'
     where aluno_id = v_aluno and ativo and ano_letivo = 2026 and turma_id <> r.turma_nova;

    if not exists (select 1 from public.aluno_turma
                    where aluno_id = v_aluno and turma_id = r.turma_nova and ano_letivo = 2026) then
      insert into public.aluno_turma (aluno_id, turma_id, ano_letivo, data_entrada, ativo)
      values (v_aluno, r.turma_nova, 2026, current_date, true);
    else
      update public.aluno_turma set ativo = true, data_saida = null, motivo_saida = null
       where aluno_id = v_aluno and turma_id = r.turma_nova and ano_letivo = 2026;
    end if;
  end loop;
end $$;

select p.full_name, coalesce(p.matricula_externa,'(sem)') as matricula,
       p.data_nascimento, coalesce(t.nome,'(sem turma ativa)') as turma
  from public.profiles p
  left join public.aluno_turma at on at.aluno_id=p.id and at.ativo and at.ano_letivo=2026
  left join public.turmas t on t.id=at.turma_id
 where p.full_name in ('Ketelyn Lohane Aires Barbosa','Ana Beatriz Monteiro de Oliveira',
                       'Letícia Beatriz Maia Cavalcante Santana','Isabella Ferreira de Araújo',
                       'Liz Maria Silva de Vasconcelos','José Isaac Lopes Barreto','Luiz Davi Lopes Barreto')
 order by p.full_name;
