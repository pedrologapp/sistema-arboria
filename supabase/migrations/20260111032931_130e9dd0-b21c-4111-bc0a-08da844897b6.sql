-- ═══════════════════════════════════════════════════════════════════
-- 1. TABELA: hipoteses_por_sinal
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE hipoteses_por_sinal (
  id SERIAL PRIMARY KEY,
  sinal_codigo TEXT NOT NULL,
  ordem INTEGER NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL
);

-- RLS: Leitura pública (lookup)
ALTER TABLE hipoteses_por_sinal ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Hipóteses por sinal são públicas para leitura"
  ON hipoteses_por_sinal FOR SELECT USING (true);

-- Seed data (mapeando para códigos existentes na tabela sinais)
INSERT INTO hipoteses_por_sinal (sinal_codigo, ordem, titulo, descricao) VALUES
('estava_pesado', 1, 'Algo externo', 'Tristeza persistente pode indicar situação fora da escola (família, saúde, perdas).'),
('estava_pesado', 2, 'Fase difícil', 'Alguns alunos se frustram quando a fase não é sua área de força.'),
('ansioso', 1, 'Pressão ou cobrança', 'Ansiedade pode indicar medo de errar ou expectativas altas (próprias ou externas).'),
('ansioso', 2, 'Mudança de contexto', 'Algo pode ter mudado na rotina ou ambiente do aluno.'),
('isolou_se', 1, 'Problema social', 'Isolamento pode indicar conflito com colegas ou exclusão do grupo.'),
('isolou_se', 2, 'Introspecção', 'Alguns alunos se recolhem quando estão processando algo difícil.'),
('estava_calado', 1, 'Insegurança', 'Silêncio pode indicar medo de se expor ou baixa autoconfiança na fase atual.'),
('estava_calado', 2, 'Problema social', 'Verificar se há conflito ou mudança nas amizades.'),
('conflitou', 1, 'Tensão social', 'Conflitos repetidos podem indicar dificuldade de regulação emocional.'),
('conflitou', 2, 'Fator externo', 'Problemas fora da escola podem se manifestar como irritabilidade.'),
('travou', 1, 'Dificuldade cognitiva', 'A fase atual pode exigir habilidades que não são a força do aluno.'),
('travou', 2, 'Bloqueio emocional', 'Às vezes "travar" é sintoma de ansiedade ou medo de errar.'),
('desistiu', 1, 'Frustração acumulada', 'Desistência pode indicar que o aluno não está se sentindo capaz.'),
('desistiu', 2, 'Falta de conexão', 'O aluno pode não ver sentido na atividade ou fase atual.'),
('algo_estranho', 1, 'Atenção necessária', 'O professor percebeu algo, vale investigar com conversa.'),
('algo_estranho', 2, 'Mudança recente', 'Algo pode ter mudado na vida do aluno.');

-- ═══════════════════════════════════════════════════════════════════
-- 2. TABELA: hipoteses_por_padrao
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE hipoteses_por_padrao (
  id SERIAL PRIMARY KEY,
  padrao_codigo TEXT NOT NULL,
  ordem INTEGER NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL
);

-- RLS
ALTER TABLE hipoteses_por_padrao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Padrões são públicos para leitura"
  ON hipoteses_por_padrao FOR SELECT USING (true);

-- Seed data
INSERT INTO hipoteses_por_padrao (padrao_codigo, ordem, titulo, descricao) VALUES
('mudanca_abrupta', 1, 'Fator externo', 'Mudança abrupta em aluno engajado sugere algo fora da escola (família, saúde, problemas pessoais).'),
('mudanca_abrupta', 2, 'Problema social', 'Verificar se houve conflito com colegas ou mudança nas amizades.'),
('padrao_fase_especifica', 1, 'Dificuldade na fase', 'O aluno pode ter dificuldade específica com esta inteligência. Considere usar a força da casa dele como ponte.'),
('padrao_fase_especifica', 2, 'Desconexão com o tema', 'O aluno pode não estar encontrando sentido nas atividades desta fase.');

-- ═══════════════════════════════════════════════════════════════════
-- 3. TABELA: acoes_sugeridas
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE acoes_sugeridas (
  id SERIAL PRIMARY KEY,
  tipo_alerta TEXT NOT NULL,
  ordem INTEGER NOT NULL,
  titulo TEXT NOT NULL,
  icone TEXT NOT NULL
);

