-- Habilitar RLS na tabela config_alertas
ALTER TABLE config_alertas ENABLE ROW LEVEL SECURITY;

-- Política de leitura pública (é uma tabela de configuração global)
CREATE POLICY "Config alertas são públicos para leitura" ON config_alertas
FOR SELECT USING (true);

-- Apenas admins podem modificar (via service_role)
CREATE POLICY "Apenas service_role pode modificar config" ON config_alertas
FOR ALL USING (false) WITH CHECK (false);