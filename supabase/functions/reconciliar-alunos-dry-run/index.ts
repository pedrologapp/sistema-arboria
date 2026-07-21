// ============================================================
// reconciliar-alunos-dry-run  (Fase 2 do import de alunos)
//
// O "cerebro" da reconciliacao: recebe as linhas ja parseadas de uma planilha e
// devolve o DIFF em 4 baldes (novo / mudou / saiu / ambiguo) + inalterados,
// SEM ESCREVER NADA no banco. A tela do admin mostra essa previa; so depois de o
// admin confirmar, a Fase 4 (apply) escreve.
//
// Regras de seguranca (mesa 18/07 + parecer QA; ver empresa/registros/riscos.md):
//  - Match SO por matricula, 1:1. Ambiguo/reciclada/duplicada -> revisao humana.
//  - "saiu" so entre ativos COM matricula que ninguem casou; matricula duplicada
//    (na planilha OU no banco) NUNCA deixa o aluno real cair em "saiu".
//  - Deteccao de matricula reciclada: nome fortemente divergente OU nascimento
//    conflitante -> ambiguo (nunca funde duas criancas em "inalterado").
//  - Trava de planilha parcial: se >20% "sumiram", provavel planilha incompleta.
//  - So admin da propria instituicao. Nao persiste PII (dry-run e' stateless).
//  - Login so pra F2 (fundamental2); Infantil/F1 = carrier (rotulado na previa).
//
// CONTRATO COM O CLIENTE (Fase 3): a coluna matricula DEVE ser lida como TEXTO
// bruto do xlsx (raw:false / cellText), pra nao perder zeros a esquerda (I1).
// ============================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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

// ---- Tipos ----
interface RowInput {
  matricula?: string;
  nome?: string;
  sobrenome?: string;
  serie?: string;
  turma?: string;
  segmento?: string;
  data_nascimento?: string | number | null;
}
interface LiveProfile {
  id: string;
  matricula_externa: string | null;
  nome: string | null;
  sobrenome: string | null;
  full_name: string | null;
  serie: string | null;
  turma: string | null;
  segmento: string | null;
  data_nascimento: string | null;
}
type Escopo = "escola_inteira" | "segmento" | "serie";

