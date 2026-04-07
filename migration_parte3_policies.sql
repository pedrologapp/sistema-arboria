-- ============================================================================
-- 6. VIEWS
-- ============================================================================

-- 6.1 ranking_casas
DROP VIEW IF EXISTS ranking_casas;
CREATE VIEW ranking_casas
WITH (security_invoker = on) AS
SELECT
  i.id as casa_id, i.nome as casa_nome, i.emoji as casa_emoji, i.cor_hex as casa_cor,
  pg.institution_id, pg.ano_letivo,
  COALESCE(SUM(pg.pontos), 0) as total_pontos,
  COUNT(DISTINCT pg.aluno_id) as total_alunos_ativos,
  RANK() OVER (
    PARTITION BY pg.institution_id, pg.ano_letivo
    ORDER BY COALESCE(SUM(pg.pontos), 0) DESC
  ) as posicao
FROM inteligencias i
LEFT JOIN pontos_gerais pg ON pg.casa_id = i.id
GROUP BY i.id, i.nome, i.emoji, i.cor_hex, pg.institution_id, pg.ano_letivo
ORDER BY posicao;

-- 6.2 ranking_alunos_por_casa
DROP VIEW IF EXISTS ranking_alunos_por_casa;
CREATE VIEW ranking_alunos_por_casa
WITH (security_invoker = on) AS
SELECT
  p.id as aluno_id, p.full_name as aluno_nome, p.casa_id,
  i.nome as casa_nome, i.emoji as casa_emoji,
  p.institution_id, pg.ano_letivo,
  COALESCE(SUM(pg.pontos), 0) as total_pontos,
  COUNT(DISTINCT pg.missao_id) as missoes_completadas,
  RANK() OVER (
    PARTITION BY p.casa_id, p.institution_id, pg.ano_letivo
    ORDER BY COALESCE(SUM(pg.pontos), 0) DESC
  ) as posicao_na_casa
FROM profiles p
JOIN inteligencias i ON i.id = p.casa_id
LEFT JOIN pontos_gerais pg ON pg.aluno_id = p.id
WHERE p.casa_id IS NOT NULL
GROUP BY p.id, p.full_name, p.casa_id, i.nome, i.emoji, p.institution_id, pg.ano_letivo
ORDER BY p.casa_id, posicao_na_casa;

-- 6.3 perfil_inteligencias_aluno
DROP VIEW IF EXISTS perfil_inteligencias_aluno;
CREATE VIEW perfil_inteligencias_aluno
WITH (security_invoker = true) AS
SELECT
  s.aluno_id, s.ano_letivo,
  i.id AS inteligencia_id, i.codigo AS inteligencia_codigo,
  i.nome AS inteligencia_nome, i.emoji AS inteligencia_emoji,
  i.cor_hex AS inteligencia_cor, i.brasao_url AS inteligencia_brasao_url,
  s.score_atual, s.total_evidencias,
  p.casa_id = i.id AS eh_casa_do_aluno
FROM inteligencia_scores s
JOIN inteligencias i ON i.id = s.inteligencia_id
JOIN profiles p ON p.id = s.aluno_id
ORDER BY s.aluno_id, i.ordem;

-- 6.4 vw_estados_alunos
DROP VIEW IF EXISTS vw_estados_alunos;
CREATE VIEW vw_estados_alunos
WITH (security_invoker = on) AS
WITH ultimas_obs AS (
  SELECT
    o.aluno_id, s.valencia as tipo_sinal, s.label_pt as sinal,
    s.codigo as sinal_codigo, o.created_at,
    ROW_NUMBER() OVER (PARTITION BY o.aluno_id ORDER BY o.created_at DESC) as rn
  FROM observacoes o JOIN sinais s ON s.id = o.sinal_id
)
SELECT
  p.id as aluno_id, p.nome, p.sobrenome, p.full_name,
  p.serie, p.turma, p.casa_id, i.nome as casa_nome, i.cor_hex as casa_cor,
  p.institution_id, p.avatar_url,
  u1.tipo_sinal as ultima_tipo, u1.sinal as ultima_sinal, u1.sinal_codigo as ultimo_sinal_codigo,
  u2.tipo_sinal as penultima_tipo, u2.sinal as penultima_sinal, u2.sinal_codigo as penultimo_sinal_codigo,
  CASE
    WHEN u1.tipo_sinal IS NULL THEN 'sem_observacao'
    WHEN u2.tipo_sinal IS NULL THEN 'primeira_obs'
    WHEN u1.tipo_sinal = 'atencao' AND u2.tipo_sinal = 'atencao' THEN 'precisa_atencao'
    WHEN u1.tipo_sinal = 'positivo' AND u2.tipo_sinal = 'positivo' THEN 'celebrar'
    WHEN u1.tipo_sinal = 'atencao' AND u2.tipo_sinal = 'positivo' THEN 'atencao_recente'
    WHEN u1.tipo_sinal = 'positivo' AND u2.tipo_sinal = 'atencao' THEN 'melhorando'
    ELSE 'neutro'
  END as estado_calculado,
  u1.created_at as data_ultima_obs
FROM profiles p
JOIN user_roles ur ON ur.user_id = p.id AND ur.role = 'user'
LEFT JOIN inteligencias i ON i.id = p.casa_id
LEFT JOIN ultimas_obs u1 ON p.id = u1.aluno_id AND u1.rn = 1
LEFT JOIN ultimas_obs u2 ON p.id = u2.aluno_id AND u2.rn = 2;


-- ============================================================================
-- 7. RLS POLICIES
-- ============================================================================

-- ---- PROFILES ----
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Usuarios veem perfis da mesma instituicao" ON public.profiles;
CREATE POLICY "Usuarios veem perfis da mesma instituicao" ON public.profiles FOR SELECT TO authenticated USING (institution_id = get_user_institution_id());

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
CREATE POLICY "Admins can insert profiles" ON public.profiles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Professores veem alunos da sua casa" ON public.profiles;
CREATE POLICY "Professores veem alunos da sua casa" ON public.profiles FOR SELECT USING (
  institution_id = public.get_user_institution_id()
  AND public.has_role(auth.uid(), 'professor')
  AND casa_id IN (SELECT pc.casa_id FROM public.professor_casa pc WHERE pc.professor_id = auth.uid() AND pc.ativo = true)
);

-- ---- USER_ROLES ----
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ---- INSTITUTIONS ----
DROP POLICY IF EXISTS "Anyone authenticated can view institutions" ON public.institutions;
CREATE POLICY "Anyone authenticated can view institutions" ON public.institutions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can manage institutions" ON public.institutions;
CREATE POLICY "Admins can manage institutions" ON public.institutions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ---- INTELIGENCIAS ----
DROP POLICY IF EXISTS "Inteligencias sao publicas" ON public.inteligencias;
CREATE POLICY "Inteligencias sao publicas" ON public.inteligencias FOR SELECT USING (true);

