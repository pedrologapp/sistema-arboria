import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://arboria.escolaamadeus.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, newPassword, recoveryCode } = await req.json();

    console.log('[admin-recovery] Attempt for email:', email);

    // Validate recovery code against stored secret
    const validCode = Deno.env.get('ADMIN_RECOVERY_CODE');
    if (!validCode || recoveryCode !== validCode) {
      console.log('[admin-recovery] Invalid recovery code');
      return new Response(
        JSON.stringify({ error: 'Código de recuperação inválido' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate inputs
    if (!email || !newPassword) {
      return new Response(
        JSON.stringify({ error: 'Email e nova senha são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Create admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Find user by email
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('[admin-recovery] Error listing users:', listError);
      throw listError;
    }

    const user = users.find(u => u.email?.toLowerCase() === normalizedEmail);
    
    if (!user) {
      console.log('[admin-recovery] User not found:', normalizedEmail);
      return new Response(
        JSON.stringify({ error: 'Usuário não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user is admin
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      console.log('[admin-recovery] User is not admin:', user.id);
      return new Response(
        JSON.stringify({ error: 'Apenas administradores podem usar esta recuperação' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Reset password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );

    if (updateError) {
      console.error('[admin-recovery] Error updating password:', updateError);
      throw updateError;
    }

    console.log('[admin-recovery] Password reset successful for:', normalizedEmail);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Senha redefinida com sucesso!',
        email: user.email
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[admin-recovery] Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
