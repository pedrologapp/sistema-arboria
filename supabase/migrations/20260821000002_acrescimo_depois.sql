-- ============================================================
-- O QUE O PAI LEMBRA DEPOIS
--
-- Finalizar fecha o envio, e fechado ele nao aceita mais escrita: e' isso que
-- impede alguem de reescrever a resposta depois pelo mesmo link.
--
-- So' que fechar tambem trancava a melhor parte. Quem termina o questionario
-- passa o resto do dia lembrando de cena que nao contou, e volta para contar.
-- Essa lembranca vale mais que varias respostas do meio, porque ela vem depois
-- de o pai ter passado uma hora reparando no filho.
--
-- Esta funcao abre uma fresta so' para isso: ACRESCENTA, nunca corrige. Vai numa
-- ordem alta, fora da numeracao das perguntas, e cada volta do pai vira uma
-- linha nova em vez de sobrescrever a anterior. Nenhuma resposta ja dada muda.
-- ============================================================

create or replace function public.acrescentar_depois(p_envio_id uuid, p_texto text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_ordem smallint;
begin
  if coalesce(trim(p_texto), '') = '' then
    return;
  end if;

  -- Exige envio CONCLUIDO. Antes de finalizar o caminho e' salvar_resposta_pais,
  -- e misturar os dois deixaria o acrescimo virar porta dos fundos para editar
  -- resposta com o questionario ainda aberto.
  if not exists (select 1 from public.questionario_pais_envio
                  where id = p_envio_id and concluido_em is not null) then
    raise exception 'envio nao encontrado ou ainda nao concluido';
  end if;

  -- 900 em diante: longe da numeracao das perguntas, e em ordem de chegada.
  select coalesce(max(ordem), 899) + 1 into v_ordem
    from public.questionario_pais_resposta
   where envio_id = p_envio_id and ordem >= 900;

  insert into public.questionario_pais_resposta
    (envio_id, ordem, pergunta_texto, cena_texto, texto, marcadas)
  values (p_envio_id, v_ordem,
          'Acréscimo, depois de finalizar',
          'O pai voltou por conta própria para contar mais.',
          trim(p_texto), null);

  update public.questionario_pais_envio
     set ultima_atividade = now()
   where id = p_envio_id;
end $$;

revoke all on function public.acrescentar_depois(uuid, text) from public;
grant execute on function public.acrescentar_depois(uuid, text) to anon, authenticated;

-- A politica de INSERT so' aceitava envio ABERTO, entao o acrescimo batia nela
-- mesmo vindo de uma funcao com dono. Passa a aceitar tambem a linha de
-- acrescimo (ordem >= 900) em envio ja concluido.
drop policy if exists "Pai grava resposta" on public.questionario_pais_resposta;
create policy "Pai grava resposta"
on public.questionario_pais_resposta for insert to anon, authenticated
with check (
  exists (
    select 1 from public.questionario_pais_envio e
     where e.id = envio_id
       and (e.concluido_em is null or questionario_pais_resposta.ordem >= 900)
  )
);

select 'acrescentar_depois' as funcao,
       (select count(*) from pg_policies
         where schemaname='public' and tablename='questionario_pais_resposta') as politicas;
