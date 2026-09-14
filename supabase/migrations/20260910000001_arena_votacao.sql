-- ============================================================
-- A VOTACAO DO SITE PUBLICO DA ARENA ARBORIA
--
-- Pareceres de Riscos e de Dados em 10/09/2026, registrados em
-- empresa/registros/riscos.md e empresa/registros/decisoes.md.
--
-- REVOGA o metodo de voto decidido em 28/07 (confirmacao por e-mail, hash do
-- e-mail, 5 votos por IP). Metodo novo, decidido pelo Fundador: sem cadastro,
-- sem login, sem e-mail e sem documento. Motivo: coletar e-mail de publico
-- externo para votar em trabalho de menor abre uma base legal que nada obriga
-- a abrir, e o e-mail nao prova identidade nenhuma.
--
-- ESTA MIGRACAO NAO ABRE A VOTACAO. Ela cria as tabelas e as funcoes. A janela
-- so' abre quando a edicao passar para o estado 'aberta', e isso e' um ato
-- deliberado que depende do regulamento publicado, do termo dos responsaveis
-- mencionando votacao e resultado, da autorizacao da direcao e da rotacao da
-- chave vazada.
--
-- AS TRES REGRAS QUE VIRARAM RESTRICAO, E NAO COMBINADO:
--  1. A nota e' pre-requisito para FECHAR A APURACAO. Ordem do Fundador em
--     10/09: o site conta os votos primeiro e as notas entram depois. Sem essa
--     trava, VOTOS x NOTA com nota vazia nao tem saida honesta: tratar como
--     zero pune o projeto pelo esquecimento do mentor, tratar como dez premia
--     o esquecimento.
--  2. A nota e' CONGELADA na publicacao. A origem (capitulo_projeto_nota) e'
--     editavel por qualquer professor da instituicao, para sempre. Resultado
--     que muda porque alguem editou uma nota depois da votacao nao se defende.
--  3. Voto nunca e' apagado e nunca muda de projeto. Despublicar e' mudar
--     estado, com motivo obrigatorio; os votos ficam na auditoria e saem do
--     resultado.
--
-- POR QUE NAO ESTENDER capitulo_arena_projeto: o turma_id dela cai em cascata
-- a partir de turmas, entao a virada de ano apagaria o projeto e levaria o voto
-- junto; a chave natural dela e' a tupla derivada que queremos parar de usar
-- como identidade; e as 25 linhas dela sao da 1a fase, marcadas por um criterio
-- que nao e' o da 2a. Ela continua sendo a mesa de trabalho do mentor, e fica
-- ligada por linhagem.
-- ============================================================

-- ------------------------------------------------------------ A EDICAO
-- Existe para a janela morar em algum lugar com dono, para 2027 nao colidir
-- com 2026, e para o teto por rede ser parametro do banco e nao constante
-- escondida no codigo.
create table if not exists public.arena_edicao (
  id                  uuid primary key default gen_random_uuid(),
  institution_id      uuid not null,
  capitulo_id         uuid,
  nome                text not null,
  ano                 smallint not null,
  estado              text not null default 'rascunho'
                        check (estado in ('rascunho','aberta','fechada','apurada')),
  abre_em             timestamptz,
  fecha_em            timestamptz,

  -- COMO A REGRA DO VENCEDOR SERA' CALCULADA. Texto, nao formula executavel:
  -- ele existe para ser PUBLICADO ANTES DE ABRIR. Decidir como o voto pesa
  -- depois de ver os votos e' o que torna um resultado contestavel.
  regra_resultado     text,
  regulamento_url     text,

  -- Teto ALTO, so' para barrar robo. A escola inteira sai por um endereco so',
  -- e operadora de celular junta milhares de aparelhos no mesmo endereco.
  teto_por_rede       int not null default 400,
  teto_por_rede_hora  int not null default 60,

  -- Sobe 1 a cada publicacao ou despublicacao. Cada voto guarda a versao que
  -- estava no ar quando foi dado: e' o que responde "meu projeto entrou tarde".
  lista_versao        int not null default 0,

  criado_por          uuid,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint arena_edicao_janela
    check (abre_em is null or fecha_em is null or fecha_em > abre_em),
  -- Nao se abre sem hora de fechar, e nao se abre sem a regra escrita.
  constraint arena_edicao_aberta_completa
    check (estado <> 'aberta'
           or (abre_em is not null and fecha_em is not null and regra_resultado is not null))
);

