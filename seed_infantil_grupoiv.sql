-- =============================================================
-- Migração de TESTE do Infantil — Grupo IV (turma A)
-- Traz os alunos de arboria_alunos -> profiles + aluno_turma,
-- cria uma fase Naturalista ativa e 3 observações de exemplo.
-- Rodar no Supabase: Dashboard -> SQL Editor -> New query -> colar -> Run
-- Idempotente: pode rodar de novo sem duplicar.
-- =============================================================
DO $$
DECLARE
  r          record;
  new_id     uuid;
  inst       uuid := '00000000-0000-0000-0000-000000000001'; -- Centro Educacional Amadeus
  v_turma_id uuid;
  v_email    text;
  v_first    text;
  prof_id    uuid;
  v_fase_id  uuid;
  v_intel    int;
  v_num      int;
  v_y        int;
  cnt        int := 0;
  textos     text[] := ARRAY[
    'Separou as folhas por tamanho sem ninguém pedir e ficou só nisso.',
    'Montou uma coleção de pedrinhas e organizou por cor antes de qualquer instrução.',
    'Preferiu contar uma história com os objetos a agrupá-los — foi por outro caminho.'
  ];
BEGIN
  -- Professor de teste (já existe)
  SELECT id INTO prof_id FROM auth.users WHERE email = 'grupoiv@arboria.com';

  -- Turma destino (Grupo IV A, já criada)
  SELECT id INTO v_turma_id FROM public.turmas
   WHERE institution_id = inst AND segmento = 'infantil'
     AND serie = 'Grupo IV' AND turma_letra = 'A' LIMIT 1;

  -- Fase Naturalista ativa (cria só se ainda não houver fase de Infantil)
  SELECT id INTO v_fase_id FROM public.fases
   WHERE institution_id = inst AND segmento = 'infantil' LIMIT 1;

  IF v_fase_id IS NULL THEN
    SELECT id INTO v_intel FROM public.inteligencias WHERE lower(nome) LIKE '%naturalista%' LIMIT 1;

    -- numero_fase é 1..8 e UNIQUE(institution, ano_letivo, numero_fase).
    -- Acha o 1º par (ano, número) livre numa consulta só (a busca de fase no app é por DATA, não por ano).
    SELECT yy.ano, nn.num INTO v_y, v_num
      FROM generate_series(2026, 2035) AS yy(ano)
      CROSS JOIN generate_series(1, 8) AS nn(num)
     WHERE NOT EXISTS (
       SELECT 1 FROM public.fases f
        WHERE f.institution_id = inst AND f.ano_letivo = yy.ano AND f.numero_fase = nn.num)
     ORDER BY yy.ano, nn.num
     LIMIT 1;

    INSERT INTO public.fases (institution_id, numero_fase, inteligencia_id, segmento, serie,
                              data_inicio, data_fim, ano_letivo, ativo, semana_atual)
    VALUES (inst, v_num, v_intel, 'infantil', NULL,
            CURRENT_DATE - 3, CURRENT_DATE + 18, v_y, true, 1)
    RETURNING id INTO v_fase_id;
  END IF;

  -- Alunos do Grupo IV turma A
  FOR r IN
    SELECT * FROM public.arboria_alunos
     WHERE ativo = true AND segmento = 'infantil'
       AND serie = 'Grupo IV' AND turma = 'A'
  LOOP
    v_first := lower(regexp_replace(split_part(r.sobrenome, ' ', 1), '[^a-zA-Z]', '', 'g'));
    v_email := lower(regexp_replace(r.nome, '[^a-zA-Z]', '', 'g')) || '.' || v_first || '.'
               || regexp_replace(coalesce(r.matricula, ''), '[^0-9]', '', 'g') || '@aluno.arboria.com';

    -- Pula se já existe
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = v_email) THEN CONTINUE; END IF;

    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change, email_change_token_new,
      email_change_token_current, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
      v_email, crypt('aluno123', gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', r.nome || ' ' || r.sobrenome),
      now(), now(), '', '', '', '', '', '', '', ''
    ) RETURNING id INTO new_id;

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), new_id, v_email,
      jsonb_build_object('sub', new_id::text, 'email', v_email), 'email', now(), now(), now());

    INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, segmento, matricula_externa, must_change_password)
    VALUES (new_id, r.nome || ' ' || r.sobrenome, r.nome, r.sobrenome, inst, r.serie, r.turma, 'infantil', r.matricula, false)
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, nome = EXCLUDED.nome, sobrenome = EXCLUDED.sobrenome,
      institution_id = EXCLUDED.institution_id, serie = EXCLUDED.serie, turma = EXCLUDED.turma,
      segmento = 'infantil', matricula_externa = EXCLUDED.matricula_externa, must_change_password = false;

    INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;

    INSERT INTO public.aluno_turma (aluno_id, turma_id, ano_letivo, ativo)
    VALUES (new_id, v_turma_id, 2026, true);

    -- 3 observações de exemplo nos primeiros alunos (pro thread mostrar conteúdo)
    cnt := cnt + 1;
    IF cnt <= 3 AND prof_id IS NOT NULL AND v_fase_id IS NOT NULL THEN
      INSERT INTO public.observacoes (aluno_id, professor_id, turma_id, fase_id, institution_id, observacao_texto, data_observacao)
      VALUES (new_id, prof_id, v_turma_id, v_fase_id, inst, textos[cnt], CURRENT_DATE - (cnt * 2));
    END IF;
  END LOOP;

  RAISE NOTICE 'Migração Grupo IV A concluída. Fase: %, alunos novos com observação: %', v_fase_id, LEAST(cnt,3);
END $$;
