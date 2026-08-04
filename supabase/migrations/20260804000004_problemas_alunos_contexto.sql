-- ============================================================
-- Rastreabilidade dos relatos de problema (pedido do Fundador, 04/08/2026).
--
-- A tabela problemas_alunos já existia, mas guardava só o texto do aluno. Numa
-- entrega que falha, o texto sozinho ("não consegui enviar") não permite achar
-- a causa. O campo contexto carrega o técnico junto: em qual missão o aluno
-- estava, a rota, o grupo, o navegador e o último erro que a tela mostrou.
--
-- Nada aqui é dado novo sobre a criança: é o estado do app no momento da falha.
-- ============================================================
ALTER TABLE public.problemas_alunos
  ADD COLUMN IF NOT EXISTS contexto jsonb;

COMMENT ON COLUMN public.problemas_alunos.contexto IS
  'Estado do app quando o aluno relatou: {missao_id, missao_titulo, rota, grupo_ref, ultimo_erro, user_agent, tela}. Preenchido pelo app, nunca digitado pelo aluno.';

-- Ajuda a listar os relatos abertos em ordem no painel /arboria.
CREATE INDEX IF NOT EXISTS problemas_alunos_abertos_idx
  ON public.problemas_alunos (resolvido, created_at DESC);