-- RLS
ALTER TABLE acoes_sugeridas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ações são públicas para leitura"
  ON acoes_sugeridas FOR SELECT USING (true);

-- Seed data
INSERT INTO acoes_sugeridas (tipo_alerta, ordem, titulo, icone) VALUES
('atencao_geral', 1, 'Conversar com {nome}', 'MessageCircle'),
('atencao_geral', 2, 'Apenas observar mais', 'Eye'),
('atencao_geral', 3, 'Falar com outros professores', 'Users'),
('social', 1, 'Conversar com {nome}', 'MessageCircle'),
('social', 2, 'Observar interações sociais', 'Users'),
('social', 3, 'Falar com outros professores', 'Users'),
('mudanca_abrupta', 1, 'Conversar com {nome}', 'MessageCircle'),
('mudanca_abrupta', 2, 'Verificar com a família', 'Home'),
('mudanca_abrupta', 3, 'Falar com outros professores', 'Users');

-- ═══════════════════════════════════════════════════════════════════
-- 4. TABELA: arquetipos (matriz 64 combinações)
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE arquetipos (
  id SERIAL PRIMARY KEY,
  casa_codigo TEXT NOT NULL,
  fase_codigo TEXT NOT NULL,
  nome_arquetipo TEXT,
  tipo TEXT NOT NULL CHECK (tipo IN ('descoberta', 'confirmacao')),
  significado TEXT NOT NULL,
  potencializar TEXT[] NOT NULL,
  UNIQUE(casa_codigo, fase_codigo)
);

-- RLS
ALTER TABLE arquetipos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Arquétipos são públicos para leitura"
  ON arquetipos FOR SELECT USING (true);

-- Seed data: 64 combinações (8 casas × 8 fases)

-- CASA LINGUÍSTICA
INSERT INTO arquetipos (casa_codigo, fase_codigo, nome_arquetipo, tipo, significado, potencializar) VALUES
('linguistica', 'linguistica', NULL, 'confirmacao', '{nome} está consolidando sua força principal em Linguística.', ARRAY['Desafios de nível avançado', 'Papel de mentor para colegas', 'Projetos de protagonismo na escrita']),
('linguistica', 'logico_matematica', 'O Argumentador Implacável', 'descoberta', '{nome} está combinando palavras com lógica. Pode ter talento para debates, argumentação e raciocínio verbal.', ARRAY['Participar de debates estruturados', 'Criar argumentações lógicas', 'Explorar filosofia e retórica']),
('linguistica', 'espacial', 'O Roteirista Visionário', 'descoberta', '{nome} está conectando narrativa com visualização. Pode ter talento para contar histórias visuais.', ARRAY['Criar storyboards e roteiros', 'Escrever descrições visuais ricas', 'Explorar quadrinhos e narrativas gráficas']),
('linguistica', 'musical', 'O Letrista Magistral', 'descoberta', '{nome} está unindo palavras e música. Pode ter talento para composição de letras e poesia rítmica.', ARRAY['Escrever letras de músicas', 'Explorar poesia com métrica e ritmo', 'Criar spoken word']),
('linguistica', 'corporal_cinestesica', 'O Ator de Método', 'descoberta', '{nome} está conectando expressão verbal com corporal. Pode ter talento para atuação e performance.', ARRAY['Explorar teatro e interpretação', 'Criar monólogos', 'Trabalhar expressão corporal na comunicação']),
('linguistica', 'interpessoal', 'O Comunicador Empático', 'descoberta', '{nome} está usando palavras para conectar pessoas. Pode ter talento para mediação e comunicação transformadora.', ARRAY['Facilitar diálogos em grupo', 'Criar textos que conectam pessoas', 'Explorar jornalismo humanizado']),
('linguistica', 'intrapessoal', 'O Memorialista Profundo', 'descoberta', '{nome} está usando a escrita para autoconhecimento. Pode ter talento para escrita reflexiva e autobiográfica.', ARRAY['Manter diário reflexivo', 'Escrever memórias e ensaios pessoais', 'Explorar escrita terapêutica']),
('linguistica', 'naturalista', 'O Narrador da Natureza', 'descoberta', '{nome} está contando histórias sobre o mundo natural. Pode ter talento para literatura de natureza.', ARRAY['Escrever sobre observações da natureza', 'Criar guias narrativos', 'Explorar escrita ambiental']),

