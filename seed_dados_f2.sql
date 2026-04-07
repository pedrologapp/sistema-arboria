-- ============================================================
-- SEED DATA: Arboria F2 - Centro Educacional Amadeus
-- Run this AFTER the schema migration in Supabase SQL Editor
-- Generated automatically - 160 F2 students
-- ============================================================

-- Ensure pgcrypto is available
CREATE EXTENSION IF NOT EXISTS pgcrypto;

BEGIN;

-- ============================================================
-- 1. INSTITUTION
-- ============================================================
INSERT INTO public.institutions (id, name)
VALUES ('00000000-0000-0000-0000-000000000001', 'Centro Educacional Amadeus')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.institution_settings (institution_id, ano_letivo_atual)
VALUES ('00000000-0000-0000-0000-000000000001', 2026)
ON CONFLICT (institution_id) DO UPDATE SET ano_letivo_atual = 2026;

-- ============================================================
-- 2. INTELIGENCIAS (8 casas)
-- ============================================================
INSERT INTO public.inteligencias (id, codigo, nome, emoji, cor_hex, descricao, ordem, brasao_url) VALUES
(1, 'linguistica', 'Linguística', '📝', '#3B82F6', 'Inteligência Linguística - capacidade de usar palavras de forma eficaz', 1, '/brasoes/linguistica.png'),
(2, 'logico_matematica', 'Lógico-Matemática', '🔢', '#10B981', 'Inteligência Lógico-Matemática - capacidade de usar números e raciocínio lógico', 2, '/brasoes/logico_matematica.png'),
(3, 'espacial', 'Espacial', '🎨', '#F59E0B', 'Inteligência Espacial - capacidade de perceber o mundo visual-espacial', 3, '/brasoes/espacial.png'),
(4, 'musical', 'Musical', '🎵', '#8B5CF6', 'Inteligência Musical - capacidade de perceber, discriminar e expressar formas musicais', 4, '/brasoes/musical.png'),
(5, 'corporal_cinestesica', 'Corporal-Cinestésica', '🏃', '#EF4444', 'Inteligência Corporal-Cinestésica - capacidade de usar o corpo para expressar ideias', 5, '/brasoes/corporal_cinestesica.png'),
(6, 'naturalista', 'Naturalista', '🌿', '#22C55E', 'Inteligência Naturalista - capacidade de reconhecer e classificar elementos da natureza', 6, '/brasoes/logonaturalista.png'),
(7, 'interpessoal', 'Interpessoal', '👥', '#EC4899', 'Inteligência Interpessoal - capacidade de perceber e fazer distinções no humor e intenções dos outros', 7, '/brasoes/interpessoal.png'),
(8, 'intrapessoal', 'Intrapessoal', '🧘', '#6366F1', 'Inteligência Intrapessoal - autoconhecimento e capacidade de agir adaptativamente', 8, '/brasoes/intrapessoal.png')
ON CONFLICT (id) DO UPDATE SET
  codigo = EXCLUDED.codigo,
  nome = EXCLUDED.nome,
  emoji = EXCLUDED.emoji,
  cor_hex = EXCLUDED.cor_hex,
  descricao = EXCLUDED.descricao,
  ordem = EXCLUDED.ordem,
  brasao_url = EXCLUDED.brasao_url;

-- ============================================================
-- 3. SINAIS (17 standard signals)
-- ============================================================
INSERT INTO public.sinais (id, codigo, emoji, label_pt, pilar, valencia, peso_inteligencia, ordem) VALUES
(1,  'brilhou',        '⭐', 'Brilhou',          'cognitivo',     'positivo', 15, 1),
(2,  'pegou_rapido',   '🚀', 'Pegou rapido',     'cognitivo',     'positivo', 10, 2),
(3,  'inovou',         '💡', 'Inovou',           'cognitivo',     'positivo', 15, 3),
(4,  'persistiu',      '💪', 'Persistiu',        'nao_cognitivo', 'positivo', 10, 4),
(5,  'liderou',        '🦅', 'Liderou',          'nao_cognitivo', 'positivo', 10, 5),
(6,  'conectou',       '🤝', 'Conectou',         'social',        'positivo', 10, 6),
(7,  'estava_leve',    '😊', 'Estava leve',      'emocional',     'positivo', 5,  7),
(8,  'travou',         '🧱', 'Travou',           'cognitivo',     'atencao',  -5, 8),
(9,  'desistiu',       '😤', 'Desistiu',         'nao_cognitivo', 'atencao', -10, 9),
(10, 'isolou_se',      '🚫', 'Isolou-se',        'social',        'atencao',  -5, 10),
(11, 'estava_calado',  '😶', 'Estava calado',    'social',        'atencao',   0, 11),
(12, 'conflitou',      '💥', 'Conflitou',        'social',        'atencao',  -5, 12),
(13, 'estava_pesado',  '😔', 'Estava pesado',    'emocional',     'atencao',   0, 13),
(14, 'ansioso',        '🌀', 'Parecia ansioso',  'emocional',     'atencao',   0, 14),
(15, 'algo_estranho',  '⚠️', 'Algo estranho',    'emocional',     'atencao',   0, 15),
(16, 'outro_positivo', '➕', 'Outro',            'emocional',     'positivo',  5, 100),
(17, 'outro_atencao',  '➕', 'Outro',            'emocional',     'atencao',   0, 100)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 4. FASES (Phase 1 completed + Phase 2 active)
-- ============================================================

-- Phase 1: Corporal-Cinestésica (completed)
INSERT INTO public.fases (institution_id, ano_letivo, numero_fase, inteligencia_id, semana_atual, data_inicio, data_fim, ativo, segmento)
VALUES ('00000000-0000-0000-0000-000000000001', 2026, 1, 5, 4, '2026-03-02', '2026-04-12', false, 'fundamental2')
ON CONFLICT DO NOTHING;

-- Phase 2: Interpessoal (active, starting next week)
INSERT INTO public.fases (institution_id, ano_letivo, numero_fase, inteligencia_id, semana_atual, data_inicio, data_fim, ativo, segmento)
VALUES ('00000000-0000-0000-0000-000000000001', 2026, 2, 7, 1, '2026-04-13', '2026-05-10', true, 'fundamental2')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 5. CHAT CHANNELS (per casa + cross-casa)
-- ============================================================

-- Casa Linguística
INSERT INTO public.canais_casa (institution_id, casa_id, nome, tipo, apenas_lideranca, ordem)
VALUES ('00000000-0000-0000-0000-000000000001', 1, 'Geral', 'texto', false, 1)
ON CONFLICT (institution_id, casa_id, nome) DO NOTHING;

INSERT INTO public.canais_casa (institution_id, casa_id, nome, tipo, apenas_lideranca, ordem)
VALUES ('00000000-0000-0000-0000-000000000001', 1, 'Liderança', 'lideranca_casa', true, 2)
ON CONFLICT (institution_id, casa_id, nome) DO NOTHING;

-- Casa Lógico-Matemática
INSERT INTO public.canais_casa (institution_id, casa_id, nome, tipo, apenas_lideranca, ordem)
VALUES ('00000000-0000-0000-0000-000000000001', 2, 'Geral', 'texto', false, 1)
ON CONFLICT (institution_id, casa_id, nome) DO NOTHING;

INSERT INTO public.canais_casa (institution_id, casa_id, nome, tipo, apenas_lideranca, ordem)
VALUES ('00000000-0000-0000-0000-000000000001', 2, 'Liderança', 'lideranca_casa', true, 2)
ON CONFLICT (institution_id, casa_id, nome) DO NOTHING;

-- Casa Espacial
INSERT INTO public.canais_casa (institution_id, casa_id, nome, tipo, apenas_lideranca, ordem)
VALUES ('00000000-0000-0000-0000-000000000001', 3, 'Geral', 'texto', false, 1)
ON CONFLICT (institution_id, casa_id, nome) DO NOTHING;

INSERT INTO public.canais_casa (institution_id, casa_id, nome, tipo, apenas_lideranca, ordem)
VALUES ('00000000-0000-0000-0000-000000000001', 3, 'Liderança', 'lideranca_casa', true, 2)
ON CONFLICT (institution_id, casa_id, nome) DO NOTHING;

-- Casa Musical
INSERT INTO public.canais_casa (institution_id, casa_id, nome, tipo, apenas_lideranca, ordem)
VALUES ('00000000-0000-0000-0000-000000000001', 4, 'Geral', 'texto', false, 1)
ON CONFLICT (institution_id, casa_id, nome) DO NOTHING;

INSERT INTO public.canais_casa (institution_id, casa_id, nome, tipo, apenas_lideranca, ordem)
VALUES ('00000000-0000-0000-0000-000000000001', 4, 'Liderança', 'lideranca_casa', true, 2)
ON CONFLICT (institution_id, casa_id, nome) DO NOTHING;

-- Casa Corporal-Cinestésica
INSERT INTO public.canais_casa (institution_id, casa_id, nome, tipo, apenas_lideranca, ordem)
VALUES ('00000000-0000-0000-0000-000000000001', 5, 'Geral', 'texto', false, 1)
ON CONFLICT (institution_id, casa_id, nome) DO NOTHING;

INSERT INTO public.canais_casa (institution_id, casa_id, nome, tipo, apenas_lideranca, ordem)
VALUES ('00000000-0000-0000-0000-000000000001', 5, 'Liderança', 'lideranca_casa', true, 2)
ON CONFLICT (institution_id, casa_id, nome) DO NOTHING;

-- Casa Naturalista
INSERT INTO public.canais_casa (institution_id, casa_id, nome, tipo, apenas_lideranca, ordem)
VALUES ('00000000-0000-0000-0000-000000000001', 6, 'Geral', 'texto', false, 1)
ON CONFLICT (institution_id, casa_id, nome) DO NOTHING;

INSERT INTO public.canais_casa (institution_id, casa_id, nome, tipo, apenas_lideranca, ordem)
VALUES ('00000000-0000-0000-0000-000000000001', 6, 'Liderança', 'lideranca_casa', true, 2)
ON CONFLICT (institution_id, casa_id, nome) DO NOTHING;

-- Casa Interpessoal
INSERT INTO public.canais_casa (institution_id, casa_id, nome, tipo, apenas_lideranca, ordem)
VALUES ('00000000-0000-0000-0000-000000000001', 7, 'Geral', 'texto', false, 1)
ON CONFLICT (institution_id, casa_id, nome) DO NOTHING;

INSERT INTO public.canais_casa (institution_id, casa_id, nome, tipo, apenas_lideranca, ordem)
VALUES ('00000000-0000-0000-0000-000000000001', 7, 'Liderança', 'lideranca_casa', true, 2)
ON CONFLICT (institution_id, casa_id, nome) DO NOTHING;

-- Casa Intrapessoal
INSERT INTO public.canais_casa (institution_id, casa_id, nome, tipo, apenas_lideranca, ordem)
VALUES ('00000000-0000-0000-0000-000000000001', 8, 'Geral', 'texto', false, 1)
ON CONFLICT (institution_id, casa_id, nome) DO NOTHING;

INSERT INTO public.canais_casa (institution_id, casa_id, nome, tipo, apenas_lideranca, ordem)
VALUES ('00000000-0000-0000-0000-000000000001', 8, 'Liderança', 'lideranca_casa', true, 2)
ON CONFLICT (institution_id, casa_id, nome) DO NOTHING;

-- Cross-casa: Conselho de Líderes
INSERT INTO public.canais_casa (institution_id, casa_id, nome, tipo, apenas_lideranca, ordem)
VALUES ('00000000-0000-0000-0000-000000000001', 1, 'Conselho de Líderes', 'conselho_lideres', true, 3)
ON CONFLICT (institution_id, casa_id, nome) DO NOTHING;

-- ============================================================
-- 6. STUDENT ACCOUNTS (160 students)
-- ============================================================