-- ---- INSTITUTION_SETTINGS ----
DROP POLICY IF EXISTS "Usuarios veem settings da sua instituicao" ON public.institution_settings;
CREATE POLICY "Usuarios veem settings da sua instituicao" ON public.institution_settings FOR SELECT USING (institution_id = public.get_user_institution_id());

DROP POLICY IF EXISTS "Admins podem modificar settings" ON public.institution_settings;
CREATE POLICY "Admins podem modificar settings" ON public.institution_settings FOR ALL USING (institution_id = public.get_user_institution_id() AND public.has_role(auth.uid(), 'admin'));

-- ---- SINAIS ----
DROP POLICY IF EXISTS "Sinais sao publicos" ON public.sinais;
CREATE POLICY "Sinais sao publicos" ON public.sinais FOR SELECT USING (true);

-- ---- TURMAS ----
DROP POLICY IF EXISTS "Usuarios veem turmas da instituicao" ON public.turmas;
CREATE POLICY "Usuarios veem turmas da instituicao" ON public.turmas FOR SELECT USING (institution_id = public.get_user_institution_id());

DROP POLICY IF EXISTS "Admins podem gerenciar turmas" ON public.turmas;
CREATE POLICY "Admins podem gerenciar turmas" ON public.turmas FOR ALL USING (institution_id = public.get_user_institution_id() AND public.has_role(auth.uid(), 'admin'));

-- ---- ALUNO_TURMA ----
DROP POLICY IF EXISTS "Admins veem todos aluno_turma" ON public.aluno_turma;
CREATE POLICY "Admins veem todos aluno_turma" ON public.aluno_turma FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.turmas t WHERE t.id = aluno_turma.turma_id AND t.institution_id = public.get_user_institution_id())
  AND public.has_role(auth.uid(), 'admin')
);

DROP POLICY IF EXISTS "Professores veem aluno_turma da sua casa" ON public.aluno_turma;
CREATE POLICY "Professores veem aluno_turma da sua casa" ON public.aluno_turma FOR SELECT USING (
  public.has_role(auth.uid(), 'professor')
  AND EXISTS (
    SELECT 1 FROM public.profiles aluno
    JOIN public.professor_casa pc ON pc.professor_id = auth.uid() AND pc.casa_id = aluno.casa_id AND pc.ativo = true
    WHERE aluno.id = aluno_turma.aluno_id
  )
);

DROP POLICY IF EXISTS "Alunos veem proprio aluno_turma" ON public.aluno_turma;
CREATE POLICY "Alunos veem proprio aluno_turma" ON public.aluno_turma FOR SELECT USING (aluno_id = auth.uid());

DROP POLICY IF EXISTS "Admins podem gerenciar aluno_turma" ON public.aluno_turma;
CREATE POLICY "Admins podem gerenciar aluno_turma" ON public.aluno_turma FOR ALL USING (
  EXISTS (SELECT 1 FROM public.turmas t WHERE t.id = aluno_turma.turma_id AND t.institution_id = public.get_user_institution_id())
  AND public.has_role(auth.uid(), 'admin')
);

DROP POLICY IF EXISTS "Professores veem aluno_turma das suas turmas vinculadas" ON public.aluno_turma;
CREATE POLICY "Professores veem aluno_turma das suas turmas vinculadas" ON public.aluno_turma FOR SELECT USING (
  has_role(auth.uid(), 'professor'::app_role) AND turma_id = ANY(public.get_professor_turma_ids())
);

DROP POLICY IF EXISTS "Mentores veem aluno_turma da instituicao" ON public.aluno_turma;
CREATE POLICY "Mentores veem aluno_turma da instituicao" ON public.aluno_turma FOR SELECT TO authenticated USING (
  has_role(auth.uid(), 'professor'::app_role)
  AND EXISTS (SELECT 1 FROM turmas t WHERE t.id = aluno_turma.turma_id AND t.institution_id = get_user_institution_id())
  AND EXISTS (SELECT 1 FROM professor_casa pc WHERE pc.professor_id = auth.uid() AND pc.ativo = true)
);

-- ---- PROFESSOR_CASA ----
DROP POLICY IF EXISTS "Usuarios veem professor_casa da instituicao" ON public.professor_casa;
CREATE POLICY "Usuarios veem professor_casa da instituicao" ON public.professor_casa FOR SELECT USING (institution_id = public.get_user_institution_id());

DROP POLICY IF EXISTS "Admins podem gerenciar professor_casa" ON public.professor_casa;
CREATE POLICY "Admins podem gerenciar professor_casa" ON public.professor_casa FOR ALL USING (institution_id = public.get_user_institution_id() AND public.has_role(auth.uid(), 'admin'));

-- ---- FASES ----
DROP POLICY IF EXISTS "Usuarios veem fases da instituicao" ON public.fases;
CREATE POLICY "Usuarios veem fases da instituicao" ON public.fases FOR SELECT USING (institution_id = public.get_user_institution_id());

DROP POLICY IF EXISTS "Admins gerenciam fases" ON public.fases;
CREATE POLICY "Admins gerenciam fases" ON public.fases FOR ALL USING (institution_id = public.get_user_institution_id() AND public.has_role(auth.uid(), 'admin'));

-- ---- MISSOES ----
DROP POLICY IF EXISTS "Usuarios veem missoes da instituicao" ON public.missoes;
CREATE POLICY "Usuarios veem missoes da instituicao" ON public.missoes FOR SELECT USING (institution_id = get_user_institution_id());

DROP POLICY IF EXISTS "Admin ou Professor podem criar missoes" ON public.missoes;
CREATE POLICY "Admin ou Professor podem criar missoes" ON public.missoes FOR INSERT WITH CHECK (
  institution_id = get_user_institution_id() AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'professor'))
);

DROP POLICY IF EXISTS "Criador ou Admin podem atualizar missoes" ON public.missoes;
CREATE POLICY "Criador ou Admin podem atualizar missoes" ON public.missoes FOR UPDATE USING (
  institution_id = get_user_institution_id() AND (criado_por = auth.uid() OR has_role(auth.uid(), 'admin'))
);

DROP POLICY IF EXISTS "Criador ou Admin podem deletar missoes" ON public.missoes;
CREATE POLICY "Criador ou Admin podem deletar missoes" ON public.missoes FOR DELETE USING (
  institution_id = get_user_institution_id() AND (criado_por = auth.uid() OR has_role(auth.uid(), 'admin'))
);

