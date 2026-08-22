-- ============================================================
-- A LEITURA PASSA A SER DATADA, E NUNCA MAIS SE APAGA
--
-- Pedido do Fundador em 22/08, e é a peça que faltava no modelo inteiro:
--
--   "Esse arquivo do Ayrton vai se atualizando, não corrigindo o que já tem. O
--    que tem, deixa. Vamos adicionando. Hoje estamos tendo essa visão dele, mas
--    daqui a pouco essa visão pode mudar, e eu não quero perder a visão que a
--    gente tinha hoje."
--
-- O modelo estava errado nisso. `o_que_estamos_vendo` e `analise` eram campos
-- que se SOBRESCREVEM: cada leitura nova apagava a anterior, e a construção
-- desaparecia. Vira tabela, e cada leitura tem data. Nada se corrige, tudo se
-- acrescenta. É por isso que ele chamava de diário.
--
-- E A FORMA IMPORTA. O Fundador destrinchou a lógica do PDF que a gente já
-- levou para a professora, e ela é uma cronologia de argumento:
--
--   venho acompanhando desde julho
--   as cenas, com data, uma a uma
--   e ao mesmo tempo aparece isto, que você conhece bem
--   essas duas coisas não combinam, e é por isso que não combinam
--   então o problema não parece ser X, parece ser Y
--   o que eu quero descobrir com a sua ajuda
--
-- Quem lê nessa ordem se convence e entra no caso. Quem lê uma ficha de campos
-- preenchidos não entra em lugar nenhum.
--
-- E A PEÇA QUE FALTAVA. O PDF tinha uma coisa que o caso não tinha: "na hora de
-- falar, ele atropela". Veio da professora, pelo Fundador. É justamente a
-- METADE que faz a tensão existir, e sem ela a leitura ficou girando em "narra
-- ou organiza", que é uma pergunta pior. Entra agora como cena, sem origem_id,
-- porque é relato e não registro.
-- ============================================================

-- --------------------------------------------------- a peça que faltava
insert into public.caso_cena (caso_id, tipo, descricao, citacao, fonte, quem,
                              quando, contexto)
select c.id, 'onde_trava',
       'Na hora de falar, ele atropela',
       'Ele passa o dia desenhando, faz gibi, ama contar. Mas na hora de falar, atropela: as ideias vêm rápido demais, a história sai embaralhada, e quem ouve perde o fio.',
       'escola', 'a professora, em conversa com o Fundador', date '2026-07-01',
       'Relato de sala, sem episódio datado. É a metade da tensão do caso e não tem registro escrito.'
  from public.casos c
 where c.numero = 1
   and not exists (select 1 from public.caso_cena x
                    where x.caso_id = c.id and x.descricao like 'Na hora de falar%');

-- ------------------------------------------------------ a leitura datada
create table if not exists public.caso_leitura (
  id uuid primary key default gen_random_uuid(),
  caso_id uuid not null references public.casos(id) on delete cascade,

  quando date not null default current_date,
  titulo text,

  -- A leitura inteira, em prosa, na ordem que convence: cenas com data, o que
  -- não combina, o argumento, e o que se quer descobrir.
  texto text not null,

  -- O que mudou desde a leitura anterior. É isto que faz a pilha virar
  -- construção em vez de repetição. Nulo na primeira.
  o_que_mudou text,

  criado_por uuid references auth.users(id),
  criado_em timestamptz not null default now()
);

create index if not exists idx_caso_leitura on public.caso_leitura(caso_id, quando desc);

alter table public.caso_leitura enable row level security;

-- SEM UPDATE E SEM DELETE, de propósito. Leitura antiga não se corrige: se ela
-- estava errada, a leitura seguinte diz isso, com data. É o que garante que a
-- visão de hoje sobreviva à visão de amanhã.
drop policy if exists "Dono do Arboria" on public.caso_leitura;
drop policy if exists "Le a leitura" on public.caso_leitura;
create policy "Le a leitura" on public.caso_leitura for select to authenticated
using (public.has_role(auth.uid(), 'admin'::public.app_role)
    or public.has_role(auth.uid(), 'super_admin'::public.app_role));

