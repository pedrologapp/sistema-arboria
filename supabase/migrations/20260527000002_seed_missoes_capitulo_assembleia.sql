-- =============================================
-- SEED: Missões do Capítulo — Pós-Assembleia (Grande Assembleia, capítulo nº 2)
-- 6 missões: Presidente, Vice, Secretário, Mediador, Observatório (por cargo)
-- + Membro de Delegação (para_membros_delegacao = true).
-- fase_id = NULL de propósito (não entram no tempo das fases; aparecem só na
-- seção "Missão do Capítulo"). 100 pontos. Sem entrega atrasada.
-- IMPORTANTE: as missões NÃO ficam visíveis ao aplicar. A visibilidade e o PRAZO
-- são por TURMA, controlados pelo professor em capitulo_turma_config
-- (missoes_liberadas_em / missoes_data_prazo = +7 dias da liberação). O data_prazo
-- abaixo é só um placeholder NOT NULL; o prazo real vem da liberação por turma.
-- Idempotente: pula instituições que já têm missões do capítulo.
-- Depende de 20260527000001 (colunas) e 20260527000003 (liberação por turma).
-- =============================================

DO $mc$
DECLARE
  v_inst_id      uuid;
  v_capitulo_id  uuid;
  v_criado_por   uuid;
  v_presidente   uuid;
  v_vice         uuid;
  v_secretario   uuid;
  v_mediador     uuid;
  v_observatorio uuid;
  v_prazo        timestamptz := '2099-12-31 23:59:59-03'; -- placeholder; prazo real é por turma (+7 da liberação)
  v_p12          text;
  v_footer       text;
BEGIN
  -- Perguntas 01 e 02 (comuns a todas as missões de papel)
  v_p12 := 'Escreva um texto único respondendo às 3 perguntas abaixo. Pode misturar tudo, não precisa responder uma por vez. Escreva do seu jeito — não precisa escrever muito, o importante é ser honesto e seu.

PERGUNTA 01 — Conta o momento mais importante da Assembleia pra você (pode ter sido bom ou ruim): o que aconteceu? O que você fez (ou não conseguiu fazer)?