// ---- Normalizacao ----
const PREPOSICOES = new Set(["de", "da", "do", "dos", "das", "e", "del", "di"]);
const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
function normMatricula(m?: string | number | null): string {
  // Matricula e' string: preserva zeros a esquerda (desde que o cliente envie
  // como texto - ver contrato I1). So tira espacos e caixa.
  return (m ?? "").toString().trim().toUpperCase();
}
function normSeg(s?: string | null): string {
  return semAcento((s ?? "").toString()).replace(/\s+/g, "").toLowerCase();
}
function normCampo(s?: string | null): string {
  return semAcento((s ?? "").toString()).replace(/\s+/g, " ").trim().toLowerCase();
}
// Data tolerante -> 'YYYY-MM-DD' ('' = desconhecida, nao vira sinal). Aceita
// 'YYYY-MM-DD', 'dd/mm/yyyy', 'dd-mm-yyyy' e serial numerico do Excel.
function normData(v?: string | number | null): string {
  if (v === null || v === undefined || v === "") return "";
  if (typeof v === "number") {
    const ms = Math.round((v - 25569) * 86400 * 1000); // serial Excel -> epoch
    const d = new Date(ms);
    return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
  }
  const s = String(v).trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return "";
}
function tokensNome(s?: string | null): Set<string> {
  const t = normCampo(s)
    .replace(/['´`]/g, "")
    .split(" ")
    .filter((p) => p.length >= 3 && !PREPOSICOES.has(p));
  return new Set(t);
}
// Jaccard dos tokens significativos do nome completo. Sem base (algum lado sem
// token) -> 1 (nao afirma divergencia).
function jaccardNome(a: string, b: string): number {
  const ta = tokensNome(a), tb = tokensNome(b);
  if (ta.size === 0 || tb.size === 0) return 1;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  const uniao = new Set([...ta, ...tb]).size;
  return uniao === 0 ? 1 : inter / uniao;
}
// Divergencia FORTE = menos de metade dos tokens em comum. Pega matricula
// reciclada ("Maria Silva" -> "Maria Souza": 1/3) sem punir correcao de nome
// ("Maria Silva" -> "Maria Silva Costa": 2/3).
const divergenciaForteNome = (a: string, b: string) => jaccardNome(a, b) < 0.5;

const SEGMENTOS_VALIDOS = new Set(["fundamental2", "fundamental1", "infantil"]);
const criaLogin = (segmento?: string | null) => normSeg(segmento) === "fundamental2";

function ehLinhaVazia(r: RowInput): boolean {
  return !normMatricula(r.matricula) && !normCampo(r.nome) && !normCampo(r.sobrenome) &&
    !normCampo(r.serie) && !normCampo(r.turma) && !normSeg(r.segmento);
}

// ---- Diff puro (a Fase 4 reusa a mesma logica de match) ----
export interface DiffLinha {
  linha: number;
  matricula: string;
  nome: string;
  profileId?: string;
  motivo?: string;
  criaLogin?: boolean;
  deltas?: Record<string, { de: string | null; para: string | null }>;
}
export interface DiffResult {
  novo: DiffLinha[];
  mudou: DiffLinha[];
  saiu: DiffLinha[];
  ambiguo: DiffLinha[];
  inalterados: number;
  resumo: {
    linhas_uteis: number;
    linhas_ignoradas_vazias: number;
    novos_f2_com_login: number;
    novos_carrier: number;
    ativos_no_escopo: number;
    sem_matricula_no_banco: number;
    matriculas_colidentes_no_banco: number;
  };
  alertas: { planilha_parcial: boolean; pct_sumiram: number };
}

export function computeDiff(rows: RowInput[], liveScoped: LiveProfile[]): DiffResult {
  const rowsUteis = rows.filter((r) => !ehLinhaVazia(r));
  const linhasVazias = rows.length - rowsUteis.length;

  const comMatricula = liveScoped.filter((p) => normMatricula(p.matricula_externa) !== "");
  const semMatricula = liveScoped.length - comMatricula.length;

  // I4: matriculas colidentes no PROPRIO banco (base suja). Nenhum dos gemeos
  // pode cair em "saiu" nem servir de alvo de match automatico -> revisao humana.
  const contMatBanco = new Map<string, number>();
  for (const p of comMatricula) {
    const m = normMatricula(p.matricula_externa);
    contMatBanco.set(m, (contMatBanco.get(m) ?? 0) + 1);
  }
  const colidentesBanco = new Set([...contMatBanco].filter(([, c]) => c > 1).map(([m]) => m));

  const liveByMat = new Map<string, LiveProfile>();
  for (const p of comMatricula) {
    const m = normMatricula(p.matricula_externa);
    if (!colidentesBanco.has(m)) liveByMat.set(m, p);
  }

  const matchedIds = new Set<string>();
  // Profiles de matricula colidente ja entram como "casados" pra nunca virar "saiu".
  for (const p of comMatricula) {
    if (colidentesBanco.has(normMatricula(p.matricula_externa))) matchedIds.add(p.id);
  }

  const contagemMatPlanilha = new Map<string, number>();
  for (const r of rowsUteis) {
    const m = normMatricula(r.matricula);
    if (m) contagemMatPlanilha.set(m, (contagemMatPlanilha.get(m) ?? 0) + 1);
  }

  const res: DiffResult = {
    novo: [], mudou: [], saiu: [], ambiguo: [], inalterados: 0,
    resumo: {
      linhas_uteis: rowsUteis.length,
      linhas_ignoradas_vazias: linhasVazias,
      novos_f2_com_login: 0, novos_carrier: 0,
      ativos_no_escopo: comMatricula.length,
      sem_matricula_no_banco: semMatricula,
      matriculas_colidentes_no_banco: colidentesBanco.size,
    },
    alertas: { planilha_parcial: false, pct_sumiram: 0 },
  };

  const matchCountPorProfile = new Map<string, number>();
  const pendentes: DiffLinha[] = []; // decididos apos anti-fusao

  rowsUteis.forEach((r, idx) => {
    const linha = idx + 1;
    const mat = normMatricula(r.matricula);
    const nomeExib = `${(r.nome ?? "").toString().trim()} ${(r.sobrenome ?? "").toString().trim()}`.trim();
    const base: DiffLinha = { linha, matricula: mat, nome: nomeExib };

    if (!mat) { res.ambiguo.push({ ...base, motivo: "sem_matricula" }); return; }

    // B1: matricula repetida na planilha. O aluno real correspondente NAO pode
    // cair em "saiu" so porque o admin digitou 2x.
    if ((contagemMatPlanilha.get(mat) ?? 0) > 1) {
      const profDup = liveByMat.get(mat);
      if (profDup) matchedIds.add(profDup.id);
      res.ambiguo.push({ ...base, motivo: "matricula_duplicada_na_planilha" });
      return;
    }

    // I4: matricula que colide no banco -> humano decide qual e' quem.
    if (colidentesBanco.has(mat)) {
      res.ambiguo.push({ ...base, motivo: "matricula_duplicada_no_banco" });
      return;
    }

    const prof = liveByMat.get(mat);
    if (!prof) {
      const seg = normSeg(r.segmento);
      if (!SEGMENTOS_VALIDOS.has(seg)) { res.ambiguo.push({ ...base, motivo: "segmento_desconhecido" }); return; }
      const login = criaLogin(r.segmento);
      res.novo.push({ ...base, criaLogin: login });
      if (login) res.resumo.novos_f2_com_login++; else res.resumo.novos_carrier++;
      return;
    }

    matchedIds.add(prof.id);
    matchCountPorProfile.set(prof.id, (matchCountPorProfile.get(prof.id) ?? 0) + 1);

    // B2: matricula reciclada? nome fortemente divergente OU nascimento conflitante.
    const nomeDb = prof.full_name ?? `${prof.nome ?? ""} ${prof.sobrenome ?? ""}`;
    const dobRow = normData(r.data_nascimento);
    const dobDb = normData(prof.data_nascimento);
    const dobConflita = !!(dobRow && dobDb && dobRow !== dobDb);
    if (dobConflita || divergenciaForteNome(nomeExib, nomeDb)) {
      pendentes.push({ ...base, profileId: prof.id, motivo: "matricula_reciclada_ou_erro" });
      return;
    }

    // Deltas (nome/sobrenome tambem, pra correcao de nome aparecer como "mudou",
    // nunca sumir em "inalterado"). Segmento compara com normSeg (I3).
    const deltas: Record<string, { de: string | null; para: string | null }> = {};
    const cmp = (campo: keyof RowInput, atual: string | null, norm: (s?: string | null) => string = normCampo) => {
      const novo = (r[campo] as string | undefined)?.toString().trim() || null;
      if (norm(novo) !== norm(atual)) deltas[campo] = { de: atual, para: novo };
    };
    cmp("nome", prof.nome);
    cmp("sobrenome", prof.sobrenome);
    cmp("serie", prof.serie);
    cmp("turma", prof.turma);
    cmp("segmento", prof.segmento, normSeg);
    if (Object.keys(deltas).length === 0) res.inalterados++;
    else pendentes.push({ ...base, profileId: prof.id, deltas });
  });

  // Anti-fusao (rede extra): profile casado por >1 linha -> todas ambiguo.
  for (const p of pendentes) {
    if (p.profileId && (matchCountPorProfile.get(p.profileId) ?? 0) > 1) {
      res.ambiguo.push({ ...p, deltas: undefined, motivo: "fusao_duas_linhas_mesmo_aluno" });
    } else if (p.motivo === "matricula_reciclada_ou_erro") {
      res.ambiguo.push(p);
    } else {
      res.mudou.push(p);
    }
  }

  // "Saiu": ativo COM matricula, nao colidente, que ninguem casou.
  for (const p of comMatricula) {
    if (!matchedIds.has(p.id)) {
      res.saiu.push({
        linha: 0,
        matricula: normMatricula(p.matricula_externa),
        nome: (p.full_name ?? `${p.nome ?? ""} ${p.sobrenome ?? ""}`).trim(),
        profileId: p.id,
      });
    }
  }

  const denom = comMatricula.length - colidentesBanco.size;
  const pct = denom > 0 ? res.saiu.length / denom : 0;
  res.alertas.pct_sumiram = Math.round(pct * 100);
  res.alertas.planilha_parcial = pct > 0.2;
  return res;
}

// ---- HTTP ----
Deno.serve(async (req: Request) => {
  const cors = corsFor(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // Auth: admin da propria instituicao (nunca confia no institutionId do corpo).
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Nao autorizado" }, 401);
    const { data: { user: caller }, error: authErr } =
      await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authErr || !caller) return json({ error: "Nao autorizado" }, 401);

    const { data: isAdmin } = await supabase
      .from("user_roles").select("role").eq("user_id", caller.id).eq("role", "admin").maybeSingle();
    if (!isAdmin) return json({ error: "Apenas administradores" }, 403);

    const { data: perfilCaller } = await supabase
      .from("profiles").select("institution_id").eq("id", caller.id).maybeSingle();
    const institutionId = perfilCaller?.institution_id;
    if (!institutionId) return json({ error: "Admin sem instituicao" }, 400);

    const body = await req.json() as { alunos?: RowInput[]; escopo?: Escopo; escopoValor?: string };
    const rows = Array.isArray(body.alunos) ? body.alunos : [];
    if (rows.length === 0) return json({ error: "Planilha vazia" }, 400);
    const escopo: Escopo = body.escopo ?? "escola_inteira";

    // Snapshot dos ATIVOS da instituicao; escopo filtrado em JS com normalizacao
    // (M2: casa 'Fundamental 2'/'5o Ano' com o valor do banco sem depender de caixa).
    const { data: liveAll, error: liveErr } = await supabase
      .from("profiles")
      .select("id, matricula_externa, nome, sobrenome, full_name, serie, turma, segmento, data_nascimento")
      .eq("institution_id", institutionId)
      .eq("status", "ativo");
    if (liveErr) return json({ error: "Falha ao ler a base", detalhe: liveErr.message }, 500);

    let liveScoped = (liveAll ?? []) as LiveProfile[];
    if (escopo === "segmento" && body.escopoValor) {
      const alvo = normSeg(body.escopoValor);
      liveScoped = liveScoped.filter((p) => normSeg(p.segmento) === alvo);
    }
    if (escopo === "serie" && body.escopoValor) {
      const alvo = normCampo(body.escopoValor);
      liveScoped = liveScoped.filter((p) => normCampo(p.serie) === alvo);
    }

    const diff = computeDiff(rows, liveScoped);
    return json({ ok: true, escopo, escopoValor: body.escopoValor ?? null, diff });
  } catch (e) {
    console.error("[reconciliar-alunos-dry-run] erro:", e);
    return json({ error: "Erro interno" }, 500);
  }
});