-- CASA LÓGICO-MATEMÁTICA
('logico_matematica', 'linguistica', 'O Argumentador Implacável', 'descoberta', '{nome} está aplicando lógica à linguagem. Pode ter talento para argumentação estruturada e análise textual.', ARRAY['Analisar argumentos e falácias', 'Criar textos com estrutura lógica', 'Explorar linguística computacional']),
('logico_matematica', 'logico_matematica', NULL, 'confirmacao', '{nome} está consolidando sua força principal em Lógico-Matemática.', ARRAY['Desafios matemáticos avançados', 'Olimpíadas de matemática', 'Projetos de programação']),
('logico_matematica', 'espacial', 'O Engenheiro Visionário', 'descoberta', '{nome} está combinando cálculo com visualização espacial. Pode ter talento para engenharia e design técnico.', ARRAY['Projetos de construção e modelagem', 'Explorar geometria aplicada', 'Criar designs com precisão matemática']),
('logico_matematica', 'musical', 'O Compositor Algorítmico', 'descoberta', '{nome} está encontrando padrões matemáticos na música. Pode ter talento para teoria musical e composição estruturada.', ARRAY['Explorar matemática na música', 'Criar composições com padrões', 'Estudar acústica e harmonia']),
('logico_matematica', 'corporal_cinestesica', 'O Atleta Estratégico', 'descoberta', '{nome} está aplicando estratégia ao movimento. Pode ter talento para esportes táticos e análise de performance.', ARRAY['Analisar estratégias esportivas', 'Estudar biomecânica', 'Criar planos de treino otimizados']),
('logico_matematica', 'interpessoal', 'O Estrategista de Pessoas', 'descoberta', '{nome} está aplicando lógica às relações sociais. Pode ter talento para gestão e dinâmicas de grupo.', ARRAY['Facilitar resolução de problemas em grupo', 'Criar sistemas de organização social', 'Explorar teoria dos jogos']),
('logico_matematica', 'intrapessoal', 'O Filósofo Sistemático', 'descoberta', '{nome} está usando lógica para autocompreensão. Pode ter talento para filosofia analítica e reflexão estruturada.', ARRAY['Explorar filosofia da mente', 'Criar sistemas de autoavaliação', 'Estudar lógica e ética']),
('logico_matematica', 'naturalista', 'O Cientista de Campo', 'descoberta', '{nome} está aplicando método científico à natureza. Pode ter talento para pesquisa e análise ambiental.', ARRAY['Coletar e analisar dados da natureza', 'Criar experimentos de campo', 'Explorar ecologia quantitativa']),

-- CASA ESPACIAL
('espacial', 'linguistica', 'O Contador de Histórias Visual', 'descoberta', '{nome} está transformando palavras em imagens. Pode ter talento para ilustração narrativa e design editorial.', ARRAY['Ilustrar histórias e poemas', 'Criar mapas mentais de textos', 'Explorar design gráfico editorial']),
('espacial', 'logico_matematica', 'O Engenheiro Visionário', 'descoberta', '{nome} está visualizando conceitos matemáticos. Pode ter talento para geometria e modelagem 3D.', ARRAY['Criar representações visuais de problemas', 'Explorar geometria descritiva', 'Modelagem e impressão 3D']),
('espacial', 'espacial', NULL, 'confirmacao', '{nome} está consolidando sua força principal em Espacial.', ARRAY['Projetos de arte e design avançados', 'Explorar arquitetura', 'Criar portfólio artístico']),
('espacial', 'musical', 'O Designer de Som e Imagem', 'descoberta', '{nome} está conectando visão e som. Pode ter talento para visualização musical e arte sinestésica.', ARRAY['Criar visualizações de música', 'Explorar arte que representa sons', 'Trabalhar com videoclipes e VJ']),
('espacial', 'corporal_cinestesica', 'O Atleta-Estrategista', 'descoberta', '{nome} está usando visualização espacial no movimento. Pode ter talento para esportes que exigem noção espacial.', ARRAY['Explorar esportes de precisão espacial', 'Criar coreografias visuais', 'Trabalhar com parkour ou ginástica']),
('espacial', 'interpessoal', 'O Diretor de Experiências', 'descoberta', '{nome} está criando espaços para pessoas. Pode ter talento para cenografia e design de ambientes.', ARRAY['Criar ambientes para eventos', 'Explorar cenografia', 'Design de espaços colaborativos']),
('espacial', 'intrapessoal', 'O Artista Conceitual', 'descoberta', '{nome} está expressando mundo interno através de arte. Pode ter talento para arte abstrata e expressionista.', ARRAY['Criar arte autobiográfica', 'Explorar arte conceitual', 'Usar arte como ferramenta de reflexão']),
('espacial', 'naturalista', 'O Cartógrafo da Natureza', 'descoberta', '{nome} está mapeando e ilustrando o mundo natural. Pode ter talento para ilustração científica e cartografia.', ARRAY['Criar mapas e ilustrações de natureza', 'Explorar ilustração botânica/zoológica', 'Documentação visual de ecossistemas']),

