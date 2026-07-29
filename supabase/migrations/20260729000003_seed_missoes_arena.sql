-- Seed das 2 missoes da Arena (capitulo Logica-Matematica). Dormentes ate o professor
-- liberar a turma (config missoes_liberadas_em). data_prazo aqui e' placeholder; o prazo
-- real e' o da liberacao por turma (config). Pedido do Fundador 29/07.
insert into public.missoes
 (institution_id, capitulo_id, fase_id, criado_por, titulo, descricao, tipo, tipo_missao,
  entrega_coletiva, casa_id, papel_id, para_membros_delegacao, requer_texto, requer_arquivo,
  pontos_base, status, data_liberacao, data_prazo)
values
 ('00000000-0000-0000-0000-000000000001','8338b36f-5c3c-48b4-84ad-8ee4773f3e4a','7f11984c-52cd-4d8d-b41a-910886771bce',
  '6bb731bd-1091-4341-9562-718e6dfed950','Apresentem seu projeto',
  'Chegou a hora de mostrar o que voces construiram. Apresentem o projeto para quem nunca viu: contem de onde veio a ideia, o que ele faz, como voces tiraram do papel e ate onde ele ainda pode crescer. Escrevam com orgulho e anexem o trabalho. Isso aqui vira a vitrine do projeto de voces.',
  'principal','geral', true, null, null, false, true, false, 100, 'liberada', now(), now() + interval '30 days');

insert into public.missoes
 (institution_id, capitulo_id, fase_id, criado_por, titulo, descricao, tipo, tipo_missao,
  entrega_coletiva, casa_id, papel_id, para_membros_delegacao, requer_texto, requer_arquivo,
  pontos_base, status, data_liberacao, data_prazo, itens)
values
 ('00000000-0000-0000-0000-000000000001','8338b36f-5c3c-48b4-84ad-8ee4773f3e4a','7f11984c-52cd-4d8d-b41a-910886771bce',
  '6bb731bd-1091-4341-9562-718e6dfed950','Missao Individual',
  'O grupo ja apresentou o projeto. Agora e so com voce. Ninguem mais ve estas respostas. Nao existe resposta certa, existe a sua.',
  'principal','individual', false, null, null, false, false, false, 100, 'liberada', now(), now() + interval '30 days',
  '[{"nome":"Me conte com suas palavras: o que e o seu projeto e o que ele faz?","descricao":""},{"nome":"Qual era a ideia inicial? Ela partiu de voce?","descricao":""},{"nome":"Qual foi a maior dificuldade de fazer esse projeto?","descricao":""},{"nome":"E o que foi mais facil?","descricao":""},{"nome":"Teve algum momento em que voce resolveu alguma coisa do jeito que mais combina com voce?","descricao":"__CASA_CROSS_IM__"}]'::jsonb);
