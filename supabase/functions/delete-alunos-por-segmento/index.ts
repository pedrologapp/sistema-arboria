import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-confirm-delete",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // 1. Validar Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Validar header de confirmação X-Confirm-Delete
    const confirmHeader = req.headers.get("X-Confirm-Delete");
    if (confirmHeader !== "true") {
      return new Response(
        JSON.stringify({ error: "Header X-Confirm-Delete: true é obrigatório para confirmar a exclusão" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Criar cliente com JWT do usuário para verificar se é admin
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: currentUser }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !currentUser) {
      console.error("Error getting user:", userError);
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Verificar se o usuário é admin
    const { data: roleData, error: roleError } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", currentUser.id)
      .eq("role", "admin")
      .single();

    if (roleError || !roleData) {
      console.error("User is not an admin:", roleError);
      return new Response(
        JSON.stringify({ error: "Apenas administradores podem excluir alunos por segmento" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Validar body
    const { institutionId, segmento } = await req.json();

    if (!institutionId) {
      return new Response(
        JSON.stringify({ error: "institutionId é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!segmento) {
      return new Response(
        JSON.stringify({ error: "segmento é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 6. Validar segmento contra lista permitida
    const segmentosPermitidos = ["infantil", "fundamental1", "fundamental2"];
    if (!segmentosPermitidos.includes(segmento)) {
      return new Response(
        JSON.stringify({ 
          error: `Segmento inválido. Valores permitidos: ${segmentosPermitidos.join(", ")}` 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Criar cliente admin para operações privilegiadas
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // 7. Buscar todos os alunos do segmento (apenas role = 'user')
    const { data: segmentProfiles, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("institution_id", institutionId)
      .eq("segmento", segmento);

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      return new Response(
        JSON.stringify({ error: "Erro ao buscar perfis do segmento" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const profileIds = segmentProfiles?.map(p => p.id) || [];

    if (profileIds.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          segmento,
          total_deletados: 0,
          message: `Nenhum aluno encontrado no segmento ${segmento}` 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 8. Excluir admins e professores (que NÃO devem ser deletados)
    // Esta lógica captura tanto profiles com role='user' quanto profiles "órfãos" sem role
    const batchSize = 50;
    const protectedIds = new Set<string>();

    for (let i = 0; i < profileIds.length; i += batchSize) {
      const batch = profileIds.slice(i, i + batchSize);
      const { data: protectedRoles, error: rolesError } = await supabaseAdmin
        .from("user_roles")
        .select("user_id")
        .in("role", ["admin", "professor"])
        .in("user_id", batch);

      if (rolesError) {
        console.error("Error fetching protected roles batch:", rolesError);
        continue;
      }

      protectedRoles?.forEach(r => protectedIds.add(r.user_id));
    }

    // Todos os profiles do segmento EXCETO admins/professores
    const studentIds = profileIds.filter(id => !protectedIds.has(id));

    if (studentIds.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          segmento,
          total_deletados: 0,
          message: `Nenhum aluno encontrado no segmento ${segmento} (${protectedIds.size} usuários protegidos ignorados)` 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${studentIds.length} students to delete (${protectedIds.size} protected users excluded)`);

    console.log(`Deleting ${studentIds.length} students from segmento ${segmento} in institution ${institutionId}`);

    // ============================================
    // 9. DELETAR DEPENDÊNCIAS EM LOTE
    // ============================================
    
    console.log("Starting batch deletion of dependent records...");
    
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

    await Promise.all(deletionPromises);
    
    console.log("Dependent records deleted. Starting auth user deletion...");

    // ============================================
    // 10. DELETAR AUTH USERS EM PARALELO (batches de 10)
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

    console.log(`Delete completed for segmento ${segmento}: ${successCount} success, ${errorCount} errors`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        segmento,
        total_deletados: successCount,
        message: `${successCount} alunos do segmento ${segmento} foram excluídos com sucesso`,
        errors: errorCount > 0 ? errorCount : undefined,
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
