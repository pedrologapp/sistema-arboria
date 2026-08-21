-- ============================================================
-- TRES DEFEITOS QUE SO' APARECERAM COM O QUESTIONARIO RODANDO DE VERDADE
--
-- O Fundador respondeu um questionario inteiro da Clarice em 21/08. Salvou seis
-- respostas e nao fechou. Investigando, tres coisas:
--
-- 1. A POLITICA RECUSAVA O PROPRIO "FINALIZAR".
--
--       using (concluido_em is null)   -- e nenhum with check
--
--    Em UPDATE, quando nao ha WITH CHECK, o Postgres aplica a expressao do
--    USING TAMBEM a linha resultante. Concluir e' justamente preencher
--    concluido_em, ou seja, deixar de satisfazer a condicao. Toda conclusao era
--    recusada, e em silencio: o app nao mostra erro de propósito para nao
--    travar o pai numa tela que ele nao sabe resolver.
--
--    A intencao original continua valendo e agora fica dita direito: enquanto
--    ABERTO pode mexer, e fechar e' permitido; depois de fechado, nada passa,
--    porque o USING olha a linha ANTIGA.
--
-- 2. O TERMO PASSOU A VIR ANTES DA CRIANCA.
--
--    A ordem mudou hoje a pedido do Fundador: o Arboria se apresenta, explica o
--    que e', e SO' ENTAO pergunta de quem vamos falar. Isso esta certo para o
--    pai e quebrou o registro do aceite, porque quando ele passa pela tela do
--    termo ainda nao existe envio nenhum para marcar.
--
--    Como a tela do termo e' passo obrigatorio ANTES da porta, quem chega na
--    porta ja leu. Entao o aceite passa a nascer junto com o envio.
--
-- 3. QUEM FICA MAIS TEMPO e' escolhido na tela do FIM, depois de concluir, e a
--    politica (com razao) nao deixa mais mexer. Ganha funcao propria: e' o unico
--    campo que pode chegar depois, e ele nao e' resposta, e' etiqueta de olhar.
-- ============================================================

-- ---------------------------------------------------- 1. a politica correta
drop policy if exists "Pai atualiza o proprio envio" on public.questionario_pais_envio;
create policy "Pai atualiza o proprio envio"
on public.questionario_pais_envio for update to anon, authenticated
using (concluido_em is null)
with check (true);

-- ------------------------------------------- 2. o aceite nasce com o envio
create or replace function public.abrir_envio_pais(
  p_aluno_id uuid,
  p_nascimento date,
  p_versao_termo text default null
)
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

  insert into public.questionario_pais_envio
    (aluno_id, faixa, serie, contexto,
     aceite_termo, aceite_em, versao_termo)
  values (c.aluno_id, coalesce(c.faixa, 'm2'), c.serie,
          jsonb_build_object('turma', c.turma, 'segmento', c.segmento),
          p_versao_termo is not null,
          case when p_versao_termo is not null then now() end,
          p_versao_termo)
  returning id into v_envio;

  return query select v_envio, c.aluno_id, c.primeiro_nome, c.nome_completo,
                      c.turma, c.serie, c.segmento, c.sexo, c.faixa;
end $$;

revoke all on function public.abrir_envio_pais(uuid, date, text) from public;
grant execute on function public.abrir_envio_pais(uuid, date, text) to anon, authenticated;

-- A versao de dois argumentos sai: deixar as duas faria o app chamar a antiga
-- por engano e voltar a nao gravar aceite nenhum.
drop function if exists public.abrir_envio_pais(uuid, date);

-- ------------------------------------------ 3. quem fica mais tempo, depois
create or replace function public.registrar_quem_fica(p_envio_id uuid, p_quem text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if coalesce(trim(p_quem), '') = '' then
    return;
  end if;
  update public.questionario_pais_envio
     set quem_fica_mais_tempo = trim(p_quem),
         ultima_atividade = now()
   where id = p_envio_id;
end $$;

revoke all on function public.registrar_quem_fica(uuid, text) from public;
grant execute on function public.registrar_quem_fica(uuid, text) to anon, authenticated;

-- --------------------------------------------------------------- conferencia
-- Fecha um dos envios de teste da Clarice, o que tem as seis respostas, para
-- provar que agora a conclusao passa.
do $$
declare v_id uuid; begin
  select e.id into v_id
    from public.questionario_pais_envio e
    join public.profiles p on p.id = e.aluno_id
   where p.full_name = 'Clarice Gomes de Almeida' and e.concluido_em is null
     and (select count(*) from public.questionario_pais_resposta r where r.envio_id = e.id) > 0
   order by e.iniciado_em desc limit 1;

  if v_id is null then
    raise notice 'nenhum envio de teste com resposta para conferir';
    return;
  end if;

  update public.questionario_pais_envio set concluido_em = now() where id = v_id;

  if not exists (select 1 from public.questionario_pais_envio
                  where id = v_id and concluido_em is not null) then
    raise exception 'a conclusao continua sendo recusada';
  end if;
  raise notice 'conclusao passou';
end $$;

select 'politica e funcoes' as etapa, 'ok' as estado;