-- CASA MUSICAL
('musical', 'linguistica', 'O Compositor de Canções', 'descoberta', '{nome} está unindo música e palavras. Pode ter talento para composição de canções e poesia musical.', ARRAY['Compor canções com letras', 'Explorar diferentes gêneros líricos', 'Criar musicais ou óperas']),
('musical', 'logico_matematica', 'O Teórico Musical', 'descoberta', '{nome} está encontrando estruturas matemáticas na música. Pode ter talento para teoria e análise musical.', ARRAY['Estudar teoria musical avançada', 'Analisar estruturas harmônicas', 'Explorar composição serialista']),
('musical', 'espacial', 'O Designer de Som', 'descoberta', '{nome} está visualizando a música. Pode ter talento para produção musical e design sonoro.', ARRAY['Explorar produção e mixagem', 'Criar paisagens sonoras', 'Trabalhar com software de áudio visual']),
('musical', 'musical', NULL, 'confirmacao', '{nome} está consolidando sua força principal em Musical.', ARRAY['Aprofundar instrumento ou canto', 'Participar de conjuntos musicais', 'Criar composições originais']),
('musical', 'corporal_cinestesica', 'O Performer Total', 'descoberta', '{nome} está integrando música e movimento. Pode ter talento para dança, performance e expressão rítmica.', ARRAY['Explorar dança e expressão corporal', 'Criar performances integradas', 'Trabalhar ritmo no corpo']),
('musical', 'interpessoal', 'O Líder de Conjunto', 'descoberta', '{nome} está usando música para conectar pessoas. Pode ter talento para regência e liderança musical.', ARRAY['Liderar grupos musicais', 'Criar arranjos colaborativos', 'Facilitar jam sessions']),
('musical', 'intrapessoal', 'O Compositor Confessional', 'descoberta', '{nome} está usando música para expressar emoções profundas. Pode ter talento para composição introspectiva.', ARRAY['Compor músicas autobiográficas', 'Explorar gêneros confessionais', 'Usar música como diário emocional']),
('musical', 'naturalista', 'O Ecologista Sonoro', 'descoberta', '{nome} está conectando música e natureza. Pode ter talento para paisagens sonoras e música ambiental.', ARRAY['Gravar sons da natureza', 'Criar composições com elementos naturais', 'Explorar ecoacústica']),

