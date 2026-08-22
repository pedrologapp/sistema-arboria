-- ============================================================
-- O MECANISMO PASSA A TER LASTRO
--
-- Pedagogia e Dados chegaram ao mesmo ponto por caminhos diferentes: os 25
-- mecanismos tinham `cenas` VAZIO, zero de 25. A tela dizia "do mais sustentado
-- para o menos" e numerava de 1 a 4, mas nada sustentava nada. Era uma lista de
-- afirmações sem prova, com a forma de um perfil de predominância, no único elo
-- da cadeia onde duas cenas viram uma afirmação.
--
-- TRÊS CORREÇÕES, e a primeira custa zero exatamente agora:
--
-- 1. `cenas uuid[]` vira tabela de ligação com PAPEL. O array não conseguia
--    dizer que uma cena CONTRADIZ o mecanismo, e a doutrina do projeto diz que
--    divergência é dado, não ruído. Sem `papel`, a contradição não tinha onde
--    morar. Migrar agora custa zero porque os 25 arrays estão vazios.
--
-- 2. AUTORIA. Hipótese sobre criança, guardada por anos, sem quem escreveu, não
--    é auditável nem revisável. Toda estação ganha `criado_por`.
--
-- 3. `casos.aluno_id` sai de `cascade` para `restrict`. Com a importação de
--    alunos rodando, um delete acidental de perfil apagava o caso inteiro. E
--    `quem` existe justamente para o caso sobreviver sem perfil.
-- ============================================================

-- --------------------------------------------- 1. a ligação, com papel
create table if not exists public.caso_mecanismo_cena (
  mecanismo_id uuid not null references public.caso_mecanismo(id) on delete cascade,
  cena_id uuid not null references public.caso_cena(id) on delete cascade,

  -- O que esta cena FAZ com o mecanismo. "contradiz" é a razão de existir desta
  -- coluna: uma cena que vai contra é o dado mais valioso do conjunto, e num
  -- array de uuid ela ficaria indistinguível de uma que confirma.
  papel text not null default 'sustenta'
    check (papel in ('sustenta','contradiz','qualifica')),

  criado_em timestamptz not null default now(),
  primary key (mecanismo_id, cena_id)
);

alter table public.caso_mecanismo_cena enable row level security;
drop policy if exists "Dono do Arboria" on public.caso_mecanismo_cena;
create policy "Dono do Arboria" on public.caso_mecanismo_cena for all to authenticated
using (public.has_role(auth.uid(), 'admin'::public.app_role)
    or public.has_role(auth.uid(), 'super_admin'::public.app_role))
with check (public.has_role(auth.uid(), 'admin'::public.app_role)
    or public.has_role(auth.uid(), 'super_admin'::public.app_role));

comment on column public.caso_mecanismo.cenas is
  'DEPRECADA em 22/08/2026. Use caso_mecanismo_cena, que guarda tambem o papel da cena. Mantida vazia para nao quebrar leitura antiga.';

-- ------------------------------------------------------------ 2. autoria
alter table public.casos           add column if not exists criado_por uuid references auth.users(id);
alter table public.caso_cena       add column if not exists criado_por uuid references auth.users(id);
alter table public.caso_mecanismo  add column if not exists criado_por uuid references auth.users(id);
alter table public.caso_aposta     add column if not exists criado_por uuid references auth.users(id);
alter table public.caso_sondagem   add column if not exists criado_por uuid references auth.users(id);
alter table public.caso_destilado  add column if not exists criado_por uuid references auth.users(id);

-- ------------------------------------- 3. o caso sobrevive ao perfil
alter table public.casos drop constraint if exists casos_aluno_id_fkey;
alter table public.casos add constraint casos_aluno_id_fkey
  foreign key (aluno_id) references public.profiles(id) on delete restrict;

-- ============================================================
-- AMARRANDO OS 25 MECANISMOS ÀS CENAS QUE OS SUSTENTAM
--
-- Feito por conteúdo, cena a cena. Onde só existe UMA cena, o mecanismo fica
-- com uma só, e a tela vai dizer isso: mecanismo de uma cena é anedota com
-- nome, e esconder o número seria repetir o erro que estamos consertando.
-- ============================================================
do $$
declare
  v record;
  v_mec uuid;
  v_n int;
