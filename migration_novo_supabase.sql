-- ============================================================================
-- MIGRATION COMPLETA - PROJETO ARBORIA
-- Gerada em 2026-04-06 a partir de all_migrations_combined.sql
-- Script idempotente para Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- 0. EXTENSOES
-- ============================================================================
-- pg_net may not be available in all Supabase plans, skip if fails
DO $$ BEGIN CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'pg_net not available, skipping'; END $$;

-- ============================================================================
-- 1. ENUMS
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'user', 'professor');
  END IF;
END $$;

-- Garantir que 'professor' existe no enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'professor'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')
  ) THEN
    ALTER TYPE app_role ADD VALUE 'professor';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_alerta') THEN
    CREATE TYPE public.tipo_alerta AS ENUM (
      'precisa_atencao',
      'celebrar',
      'nao_esquecer'
    );
  END IF;
END $$;

-- Adicionar valores extras ao tipo_alerta
DO $$ BEGIN ALTER TYPE tipo_alerta ADD VALUE IF NOT EXISTS 'fase_anterior'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE tipo_alerta ADD VALUE IF NOT EXISTS 'brilhando'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE tipo_alerta ADD VALUE IF NOT EXISTS 'melhorando'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE tipo_alerta ADD VALUE IF NOT EXISTS 'atencao_recente'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE tipo_alerta ADD VALUE IF NOT EXISTS 'bom_comeco'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE tipo_alerta ADD VALUE IF NOT EXISTS 'fique_de_olho'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE tipo_alerta ADD VALUE IF NOT EXISTS 'aguardando_explicacao'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_alerta') THEN
    CREATE TYPE public.status_alerta AS ENUM (
      'ativo',
      'visualizado',
      'resolvido',
      'arquivado'
    );
  END IF;
END $$;

DO $$ BEGIN ALTER TYPE status_alerta ADD VALUE IF NOT EXISTS 'em_acompanhamento'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE status_alerta ADD VALUE IF NOT EXISTS 'arquivado'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'categoria_descoberta') THEN
    CREATE TYPE public.categoria_descoberta AS ENUM (
      'fator_escolar',
      'fator_externo',
      'fator_social',
      'indefinido'
    );
  END IF;
END $$;


-- ============================================================================
-- 2. TABELAS CORE
-- ============================================================================

-- 2.1 institutions (MUST be created before profiles)
CREATE TABLE IF NOT EXISTS public.institutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;

-- 2.2 inteligencias (As 8 Casas - MUST be created before profiles)
CREATE TABLE IF NOT EXISTS public.inteligencias (
  id SMALLINT PRIMARY KEY,
  codigo TEXT UNIQUE NOT NULL,
  nome TEXT NOT NULL,
  emoji TEXT,
  cor_hex TEXT,
  descricao TEXT,
  ordem SMALLINT,
  brasao_url TEXT
);

ALTER TABLE public.inteligencias ENABLE ROW LEVEL SECURITY;

-- 2.3 profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  nome TEXT,
  sobrenome TEXT,
  institution TEXT,
  institution_id UUID REFERENCES public.institutions(id) ON DELETE SET NULL,
  serie TEXT,
  turma TEXT,
  casa TEXT,
  casa_id SMALLINT REFERENCES public.inteligencias(id),
  segmento TEXT,
  avatar_url TEXT,
  must_change_password BOOLEAN DEFAULT true,
  ultima_atividade TIMESTAMPTZ DEFAULT now(),
  matricula_externa VARCHAR(50),
  email_gerado TEXT,
  conta_criada BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2.4 user_roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Inserir as 8 inteligencias
INSERT INTO public.inteligencias (id, codigo, nome, emoji, cor_hex, ordem) VALUES
(1, 'linguistica', 'Linguistica', '📝', '#3B82F6', 1),
(2, 'logico_matematica', 'Logico-Matematica', '🔢', '#10B981', 2),
(3, 'espacial', 'Espacial', '🎨', '#F59E0B', 3),
(4, 'musical', 'Musical', '🎵', '#8B5CF6', 4),
(5, 'corporal_cinestesica', 'Corporal-Cinestesica', '🏃', '#EF4444', 5),
(6, 'naturalista', 'Naturalista', '🌿', '#22C55E', 6),
(7, 'interpessoal', 'Interpessoal', '👥', '#EC4899', 7),
(8, 'intrapessoal', 'Intrapessoal', '🧘', '#6366F1', 8)
ON CONFLICT (id) DO NOTHING;

-- Brasao URLs
UPDATE public.inteligencias SET brasao_url = '/brasoes/linguistica.png' WHERE codigo = 'linguistica' AND brasao_url IS NULL;
UPDATE public.inteligencias SET brasao_url = '/brasoes/logico_matematica.png' WHERE codigo = 'logico_matematica' AND brasao_url IS NULL;
UPDATE public.inteligencias SET brasao_url = '/brasoes/espacial.png' WHERE codigo = 'espacial' AND brasao_url IS NULL;
UPDATE public.inteligencias SET brasao_url = '/brasoes/musical.png' WHERE codigo = 'musical' AND brasao_url IS NULL;
UPDATE public.inteligencias SET brasao_url = '/brasoes/corporal_cinestesica.png' WHERE codigo = 'corporal_cinestesica' AND brasao_url IS NULL;
UPDATE public.inteligencias SET brasao_url = '/brasoes/logonaturalista.png' WHERE codigo = 'naturalista' AND brasao_url IS NULL;
UPDATE public.inteligencias SET brasao_url = '/brasoes/interpessoal.png' WHERE codigo = 'interpessoal' AND brasao_url IS NULL;
UPDATE public.inteligencias SET brasao_url = '/brasoes/intrapessoal.png' WHERE codigo = 'intrapessoal' AND brasao_url IS NULL;

-- FK de profiles para institutions e inteligencias ja estao inline na criacao da tabela

-- 2.5 institution_settings
CREATE TABLE IF NOT EXISTS public.institution_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  logo_url TEXT,
  favicon_url TEXT,
  cor_primaria TEXT DEFAULT '#1B4F72',
  cor_secundaria TEXT DEFAULT '#3498DB',
  cor_acento TEXT DEFAULT '#F39C12',
  slug TEXT UNIQUE,
  endereco TEXT,
  telefone TEXT,
  email_contato TEXT,
  website TEXT,
  ano_letivo_atual SMALLINT DEFAULT 2025,
  usa_sistema_casas BOOLEAN DEFAULT true,
  data_inicio_letivo DATE,
  data_fim_letivo DATE,
  duracao_fase_semanas SMALLINT DEFAULT 4,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(institution_id)
);

ALTER TABLE public.institution_settings ENABLE ROW LEVEL SECURITY;

-- 2.6 sinais
CREATE TABLE IF NOT EXISTS public.sinais (
  id SMALLINT PRIMARY KEY,
  codigo TEXT UNIQUE NOT NULL,
  emoji TEXT NOT NULL,
  label_pt TEXT NOT NULL,
  pilar TEXT NOT NULL CHECK (pilar IN ('cognitivo', 'social', 'emocional', 'nao_cognitivo')),
  valencia TEXT NOT NULL CHECK (valencia IN ('positivo', 'atencao')),
  peso_inteligencia SMALLINT DEFAULT 10,
  descricao TEXT,
  ordem SMALLINT
);

ALTER TABLE public.sinais ENABLE ROW LEVEL SECURITY;

INSERT INTO public.sinais (id, codigo, emoji, label_pt, pilar, valencia, peso_inteligencia, ordem) VALUES
(1, 'brilhou', '⭐', 'Brilhou', 'cognitivo', 'positivo', 15, 1),
(2, 'pegou_rapido', '🚀', 'Pegou rapido', 'cognitivo', 'positivo', 10, 2),
(3, 'inovou', '💡', 'Inovou', 'cognitivo', 'positivo', 15, 3),
(4, 'persistiu', '💪', 'Persistiu', 'nao_cognitivo', 'positivo', 10, 4),
(5, 'liderou', '🦅', 'Liderou', 'nao_cognitivo', 'positivo', 10, 5),
(6, 'conectou', '🤝', 'Conectou', 'social', 'positivo', 10, 6),
(7, 'estava_leve', '😊', 'Estava leve', 'emocional', 'positivo', 5, 7),
(8, 'travou', '🧱', 'Travou', 'cognitivo', 'atencao', -5, 8),
(9, 'desistiu', '😤', 'Desistiu', 'nao_cognitivo', 'atencao', -10, 9),
(10, 'isolou_se', '🚫', 'Isolou-se', 'social', 'atencao', -5, 10),
(11, 'estava_calado', '😶', 'Estava calado', 'social', 'atencao', 0, 11),
(12, 'conflitou', '💥', 'Conflitou', 'social', 'atencao', -5, 12),
(13, 'estava_pesado', '😔', 'Estava pesado', 'emocional', 'atencao', 0, 13),
(14, 'ansioso', '🌀', 'Parecia ansioso', 'emocional', 'atencao', 0, 14),
(15, 'algo_estranho', '⚠️', 'Algo estranho', 'emocional', 'atencao', 0, 15),
(16, 'outro_positivo', '➕', 'Outro', 'emocional', 'positivo', 5, 100),
(17, 'outro_atencao', '➕', 'Outro', 'emocional', 'atencao', 0, 100)
ON CONFLICT (id) DO NOTHING;

-- 2.7 turmas
CREATE TABLE IF NOT EXISTS public.turmas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  serie TEXT NOT NULL,
  turma_letra TEXT NOT NULL,
  ano_letivo SMALLINT NOT NULL,
  turno TEXT CHECK (turno IN ('manha', 'tarde', 'integral', 'noite')),
  sala TEXT,
  capacidade SMALLINT,
  segmento TEXT CHECK (segmento IN ('infantil', 'fundamental1', 'fundamental2')),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.turmas ENABLE ROW LEVEL SECURITY;

-- 2.8 aluno_turma
CREATE TABLE IF NOT EXISTS public.aluno_turma (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  turma_id UUID NOT NULL REFERENCES public.turmas(id) ON DELETE CASCADE,
  ano_letivo SMALLINT NOT NULL,
  numero_chamada SMALLINT,
  data_entrada DATE DEFAULT CURRENT_DATE,
  data_saida DATE,
  motivo_saida TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(aluno_id, turma_id, ano_letivo)
);

ALTER TABLE public.aluno_turma ENABLE ROW LEVEL SECURITY;

-- 2.9 professor_casa
CREATE TABLE IF NOT EXISTS public.professor_casa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  casa_id SMALLINT NOT NULL REFERENCES public.inteligencias(id),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  ano_letivo SMALLINT NOT NULL,
  eh_mentor_principal BOOLEAN DEFAULT true,
  data_inicio DATE DEFAULT CURRENT_DATE,
  data_fim DATE,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(professor_id, institution_id, ano_letivo)
);

ALTER TABLE public.professor_casa ENABLE ROW LEVEL SECURITY;

-- 2.10 fases
CREATE TABLE IF NOT EXISTS public.fases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  inteligencia_id SMALLINT NOT NULL REFERENCES public.inteligencias(id),
  ano_letivo SMALLINT NOT NULL,
  numero_fase SMALLINT NOT NULL CHECK (numero_fase BETWEEN 1 AND 8),
  semana_atual SMALLINT DEFAULT 1 CHECK (semana_atual BETWEEN 1 AND 4),
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  ativo BOOLEAN DEFAULT false,
  serie SMALLINT,
  segmento TEXT NOT NULL DEFAULT 'fundamental2',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Constraint segmento em fases
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fases_segmento_check') THEN
    ALTER TABLE public.fases ADD CONSTRAINT fases_segmento_check CHECK (segmento IN ('infantil', 'fundamental1', 'fundamental2'));
  END IF;
END $$;

ALTER TABLE public.fases ENABLE ROW LEVEL SECURITY;

-- 2.11 missoes
CREATE TABLE IF NOT EXISTS public.missoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  fase_id UUID REFERENCES public.fases(id) ON DELETE SET NULL,
  casa_id SMALLINT REFERENCES public.inteligencias(id),
  criado_por UUID NOT NULL REFERENCES public.profiles(id),
  titulo TEXT NOT NULL,
  descricao TEXT,
  instrucoes TEXT,
  tipo TEXT NOT NULL DEFAULT 'principal' CHECK (tipo IN ('principal', 'secundaria', 'bonus')),
  pontos_base SMALLINT NOT NULL DEFAULT 100,
  status TEXT DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'agendada', 'liberada', 'encerrada', 'cancelada')),
  semana SMALLINT,
  serie_filtro SMALLINT CHECK (serie_filtro IS NULL OR serie_filtro IN (6, 7, 8, 9)),
  turma_filtro TEXT,
  para_todos_da_casa BOOLEAN DEFAULT true,
  requer_arquivo BOOLEAN DEFAULT false,
  requer_texto BOOLEAN DEFAULT true,
  arquivo_pdf_nome TEXT,
  arquivo_pdf_url TEXT,
  data_liberacao TIMESTAMPTZ NOT NULL,
  data_prazo TIMESTAMPTZ NOT NULL,
  permite_entrega_atrasada BOOLEAN DEFAULT false,
  lente_especial TEXT,
  inteligencia_cross SMALLINT REFERENCES public.inteligencias(id),
  itens JSONB,
  contexto TEXT,
  reflexao TEXT,
  dicas TEXT,
  tipo_missao TEXT DEFAULT 'geral',
  data_liberacao_6ano TIMESTAMPTZ,
  data_liberacao_7ano TIMESTAMPTZ,
  data_liberacao_8ano TIMESTAMPTZ,
  data_liberacao_9ano TIMESTAMPTZ,
  rascunho BOOLEAN,
  data_criacao TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.missoes ENABLE ROW LEVEL SECURITY;

-- 2.12 missao_destinatarios
CREATE TABLE IF NOT EXISTS public.missao_destinatarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  missao_id UUID NOT NULL REFERENCES public.missoes(id) ON DELETE CASCADE,
  aluno_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(missao_id, aluno_id)
);

ALTER TABLE public.missao_destinatarios ENABLE ROW LEVEL SECURITY;

-- 2.13 entregas
CREATE TABLE IF NOT EXISTS public.entregas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  missao_id UUID NOT NULL REFERENCES public.missoes(id) ON DELETE CASCADE,
  aluno_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  texto_resposta TEXT,
  respostas_itens JSONB,
  reflexao_resposta TEXT,
  data_entrega TIMESTAMPTZ DEFAULT now(),
  entregue_no_prazo BOOLEAN,
  numero_tentativa SMALLINT DEFAULT 1,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_analise', 'aprovada', 'refazer', 'atrasada_pendente')),
  avaliado_por UUID REFERENCES public.profiles(id),
  data_avaliacao TIMESTAMPTZ,
  feedback_professor TEXT,
  nota SMALLINT CHECK (nota IS NULL OR nota BETWEEN 0 AND 10),
  pontos_concedidos SMALLINT,
  visualizada_pelo_aluno BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(missao_id, aluno_id, numero_tentativa)
);

ALTER TABLE public.entregas ENABLE ROW LEVEL SECURITY;

-- 2.14 entrega_arquivos
CREATE TABLE IF NOT EXISTS public.entrega_arquivos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entrega_id UUID NOT NULL REFERENCES public.entregas(id) ON DELETE CASCADE,
  nome_original TEXT NOT NULL,
  nome_storage TEXT NOT NULL,
  tipo_arquivo TEXT,
  tamanho_bytes BIGINT,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.entrega_arquivos ENABLE ROW LEVEL SECURITY;

-- 2.15 observacoes
CREATE TABLE IF NOT EXISTS public.observacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  aluno_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  professor_id UUID NOT NULL REFERENCES public.profiles(id),
  turma_id UUID NOT NULL REFERENCES public.turmas(id),
  fase_id UUID NOT NULL REFERENCES public.fases(id),
  sinal_id SMALLINT NOT NULL REFERENCES public.sinais(id),
  inteligencia_fase SMALLINT NOT NULL REFERENCES public.inteligencias(id),
  inteligencia_expressa SMALLINT NOT NULL REFERENCES public.inteligencias(id),
  foi_cross_im BOOLEAN GENERATED ALWAYS AS (inteligencia_fase <> inteligencia_expressa) STORED,
  intensidade TEXT DEFAULT 'normal' CHECK (intensidade IN ('normal', 'alto', 'excepcional')),
  observacao_texto TEXT,
  data_observacao DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.observacoes ENABLE ROW LEVEL SECURITY;

-- 2.16 pontos_gerais
CREATE TABLE IF NOT EXISTS public.pontos_gerais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  aluno_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  casa_id SMALLINT NOT NULL REFERENCES public.inteligencias(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('missao', 'bonus_professor', 'bonus_lideranca', 'penalidade', 'ajuste')),
  missao_id UUID REFERENCES public.missoes(id) ON DELETE SET NULL,
  entrega_id UUID REFERENCES public.entregas(id) ON DELETE SET NULL,
  pontos INTEGER NOT NULL,
  descricao TEXT,
  concedido_por UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ano_letivo SMALLINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.pontos_gerais ENABLE ROW LEVEL SECURITY;

