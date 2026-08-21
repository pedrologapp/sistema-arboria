-- ============================================================
-- ABRIR O ENVIO NUMA CHAMADA SO'
--
-- O BUG. O app confirmava a crianca e depois fazia
--
--     insert into questionario_pais_envio (...) select('id').single()
--
-- e isso NUNCA funcionou para o pai. O ".select('id')" faz o PostgREST LER a
-- linha recem-criada de volta, e a leitura passa pela RLS. A politica de leitura
-- desta tabela e' so' para admin, de proposito: quem responde nunca deve
-- conseguir puxar o que outra familia escreveu. O pai escrevia e batia na
-- propria assimetria que protege o dado.
--
-- Dava a mensagem "Nao consegui abrir agora", que era verdade e nao ajudava
-- ninguem: o Fundador testou com a Clarice do 2o ano, com a data certa, e a
-- porta nao abriu.
--
-- A CORRECAO. Uma funcao com dono faz as duas coisas: confirma a crianca pela
-- data e abre o envio, devolvendo tudo o que a tela precisa. A RLS continua
-- fechada para leitura direta, e o anon nunca ganha SELECT nesta tabela.
--
-- De quebra vira uma viagem de rede em vez de duas, que era a outra queixa: no
-- celular do pai, na porta da escola, cada ida ao servidor pesa.
-- ============================================================

create or replace function public.abrir_envio_pais(p_aluno_id uuid, p_nascimento date)
returns table (
  envio_id uuid, aluno_id uuid, primeiro_nome text, nome_completo text,
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
  -- A data continua sendo a chave. Sem ela nao ha crianca, e sem crianca nao ha
  -- envio: achar o nome na busca nao abre nada.
  select * into c from public.confirmar_crianca(p_aluno_id, p_nascimento);
  if c.aluno_id is null then
    return;
  end if;

  -- Um envio por VOLTA, e nao um por crianca. A mae responde a rodada de agosto
  -- e a avo pode responder a mesma rodada em outro envio: sao dois olhares sobre
  -- a mesma crianca, e a divergencia entre eles e' dado, nao ruido.
  insert into public.questionario_pais_envio
    (aluno_id, faixa, serie, contexto)
  values (c.aluno_id, coalesce(c.faixa, 'm2'), c.serie,
          jsonb_build_object('turma', c.turma, 'segmento', c.segmento))
  returning id into v_envio;

  return query select v_envio, c.aluno_id, c.primeiro_nome, c.nome_completo,
                      c.turma, c.serie, c.segmento, c.sexo, c.faixa;
end $$;

revoke all on function public.abrir_envio_pais(uuid, date) from public;
grant execute on function public.abrir_envio_pais(uuid, date) to anon, authenticated;

-- --------------------------------------------------------------- conferencia
-- Na pele do anonimo, que e' quem vai usar de verdade. Cria um envio de teste e
-- desfaz: a conferencia nao pode sujar o painel da escola.
do $$
declare r record; begin
  select * into r from public.abrir_envio_pais(
    (select p.id from public.profiles p
      join public.aluno_turma at on at.aluno_id=p.id and at.ativo and at.ano_letivo=2026
     where p.full_name = 'Clarice Gomes de Almeida' limit 1),
    '2019-01-03'::date);
  if r.envio_id is null then
    raise exception 'a porta continua fechada';
  end if;
  delete from public.questionario_pais_envio where id = r.envio_id;
  raise notice 'porta abriu: % (%), faixa %', r.nome_completo, r.turma, r.faixa;
end $$;

select 'abrir_envio_pais' as funcao, 'ok' as estado;
