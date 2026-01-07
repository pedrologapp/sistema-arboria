-- =====================================================
-- FASE 2 - PARTE 2: ESTRUTURA CENTRADA EM CASA
-- =====================================================

-- 1. FUNÇÃO AUXILIAR: get_user_institution_id (evita recursão em RLS)
CREATE OR REPLACE FUNCTION public.get_user_institution_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT institution_id FROM profiles WHERE id = auth.uid()
$$;

-- 2. CRIAR TABELA inteligencias (AS 8 CASAS)
CREATE TABLE IF NOT EXISTS public.inteligencias (
  id smallint PRIMARY KEY,
  codigo text UNIQUE NOT NULL,
  nome text NOT NULL,
  emoji text,
  cor_hex text,
  descricao text,
  ordem smallint
);

-- Inserir as 8 inteligências múltiplas
INSERT INTO public.inteligencias (id, codigo, nome, emoji, cor_hex, ordem) VALUES
(1, 'linguistica', 'Linguística', '📝', '#3B82F6', 1),
(2, 'logico_matematica', 'Lógico-Matemática', '🔢', '#10B981', 2),
(3, 'espacial', 'Espacial', '🎨', '#F59E0B', 3),
(4, 'musical', 'Musical', '🎵', '#8B5CF6', 4),
(5, 'corporal_cinestesica', 'Corporal-Cinestésica', '🏃', '#EF4444', 5),
(6, 'naturalista', 'Naturalista', '🌿', '#22C55E', 6),
(7, 'interpessoal', 'Interpessoal', '👥', '#EC4899', 7),
(8, 'intrapessoal', 'Intrapessoal', '🧘', '#6366F1', 8)
ON CONFLICT (id) DO NOTHING;

-- 3. CRIAR TABELA institution_settings
CREATE TABLE IF NOT EXISTS public.institution_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  
  logo_url text,
  favicon_url text,
  cor_primaria text DEFAULT '#1B4F72',
  cor_secundaria text DEFAULT '#3498DB',
  cor_acento text DEFAULT '#F39C12',
  
  slug text UNIQUE,
  endereco text,
  telefone text,
  email_contato text,
  website text,
  
  ano_letivo_atual smallint DEFAULT 2025,
  usa_sistema_casas boolean DEFAULT true,
  
  data_inicio_letivo date,
  data_fim_letivo date,
  duracao_fase_semanas smallint DEFAULT 4,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(institution_id)
);

CREATE INDEX IF NOT EXISTS idx_institution_settings_slug ON public.institution_settings(slug);

-- 4. ADICIONAR COLUNA casa_id EM PROFILES
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS casa_id smallint REFERENCES public.inteligencias(id);

CREATE INDEX IF NOT EXISTS idx_profiles_casa_id ON public.profiles(casa_id);
CREATE INDEX IF NOT EXISTS idx_profiles_institution_casa ON public.profiles(institution_id, casa_id);

-- 5. CRIAR TABELA turmas
CREATE TABLE IF NOT EXISTS public.turmas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  nome text NOT NULL,
  serie smallint NOT NULL CHECK (serie BETWEEN 1 AND 12),
  turma_letra text NOT NULL,
  ano_letivo smallint NOT NULL,
  turno text CHECK (turno IN ('manhã', 'tarde', 'integral', 'noite')),
  sala text,
  capacidade smallint,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(institution_id, serie, turma_letra, ano_letivo)
);

CREATE INDEX IF NOT EXISTS idx_turmas_institution ON public.turmas(institution_id);
CREATE INDEX IF NOT EXISTS idx_turmas_ano_letivo ON public.turmas(ano_letivo);

-- 6. CRIAR TABELA aluno_turma
CREATE TABLE IF NOT EXISTS public.aluno_turma (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  turma_id uuid NOT NULL REFERENCES public.turmas(id) ON DELETE CASCADE,
  ano_letivo smallint NOT NULL,
  numero_chamada smallint,
  data_entrada date DEFAULT CURRENT_DATE,
  data_saida date,
  motivo_saida text,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(aluno_id, turma_id, ano_letivo)
);

CREATE INDEX IF NOT EXISTS idx_aluno_turma_aluno ON public.aluno_turma(aluno_id);
CREATE INDEX IF NOT EXISTS idx_aluno_turma_turma ON public.aluno_turma(turma_id);