begin
  for v in
    select * from (values
      -- #1 Ayrton
      (1,'Cria estrutura e povoa com gente',            array['campeonato de desenhos','revistinhas','sacola']),
      (1,'Narra checando se a plateia continua junto',  array['sabia ?','detalhou os ingredientes']),
      (1,'Argumenta por cadeia de razões',              array['filosofia','procrastinando']),
      (1,'Insiste por repetição, não por outro jeito',  array['vencer pelo cansaço']),
      -- #2 Joshua
      (2,'Interesse fixo em máquina em operação',       array['escavadeira','trator']),
      (2,'Narra sem ordem e amplia a história',         array['aumenta']),
      (2,'Trava na hora de mostrar para alguém',        array['travou','travou novamente']),
      (2,'Sente antes de ter canal para mostrar',       array['Dó']),
      -- #3 Maria Cecília
      (3,'Entra em mundos inteiros, um de cada vez',    array['harry potter','encanto']),
      (3,'Repara em incoerência de adulto',             array['baby doll','açúcar']),
      (3,'Pergunta causa física das coisas',            array['vidro']),
      (3,'Expõe em detalhe quando o canal está aberto', array['Tim Tim','personalidade forte']),
      -- #4 Maria Helena
      (4,'Monta cadeia de causa e consequência em voz alta', array['bisavó','apito']),
      (4,'Corrige adulto com argumento, não com birra', array['pediu desculpas']),
      (4,'Refaz até conseguir sozinha, para mostrar',   array['dobra as roupas']),
      (4,'Dois canais ao mesmo tempo: desenha vendo TV',array['pintar vendo TV']),
      -- #5 Luiz Miguel
      (5,'Narra com marcador de tempo e pede confirmação', array['cócegas','lembra']),
      (5,'Resolve alcance com objeto, sem pedir',       array['banquinho']),
      (5,'Lê o rosto e insiste na leitura',             array['carinha']),
      (5,'Memória longa de fato que não estava atento', array['nem estava tão atentos']),
      -- #6 Gael
      (6,'Narra a própria brincadeira em voz alta',     array['narrou a própria brincadeira']),
      (6,'Verifica o estado dos outros e aciona o adulto', array['__sem_cena__']),
      -- #7 Thalles
      (7,'Inventa variação dentro do jogo com o corpo', array['dublar']),
      (7,'Conta o dia inteiro quando chega',            array['conta tudo o que aconteceu']),
      (7,'Lê o humor da mãe e pergunta',                array['com raiva dele'])
    ) as x(numero, descricao, pistas)
  loop
    select m.id into v_mec
      from public.caso_mecanismo m
      join public.casos c on c.id = m.caso_id
     where c.numero = v.numero and m.descricao = v.descricao;
    if v_mec is null then
      raise notice 'mecanismo nao encontrado: #% %', v.numero, v.descricao;
      continue;
    end if;

    insert into public.caso_mecanismo_cena (mecanismo_id, cena_id, papel)
    select distinct v_mec, ce.id, 'sustenta'
      from public.caso_cena ce
      join public.casos c on c.id = ce.caso_id
     where c.numero = v.numero
       and exists (select 1 from unnest(v.pistas) p
                    where coalesce(ce.citacao, ce.descricao) ilike '%' || p || '%')
    on conflict do nothing;

    select count(*) into v_n from public.caso_mecanismo_cena where mecanismo_id = v_mec;
    if v_n = 0 then
      raise notice 'SEM LASTRO: #% %', v.numero, v.descricao;
    end if;
  end loop;
end $$;

-- ============================================================
-- OS DOIS RESUMOS QUE IMPORTARAM JUÍZO DA ESCOLA
--
-- O campo `resumo` é "quem é a criança" e o comentário dele proíbe adjetivo de
-- personalidade. Dois terminavam em juízo de professora: no acervo, com data e
-- fonte, aquilo é cena; no resumo, vira identidade. As frases não somem, elas
-- continuam no acervo onde sempre estiveram.
-- ============================================================
update public.casos set resumo =
  'Entra num mundo de cada vez e fica: agora é Harry Potter, antes foi Encanto. Faz pulseira e cartinha no quarto, faz ballet e gosta de esporte no geral. Pergunta como as coisas são feitas, e a mãe responde mostrando vídeo. Repara em incoerência de adulto e fala: apontou o pijama usado fora da hora de dormir, e o açúcar que a avó esqueceu no suco. A mãe diz que ela explica tim tim por tim tim e não é tímida.'
 where numero = 3;

update public.casos set resumo =
  'Jogar bola é o centro. Inventa jeitos diferentes de jogar, como driblar os colegas no futsal. Chega em casa e conta tudo o que aconteceu no dia. Num dia em que a mãe estava séria, perguntou se ela estava com raiva dele.'
 where numero = 7;

-- --------------------------------------------------------------- conferência
select c.numero, m.descricao,
       (select count(*) from public.caso_mecanismo_cena l where l.mecanismo_id = m.id) as cenas
  from public.caso_mecanismo m
  join public.casos c on c.id = m.caso_id
 order by c.numero, m.ordem;
