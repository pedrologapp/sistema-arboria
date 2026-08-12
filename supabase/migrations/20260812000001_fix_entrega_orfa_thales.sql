-- 12/08/2026 — Corrige a entrega coletiva orfa do grupo do Thales (8o Ano A, "O atleta do futuro", grupo 1).
--
-- CAUSA: a entrega foi enviada em 06/08 com grupo_ref no formato ANTIGO (papel_id::grupo),
-- sem a turma. O backfill de 04/08 (20260804000001) so alcancou as linhas que ja existiam;
-- esta nasceu depois, de um cliente que ainda estava com a versao velha em cache.
-- EFEITO: a entrega existia no banco mas nao casava com nenhum grupo, entao o grupo
-- aparecia como "nao entregou" no quadro do professor e para os proprios colegas.
--
-- CORRECAO: reescreve o grupo_ref no formato turma_id::papel_id::grupo.
-- O status permanece 'pendente', que e o estado das outras 33 entregas coletivas desde a
-- decisao de 10/08 ("missao de grupo nao avalia, apenas recebe"). Entregue = a linha existir.

create table if not exists _bkp_20260812_entrega_thales as
select * from entregas where id = '13a4ac93-4c04-4342-9b9e-3eb742f90965';

do $$
declare
  v_novo_ref text := 'f3a3a251-ef30-40b0-9b42-b605046551d9::08d23325-22ca-4878-a6dc-81915fb93ff1::1';
  v_ja_existe int;
begin
  -- guarda: se o grupo ja tiver uma entrega no formato novo, nao duplica (indice unico)
  select count(*) into v_ja_existe
  from entregas e
  join missoes m on m.id = e.missao_id
  where m.capitulo_id = '8338b36f-5c3c-48b4-84ad-8ee4773f3e4a'
    and m.entrega_coletiva = true
    and e.grupo_ref = v_novo_ref
    and e.id <> '13a4ac93-4c04-4342-9b9e-3eb742f90965';

  if v_ja_existe > 0 then
    raise exception 'O grupo ja possui entrega no formato novo. Abortado para nao violar o indice unico.';
  end if;

  update entregas
     set grupo_ref = v_novo_ref,
         updated_at = now()
   where id = '13a4ac93-4c04-4342-9b9e-3eb742f90965'
     and grupo_ref = '08d23325-22ca-4878-a6dc-81915fb93ff1::1';

  if not found then
    raise exception 'Entrega do Thales nao encontrada no formato antigo esperado. Nada foi alterado.';
  end if;
end $$;
