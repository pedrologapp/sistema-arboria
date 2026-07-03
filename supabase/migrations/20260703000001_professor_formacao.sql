-- FORMAÇÃO ARBORIA: conclusões de treinamento do professor (aprovado 03/07/2026).
-- Grava SÓ a conclusão (nunca respostas/erros do quiz). Professor vê as suas;
-- coordenador/admin da MESMA instituição acompanham quem concluiu.

CREATE TABLE IF NOT EXISTS public.professor_formacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  institution_id uuid REFERENCES public.institutions(id) ON DELETE SET NULL,
  treinamento_id smallint NOT NULL,
  concluido_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (professor_id, treinamento_id)
);

ALTER TABLE public.professor_formacao ENABLE ROW LEVEL SECURITY;

-- Professor grava e enxerga a própria formação
DROP POLICY IF EXISTS prof_formacao_insert_own ON public.professor_formacao;
CREATE POLICY prof_formacao_insert_own ON public.professor_formacao
  FOR INSERT TO authenticated
  WITH CHECK (professor_id = auth.uid());

DROP POLICY IF EXISTS prof_formacao_select_own ON public.professor_formacao;
CREATE POLICY prof_formacao_select_own ON public.professor_formacao
  FOR SELECT TO authenticated
  USING (professor_id = auth.uid());

-- Coordenação/admin da mesma instituição acompanham conclusões
DROP POLICY IF EXISTS prof_formacao_select_coord ON public.professor_formacao;
CREATE POLICY prof_formacao_select_coord ON public.professor_formacao
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('coordenador', 'admin')
        AND p.institution_id = professor_formacao.institution_id
    )
  );

-- Sem UPDATE/DELETE: conclusão é fato histórico (refazer não duplica pela UNIQUE)