-- 7. CRIAR TABELA professor_casa
CREATE TABLE IF NOT EXISTS public.professor_casa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  casa_id smallint NOT NULL REFERENCES public.inteligencias(id),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  ano_letivo smallint NOT NULL,
  eh_mentor_principal boolean DEFAULT true,
  data_inicio date DEFAULT CURRENT_DATE,
  data_fim date,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(professor_id, institution_id, ano_letivo)
);

CREATE INDEX IF NOT EXISTS idx_professor_casa_professor ON public.professor_casa(professor_id);
CREATE INDEX IF NOT EXISTS idx_professor_casa_casa ON public.professor_casa(casa_id);
CREATE INDEX IF NOT EXISTS idx_professor_casa_institution ON public.professor_casa(institution_id);
CREATE INDEX IF NOT EXISTS idx_professor_casa_ativo ON public.professor_casa(professor_id, ativo);

-- 8. HABILITAR RLS EM TODAS AS TABELAS
ALTER TABLE public.inteligencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turmas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aluno_turma ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professor_casa ENABLE ROW LEVEL SECURITY;

-- 9. RLS: INTELIGENCIAS (leitura pública)
DROP POLICY IF EXISTS "Inteligencias são públicas" ON public.inteligencias;
CREATE POLICY "Inteligencias são públicas" 
ON public.inteligencias FOR SELECT 
USING (true);

-- 10. RLS: INSTITUTION_SETTINGS
DROP POLICY IF EXISTS "Usuários veem settings da sua instituição" ON public.institution_settings;
CREATE POLICY "Usuários veem settings da sua instituição"
ON public.institution_settings FOR SELECT
USING (institution_id = public.get_user_institution_id());

DROP POLICY IF EXISTS "Admins podem modificar settings" ON public.institution_settings;
CREATE POLICY "Admins podem modificar settings"
ON public.institution_settings FOR ALL
USING (
  institution_id = public.get_user_institution_id()
  AND public.has_role(auth.uid(), 'admin')
);

-- 11. RLS: TURMAS
DROP POLICY IF EXISTS "Usuários veem turmas da instituição" ON public.turmas;
CREATE POLICY "Usuários veem turmas da instituição"
ON public.turmas FOR SELECT
USING (institution_id = public.get_user_institution_id());

DROP POLICY IF EXISTS "Admins podem gerenciar turmas" ON public.turmas;
CREATE POLICY "Admins podem gerenciar turmas"
ON public.turmas FOR ALL
USING (
  institution_id = public.get_user_institution_id()
  AND public.has_role(auth.uid(), 'admin')
);

-- 12. RLS: ALUNO_TURMA
DROP POLICY IF EXISTS "Admins veem todos aluno_turma" ON public.aluno_turma;
CREATE POLICY "Admins veem todos aluno_turma"
ON public.aluno_turma FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.turmas t
    WHERE t.id = aluno_turma.turma_id
    AND t.institution_id = public.get_user_institution_id()
  )
  AND public.has_role(auth.uid(), 'admin')
);

DROP POLICY IF EXISTS "Professores veem aluno_turma da sua casa" ON public.aluno_turma;
CREATE POLICY "Professores veem aluno_turma da sua casa"
ON public.aluno_turma FOR SELECT
USING (
  public.has_role(auth.uid(), 'professor')
  AND EXISTS (
    SELECT 1 FROM public.profiles aluno
    JOIN public.professor_casa pc ON pc.professor_id = auth.uid() 
      AND pc.casa_id = aluno.casa_id 
      AND pc.ativo = true
    WHERE aluno.id = aluno_turma.aluno_id
  )
);

DROP POLICY IF EXISTS "Alunos veem próprio aluno_turma" ON public.aluno_turma;
CREATE POLICY "Alunos veem próprio aluno_turma"
ON public.aluno_turma FOR SELECT
USING (aluno_id = auth.uid());

DROP POLICY IF EXISTS "Admins podem gerenciar aluno_turma" ON public.aluno_turma;
CREATE POLICY "Admins podem gerenciar aluno_turma"
ON public.aluno_turma FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.turmas t
    WHERE t.id = aluno_turma.turma_id
    AND t.institution_id = public.get_user_institution_id()
  )
  AND public.has_role(auth.uid(), 'admin')
);

-- 13. RLS: PROFESSOR_CASA
DROP POLICY IF EXISTS "Usuários veem professor_casa da instituição" ON public.professor_casa;
CREATE POLICY "Usuários veem professor_casa da instituição"
ON public.professor_casa FOR SELECT
USING (institution_id = public.get_user_institution_id());

