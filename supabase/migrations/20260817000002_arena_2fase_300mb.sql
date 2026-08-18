-- ============================================================
-- Sobe o teto do bucket da 2a fase de 200 para 300 MB.
--
-- Decisao do Fundador em 17/08: teto unico de 300 MB para tudo, foto e video.
-- A duracao de 2 minutos continua no texto como orientacao, mas nao trava o
-- envio: quem gravou 2min10 nao pode ser barrado por 10 segundos.
--
-- ATENCAO: este numero sozinho nao resolve. O projeto tem um limite GLOBAL de
-- upload no Storage (painel: Storage > Settings > Upload file size limit) e o
-- Supabase aplica o MENOR dos dois. Se o global continuar em 50 MB, o bucket
-- em 300 MB nao muda nada. Foi isso que barrou o arquivo de 120 MB no teste.
-- ============================================================

update storage.buckets
   set file_size_limit = 314572800   -- 300 MB
 where id = 'arena-2fase';

select id,
       file_size_limit,
       round(file_size_limit / 1024.0 / 1024.0) as limite_mb,
       public
  from storage.buckets
 where id = 'arena-2fase';
