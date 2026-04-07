-- ============================================================================
-- MIGRATION: Sistema de 52 Habilidades e Arvore de Talentos
-- Data: 2026-04-06
-- Descricao: Cria tabelas de habilidades, mapa de ativacao, observacoes
--            semanais e arvore de talentos para o Sistema Arboria.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. HABILIDADES (52 skills across 4 dimensions)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.habilidades (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(5) UNIQUE NOT NULL,
  nome TEXT NOT NULL,
  dimensao TEXT NOT NULL CHECK (dimensao IN ('cognitiva', 'autorregulatoria', 'social', 'emocional')),
  descricao TEXT,
  ancora_diagnostica TEXT,
  ordem SMALLINT NOT NULL
);

ALTER TABLE public.habilidades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Habilidades sao publicas para leitura"
  ON public.habilidades FOR SELECT USING (true);

-- ============================================================================
-- 2. HABILIDADE_INTELIGENCIA (Activation Map: nucleo + suporte)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.habilidade_inteligencia (
  id SERIAL PRIMARY KEY,
  habilidade_id INTEGER NOT NULL REFERENCES public.habilidades(id),
  inteligencia_id SMALLINT NOT NULL REFERENCES public.inteligencias(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('nucleo', 'suporte')),
  UNIQUE(habilidade_id, inteligencia_id)
);

ALTER TABLE public.habilidade_inteligencia ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Mapa ativacao publico para leitura"
  ON public.habilidade_inteligencia FOR SELECT USING (true);

-- ============================================================================
-- 3. ATIVIDADE_HABILIDADES (which skills each week/phase works on)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.atividade_habilidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id),
  fase_id UUID REFERENCES public.fases(id),
  semana SMALLINT NOT NULL CHECK (semana BETWEEN 1 AND 4),
  habilidade_id INTEGER NOT NULL REFERENCES public.habilidades(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.atividade_habilidades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Atividade habilidades leitura autenticado"
  ON public.atividade_habilidades FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin pode gerenciar atividade habilidades"
  ON public.atividade_habilidades FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- 4. OBSERVACAO_SEMANAL (weekly observation batch)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.observacao_semanal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id),
  professor_id UUID NOT NULL REFERENCES public.profiles(id),
  fase_id UUID NOT NULL REFERENCES public.fases(id),
  serie TEXT NOT NULL,
  turma TEXT NOT NULL,
  semana SMALLINT NOT NULL CHECK (semana BETWEEN 1 AND 4),
  status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'enviada')),
  enviada_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(institution_id, professor_id, fase_id, serie, turma, semana)
);

ALTER TABLE public.observacao_semanal ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Professor ve suas observacoes"
  ON public.observacao_semanal FOR SELECT
  USING (professor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Professor pode criar observacao"
  ON public.observacao_semanal FOR INSERT
  WITH CHECK (professor_id = auth.uid());
CREATE POLICY "Professor pode atualizar sua observacao"
  ON public.observacao_semanal FOR UPDATE
  USING (professor_id = auth.uid());

-- ============================================================================
-- 5. OBSERVACAO_ALUNO (student state per week)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.observacao_aluno (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  observacao_semanal_id UUID NOT NULL REFERENCES public.observacao_semanal(id) ON DELETE CASCADE,
  aluno_id UUID NOT NULL REFERENCES public.profiles(id),
  estado TEXT NOT NULL DEFAULT 'fez' CHECK (estado IN ('surpreendeu', 'fez', 'dificuldades', 'nao_conseguiu')),
  observacao_texto TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(observacao_semanal_id, aluno_id)
);

ALTER TABLE public.observacao_aluno ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Professor ve observacoes aluno"
  ON public.observacao_aluno FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.observacao_semanal os
      WHERE os.id = observacao_aluno.observacao_semanal_id
        AND (os.professor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );
CREATE POLICY "Professor pode criar observacao aluno"
  ON public.observacao_aluno FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.observacao_semanal os
      WHERE os.id = observacao_aluno.observacao_semanal_id
        AND os.professor_id = auth.uid()
    )
  );
