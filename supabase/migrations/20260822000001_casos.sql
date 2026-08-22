-- ============================================================
-- OS CASOS · o chão da fábrica, guardado
--
-- Uma frase entra crua, ganha etiqueta, encontra outra frase, vira mecanismo
-- visível, vira aposta com rival, sai como bilhete para o professor, volta como
-- cena nova, e no fim da fase encolhe num destilado. Estas tabelas são as
-- estações dessa linha.
--
-- ISTO É A COISA MAIS SENSÍVEL DO SISTEMA INTEIRO. Não é observação: é hipótese
-- sobre uma criança, escrita por adultos, guardada por anos. Por isso a doutrina
-- não fica só na cabeça de quem usa, ela fica NO BANCO:
--
--  1. Aposta SEM RIVAL não entra. É constraint, não recomendação. Hipótese
--     solitária é rótulo com passos extras, e o banco recusa.
--
--  2. Aposta sem "o que derrubaria" também não entra. Se ninguém consegue dizer
--     o que provaria o contrário, aquilo não é hipótese, é crença.
--
--  3. Nada é "identificado". O estado é da INVESTIGAÇÃO (aberta, sustentada,
--     derrubada), sempre com a data da última checagem. Sustentada não é
--     sentença: é o que a evidência aguenta hoje.
--
--  4. A cena aponta de volta para o dado cru (origem_tipo, origem_id). A ficha
--     NUNCA substitui o acervo. Se a etiqueta estiver errada daqui a dois anos,
--     a frase original continua lá para ser lida de novo.
--
--  5. Leitura só de admin e super_admin. Nem professor, nem líder de casa. A
--     criança nunca, em nenhuma hipótese e em nenhuma idade.
-- ============================================================

-- ------------------------------------------------------------------- o caso
create table if not exists public.casos (
  id uuid primary key default gen_random_uuid(),
  numero int not null unique,

  -- Quase sempre é uma criança. O #0 é o próprio Fundador, e por isso aluno_id
  -- aceita nulo: o método vale para quem for investigado, e ele quis ser o
  -- primeiro a passar pelo próprio instrumento.
  aluno_id uuid references public.profiles(id) on delete cascade,
  quem text,

  titulo text not null,
  pergunta text,                       -- o que se quer entender, em uma frase
  estado text not null default 'aberto'
    check (estado in ('aberto','sondando','em_espera','encerrado')),
  motivo_encerramento text,

  institution_id uuid,
  aberto_em timestamptz not null default now(),
  ultima_atividade timestamptz not null default now(),

  -- Ou é de uma criança, ou tem um nome escrito. Caso sem sujeito não existe.
  constraint caso_tem_sujeito check (aluno_id is not null or coalesce(trim(quem),'') <> '')
);

create index if not exists idx_casos_aluno on public.casos(aluno_id);

-- ------------------------------------------------- estação 2 · a ficha (cena)
create table if not exists public.caso_cena (
  id uuid primary key default gen_random_uuid(),
  caso_id uuid not null references public.casos(id) on delete cascade,

  tipo text not null default 'cena'
    check (tipo in ('cena','interesse','onde_trava')),

  -- A etiqueta, curta. O texto original NÃO vem para cá: ele fica no acervo, e
  -- daqui se aponta para lá.
  descricao text not null,
  citacao text,                        -- o trecho literal, quando vale citar

  fonte text not null check (fonte in ('casa','escola','aluno','outro')),
  quem text,                           -- "a mãe", "a avó", "a professora"
  quando date,

  -- O ponteiro de volta para o cru. Sem isto a ficha vira boato.
  origem_tipo text,                    -- questionario_pais_resposta, arboria_observacoes, ...
  origem_id uuid,

  criado_em timestamptz not null default now()
);

create index if not exists idx_caso_cena on public.caso_cena(caso_id, tipo);

-- ------------------------------- estação 3 · o cruzamento (mecanismo visível)
-- Uma cena sozinha é anedota. Duas que se encaixam viram mecanismo, e o peso é
-- literalmente quantas cenas o sustentam. Por isso as cenas ficam guardadas
-- aqui: o mecanismo tem que poder mostrar de onde saiu.
create table if not exists public.caso_mecanismo (
  id uuid primary key default gen_random_uuid(),
  caso_id uuid not null references public.casos(id) on delete cascade,
  descricao text not null,
  cenas uuid[] not null default '{}',
  ordem smallint not null default 0,
  criado_em timestamptz not null default now()
);

