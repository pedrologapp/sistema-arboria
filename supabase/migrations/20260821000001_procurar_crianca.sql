-- ============================================================
-- A BUSCA POR NOME NA PORTA DA FAMILIA
--
-- O Fundador pediu (21/08) que o pai digite o nome e veja a crianca aparecer
-- para escolher, e so' depois informe a data de nascimento. E' mais facil de
-- usar do que acertar o nome completo de cabeca, e para 500 familias no celular
-- essa diferenca decide quantas respondem.
--
-- O QUE ISSO ABRE, DITO SEM ENFEITE: a lista de alunos da escola passa a ser
-- pesquisavel por qualquer pessoa que tenha o link. Nome e turma de crianca sao
-- dado pessoal de menor. Antes disso nao existia nenhuma superficie assim.
--
-- O QUE SEGURA:
--
--  1. PISO DE QUATRO LETRAS. Com menos, nao busca nada. Sem o piso, digitar "a"
--     devolveria a escola inteira e o campo viraria um catalogo.
--
--  2. TETO DE OITO. Quem procura o proprio filho acha nos primeiros; quem
--     estivesse raspando a base teria que adivinhar prefixo por prefixo.
--
--  3. A DATA CONTINUA SENDO A CHAVE. Achar o nome NAO da acesso a nada: nem ao
--     questionario, nem a serie, nem ao sexo, nem ao id que abre um envio. Isso
--     so' vem de confirmar_crianca, e ela exige a data de nascimento correta.
--     A busca devolve o minimo para o pai reconhecer o filho: nome e turma.
--
-- Se um dia isso for demais, o caminho de volta e' curto: sobe o piso, ou troca
-- a ordem e pede a data antes do nome. A porta continua a mesma.
-- ============================================================

create or replace function public.procurar_criancas(p_termo text)
returns table (aluno_id uuid, nome_completo text, turma text)
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_limpo text;
begin
  if coalesce(length(trim(p_termo)), 0) < 4 then
    return;
  end if;

  v_limpo := lower(translate(trim(p_termo),
    'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑáàâãäéèêëíìîïóòôõöúùûüçñ',
    'AAAAAEEEEIIIIOOOOOUUUUCNaaaaaeeeeiiiiooooouuuucn'));

  return query
  select p.id, p.full_name, t.nome
    from public.profiles p
    join public.aluno_turma at on at.aluno_id = p.id and at.ativo and at.ano_letivo = 2026
    join public.turmas t on t.id = at.turma_id
   where (
     -- Cada palavra digitada precisa aparecer no nome. "ana ju" acha Ana Julia
     -- e nao acha Ana Beatriz.
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

-- ------------------------------------------------------------- a confirmacao
-- Aqui e' onde a porta abre de verdade. Recebe a crianca que o pai escolheu na
-- lista e a data que ele digitou, e so' devolve alguma coisa se as duas baterem.
-- E' esta funcao que entrega o que a busca esconde: id, serie, sexo e faixa.
create or replace function public.confirmar_crianca(p_aluno_id uuid, p_nascimento date)
returns table (
  aluno_id uuid, primeiro_nome text, nome_completo text,
  turma text, serie text, segmento text, sexo text, faixa text
)
language plpgsql
stable
security definer
set search_path to 'public'
as $$
begin
  if p_aluno_id is null or p_nascimento is null then
    return;
  end if;

  return query
  select
    p.id,
    coalesce(p.nome, split_part(p.full_name, ' ', 1)),
    p.full_name,
    t.nome,
    t.serie,
    t.segmento,
    p.sexo,
    case t.serie
      when 'Maternal 2' then 'm2'
      when 'Maternal 3' then 'm3'
      when 'Grupo IV'   then 'g4'
      when 'Grupo V'    then 'gv'
      when '1º Ano'     then 'a1'
      when '2º Ano'     then 'a2'
      when '3º Ano'     then 'a3'
      when '4º Ano'     then 'a4'
      when '5º Ano'     then 'a5'
      else null
    end
  from public.profiles p
  join public.aluno_turma at on at.aluno_id = p.id and at.ativo and at.ano_letivo = 2026
  join public.turmas t on t.id = at.turma_id
  where p.id = p_aluno_id
    and p.data_nascimento = p_nascimento
  limit 1;
end $$;

revoke all on function public.confirmar_crianca(uuid, date) from public;
grant execute on function public.confirmar_crianca(uuid, date) to anon, authenticated;

-- --------------------------------------------------------------- conferencia
select 'procurar "ana ju"' as teste, count(*) as achou from public.procurar_criancas('ana ju')
union all
select 'procurar "ana" (3 letras, tem que dar zero)', count(*) from public.procurar_criancas('ana')
union all
select 'procurar "a" (tem que dar zero)', count(*) from public.procurar_criancas('a');