-- --------------------------------------------------------- O PROJETO PUBLICADO
-- Nao e' "o projeto": e' a versao CONFERIDA que foi ao ar. Nasce da entrega e
-- nao depende dela depois de nascer. Reenvio do aluno nao muda esta linha,
-- levanta bandeira na curadoria.
create table if not exists public.arena_projeto (
  id            uuid primary key default gen_random_uuid(),
  edicao_id     uuid not null references public.arena_edicao(id) on delete restrict,

  numero        smallint not null,   -- identidade de exibicao, NUNCA colocacao
  titulo        text not null,
  gancho        text,
  corpo         text,                -- prosa dos alunos, editada SO' por supressao
  ordem         smallint,

  estado        text not null default 'rascunho'
                  check (estado in ('rascunho','conferido','publicado','despublicado')),
  publicado_em        timestamptz,
  despublicado_em     timestamptz,
  despublicado_motivo text,

  -- LINHAGEM. Nunca vai para o cliente. Responde "de onde saiu isto".
  entrega_origem_id   uuid,
  entrega_origem_em   timestamptz,
  capitulo_arena_projeto_id uuid references public.capitulo_arena_projeto(id) on delete set null,

  -- A tupla CONGELADA. Sem chave estrangeira para turmas de proposito: a
  -- virada de ano nao pode apagar a linha que sustenta um voto.
  turma_id      uuid,
  papel_id      uuid,
  grupo         smallint,
  turma_rotulo  text,

  -- A NOTA CONGELADA. Entra depois da publicacao, por ordem do Fundador.
  nota              numeric(4,1) check (nota is null or (nota >= 0 and nota <= 10)),
  nota_origem_id    uuid,
  nota_congelada_em timestamptz,

  -- Conferencia humana, dois pares de olhos. E' o veto V3 do parecer de 10/09
  -- virando restricao de banco em vez de combinado.
  conferido_por     uuid,
  conferido_em      timestamptz,
  segundo_par_por   uuid,
  segundo_par_em    timestamptz,
  precisa_reconferir boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (edicao_id, numero),

  -- O GATE DA PUBLICACAO. Note que a NOTA NAO esta' aqui: ela e' exigida no
  -- fechamento da apuracao, nao na publicacao.
  constraint arena_projeto_publicado_conferido check (
    estado <> 'publicado' or (
      publicado_em is not null
      and conferido_em is not null
      and segundo_par_em is not null
    )
  ),
  constraint arena_projeto_nota_tem_carimbo
    check ((nota is null) = (nota_congelada_em is null)),
  constraint arena_projeto_despublicado_tem_motivo check (
    estado <> 'despublicado' or (despublicado_em is not null and despublicado_motivo is not null)
  )
);

create index if not exists arena_projeto_por_edicao
  on public.arena_projeto (edicao_id, estado);

-- ------------------------------------------------------- A MIDIA CONFERIDA
-- Aponta para o bucket DERIVADO, com a copia sanitizada e imutavel. Nunca para
-- a pasta viva do aluno, que ele ainda pode trocar depois da conferencia.
create table if not exists public.arena_projeto_midia (
  id            uuid primary key default gen_random_uuid(),
  projeto_id    uuid not null references public.arena_projeto(id) on delete cascade,
  tipo          text not null check (tipo in ('capa','portfolio','video')),
  caminho       text not null,
  sha256        text,
  bytes         bigint,
  origem_arquivo_id uuid,
  ordem         smallint not null default 0,
  conferido_por uuid not null,
  conferido_em  timestamptz not null default now(),
  unique (projeto_id, tipo, ordem)
);

-- Uma capa e um video por projeto. Portfolio pode ter varios.
create unique index if not exists arena_midia_unica
  on public.arena_projeto_midia (projeto_id, tipo)
  where tipo in ('capa','video');

