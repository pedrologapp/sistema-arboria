import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Observacao {
  sinal: string;
  sinal_codigo: string;
  valencia: string;
  data: string;
  emoji: string;
}

interface AlertaGerado {
  estado: "precisa_atencao" | "celebrar" | "neutro";
  deve_gerar_alerta: boolean;
  alerta?: {
    sinal_principal: string;
    sinal_codigo: string;
    quantidade: number;
    texto_acontecendo: string;
    contexto: string[];
    hipoteses: { titulo: string; descricao: string }[];
  };
}

// Fallback analysis when AI fails
function analiseFallback(observacoes: Observacao[], nomeAluno: string): AlertaGerado {
  if (observacoes.length < 2) {
    return { estado: "neutro", deve_gerar_alerta: false };
  }

  const ultimas2 = observacoes.slice(0, 2);
  const ambas_atencao = ultimas2.every((o) => o.valencia === "atencao");
  const ambas_positivas = ultimas2.every((o) => o.valencia === "positivo");

  if (ambas_atencao) {
    // Count how many times the first signal appears
    const sinalPrincipal = ultimas2[0].sinal;
    const sinalCodigo = ultimas2[0].sinal_codigo;
    const quantidade = observacoes.filter((o) => o.sinal === sinalPrincipal).length;

    return {
      estado: "precisa_atencao",
      deve_gerar_alerta: true,
      alerta: {
        sinal_principal: sinalPrincipal,
        sinal_codigo: sinalCodigo,
        quantidade: Math.min(quantidade, 3),
        texto_acontecendo: `${nomeAluno} apresentou "${sinalPrincipal}" nas últimas 2 observações consecutivas.`,
        contexto: [
          "Padrão de atenção identificado nas observações recentes",
          "Verificar se há fatores externos afetando o comportamento",
        ],
        hipoteses: [],
      },
    };
  }

  if (ambas_positivas) {
    return {
      estado: "celebrar",
      deve_gerar_alerta: false, // Will be handled by existing threshold logic
    };
  }

  return { estado: "neutro", deve_gerar_alerta: false };
}

