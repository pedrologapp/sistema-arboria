-- Tabela de observações do professor
CREATE TABLE public.observacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  aluno_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  professor_id uuid NOT NULL REFERENCES public.profiles(id),
  turma_id uuid NOT NULL REFERENCES public.turmas(id),
  fase_id uuid NOT NULL REFERENCES public.fases(id),
  sinal_id smallint NOT NULL REFERENCES public.sinais(id),
  inteligencia_fase smallint NOT NULL REFERENCES public.inteligencias(id),
  inteligencia_expressa smallint NOT NULL REFERENCES public.inteligencias(id),
  foi_cross_im boolean GENERATED ALWAYS AS (inteligencia_fase <> inteligencia_expressa) STORED,
  intensidade text DEFAULT 'normal' CHECK (intensidade IN ('normal', 'alto', 'excepcional')),
  observacao_texto text,
  data_observacao date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_obs_aluno ON public.observacoes(aluno_id);
CREATE INDEX idx_obs_professor ON public.observacoes(professor_id);
CREATE INDEX idx_obs_fase ON public.observacoes(fase_id);
CREATE INDEX idx_obs_sinal ON public.observacoes(sinal_id);
CREATE INDEX idx_obs_im_expressa ON public.observacoes(inteligencia_expressa);
CREATE INDEX idx_obs_cross ON public.observacoes(foi_cross_im) WHERE foi_cross_im = true;
CREATE INDEX idx_obs_data ON public.observacoes(data_observacao);

-- Habilitar RLS
ALTER TABLE public.observacoes ENABLE ROW LEVEL SECURITY;

-- SELECT: Professor vê observações que ele criou
CREATE POLICY "Professor vê próprias observações"
ON public.observacoes FOR SELECT
USING (professor_id = auth.uid());

-- SELECT: Professor vê observações de alunos da sua casa
CREATE POLICY "Professor vê observações da sua casa"
ON public.observacoes FOR SELECT
USING (
  has_role(auth.uid(), 'professor'::app_role) AND
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN professor_casa pc ON pc.professor_id = auth.uid() 
      AND pc.casa_id = p.casa_id 
      AND pc.ativo = true
    WHERE p.id = observacoes.aluno_id
  )
);

-- SELECT: Admin vê todas da instituição
CREATE POLICY "Admin vê observações da instituição"
ON public.observacoes FOR SELECT
USING (
  institution_id = get_user_institution_id() AND
  has_role(auth.uid(), 'admin'::app_role)
);

-- INSERT: Professor pode criar (professor_id = auth.uid())
CREATE POLICY "Professor pode criar observações"
ON public.observacoes FOR INSERT
WITH CHECK (
  professor_id = auth.uid() AND
  has_role(auth.uid(), 'professor'::app_role) AND
  institution_id = get_user_institution_id()
);

-- INSERT: Admin pode criar
CREATE POLICY "Admin pode criar observações"
ON public.observacoes FOR INSERT
WITH CHECK (
  institution_id = get_user_institution_id() AND
  has_role(auth.uid(), 'admin'::app_role)
);

-- UPDATE: Quem criou pode atualizar
CREATE POLICY "Professor atualiza próprias observações"
ON public.observacoes FOR UPDATE
USING (professor_id = auth.uid());

-- UPDATE: Admin pode atualizar
CREATE POLICY "Admin atualiza observações da instituição"
ON public.observacoes FOR UPDATE
USING (
  institution_id = get_user_institution_id() AND
  has_role(auth.uid(), 'admin'::app_role)
);

-- DELETE: Quem criou pode deletar (nas primeiras 24h)
CREATE POLICY "Professor deleta próprias observações em 24h"
ON public.observacoes FOR DELETE
USING (
  professor_id = auth.uid() AND
  created_at > now() - interval '24 hours'
);

-- DELETE: Admin sempre pode
CREATE POLICY "Admin deleta observações da instituição"
ON public.observacoes FOR DELETE
USING (
  institution_id = get_user_institution_id() AND
  has_role(auth.uid(), 'admin'::app_role)
);