-- 2.17 inteligencia_scores
CREATE TABLE IF NOT EXISTS public.inteligencia_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  inteligencia_id SMALLINT NOT NULL REFERENCES public.inteligencias(id),
  score_atual DECIMAL(5,2) NOT NULL DEFAULT 35.00,
  score_ultima_fase DECIMAL(5,2),
  total_evidencias SMALLINT DEFAULT 0,
  ano_letivo SMALLINT NOT NULL,
  fase_atual SMALLINT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(aluno_id, inteligencia_id, ano_letivo),
  CHECK(score_atual >= 0 AND score_atual <= 100)
);

ALTER TABLE public.inteligencia_scores ENABLE ROW LEVEL SECURITY;

-- 2.18 inteligencia_evidencias
CREATE TABLE IF NOT EXISTS public.inteligencia_evidencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  inteligencia_id SMALLINT NOT NULL REFERENCES public.inteligencias(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('obs_propria', 'obs_cross', 'missao_propria', 'missao_cross')),
  peso SMALLINT NOT NULL,
  pontos DECIMAL(5,2) NOT NULL,
  observacao_id UUID REFERENCES public.observacoes(id) ON DELETE CASCADE,
  entrega_id UUID REFERENCES public.entregas(id) ON DELETE CASCADE,
  fase_id UUID NOT NULL REFERENCES public.fases(id) ON DELETE CASCADE,
  ano_letivo SMALLINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.inteligencia_evidencias ENABLE ROW LEVEL SECURITY;

-- 2.19 inteligencia_historico
CREATE TABLE IF NOT EXISTS public.inteligencia_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  inteligencia_id SMALLINT NOT NULL REFERENCES public.inteligencias(id),
  ano_letivo SMALLINT NOT NULL,
  fase_numero SMALLINT NOT NULL CHECK (fase_numero >= 1 AND fase_numero <= 8),
  score_fase DECIMAL(5,2) NOT NULL,
  score_apos_formula DECIMAL(5,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(aluno_id, inteligencia_id, ano_letivo, fase_numero)
);

ALTER TABLE public.inteligencia_historico ENABLE ROW LEVEL SECURITY;

-- 2.20 score_ajustes_log
CREATE TABLE IF NOT EXISTS public.score_ajustes_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  institution_id UUID NOT NULL REFERENCES public.institutions(id),
  aluno_id UUID NOT NULL REFERENCES public.profiles(id),
  inteligencia_id SMALLINT NOT NULL REFERENCES public.inteligencias(id),
  score_anterior DECIMAL(5,2) NOT NULL,
  score_novo DECIMAL(5,2) NOT NULL,
  motivo TEXT NOT NULL,
  ajustado_por UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.score_ajustes_log ENABLE ROW LEVEL SECURITY;

-- 2.21 cargos_casa
CREATE TABLE IF NOT EXISTS public.cargos_casa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  casa_id SMALLINT NOT NULL REFERENCES public.inteligencias(id),
  aluno_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  cargo TEXT NOT NULL CHECK (cargo IN ('lider', 'coordenador', 'embaixador')),
  ano_letivo SMALLINT NOT NULL DEFAULT 2025,
  data_nomeacao TIMESTAMPTZ DEFAULT now(),
  nomeado_por UUID REFERENCES public.profiles(id),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(institution_id, casa_id, aluno_id, ano_letivo, cargo)
);

ALTER TABLE public.cargos_casa ENABLE ROW LEVEL SECURITY;

-- 2.22 canais_casa
CREATE TABLE IF NOT EXISTS public.canais_casa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id),
  casa_id SMALLINT REFERENCES public.inteligencias(id),
  nome TEXT NOT NULL,
  descricao TEXT,
  icone TEXT DEFAULT '💬',
  tipo TEXT DEFAULT 'texto',
  ordem SMALLINT DEFAULT 0,
  apenas_lideranca BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(institution_id, casa_id, nome)
);

-- Constraint tipo de canal
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'canais_casa_tipo_check') THEN
    ALTER TABLE public.canais_casa DROP CONSTRAINT canais_casa_tipo_check;
  END IF;
  ALTER TABLE public.canais_casa ADD CONSTRAINT canais_casa_tipo_check
    CHECK (tipo = ANY (ARRAY['texto', 'avisos', 'regras', 'conselho_lideres', 'lideranca_casa']));
END $$;

ALTER TABLE public.canais_casa ENABLE ROW LEVEL SECURITY;

-- 2.23 mensagens_canal
CREATE TABLE IF NOT EXISTS public.mensagens_canal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id),
  canal_id UUID NOT NULL REFERENCES public.canais_casa(id) ON DELETE CASCADE,
  autor_id UUID NOT NULL REFERENCES public.profiles(id),
  conteudo TEXT NOT NULL,
  tipo TEXT DEFAULT 'normal' CHECK (tipo IN ('normal', 'anuncio', 'sistema')),
  fixada BOOLEAN DEFAULT false,
  editada BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.mensagens_canal ENABLE ROW LEVEL SECURITY;

-- 2.24 canal_leituras
CREATE TABLE IF NOT EXISTS public.canal_leituras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canal_id UUID NOT NULL REFERENCES public.canais_casa(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ultima_leitura TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(canal_id, usuario_id)
);

ALTER TABLE public.canal_leituras ENABLE ROW LEVEL SECURITY;

-- 2.25 conversas_privadas
CREATE TABLE IF NOT EXISTS public.conversas_privadas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.conversas_privadas ENABLE ROW LEVEL SECURITY;

-- 2.26 conversa_participantes
CREATE TABLE IF NOT EXISTS public.conversa_participantes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversa_id UUID NOT NULL REFERENCES public.conversas_privadas(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES public.profiles(id),
  ultima_leitura TIMESTAMPTZ DEFAULT now(),
  UNIQUE(conversa_id, usuario_id)
);

ALTER TABLE public.conversa_participantes ENABLE ROW LEVEL SECURITY;

-- 2.27 mensagens_privadas
CREATE TABLE IF NOT EXISTS public.mensagens_privadas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversa_id UUID NOT NULL REFERENCES public.conversas_privadas(id) ON DELETE CASCADE,
  autor_id UUID NOT NULL REFERENCES public.profiles(id),
  conteudo TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.mensagens_privadas ENABLE ROW LEVEL SECURITY;

-- 2.28 alertas_alunos
CREATE TABLE IF NOT EXISTS public.alertas_alunos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  aluno_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tipo_alerta tipo_alerta NOT NULL,
  motivo TEXT NOT NULL,
  dados_contexto JSONB DEFAULT '{}',
  status status_alerta DEFAULT 'ativo',
  acao_tomada TEXT,
  fase_id UUID REFERENCES public.fases(id),
  fase_origem_id UUID REFERENCES public.fases(id),
  notificacao_ativa BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.profiles(id)
);

ALTER TABLE public.alertas_alunos ENABLE ROW LEVEL SECURITY;

-- 2.29 acoes_professor
CREATE TABLE IF NOT EXISTS public.acoes_professor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  alerta_id UUID NOT NULL REFERENCES public.alertas_alunos(id) ON DELETE CASCADE,
  professor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  aluno_id UUID REFERENCES public.profiles(id),
  tipo_acao TEXT NOT NULL,
  descricao TEXT,
  categoria_descoberta categoria_descoberta DEFAULT 'indefinido',
  status_aluno TEXT CHECK (status_aluno IN ('melhorou', 'nao_melhorou')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.acoes_professor ENABLE ROW LEVEL SECURITY;

-- 2.30 bonus_solicitacoes
CREATE TABLE IF NOT EXISTS public.bonus_solicitacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  solicitado_por UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  aluno_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  casa_id SMALLINT REFERENCES public.inteligencias(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('pontos_gerais', 'inteligencia')),
  inteligencia_id SMALLINT REFERENCES public.inteligencias(id),
  pontos SMALLINT NOT NULL,
  motivo TEXT NOT NULL,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'rejeitado')),
  avaliado_por UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  data_avaliacao TIMESTAMPTZ,
  feedback_avaliador TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.bonus_solicitacoes ENABLE ROW LEVEL SECURITY;

-- 2.31 activity_logs
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- 2.32 Tabelas de apoio para alertas/arquetipos
CREATE TABLE IF NOT EXISTS public.config_alertas (
  chave TEXT PRIMARY KEY,
  valor INTEGER NOT NULL,
  descricao TEXT
);

ALTER TABLE public.config_alertas ENABLE ROW LEVEL SECURITY;

INSERT INTO public.config_alertas (chave, valor, descricao) VALUES
('sinais_negativos_consecutivos', 3, 'Quantidade de sinais negativos consecutivos para gerar alerta'),
('dias_sem_observacao', 14, 'Dias sem observacao para gerar lembrete'),
('positivos_descoberta', 3, 'Quantidade de positivos fora da casa para descoberta'),
('positivos_confirmacao', 5, 'Quantidade de positivos na casa para confirmacao'),
('percentual_historico_positivo', 70, 'Percentual minimo de historico positivo para detectar mudanca abrupta')
ON CONFLICT (chave) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.hipoteses_por_sinal (
  id SERIAL PRIMARY KEY,
  sinal_codigo TEXT NOT NULL,
  ordem INTEGER NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL
);
ALTER TABLE public.hipoteses_por_sinal ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.hipoteses_por_padrao (
  id SERIAL PRIMARY KEY,
  padrao_codigo TEXT NOT NULL,
  ordem INTEGER NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL
);
ALTER TABLE public.hipoteses_por_padrao ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.acoes_sugeridas (
  id SERIAL PRIMARY KEY,
  tipo_alerta TEXT NOT NULL,
  ordem INTEGER NOT NULL,
  titulo TEXT NOT NULL,
  icone TEXT NOT NULL
);
ALTER TABLE public.acoes_sugeridas ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.arquetipos (
  id SERIAL PRIMARY KEY,
  casa_codigo TEXT NOT NULL,
  fase_codigo TEXT NOT NULL,
  nome_arquetipo TEXT,
  tipo TEXT NOT NULL CHECK (tipo IN ('descoberta', 'confirmacao')),
  significado TEXT NOT NULL,
  potencializar TEXT[] NOT NULL,
  sugestao_conversa TEXT,
  frases_evitar TEXT[],
  frases_preferir TEXT[],
  UNIQUE(casa_codigo, fase_codigo)
);
ALTER TABLE public.arquetipos ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.templates_texto (
  codigo TEXT PRIMARY KEY,
  categoria TEXT NOT NULL,
  template TEXT NOT NULL
);
ALTER TABLE public.templates_texto ENABLE ROW LEVEL SECURITY;

-- 2.33 acoes_celebracao
CREATE TABLE IF NOT EXISTS public.acoes_celebracao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID REFERENCES public.institutions(id) NOT NULL,
  aluno_id UUID REFERENCES public.profiles(id) NOT NULL,
  professor_id UUID REFERENCES public.profiles(id) NOT NULL,
  alerta_id UUID REFERENCES public.alertas_alunos(id),
  tipo_acao TEXT NOT NULL CHECK (tipo_acao IN (
    'conversei_descoberta', 'propus_desafio', 'papel_mentor', 'ainda_nao_conversei'
  )),
  reacao_aluno TEXT CHECK (reacao_aluno IN (
    'animado', 'receptivo', 'indiferente', 'desconfortavel'
  )),
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.acoes_celebracao ENABLE ROW LEVEL SECURITY;

-- 2.34 fase_conteudos
CREATE TABLE IF NOT EXISTS public.fase_conteudos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  fase_id UUID NOT NULL REFERENCES public.fases(id) ON DELETE CASCADE,
  semana SMALLINT NOT NULL CHECK (semana >= 0 AND semana <= 4),
  titulo TEXT,
  descricao TEXT,
  arquivo_nome TEXT NOT NULL,
  arquivo_url TEXT NOT NULL,
  arquivo_tamanho BIGINT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(fase_id, semana)
);
ALTER TABLE public.fase_conteudos ENABLE ROW LEVEL SECURITY;

-- 2.35 conteudo_inteligencia
CREATE TABLE IF NOT EXISTS public.conteudo_inteligencia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  inteligencia_id SMALLINT NOT NULL REFERENCES public.inteligencias(id) ON DELETE CASCADE,
  serie SMALLINT NOT NULL CHECK (serie >= 1 AND serie <= 9),
  semana SMALLINT NOT NULL CHECK (semana >= 1 AND semana <= 4),
  titulo TEXT,
  descricao TEXT,
  arquivo_nome TEXT NOT NULL,
  arquivo_url TEXT NOT NULL,
  arquivo_tamanho BIGINT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(institution_id, inteligencia_id, serie, semana)
);
ALTER TABLE public.conteudo_inteligencia ENABLE ROW LEVEL SECURITY;

-- 2.36 professor_turma (para Infantil/F1)
CREATE TABLE IF NOT EXISTS public.professor_turma (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  turma_id UUID NOT NULL REFERENCES public.turmas(id) ON DELETE CASCADE,
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  ano_letivo SMALLINT NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::SMALLINT,
  eh_regente BOOLEAN DEFAULT true,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(professor_id, turma_id, ano_letivo)
);
ALTER TABLE public.professor_turma ENABLE ROW LEVEL SECURITY;

-- 2.37 webhook_n8n_logs
CREATE TABLE IF NOT EXISTS public.webhook_n8n_logs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  observacao_id UUID NOT NULL,
  endpoint_url TEXT NOT NULL,
  request_id BIGINT,
  payload JSONB NOT NULL,
  error_msg TEXT
);
ALTER TABLE public.webhook_n8n_logs ENABLE ROW LEVEL SECURITY;

-- 2.38 admin_logs
CREATE TABLE IF NOT EXISTS public.admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  acao TEXT NOT NULL,
  alvo_id UUID,
  alvo_tipo TEXT,
  detalhes JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

-- 2.39 mapa_desenvolvimento
CREATE TABLE IF NOT EXISTS public.mapa_desenvolvimento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id UUID NOT NULL REFERENCES public.profiles(id),
  turma_id UUID NOT NULL REFERENCES public.turmas(id),
  professor_id UUID NOT NULL REFERENCES public.profiles(id),
  fase_id UUID NOT NULL REFERENCES public.fases(id),
  semana_numero SMALLINT NOT NULL,
  institution_id UUID NOT NULL REFERENCES public.institutions(id),
  quadrante TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (aluno_id, fase_id, semana_numero)
);
ALTER TABLE public.mapa_desenvolvimento ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- 3. INDICES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_institution_id ON public.profiles(institution_id);
CREATE INDEX IF NOT EXISTS idx_profiles_casa_id ON public.profiles(casa_id);
CREATE INDEX IF NOT EXISTS idx_profiles_institution_casa ON public.profiles(institution_id, casa_id);
CREATE INDEX IF NOT EXISTS idx_profiles_must_change_password ON public.profiles(must_change_password) WHERE must_change_password = true;
CREATE INDEX IF NOT EXISTS idx_profiles_email_gerado ON public.profiles(email_gerado);
CREATE INDEX IF NOT EXISTS idx_profiles_conta_criada ON public.profiles(conta_criada) WHERE conta_criada = false;
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_matricula_externa ON public.profiles(matricula_externa) WHERE matricula_externa IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_institution_settings_slug ON public.institution_settings(slug);

CREATE INDEX IF NOT EXISTS idx_turmas_institution ON public.turmas(institution_id);
CREATE INDEX IF NOT EXISTS idx_turmas_ano_letivo ON public.turmas(ano_letivo);
CREATE INDEX IF NOT EXISTS idx_turmas_segmento ON public.turmas(segmento);

CREATE INDEX IF NOT EXISTS idx_aluno_turma_aluno ON public.aluno_turma(aluno_id);
CREATE INDEX IF NOT EXISTS idx_aluno_turma_turma ON public.aluno_turma(turma_id);

CREATE INDEX IF NOT EXISTS idx_professor_casa_professor ON public.professor_casa(professor_id);
CREATE INDEX IF NOT EXISTS idx_professor_casa_casa ON public.professor_casa(casa_id);
CREATE INDEX IF NOT EXISTS idx_professor_casa_institution ON public.professor_casa(institution_id);
CREATE INDEX IF NOT EXISTS idx_professor_casa_ativo ON public.professor_casa(professor_id, ativo);

CREATE INDEX IF NOT EXISTS idx_fases_institution ON public.fases(institution_id);
CREATE INDEX IF NOT EXISTS idx_fases_ativo ON public.fases(institution_id, ativo) WHERE ativo = true;
CREATE INDEX IF NOT EXISTS idx_fases_segmento ON public.fases(segmento);

CREATE INDEX IF NOT EXISTS idx_missoes_institution ON public.missoes(institution_id);
CREATE INDEX IF NOT EXISTS idx_missoes_casa ON public.missoes(casa_id);
CREATE INDEX IF NOT EXISTS idx_missoes_status ON public.missoes(status);
CREATE INDEX IF NOT EXISTS idx_missoes_liberacao ON public.missoes(data_liberacao) WHERE status = 'agendada';

CREATE INDEX IF NOT EXISTS idx_entregas_missao ON public.entregas(missao_id);
CREATE INDEX IF NOT EXISTS idx_entregas_aluno ON public.entregas(aluno_id);
CREATE INDEX IF NOT EXISTS idx_entregas_status ON public.entregas(status);
CREATE INDEX IF NOT EXISTS idx_entregas_avaliacao ON public.entregas(status) WHERE status = 'pendente';

