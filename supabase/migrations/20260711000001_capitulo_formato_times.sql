-- =============================================================
-- CAPÍTULO: formato TIMES (Arena / Musical) - F2, atrás do flag.
--
-- CONTEXTO: hoje capitulo_papeis modela o formato "A Grande Assembleia"
-- (categoria mesa|mediador|observatorio|delegacao). A reforma do F2 traz um
-- SEGUNDO formato de capítulo: TIMES alocáveis (Arena = 8 temas; Musical = 4
-- frentes). Um "time" é, na prática, um papel ao qual o mentor aloca alunos
-- diretamente - exatamente como já acontece com mesa/mediador/observatorio.
--
-- DECISÃO DE MODELO (Opção A do parecer): reaproveitar capitulo_papeis com uma
-- NOVA categoria 'time', em vez de criar tabela nova ou reusar delegações.
--   . Zero tabelas novas: capitulo_papeis + capitulo_alocacoes já são "unidade
--     alocável + alocação". Um tema/frente é isso.
--   . A regra "1 frente por aluno" JÁ é imposta pelo trigger
--     validar_capitulo_alocacao() (categoria <> 'delegacao' => aluno não acumula
--     outro papel). Ou seja, "um aluno em um único tema/frente" sai de graça.
--   . Sem fricção de ativação por turma (delegações exigem delegacoes_ativas;
--     os 8 temas da Arena estão sempre todos disponíveis).
--   . A constraint capitulo_papeis_delegacao_consistencia JÁ aceita 'time'
--     (categoria <> 'delegacao' => delegacao IS NULL). Só o CHECK de categoria
--     precisa passar a aceitar 'time'.
--
-- DIVIDIR UM TEMA EM 2 GRUPOS (Arena): capitulo_alocacoes.grupo (1 ou 2) marca,
-- por aluno, em qual subgrupo ele está dentro do tema. capitulo_turma_config
-- .times_divididos guarda QUAIS times o mentor dividiu naquela turma (para o
-- estado "dividido" sobreviver ao reload mesmo com todos ainda no grupo 1).
--
-- ADITIVO: nenhuma coluna/linha existente é alterada ou removida. A Grande
-- Assembleia (Interpessoal) e o formato Intrapessoal seguem intactos.
--
-- >>> NÃO APLICADA AINDA <<< aguarda "pode aplicar" do Fundador. O seed dos
-- 2 capítulos (20260711000002) depende DESTA migration (categoria 'time').
-- =============================================================

-- ---------------------------------------------
-- 1. capitulo_papeis.categoria: passa a aceitar 'time'
--    (o CHECK inline original foi nomeado pelo Postgres como
--     capitulo_papeis_categoria_check)
-- ---------------------------------------------
ALTER TABLE public.capitulo_papeis
  DROP CONSTRAINT IF EXISTS capitulo_papeis_categoria_check;

ALTER TABLE public.capitulo_papeis
  ADD CONSTRAINT capitulo_papeis_categoria_check
  CHECK (categoria IN ('mesa','mediador','observatorio','delegacao','time'));

-- capitulo_papeis_delegacao_consistencia NÃO muda: 'time' é categoria <>
-- 'delegacao', logo já exige delegacao IS NULL. (deixado explícito no comentário)

-- ---------------------------------------------
-- 2. capitulo_alocacoes.grupo: subgrupo (1 ou 2) dentro de um time
--    Default 1 = time não dividido / grupo A.
-- ---------------------------------------------
ALTER TABLE public.capitulo_alocacoes
  ADD COLUMN IF NOT EXISTS grupo smallint NOT NULL DEFAULT 1;

ALTER TABLE public.capitulo_alocacoes
  DROP CONSTRAINT IF EXISTS capitulo_alocacoes_grupo_check;

ALTER TABLE public.capitulo_alocacoes
  ADD CONSTRAINT capitulo_alocacoes_grupo_check CHECK (grupo IN (1, 2));

-- ---------------------------------------------
-- 3. capitulo_turma_config.times_divididos: papel_ids marcados como divididos
--    naquela turma (jsonb array de uuid em texto). Default vazio.
-- ---------------------------------------------
ALTER TABLE public.capitulo_turma_config
  ADD COLUMN IF NOT EXISTS times_divididos jsonb NOT NULL DEFAULT '[]'::jsonb;

-- RLS: nada a fazer. As policies existentes de capitulo_papeis /
-- capitulo_alocacoes / capitulo_turma_config cobrem as novas colunas e a nova
-- categoria (são por linha/tabela, não por coluna).

-- =============================================================
-- ROLLBACK (testado mentalmente; reverte 100% desta migration)
-- Só é seguro se NÃO houver dados 'time' em uso. Rode o seed inverso antes se
-- já existirem capítulos no formato times.
-- -------------------------------------------------------------
-- ALTER TABLE public.capitulo_turma_config DROP COLUMN IF EXISTS times_divididos;
-- ALTER TABLE public.capitulo_alocacoes DROP CONSTRAINT IF EXISTS capitulo_alocacoes_grupo_check;
-- ALTER TABLE public.capitulo_alocacoes DROP COLUMN IF EXISTS grupo;
-- ALTER TABLE public.capitulo_papeis DROP CONSTRAINT IF EXISTS capitulo_papeis_categoria_check;
-- ALTER TABLE public.capitulo_papeis
--   ADD CONSTRAINT capitulo_papeis_categoria_check
--   CHECK (categoria IN ('mesa','mediador','observatorio','delegacao'));
-- =============================================================
