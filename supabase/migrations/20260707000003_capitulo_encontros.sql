-- =============================================================
-- Encontros variáveis por Capítulo (reforma do F2).
--
-- O QUÊ: 3 tabelas novas
--   1. capitulo_encontros        — TEMPLATE dos encontros do capítulo (roteiro).
--   2. capitulo_encontro_anexos  — anexos de um encontro (URL de storage, não blob).
--   3. capitulo_encontro_turma   — INSTÂNCIA por turma (datas previstas/realizadas).
--
-- POR QUÊ: hoje o capítulo tem uma única data de evento. A reforma do F2 quebra
-- o capítulo em N encontros (o mentor define quantos e o roteiro de cada um) e
-- cada turma percorre esses encontros no seu próprio calendário. Separar
-- TEMPLATE (por capítulo) de INSTÂNCIA (por turma) evita duplicar roteiro e
-- mantém o percurso da turma auditável.
--
-- ANEXOS guardam URL de storage (bucket Supabase), nunca binário no Postgres.
-- ADITIVO: tabelas novas; nada existente é tocado.
-- =============================================================

-- ---------------------------------------------
-- 1. capitulo_encontros — template do roteiro
-- ---------------------------------------------
CREATE TABLE IF NOT EXISTS public.capitulo_encontros (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  capitulo_id uuid NOT NULL REFERENCES public.capitulos(id) ON DELETE CASCADE,
  ordem       smallint NOT NULL CHECK (ordem >= 1),
  titulo      text NOT NULL,
  objetivo    text,
  instrucoes  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT capitulo_encontros_ordem_unica UNIQUE (capitulo_id, ordem)
);

CREATE INDEX IF NOT EXISTS idx_capitulo_encontros_capitulo
  ON public.capitulo_encontros (capitulo_id, ordem);

DROP TRIGGER IF EXISTS update_capitulo_encontros_updated_at ON public.capitulo_encontros;
CREATE TRIGGER update_capitulo_encontros_updated_at
  BEFORE UPDATE ON public.capitulo_encontros
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------
-- 2. capitulo_encontro_anexos — URLs de storage
-- ---------------------------------------------
CREATE TABLE IF NOT EXISTS public.capitulo_encontro_anexos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  encontro_id uuid NOT NULL REFERENCES public.capitulo_encontros(id) ON DELETE CASCADE,
  url         text NOT NULL,                 -- caminho/URL no storage; NUNCA blob
  nome        text,
  tipo        text,                          -- mime/rotulo livre (pdf, imagem, link...)
  ordem       smallint NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_capitulo_encontro_anexos_encontro
  ON public.capitulo_encontro_anexos (encontro_id, ordem);

-- ---------------------------------------------
-- 3. capitulo_encontro_turma — instância por turma
-- ---------------------------------------------
CREATE TABLE IF NOT EXISTS public.capitulo_encontro_turma (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  encontro_id    uuid NOT NULL REFERENCES public.capitulo_encontros(id) ON DELETE CASCADE,
  turma_id       uuid NOT NULL REFERENCES public.turmas(id)             ON DELETE CASCADE,
  data_prevista  date,
  data_realizada date,
  realizado      boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT capitulo_encontro_turma_unica UNIQUE (encontro_id, turma_id)
);

CREATE INDEX IF NOT EXISTS idx_capitulo_encontro_turma_turma
  ON public.capitulo_encontro_turma (turma_id);

DROP TRIGGER IF EXISTS update_capitulo_encontro_turma_updated_at ON public.capitulo_encontro_turma;
CREATE TRIGGER update_capitulo_encontro_turma_updated_at
  BEFORE UPDATE ON public.capitulo_encontro_turma
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================
-- RLS — coerente com o capítulo: quem gerencia é o MENTOR da casa do capítulo
-- (helper eh_mentor_do_capitulo), admin gerencia tudo; leitura para educadores.
-- Aluno NÃO recebe policy aqui (roteiro/instância são material do educador).
-- =============================================================
ALTER TABLE public.capitulo_encontros       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capitulo_encontro_anexos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capitulo_encontro_turma  ENABLE ROW LEVEL SECURITY;

-- ---------- capitulo_encontros ----------
DROP POLICY IF EXISTS "Educador vê encontros do capítulo" ON public.capitulo_encontros;
CREATE POLICY "Educador vê encontros do capítulo"
ON public.capitulo_encontros FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.capitulos c
    WHERE c.id = capitulo_id
      AND c.institution_id = get_user_institution_id()
      AND (has_role(auth.uid(), 'professor'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  )
);

