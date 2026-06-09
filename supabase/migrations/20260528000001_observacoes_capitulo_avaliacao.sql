-- =============================================
-- Avaliação do Capítulo: observações por aluno + relatório do capítulo
--
-- 1) `observacoes` ganha:
--    - capitulo_id (opcional) — liga a observação ao capítulo onde foi feita
--    - origem ('manual' | 'ia_rascunho' | 'ia_confirmada') — fluxo dos 3 estados
--    Os campos sinal_id / inteligencia_fase / inteligencia_expressa viram
--    NULLABLE: observações de capítulo são texto livre e NÃO precisam de
--    estrutura analítica (sinal/inteligência). Quando esses campos são nulos,
--    o trigger `processar_observacao` pula a geração de evidência (early return).
--
-- 2) `capitulos` ganha os campos do relatório (GLOBAL — vale pra todas as
--    turmas da instituição; a IA identifica o aluno pelo nome no PDF):
--    - relatorio_url (PDF anexado)
--    - relatorio_texto (alternativa: prof escreve direto no app)
--    - relatorio_processado_em (timestamp do processamento da IA)
--
-- 3) Bucket privado `capitulo-relatorios` no Storage + policy básica.
-- Idempotente.
-- =============================================

-- 1) observacoes: adicionar capitulo_id + origem; afrouxar campos estruturados
ALTER TABLE public.observacoes
  ADD COLUMN IF NOT EXISTS capitulo_id uuid REFERENCES public.capitulos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS origem text NOT NULL DEFAULT 'manual';

-- CHECK do `origem` (DROP+ADD pra ser idempotente)
ALTER TABLE public.observacoes DROP CONSTRAINT IF EXISTS observacoes_origem_check;
ALTER TABLE public.observacoes
  ADD CONSTRAINT observacoes_origem_check
  CHECK (origem IN ('manual', 'ia_rascunho', 'ia_confirmada'));

-- Afrouxa NOT NULL dos campos estruturados (observação de capítulo é texto livre)
ALTER TABLE public.observacoes ALTER COLUMN sinal_id DROP NOT NULL;
ALTER TABLE public.observacoes ALTER COLUMN inteligencia_fase DROP NOT NULL;
ALTER TABLE public.observacoes ALTER COLUMN inteligencia_expressa DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_observacoes_capitulo_aluno
  ON public.observacoes(capitulo_id, aluno_id) WHERE capitulo_id IS NOT NULL;

COMMENT ON COLUMN public.observacoes.capitulo_id IS
  'Se preenchido, a observação foi feita no fluxo de Avaliação de um Capítulo (ex: Grande Assembleia).';
COMMENT ON COLUMN public.observacoes.origem IS
  '"manual" = professor escreveu direto. "ia_rascunho" = sugestão da IA aguardando revisão. "ia_confirmada" = sugestão IA revisada/aprovada pelo professor.';

-- 2) Ajustar processar_observacao(): early return se sinal_id IS NULL
--    (observação de texto livre não gera evidência de inteligência)
CREATE OR REPLACE FUNCTION public.processar_observacao()
RETURNS TRIGGER AS $$
DECLARE
  v_sinal record;
  v_fase record;
  v_tipo text;
  v_peso smallint;
  v_pontos decimal;
  v_ano_letivo smallint;
BEGIN
  -- Texto livre (sem sinal estruturado) → não gera evidência
  IF NEW.sinal_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Buscar dados do sinal
  SELECT * INTO v_sinal FROM sinais WHERE id = NEW.sinal_id;

  -- Buscar dados da fase
  SELECT f.*, COALESCE(s.ano_letivo_atual, 2025) as ano_letivo
  INTO v_fase
  FROM fases f
  LEFT JOIN institution_settings s ON s.institution_id = f.institution_id
  WHERE f.id = NEW.fase_id;

  v_ano_letivo := COALESCE(v_fase.ano_letivo, 2025);

  -- Só cria evidência para sinais positivos
  IF v_sinal.valencia = 'positivo' THEN

    -- Determinar tipo e peso baseado em cross-IM
    IF NEW.foi_cross_im THEN
      v_tipo := 'obs_cross';
      v_peso := 5;
    ELSE
      v_tipo := 'obs_propria';
      v_peso := 3;
    END IF;

    -- Calcular pontos baseado na intensidade
    v_pontos := v_sinal.peso_inteligencia;
    IF NEW.intensidade = 'alto' THEN
      v_pontos := v_pontos * 1.5;
    ELSIF NEW.intensidade = 'excepcional' THEN
      v_pontos := v_pontos * 2;
    END IF;

    -- Criar evidência para a IM EXPRESSA pelo aluno
    INSERT INTO inteligencia_evidencias (
      aluno_id, inteligencia_id, tipo, peso,
      pontos, observacao_id, fase_id, ano_letivo
    ) VALUES (
      NEW.aluno_id,
      NEW.inteligencia_expressa,
      v_tipo,
      v_peso,
      v_pontos,
      NEW.id,
      NEW.fase_id,
      v_ano_letivo
    );

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3) capitulos: campos do relatório (1 por capítulo, vale pra todas as turmas)
ALTER TABLE public.capitulos
  ADD COLUMN IF NOT EXISTS relatorio_url text,
  ADD COLUMN IF NOT EXISTS relatorio_texto text,
  ADD COLUMN IF NOT EXISTS relatorio_processado_em timestamptz;

COMMENT ON COLUMN public.capitulos.relatorio_url IS
  'Caminho do PDF do relatório do capítulo (no bucket capitulo-relatorios). Alimenta a IA pra gerar observações em rascunho — a IA identifica os alunos pelo nome, independente de turma.';
COMMENT ON COLUMN public.capitulos.relatorio_texto IS
  'Texto livre alternativo se o professor preferir escrever direto no app em vez de PDF.';
COMMENT ON COLUMN public.capitulos.relatorio_processado_em IS
  'Quando a IA leu o relatório e gerou as observações em rascunho. NULL = não processado ainda.';

-- 4) Bucket de relatórios (privado, acesso via signed URL ou service_role)
INSERT INTO storage.buckets (id, name, public)
VALUES ('capitulo-relatorios', 'capitulo-relatorios', false)
ON CONFLICT (id) DO NOTHING;

-- Policy permissiva pra autenticado (MVP — refinar pra escopo de professor
-- da turma se quiser segurança mais apertada)
DROP POLICY IF EXISTS "Auth tem acesso a capitulo-relatorios" ON storage.objects;
CREATE POLICY "Auth tem acesso a capitulo-relatorios"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'capitulo-relatorios')
WITH CHECK (bucket_id = 'capitulo-relatorios');
