-- Adicionar coluna brasao_url na tabela inteligencias
ALTER TABLE public.inteligencias ADD COLUMN IF NOT EXISTS brasao_url text;

-- Criar bucket público para brasões
INSERT INTO storage.buckets (id, name, public)
VALUES ('brasoes', 'brasoes', true)
ON CONFLICT (id) DO NOTHING;

-- Política: Qualquer um pode visualizar brasões
CREATE POLICY "Brasoes são públicos" ON storage.objects
  FOR SELECT USING (bucket_id = 'brasoes');

-- Atualizar URLs dos brasões (usando /brasoes/ local por enquanto)
UPDATE public.inteligencias SET brasao_url = '/brasoes/linguistica.png' WHERE codigo = 'linguistica';
UPDATE public.inteligencias SET brasao_url = '/brasoes/logico_matematica.png' WHERE codigo = 'logico_matematica';
UPDATE public.inteligencias SET brasao_url = '/brasoes/espacial.png' WHERE codigo = 'espacial';
UPDATE public.inteligencias SET brasao_url = '/brasoes/musical.png' WHERE codigo = 'musical';
UPDATE public.inteligencias SET brasao_url = '/brasoes/corporal_cinestesica.png' WHERE codigo = 'corporal_cinestesica';
UPDATE public.inteligencias SET brasao_url = '/brasoes/naturalista.png' WHERE codigo = 'naturalista';
UPDATE public.inteligencias SET brasao_url = '/brasoes/interpessoal.png' WHERE codigo = 'interpessoal';
UPDATE public.inteligencias SET brasao_url = '/brasoes/intrapessoal.png' WHERE codigo = 'intrapessoal';