-- ---------------------------------------------------------------- O VOTO
create table if not exists public.arena_voto (
  id          bigint generated always as identity primary key,
  edicao_id   uuid not null references public.arena_edicao(id) on delete restrict,
  projeto_id  uuid not null references public.arena_projeto(id) on delete restrict,
  criado_em   timestamptz not null default now(),

  -- DIGESTOS, nunca o dado. A Edge Function calcula HMAC-SHA256 com segredo de
  -- servidor e manda so' o hexadecimal. O check de formato NAO e' cosmetico:
  -- e' o que impede que um dia alguem passe um e-mail, um endereco ou um nome
  -- por aqui sem ninguem perceber.
  marca_hash  text not null check (marca_hash ~ '^[0-9a-f]{64}$'),
  rede_hash   text not null check (rede_hash  ~ '^[0-9a-f]{64}$'),

  lista_versao int not null,
  origem      text not null default 'site' check (origem in ('site'))
);

-- UM VOTO POR MARCA POR EDICAO. E' a integridade de verdade da regra, e e' o
-- que resolve corrida entre dois cliques simultaneos.
create unique index if not exists arena_voto_uma_marca
  on public.arena_voto (edicao_id, marca_hash);
create index if not exists arena_voto_por_projeto on public.arena_voto (projeto_id);
create index if not exists arena_voto_teto_rede
  on public.arena_voto (edicao_id, rede_hash, criado_em desc);
create index if not exists arena_voto_curva on public.arena_voto (edicao_id, criado_em);

comment on table public.arena_voto is
  'Voto do site publico. PROIBIDO acrescentar ip, user_agent, referer, email, '
  'cpf, telefone, nome, aluno_id, turma_id, geolocalizacao, peso ou posicao. '
  'Cada um desses transforma esta tabela em dado pessoal ou em dado de aluno.';

-- ------------------------------------------------- RECUSA (a evidencia)
-- Sem ela, "o teto disparou 40 vezes as 10h12" nao existe em lugar nenhum e a
-- defesa do resultado vira palavra contra palavra.
create table if not exists public.arena_recusa (
  id         bigint generated always as identity primary key,
  edicao_id  uuid not null references public.arena_edicao(id) on delete cascade,
  projeto_id uuid,
  motivo     text not null check (motivo in
               ('fora_da_janela','projeto_indisponivel','ja_votou',
                'teto_da_rede','marca_invalida','bilhete_invalido')),
  rede_hash  text check (rede_hash ~ '^[0-9a-f]{64}$'),
  quando     timestamptz not null default now()
);
create index if not exists arena_recusa_leitura
  on public.arena_recusa (edicao_id, motivo, quando);

-- ------------------------------------------------ QUEM MEXEU NA LISTA
create table if not exists public.arena_projeto_evento (
  id         bigint generated always as identity primary key,
  projeto_id uuid not null references public.arena_projeto(id) on delete cascade,
  acao       text not null check (acao in
               ('criou','editou','conferiu','publicou','despublicou',
                'republicou','trocou_midia','congelou_nota')),
  ator       uuid,
  quando     timestamptz not null default now(),
  antes      jsonb,
  depois     jsonb,
  motivo     text
);

-- ------------------------------------------ O RESULTADO CONGELADO
-- Escrito uma vez, no fechamento. Depois disso, editar nota na origem nao move
-- mais nada. Guarda votos e nota crus: a REGRA que combina os dois e' decisao
-- do Fundador e vive em arena_edicao.regra_resultado, publicada antes de abrir.
create table if not exists public.arena_resultado (
  edicao_id   uuid not null references public.arena_edicao(id) on delete restrict,
  projeto_id  uuid not null references public.arena_projeto(id) on delete restrict,
  votos       int not null,
  redes_distintas int not null,
  maior_fatia_de_uma_rede numeric(5,4) not null,
  nota        numeric(4,1) not null,
  apurado_em  timestamptz not null default now(),
  apurado_por uuid,
  primary key (edicao_id, projeto_id)
);

-- ------------------------------------------ A VERSAO DA LISTA
create or replace function public.arena_marca_versao_lista()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if tg_op = 'INSERT' or new.estado is distinct from old.estado then
    update public.arena_edicao
       set lista_versao = lista_versao + 1, updated_at = now()
     where id = new.edicao_id;
  end if;
  return new;
end $$;

drop trigger if exists arena_projeto_versao on public.arena_projeto;
create trigger arena_projeto_versao
  after insert or update of estado on public.arena_projeto
  for each row execute function public.arena_marca_versao_lista();

