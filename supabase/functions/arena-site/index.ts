// ============================================================
// arena-site — a leitura publica do site da Arena Arboria.
//
// E' a unica porta do site. Quem abre /arena nao faz login, nao carrega o app e
// nao fala com o banco: fala com esta funcao, que devolve um JSON pronto com os
// projetos e com links de midia assinados na hora.
//
// AS QUATRO REGRAS QUE VIERAM DO PARECER DE RISCOS (10/09/2026). Nenhuma delas
// e' estilo, todas sao o que impede a funcao de virar um oraculo de leitura
// sobre o Storage inteiro:
//  1. NAO RECEBE NADA. Sem caminho, sem id, sem filtro, sem busca. So GET. O
//     cliente nao escolhe o que a funcao le, e por isso nao ha o que injetar.
//  2. SO' LE'. Nenhuma escrita, e nunca repassa o Authorization que recebeu.
//  3. ASSINA POR 60 MINUTOS. Curto para o takedown valer rapido, longo para o
//     video de 2 minutos ser assistido com a pagina aberta ha' 50. Nunca 24h.
//  4. RESPOSTA no-store, para link assinado nao ficar preso em cache de CDN.
//
// A TRAVA. A funcao nasce FECHADA e devolve 503 enquanto o segredo
// ARENA_NO_AR nao valer '1'. Isso existe porque publicar esta' SUSPENSO ate'
// haver termo dos responsaveis, copia sanitizada e conferencia arquivo a
// arquivo. Um deploy distraido nao pode ser o que coloca crianca no ar: e'
// preciso ligar a trava de proposito, e ligar a trava e' a decisao de publicar.
//
// O QUE AINDA FALTA ANTES DE LIGAR (nao esta' aqui porque ainda nao existe):
//  - ler a TABELA DE PUBLICACAO em vez de varrer as entregas, para que so' o
//    que foi conferido apareca;
//  - apontar para o BUCKET DERIVADO com a copia sanitizada, e nao para a pasta
//    viva do aluno, que ele ainda pode trocar depois da conferencia.
// Enquanto isso nao existir, a trava fica desligada e a funcao roda so' local.
// ============================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const MISSAO_2FASE = "ddaf54d2-7781-4ab6-b3e7-2a54749329a5";
const BUCKET = "arena-2fase";
const VALIDADE_SEGUNDOS = 3600;

const ORIGENS_OK = [
  "https://arboria.escolaamadeus.com",
  "http://localhost:5173",
  "http://localhost:8080",
];

function cors(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  const allow = ORIGENS_OK.includes(origin) ? origin : ORIGENS_OK[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Vary": "Origin",
  };
}

// Os nomes dos projetos. Enquanto a tabela de publicacao nao existe, eles moram
// aqui e no src/pages/arena/titulos.ts, que e' a mesma lista. Quando a tabela
// existir, as duas copias somem juntas.
const FICHAS: Record<string, { numero: number; titulo: string }> = {
  "9224884e-15a1-4f5e-8c70-a51579910be6": { numero: 1, titulo: "Empire Box" },
  "b22a1bf4-31ed-429d-9cc7-31b10d450165": { numero: 2, titulo: "Caixa de Som Ecológica" },
  "3e2f6da9-d51f-4266-9ae2-cd23380eba80": { numero: 3, titulo: "Decoder: Terminal Lógico" },
  "bc3c4687-8877-40d3-bded-f34004cc7880": { numero: 4, titulo: "Metrô Sustentável" },
  "58c15371-af5d-4293-9982-eccf129c1685": { numero: 5, titulo: "ReMember" },
  "f96e6023-9bbe-4811-aaa9-e09bf562fe8a": { numero: 6, titulo: "O Caso do Policial Billy" },
  "474821f0-b13f-4ac2-a009-c9c6a7d774e4": { numero: 7, titulo: "PulsePay" },
  "0ff2ae29-0289-4991-949f-de458dd4d55f": { numero: 8, titulo: "Chacina na Fazenda" },
  "ae187cce-14b1-44bb-aaca-528639754fbe": { numero: 9, titulo: "Global Trade Coin" },
  "40578b2f-08b1-4d93-8aa4-ea66910d22d1": { numero: 10, titulo: "Projeto Pirólise" },
  "85eb8a94-b5f8-4c2b-8337-23fa444d6ac9": { numero: 11, titulo: "Song Maker" },
};

const CORES = [
  "34,211,238", "167,139,250", "245,184,75", "52,211,153",
  "251,113,133", "129,140,248", "94,224,208", "244,114,182",
];

interface Entrega { id: string; aluno_id: string; texto_resposta: string | null; created_at: string }
interface Alocacao { aluno_id: string; turma_id: string | null; papel_id: string; grupo: number | null }
interface Arquivo { entrega_id: string; nome_storage: string; tipo_arquivo: string }

function primeiraFrase(texto: string): string {
  const limpo = texto.replace(/\s+/g, " ").trim();
  const frases = limpo.split(/(?<=[.!?])\s+/);
  let frase = frases[0] ?? limpo;
  if (frase.length < 45 && frases[1]) frase = `${frase} ${frases[1]}`;
  if (frase.length > 190) frase = `${frase.slice(0, 187).trimEnd()}...`;
  return frase;
}

