-- ============================================================
-- EVIDÊNCIA DE INTELIGÊNCIA SÓ NASCE DE ANÁLISE. (Ordem do Fundador, 10/08/2026)
--
-- O QUE ESTAVA ERRADO. O trigger processar_entrega_aprovada, a cada entrega
-- aprovada, inseria uma linha em inteligencia_evidencias afirmando que aquela
-- criança demonstrou uma inteligência. Só que ele NÃO LIA a resposta: escrevia
-- sempre v_aluno.casa_id, ou seja, a Casa em que a criança já estava.
--
-- Levantamento antes de apagar (10/08/2026):
--   - 34 linhas, 32 alunos, de 07/04 a 08/08.
--   - 34 de 34 vieram de entrega de missão. 0 vieram de observação de professor.
--   - 34 de 34 creditavam a PRÓPRIA CASA do aluno.
-- Era um espelho: o sistema repetia o rótulo que já existia e registrava a
-- repetição como prova. Contraria o princípio de que inteligência é mecanismo
-- lido no COMO, nunca rótulo confirmado por si mesmo.
--
-- Incoerência extra do mesmo trigger: o campo "tipo" comparava a inteligência da
-- FASE da missão com a Casa do aluno e carimbava 'missao_cross' ("Missão de outra
-- casa" na tela do aluno), enquanto a evidência era creditada na Casa dele. O
-- carimbo dizia uma coisa e o dado dizia outra. E missão sem fase vinculada não
-- gerava evidência nenhuma: mesmo aluno, mesmo esforço, resultado por acaso.
--
-- O QUE ESTA MIGRAÇÃO FAZ.
--   1. Guarda backup e apaga as 34 linhas.
--   2. Reescreve o trigger para NUNCA MAIS escrever evidência.
--   3. De agora em diante, quem escreve em inteligencia_evidencias é a análise da
--      IA da missão individual, com as inteligências que ela identificou pelo
--      mecanismo. A tabela continua existindo, vazia, esperando essa análise.
--
-- NÃO TOCA em pontos, entregas, notas, observações de professor nem scores.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. Backup completo (permite reverter linha a linha).
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public._bkp_20260810_evidencias_todas AS
SELECT * FROM public.inteligencia_evidencias;

-- ------------------------------------------------------------
-- 2. Limpa a tabela. Todas as linhas existentes são do tipo circular
--    descrito acima (conferido: nenhuma veio de observação).
-- ------------------------------------------------------------
DELETE FROM public.inteligencia_evidencias;

-- ------------------------------------------------------------
-- 3. Trigger sem a criação de evidência.
--    Mantém o lançamento de pontos da missão individual, que é legítimo:
--    uma entrega, um aluno, uma Casa.
--    Missão de entrega COLETIVA não concede ponto (decisão de 10/08): a
--    entrega do grupo é uma linha só, e premiaria apenas quem apertou enviar.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.processar_entrega_aprovada()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_missao RECORD;
  v_aluno RECORD;
  v_pontos_calculados SMALLINT;
BEGIN
  IF NEW.status = 'aprovada' AND (OLD.status IS NULL OR OLD.status <> 'aprovada') THEN
    SELECT m.* INTO v_missao FROM missoes m WHERE m.id = NEW.missao_id;

    -- Entrega coletiva nao pontua: o ponto cairia so em quem enviou.
    IF COALESCE(v_missao.entrega_coletiva, false) THEN
      NEW.pontos_concedidos := 0;
      RETURN NEW;
    END IF;

    SELECT p.*, COALESCE(s.ano_letivo_atual, 2025) AS ano_letivo INTO v_aluno
    FROM profiles p
    LEFT JOIN institution_settings s ON s.institution_id = p.institution_id
    WHERE p.id = NEW.aluno_id;

    v_pontos_calculados := ROUND((NEW.nota::DECIMAL / 10) * v_missao.pontos_base);
    NEW.pontos_concedidos := v_pontos_calculados;

    INSERT INTO pontos_gerais (
      institution_id, aluno_id, casa_id, tipo,
      missao_id, entrega_id, pontos, descricao,
      concedido_por, ano_letivo
    ) VALUES (
      v_missao.institution_id, NEW.aluno_id, v_aluno.casa_id, 'missao',
      NEW.missao_id, NEW.id, v_pontos_calculados,
      'Missao: ' || v_missao.titulo, NEW.avaliado_por, v_aluno.ano_letivo
    );

    -- NAO cria inteligencia_evidencias. Evidencia de mecanismo so nasce da
    -- analise da IA sobre a missao individual (decisao do Fundador, 10/08/2026).
  END IF;
  RETURN NEW;
END;
$function$;

COMMIT;
