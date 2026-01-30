import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-arboria-secret",
};

interface SugestaoPayload {
  aluno_id: string;
  observacao_gatilho_id?: string;
  estado: "precisa_atencao" | "celebrar" | "neutro";
  texto_acontecendo: string;
  sinal_principal?: string;
  sinal_codigo?: string;
  hipoteses?: Array<{
    titulo: string;
    descricao: string;
    perguntas?: string[];
  }>;
  acoes_sugeridas?: Array<{
    acao: string;
    prioridade: "alta" | "media" | "baixa";
  }>;
  padrao_identificado?: {
    nome: string;
    significado: string;
  };
  arquetipo?: {
    nome_arquetipo: string;
    tipo: "descoberta" | "confirmacao";
    significado: string;
    potencializar?: string[];
    sugestao_conversa?: string;
  };
  prioridade?: "importante" | "normal" | "baixa";
  mensagem_professor?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Validate secret
    const secret = req.headers.get("X-Arboria-Secret");
    const expectedSecret = Deno.env.get("N8N_WEBHOOK_SECRET");

    if (!secret || secret !== expectedSecret) {
      console.error("Unauthorized: Invalid or missing X-Arboria-Secret");
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Parse and validate payload
    const payload: SugestaoPayload = await req.json();

    if (!payload.aluno_id || !payload.estado || !payload.texto_acontecendo) {
      console.error("Bad request: Missing required fields", {
        has_aluno_id: !!payload.aluno_id,
        has_estado: !!payload.estado,
        has_texto: !!payload.texto_acontecendo,
      });
      return new Response(
        JSON.stringify({
          success: false,
          error: "Campos obrigatórios ausentes: aluno_id, estado, texto_acontecendo",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate estado value
    const estadosValidos = ["precisa_atencao", "celebrar", "neutro"];
    if (!estadosValidos.includes(payload.estado)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Estado inválido. Valores aceitos: ${estadosValidos.join(", ")}`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Create Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 4. Fetch student data
    const { data: aluno, error: alunoError } = await supabase
      .from("profiles")
      .select("id, institution_id, casa_id")
      .eq("id", payload.aluno_id)
      .single();

    if (alunoError || !aluno) {
      console.error("Student not found:", payload.aluno_id, alunoError);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Aluno não encontrado: ${payload.aluno_id}`,
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Get current active phase for the institution
    const { data: faseAtual } = await supabase
      .from("fases")
      .select("id")
      .eq("institution_id", aluno.institution_id)
      .eq("ativo", true)
      .limit(1)
      .single();

    const faseAtualId = faseAtual?.id || null;

    // 6. Archive old active alerts for this student (only n8n-generated ones)
    const { error: archiveError } = await supabase
      .from("alertas_alunos")
      .update({
        status: "arquivado",
        notificacao_ativa: false,
        updated_at: new Date().toISOString(),
      })
      .eq("aluno_id", payload.aluno_id)
      .eq("status", "ativo")
      .eq("motivo", "analise_n8n");

    if (archiveError) {
      console.error("Error archiving old alerts:", archiveError);
      // Continue anyway - not critical
    }

    // 7. Build dados_contexto JSONB
    const dadosContexto = {
      estado: payload.estado,
      sinal_principal: payload.sinal_principal || null,
      sinal_codigo: payload.sinal_codigo || null,
      texto_acontecendo: payload.texto_acontecendo,
      hipoteses: payload.hipoteses || [],
      acoes_sugeridas: payload.acoes_sugeridas || [],
      padrao_identificado: payload.padrao_identificado || null,
      arquetipo: payload.arquetipo || null,
      mensagem_professor: payload.mensagem_professor || null,
      prioridade: payload.prioridade || "normal",
      observacao_gatilho_id: payload.observacao_gatilho_id || null,
      gerado_por: "n8n",
      timestamp_analise: new Date().toISOString(),
    };

    // 8. Insert new alert
    const { data: novoAlerta, error: insertError } = await supabase
      .from("alertas_alunos")
      .insert({
        institution_id: aluno.institution_id,
        aluno_id: payload.aluno_id,
        tipo_alerta: payload.estado,
        motivo: "analise_n8n",
        status: "ativo",
        notificacao_ativa: true,
        fase_id: faseAtualId,
        dados_contexto: dadosContexto,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Error inserting alert:", insertError);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Erro ao salvar alerta: ${insertError.message}`,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Sugestão recebida e salva com sucesso:", {
      alerta_id: novoAlerta.id,
      aluno_id: payload.aluno_id,
      estado: payload.estado,
    });

    return new Response(
      JSON.stringify({
        success: true,
        alerta_id: novoAlerta.id,
        message: "Sugestão recebida e salva com sucesso",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: `Erro inesperado: ${errorMessage}`,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