DROP POLICY IF EXISTS "Admins podem gerenciar professor_casa" ON public.professor_casa;
CREATE POLICY "Admins podem gerenciar professor_casa"
ON public.professor_casa FOR ALL
USING (
  institution_id = public.get_user_institution_id()
  AND public.has_role(auth.uid(), 'admin')
);

-- 14. RLS: PROFILES - Adicionar política para professores verem alunos da sua casa
DROP POLICY IF EXISTS "Professores veem alunos da sua casa" ON public.profiles;
CREATE POLICY "Professores veem alunos da sua casa"
ON public.profiles FOR SELECT
USING (
  institution_id = public.get_user_institution_id()
  AND public.has_role(auth.uid(), 'professor')
  AND casa_id IN (
    SELECT pc.casa_id FROM public.professor_casa pc
    WHERE pc.professor_id = auth.uid() 
    AND pc.ativo = true
  )
);

-- 15. TRIGGER: Criar settings automaticamente para novas instituições
CREATE OR REPLACE FUNCTION public.create_default_institution_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.institution_settings (institution_id)
  VALUES (NEW.id)
  ON CONFLICT (institution_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_institution_created ON public.institutions;
CREATE TRIGGER on_institution_created
  AFTER INSERT ON public.institutions
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_institution_settings();

-- 16. CRIAR SETTINGS PARA INSTITUIÇÕES EXISTENTES
INSERT INTO public.institution_settings (institution_id)
SELECT id FROM public.institutions
WHERE id NOT IN (SELECT institution_id FROM public.institution_settings)
ON CONFLICT (institution_id) DO NOTHING;

-- 17. FUNÇÃO: Converter casa (texto) → casa_id (FK)
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

DROP TRIGGER IF EXISTS on_profile_sync_casa ON public.profiles;
CREATE TRIGGER on_profile_sync_casa
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_casa_to_casa_id();

-- 18. FUNÇÃO: Garantir que turma existe (cria se não existir)
CREATE OR REPLACE FUNCTION public.ensure_turma_exists(
  p_institution_id uuid,
  p_serie text,
  p_turma_letra text,
  p_ano_letivo smallint
)
RETURNS uuid AS $$
DECLARE
  v_turma_id uuid;
  v_serie_num smallint;
BEGIN
  v_serie_num := CAST(REGEXP_REPLACE(p_serie, '[^0-9]', '', 'g') AS smallint);
  
  SELECT id INTO v_turma_id
  FROM public.turmas
  WHERE institution_id = p_institution_id
    AND serie = v_serie_num
    AND UPPER(TRIM(turma_letra)) = UPPER(TRIM(p_turma_letra))
    AND ano_letivo = p_ano_letivo;
  
  IF v_turma_id IS NULL THEN
    INSERT INTO public.turmas (institution_id, nome, serie, turma_letra, ano_letivo)
    VALUES (
      p_institution_id,
      v_serie_num || 'º ' || UPPER(TRIM(p_turma_letra)),
      v_serie_num,
      UPPER(TRIM(p_turma_letra)),
      p_ano_letivo
    )
    RETURNING id INTO v_turma_id;
  END IF;
  
  RETURN v_turma_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 19. FUNÇÃO: Matricular aluno na turma automaticamente (trigger em profiles)
CREATE OR REPLACE FUNCTION public.sync_profile_to_aluno_turma()
RETURNS TRIGGER AS $$
DECLARE
  v_turma_id uuid;
  v_ano_letivo smallint;
  v_is_aluno boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = NEW.id AND role = 'user'
  ) INTO v_is_aluno;
  
  IF NOT v_is_aluno OR NEW.serie IS NULL OR NEW.turma IS NULL OR NEW.institution_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  SELECT COALESCE(ano_letivo_atual, EXTRACT(YEAR FROM CURRENT_DATE)::smallint)
  INTO v_ano_letivo
  FROM public.institution_settings
  WHERE institution_id = NEW.institution_id;
  
  IF v_ano_letivo IS NULL THEN
    v_ano_letivo := EXTRACT(YEAR FROM CURRENT_DATE)::smallint;
  END IF;
  
  v_turma_id := public.ensure_turma_exists(NEW.institution_id, NEW.serie, NEW.turma, v_ano_letivo);
  
  INSERT INTO public.aluno_turma (aluno_id, turma_id, ano_letivo, ativo)
  VALUES (NEW.id, v_turma_id, v_ano_letivo, true)
  ON CONFLICT (aluno_id, turma_id, ano_letivo) 
  DO UPDATE SET ativo = true;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_profile_sync_turma ON public.profiles;
