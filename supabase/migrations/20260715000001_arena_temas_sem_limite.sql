-- =============================================================
-- ARENA ARBORIA: temas SEM LIMITE de alunos (F2, formato times).
--
-- CONTEXTO: o seed 20260711000002 criou os 8 temas da Arena com
-- vagas_por_turma = 8. Na primeira aula real (15/07/2026) o Fundador bateu
-- nesse teto: um tema pode receber a turma inteira, e a divisao em grupos
-- (capitulo_alocacoes.grupo) e' que organiza quem fica com quem. O limite por
-- tema nao faz sentido aqui.
--
-- DECISAO (Fundador): tema sem limite. O codigo (F2CapituloPage) ja trata
-- vagas_por_turma > 30 como ILIMITADO (mostra "N alocados" em vez de "N de 8" e
-- nunca marca o tema como cheio). Entao basta subir o teto das linhas que ja
-- existem para 99 -> teto pratico inatingivel numa turma (aditivo, so muda um
-- valor de config; nenhuma coluna/linha nova, nenhum dado de aluno tocado).
--
-- ESCOPO: SO a Arena (fase 7f11984c-...). O "Nao Tao Show" musical (frentes,
-- fase 7b1e53f5-...) fica intacto; se o Fundador quiser o mesmo la, e' trocar
-- o fase_id abaixo.
--
-- >>> NAO APLICADA AINDA <<< aguarda "pode aplicar" do Fundador (testa no
-- localhost primeiro).
-- =============================================================

UPDATE public.capitulo_papeis
SET vagas_por_turma = 99
WHERE categoria = 'time'
  AND capitulo_id IN (
    SELECT id FROM public.capitulos
    WHERE fase_id = '7f11984c-52cd-4d8d-b41a-910886771bce'
  );

-- =============================================================
-- ROLLBACK (volta ao teto original de 8 nos temas da Arena):
-- -------------------------------------------------------------
-- UPDATE public.capitulo_papeis
-- SET vagas_por_turma = 8
-- WHERE categoria = 'time'
--   AND capitulo_id IN (
--     SELECT id FROM public.capitulos
--     WHERE fase_id = '7f11984c-52cd-4d8d-b41a-910886771bce'
--   );
-- =============================================================