-- CASA CORPORAL-CINESTÉSICA
('corporal_cinestesica', 'linguistica', 'O Ator Completo', 'descoberta', '{nome} está integrando corpo e palavra. Pode ter talento para teatro e expressão dramática.', ARRAY['Explorar teatro físico', 'Trabalhar expressão vocal e corporal', 'Criar performances de texto']),
('corporal_cinestesica', 'logico_matematica', 'O Estrategista Físico', 'descoberta', '{nome} está aplicando estratégia ao corpo. Pode ter talento para esportes táticos e artes marciais.', ARRAY['Estudar estratégias esportivas', 'Explorar artes marciais', 'Analisar mecânica do movimento']),
('corporal_cinestesica', 'espacial', 'O Artesão-Criador', 'descoberta', '{nome} está usando as mãos para criar formas. Pode ter talento para artesanato e escultura.', ARRAY['Trabalhar com materiais diversos', 'Explorar escultura e cerâmica', 'Criar objetos funcionais']),
('corporal_cinestesica', 'musical', 'O Dançarino-Músico', 'descoberta', '{nome} está integrando movimento e ritmo. Pode ter talento para dança e percussão corporal.', ARRAY['Explorar dança em diversos estilos', 'Trabalhar percussão corporal', 'Criar coreografias']),
('corporal_cinestesica', 'corporal_cinestesica', NULL, 'confirmacao', '{nome} está consolidando sua força principal em Corporal-Cinestésica.', ARRAY['Aprofundar modalidade esportiva', 'Explorar novas formas de movimento', 'Desenvolver técnica avançada']),
('corporal_cinestesica', 'interpessoal', 'O Curador pelo Toque', 'descoberta', '{nome} está usando o corpo para ajudar outros. Pode ter talento para trabalho corporal terapêutico.', ARRAY['Explorar massagem e trabalho corporal', 'Facilitar atividades físicas em grupo', 'Trabalhar com expressão corporal coletiva']),
('corporal_cinestesica', 'intrapessoal', 'O Mestre Interior', 'descoberta', '{nome} está usando o corpo para autoconhecimento. Pode ter talento para práticas meditativas e consciência corporal.', ARRAY['Explorar yoga e meditação em movimento', 'Trabalhar consciência corporal', 'Práticas de atenção plena']),
('corporal_cinestesica', 'naturalista', 'O Explorador-Aventureiro', 'descoberta', '{nome} está usando o corpo para explorar a natureza. Pode ter talento para atividades ao ar livre e sobrevivência.', ARRAY['Explorar trilhas e escalada', 'Trabalho de campo em ecologia', 'Atividades de sobrevivência']),

-- CASA INTERPESSOAL
('interpessoal', 'linguistica', 'O Comunicador Transformador', 'descoberta', '{nome} está usando relações para transformar através de palavras. Pode ter talento para facilitação e mediação.', ARRAY['Facilitar diálogos difíceis', 'Criar comunicação não-violenta', 'Trabalhar com resolução de conflitos']),
('interpessoal', 'logico_matematica', 'O Estrategista Social', 'descoberta', '{nome} está aplicando lógica às dinâmicas sociais. Pode ter talento para organização de grupos e sistemas sociais.', ARRAY['Criar estruturas de trabalho em equipe', 'Analisar dinâmicas de grupo', 'Desenvolver processos colaborativos']),
('interpessoal', 'espacial', 'O Arquiteto de Experiências', 'descoberta', '{nome} está criando espaços para conexão. Pode ter talento para design de experiências coletivas.', ARRAY['Criar ambientes colaborativos', 'Organizar eventos e encontros', 'Design thinking social']),
('interpessoal', 'musical', 'O Maestro de Almas', 'descoberta', '{nome} está usando música para conectar pessoas profundamente. Pode ter talento para música comunitária.', ARRAY['Facilitar cantos coletivos', 'Criar experiências musicais de grupo', 'Música como ferramenta social']),
('interpessoal', 'corporal_cinestesica', 'O Facilitador de Movimento', 'descoberta', '{nome} está usando contato para curar e conectar. Pode ter talento para trabalho corporal relacional.', ARRAY['Explorar danças de casal ou grupo', 'Facilitar jogos cooperativos', 'Trabalho corporal em duplas']),
('interpessoal', 'interpessoal', NULL, 'confirmacao', '{nome} está consolidando sua força principal em Interpessoal.', ARRAY['Liderar projetos de grupo', 'Mentorar colegas', 'Desenvolver habilidades de facilitação']),
('interpessoal', 'intrapessoal', 'O Mentor Profundo', 'descoberta', '{nome} está usando empatia para ajudar outros em seu autoconhecimento. Pode ter talento para aconselhamento.', ARRAY['Desenvolver escuta ativa', 'Facilitar processos reflexivos', 'Trabalhar como mentor de pares']),
('interpessoal', 'naturalista', 'O Guardião Comunitário', 'descoberta', '{nome} está conectando pessoas em torno da natureza. Pode ter talento para educação ambiental comunitária.', ARRAY['Organizar ações ambientais coletivas', 'Facilitar grupos de observação da natureza', 'Criar comunidades sustentáveis']),