-- ---- MISSAO_DESTINATARIOS ----
DROP POLICY IF EXISTS "Usuarios veem destinatarios da instituicao" ON public.missao_destinatarios;
CREATE POLICY "Usuarios veem destinatarios da instituicao" ON public.missao_destinatarios FOR SELECT USING (
  EXISTS (SELECT 1 FROM missoes m WHERE m.id = missao_id AND m.institution_id = get_user_institution_id())
);

DROP POLICY IF EXISTS "Admin ou Professor podem gerenciar destinatarios" ON public.missao_destinatarios;
CREATE POLICY "Admin ou Professor podem gerenciar destinatarios" ON public.missao_destinatarios FOR ALL USING (
  EXISTS (SELECT 1 FROM missoes m WHERE m.id = missao_id AND m.institution_id = get_user_institution_id())
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'professor'))
);

-- ---- ENTREGAS ----
DROP POLICY IF EXISTS "Aluno ve propria entrega" ON public.entregas;
CREATE POLICY "Aluno ve propria entrega" ON public.entregas FOR SELECT USING (aluno_id = auth.uid());

DROP POLICY IF EXISTS "Professor ve entregas da sua casa" ON public.entregas;
CREATE POLICY "Professor ve entregas da sua casa" ON public.entregas FOR SELECT USING (
  has_role(auth.uid(), 'professor') AND EXISTS (
    SELECT 1 FROM profiles p JOIN professor_casa pc ON pc.professor_id = auth.uid() AND pc.casa_id = p.casa_id AND pc.ativo = true
    WHERE p.id = aluno_id
  )
);

DROP POLICY IF EXISTS "Admin ve todas entregas da instituicao" ON public.entregas;
CREATE POLICY "Admin ve todas entregas da instituicao" ON public.entregas FOR SELECT USING (
  has_role(auth.uid(), 'admin') AND EXISTS (SELECT 1 FROM missoes m WHERE m.id = missao_id AND m.institution_id = get_user_institution_id())
);

DROP POLICY IF EXISTS "Aluno pode criar propria entrega" ON public.entregas;
CREATE POLICY "Aluno pode criar propria entrega" ON public.entregas FOR INSERT WITH CHECK (aluno_id = auth.uid());

DROP POLICY IF EXISTS "Aluno pode atualizar propria entrega pendente" ON public.entregas;
CREATE POLICY "Aluno pode atualizar propria entrega pendente" ON public.entregas FOR UPDATE USING (aluno_id = auth.uid() AND status IN ('pendente', 'refazer'));

DROP POLICY IF EXISTS "Professor pode avaliar entregas da sua casa" ON public.entregas;
CREATE POLICY "Professor pode avaliar entregas da sua casa" ON public.entregas FOR UPDATE USING (
  has_role(auth.uid(), 'professor') AND EXISTS (
    SELECT 1 FROM profiles p JOIN professor_casa pc ON pc.professor_id = auth.uid() AND pc.casa_id = p.casa_id AND pc.ativo = true
    WHERE p.id = aluno_id
  )
);

DROP POLICY IF EXISTS "Admin pode atualizar entregas da instituicao" ON public.entregas;
CREATE POLICY "Admin pode atualizar entregas da instituicao" ON public.entregas FOR UPDATE USING (
  has_role(auth.uid(), 'admin') AND EXISTS (SELECT 1 FROM missoes m WHERE m.id = missao_id AND m.institution_id = get_user_institution_id())
);

DROP POLICY IF EXISTS "Mentores veem entregas da instituicao" ON public.entregas;
CREATE POLICY "Mentores veem entregas da instituicao" ON public.entregas FOR SELECT TO authenticated USING (
  has_role(auth.uid(), 'professor'::app_role)
  AND EXISTS (SELECT 1 FROM missoes m WHERE m.id = entregas.missao_id AND m.institution_id = get_user_institution_id())
  AND EXISTS (SELECT 1 FROM professor_casa pc WHERE pc.professor_id = auth.uid() AND pc.ativo = true)
);

DROP POLICY IF EXISTS "Mentores podem avaliar entregas da instituicao" ON public.entregas;
CREATE POLICY "Mentores podem avaliar entregas da instituicao" ON public.entregas FOR UPDATE TO authenticated USING (
  has_role(auth.uid(), 'professor'::app_role)
  AND EXISTS (SELECT 1 FROM missoes m WHERE m.id = entregas.missao_id AND m.institution_id = get_user_institution_id())
  AND EXISTS (SELECT 1 FROM professor_casa pc WHERE pc.professor_id = auth.uid() AND pc.ativo = true)
);

-- ---- ENTREGA_ARQUIVOS ----
DROP POLICY IF EXISTS "Usuario ve arquivos da propria entrega" ON public.entrega_arquivos;
CREATE POLICY "Usuario ve arquivos da propria entrega" ON public.entrega_arquivos FOR SELECT USING (
  EXISTS (SELECT 1 FROM entregas e WHERE e.id = entrega_id AND e.aluno_id = auth.uid())
);

DROP POLICY IF EXISTS "Professor ve arquivos de entregas da sua casa" ON public.entrega_arquivos;
CREATE POLICY "Professor ve arquivos de entregas da sua casa" ON public.entrega_arquivos FOR SELECT USING (
  has_role(auth.uid(), 'professor') AND EXISTS (
    SELECT 1 FROM entregas e JOIN profiles p ON p.id = e.aluno_id
    JOIN professor_casa pc ON pc.professor_id = auth.uid() AND pc.casa_id = p.casa_id AND pc.ativo = true
    WHERE e.id = entrega_id
  )
);

DROP POLICY IF EXISTS "Admin ve todos arquivos da instituicao" ON public.entrega_arquivos;
CREATE POLICY "Admin ve todos arquivos da instituicao" ON public.entrega_arquivos FOR SELECT USING (
  has_role(auth.uid(), 'admin') AND EXISTS (
    SELECT 1 FROM entregas e JOIN missoes m ON m.id = e.missao_id WHERE e.id = entrega_id AND m.institution_id = get_user_institution_id()
  )
);

DROP POLICY IF EXISTS "Aluno pode inserir arquivos na propria entrega" ON public.entrega_arquivos;
CREATE POLICY "Aluno pode inserir arquivos na propria entrega" ON public.entrega_arquivos FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM entregas e WHERE e.id = entrega_id AND e.aluno_id = auth.uid())
);

DROP POLICY IF EXISTS "Aluno pode deletar proprios arquivos" ON public.entrega_arquivos;
CREATE POLICY "Aluno pode deletar proprios arquivos" ON public.entrega_arquivos FOR DELETE USING (
  EXISTS (SELECT 1 FROM entregas e WHERE e.id = entrega_id AND e.aluno_id = auth.uid())
);

