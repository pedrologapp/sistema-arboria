-- Add template for 2 consecutive attention signals
INSERT INTO templates_texto (codigo, categoria, template) VALUES
('alerta_2_atencao', 'alerta', '{nome} apresentou sinais de atenção nas últimas 2 observações: "{sinal_1}" e "{sinal_2}".')
ON CONFLICT (codigo) DO UPDATE SET template = EXCLUDED.template;

-- Create function to call edge function after observation is created
-- This will be called asynchronously via pg_net extension
CREATE OR REPLACE FUNCTION trigger_analisar_observacao_ia()
RETURNS TRIGGER AS $$
DECLARE
  v_url TEXT;
  v_service_role_key TEXT;
BEGIN
  -- Build the URL for the edge function
  v_url := 'https://uoxcnkqjxthivsvxqonj.supabase.co/functions/v1/analisar-observacoes';
  
  -- Get service role key from vault (if available) or skip
  -- For now, we'll use the http extension with anon key
  -- The edge function will use service role internally
  
  -- Make async HTTP call to edge function using pg_net
  -- Note: pg_net extension must be enabled in Supabase dashboard
  BEGIN
    PERFORM net.http_post(
      url := v_url,
      body := jsonb_build_object('aluno_id', NEW.aluno_id)::text,
      headers := jsonb_build_object(
        'Content-Type', 'application/json'
      )::jsonb
    );
  EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the trigger
    RAISE WARNING 'Failed to call analisar-observacoes: %', SQLERRM;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- Create trigger to call AI analysis after each new observation
DROP TRIGGER IF EXISTS trigger_observacao_analisar_ia ON observacoes;
CREATE TRIGGER trigger_observacao_analisar_ia
  AFTER INSERT ON observacoes
  FOR EACH ROW
  EXECUTE FUNCTION trigger_analisar_observacao_ia();

-- Add comment explaining the trigger
COMMENT ON TRIGGER trigger_observacao_analisar_ia ON observacoes IS 
'Triggers AI analysis of student observations after each new observation is created. 
The analysis updates the alertas_alunos table with accurate, context-aware alerts.';