-- ============================================================
-- O SEXO NA BUSCA, PARA O BOTAO DIZER "E ELA"
--
-- Na porta, depois de escolher a crianca, o botao dizia "E ele(a)". A mae de
-- uma menina lia o parenteses e sentia que o sistema nao sabia de quem estava
-- falando, tres telas depois de ele ter dito que queria conhecer a filha dela.
-- O questionario inteiro ja flexiona pelo cadastro; faltava a porta.
--
-- O QUE MUDA NA EXPOSICAO: a busca passa a devolver uma coluna a mais. E' o
-- menor incremento possivel sobre o que ela ja entregava, porque nome proprio
-- brasileiro ja diz o sexo na quase totalidade dos casos, e turma tambem nao
-- e' segredo depois do nome. O que continua fechado e' o que importa: serie,
-- faixa e o id que abre um envio seguem so' em confirmar_crianca, atras da data
-- de nascimento.
--
-- Crianca sem sexo cadastrado devolve null, e ai o botao fica como estava. Feio,
-- e honesto: melhor o parenteses do que chutar o genero da filha de alguem.
-- ============================================================

drop function if exists public.procurar_criancas(text);

create function public.procurar_criancas(p_termo text)
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
   where (
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

select nome_completo, turma, coalesce(sexo, 'sem cadastro') as sexo
  from public.procurar_criancas('clarice');
