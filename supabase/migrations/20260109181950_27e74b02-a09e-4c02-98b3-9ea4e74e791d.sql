-- Criar tabela de cargos das casas
CREATE TABLE IF NOT EXISTS cargos_casa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  casa_id smallint NOT NULL REFERENCES inteligencias(id),
  aluno_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  cargo text NOT NULL CHECK (cargo IN ('lider', 'coordenador', 'embaixador')),
  ano_letivo smallint NOT NULL DEFAULT 2025,
  data_nomeacao timestamptz DEFAULT now(),
  nomeado_por uuid REFERENCES profiles(id),
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(institution_id, casa_id, aluno_id, ano_letivo, cargo)
);

-- Índice para busca rápida
CREATE INDEX idx_cargos_casa_lookup 
ON cargos_casa(institution_id, casa_id, ano_letivo, ativo);

-- RLS
ALTER TABLE cargos_casa ENABLE ROW LEVEL SECURITY;

-- Política de leitura para usuários da instituição
CREATE POLICY "Cargos são públicos para leitura da instituição"
ON cargos_casa FOR SELECT
USING (institution_id = get_user_institution_id());

-- Política de gerenciamento para admin
CREATE POLICY "Admin gerencia cargos"
ON cargos_casa FOR ALL
USING (institution_id = get_user_institution_id() AND has_role(auth.uid(), 'admin'::app_role));

-- Dado de teste: Lucas Freire como Líder da casa Linguística
INSERT INTO cargos_casa (institution_id, casa_id, aluno_id, cargo, ano_letivo)
SELECT 
  p.institution_id,
  1,  -- Linguística
  p.id,
  'lider',
  2025
FROM profiles p
WHERE p.full_name = 'Lucas Freire'
LIMIT 1;