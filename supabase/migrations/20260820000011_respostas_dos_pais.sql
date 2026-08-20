-- ============================================================
-- ONDE A RESPOSTA DOS PAIS MORA
--
-- Ate hoje o questionario dos pais desenhava as perguntas e nao gravava nada.
-- Era o elo mais atrasado do projeto: os nove questionarios podiam estar
-- perfeitos e nao havia para onde a resposta ir.
--
-- O DESENHO PRESSUPOE MUITA GENTE AO MESMO TEMPO. Um link so' vai para as
-- familias da escola inteira, e o pico e' logo depois do aviso: centenas de
-- pessoas em minutos, quase todas no celular, com sinal ruim, e boa parte
-- respondendo em pe na porta da escola. Tres decisoes vem dai:
--
--  1. GRAVA A CADA PERGUNTA, nao no fim. Quem responde no celular perde o app
--     por telefonema, bateria ou distracao. Se so' gravasse no fim, a maioria
--     das respostas se perderia e a gente nunca saberia quantas.
--
--  2. NAO EXISTE TRANSACAO LONGA nem trava de linha. Cada pergunta e' um
--     upsert numa linha propria, entao dois pais respondendo nao esperam um
--     pelo outro, e a mesma pessoa reenviando nao duplica.
--
--  3. UM ENVIO E' UMA RODADA POR CRIANCA. A mae responde a rodada de agosto do
--     filho; a avo pode responder a MESMA rodada em outro envio, e os dois
--     ficam. Sao olhares diferentes sobre a mesma crianca, e a doutrina diz que
--     a divergencia entre eles e' dado, nao ruido.
--
-- O QUE ESTA TABELA NAO E': avaliacao. Nao tem nota, nao tem certo e errado, e
-- nao existe coluna de resultado. O que a IA le' e' o texto; a opcao marcada e'
-- isca de memoria, e serve para saber o que o pai reconheceu, nunca como
-- classificacao.
-- ============================================================

-- ------------------------------------------------------------------ o envio
create table if not exists public.questionario_pais_envio (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.profiles(id) on delete cascade,
  institution_id uuid,

  -- A faixa e a serie sao GRAVADAS aqui, e nao lidas da turma depois. A crianca
  -- muda de serie todo ano; a resposta tem que continuar dizendo com que idade
  -- ela foi dada, senao daqui a tres anos ninguem sabe o que foi perguntado.
  faixa text not null,
  serie text,
  rodada text not null default 'agosto/2026',

  -- Quem respondeu, com as palavras do proprio formulario. Sem isso a mesma
  -- cena contada pela mae e pela avo vira uma coisa so.
  respondente text,
  quem_fica_mais_tempo text,

  aceite_termo boolean not null default false,
  aceite_em timestamptz,
  versao_termo text,

  iniciado_em timestamptz not null default now(),
  concluido_em timestamptz,
  ultima_atividade timestamptz not null default now(),

  -- Diagnostico de campo, nao rastreamento: serve para saber se o pai desistiu
  -- na terceira pergunta porque a tela quebrou naquele celular.
  contexto jsonb
);

create index if not exists idx_qp_envio_aluno on public.questionario_pais_envio(aluno_id, rodada);
create index if not exists idx_qp_envio_rodada on public.questionario_pais_envio(rodada, concluido_em);

-- --------------------------------------------------------------- a resposta
create table if not exists public.questionario_pais_resposta (
  id uuid primary key default gen_random_uuid(),
  envio_id uuid not null references public.questionario_pais_envio(id) on delete cascade,

  -- A pergunta e' identificada pela ORDEM e pelo TEXTO. O texto vai junto de
  -- proposito, mesmo sendo repetido: as perguntas moram no codigo e mudam. Sem
  -- guardar o que foi perguntado, a resposta de hoje fica pendurada numa
  -- pergunta que amanha nao existe mais, e a leitura da IA vira adivinhacao.
  ordem smallint not null,
  pergunta_texto text not null,
  cena_texto text,

  -- O relato e' a resposta. As marcadas sao isca de memoria.
  texto text,
  marcadas text[],

  respondida_em timestamptz not null default now(),

  unique (envio_id, ordem)
);

create index if not exists idx_qp_resposta_envio on public.questionario_pais_resposta(envio_id, ordem);

-- ------------------------------------------------------------------- a RLS
alter table public.questionario_pais_envio enable row level security;
alter table public.questionario_pais_resposta enable row level security;

