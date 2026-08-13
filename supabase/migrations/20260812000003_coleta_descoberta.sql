-- 12/08/2026 — Aba COLETA do painel do dono (/arboria/coleta).
--
-- PARA QUE SERVE: registrar a conversa de descoberta com as professoras, UMA FICHA POR SERIE
-- (Maternal 2, Maternal 3, Grupo IV, Grupo V), para aprender COMO E' UMA CRIANCA DE CADA IDADE
-- antes de escrever os questionarios do professor e dos pais. Ordem do Fundador em 12/08.
--
-- O QUE ESTA TABELA NAO E': ela NAO guarda nada sobre nenhuma crianca. Nao tem aluno_id, nao tem
-- turma_id, nao tem nome de crianca. E' sobre a FAIXA ETARIA e sobre a rotina da serie. Por isso
-- nao toca em nenhum dos tres vetos suspensivos de Riscos de 12/08, que valem para os instrumentos
-- que virao depois. Se um dia alguem quiser pendurar resposta de crianca aqui, o lugar e' outro.
--
-- ANCORA: serie, nunca turma. O Fundador colhe uma vez por serie porque as professoras sao as
-- mesmas e o objeto e' a idade, nao a turma especifica.

create table if not exists public.coleta_descoberta (
  id               uuid primary key default gen_random_uuid(),
  institution_id   uuid not null references public.institutions(id) on delete cascade,
  segmento         text not null,           -- 'infantil' | 'fundamental1' | 'fundamental2'
  serie            text not null,           -- 'Maternal 2' | 'Maternal 3' | 'Grupo IV' | 'Grupo V'
  ordem            integer not null default 0,
  professoras      text,                    -- quem respondeu (texto livre, adulto, nao e' dado de menor)
  num_criancas     integer,
  idade_referencia text,                    -- "2 anos", "3 anos": a idade que a ficha caracteriza
  respostas        jsonb not null default '{}'::jsonb,  -- { "q01": "...", "q18": ["parque","historia"] }
  status           text not null default 'nao_iniciada', -- nao_iniciada | em_andamento | concluida
  criado_por       uuid references auth.users(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint coleta_descoberta_status_chk
    check (status in ('nao_iniciada', 'em_andamento', 'concluida')),
  constraint coleta_descoberta_uniq unique (institution_id, segmento, serie)
);

create index if not exists coleta_descoberta_inst_seg_idx
  on public.coleta_descoberta (institution_id, segmento, ordem);

drop trigger if exists trg_coleta_descoberta_updated_at on public.coleta_descoberta;
create trigger trg_coleta_descoberta_updated_at
  before update on public.coleta_descoberta
  for each row execute function public.update_updated_at_column();

-- ---------------------------------------------------------------- RLS
-- So o dono da plataforma (super_admin). A coordenacao da escola nao ve, porque isto e' material
-- de pesquisa do produto, e a professora respondeu em conversa, nao para o RH dela.
alter table public.coleta_descoberta enable row level security;

drop policy if exists "Coleta lida por super_admin" on public.coleta_descoberta;
create policy "Coleta lida por super_admin" on public.coleta_descoberta
  for select to authenticated
  using (public.has_role(auth.uid(), 'super_admin'::public.app_role));

drop policy if exists "Coleta criada por super_admin" on public.coleta_descoberta;
create policy "Coleta criada por super_admin" on public.coleta_descoberta
  for insert to authenticated
  with check (public.has_role(auth.uid(), 'super_admin'::public.app_role));

drop policy if exists "Coleta editada por super_admin" on public.coleta_descoberta;
create policy "Coleta editada por super_admin" on public.coleta_descoberta
  for update to authenticated
  using (public.has_role(auth.uid(), 'super_admin'::public.app_role))
  with check (public.has_role(auth.uid(), 'super_admin'::public.app_role));

-- Sem policy de DELETE: ficha de pesquisa nao se apaga, se reescreve.

-- ---------------------------------------------------------------- semente do Infantil
-- Cria as quatro fichas vazias para a instituicao que ja existe, para o Fundador so abrir e
-- responder. Idempotente: rodar de novo nao duplica nem apaga resposta.
insert into public.coleta_descoberta (institution_id, segmento, serie, ordem, idade_referencia)
select i.id, 'infantil', s.serie, s.ordem, s.idade
from public.institutions i
cross join (values
  ('Maternal 2', 1, '2 anos'),
  ('Maternal 3', 2, '3 anos'),
  ('Grupo IV',   3, '4 anos'),
  ('Grupo V',    4, '5 anos')
) as s(serie, ordem, idade)
on conflict (institution_id, segmento, serie) do nothing;
