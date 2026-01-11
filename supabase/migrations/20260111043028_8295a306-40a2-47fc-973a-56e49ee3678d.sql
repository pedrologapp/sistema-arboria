-- Adicionar sinais para observações personalizadas
INSERT INTO sinais (id, codigo, label_pt, valencia, pilar, peso_inteligencia, emoji, ordem) VALUES
(16, 'outro_positivo', 'Outro', 'positivo', 'emocional', 5, '➕', 100),
(17, 'outro_atencao', 'Outro', 'atencao', 'emocional', 0, '➕', 100)
ON CONFLICT (id) DO NOTHING;