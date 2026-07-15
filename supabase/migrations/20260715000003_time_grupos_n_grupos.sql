-- =============================================================
-- ARENA / formato TIMES: N GRUPOS por tema (antes travava em 2) + subtema.
--
-- CONTEXTO: 20260711000001 dividia um tema em EXATAMENTE 2 grupos
-- (capitulo_alocacoes.grupo CHECK IN (1,2)) e marcava o tema dividido numa lista
-- de papel_ids (capitulo_turma_config.times_divididos). O Fundador (15/07/2026,
-- testando a Arena da Casa Logica) pediu "criar mais um grupo": N grupos por
-- tema, cada grupo com um SUBTEMA que o grupo escolheu.
--
-- DECISAO (CEO, alinhado com o Fundador): a UX e' a da "Opcao B" (grupo com
-- identidade + subtema), mas o dado mora, POR ORA, na config de turma que ja
-- existe e ja tem RLS testada (capitulo_turma_config), em vez de uma tabela nova
-- com RLS nova no banco vivo. Motivo: o localhost le o banco de producao, e a
-- tabela propria so se justifica quando o chat do grupo (#4) for destravado e
-- passar por Riscos. Quando isso acontecer, promovemos config -> tabela.
--
-- Esta migration faz o MINIMO de schema:
--   1) solta o CHECK de capitulo_alocacoes.grupo (de "1 ou 2" para ">= 1"), pra
--      um aluno poder estar no grupo 3, 4, 5...
--   2) adiciona capitulo_turma_config.time_grupos (jsonb): por tema, a lista de
--      grupos { numero, subtema }. Ex.: { "<papel_id>": [ {"numero":1,"subtema":"torneio justo"}, {"numero":2,"subtema":null} ] }
--
-- ADITIVO: nenhuma coluna/linha removida. times_divididos continua existindo
-- (nao usado mais pela tela nova, mas intacto pra nao quebrar dado antigo).
-- RLS: nada a fazer. As policies de capitulo_alocacoes e capitulo_turma_config
-- ja cobrem a coluna nova e o novo intervalo de `grupo` (sao por linha/tabela).
--
-- >>> NAO APLICADA AINDA <<< aguarda "pode aplicar" do Fundador. Como o banco e'
-- o de producao, aplicar aqui muda a Arena real.
-- =============================================================

-- 1. capitulo_alocacoes.grupo: de "1 ou 2" para "qualquer grupo >= 1"
ALTER TABLE public.capitulo_alocacoes
  DROP CONSTRAINT IF EXISTS capitulo_alocacoes_grupo_check;

ALTER TABLE public.capitulo_alocacoes
  ADD CONSTRAINT capitulo_alocacoes_grupo_check CHECK (grupo >= 1);

-- 2. capitulo_turma_config.time_grupos: grupos (numero + subtema) por tema
ALTER TABLE public.capitulo_turma_config
  ADD COLUMN IF NOT EXISTS time_grupos jsonb NOT NULL DEFAULT '{}'::jsonb;

-- =============================================================
-- ROLLBACK (so seguro se nenhum tema tiver grupo > 2 em uso):
-- -------------------------------------------------------------
-- ALTER TABLE public.capitulo_turma_config DROP COLUMN IF EXISTS time_grupos;
-- ALTER TABLE public.capitulo_alocacoes DROP CONSTRAINT IF EXISTS capitulo_alocacoes_grupo_check;
-- ALTER TABLE public.capitulo_alocacoes
--   ADD CONSTRAINT capitulo_alocacoes_grupo_check CHECK (grupo IN (1, 2));
-- =============================================================
