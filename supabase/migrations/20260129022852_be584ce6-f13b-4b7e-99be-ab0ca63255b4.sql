-- Remover trigger temporariamente
DROP TRIGGER IF EXISTS on_user_role_sync_turma ON user_roles;

-- Inserir role 'user' para todos os alunos que têm profile mas não têm role
INSERT INTO user_roles (user_id, role)
SELECT p.id, 'user'::app_role
FROM profiles p
WHERE p.institution_id = '902876e9-b263-4c01-9013-aeef7b6d24e1'
  AND NOT EXISTS (
    SELECT 1 FROM user_roles ur WHERE ur.user_id = p.id
  );

-- Recriar trigger
CREATE TRIGGER on_user_role_sync_turma
  AFTER INSERT ON user_roles
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_role_to_aluno_turma();