CREATE TRIGGER on_profile_sync_turma
  AFTER INSERT OR UPDATE OF serie, turma, institution_id ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_to_aluno_turma();

-- 20. FUNÇÃO: Matricular quando role é criado (resolve timing)
CREATE OR REPLACE FUNCTION public.sync_user_role_to_aluno_turma()
RETURNS TRIGGER AS $$
DECLARE
  v_profile RECORD;
  v_turma_id uuid;
  v_ano_letivo smallint;
BEGIN
  IF NEW.role != 'user' THEN
    RETURN NEW;
  END IF;
  
  SELECT id, serie, turma, institution_id
  INTO v_profile
  FROM public.profiles
  WHERE id = NEW.user_id;
  
  IF v_profile.serie IS NULL OR v_profile.turma IS NULL OR v_profile.institution_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  SELECT COALESCE(ano_letivo_atual, EXTRACT(YEAR FROM CURRENT_DATE)::smallint)
  INTO v_ano_letivo
  FROM public.institution_settings
  WHERE institution_id = v_profile.institution_id;
  
  IF v_ano_letivo IS NULL THEN
    v_ano_letivo := EXTRACT(YEAR FROM CURRENT_DATE)::smallint;
  END IF;
  
  v_turma_id := public.ensure_turma_exists(v_profile.institution_id, v_profile.serie, v_profile.turma, v_ano_letivo);
  
  INSERT INTO public.aluno_turma (aluno_id, turma_id, ano_letivo, ativo)
  VALUES (v_profile.id, v_turma_id, v_ano_letivo, true)
  ON CONFLICT (aluno_id, turma_id, ano_letivo) 
  DO UPDATE SET ativo = true;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_user_role_sync_turma ON public.user_roles;
CREATE TRIGGER on_user_role_sync_turma
  AFTER INSERT ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_user_role_to_aluno_turma();

-- 21. FUNÇÃO AUXILIAR: Buscar alunos da casa do professor
CREATE OR REPLACE FUNCTION public.get_alunos_minha_casa(
  p_serie smallint DEFAULT NULL,
  p_turma_letra text DEFAULT NULL
)
RETURNS TABLE (
  aluno_id uuid,
  nome text,
  sobrenome text,
  full_name text,
  casa_id smallint,
  casa_nome text,
  serie text,
  turma text
) AS $$
DECLARE
  v_minha_casa_id smallint;
  v_minha_institution_id uuid;
BEGIN
  SELECT pc.casa_id, pc.institution_id 
  INTO v_minha_casa_id, v_minha_institution_id
  FROM public.professor_casa pc
  WHERE pc.professor_id = auth.uid() 
  AND pc.ativo = true
  LIMIT 1;
  
  IF v_minha_casa_id IS NULL THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    p.id as aluno_id,
    p.nome,
    p.sobrenome,
    p.full_name,
    p.casa_id,
    i.nome as casa_nome,
    p.serie,
    p.turma
  FROM public.profiles p
  JOIN public.inteligencias i ON i.id = p.casa_id
  JOIN public.user_roles ur ON ur.user_id = p.id AND ur.role = 'user'
  WHERE p.institution_id = v_minha_institution_id
    AND p.casa_id = v_minha_casa_id
    AND (p_serie IS NULL OR CAST(REGEXP_REPLACE(p.serie, '[^0-9]', '', 'g') AS smallint) = p_serie)
    AND (p_turma_letra IS NULL OR UPPER(TRIM(p.turma)) = UPPER(TRIM(p_turma_letra)))
  ORDER BY p.serie, p.turma, p.nome;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 22. MIGRAÇÃO DE DADOS: Atualizar casa_id para profiles existentes
UPDATE public.profiles p
SET casa_id = i.id
FROM public.inteligencias i
WHERE p.casa IS NOT NULL 
  AND p.casa_id IS NULL
  AND (
    LOWER(TRIM(p.casa)) = LOWER(TRIM(i.nome))
    OR LOWER(TRIM(REPLACE(REPLACE(p.casa, '-', '_'), ' ', '_'))) = LOWER(i.codigo)
  );

-- 23. MIGRAÇÃO DE DADOS: Disparar sync de turmas para alunos existentes
UPDATE public.profiles
SET updated_at = now()
WHERE serie IS NOT NULL 
  AND turma IS NOT NULL 
  AND institution_id IS NOT NULL
  AND id IN (SELECT user_id FROM public.user_roles WHERE role = 'user');