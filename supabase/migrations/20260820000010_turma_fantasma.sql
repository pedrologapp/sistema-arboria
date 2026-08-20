-- ============================================================
-- A TURMA FANTASMA "1º Anoo A"
--
-- Apareceu em 20/08 ao cadastrar um aluno do 1o ano. Duas coisas se somaram:
--
-- 1. O NOME. ensure_turma_exists monta o nome assim, fora do Infantil:
--
--       v_nome := p_serie || 'o ' || letra
--
--    Isso supoe que a serie e' so o numero ("1" vira "1o A"). Mas serie e'
--    gravada como "1º Ano", entao sai "1º Anoo A".
--
-- 2. O SEGMENTO. A busca por turma existente casa por serie E SEGMENTO, e o
--    gatilho passa COALESCE(NEW.segmento, 'fundamental2'). Um aluno de 1o ano
--    sem segmento vira fundamental2, nao acha a turma real (que e'
--    fundamental1), e a funcao CRIA outra.
--
-- Ou seja: o defeito nao e' de digitacao, e' de suposicao. Ele estava dormindo
-- e so' acorda quando alguem grava perfil de aluno sem segmento, que e' o que
-- acontece em cadastro manual e em importacao.
--
-- Aqui: o aluno volta para a turma certa, a fantasma some, e a funcao passa a
-- montar o nome sem supor formato de serie.
-- ============================================================

-- ------------------------------------------------- 1. o aluno volta para casa
update public.aluno_turma at
   set ativo = false, data_saida = current_date,
       motivo_saida = 'Turma fantasma criada por gatilho (ver 20260820000010)'
  from public.turmas t
 where t.id = at.turma_id and t.nome = '1º Anoo A';

-- ------------------------------------------------------- 2. some a fantasma
-- So' apaga se ninguem mais depender dela. Turma com observacao ou entrega
-- atrelada nunca e' deletada: seria apagar historico de crianca.
delete from public.aluno_turma at
 using public.turmas t
 where t.id = at.turma_id and t.nome = '1º Anoo A';

delete from public.turmas t
 where t.nome = '1º Anoo A'
   and not exists (select 1 from public.aluno_turma at where at.turma_id = t.id)
   and not exists (select 1 from public.arboria_observacoes o where o.turma_id = t.id);

-- --------------------------------------------------------- 3. a funcao certa
CREATE OR REPLACE FUNCTION public.ensure_turma_exists(
  p_institution_id uuid, p_serie text, p_turma_letra text,
  p_ano_letivo smallint, p_segmento text DEFAULT 'fundamental2'::text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_turma_id uuid;
  v_nome text;
BEGIN
  -- Procura primeiro SEM amarrar segmento. O segmento chega errado com
  -- frequencia (o gatilho usa 'fundamental2' como padrao), e amarrar por ele
  -- fazia a funcao nao enxergar a turma que existia e criar uma paralela.
  SELECT id INTO v_turma_id
    FROM public.turmas
   WHERE institution_id = p_institution_id
     AND serie = p_serie
     AND UPPER(TRIM(turma_letra)) = UPPER(TRIM(p_turma_letra))
     AND ano_letivo = p_ano_letivo
   ORDER BY (segmento = p_segmento) DESC
   LIMIT 1;

  IF v_turma_id IS NOT NULL THEN
    RETURN v_turma_id;
  END IF;

  -- O nome nao supoe mais o formato da serie. Se ela for so' o numero, vira
  -- "1º Ano A"; se ja' vier escrita ("1º Ano", "Grupo IV"), so' recebe a letra.
  IF p_serie ~ '^[0-9]+$' THEN
    v_nome := p_serie || 'º Ano ' || UPPER(TRIM(p_turma_letra));
  ELSE
    v_nome := TRIM(p_serie) || ' ' || UPPER(TRIM(p_turma_letra));
  END IF;

  INSERT INTO public.turmas (institution_id, nome, serie, turma_letra, ano_letivo, segmento)
  VALUES (p_institution_id, v_nome, p_serie,
          UPPER(TRIM(p_turma_letra)), p_ano_letivo, p_segmento)
  RETURNING id INTO v_turma_id;

  RETURN v_turma_id;
END $$;

-- --------------------------------------------------------------- conferencia
select p.full_name, t.nome as turma, t.segmento, at.ativo
  from public.profiles p
  join public.aluno_turma at on at.aluno_id = p.id
  join public.turmas t on t.id = at.turma_id
 where p.matricula_externa = '1893.2022';
