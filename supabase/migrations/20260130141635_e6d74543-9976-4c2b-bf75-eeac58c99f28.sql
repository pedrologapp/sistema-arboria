-- Criar tabela de logs administrativos para auditoria
CREATE TABLE public.admin_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  acao text NOT NULL,
  alvo_id uuid,
  alvo_tipo text,
  detalhes jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Índices para consultas eficientes
CREATE INDEX idx_admin_logs_institution ON public.admin_logs(institution_id);
CREATE INDEX idx_admin_logs_admin ON public.admin_logs(admin_id);
CREATE INDEX idx_admin_logs_created ON public.admin_logs(created_at DESC);
CREATE INDEX idx_admin_logs_acao ON public.admin_logs(acao);

-- Habilitar RLS
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

-- Políticas: Apenas admins podem inserir e ver logs
CREATE POLICY "Admin pode inserir logs" ON public.admin_logs
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin pode ver logs da instituição" ON public.admin_logs
  FOR SELECT USING (
    institution_id = public.get_user_institution_id() 
    AND public.has_role(auth.uid(), 'admin')
  );