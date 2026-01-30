import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-arboria-secret",
};

interface SugestaoPayload {
  aluno_id?: string;
  aluno_matricula?: string;
  observacao_gatilho_id?: string;
  estado: "precisa_atencao" | "celebrar" | "neutro" | "aguardando_explicacao";
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
    script?: string;
    objetivo?: string;
    contexto?: string;
    como_escutar?: string;
    por_que_funciona?: string;
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
  prioridade?: "urgente" | "importante" | "normal";
  mensagem_professor?: string;
  o_que_nao_fazer?: string[];
  
  // Campos para contradição (aguardando_explicacao)
  tipo_contradicao?: "celebracao_para_atencao" | "atencao_para_recuperacao" | "outro";
  perguntas_professor?: string[];
  sugestao_anterior_resumo?: string;
  observacao_nova?: string;
  requer_resposta?: boolean;
  
  // Campos ricos do N8N
  como_reagir?: {
    se_aceitar: string;
    se_recusar: string;
    alerta?: string;
  };
  
  elemento_ponte?: {
    forcas: string | string[];
    area_dificuldade: string;
  };
  
  // NOVOS CAMPOS ESTRUTURADOS
  tipo_recomendacao?: string;
  nome_recomendacao?: string;
  por_que_este_tipo?: string;
  
  o_que_fazer_agora?: {
    objetivo: string;
    contexto: string;
    script_principal: string;
    como_escutar: string;
  };
  
  use_a_forca?: {
    forcas_utilizadas: string;
    opcao_a: {
      nome: string;
      script: string;
      por_que_funciona: string;
    };
    opcao_b: {
      nome: string;
      script: string;
      por_que_funciona: string;
    };
  };
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

    // Validate required fields - need at least matricula OR id
    if (!payload.aluno_id && !payload.aluno_matricula) {
      console.error("Bad request: Missing student identifier", {
        has_aluno_id: !!payload.aluno_id,
        has_aluno_matricula: !!payload.aluno_matricula,
      });
      return new Response(
        JSON.stringify({
          success: false,
          error: "Informe aluno_id ou aluno_matricula",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!payload.estado || !payload.texto_acontecendo) {
      console.error("Bad request: Missing required fields", {
        has_estado: !!payload.estado,
        has_texto: !!payload.texto_acontecendo,
      });
      return new Response(
        JSON.stringify({
          success: false,
          error: "Campos obrigatórios ausentes: estado, texto_acontecendo",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate estado value
    const estadosValidos = ["precisa_atencao", "celebrar", "neutro", "aguardando_explicacao"];
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

    // 4. Fetch student data - priority: matricula > aluno_id
    let aluno: { id: string; institution_id: string; casa_id: number | null } | null = null;

    if (payload.aluno_matricula) {
      // Normalize matricula (remove dots and hyphens)
      const matriculaNormalizada = payload.aluno_matricula.replace(/[.\-]/g, '');
      console.log("Looking up student by matricula:", matriculaNormalizada);
      
      const { data, error } = await supabase
        .from("profiles")
        .select("id, institution_id, casa_id")
        .eq("matricula_externa", matriculaNormalizada)
        .maybeSingle();
      
      if (error) {
        console.error("Error looking up by matricula:", error);
      }
      aluno = data;
    }

    // Fallback to aluno_id if not found by matricula
    if (!aluno && payload.aluno_id) {
      console.log("Looking up student by id:", payload.aluno_id);
      
      const { data, error } = await supabase
        .from("profiles")
        .select("id, institution_id, casa_id")
        .eq("id", payload.aluno_id)
        .maybeSingle();
      
      if (error) {
        console.error("Error looking up by id:", error);
      }
      aluno = data;
    }

    if (!aluno) {
      const identifier = payload.aluno_matricula || payload.aluno_id;
      console.error("Student not found:", identifier);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Aluno não encontrado. Verifique aluno_matricula ou aluno_id. Valor recebido: ${identifier}`,
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Student found:", { id: aluno.id, institution_id: aluno.institution_id });

    // 5. Get current active phase for the institution
    const { data: faseAtual } = await supabase
      .from("fases")
      .select("id")
      .eq("institution_id", aluno.institution_id)
      .eq("ativo", true)
      .limit(1)
      .single();

    const faseAtualId = faseAtual?.id || null;

    // 6. Archive ALL active alerts for this student (not just n8n ones)
    // This prevents duplicate alerts from system and n8n
    const { error: archiveError } = await supabase
      .from("alertas_alunos")
      .update({
        status: "arquivado",
        notificacao_ativa: false,
        updated_at: new Date().toISOString(),
      })
      .eq("aluno_id", aluno.id)
      .eq("status", "ativo");

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
      o_que_nao_fazer: payload.o_que_nao_fazer || [],
      prioridade: payload.prioridade || "normal",
      observacao_gatilho_id: payload.observacao_gatilho_id || null,
      gerado_por: "n8n",
      timestamp_analise: new Date().toISOString(),
      // Campos específicos para contradição
      tipo_contradicao: payload.tipo_contradicao || null,
      perguntas_professor: payload.perguntas_professor || [],
      sugestao_anterior_resumo: payload.sugestao_anterior_resumo || null,
      observacao_nova: payload.observacao_nova || null,
      requer_resposta: payload.requer_resposta || false,
      // Campos ricos do N8N
      como_reagir: payload.como_reagir || null,
      elemento_ponte: payload.elemento_ponte || null,
      // NOVOS CAMPOS ESTRUTURADOS
      tipo_recomendacao: payload.tipo_recomendacao || null,
      nome_recomendacao: payload.nome_recomendacao || null,
      por_que_este_tipo: payload.por_que_este_tipo || null,
      o_que_fazer_agora: payload.o_que_fazer_agora || null,
      use_a_forca: payload.use_a_forca || null,
    };

    // 8. Insert new alert
    const { data: novoAlerta, error: insertError } = await supabase
      .from("alertas_alunos")
      .insert({
        institution_id: aluno.institution_id,
      aluno_id: aluno.id,
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
      aluno_id: aluno.id,
      aluno_matricula: payload.aluno_matricula,
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