CREATE POLICY "Professor pode atualizar observacao aluno"
  ON public.observacao_aluno FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.observacao_semanal os
      WHERE os.id = observacao_aluno.observacao_semanal_id
        AND os.professor_id = auth.uid()
    )
  );

-- ============================================================================
-- 6. ARVORE_TALENTOS (talent tree points)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.arvore_talentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  habilidade_id INTEGER NOT NULL REFERENCES public.habilidades(id),
  inteligencia_id SMALLINT NOT NULL REFERENCES public.inteligencias(id),
  fase_id UUID REFERENCES public.fases(id),
  semana SMALLINT,
  ano_letivo SMALLINT NOT NULL DEFAULT 2026,
  tipo_ponto TEXT NOT NULL CHECK (tipo_ponto IN ('consolidacao', 'desenvolvimento', 'contato', 'exposicao')),
  fonte TEXT NOT NULL CHECK (fonte IN ('observacao', 'missao')),
  fonte_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_arvore_aluno
  ON public.arvore_talentos(aluno_id);
CREATE INDEX IF NOT EXISTS idx_arvore_aluno_hab
  ON public.arvore_talentos(aluno_id, habilidade_id, inteligencia_id);
CREATE INDEX IF NOT EXISTS idx_arvore_fase
  ON public.arvore_talentos(fase_id, semana);

ALTER TABLE public.arvore_talentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Aluno ve sua arvore"
  ON public.arvore_talentos FOR SELECT
  USING (
    aluno_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'professor')
  );
CREATE POLICY "Sistema pode inserir pontos"
  ON public.arvore_talentos FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'professor')
  );

-- ============================================================================
-- 7. INSERT ALL 52 HABILIDADES
-- ============================================================================

-- DIMENSAO COGNITIVA (15 habilidades)
INSERT INTO public.habilidades (codigo, nome, dimensao, descricao, ordem) VALUES
('C01', 'Atencao Sustentada',          'cognitiva', 'Manter foco prolongado em tarefa sem perder qualidade', 1),
('C02', 'Atencao Seletiva',            'cognitiva', 'Filtrar estimulos irrelevantes e manter foco no essencial', 2),
('C03', 'Memoria de Trabalho (Cognitiva)', 'cognitiva', 'Manter multiplas informacoes ativas enquanto raciocina', 3),
('C04', 'Memoria de Longo Prazo',      'cognitiva', 'Armazenar e recuperar informacoes aprendidas anteriormente', 4),
('C05', 'Raciocinio Analogico',        'cognitiva', 'Perceber relacoes entre dominios diferentes e aplicar padroes', 5),
('C06', 'Raciocinio Dedutivo',         'cognitiva', 'Partir de premissas gerais para conclusoes especificas', 6),
('C07', 'Raciocinio Indutivo',         'cognitiva', 'Partir de casos especificos para formular regras gerais', 7),
('C08', 'Pensamento Sistemico',        'cognitiva', 'Perceber relacoes de interdependencia entre elementos de um sistema', 8),
('C09', 'Pensamento Criativo',         'cognitiva', 'Gerar solucoes, conexoes ou perspectivas nao obvias', 9),
('C10', 'Pensamento Critico',          'cognitiva', 'Avaliar informacoes, argumentos e conclusoes identificando premissas e lacunas', 10),
('C11', 'Metacognicao',                'cognitiva', 'Monitorar e refletir sobre o proprio processo de aprendizagem', 11),
('C12', 'Transferencia',               'cognitiva', 'Aplicar conhecimento de um contexto a situacoes novas e diferentes', 12),
('C13', 'Resolucao de Problemas',      'cognitiva', 'Estruturar e abordar problemas de forma sistematica', 13),
('C14', 'Velocidade de Processamento', 'cognitiva', 'Rapidez com que processa e responde a informacoes', 14),
('C15', 'Curiosidade Cognitiva',       'cognitiva', 'Disposicao para investigar e explorar alem do requerido', 15)
ON CONFLICT (codigo) DO NOTHING;

