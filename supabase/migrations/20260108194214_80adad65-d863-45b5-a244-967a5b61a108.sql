-- =============================================
-- TABELA: missoes
-- Missões criadas por admin ou professor
-- =============================================
CREATE TABLE public.missoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  fase_id uuid REFERENCES fases(id) ON DELETE SET NULL,
  casa_id smallint REFERENCES inteligencias(id),
  criado_por uuid NOT NULL REFERENCES profiles(id),
  titulo text NOT NULL,
  descricao text,
  instrucoes text,
  tipo text NOT NULL DEFAULT 'principal' CHECK (tipo IN ('principal', 'secundaria', 'bonus')),
  pontos_base smallint NOT NULL DEFAULT 100,
  data_criacao timestamptz DEFAULT now(),
  data_liberacao timestamptz NOT NULL,
  data_prazo timestamptz NOT NULL,
  para_todos_da_casa boolean DEFAULT true,
  serie_filtro smallint CHECK (serie_filtro IS NULL OR serie_filtro IN (6, 7, 8, 9)),
  turma_filtro text,
  status text DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'agendada', 'liberada', 'encerrada', 'cancelada')),
  permite_entrega_atrasada boolean DEFAULT false,
  requer_arquivo boolean DEFAULT false,
  requer_texto boolean DEFAULT true,
  updated_at timestamptz DEFAULT now()
);

-- Índices para missoes
CREATE INDEX idx_missoes_institution ON public.missoes(institution_id);
CREATE INDEX idx_missoes_casa ON public.missoes(casa_id);
CREATE INDEX idx_missoes_status ON public.missoes(status);
CREATE INDEX idx_missoes_liberacao ON public.missoes(data_liberacao) WHERE status = 'agendada';

-- Trigger updated_at
CREATE TRIGGER update_missoes_updated_at
  BEFORE UPDATE ON public.missoes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS para missoes
ALTER TABLE public.missoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem missões da instituição"
ON public.missoes FOR SELECT
USING (institution_id = get_user_institution_id());

CREATE POLICY "Admin ou Professor podem criar missões"
ON public.missoes FOR INSERT
WITH CHECK (
  institution_id = get_user_institution_id() 
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'professor'))
);

CREATE POLICY "Criador ou Admin podem atualizar missões"
ON public.missoes FOR UPDATE
USING (
  institution_id = get_user_institution_id() 
  AND (criado_por = auth.uid() OR has_role(auth.uid(), 'admin'))
);

CREATE POLICY "Criador ou Admin podem deletar missões"
ON public.missoes FOR DELETE
USING (
  institution_id = get_user_institution_id() 
  AND (criado_por = auth.uid() OR has_role(auth.uid(), 'admin'))
);

-- =============================================
-- TABELA: missao_destinatarios
-- Quando missão é para alunos específicos
-- =============================================
CREATE TABLE public.missao_destinatarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  missao_id uuid NOT NULL REFERENCES missoes(id) ON DELETE CASCADE,
  aluno_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(missao_id, aluno_id)
);

-- RLS para missao_destinatarios
ALTER TABLE public.missao_destinatarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem destinatários da instituição"
ON public.missao_destinatarios FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM missoes m 
    WHERE m.id = missao_id 
    AND m.institution_id = get_user_institution_id()
  )
);

CREATE POLICY "Admin ou Professor podem gerenciar destinatários"
ON public.missao_destinatarios FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM missoes m 
    WHERE m.id = missao_id 
    AND m.institution_id = get_user_institution_id()
  )
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'professor'))
);

-- =============================================
-- TABELA: entregas
-- Respostas dos alunos às missões
-- =============================================
CREATE TABLE public.entregas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  missao_id uuid NOT NULL REFERENCES missoes(id) ON DELETE CASCADE,
  aluno_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  texto_resposta text,
  data_entrega timestamptz DEFAULT now(),
  entregue_no_prazo boolean,
  status text DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_analise', 'aprovada', 'refazer', 'atrasada_pendente')),
  avaliado_por uuid REFERENCES profiles(id),
  data_avaliacao timestamptz,
  feedback_professor text,
  nota smallint CHECK (nota IS NULL OR nota BETWEEN 0 AND 10),
  pontos_concedidos smallint,
  numero_tentativa smallint DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(missao_id, aluno_id, numero_tentativa)
);

-- Índices para entregas
CREATE INDEX idx_entregas_missao ON public.entregas(missao_id);
CREATE INDEX idx_entregas_aluno ON public.entregas(aluno_id);
CREATE INDEX idx_entregas_status ON public.entregas(status);
CREATE INDEX idx_entregas_avaliacao ON public.entregas(status) WHERE status = 'pendente';

-- Trigger updated_at
CREATE TRIGGER update_entregas_updated_at
  BEFORE UPDATE ON public.entregas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS para entregas
ALTER TABLE public.entregas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Aluno vê própria entrega"
ON public.entregas FOR SELECT
USING (aluno_id = auth.uid());

