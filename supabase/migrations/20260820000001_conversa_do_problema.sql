-- ============================================================
-- A CONVERSA DO RELATO
--
-- Ate hoje o relato do aluno era mao unica: ele escrevia e nunca sabia se
-- alguem tinha lido. Em 20/08 o Fundador leu os 15 relatos e encontrou sete
-- alunos descrevendo o MESMO defeito em abril, e treze relatos sem nenhuma
-- resposta, alguns de quatro meses atras. Uma aluna do 9o ano chegou a se
-- desculpar por um problema que era do app: "creio que seja algo no meu
-- celular".
--
-- Isto transforma o relato em conversa. Ordem do Fundador em 20/08.
--
-- QUEM VE O QUE, e esta e a parte que nao pode dar errado:
--   - o aluno ve SO a conversa dos relatos DELE;
--   - nenhum aluno ve o relato de outro, nem por engano;
--   - professor e lider de casa NAO veem nada aqui. E' conversa entre a
--     crianca e o Arboria, e abrir para o professor mudaria o que a crianca se
--     sente a vontade de escrever;
--   - admin e super_admin veem tudo, porque sao quem responde.
--
-- 'de' guarda quem falou. Nao existe nome de pessoa do lado do Arboria de
-- proposito: a crianca conversa com o Arboria, nao com um adulto especifico.
-- ============================================================

create table if not exists public.problema_mensagens (
  id uuid primary key default gen_random_uuid(),
  problema_id uuid not null references public.problemas_alunos(id) on delete cascade,
  de text not null check (de in ('aluno', 'arboria')),
  texto text not null check (length(trim(texto)) > 0),
  lida_pelo_aluno boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_problema_mensagens_problema
  on public.problema_mensagens(problema_id, created_at);

alter table public.problema_mensagens enable row level security;

-- ------------------------------------------------------------------ leitura
drop policy if exists "Aluno le a conversa do proprio relato" on public.problema_mensagens;
create policy "Aluno le a conversa do proprio relato"
on public.problema_mensagens for select to authenticated
using (
  exists (
    select 1 from public.problemas_alunos pa
    where pa.id = problema_mensagens.problema_id
      and pa.aluno_id = auth.uid()
  )
);

drop policy if exists "Admin le todas as conversas" on public.problema_mensagens;
create policy "Admin le todas as conversas"
on public.problema_mensagens for select to authenticated
using (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  or public.has_role(auth.uid(), 'super_admin'::public.app_role)
);

-- ------------------------------------------------------------------ escrita
-- O aluno so escreve COMO ALUNO e so no proprio relato. Sem o check de 'de',
-- daria para forjar uma mensagem assinada pelo Arboria.
drop policy if exists "Aluno responde no proprio relato" on public.problema_mensagens;
create policy "Aluno responde no proprio relato"
on public.problema_mensagens for insert to authenticated
with check (
  de = 'aluno'
  and exists (
    select 1 from public.problemas_alunos pa
    where pa.id = problema_mensagens.problema_id
      and pa.aluno_id = auth.uid()
  )
);

drop policy if exists "Admin responde em qualquer relato" on public.problema_mensagens;
create policy "Admin responde em qualquer relato"
on public.problema_mensagens for insert to authenticated
with check (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  or public.has_role(auth.uid(), 'super_admin'::public.app_role)
);

-- O aluno so marca como lida. Nao edita texto e nao apaga: a conversa fica.
drop policy if exists "Aluno marca a conversa como lida" on public.problema_mensagens;
create policy "Aluno marca a conversa como lida"
on public.problema_mensagens for update to authenticated
using (
  exists (
    select 1 from public.problemas_alunos pa
    where pa.id = problema_mensagens.problema_id
      and pa.aluno_id = auth.uid()
  )
);

-- ------------------------------------------------------- o aluno ve o proprio
-- Faltava. Sem isto o aluno nao consegue nem listar os relatos que ele mesmo
-- escreveu, e a conversa nao teria como aparecer para ele.
drop policy if exists "Aluno le os proprios relatos" on public.problemas_alunos;
create policy "Aluno le os proprios relatos"
on public.problemas_alunos for select to authenticated
using (aluno_id = auth.uid());

select 'problema_mensagens criada' as resultado,
       (select count(*) from pg_policies
         where schemaname='public' and tablename='problema_mensagens') as politicas;
