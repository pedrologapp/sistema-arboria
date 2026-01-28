import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
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
        JSON.stringify({ error: "Apenas administradores podem excluir usuários em massa" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the request body
    const { institutionId, deleteAllStudents } = await req.json();

    if (!institutionId) {
      return new Response(
        JSON.stringify({ error: "ID da instituição é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!deleteAllStudents) {
      return new Response(
        JSON.stringify({ error: "Confirmação de exclusão em massa é obrigatória" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin client for privileged operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get all students (users with role 'user') from the institution
    const { data: userRoles, error: rolesError } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "user");

    if (rolesError) {
      console.error("Error fetching user roles:", rolesError);
      return new Response(
        JSON.stringify({ error: "Erro ao buscar alunos" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const studentUserIds = userRoles?.map(r => r.user_id) || [];

    if (studentUserIds.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "Nenhum aluno para excluir", deleted: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get students that belong to this institution
    const { data: studentsInInstitution, error: studentsError } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("institution_id", institutionId)
      .in("id", studentUserIds);

    if (studentsError) {
      console.error("Error fetching students:", studentsError);
      return new Response(
        JSON.stringify({ error: "Erro ao buscar alunos da instituição" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const studentIds = studentsInInstitution?.map(s => s.id) || [];

    if (studentIds.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "Nenhum aluno para excluir nesta instituição", deleted: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Deleting ${studentIds.length} students from institution ${institutionId}`);

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Delete each student
    for (const userId of studentIds) {
      try {
        // Delete dependent records (same logic as delete-user)
        await supabaseAdmin.from("score_ajustes_log").delete().eq("aluno_id", userId);
        await supabaseAdmin.from("inteligencia_evidencias").delete().eq("aluno_id", userId);
        await supabaseAdmin.from("inteligencia_historico").delete().eq("aluno_id", userId);
        await supabaseAdmin.from("inteligencia_scores").delete().eq("aluno_id", userId);
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
        await supabaseAdmin.from("mensagens_canal").delete().eq("autor_id", userId);
        await supabaseAdmin.from("mensagens_privadas").delete().eq("autor_id", userId);
        await supabaseAdmin.from("conversa_participantes").delete().eq("usuario_id", userId);
        await supabaseAdmin.from("canal_leituras").delete().eq("usuario_id", userId);

        // Delete user from Auth
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

        if (deleteError) {
          console.error(`Error deleting user ${userId}:`, deleteError);
          errorCount++;
          errors.push(`${userId}: ${deleteError.message}`);
        } else {
          successCount++;
        }
      } catch (err) {
        console.error(`Error processing user ${userId}:`, err);
        errorCount++;
        errors.push(`${userId}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    console.log(`Bulk delete completed: ${successCount} success, ${errorCount} errors`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `${successCount} alunos excluídos com sucesso`,
        deleted: successCount,
        errors: errorCount,
        errorDetails: errors.length > 0 ? errors.slice(0, 10) : undefined
      }),
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