CREATE INDEX IF NOT EXISTS idx_arquivos_entrega ON public.entrega_arquivos(entrega_id);

CREATE INDEX IF NOT EXISTS idx_obs_aluno ON public.observacoes(aluno_id);
CREATE INDEX IF NOT EXISTS idx_obs_professor ON public.observacoes(professor_id);
CREATE INDEX IF NOT EXISTS idx_obs_fase ON public.observacoes(fase_id);
CREATE INDEX IF NOT EXISTS idx_obs_sinal ON public.observacoes(sinal_id);
CREATE INDEX IF NOT EXISTS idx_obs_im_expressa ON public.observacoes(inteligencia_expressa);
CREATE INDEX IF NOT EXISTS idx_obs_cross ON public.observacoes(foi_cross_im) WHERE foi_cross_im = true;
CREATE INDEX IF NOT EXISTS idx_obs_data ON public.observacoes(data_observacao);

CREATE INDEX IF NOT EXISTS idx_pontos_aluno ON public.pontos_gerais(aluno_id);
CREATE INDEX IF NOT EXISTS idx_pontos_casa ON public.pontos_gerais(casa_id);
CREATE INDEX IF NOT EXISTS idx_pontos_institution_ano ON public.pontos_gerais(institution_id, ano_letivo);

CREATE INDEX IF NOT EXISTS idx_evidencias_aluno_im ON public.inteligencia_evidencias(aluno_id, inteligencia_id);
CREATE INDEX IF NOT EXISTS idx_evidencias_fase ON public.inteligencia_evidencias(fase_id);

CREATE INDEX IF NOT EXISTS idx_scores_aluno ON public.inteligencia_scores(aluno_id);

CREATE INDEX IF NOT EXISTS idx_ajustes_aluno ON public.score_ajustes_log(aluno_id);
CREATE INDEX IF NOT EXISTS idx_ajustes_data ON public.score_ajustes_log(created_at);

CREATE INDEX IF NOT EXISTS idx_cargos_casa_lookup ON public.cargos_casa(institution_id, casa_id, ano_letivo, ativo);

