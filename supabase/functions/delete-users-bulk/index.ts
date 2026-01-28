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

    // Get all profiles from this institution first
    const { data: institutionProfiles, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("institution_id", institutionId);

    if (profilesError) {
      console.error("Error fetching institution profiles:", profilesError);
      return new Response(
        JSON.stringify({ error: "Erro ao buscar perfis da instituição" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const profileIds = institutionProfiles?.map(p => p.id) || [];

    if (profileIds.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "Nenhum perfil na instituição", deleted: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Now get which of these profiles are students (role = 'user')
    // Process in batches to avoid URL length issues
    const batchSize = 50;
    const studentIds: string[] = [];

    for (let i = 0; i < profileIds.length; i += batchSize) {
      const batch = profileIds.slice(i, i + batchSize);
      const { data: rolesBatch, error: rolesError } = await supabaseAdmin
        .from("user_roles")
        .select("user_id")
        .eq("role", "user")
        .in("user_id", batch);

      if (rolesError) {
        console.error("Error fetching roles batch:", rolesError);
        continue;
      }

      studentIds.push(...(rolesBatch?.map(r => r.user_id) || []));
    }

    if (studentIds.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "Nenhum aluno para excluir nesta instituição", deleted: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Deleting ${studentIds.length} students from institution ${institutionId}`);

    // ============================================
    // BATCH DELETE: Delete all dependent records at once
    // ============================================
    
    console.log("Starting batch deletion of dependent records...");
    
    // Delete all dependent records in batch (one query per table)
    const deletionPromises = [
      supabaseAdmin.from("score_ajustes_log").delete().in("aluno_id", studentIds),
      supabaseAdmin.from("inteligencia_evidencias").delete().in("aluno_id", studentIds),
      supabaseAdmin.from("inteligencia_historico").delete().in("aluno_id", studentIds),
      supabaseAdmin.from("inteligencia_scores").delete().in("aluno_id", studentIds),
      supabaseAdmin.from("entregas").delete().in("aluno_id", studentIds),
      supabaseAdmin.from("observacoes").delete().in("aluno_id", studentIds),
      supabaseAdmin.from("alertas_alunos").delete().in("aluno_id", studentIds),
      supabaseAdmin.from("acoes_professor").delete().in("aluno_id", studentIds),
      supabaseAdmin.from("acoes_celebracao").delete().in("aluno_id", studentIds),
      supabaseAdmin.from("aluno_turma").delete().in("aluno_id", studentIds),
      supabaseAdmin.from("cargos_casa").delete().in("aluno_id", studentIds),
      supabaseAdmin.from("missao_destinatarios").delete().in("aluno_id", studentIds),
      supabaseAdmin.from("bonus_solicitacoes").delete().in("aluno_id", studentIds),
      supabaseAdmin.from("pontos_gerais").delete().in("aluno_id", studentIds),
      supabaseAdmin.from("mensagens_canal").delete().in("autor_id", studentIds),
      supabaseAdmin.from("mensagens_privadas").delete().in("autor_id", studentIds),
      supabaseAdmin.from("conversa_participantes").delete().in("usuario_id", studentIds),
      supabaseAdmin.from("canal_leituras").delete().in("usuario_id", studentIds),
    ];

    // Execute all batch deletes in parallel
    await Promise.all(deletionPromises);
    
    console.log("Dependent records deleted. Starting auth user deletion...");

    // ============================================
    // DELETE AUTH USERS IN PARALLEL BATCHES
    // ============================================
    
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];
    const AUTH_BATCH_SIZE = 10;

    for (let i = 0; i < studentIds.length; i += AUTH_BATCH_SIZE) {
      const batch = studentIds.slice(i, i + AUTH_BATCH_SIZE);
      
      const results = await Promise.allSettled(
        batch.map(userId => supabaseAdmin.auth.admin.deleteUser(userId))
      );

      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && !result.value.error) {
          successCount++;
        } else {
          errorCount++;
          const userId = batch[index];
          const errorMsg = result.status === 'rejected' 
            ? result.reason?.message 
            : result.value?.error?.message;
          errors.push(`${userId}: ${errorMsg || 'Unknown error'}`);
        }
      });

      // Log progress every 50 users
      if ((i + AUTH_BATCH_SIZE) % 50 === 0 || i + AUTH_BATCH_SIZE >= studentIds.length) {
        console.log(`Progress: ${Math.min(i + AUTH_BATCH_SIZE, studentIds.length)}/${studentIds.length} users processed`);
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
