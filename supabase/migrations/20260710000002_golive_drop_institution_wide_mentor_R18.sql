-- =============================================================
-- GO-LIVE F2 - torna o ASSIGNED-only REALMENTE efetivo.
-- APLICAR JUNTO com a virada do flag F2_REFORMA_ATIVA. Depende da Migration 1
-- (20260710000001) e de professor_casa_turma JA POPULADA pela aba Casas.
--
-- CORRECAO POS-QA (08/07/2026): dropar SO a R18 NAO tornava o assigned-only
-- efetivo. Havia TRES policies casa-wide pre-existentes, permissivas (OR), que
-- mantinham o mentor F2 lendo TODA crianca da sua Casa na instituicao inteira
-- (match por profiles.casa_id, SEM recorte de turma), inclusive turmas que ele
-- NAO conduz:
--   1. observacoes  "Professor ve observacoes da sua casa"     (mig 20260108195404)
--   2. aluno_turma  "Professores veem aluno_turma da sua casa" (mig 20260107204528)
--   3. profiles     "Professores veem alunos da sua casa"      (mig 20260107204528)
-- Esta migration dropa a R18 (observacoes + aluno_turma) E essas tres. SO depois
-- de TODAS caidas o unico caminho de leitura do mentor F2 passa a ser as policies
-- ASSIGNED da Migration 1 (get_mentor_turma_ids / professor_casa_turma) + as suas
-- proprias (autoria) + admin.
--
-- SEGURO PARA INFANTIL/F1: as tres casa-wide exigem que o LEITOR tenha linha em
-- professor_casa (construto F2-only). Infantil/F1 leem por outro caminho, intacto:
--   - aluno_turma: "Professores veem aluno_turma das suas turmas vinculadas"
--                  (professor_turma / get_professor_turma_ids, mig 20260129033238)
--   - observacoes: "Professor ve proprias observacoes" (professor_id = auth.uid();
--                  no Infantil/F1 o proprio professor e o autor de todo registro)
--   - profiles:    "Usuarios veem perfis da mesma instituicao" (institution-wide,
--                  mig 20260109203426), que vale para TODO autenticado da instituicao.
--
-- RESSALVA (follow-up Riscos, NAO fecha aqui): dropar a casa-wide de PROFILES NAO
-- restringe nomes por si so, porque a policy institution-wide de profiles
-- (20260109203426) segue viva e ja expoe todos os perfis da instituicao a qualquer
-- autenticado. Assigned-only de verdade em profiles/nomes exigiria estreitar AQUELA
-- policy: fora do escopo deste go-live. O dado sensivel (a observacao longitudinal)
-- FICA assigned aqui; profiles carrega nome/serie/turma, nao a observacao.
--
-- entregas / entrega_arquivos: institution-wide da mesma 20260302202306 NAO sao
-- tocadas aqui (exigem policies assigned proprias, ainda nao desenhadas). Follow-up.
--
-- NAO APLICAR ANTES DO GO-LIVE: dropar estas policies fora da virada regride o F2
-- antigo (cada mentor cai em 1/8 -> so as proprias). O guard abaixo se recusa a
-- rodar se houver mentor com professor_casa ativo SEM turma em professor_casa_turma.
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
    RAISE EXCEPTION 'Go-live abortado: % mentor(es) com professor_casa ativo SEM turma em professor_casa_turma. Complete a atribuicao na aba Casas (ou desative os vinculos legados) antes de dropar as policies institution/casa-wide.', v_faltando;
  END IF;
END $$;

-- ---------- Drop R18 institution-wide (mig 20260302202306) ----------
-- (nomes gravados no banco podem estar sem acento: dropar as duas variantes)
DROP POLICY IF EXISTS "Mentores veem observações da instituição" ON public.observacoes;
DROP POLICY IF EXISTS "Mentores veem observacoes da instituicao" ON public.observacoes;
DROP POLICY IF EXISTS "Mentores veem aluno_turma da instituição" ON public.aluno_turma;
DROP POLICY IF EXISTS "Mentores veem aluno_turma da instituicao" ON public.aluno_turma;

-- ---------- Drop casa-wide de OBSERVACOES (mig 20260108195404) ----------
-- Gate: leitor com linha em professor_casa (F2-only) + match profiles.casa_id, SEM
-- turma. Esta era a fuga real da HISTORIA da crianca. Infantil/F1 nao a usam (leem
-- as proprias observacoes via autoria).
DROP POLICY IF EXISTS "Professor vê observações da sua casa" ON public.observacoes;
DROP POLICY IF EXISTS "Professor ve observacoes da sua casa" ON public.observacoes;

-- ---------- Drop casa-wide de ALUNO_TURMA (mig 20260107204528) ----------
-- Gate: professor_casa (F2-only) + match aluno.casa_id, SEM turma. Infantil/F1 leem
-- aluno_turma pela policy de professor_turma (get_professor_turma_ids), intacta.
DROP POLICY IF EXISTS "Professores veem aluno_turma da sua casa" ON public.aluno_turma;
DROP POLICY IF EXISTS "Professores vêem aluno_turma da sua casa" ON public.aluno_turma;

-- ---------- Drop casa-wide de PROFILES (mig 20260107204528) ----------
-- Remove o acoplamento a casa (defesa em profundidade). NAO restringe nomes por si
-- so: ver RESSALVA no cabecalho (institution-wide de profiles segue viva). Infantil/
-- F1 e o proprio F2 leem perfis pela institution-wide, entao dropar aqui nao regride.
DROP POLICY IF EXISTS "Professores veem alunos da sua casa" ON public.profiles;
DROP POLICY IF EXISTS "Professores vêem alunos da sua casa" ON public.profiles;

-- ---------- Pos-condicao (leitura do mentor F2) ----------
-- observacoes: SELECT do mentor F2 = "Professor ve proprias observacoes" (autoria)
--   + "Mentor F2 ve observacoes das turmas que conduz" (assigned, Migration 1).
--   Nenhum caminho casa/institution-wide de professor sobra. Admin intacto.
-- aluno_turma: mentor F2 = "Mentor F2 ve aluno_turma das turmas que conduz"
--   (assigned). Infantil/F1 = professor_turma. Aluno = self. Admin intacto.
-- profiles: segue institution-wide (follow-up Riscos, fora do go-live).
-- entregas / entrega_arquivos: institution-wide ainda de pe (follow-up).