-- [1] Yasmim Gabrielly da Silva Araújo
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'yasmim.gabrielly.14552018@aluno.arboria.com',
    crypt('gabrielly123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Yasmim Gabrielly da Silva Araújo"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'yasmim.gabrielly.14552018@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'yasmim.gabrielly.14552018@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Yasmim Gabrielly da Silva Araújo', 'Yasmim', 'Gabrielly da Silva Araújo', '00000000-0000-0000-0000-000000000001', '6º Ano', 'A', 1, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [2] Ana Sophia Targino Severiano
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'ana.sophia.15662019@aluno.arboria.com',
    crypt('sophia123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Ana Sophia Targino Severiano"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'ana.sophia.15662019@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'ana.sophia.15662019@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Ana Sophia Targino Severiano', 'Ana', 'Sophia Targino Severiano', '00000000-0000-0000-0000-000000000001', '6º Ano', 'A', 1, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;

  -- Cargo: coordenador
  INSERT INTO public.cargos_casa (institution_id, casa_id, aluno_id, cargo, ano_letivo, ativo)
  VALUES ('00000000-0000-0000-0000-000000000001', 1, new_id, 'coordenador', 2026, true)
  ON CONFLICT (institution_id, casa_id, aluno_id, ano_letivo, cargo) DO NOTHING;
END $$;

-- [3] Nicole Lorhanna Verissimo do Nascimento
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'nicole.lorhanna@aluno.arboria.com',
    crypt('lorhanna123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Nicole Lorhanna Verissimo do Nascimento"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'nicole.lorhanna@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'nicole.lorhanna@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Nicole Lorhanna Verissimo do Nascimento', 'Nicole', 'Lorhanna Verissimo do Nascimento', '00000000-0000-0000-0000-000000000001', '6º Ano', 'A', 6, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [4] Adryan Samuel da Silva Dantas
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'adryan.samuel.22872026@aluno.arboria.com',
    crypt('samuel123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Adryan Samuel da Silva Dantas"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'adryan.samuel.22872026@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'adryan.samuel.22872026@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Adryan Samuel da Silva Dantas', 'Adryan', 'Samuel da Silva Dantas', '00000000-0000-0000-0000-000000000001', '6º Ano', 'A', 1, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [5] Alice Feitosa de Sousa Fernandes
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'alice.feitosa.22372026@aluno.arboria.com',
    crypt('feitosa123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Alice Feitosa de Sousa Fernandes"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'alice.feitosa.22372026@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'alice.feitosa.22372026@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Alice Feitosa de Sousa Fernandes', 'Alice', 'Feitosa de Sousa Fernandes', '00000000-0000-0000-0000-000000000001', '6º Ano', 'A', 4, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [6] Ana Clarice de Sá Cruz
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'ana.clarice.22332026@aluno.arboria.com',
    crypt('clarice123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Ana Clarice de Sá Cruz"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'ana.clarice.22332026@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'ana.clarice.22332026@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Ana Clarice de Sá Cruz', 'Ana', 'Clarice de Sá Cruz', '00000000-0000-0000-0000-000000000001', '6º Ano', 'A', 7, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [7] Ana Thereza Guimarães Fernandes
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'ana.thereza.18482022@aluno.arboria.com',
    crypt('thereza123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Ana Thereza Guimarães Fernandes"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'ana.thereza.18482022@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'ana.thereza.18482022@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Ana Thereza Guimarães Fernandes', 'Ana', 'Thereza Guimarães Fernandes', '00000000-0000-0000-0000-000000000001', '6º Ano', 'A', 7, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [8] Anna Júlia Costa Sales
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'anna.julia.19302022@aluno.arboria.com',
    crypt('julia123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Anna Júlia Costa Sales"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'anna.julia.19302022@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'anna.julia.19302022@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Anna Júlia Costa Sales', 'Anna', 'Júlia Costa Sales', '00000000-0000-0000-0000-000000000001', '6º Ano', 'A', 8, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [9] Arthur Santos de França
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'arthur.santos.19642022@aluno.arboria.com',
    crypt('santos123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Arthur Santos de França"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'arthur.santos.19642022@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'arthur.santos.19642022@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Arthur Santos de França', 'Arthur', 'Santos de França', '00000000-0000-0000-0000-000000000001', '6º Ano', 'A', 7, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [10] Artur Pereira da Silva
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'artur.pereira.22582026@aluno.arboria.com',
    crypt('pereira123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Artur Pereira da Silva"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'artur.pereira.22582026@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'artur.pereira.22582026@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Artur Pereira da Silva', 'Artur', 'Pereira da Silva', '00000000-0000-0000-0000-000000000001', '6º Ano', 'A', 4, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;

  -- Cargo: coordenador
  INSERT INTO public.cargos_casa (institution_id, casa_id, aluno_id, cargo, ano_letivo, ativo)
  VALUES ('00000000-0000-0000-0000-000000000001', 4, new_id, 'coordenador', 2026, true)
  ON CONFLICT (institution_id, casa_id, aluno_id, ano_letivo, cargo) DO NOTHING;
END $$;

-- [11] Aslan Gabriel Soares De Freitas Rocha
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'aslan.gabriel.16762020@aluno.arboria.com',
    crypt('gabriel123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Aslan Gabriel Soares De Freitas Rocha"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'aslan.gabriel.16762020@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'aslan.gabriel.16762020@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Aslan Gabriel Soares De Freitas Rocha', 'Aslan', 'Gabriel Soares De Freitas Rocha', '00000000-0000-0000-0000-000000000001', '6º Ano', 'A', 2, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;

  -- Cargo: coordenador
  INSERT INTO public.cargos_casa (institution_id, casa_id, aluno_id, cargo, ano_letivo, ativo)
  VALUES ('00000000-0000-0000-0000-000000000001', 2, new_id, 'coordenador', 2026, true)
  ON CONFLICT (institution_id, casa_id, aluno_id, ano_letivo, cargo) DO NOTHING;
END $$;

-- [12] Bianca Tavares de Brito
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'bianca.tavares.22312026@aluno.arboria.com',
    crypt('tavares123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Bianca Tavares de Brito"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'bianca.tavares.22312026@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'bianca.tavares.22312026@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Bianca Tavares de Brito', 'Bianca', 'Tavares de Brito', '00000000-0000-0000-0000-000000000001', '6º Ano', 'A', 3, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;

  -- Cargo: coordenador
  INSERT INTO public.cargos_casa (institution_id, casa_id, aluno_id, cargo, ano_letivo, ativo)
  VALUES ('00000000-0000-0000-0000-000000000001', 3, new_id, 'coordenador', 2026, true)
  ON CONFLICT (institution_id, casa_id, aluno_id, ano_letivo, cargo) DO NOTHING;
END $$;

-- [13] Eloah Maria Oliveira dos Santos
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'eloah.maria.17252021@aluno.arboria.com',
    crypt('maria123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Eloah Maria Oliveira dos Santos"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'eloah.maria.17252021@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'eloah.maria.17252021@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Eloah Maria Oliveira dos Santos', 'Eloah', 'Maria Oliveira dos Santos', '00000000-0000-0000-0000-000000000001', '6º Ano', 'A', 6, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [14] Ícaro Ryan de Lima Silva
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'icaro.ryan.21872025@aluno.arboria.com',
    crypt('ryan123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Ícaro Ryan de Lima Silva"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'icaro.ryan.21872025@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'icaro.ryan.21872025@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Ícaro Ryan de Lima Silva', 'Ícaro', 'Ryan de Lima Silva', '00000000-0000-0000-0000-000000000001', '6º Ano', 'A', 6, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [15] Jose Caio Nunes da Silva
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'jose.caio.17352021@aluno.arboria.com',
    crypt('caio123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Jose Caio Nunes da Silva"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'jose.caio.17352021@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'jose.caio.17352021@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Jose Caio Nunes da Silva', 'Jose', 'Caio Nunes da Silva', '00000000-0000-0000-0000-000000000001', '6º Ano', 'A', 6, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [16] Julia Beatriz Felix Oliveira
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'julia.beatriz.13782017@aluno.arboria.com',
    crypt('beatriz123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Julia Beatriz Felix Oliveira"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'julia.beatriz.13782017@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'julia.beatriz.13782017@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Julia Beatriz Felix Oliveira', 'Julia', 'Beatriz Felix Oliveira', '00000000-0000-0000-0000-000000000001', '6º Ano', 'A', 5, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [17] Julia Lais Duarte de Medeiros
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'julia.lais.22612026@aluno.arboria.com',
    crypt('lais123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Julia Lais Duarte de Medeiros"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'julia.lais.22612026@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'julia.lais.22612026@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Julia Lais Duarte de Medeiros', 'Julia', 'Lais Duarte de Medeiros', '00000000-0000-0000-0000-000000000001', '6º Ano', 'A', 7, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [18] Júlya Emanuelle Ferreira da Silva
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'julya.emanuelle.22462026@aluno.arboria.com',
    crypt('emanuelle123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Júlya Emanuelle Ferreira da Silva"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'julya.emanuelle.22462026@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'julya.emanuelle.22462026@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Júlya Emanuelle Ferreira da Silva', 'Júlya', 'Emanuelle Ferreira da Silva', '00000000-0000-0000-0000-000000000001', '6º Ano', 'A', 8, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [19] Karoline Morais dos Santos
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'karoline.morais.14532018@aluno.arboria.com',
    crypt('morais123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Karoline Morais dos Santos"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'karoline.morais.14532018@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'karoline.morais.14532018@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Karoline Morais dos Santos', 'Karoline', 'Morais dos Santos', '00000000-0000-0000-0000-000000000001', '6º Ano', 'A', 5, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;

  -- Cargo: coordenador
  INSERT INTO public.cargos_casa (institution_id, casa_id, aluno_id, cargo, ano_letivo, ativo)
  VALUES ('00000000-0000-0000-0000-000000000001', 5, new_id, 'coordenador', 2026, true)
  ON CONFLICT (institution_id, casa_id, aluno_id, ano_letivo, cargo) DO NOTHING;
END $$;

-- [20] Lara Sofia da Silva Oliveira
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'lara.sofia.19652022@aluno.arboria.com',
    crypt('sofia123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Lara Sofia da Silva Oliveira"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'lara.sofia.19652022@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'lara.sofia.19652022@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Lara Sofia da Silva Oliveira', 'Lara', 'Sofia da Silva Oliveira', '00000000-0000-0000-0000-000000000001', '6º Ano', 'A', 5, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [21] Lucas de Freitas Cruz Bulhões
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'lucas.freitas.14752018@aluno.arboria.com',
    crypt('freitas123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Lucas de Freitas Cruz Bulhões"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'lucas.freitas.14752018@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'lucas.freitas.14752018@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Lucas de Freitas Cruz Bulhões', 'Lucas', 'de Freitas Cruz Bulhões', '00000000-0000-0000-0000-000000000001', '6º Ano', 'A', 7, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [22] Luiz Arthur dos Santos Maia
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'luiz.arthur.13042017@aluno.arboria.com',
    crypt('arthur123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Luiz Arthur dos Santos Maia"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'luiz.arthur.13042017@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'luiz.arthur.13042017@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Luiz Arthur dos Santos Maia', 'Luiz', 'Arthur dos Santos Maia', '00000000-0000-0000-0000-000000000001', '6º Ano', 'A', 7, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [23] Maria Cecilia de Pereira Sousa
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'maria.cecilia.17322021@aluno.arboria.com',
    crypt('cecilia123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Maria Cecilia de Pereira Sousa"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'maria.cecilia.17322021@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'maria.cecilia.17322021@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Maria Cecilia de Pereira Sousa', 'Maria', 'Cecilia de Pereira Sousa', '00000000-0000-0000-0000-000000000001', '6º Ano', 'A', 6, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [24] Maria Cecilia França dos Santos
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'maria.cecilia.21982025@aluno.arboria.com',
    crypt('cecilia123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Maria Cecilia França dos Santos"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'maria.cecilia.21982025@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'maria.cecilia.21982025@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Maria Cecilia França dos Santos', 'Maria', 'Cecilia França dos Santos', '00000000-0000-0000-0000-000000000001', '6º Ano', 'A', 7, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [25] Maria Elis Martins de Oliveira
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'maria.elis.17442021@aluno.arboria.com',
    crypt('elis123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Maria Elis Martins de Oliveira"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'maria.elis.17442021@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'maria.elis.17442021@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Maria Elis Martins de Oliveira', 'Maria', 'Elis Martins de Oliveira', '00000000-0000-0000-0000-000000000001', '6º Ano', 'A', 5, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [26] Marianna Rosa Gomes da Silva
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'marianna.rosa.22752026@aluno.arboria.com',
    crypt('rosa123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Marianna Rosa Gomes da Silva"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'marianna.rosa.22752026@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'marianna.rosa.22752026@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Marianna Rosa Gomes da Silva', 'Marianna', 'Rosa Gomes da Silva', '00000000-0000-0000-0000-000000000001', '6º Ano', 'A', 8, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;

  -- Cargo: coordenador
  INSERT INTO public.cargos_casa (institution_id, casa_id, aluno_id, cargo, ano_letivo, ativo)
  VALUES ('00000000-0000-0000-0000-000000000001', 8, new_id, 'coordenador', 2026, true)
  ON CONFLICT (institution_id, casa_id, aluno_id, ano_letivo, cargo) DO NOTHING;
END $$;

-- [27] Marina Gabrielly Oliveira Dantas
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'marina.gabrielly.17662021@aluno.arboria.com',
    crypt('gabrielly123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Marina Gabrielly Oliveira Dantas"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'marina.gabrielly.17662021@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'marina.gabrielly.17662021@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Marina Gabrielly Oliveira Dantas', 'Marina', 'Gabrielly Oliveira Dantas', '00000000-0000-0000-0000-000000000001', '6º Ano', 'A', 7, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;

  -- Cargo: coordenador
  INSERT INTO public.cargos_casa (institution_id, casa_id, aluno_id, cargo, ano_letivo, ativo)
  VALUES ('00000000-0000-0000-0000-000000000001', 7, new_id, 'coordenador', 2026, true)
  ON CONFLICT (institution_id, casa_id, aluno_id, ano_letivo, cargo) DO NOTHING;
END $$;

-- [28] Nicole Pietra de Almeida Alcantara
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'nicole.pietra.14392018@aluno.arboria.com',
    crypt('pietra123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Nicole Pietra de Almeida Alcantara"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'nicole.pietra.14392018@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'nicole.pietra.14392018@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Nicole Pietra de Almeida Alcantara', 'Nicole', 'Pietra de Almeida Alcantara', '00000000-0000-0000-0000-000000000001', '6º Ano', 'A', 6, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [29] Pedro Lucas Tarquinio da Costa Bezerra
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'pedro.lucas.18292022@aluno.arboria.com',
    crypt('lucas123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Pedro Lucas Tarquinio da Costa Bezerra"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'pedro.lucas.18292022@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'pedro.lucas.18292022@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Pedro Lucas Tarquinio da Costa Bezerra', 'Pedro', 'Lucas Tarquinio da Costa Bezerra', '00000000-0000-0000-0000-000000000001', '6º Ano', 'A', 3, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [30] Ruth Isabelly Lira Rodrigues
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'ruth.isabelly.19382022@aluno.arboria.com',
    crypt('isabelly123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Ruth Isabelly Lira Rodrigues"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'ruth.isabelly.19382022@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'ruth.isabelly.19382022@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Ruth Isabelly Lira Rodrigues', 'Ruth', 'Isabelly Lira Rodrigues', '00000000-0000-0000-0000-000000000001', '6º Ano', 'A', 6, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [31] Sara Eduarda Melo de Oliveira
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'sara.eduarda.19182022@aluno.arboria.com',
    crypt('eduarda123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Sara Eduarda Melo de Oliveira"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'sara.eduarda.19182022@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'sara.eduarda.19182022@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Sara Eduarda Melo de Oliveira', 'Sara', 'Eduarda Melo de Oliveira', '00000000-0000-0000-0000-000000000001', '6º Ano', 'A', 6, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;

  -- Cargo: coordenador
  INSERT INTO public.cargos_casa (institution_id, casa_id, aluno_id, cargo, ano_letivo, ativo)
  VALUES ('00000000-0000-0000-0000-000000000001', 6, new_id, 'coordenador', 2026, true)
  ON CONFLICT (institution_id, casa_id, aluno_id, ano_letivo, cargo) DO NOTHING;
END $$;

-- [32] Ana Sophia Ferreira da Silva
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'ana.sophia.23082026@aluno.arboria.com',
    crypt('sophia123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Ana Sophia Ferreira da Silva"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'ana.sophia.23082026@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'ana.sophia.23082026@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Ana Sophia Ferreira da Silva', 'Ana', 'Sophia Ferreira da Silva', '00000000-0000-0000-0000-000000000001', '6º Ano', 'B', 7, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [33] Aysla Sophia Farias Camilo
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'aysla.sophia.20332022@aluno.arboria.com',
    crypt('sophia123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Aysla Sophia Farias Camilo"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'aysla.sophia.20332022@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'aysla.sophia.20332022@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Aysla Sophia Farias Camilo', 'Aysla', 'Sophia Farias Camilo', '00000000-0000-0000-0000-000000000001', '6º Ano', 'B', 5, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [34] Esther de Oliveira Rosário
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'esther.oliveira.14432018@aluno.arboria.com',
    crypt('oliveira123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Esther de Oliveira Rosário"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'esther.oliveira.14432018@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'esther.oliveira.14432018@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Esther de Oliveira Rosário', 'Esther', 'de Oliveira Rosário', '00000000-0000-0000-0000-000000000001', '6º Ano', 'B', 8, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;

  -- Cargo: coordenador
  INSERT INTO public.cargos_casa (institution_id, casa_id, aluno_id, cargo, ano_letivo, ativo)
  VALUES ('00000000-0000-0000-0000-000000000001', 8, new_id, 'coordenador', 2026, true)
  ON CONFLICT (institution_id, casa_id, aluno_id, ano_letivo, cargo) DO NOTHING;
END $$;

-- [35] Felipe Miguel Gomes da Silva Amarante
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'felipe.miguel.13162017@aluno.arboria.com',
    crypt('miguel123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Felipe Miguel Gomes da Silva Amarante"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'felipe.miguel.13162017@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'felipe.miguel.13162017@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Felipe Miguel Gomes da Silva Amarante', 'Felipe', 'Miguel Gomes da Silva Amarante', '00000000-0000-0000-0000-000000000001', '6º Ano', 'B', 2, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;

  -- Cargo: coordenador
  INSERT INTO public.cargos_casa (institution_id, casa_id, aluno_id, cargo, ano_letivo, ativo)
  VALUES ('00000000-0000-0000-0000-000000000001', 2, new_id, 'coordenador', 2026, true)
  ON CONFLICT (institution_id, casa_id, aluno_id, ano_letivo, cargo) DO NOTHING;
END $$;

-- [36] Gustavo Gregório Tavares da Silva
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'gustavo.gregorio.13072017@aluno.arboria.com',
    crypt('gregorio123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Gustavo Gregório Tavares da Silva"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'gustavo.gregorio.13072017@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'gustavo.gregorio.13072017@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Gustavo Gregório Tavares da Silva', 'Gustavo', 'Gregório Tavares da Silva', '00000000-0000-0000-0000-000000000001', '6º Ano', 'B', 2, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [37] Isabela Queiroz Lima de Araújo
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'isabela.queiroz.22002025@aluno.arboria.com',
    crypt('queiroz123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Isabela Queiroz Lima de Araújo"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'isabela.queiroz.22002025@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'isabela.queiroz.22002025@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Isabela Queiroz Lima de Araújo', 'Isabela', 'Queiroz Lima de Araújo', '00000000-0000-0000-0000-000000000001', '6º Ano', 'B', 7, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [38] Isabela Raquel Ferreira da Cunha
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'isabela.raquel.14492018@aluno.arboria.com',
    crypt('raquel123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Isabela Raquel Ferreira da Cunha"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'isabela.raquel.14492018@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'isabela.raquel.14492018@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Isabela Raquel Ferreira da Cunha', 'Isabela', 'Raquel Ferreira da Cunha', '00000000-0000-0000-0000-000000000001', '6º Ano', 'B', 4, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [39] João Lucas Freitas da Silva
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'joao.lucas.17432021@aluno.arboria.com',
    crypt('lucas123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"João Lucas Freitas da Silva"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'joao.lucas.17432021@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'joao.lucas.17432021@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'João Lucas Freitas da Silva', 'João', 'Lucas Freitas da Silva', '00000000-0000-0000-0000-000000000001', '6º Ano', 'B', 6, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [40] João Pedro Dias Teodosio
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'joao.pedro.12932016@aluno.arboria.com',
    crypt('pedro123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"João Pedro Dias Teodosio"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'joao.pedro.12932016@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'joao.pedro.12932016@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'João Pedro Dias Teodosio', 'João', 'Pedro Dias Teodosio', '00000000-0000-0000-0000-000000000001', '6º Ano', 'B', 5, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [41] Julia Gabriela de Macêdo Lima
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'julia.gabriela.14982018@aluno.arboria.com',
    crypt('gabriela123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Julia Gabriela de Macêdo Lima"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'julia.gabriela.14982018@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'julia.gabriela.14982018@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Julia Gabriela de Macêdo Lima', 'Julia', 'Gabriela de Macêdo Lima', '00000000-0000-0000-0000-000000000001', '6º Ano', 'B', 7, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;

  -- Cargo: coordenador
  INSERT INTO public.cargos_casa (institution_id, casa_id, aluno_id, cargo, ano_letivo, ativo)
  VALUES ('00000000-0000-0000-0000-000000000001', 7, new_id, 'coordenador', 2026, true)
  ON CONFLICT (institution_id, casa_id, aluno_id, ano_letivo, cargo) DO NOTHING;
END $$;

-- [42] Ketelyn Lohane Aires Barbosa
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'ketelyn.lohane.13082017@aluno.arboria.com',
    crypt('lohane123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Ketelyn Lohane Aires Barbosa"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'ketelyn.lohane.13082017@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'ketelyn.lohane.13082017@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Ketelyn Lohane Aires Barbosa', 'Ketelyn', 'Lohane Aires Barbosa', '00000000-0000-0000-0000-000000000001', '6º Ano', 'B', 7, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [43] Lara Gabryella Lima Siqueira do Nascimento Véras
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'lara.gabryella.14572018@aluno.arboria.com',
    crypt('gabryella123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Lara Gabryella Lima Siqueira do Nascimento Véras"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'lara.gabryella.14572018@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'lara.gabryella.14572018@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Lara Gabryella Lima Siqueira do Nascimento Véras', 'Lara', 'Gabryella Lima Siqueira do Nascimento Véras', '00000000-0000-0000-0000-000000000001', '6º Ano', 'B', 7, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [44] Levi Olinto de Araújo
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'levi.olinto.13642017@aluno.arboria.com',
    crypt('olinto123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Levi Olinto de Araújo"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'levi.olinto.13642017@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'levi.olinto.13642017@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Levi Olinto de Araújo', 'Levi', 'Olinto de Araújo', '00000000-0000-0000-0000-000000000001', '6º Ano', 'B', 5, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [45] Luiz Henrique Pinheiro da Silva
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'luiz.henrique.21142024@aluno.arboria.com',
    crypt('henrique123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Luiz Henrique Pinheiro da Silva"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'luiz.henrique.21142024@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'luiz.henrique.21142024@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Luiz Henrique Pinheiro da Silva', 'Luiz', 'Henrique Pinheiro da Silva', '00000000-0000-0000-0000-000000000001', '6º Ano', 'B', 2, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [46] Maria Cecília Moura de Brito
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'maria.cecilia.15982019@aluno.arboria.com',
    crypt('cecilia123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Maria Cecília Moura de Brito"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'maria.cecilia.15982019@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'maria.cecilia.15982019@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Maria Cecília Moura de Brito', 'Maria', 'Cecília Moura de Brito', '00000000-0000-0000-0000-000000000001', '6º Ano', 'B', 7, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [47] Maria Julia de Freitas Arnaud
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'maria.julia.14592018@aluno.arboria.com',
    crypt('julia123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Maria Julia de Freitas Arnaud"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'maria.julia.14592018@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'maria.julia.14592018@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Maria Julia de Freitas Arnaud', 'Maria', 'Julia de Freitas Arnaud', '00000000-0000-0000-0000-000000000001', '6º Ano', 'B', 5, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [48] Maria Vitória Silva de Oliveira
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'maria.vitoria.22912026@aluno.arboria.com',
    crypt('vitoria123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Maria Vitória Silva de Oliveira"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'maria.vitoria.22912026@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'maria.vitoria.22912026@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Maria Vitória Silva de Oliveira', 'Maria', 'Vitória Silva de Oliveira', '00000000-0000-0000-0000-000000000001', '6º Ano', 'B', 4, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;

  -- Cargo: coordenador
  INSERT INTO public.cargos_casa (institution_id, casa_id, aluno_id, cargo, ano_letivo, ativo)
  VALUES ('00000000-0000-0000-0000-000000000001', 4, new_id, 'coordenador', 2026, true)
  ON CONFLICT (institution_id, casa_id, aluno_id, ano_letivo, cargo) DO NOTHING;
END $$;

-- [49] Miguel Oceone Martins Maia
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'miguel.oceone.13722017@aluno.arboria.com',
    crypt('oceone123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Miguel Oceone Martins Maia"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'miguel.oceone.13722017@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'miguel.oceone.13722017@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Miguel Oceone Martins Maia', 'Miguel', 'Oceone Martins Maia', '00000000-0000-0000-0000-000000000001', '6º Ano', 'B', 5, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [50] Nicolas Miguel Santos do Vale
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'nicolas.miguel.15742019@aluno.arboria.com',
    crypt('miguel123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Nicolas Miguel Santos do Vale"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'nicolas.miguel.15742019@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'nicolas.miguel.15742019@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Nicolas Miguel Santos do Vale', 'Nicolas', 'Miguel Santos do Vale', '00000000-0000-0000-0000-000000000001', '6º Ano', 'B', 6, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [51] Samara Klaudini da Silva Costa
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'samara.klaudini.13842017@aluno.arboria.com',
    crypt('klaudini123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Samara Klaudini da Silva Costa"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'samara.klaudini.13842017@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'samara.klaudini.13842017@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Samara Klaudini da Silva Costa', 'Samara', 'Klaudini da Silva Costa', '00000000-0000-0000-0000-000000000001', '6º Ano', 'B', 6, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;

  -- Cargo: coordenador
  INSERT INTO public.cargos_casa (institution_id, casa_id, aluno_id, cargo, ano_letivo, ativo)
  VALUES ('00000000-0000-0000-0000-000000000001', 6, new_id, 'coordenador', 2026, true)
  ON CONFLICT (institution_id, casa_id, aluno_id, ano_letivo, cargo) DO NOTHING;
END $$;

-- [52] Théo Henrique Bezerra de Paiva
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'theo.henrique.13712017@aluno.arboria.com',
    crypt('henrique123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Théo Henrique Bezerra de Paiva"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'theo.henrique.13712017@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'theo.henrique.13712017@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Théo Henrique Bezerra de Paiva', 'Théo', 'Henrique Bezerra de Paiva', '00000000-0000-0000-0000-000000000001', '6º Ano', 'B', 2, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [53] Valentina Luise Pereira de Farias
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'valentina.luise.17382021@aluno.arboria.com',
    crypt('luise123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Valentina Luise Pereira de Farias"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'valentina.luise.17382021@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'valentina.luise.17382021@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Valentina Luise Pereira de Farias', 'Valentina', 'Luise Pereira de Farias', '00000000-0000-0000-0000-000000000001', '6º Ano', 'B', 5, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;

  -- Cargo: coordenador
  INSERT INTO public.cargos_casa (institution_id, casa_id, aluno_id, cargo, ano_letivo, ativo)
  VALUES ('00000000-0000-0000-0000-000000000001', 5, new_id, 'coordenador', 2026, true)
  ON CONFLICT (institution_id, casa_id, aluno_id, ano_letivo, cargo) DO NOTHING;
END $$;

-- [54] Ellen do Nascimento Pires dos Santos
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'ellen.nascimento.21782025@aluno.arboria.com',
    crypt('nascimento123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Ellen do Nascimento Pires dos Santos"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'ellen.nascimento.21782025@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'ellen.nascimento.21782025@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Ellen do Nascimento Pires dos Santos', 'Ellen', 'do Nascimento Pires dos Santos', '00000000-0000-0000-0000-000000000001', '7º Ano', 'A', 1, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;

  -- Cargo: coordenador
  INSERT INTO public.cargos_casa (institution_id, casa_id, aluno_id, cargo, ano_letivo, ativo)
  VALUES ('00000000-0000-0000-0000-000000000001', 1, new_id, 'coordenador', 2026, true)
  ON CONFLICT (institution_id, casa_id, aluno_id, ano_letivo, cargo) DO NOTHING;
END $$;

-- [55] Isabelly Mayanne Souza Bandeira
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'isabelly.mayanne@aluno.arboria.com',
    crypt('mayanne123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Isabelly Mayanne Souza Bandeira"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'isabelly.mayanne@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'isabelly.mayanne@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Isabelly Mayanne Souza Bandeira', 'Isabelly', 'Mayanne Souza Bandeira', '00000000-0000-0000-0000-000000000001', '7º Ano', 'A', 3, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [56] Lucas Willian Silva Gondim
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'lucas.willian.21572025@aluno.arboria.com',
    crypt('willian123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Lucas Willian Silva Gondim"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'lucas.willian.21572025@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'lucas.willian.21572025@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Lucas Willian Silva Gondim', 'Lucas', 'Willian Silva Gondim', '00000000-0000-0000-0000-000000000001', '7º Ano', 'B', 1, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;

  -- Cargo: coordenador
  INSERT INTO public.cargos_casa (institution_id, casa_id, aluno_id, cargo, ano_letivo, ativo)
  VALUES ('00000000-0000-0000-0000-000000000001', 1, new_id, 'coordenador', 2026, true)
  ON CONFLICT (institution_id, casa_id, aluno_id, ano_letivo, cargo) DO NOTHING;
END $$;

-- [57] Aíssa Tayná Araujo Ramos
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'aissa.tayna.23122026@aluno.arboria.com',
    crypt('tayna123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Aíssa Tayná Araujo Ramos"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'aissa.tayna.23122026@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'aissa.tayna.23122026@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Aíssa Tayná Araujo Ramos', 'Aíssa', 'Tayná Araujo Ramos', '00000000-0000-0000-0000-000000000001', '7º Ano', 'A', 4, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [58] Alice Rebeca dos Reis Nogueira Martins
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'alice.rebeca.12092016@aluno.arboria.com',
    crypt('rebeca123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Alice Rebeca dos Reis Nogueira Martins"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'alice.rebeca.12092016@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'alice.rebeca.12092016@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Alice Rebeca dos Reis Nogueira Martins', 'Alice', 'Rebeca dos Reis Nogueira Martins', '00000000-0000-0000-0000-000000000001', '7º Ano', 'A', 8, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;

  -- Cargo: coordenador
  INSERT INTO public.cargos_casa (institution_id, casa_id, aluno_id, cargo, ano_letivo, ativo)
  VALUES ('00000000-0000-0000-0000-000000000001', 8, new_id, 'coordenador', 2026, true)
  ON CONFLICT (institution_id, casa_id, aluno_id, ano_letivo, cargo) DO NOTHING;
END $$;

-- [59] Ana Beatriz Monteiro de Oliveira
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'ana.beatriz.11232015@aluno.arboria.com',
    crypt('beatriz123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Ana Beatriz Monteiro de Oliveira"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'ana.beatriz.11232015@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'ana.beatriz.11232015@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Ana Beatriz Monteiro de Oliveira', 'Ana', 'Beatriz Monteiro de Oliveira', '00000000-0000-0000-0000-000000000001', '7º Ano', 'A', 6, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [60] Ana Carolina Nunes de Lima
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'ana.carolina.18372022@aluno.arboria.com',
    crypt('carolina123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Ana Carolina Nunes de Lima"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'ana.carolina.18372022@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'ana.carolina.18372022@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Ana Carolina Nunes de Lima', 'Ana', 'Carolina Nunes de Lima', '00000000-0000-0000-0000-000000000001', '7º Ano', 'A', 6, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;

  -- Cargo: coordenador
  INSERT INTO public.cargos_casa (institution_id, casa_id, aluno_id, cargo, ano_letivo, ativo)
  VALUES ('00000000-0000-0000-0000-000000000001', 6, new_id, 'coordenador', 2026, true)
  ON CONFLICT (institution_id, casa_id, aluno_id, ano_letivo, cargo) DO NOTHING;
END $$;

-- [61] André José Coelho da Silva
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'andre.jose.13772017@aluno.arboria.com',
    crypt('jose123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"André José Coelho da Silva"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'andre.jose.13772017@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'andre.jose.13772017@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'André José Coelho da Silva', 'André', 'José Coelho da Silva', '00000000-0000-0000-0000-000000000001', '7º Ano', 'A', 7, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [62] Andrei Damasceno Cardoso
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'andrei.damasceno.20312022@aluno.arboria.com',
    crypt('damasceno123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Andrei Damasceno Cardoso"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'andrei.damasceno.20312022@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'andrei.damasceno.20312022@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Andrei Damasceno Cardoso', 'Andrei', 'Damasceno Cardoso', '00000000-0000-0000-0000-000000000001', '7º Ano', 'A', 7, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [63] Anita Alves Campos
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'anita.alves.16132019@aluno.arboria.com',
    crypt('alves123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Anita Alves Campos"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'anita.alves.16132019@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'anita.alves.16132019@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Anita Alves Campos', 'Anita', 'Alves Campos', '00000000-0000-0000-0000-000000000001', '7º Ano', 'A', 7, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;

  -- Cargo: coordenador
  INSERT INTO public.cargos_casa (institution_id, casa_id, aluno_id, cargo, ano_letivo, ativo)
  VALUES ('00000000-0000-0000-0000-000000000001', 7, new_id, 'coordenador', 2026, true)
  ON CONFLICT (institution_id, casa_id, aluno_id, ano_letivo, cargo) DO NOTHING;
END $$;

-- [64] Clara Sofia Sampaio de Andrade
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'clara.sofia.13852017@aluno.arboria.com',
    crypt('sofia123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Clara Sofia Sampaio de Andrade"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'clara.sofia.13852017@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'clara.sofia.13852017@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Clara Sofia Sampaio de Andrade', 'Clara', 'Sofia Sampaio de Andrade', '00000000-0000-0000-0000-000000000001', '7º Ano', 'A', 7, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;

  -- Cargo: coordenador
  INSERT INTO public.cargos_casa (institution_id, casa_id, aluno_id, cargo, ano_letivo, ativo)
  VALUES ('00000000-0000-0000-0000-000000000001', 7, new_id, 'coordenador', 2026, true)
  ON CONFLICT (institution_id, casa_id, aluno_id, ano_letivo, cargo) DO NOTHING;
END $$;

-- [65] Dalton de Oliveira Silva
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'dalton.oliveira.17732021@aluno.arboria.com',
    crypt('oliveira123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Dalton de Oliveira Silva"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'dalton.oliveira.17732021@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'dalton.oliveira.17732021@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Dalton de Oliveira Silva', 'Dalton', 'de Oliveira Silva', '00000000-0000-0000-0000-000000000001', '7º Ano', 'A', 6, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [66] Diogo Melo Rodrigues
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'diogo.melo.17152020@aluno.arboria.com',
    crypt('melo123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Diogo Melo Rodrigues"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'diogo.melo.17152020@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'diogo.melo.17152020@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Diogo Melo Rodrigues', 'Diogo', 'Melo Rodrigues', '00000000-0000-0000-0000-000000000001', '7º Ano', 'A', 3, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [67] Heitor Cristiano Dias de Lima e Silva
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'heitor.cristiano.13242017@aluno.arboria.com',
    crypt('cristiano123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Heitor Cristiano Dias de Lima e Silva"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'heitor.cristiano.13242017@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'heitor.cristiano.13242017@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Heitor Cristiano Dias de Lima e Silva', 'Heitor', 'Cristiano Dias de Lima e Silva', '00000000-0000-0000-0000-000000000001', '7º Ano', 'A', 4, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;

  -- Cargo: coordenador
  INSERT INTO public.cargos_casa (institution_id, casa_id, aluno_id, cargo, ano_letivo, ativo)
  VALUES ('00000000-0000-0000-0000-000000000001', 4, new_id, 'coordenador', 2026, true)
  ON CONFLICT (institution_id, casa_id, aluno_id, ano_letivo, cargo) DO NOTHING;
END $$;

-- [68] João Miguel Verêda do Nascimento Teixeira da Silva
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'joao.miguel.20442022@aluno.arboria.com',
    crypt('miguel123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"João Miguel Verêda do Nascimento Teixeira da Silva"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'joao.miguel.20442022@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'joao.miguel.20442022@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'João Miguel Verêda do Nascimento Teixeira da Silva', 'João', 'Miguel Verêda do Nascimento Teixeira da Silva', '00000000-0000-0000-0000-000000000001', '7º Ano', 'A', 7, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [69] João Pedro Silva Freire
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'joao.pedro.17812022@aluno.arboria.com',
    crypt('pedro123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"João Pedro Silva Freire"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'joao.pedro.17812022@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'joao.pedro.17812022@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'João Pedro Silva Freire', 'João', 'Pedro Silva Freire', '00000000-0000-0000-0000-000000000001', '7º Ano', 'A', 6, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [70] João Victor Da Cunha Oliveira
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'joao.victor.16652020@aluno.arboria.com',
    crypt('victor123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"João Victor Da Cunha Oliveira"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'joao.victor.16652020@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'joao.victor.16652020@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'João Victor Da Cunha Oliveira', 'João', 'Victor Da Cunha Oliveira', '00000000-0000-0000-0000-000000000001', '7º Ano', 'A', 3, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [71] Júlio Adryan do Nascimento Martins
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'julio.adryan.13992017@aluno.arboria.com',
    crypt('adryan123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Júlio Adryan do Nascimento Martins"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'julio.adryan.13992017@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'julio.adryan.13992017@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Júlio Adryan do Nascimento Martins', 'Júlio', 'Adryan do Nascimento Martins', '00000000-0000-0000-0000-000000000001', '7º Ano', 'A', 5, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;

  -- Cargo: coordenador
  INSERT INTO public.cargos_casa (institution_id, casa_id, aluno_id, cargo, ano_letivo, ativo)
  VALUES ('00000000-0000-0000-0000-000000000001', 5, new_id, 'coordenador', 2026, true)
  ON CONFLICT (institution_id, casa_id, aluno_id, ano_letivo, cargo) DO NOTHING;
END $$;

-- [72] Letícia Beatriz Maia Cavalcante Santana
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'leticia.beatriz.22852026@aluno.arboria.com',
    crypt('beatriz123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Letícia Beatriz Maia Cavalcante Santana"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'leticia.beatriz.22852026@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'leticia.beatriz.22852026@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Letícia Beatriz Maia Cavalcante Santana', 'Letícia', 'Beatriz Maia Cavalcante Santana', '00000000-0000-0000-0000-000000000001', '7º Ano', 'A', 7, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [73] Lucas Gabriel Medeiros Amarante
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'lucas.gabriel.12222016@aluno.arboria.com',
    crypt('gabriel123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Lucas Gabriel Medeiros Amarante"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'lucas.gabriel.12222016@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'lucas.gabriel.12222016@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Lucas Gabriel Medeiros Amarante', 'Lucas', 'Gabriel Medeiros Amarante', '00000000-0000-0000-0000-000000000001', '7º Ano', 'A', 6, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [74] Maria Cecília de Souza Sales
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'maria.cecilia.13222017@aluno.arboria.com',
    crypt('cecilia123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Maria Cecília de Souza Sales"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'maria.cecilia.13222017@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'maria.cecilia.13222017@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Maria Cecília de Souza Sales', 'Maria', 'Cecília de Souza Sales', '00000000-0000-0000-0000-000000000001', '7º Ano', 'A', 7, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [75] Maria Fabienne Ferreira de Lima
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'maria.fabienne.21792025@aluno.arboria.com',
    crypt('fabienne123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Maria Fabienne Ferreira de Lima"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'maria.fabienne.21792025@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'maria.fabienne.21792025@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Maria Fabienne Ferreira de Lima', 'Maria', 'Fabienne Ferreira de Lima', '00000000-0000-0000-0000-000000000001', '7º Ano', 'A', 8, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [76] Maria Vitória Costa e Sales
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'maria.vitoria.19312022@aluno.arboria.com',
    crypt('vitoria123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Maria Vitória Costa e Sales"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'maria.vitoria.19312022@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'maria.vitoria.19312022@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Maria Vitória Costa e Sales', 'Maria', 'Vitória Costa e Sales', '00000000-0000-0000-0000-000000000001', '7º Ano', 'A', 3, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [77] Murilo Eric de Lima Silva
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'murilo.eric.13542017@aluno.arboria.com',
    crypt('eric123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Murilo Eric de Lima Silva"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'murilo.eric.13542017@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'murilo.eric.13542017@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Murilo Eric de Lima Silva', 'Murilo', 'Eric de Lima Silva', '00000000-0000-0000-0000-000000000001', '7º Ano', 'A', 8, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [78] Samuel Lucca Barbosa da Silva
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'samuel.lucca.20192022@aluno.arboria.com',
    crypt('lucca123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Samuel Lucca Barbosa da Silva"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'samuel.lucca.20192022@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'samuel.lucca.20192022@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Samuel Lucca Barbosa da Silva', 'Samuel', 'Lucca Barbosa da Silva', '00000000-0000-0000-0000-000000000001', '7º Ano', 'A', 6, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [79] Sophia Vyctoria Ramalho da Trindade
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'sophia.vyctoria.22212025@aluno.arboria.com',
    crypt('vyctoria123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Sophia Vyctoria Ramalho da Trindade"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'sophia.vyctoria.22212025@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'sophia.vyctoria.22212025@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Sophia Vyctoria Ramalho da Trindade', 'Sophia', 'Vyctoria Ramalho da Trindade', '00000000-0000-0000-0000-000000000001', '7º Ano', 'A', 6, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [80] Zari Cecília Nunes Vasconcelos
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'zari.cecilia.13452017@aluno.arboria.com',
    crypt('cecilia123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Zari Cecília Nunes Vasconcelos"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'zari.cecilia.13452017@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'zari.cecilia.13452017@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Zari Cecília Nunes Vasconcelos', 'Zari', 'Cecília Nunes Vasconcelos', '00000000-0000-0000-0000-000000000001', '7º Ano', 'A', 3, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;

  -- Cargo: coordenador
  INSERT INTO public.cargos_casa (institution_id, casa_id, aluno_id, cargo, ano_letivo, ativo)
  VALUES ('00000000-0000-0000-0000-000000000001', 3, new_id, 'coordenador', 2026, true)
  ON CONFLICT (institution_id, casa_id, aluno_id, ano_letivo, cargo) DO NOTHING;
END $$;

-- [81] Benjamim Ítalo de Souza Silva
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'benjamim.italo.15372019@aluno.arboria.com',
    crypt('italo123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Benjamim Ítalo de Souza Silva"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'benjamim.italo.15372019@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'benjamim.italo.15372019@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Benjamim Ítalo de Souza Silva', 'Benjamim', 'Ítalo de Souza Silva', '00000000-0000-0000-0000-000000000001', '7º Ano', 'B', 8, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [82] Bruna Mariana Feitosa Carneiro
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'bruna.mariana.18352022@aluno.arboria.com',
    crypt('mariana123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Bruna Mariana Feitosa Carneiro"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'bruna.mariana.18352022@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'bruna.mariana.18352022@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Bruna Mariana Feitosa Carneiro', 'Bruna', 'Mariana Feitosa Carneiro', '00000000-0000-0000-0000-000000000001', '7º Ano', 'B', 5, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;

  -- Cargo: coordenador
  INSERT INTO public.cargos_casa (institution_id, casa_id, aluno_id, cargo, ano_letivo, ativo)
  VALUES ('00000000-0000-0000-0000-000000000001', 5, new_id, 'coordenador', 2026, true)
  ON CONFLICT (institution_id, casa_id, aluno_id, ano_letivo, cargo) DO NOTHING;
END $$;

-- [83] Davi Dantas da Cunha
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'davi.dantas.15592019@aluno.arboria.com',
    crypt('dantas123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Davi Dantas da Cunha"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'davi.dantas.15592019@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'davi.dantas.15592019@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Davi Dantas da Cunha', 'Davi', 'Dantas da Cunha', '00000000-0000-0000-0000-000000000001', '7º Ano', 'B', 2, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [84] Hevellyn Lauane Fagundes Fraga
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'hevellyn.lauane.21832025@aluno.arboria.com',
    crypt('lauane123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Hevellyn Lauane Fagundes Fraga"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'hevellyn.lauane.21832025@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'hevellyn.lauane.21832025@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Hevellyn Lauane Fagundes Fraga', 'Hevellyn', 'Lauane Fagundes Fraga', '00000000-0000-0000-0000-000000000001', '7º Ano', 'B', 4, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [85] Isaac Batista Cordeiro
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'isaac.batista.22352026@aluno.arboria.com',
    crypt('batista123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Isaac Batista Cordeiro"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'isaac.batista.22352026@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'isaac.batista.22352026@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Isaac Batista Cordeiro', 'Isaac', 'Batista Cordeiro', '00000000-0000-0000-0000-000000000001', '7º Ano', 'B', 8, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;

  -- Cargo: coordenador
  INSERT INTO public.cargos_casa (institution_id, casa_id, aluno_id, cargo, ano_letivo, ativo)
  VALUES ('00000000-0000-0000-0000-000000000001', 8, new_id, 'coordenador', 2026, true)
  ON CONFLICT (institution_id, casa_id, aluno_id, ano_letivo, cargo) DO NOTHING;
END $$;

-- [86] José Renan da Silva Barbosa
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'jose.renan.21642025@aluno.arboria.com',
    crypt('renan123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"José Renan da Silva Barbosa"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'jose.renan.21642025@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'jose.renan.21642025@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'José Renan da Silva Barbosa', 'José', 'Renan da Silva Barbosa', '00000000-0000-0000-0000-000000000001', '7º Ano', 'B', 7, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [87] Josué da Cruz Araujo
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'josue.cruz.13522017@aluno.arboria.com',
    crypt('cruz123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Josué da Cruz Araujo"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'josue.cruz.13522017@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'josue.cruz.13522017@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Josué da Cruz Araujo', 'Josué', 'da Cruz Araujo', '00000000-0000-0000-0000-000000000001', '7º Ano', 'B', 4, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [88] Layla Felícia da Silva Mandú
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'layla.felicia.13272017@aluno.arboria.com',
    crypt('felicia123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Layla Felícia da Silva Mandú"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'layla.felicia.13272017@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'layla.felicia.13272017@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Layla Felícia da Silva Mandú', 'Layla', 'Felícia da Silva Mandú', '00000000-0000-0000-0000-000000000001', '7º Ano', 'B', 7, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [89] Letícia Yasmim Almeida Gadelha
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'leticia.yasmim.16052019@aluno.arboria.com',
    crypt('yasmim123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Letícia Yasmim Almeida Gadelha"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'leticia.yasmim.16052019@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'leticia.yasmim.16052019@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Letícia Yasmim Almeida Gadelha', 'Letícia', 'Yasmim Almeida Gadelha', '00000000-0000-0000-0000-000000000001', '7º Ano', 'B', 7, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [90] Livia Beatriz Cezário França Wanderley
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'livia.beatriz.12412016@aluno.arboria.com',
    crypt('beatriz123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Livia Beatriz Cezário França Wanderley"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'livia.beatriz.12412016@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'livia.beatriz.12412016@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Livia Beatriz Cezário França Wanderley', 'Livia', 'Beatriz Cezário França Wanderley', '00000000-0000-0000-0000-000000000001', '7º Ano', 'B', 4, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [91] Luís Davi Belchior de Oliveira
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'luis.davi.14872018@aluno.arboria.com',
    crypt('davi123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Luís Davi Belchior de Oliveira"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'luis.davi.14872018@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'luis.davi.14872018@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Luís Davi Belchior de Oliveira', 'Luís', 'Davi Belchior de Oliveira', '00000000-0000-0000-0000-000000000001', '7º Ano', 'B', 6, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;

  -- Cargo: coordenador
  INSERT INTO public.cargos_casa (institution_id, casa_id, aluno_id, cargo, ano_letivo, ativo)
  VALUES ('00000000-0000-0000-0000-000000000001', 6, new_id, 'coordenador', 2026, true)
  ON CONFLICT (institution_id, casa_id, aluno_id, ano_letivo, cargo) DO NOTHING;
END $$;

-- [92] Maísa Fernandes de Almeida
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'maisa.fernandes.21732025@aluno.arboria.com',
    crypt('fernandes123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Maísa Fernandes de Almeida"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'maisa.fernandes.21732025@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'maisa.fernandes.21732025@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Maísa Fernandes de Almeida', 'Maísa', 'Fernandes de Almeida', '00000000-0000-0000-0000-000000000001', '7º Ano', 'B', 3, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;

  -- Cargo: coordenador
  INSERT INTO public.cargos_casa (institution_id, casa_id, aluno_id, cargo, ano_letivo, ativo)
  VALUES ('00000000-0000-0000-0000-000000000001', 3, new_id, 'coordenador', 2026, true)
  ON CONFLICT (institution_id, casa_id, aluno_id, ano_letivo, cargo) DO NOTHING;
END $$;

-- [93] Maria Eduarda Fernandes Barbosa
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'maria.eduarda.21592025@aluno.arboria.com',
    crypt('eduarda123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Maria Eduarda Fernandes Barbosa"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'maria.eduarda.21592025@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'maria.eduarda.21592025@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Maria Eduarda Fernandes Barbosa', 'Maria', 'Eduarda Fernandes Barbosa', '00000000-0000-0000-0000-000000000001', '7º Ano', 'B', 2, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;

  -- Cargo: coordenador
  INSERT INTO public.cargos_casa (institution_id, casa_id, aluno_id, cargo, ano_letivo, ativo)
  VALUES ('00000000-0000-0000-0000-000000000001', 2, new_id, 'coordenador', 2026, true)
  ON CONFLICT (institution_id, casa_id, aluno_id, ano_letivo, cargo) DO NOTHING;
END $$;

-- [94] Maria Flor Jerônimo Moreira
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'maria.flor.21532025@aluno.arboria.com',
    crypt('flor123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Maria Flor Jerônimo Moreira"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'maria.flor.21532025@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'maria.flor.21532025@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Maria Flor Jerônimo Moreira', 'Maria', 'Flor Jerônimo Moreira', '00000000-0000-0000-0000-000000000001', '7º Ano', 'B', 7, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;

  -- Cargo: coordenador
  INSERT INTO public.cargos_casa (institution_id, casa_id, aluno_id, cargo, ano_letivo, ativo)
  VALUES ('00000000-0000-0000-0000-000000000001', 7, new_id, 'coordenador', 2026, true)
  ON CONFLICT (institution_id, casa_id, aluno_id, ano_letivo, cargo) DO NOTHING;
END $$;

-- [95] Maria Leticia da Silva Oliveira
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'maria.leticia.21722025@aluno.arboria.com',
    crypt('leticia123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Maria Leticia da Silva Oliveira"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'maria.leticia.21722025@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'maria.leticia.21722025@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Maria Leticia da Silva Oliveira', 'Maria', 'Leticia da Silva Oliveira', '00000000-0000-0000-0000-000000000001', '7º Ano', 'B', 5, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [96] Maria Luiza do Nascimento Ferreira
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'maria.luiza.19582022@aluno.arboria.com',
    crypt('luiza123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Maria Luiza do Nascimento Ferreira"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'maria.luiza.19582022@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'maria.luiza.19582022@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Maria Luiza do Nascimento Ferreira', 'Maria', 'Luiza do Nascimento Ferreira', '00000000-0000-0000-0000-000000000001', '7º Ano', 'B', 4, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;

  -- Cargo: coordenador
  INSERT INTO public.cargos_casa (institution_id, casa_id, aluno_id, cargo, ano_letivo, ativo)
  VALUES ('00000000-0000-0000-0000-000000000001', 4, new_id, 'coordenador', 2026, true)
  ON CONFLICT (institution_id, casa_id, aluno_id, ano_letivo, cargo) DO NOTHING;
END $$;

-- [97] Marillia Ribeiro Tomaz da Silva
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'marillia.ribeiro.18732022@aluno.arboria.com',
    crypt('ribeiro123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Marillia Ribeiro Tomaz da Silva"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'marillia.ribeiro.18732022@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'marillia.ribeiro.18732022@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Marillia Ribeiro Tomaz da Silva', 'Marillia', 'Ribeiro Tomaz da Silva', '00000000-0000-0000-0000-000000000001', '7º Ano', 'B', 4, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [98] Milena Souza de Oliveira
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'milena.souza.13232017@aluno.arboria.com',
    crypt('souza123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Milena Souza de Oliveira"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'milena.souza.13232017@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'milena.souza.13232017@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Milena Souza de Oliveira', 'Milena', 'Souza de Oliveira', '00000000-0000-0000-0000-000000000001', '7º Ano', 'B', 7, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [99] Sofia Vitória Oliveira do Nascimento
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'sofia.vitoria.12612016@aluno.arboria.com',
    crypt('vitoria123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Sofia Vitória Oliveira do Nascimento"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'sofia.vitoria.12612016@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'sofia.vitoria.12612016@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Sofia Vitória Oliveira do Nascimento', 'Sofia', 'Vitória Oliveira do Nascimento', '00000000-0000-0000-0000-000000000001', '7º Ano', 'B', 6, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [100] Dhavi Ferreira Tavares de Morais
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'dhavi.ferreira@aluno.arboria.com',
    crypt('ferreira123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Dhavi Ferreira Tavares de Morais"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'dhavi.ferreira@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'dhavi.ferreira@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Dhavi Ferreira Tavares de Morais', 'Dhavi', 'Ferreira Tavares de Morais', '00000000-0000-0000-0000-000000000001', '8º Ano', 'A', 4, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [101] Alícia Silva de Oliveira
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'alicia.silva.11262015@aluno.arboria.com',
    crypt('silva123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Alícia Silva de Oliveira"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'alicia.silva.11262015@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'alicia.silva.11262015@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Alícia Silva de Oliveira', 'Alícia', 'Silva de Oliveira', '00000000-0000-0000-0000-000000000001', '8º Ano', 'A', 1, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [102] Allyf Ferreira de Lima Júnior
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'allyf.ferreira.21162024@aluno.arboria.com',
    crypt('ferreira123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Allyf Ferreira de Lima Júnior"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'allyf.ferreira.21162024@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'allyf.ferreira.21162024@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Allyf Ferreira de Lima Júnior', 'Allyf', 'Ferreira de Lima Júnior', '00000000-0000-0000-0000-000000000001', '8º Ano', 'A', 5, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [103] Ana Júlia Silva de Araújo
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'ana.julia.16222019@aluno.arboria.com',
    crypt('julia123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Ana Júlia Silva de Araújo"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'ana.julia.16222019@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'ana.julia.16222019@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Ana Júlia Silva de Araújo', 'Ana', 'Júlia Silva de Araújo', '00000000-0000-0000-0000-000000000001', '8º Ano', 'A', 4, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [104] Ana Sophia Lima Oliveira
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'ana.sophia.15482019@aluno.arboria.com',
    crypt('sophia123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Ana Sophia Lima Oliveira"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'ana.sophia.15482019@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'ana.sophia.15482019@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Ana Sophia Lima Oliveira', 'Ana', 'Sophia Lima Oliveira', '00000000-0000-0000-0000-000000000001', '8º Ano', 'A', 7, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [105] Anthony Samuel Silva do Nascimento
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'anthony.samuel.18582022@aluno.arboria.com',
    crypt('samuel123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Anthony Samuel Silva do Nascimento"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'anthony.samuel.18582022@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'anthony.samuel.18582022@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Anthony Samuel Silva do Nascimento', 'Anthony', 'Samuel Silva do Nascimento', '00000000-0000-0000-0000-000000000001', '8º Ano', 'A', 2, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [106] Any Lais Oliveira da Cruz
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'any.lais.20882024@aluno.arboria.com',
    crypt('lais123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Any Lais Oliveira da Cruz"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'any.lais.20882024@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'any.lais.20882024@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Any Lais Oliveira da Cruz', 'Any', 'Lais Oliveira da Cruz', '00000000-0000-0000-0000-000000000001', '8º Ano', 'A', 4, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [107] Carlos Filipe Cavalcante da Silva
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'carlos.filipe.20652022@aluno.arboria.com',
    crypt('filipe123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Carlos Filipe Cavalcante da Silva"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'carlos.filipe.20652022@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'carlos.filipe.20652022@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Carlos Filipe Cavalcante da Silva', 'Carlos', 'Filipe Cavalcante da Silva', '00000000-0000-0000-0000-000000000001', '8º Ano', 'A', 8, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [108] Davi Emanuel de Melo Leonez Borges
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'davi.emanuel.17392021@aluno.arboria.com',
    crypt('emanuel123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Davi Emanuel de Melo Leonez Borges"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'davi.emanuel.17392021@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'davi.emanuel.17392021@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Davi Emanuel de Melo Leonez Borges', 'Davi', 'Emanuel de Melo Leonez Borges', '00000000-0000-0000-0000-000000000001', '8º Ano', 'A', 4, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [109] Gabriel Artidône Marinho de Oliveira
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'gabriel.artidone.11022015@aluno.arboria.com',
    crypt('artidone123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Gabriel Artidône Marinho de Oliveira"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'gabriel.artidone.11022015@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'gabriel.artidone.11022015@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Gabriel Artidône Marinho de Oliveira', 'Gabriel', 'Artidône Marinho de Oliveira', '00000000-0000-0000-0000-000000000001', '8º Ano', 'A', 1, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [110] Isabella Ferreira de Araújo
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'isabella.ferreira.22952026@aluno.arboria.com',
    crypt('ferreira123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Isabella Ferreira de Araújo"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'isabella.ferreira.22952026@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'isabella.ferreira.22952026@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Isabella Ferreira de Araújo', 'Isabella', 'Ferreira de Araújo', '00000000-0000-0000-0000-000000000001', '8º Ano', 'A', 2, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [111] Jennyfer de Souto Isidio
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'jennyfer.souto.22482026@aluno.arboria.com',
    crypt('souto123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Jennyfer de Souto Isidio"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'jennyfer.souto.22482026@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'jennyfer.souto.22482026@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Jennyfer de Souto Isidio', 'Jennyfer', 'de Souto Isidio', '00000000-0000-0000-0000-000000000001', '8º Ano', 'A', 7, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [112] João Gabriel Penha de Lima
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'joao.gabriel.13982017@aluno.arboria.com',
    crypt('gabriel123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"João Gabriel Penha de Lima"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'joao.gabriel.13982017@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'joao.gabriel.13982017@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'João Gabriel Penha de Lima', 'João', 'Gabriel Penha de Lima', '00000000-0000-0000-0000-000000000001', '8º Ano', 'A', 2, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [113] Jonatas Pacheco Lima da Silva
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'jonatas.pacheco.12102016@aluno.arboria.com',
    crypt('pacheco123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Jonatas Pacheco Lima da Silva"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'jonatas.pacheco.12102016@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'jonatas.pacheco.12102016@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Jonatas Pacheco Lima da Silva', 'Jonatas', 'Pacheco Lima da Silva', '00000000-0000-0000-0000-000000000001', '8º Ano', 'A', 3, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;

  -- Cargo: coordenador
  INSERT INTO public.cargos_casa (institution_id, casa_id, aluno_id, cargo, ano_letivo, ativo)
  VALUES ('00000000-0000-0000-0000-000000000001', 3, new_id, 'coordenador', 2026, true)
  ON CONFLICT (institution_id, casa_id, aluno_id, ano_letivo, cargo) DO NOTHING;
END $$;

-- [114] Lara Nathielly de Souza Araújo
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'lara.nathielly.14082017@aluno.arboria.com',
    crypt('nathielly123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Lara Nathielly de Souza Araújo"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'lara.nathielly.14082017@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'lara.nathielly.14082017@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Lara Nathielly de Souza Araújo', 'Lara', 'Nathielly de Souza Araújo', '00000000-0000-0000-0000-000000000001', '8º Ano', 'A', 5, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;

  -- Cargo: coordenador
  INSERT INTO public.cargos_casa (institution_id, casa_id, aluno_id, cargo, ano_letivo, ativo)
  VALUES ('00000000-0000-0000-0000-000000000001', 5, new_id, 'coordenador', 2026, true)
  ON CONFLICT (institution_id, casa_id, aluno_id, ano_letivo, cargo) DO NOTHING;
END $$;

-- [115] Laura Vitória Avelino Dantas
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'laura.vitoria.12442016@aluno.arboria.com',
    crypt('vitoria123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Laura Vitória Avelino Dantas"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'laura.vitoria.12442016@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'laura.vitoria.12442016@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Laura Vitória Avelino Dantas', 'Laura', 'Vitória Avelino Dantas', '00000000-0000-0000-0000-000000000001', '8º Ano', 'A', 7, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;

  -- Cargo: coordenador
  INSERT INTO public.cargos_casa (institution_id, casa_id, aluno_id, cargo, ano_letivo, ativo)
  VALUES ('00000000-0000-0000-0000-000000000001', 7, new_id, 'coordenador', 2026, true)
  ON CONFLICT (institution_id, casa_id, aluno_id, ano_letivo, cargo) DO NOTHING;
END $$;

-- [116] Luiz Guilherme Fernandes de Lima
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'luiz.guilherme.19952022@aluno.arboria.com',
    crypt('guilherme123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Luiz Guilherme Fernandes de Lima"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'luiz.guilherme.19952022@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'luiz.guilherme.19952022@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Luiz Guilherme Fernandes de Lima', 'Luiz', 'Guilherme Fernandes de Lima', '00000000-0000-0000-0000-000000000001', '8º Ano', 'A', 7, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [117] Luiz Miguel Almeida de Oliveira
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'luiz.miguel.12132016@aluno.arboria.com',
    crypt('miguel123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Luiz Miguel Almeida de Oliveira"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'luiz.miguel.12132016@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'luiz.miguel.12132016@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Luiz Miguel Almeida de Oliveira', 'Luiz', 'Miguel Almeida de Oliveira', '00000000-0000-0000-0000-000000000001', '8º Ano', 'A', 8, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;

  -- Cargo: coordenador
  INSERT INTO public.cargos_casa (institution_id, casa_id, aluno_id, cargo, ano_letivo, ativo)
  VALUES ('00000000-0000-0000-0000-000000000001', 8, new_id, 'coordenador', 2026, true)
  ON CONFLICT (institution_id, casa_id, aluno_id, ano_letivo, cargo) DO NOTHING;
END $$;

-- [118] Maria Alice Amaral Souza
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'maria.alice.22012025@aluno.arboria.com',
    crypt('alice123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Maria Alice Amaral Souza"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'maria.alice.22012025@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'maria.alice.22012025@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Maria Alice Amaral Souza', 'Maria', 'Alice Amaral Souza', '00000000-0000-0000-0000-000000000001', '8º Ano', 'A', 8, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [119] Maria Clara de Sá Cruz
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'maria.clara.22322026@aluno.arboria.com',
    crypt('clara123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Maria Clara de Sá Cruz"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'maria.clara.22322026@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'maria.clara.22322026@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Maria Clara de Sá Cruz', 'Maria', 'Clara de Sá Cruz', '00000000-0000-0000-0000-000000000001', '8º Ano', 'A', 4, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;

  -- Cargo: coordenador
  INSERT INTO public.cargos_casa (institution_id, casa_id, aluno_id, cargo, ano_letivo, ativo)
  VALUES ('00000000-0000-0000-0000-000000000001', 4, new_id, 'coordenador', 2026, true)
  ON CONFLICT (institution_id, casa_id, aluno_id, ano_letivo, cargo) DO NOTHING;
END $$;

-- [120] Maria Lívia Souza de Oliveira
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'maria.livia.22022025@aluno.arboria.com',
    crypt('livia123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Maria Lívia Souza de Oliveira"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'maria.livia.22022025@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'maria.livia.22022025@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Maria Lívia Souza de Oliveira', 'Maria', 'Lívia Souza de Oliveira', '00000000-0000-0000-0000-000000000001', '8º Ano', 'A', 2, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;

  -- Cargo: coordenador
  INSERT INTO public.cargos_casa (institution_id, casa_id, aluno_id, cargo, ano_letivo, ativo)
  VALUES ('00000000-0000-0000-0000-000000000001', 2, new_id, 'coordenador', 2026, true)
  ON CONFLICT (institution_id, casa_id, aluno_id, ano_letivo, cargo) DO NOTHING;
END $$;

-- [121] Maria Luiza Barbosa de Souza
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'maria.luiza.22522026@aluno.arboria.com',
    crypt('luiza123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Maria Luiza Barbosa de Souza"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'maria.luiza.22522026@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'maria.luiza.22522026@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Maria Luiza Barbosa de Souza', 'Maria', 'Luiza Barbosa de Souza', '00000000-0000-0000-0000-000000000001', '8º Ano', 'A', 8, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [122] Maria Sofia de Paula Maciel
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'maria.sofia.12182016@aluno.arboria.com',
    crypt('sofia123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Maria Sofia de Paula Maciel"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'maria.sofia.12182016@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'maria.sofia.12182016@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Maria Sofia de Paula Maciel', 'Maria', 'Sofia de Paula Maciel', '00000000-0000-0000-0000-000000000001', '8º Ano', 'A', 1, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;

  -- Cargo: coordenador
  INSERT INTO public.cargos_casa (institution_id, casa_id, aluno_id, cargo, ano_letivo, ativo)
  VALUES ('00000000-0000-0000-0000-000000000001', 1, new_id, 'coordenador', 2026, true)
  ON CONFLICT (institution_id, casa_id, aluno_id, ano_letivo, cargo) DO NOTHING;
END $$;

-- [123] Matheus Renato Dias Nascimento
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'matheus.renato.23132026@aluno.arboria.com',
    crypt('renato123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Matheus Renato Dias Nascimento"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'matheus.renato.23132026@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'matheus.renato.23132026@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Matheus Renato Dias Nascimento', 'Matheus', 'Renato Dias Nascimento', '00000000-0000-0000-0000-000000000001', '8º Ano', 'A', 7, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [124] Pyetro Samuel Ferreira Valdivino
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'pyetro.samuel.15512019@aluno.arboria.com',
    crypt('samuel123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Pyetro Samuel Ferreira Valdivino"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'pyetro.samuel.15512019@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'pyetro.samuel.15512019@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Pyetro Samuel Ferreira Valdivino', 'Pyetro', 'Samuel Ferreira Valdivino', '00000000-0000-0000-0000-000000000001', '8º Ano', 'A', 2, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [125] Rebeka Evenlly da Costa Silva
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'rebeka.evenlly.21772025@aluno.arboria.com',
    crypt('evenlly123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Rebeka Evenlly da Costa Silva"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'rebeka.evenlly.21772025@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'rebeka.evenlly.21772025@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Rebeka Evenlly da Costa Silva', 'Rebeka', 'Evenlly da Costa Silva', '00000000-0000-0000-0000-000000000001', '8º Ano', 'A', 1, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [126] Samily Vitória Marques de Sena
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'samily.vitoria.21742025@aluno.arboria.com',
    crypt('vitoria123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Samily Vitória Marques de Sena"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'samily.vitoria.21742025@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'samily.vitoria.21742025@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Samily Vitória Marques de Sena', 'Samily', 'Vitória Marques de Sena', '00000000-0000-0000-0000-000000000001', '8º Ano', 'A', 6, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;

  -- Cargo: coordenador
  INSERT INTO public.cargos_casa (institution_id, casa_id, aluno_id, cargo, ano_letivo, ativo)
  VALUES ('00000000-0000-0000-0000-000000000001', 6, new_id, 'coordenador', 2026, true)
  ON CONFLICT (institution_id, casa_id, aluno_id, ano_letivo, cargo) DO NOTHING;
END $$;

-- [127] Taylon Pedro Nogueira Praça
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'taylon.pedro.18632022@aluno.arboria.com',
    crypt('pedro123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Taylon Pedro Nogueira Praça"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'taylon.pedro.18632022@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'taylon.pedro.18632022@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Taylon Pedro Nogueira Praça', 'Taylon', 'Pedro Nogueira Praça', '00000000-0000-0000-0000-000000000001', '8º Ano', 'A', 5, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [128] Thales Augusto de Paiva Ramalho
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'thales.augusto.13882017@aluno.arboria.com',
    crypt('augusto123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Thales Augusto de Paiva Ramalho"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'thales.augusto.13882017@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'thales.augusto.13882017@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Thales Augusto de Paiva Ramalho', 'Thales', 'Augusto de Paiva Ramalho', '00000000-0000-0000-0000-000000000001', '8º Ano', 'A', 2, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [129] Thauany Ferreira da Silva
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'thauany.ferreira.11982015@aluno.arboria.com',
    crypt('ferreira123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Thauany Ferreira da Silva"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'thauany.ferreira.11982015@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'thauany.ferreira.11982015@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Thauany Ferreira da Silva', 'Thauany', 'Ferreira da Silva', '00000000-0000-0000-0000-000000000001', '8º Ano', 'A', 7, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [130] Thiago Riquelme Pinheiro Santos
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'thiago.riquelme.21002024@aluno.arboria.com',
    crypt('riquelme123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Thiago Riquelme Pinheiro Santos"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'thiago.riquelme.21002024@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'thiago.riquelme.21002024@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Thiago Riquelme Pinheiro Santos', 'Thiago', 'Riquelme Pinheiro Santos', '00000000-0000-0000-0000-000000000001', '8º Ano', 'A', 2, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [131] Alejandro Ferreira
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'alejandro.ferreira.21022024@aluno.arboria.com',
    crypt('ferreira123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Alejandro Ferreira"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'alejandro.ferreira.21022024@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'alejandro.ferreira.21022024@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Alejandro Ferreira', 'Alejandro', 'Ferreira', '00000000-0000-0000-0000-000000000001', '9º Ano', 'A', 2, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [132] Alison Andrey de Mello Dantas
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'alison.andrey.20552022@aluno.arboria.com',
    crypt('andrey123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Alison Andrey de Mello Dantas"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'alison.andrey.20552022@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'alison.andrey.20552022@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Alison Andrey de Mello Dantas', 'Alison', 'Andrey de Mello Dantas', '00000000-0000-0000-0000-000000000001', '9º Ano', 'A', 1, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [133] Amanda Jhulia Avelino Batista
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'amanda.jhulia.21262024@aluno.arboria.com',
    crypt('jhulia123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Amanda Jhulia Avelino Batista"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'amanda.jhulia.21262024@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'amanda.jhulia.21262024@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Amanda Jhulia Avelino Batista', 'Amanda', 'Jhulia Avelino Batista', '00000000-0000-0000-0000-000000000001', '9º Ano', 'A', 5, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;

  -- Cargo: lider
  INSERT INTO public.cargos_casa (institution_id, casa_id, aluno_id, cargo, ano_letivo, ativo)
  VALUES ('00000000-0000-0000-0000-000000000001', 5, new_id, 'lider', 2026, true)
  ON CONFLICT (institution_id, casa_id, aluno_id, ano_letivo, cargo) DO NOTHING;
END $$;

-- [134] Ana Clara Bezerra Duarte
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'ana.clara.9382014@aluno.arboria.com',
    crypt('clara123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Ana Clara Bezerra Duarte"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'ana.clara.9382014@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'ana.clara.9382014@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Ana Clara Bezerra Duarte', 'Ana', 'Clara Bezerra Duarte', '00000000-0000-0000-0000-000000000001', '9º Ano', 'A', 4, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;

  -- Cargo: lider
  INSERT INTO public.cargos_casa (institution_id, casa_id, aluno_id, cargo, ano_letivo, ativo)
  VALUES ('00000000-0000-0000-0000-000000000001', 4, new_id, 'lider', 2026, true)
  ON CONFLICT (institution_id, casa_id, aluno_id, ano_letivo, cargo) DO NOTHING;
END $$;

-- [135] Anderson Felipe Silva Lima
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'anderson.felipe.14662018@aluno.arboria.com',
    crypt('felipe123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Anderson Felipe Silva Lima"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'anderson.felipe.14662018@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'anderson.felipe.14662018@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Anderson Felipe Silva Lima', 'Anderson', 'Felipe Silva Lima', '00000000-0000-0000-0000-000000000001', '9º Ano', 'A', 5, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [136] Angélica de Oliveira Ângelo
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'angelica.oliveira.20122022@aluno.arboria.com',
    crypt('oliveira123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Angélica de Oliveira Ângelo"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'angelica.oliveira.20122022@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'angelica.oliveira.20122022@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Angélica de Oliveira Ângelo', 'Angélica', 'de Oliveira Ângelo', '00000000-0000-0000-0000-000000000001', '9º Ano', 'A', 4, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [137] Arthur Guilherme Tarquínio da Silva Costa
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'arthur.guilherme.14692018@aluno.arboria.com',
    crypt('guilherme123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Arthur Guilherme Tarquínio da Silva Costa"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'arthur.guilherme.14692018@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'arthur.guilherme.14692018@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Arthur Guilherme Tarquínio da Silva Costa', 'Arthur', 'Guilherme Tarquínio da Silva Costa', '00000000-0000-0000-0000-000000000001', '9º Ano', 'A', 5, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [138] Beatriz Vitória Marcelino Rodrigues
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'beatriz.vitoria.9162014@aluno.arboria.com',
    crypt('vitoria123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Beatriz Vitória Marcelino Rodrigues"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'beatriz.vitoria.9162014@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'beatriz.vitoria.9162014@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Beatriz Vitória Marcelino Rodrigues', 'Beatriz', 'Vitória Marcelino Rodrigues', '00000000-0000-0000-0000-000000000001', '9º Ano', 'A', 6, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;

  -- Cargo: lider
  INSERT INTO public.cargos_casa (institution_id, casa_id, aluno_id, cargo, ano_letivo, ativo)
  VALUES ('00000000-0000-0000-0000-000000000001', 6, new_id, 'lider', 2026, true)
  ON CONFLICT (institution_id, casa_id, aluno_id, ano_letivo, cargo) DO NOTHING;
END $$;

-- [139] Christiam Hauan do Nascimento Costa
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'christiam.hauan.19212022@aluno.arboria.com',
    crypt('hauan123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Christiam Hauan do Nascimento Costa"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'christiam.hauan.19212022@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'christiam.hauan.19212022@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Christiam Hauan do Nascimento Costa', 'Christiam', 'Hauan do Nascimento Costa', '00000000-0000-0000-0000-000000000001', '9º Ano', 'A', 2, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;

  -- Cargo: lider
  INSERT INTO public.cargos_casa (institution_id, casa_id, aluno_id, cargo, ano_letivo, ativo)
  VALUES ('00000000-0000-0000-0000-000000000001', 2, new_id, 'lider', 2026, true)
  ON CONFLICT (institution_id, casa_id, aluno_id, ano_letivo, cargo) DO NOTHING;
END $$;

-- [140] Diana Beatriz Santos Medeiros de Sena
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'diana.beatriz.9212014@aluno.arboria.com',
    crypt('beatriz123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Diana Beatriz Santos Medeiros de Sena"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'diana.beatriz.9212014@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'diana.beatriz.9212014@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Diana Beatriz Santos Medeiros de Sena', 'Diana', 'Beatriz Santos Medeiros de Sena', '00000000-0000-0000-0000-000000000001', '9º Ano', 'A', 3, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;

  -- Cargo: coordenador
  INSERT INTO public.cargos_casa (institution_id, casa_id, aluno_id, cargo, ano_letivo, ativo)
  VALUES ('00000000-0000-0000-0000-000000000001', 3, new_id, 'coordenador', 2026, true)
  ON CONFLICT (institution_id, casa_id, aluno_id, ano_letivo, cargo) DO NOTHING;
END $$;

-- [141] Henrique Barbosa Freire
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'henrique.barbosa.20422022@aluno.arboria.com',
    crypt('barbosa123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Henrique Barbosa Freire"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'henrique.barbosa.20422022@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'henrique.barbosa.20422022@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Henrique Barbosa Freire', 'Henrique', 'Barbosa Freire', '00000000-0000-0000-0000-000000000001', '9º Ano', 'A', 8, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;

  -- Cargo: lider
  INSERT INTO public.cargos_casa (institution_id, casa_id, aluno_id, cargo, ano_letivo, ativo)
  VALUES ('00000000-0000-0000-0000-000000000001', 8, new_id, 'lider', 2026, true)
  ON CONFLICT (institution_id, casa_id, aluno_id, ano_letivo, cargo) DO NOTHING;
END $$;

-- [142] Hygor Ryan Souza Santos
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'hygor.ryan.14072017@aluno.arboria.com',
    crypt('ryan123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Hygor Ryan Souza Santos"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'hygor.ryan.14072017@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'hygor.ryan.14072017@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Hygor Ryan Souza Santos', 'Hygor', 'Ryan Souza Santos', '00000000-0000-0000-0000-000000000001', '9º Ano', 'A', 5, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;

  -- Cargo: coordenador
  INSERT INTO public.cargos_casa (institution_id, casa_id, aluno_id, cargo, ano_letivo, ativo)
  VALUES ('00000000-0000-0000-0000-000000000001', 5, new_id, 'coordenador', 2026, true)
  ON CONFLICT (institution_id, casa_id, aluno_id, ano_letivo, cargo) DO NOTHING;
END $$;

-- [143] Iellen Maria Alice Araújo Barbosa
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'iellen.maria.9412014@aluno.arboria.com',
    crypt('maria123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Iellen Maria Alice Araújo Barbosa"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'iellen.maria.9412014@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'iellen.maria.9412014@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Iellen Maria Alice Araújo Barbosa', 'Iellen', 'Maria Alice Araújo Barbosa', '00000000-0000-0000-0000-000000000001', '9º Ano', 'A', 1, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [144] Kaio Victor de Moura Leão
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'kaio.victor.18952022@aluno.arboria.com',
    crypt('victor123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Kaio Victor de Moura Leão"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'kaio.victor.18952022@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'kaio.victor.18952022@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Kaio Victor de Moura Leão', 'Kaio', 'Victor de Moura Leão', '00000000-0000-0000-0000-000000000001', '9º Ano', 'A', 2, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [145] Kathelle Mayranne Estevam da Silva
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'kathelle.mayranne.13812017@aluno.arboria.com',
    crypt('mayranne123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Kathelle Mayranne Estevam da Silva"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'kathelle.mayranne.13812017@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'kathelle.mayranne.13812017@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Kathelle Mayranne Estevam da Silva', 'Kathelle', 'Mayranne Estevam da Silva', '00000000-0000-0000-0000-000000000001', '9º Ano', 'A', 4, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;

  -- Cargo: coordenador
  INSERT INTO public.cargos_casa (institution_id, casa_id, aluno_id, cargo, ano_letivo, ativo)
  VALUES ('00000000-0000-0000-0000-000000000001', 4, new_id, 'coordenador', 2026, true)
  ON CONFLICT (institution_id, casa_id, aluno_id, ano_letivo, cargo) DO NOTHING;
END $$;

-- [146] Kauã Vyctor Ramalho da Trindade
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'kaua.vyctor.22202025@aluno.arboria.com',
    crypt('vyctor123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Kauã Vyctor Ramalho da Trindade"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'kaua.vyctor.22202025@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'kaua.vyctor.22202025@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Kauã Vyctor Ramalho da Trindade', 'Kauã', 'Vyctor Ramalho da Trindade', '00000000-0000-0000-0000-000000000001', '9º Ano', 'A', 2, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [147] Lorena Kethillyn Rocha de Carvalho
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'lorena.kethillyn.12162016@aluno.arboria.com',
    crypt('kethillyn123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Lorena Kethillyn Rocha de Carvalho"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'lorena.kethillyn.12162016@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'lorena.kethillyn.12162016@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Lorena Kethillyn Rocha de Carvalho', 'Lorena', 'Kethillyn Rocha de Carvalho', '00000000-0000-0000-0000-000000000001', '9º Ano', 'A', 1, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [148] Maria Gabriela dos Santos Silva
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'maria.gabriela.20242022@aluno.arboria.com',
    crypt('gabriela123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Maria Gabriela dos Santos Silva"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'maria.gabriela.20242022@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'maria.gabriela.20242022@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Maria Gabriela dos Santos Silva', 'Maria', 'Gabriela dos Santos Silva', '00000000-0000-0000-0000-000000000001', '9º Ano', 'A', 6, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [149] Maria Helena Pinheiro Bispo
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'maria.helena.14172017@aluno.arboria.com',
    crypt('helena123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Maria Helena Pinheiro Bispo"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'maria.helena.14172017@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'maria.helena.14172017@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Maria Helena Pinheiro Bispo', 'Maria', 'Helena Pinheiro Bispo', '00000000-0000-0000-0000-000000000001', '9º Ano', 'A', 7, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;

  -- Cargo: coordenador
  INSERT INTO public.cargos_casa (institution_id, casa_id, aluno_id, cargo, ano_letivo, ativo)
  VALUES ('00000000-0000-0000-0000-000000000001', 7, new_id, 'coordenador', 2026, true)
  ON CONFLICT (institution_id, casa_id, aluno_id, ano_letivo, cargo) DO NOTHING;
END $$;

-- [150] Maria Sofia da Silva
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'maria.sofia.17562021@aluno.arboria.com',
    crypt('sofia123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Maria Sofia da Silva"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'maria.sofia.17562021@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'maria.sofia.17562021@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Maria Sofia da Silva', 'Maria', 'Sofia da Silva', '00000000-0000-0000-0000-000000000001', '9º Ano', 'A', 4, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [151] Mariana de Barros Costa
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'mariana.barros.18502022@aluno.arboria.com',
    crypt('barros123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Mariana de Barros Costa"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'mariana.barros.18502022@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'mariana.barros.18502022@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Mariana de Barros Costa', 'Mariana', 'de Barros Costa', '00000000-0000-0000-0000-000000000001', '9º Ano', 'A', 6, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;

  -- Cargo: coordenador
  INSERT INTO public.cargos_casa (institution_id, casa_id, aluno_id, cargo, ano_letivo, ativo)
  VALUES ('00000000-0000-0000-0000-000000000001', 6, new_id, 'coordenador', 2026, true)
  ON CONFLICT (institution_id, casa_id, aluno_id, ano_letivo, cargo) DO NOTHING;
END $$;

-- [152] Mariana de Lima Brito
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'mariana.lima.17632021@aluno.arboria.com',
    crypt('lima123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Mariana de Lima Brito"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'mariana.lima.17632021@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'mariana.lima.17632021@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Mariana de Lima Brito', 'Mariana', 'de Lima Brito', '00000000-0000-0000-0000-000000000001', '9º Ano', 'A', 7, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [153] Matheus Vinicius Barbosa do Nascimento
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'matheus.vinicius.19342022@aluno.arboria.com',
    crypt('vinicius123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Matheus Vinicius Barbosa do Nascimento"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'matheus.vinicius.19342022@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'matheus.vinicius.19342022@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Matheus Vinicius Barbosa do Nascimento', 'Matheus', 'Vinicius Barbosa do Nascimento', '00000000-0000-0000-0000-000000000001', '9º Ano', 'A', 2, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;

  -- Cargo: coordenador
  INSERT INTO public.cargos_casa (institution_id, casa_id, aluno_id, cargo, ano_letivo, ativo)
  VALUES ('00000000-0000-0000-0000-000000000001', 2, new_id, 'coordenador', 2026, true)
  ON CONFLICT (institution_id, casa_id, aluno_id, ano_letivo, cargo) DO NOTHING;
END $$;

-- [154] Milena Lima Faustino da Silva
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'milena.lima.14122017@aluno.arboria.com',
    crypt('lima123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Milena Lima Faustino da Silva"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'milena.lima.14122017@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'milena.lima.14122017@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Milena Lima Faustino da Silva', 'Milena', 'Lima Faustino da Silva', '00000000-0000-0000-0000-000000000001', '9º Ano', 'A', 1, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;

  -- Cargo: lider
  INSERT INTO public.cargos_casa (institution_id, casa_id, aluno_id, cargo, ano_letivo, ativo)
  VALUES ('00000000-0000-0000-0000-000000000001', 1, new_id, 'lider', 2026, true)
  ON CONFLICT (institution_id, casa_id, aluno_id, ano_letivo, cargo) DO NOTHING;
END $$;

-- [155] Nycolas Rodrigues Revoredo
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'nycolas.rodrigues.10752015@aluno.arboria.com',
    crypt('rodrigues123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Nycolas Rodrigues Revoredo"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'nycolas.rodrigues.10752015@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'nycolas.rodrigues.10752015@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Nycolas Rodrigues Revoredo', 'Nycolas', 'Rodrigues Revoredo', '00000000-0000-0000-0000-000000000001', '9º Ano', 'A', 1, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [156] Sophia Leticia Miranda de Lira
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'sophia.leticia.10932015@aluno.arboria.com',
    crypt('leticia123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Sophia Leticia Miranda de Lira"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'sophia.leticia.10932015@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'sophia.leticia.10932015@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Sophia Leticia Miranda de Lira', 'Sophia', 'Leticia Miranda de Lira', '00000000-0000-0000-0000-000000000001', '9º Ano', 'A', 7, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;

  -- Cargo: lider
  INSERT INTO public.cargos_casa (institution_id, casa_id, aluno_id, cargo, ano_letivo, ativo)
  VALUES ('00000000-0000-0000-0000-000000000001', 7, new_id, 'lider', 2026, true)
  ON CONFLICT (institution_id, casa_id, aluno_id, ano_letivo, cargo) DO NOTHING;
END $$;

-- [157] Tales Christian Silva de Lima
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'tales.christian.19822022@aluno.arboria.com',
    crypt('christian123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Tales Christian Silva de Lima"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'tales.christian.19822022@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'tales.christian.19822022@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Tales Christian Silva de Lima', 'Tales', 'Christian Silva de Lima', '00000000-0000-0000-0000-000000000001', '9º Ano', 'A', 1, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;

  -- Cargo: coordenador
  INSERT INTO public.cargos_casa (institution_id, casa_id, aluno_id, cargo, ano_letivo, ativo)
  VALUES ('00000000-0000-0000-0000-000000000001', 1, new_id, 'coordenador', 2026, true)
  ON CONFLICT (institution_id, casa_id, aluno_id, ano_letivo, cargo) DO NOTHING;
END $$;

-- [158] Vitor Felipe Pereira Bezerra
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'vitor.felipe.19172022@aluno.arboria.com',
    crypt('felipe123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Vitor Felipe Pereira Bezerra"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'vitor.felipe.19172022@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'vitor.felipe.19172022@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Vitor Felipe Pereira Bezerra', 'Vitor', 'Felipe Pereira Bezerra', '00000000-0000-0000-0000-000000000001', '9º Ano', 'A', 5, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [159] Vitor Samuel Morais Borges
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'vitor.samuel.19682022@aluno.arboria.com',
    crypt('samuel123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Vitor Samuel Morais Borges"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'vitor.samuel.19682022@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'vitor.samuel.19682022@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Vitor Samuel Morais Borges', 'Vitor', 'Samuel Morais Borges', '00000000-0000-0000-0000-000000000001', '9º Ano', 'A', 3, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;
END $$;

-- [160] Yasmin Mantuan
DO $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'yasmin.mantuan.9372014@aluno.arboria.com',
    crypt('mantuan123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Yasmin Mantuan"}'::jsonb,
    now(), now(), '', ''
  ) RETURNING id INTO new_id;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_id, 'yasmin.mantuan.9372014@aluno.arboria.com',
    jsonb_build_object('sub', new_id::text, 'email', 'yasmin.mantuan.9372014@aluno.arboria.com'),
    'email', now(), now(), now());

  INSERT INTO public.profiles (id, full_name, nome, sobrenome, institution_id, serie, turma, casa_id, segmento)
  VALUES (new_id, 'Yasmin Mantuan', 'Yasmin', 'Mantuan', '00000000-0000-0000-0000-000000000001', '9º Ano', 'A', 3, 'fundamental2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    serie = EXCLUDED.serie,
    turma = EXCLUDED.turma,
    casa_id = EXCLUDED.casa_id,
    segmento = EXCLUDED.segmento,
    institution_id = EXCLUDED.institution_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'user') ON CONFLICT DO NOTHING;

  -- Cargo: lider
  INSERT INTO public.cargos_casa (institution_id, casa_id, aluno_id, cargo, ano_letivo, ativo)
  VALUES ('00000000-0000-0000-0000-000000000001', 3, new_id, 'lider', 2026, true)
  ON CONFLICT (institution_id, casa_id, aluno_id, ano_letivo, cargo) DO NOTHING;
END $$;


-- ============================================================
-- VERIFICATION QUERIES (uncomment to check counts)
-- ============================================================
-- SELECT 'institutions' AS tabela, count(*) FROM public.institutions
-- UNION ALL SELECT 'inteligencias', count(*) FROM public.inteligencias
-- UNION ALL SELECT 'sinais', count(*) FROM public.sinais
-- UNION ALL SELECT 'fases', count(*) FROM public.fases
-- UNION ALL SELECT 'canais_casa', count(*) FROM public.canais_casa
-- UNION ALL SELECT 'auth.users', count(*) FROM auth.users
-- UNION ALL SELECT 'profiles', count(*) FROM public.profiles
-- UNION ALL SELECT 'user_roles', count(*) FROM public.user_roles
-- UNION ALL SELECT 'cargos_casa', count(*) FROM public.cargos_casa;

COMMIT;
