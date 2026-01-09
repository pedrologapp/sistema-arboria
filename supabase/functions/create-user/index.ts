import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Normalize surname to create password: remove accents, apostrophes, spaces, lowercase
function normalizeSobrenome(sobrenome: string): string {
  return sobrenome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[''`]/g, '') // Remove apostrophes
    .replace(/\s+/g, '') // Remove spaces
    .toLowerCase()
    .trim();
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Get the authorization header to verify the caller is an admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify the caller is an admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !caller) {
      console.error('Auth error:', authError);
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if caller has admin role
    const { data: callerRoles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id)
      .eq('role', 'admin')
      .single();

    if (rolesError || !callerRoles) {
      console.error('Caller is not an admin:', rolesError);
      return new Response(JSON.stringify({ error: 'Apenas administradores podem criar usuários' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const { email, nome, sobrenome, institutionId, role, serie, turma, casa } = await req.json();

    console.log('Creating user with email:', email);

    // Validate required fields
    if (!email || !nome || !sobrenome) {
      return new Response(JSON.stringify({ error: 'Email, nome e sobrenome são obrigatórios' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate password from surname
    const normalizedSobrenome = normalizeSobrenome(sobrenome);
    const password = normalizedSobrenome + '123';
    const fullName = `${nome.trim()} ${sobrenome.trim()}`;

    console.log('Generated password for user (base):', normalizedSobrenome);

    // Fetch institution name if provided
    let institutionName = 'Não definida';
    if (institutionId) {
      const { data: institution } = await supabaseAdmin
        .from('institutions')
        .select('name')
        .eq('id', institutionId)
        .single();
      
      if (institution) {
        institutionName = institution.name;
      }
    }

    // Create the user using admin API
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm the email
      user_metadata: {
        nome: nome.trim(),
        sobrenome: sobrenome.trim(),
        full_name: fullName,
        institution_id: institutionId || null,
        serie: serie || null,
        turma: turma || null,
        casa: casa || null,
        must_change_password: true
      }
    });

    if (createError) {
      console.error('Error creating user:', createError);
      
      // Traduzir mensagens de erro comuns
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

    console.log('User created successfully:', newUser.user.id);

    // Update the profile with all fields
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ 
        nome: nome.trim(),
        sobrenome: sobrenome.trim(),
        full_name: fullName,
        institution_id: institutionId || null,
        institution: institutionName !== 'Não definida' ? institutionName : null,
        serie: serie || null,
        turma: turma || null,
        casa: casa || null,
        must_change_password: true
      })
      .eq('id', newUser.user.id);

    if (profileError) {
      console.error('Error updating profile:', profileError);
    }

    // Add user role if specified (default is 'user')
    const userRole = role === 'admin' ? 'admin' : 'user';
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: newUser.user.id,
        role: userRole
      });

    if (roleError) {
      console.error('Error adding user role:', roleError);
      // Don't fail the request, the user was created
    }

    console.log('User role added:', userRole);

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
