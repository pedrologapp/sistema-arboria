import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://arboria.escolaamadeus.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Normalize surname to create password: remove accents, apostrophes, spaces, lowercase
function normalizeSobrenome(sobrenome: string): string {
  return sobrenome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[''`]/g, '')
    .replace(/\s+/g, '')
    .toLowerCase()
    .trim();
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: callerRoles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id)
      .eq('role', 'admin')
      .single();

    if (!callerRoles) {
      return new Response(JSON.stringify({ error: 'Apenas administradores podem criar usuários' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { email, nome, sobrenome, institutionId, institution_id, role, serie, turma, casa, turma_id, segmento, casa_id } = await req.json();
    const resolvedInstitutionId = institutionId || institution_id || null;

    if (!email || !nome || !sobrenome) {
      return new Response(JSON.stringify({ error: 'Email, nome e sobrenome são obrigatórios' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const normalizedSobrenome = normalizeSobrenome(sobrenome);
    const password = normalizedSobrenome + '123';
    const fullName = `${nome.trim()} ${sobrenome.trim()}`;

    // Resolve casa_id from either field
    const resolvedCasaId = casa_id || casa || null;

    // Fetch institution name
    let institutionName = 'Não definida';
    if (resolvedInstitutionId) {
      const { data: institution } = await supabaseAdmin
        .from('institutions')
        .select('name')
        .eq('id', resolvedInstitutionId)
        .single();
      if (institution) institutionName = institution.name;
    }

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        nome: nome.trim(),
        sobrenome: sobrenome.trim(),
        full_name: fullName,
        institution_id: resolvedInstitutionId,
        serie: serie || null,
        turma: turma || null,
        casa: resolvedCasaId,
        segmento: segmento || null,
        must_change_password: true
      }
    });

    if (createError) {
      let errorMessage = createError.message;
      if (createError.message?.includes('email address has already been registered') || 
          (createError as any).code === 'email_exists') {
        errorMessage = 'Este email já está cadastrado no sistema. Use outro email ou edite o usuário existente.';
      }
      return new Response(JSON.stringify({ error: errorMessage }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('User created:', newUser.user.id);

    // Update profile
    const profileUpdate: Record<string, unknown> = {
      nome: nome.trim(),
      sobrenome: sobrenome.trim(),
      full_name: fullName,
      institution_id: resolvedInstitutionId,
      institution: institutionName !== 'Não definida' ? institutionName : null,
      serie: serie || null,
      turma: turma || null,
      casa_id: resolvedCasaId ? parseInt(String(resolvedCasaId)) : null,
      segmento: segmento || null,
      must_change_password: true
    };

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update(profileUpdate)
      .eq('id', newUser.user.id);

    if (profileError) console.error('Profile error:', profileError);

    // Add user role
    const userRole = role === 'admin' ? 'admin' : 'user';
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({ user_id: newUser.user.id, role: userRole });

    if (roleError) console.error('Role error:', roleError);

    // If turma_id provided, create aluno_turma link
    if (turma_id) {
      const currentYear = new Date().getFullYear();
      const { error: turmaError } = await supabaseAdmin
        .from('aluno_turma')
        .insert({
          aluno_id: newUser.user.id,
          turma_id: turma_id,
          ano_letivo: currentYear,
          ativo: true
        });

      if (turmaError) {
        console.error('aluno_turma error:', turmaError);
      } else {
        console.log('aluno_turma link created for turma_id:', turma_id);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      user: {
        id: newUser.user.id,
        email: newUser.user.email,
        nome: nome.trim(),
        sobrenome: sobrenome.trim(),
        fullName,
        role: userRole,
        generatedPassword: password
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ error: 'Erro interno do servidor' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