-- CASA INTRAPESSOAL
('intrapessoal', 'linguistica', 'O Escritor da Alma', 'descoberta', '{nome} está transformando reflexão interna em palavras. Pode ter talento para escrita reflexiva e filosófica.', ARRAY['Manter prática de escrita reflexiva', 'Criar ensaios filosóficos', 'Explorar autoficção']),
('intrapessoal', 'logico_matematica', 'O Filósofo Analítico', 'descoberta', '{nome} está aplicando lógica à compreensão de si mesmo. Pode ter talento para filosofia da mente.', ARRAY['Estudar filosofia e lógica', 'Criar sistemas de autocompreensão', 'Explorar psicologia cognitiva']),
('intrapessoal', 'espacial', 'O Artista Contemplativo', 'descoberta', '{nome} está expressando mundo interno através de arte visual. Pode ter talento para arte meditativa.', ARRAY['Criar arte como prática contemplativa', 'Explorar mandala e arte zen', 'Usar arte para processar emoções']),
('intrapessoal', 'musical', 'O Compositor Confessional', 'descoberta', '{nome} está usando música para expressar profundezas internas. Pode ter talento para composição introspectiva.', ARRAY['Compor músicas pessoais', 'Explorar gêneros intimistas', 'Usar música como diário']),
('intrapessoal', 'corporal_cinestesica', 'O Praticante Consciente', 'descoberta', '{nome} está usando movimento para autoconhecimento. Pode ter talento para práticas contemplativas corporais.', ARRAY['Explorar yoga e tai chi', 'Trabalhar meditação em movimento', 'Desenvolver consciência somática']),
('intrapessoal', 'interpessoal', 'O Terapeuta Profundo', 'descoberta', '{nome} está usando autoconhecimento para entender outros. Pode ter talento para escuta profunda e empatia.', ARRAY['Desenvolver escuta empática', 'Facilitar reflexões em outros', 'Explorar psicologia humanista']),
('intrapessoal', 'intrapessoal', NULL, 'confirmacao', '{nome} está consolidando sua força principal em Intrapessoal.', ARRAY['Aprofundar práticas meditativas', 'Criar rotina de reflexão', 'Desenvolver autoconhecimento avançado']),
('intrapessoal', 'naturalista', 'O Eremita Contemplativo', 'descoberta', '{nome} está encontrando autoconhecimento na natureza. Pode ter talento para retiro e contemplação natural.', ARRAY['Práticas de silêncio na natureza', 'Jornadas de autoconhecimento ao ar livre', 'Contemplação de ecossistemas']),

-- CASA NATURALISTA
('naturalista', 'linguistica', 'O Contador de Histórias da Natureza', 'descoberta', '{nome} está narrando o mundo natural. Pode ter talento para escrita de natureza e divulgação científica.', ARRAY['Escrever sobre natureza', 'Criar guias e documentários escritos', 'Explorar jornalismo ambiental']),
('naturalista', 'logico_matematica', 'O Ecólogo Quantitativo', 'descoberta', '{nome} está aplicando matemática à natureza. Pode ter talento para pesquisa ecológica e análise de dados ambientais.', ARRAY['Coletar e analisar dados de campo', 'Estudar estatística ecológica', 'Modelagem de ecossistemas']),
('naturalista', 'espacial', 'O Ilustrador Científico', 'descoberta', '{nome} está retratando a natureza visualmente. Pode ter talento para ilustração botânica e zoológica.', ARRAY['Criar ilustrações de natureza', 'Documentação visual de espécies', 'Cartografia de ecossistemas']),
('naturalista', 'musical', 'O Ouvinte da Sinfonia Natural', 'descoberta', '{nome} está ouvindo a música da natureza. Pode ter talento para paisagens sonoras e biomimética musical.', ARRAY['Gravar e estudar sons naturais', 'Criar música inspirada na natureza', 'Explorar bioacústica']),
('naturalista', 'corporal_cinestesica', 'O Explorador de Campo', 'descoberta', '{nome} está usando o corpo para explorar a natureza. Pode ter talento para trabalho de campo e aventura.', ARRAY['Expedições e trilhas', 'Trabalho de campo em ecologia', 'Atividades de sobrevivência']),
('naturalista', 'interpessoal', 'O Educador Ambiental', 'descoberta', '{nome} está conectando pessoas à natureza. Pode ter talento para ensino e mobilização ambiental.', ARRAY['Facilitar vivências na natureza', 'Criar programas de educação ambiental', 'Mobilização comunitária']),
('naturalista', 'intrapessoal', 'O Contemplativo da Natureza', 'descoberta', '{nome} está usando natureza para reflexão interna. Pode ter talento para ecopsicologia e conexão profunda.', ARRAY['Práticas meditativas na natureza', 'Jornadas de autoconhecimento ecológico', 'Ecoterapia']),
('naturalista', 'naturalista', NULL, 'confirmacao', '{nome} está consolidando sua força principal em Naturalista.', ARRAY['Aprofundar área de interesse (botânica, zoologia, etc)', 'Projetos de pesquisa de campo', 'Liderança em ações ambientais']);

