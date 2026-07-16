-- =============================================
-- Tabela entregas_analise_ia
-- Guarda a análise da IA do Arboria por entrega (uso interno: n8n / IA).
-- entrega_id é PRIMARY KEY pra permitir upsert via Prefer: resolution=merge-duplicates
-- (o nó "Salvar análise missão" do n8n grava aqui).
-- Acesso só por service_role (RLS on, sem policy pra anon/authenticated).
-- Idempotente.
-- =============================================

CREATE TABLE IF NOT EXISTS public.entregas_analise_ia (
  entrega_id     uuid PRIMARY KEY REFERENCES public.entregas(id) ON DELETE CASCADE,
  analise        jsonb       NOT NULL,
  processado_em  timestamptz NOT NULL DEFAULT now(),
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.entregas_analise_ia ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.entregas_analise_ia FROM anon, authenticated;

COMMENT ON TABLE public.entregas_analise_ia IS
  'Análise estruturada da IA do Arboria por entrega (nota, nota_justificativa, resumo, como_pensou, inteligencias_codigos, pontos_fortes, a_desenvolver, observacao_sugerida). Uso interno (n8n/IA). entrega_id = PK pra upsert.';