// Build prompt for AI analysis
function montarPromptAnalise(
  aluno: { nome: string; serie: string; casa: string; casaCodigo: string; faseAtual: string; faseAtualCodigo: string },
  observacoes: Observacao[],
  hipotesesDisponiveis: { sinal_codigo: string; titulo: string; descricao: string }[]
): string {
  const obsFormatadas = observacoes
    .map((o, i) => `${i + 1}. ${o.emoji} ${o.sinal} (${o.valencia}) - ${o.data}`)
    .join("\n");

  const hipotesesJson = JSON.stringify(
    hipotesesDisponiveis.reduce((acc, h) => {
      if (!acc[h.sinal_codigo]) acc[h.sinal_codigo] = [];
      acc[h.sinal_codigo].push({ titulo: h.titulo, descricao: h.descricao });
      return acc;
    }, {} as Record<string, { titulo: string; descricao: string }[]>),
    null,
    2
  );

  return `Você é um assistente do Projeto Arboria que analisa observações de alunos para gerar alertas precisos.

DADOS DO ALUNO:
- Nome: ${aluno.nome}
- Série: ${aluno.serie}
- Casa (inteligência principal): ${aluno.casa} (código: ${aluno.casaCodigo})
- Fase atual: ${aluno.faseAtual} (código: ${aluno.faseAtualCodigo})

ÚLTIMAS OBSERVAÇÕES (da mais recente para a mais antiga):
${obsFormatadas}

DICIONÁRIO DE SINAIS:
Positivos (valencia="positivo"): Brilhou, Aprendeu rápido, Inovou, Persistiu, Liderou, Colaborou, Estava bem
Atenção (valencia="atencao"): Travou, Desistiu, Se isolou, Ficou calado, Conflitou, Parecia triste, Parecia ansioso, Algo diferente

REGRAS DE ANÁLISE:
1. As 2 ÚLTIMAS observações determinam o estado atual
2. Se as 2 últimas são de ATENÇÃO → estado = "precisa_atencao"
3. Se as 2 últimas são POSITIVAS → estado = "celebrar" (mas deve_gerar_alerta = false pois será tratado separadamente)
4. Se mistas (1 atenção + 1 positiva) → estado = "neutro"

DICIONÁRIO DE HIPÓTESES POR SINAL:
${hipotesesJson}

TAREFA:
Analise as observações e retorne um JSON com a seguinte estrutura:

{
  "estado": "precisa_atencao" | "celebrar" | "neutro",
  "deve_gerar_alerta": true | false,
  "alerta": {
    "sinal_principal": "string - o sinal que aparece nas ÚLTIMAS 2 observações (ex: 'Desistiu')",
    "sinal_codigo": "string - o código do sinal em snake_case (ex: 'desistiu')",
    "quantidade": number - quantas vezes o sinal apareceu nas últimas observações,
    "texto_acontecendo": "string - descrição clara do que está acontecendo com ${aluno.nome}",
    "contexto": [
      "string - ponto de contexto 1 sobre o padrão observado",
      "string - ponto de contexto 2 sobre a mudança de comportamento",
      "string - ponto de contexto 3 sobre o histórico recente"
    ],
    "hipoteses": [
      {
        "titulo": "string - título da hipótese",
        "descricao": "string - descrição explicando a hipótese"
      }
    ]
  }
}

IMPORTANTE:
- O "sinal_principal" DEVE ser baseado nas 2 ÚLTIMAS observações, não em observações antigas
- Se as 2 últimas são "Desistiu" e "Desistiu", o sinal_principal é "Desistiu", não outro sinal
- Selecione 2-3 hipóteses mais relevantes do dicionário para o sinal observado
- O texto_acontecendo deve ser preciso e refletir exatamente as últimas observações
- Se estado = "neutro" ou estado = "celebrar", defina deve_gerar_alerta = false
- Se estado = "precisa_atencao", defina deve_gerar_alerta = true

Retorne APENAS o JSON, sem explicações adicionais.`;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { aluno_id } = await req.json();

    if (!aluno_id) {
      return new Response(JSON.stringify({ error: "aluno_id é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase credentials not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Fetch student data
    const { data: aluno, error: alunoError } = await supabase
      .from("profiles")
      .select(`
        id, 
        full_name, 
        nome, 
        sobrenome, 
        serie, 
        turma, 
        casa_id,
        institution_id
      `)
      .eq("id", aluno_id)
      .single();

    if (alunoError || !aluno) {
      console.error("Error fetching student:", alunoError);
      return new Response(JSON.stringify({ error: "Aluno não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get student's house info
    let casaNome = "Sem casa";
    let casaCodigo = "";
    if (aluno.casa_id) {
      const { data: casa } = await supabase
        .from("inteligencias")
        .select("nome, codigo")
        .eq("id", aluno.casa_id)
        .single();
      if (casa) {
        casaNome = casa.nome;
        casaCodigo = casa.codigo;
      }
    }

    // Get current phase
    let faseAtualId = null;
    let faseAtualNome = "";
    let faseAtualCodigo = "";
    if (aluno.institution_id) {
      const { data: fase } = await supabase
        .from("fases")
        .select("id, inteligencia_id")
        .eq("institution_id", aluno.institution_id)
        .eq("ativo", true)
        .single();

      if (fase) {
        faseAtualId = fase.id;
        const { data: faseInteligencia } = await supabase
          .from("inteligencias")
          .select("nome, codigo")
          .eq("id", fase.inteligencia_id)
          .single();
        if (faseInteligencia) {
          faseAtualNome = faseInteligencia.nome;
          faseAtualCodigo = faseInteligencia.codigo;
        }
      }
    }

    // 2. Fetch last 15 observations
    const { data: observacoesRaw } = await supabase
      .from("observacoes")
      .select(`
        id,
        data_observacao,
        sinal_id,
        observacao_texto
      `)
      .eq("aluno_id", aluno_id)
      .order("data_observacao", { ascending: false })
      .limit(15);

    const sinaisIds = [...new Set(observacoesRaw?.map((o) => o.sinal_id) || [])];
    const { data: sinaisData } = await supabase
      .from("sinais")
      .select("id, label_pt, codigo, valencia, emoji")
      .in("id", sinaisIds.length > 0 ? sinaisIds : [0]);

    const sinaisMap = new Map(sinaisData?.map((s) => [s.id, s]) || []);

    const observacoes: Observacao[] = (observacoesRaw || []).map((o) => {
      const sinal = sinaisMap.get(o.sinal_id);
      return {
        sinal: sinal?.label_pt || "Observação",
        sinal_codigo: sinal?.codigo || "",
        valencia: sinal?.valencia || "neutra",
        data: new Date(o.data_observacao).toLocaleDateString("pt-BR"),
        emoji: sinal?.emoji || "📝",
      };
    });

    if (observacoes.length < 2) {
      console.log("Not enough observations for analysis");
      return new Response(
        JSON.stringify({
          success: true,
          message: "Sem observações suficientes para análise",
          analise: { estado: "neutro", deve_gerar_alerta: false },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Fetch hypothesis dictionary
    const { data: hipotesesData } = await supabase
      .from("hipoteses_por_sinal")
      .select("sinal_codigo, titulo, descricao, ordem")
      .order("ordem");

    const hipoteses = hipotesesData || [];

    // Format student name
    const nomeCompleto =
      aluno.full_name || `${aluno.nome || ""} ${aluno.sobrenome || ""}`.trim() || "Aluno";
    const primeiroNome = nomeCompleto.split(" ")[0];

    let analise: AlertaGerado;

    // 4. Try AI analysis, fallback to simple logic
    if (LOVABLE_API_KEY) {
      try {
        const prompt = montarPromptAnalise(
          {
            nome: primeiroNome,
            serie: aluno.serie || "Sem série",
            casa: casaNome,
            casaCodigo,
            faseAtual: faseAtualNome || "Sem fase",
            faseAtualCodigo,
          },
          observacoes,
          hipoteses
        );

        console.log("Calling Lovable AI Gateway...");

        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              {
                role: "system",
                content: "Você é um assistente especializado em análise de comportamento de alunos. Retorne apenas JSON válido.",
              },
              { role: "user", content: prompt },
            ],
          }),
        });

        if (!aiResponse.ok) {
          const errorText = await aiResponse.text();
          console.error("AI Gateway error:", aiResponse.status, errorText);
          
          if (aiResponse.status === 429) {
            console.log("Rate limited, using fallback");
            analise = analiseFallback(observacoes, primeiroNome);
          } else if (aiResponse.status === 402) {
            console.log("Payment required, using fallback");
            analise = analiseFallback(observacoes, primeiroNome);
          } else {
            throw new Error(`AI error: ${aiResponse.status}`);
          }
        } else {
          const aiData = await aiResponse.json();
          const content = aiData.choices?.[0]?.message?.content;

          if (!content) {
            throw new Error("Empty AI response");
          }

          // Parse JSON from AI response (handle markdown code blocks)
          let jsonStr = content.trim();
          if (jsonStr.startsWith("```json")) {
            jsonStr = jsonStr.slice(7);
          }
          if (jsonStr.startsWith("```")) {
            jsonStr = jsonStr.slice(3);
          }
          if (jsonStr.endsWith("```")) {
            jsonStr = jsonStr.slice(0, -3);
          }
          jsonStr = jsonStr.trim();

          analise = JSON.parse(jsonStr);
          console.log("AI analysis result:", analise.estado, analise.deve_gerar_alerta);
        }
      } catch (aiError) {
        console.error("AI analysis error, using fallback:", aiError);
        analise = analiseFallback(observacoes, primeiroNome);
      }
    } else {
      console.log("No AI key, using fallback analysis");
      analise = analiseFallback(observacoes, primeiroNome);
    }

    // 5. Archive existing alerts and create new one if needed
    if (aluno.institution_id) {
      // Archive old active alerts of conflicting types
      if (analise.estado === "precisa_atencao") {
        await supabase
          .from("alertas_alunos")
          .update({ status: "arquivado", updated_at: new Date().toISOString() })
          .eq("aluno_id", aluno_id)
          .eq("tipo_alerta", "celebrar")
          .eq("status", "ativo");
      } else if (analise.estado === "celebrar" || analise.estado === "neutro") {
        await supabase
          .from("alertas_alunos")
          .update({ status: "arquivado", updated_at: new Date().toISOString() })
          .eq("aluno_id", aluno_id)
          .eq("tipo_alerta", "precisa_atencao")
          .eq("status", "ativo");
      }

      // Create new alert if needed
      if (analise.deve_gerar_alerta && analise.alerta) {
        // Check if there's already an active alert of this type
        const { data: existingAlert } = await supabase
          .from("alertas_alunos")
          .select("id")
          .eq("aluno_id", aluno_id)
          .eq("tipo_alerta", analise.estado)
          .eq("status", "ativo")
          .maybeSingle();

        if (existingAlert) {
          // Update existing alert with new data
          await supabase
            .from("alertas_alunos")
            .update({
              dados_contexto: {
                sinal_predominante: analise.alerta.sinal_principal,
                sinal_codigo: analise.alerta.sinal_codigo,
                quantidade: analise.alerta.quantidade,
                texto_acontecendo: analise.alerta.texto_acontecendo,
                contexto: analise.alerta.contexto,
                hipoteses: analise.alerta.hipoteses,
                gerado_por: "ia",
                timestamp_analise: new Date().toISOString(),
              },
              motivo: "analise_ia",
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingAlert.id);

          console.log("Updated existing alert:", existingAlert.id);
        } else {
          // Create new alert
          const { error: insertError } = await supabase.from("alertas_alunos").insert({
            institution_id: aluno.institution_id,
            aluno_id: aluno_id,
            tipo_alerta: analise.estado,
            motivo: "analise_ia",
            status: "ativo",
            notificacao_ativa: true,
            fase_id: faseAtualId,
            dados_contexto: {
              sinal_predominante: analise.alerta.sinal_principal,
              sinal_codigo: analise.alerta.sinal_codigo,
              quantidade: analise.alerta.quantidade,
              texto_acontecendo: analise.alerta.texto_acontecendo,
              contexto: analise.alerta.contexto,
              hipoteses: analise.alerta.hipoteses,
              gerado_por: "ia",
              timestamp_analise: new Date().toISOString(),
            },
          });

          if (insertError) {
            console.error("Error inserting alert:", insertError);
          } else {
            console.log("Created new alert for student:", aluno_id);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        analise,
        aluno: { id: aluno_id, nome: primeiroNome },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in analisar-observacoes:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
