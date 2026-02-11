ALTER TABLE public.fases DROP CONSTRAINT fases_institution_id_ano_letivo_numero_fase_key;
ALTER TABLE public.fases ADD CONSTRAINT fases_institution_id_ano_letivo_segmento_serie_numero_fase_key 
  UNIQUE (institution_id, ano_letivo, segmento, serie, numero_fase);