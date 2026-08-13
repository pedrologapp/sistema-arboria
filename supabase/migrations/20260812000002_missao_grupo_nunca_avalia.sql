-- 12/08/2026 — Ordem do Fundador (2a vez): missao de grupo NAO pontua e NAO e' avaliada.
-- So a missao individual e' avaliada pela IA. A coletiva apenas mostra que foi recebida.
--
-- CONTEXTO: a decisao ja tinha sido tomada em 10/08, mas o workflow de analise da IA nao
-- distingue entrega coletiva de individual. Ele voltou a analisar entregas de grupo, gerou
-- nota em 15 das 36 e aprovou 3 — a ultima delas hoje, 12/08 as 15:00 UTC, cerca de uma hora
-- depois da correcao do grupo_ref do 8oA: assim que a linha ficou visivel, a IA a pegou.
-- Nao houve vazamento de ponto (pontos_base=0 desde 10/08) nem de evidencia (trigger corrigido
-- em 10/08), mas nasceu nota e devolutiva pessoal para o trabalho de um grupo de 7 alunos.
--
-- Por isso a limpeza vem com TRAVA. Sem ela, o lote de analise das 70 entregas individuais
-- recriaria as notas de grupo na mesma noite.

-- ---------------------------------------------------------------- 1. backups
create table if not exists _bkp_20260812_analise_coletiva as
select a.* from entregas_analise_ia a
join entregas e on e.id = a.entrega_id
join missoes m on m.id = e.missao_id
where m.entrega_coletiva = true;

create table if not exists _bkp_20260812_entregas_coletivas as
select e.* from entregas e
join missoes m on m.id = e.missao_id
where m.entrega_coletiva = true;

-- ---------------------------------------------------------------- 2. limpeza
-- 2a. apaga as analises de IA feitas em cima de entrega de grupo
--     (carregam nota e justificativa pessoal endereçada a UM aluno pelo trabalho do grupo)
delete from entregas_analise_ia a
using entregas e, missoes m
where a.entrega_id = e.id
  and m.id = e.missao_id
  and m.entrega_coletiva = true;

-- 2b. devolve as entregas coletivas ao estado "recebida": pendente, sem nota, sem pontos
update entregas e
   set status = 'pendente',
       nota = null,
       pontos_concedidos = 0,
       avaliado_por = null,
       data_avaliacao = null,
       updated_at = now()
  from missoes m
 where m.id = e.missao_id
   and m.entrega_coletiva = true
   and (e.status = 'aprovada' or e.nota is not null or coalesce(e.pontos_concedidos,0) <> 0);

-- ---------------------------------------------------------------- 3. trava
-- Normaliza em silencio, em vez de levantar excecao: quem escreve errado hoje e' um workflow
-- externo, e uma excecao o poria em laco de retentativa. A entrega de grupo passa a ser,
-- por construcao, apenas recebida — venha a escrita do app, do n8n ou de SQL manual.
create or replace function forcar_missao_grupo_sem_avaliacao()
returns trigger
language plpgsql
as $$
declare
  v_coletiva boolean;
begin
  select m.entrega_coletiva into v_coletiva from missoes m where m.id = new.missao_id;

  if coalesce(v_coletiva, false) then
    new.nota := null;
    new.pontos_concedidos := 0;
    new.avaliado_por := null;
    new.data_avaliacao := null;
    if new.status = 'aprovada' then
      new.status := 'pendente';
    end if;
  end if;

  return new;
end $$;

drop trigger if exists trg_missao_grupo_sem_avaliacao on entregas;
create trigger trg_missao_grupo_sem_avaliacao
  before insert or update on entregas
  for each row execute function forcar_missao_grupo_sem_avaliacao();

-- REVERSAO: drop trigger trg_missao_grupo_sem_avaliacao on entregas;
--           restaurar de _bkp_20260812_entregas_coletivas e _bkp_20260812_analise_coletiva.
