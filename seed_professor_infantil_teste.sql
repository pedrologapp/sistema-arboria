-- =============================================================
-- Professor de TESTE do Infantil — para validar a tela nova
-- Rodar no Supabase: Dashboard → SQL Editor → New query → colar → Run
-- Login: grupoiv@arboria.com  /  Senha: grupoiv123
-- Vinculado às 4 turmas de Infantil (Maternal 2, Maternal 3, Grupo IV, Grupo V)
-- =============================================================
DO $$
DECLARE
  new_id uuid;
  inst   uuid := '00000000-0000-0000-0000-000000000001'; -- Centro Educacional Amadeus
BEGIN
  -- 1) Usuário de auth com email JÁ confirmado (não envia email)
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, recovery_token, email_change,
    email_change_token_new, email_change_token_current,
    phone_change, phone_change_token, reauthentication_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'grupoiv@arboria.com',
    crypt('grupoiv123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Professora Infantil"}'::jsonb,
    now(), now(),
    '', '', '',
    '', '',
    '', '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'grupoiv@arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'grupoiv@arboria.com'),
    'email', now(), now(), now());

  -- 2) Perfil (o trigger pode já ter criado a linha; por isso ON CONFLICT)
  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, segmento, must_change_password)
  VALUES (new_id, 'Professora Infantil', 'Professora', 'Infantil', inst, 'infantil', false)
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name, nome = EXCLUDED.nome, sobrenome = EXCLUDED.sobrenome,
    institution_id = EXCLUDED.institution_id, segmento = 'infantil', must_change_password = false;

  -- 3) Papel de professor
  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'professor') ON CONFLICT DO NOTHING;

  -- 4) Vínculo com as 4 turmas de Infantil
  INSERT INTO public.professor_turma (professor_id, turma_id, institution_id, ano_letivo, eh_regente, ativo)
  VALUES
    (new_id, '4c96fdb3-4874-4d19-8700-fc24d902333a', inst, 2026, true, true), -- Maternal 2 A
    (new_id, 'da8030ea-aa89-49fd-b3c0-cfe367ee3ae2', inst, 2026, true, true), -- Maternal 3 A
    (new_id, '824d9379-8c8f-4f30-9f1f-d92e31865bd1', inst, 2026, true, true), -- Grupo IV A
    (new_id, '171855a8-8741-4ffb-8438-d26661d5d318', inst, 2026, true, true); -- Grupo V A

  RAISE NOTICE 'Professor de teste criado: % (grupoiv@arboria.com)', new_id;
END $$;
