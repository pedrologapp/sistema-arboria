-- =============================================
-- TABELA: sinais (Dimensão Global - 15 sinais)
-- =============================================

CREATE TABLE public.sinais (
  id smallint PRIMARY KEY,
  codigo text UNIQUE NOT NULL,
  emoji text NOT NULL,
  label_pt text NOT NULL,
  pilar text NOT NULL CHECK (pilar IN ('cognitivo', 'social', 'emocional', 'nao_cognitivo')),
  valencia text NOT NULL CHECK (valencia IN ('positivo', 'atencao')),
  peso_inteligencia smallint DEFAULT 10,
  descricao text,
  ordem smallint
);

-- RLS para sinais
ALTER TABLE public.sinais ENABLE ROW LEVEL SECURITY;

-- SELECT: todos podem ler (tabela de dimensão pública)
CREATE POLICY "Sinais são públicos"
ON public.sinais FOR SELECT
USING (true);

-- Inserir os 15 sinais
INSERT INTO public.sinais (id, codigo, emoji, label_pt, pilar, valencia, peso_inteligencia, ordem) VALUES
-- Positivos
(1, 'brilhou', '⭐', 'Brilhou', 'cognitivo', 'positivo', 15, 1),
(2, 'pegou_rapido', '🚀', 'Pegou rápido', 'cognitivo', 'positivo', 10, 2),
(3, 'inovou', '💡', 'Inovou', 'cognitivo', 'positivo', 15, 3),
(4, 'persistiu', '💪', 'Persistiu', 'nao_cognitivo', 'positivo', 10, 4),
(5, 'liderou', '🦅', 'Liderou', 'nao_cognitivo', 'positivo', 10, 5),
(6, 'conectou', '🤝', 'Conectou', 'social', 'positivo', 10, 6),
(7, 'estava_leve', '😊', 'Estava leve', 'emocional', 'positivo', 5, 7),
-- Atenção
(8, 'travou', '🧱', 'Travou', 'cognitivo', 'atencao', -5, 8),
(9, 'desistiu', '😤', 'Desistiu', 'nao_cognitivo', 'atencao', -10, 9),
(10, 'isolou_se', '🚫', 'Isolou-se', 'social', 'atencao', -5, 10),
(11, 'estava_calado', '😶', 'Estava calado', 'social', 'atencao', 0, 11),
(12, 'conflitou', '💥', 'Conflitou', 'social', 'atencao', -5, 12),
(13, 'estava_pesado', '😔', 'Estava pesado', 'emocional', 'atencao', 0, 13),
(14, 'ansioso', '🌀', 'Parecia ansioso', 'emocional', 'atencao', 0, 14),
(15, 'algo_estranho', '⚠️', 'Algo estranho', 'emocional', 'atencao', 0, 15);

-- =============================================
-- TABELA: fases (Por Instituição/Ano Letivo)
-- =============================================

CREATE TABLE public.fases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  inteligencia_id smallint NOT NULL REFERENCES public.inteligencias(id),
  ano_letivo smallint NOT NULL,
  numero_fase smallint NOT NULL CHECK (numero_fase BETWEEN 1 AND 8),
  semana_atual smallint DEFAULT 1 CHECK (semana_atual BETWEEN 1 AND 4),
  data_inicio date NOT NULL,
  data_fim date NOT NULL,
  ativo boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(institution_id, ano_letivo, numero_fase)
);

-- Índices para performance
CREATE INDEX idx_fases_institution ON public.fases(institution_id);
CREATE INDEX idx_fases_ativo ON public.fases(institution_id, ativo) WHERE ativo = true;

-- Trigger para updated_at
CREATE TRIGGER update_fases_updated_at
BEFORE UPDATE ON public.fases
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- RLS para fases
ALTER TABLE public.fases ENABLE ROW LEVEL SECURITY;

-- SELECT: usuários da mesma instituição
CREATE POLICY "Usuários veem fases da instituição"
ON public.fases FOR SELECT
USING (institution_id = public.get_user_institution_id());

-- ALL: apenas admins da instituição
CREATE POLICY "Admins gerenciam fases"
ON public.fases FOR ALL
USING (
  institution_id = public.get_user_institution_id() 
  AND public.has_role(auth.uid(), 'admin')
);