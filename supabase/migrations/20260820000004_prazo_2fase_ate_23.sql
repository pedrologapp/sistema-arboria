-- Prazo da 2a fase da Arena vai para 23/08, a pedido do Fundador.
--
-- O motivo nao e' folga: dois defeitos do app impediram o envio ate hoje. O
-- campo de video abria so a camera e escondia a galeria, e as fotos de
-- portfolio subiam e sumiam da tela. Quem nao conseguiu enviar ate agora nao
-- deixou de tentar.
--
-- Esta missao nao tem capitulo, entao get_missoes_do_aluno usa missoes.data_prazo
-- direto, sem passar por capitulo_turma_config. Aqui o campo certo e este mesmo.
--
-- 2026-08-24 02:59:59+00 = 23/08 as 23:59:59 no horario de Natal.
update public.missoes
   set data_prazo = '2026-08-24 02:59:59+00'
 where id = 'ddaf54d2-7781-4ab6-b3e7-2a54749329a5';

select titulo, data_prazo, (data_prazo > now()) as aberta
  from public.missoes where id = 'ddaf54d2-7781-4ab6-b3e7-2a54749329a5';
