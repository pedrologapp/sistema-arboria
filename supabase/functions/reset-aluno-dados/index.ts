import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ResetRequest {
  alunoId: string;
  confirmacaoNome: string;
}

interface ResetResumo {
  acoes_professor: number;
  acoes_celebracao: number;
  alertas: number;
  evidencias: number;
  observacoes: number;
  historico: number;
  scores_resetados: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Create admin client with service role
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Não autenticado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Token inválido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify admin role
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (roleError || !roleData) {
      return new Response(
        JSON.stringify({ error: "Acesso negado. Apenas administradores podem resetar alunos." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { alunoId, confirmacaoNome }: ResetRequest = await req.json();

    if (!alunoId || !confirmacaoNome) {
      return new Response(
        JSON.stringify({ error: "alunoId e confirmacaoNome são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch student data
    const { data: aluno, error: alunoError } = await supabaseAdmin
      .from("profiles")
      .select("id, nome, sobrenome, full_name, institution_id")
      .eq("id", alunoId)
      .single();

    if (alunoError || !aluno) {
      return new Response(
        JSON.stringify({ error: "Aluno não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate confirmation name
    const nomeCompleto = aluno.full_name || `${aluno.nome} ${aluno.sobrenome}`;
    if (confirmacaoNome.toLowerCase().trim() !== nomeCompleto.toLowerCase().trim()) {
      return new Response(
        JSON.stringify({ error: "Nome de confirmação não corresponde ao nome do aluno" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[reset-aluno-dados] Iniciando reset para aluno: ${alunoId} (${nomeCompleto})`);

    const resumo: ResetResumo = {
      acoes_professor: 0,
      acoes_celebracao: 0,
      alertas: 0,
      evidencias: 0,
      observacoes: 0,
      historico: 0,
      scores_resetados: 0,
    };

    // 1. Delete acoes_professor
    const { data: acoesProfessor } = await supabaseAdmin
      .from("acoes_professor")
      .delete()
      .eq("aluno_id", alunoId)
      .select("id");
    resumo.acoes_professor = acoesProfessor?.length || 0;
    console.log(`[reset-aluno-dados] acoes_professor deletados: ${resumo.acoes_professor}`);

    // 2. Delete acoes_celebracao
    const { data: acoesCelebracao } = await supabaseAdmin
      .from("acoes_celebracao")
      .delete()
      .eq("aluno_id", alunoId)
      .select("id");
    resumo.acoes_celebracao = acoesCelebracao?.length || 0;
    console.log(`[reset-aluno-dados] acoes_celebracao deletados: ${resumo.acoes_celebracao}`);

    // 3. Delete alertas_alunos
    const { data: alertas } = await supabaseAdmin
      .from("alertas_alunos")
      .delete()
      .eq("aluno_id", alunoId)
      .select("id");
    resumo.alertas = alertas?.length || 0;
    console.log(`[reset-aluno-dados] alertas_alunos deletados: ${resumo.alertas}`);

    // 4. Delete inteligencia_evidencias
    const { data: evidencias } = await supabaseAdmin
      .from("inteligencia_evidencias")
      .delete()
      .eq("aluno_id", alunoId)
      .select("id");
    resumo.evidencias = evidencias?.length || 0;
    console.log(`[reset-aluno-dados] inteligencia_evidencias deletados: ${resumo.evidencias}`);

    // 5. Delete observacoes
    const { data: observacoes } = await supabaseAdmin
      .from("observacoes")
      .delete()
      .eq("aluno_id", alunoId)
      .select("id");
    resumo.observacoes = observacoes?.length || 0;
    console.log(`[reset-aluno-dados] observacoes deletados: ${resumo.observacoes}`);

    // 6. Delete inteligencia_historico
    const { data: historico } = await supabaseAdmin
      .from("inteligencia_historico")
      .delete()
      .eq("aluno_id", alunoId)
      .select("id");
    resumo.historico = historico?.length || 0;
    console.log(`[reset-aluno-dados] inteligencia_historico deletados: ${resumo.historico}`);

    // 7. Reset inteligencia_scores to initial value (35)
    const { data: scores } = await supabaseAdmin
      .from("inteligencia_scores")
      .update({
        score_atual: 35.00,
        score_ultima_fase: 0,
        total_evidencias: 0,
        updated_at: new Date().toISOString(),
      })
      .eq("aluno_id", alunoId)
      .select("id");
    resumo.scores_resetados = scores?.length || 0;
    console.log(`[reset-aluno-dados] inteligencia_scores resetados: ${resumo.scores_resetados}`);

    // 8. Log the action
    const { error: logError } = await supabaseAdmin
      .from("admin_logs")
      .insert({
        institution_id: aluno.institution_id,
        admin_id: user.id,
        acao: "reset_aluno_dados",
        alvo_id: alunoId,
        alvo_tipo: "aluno",
        detalhes: {
          aluno_nome: nomeCompleto,
          resumo,
        },
      });

    if (logError) {
      console.error("[reset-aluno-dados] Erro ao registrar log:", logError);
    }

    console.log(`[reset-aluno-dados] Reset concluído com sucesso para: ${nomeCompleto}`);

    return new Response(
      JSON.stringify({
        success: true,
        aluno_nome: nomeCompleto,
        resumo,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("[reset-aluno-dados] Erro:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro interno do servidor";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
