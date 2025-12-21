import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
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
    const { email, password, fullName, institutionId, role, serie, turma, casa } = await req.json();

    console.log('Creating user with email:', email);

    // Validate required fields
    if (!email || !password || !fullName) {
      return new Response(JSON.stringify({ error: 'Email, senha e nome completo são obrigatórios' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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
        full_name: fullName,
        institution_id: institutionId || null,
        serie: serie || null,
        turma: turma || null,
        casa: casa || null
      }
    });

    if (createError) {
      console.error('Error creating user:', createError);
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('User created successfully:', newUser.user.id);

    // Update the profile with all fields
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ 
        institution_id: institutionId || null,
        serie: serie || null,
        turma: turma || null,
        casa: casa || null
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

    // Send welcome email
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (resendApiKey) {
      try {
        const resend = new Resend(resendApiKey);
        
        const emailResponse = await resend.emails.send({
          from: 'Sistema <onboarding@resend.dev>',
          to: [email],
          subject: 'Sua conta foi criada - Bem-vindo(a)!',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #333; border-bottom: 2px solid #4f46e5; padding-bottom: 10px;">Olá, ${fullName}!</h1>
              
              <p style="font-size: 16px; color: #555;">Sua conta foi criada com sucesso em nosso sistema.</p>
              
              <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #333;">📧 Seus dados de acesso:</h3>
                <p style="margin: 8px 0;"><strong>Email:</strong> ${email}</p>
                <p style="margin: 8px 0;"><strong>Senha temporária:</strong> ${password}</p>
                <p style="margin: 8px 0;"><strong>Instituição:</strong> ${institutionName}</p>
                <p style="margin: 8px 0;"><strong>Série:</strong> ${serie || 'Não informada'}</p>
                <p style="margin: 8px 0;"><strong>Turma:</strong> ${turma || 'Não informada'}</p>
                <p style="margin: 8px 0;"><strong>Casa:</strong> ${casa || 'Não informada'}</p>
              </div>
              
              <h3 style="color: #333;">📋 Como acessar:</h3>
              <ol style="color: #555; line-height: 1.8;">
                <li>Acesse o sistema através do link de login</li>
                <li>Use o email e senha informados acima</li>
                <li>Após o primeiro login, recomendamos fortemente que você altere sua senha</li>
              </ol>
              
              <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
                <p style="margin: 0; color: #856404;">
                  <strong>⚠️ Importante:</strong> Por segurança, recomendamos que você altere sua senha no primeiro acesso.
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

        console.log('Welcome email sent successfully:', emailResponse);
      } catch (emailError) {
        console.error('Error sending welcome email:', emailError);
        // Don't fail the request if email fails, the user was created successfully
      }
    } else {
      console.warn('RESEND_API_KEY not configured, skipping welcome email');
    }

    return new Response(JSON.stringify({ 
      success: true, 
      user: {
        id: newUser.user.id,
        email: newUser.user.email,
        fullName,
        role: userRole
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