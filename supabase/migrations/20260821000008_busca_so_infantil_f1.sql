-- ============================================================
-- A BUSCA SO' ENXERGA QUEM TEM QUESTIONARIO
--
-- Decisao do Fundador em 21/08: o envio as familias comeca pelo Infantil e pelo
-- Fundamental 1. O 6o ao 9o ano fica de fora ate' ter perguntas proprias.
--
-- Entao o nome de quem nao tem questionario NAO APARECE na busca. Duas coisas
-- boas de uma vez:
--
--  1. O pai do 6o ao 9o nao consegue abrir um questionario que nao e' do filho
--     dele. O buraco existia: faixa nula caia num padrao e ele leria as
--     perguntas do Maternal 2.
--
--  2. A superficie publica encolhe em 160 criancas. A busca por nome e' a unica
--     porta aberta do Arboria, e nela vale a regra de sempre: se um dado nao
--     precisa estar do lado de fora hoje, ele nao fica.
--
-- Quando o F2 tiver questionario, e' so' acrescentar as series aqui.
-- ============================================================

create or replace function public.procurar_criancas(p_termo text)
returns table (aluno_id uuid, nome_completo text, turma text, sexo text)
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_limpo text;
begin
  -- Piso de quatro letras. Com menos, nao busca nada: sem ele, digitar "a"
  -- devolveria a escola inteira e o campo viraria um catalogo.
  if coalesce(length(trim(p_termo)), 0) < 4 then
    return;
  end if;

  v_limpo := lower(translate(trim(p_termo),
    'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑáàâãäéèêëíìîïóòôõöúùûüçñ',
    'AAAAAEEEEIIIIOOOOOUUUUCNaaaaaeeeeiiiiooooouuuucn'));

  return query
  select p.id, p.full_name, t.nome, p.sexo
    from public.profiles p
    join public.aluno_turma at on at.aluno_id = p.id and at.ativo and at.ano_letivo = 2026
    join public.turmas t on t.id = at.turma_id
   where t.serie in ('Maternal 2','Maternal 3','Grupo IV','Grupo V',
                     '1º Ano','2º Ano','3º Ano','4º Ano','5º Ano')
     and (
       select bool_and(
         position(tok in lower(translate(p.full_name,
           'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑáàâãäéèêëíìîïóòôõöúùûüçñ',
           'AAAAAEEEEIIIIOOOOOUUUUCNaaaaaeeeeiiiiooooouuuucn'))) > 0)
       from unnest(string_to_array(v_limpo, ' ')) as tok
       where tok <> ''
     )
   order by p.full_name
   limit 8;
end $$;

revoke all on function public.procurar_criancas(text) from public;
grant execute on function public.procurar_criancas(text) to anon, authenticated;

-- --------------------------------------------------------------- conferencia
select 'Clarice, 2o ano (tem que achar)' as teste, count(*) as achou
  from public.procurar_criancas('clarice gomes')
union all
select 'alguem do 9o ano (tem que dar zero)', count(*)
  from public.procurar_criancas(
    (select split_part(p.full_name,' ',1) || ' ' || split_part(p.full_name,' ',2)
       from public.profiles p
       join public.aluno_turma at on at.aluno_id=p.id and at.ativo and at.ano_letivo=2026
       join public.turmas t on t.id=at.turma_id
      where t.serie='9º Ano' limit 1));
