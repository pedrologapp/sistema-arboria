-- =============================================================
-- PALETA DAS CASAS: unifica na paleta da REFORMA (fonte unica da verdade).
--
-- PROBLEMA: hoje existem DUAS paletas de cor por Casa que divergem.
--   . Lado do ALUNO: le inteligencias.cor_hex (banco) -> paleta original.
--   . Lado do PROFESSOR (tela imersiva reformada): le COR_INTELIGENCIA em
--     src/config/f2Reforma.ts (hard-coded) -> paleta nova.
-- Resultado: a mesma Casa aparece com cores diferentes pro aluno e pro professor
-- (ex.: Musical roxo #8B5CF6 pro aluno, vinho #7F1D1D pro professor).
--
-- DECISAO (Fundador, 15/07/2026): a PALETA NOVA (a do codigo, f2Reforma.ts) e' a
-- oficial. Entao o banco passa a carregar exatamente esses valores, e o lado do
-- aluno adota a paleta nova. As duas telas passam a bater.
--
-- IMPACTO: cor_hex e' lida em todo o app do lado do aluno (tema, brasoes,
-- badges, views casa_cor). Esta migration muda a cor de quase todas as Casas
-- para o aluno. E' uma mudanca visual ampla, intencional.
--
-- Valores = espelho de COR_INTELIGENCIA (src/config/f2Reforma.ts). Se um dia a
-- paleta mudar, mude NOS DOIS lugares (aqui e no arquivo) para nao redivergir.
--
-- ADITIVO/REVERSIVEL: so troca um texto de cor em 8 linhas; nenhum schema, nenhum
-- dado de aluno. Rollback abaixo restaura a paleta original.
--
-- >>> NAO APLICADA AINDA <<< aguarda "pode aplicar" do Fundador (localhost 1o).
-- =============================================================

UPDATE public.inteligencias SET cor_hex = '#1E3A8A' WHERE id = 1; -- Linguistica
UPDATE public.inteligencias SET cor_hex = '#047857' WHERE id = 2; -- Logico-Matematica
UPDATE public.inteligencias SET cor_hex = '#7C3AED' WHERE id = 3; -- Espacial
UPDATE public.inteligencias SET cor_hex = '#7F1D1D' WHERE id = 4; -- Musical
UPDATE public.inteligencias SET cor_hex = '#B8860B' WHERE id = 5; -- Corporal-Cinestesica
UPDATE public.inteligencias SET cor_hex = '#78350F' WHERE id = 6; -- Naturalista
UPDATE public.inteligencias SET cor_hex = '#0891B2' WHERE id = 7; -- Interpessoal
UPDATE public.inteligencias SET cor_hex = '#EA580C' WHERE id = 8; -- Intrapessoal

-- =============================================================
-- ROLLBACK (restaura a paleta original do banco):
-- -------------------------------------------------------------
-- UPDATE public.inteligencias SET cor_hex = '#3B82F6' WHERE id = 1;
-- UPDATE public.inteligencias SET cor_hex = '#10B981' WHERE id = 2;
-- UPDATE public.inteligencias SET cor_hex = '#F59E0B' WHERE id = 3;
-- UPDATE public.inteligencias SET cor_hex = '#8B5CF6' WHERE id = 4;
-- UPDATE public.inteligencias SET cor_hex = '#EF4444' WHERE id = 5;
-- UPDATE public.inteligencias SET cor_hex = '#22C55E' WHERE id = 6;
-- UPDATE public.inteligencias SET cor_hex = '#EC4899' WHERE id = 7;
-- UPDATE public.inteligencias SET cor_hex = '#6366F1' WHERE id = 8;
-- =============================================================