drop policy if exists "Escreve leitura nova" on public.caso_leitura;
create policy "Escreve leitura nova" on public.caso_leitura for insert to authenticated
with check (public.has_role(auth.uid(), 'admin'::public.app_role)
    or public.has_role(auth.uid(), 'super_admin'::public.app_role));

-- ============================================================
-- A PRIMEIRA LEITURA DO AYRTON
-- ============================================================
insert into public.caso_leitura (caso_id, quando, titulo, texto)
select c.id, date '2026-08-22',
       'O problema não parece ser organização',
$$Venho acompanhando o Ayrton desde julho. Juntando o que a escola registrou com o que a família contou agora em agosto, apareceu uma coisa que nenhum registro sozinho mostrava.

**21 de julho.** A tarefa era fazer um convite. Sem ninguém pedir, ele inventou um campeonato de desenhos, montou o cronograma de quem ia participar e ainda escolheu quem seria o auxiliar dele.

**22 de julho.** Apresentou uma receita de molho de pimenta como se fosse notícia. Desenhou onde o molho ficaria e, na explicação, listou os ingredientes na ordem. No mesmo dia, no grupo, tomou a liderança.

**1º de agosto.** Defendeu que a escola precisa de filosofia, e explicou por quê: porque melhora o raciocínio e serve para as outras matérias.

**21 de agosto**, a mãe respondeu o questionário. Contou que ele anda com as revistas em quadrinhos que ele mesmo faz numa sacola, para todo lado, e com uma maletinha de Lego que vai de casa para a casa da avó. E contou uma coisa que a escola não tinha: ele fala sem parar dos personagens que cria, como se a gente os conhecesse pessoalmente, e pergunta "sabia?" depois de cada frase.

E ao mesmo tempo aparece isto, que a professora conhece bem: **na hora de falar, ele atropela.** As ideias vêm rápido demais, a história sai embaralhada, e quem ouve perde o fio.

**Essas duas coisas não combinam.** Quem monta cronograma, escolhe auxiliar e lista ingredientes na ordem não é uma criança que não sabe organizar. Então o problema não parece ser organização.

Parece ser o caminho entre ter a ideia e conseguir entregar ela inteira, falando.

E aqui o "sabia?" que a mãe contou encaixa, e é a peça nova desta leitura: se ele para depois de cada frase para conferir se o outro ainda está junto, é porque ele já percebeu, sozinho, que se perde no caminho. Ninguém ensinou isso a ele.

**O que eu quero descobrir:** o que ajuda o Ayrton a organizar o que ele tem para dizer, antes de dizer.$$
  from public.casos c
 where c.numero = 1
   and not exists (select 1 from public.caso_leitura l where l.caso_id = c.id);

-- ------------------------------------------- a pergunta do caso acompanha
update public.casos set
  titulo = 'O que ajuda o Ayrton a organizar o que ele tem para dizer, antes de dizer?',
  pergunta = 'Ele organiza muito bem quando o que sai é desenho, cronograma ou lista. O que embaralha é a fala.',
  o_que_muda = 'Se for o caminho entre pensar e falar, a saída não é ensinar ele a se organizar, porque isso ele já faz. É dar a ele alguma coisa na mão ANTES de falar, e descobrir o quê. Tratar como falta de organização seria ensinar o que ele já sabe, e ele continuaria atropelando.',
  proxima_peca = 'Três vezes contando alguma coisa em voz alta, mudando só o que ele teve na mão antes. Sem nada, com seis quadros desenhados, e com uma lista escrita. A que não tem nada na mão é a régua.'
 where numero = 1;

-- --------------------------------------------------------------- conferência
select c.numero, l.quando::text as leitura_de, l.titulo,
       length(l.texto) as letras,
       (select count(*) from public.caso_cena x where x.caso_id=c.id) as cenas
  from public.casos c
  left join public.caso_leitura l on l.caso_id = c.id
 where c.numero = 1;