CREATE INDEX IF NOT EXISTS idx_canais_casa ON public.canais_casa(institution_id, casa_id);
CREATE INDEX IF NOT EXISTS idx_mensagens_canal ON public.mensagens_canal(canal_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mensagens_autor ON public.mensagens_canal(autor_id);
CREATE INDEX IF NOT EXISTS idx_conversa_part ON public.conversa_participantes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_msg_privadas ON public.mensagens_privadas(conversa_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_canal_leituras_canal ON public.canal_leituras(canal_id);
CREATE INDEX IF NOT EXISTS idx_canal_leituras_usuario ON public.canal_leituras(usuario_id);

CREATE INDEX IF NOT EXISTS idx_alertas_aluno ON public.alertas_alunos(aluno_id);
CREATE INDEX IF NOT EXISTS idx_alertas_status ON public.alertas_alunos(status);
CREATE INDEX IF NOT EXISTS idx_alertas_tipo ON public.alertas_alunos(tipo_alerta);
CREATE INDEX IF NOT EXISTS idx_alertas_institution ON public.alertas_alunos(institution_id);
CREATE INDEX IF NOT EXISTS idx_alertas_created ON public.alertas_alunos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alertas_status_ativo ON public.alertas_alunos(status) WHERE status = 'ativo';
CREATE INDEX IF NOT EXISTS idx_alertas_fase ON public.alertas_alunos(fase_id);
CREATE INDEX IF NOT EXISTS idx_alertas_notificacao ON public.alertas_alunos(notificacao_ativa) WHERE notificacao_ativa = true;

CREATE INDEX IF NOT EXISTS idx_acoes_alerta ON public.acoes_professor(alerta_id);
CREATE INDEX IF NOT EXISTS idx_acoes_professor ON public.acoes_professor(professor_id);
CREATE INDEX IF NOT EXISTS idx_acoes_professor_aluno ON public.acoes_professor(aluno_id);

CREATE INDEX IF NOT EXISTS idx_bonus_status ON public.bonus_solicitacoes(status) WHERE status = 'pendente';
CREATE INDEX IF NOT EXISTS idx_bonus_institution ON public.bonus_solicitacoes(institution_id);

CREATE INDEX IF NOT EXISTS idx_acoes_celebracao_aluno ON public.acoes_celebracao(aluno_id);
CREATE INDEX IF NOT EXISTS idx_acoes_celebracao_professor ON public.acoes_celebracao(professor_id);
CREATE INDEX IF NOT EXISTS idx_acoes_celebracao_alerta ON public.acoes_celebracao(alerta_id);

CREATE INDEX IF NOT EXISTS idx_conteudo_inteligencia_institution ON public.conteudo_inteligencia(institution_id);
CREATE INDEX IF NOT EXISTS idx_conteudo_inteligencia_lookup ON public.conteudo_inteligencia(institution_id, inteligencia_id, serie);

CREATE INDEX IF NOT EXISTS idx_professor_turma_professor ON public.professor_turma(professor_id);
CREATE INDEX IF NOT EXISTS idx_professor_turma_turma ON public.professor_turma(turma_id);
CREATE INDEX IF NOT EXISTS idx_professor_turma_institution ON public.professor_turma(institution_id);

CREATE INDEX IF NOT EXISTS idx_webhook_n8n_logs_observacao ON public.webhook_n8n_logs(observacao_id);
CREATE INDEX IF NOT EXISTS idx_webhook_n8n_logs_created ON public.webhook_n8n_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_admin_logs_institution ON public.admin_logs(institution_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin ON public.admin_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created ON public.admin_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_logs_acao ON public.admin_logs(acao);

CREATE INDEX IF NOT EXISTS idx_mapa_turma_fase ON public.mapa_desenvolvimento(turma_id, fase_id);
CREATE INDEX IF NOT EXISTS idx_mapa_aluno_fase ON public.mapa_desenvolvimento(aluno_id, fase_id);
CREATE INDEX IF NOT EXISTS idx_mapa_professor ON public.mapa_desenvolvimento(professor_id);

CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON public.activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_action ON public.activity_logs(user_id, action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON public.activity_logs(action);


-- ============================================================================
-- 4. FUNCOES CORE
-- ============================================================================

-- 4.1 has_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 4.2 get_user_institution_id
CREATE OR REPLACE FUNCTION public.get_user_institution_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT institution_id FROM profiles WHERE id = auth.uid()
$$;

-- 4.3 update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 4.4 handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, sobrenome, full_name, must_change_password)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'nome',
    NEW.raw_user_meta_data ->> 'sobrenome',
    COALESCE(NEW.raw_user_meta_data ->> 'full_name',
      CONCAT_WS(' ', NEW.raw_user_meta_data ->> 'nome', NEW.raw_user_meta_data ->> 'sobrenome')),
    COALESCE((NEW.raw_user_meta_data ->> 'must_change_password')::boolean, true)
  );
  RETURN NEW;
END;
$$;

-- 4.5 get_professor_turma_ids
CREATE OR REPLACE FUNCTION public.get_professor_turma_ids()
RETURNS UUID[] AS $$
  SELECT COALESCE(ARRAY_AGG(turma_id), ARRAY[]::UUID[])
  FROM public.professor_turma
  WHERE professor_id = auth.uid() AND ativo = true;
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- 4.6 user_participa_conversa
CREATE OR REPLACE FUNCTION public.user_participa_conversa(p_conversa_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM conversa_participantes
    WHERE conversa_id = p_conversa_id
    AND usuario_id = auth.uid()
  )
$$;

-- 4.7 pode_acessar_conselho
CREATE OR REPLACE FUNCTION public.pode_acessar_conselho(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = p_user_id AND role = 'admin'
  )
  OR EXISTS (
    SELECT 1 FROM public.cargos_casa WHERE aluno_id = p_user_id AND cargo = 'lider' AND ativo = true
  )
$$;

-- 4.8 pode_acessar_lideranca_casa
CREATE OR REPLACE FUNCTION public.pode_acessar_lideranca_casa(p_user_id UUID, p_casa_id SMALLINT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = p_user_id AND role = 'admin'
  )
  OR EXISTS (
    SELECT 1 FROM public.cargos_casa
    WHERE aluno_id = p_user_id
      AND casa_id = p_casa_id
      AND cargo IN ('lider', 'coordenador')
      AND ativo = true
  )
  OR EXISTS (
    SELECT 1 FROM public.professor_casa
    WHERE professor_id = p_user_id
      AND casa_id = p_casa_id
      AND ativo = true
  )
$$;

-- 4.9 create_default_institution_settings
CREATE OR REPLACE FUNCTION public.create_default_institution_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.institution_settings (institution_id)
  VALUES (NEW.id)
  ON CONFLICT (institution_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4.10 sync_casa_to_casa_id
CREATE OR REPLACE FUNCTION public.sync_casa_to_casa_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.casa IS NOT NULL AND NEW.casa_id IS NULL THEN
    SELECT id INTO NEW.casa_id
    FROM public.inteligencias
    WHERE LOWER(TRIM(nome)) = LOWER(TRIM(NEW.casa))
       OR LOWER(TRIM(codigo)) = LOWER(TRIM(REPLACE(REPLACE(NEW.casa, '-', '_'), ' ', '_')));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 4.11 protect_casa_id_change
CREATE OR REPLACE FUNCTION public.protect_casa_id_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.casa_id IS NOT DISTINCT FROM NEW.casa_id THEN
    RETURN NEW;
  END IF;
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Apenas administradores podem alterar a Casa do usuario';
END;
$$;

-- 4.12 ensure_turma_exists (5 args com segmento)
CREATE OR REPLACE FUNCTION public.ensure_turma_exists(
  p_institution_id UUID, p_serie TEXT, p_turma_letra TEXT,
  p_ano_letivo SMALLINT, p_segmento TEXT DEFAULT 'fundamental2'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_turma_id UUID;
  v_nome TEXT;
BEGIN
  SELECT id INTO v_turma_id
  FROM public.turmas
  WHERE institution_id = p_institution_id
    AND serie = p_serie
    AND UPPER(TRIM(turma_letra)) = UPPER(TRIM(p_turma_letra))
    AND ano_letivo = p_ano_letivo
    AND segmento = p_segmento;

  IF v_turma_id IS NULL THEN
    IF p_segmento = 'infantil' THEN
      v_nome := p_serie || ' ' || UPPER(TRIM(p_turma_letra));
    ELSE
      v_nome := p_serie || 'o ' || UPPER(TRIM(p_turma_letra));
    END IF;

    INSERT INTO public.turmas (institution_id, nome, serie, turma_letra, ano_letivo, segmento)
    VALUES (
      p_institution_id, v_nome, p_serie,
      UPPER(TRIM(p_turma_letra)), p_ano_letivo, p_segmento
    )
    RETURNING id INTO v_turma_id;
  END IF;

  RETURN v_turma_id;
END;
$$;

-- 4.13 sync_profile_to_aluno_turma
CREATE OR REPLACE FUNCTION public.sync_profile_to_aluno_turma()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_turma_id UUID;
  v_ano_letivo SMALLINT;
  v_is_aluno BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = NEW.id AND role = 'user'
  ) INTO v_is_aluno;

  IF NOT v_is_aluno OR NEW.serie IS NULL OR NEW.turma IS NULL OR NEW.institution_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(ano_letivo_atual, EXTRACT(YEAR FROM CURRENT_DATE)::SMALLINT)
  INTO v_ano_letivo
  FROM public.institution_settings
  WHERE institution_id = NEW.institution_id;

  IF v_ano_letivo IS NULL THEN
    v_ano_letivo := EXTRACT(YEAR FROM CURRENT_DATE)::SMALLINT;
  END IF;

  v_turma_id := public.ensure_turma_exists(
    NEW.institution_id, NEW.serie, NEW.turma, v_ano_letivo,
    COALESCE(NEW.segmento, 'fundamental2')
  );

  INSERT INTO public.aluno_turma (aluno_id, turma_id, ano_letivo, ativo)
  VALUES (NEW.id, v_turma_id, v_ano_letivo, true)
  ON CONFLICT (aluno_id, turma_id, ano_letivo)
  DO UPDATE SET ativo = true;

  RETURN NEW;
END;
$$;

-- 4.14 sync_user_role_to_aluno_turma
CREATE OR REPLACE FUNCTION public.sync_user_role_to_aluno_turma()
RETURNS TRIGGER AS $$
DECLARE
  v_profile RECORD;
  v_turma_id UUID;
  v_ano_letivo SMALLINT;
BEGIN
  IF NEW.role != 'user' THEN RETURN NEW; END IF;

  SELECT id, serie, turma, institution_id, segmento
  INTO v_profile FROM public.profiles WHERE id = NEW.user_id;

  IF v_profile.serie IS NULL OR v_profile.turma IS NULL OR v_profile.institution_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(ano_letivo_atual, EXTRACT(YEAR FROM CURRENT_DATE)::SMALLINT)
  INTO v_ano_letivo FROM public.institution_settings
  WHERE institution_id = v_profile.institution_id;

  IF v_ano_letivo IS NULL THEN
    v_ano_letivo := EXTRACT(YEAR FROM CURRENT_DATE)::SMALLINT;
  END IF;

  v_turma_id := public.ensure_turma_exists(
    v_profile.institution_id, v_profile.serie, v_profile.turma,
    v_ano_letivo, COALESCE(v_profile.segmento, 'fundamental2')
  );

  INSERT INTO public.aluno_turma (aluno_id, turma_id, ano_letivo, ativo)
  VALUES (v_profile.id, v_turma_id, v_ano_letivo, true)
  ON CONFLICT (aluno_id, turma_id, ano_letivo) DO UPDATE SET ativo = true;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4.15 get_alunos_minha_casa
CREATE OR REPLACE FUNCTION public.get_alunos_minha_casa(
  p_serie SMALLINT DEFAULT NULL,
  p_turma_letra TEXT DEFAULT NULL
)
RETURNS TABLE (
  aluno_id UUID, nome TEXT, sobrenome TEXT, full_name TEXT,
  casa_id SMALLINT, casa_nome TEXT, serie TEXT, turma TEXT
) AS $$
DECLARE
  v_minha_casa_id SMALLINT;
  v_minha_institution_id UUID;
BEGIN
  SELECT pc.casa_id, pc.institution_id
  INTO v_minha_casa_id, v_minha_institution_id
  FROM public.professor_casa pc
  WHERE pc.professor_id = auth.uid() AND pc.ativo = true
  LIMIT 1;

  IF v_minha_casa_id IS NULL THEN RETURN; END IF;

  RETURN QUERY
  SELECT
    p.id as aluno_id, p.nome, p.sobrenome, p.full_name,
    p.casa_id, i.nome as casa_nome, p.serie, p.turma
  FROM public.profiles p
  JOIN public.inteligencias i ON i.id = p.casa_id
  JOIN public.user_roles ur ON ur.user_id = p.id AND ur.role = 'user'
  WHERE p.institution_id = v_minha_institution_id
    AND p.casa_id = v_minha_casa_id
    AND (p_serie IS NULL OR CAST(REGEXP_REPLACE(p.serie, '[^0-9]', '', 'g') AS SMALLINT) = p_serie)
    AND (p_turma_letra IS NULL OR UPPER(TRIM(p.turma)) = UPPER(TRIM(p_turma_letra)))
  ORDER BY p.serie, p.turma, p.nome;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4.16 inicializar_scores_aluno
CREATE OR REPLACE FUNCTION public.inicializar_scores_aluno()
RETURNS TRIGGER AS $$
DECLARE
  v_ano_letivo SMALLINT;
  v_im RECORD;
BEGIN
  IF NEW.casa_id IS NOT NULL THEN
    SELECT COALESCE(ano_letivo_atual, EXTRACT(YEAR FROM NOW())::SMALLINT)
    INTO v_ano_letivo
    FROM public.institution_settings
    WHERE institution_id = NEW.institution_id;

    IF v_ano_letivo IS NULL THEN
      v_ano_letivo := EXTRACT(YEAR FROM NOW())::SMALLINT;
    END IF;

    FOR v_im IN SELECT id FROM public.inteligencias ORDER BY id LOOP
      INSERT INTO public.inteligencia_scores (aluno_id, inteligencia_id, score_atual, ano_letivo)
      VALUES (NEW.id, v_im.id, 35.00, v_ano_letivo)
      ON CONFLICT (aluno_id, inteligencia_id, ano_letivo) DO NOTHING;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4.17 registrar_ajuste_score
CREATE OR REPLACE FUNCTION public.registrar_ajuste_score()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.score_atual IS DISTINCT FROM NEW.score_atual THEN
    INSERT INTO public.score_ajustes_log (
      institution_id, aluno_id, inteligencia_id,
      score_anterior, score_novo, motivo, ajustado_por
    ) VALUES (
      (SELECT institution_id FROM public.profiles WHERE id = NEW.aluno_id),
      NEW.aluno_id, NEW.inteligencia_id,
      OLD.score_atual, NEW.score_atual,
      COALESCE(current_setting('app.motivo_ajuste', true), 'Fechamento de fase'),
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4.18 processar_entrega_aprovada
CREATE OR REPLACE FUNCTION public.processar_entrega_aprovada()
RETURNS TRIGGER AS $$
DECLARE
  v_missao RECORD;
  v_aluno RECORD;
  v_pontos_calculados SMALLINT;
  v_tipo_evidencia TEXT;
  v_peso SMALLINT;
BEGIN
  IF NEW.status = 'aprovada' AND (OLD.status IS NULL OR OLD.status <> 'aprovada') THEN
    SELECT m.*, f.inteligencia_id as fase_im INTO v_missao
    FROM missoes m LEFT JOIN fases f ON f.id = m.fase_id
    WHERE m.id = NEW.missao_id;

    SELECT p.*, COALESCE(s.ano_letivo_atual, 2025) as ano_letivo INTO v_aluno
    FROM profiles p LEFT JOIN institution_settings s ON s.institution_id = p.institution_id
    WHERE p.id = NEW.aluno_id;

    v_pontos_calculados := ROUND((NEW.nota::DECIMAL / 10) * v_missao.pontos_base);
    NEW.pontos_concedidos := v_pontos_calculados;

    INSERT INTO pontos_gerais (
      institution_id, aluno_id, casa_id, tipo,
      missao_id, entrega_id, pontos, descricao,
      concedido_por, ano_letivo
    ) VALUES (
      v_missao.institution_id, NEW.aluno_id, v_aluno.casa_id, 'missao',
      NEW.missao_id, NEW.id, v_pontos_calculados,
      'Missao: ' || v_missao.titulo, NEW.avaliado_por, v_aluno.ano_letivo
    );

    IF v_missao.fase_id IS NOT NULL THEN
      IF v_missao.fase_im = v_aluno.casa_id THEN
        v_tipo_evidencia := 'missao_propria'; v_peso := 2;
      ELSE
        v_tipo_evidencia := 'missao_cross'; v_peso := 1;
      END IF;

      INSERT INTO inteligencia_evidencias (
        aluno_id, inteligencia_id, tipo, peso,
        pontos, entrega_id, fase_id, ano_letivo
      ) VALUES (
        NEW.aluno_id, v_aluno.casa_id, v_tipo_evidencia, v_peso,
        NEW.nota * (v_peso::DECIMAL / 10), NEW.id,
        v_missao.fase_id, v_aluno.ano_letivo
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4.19 processar_observacao
CREATE OR REPLACE FUNCTION public.processar_observacao()
RETURNS TRIGGER AS $$
DECLARE
  v_sinal RECORD;
  v_fase RECORD;
  v_tipo TEXT;
  v_peso SMALLINT;
  v_pontos DECIMAL;
  v_ano_letivo SMALLINT;
BEGIN
  SELECT * INTO v_sinal FROM sinais WHERE id = NEW.sinal_id;
  SELECT f.*, COALESCE(s.ano_letivo_atual, 2025) as ano_letivo
  INTO v_fase FROM fases f
  LEFT JOIN institution_settings s ON s.institution_id = f.institution_id
  WHERE f.id = NEW.fase_id;

  v_ano_letivo := COALESCE(v_fase.ano_letivo, 2025);

  IF v_sinal.valencia = 'positivo' THEN
    IF NEW.foi_cross_im THEN
      v_tipo := 'obs_cross'; v_peso := 5;
    ELSE
      v_tipo := 'obs_propria'; v_peso := 3;
    END IF;

    v_pontos := v_sinal.peso_inteligencia;
    IF NEW.intensidade = 'alto' THEN v_pontos := v_pontos * 1.5;
    ELSIF NEW.intensidade = 'excepcional' THEN v_pontos := v_pontos * 2;
    END IF;

    INSERT INTO inteligencia_evidencias (
      aluno_id, inteligencia_id, tipo, peso,
      pontos, observacao_id, fase_id, ano_letivo
    ) VALUES (
      NEW.aluno_id, NEW.inteligencia_expressa, v_tipo, v_peso,
      v_pontos, NEW.id, NEW.fase_id, v_ano_letivo
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4.20 fechar_fase
DROP FUNCTION IF EXISTS fechar_fase(UUID);
CREATE OR REPLACE FUNCTION public.fechar_fase(p_fase_id UUID)
RETURNS TABLE(total_alunos INT, numero_da_fase SMALLINT) AS $$
DECLARE
  v_fase RECORD; v_aluno RECORD; v_im RECORD; v_evidencias RECORD;
  v_score_fase DECIMAL; v_score_anterior DECIMAL;
  v_score_calculado DECIMAL; v_score_novo DECIMAL; v_variacao DECIMAL;
  v_contador INT := 0;
BEGIN
  SELECT * INTO v_fase FROM fases WHERE id = p_fase_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Fase nao encontrada: %', p_fase_id; END IF;

  FOR v_aluno IN
    SELECT p.id, p.casa_id FROM profiles p
    WHERE p.institution_id = v_fase.institution_id AND p.casa_id IS NOT NULL
  LOOP
    FOR v_im IN SELECT id FROM inteligencias ORDER BY id LOOP
      SELECT COALESCE(SUM(pontos), 0) as total_pontos, COUNT(*) as total_evidencias
      INTO v_evidencias FROM inteligencia_evidencias
      WHERE aluno_id = v_aluno.id AND inteligencia_id = v_im.id AND fase_id = p_fase_id;

      v_score_fase := LEAST(100, (v_evidencias.total_pontos / 50.0) * 100);

      SELECT score_atual INTO v_score_anterior FROM inteligencia_scores
      WHERE aluno_id = v_aluno.id AND inteligencia_id = v_im.id AND ano_letivo = v_fase.ano_letivo;
      IF v_score_anterior IS NULL THEN v_score_anterior := 35.00; END IF;

      v_score_calculado := (v_score_anterior * 0.85) + (v_score_fase * 0.15);
      v_variacao := v_score_calculado - v_score_anterior;
      IF v_variacao > 5 THEN v_score_novo := v_score_anterior + 5;
      ELSIF v_variacao < -5 THEN v_score_novo := v_score_anterior - 5;
      ELSE v_score_novo := v_score_calculado; END IF;
      v_score_novo := GREATEST(0, LEAST(100, v_score_novo));

      INSERT INTO inteligencia_scores (
        aluno_id, inteligencia_id, score_atual,
        score_ultima_fase, total_evidencias, ano_letivo, fase_atual
      ) VALUES (
        v_aluno.id, v_im.id, v_score_novo,
        v_score_fase, v_evidencias.total_evidencias,
        v_fase.ano_letivo, v_fase.numero_fase
      )
      ON CONFLICT (aluno_id, inteligencia_id, ano_letivo)
      DO UPDATE SET
        score_atual = v_score_novo,
        score_ultima_fase = v_score_fase,
        total_evidencias = inteligencia_scores.total_evidencias + v_evidencias.total_evidencias,
        fase_atual = v_fase.numero_fase, updated_at = now();

      INSERT INTO inteligencia_historico (
        aluno_id, inteligencia_id, ano_letivo,
        fase_numero, score_fase, score_apos_formula
      ) VALUES (
        v_aluno.id, v_im.id, v_fase.ano_letivo,
        v_fase.numero_fase, v_score_fase, v_score_novo
      )
      ON CONFLICT (aluno_id, inteligencia_id, ano_letivo, fase_numero)
      DO UPDATE SET
        score_fase = EXCLUDED.score_fase,
        score_apos_formula = EXCLUDED.score_apos_formula;
    END LOOP;
    v_contador := v_contador + 1;
  END LOOP;

  UPDATE fases SET ativo = false WHERE id = p_fase_id;
  RETURN QUERY SELECT v_contador, v_fase.numero_fase;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4.21 get_missoes_do_aluno (versao final)
DROP FUNCTION IF EXISTS public.get_missoes_do_aluno(UUID);
CREATE OR REPLACE FUNCTION public.get_missoes_do_aluno(p_aluno_id UUID)
RETURNS TABLE(
  id UUID, titulo TEXT, descricao TEXT, tipo TEXT,
  pontos_base INTEGER, data_liberacao TIMESTAMPTZ, data_prazo TIMESTAMPTZ,
  requer_texto BOOLEAN, requer_arquivo BOOLEAN, permite_atrasada BOOLEAN,
  casa_id INTEGER, casa_nome TEXT, casa_emoji TEXT, casa_cor TEXT,
  ja_entregou BOOLEAN, status_entrega TEXT, atrasada BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
  v_now TIMESTAMPTZ := now();
  v_serie_num SMALLINT;
BEGIN
  SELECT p.id, p.institution_id, p.casa_id,
    COALESCE(p.serie, '') as serie, COALESCE(p.turma, '') as turma
  INTO v_profile FROM profiles p WHERE p.id = p_aluno_id;
  IF v_profile IS NULL THEN RETURN; END IF;
  v_serie_num := NULLIF(REGEXP_REPLACE(v_profile.serie, '[^0-9]', '', 'g'), '')::SMALLINT;

  RETURN QUERY
  SELECT
    m.id, m.titulo, m.descricao, m.tipo,
    m.pontos_base::INTEGER, m.data_liberacao, m.data_prazo,
    COALESCE(m.requer_texto, false), COALESCE(m.requer_arquivo, false),
    COALESCE(m.permite_entrega_atrasada, false),
    i.id::INTEGER, i.nome, i.emoji, i.cor_hex,
    EXISTS(SELECT 1 FROM entregas e WHERE e.missao_id = m.id AND e.aluno_id = p_aluno_id),
    COALESCE(
      (SELECT e.status FROM entregas e WHERE e.missao_id = m.id AND e.aluno_id = p_aluno_id ORDER BY e.created_at DESC LIMIT 1),
      'pendente'
    ),
    (m.data_prazo < v_now)
  FROM missoes m
  LEFT JOIN inteligencias i ON i.id = m.casa_id
  WHERE
    m.institution_id = v_profile.institution_id
    AND m.status = 'liberada'
    AND m.data_liberacao <= v_now
    AND (m.serie_filtro IS NULL OR m.serie_filtro = v_serie_num)
    AND (m.turma_filtro IS NULL OR m.turma_filtro = ''
         OR UPPER(TRIM(v_profile.turma)) = ANY(
           SELECT UPPER(TRIM(t)) FROM unnest(string_to_array(m.turma_filtro, ',')) AS t
         ))
    AND (
      m.fase_id IS NULL
      OR EXISTS (
        SELECT 1 FROM fases f
        WHERE f.id = m.fase_id
          AND f.data_inicio <= v_now::DATE
          AND f.data_fim >= v_now::DATE
          AND (f.serie IS NULL OR f.serie = v_serie_num)
      )
    )
    AND (
      (m.casa_id IS NULL AND COALESCE(m.para_todos_da_casa, true) = true
       AND NOT EXISTS(SELECT 1 FROM missao_destinatarios md WHERE md.missao_id = m.id))
      OR (m.casa_id = v_profile.casa_id AND COALESCE(m.para_todos_da_casa, true) = true)
      OR EXISTS(SELECT 1 FROM missao_destinatarios md WHERE md.missao_id = m.id AND md.aluno_id = p_aluno_id)
    )
  ORDER BY
    CASE
      WHEN NOT EXISTS(SELECT 1 FROM entregas e WHERE e.missao_id = m.id AND e.aluno_id = p_aluno_id)
           AND m.data_prazo >= v_now THEN 0
      WHEN NOT EXISTS(SELECT 1 FROM entregas e WHERE e.missao_id = m.id AND e.aluno_id = p_aluno_id)
           AND m.data_prazo < v_now THEN 1
      ELSE 2
    END,
    m.data_prazo ASC;
END;
$$;

-- 4.22 validate_mapa_desenvolvimento
CREATE OR REPLACE FUNCTION public.validate_mapa_desenvolvimento()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.quadrante NOT IN ('surpreendeu', 'foi_bem', 'teve_dificuldades', 'atencao') THEN
    RAISE EXCEPTION 'Quadrante invalido: %', NEW.quadrante;
  END IF;
  IF NEW.semana_numero < 1 OR NEW.semana_numero > 4 THEN
    RAISE EXCEPTION 'semana_numero deve ser entre 1 e 4';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 4.23 analisar_e_gerar_alertas (versao final com 2 ultimas obs)
CREATE OR REPLACE FUNCTION public.analisar_e_gerar_alertas(p_aluno_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_institution_id UUID;
  v_fase_atual_id UUID;
  v_fase_inteligencia_id SMALLINT;
  v_casa_aluno_id SMALLINT;
  v_tipo_1 TEXT; v_tipo_2 TEXT;
  v_sinal_1 TEXT; v_sinal_2 TEXT;
  v_estado_atual TEXT;
  v_total_positivas INTEGER;
  v_tipo_celebracao TEXT;
  v_config_descoberta INTEGER;
  v_config_confirmacao INTEGER;
BEGIN
  SELECT institution_id, casa_id INTO v_institution_id, v_casa_aluno_id
  FROM profiles WHERE id = p_aluno_id;
  IF v_institution_id IS NULL THEN RETURN; END IF;

  SELECT id, inteligencia_id INTO v_fase_atual_id, v_fase_inteligencia_id
  FROM fases WHERE institution_id = v_institution_id AND ativo = true LIMIT 1;

  SELECT COALESCE((SELECT valor FROM config_alertas WHERE chave = 'positivos_descoberta'), 3) INTO v_config_descoberta;
  SELECT COALESCE((SELECT valor FROM config_alertas WHERE chave = 'positivos_confirmacao'), 5) INTO v_config_confirmacao;

  SELECT s.valencia, s.label_pt INTO v_tipo_1, v_sinal_1
  FROM observacoes o JOIN sinais s ON s.id = o.sinal_id
  WHERE o.aluno_id = p_aluno_id ORDER BY o.created_at DESC LIMIT 1;

  SELECT s.valencia, s.label_pt INTO v_tipo_2, v_sinal_2
  FROM observacoes o JOIN sinais s ON s.id = o.sinal_id
  WHERE o.aluno_id = p_aluno_id ORDER BY o.created_at DESC OFFSET 1 LIMIT 1;

  IF v_tipo_1 IS NULL OR v_tipo_2 IS NULL THEN RETURN; END IF;

  IF v_tipo_1 = 'atencao' AND v_tipo_2 = 'atencao' THEN v_estado_atual := 'precisa_atencao';
  ELSIF v_tipo_1 = 'positivo' AND v_tipo_2 = 'positivo' THEN v_estado_atual := 'celebrar';
  ELSE v_estado_atual := 'neutro';
  END IF;

  IF v_estado_atual = 'precisa_atencao' THEN
    UPDATE alertas_alunos SET status = 'arquivado', updated_at = NOW()
    WHERE aluno_id = p_aluno_id AND tipo_alerta = 'celebrar' AND status = 'ativo';
  ELSIF v_estado_atual = 'celebrar' THEN
    UPDATE alertas_alunos SET status = 'arquivado', updated_at = NOW()
    WHERE aluno_id = p_aluno_id AND tipo_alerta = 'precisa_atencao' AND status = 'ativo';
  ELSE
    UPDATE alertas_alunos SET status = 'arquivado', updated_at = NOW()
    WHERE aluno_id = p_aluno_id AND tipo_alerta IN ('precisa_atencao', 'celebrar') AND status = 'ativo';
  END IF;

  IF v_estado_atual = 'precisa_atencao' THEN
    IF NOT EXISTS (
      SELECT 1 FROM alertas_alunos
      WHERE aluno_id = p_aluno_id AND tipo_alerta = 'precisa_atencao' AND status = 'ativo'
    ) THEN
      INSERT INTO alertas_alunos (
        institution_id, aluno_id, tipo_alerta, motivo, status,
        notificacao_ativa, fase_id, dados_contexto
      ) VALUES (
        v_institution_id, p_aluno_id, 'precisa_atencao', 'ultimas_2_atencao', 'ativo',
        true, v_fase_atual_id,
        jsonb_build_object('sinal_1', v_sinal_1, 'sinal_2', v_sinal_2, 'quantidade', 2)
      );
    ELSE
      UPDATE alertas_alunos
      SET dados_contexto = jsonb_build_object('sinal_1', v_sinal_1, 'sinal_2', v_sinal_2, 'quantidade', 2),
          updated_at = NOW()
      WHERE aluno_id = p_aluno_id AND tipo_alerta = 'precisa_atencao' AND status = 'ativo';
    END IF;
  ELSIF v_estado_atual = 'celebrar' THEN
    SELECT COUNT(*) INTO v_total_positivas
    FROM observacoes o JOIN sinais s ON s.id = o.sinal_id
    WHERE o.aluno_id = p_aluno_id AND o.fase_id = v_fase_atual_id AND s.valencia = 'positivo';

    IF v_fase_inteligencia_id IS DISTINCT FROM v_casa_aluno_id AND v_total_positivas >= v_config_descoberta THEN
      v_tipo_celebracao := 'descoberta';
    ELSIF v_fase_inteligencia_id = v_casa_aluno_id AND v_total_positivas >= v_config_confirmacao THEN
      v_tipo_celebracao := 'confirmacao';
    ELSE v_tipo_celebracao := NULL;
    END IF;

    IF v_tipo_celebracao IS NOT NULL THEN
      IF NOT EXISTS (
        SELECT 1 FROM alertas_alunos
        WHERE aluno_id = p_aluno_id AND tipo_alerta = 'celebrar' AND status = 'ativo'
      ) THEN
        INSERT INTO alertas_alunos (
          institution_id, aluno_id, tipo_alerta, motivo, status,
          notificacao_ativa, fase_id, dados_contexto
        ) VALUES (
          v_institution_id, p_aluno_id, 'celebrar', v_tipo_celebracao, 'ativo',
          true, v_fase_atual_id,
          jsonb_build_object(
            'tipo_celebracao', v_tipo_celebracao, 'quantidade_positivos', v_total_positivas,
            'casa_aluno_id', v_casa_aluno_id, 'fase_inteligencia_id', v_fase_inteligencia_id
          )
        );
      END IF;
    END IF;
  END IF;
END;
$$;

-- 4.24 trigger_analisar_observacao
CREATE OR REPLACE FUNCTION public.trigger_analisar_observacao()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  PERFORM analisar_e_gerar_alertas(NEW.aluno_id);
  RETURN NEW;
END;
$$;

-- 4.25 resolver_nao_esqueca
CREATE OR REPLACE FUNCTION public.resolver_nao_esqueca()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  UPDATE alertas_alunos SET status = 'resolvido', resolved_at = NOW()
  WHERE aluno_id = NEW.aluno_id AND tipo_alerta = 'nao_esquecer' AND status = 'ativo';
  RETURN NEW;
END;
$$;

-- 4.26 trigger_notificar_n8n_observacao (versao final com logging)
CREATE OR REPLACE FUNCTION public.trigger_notificar_n8n_observacao()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_aluno RECORD; v_casa RECORD; v_professor RECORD; v_sinal RECORD;
  v_im_expressa RECORD; v_im_fase RECORD; v_fase RECORD; v_turma RECORD;
  v_aluno_json JSONB; v_sinal_json JSONB; v_payload JSONB;
  v_request_id BIGINT;
  v_endpoint_url TEXT := 'https://webhook.escolaamadeus.com/webhook/projetoarboria';
BEGIN
  SELECT id, full_name, nome, serie, turma, casa_id, matricula_externa, segmento
  INTO v_aluno FROM profiles WHERE id = NEW.aluno_id;
  IF NOT FOUND THEN
    v_aluno_json := jsonb_build_object('id', NEW.aluno_id, '_status', 'not_found');
  ELSE
    SELECT nome, emoji INTO v_casa FROM inteligencias WHERE id = v_aluno.casa_id;
    v_aluno_json := jsonb_build_object(
      'id', v_aluno.id, 'matricula_externa', v_aluno.matricula_externa,
      'nome', COALESCE(v_aluno.full_name, v_aluno.nome),
      'serie', v_aluno.serie, 'turma', v_aluno.turma,
      'segmento', v_aluno.segmento, 'casa_id', v_aluno.casa_id, 'casa_nome', v_casa.nome
    );
  END IF;
  SELECT id, full_name, nome INTO v_professor FROM profiles WHERE id = NEW.professor_id;
  SELECT id, codigo, emoji, label_pt, valencia, pilar, peso_inteligencia INTO v_sinal FROM sinais WHERE id = NEW.sinal_id;
  IF NOT FOUND THEN v_sinal_json := jsonb_build_object('id', NEW.sinal_id, '_status', 'not_found');
  ELSE v_sinal_json := jsonb_build_object('id', v_sinal.id, 'codigo', v_sinal.codigo, 'emoji', v_sinal.emoji, 'label', v_sinal.label_pt, 'valencia', v_sinal.valencia, 'pilar', v_sinal.pilar, 'peso', v_sinal.peso_inteligencia);
  END IF;
  SELECT id, nome, emoji INTO v_im_expressa FROM inteligencias WHERE id = NEW.inteligencia_expressa;
  SELECT id, nome, emoji INTO v_im_fase FROM inteligencias WHERE id = NEW.inteligencia_fase;
  SELECT id, numero_fase INTO v_fase FROM fases WHERE id = NEW.fase_id;
  SELECT id, nome INTO v_turma FROM turmas WHERE id = NEW.turma_id;

  v_payload := jsonb_build_object(
    'evento', 'observacao_criada', 'observacao_id', NEW.id, 'timestamp', NEW.created_at,
    'aluno', v_aluno_json,
    'professor', jsonb_build_object('id', v_professor.id, 'nome', COALESCE(v_professor.full_name, v_professor.nome)),
    'sinal', v_sinal_json,
    'inteligencias', jsonb_build_object('expressa_id', v_im_expressa.id, 'expressa_nome', v_im_expressa.nome, 'expressa_emoji', v_im_expressa.emoji, 'fase_id', v_im_fase.id, 'fase_nome', v_im_fase.nome, 'fase_emoji', v_im_fase.emoji, 'foi_cross_im', NEW.foi_cross_im),
    'observacao', jsonb_build_object('texto', NEW.observacao_texto, 'data', NEW.data_observacao, 'intensidade', NEW.intensidade),
    'contexto', jsonb_build_object('institution_id', NEW.institution_id, 'fase_id', NEW.fase_id, 'fase_numero', v_fase.numero_fase, 'turma_id', NEW.turma_id, 'turma_completa', v_turma.nome)
  );

  SELECT net.http_post(url := v_endpoint_url, body := v_payload, headers := jsonb_build_object('Content-Type', 'application/json'))
  INTO v_request_id;
  INSERT INTO public.webhook_n8n_logs (observacao_id, endpoint_url, request_id, payload) VALUES (NEW.id, v_endpoint_url, v_request_id, v_payload);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  BEGIN
    INSERT INTO public.webhook_n8n_logs (observacao_id, endpoint_url, payload, error_msg)
    VALUES (NEW.id, v_endpoint_url, COALESCE(v_payload, '{}'::JSONB), SQLERRM);
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  RAISE WARNING 'Webhook N8N falhou: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- 4.27 limpar_webhook_logs_antigos
CREATE OR REPLACE FUNCTION public.limpar_webhook_logs_antigos()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_deleted INTEGER;
BEGIN
  DELETE FROM public.webhook_n8n_logs WHERE created_at < NOW() - INTERVAL '14 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- 4.28 get_estados_alunos_minha_casa
CREATE OR REPLACE FUNCTION public.get_estados_alunos_minha_casa(
  p_serie SMALLINT DEFAULT NULL,
  p_turma_letra TEXT DEFAULT NULL,
  p_estado TEXT DEFAULT NULL
)
RETURNS TABLE (
  aluno_id UUID, nome TEXT, sobrenome TEXT, full_name TEXT,
  serie TEXT, turma TEXT, casa_id SMALLINT, casa_nome TEXT, casa_cor TEXT,
  avatar_url TEXT, estado_calculado TEXT,
  ultima_sinal TEXT, penultima_sinal TEXT, data_ultima_obs TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_minha_casa_id SMALLINT;
  v_minha_institution_id UUID;
BEGIN
  SELECT pc.casa_id, pc.institution_id INTO v_minha_casa_id, v_minha_institution_id
  FROM professor_casa pc WHERE pc.professor_id = auth.uid() AND pc.ativo = true LIMIT 1;
  IF v_minha_casa_id IS NULL THEN RETURN; END IF;

  RETURN QUERY
  SELECT v.aluno_id, v.nome, v.sobrenome, v.full_name, v.serie, v.turma,
    v.casa_id, v.casa_nome, v.casa_cor, v.avatar_url, v.estado_calculado,
    v.ultima_sinal, v.penultima_sinal, v.data_ultima_obs
  FROM vw_estados_alunos v
  WHERE v.institution_id = v_minha_institution_id
    AND v.casa_id = v_minha_casa_id
    AND (p_serie IS NULL OR CAST(REGEXP_REPLACE(v.serie, '[^0-9]', '', 'g') AS SMALLINT) = p_serie)
    AND (p_turma_letra IS NULL OR UPPER(TRIM(v.turma)) = UPPER(TRIM(p_turma_letra)))
    AND (p_estado IS NULL OR v.estado_calculado = p_estado)
  ORDER BY
    CASE v.estado_calculado
      WHEN 'precisa_atencao' THEN 1 WHEN 'atencao_recente' THEN 2
      WHEN 'melhorando' THEN 3 WHEN 'celebrar' THEN 4
      WHEN 'primeira_obs' THEN 5 WHEN 'sem_observacao' THEN 6 ELSE 7
    END, v.nome;
END;
$$;

-- 4.29 get_contagem_estados_minha_casa
CREATE OR REPLACE FUNCTION public.get_contagem_estados_minha_casa()
RETURNS TABLE (estado TEXT, quantidade BIGINT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_minha_casa_id SMALLINT;
  v_minha_institution_id UUID;
BEGIN
  SELECT pc.casa_id, pc.institution_id INTO v_minha_casa_id, v_minha_institution_id
  FROM professor_casa pc WHERE pc.professor_id = auth.uid() AND pc.ativo = true LIMIT 1;
  IF v_minha_casa_id IS NULL THEN RETURN; END IF;

  RETURN QUERY
  SELECT v.estado_calculado as estado, COUNT(*) as quantidade
  FROM vw_estados_alunos v
  WHERE v.institution_id = v_minha_institution_id AND v.casa_id = v_minha_casa_id
  GROUP BY v.estado_calculado;
END;
$$;

-- 4.30 get_hipoteses_para_alerta
CREATE OR REPLACE FUNCTION public.get_hipoteses_para_alerta(
  p_sinal_codigo TEXT, p_padrao_codigo TEXT DEFAULT NULL
)
RETURNS TABLE (ordem INTEGER, titulo TEXT, descricao TEXT)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_padrao_codigo IS NOT NULL THEN
    RETURN QUERY SELECT hp.ordem, hp.titulo, hp.descricao FROM hipoteses_por_padrao hp WHERE hp.padrao_codigo = p_padrao_codigo ORDER BY hp.ordem;
  ELSE
    RETURN QUERY SELECT hs.ordem, hs.titulo, hs.descricao FROM hipoteses_por_sinal hs WHERE hs.sinal_codigo = p_sinal_codigo ORDER BY hs.ordem;
  END IF;
END;
$$;

-- 4.31 get_arquetipo
CREATE OR REPLACE FUNCTION public.get_arquetipo(p_casa_codigo TEXT, p_fase_codigo TEXT)
RETURNS TABLE (nome_arquetipo TEXT, tipo TEXT, significado TEXT, potencializar TEXT[])
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT a.nome_arquetipo, a.tipo, a.significado, a.potencializar
  FROM arquetipos a WHERE a.casa_codigo = p_casa_codigo AND a.fase_codigo = p_fase_codigo;
END;
$$;

-- 4.32 migrar_alertas_fase_anterior
CREATE OR REPLACE FUNCTION public.migrar_alertas_fase_anterior(p_fase_anterior_id UUID, p_fase_nova_id UUID)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_count INTEGER;
BEGIN
  UPDATE alertas_alunos
  SET fase_origem_id = fase_id, fase_id = p_fase_nova_id,
      dados_contexto = dados_contexto || jsonb_build_object('migrado_de_fase', p_fase_anterior_id)
  WHERE fase_id = p_fase_anterior_id
    AND tipo_alerta = 'precisa_atencao'
    AND status IN ('ativo', 'em_acompanhamento');
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;


-- ============================================================================
-- 5. TRIGGERS
-- ============================================================================

-- Trigger: new user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger: profiles updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: sync casa text to casa_id
DROP TRIGGER IF EXISTS on_profile_sync_casa ON public.profiles;
CREATE TRIGGER on_profile_sync_casa
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_casa_to_casa_id();

-- Trigger: protect casa_id change
DROP TRIGGER IF EXISTS protect_casa_id_change ON public.profiles;
CREATE TRIGGER protect_casa_id_change
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_casa_id_change();

-- Trigger: sync profile to aluno_turma
DROP TRIGGER IF EXISTS on_profile_sync_turma ON public.profiles;
CREATE TRIGGER on_profile_sync_turma
  AFTER INSERT OR UPDATE OF serie, turma, institution_id ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_to_aluno_turma();

-- Trigger: sync user role to aluno_turma
DROP TRIGGER IF EXISTS on_user_role_sync_turma ON public.user_roles;
CREATE TRIGGER on_user_role_sync_turma
  AFTER INSERT ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.sync_user_role_to_aluno_turma();

-- Trigger: institution settings
DROP TRIGGER IF EXISTS on_institution_created ON public.institutions;
CREATE TRIGGER on_institution_created
  AFTER INSERT ON public.institutions
  FOR EACH ROW EXECUTE FUNCTION public.create_default_institution_settings();

-- Trigger: inicializar scores
DROP TRIGGER IF EXISTS on_aluno_inicializar_scores ON public.profiles;
CREATE TRIGGER on_aluno_inicializar_scores
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.inicializar_scores_aluno();

-- Trigger: registrar ajuste score
DROP TRIGGER IF EXISTS on_score_ajustado ON public.inteligencia_scores;
CREATE TRIGGER on_score_ajustado
  AFTER UPDATE ON public.inteligencia_scores
  FOR EACH ROW EXECUTE FUNCTION public.registrar_ajuste_score();

-- Trigger: fases updated_at
DROP TRIGGER IF EXISTS update_fases_updated_at ON public.fases;
CREATE TRIGGER update_fases_updated_at
  BEFORE UPDATE ON public.fases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: missoes updated_at
DROP TRIGGER IF EXISTS update_missoes_updated_at ON public.missoes;
CREATE TRIGGER update_missoes_updated_at
  BEFORE UPDATE ON public.missoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: entregas updated_at
DROP TRIGGER IF EXISTS update_entregas_updated_at ON public.entregas;
CREATE TRIGGER update_entregas_updated_at
  BEFORE UPDATE ON public.entregas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: entrega aprovada
DROP TRIGGER IF EXISTS on_entrega_aprovada ON public.entregas;
CREATE TRIGGER on_entrega_aprovada
  BEFORE UPDATE ON public.entregas
  FOR EACH ROW EXECUTE FUNCTION public.processar_entrega_aprovada();

-- Trigger: observacao -> evidencia
DROP TRIGGER IF EXISTS on_observacao_criada ON public.observacoes;
CREATE TRIGGER on_observacao_criada
  AFTER INSERT ON public.observacoes
  FOR EACH ROW EXECUTE FUNCTION public.processar_observacao();

-- Trigger: observacao -> alertas
DROP TRIGGER IF EXISTS trg_analisar_observacao ON public.observacoes;
CREATE TRIGGER trg_analisar_observacao
  AFTER INSERT ON public.observacoes
  FOR EACH ROW EXECUTE FUNCTION public.trigger_analisar_observacao();

-- Trigger: observacao -> resolver nao_esqueca
DROP TRIGGER IF EXISTS trg_resolver_nao_esqueca ON public.observacoes;
CREATE TRIGGER trg_resolver_nao_esqueca
  AFTER INSERT ON public.observacoes
  FOR EACH ROW EXECUTE FUNCTION public.resolver_nao_esqueca();

-- Trigger: observacao -> n8n webhook
DROP TRIGGER IF EXISTS trg_notificar_n8n_observacao ON public.observacoes;
CREATE TRIGGER trg_notificar_n8n_observacao
  AFTER INSERT ON public.observacoes
  FOR EACH ROW EXECUTE FUNCTION public.trigger_notificar_n8n_observacao();

-- Trigger: alertas updated_at
DROP TRIGGER IF EXISTS update_alertas_alunos_updated_at ON public.alertas_alunos;
CREATE TRIGGER update_alertas_alunos_updated_at
  BEFORE UPDATE ON public.alertas_alunos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: conteudo_inteligencia updated_at
DROP TRIGGER IF EXISTS update_conteudo_inteligencia_updated_at ON public.conteudo_inteligencia;
CREATE TRIGGER update_conteudo_inteligencia_updated_at
  BEFORE UPDATE ON public.conteudo_inteligencia
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: mapa_desenvolvimento
DROP TRIGGER IF EXISTS update_mapa_desenvolvimento_updated_at ON public.mapa_desenvolvimento;
CREATE TRIGGER update_mapa_desenvolvimento_updated_at
  BEFORE UPDATE ON public.mapa_desenvolvimento
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS validate_mapa_desenvolvimento_trigger ON public.mapa_desenvolvimento;
CREATE TRIGGER validate_mapa_desenvolvimento_trigger
  BEFORE INSERT OR UPDATE ON public.mapa_desenvolvimento
  FOR EACH ROW EXECUTE FUNCTION public.validate_mapa_desenvolvimento();


-- ============================================================================
-- 6. VIEWS
-- ============================================================================

-- 6.1 ranking_casas
DROP VIEW IF EXISTS ranking_casas;
CREATE VIEW ranking_casas
WITH (security_invoker = on) AS
SELECT
  i.id as casa_id, i.nome as casa_nome, i.emoji as casa_emoji, i.cor_hex as casa_cor,
  pg.institution_id, pg.ano_letivo,
  COALESCE(SUM(pg.pontos), 0) as total_pontos,
  COUNT(DISTINCT pg.aluno_id) as total_alunos_ativos,
  RANK() OVER (
    PARTITION BY pg.institution_id, pg.ano_letivo
    ORDER BY COALESCE(SUM(pg.pontos), 0) DESC
  ) as posicao
FROM inteligencias i
LEFT JOIN pontos_gerais pg ON pg.casa_id = i.id
GROUP BY i.id, i.nome, i.emoji, i.cor_hex, pg.institution_id, pg.ano_letivo
ORDER BY posicao;

-- 6.2 ranking_alunos_por_casa
DROP VIEW IF EXISTS ranking_alunos_por_casa;
CREATE VIEW ranking_alunos_por_casa
WITH (security_invoker = on) AS
SELECT
  p.id as aluno_id, p.full_name as aluno_nome, p.casa_id,
  i.nome as casa_nome, i.emoji as casa_emoji,
  p.institution_id, pg.ano_letivo,
  COALESCE(SUM(pg.pontos), 0) as total_pontos,
  COUNT(DISTINCT pg.missao_id) as missoes_completadas,
  RANK() OVER (
    PARTITION BY p.casa_id, p.institution_id, pg.ano_letivo
    ORDER BY COALESCE(SUM(pg.pontos), 0) DESC
  ) as posicao_na_casa
FROM profiles p
JOIN inteligencias i ON i.id = p.casa_id
LEFT JOIN pontos_gerais pg ON pg.aluno_id = p.id
WHERE p.casa_id IS NOT NULL
GROUP BY p.id, p.full_name, p.casa_id, i.nome, i.emoji, p.institution_id, pg.ano_letivo
ORDER BY p.casa_id, posicao_na_casa;

-- 6.3 perfil_inteligencias_aluno
DROP VIEW IF EXISTS perfil_inteligencias_aluno;
CREATE VIEW perfil_inteligencias_aluno
WITH (security_invoker = true) AS
SELECT
  s.aluno_id, s.ano_letivo,
  i.id AS inteligencia_id, i.codigo AS inteligencia_codigo,
  i.nome AS inteligencia_nome, i.emoji AS inteligencia_emoji,
  i.cor_hex AS inteligencia_cor, i.brasao_url AS inteligencia_brasao_url,
  s.score_atual, s.total_evidencias,
  p.casa_id = i.id AS eh_casa_do_aluno
FROM inteligencia_scores s
JOIN inteligencias i ON i.id = s.inteligencia_id
JOIN profiles p ON p.id = s.aluno_id
ORDER BY s.aluno_id, i.ordem;

-- 6.4 vw_estados_alunos
DROP VIEW IF EXISTS vw_estados_alunos;
CREATE VIEW vw_estados_alunos
WITH (security_invoker = on) AS
WITH ultimas_obs AS (
  SELECT
    o.aluno_id, s.valencia as tipo_sinal, s.label_pt as sinal,
    s.codigo as sinal_codigo, o.created_at,
    ROW_NUMBER() OVER (PARTITION BY o.aluno_id ORDER BY o.created_at DESC) as rn
  FROM observacoes o JOIN sinais s ON s.id = o.sinal_id
)
SELECT
  p.id as aluno_id, p.nome, p.sobrenome, p.full_name,
  p.serie, p.turma, p.casa_id, i.nome as casa_nome, i.cor_hex as casa_cor,
  p.institution_id, p.avatar_url,
  u1.tipo_sinal as ultima_tipo, u1.sinal as ultima_sinal, u1.sinal_codigo as ultimo_sinal_codigo,
  u2.tipo_sinal as penultima_tipo, u2.sinal as penultima_sinal, u2.sinal_codigo as penultimo_sinal_codigo,
  CASE
    WHEN u1.tipo_sinal IS NULL THEN 'sem_observacao'
    WHEN u2.tipo_sinal IS NULL THEN 'primeira_obs'
    WHEN u1.tipo_sinal = 'atencao' AND u2.tipo_sinal = 'atencao' THEN 'precisa_atencao'
    WHEN u1.tipo_sinal = 'positivo' AND u2.tipo_sinal = 'positivo' THEN 'celebrar'
    WHEN u1.tipo_sinal = 'atencao' AND u2.tipo_sinal = 'positivo' THEN 'atencao_recente'
    WHEN u1.tipo_sinal = 'positivo' AND u2.tipo_sinal = 'atencao' THEN 'melhorando'
    ELSE 'neutro'
  END as estado_calculado,
  u1.created_at as data_ultima_obs
FROM profiles p
JOIN user_roles ur ON ur.user_id = p.id AND ur.role = 'user'
LEFT JOIN inteligencias i ON i.id = p.casa_id
LEFT JOIN ultimas_obs u1 ON p.id = u1.aluno_id AND u1.rn = 1
LEFT JOIN ultimas_obs u2 ON p.id = u2.aluno_id AND u2.rn = 2;


-- ============================================================================
-- 7. RLS POLICIES
-- ============================================================================

-- ---- PROFILES ----
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Usuarios veem perfis da mesma instituicao" ON public.profiles;
CREATE POLICY "Usuarios veem perfis da mesma instituicao" ON public.profiles FOR SELECT TO authenticated USING (institution_id = get_user_institution_id());

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
CREATE POLICY "Admins can insert profiles" ON public.profiles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Professores veem alunos da sua casa" ON public.profiles;
CREATE POLICY "Professores veem alunos da sua casa" ON public.profiles FOR SELECT USING (
  institution_id = public.get_user_institution_id()
  AND public.has_role(auth.uid(), 'professor')
  AND casa_id IN (SELECT pc.casa_id FROM public.professor_casa pc WHERE pc.professor_id = auth.uid() AND pc.ativo = true)
);

-- ---- USER_ROLES ----
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ---- INSTITUTIONS ----
DROP POLICY IF EXISTS "Anyone authenticated can view institutions" ON public.institutions;
CREATE POLICY "Anyone authenticated can view institutions" ON public.institutions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can manage institutions" ON public.institutions;
CREATE POLICY "Admins can manage institutions" ON public.institutions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ---- INTELIGENCIAS ----
DROP POLICY IF EXISTS "Inteligencias sao publicas" ON public.inteligencias;
CREATE POLICY "Inteligencias sao publicas" ON public.inteligencias FOR SELECT USING (true);

-- ---- INSTITUTION_SETTINGS ----
DROP POLICY IF EXISTS "Usuarios veem settings da sua instituicao" ON public.institution_settings;
CREATE POLICY "Usuarios veem settings da sua instituicao" ON public.institution_settings FOR SELECT USING (institution_id = public.get_user_institution_id());

DROP POLICY IF EXISTS "Admins podem modificar settings" ON public.institution_settings;
CREATE POLICY "Admins podem modificar settings" ON public.institution_settings FOR ALL USING (institution_id = public.get_user_institution_id() AND public.has_role(auth.uid(), 'admin'));

-- ---- SINAIS ----
DROP POLICY IF EXISTS "Sinais sao publicos" ON public.sinais;
CREATE POLICY "Sinais sao publicos" ON public.sinais FOR SELECT USING (true);

-- ---- TURMAS ----
DROP POLICY IF EXISTS "Usuarios veem turmas da instituicao" ON public.turmas;
CREATE POLICY "Usuarios veem turmas da instituicao" ON public.turmas FOR SELECT USING (institution_id = public.get_user_institution_id());

DROP POLICY IF EXISTS "Admins podem gerenciar turmas" ON public.turmas;
CREATE POLICY "Admins podem gerenciar turmas" ON public.turmas FOR ALL USING (institution_id = public.get_user_institution_id() AND public.has_role(auth.uid(), 'admin'));

-- ---- ALUNO_TURMA ----
DROP POLICY IF EXISTS "Admins veem todos aluno_turma" ON public.aluno_turma;
CREATE POLICY "Admins veem todos aluno_turma" ON public.aluno_turma FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.turmas t WHERE t.id = aluno_turma.turma_id AND t.institution_id = public.get_user_institution_id())
  AND public.has_role(auth.uid(), 'admin')
);

DROP POLICY IF EXISTS "Professores veem aluno_turma da sua casa" ON public.aluno_turma;
CREATE POLICY "Professores veem aluno_turma da sua casa" ON public.aluno_turma FOR SELECT USING (
  public.has_role(auth.uid(), 'professor')
  AND EXISTS (
    SELECT 1 FROM public.profiles aluno
    JOIN public.professor_casa pc ON pc.professor_id = auth.uid() AND pc.casa_id = aluno.casa_id AND pc.ativo = true
    WHERE aluno.id = aluno_turma.aluno_id
  )
);

DROP POLICY IF EXISTS "Alunos veem proprio aluno_turma" ON public.aluno_turma;
CREATE POLICY "Alunos veem proprio aluno_turma" ON public.aluno_turma FOR SELECT USING (aluno_id = auth.uid());

DROP POLICY IF EXISTS "Admins podem gerenciar aluno_turma" ON public.aluno_turma;
CREATE POLICY "Admins podem gerenciar aluno_turma" ON public.aluno_turma FOR ALL USING (
  EXISTS (SELECT 1 FROM public.turmas t WHERE t.id = aluno_turma.turma_id AND t.institution_id = public.get_user_institution_id())
  AND public.has_role(auth.uid(), 'admin')
);

DROP POLICY IF EXISTS "Professores veem aluno_turma das suas turmas vinculadas" ON public.aluno_turma;
CREATE POLICY "Professores veem aluno_turma das suas turmas vinculadas" ON public.aluno_turma FOR SELECT USING (
  has_role(auth.uid(), 'professor'::app_role) AND turma_id = ANY(public.get_professor_turma_ids())
);

DROP POLICY IF EXISTS "Mentores veem aluno_turma da instituicao" ON public.aluno_turma;
CREATE POLICY "Mentores veem aluno_turma da instituicao" ON public.aluno_turma FOR SELECT TO authenticated USING (
  has_role(auth.uid(), 'professor'::app_role)
  AND EXISTS (SELECT 1 FROM turmas t WHERE t.id = aluno_turma.turma_id AND t.institution_id = get_user_institution_id())
  AND EXISTS (SELECT 1 FROM professor_casa pc WHERE pc.professor_id = auth.uid() AND pc.ativo = true)
);

-- ---- PROFESSOR_CASA ----
DROP POLICY IF EXISTS "Usuarios veem professor_casa da instituicao" ON public.professor_casa;
CREATE POLICY "Usuarios veem professor_casa da instituicao" ON public.professor_casa FOR SELECT USING (institution_id = public.get_user_institution_id());

DROP POLICY IF EXISTS "Admins podem gerenciar professor_casa" ON public.professor_casa;
CREATE POLICY "Admins podem gerenciar professor_casa" ON public.professor_casa FOR ALL USING (institution_id = public.get_user_institution_id() AND public.has_role(auth.uid(), 'admin'));

-- ---- FASES ----
DROP POLICY IF EXISTS "Usuarios veem fases da instituicao" ON public.fases;
CREATE POLICY "Usuarios veem fases da instituicao" ON public.fases FOR SELECT USING (institution_id = public.get_user_institution_id());

DROP POLICY IF EXISTS "Admins gerenciam fases" ON public.fases;
CREATE POLICY "Admins gerenciam fases" ON public.fases FOR ALL USING (institution_id = public.get_user_institution_id() AND public.has_role(auth.uid(), 'admin'));

-- ---- MISSOES ----
DROP POLICY IF EXISTS "Usuarios veem missoes da instituicao" ON public.missoes;
CREATE POLICY "Usuarios veem missoes da instituicao" ON public.missoes FOR SELECT USING (institution_id = get_user_institution_id());

DROP POLICY IF EXISTS "Admin ou Professor podem criar missoes" ON public.missoes;
CREATE POLICY "Admin ou Professor podem criar missoes" ON public.missoes FOR INSERT WITH CHECK (
  institution_id = get_user_institution_id() AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'professor'))
);

DROP POLICY IF EXISTS "Criador ou Admin podem atualizar missoes" ON public.missoes;
CREATE POLICY "Criador ou Admin podem atualizar missoes" ON public.missoes FOR UPDATE USING (
  institution_id = get_user_institution_id() AND (criado_por = auth.uid() OR has_role(auth.uid(), 'admin'))
);

DROP POLICY IF EXISTS "Criador ou Admin podem deletar missoes" ON public.missoes;
CREATE POLICY "Criador ou Admin podem deletar missoes" ON public.missoes FOR DELETE USING (
  institution_id = get_user_institution_id() AND (criado_por = auth.uid() OR has_role(auth.uid(), 'admin'))
);

-- ---- MISSAO_DESTINATARIOS ----
DROP POLICY IF EXISTS "Usuarios veem destinatarios da instituicao" ON public.missao_destinatarios;
CREATE POLICY "Usuarios veem destinatarios da instituicao" ON public.missao_destinatarios FOR SELECT USING (
  EXISTS (SELECT 1 FROM missoes m WHERE m.id = missao_id AND m.institution_id = get_user_institution_id())
);

DROP POLICY IF EXISTS "Admin ou Professor podem gerenciar destinatarios" ON public.missao_destinatarios;
CREATE POLICY "Admin ou Professor podem gerenciar destinatarios" ON public.missao_destinatarios FOR ALL USING (
  EXISTS (SELECT 1 FROM missoes m WHERE m.id = missao_id AND m.institution_id = get_user_institution_id())
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'professor'))
);

-- ---- ENTREGAS ----
DROP POLICY IF EXISTS "Aluno ve propria entrega" ON public.entregas;
CREATE POLICY "Aluno ve propria entrega" ON public.entregas FOR SELECT USING (aluno_id = auth.uid());

DROP POLICY IF EXISTS "Professor ve entregas da sua casa" ON public.entregas;
CREATE POLICY "Professor ve entregas da sua casa" ON public.entregas FOR SELECT USING (
  has_role(auth.uid(), 'professor') AND EXISTS (
    SELECT 1 FROM profiles p JOIN professor_casa pc ON pc.professor_id = auth.uid() AND pc.casa_id = p.casa_id AND pc.ativo = true
    WHERE p.id = aluno_id
  )
);

DROP POLICY IF EXISTS "Admin ve todas entregas da instituicao" ON public.entregas;
CREATE POLICY "Admin ve todas entregas da instituicao" ON public.entregas FOR SELECT USING (
  has_role(auth.uid(), 'admin') AND EXISTS (SELECT 1 FROM missoes m WHERE m.id = missao_id AND m.institution_id = get_user_institution_id())
);

DROP POLICY IF EXISTS "Aluno pode criar propria entrega" ON public.entregas;
CREATE POLICY "Aluno pode criar propria entrega" ON public.entregas FOR INSERT WITH CHECK (aluno_id = auth.uid());

DROP POLICY IF EXISTS "Aluno pode atualizar propria entrega pendente" ON public.entregas;
CREATE POLICY "Aluno pode atualizar propria entrega pendente" ON public.entregas FOR UPDATE USING (aluno_id = auth.uid() AND status IN ('pendente', 'refazer'));

DROP POLICY IF EXISTS "Professor pode avaliar entregas da sua casa" ON public.entregas;
CREATE POLICY "Professor pode avaliar entregas da sua casa" ON public.entregas FOR UPDATE USING (
  has_role(auth.uid(), 'professor') AND EXISTS (
    SELECT 1 FROM profiles p JOIN professor_casa pc ON pc.professor_id = auth.uid() AND pc.casa_id = p.casa_id AND pc.ativo = true
    WHERE p.id = aluno_id
  )
);

DROP POLICY IF EXISTS "Admin pode atualizar entregas da instituicao" ON public.entregas;
CREATE POLICY "Admin pode atualizar entregas da instituicao" ON public.entregas FOR UPDATE USING (
  has_role(auth.uid(), 'admin') AND EXISTS (SELECT 1 FROM missoes m WHERE m.id = missao_id AND m.institution_id = get_user_institution_id())
);

DROP POLICY IF EXISTS "Mentores veem entregas da instituicao" ON public.entregas;
CREATE POLICY "Mentores veem entregas da instituicao" ON public.entregas FOR SELECT TO authenticated USING (
  has_role(auth.uid(), 'professor'::app_role)
  AND EXISTS (SELECT 1 FROM missoes m WHERE m.id = entregas.missao_id AND m.institution_id = get_user_institution_id())
  AND EXISTS (SELECT 1 FROM professor_casa pc WHERE pc.professor_id = auth.uid() AND pc.ativo = true)
);

DROP POLICY IF EXISTS "Mentores podem avaliar entregas da instituicao" ON public.entregas;
CREATE POLICY "Mentores podem avaliar entregas da instituicao" ON public.entregas FOR UPDATE TO authenticated USING (
  has_role(auth.uid(), 'professor'::app_role)
  AND EXISTS (SELECT 1 FROM missoes m WHERE m.id = entregas.missao_id AND m.institution_id = get_user_institution_id())
  AND EXISTS (SELECT 1 FROM professor_casa pc WHERE pc.professor_id = auth.uid() AND pc.ativo = true)
);

-- ---- ENTREGA_ARQUIVOS ----
DROP POLICY IF EXISTS "Usuario ve arquivos da propria entrega" ON public.entrega_arquivos;
CREATE POLICY "Usuario ve arquivos da propria entrega" ON public.entrega_arquivos FOR SELECT USING (
  EXISTS (SELECT 1 FROM entregas e WHERE e.id = entrega_id AND e.aluno_id = auth.uid())
);

DROP POLICY IF EXISTS "Professor ve arquivos de entregas da sua casa" ON public.entrega_arquivos;
CREATE POLICY "Professor ve arquivos de entregas da sua casa" ON public.entrega_arquivos FOR SELECT USING (
  has_role(auth.uid(), 'professor') AND EXISTS (
    SELECT 1 FROM entregas e JOIN profiles p ON p.id = e.aluno_id
    JOIN professor_casa pc ON pc.professor_id = auth.uid() AND pc.casa_id = p.casa_id AND pc.ativo = true
    WHERE e.id = entrega_id
  )
);

DROP POLICY IF EXISTS "Admin ve todos arquivos da instituicao" ON public.entrega_arquivos;
CREATE POLICY "Admin ve todos arquivos da instituicao" ON public.entrega_arquivos FOR SELECT USING (
  has_role(auth.uid(), 'admin') AND EXISTS (
    SELECT 1 FROM entregas e JOIN missoes m ON m.id = e.missao_id WHERE e.id = entrega_id AND m.institution_id = get_user_institution_id()
  )
);

DROP POLICY IF EXISTS "Aluno pode inserir arquivos na propria entrega" ON public.entrega_arquivos;
CREATE POLICY "Aluno pode inserir arquivos na propria entrega" ON public.entrega_arquivos FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM entregas e WHERE e.id = entrega_id AND e.aluno_id = auth.uid())
);

DROP POLICY IF EXISTS "Aluno pode deletar proprios arquivos" ON public.entrega_arquivos;
CREATE POLICY "Aluno pode deletar proprios arquivos" ON public.entrega_arquivos FOR DELETE USING (
  EXISTS (SELECT 1 FROM entregas e WHERE e.id = entrega_id AND e.aluno_id = auth.uid())
);

DROP POLICY IF EXISTS "Admin pode deletar arquivos da instituicao" ON public.entrega_arquivos;
CREATE POLICY "Admin pode deletar arquivos da instituicao" ON public.entrega_arquivos FOR DELETE USING (
  has_role(auth.uid(), 'admin') AND EXISTS (
    SELECT 1 FROM entregas e JOIN missoes m ON m.id = e.missao_id WHERE e.id = entrega_id AND m.institution_id = get_user_institution_id()
  )
);

DROP POLICY IF EXISTS "Mentores veem arquivos entregas da instituicao" ON public.entrega_arquivos;
CREATE POLICY "Mentores veem arquivos entregas da instituicao" ON public.entrega_arquivos FOR SELECT TO authenticated USING (
  has_role(auth.uid(), 'professor'::app_role)
  AND EXISTS (
    SELECT 1 FROM entregas e JOIN missoes m ON m.id = e.missao_id
    WHERE e.id = entrega_arquivos.entrega_id AND m.institution_id = get_user_institution_id()
  )
  AND EXISTS (SELECT 1 FROM professor_casa pc WHERE pc.professor_id = auth.uid() AND pc.ativo = true)
);

-- ---- OBSERVACOES ----
DROP POLICY IF EXISTS "Professor ve proprias observacoes" ON public.observacoes;
CREATE POLICY "Professor ve proprias observacoes" ON public.observacoes FOR SELECT USING (professor_id = auth.uid());

DROP POLICY IF EXISTS "Professor ve observacoes da sua casa" ON public.observacoes;
CREATE POLICY "Professor ve observacoes da sua casa" ON public.observacoes FOR SELECT USING (
  has_role(auth.uid(), 'professor'::app_role) AND EXISTS (
    SELECT 1 FROM profiles p JOIN professor_casa pc ON pc.professor_id = auth.uid() AND pc.casa_id = p.casa_id AND pc.ativo = true
    WHERE p.id = observacoes.aluno_id
  )
);

DROP POLICY IF EXISTS "Admin ve observacoes da instituicao" ON public.observacoes;
CREATE POLICY "Admin ve observacoes da instituicao" ON public.observacoes FOR SELECT USING (
  institution_id = get_user_institution_id() AND has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "Professor pode criar observacoes" ON public.observacoes;
CREATE POLICY "Professor pode criar observacoes" ON public.observacoes FOR INSERT WITH CHECK (
  professor_id = auth.uid() AND has_role(auth.uid(), 'professor'::app_role) AND institution_id = get_user_institution_id()
);

DROP POLICY IF EXISTS "Admin pode criar observacoes" ON public.observacoes;
CREATE POLICY "Admin pode criar observacoes" ON public.observacoes FOR INSERT WITH CHECK (
  institution_id = get_user_institution_id() AND has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "Professor atualiza proprias observacoes" ON public.observacoes;
CREATE POLICY "Professor atualiza proprias observacoes" ON public.observacoes FOR UPDATE USING (professor_id = auth.uid());

DROP POLICY IF EXISTS "Admin atualiza observacoes da instituicao" ON public.observacoes;
CREATE POLICY "Admin atualiza observacoes da instituicao" ON public.observacoes FOR UPDATE USING (
  institution_id = get_user_institution_id() AND has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "Professor deleta proprias observacoes em 24h" ON public.observacoes;
CREATE POLICY "Professor deleta proprias observacoes em 24h" ON public.observacoes FOR DELETE USING (
  professor_id = auth.uid() AND created_at > now() - interval '24 hours'
);

DROP POLICY IF EXISTS "Admin deleta observacoes da instituicao" ON public.observacoes;
CREATE POLICY "Admin deleta observacoes da instituicao" ON public.observacoes FOR DELETE USING (
  institution_id = get_user_institution_id() AND has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "Mentores veem observacoes da instituicao" ON public.observacoes;
CREATE POLICY "Mentores veem observacoes da instituicao" ON public.observacoes FOR SELECT TO authenticated USING (
  has_role(auth.uid(), 'professor'::app_role) AND institution_id = get_user_institution_id()
  AND EXISTS (SELECT 1 FROM professor_casa pc WHERE pc.professor_id = auth.uid() AND pc.ativo = true)
);

-- ---- PONTOS_GERAIS ----
DROP POLICY IF EXISTS "Usuarios veem pontos da instituicao" ON public.pontos_gerais;
CREATE POLICY "Usuarios veem pontos da instituicao" ON public.pontos_gerais FOR SELECT USING (institution_id = get_user_institution_id());

DROP POLICY IF EXISTS "Admin pode inserir pontos" ON public.pontos_gerais;
CREATE POLICY "Admin pode inserir pontos" ON public.pontos_gerais FOR INSERT WITH CHECK (institution_id = get_user_institution_id() AND has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admin pode atualizar pontos" ON public.pontos_gerais;
CREATE POLICY "Admin pode atualizar pontos" ON public.pontos_gerais FOR UPDATE USING (institution_id = get_user_institution_id() AND has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admin pode deletar pontos" ON public.pontos_gerais;
CREATE POLICY "Admin pode deletar pontos" ON public.pontos_gerais FOR DELETE USING (institution_id = get_user_institution_id() AND has_role(auth.uid(), 'admin'));

-- ---- INTELIGENCIA_SCORES ----
DROP POLICY IF EXISTS "Aluno ve proprios scores" ON public.inteligencia_scores;
CREATE POLICY "Aluno ve proprios scores" ON public.inteligencia_scores FOR SELECT USING (aluno_id = auth.uid());

DROP POLICY IF EXISTS "Professor ve scores da sua casa" ON public.inteligencia_scores;
CREATE POLICY "Professor ve scores da sua casa" ON public.inteligencia_scores FOR SELECT USING (
  has_role(auth.uid(), 'professor') AND EXISTS (
    SELECT 1 FROM public.profiles p JOIN public.professor_casa pc ON pc.professor_id = auth.uid() AND pc.casa_id = p.casa_id AND pc.ativo = true
    WHERE p.id = inteligencia_scores.aluno_id
  )
);

DROP POLICY IF EXISTS "Admin ve todos scores da instituicao" ON public.inteligencia_scores;
CREATE POLICY "Admin ve todos scores da instituicao" ON public.inteligencia_scores FOR SELECT USING (
  has_role(auth.uid(), 'admin') AND EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = inteligencia_scores.aluno_id AND p.institution_id = get_user_institution_id()
  )
);

DROP POLICY IF EXISTS "Admin pode inserir scores" ON public.inteligencia_scores;
CREATE POLICY "Admin pode inserir scores" ON public.inteligencia_scores FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admin pode atualizar scores" ON public.inteligencia_scores;
CREATE POLICY "Admin pode atualizar scores" ON public.inteligencia_scores FOR UPDATE USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admin pode deletar scores" ON public.inteligencia_scores;
CREATE POLICY "Admin pode deletar scores" ON public.inteligencia_scores FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- ---- INTELIGENCIA_EVIDENCIAS ----
DROP POLICY IF EXISTS "Usuarios veem evidencias da instituicao" ON public.inteligencia_evidencias;
CREATE POLICY "Usuarios veem evidencias da instituicao" ON public.inteligencia_evidencias FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.fases f WHERE f.id = inteligencia_evidencias.fase_id AND f.institution_id = get_user_institution_id())
);

DROP POLICY IF EXISTS "Admin pode inserir evidencias" ON public.inteligencia_evidencias;
CREATE POLICY "Admin pode inserir evidencias" ON public.inteligencia_evidencias FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admin pode deletar evidencias" ON public.inteligencia_evidencias;
CREATE POLICY "Admin pode deletar evidencias" ON public.inteligencia_evidencias FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- ---- INTELIGENCIA_HISTORICO ----
DROP POLICY IF EXISTS "Aluno ve proprio historico" ON public.inteligencia_historico;
CREATE POLICY "Aluno ve proprio historico" ON public.inteligencia_historico FOR SELECT USING (aluno_id = auth.uid());

DROP POLICY IF EXISTS "Professor ve historico da sua casa" ON public.inteligencia_historico;
CREATE POLICY "Professor ve historico da sua casa" ON public.inteligencia_historico FOR SELECT USING (
  has_role(auth.uid(), 'professor') AND EXISTS (
    SELECT 1 FROM public.profiles p JOIN public.professor_casa pc ON pc.professor_id = auth.uid() AND pc.casa_id = p.casa_id AND pc.ativo = true
    WHERE p.id = inteligencia_historico.aluno_id
  )
);

DROP POLICY IF EXISTS "Admin ve todo historico da instituicao" ON public.inteligencia_historico;
CREATE POLICY "Admin ve todo historico da instituicao" ON public.inteligencia_historico FOR SELECT USING (
  has_role(auth.uid(), 'admin') AND EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = inteligencia_historico.aluno_id AND p.institution_id = get_user_institution_id()
  )
);

DROP POLICY IF EXISTS "Admin pode inserir historico" ON public.inteligencia_historico;
CREATE POLICY "Admin pode inserir historico" ON public.inteligencia_historico FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admin pode deletar historico" ON public.inteligencia_historico;
CREATE POLICY "Admin pode deletar historico" ON public.inteligencia_historico FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- ---- SCORE_AJUSTES_LOG ----
-- Note: table may pre-exist without institution_id column. Use admin-only policies without institution filter.
DROP POLICY IF EXISTS "Admin pode ver ajustes da instituicao" ON public.score_ajustes_log;
CREATE POLICY "Admin pode ver ajustes da instituicao" ON public.score_ajustes_log FOR SELECT USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admin pode inserir ajustes" ON public.score_ajustes_log;
CREATE POLICY "Admin pode inserir ajustes" ON public.score_ajustes_log FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

-- ---- CARGOS_CASA ----
DROP POLICY IF EXISTS "Cargos sao publicos para leitura da instituicao" ON public.cargos_casa;
CREATE POLICY "Cargos sao publicos para leitura da instituicao" ON public.cargos_casa FOR SELECT USING (institution_id = get_user_institution_id());

DROP POLICY IF EXISTS "Admin gerencia cargos" ON public.cargos_casa;
CREATE POLICY "Admin gerencia cargos" ON public.cargos_casa FOR ALL USING (institution_id = get_user_institution_id() AND has_role(auth.uid(), 'admin'::app_role));

-- ---- CANAIS_CASA ----
DROP POLICY IF EXISTS "Aluno ve canais da sua casa ou conselho" ON public.canais_casa;
CREATE POLICY "Aluno ve canais da sua casa ou conselho" ON public.canais_casa FOR SELECT USING (
  (institution_id = get_user_institution_id()) AND (
    (casa_id = (SELECT profiles.casa_id FROM profiles WHERE profiles.id = auth.uid()))
    OR ((casa_id IS NULL) AND (tipo = 'conselho_lideres'))
    OR has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'professor')
  )
);

DROP POLICY IF EXISTS "Admin pode gerenciar canais" ON public.canais_casa;
CREATE POLICY "Admin pode gerenciar canais" ON public.canais_casa FOR ALL USING (
  institution_id = get_user_institution_id() AND has_role(auth.uid(), 'admin')
);

-- ---- MENSAGENS_CANAL ----
DROP POLICY IF EXISTS "Ver mensagens do canal" ON public.mensagens_canal;
CREATE POLICY "Ver mensagens do canal" ON public.mensagens_canal FOR SELECT USING (
  (institution_id = get_user_institution_id()) AND (
    (canal_id IN (SELECT c.id FROM canais_casa c WHERE c.casa_id = (SELECT profiles.casa_id FROM profiles WHERE profiles.id = auth.uid()) AND (c.tipo IS DISTINCT FROM 'lideranca_casa')))
    OR (canal_id IN (SELECT c.id FROM canais_casa c WHERE c.tipo = 'conselho_lideres') AND pode_acessar_conselho(auth.uid()))
    OR (canal_id IN (SELECT c.id FROM canais_casa c WHERE c.tipo = 'lideranca_casa') AND pode_acessar_lideranca_casa(auth.uid(), (SELECT c.casa_id::SMALLINT FROM canais_casa c WHERE c.id = mensagens_canal.canal_id)))
    OR has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'professor')
  )
);

DROP POLICY IF EXISTS "Enviar mensagem no canal" ON public.mensagens_canal;
CREATE POLICY "Enviar mensagem no canal" ON public.mensagens_canal FOR INSERT WITH CHECK (
  (autor_id = auth.uid()) AND (institution_id = get_user_institution_id()) AND (
    (canal_id IN (SELECT c.id FROM canais_casa c WHERE c.casa_id = (SELECT profiles.casa_id FROM profiles WHERE profiles.id = auth.uid()) AND (c.tipo IS DISTINCT FROM 'lideranca_casa')))
    OR (canal_id IN (SELECT c.id FROM canais_casa c WHERE c.tipo = 'conselho_lideres') AND pode_acessar_conselho(auth.uid()))
    OR (canal_id IN (SELECT c.id FROM canais_casa c WHERE c.tipo = 'lideranca_casa') AND pode_acessar_lideranca_casa(auth.uid(), (SELECT c.casa_id::SMALLINT FROM canais_casa c WHERE c.id = mensagens_canal.canal_id)))
    OR has_role(auth.uid(), 'admin')
  )
);

DROP POLICY IF EXISTS "Editar propria mensagem" ON public.mensagens_canal;
CREATE POLICY "Editar propria mensagem" ON public.mensagens_canal FOR UPDATE USING (autor_id = auth.uid());

DROP POLICY IF EXISTS "Admin pode deletar mensagens" ON public.mensagens_canal;
CREATE POLICY "Admin pode deletar mensagens" ON public.mensagens_canal FOR DELETE USING (has_role(auth.uid(), 'admin') AND institution_id = get_user_institution_id());

-- ---- CANAL_LEITURAS ----
DROP POLICY IF EXISTS "Usuarios podem ver suas proprias leituras" ON public.canal_leituras;
CREATE POLICY "Usuarios podem ver suas proprias leituras" ON public.canal_leituras FOR SELECT USING (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Usuarios podem inserir suas proprias leituras" ON public.canal_leituras;
CREATE POLICY "Usuarios podem inserir suas proprias leituras" ON public.canal_leituras FOR INSERT WITH CHECK (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Usuarios podem atualizar suas proprias leituras" ON public.canal_leituras;
CREATE POLICY "Usuarios podem atualizar suas proprias leituras" ON public.canal_leituras FOR UPDATE USING (auth.uid() = usuario_id);

-- ---- CONVERSAS_PRIVADAS ----
DROP POLICY IF EXISTS "Ver conversas privadas" ON public.conversas_privadas;
CREATE POLICY "Ver conversas privadas" ON public.conversas_privadas FOR SELECT TO authenticated USING (public.user_participa_conversa(id));

DROP POLICY IF EXISTS "Criar conversa privada" ON public.conversas_privadas;
CREATE POLICY "Criar conversa privada" ON public.conversas_privadas FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Atualizar conversa privada" ON public.conversas_privadas;
CREATE POLICY "Atualizar conversa privada" ON public.conversas_privadas FOR UPDATE TO authenticated USING (public.user_participa_conversa(id));

-- ---- CONVERSA_PARTICIPANTES ----
DROP POLICY IF EXISTS "Ver participantes da conversa" ON public.conversa_participantes;
CREATE POLICY "Ver participantes da conversa" ON public.conversa_participantes FOR SELECT TO authenticated USING (public.user_participa_conversa(conversa_id));

DROP POLICY IF EXISTS "Inserir participante" ON public.conversa_participantes;
CREATE POLICY "Inserir participante" ON public.conversa_participantes FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Atualizar propria leitura" ON public.conversa_participantes;
CREATE POLICY "Atualizar propria leitura" ON public.conversa_participantes FOR UPDATE TO authenticated USING (usuario_id = auth.uid()) WITH CHECK (usuario_id = auth.uid());

-- ---- MENSAGENS_PRIVADAS ----
DROP POLICY IF EXISTS "Ver mensagens privadas" ON public.mensagens_privadas;
CREATE POLICY "Ver mensagens privadas" ON public.mensagens_privadas FOR SELECT USING (
  conversa_id IN (SELECT conversa_id FROM conversa_participantes WHERE usuario_id = auth.uid())
);

DROP POLICY IF EXISTS "Enviar mensagem privada" ON public.mensagens_privadas;
CREATE POLICY "Enviar mensagem privada" ON public.mensagens_privadas FOR INSERT WITH CHECK (
  autor_id = auth.uid() AND conversa_id IN (SELECT conversa_id FROM conversa_participantes WHERE usuario_id = auth.uid())
);

-- ---- ALERTAS_ALUNOS ----
DROP POLICY IF EXISTS "Professor ve alertas da sua casa" ON public.alertas_alunos;
CREATE POLICY "Professor ve alertas da sua casa" ON public.alertas_alunos FOR SELECT USING (
  has_role(auth.uid(), 'professor'::app_role) AND institution_id = get_user_institution_id()
  AND EXISTS (SELECT 1 FROM public.profiles p JOIN public.professor_casa pc ON pc.casa_id = p.casa_id WHERE p.id = alertas_alunos.aluno_id AND pc.professor_id = auth.uid() AND pc.ativo = true)
);

DROP POLICY IF EXISTS "Admin ve todos alertas da instituicao" ON public.alertas_alunos;
CREATE POLICY "Admin ve todos alertas da instituicao" ON public.alertas_alunos FOR SELECT USING (
  has_role(auth.uid(), 'admin'::app_role) AND institution_id = get_user_institution_id()
);

DROP POLICY IF EXISTS "Professor pode atualizar alertas da sua casa" ON public.alertas_alunos;
CREATE POLICY "Professor pode atualizar alertas da sua casa" ON public.alertas_alunos FOR UPDATE USING (
  has_role(auth.uid(), 'professor'::app_role) AND institution_id = get_user_institution_id()
  AND EXISTS (SELECT 1 FROM public.profiles p JOIN public.professor_casa pc ON pc.casa_id = p.casa_id WHERE p.id = alertas_alunos.aluno_id AND pc.professor_id = auth.uid() AND pc.ativo = true)
);

DROP POLICY IF EXISTS "Admin pode atualizar alertas" ON public.alertas_alunos;
CREATE POLICY "Admin pode atualizar alertas" ON public.alertas_alunos FOR UPDATE USING (
  has_role(auth.uid(), 'admin'::app_role) AND institution_id = get_user_institution_id()
);

DROP POLICY IF EXISTS "Sistema pode inserir alertas" ON public.alertas_alunos;
CREATE POLICY "Sistema pode inserir alertas" ON public.alertas_alunos FOR INSERT WITH CHECK (institution_id = get_user_institution_id());

-- ---- ACOES_PROFESSOR ----
DROP POLICY IF EXISTS "Professor pode criar acoes" ON public.acoes_professor;
CREATE POLICY "Professor pode criar acoes" ON public.acoes_professor FOR INSERT WITH CHECK (professor_id = auth.uid() AND has_role(auth.uid(), 'professor'::app_role) AND institution_id = get_user_institution_id());

DROP POLICY IF EXISTS "Professor ve suas acoes" ON public.acoes_professor;
CREATE POLICY "Professor ve suas acoes" ON public.acoes_professor FOR SELECT USING (professor_id = auth.uid());

DROP POLICY IF EXISTS "Admin ve todas acoes da instituicao" ON public.acoes_professor;
CREATE POLICY "Admin ve todas acoes da instituicao" ON public.acoes_professor FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role) AND institution_id = get_user_institution_id());

DROP POLICY IF EXISTS "Professor pode atualizar suas acoes" ON public.acoes_professor;
CREATE POLICY "Professor pode atualizar suas acoes" ON public.acoes_professor FOR UPDATE USING (professor_id = auth.uid());

DROP POLICY IF EXISTS "Admin pode atualizar acoes" ON public.acoes_professor;
CREATE POLICY "Admin pode atualizar acoes" ON public.acoes_professor FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role) AND institution_id = get_user_institution_id());