-- DIMENSAO AUTORREGULATORIA (11 habilidades)
INSERT INTO public.habilidades (codigo, nome, dimensao, descricao, ordem) VALUES
('A01', 'Controle Inibitorio',          'autorregulatoria', 'Inibir respostas impulsivas para agir de forma deliberada', 1),
('A02', 'Memoria de Trabalho (Autorregulacao)', 'autorregulatoria', 'Manter o plano ativo resistindo a distracoes', 2),
('A03', 'Flexibilidade Cognitiva',      'autorregulatoria', 'Mudar de perspectiva ou estrategia diante de novas informacoes', 3),
('A04', 'Persistencia',                 'autorregulatoria', 'Continuar diante de dificuldade sem desistir', 4),
('A05', 'Tolerancia a Frustracao',      'autorregulatoria', 'Manter funcionamento diante de resultados insatisfatorios', 5),
('A06', 'Autorregulacao Emocional',     'autorregulatoria', 'Perceber e gerenciar estados emocionais', 6),
('A07', 'Planejamento e Organizacao',   'autorregulatoria', 'Antecipar etapas e estruturar acao no tempo', 7),
('A08', 'Monitoramento do Progresso',   'autorregulatoria', 'Avaliar se esta avancando e ajustar quando necessario', 8),
('A09', 'Motivacao Intrinseca',         'autorregulatoria', 'Engajar por interesse genuino, nao por recompensa externa', 9),
('A10', 'Tolerancia a Ambiguidade',     'autorregulatoria', 'Funcionar bem diante de incerteza ou instrucoes abertas', 10),
('A11', 'Iniciativa',                   'autorregulatoria', 'Comecar acao sem precisar de instrucao ou permissao explicita', 11)
ON CONFLICT (codigo) DO NOTHING;

-- DIMENSAO SOCIAL (13 habilidades)
INSERT INTO public.habilidades (codigo, nome, dimensao, descricao, ordem) VALUES
('S01', 'Empatia Cognitiva',            'social', 'Compreender perspectiva e raciocinio de outra pessoa', 1),
('S02', 'Leitura de Contexto Social',   'social', 'Perceber dinamica implicita de um grupo', 2),
('S03', 'Comunicacao Verbal',           'social', 'Expressar ideias de forma clara e adequada ao contexto', 3),
('S04', 'Comunicacao Nao-Verbal',       'social', 'Ler e usar sinais nao-verbais de forma intencional', 4),
('S05', 'Escuta Ativa',                 'social', 'Prestar atencao genuina ao que o outro diz', 5),
('S06', 'Colaboracao',                  'social', 'Trabalhar com outros em direcao a objetivo compartilhado', 6),
('S07', 'Negociacao e Mediacao',        'social', 'Encontrar solucoes que atendam interesses divergentes', 7),
('S08', 'Lideranca Situacional',        'social', 'Assumir lideranca quando a situacao requer', 8),
('S09', 'Responsabilidade Coletiva',    'social', 'Assumir responsabilidade por resultados do grupo', 9),
('S10', 'Assertividade',               'social', 'Expressar opiniao com clareza e respeito', 10),
('S11', 'Adaptacao Social',            'social', 'Ajustar comportamento a diferentes contextos mantendo autenticidade', 11),
('S12', 'Construcao de Vinculos',      'social', 'Criar e manter relacoes de confianca ao longo do tempo', 12),
('S13', 'Consciencia de Impacto',      'social', 'Perceber como suas acoes afetam as pessoas ao redor', 13)
ON CONFLICT (codigo) DO NOTHING;

