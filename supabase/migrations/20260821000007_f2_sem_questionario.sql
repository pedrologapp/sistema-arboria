-- ============================================================
-- O FUNDAMENTAL 2 NAO TEM QUESTIONARIO, E O SISTEMA FINGIA QUE TINHA
--
-- Achado ao conferir a cobertura antes do envio as familias (21/08):
--
--     com questionario:  338 alunos  (Infantil, 1o ao 5o)
--     SEM questionario:  160 alunos  (6o ao 9o)
--
-- Quando confirmar_crianca nao acha faixa, ela devolve null, e o app usava
-- coalesce(faixa, 'm2'). Ou seja: o pai de um aluno do 9o ano abriria o link e
-- leria as perguntas do MATERNAL 2, sobre uma crianca de dois anos. Um terco
-- da escola.
--
-- Nao e' so' constrangimento. E' o pai perdendo a confianca na primeira tela,
-- e essa confianca e' a unica coisa que faz alguem escrever tres paragrafos
-- sobre o proprio filho para a escola.
--
-- AQUI: quando nao ha faixa, NAO nasce envio e a funcao diz por que. A tela
-- entao fala a verdade, com o nome da crianca, em vez de abrir um questionario
-- que nao e' dela.
-- ============================================================

drop function if exists public.abrir_envio_pais(uuid, date, text);

create function public.abrir_envio_pais(
  p_aluno_id uuid,
  p_nascimento date,
  p_versao_termo text default null
)
returns table (
  situacao text, envio_id uuid, aluno_id uuid,
  primeiro_nome text, nome_completo text,
  turma text, serie text, segmento text, sexo text, faixa text
)
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  c record;
  v_envio uuid;
begin
  -- A data continua sendo a chave. Sem ela nao ha crianca, e a funcao devolve
  -- ZERO linhas: e' assim que a tela sabe dizer "essa data nao confere".
  select * into c from public.confirmar_crianca(p_aluno_id, p_nascimento);
  if c.aluno_id is null then
    return;
  end if;

  -- A crianca existe e a data bate, mas a serie dela ainda nao tem perguntas.
  -- Devolve a crianca sem envio: a tela precisa do nome para falar direito com
  -- o pai, e nao pode registrar como respondente quem nao vai responder nada.
  if c.faixa is null then
    return query select 'sem_questionario'::text, null::uuid, c.aluno_id,
                        c.primeiro_nome, c.nome_completo, c.turma, c.serie,
                        c.segmento, c.sexo, null::text;
    return;
  end if;

  insert into public.questionario_pais_envio
    (aluno_id, faixa, serie, contexto,
     aceite_termo, aceite_em, versao_termo)
  values (c.aluno_id, c.faixa, c.serie,
          jsonb_build_object('turma', c.turma, 'segmento', c.segmento),
          p_versao_termo is not null,
          case when p_versao_termo is not null then now() end,
          p_versao_termo)
  returning id into v_envio;

  return query select 'ok'::text, v_envio, c.aluno_id, c.primeiro_nome,
                      c.nome_completo, c.turma, c.serie, c.segmento, c.sexo, c.faixa;
end $$;

revoke all on function public.abrir_envio_pais(uuid, date, text) from public;
grant execute on function public.abrir_envio_pais(uuid, date, text) to anon, authenticated;

-- --------------------------------------------------------------- conferencia
-- Um do 2o ano (tem questionario) e um do 9o (nao tem), na pele do anonimo.
do $$
declare a record; b record; begin
  select * into a from public.abrir_envio_pais(
    (select p.id from public.profiles p
      join public.aluno_turma at on at.aluno_id=p.id and at.ativo and at.ano_letivo=2026
     where p.full_name='Clarice Gomes de Almeida' limit 1),
    '2019-01-03'::date, '2026-08-21');

  if a.situacao <> 'ok' or a.envio_id is null then
    raise exception 'o 2o ano parou de abrir';
  end if;
  delete from public.questionario_pais_envio where id = a.envio_id;

  select * into b from public.abrir_envio_pais(
    (select p.id from public.profiles p
      join public.aluno_turma at on at.aluno_id=p.id and at.ativo and at.ano_letivo=2026
      join public.turmas t on t.id=at.turma_id
     where t.serie='9º Ano' and p.data_nascimento is not null limit 1),
    (select p.data_nascimento from public.profiles p
      join public.aluno_turma at on at.aluno_id=p.id and at.ativo and at.ano_letivo=2026
      join public.turmas t on t.id=at.turma_id
     where t.serie='9º Ano' and p.data_nascimento is not null limit 1));

  if b.situacao <> 'sem_questionario' or b.envio_id is not null then
    raise exception 'o 9o ano ainda abre envio';
  end if;
  raise notice '2o ano abre, 9o ano nao abre e diz por que';
end $$;

select 'abrir_envio_pais com situacao' as etapa, 'ok' as estado;