Deno.serve(async (req: Request) => {
  const cabecalhos = { ...cors(req), "Content-Type": "application/json", "Cache-Control": "no-store" };

  if (req.method === "OPTIONS") return new Response(null, { headers: cors(req) });
  // Regra 1 e 2: so' GET, e nada que o cliente mande e' lido.
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ erro: "metodo nao permitido" }), { status: 405, headers: cabecalhos });
  }

  // A trava. Fechada por padrao, de proposito.
  if (Deno.env.get("ARENA_NO_AR") !== "1") {
    return new Response(
      JSON.stringify({ erro: "A Arena ainda nao esta' no ar." }),
      { status: 503, headers: cabecalhos },
    );
  }

  try {
    // Em producao a plataforma injeta SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY
    // sozinha. Rodando na maquina, o CLI recusa segredo com prefixo SUPABASE_
    // no arquivo de ambiente, e por isso existem os dois nomes alternativos.
    const supabase = createClient(
      Deno.env.get("ARENA_SUPABASE_URL") ?? Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("ARENA_SERVICE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const { data: entregasRaw, error: e1 } = await supabase
      .from("entregas")
      .select("id, aluno_id, texto_resposta, created_at")
      .eq("missao_id", MISSAO_2FASE);
    if (e1) throw e1;
    const entregas = (entregasRaw ?? []) as Entrega[];
    if (entregas.length === 0) {
      return new Response(JSON.stringify({ projetos: [] }), { headers: cabecalhos });
    }

    const { data: alocRaw, error: e2 } = await supabase
      .from("capitulo_alocacoes")
      .select("aluno_id, turma_id, papel_id, grupo")
      .in("aluno_id", entregas.map((e) => e.aluno_id));
    if (e2) throw e2;
    const alocacoes = (alocRaw ?? []) as Alocacao[];

    const { data: arqRaw, error: e3 } = await supabase
      .from("entrega_arquivos")
      .select("entrega_id, nome_storage, tipo_arquivo")
      .in("entrega_id", entregas.map((e) => e.id));
    if (e3) throw e3;
    const arquivos = (arqRaw ?? []) as Arquivo[];

    const porEntrega = new Map<string, Arquivo[]>();
    for (const a of arquivos) {
      const lista = porEntrega.get(a.entrega_id) ?? [];
      lista.push(a);
      porEntrega.set(a.entrega_id, lista);
    }

    // A missao nao e' coletiva, entao um grupo pode ter enviado varias vezes.
    // Vence a entrega mais completa; empatou, vence a mais recente.
    const chave = new Map<string, string>();
    for (const a of alocacoes) {
      if (chave.has(a.aluno_id)) continue;
      chave.set(a.aluno_id, `${a.turma_id ?? "sem-turma"}::${a.papel_id}::${a.grupo ?? 0}`);
    }
    const vencedora = new Map<string, Entrega>();
    for (const e of entregas) {
      const k = chave.get(e.aluno_id);
      if (!k) continue;
      const atual = vencedora.get(k);
      if (!atual) { vencedora.set(k, e); continue; }
      const nNova = porEntrega.get(e.id)?.length ?? 0;
      const nAtual = porEntrega.get(atual.id)?.length ?? 0;
      if (nNova > nAtual || (nNova === nAtual && e.created_at > atual.created_at)) vencedora.set(k, e);
    }

    const escolhidas = [...vencedora.values()];
    const caminhos = escolhidas.flatMap((e) => (porEntrega.get(e.id) ?? []).map((a) => a.nome_storage));
    const url = new Map<string, string>();
    if (caminhos.length > 0) {
      const { data: assinadas, error: e4 } = await supabase
        .storage.from(BUCKET).createSignedUrls(caminhos, VALIDADE_SEGUNDOS);
      if (e4) throw e4;
      (assinadas ?? []).forEach((linha, i) => {
        if (linha?.signedUrl) url.set(caminhos[i], linha.signedUrl);
      });
    }

    const projetos = escolhidas.map((e) => {
      const meus = porEntrega.get(e.id) ?? [];
      const ficha = FICHAS[e.id];
      const capa = meus.find((a) => a.tipo_arquivo === "capa");
      const video = meus.find((a) => a.tipo_arquivo === "video");
      const texto = e.texto_resposta ?? "";
      return {
        numero: ficha?.numero ?? 0,
        // O id da entrega NAO vai para o cliente: e' identificador interno e o
        // site nao precisa dele para nada.
        titulo: ficha?.titulo ?? "Projeto sem nome cadastrado",
        gancho: primeiraFrase(texto),
        paragrafos: texto.split(/\n+/).map((p) => p.trim()).filter(Boolean),
        capa: capa ? url.get(capa.nome_storage) ?? null : null,
        portfolio: meus.filter((a) => a.tipo_arquivo === "portfolio")
          .map((a) => url.get(a.nome_storage)).filter(Boolean),
        video: video ? url.get(video.nome_storage) ?? null : null,
        cor: "",
      };
    });

    let proximo = Math.max(0, ...projetos.map((p) => p.numero));
    for (const p of projetos) if (p.numero === 0) p.numero = ++proximo;
    projetos.sort((a, b) => a.numero - b.numero);
    projetos.forEach((p, i) => { p.cor = CORES[i % CORES.length]; });

    return new Response(JSON.stringify({ projetos }), { headers: cabecalhos });
  } catch (erro) {
    console.error("arena-site falhou:", erro);
    return new Response(
      JSON.stringify({ erro: "nao foi possivel carregar os projetos" }),
      { status: 500, headers: cabecalhos },
    );
  }
});