PERGUNTA 02 — Teve alguma coisa que outra pessoa disse ou fez que mudou alguma coisa pra você durante a Assembleia? Pode ter sido um colega, alguém de uma delegação, alguém da Mesa. Conta o que foi.';

  v_footer := 'Antes de enviar, releia: está honesto? Está descrevendo o que aconteceu de verdade, não o que devia ter acontecido? Evite resposta genérica como "foi legal" ou "gostei muito", e não repita o que já estava no roteiro da sua função.';

  FOR v_inst_id IN SELECT id FROM public.institutions LOOP

    -- Capítulo 2 (A Grande Assembleia) dessa instituição
    SELECT id INTO v_capitulo_id
    FROM public.capitulos
    WHERE institution_id = v_inst_id AND numero = 2
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_capitulo_id IS NULL THEN
      CONTINUE;
    END IF;

    -- Idempotência: se já existem missões desse capítulo, não recria (preserva entregas)
    IF EXISTS (SELECT 1 FROM public.missoes WHERE capitulo_id = v_capitulo_id) THEN
      CONTINUE;
    END IF;

    -- Criador: um admin da instituição (fallback: qualquer perfil dela)
    SELECT p.id INTO v_criado_por
    FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.id
    WHERE p.institution_id = v_inst_id AND ur.role = 'admin'
    LIMIT 1;

    IF v_criado_por IS NULL THEN
      SELECT id INTO v_criado_por FROM public.profiles WHERE institution_id = v_inst_id LIMIT 1;
    END IF;

    IF v_criado_por IS NULL THEN
      CONTINUE; -- sem nenhum perfil, não dá pra setar criado_por
    END IF;

    -- Papéis fixos do capítulo
    SELECT id INTO v_presidente   FROM public.capitulo_papeis WHERE capitulo_id = v_capitulo_id AND nome = 'Presidente da Mesa' LIMIT 1;
    SELECT id INTO v_vice         FROM public.capitulo_papeis WHERE capitulo_id = v_capitulo_id AND nome = 'Vice-presidente'    LIMIT 1;
    SELECT id INTO v_secretario   FROM public.capitulo_papeis WHERE capitulo_id = v_capitulo_id AND nome = 'Secretário'         LIMIT 1;
    SELECT id INTO v_mediador     FROM public.capitulo_papeis WHERE capitulo_id = v_capitulo_id AND nome = 'Mediador'           LIMIT 1;
    SELECT id INTO v_observatorio FROM public.capitulo_papeis WHERE capitulo_id = v_capitulo_id AND nome = 'Observatório'       LIMIT 1;

    -- ===== Presidente =====
    IF v_presidente IS NOT NULL THEN
      INSERT INTO public.missoes (institution_id, fase_id, capitulo_id, papel_id, para_membros_delegacao, casa_id, criado_por, titulo, descricao, instrucoes, tipo, tipo_missao, pontos_base, status, data_liberacao, data_prazo, requer_texto, requer_arquivo, permite_entrega_atrasada)
      VALUES (v_inst_id, NULL, v_capitulo_id, v_presidente, false, NULL, v_criado_por,
        'Como foi pra você como Presidente',
        'Você conduziu a Assembleia. Foi quem abriu, deu a palavra, manteve a ordem e encerrou. Agora conta como foi.',
        v_p12 || E'\n\nPERGUNTA 03 — Você conduziu a sessão. Qual foi a decisão mais difícil que você teve que tomar como Presidente: dar ou não a palavra, cortar ou não uma fala, intervir ou não num conflito? Conta o que pesou na hora.\n\n' || v_footer,
        'principal', 'geral', 100, 'liberada', now(), v_prazo, true, false, false);
    END IF;

    -- ===== Vice-presidente =====
    IF v_vice IS NOT NULL THEN
      INSERT INTO public.missoes (institution_id, fase_id, capitulo_id, papel_id, para_membros_delegacao, casa_id, criado_por, titulo, descricao, instrucoes, tipo, tipo_missao, pontos_base, status, data_liberacao, data_prazo, requer_texto, requer_arquivo, permite_entrega_atrasada)
      VALUES (v_inst_id, NULL, v_capitulo_id, v_vice, false, NULL, v_criado_por,
        'Como foi pra você como Vice-presidente',
        'Você controlou o tempo, cronometrou as falas e organizou a fila de oradores. Agora conta como foi.',
        v_p12 || E'\n\nPERGUNTA 03 — Você foi quem controlou o tempo. Teve algum momento em que você decidiu deixar alguém passar do tempo, ou cortar antes do tempo acabar? Conta como foi essa decisão.\n\n' || v_footer,
        'principal', 'geral', 100, 'liberada', now(), v_prazo, true, false, false);
    END IF;

    -- ===== Secretário =====
    IF v_secretario IS NOT NULL THEN
      INSERT INTO public.missoes (institution_id, fase_id, capitulo_id, papel_id, para_membros_delegacao, casa_id, criado_por, titulo, descricao, instrucoes, tipo, tipo_missao, pontos_base, status, data_liberacao, data_prazo, requer_texto, requer_arquivo, permite_entrega_atrasada)
      VALUES (v_inst_id, NULL, v_capitulo_id, v_secretario, false, NULL, v_criado_por,
        'Como foi pra você como Secretário',
        'Você foi a memória da Assembleia: registrou tudo, anotou propostas, leu a resolução final. Agora conta como foi.',
        v_p12 || E'\n\nPERGUNTA 03 — Qual foi a resolução final aprovada pela sua turma na Assembleia? Você consegue lembrar a redação completa? Se não, escreve o que lembra com suas próprias palavras.\n\n' || v_footer,
        'principal', 'geral', 100, 'liberada', now(), v_prazo, true, false, false);
    END IF;

    -- ===== Mediador =====
    IF v_mediador IS NOT NULL THEN
      INSERT INTO public.missoes (institution_id, fase_id, capitulo_id, papel_id, para_membros_delegacao, casa_id, criado_por, titulo, descricao, instrucoes, tipo, tipo_missao, pontos_base, status, data_liberacao, data_prazo, requer_texto, requer_arquivo, permite_entrega_atrasada)
      VALUES (v_inst_id, NULL, v_capitulo_id, v_mediador, false, NULL, v_criado_por,
        'Como foi pra você como Mediador',
        'Você não tinha lado. Sua função era destravar conflitos no caucus e ajudar delegações a se entenderem. Agora conta como foi.',
        v_p12 || E'\n\nPERGUNTA 03 — Conta uma vez em que você tentou ajudar uma delegação no caucus: quem você procurou primeiro, por quê, e como foi a conversa.\n\n' || v_footer,
        'principal', 'geral', 100, 'liberada', now(), v_prazo, true, false, false);
    END IF;

    -- ===== Observatório =====
    IF v_observatorio IS NOT NULL THEN
      INSERT INTO public.missoes (institution_id, fase_id, capitulo_id, papel_id, para_membros_delegacao, casa_id, criado_por, titulo, descricao, instrucoes, tipo, tipo_missao, pontos_base, status, data_liberacao, data_prazo, requer_texto, requer_arquivo, permite_entrega_atrasada)
      VALUES (v_inst_id, NULL, v_capitulo_id, v_observatorio, false, NULL, v_criado_por,
        'Como foi pra você como Observatório',
        'Você leu o jogo invisível: anotou frases, percebeu contradições, apresentou a Leitura da Sala no fim. Agora conta como foi.',
        v_p12 || E'\n\nPERGUNTA 03 — Cita UMA frase exata que alguém disse durante o debate e que você anotou ou lembra bem. Quem disse, quando, e o que aquela frase mostrou pra você sobre o debate.\n\n' || v_footer,
        'principal', 'geral', 100, 'liberada', now(), v_prazo, true, false, false);
    END IF;

    -- ===== Membro de Delegação (todos os membros, via para_membros_delegacao) =====
    INSERT INTO public.missoes (institution_id, fase_id, capitulo_id, papel_id, para_membros_delegacao, casa_id, criado_por, titulo, descricao, instrucoes, tipo, tipo_missao, pontos_base, status, data_liberacao, data_prazo, requer_texto, requer_arquivo, permite_entrega_atrasada)
    VALUES (v_inst_id, NULL, v_capitulo_id, NULL, true, NULL, v_criado_por,
      'Como foi pra você na sua delegação',
      'Você fez parte de uma delegação. Mesmo sem cargo formal fixo, acabou assumindo alguma função na prática. Agora conta como foi.',
      'Comece dizendo qual delegação você representou e qual função você acabou fazendo na prática (porta-voz, estrategista, pesquisador, negociador — ou uma mistura).

Depois, escreva um texto único respondendo às 3 perguntas abaixo. Pode misturar tudo, não precisa responder uma por vez. Escreva do seu jeito — o importante é ser honesto e seu.

PERGUNTA 01 — Conta o momento mais importante da Assembleia pra você (pode ter sido bom ou ruim): o que aconteceu? O que você fez (ou não conseguiu fazer)?

PERGUNTA 02 — Teve alguma coisa que outra pessoa disse ou fez que mudou alguma coisa pra você? Pode ter sido um colega da sua delegação, alguém de delegação adversária, alguém da Mesa. Conta o que foi.

PERGUNTA 03 — Conta sobre a parte mais difícil que sua delegação enfrentou na Assembleia. Foi um ataque forte de outra delegação? Uma negociação que não rolou? Uma decisão interna do time? Como vocês resolveram (ou não resolveram)?

' || v_footer,
      'principal', 'geral', 100, 'liberada', now(), v_prazo, true, false, false);

    RAISE NOTICE 'Missões do Capítulo 2 criadas para institution %', v_inst_id;
  END LOOP;
END
$mc$;
