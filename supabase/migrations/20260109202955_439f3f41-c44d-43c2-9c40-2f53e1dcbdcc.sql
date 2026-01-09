-- Fix user pedrolog.app@gmail.com (b5607cb6-94e2-48b7-89af-104ddaa447f7)

-- 1. Add 'user' role
INSERT INTO user_roles (user_id, role)
VALUES ('b5607cb6-94e2-48b7-89af-104ddaa447f7', 'user')
ON CONFLICT (user_id, role) DO NOTHING;

-- 2. Set institution_id from existing institution
UPDATE profiles 
SET institution_id = (SELECT id FROM institutions LIMIT 1)
WHERE id = 'b5607cb6-94e2-48b7-89af-104ddaa447f7'
AND institution_id IS NULL;

-- 3. Reset must_change_password so user can access immediately
UPDATE profiles 
SET must_change_password = false
WHERE id = 'b5607cb6-94e2-48b7-89af-104ddaa447f7';