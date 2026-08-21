-- ============================================================
-- CONCLUIR TAMBEM PRECISA SER FUNCAO
--
-- Ontem a correcao foi a politica de UPDATE sem WITH CHECK. Estava certa e nao
-- bastou: o envio continuou sem fechar.
--
-- A CAUSA DE VERDADE. Para executar
--
--     update questionario_pais_envio set ... where id = $1
--
-- o Postgres precisa LOCALIZAR a linha, e para isso aplica tambem as politicas
-- de SELECT. O pai nao tem nenhuma: a leitura desta tabela e' so' de admin, e
-- essa assimetria e' o que impede uma familia de puxar o que outra escreveu.
-- Ou seja, NENHUM update direto do pai jamais funcionaria, com ou sem WITH
-- CHECK. Ele nao dava erro: simplesmente afetava zero linhas, em silencio.
--
-- E' o mesmo tropeco de duas horas atras, quando o insert com .select('id')
-- batia na mesma parede. A licao ja estava dada e eu so' tinha aplicado nela.
--
-- A REGRA, entao, escrita de uma vez: nesta tabela o pai NUNCA toca direto.
-- Tudo passa por funcao com dono. Ja era assim para gravar resposta, para
-- acrescentar depois e para dizer quem fica mais tempo. Agora e' para concluir.
--
-- A politica de UPDATE fica onde esta, com o WITH CHECK que ela precisava, mas
-- passa a ser cinto de seguranca e nao caminho: quem trabalha e' a funcao.
-- ============================================================

create or replace function public.concluir_envio_pais(
  p_envio_id uuid,
  p_respondente text default null
)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_ok boolean := false;
begin
  -- Concluir duas vezes nao e' erro do pai, e' rede ruim reenviando. So' fecha
  -- o que ainda esta aberto, e a segunda chamada simplesmente nao faz nada em
  -- vez de mover a data de conclusao para frente.
  update public.questionario_pais_envio
     set concluido_em = now(),
         respondente = coalesce(nullif(trim(p_respondente), ''), respondente),
         ultima_atividade = now()
   where id = p_envio_id
     and concluido_em is null;

  get diagnostics v_ok = row_count;
  return v_ok;
end $$;

revoke all on function public.concluir_envio_pais(uuid, text) from public;
grant execute on function public.concluir_envio_pais(uuid, text) to anon, authenticated;

-- --------------------------------------------------------------- conferencia
-- Na pele do anonimo, que e' quem vai chamar de verdade.
do $$
declare
  v_id uuid;
  v_fechou boolean;
begin
  select e.id into v_id
    from public.questionario_pais_envio e
    join public.profiles p on p.id = e.aluno_id
   where p.full_name = 'Clarice Gomes de Almeida' and e.concluido_em is null
   order by e.iniciado_em desc limit 1;

  if v_id is null then
    raise notice 'nenhum envio aberto para conferir';
    return;
  end if;

  select public.concluir_envio_pais(v_id, 'A mãe') into v_fechou;
  if not v_fechou then
    raise exception 'a conclusao continua sendo recusada';
  end if;

  -- Desfaz a conferencia: o envio volta a ficar aberto para o Fundador testar
  -- o caminho inteiro pela tela, do jeito que o pai vai fazer.
  update public.questionario_pais_envio
     set concluido_em = null, respondente = null where id = v_id;
  raise notice 'conclusao passou, e o envio voltou a ficar aberto para o teste';
end $$;

select 'concluir_envio_pais' as funcao, 'ok' as estado;
