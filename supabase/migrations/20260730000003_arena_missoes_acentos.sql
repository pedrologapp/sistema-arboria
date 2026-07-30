-- Corrige a acentuacao dos textos das missoes da Arena (estavam sem acento).
-- Sao textos que o aluno ve. Pedido do Fundador 30/07. So dados, vale na hora.

UPDATE public.missoes SET
  contexto = 'Chegou a hora de mostrar o que vocês construíram. Apresentem o projeto para quem nunca viu: contem de onde veio a ideia, o que ele faz, como vocês tiraram do papel e até onde ele ainda pode crescer. Escrevam com orgulho e anexem o trabalho. Isso aqui vira a vitrine do projeto de vocês.',
  descricao = null
WHERE capitulo_id = '8338b36f-5c3c-48b4-84ad-8ee4773f3e4a' AND entrega_coletiva = true;

UPDATE public.missoes SET
  contexto = 'O grupo já apresentou o projeto. Agora é só com você. Ninguém mais vê estas respostas. Não existe resposta certa, existe a sua.',
  itens = '[{"nome":"Me conte com suas palavras: o que é o seu projeto e o que ele faz?","descricao":""},{"nome":"Qual era a ideia inicial? Ela partiu de você?","descricao":""},{"nome":"Qual foi a maior dificuldade de fazer esse projeto?","descricao":""},{"nome":"E o que foi mais fácil?","descricao":""},{"nome":"Teve algum momento em que você resolveu alguma coisa do jeito que mais combina com você?","descricao":"__CASA_CROSS_IM__"}]'::jsonb
WHERE capitulo_id = '8338b36f-5c3c-48b4-84ad-8ee4773f3e4a' AND entrega_coletiva = false;
