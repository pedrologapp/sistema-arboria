import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ImportUser {
  email: string;
  nome: string;
  sobrenome: string;
  instituicao: string;
  serie?: string;
  turma?: string;
  casa?: string;
}

interface ImportError {
  line: number;
  email: string;
  error: string;
}

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
      return new Response(JSON.stringify({ error: 'Apenas administradores podem importar usuários' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const { users } = await req.json() as { users: ImportUser[] };

    if (!users || !Array.isArray(users) || users.length === 0) {
      return new Response(JSON.stringify({ error: 'Nenhum usuário para importar' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Starting import of ${users.length} users`);

    // Fetch all institutions for name lookup
    const { data: institutions } = await supabaseAdmin
      .from('institutions')
      .select('id, name');

    const institutionMap = new Map<string, string>();
    institutions?.forEach(inst => {
      institutionMap.set(inst.name.toLowerCase().trim(), inst.id);
    });

    const errors: ImportError[] = [];
    let successCount = 0;

    // Get Resend API key for sending emails
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const resend = resendApiKey ? new Resend(resendApiKey) : null;

    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const lineNumber = i + 2; // +2 because of header row and 0-indexing

      try {
        // Validate required fields
        if (!user.email || !user.email.trim()) {
          errors.push({ line: lineNumber, email: user.email || '', error: 'Email é obrigatório' });
          continue;
        }
        if (!user.nome || !user.nome.trim()) {
          errors.push({ line: lineNumber, email: user.email, error: 'Nome é obrigatório' });
          continue;
        }
        if (!user.sobrenome || !user.sobrenome.trim()) {
          errors.push({ line: lineNumber, email: user.email, error: 'Sobrenome é obrigatório' });
          continue;
        }
        if (!user.instituicao || !user.instituicao.trim()) {
          errors.push({ line: lineNumber, email: user.email, error: 'Instituição é obrigatória' });
          continue;
        }

        // Find institution ID
        const institutionId = institutionMap.get(user.instituicao.toLowerCase().trim());
        if (!institutionId) {
          errors.push({ line: lineNumber, email: user.email, error: `Instituição "${user.instituicao}" não encontrada` });
          continue;
        }

        // Generate password from surname
        const normalizedSobrenome = normalizeSobrenome(user.sobrenome);
        const password = normalizedSobrenome + '123';
        const fullName = `${user.nome.trim()} ${user.sobrenome.trim()}`;

        // Validate password length
        if (password.length < 6) {
          errors.push({ line: lineNumber, email: user.email, error: 'Sobrenome muito curto para gerar senha válida (mínimo 3 letras)' });
          continue;
        }

        // Create the user using admin API
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: user.email.trim(),
          password,
          email_confirm: true,
          user_metadata: {
            nome: user.nome.trim(),
            sobrenome: user.sobrenome.trim(),
            full_name: fullName,
            institution_id: institutionId,
            serie: user.serie?.trim() || null,
            turma: user.turma?.trim() || null,
            casa: user.casa?.trim() || null,
            must_change_password: true
          }
        });

        if (createError) {
          console.error(`Error creating user ${user.email}:`, createError);
          errors.push({ line: lineNumber, email: user.email, error: createError.message });
          continue;
        }

        console.log(`User created: ${user.email} (${newUser.user.id})`);

        // Update the profile with all fields
        await supabaseAdmin
          .from('profiles')
          .update({ 
            nome: user.nome.trim(),
            sobrenome: user.sobrenome.trim(),
            full_name: fullName,
            institution_id: institutionId,
            institution: user.instituicao.trim(),
            serie: user.serie?.trim() || null,
            turma: user.turma?.trim() || null,
            casa: user.casa?.trim() || null,
            must_change_password: true
          })
          .eq('id', newUser.user.id);

        // Add user role
        await supabaseAdmin
          .from('user_roles')
          .insert({
            user_id: newUser.user.id,
            role: 'user'
          });

        // Send welcome email
        if (resend) {
          try {
            await resend.emails.send({
              from: 'Sistema <onboarding@resend.dev>',
              to: [user.email.trim()],
              subject: 'Sua conta foi criada - Bem-vindo(a)!',
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <h1 style="color: #333; border-bottom: 2px solid #4f46e5; padding-bottom: 10px;">Olá, ${fullName}!</h1>
                  
                  <p style="font-size: 16px; color: #555;">Sua conta foi criada com sucesso em nosso sistema.</p>
                  
                  <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #333;">📧 Seus dados de acesso:</h3>
                    <p style="margin: 8px 0;"><strong>Email:</strong> ${user.email}</p>
                    <p style="margin: 8px 0;"><strong>Senha temporária:</strong> ${password}</p>
                    <p style="margin: 8px 0;"><strong>Instituição:</strong> ${user.instituicao}</p>
                    <p style="margin: 8px 0;"><strong>Série:</strong> ${user.serie || 'Não informada'}</p>
                    <p style="margin: 8px 0;"><strong>Turma:</strong> ${user.turma || 'Não informada'}</p>
                    <p style="margin: 8px 0;"><strong>Casa:</strong> ${user.casa || 'Não informada'}</p>
                  </div>
                  
                  <h3 style="color: #333;">📋 Como acessar:</h3>
                  <ol style="color: #555; line-height: 1.8;">
                    <li>Acesse o sistema através do link de login</li>
                    <li>Use o email e senha informados acima</li>
                    <li>No primeiro acesso, você será obrigado a criar uma nova senha</li>
                  </ol>
                  
                  <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
                    <p style="margin: 0; color: #856404;">
                      <strong>⚠️ Importante:</strong> Você deverá alterar sua senha no primeiro acesso.
                    </p>
                  </div>
                  
                  <p style="color: #555;">Se você tiver alguma dúvida, entre em contato com o administrador do sistema.</p>
                  
                  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                  
                  <p style="color: #999; font-size: 12px;">
                    Este é um email automático, por favor não responda.
                  </p>
                </div>
              `,
            });
          } catch (emailError) {
            console.error(`Error sending email to ${user.email}:`, emailError);
            // Don't fail the import if email fails
          }
        }

        successCount++;
      } catch (error) {
        console.error(`Unexpected error for user ${user.email}:`, error);
        errors.push({ line: lineNumber, email: user.email, error: 'Erro inesperado' });
      }
    }

    console.log(`Import completed: ${successCount} success, ${errors.length} errors`);

    return new Response(JSON.stringify({ 
      success: true, 
      total: users.length,
      successCount,
      errors
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