-- DIMENSAO EMOCIONAL (13 habilidades)
INSERT INTO public.habilidades (codigo, nome, dimensao, descricao, ordem) VALUES
('E01', 'Autoconsciencia Emocional',       'emocional', 'Perceber e nomear proprios estados emocionais com precisao', 1),
('E02', 'Empatia Afetiva',                 'emocional', 'Sentir a emocao do outro', 2),
('E03', 'Nomeacao Emocional',              'emocional', 'Transformar estados emocionais difusos em palavras', 3),
('E04', 'Tolerancia ao Desconforto Emocional', 'emocional', 'Permanecer funcional diante de emocoes desconfortaveis', 4),
('E05', 'Processamento Emocional',         'emocional', 'Elaborar emocoes apos experiencias intensas', 5),
('E06', 'Regulacao da Intensidade Emocional', 'emocional', 'Modular intensidade da resposta emocional', 6),
('E07', 'Resiliencia Emocional',           'emocional', 'Recuperar-se de experiencias emocionais dificeis', 7),
('E08', 'Autocompaixao',                   'emocional', 'Tratar a si mesmo com compreensao diante de falha', 8),
('E09', 'Gestao da Ansiedade',             'emocional', 'Funcionar bem diante de incerteza ou pressao', 9),
('E10', 'Entusiasmo e Vitalidade',         'emocional', 'Nivel de energia emocional positiva para engajamento', 10),
('E11', 'Gestao da Raiva',                 'emocional', 'Reconhecer e processar raiva sem causar dano', 11),
('E12', 'Gratidao e Reconhecimento',       'emocional', 'Perceber e nomear o que e positivo na experiencia', 12),
('E13', 'Regulacao por Antecipacao',       'emocional', 'Regular resposta emocional antes que o evento aconteca', 13)
ON CONFLICT (codigo) DO NOTHING;

-- ============================================================================
-- 8. INSERT ACTIVATION MAP (nucleo + suporte per inteligencia)
-- ============================================================================
-- Inteligencia IDs:
--   1=linguistica, 2=logico_matematica, 3=espacial, 4=musical,
--   5=corporal_cinestesica, 6=naturalista, 7=interpessoal, 8=intrapessoal

-- LINGUISTICA (id=1)
-- Nucleo: C11, C09, A01, S03, E01
INSERT INTO public.habilidade_inteligencia (habilidade_id, inteligencia_id, tipo)
SELECT h.id, 1, 'nucleo' FROM public.habilidades h WHERE h.codigo IN ('C11','C09','A01','S03','E01')
ON CONFLICT (habilidade_id, inteligencia_id) DO NOTHING;
-- Suporte: C04, C06, A04, S05, E03
INSERT INTO public.habilidade_inteligencia (habilidade_id, inteligencia_id, tipo)
SELECT h.id, 1, 'suporte' FROM public.habilidades h WHERE h.codigo IN ('C04','C06','A04','S05','E03')
ON CONFLICT (habilidade_id, inteligencia_id) DO NOTHING;

-- LOGICO-MATEMATICA (id=2)
-- Nucleo: C05, C08, A07, S10, E04
INSERT INTO public.habilidade_inteligencia (habilidade_id, inteligencia_id, tipo)
SELECT h.id, 2, 'nucleo' FROM public.habilidades h WHERE h.codigo IN ('C05','C08','A07','S10','E04')
ON CONFLICT (habilidade_id, inteligencia_id) DO NOTHING;
-- Suporte: C10, C11, A10, S01
INSERT INTO public.habilidade_inteligencia (habilidade_id, inteligencia_id, tipo)
SELECT h.id, 2, 'suporte' FROM public.habilidades h WHERE h.codigo IN ('C10','C11','A10','S01')
ON CONFLICT (habilidade_id, inteligencia_id) DO NOTHING;

-- ESPACIAL (id=3)
-- Nucleo: C09, C12, A07, S03, E10
INSERT INTO public.habilidade_inteligencia (habilidade_id, inteligencia_id, tipo)
SELECT h.id, 3, 'nucleo' FROM public.habilidades h WHERE h.codigo IN ('C09','C12','A07','S03','E10')
ON CONFLICT (habilidade_id, inteligencia_id) DO NOTHING;
-- Suporte: C05, C13, A11, S02
INSERT INTO public.habilidade_inteligencia (habilidade_id, inteligencia_id, tipo)
SELECT h.id, 3, 'suporte' FROM public.habilidades h WHERE h.codigo IN ('C05','C13','A11','S02')
ON CONFLICT (habilidade_id, inteligencia_id) DO NOTHING;