DROP POLICY IF EXISTS "Mentor gerencia encontros do capítulo" ON public.capitulo_encontros;
CREATE POLICY "Mentor gerencia encontros do capítulo"
ON public.capitulo_encontros FOR ALL
USING ( public.eh_mentor_do_capitulo(capitulo_id, auth.uid()) )
WITH CHECK ( public.eh_mentor_do_capitulo(capitulo_id, auth.uid()) );

DROP POLICY IF EXISTS "Admin gerencia encontros do capítulo" ON public.capitulo_encontros;
CREATE POLICY "Admin gerencia encontros do capítulo"
ON public.capitulo_encontros FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role)
  AND EXISTS (SELECT 1 FROM public.capitulos c WHERE c.id = capitulo_id AND c.institution_id = get_user_institution_id())
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  AND EXISTS (SELECT 1 FROM public.capitulos c WHERE c.id = capitulo_id AND c.institution_id = get_user_institution_id())
);

-- ---------- capitulo_encontro_anexos (herda o dono via encontro -> capitulo) ----------
DROP POLICY IF EXISTS "Educador vê anexos do encontro" ON public.capitulo_encontro_anexos;
CREATE POLICY "Educador vê anexos do encontro"
ON public.capitulo_encontro_anexos FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.capitulo_encontros e
    JOIN public.capitulos c ON c.id = e.capitulo_id
    WHERE e.id = encontro_id
      AND c.institution_id = get_user_institution_id()
      AND (has_role(auth.uid(), 'professor'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  )
);

DROP POLICY IF EXISTS "Mentor gerencia anexos do encontro" ON public.capitulo_encontro_anexos;
CREATE POLICY "Mentor gerencia anexos do encontro"
ON public.capitulo_encontro_anexos FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.capitulo_encontros e
    WHERE e.id = encontro_id AND public.eh_mentor_do_capitulo(e.capitulo_id, auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.capitulo_encontros e
    WHERE e.id = encontro_id AND public.eh_mentor_do_capitulo(e.capitulo_id, auth.uid())
  )
);

DROP POLICY IF EXISTS "Admin gerencia anexos do encontro" ON public.capitulo_encontro_anexos;
CREATE POLICY "Admin gerencia anexos do encontro"
ON public.capitulo_encontro_anexos FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.capitulo_encontros e
    JOIN public.capitulos c ON c.id = e.capitulo_id
    WHERE e.id = encontro_id AND c.institution_id = get_user_institution_id()
  )
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.capitulo_encontros e
    JOIN public.capitulos c ON c.id = e.capitulo_id
    WHERE e.id = encontro_id AND c.institution_id = get_user_institution_id()
  )
);

-- ---------- capitulo_encontro_turma (instância) ----------
-- Leitura: educador da turma (professor_turma) ou mentor/admin do capítulo.
DROP POLICY IF EXISTS "Educador da turma vê instância do encontro" ON public.capitulo_encontro_turma;
CREATE POLICY "Educador da turma vê instância do encontro"
ON public.capitulo_encontro_turma FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.professor_turma pt
    WHERE pt.professor_id = auth.uid() AND pt.turma_id = capitulo_encontro_turma.turma_id AND pt.ativo = true
  )
  OR EXISTS (
    SELECT 1 FROM public.capitulo_encontros e
    JOIN public.capitulos c ON c.id = e.capitulo_id
    WHERE e.id = encontro_id
      AND c.institution_id = get_user_institution_id()
      AND has_role(auth.uid(), 'admin'::app_role)
  )
);

DROP POLICY IF EXISTS "Mentor gerencia instância do encontro" ON public.capitulo_encontro_turma;
CREATE POLICY "Mentor gerencia instância do encontro"
ON public.capitulo_encontro_turma FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.capitulo_encontros e
    WHERE e.id = encontro_id AND public.eh_mentor_do_capitulo(e.capitulo_id, auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.capitulo_encontros e
    WHERE e.id = encontro_id AND public.eh_mentor_do_capitulo(e.capitulo_id, auth.uid())
  )
);

DROP POLICY IF EXISTS "Admin gerencia instância do encontro" ON public.capitulo_encontro_turma;
CREATE POLICY "Admin gerencia instância do encontro"
ON public.capitulo_encontro_turma FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.capitulo_encontros e
    JOIN public.capitulos c ON c.id = e.capitulo_id
    WHERE e.id = encontro_id AND c.institution_id = get_user_institution_id()
  )
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.capitulo_encontros e
    JOIN public.capitulos c ON c.id = e.capitulo_id
    WHERE e.id = encontro_id AND c.institution_id = get_user_institution_id()
  )
);