create index if not exists idx_caso_mecanismo on public.caso_mecanismo(caso_id, ordem);

-- --------------------------------------------------- estação 4 · a aposta
create table if not exists public.caso_aposta (
  id uuid primary key default gen_random_uuid(),
  caso_id uuid not null references public.casos(id) on delete cascade,
  mecanismo_id uuid references public.caso_mecanismo(id) on delete set null,

  hipotese text not null,
  rival text not null,
  o_que_derrubaria text not null,

  estado text not null default 'aberta'
    check (estado in ('aberta','sustentada','derrubada')),
  motivo_queda text,

  data_aposta date not null default current_date,
  checada_em date,

  criado_em timestamptz not null default now(),

  -- A DOUTRINA COMO CONSTRAINT. Hipótese sem rival e sem o que a derrubaria não
  -- entra no banco, nem por engano, nem por pressa.
  constraint aposta_tem_rival check (coalesce(trim(rival),'') <> ''),
  constraint aposta_tem_queda check (coalesce(trim(o_que_derrubaria),'') <> ''),
  constraint queda_tem_motivo check (
    estado <> 'derrubada' or coalesce(trim(motivo_queda),'') <> '')
);

create index if not exists idx_caso_aposta on public.caso_aposta(caso_id, estado);

-- -------------------------------------- estação 5 e 6 · o bilhete e a volta
create table if not exists public.caso_sondagem (
  id uuid primary key default gen_random_uuid(),
  caso_id uuid not null references public.casos(id) on delete cascade,
  aposta_id uuid references public.caso_aposta(id) on delete set null,

  -- Uma coisa por vez. O texto do que foi pedido, do jeito que foi pedido.
  pedido text not null,
  pergunta text not null,              -- a que decide, e que pode dar errado
  para_quem text,

  enviada_em date not null default current_date,
  volta text,
  voltou_em date,

  criado_em timestamptz not null default now()
);

create index if not exists idx_caso_sondagem on public.caso_sondagem(caso_id, voltou_em);

-- ------------------------------------------- estação 7 · o destilado da fase
create table if not exists public.caso_destilado (
  id uuid primary key default gen_random_uuid(),
  caso_id uuid not null references public.casos(id) on delete cascade,
  fase text not null,
  resumo text not null,
  o_que_caiu text,
  o_que_falta_saber text,
  criado_em timestamptz not null default now()
);

create index if not exists idx_caso_destilado on public.caso_destilado(caso_id, criado_em);

-- =========================================================== a RLS
-- Só quem manda na escola lê. A criança nunca, em nenhuma idade. O professor
-- recebe o BILHETE, que é outra coisa: uma sugestão e uma pergunta, sem a
-- hipótese escrita, porque hipótese na mão de quem observa contamina o que ele
-- vai ver na semana seguinte.
do $$
declare t text;
begin
  foreach t in array array['casos','caso_cena','caso_mecanismo','caso_aposta',
                           'caso_sondagem','caso_destilado']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "Dono do Arboria" on public.%I', t);
    execute format($f$
      create policy "Dono do Arboria" on public.%I for all to authenticated
      using (public.has_role(auth.uid(), 'admin'::public.app_role)
          or public.has_role(auth.uid(), 'super_admin'::public.app_role))
      with check (public.has_role(auth.uid(), 'admin'::public.app_role)
          or public.has_role(auth.uid(), 'super_admin'::public.app_role))
    $f$, t);
  end loop;
end $$;

-- --------------------------------------------------------------- conferência
-- Prova que a doutrina está mesmo travada no banco: uma aposta sem rival tem
-- que ser RECUSADA.
do $$
declare v_caso uuid;
begin
  insert into public.casos (numero, quem, titulo)
  values (-1, 'teste', 'teste de constraint') returning id into v_caso;

  begin
    insert into public.caso_aposta (caso_id, hipotese, rival, o_que_derrubaria)
    values (v_caso, 'ela repara em tudo', '', 'nada');
    raise exception 'A CONSTRAINT NAO PEGOU: aposta sem rival entrou';
  exception when check_violation then
    raise notice 'ok: aposta sem rival foi recusada pelo banco';
  end;

  delete from public.casos where id = v_caso;
end $$;

select 'casos' as etapa, 'as seis estacoes existem' as estado;