-- O pai NAO faz login. Ele entra pela porta de nome + data de nascimento, e por
-- isso as politicas de escrita valem para anon. Escrever e' liberado; LER nao
-- e', e essa e' a assimetria que protege: quem responde nunca consegue puxar de
-- volta o que outra familia escreveu, nem o que ele mesmo escreveu antes.
drop policy if exists "Pai abre um envio" on public.questionario_pais_envio;
create policy "Pai abre um envio"
on public.questionario_pais_envio for insert to anon, authenticated
with check (true);

drop policy if exists "Pai atualiza o proprio envio" on public.questionario_pais_envio;
create policy "Pai atualiza o proprio envio"
on public.questionario_pais_envio for update to anon, authenticated
using (concluido_em is null);

drop policy if exists "Pai grava resposta" on public.questionario_pais_resposta;
create policy "Pai grava resposta"
on public.questionario_pais_resposta for insert to anon, authenticated
with check (
  exists (select 1 from public.questionario_pais_envio e
           where e.id = envio_id and e.concluido_em is null)
);

drop policy if exists "Pai corrige a propria resposta" on public.questionario_pais_resposta;
create policy "Pai corrige a propria resposta"
on public.questionario_pais_resposta for update to anon, authenticated
using (
  exists (select 1 from public.questionario_pais_envio e
           where e.id = envio_id and e.concluido_em is null)
);

-- Leitura so' de dentro. Nem professor, nem lider de casa: o pai escreveu sobre
-- o filho contando que quem le' e' o Arboria, e abrir isso para a sala mudaria
-- o que ele estaria disposto a escrever.
drop policy if exists "Admin le os envios" on public.questionario_pais_envio;
create policy "Admin le os envios"
on public.questionario_pais_envio for select to authenticated
using (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  or public.has_role(auth.uid(), 'super_admin'::public.app_role)
);

drop policy if exists "Admin le as respostas" on public.questionario_pais_resposta;
create policy "Admin le as respostas"
on public.questionario_pais_resposta for select to authenticated
using (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  or public.has_role(auth.uid(), 'super_admin'::public.app_role)
);

-- ------------------------------------------------------- gravar uma pergunta
-- Uma chamada por pergunta respondida. E' idempotente: o pai que volta e muda a
-- resposta sobrescreve a dele, e reenvio por conexao ruim nao duplica nada.
create or replace function public.salvar_resposta_pais(
  p_envio_id uuid,
  p_ordem smallint,
  p_pergunta text,
  p_cena text,
  p_texto text,
  p_marcadas text[]
) returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not exists (select 1 from public.questionario_pais_envio
                  where id = p_envio_id and concluido_em is null) then
    raise exception 'envio nao encontrado ou ja concluido';
  end if;

  insert into public.questionario_pais_resposta
    (envio_id, ordem, pergunta_texto, cena_texto, texto, marcadas)
  values (p_envio_id, p_ordem, p_pergunta, p_cena, nullif(trim(coalesce(p_texto,'')),''), p_marcadas)
  on conflict (envio_id, ordem) do update
    set texto = excluded.texto,
        marcadas = excluded.marcadas,
        pergunta_texto = excluded.pergunta_texto,
        cena_texto = excluded.cena_texto,
        respondida_em = now();

  update public.questionario_pais_envio
     set ultima_atividade = now()
   where id = p_envio_id;
end $$;

revoke all on function public.salvar_resposta_pais(uuid, smallint, text, text, text, text[]) from public;
grant execute on function public.salvar_resposta_pais(uuid, smallint, text, text, text, text[]) to anon, authenticated;

-- --------------------------------------------------------------- acompanhar
-- Quantos abriram, quantos terminaram, quantos pararam no meio, por turma. E'
-- por aqui que se descobre no dia do envio se a coisa esta indo ou travando.
create or replace view public.vw_questionario_pais_andamento as
select
  t.nome as turma, t.serie, t.segmento, e.rodada,
  count(*) as abriram,
  count(*) filter (where e.concluido_em is not null) as concluiram,
  count(*) filter (where e.concluido_em is null) as pararam_no_meio,
  round(avg((select count(*) from public.questionario_pais_resposta r where r.envio_id = e.id)), 1) as media_de_respostas
from public.questionario_pais_envio e
join public.profiles p on p.id = e.aluno_id
join public.aluno_turma at on at.aluno_id = p.id and at.ativo
join public.turmas t on t.id = at.turma_id
group by t.nome, t.serie, t.segmento, e.rodada;

select 'questionario_pais_envio' as tabela,
       (select count(*) from pg_policies where schemaname='public' and tablename='questionario_pais_envio') as politicas
union all
select 'questionario_pais_resposta',
       (select count(*) from pg_policies where schemaname='public' and tablename='questionario_pais_resposta');