-- ==========================================================================
-- RLS. Nenhuma policy para anon em NENHUMA das sete tabelas: quem vota nunca
-- toca a tabela, do mesmo jeito que o pai nunca toca a tabela do questionario.
-- ==========================================================================
alter table public.arena_edicao         enable row level security;
alter table public.arena_projeto        enable row level security;
alter table public.arena_projeto_midia  enable row level security;
alter table public.arena_voto           enable row level security;
alter table public.arena_recusa         enable row level security;
alter table public.arena_projeto_evento enable row level security;
alter table public.arena_resultado      enable row level security;

drop policy if exists arena_edicao_rw on public.arena_edicao;
create policy arena_edicao_rw on public.arena_edicao
  for all to authenticated
  using (
    public.has_role(auth.uid(), 'super_admin'::public.app_role)
    or (institution_id = public.get_user_institution_id()
        and (public.has_role(auth.uid(), 'professor'::public.app_role)
             or public.has_role(auth.uid(), 'admin'::public.app_role)))
  )
  with check (
    public.has_role(auth.uid(), 'super_admin'::public.app_role)
    or (institution_id = public.get_user_institution_id()
        and (public.has_role(auth.uid(), 'professor'::public.app_role)
             or public.has_role(auth.uid(), 'admin'::public.app_role)))
  );

drop policy if exists arena_projeto_rw on public.arena_projeto;
create policy arena_projeto_rw on public.arena_projeto
  for all to authenticated
  using (exists (
    select 1 from public.arena_edicao e
     where e.id = arena_projeto.edicao_id
       and (public.has_role(auth.uid(), 'super_admin'::public.app_role)
            or (e.institution_id = public.get_user_institution_id()
                and (public.has_role(auth.uid(), 'professor'::public.app_role)
                     or public.has_role(auth.uid(), 'admin'::public.app_role))))))
  with check (exists (
    select 1 from public.arena_edicao e
     where e.id = arena_projeto.edicao_id
       and (public.has_role(auth.uid(), 'super_admin'::public.app_role)
            or (e.institution_id = public.get_user_institution_id()
                and (public.has_role(auth.uid(), 'professor'::public.app_role)
                     or public.has_role(auth.uid(), 'admin'::public.app_role))))));

drop policy if exists arena_midia_rw on public.arena_projeto_midia;
create policy arena_midia_rw on public.arena_projeto_midia
  for all to authenticated
  using (exists (
    select 1 from public.arena_projeto p join public.arena_edicao e on e.id = p.edicao_id
     where p.id = arena_projeto_midia.projeto_id
       and (public.has_role(auth.uid(), 'super_admin'::public.app_role)
            or (e.institution_id = public.get_user_institution_id()
                and (public.has_role(auth.uid(), 'professor'::public.app_role)
                     or public.has_role(auth.uid(), 'admin'::public.app_role))))))
  with check (exists (
    select 1 from public.arena_projeto p join public.arena_edicao e on e.id = p.edicao_id
     where p.id = arena_projeto_midia.projeto_id
       and (public.has_role(auth.uid(), 'super_admin'::public.app_role)
            or (e.institution_id = public.get_user_institution_id()
                and (public.has_role(auth.uid(), 'professor'::public.app_role)
                     or public.has_role(auth.uid(), 'admin'::public.app_role))))));

-- arena_voto, arena_recusa, arena_projeto_evento e arena_resultado ficam com
-- RLS ligada e NENHUMA policy, de proposito. Ninguem le' direto, nem professor
-- nem admin. A leitura sai pelas funcoes de apuracao; a escrita, pela funcao
-- do voto, que roda com dono.

