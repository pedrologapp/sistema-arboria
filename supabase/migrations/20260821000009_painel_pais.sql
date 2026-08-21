-- ============================================================
-- O PAINEL DO QUESTIONARIO DOS PAIS
--
-- Pedido do Fundador no comeco de tudo: a lista de todas as criancas, quem ja
-- respondeu, quando, quantas vezes, e as respostas ao tocar no nome.
--
-- TRES DECISOES QUE VIERAM DO PRIMEIRO DIA NO AR, e nao do desenho:
--
-- 1. CONTA VOZ, NAO CRIANCA. Em tres horas, tres criancas ja tinham duas vozes:
--    mae e avo, mae e pai. Numa contagem de "respondeu sim ou nao" isso vira
--    uma linha so' e o que o instrumento tem de mais valioso some do painel.
--
-- 2. QUEM PAROU, E ONDE. Dezessete familias pararam no meio no primeiro dia, e
--    nao havia como saber se desistiram, foram interrompidas, ou se a tela
--    quebrou naquele aparelho. Saber em que pergunta cada uma parou e' o que
--    separa as tres coisas: desistencia se espalha, defeito se concentra.
--
-- 3. QUANTAS LETRAS. No primeiro dia a variacao foi de 7 a 1.050 letras por
--    envio. Quem escreveu 7 respondeu por educacao. Isso NAO e' nota da familia
--    e nao vira cobranca: e' aviso para a leitura, que precisa saber que aquele
--    relato nao sustenta hipotese nenhuma.
--
-- Devolve TAMBEM quem nao respondeu, com zero em tudo: e' a lista de quem ainda
-- falta, e sem ela o painel so' mostra quem ja veio.
-- ============================================================

create or replace function public.painel_questionario_pais(p_rodada text default 'agosto/2026')
returns table (
  aluno_id uuid,
  nome_completo text,
  turma text,
  serie text,
  vozes int,
  vozes_concluidas int,
  respondentes text[],
  letras int,
  acrescimos int,
  primeira timestamptz,
  ultima timestamptz,
  parou_na_pergunta int
)
language plpgsql
stable
security definer
set search_path to 'public'
as $$
begin
  -- Painel do dono da escola. Sem esta trava, uma funcao com dono viraria porta
  -- lateral para o relato que as familias escreveram contando que so o Arboria
  -- leria.
  if not (public.has_role(auth.uid(), 'admin'::public.app_role)
       or public.has_role(auth.uid(), 'super_admin'::public.app_role)) then
    raise exception 'sem permissao';
  end if;

  return query
  with alvo as (
    select p.id, p.full_name, t.nome as turma, t.serie
      from public.profiles p
      join public.aluno_turma at on at.aluno_id = p.id and at.ativo and at.ano_letivo = 2026
      join public.turmas t on t.id = at.turma_id
     where t.serie in ('Maternal 2','Maternal 3','Grupo IV','Grupo V',
                       '1º Ano','2º Ano','3º Ano','4º Ano','5º Ano')
  ),
  env as (
    select e.id, e.aluno_id, e.concluido_em, e.respondente,
           e.iniciado_em, e.ultima_atividade
      from public.questionario_pais_envio e
     where e.rodada = p_rodada
  ),
  contas as (
    select r.envio_id,
           coalesce(sum(length(coalesce(r.texto,''))), 0)::int as letras,
           count(*) filter (where r.ordem >= 900)::int as acrescimos,
           max(r.ordem) filter (where r.ordem < 900)::int as ate
      from public.questionario_pais_resposta r
     group by r.envio_id
  )
  select
    a.id, a.full_name, a.turma, a.serie,
    count(e.id)::int,
    count(e.id) filter (where e.concluido_em is not null)::int,
    -- Quem falou. Nulo vira 'sem dizer': quem parou no meio nunca chegou a
    -- responder de que olhar estava falando.
    coalesce(array_agg(coalesce(e.respondente, 'sem dizer')
                       order by e.iniciado_em) filter (where e.id is not null),
             '{}'::text[]),
    coalesce(sum(c.letras), 0)::int,
    coalesce(sum(c.acrescimos), 0)::int,
    min(e.iniciado_em),
    max(e.ultima_atividade),
    -- So' faz sentido para quem NAO concluiu. Para quem concluiu fica nulo, e o
    -- painel nao precisa desenhar um numero que nao quer dizer nada.
    max(c.ate) filter (where e.concluido_em is null)::int
  from alvo a
  left join env e on e.aluno_id = a.id
  left join contas c on c.envio_id = e.id
  group by a.id, a.full_name, a.turma, a.serie;
end $$;

revoke all on function public.painel_questionario_pais(text) from public;
grant execute on function public.painel_questionario_pais(text) to authenticated;

-- ------------------------------------------------- as respostas de uma crianca
-- Uma voz por bloco, na ordem em que chegaram. As duas leituras da mesma crianca
-- ficam lado a lado de proposito: a divergencia entre a mae e a avo e' dado.
create or replace function public.respostas_da_crianca(p_aluno_id uuid, p_rodada text default 'agosto/2026')
returns table (
  envio_id uuid,
  respondente text,
  quem_fica_mais_tempo text,
  iniciado_em timestamptz,
  concluido_em timestamptz,
  ordem smallint,
  pergunta_texto text,
  cena_texto text,
  texto text,
  marcadas text[]
)
language plpgsql
stable
security definer
set search_path to 'public'
as $$
begin
  if not (public.has_role(auth.uid(), 'admin'::public.app_role)
       or public.has_role(auth.uid(), 'super_admin'::public.app_role)) then
    raise exception 'sem permissao';
  end if;

  return query
  select e.id, e.respondente, e.quem_fica_mais_tempo, e.iniciado_em, e.concluido_em,
         r.ordem, r.pergunta_texto, r.cena_texto, r.texto, r.marcadas
    from public.questionario_pais_envio e
    left join public.questionario_pais_resposta r on r.envio_id = e.id
   where e.aluno_id = p_aluno_id and e.rodada = p_rodada
   order by e.iniciado_em, r.ordem;
end $$;

revoke all on function public.respostas_da_crianca(uuid, text) from public;
grant execute on function public.respostas_da_crianca(uuid, text) to authenticated;

-- --------------------------------------------------------------- conferencia
-- A funcao exige admin, e a CLI roda sem usuario nenhum, entao ela nao pode ser
-- chamada aqui: a propria trava recusaria. A conferencia vai pelos dados.
select count(*) filter (where e.id is not null) as envios,
       count(distinct e.aluno_id) as criancas_com_voz
  from public.questionario_pais_envio e;
