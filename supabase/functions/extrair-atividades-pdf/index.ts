// ============================================================
// extrair-atividades-pdf  (cerebro do importador de atividades por PDF)
//
// Recebe um PDF (base64) e devolve as ATIVIDADES estruturadas (uma por faixa),
// prontas pra previa no /arboria. NAO escreve nada: o super_admin revisa e so
// entao grava (mesmo padrao seguro do importador de alunos).
//
// Reusa o setup de IA da analisar-missao (Claude lendo o PDF como documento).
// Normaliza server-side: inteligencia -> id, faixa casada com a grafia que o
// banco JA usa (ex.: PDF "Maternal II" -> banco "Maternal 2"), ordem sugerida
// (max+1 por faixa), e aviso quando a atividade ja existe.
// ============================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const MODELO = "claude-haiku-4-5-20251001";

const ORIGENS_OK = [
  "https://arboria.escolaamadeus.com",
  "https://admin.arboria.escolaamadeus.com",
  "http://localhost:5173",
  "http://localhost:8080",
];
function corsFor(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  const allow = ORIGENS_OK.includes(origin) ? origin : ORIGENS_OK[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Vary": "Origin",
  };
}

const INTELIGENCIAS: { id: number; nome: string }[] = [
  { id: 1, nome: "Linguística" },
  { id: 2, nome: "Lógico-Matemática" },
  { id: 3, nome: "Espacial" },
  { id: 4, nome: "Musical" },
  { id: 5, nome: "Corporal-Cinestésica" },
  { id: 6, nome: "Naturalista" },
  { id: 7, nome: "Interpessoal" },
  { id: 8, nome: "Intrapessoal" },
];
const SEGMENTOS = ["infantil", "fundamental1", "fundamental2"];

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
const norm = (s?: string | null) => semAcento((s ?? "").toString()).replace(/\s+/g, "").toLowerCase();

// Chave de faixa tolerante: converte romano (II/III/IV/V) em arabe, pra casar
// "Maternal II" (PDF) com "Maternal 2" (banco).
const ROMANO: Record<string, string> = { i: "1", ii: "2", iii: "3", iv: "4", v: "5", vi: "6" };
function faixaKey(s?: string | null): string {
  return semAcento((s ?? "").toString()).toLowerCase().trim().split(/\s+/)
    .map((tk) => ROMANO[tk] ?? tk).join("");
}
function inteligenciaId(nome?: string | null): number | null {
  const k = norm(nome);
  const hit = INTELIGENCIAS.find((i) => norm(i.nome) === k || k.includes(norm(i.nome).slice(0, 6)));
  return hit?.id ?? null;
}
function segmentoNorm(s?: string | null): string | null {
  const k = norm(s);
  if (SEGMENTOS.includes(k)) return k;
  if (k.includes("infantil")) return "infantil";
  if (k.includes("fundamental1") || k.includes("fundamentali") || k.includes("f1")) return "fundamental1";
  if (k.includes("fundamental2") || k.includes("fundamentalii") || k.includes("f2")) return "fundamental2";
  return null;
}

const PROMPT = `Voce e um extrator. Recebe um PDF com atividade(s) pedagogica(s) do Projeto Arboria e devolve os dados ESTRUTURADOS em JSON, SEM inventar, resumir, reescrever ou completar nada. Copie o texto de cada secao EXATAMENTE como esta no PDF (pode juntar quebras de linha soltas num paragrafo, mas nao mude palavras).

O PDF costuma ter uma capa e depois UMA SECAO POR FAIXA ETARIA (ex.: Maternal II, Maternal III, Grupo IV, Grupo V, ou series do Fundamental). Cada faixa e' UMA atividade separada. Ignore a capa e rodapes.

Devolva SOMENTE um array JSON (sem markdown, sem comentario), no formato:
[
  {
    "inteligencia": "<uma das 8: Linguistica, Logico-Matematica, Espacial, Musical, Corporal-Cinestesica, Naturalista, Interpessoal, Intrapessoal>",
    "segmento": "<infantil | fundamental1 | fundamental2>",
    "faixa": "<o rotulo da faixa/serie exatamente como no PDF, ex.: 'Maternal II', 'Grupo IV', '5o Ano'>",
    "nome": "<NOME DA ATIVIDADE>",
    "objetivo": "<secao OBJETIVO, texto integral>",
    "materiais": "<secao de HISTORIAS/MATERIAIS se houver, texto integral; senao ''>",
    "como_conduzir": "<secao COMO CONDUZIR, texto integral com os passos>",
    "o_que_observar": "<secao O QUE OBSERVAR, texto integral>"
  }
]

Regras: se uma secao nao existir, use "". Nao acrescente conclusao nem diagnostico. Preserve a voz do texto (e material de educador). Uma faixa = um objeto.`;