DROP POLICY IF EXISTS "Admin pode deletar arquivos da instituicao" ON public.entrega_arquivos;
CREATE POLICY "Admin pode deletar arquivos da instituicao" ON public.entrega_arquivos FOR DELETE USING (
  has_role(auth.uid(), 'admin') AND EXISTS (
    SELECT 1 FROM entregas e JOIN missoes m ON m.id = e.missao_id WHERE e.id = entrega_id AND m.institution_id = get_user_institution_id()
  )
);

DROP POLICY IF EXISTS "Mentores veem arquivos entregas da instituicao" ON public.entrega_arquivos;
CREATE POLICY "Mentores veem arquivos entregas da instituicao" ON public.entrega_arquivos FOR SELECT TO authenticated USING (
  has_role(auth.uid(), 'professor'::app_role)
  AND EXISTS (
    SELECT 1 FROM entregas e JOIN missoes m ON m.id = e.missao_id
    WHERE e.id = entrega_arquivos.entrega_id AND m.institution_id = get_user_institution_id()
  )
  AND EXISTS (SELECT 1 FROM professor_casa pc WHERE pc.professor_id = auth.uid() AND pc.ativo = true)
);

-- ---- OBSERVACOES ----
DROP POLICY IF EXISTS "Professor ve proprias observacoes" ON public.observacoes;
CREATE POLICY "Professor ve proprias observacoes" ON public.observacoes FOR SELECT USING (professor_id = auth.uid());

DROP POLICY IF EXISTS "Professor ve observacoes da sua casa" ON public.observacoes;
CREATE POLICY "Professor ve observacoes da sua casa" ON public.observacoes FOR SELECT USING (
  has_role(auth.uid(), 'professor'::app_role) AND EXISTS (
    SELECT 1 FROM profiles p JOIN professor_casa pc ON pc.professor_id = auth.uid() AND pc.casa_id = p.casa_id AND pc.ativo = true
    WHERE p.id = observacoes.aluno_id
  )
);

