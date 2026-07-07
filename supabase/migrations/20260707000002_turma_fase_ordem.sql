-- =============================================================
-- turma_fase_ordem — ORDEM das 8 Casas POR TURMA (reforma do F2).
--
-- O QUÊ: uma linha por (turma, ano, posicao) mapeando a POSIÇÃO da trilha
-- (1..8, o que turma_trilha.ordem_atual aponta) para a INTELIGÊNCIA/Casa
-- (1..8) que aquela turma percorre naquela posição.
--
-- POR QUÊ: no F2 a reforma permite que cada turma percorra as Casas em ordem
-- própria (definida pelo coordenador), sem fragmentar o rio longitudinal:
-- as `fases` continuam compartilhadas por segmento/ano; só a ORDEM de percurso
-- muda por turma. Quando uma turma NÃO tem ordem configurada, o comportamento
-- é o de hoje (posicao == inteligencia_id) via FALLBACK nas RPCs -> Infantil e
-- F1 seguem intocados.
--
-- ADITIVO: tabela nova. Não altera/renomeia/dropa nada existente.
--
-- TODO / DÍVIDA TÉCNICA (writer da ordem, UI v2): as duas UNIQUE
-- (turma+ano+posicao) e (turma+ano+inteligencia) garantem INJETIVIDADE (nenhuma
-- posição repetida, nenhuma Casa repetida) mas NÃO garantem a PERMUTAÇÃO COMPLETA
-- das 8 Casas. Uma ordem PARCIAL (ex.: só posições 1..5 gravadas) é aceita pelo
-- banco, e o FALLBACK ordinal das RPCs (posicao == inteligencia_id) preencheria
-- as posições faltantes com a Casa de mesmo número — podendo fazer a trilha
-- VISITAR UMA CASA 2x e pular outra. Portanto, quando a UI v2 de ordenação for
-- construída, ela DEVE gravar as 8 posições ATOMICAMENTE (permutação completa 1..8)
-- ou validar completude/permutação antes de confirmar. Enquanto isso, a única
-- ordem segura para produção é a ORDEM-PADRÃO CANÔNICA completa (função abaixo).
-- =============================================================

CREATE TABLE IF NOT EXISTS public.turma_fase_ordem (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  turma_id       uuid NOT NULL REFERENCES public.turmas(id)       ON DELETE CASCADE,
  ano_letivo     smallint NOT NULL,
  posicao        smallint NOT NULL CHECK (posicao BETWEEN 1 AND 8),        -- ordinal na trilha da turma
  inteligencia_id smallint NOT NULL REFERENCES public.inteligencias(id),   -- a Casa percorrida nessa posição
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT turma_fase_ordem_pos_unica  UNIQUE (turma_id, ano_letivo, posicao),
  CONSTRAINT turma_fase_ordem_intel_unica UNIQUE (turma_id, ano_letivo, inteligencia_id)
);

CREATE INDEX IF NOT EXISTS idx_turma_fase_ordem_turma_ano
  ON public.turma_fase_ordem (turma_id, ano_letivo);

DROP TRIGGER IF EXISTS update_turma_fase_ordem_updated_at ON public.turma_fase_ordem;
CREATE TRIGGER update_turma_fase_ordem_updated_at
  BEFORE UPDATE ON public.turma_fase_ordem
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.turma_fase_ordem ENABLE ROW LEVEL SECURITY;

-- SELECT: educadores (professor) e admin da instituição. Aluno NUNCA (sem policy que o alcance).
DROP POLICY IF EXISTS "Ordem visivel educadores" ON public.turma_fase_ordem;
CREATE POLICY "Ordem visivel educadores" ON public.turma_fase_ordem FOR SELECT TO public
USING (
  institution_id = get_user_institution_id()
  AND (has_role(auth.uid(), 'professor'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

-- ESCRITA (definir/reordenar as Casas): tier "coordenador/admin".
-- NOTA DE ESCOPO (levar ao Fundador): NÃO existe hoje um app_role 'coordenador'
-- de EDUCADOR no banco (o enum app_role = admin | user | professor | super_admin;
-- 'coordenador' hoje é um CARGO DE ALUNO em cargos_casa). Enquanto o papel de
-- coordenador-educador não for modelado, a escrita fica com admin (a escola).
-- Ver "pontos para o Fundador" no relatório de Engenharia.
DROP POLICY IF EXISTS "Ordem gerenciada por admin" ON public.turma_fase_ordem;
CREATE POLICY "Ordem gerenciada por admin" ON public.turma_fase_ordem FOR ALL TO public
USING (
  institution_id = get_user_institution_id()
  AND has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  institution_id = get_user_institution_id()
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- =============================================================
-- Seed da ORDEM-PADRÃO CANÔNICA (posicao == inteligencia_id, 1..8) para uma
-- turma que ainda não tem ordem. Garante que o início da trilha NUNCA trava
-- por falta de configuração. Idempotente: só insere posições faltantes.
-- SECURITY DEFINER para poder ser chamada por qualquer educador autorizado
-- sem depender da policy de escrita.
-- =============================================================
CREATE OR REPLACE FUNCTION public.aplicar_ordem_padrao_turma(p_turma_id uuid, p_ano smallint DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_inst uuid;
  v_ano  smallint := COALESCE(p_ano, EXTRACT(YEAR FROM now())::smallint);
BEGIN
  SELECT institution_id INTO v_inst FROM turmas WHERE id = p_turma_id;
  IF v_inst IS NULL THEN
    RAISE EXCEPTION 'Turma % nao encontrada', p_turma_id;
  END IF;

  INSERT INTO turma_fase_ordem (institution_id, turma_id, ano_letivo, posicao, inteligencia_id)
  SELECT v_inst, p_turma_id, v_ano, g.n, g.n
  FROM generate_series(1, 8) AS g(n)
  ON CONFLICT (turma_id, ano_letivo, posicao) DO NOTHING;
END $$;

GRANT EXECUTE ON FUNCTION public.aplicar_ordem_padrao_turma(uuid, smallint) TO authenticated;