-- MUSICAL (id=4)
-- Nucleo: C01, C02, A04, A09, S06, E02
INSERT INTO public.habilidade_inteligencia (habilidade_id, inteligencia_id, tipo)
SELECT h.id, 4, 'nucleo' FROM public.habilidades h WHERE h.codigo IN ('C01','C02','A04','A09','S06','E02')
ON CONFLICT (habilidade_id, inteligencia_id) DO NOTHING;
-- Suporte: C11, A01, S11, E06
INSERT INTO public.habilidade_inteligencia (habilidade_id, inteligencia_id, tipo)
SELECT h.id, 4, 'suporte' FROM public.habilidades h WHERE h.codigo IN ('C11','A01','S11','E06')
ON CONFLICT (habilidade_id, inteligencia_id) DO NOTHING;

-- CORPORAL-CINESTESICA (id=5)
-- Nucleo: C12, C13, A04, A08, S04, E10
INSERT INTO public.habilidade_inteligencia (habilidade_id, inteligencia_id, tipo)
SELECT h.id, 5, 'nucleo' FROM public.habilidades h WHERE h.codigo IN ('C12','C13','A04','A08','S04','E10')
ON CONFLICT (habilidade_id, inteligencia_id) DO NOTHING;
-- Suporte: C01, A01, A09, E07
INSERT INTO public.habilidade_inteligencia (habilidade_id, inteligencia_id, tipo)
SELECT h.id, 5, 'suporte' FROM public.habilidades h WHERE h.codigo IN ('C01','A01','A09','E07')
ON CONFLICT (habilidade_id, inteligencia_id) DO NOTHING;

-- NATURALISTA (id=6)
-- Nucleo: C07, C15, A11, S02, E04
INSERT INTO public.habilidade_inteligencia (habilidade_id, inteligencia_id, tipo)
SELECT h.id, 6, 'nucleo' FROM public.habilidades h WHERE h.codigo IN ('C07','C15','A11','S02','E04')
ON CONFLICT (habilidade_id, inteligencia_id) DO NOTHING;
-- Suporte: C08, C14, S09, E12
INSERT INTO public.habilidade_inteligencia (habilidade_id, inteligencia_id, tipo)
SELECT h.id, 6, 'suporte' FROM public.habilidades h WHERE h.codigo IN ('C08','C14','S09','E12')
ON CONFLICT (habilidade_id, inteligencia_id) DO NOTHING;

-- INTERPESSOAL (id=7)
-- Nucleo: S01, A06, S02, S05, E02
-- (S01 is listed as "via cog" but still nucleo for this intelligence)
INSERT INTO public.habilidade_inteligencia (habilidade_id, inteligencia_id, tipo)
SELECT h.id, 7, 'nucleo' FROM public.habilidades h WHERE h.codigo IN ('S01','A06','S02','S05','E02')
ON CONFLICT (habilidade_id, inteligencia_id) DO NOTHING;
-- Suporte: S07, S08, S13, A03, E05
INSERT INTO public.habilidade_inteligencia (habilidade_id, inteligencia_id, tipo)
SELECT h.id, 7, 'suporte' FROM public.habilidades h WHERE h.codigo IN ('S07','S08','S13','A03','E05')
ON CONFLICT (habilidade_id, inteligencia_id) DO NOTHING;

-- INTRAPESSOAL (id=8)
-- Nucleo: C11, A06, A02, S01, E01, E03
INSERT INTO public.habilidade_inteligencia (habilidade_id, inteligencia_id, tipo)
SELECT h.id, 8, 'nucleo' FROM public.habilidades h WHERE h.codigo IN ('C11','A06','A02','S01','E01','E03')
ON CONFLICT (habilidade_id, inteligencia_id) DO NOTHING;
-- Suporte: C15, A10, E07, E08, E13
INSERT INTO public.habilidade_inteligencia (habilidade_id, inteligencia_id, tipo)
SELECT h.id, 8, 'suporte' FROM public.habilidades h WHERE h.codigo IN ('C15','A10','E07','E08','E13')
ON CONFLICT (habilidade_id, inteligencia_id) DO NOTHING;

COMMIT;
