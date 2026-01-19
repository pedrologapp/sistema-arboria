import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Get the authorization header from the request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create a client with the user's JWT to verify they are admin
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get the current user
    const { data: { user: currentUser }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !currentUser) {
      console.error("Error getting user:", userError);
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if the user is an admin
    const { data: roleData, error: roleError } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", currentUser.id)
      .eq("role", "admin")
      .single();

    if (roleError || !roleData) {
      console.error("User is not an admin:", roleError);
      return new Response(
        JSON.stringify({ error: "Apenas administradores podem excluir usuários" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the request body
    const { userId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "ID do usuário é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prevent admin from deleting themselves
    if (userId === currentUser.id) {
      return new Response(
        JSON.stringify({ error: "Você não pode excluir sua própria conta" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Deleting user:", userId);

    // Create admin client for privileged operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Delete dependent records that don't have CASCADE
    // score_ajustes_log references profiles.id without CASCADE
    const { error: scoreLogError } = await supabaseAdmin
      .from("score_ajustes_log")
      .delete()
      .eq("aluno_id", userId);
    
    if (scoreLogError) {
      console.log("Note: Error deleting score_ajustes_log (may not exist):", scoreLogError.message);
    }

    // Also clean up inteligencia_scores and inteligencia_historico just in case
    await supabaseAdmin.from("inteligencia_evidencias").delete().eq("aluno_id", userId);
    await supabaseAdmin.from("inteligencia_historico").delete().eq("aluno_id", userId);
    await supabaseAdmin.from("inteligencia_scores").delete().eq("aluno_id", userId);
    
    // Clean up other potential dependencies
    await supabaseAdmin.from("entregas").delete().eq("aluno_id", userId);
    await supabaseAdmin.from("observacoes").delete().eq("aluno_id", userId);
    await supabaseAdmin.from("alertas_alunos").delete().eq("aluno_id", userId);
    await supabaseAdmin.from("acoes_professor").delete().eq("aluno_id", userId);
    await supabaseAdmin.from("acoes_celebracao").delete().eq("aluno_id", userId);
    await supabaseAdmin.from("aluno_turma").delete().eq("aluno_id", userId);
    await supabaseAdmin.from("cargos_casa").delete().eq("aluno_id", userId);
    await supabaseAdmin.from("missao_destinatarios").delete().eq("aluno_id", userId);
    await supabaseAdmin.from("bonus_solicitacoes").delete().eq("aluno_id", userId);
    await supabaseAdmin.from("pontos_gerais").delete().eq("aluno_id", userId);
    
    // For professor: clean up professor_casa
    await supabaseAdmin.from("professor_casa").delete().eq("professor_id", userId);
    
    // Clean up chat related
    await supabaseAdmin.from("mensagens_canal").delete().eq("autor_id", userId);
    await supabaseAdmin.from("mensagens_privadas").delete().eq("autor_id", userId);
    await supabaseAdmin.from("conversa_participantes").delete().eq("usuario_id", userId);
    await supabaseAdmin.from("canal_leituras").delete().eq("usuario_id", userId);

    console.log("Cleaned up dependent records");

    // Delete user from Auth (CASCADE will handle profiles, user_roles, etc.)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error("Error deleting user:", deleteError);
      return new Response(
        JSON.stringify({ error: `Erro ao excluir usuário: ${deleteError.message}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("User deleted successfully");
    return new Response(
      JSON.stringify({ success: true, message: "Usuário excluído com sucesso" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
