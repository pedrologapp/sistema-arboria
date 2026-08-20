-- ============================================================
-- DYLAN LUCAS ARAUJO COSTA LIRA, 1o ANO A
--
-- Matricula 1893.2022: esta na escola desde 2022 e fez o Grupo V no ano passado.
-- Nunca existiu no Arboria. Nao e' aluno novo na escola, e' aluno que a
-- importacao pulou, e o cruzamento com o ActiveSoft de 20/08 foi o que revelou.
--
-- Montado igual aos colegas do 1o ano: conta carrier, com email no padrao
-- primeiro.segundo.<matricula sem ponto>@aluno.arboria.com. No F1 o aluno nao
-- entra no app; a conta existe para o registro do professor ter onde pousar.
--
-- ATENCAO para quem repetir isto: existe um GATILHO em auth.users que ja cria a
-- linha em profiles. Entao o perfil se ATUALIZA, nunca se insere, senao bate na
-- chave primaria. Escrito idempotente de proposito: rodar duas vezes nao quebra.
-- ============================================================

do $$
declare
  v_id uuid;
  v_turma uuid := '7f3f2d08-9475-41ee-9b29-7796e9169443';  -- 1o Ano A, 2026
  v_inst uuid := '00000000-0000-0000-0000-000000000001';
begin
  select id into v_id from auth.users where email = 'dylan.lucas.18932022@aluno.arboria.com';

  if v_id is null then
    v_id := gen_random_uuid();
    insert into auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data
    ) values (
      v_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      'dylan.lucas.18932022@aluno.arboria.com',
      extensions.crypt('dylan123', extensions.gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', 'Dylan Lucas Araújo Costa Lira')
    );
  end if;

  -- O gatilho ja criou a linha. Aqui ela so ganha os dados do aluno.
  update public.profiles
     set nome = 'Dylan',
         full_name = 'Dylan Lucas Araújo Costa Lira',
         serie = '1º Ano',
         turma = 'A',
         institution_id = v_inst,
         matricula_externa = '1893.2022',
         data_nascimento = '2020-02-08',
         sexo = 'M'
   where id = v_id;

  insert into public.user_roles (user_id, role)
  select v_id, 'user'
   where not exists (select 1 from public.user_roles where user_id = v_id);

  insert into public.aluno_turma (aluno_id, turma_id, ano_letivo, data_entrada, ativo)
  select v_id, v_turma, 2026, current_date, true
   where not exists (
     select 1 from public.aluno_turma
      where aluno_id = v_id and turma_id = v_turma and ano_letivo = 2026);
end $$;

select p.full_name, p.matricula_externa, p.data_nascimento, p.sexo, t.nome as turma,
       (select email from auth.users u where u.id = p.id) as login
  from public.profiles p
  join public.aluno_turma at on at.aluno_id = p.id and at.ativo
  join public.turmas t on t.id = at.turma_id
 where p.matricula_externa = '1893.2022';