-- ---- BONUS_SOLICITACOES ----
DROP POLICY IF EXISTS "Professor ve proprias solicitacoes" ON public.bonus_solicitacoes;
CREATE POLICY "Professor ve proprias solicitacoes" ON public.bonus_solicitacoes FOR SELECT USING (solicitado_por = auth.uid());

DROP POLICY IF EXISTS "Admin ve todas solicitacoes da instituicao" ON public.bonus_solicitacoes;
CREATE POLICY "Admin ve todas solicitacoes da instituicao" ON public.bonus_solicitacoes FOR SELECT USING (institution_id = get_user_institution_id() AND has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Professor pode criar solicitacao" ON public.bonus_solicitacoes;
CREATE POLICY "Professor pode criar solicitacao" ON public.bonus_solicitacoes FOR INSERT WITH CHECK (
  solicitado_por = auth.uid() AND has_role(auth.uid(), 'professor') AND institution_id = get_user_institution_id()
);

DROP POLICY IF EXISTS "Admin pode atualizar solicitacoes" ON public.bonus_solicitacoes;
CREATE POLICY "Admin pode atualizar solicitacoes" ON public.bonus_solicitacoes FOR UPDATE USING (institution_id = get_user_institution_id() AND has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Criador pode deletar pendente" ON public.bonus_solicitacoes;
CREATE POLICY "Criador pode deletar pendente" ON public.bonus_solicitacoes FOR DELETE USING (solicitado_por = auth.uid() AND status = 'pendente');

DROP POLICY IF EXISTS "Admin pode deletar qualquer solicitacao" ON public.bonus_solicitacoes;
CREATE POLICY "Admin pode deletar qualquer solicitacao" ON public.bonus_solicitacoes FOR DELETE USING (institution_id = get_user_institution_id() AND has_role(auth.uid(), 'admin'));

-- ---- ACTIVITY_LOGS ----
DROP POLICY IF EXISTS "admin_read_logs" ON public.activity_logs;
CREATE POLICY "admin_read_logs" ON public.activity_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "authenticated_insert_logs" ON public.activity_logs;
CREATE POLICY "authenticated_insert_logs" ON public.activity_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ---- CONFIG_ALERTAS ----
DROP POLICY IF EXISTS "Config alertas sao publicos para leitura" ON public.config_alertas;
CREATE POLICY "Config alertas sao publicos para leitura" ON public.config_alertas FOR SELECT USING (true);

-- ---- LOOKUP TABLES (publicas para leitura) ----
DROP POLICY IF EXISTS "Hipoteses por sinal sao publicas para leitura" ON public.hipoteses_por_sinal;
CREATE POLICY "Hipoteses por sinal sao publicas para leitura" ON public.hipoteses_por_sinal FOR SELECT USING (true);

DROP POLICY IF EXISTS "Padroes sao publicos para leitura" ON public.hipoteses_por_padrao;
CREATE POLICY "Padroes sao publicos para leitura" ON public.hipoteses_por_padrao FOR SELECT USING (true);

DROP POLICY IF EXISTS "Acoes sao publicas para leitura" ON public.acoes_sugeridas;
CREATE POLICY "Acoes sao publicas para leitura" ON public.acoes_sugeridas FOR SELECT USING (true);

DROP POLICY IF EXISTS "Arquetipos sao publicos para leitura" ON public.arquetipos;
CREATE POLICY "Arquetipos sao publicos para leitura" ON public.arquetipos FOR SELECT USING (true);

DROP POLICY IF EXISTS "Templates sao publicos para leitura" ON public.templates_texto;
CREATE POLICY "Templates sao publicos para leitura" ON public.templates_texto FOR SELECT USING (true);

-- ---- ACOES_CELEBRACAO ----
DROP POLICY IF EXISTS "Professores podem inserir acoes de celebracao" ON public.acoes_celebracao;
CREATE POLICY "Professores podem inserir acoes de celebracao" ON public.acoes_celebracao FOR INSERT WITH CHECK (professor_id = auth.uid());

DROP POLICY IF EXISTS "Professores podem ver suas acoes de celebracao" ON public.acoes_celebracao;
CREATE POLICY "Professores podem ver suas acoes de celebracao" ON public.acoes_celebracao FOR SELECT USING (professor_id = auth.uid());

DROP POLICY IF EXISTS "Professores podem atualizar suas acoes de celebracao" ON public.acoes_celebracao;
CREATE POLICY "Professores podem atualizar suas acoes de celebracao" ON public.acoes_celebracao FOR UPDATE USING (professor_id = auth.uid());

-- ---- FASE_CONTEUDOS ----
DROP POLICY IF EXISTS "Admin pode gerenciar conteudos" ON public.fase_conteudos;
CREATE POLICY "Admin pode gerenciar conteudos" ON public.fase_conteudos FOR ALL USING (institution_id = public.get_user_institution_id() AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Professor pode ver conteudos" ON public.fase_conteudos;
CREATE POLICY "Professor pode ver conteudos" ON public.fase_conteudos FOR SELECT USING (institution_id = public.get_user_institution_id() AND public.has_role(auth.uid(), 'professor'));

-- ---- CONTEUDO_INTELIGENCIA ----
DROP POLICY IF EXISTS "Admin pode gerenciar conteudo_inteligencia" ON public.conteudo_inteligencia;
CREATE POLICY "Admin pode gerenciar conteudo_inteligencia" ON public.conteudo_inteligencia FOR ALL USING (institution_id = public.get_user_institution_id() AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Professor pode ver conteudo_inteligencia" ON public.conteudo_inteligencia;
CREATE POLICY "Professor pode ver conteudo_inteligencia" ON public.conteudo_inteligencia FOR SELECT USING (institution_id = public.get_user_institution_id() AND public.has_role(auth.uid(), 'professor'));

-- ---- PROFESSOR_TURMA ----
DROP POLICY IF EXISTS "Professor ve suas turmas" ON public.professor_turma;
CREATE POLICY "Professor ve suas turmas" ON public.professor_turma FOR SELECT USING (professor_id = auth.uid());

DROP POLICY IF EXISTS "Admin gerencia vinculos professor_turma" ON public.professor_turma;
CREATE POLICY "Admin gerencia vinculos professor_turma" ON public.professor_turma FOR ALL USING (
  has_role(auth.uid(), 'admin'::app_role) AND institution_id = get_user_institution_id()
);

-- ---- ADMIN_LOGS ----
DROP POLICY IF EXISTS "Admin pode inserir logs" ON public.admin_logs;
CREATE POLICY "Admin pode inserir logs" ON public.admin_logs FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admin pode ver logs da instituicao" ON public.admin_logs;
CREATE POLICY "Admin pode ver logs da instituicao" ON public.admin_logs FOR SELECT USING (institution_id = public.get_user_institution_id() AND public.has_role(auth.uid(), 'admin'));

-- ---- MAPA_DESENVOLVIMENTO ----
DROP POLICY IF EXISTS "Professor pode ver mapa das suas turmas" ON public.mapa_desenvolvimento;
CREATE POLICY "Professor pode ver mapa das suas turmas" ON public.mapa_desenvolvimento FOR SELECT USING (
  has_role(auth.uid(), 'professor'::app_role)
  AND (professor_id = auth.uid() OR turma_id = ANY(get_professor_turma_ids()))
);

DROP POLICY IF EXISTS "Professor pode inserir mapa" ON public.mapa_desenvolvimento;
CREATE POLICY "Professor pode inserir mapa" ON public.mapa_desenvolvimento FOR INSERT WITH CHECK (
  professor_id = auth.uid() AND has_role(auth.uid(), 'professor'::app_role) AND institution_id = get_user_institution_id()
);

DROP POLICY IF EXISTS "Professor pode atualizar mapa" ON public.mapa_desenvolvimento;
CREATE POLICY "Professor pode atualizar mapa" ON public.mapa_desenvolvimento FOR UPDATE USING (
  professor_id = auth.uid() AND has_role(auth.uid(), 'professor'::app_role)
);

DROP POLICY IF EXISTS "Professor pode deletar mapa" ON public.mapa_desenvolvimento;
CREATE POLICY "Professor pode deletar mapa" ON public.mapa_desenvolvimento FOR DELETE USING (
  professor_id = auth.uid() AND has_role(auth.uid(), 'professor'::app_role)
);

DROP POLICY IF EXISTS "Admin gerencia mapa da instituicao" ON public.mapa_desenvolvimento;
CREATE POLICY "Admin gerencia mapa da instituicao" ON public.mapa_desenvolvimento FOR ALL USING (
  has_role(auth.uid(), 'admin'::app_role) AND institution_id = get_user_institution_id()
);


-- ============================================================================
-- 8. STORAGE BUCKETS
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'entregas', 'entregas', false, 10485760,
  ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
) ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('brasoes', 'brasoes', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('fase-conteudos', 'fase-conteudos', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('inteligencia-conteudos', 'inteligencia-conteudos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies - entregas
DROP POLICY IF EXISTS "Alunos podem fazer upload em sua pasta" ON storage.objects;
CREATE POLICY "Alunos podem fazer upload em sua pasta" ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'entregas' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Alunos podem ver proprios arquivos" ON storage.objects;
CREATE POLICY "Alunos podem ver proprios arquivos" ON storage.objects FOR SELECT
USING (bucket_id = 'entregas' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Professores podem ver arquivos de alunos da sua casa" ON storage.objects;
CREATE POLICY "Professores podem ver arquivos de alunos da sua casa" ON storage.objects FOR SELECT
USING (bucket_id = 'entregas' AND has_role(auth.uid(), 'professor') AND EXISTS (
  SELECT 1 FROM profiles p JOIN professor_casa pc ON pc.professor_id = auth.uid() AND pc.casa_id = p.casa_id AND pc.ativo = true
  WHERE p.id::text = (storage.foldername(name))[1]
));

DROP POLICY IF EXISTS "Admins podem ver todos arquivos" ON storage.objects;
CREATE POLICY "Admins podem ver todos arquivos" ON storage.objects FOR SELECT
USING (bucket_id = 'entregas' AND has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Alunos podem deletar proprios arquivos storage" ON storage.objects;
CREATE POLICY "Alunos podem deletar proprios arquivos storage" ON storage.objects FOR DELETE
USING (bucket_id = 'entregas' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Admins podem deletar qualquer arquivo" ON storage.objects;
CREATE POLICY "Admins podem deletar qualquer arquivo" ON storage.objects FOR DELETE
USING (bucket_id = 'entregas' AND has_role(auth.uid(), 'admin'));

-- Storage policies - avatars
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
CREATE POLICY "Users can upload own avatar" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Avatars are publicly accessible" ON storage.objects;
CREATE POLICY "Avatars are publicly accessible" ON storage.objects FOR SELECT TO public
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
CREATE POLICY "Users can delete own avatar" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
CREATE POLICY "Users can update own avatar" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Admin can upload any avatar" ON storage.objects;
CREATE POLICY "Admin can upload any avatar" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admin can delete any avatar" ON storage.objects;
CREATE POLICY "Admin can delete any avatar" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admin can update any avatar" ON storage.objects;
CREATE POLICY "Admin can update any avatar" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND public.has_role(auth.uid(), 'admin'));

-- Storage policies - brasoes
DROP POLICY IF EXISTS "Brasoes sao publicos" ON storage.objects;
CREATE POLICY "Brasoes sao publicos" ON storage.objects FOR SELECT USING (bucket_id = 'brasoes');

-- Storage policies - fase-conteudos
DROP POLICY IF EXISTS "Acesso publico aos PDFs de fase" ON storage.objects;
CREATE POLICY "Acesso publico aos PDFs de fase" ON storage.objects FOR SELECT USING (bucket_id = 'fase-conteudos');

DROP POLICY IF EXISTS "Admin pode fazer upload de conteudo de fase" ON storage.objects;
CREATE POLICY "Admin pode fazer upload de conteudo de fase" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'fase-conteudos' AND has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admin pode atualizar conteudo de fase" ON storage.objects;
CREATE POLICY "Admin pode atualizar conteudo de fase" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'fase-conteudos' AND has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admin pode deletar conteudo de fase" ON storage.objects;
CREATE POLICY "Admin pode deletar conteudo de fase" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'fase-conteudos' AND has_role(auth.uid(), 'admin'::app_role));

-- Storage policies - inteligencia-conteudos
DROP POLICY IF EXISTS "Arquivos de conteudo sao publicos para leitura" ON storage.objects;
CREATE POLICY "Arquivos de conteudo sao publicos para leitura" ON storage.objects FOR SELECT USING (bucket_id = 'inteligencia-conteudos');

DROP POLICY IF EXISTS "Admin pode fazer upload de conteudo" ON storage.objects;
CREATE POLICY "Admin pode fazer upload de conteudo" ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'inteligencia-conteudos' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admin pode deletar conteudo" ON storage.objects;
CREATE POLICY "Admin pode deletar conteudo" ON storage.objects FOR DELETE
USING (bucket_id = 'inteligencia-conteudos' AND public.has_role(auth.uid(), 'admin'));


-- ============================================================================
-- 9. REALTIME
-- ============================================================================

-- Note: These may fail if already added; that is OK
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.mensagens_canal; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.mensagens_privadas; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.entregas; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.fases; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.observacoes; EXCEPTION WHEN OTHERS THEN NULL; END $$;


-- ============================================================================
-- FIM DA MIGRATION
-- ============================================================================