-- ═══════════════════════════════════════════════════════════════════
-- 5. TABELA: templates_texto
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE templates_texto (
  codigo TEXT PRIMARY KEY,
  categoria TEXT NOT NULL,
  template TEXT NOT NULL
);

-- RLS
ALTER TABLE templates_texto ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Templates são públicos para leitura"
  ON templates_texto FOR SELECT USING (true);

-- Seed data
INSERT INTO templates_texto (codigo, categoria, template) VALUES
-- Templates de alerta
('alerta_mesmo_sinal', 'alerta', '{nome} registrou "{sinal}" nas últimas {quantidade} observações consecutivas.'),
('alerta_sinais_diferentes', 'alerta', '{nome} apresentou sinais de atenção nas últimas {quantidade} observações: {lista_sinais}.'),
('alerta_mudanca_abrupta', 'alerta', '{nome} tinha histórico positivo, mas nas últimas {quantidade} observações mostrou sinais de atenção.'),
('alerta_sinal_repetido', 'alerta', '{nome} registrou "{sinal}" {quantidade} vezes nas últimas {semanas} semanas.'),
-- Templates de celebração
('celebrar_descoberta', 'celebrar', '{nome} brilhou {quantidade} vezes na Fase {fase} — fora da casa dele ({casa}).'),
('celebrar_confirmacao', 'celebrar', '{nome} confirmou sua força em {casa} com {quantidade} observações positivas.'),
-- Templates de contexto
('contexto_bem_na_casa', 'contexto', 'Na casa dele ({casa}): sempre foi bem, costuma {comportamento}.'),
('contexto_bem_outras', 'contexto', 'Em outras fases: participativo e engajado.'),
('contexto_mudanca', 'contexto', 'Mudança começou há {semanas} semanas.'),
('contexto_primeira_vez', 'contexto', 'É a primeira vez que {nome} apresenta este padrão.'),
('contexto_ja_aconteceu', 'contexto', '{nome} já apresentou padrão similar em {fase_anterior}.'),
-- Templates de estado
('estado_tudo_bem', 'estado', 'Nenhum alerta no momento. Última observação: "{sinal}" (há {dias} dias).'),
('estado_aguardando', 'estado', '{nome} ainda não foi observado nesta fase.'),
('estado_sem_historico', 'estado', '{nome} ainda não possui observações registradas.');

-- ═══════════════════════════════════════════════════════════════════
-- 6. FUNÇÃO: get_hipoteses_para_alerta
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_hipoteses_para_alerta(
  p_sinal_codigo TEXT,
  p_padrao_codigo TEXT DEFAULT NULL
)
RETURNS TABLE (
  ordem INTEGER,
  titulo TEXT,
  descricao TEXT
) 
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_padrao_codigo IS NOT NULL THEN
    RETURN QUERY
    SELECT hp.ordem, hp.titulo, hp.descricao
    FROM hipoteses_por_padrao hp
    WHERE hp.padrao_codigo = p_padrao_codigo
    ORDER BY hp.ordem;
  ELSE
    RETURN QUERY
    SELECT hs.ordem, hs.titulo, hs.descricao
    FROM hipoteses_por_sinal hs
    WHERE hs.sinal_codigo = p_sinal_codigo
    ORDER BY hs.ordem;
  END IF;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════
-- 7. FUNÇÃO: get_arquetipo
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_arquetipo(
  p_casa_codigo TEXT,
  p_fase_codigo TEXT
)
RETURNS TABLE (
  nome_arquetipo TEXT,
  tipo TEXT,
  significado TEXT,
  potencializar TEXT[]
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT a.nome_arquetipo, a.tipo, a.significado, a.potencializar
  FROM arquetipos a
  WHERE a.casa_codigo = p_casa_codigo
    AND a.fase_codigo = p_fase_codigo;
END;
$$;