CREATE POLICY "Professor vê entregas da sua casa"
ON public.entregas FOR SELECT
USING (
  has_role(auth.uid(), 'professor')
  AND EXISTS (
    SELECT 1 FROM profiles p
    JOIN professor_casa pc ON pc.professor_id = auth.uid() AND pc.casa_id = p.casa_id AND pc.ativo = true
    WHERE p.id = aluno_id
  )
);

CREATE POLICY "Admin vê todas entregas da instituição"
ON public.entregas FOR SELECT
USING (
  has_role(auth.uid(), 'admin')
  AND EXISTS (
    SELECT 1 FROM missoes m 
    WHERE m.id = missao_id 
    AND m.institution_id = get_user_institution_id()
  )
);

CREATE POLICY "Aluno pode criar própria entrega"
ON public.entregas FOR INSERT
WITH CHECK (aluno_id = auth.uid());

CREATE POLICY "Aluno pode atualizar própria entrega pendente"
ON public.entregas FOR UPDATE
USING (
  aluno_id = auth.uid() 
  AND status IN ('pendente', 'refazer')
);

CREATE POLICY "Professor pode avaliar entregas da sua casa"
ON public.entregas FOR UPDATE
USING (
  has_role(auth.uid(), 'professor')
  AND EXISTS (
    SELECT 1 FROM profiles p
    JOIN professor_casa pc ON pc.professor_id = auth.uid() AND pc.casa_id = p.casa_id AND pc.ativo = true
    WHERE p.id = aluno_id
  )
);

CREATE POLICY "Admin pode atualizar entregas da instituição"
ON public.entregas FOR UPDATE
USING (
  has_role(auth.uid(), 'admin')
  AND EXISTS (
    SELECT 1 FROM missoes m 
    WHERE m.id = missao_id 
    AND m.institution_id = get_user_institution_id()
  )
);

-- =============================================
-- TABELA: entrega_arquivos
-- Metadados dos arquivos anexados
-- =============================================
CREATE TABLE public.entrega_arquivos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entrega_id uuid NOT NULL REFERENCES entregas(id) ON DELETE CASCADE,
  nome_original text NOT NULL,
  nome_storage text NOT NULL,
  tipo_arquivo text,
  tamanho_bytes bigint,
  url text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Índice para entrega_arquivos
CREATE INDEX idx_arquivos_entrega ON public.entrega_arquivos(entrega_id);

-- RLS para entrega_arquivos
ALTER TABLE public.entrega_arquivos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário vê arquivos da própria entrega"
ON public.entrega_arquivos FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM entregas e 
    WHERE e.id = entrega_id 
    AND e.aluno_id = auth.uid()
  )
);

CREATE POLICY "Professor vê arquivos de entregas da sua casa"
ON public.entrega_arquivos FOR SELECT
USING (
  has_role(auth.uid(), 'professor')
  AND EXISTS (
    SELECT 1 FROM entregas e
    JOIN profiles p ON p.id = e.aluno_id
    JOIN professor_casa pc ON pc.professor_id = auth.uid() AND pc.casa_id = p.casa_id AND pc.ativo = true
    WHERE e.id = entrega_id
  )
);

CREATE POLICY "Admin vê todos arquivos da instituição"
ON public.entrega_arquivos FOR SELECT
USING (
  has_role(auth.uid(), 'admin')
  AND EXISTS (
    SELECT 1 FROM entregas e
    JOIN missoes m ON m.id = e.missao_id
    WHERE e.id = entrega_id
    AND m.institution_id = get_user_institution_id()
  )
);

CREATE POLICY "Aluno pode inserir arquivos na própria entrega"
ON public.entrega_arquivos FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM entregas e 
    WHERE e.id = entrega_id 
    AND e.aluno_id = auth.uid()
  )
);

CREATE POLICY "Aluno pode deletar próprios arquivos"
ON public.entrega_arquivos FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM entregas e 
    WHERE e.id = entrega_id 
    AND e.aluno_id = auth.uid()
  )
);

CREATE POLICY "Admin pode deletar arquivos da instituição"
ON public.entrega_arquivos FOR DELETE
USING (
  has_role(auth.uid(), 'admin')
  AND EXISTS (
    SELECT 1 FROM entregas e
    JOIN missoes m ON m.id = e.missao_id
    WHERE e.id = entrega_id
    AND m.institution_id = get_user_institution_id()
  )
);

-- =============================================
-- STORAGE: Bucket entregas
-- =============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'entregas', 
  'entregas', 
  false, 
  10485760,
  ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
);

-- Políticas de storage
CREATE POLICY "Alunos podem fazer upload em sua pasta"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'entregas' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Alunos podem ver próprios arquivos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'entregas' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Professores podem ver arquivos de alunos da sua casa"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'entregas'
  AND has_role(auth.uid(), 'professor')
  AND EXISTS (
    SELECT 1 FROM profiles p
    JOIN professor_casa pc ON pc.professor_id = auth.uid() AND pc.casa_id = p.casa_id AND pc.ativo = true
    WHERE p.id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Admins podem ver todos arquivos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'entregas'
  AND has_role(auth.uid(), 'admin')
);

CREATE POLICY "Alunos podem deletar próprios arquivos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'entregas' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins podem deletar qualquer arquivo"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'entregas'
  AND has_role(auth.uid(), 'admin')
);