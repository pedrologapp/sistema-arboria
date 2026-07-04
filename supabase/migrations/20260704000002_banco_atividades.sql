-- BANCO DE ATIVIDADES + fundação do PAINEL ARBORIA (do dono da plataforma).
-- Admin cadastra atividades pelo /arboria; professoras consomem no app.
-- Progresso é POR TURMA (mesmo padrão da trilha de explorações).
-- Requer: 20260704000001 (papel super_admin) já aplicada.

-- Semeia o dono da plataforma
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'super_admin'::public.app_role
FROM auth.users u
WHERE u.email = 'pedrolog.app@gmail.com'
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.atividades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  inteligencia_id smallint NOT NULL REFERENCES public.inteligencias(id),
  segmento text NOT NULL DEFAULT 'infantil',
  faixa text,                        -- opcional ("Maternal II", "Grupo IV"...); NULL = todas
  ordem smallint NOT NULL DEFAULT 1, -- posição no caminho da exploração
  nome text NOT NULL,
  objetivo text,
  materiais text,
  como_conduzir text,
  o_que_observar text,               -- alimenta o convite "Pra reparar hoje" da aula
  pdf_url text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_atividades_lookup
  ON public.atividades (institution_id, segmento, inteligencia_id, ordem)
  WHERE ativo;

ALTER TABLE public.atividades ENABLE ROW LEVEL SECURITY;

-- Autenticados da instituição LEEM (professoras consomem)
DROP POLICY IF EXISTS atividades_select_inst ON public.atividades;
CREATE POLICY atividades_select_inst ON public.atividades
  FOR SELECT TO authenticated
  USING (
    institution_id = (SELECT p.institution_id FROM public.profiles p WHERE p.id = auth.uid())
    OR public.has_role(auth.uid(), 'super_admin')
  );

-- SÓ o dono da plataforma gerencia (o admin da escola não vê a gestão)
DROP POLICY IF EXISTS atividades_super_all ON public.atividades;
CREATE POLICY atividades_super_all ON public.atividades
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Progresso da TURMA no caminho de atividades
CREATE TABLE IF NOT EXISTS public.turma_atividade_evento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  turma_id uuid NOT NULL REFERENCES public.turmas(id) ON DELETE CASCADE,
  atividade_id uuid NOT NULL REFERENCES public.atividades(id) ON DELETE CASCADE,
  evento text NOT NULL DEFAULT 'concluida' CHECK (evento IN ('concluida')),
  criado_por uuid REFERENCES public.profiles(id),
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (turma_id, atividade_id, evento)
);

ALTER TABLE public.turma_atividade_evento ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tae_select_prof ON public.turma_atividade_evento;
CREATE POLICY tae_select_prof ON public.turma_atividade_evento
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.professor_turma pt
      WHERE pt.turma_id = turma_atividade_evento.turma_id
        AND pt.professor_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'super_admin')
  );

DROP POLICY IF EXISTS tae_insert_prof ON public.turma_atividade_evento;
CREATE POLICY tae_insert_prof ON public.turma_atividade_evento
  FOR INSERT TO authenticated
  WITH CHECK (
    criado_por = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM public.professor_turma pt
        WHERE pt.turma_id = turma_atividade_evento.turma_id
          AND pt.professor_id = auth.uid()
      )
      OR public.has_role(auth.uid(), 'super_admin')
    )
  );

-- O dono enxerga instituições e formações (pro termômetro do painel)
DROP POLICY IF EXISTS institutions_select_super ON public.institutions;
CREATE POLICY institutions_select_super ON public.institutions
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS prof_formacao_select_super ON public.professor_formacao;
CREATE POLICY prof_formacao_select_super ON public.professor_formacao
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- Termômetro do Painel Arboria: contagens agregadas de toda a plataforma,
-- sem expor conteúdo (SECURITY DEFINER com trava de papel dentro)
CREATE OR REPLACE FUNCTION public.arboria_visao_geral()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resultado jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'acesso negado';
  END IF;

  SELECT jsonb_build_object(
    'escolas', (SELECT count(*) FROM institutions),
    'professores', (SELECT count(*) FROM professor_turma pt),
    'professores_distintos', (SELECT count(DISTINCT professor_id) FROM professor_turma),
    'alunos', (SELECT count(*) FROM profiles WHERE segmento IS NOT NULL AND serie IS NOT NULL),
    'turmas', (SELECT count(*) FROM turmas),
    'observacoes_total', (SELECT count(*) FROM observacoes WHERE excluida_em IS NULL),
    'observacoes_7d', (SELECT count(*) FROM observacoes WHERE excluida_em IS NULL AND created_at > now() - interval '7 days'),
    'formacoes_concluidas', (SELECT count(*) FROM professor_formacao),
    'atividades_cadastradas', (SELECT count(*) FROM atividades WHERE ativo)
  ) INTO resultado;

  RETURN resultado;
END;
$$;

-- Bucket dos PDFs das atividades (leitura pública: material pedagógico sem
-- dado de criança; escrita só do dono)
INSERT INTO storage.buckets (id, name, public)
VALUES ('atividades', 'atividades', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS atividades_pdf_read ON storage.objects;
CREATE POLICY atividades_pdf_read ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'atividades');

DROP POLICY IF EXISTS atividades_pdf_write ON storage.objects;
CREATE POLICY atividades_pdf_write ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'atividades' AND public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS atividades_pdf_delete ON storage.objects;
CREATE POLICY atividades_pdf_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'atividades' AND public.has_role(auth.uid(), 'super_admin'));