DROP POLICY IF EXISTS "Admin ve observacoes da instituicao" ON public.observacoes;
CREATE POLICY "Admin ve observacoes da instituicao" ON public.observacoes FOR SELECT USING (
  institution_id = get_user_institution_id() AND has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "Professor pode criar observacoes" ON public.observacoes;
CREATE POLICY "Professor pode criar observacoes" ON public.observacoes FOR INSERT WITH CHECK (
  professor_id = auth.uid() AND has_role(auth.uid(), 'professor'::app_role) AND institution_id = get_user_institution_id()
);

DROP POLICY IF EXISTS "Admin pode criar observacoes" ON public.observacoes;
CREATE POLICY "Admin pode criar observacoes" ON public.observacoes FOR INSERT WITH CHECK (
  institution_id = get_user_institution_id() AND has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "Professor atualiza proprias observacoes" ON public.observacoes;
CREATE POLICY "Professor atualiza proprias observacoes" ON public.observacoes FOR UPDATE USING (professor_id = auth.uid());

DROP POLICY IF EXISTS "Admin atualiza observacoes da instituicao" ON public.observacoes;
CREATE POLICY "Admin atualiza observacoes da instituicao" ON public.observacoes FOR UPDATE USING (
  institution_id = get_user_institution_id() AND has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "Professor deleta proprias observacoes em 24h" ON public.observacoes;
CREATE POLICY "Professor deleta proprias observacoes em 24h" ON public.observacoes FOR DELETE USING (
  professor_id = auth.uid() AND created_at > now() - interval '24 hours'
);

DROP POLICY IF EXISTS "Admin deleta observacoes da instituicao" ON public.observacoes;
CREATE POLICY "Admin deleta observacoes da instituicao" ON public.observacoes FOR DELETE USING (
  institution_id = get_user_institution_id() AND has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "Mentores veem observacoes da instituicao" ON public.observacoes;
CREATE POLICY "Mentores veem observacoes da instituicao" ON public.observacoes FOR SELECT TO authenticated USING (
  has_role(auth.uid(), 'professor'::app_role) AND institution_id = get_user_institution_id()
  AND EXISTS (SELECT 1 FROM professor_casa pc WHERE pc.professor_id = auth.uid() AND pc.ativo = true)
);

-- ---- PONTOS_GERAIS ----
DROP POLICY IF EXISTS "Usuarios veem pontos da instituicao" ON public.pontos_gerais;
CREATE POLICY "Usuarios veem pontos da instituicao" ON public.pontos_gerais FOR SELECT USING (institution_id = get_user_institution_id());

DROP POLICY IF EXISTS "Admin pode inserir pontos" ON public.pontos_gerais;
CREATE POLICY "Admin pode inserir pontos" ON public.pontos_gerais FOR INSERT WITH CHECK (institution_id = get_user_institution_id() AND has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admin pode atualizar pontos" ON public.pontos_gerais;
CREATE POLICY "Admin pode atualizar pontos" ON public.pontos_gerais FOR UPDATE USING (institution_id = get_user_institution_id() AND has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admin pode deletar pontos" ON public.pontos_gerais;
CREATE POLICY "Admin pode deletar pontos" ON public.pontos_gerais FOR DELETE USING (institution_id = get_user_institution_id() AND has_role(auth.uid(), 'admin'));

-- ---- INTELIGENCIA_SCORES ----
DROP POLICY IF EXISTS "Aluno ve proprios scores" ON public.inteligencia_scores;
CREATE POLICY "Aluno ve proprios scores" ON public.inteligencia_scores FOR SELECT USING (aluno_id = auth.uid());

DROP POLICY IF EXISTS "Professor ve scores da sua casa" ON public.inteligencia_scores;
CREATE POLICY "Professor ve scores da sua casa" ON public.inteligencia_scores FOR SELECT USING (
  has_role(auth.uid(), 'professor') AND EXISTS (
    SELECT 1 FROM public.profiles p JOIN public.professor_casa pc ON pc.professor_id = auth.uid() AND pc.casa_id = p.casa_id AND pc.ativo = true
    WHERE p.id = inteligencia_scores.aluno_id
  )
);

DROP POLICY IF EXISTS "Admin ve todos scores da instituicao" ON public.inteligencia_scores;
CREATE POLICY "Admin ve todos scores da instituicao" ON public.inteligencia_scores FOR SELECT USING (
  has_role(auth.uid(), 'admin') AND EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = inteligencia_scores.aluno_id AND p.institution_id = get_user_institution_id()
  )
);

DROP POLICY IF EXISTS "Admin pode inserir scores" ON public.inteligencia_scores;
CREATE POLICY "Admin pode inserir scores" ON public.inteligencia_scores FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admin pode atualizar scores" ON public.inteligencia_scores;
CREATE POLICY "Admin pode atualizar scores" ON public.inteligencia_scores FOR UPDATE USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admin pode deletar scores" ON public.inteligencia_scores;
CREATE POLICY "Admin pode deletar scores" ON public.inteligencia_scores FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- ---- INTELIGENCIA_EVIDENCIAS ----
DROP POLICY IF EXISTS "Usuarios veem evidencias da instituicao" ON public.inteligencia_evidencias;
CREATE POLICY "Usuarios veem evidencias da instituicao" ON public.inteligencia_evidencias FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.fases f WHERE f.id = inteligencia_evidencias.fase_id AND f.institution_id = get_user_institution_id())
);

DROP POLICY IF EXISTS "Admin pode inserir evidencias" ON public.inteligencia_evidencias;
CREATE POLICY "Admin pode inserir evidencias" ON public.inteligencia_evidencias FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admin pode deletar evidencias" ON public.inteligencia_evidencias;
CREATE POLICY "Admin pode deletar evidencias" ON public.inteligencia_evidencias FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- ---- INTELIGENCIA_HISTORICO ----
DROP POLICY IF EXISTS "Aluno ve proprio historico" ON public.inteligencia_historico;
CREATE POLICY "Aluno ve proprio historico" ON public.inteligencia_historico FOR SELECT USING (aluno_id = auth.uid());

DROP POLICY IF EXISTS "Professor ve historico da sua casa" ON public.inteligencia_historico;
CREATE POLICY "Professor ve historico da sua casa" ON public.inteligencia_historico FOR SELECT USING (
  has_role(auth.uid(), 'professor') AND EXISTS (
    SELECT 1 FROM public.profiles p JOIN public.professor_casa pc ON pc.professor_id = auth.uid() AND pc.casa_id = p.casa_id AND pc.ativo = true
    WHERE p.id = inteligencia_historico.aluno_id
  )
);

DROP POLICY IF EXISTS "Admin ve todo historico da instituicao" ON public.inteligencia_historico;
CREATE POLICY "Admin ve todo historico da instituicao" ON public.inteligencia_historico FOR SELECT USING (
  has_role(auth.uid(), 'admin') AND EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = inteligencia_historico.aluno_id AND p.institution_id = get_user_institution_id()
  )
);

DROP POLICY IF EXISTS "Admin pode inserir historico" ON public.inteligencia_historico;
CREATE POLICY "Admin pode inserir historico" ON public.inteligencia_historico FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admin pode deletar historico" ON public.inteligencia_historico;
CREATE POLICY "Admin pode deletar historico" ON public.inteligencia_historico FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- ---- SCORE_AJUSTES_LOG ----
DROP POLICY IF EXISTS "Admin pode ver ajustes da instituicao" ON public.score_ajustes_log;
CREATE POLICY "Admin pode ver ajustes da instituicao" ON public.score_ajustes_log FOR SELECT USING (institution_id = get_user_institution_id() AND has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admin pode inserir ajustes" ON public.score_ajustes_log;
CREATE POLICY "Admin pode inserir ajustes" ON public.score_ajustes_log FOR INSERT WITH CHECK (institution_id = get_user_institution_id() AND has_role(auth.uid(), 'admin'));

-- ---- CARGOS_CASA ----
DROP POLICY IF EXISTS "Cargos sao publicos para leitura da instituicao" ON public.cargos_casa;
CREATE POLICY "Cargos sao publicos para leitura da instituicao" ON public.cargos_casa FOR SELECT USING (institution_id = get_user_institution_id());

DROP POLICY IF EXISTS "Admin gerencia cargos" ON public.cargos_casa;
CREATE POLICY "Admin gerencia cargos" ON public.cargos_casa FOR ALL USING (institution_id = get_user_institution_id() AND has_role(auth.uid(), 'admin'::app_role));

-- ---- CANAIS_CASA ----
DROP POLICY IF EXISTS "Aluno ve canais da sua casa ou conselho" ON public.canais_casa;
CREATE POLICY "Aluno ve canais da sua casa ou conselho" ON public.canais_casa FOR SELECT USING (
  (institution_id = get_user_institution_id()) AND (
    (casa_id = (SELECT profiles.casa_id FROM profiles WHERE profiles.id = auth.uid()))
    OR ((casa_id IS NULL) AND (tipo = 'conselho_lideres'))
    OR has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'professor')
  )
);

DROP POLICY IF EXISTS "Admin pode gerenciar canais" ON public.canais_casa;
CREATE POLICY "Admin pode gerenciar canais" ON public.canais_casa FOR ALL USING (
  institution_id = get_user_institution_id() AND has_role(auth.uid(), 'admin')
);

-- ---- MENSAGENS_CANAL ----
DROP POLICY IF EXISTS "Ver mensagens do canal" ON public.mensagens_canal;
CREATE POLICY "Ver mensagens do canal" ON public.mensagens_canal FOR SELECT USING (
  (institution_id = get_user_institution_id()) AND (
    (canal_id IN (SELECT c.id FROM canais_casa c WHERE c.casa_id = (SELECT profiles.casa_id FROM profiles WHERE profiles.id = auth.uid()) AND (c.tipo IS DISTINCT FROM 'lideranca_casa')))
    OR (canal_id IN (SELECT c.id FROM canais_casa c WHERE c.tipo = 'conselho_lideres') AND pode_acessar_conselho(auth.uid()))
    OR (canal_id IN (SELECT c.id FROM canais_casa c WHERE c.tipo = 'lideranca_casa') AND pode_acessar_lideranca_casa(auth.uid(), (SELECT c.casa_id::SMALLINT FROM canais_casa c WHERE c.id = mensagens_canal.canal_id)))
    OR has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'professor')
  )
);

DROP POLICY IF EXISTS "Enviar mensagem no canal" ON public.mensagens_canal;
CREATE POLICY "Enviar mensagem no canal" ON public.mensagens_canal FOR INSERT WITH CHECK (
  (autor_id = auth.uid()) AND (institution_id = get_user_institution_id()) AND (
    (canal_id IN (SELECT c.id FROM canais_casa c WHERE c.casa_id = (SELECT profiles.casa_id FROM profiles WHERE profiles.id = auth.uid()) AND (c.tipo IS DISTINCT FROM 'lideranca_casa')))
    OR (canal_id IN (SELECT c.id FROM canais_casa c WHERE c.tipo = 'conselho_lideres') AND pode_acessar_conselho(auth.uid()))
    OR (canal_id IN (SELECT c.id FROM canais_casa c WHERE c.tipo = 'lideranca_casa') AND pode_acessar_lideranca_casa(auth.uid(), (SELECT c.casa_id::SMALLINT FROM canais_casa c WHERE c.id = mensagens_canal.canal_id)))
    OR has_role(auth.uid(), 'admin')
  )
);

DROP POLICY IF EXISTS "Editar propria mensagem" ON public.mensagens_canal;
CREATE POLICY "Editar propria mensagem" ON public.mensagens_canal FOR UPDATE USING (autor_id = auth.uid());

DROP POLICY IF EXISTS "Admin pode deletar mensagens" ON public.mensagens_canal;
CREATE POLICY "Admin pode deletar mensagens" ON public.mensagens_canal FOR DELETE USING (has_role(auth.uid(), 'admin') AND institution_id = get_user_institution_id());

-- ---- CANAL_LEITURAS ----
DROP POLICY IF EXISTS "Usuarios podem ver suas proprias leituras" ON public.canal_leituras;
CREATE POLICY "Usuarios podem ver suas proprias leituras" ON public.canal_leituras FOR SELECT USING (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Usuarios podem inserir suas proprias leituras" ON public.canal_leituras;
CREATE POLICY "Usuarios podem inserir suas proprias leituras" ON public.canal_leituras FOR INSERT WITH CHECK (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Usuarios podem atualizar suas proprias leituras" ON public.canal_leituras;
CREATE POLICY "Usuarios podem atualizar suas proprias leituras" ON public.canal_leituras FOR UPDATE USING (auth.uid() = usuario_id);

-- ---- CONVERSAS_PRIVADAS ----
DROP POLICY IF EXISTS "Ver conversas privadas" ON public.conversas_privadas;
CREATE POLICY "Ver conversas privadas" ON public.conversas_privadas FOR SELECT TO authenticated USING (public.user_participa_conversa(id));

DROP POLICY IF EXISTS "Criar conversa privada" ON public.conversas_privadas;
CREATE POLICY "Criar conversa privada" ON public.conversas_privadas FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Atualizar conversa privada" ON public.conversas_privadas;
CREATE POLICY "Atualizar conversa privada" ON public.conversas_privadas FOR UPDATE TO authenticated USING (public.user_participa_conversa(id));

-- ---- CONVERSA_PARTICIPANTES ----
DROP POLICY IF EXISTS "Ver participantes da conversa" ON public.conversa_participantes;
CREATE POLICY "Ver participantes da conversa" ON public.conversa_participantes FOR SELECT TO authenticated USING (public.user_participa_conversa(conversa_id));

DROP POLICY IF EXISTS "Inserir participante" ON public.conversa_participantes;
CREATE POLICY "Inserir participante" ON public.conversa_participantes FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Atualizar propria leitura" ON public.conversa_participantes;
CREATE POLICY "Atualizar propria leitura" ON public.conversa_participantes FOR UPDATE TO authenticated USING (usuario_id = auth.uid()) WITH CHECK (usuario_id = auth.uid());

-- ---- MENSAGENS_PRIVADAS ----
DROP POLICY IF EXISTS "Ver mensagens privadas" ON public.mensagens_privadas;
CREATE POLICY "Ver mensagens privadas" ON public.mensagens_privadas FOR SELECT USING (
  conversa_id IN (SELECT conversa_id FROM conversa_participantes WHERE usuario_id = auth.uid())
);

DROP POLICY IF EXISTS "Enviar mensagem privada" ON public.mensagens_privadas;
CREATE POLICY "Enviar mensagem privada" ON public.mensagens_privadas FOR INSERT WITH CHECK (
  autor_id = auth.uid() AND conversa_id IN (SELECT conversa_id FROM conversa_participantes WHERE usuario_id = auth.uid())
);

-- ---- ALERTAS_ALUNOS ----
DROP POLICY IF EXISTS "Professor ve alertas da sua casa" ON public.alertas_alunos;
CREATE POLICY "Professor ve alertas da sua casa" ON public.alertas_alunos FOR SELECT USING (
  has_role(auth.uid(), 'professor'::app_role) AND institution_id = get_user_institution_id()
  AND EXISTS (SELECT 1 FROM public.profiles p JOIN public.professor_casa pc ON pc.casa_id = p.casa_id WHERE p.id = alertas_alunos.aluno_id AND pc.professor_id = auth.uid() AND pc.ativo = true)
);

DROP POLICY IF EXISTS "Admin ve todos alertas da instituicao" ON public.alertas_alunos;
CREATE POLICY "Admin ve todos alertas da instituicao" ON public.alertas_alunos FOR SELECT USING (
  has_role(auth.uid(), 'admin'::app_role) AND institution_id = get_user_institution_id()
);

DROP POLICY IF EXISTS "Professor pode atualizar alertas da sua casa" ON public.alertas_alunos;
CREATE POLICY "Professor pode atualizar alertas da sua casa" ON public.alertas_alunos FOR UPDATE USING (
  has_role(auth.uid(), 'professor'::app_role) AND institution_id = get_user_institution_id()
  AND EXISTS (SELECT 1 FROM public.profiles p JOIN public.professor_casa pc ON pc.casa_id = p.casa_id WHERE p.id = alertas_alunos.aluno_id AND pc.professor_id = auth.uid() AND pc.ativo = true)
);

DROP POLICY IF EXISTS "Admin pode atualizar alertas" ON public.alertas_alunos;
CREATE POLICY "Admin pode atualizar alertas" ON public.alertas_alunos FOR UPDATE USING (
  has_role(auth.uid(), 'admin'::app_role) AND institution_id = get_user_institution_id()
);

DROP POLICY IF EXISTS "Sistema pode inserir alertas" ON public.alertas_alunos;
CREATE POLICY "Sistema pode inserir alertas" ON public.alertas_alunos FOR INSERT WITH CHECK (institution_id = get_user_institution_id());

-- ---- ACOES_PROFESSOR ----
DROP POLICY IF EXISTS "Professor pode criar acoes" ON public.acoes_professor;
CREATE POLICY "Professor pode criar acoes" ON public.acoes_professor FOR INSERT WITH CHECK (professor_id = auth.uid() AND has_role(auth.uid(), 'professor'::app_role) AND institution_id = get_user_institution_id());

DROP POLICY IF EXISTS "Professor ve suas acoes" ON public.acoes_professor;
CREATE POLICY "Professor ve suas acoes" ON public.acoes_professor FOR SELECT USING (professor_id = auth.uid());

DROP POLICY IF EXISTS "Admin ve todas acoes da instituicao" ON public.acoes_professor;
CREATE POLICY "Admin ve todas acoes da instituicao" ON public.acoes_professor FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role) AND institution_id = get_user_institution_id());

DROP POLICY IF EXISTS "Professor pode atualizar suas acoes" ON public.acoes_professor;
CREATE POLICY "Professor pode atualizar suas acoes" ON public.acoes_professor FOR UPDATE USING (professor_id = auth.uid());

DROP POLICY IF EXISTS "Admin pode atualizar acoes" ON public.acoes_professor;
CREATE POLICY "Admin pode atualizar acoes" ON public.acoes_professor FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role) AND institution_id = get_user_institution_id());

