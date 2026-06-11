// Edge Function: cria um aluno manualmente (vindo do painel admin).
// Reusa as convenções do sync-alunos-pull:
//   - email: nome.sobrenome@aluno.arboria.com (com sufixo 2,3.. se já existir)
//   - senha: sobrenome normalizado + '123'
//   - role 'user' em user_roles
//   - inteligencia_scores inicializados em 35 pra 8 IMs
// Vincula também à turma escolhida (aluno_turma).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface Payload {
  nome: string;
  sobrenome: string;
  serie: string;        // ex: "6º Ano"
  turma_letra: string;  // ex: "A"
  casa_id?: number | null;
  institution_id: string;
  segmento?: string;    // default: "fundamental2"
}

// Normaliza sobrenome pra senha (sem acentos/apóstrofes/espaços, lowercase)
function normalizeSobrenome(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['`]/g, '')
    .replace(/\s+/g, '')
    .toLowerCase()
    .trim();
}

// Gera o local-part do email a partir do primeiro nome + primeiro sobrenome
function gerarEmail(nome: string, sobrenome: string, suffix?: number): string {
  const normalizar = (str: string) => str
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z]/g, '')
    .toLowerCase();

  const primeiroNome = normalizar(nome.trim().split(' ')[0]);
  const primeiroSobrenome = normalizar(sobrenome.trim().split(' ')[0]);
  const suf = suffix && suffix > 1 ? String(suffix) : '';
  return `${primeiroNome}.${primeiroSobrenome}${suf}@aluno.arboria.com`;
}

// Tenta criar o user; se o email já existir (mesma estratégia do sync-alunos-pull,
// que confia no erro do createUser e não no listUsers), tenta com sufixo 2, 3...
async function criarUserComEmailUnico(
  admin: any, nome: string, sobrenome: string, senha: string, userMetadata: Record<string, unknown>,
): Promise<{ userId: string; email: string }> {
  for (let i = 1; i <= 50; i++) {
    const email = gerarEmail(nome, sobrenome, i);
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      user_metadata: userMetadata,
    });
    if (created?.user) return { userId: created.user.id, email };
    if (createErr?.message?.includes('already been registered')) continue;
    throw new Error(createErr?.message || 'Falha ao criar usuário');
  }
  throw new Error('Muitos alunos com o mesmo nome — limite de sufixos atingido');
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Método não permitido' }), {
        status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1) Valida token do chamador e que é admin
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const authHeader = req.headers.get('Authorization') || '';
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: caller } = await callerClient.auth.getUser();
    if (!caller?.user) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: callerRoles } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.user.id);
    const isAdmin = (callerRoles ?? []).some((r: any) => r.role === 'admin');
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Apenas admin pode cadastrar alunos' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2) Valida payload
    const body = (await req.json()) as Payload;
    const nome = body.nome?.trim();
    const sobrenome = body.sobrenome?.trim();
    const serie = body.serie?.trim();
    const turmaLetra = body.turma_letra?.trim().toUpperCase();
    const institutionId = body.institution_id?.trim();
    const segmento = body.segmento?.trim() || 'fundamental2';
    const casaId = body.casa_id ?? null;

    if (!nome || !sobrenome || !serie || !turmaLetra || !institutionId) {
      return new Response(JSON.stringify({
        error: 'Campos obrigatórios: nome, sobrenome, serie, turma_letra, institution_id',
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const senhaBase = normalizeSobrenome(sobrenome);
    if (senhaBase.length < 3) {
      return new Response(JSON.stringify({ error: 'Sobrenome muito curto pra gerar senha' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const senha = senhaBase + '123';
    const fullName = `${nome} ${sobrenome}`;

    // 3) Confirma que a turma existe
    const { data: turma, error: turmaErr } = await admin
      .from('turmas')
      .select('id')
      .eq('institution_id', institutionId)
      .eq('serie', serie)
      .eq('turma_letra', turmaLetra)
      .maybeSingle();

    if (turmaErr || !turma) {
      return new Response(JSON.stringify({
        error: `Turma "${serie} ${turmaLetra}" não encontrada na instituição.`,
      }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 4) Cria o user com email único (sufixo automático em caso de colisão)
    const { userId, email } = await criarUserComEmailUnico(admin, nome, sobrenome, senha, {
      nome, sobrenome, full_name: fullName,
      institution_id: institutionId, serie, turma: turmaLetra,
      must_change_password: true,
    });

    // 5) Atualiza profile (o trigger handle_new_user costuma criar; aqui garantimos os campos)
    const { error: profErr } = await admin.from('profiles').update({
      nome, sobrenome, full_name: fullName,
      institution_id: institutionId,
      serie, turma: turmaLetra,
      segmento,
      casa_id: casaId,
      must_change_password: true,
    }).eq('id', userId);
    if (profErr) {
      console.warn('[create-aluno-manual] profile update warning:', profErr.message);
    }

    // 6) Role 'user'
    await admin.from('user_roles').upsert(
      { user_id: userId, role: 'user' },
      { onConflict: 'user_id,role', ignoreDuplicates: true },
    );

    // 7) Vínculo aluno_turma
    const { error: vincErr } = await admin.from('aluno_turma').insert({
      aluno_id: userId, turma_id: turma.id, ativo: true,
    });
    if (vincErr) {
      console.warn('[create-aluno-manual] aluno_turma insert warning:', vincErr.message);
    }

    // 7b) Capítulos com missões liberadas pra turma: aluno novo entra na menor
    // delegação existente, pra já receber as missões ativas de delegação.
    // (Missões por papel continuam exclusivas de quem tem o papel alocado.)
    const { data: capitulosAtivos } = await admin
      .from('capitulo_turma_config')
      .select('capitulo_id, missoes_data_prazo')
      .eq('turma_id', turma.id)
      .not('missoes_liberadas_em', 'is', null);

    for (const cap of capitulosAtivos ?? []) {
      if (cap.missoes_data_prazo && new Date(cap.missoes_data_prazo) < new Date()) continue;
      const { data: membros } = await admin
        .from('capitulo_delegacao_membros')
        .select('delegacao_codigo')
        .eq('capitulo_id', cap.capitulo_id)
        .eq('turma_id', turma.id);
      if (!membros?.length) continue;
      const contagem: Record<string, number> = {};
      for (const m of membros) contagem[m.delegacao_codigo] = (contagem[m.delegacao_codigo] || 0) + 1;
      const menorDelegacao = Object.entries(contagem).sort((a, b) => a[1] - b[1])[0][0];
      const { error: delegErr } = await admin.from('capitulo_delegacao_membros').insert({
        capitulo_id: cap.capitulo_id,
        turma_id: turma.id,
        delegacao_codigo: menorDelegacao,
        aluno_id: userId,
      });
      if (delegErr) {
        console.warn('[create-aluno-manual] delegacao insert warning:', delegErr.message);
      }
    }

    // 8) Inteligencia scores iniciais
    const anoLetivo = new Date().getFullYear();
    for (let imId = 1; imId <= 8; imId++) {
      await admin.from('inteligencia_scores').upsert({
        aluno_id: userId,
        inteligencia_id: imId,
        score_atual: 35.00,
        ano_letivo: anoLetivo,
      }, { onConflict: 'aluno_id,inteligencia_id,ano_letivo', ignoreDuplicates: true });
    }

    return new Response(JSON.stringify({
      success: true,
      aluno_id: userId,
      email,
      senha,
      full_name: fullName,
      turma: `${serie} ${turmaLetra}`,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    console.error('[create-aluno-manual] erro:', err);
    return new Response(JSON.stringify({ error: err?.message || 'Erro inesperado' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
