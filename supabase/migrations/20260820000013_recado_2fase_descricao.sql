-- ============================================================
-- RECADO AOS QUATRO DA 2a FASE
--
-- Os quatro que mandaram material estao parados no mesmo ponto: nenhum escreveu
-- a descricao. Tres deles perderam o trabalho pelo defeito de 20/08 (o material
-- so' virava entrega no botao Enviar, e ate' la' sumia da tela a cada recarga).
-- O arquivo estava salvo o tempo todo; a tela e' que voltava vazia.
--
-- O recado diz duas coisas, nessa ordem: o que voce mandou esta' ai, e o que
-- falta. Comeca pelo que ja' foi de proposito. Quem passou tres dias achando que
-- nao tinha conseguido precisa ler primeiro que conseguiu.
--
-- Onde a falha foi nossa, o texto diz que foi nossa. Nao e' gentileza: e' que a
-- crianca conclui que o erro foi dela e para de tentar, e nesta semana ela tem
-- dois dias para terminar.
--
-- ESCRITO A MAO, UM POR UM. A primeira versao montava o texto por concatenacao
-- em SQL e saiu sem acento nenhum ("voce mandou", "descricao do projeto") e com
-- o nome da Ana Clara cortado em "Ana". Texto que crianca le nao se gera por
-- concatenacao: economiza dez linhas e entrega uma mensagem que parece quebrada.
-- ============================================================

-- Apaga o recado torto antes de mandar o certo. So' vale porque nenhum dos
-- quatro tinha aberto ainda; mensagem lida nao se reescreve pelas costas de
-- quem leu.
delete from public.problema_mensagens m
 using public.problemas_alunos pa
 where pa.id = m.problema_id
   and m.de = 'arboria'
   and m.lida_pelo_aluno = false
   and m.texto like '%descricao do projeto%'
   and m.created_at > now() - interval '1 hour';

do $$
declare
  v_thread uuid;
  r record;
  v_fecho text := E'\n\nNa descrição, conte o que o projeto resolve, como ele funciona por dentro, '
    || 'onde ele pode quebrar e o que cada um do grupo fez. Pode escrever aos poucos: '
    || 'agora o que você digita fica salvo mesmo se você sair da página.'
    || E'\n\nO prazo vai até 23/08.';
begin
  for r in
    select * from (values
      ('Théo Henrique Bezerra de Paiva',
       E'Théo, a foto principal que você mandou está guardada. A tela estava voltando vazia depois do envio, e isso era defeito nosso. Já foi corrigido.\n\nAinda faltam três coisas: as 3 fotos do portfólio, o vídeo de até 2 minutos e a descrição do projeto, com no mínimo 150 palavras.'),

      ('Maria Eduarda Fernandes Barbosa',
       E'Maria Eduarda, a foto principal e a foto do portfólio que você mandou estão guardadas. A tela estava voltando vazia depois do envio, e isso era defeito nosso. Já foi corrigido.\n\nAinda faltam: mais 2 fotos do portfólio, o vídeo de até 2 minutos e a descrição do projeto, com no mínimo 150 palavras.'),

      ('Dhavi Ferreira Tavares de Morais',
       E'Dhavi, está tudo guardado: a foto principal, as 5 fotos do portfólio e o vídeo. Estava salvo desde o dia em que você enviou, mas a tela voltava vazia e fazia parecer que não tinha ido. A falha foi nossa, não sua.\n\nFalta uma coisa só: a descrição do projeto, com no mínimo 150 palavras.'),

      ('Ana Clara Bezerra Duarte',
       E'Ana Clara, o que você mandou está guardado: a foto principal, 2 fotos do portfólio e o vídeo. A tela estava voltando vazia depois do envio, e isso era defeito nosso. Já foi corrigido.\n\nFalta mais 1 foto do portfólio e a descrição do projeto, com no mínimo 150 palavras.')
    ) as t(nome, corpo)
  loop
    -- Reaproveita a conversa que o Arboria ja abriu com ele. Duas threads com o
    -- mesmo assunto deixariam a crianca sem saber em qual responder.
    select pa.id into v_thread
      from public.problemas_alunos pa
      join public.profiles p on p.id = pa.aluno_id
     where p.full_name = r.nome
       and pa.iniciado_por = 'arboria'
       and pa.texto = 'Arena Arboria: 2ª fase'
     order by pa.created_at desc limit 1;

    if v_thread is null then
      insert into public.problemas_alunos
        (aluno_id, texto, iniciado_por, institution_id)
      select p.id, 'Arena Arboria: 2ª fase', 'arboria',
             '00000000-0000-0000-0000-000000000001'
        from public.profiles p where p.full_name = r.nome
      returning id into v_thread;
    end if;

    insert into public.problema_mensagens (problema_id, de, texto, lida_pelo_aluno)
    values (v_thread, 'arboria', r.corpo || v_fecho, false);
  end loop;
end $$;

-- --------------------------------------------------------------- conferencia
select p.full_name, p.serie, m.texto
  from public.problema_mensagens m
  join public.problemas_alunos pa on pa.id = m.problema_id
  join public.profiles p on p.id = pa.aluno_id
 where m.de = 'arboria' and m.created_at > now() - interval '2 minutes'
 order by p.serie;