-- ==========================================================================
-- A ESCRITA DO VOTO. Chamada pela Edge Function, nunca pelo navegador.
-- ==========================================================================
create or replace function public.arena_registrar_voto(
  p_edicao     uuid,
  p_projeto    uuid,
  p_marca_hash text,
  p_rede_hash  text
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_ed   public.arena_edicao%rowtype;
  v_pr   public.arena_projeto%rowtype;
  v_ja   uuid;
  v_rede int;
  v_hora int;
  v_id   bigint;
begin
  -- (1) FORMATO. Se nao e' digesto hexadecimal de 64, e' outra coisa, e outra
  -- coisa nao entra nesta tabela.
  if p_marca_hash !~ '^[0-9a-f]{64}$' or p_rede_hash !~ '^[0-9a-f]{64}$' then
    insert into public.arena_recusa(edicao_id, projeto_id, motivo)
      values (p_edicao, p_projeto, 'marca_invalida');
    return jsonb_build_object('ok', false, 'motivo', 'marca_invalida');
  end if;

  -- (2) A JANELA, pelo relogio do SERVIDOR. Nunca a hora que o cliente diz.
  select * into v_ed from public.arena_edicao where id = p_edicao;
  if not found or v_ed.estado <> 'aberta'
     or v_ed.abre_em is null or v_ed.fecha_em is null
     or now() < v_ed.abre_em or now() >= v_ed.fecha_em then
    insert into public.arena_recusa(edicao_id, projeto_id, motivo, rede_hash)
      values (p_edicao, p_projeto, 'fora_da_janela', p_rede_hash);
    return jsonb_build_object('ok', false, 'motivo', 'fora_da_janela');
  end if;

  -- (3) O PROJETO existe, e' desta edicao e esta' publicado AGORA.
  select * into v_pr from public.arena_projeto
   where id = p_projeto and edicao_id = p_edicao;
  if not found or v_pr.estado <> 'publicado' then
    insert into public.arena_recusa(edicao_id, projeto_id, motivo, rede_hash)
      values (p_edicao, p_projeto, 'projeto_indisponivel', p_rede_hash);
    return jsonb_build_object('ok', false, 'motivo', 'projeto_indisponivel');
  end if;

  -- (4) JA' VOTOU. Idempotente de proposito: clique duplo e retentativa em
  -- rede ruim nao podem virar erro na cara da pessoa nem voto a mais.
  select projeto_id into v_ja from public.arena_voto
   where edicao_id = p_edicao and marca_hash = p_marca_hash;
  if found then
    return jsonb_build_object('ok', false, 'motivo', 'ja_votou', 'projeto_id', v_ja);
  end if;

  -- (5) O TETO POR REDE. Dois tetos: o da edicao e o da hora. O da hora e' o
  -- que pega robo sem punir a escola inteira saindo pelo mesmo endereco.
  select count(*) into v_rede from public.arena_voto
   where edicao_id = p_edicao and rede_hash = p_rede_hash;
  select count(*) into v_hora from public.arena_voto
   where edicao_id = p_edicao and rede_hash = p_rede_hash
     and criado_em > now() - interval '1 hour';
  if v_rede >= v_ed.teto_por_rede or v_hora >= v_ed.teto_por_rede_hora then
    insert into public.arena_recusa(edicao_id, projeto_id, motivo, rede_hash)
      values (p_edicao, p_projeto, 'teto_da_rede', p_rede_hash);
    return jsonb_build_object('ok', false, 'motivo', 'teto_da_rede');
  end if;

  -- (6) GRAVA. O indice unico e' a autoridade final: em corrida, o segundo cai
  -- no conflito e vira 'ja_votou'.
  insert into public.arena_voto(edicao_id, projeto_id, marca_hash, rede_hash, lista_versao)
  values (p_edicao, p_projeto, p_marca_hash, p_rede_hash, v_ed.lista_versao)
  on conflict (edicao_id, marca_hash) do nothing
  returning id into v_id;

  if v_id is null then
    return jsonb_build_object('ok', false, 'motivo', 'ja_votou');
  end if;

  -- O id do voto NUNCA volta ao cliente: sendo sequencial, ele entregaria o
  -- total corrente de votos da edicao para quem soubesse ler.
  return jsonb_build_object('ok', true, 'projeto_id', p_projeto);
end $$;

-- ATENCAO ao ler o codigo acima: as recusas sao GRAVADAS e a funcao RETORNA,
-- nunca levanta excecao. Um raise desfaria a transacao inteira e apagaria o
-- proprio registro da recusa, que e' exatamente a evidencia que se quer ter.

revoke all on function public.arena_registrar_voto(uuid,uuid,text,text)
  from public, anon, authenticated;
grant execute on function public.arena_registrar_voto(uuid,uuid,text,text)
  to service_role;

-- ==========================================================================
-- A APURACAO. Ninguem consulta arena_voto direto; le'-se por aqui.
-- ==========================================================================
create or replace function public.arena_apuracao(p_edicao uuid)
returns table (
  projeto_id uuid, numero smallint, titulo text, estado text,
  votos bigint, redes_distintas bigint, maior_fatia numeric,
  nota numeric, nota_faltando boolean
)
language plpgsql stable security definer set search_path = public, pg_temp
as $$
begin
  if not public.has_role(auth.uid(), 'super_admin'::public.app_role) then
    raise exception 'apuracao: sem permissao';
  end if;

  return query
  with por_rede as (
    select v.projeto_id, v.rede_hash, count(*) as n
      from public.arena_voto v
     where v.edicao_id = p_edicao
     group by v.projeto_id, v.rede_hash
  ),
  resumo as (
    select r.projeto_id,
           sum(r.n) as n,
           count(*) as redes,
           max(r.n)::numeric / sum(r.n)::numeric as fatia
      from por_rede r
     group by r.projeto_id
  )
  select p.id, p.numero, p.titulo, p.estado,
         coalesce(s.n, 0)::bigint,
         coalesce(s.redes, 0)::bigint,
         coalesce(s.fatia, 0),
         p.nota,
         (p.nota is null)
    from public.arena_projeto p
    left join resumo s on s.projeto_id = p.id
   where p.edicao_id = p_edicao
   -- ORDEM POR NUMERO, nunca por pontuacao. Ordenar e' ato do leitor: se a
   -- fonte ja' viesse ordenada por desempenho, qualquer tela que a consumisse
   -- viraria um placar por acidente.
   order by p.numero;
end $$;

-- O FECHAMENTO. Congela. Roda uma vez, depois que a janela fecha.
create or replace function public.arena_fechar_apuracao(p_edicao uuid)
returns int
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_n int; v_fecha timestamptz;
begin
  if not public.has_role(auth.uid(), 'super_admin'::public.app_role) then
    raise exception 'apuracao: sem permissao';
  end if;
  if exists (select 1 from public.arena_resultado where edicao_id = p_edicao) then
    raise exception 'apuracao ja fechada: congelado e congelado';
  end if;
  select fecha_em into v_fecha from public.arena_edicao where id = p_edicao;
  if v_fecha is null or now() < v_fecha then
    raise exception 'a janela ainda esta aberta';
  end if;
  -- AQUI e' onde a nota vira obrigatoria. Ordem do Fundador em 10/09: o site
  -- conta os votos primeiro, as notas entram depois, e a conta so' fecha
  -- quando todas existirem.
  if exists (select 1 from public.arena_projeto
              where edicao_id = p_edicao and estado = 'publicado' and nota is null) then
    raise exception 'ha projeto publicado sem nota: a conta nao fecha';
  end if;

  insert into public.arena_resultado (edicao_id, projeto_id, votos, redes_distintas,
                                      maior_fatia_de_uma_rede, nota, apurado_por)
  select p_edicao, a.projeto_id, a.votos::int, a.redes_distintas::int,
         a.maior_fatia, a.nota, auth.uid()
    from public.arena_apuracao(p_edicao) a
   where a.estado = 'publicado';
  get diagnostics v_n = row_count;

  update public.arena_edicao
     set estado = 'apurada', updated_at = now()
   where id = p_edicao;
  return v_n;
end $$;

-- ------------------------------------------------- O PRAZO DOS DIGESTOS
-- Hash guardado para sempre e' dado pessoal com finalidade vencida. Passados
-- 90 dias do fechamento, os digestos somem e sobra estatistica.
create or replace function public.arena_anonimizar_edicao(p_edicao uuid)
returns int
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_n int;
begin
  if not public.has_role(auth.uid(), 'super_admin'::public.app_role) then
    raise exception 'sem permissao';
  end if;
  update public.arena_voto
     set marca_hash = repeat('0', 64), rede_hash = repeat('0', 64)
   where edicao_id = p_edicao and marca_hash <> repeat('0', 64);
  get diagnostics v_n = row_count;
  update public.arena_recusa set rede_hash = null
   where edicao_id = p_edicao and rede_hash is not null;
  return v_n;
end $$;

revoke all on function public.arena_apuracao(uuid)          from public, anon;
revoke all on function public.arena_fechar_apuracao(uuid)   from public, anon;
revoke all on function public.arena_anonimizar_edicao(uuid) from public, anon;
grant execute on function public.arena_apuracao(uuid)          to authenticated;
grant execute on function public.arena_fechar_apuracao(uuid)   to authenticated;
grant execute on function public.arena_anonimizar_edicao(uuid) to authenticated;

-- Conferencia de que subiu tudo.
select table_name from information_schema.tables
 where table_schema = 'public' and table_name like 'arena\_%'
 order by table_name;
