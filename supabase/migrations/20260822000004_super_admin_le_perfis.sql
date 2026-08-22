-- ============================================================
-- O DONO DO ARBORIA NÃO ENXERGAVA NINGUÉM
--
-- Descoberto em 22/08 ao abrir a aba de casos: nenhum nome de aluno aparecia,
-- nem na lista nem dentro do caso. O único que aparecia era o do próprio
-- Fundador, e só porque vinha de outro campo.
--
-- A causa não estava na tela. As políticas de leitura de `profiles` são:
--
--   "Admins can view all profiles"        has_role(uid, 'admin')
--   "Coordenador le profiles do escopo"   has_role(uid, 'coordenador') AND ...
--   "Professores veem alunos da sua casa" has_role(uid, 'professor') AND ...
--   "Users can view their own profile"    uid = id
--   "Usuarios veem perfis da mesma inst"  institution_id = get_user_institution_id()
--
-- NENHUMA menciona super_admin. E o perfil do Fundador tem institution_id NULO,
-- então nem a regra da instituição pega. Contagem real, simulando o JWT dele:
--
--   perfis que ele enxerga: 1   (o dele)
--   alunos dos casos:       0
--
-- Passou despercebido até hoje porque as telas que ele mais usa leem por RPC com
-- dono (security definer), que não passa por RLS. A aba de casos foi a primeira a
-- ler `profiles` direto do cliente, e o buraco apareceu.
--
-- ISTO NÃO AFETA SÓ OS CASOS: qualquer tela que leia perfis direto tem o mesmo
-- problema para ele.
--
-- A correção é a menor possível: super_admin passa a ler perfis, do mesmo jeito
-- que admin já lia. Não mexe em escrita, não mexe em nenhum outro papel, e não
-- toca no institution_id dele (preenchê-lo o faria "pertencer" à escola, com
-- efeitos em outras políticas que ninguém revisou).
-- ============================================================

drop policy if exists "Super admin ve todos os perfis" on public.profiles;
create policy "Super admin ve todos os perfis"
on public.profiles for select to authenticated
using (public.has_role(auth.uid(), 'super_admin'::public.app_role));

-- --------------------------------------------------------------- conferência
do $$
declare v_antes int; v_depois int;
begin
  -- Na pele do Fundador, contando o que ele passa a enxergar.
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    '{"sub":"7471ae85-6f72-4810-bb57-c59600de47db","role":"authenticated"}', true);

  select count(*) into v_depois from public.profiles;

  perform set_config('role', 'postgres', true);
  select count(*) into v_antes from public.profiles;

  raise notice 'o Fundador agora enxerga % de % perfis', v_depois, v_antes;
  if v_depois < v_antes then
    raise exception 'a politica nao pegou: ele ainda nao ve todos';
  end if;
end $$;

select 'super_admin le perfis' as etapa, 'ok' as estado;
