-- =============================================================
-- GO-LIVE F2 - torna o ASSIGNED-only EFETIVO.
-- APLICAR JUNTO com a virada do flag F2_REFORMA_ATIVA. Depende da Migration 1
-- (20260710000001) e de professor_casa_turma JA POPULADA pela aba Casas.
--
-- Dropa as policies institution-wide de mentor (R18, mig 20260302202306) em
-- observacoes e aluno_turma. A partir daqui, mentor F2 le SO as turmas atribuidas.
--
-- entregas / entrega_arquivos: institution-wide da mesma 20260302202306 NAO sao
-- tocadas aqui (exigem policies assigned proprias, ainda nao desenhadas). Follow-up.
--
-- NAO APLICAR ANTES DO GO-LIVE: dropar a R18 fora da virada regride o F2 antigo
-- (cada professor cai em 1/8 da turma). O guard abaixo se recusa a rodar se
-- houver mentor sem turma atribuida.
-- =============================================================

-- ---------- GUARD: recusa rodar se algum mentor esta sem turma atribuida ----------
DO $$
DECLARE
  v_faltando int;
BEGIN
  SELECT count(*) INTO v_faltando
  FROM public.professor_casa pc
  WHERE pc.ativo = true
    AND NOT EXISTS (
      SELECT 1 FROM public.professor_casa_turma pct
      WHERE pct.professor_id = pc.professor_id
        AND pct.ano_letivo   = pc.ano_letivo
        AND pct.ativo = true
    );
  IF v_faltando > 0 THEN
    RAISE EXCEPTION 'Go-live abortado: % mentor(es) com professor_casa ativo SEM turma em professor_casa_turma. Complete a atribuicao na aba Casas (ou desative os vinculos legados) antes de dropar a R18.', v_faltando;
  END IF;
END $$;

-- ---------- Drop R18 observacoes (as duas variantes de acento) ----------
DROP POLICY IF EXISTS "Mentores veem observações da instituição" ON public.observacoes;
DROP POLICY IF EXISTS "Mentores veem observacoes da instituicao" ON public.observacoes;

-- ---------- Drop institution-wide de aluno_turma (mesma 20260302202306) ----------
DROP POLICY IF EXISTS "Mentores veem aluno_turma da instituição" ON public.aluno_turma;
DROP POLICY IF EXISTS "Mentores veem aluno_turma da instituicao" ON public.aluno_turma;

-- Pos-condicao: mentor F2 le observacoes/aluno_turma SO via as policies assigned
-- da Migration 1. Infantil/F1 (professor_turma / get_professor_turma_ids) e as
-- policies base (propria, casa, admin, aluno self) seguem intactas.
