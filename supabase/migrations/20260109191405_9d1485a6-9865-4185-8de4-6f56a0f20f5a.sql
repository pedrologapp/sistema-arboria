-- Atualizar o brasao_url da inteligência Naturalista para o nome correto do arquivo
UPDATE inteligencias 
SET brasao_url = '/brasoes/logonaturalista.png' 
WHERE codigo = 'naturalista';