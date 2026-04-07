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


