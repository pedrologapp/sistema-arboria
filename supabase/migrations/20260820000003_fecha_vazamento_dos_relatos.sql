-- ============================================================
-- VAZAMENTO: QUALQUER ALUNO LIA O RELATO DE TODOS OS OUTROS
--
-- Encontrado em 20/08 ao testar a RLS simulando uma aluna do 9o ano: ela
-- enxergava os 15 relatos da escola inteira, e nao so' o dela.
--
-- A causa: a politica "Todos veem problemas", para o papel public, com
-- USING (true). Ela e' permissiva, e politica permissiva se soma, entao
-- qualquer regra restritiva escrita depois nao tem efeito nenhum.
--
-- O que estava exposto nao era detalhe tecnico. Era, entre outras coisas, uma
-- aluna do 7o ano escrevendo "estresse demais e estou tentando me controlar",
-- legivel por qualquer colega que soubesse consultar. Isso e' dado sensivel de
-- menor, e o canal foi criado justamente para ser privado.
--
-- Havia mais duas frouxas na mesma tabela:
--   - UPDATE liberado para public com USING (true): qualquer aluno logado podia
--     marcar como resolvido, ou reescrever o texto do relato de outro.
--   - INSERT com WITH CHECK (true): dava para gravar um relato assinado por
--     outro aluno, porque nada obrigava aluno_id a ser o proprio.
--
-- As tres estao fechadas aqui. Nada e' apagado: so' quem enxerga muda.
-- ============================================================

-- ------------------------------------------------------------------ leitura
drop policy if exists "Todos veem problemas" on public.problemas_alunos;

-- A do aluno ja' existe (criada em 20260820000001), mas fica aqui de novo para
-- este arquivo poder ser lido sozinho daqui a um ano.
drop policy if exists "Aluno le os proprios relatos" on public.problemas_alunos;
create policy "Aluno le os proprios relatos"
on public.problemas_alunos for select to authenticated
using (aluno_id = auth.uid());

drop policy if exists "Admin le todos os relatos" on public.problemas_alunos;
create policy "Admin le todos os relatos"
on public.problemas_alunos for select to authenticated
using (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  or public.has_role(auth.uid(), 'super_admin'::public.app_role)
);

-- ------------------------------------------------------------------ escrita
-- O aluno so' grava relato assinado por ele mesmo.
drop policy if exists "Aluno insere problema" on public.problemas_alunos;
create policy "Aluno insere problema"
on public.problemas_alunos for insert to authenticated
with check (aluno_id = auth.uid());

-- So' quem responde marca como resolvido. O aluno nao mexe no proprio relato:
-- se ele quiser corrigir alguma coisa, escreve outra mensagem na conversa, e
-- assim o que foi dito antes nao some.
drop policy if exists "Admin atualiza problema" on public.problemas_alunos;
create policy "Admin atualiza problema"
on public.problemas_alunos for update to authenticated
using (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  or public.has_role(auth.uid(), 'super_admin'::public.app_role)
);

-- --------------------------------------------------------------- conferencia
-- Simula a aluna do 9o ano de novo: tem que ver 1 relato, e nao 15.
set local role authenticated;
set local request.jwt.claims = '{"sub":"e1682066-1124-404c-b856-b4bf30a36bb3","role":"authenticated"}';
select (select count(*) from public.problemas_alunos)   as relatos_que_ela_ve,
       (select count(*) from public.problema_mensagens) as mensagens_que_ela_ve;