-- ---- BONUS_SOLICITACOES ----
DROP POLICY IF EXISTS "Professor ve proprias solicitacoes" ON public.bonus_solicitacoes;
CREATE POLICY "Professor ve proprias solicitacoes" ON public.bonus_solicitacoes FOR SELECT USING (solicitado_por = auth.uid());

DROP POLICY IF EXISTS "Admin ve todas solicitacoes da instituicao" ON public.bonus_solicitacoes;
CREATE POLICY "Admin ve todas solicitacoes da instituicao" ON public.bonus_solicitacoes FOR SELECT USING (institution_id = get_user_institution_id() AND has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Professor pode criar solicitacao" ON public.bonus_solicitacoes;
CREATE POLICY "Professor pode criar solicitacao" ON public.bonus_solicitacoes FOR INSERT WITH CHECK (
  solicitado_por = auth.uid() AND has_role(auth.uid(), 'professor') AND institution_id = get_user_institution_id()
);

DROP POLICY IF EXISTS "Admin pode atualizar solicitacoes" ON public.bonus_solicitacoes;
CREATE POLICY "Admin pode atualizar solicitacoes" ON public.bonus_solicitacoes FOR UPDATE USING (institution_id = get_user_institution_id() AND has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Criador pode deletar pendente" ON public.bonus_solicitacoes;
CREATE POLICY "Criador pode deletar pendente" ON public.bonus_solicitacoes FOR DELETE USING (solicitado_por = auth.uid() AND status = 'pendente');

DROP POLICY IF EXISTS "Admin pode deletar qualquer solicitacao" ON public.bonus_solicitacoes;
CREATE POLICY "Admin pode deletar qualquer solicitacao" ON public.bonus_solicitacoes FOR DELETE USING (institution_id = get_user_institution_id() AND has_role(auth.uid(), 'admin'));

-- ---- ACTIVITY_LOGS ----
DROP POLICY IF EXISTS "admin_read_logs" ON public.activity_logs;
CREATE POLICY "admin_read_logs" ON public.activity_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "authenticated_insert_logs" ON public.activity_logs;
CREATE POLICY "authenticated_insert_logs" ON public.activity_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ---- CONFIG_ALERTAS ----
DROP POLICY IF EXISTS "Config alertas sao publicos para leitura" ON public.config_alertas;
CREATE POLICY "Config alertas sao publicos para leitura" ON public.config_alertas FOR SELECT USING (true);

-- ---- LOOKUP TABLES (publicas para leitura) ----
DROP POLICY IF EXISTS "Hipoteses por sinal sao publicas para leitura" ON public.hipoteses_por_sinal;
CREATE POLICY "Hipoteses por sinal sao publicas para leitura" ON public.hipoteses_por_sinal FOR SELECT USING (true);

DROP POLICY IF EXISTS "Padroes sao publicos para leitura" ON public.hipoteses_por_padrao;
CREATE POLICY "Padroes sao publicos para leitura" ON public.hipoteses_por_padrao FOR SELECT USING (true);

DROP POLICY IF EXISTS "Acoes sao publicas para leitura" ON public.acoes_sugeridas;
CREATE POLICY "Acoes sao publicas para leitura" ON public.acoes_sugeridas FOR SELECT USING (true);

DROP POLICY IF EXISTS "Arquetipos sao publicos para leitura" ON public.arquetipos;
CREATE POLICY "Arquetipos sao publicos para leitura" ON public.arquetipos FOR SELECT USING (true);

DROP POLICY IF EXISTS "Templates sao publicos para leitura" ON public.templates_texto;
CREATE POLICY "Templates sao publicos para leitura" ON public.templates_texto FOR SELECT USING (true);

-- ---- ACOES_CELEBRACAO ----
DROP POLICY IF EXISTS "Professores podem inserir acoes de celebracao" ON public.acoes_celebracao;
CREATE POLICY "Professores podem inserir acoes de celebracao" ON public.acoes_celebracao FOR INSERT WITH CHECK (professor_id = auth.uid());

DROP POLICY IF EXISTS "Professores podem ver suas acoes de celebracao" ON public.acoes_celebracao;
CREATE POLICY "Professores podem ver suas acoes de celebracao" ON public.acoes_celebracao FOR SELECT USING (professor_id = auth.uid());

DROP POLICY IF EXISTS "Professores podem atualizar suas acoes de celebracao" ON public.acoes_celebracao;
CREATE POLICY "Professores podem atualizar suas acoes de celebracao" ON public.acoes_celebracao FOR UPDATE USING (professor_id = auth.uid());

-- ---- FASE_CONTEUDOS ----
DROP POLICY IF EXISTS "Admin pode gerenciar conteudos" ON public.fase_conteudos;
CREATE POLICY "Admin pode gerenciar conteudos" ON public.fase_conteudos FOR ALL USING (institution_id = public.get_user_institution_id() AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Professor pode ver conteudos" ON public.fase_conteudos;
CREATE POLICY "Professor pode ver conteudos" ON public.fase_conteudos FOR SELECT USING (institution_id = public.get_user_institution_id() AND public.has_role(auth.uid(), 'professor'));

-- ---- CONTEUDO_INTELIGENCIA ----
DROP POLICY IF EXISTS "Admin pode gerenciar conteudo_inteligencia" ON public.conteudo_inteligencia;
CREATE POLICY "Admin pode gerenciar conteudo_inteligencia" ON public.conteudo_inteligencia FOR ALL USING (institution_id = public.get_user_institution_id() AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Professor pode ver conteudo_inteligencia" ON public.conteudo_inteligencia;
CREATE POLICY "Professor pode ver conteudo_inteligencia" ON public.conteudo_inteligencia FOR SELECT USING (institution_id = public.get_user_institution_id() AND public.has_role(auth.uid(), 'professor'));

-- ---- PROFESSOR_TURMA ----
DROP POLICY IF EXISTS "Professor ve suas turmas" ON public.professor_turma;
CREATE POLICY "Professor ve suas turmas" ON public.professor_turma FOR SELECT USING (professor_id = auth.uid());

DROP POLICY IF EXISTS "Admin gerencia vinculos professor_turma" ON public.professor_turma;
CREATE POLICY "Admin gerencia vinculos professor_turma" ON public.professor_turma FOR ALL USING (
  has_role(auth.uid(), 'admin'::app_role) AND institution_id = get_user_institution_id()
);

-- ---- ADMIN_LOGS ----
DROP POLICY IF EXISTS "Admin pode inserir logs" ON public.admin_logs;
CREATE POLICY "Admin pode inserir logs" ON public.admin_logs FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admin pode ver logs da instituicao" ON public.admin_logs;
CREATE POLICY "Admin pode ver logs da instituicao" ON public.admin_logs FOR SELECT USING (institution_id = public.get_user_institution_id() AND public.has_role(auth.uid(), 'admin'));

-- ---- MAPA_DESENVOLVIMENTO ----
DROP POLICY IF EXISTS "Professor pode ver mapa das suas turmas" ON public.mapa_desenvolvimento;
CREATE POLICY "Professor pode ver mapa das suas turmas" ON public.mapa_desenvolvimento FOR SELECT USING (
  has_role(auth.uid(), 'professor'::app_role)
  AND (professor_id = auth.uid() OR turma_id = ANY(get_professor_turma_ids()))
);

DROP POLICY IF EXISTS "Professor pode inserir mapa" ON public.mapa_desenvolvimento;
CREATE POLICY "Professor pode inserir mapa" ON public.mapa_desenvolvimento FOR INSERT WITH CHECK (
  professor_id = auth.uid() AND has_role(auth.uid(), 'professor'::app_role) AND institution_id = get_user_institution_id()
);

DROP POLICY IF EXISTS "Professor pode atualizar mapa" ON public.mapa_desenvolvimento;
CREATE POLICY "Professor pode atualizar mapa" ON public.mapa_desenvolvimento FOR UPDATE USING (
  professor_id = auth.uid() AND has_role(auth.uid(), 'professor'::app_role)
);

DROP POLICY IF EXISTS "Professor pode deletar mapa" ON public.mapa_desenvolvimento;
CREATE POLICY "Professor pode deletar mapa" ON public.mapa_desenvolvimento FOR DELETE USING (
  professor_id = auth.uid() AND has_role(auth.uid(), 'professor'::app_role)
);

DROP POLICY IF EXISTS "Admin gerencia mapa da instituicao" ON public.mapa_desenvolvimento;
CREATE POLICY "Admin gerencia mapa da instituicao" ON public.mapa_desenvolvimento FOR ALL USING (
  has_role(auth.uid(), 'admin'::app_role) AND institution_id = get_user_institution_id()
);


-- ============================================================================
-- 8. STORAGE BUCKETS
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'entregas', 'entregas', false, 10485760,
  ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
) ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('brasoes', 'brasoes', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('fase-conteudos', 'fase-conteudos', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('inteligencia-conteudos', 'inteligencia-conteudos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies - entregas
DROP POLICY IF EXISTS "Alunos podem fazer upload em sua pasta" ON storage.objects;
CREATE POLICY "Alunos podem fazer upload em sua pasta" ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'entregas' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Alunos podem ver proprios arquivos" ON storage.objects;
CREATE POLICY "Alunos podem ver proprios arquivos" ON storage.objects FOR SELECT
USING (bucket_id = 'entregas' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Professores podem ver arquivos de alunos da sua casa" ON storage.objects;
CREATE POLICY "Professores podem ver arquivos de alunos da sua casa" ON storage.objects FOR SELECT
USING (bucket_id = 'entregas' AND has_role(auth.uid(), 'professor') AND EXISTS (
  SELECT 1 FROM profiles p JOIN professor_casa pc ON pc.professor_id = auth.uid() AND pc.casa_id = p.casa_id AND pc.ativo = true
  WHERE p.id::text = (storage.foldername(name))[1]
));

DROP POLICY IF EXISTS "Admins podem ver todos arquivos" ON storage.objects;
CREATE POLICY "Admins podem ver todos arquivos" ON storage.objects FOR SELECT
USING (bucket_id = 'entregas' AND has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Alunos podem deletar proprios arquivos storage" ON storage.objects;
CREATE POLICY "Alunos podem deletar proprios arquivos storage" ON storage.objects FOR DELETE
USING (bucket_id = 'entregas' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Admins podem deletar qualquer arquivo" ON storage.objects;
CREATE POLICY "Admins podem deletar qualquer arquivo" ON storage.objects FOR DELETE
USING (bucket_id = 'entregas' AND has_role(auth.uid(), 'admin'));

-- Storage policies - avatars
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
CREATE POLICY "Users can upload own avatar" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Avatars are publicly accessible" ON storage.objects;
CREATE POLICY "Avatars are publicly accessible" ON storage.objects FOR SELECT TO public
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
CREATE POLICY "Users can delete own avatar" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
CREATE POLICY "Users can update own avatar" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Admin can upload any avatar" ON storage.objects;
CREATE POLICY "Admin can upload any avatar" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admin can delete any avatar" ON storage.objects;
CREATE POLICY "Admin can delete any avatar" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admin can update any avatar" ON storage.objects;
CREATE POLICY "Admin can update any avatar" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND public.has_role(auth.uid(), 'admin'));

-- Storage policies - brasoes
DROP POLICY IF EXISTS "Brasoes sao publicos" ON storage.objects;
CREATE POLICY "Brasoes sao publicos" ON storage.objects FOR SELECT USING (bucket_id = 'brasoes');

-- Storage policies - fase-conteudos
DROP POLICY IF EXISTS "Acesso publico aos PDFs de fase" ON storage.objects;
CREATE POLICY "Acesso publico aos PDFs de fase" ON storage.objects FOR SELECT USING (bucket_id = 'fase-conteudos');

DROP POLICY IF EXISTS "Admin pode fazer upload de conteudo de fase" ON storage.objects;
CREATE POLICY "Admin pode fazer upload de conteudo de fase" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'fase-conteudos' AND has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admin pode atualizar conteudo de fase" ON storage.objects;
CREATE POLICY "Admin pode atualizar conteudo de fase" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'fase-conteudos' AND has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admin pode deletar conteudo de fase" ON storage.objects;
CREATE POLICY "Admin pode deletar conteudo de fase" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'fase-conteudos' AND has_role(auth.uid(), 'admin'::app_role));

-- Storage policies - inteligencia-conteudos
DROP POLICY IF EXISTS "Arquivos de conteudo sao publicos para leitura" ON storage.objects;
CREATE POLICY "Arquivos de conteudo sao publicos para leitura" ON storage.objects FOR SELECT USING (bucket_id = 'inteligencia-conteudos');

DROP POLICY IF EXISTS "Admin pode fazer upload de conteudo" ON storage.objects;
CREATE POLICY "Admin pode fazer upload de conteudo" ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'inteligencia-conteudos' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admin pode deletar conteudo" ON storage.objects;
CREATE POLICY "Admin pode deletar conteudo" ON storage.objects FOR DELETE
USING (bucket_id = 'inteligencia-conteudos' AND public.has_role(auth.uid(), 'admin'));


-- ============================================================================
-- 9. REALTIME
-- ============================================================================

-- Note: These may fail if already added; that is OK
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.mensagens_canal; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.mensagens_privadas; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.entregas; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.fases; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.observacoes; EXCEPTION WHEN OTHERS THEN NULL; END $$;


-- ============================================================================
-- FIM DA MIGRATION
-- ============================================================================
