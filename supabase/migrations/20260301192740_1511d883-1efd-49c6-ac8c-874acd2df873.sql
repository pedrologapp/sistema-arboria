
-- Tabela mapa_desenvolvimento
CREATE TABLE public.mapa_desenvolvimento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id UUID NOT NULL REFERENCES profiles(id),
  turma_id UUID NOT NULL REFERENCES turmas(id),
  professor_id UUID NOT NULL REFERENCES profiles(id),
  fase_id UUID NOT NULL REFERENCES fases(id),
  semana_numero SMALLINT NOT NULL,
  institution_id UUID NOT NULL REFERENCES institutions(id),
  quadrante TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (aluno_id, fase_id, semana_numero)
);

-- Índices
CREATE INDEX idx_mapa_turma_fase ON mapa_desenvolvimento(turma_id, fase_id);
CREATE INDEX idx_mapa_aluno_fase ON mapa_desenvolvimento(aluno_id, fase_id);
CREATE INDEX idx_mapa_professor ON mapa_desenvolvimento(professor_id);

-- RLS
ALTER TABLE mapa_desenvolvimento ENABLE ROW LEVEL SECURITY;

-- Professor pode gerenciar registros das suas turmas
CREATE POLICY "Professor pode ver mapa das suas turmas"
  ON mapa_desenvolvimento FOR SELECT
  USING (
    has_role(auth.uid(), 'professor'::app_role)
    AND (professor_id = auth.uid() OR turma_id = ANY(get_professor_turma_ids()))
  );

CREATE POLICY "Professor pode inserir mapa"
  ON mapa_desenvolvimento FOR INSERT
  WITH CHECK (
    professor_id = auth.uid()
    AND has_role(auth.uid(), 'professor'::app_role)
    AND institution_id = get_user_institution_id()
  );

CREATE POLICY "Professor pode atualizar mapa"
  ON mapa_desenvolvimento FOR UPDATE
  USING (
    professor_id = auth.uid()
    AND has_role(auth.uid(), 'professor'::app_role)
  );

CREATE POLICY "Professor pode deletar mapa"
  ON mapa_desenvolvimento FOR DELETE
  USING (
    professor_id = auth.uid()
    AND has_role(auth.uid(), 'professor'::app_role)
  );

-- Admin pode tudo na instituição
CREATE POLICY "Admin gerencia mapa da instituição"
  ON mapa_desenvolvimento FOR ALL
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    AND institution_id = get_user_institution_id()
  );

-- Trigger updated_at
CREATE TRIGGER update_mapa_desenvolvimento_updated_at
  BEFORE UPDATE ON mapa_desenvolvimento
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Validação via trigger
CREATE OR REPLACE FUNCTION public.validate_mapa_desenvolvimento()
  RETURNS TRIGGER AS $$
BEGIN
  IF NEW.quadrante NOT IN ('surpreendeu', 'foi_bem', 'teve_dificuldades', 'atencao') THEN
    RAISE EXCEPTION 'Quadrante inválido: %', NEW.quadrante;
  END IF;
  IF NEW.semana_numero < 1 OR NEW.semana_numero > 4 THEN
    RAISE EXCEPTION 'semana_numero deve ser entre 1 e 4';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER validate_mapa_desenvolvimento_trigger
  BEFORE INSERT OR UPDATE ON mapa_desenvolvimento
  FOR EACH ROW
  EXECUTE FUNCTION validate_mapa_desenvolvimento();