Deno.serve(async (req: Request) => {
  const cors = corsFor(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Nao autorizado" }, 401);
    const { data: { user: caller }, error: authErr } =
      await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authErr || !caller) return json({ error: "Nao autorizado" }, 401);

    // O banco de atividades e' do DONO (super_admin), nao do admin da escola.
    const { data: isSuper } = await supabase
      .from("user_roles").select("role").eq("user_id", caller.id).eq("role", "super_admin").maybeSingle();
    if (!isSuper) return json({ error: "Apenas o dono da plataforma (super_admin)" }, 403);

    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) return json({ error: "ANTHROPIC_API_KEY nao configurada" }, 500);

    const body = await req.json() as { pdf_base64?: string; institution_id?: string };
    const b64 = (body.pdf_base64 ?? "").replace(/^data:application\/pdf;base64,/, "");
    if (!b64) return json({ error: "PDF ausente" }, 400);
    const institutionId = body.institution_id;
    if (!institutionId) return json({ error: "institution_id ausente" }, 400);

    // Chama o Claude com o PDF anexado como documento.
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODELO,
        max_tokens: 8000,
        system: PROMPT,
        messages: [{
          role: "user",
          content: [
            { type: "text", text: "Extraia as atividades deste PDF conforme as regras." },
            { type: "document", source: { type: "base64", media_type: "application/pdf", data: b64 } },
          ],
        }],
      }),
    });
    if (!resp.ok) return json({ error: `IA ${resp.status}`, detalhe: (await resp.text()).slice(0, 300) }, 502);
    const data = await resp.json();
    const txt: string = data?.content?.[0]?.text ?? "";
    let extraidas: Record<string, string>[] = [];
    try { extraidas = JSON.parse(txt); }
    catch { const m = txt.match(/\[[\s\S]*\]/); if (m) { try { extraidas = JSON.parse(m[0]); } catch { /* */ } } }
    if (!Array.isArray(extraidas) || extraidas.length === 0)
      return json({ error: "A IA nao devolveu atividades legiveis", cru: txt.slice(0, 500) }, 422);

    // Snapshot pra casar faixa/ordem/duplicata.
    const { data: existentes } = await supabase
      .from("atividades")
      .select("inteligencia_id, segmento, faixa, nome, ordem")
      .eq("institution_id", institutionId);
    const listaExist = existentes ?? [];
    // Mapa faixaKey -> grafia real do banco (por segmento).
    const faixaDoBanco = new Map<string, string>();
    for (const a of listaExist) {
      const key = `${norm(a.segmento)}::${faixaKey(a.faixa)}`;
      if (a.faixa && !faixaDoBanco.has(key)) faixaDoBanco.set(key, a.faixa);
    }
    const maxOrdem = (intel: number, seg: string, faixa: string) =>
      listaExist.filter((a) => a.inteligencia_id === intel && norm(a.segmento) === norm(seg) && norm(a.faixa) === norm(faixa))
        .reduce((mx, a) => Math.max(mx, Number(a.ordem) || 0), 0);

    const atividades = extraidas.map((e, i) => {
      const intelId = inteligenciaId(e.inteligencia);
      const seg = segmentoNorm(e.segmento);
      const faixaPdf = (e.faixa ?? "").toString().trim();
      const faixaMatch = seg ? faixaDoBanco.get(`${norm(seg)}::${faixaKey(faixaPdf)}`) : undefined;
      const faixaFinal = faixaMatch ?? faixaPdf; // usa a grafia do banco se casou
      const dup = intelId != null && seg
        ? listaExist.some((a) => a.inteligencia_id === intelId && norm(a.segmento) === norm(seg) &&
            norm(a.faixa) === norm(faixaFinal) && norm(a.nome) === norm(e.nome))
        : false;
      const avisos: string[] = [];
      if (intelId == null) avisos.push("inteligencia_nao_reconhecida");
      if (!seg) avisos.push("segmento_nao_reconhecido");
      if (seg && !faixaMatch && faixaPdf) avisos.push("faixa_nova_confira_grafia");
      if (!e.nome) avisos.push("sem_nome");
      if (dup) avisos.push("ja_existe");
      return {
        idx: i,
        inteligencia_id: intelId,
        inteligencia_nome: e.inteligencia ?? null,
        segmento: seg,
        faixa: faixaFinal,
        faixa_pdf: faixaPdf,
        ordem: (intelId && seg ? maxOrdem(intelId, seg, faixaFinal) : 0) + 1,
        nome: e.nome ?? "",
        objetivo: e.objetivo ?? "",
        materiais: e.materiais ?? "",
        como_conduzir: e.como_conduzir ?? "",
        o_que_observar: e.o_que_observar ?? "",
        avisos,
      };
    });

    return json({ ok: true, atividades, faixas_conhecidas: [...new Set(listaExist.map((a) => a.faixa).filter(Boolean))] });
  } catch (e) {
    console.error("[extrair-atividades-pdf] erro:", e);
    return json({ error: "Erro interno" }, 500);
  }
});
