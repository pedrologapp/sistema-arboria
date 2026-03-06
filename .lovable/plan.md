

## Fix: Alunos do Infantil/F1 não aparecem após criação

### Causa raiz

O trigger `sync_user_role_to_aluno_turma` é disparado quando um registro é inserido na tabela `user_roles`. Dentro dele, a função `ensure_turma_exists` é chamada com 4 argumentos. Porém, existem **duas versões** dessa função no banco:

```text
ensure_turma_exists(uuid, text, text, smallint)          -- versão antiga
ensure_turma_exists(uuid, text, text, smallint, text)    -- versão nova (com segmento)
```

Quando chamada com 4 argumentos, o Postgres não consegue decidir qual usar (erro `42725: function is not unique`). Isso faz o `INSERT` na `user_roles` falhar silenciosamente — o aluno é criado no `profiles` mas **sem role**, e como a `PessoasPage` filtra por `user_roles.role = 'user'`, o aluno não aparece.

### Solução

Uma migração SQL com 3 passos:

1. **Remover a versão antiga** (4 args) da função `ensure_turma_exists`, mantendo apenas a versão com 5 argumentos (que inclui `segmento`)
2. **Atualizar o trigger** `sync_user_role_to_aluno_turma` para passar o `segmento` do perfil como 5º argumento
3. **Reparar os dados** da aluna Ruamma — inserir o role `user` e garantir o vínculo `aluno_turma`

### Detalhes técnicos

**Migração SQL:**
```sql
-- 1. Dropar a versão ambígua (4 args)
DROP FUNCTION IF EXISTS public.ensure_turma_exists(uuid, text, text, smallint);

-- 2. Atualizar o trigger para passar segmento
CREATE OR REPLACE FUNCTION public.sync_user_role_to_aluno_turma()
RETURNS trigger AS $$
DECLARE
  v_profile RECORD;
  v_turma_id uuid;
  v_ano_letivo smallint;
BEGIN
  IF NEW.role != 'user' THEN RETURN NEW; END IF;
  
  SELECT id, serie, turma, institution_id, segmento
  INTO v_profile FROM public.profiles WHERE id = NEW.user_id;
  
  IF v_profile.serie IS NULL OR v_profile.turma IS NULL OR v_profile.institution_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  SELECT COALESCE(ano_letivo_atual, EXTRACT(YEAR FROM CURRENT_DATE)::smallint)
  INTO v_ano_letivo FROM public.institution_settings
  WHERE institution_id = v_profile.institution_id;
  
  IF v_ano_letivo IS NULL THEN
    v_ano_letivo := EXTRACT(YEAR FROM CURRENT_DATE)::smallint;
  END IF;
  
  v_turma_id := public.ensure_turma_exists(
    v_profile.institution_id, v_profile.serie, v_profile.turma, 
    v_ano_letivo, COALESCE(v_profile.segmento, 'fundamental2')
  );
  
  INSERT INTO public.aluno_turma (aluno_id, turma_id, ano_letivo, ativo)
  VALUES (v_profile.id, v_turma_id, v_ano_letivo, true)
  ON CONFLICT (aluno_id, turma_id, ano_letivo) DO UPDATE SET ativo = true;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Reparar dados da Ruamma (e qualquer outro aluno sem role)
INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'user'::app_role
FROM public.profiles p
WHERE p.institution_id = '902876e9-b263-4c01-9013-aeef7b6d24e1'
  AND p.segmento IN ('infantil', 'fundamental1')
  AND NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id)
  AND p.nome IS NOT NULL;
```

### Arquivos/ações
- 1 migração SQL (3 comandos acima)
- Nenhum arquivo de código precisa ser alterado

