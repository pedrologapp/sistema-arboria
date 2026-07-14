import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// =============================================================
// ADMIN COORDENADORES: cria e gerencia contas de COORDENADOR e as
// concessoes de segmento (coordenador_segmento). SO o dono da plataforma
// (super_admin) opera esta funcao.
//
// Espelha o mecanismo de criacao de conta do admin-logins-professor:
// a conta nasce pela Auth admin API (senha criptografada pelo Supabase),
// depois profile + user_roles. A senha NUNCA e persistida em texto puro:
// e devolvida uma vez no corpo da resposta pra ser mostrada na tela.
//
// A escrita de coordenador_segmento e de user_roles so acontece aqui, sob
// verificacao de super_admin. A RLS da tabela ja restringe a escrita ao
// super_admin; esta funcao usa service role e portanto reimpoe a checagem.
// =============================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const SEGMENTOS_VALIDOS = ['infantil', 'fundamental1', 'fundamental2'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Autenticacao
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return jsonResponse({ error: 'Nao autorizado' }, 401);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !caller) return jsonResponse({ error: 'Nao autorizado' }, 401);

    // SO super_admin. A gestao de coordenador e do dono da plataforma.
    const { data: callerRoles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id)
      .eq('role', 'super_admin');
    if (!callerRoles || callerRoles.length === 0) {
      return jsonResponse({ error: 'Apenas o super administrador pode gerenciar coordenadores' }, 403);
    }

    const body = await req.json();
    const acao = body?.acao as string;

    // Helper: valida que o alvo e um COORDENADOR (nunca admin/super_admin/professor).
    const validarAlvoCoordenador = async (userId: string): Promise<Response | null> => {
      const { data: alvoRoles } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);
      const roles = (alvoRoles || []).map((r) => r.role);
      if (roles.includes('admin') || roles.includes('super_admin')) {
        return jsonResponse({ error: 'Nao e permitido gerenciar esta conta' }, 403);
      }
      if (!roles.includes('coordenador')) {
        return jsonResponse({ error: 'A conta alvo nao e um coordenador' }, 403);
      }
      return null;
    };

    // ============ LISTAR INSTITUICOES ============
    if (acao === 'listar_instituicoes') {
      const { data, error } = await supabaseAdmin
        .from('institutions')
        .select('id, name')
        .order('name');
      if (error) return jsonResponse({ error: error.message }, 500);
      return jsonResponse({ instituicoes: data || [] });
    }

    // ============ LISTAR COORDENADORES ============
    // Escopo por instituicao escolhida: coordenadores com ao menos uma concessao
    // (ativa ou nao) naquela instituicao, com todos os segmentos daquela escola.
    if (acao === 'listar') {
      const { institutionId } = body as { institutionId?: string };
      if (!institutionId) return jsonResponse({ error: 'Escolha a instituicao' }, 400);

      const { data: concessoes, error: concError } = await supabaseAdmin
        .from('coordenador_segmento')
        .select('coordenador_id, segmento, ativo')
        .eq('institution_id', institutionId);
      if (concError) return jsonResponse({ error: `concessoes: ${concError.message}` }, 500);

      const coordIds = [...new Set((concessoes || []).map((c) => c.coordenador_id))];
      if (coordIds.length === 0) return jsonResponse({ coordenadores: [] });

      // So mantem quem realmente tem o papel coordenador.
      const { data: roles } = await supabaseAdmin
        .from('user_roles')
        .select('user_id')
        .eq('role', 'coordenador')
        .in('user_id', coordIds);
      const comPapel = new Set((roles || []).map((r) => r.user_id));

      const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('id, nome, full_name')
        .in('id', coordIds);
      const nomeMap = new Map((profiles || []).map((p) => [p.id, p.full_name || p.nome || '']));

      // Email + status de bloqueio (um getUserById por coordenador)
      const emailResults = await Promise.all(
        coordIds.map(async (id) => {
          const { data: u } = await supabaseAdmin.auth.admin.getUserById(id);
          return {
            id,
            email: u?.user?.email ?? '',
            bannedUntil: (u?.user as { banned_until?: string } | undefined)?.banned_until ?? null,
          };
        })
      );
      const agora = new Date();
      const emailMap = new Map(
        emailResults.map((e) => [
          e.id,
          {
            email: e.email,
            bloqueado: !!(e.bannedUntil && new Date(e.bannedUntil) > agora),
          },
        ])
      );

      const coordenadores = coordIds
        .filter((id) => comPapel.has(id))
        .map((id) => {
          const authInfo = emailMap.get(id);
          const segmentos = (concessoes || [])
            .filter((c) => c.coordenador_id === id)
            .map((c) => ({ segmento: c.segmento, ativo: c.ativo }));
          return {
            userId: id,
            nome: nomeMap.get(id) || '',
            email: authInfo?.email ?? '',
            bloqueado: authInfo?.bloqueado ?? false,
            segmentos,
          };
        });

      return jsonResponse({ coordenadores });
    }

    // ============ CRIAR COORDENADOR ============
    // Conta no Auth + profile + role coordenador + uma linha de concessao por
    // segmento marcado (created_by = caller.id).
    if (acao === 'criar') {
      const { email, senha, nomeExibicao, institutionId, segmentos } = body as {
        email?: string; senha?: string; nomeExibicao?: string;
        institutionId?: string; segmentos?: string[];
      };

      if (!email || !senha || !nomeExibicao || !institutionId || !segmentos || segmentos.length === 0) {
        return jsonResponse({ error: 'Campos obrigatorios: email, senha, nome, instituicao e ao menos um segmento' }, 400);
      }
      if (!/^[a-z0-9._+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(email)) {
        return jsonResponse({ error: 'Email invalido' }, 400);
      }
      if (senha.length < 8) {
        return jsonResponse({ error: 'A senha deve ter pelo menos 8 caracteres' }, 400);
      }
      const segsLimpos = [...new Set(segmentos)];
      if (segsLimpos.some((s) => !SEGMENTOS_VALIDOS.includes(s))) {
        return jsonResponse({ error: 'Segmento invalido' }, 400);
      }

      // A instituicao precisa existir.
      const { data: inst } = await supabaseAdmin
        .from('institutions')
        .select('id')
        .eq('id', institutionId)
        .maybeSingle();
      if (!inst) return jsonResponse({ error: 'Instituicao nao encontrada' }, 400);

      console.log(`[admin-coordenadores] Criando coordenador ${email} em ${institutionId} com ${segsLimpos.length} segmento(s)`);

      // 1. Conta no Auth
      const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: senha,
        email_confirm: true,
        user_metadata: { full_name: nomeExibicao },
      });
      if (createError) {
        const msg = /already|registered|exists/i.test(createError.message)
          ? 'Este email ja esta em uso'
          : createError.message;
        return jsonResponse({ error: msg }, 400);
      }
      const userId = authData.user.id;

      // Desfaz a conta recem-criada se qualquer passo seguinte falhar.
      const rollback = async () => {
        await supabaseAdmin.from('coordenador_segmento').delete().eq('coordenador_id', userId);
        await supabaseAdmin.auth.admin.deleteUser(userId);
      };

      // 2. Profile (criado pelo trigger handle_new_user)
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({
          nome: nomeExibicao,
          full_name: nomeExibicao,
          institution_id: institutionId,
          conta_criada: true,
        })
        .eq('id', userId);
      if (profileError) {
        await rollback();
        return jsonResponse({ error: `Falha ao salvar o perfil: ${profileError.message}` }, 500);
      }

      // 3. Role coordenador
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .insert({ user_id: userId, role: 'coordenador' });
      if (roleError) {
        await rollback();
        return jsonResponse({ error: `Falha ao definir a funcao de coordenador: ${roleError.message}` }, 500);
      }

      // 4. Concessoes de segmento (uma linha por segmento)
      const linhas = segsLimpos.map((segmento) => ({
        coordenador_id: userId,
        institution_id: institutionId,
        segmento,
        ativo: true,
        created_by: caller.id,
      }));
      const { error: concError } = await supabaseAdmin.from('coordenador_segmento').insert(linhas);
      if (concError) {
        await rollback();
        return jsonResponse({ error: `Falha ao atribuir os segmentos: ${concError.message}` }, 500);
      }

      console.log(`[admin-coordenadores] Coordenador criado: ${userId}`);
      return jsonResponse({ success: true, userId, email, nomeExibicao, segmentos: segsLimpos });
    }

    // ============ ALTERNAR SEGMENTO (adicionar/remover/reativar) ============
    // Upsert por (coordenador, instituicao, segmento): se a concessao existe,
    // ajusta o campo ativo; se nao, cria com created_by = caller.id.
    if (acao === 'toggle_segmento') {
      const { userId, institutionId, segmento, ativo } = body as {
        userId?: string; institutionId?: string; segmento?: string; ativo?: boolean;
      };
      if (!userId || !institutionId || !segmento || typeof ativo !== 'boolean') {
        return jsonResponse({ error: 'Campos obrigatorios: userId, institutionId, segmento, ativo' }, 400);
      }
      if (!SEGMENTOS_VALIDOS.includes(segmento)) {
        return jsonResponse({ error: 'Segmento invalido' }, 400);
      }
      const alvoInvalido = await validarAlvoCoordenador(userId);
      if (alvoInvalido) return alvoInvalido;

      const { data: existente } = await supabaseAdmin
        .from('coordenador_segmento')
        .select('id')
        .eq('coordenador_id', userId)
        .eq('institution_id', institutionId)
        .eq('segmento', segmento)
        .maybeSingle();

      if (existente) {
        const { error } = await supabaseAdmin
          .from('coordenador_segmento')
          .update({ ativo })
          .eq('id', existente.id);
        if (error) return jsonResponse({ error: `Falha ao atualizar o segmento: ${error.message}` }, 500);
      } else {
        const { error } = await supabaseAdmin
          .from('coordenador_segmento')
          .insert({
            coordenador_id: userId,
            institution_id: institutionId,
            segmento,
            ativo,
            created_by: caller.id,
          });
        if (error) return jsonResponse({ error: `Falha ao criar o segmento: ${error.message}` }, 500);
      }

      console.log(`[admin-coordenadores] Segmento ${segmento}=${ativo} para ${userId}`);
      return jsonResponse({ success: true });
    }

    // ============ DESATIVAR COORDENADOR ============
    // Bloqueia o login e encerra todas as concessoes. Nunca deleta a conta
    // (paridade com a doutrina de nao perder historico/vinculos).
    if (acao === 'desativar') {
      const { userId } = body as { userId?: string };
      if (!userId) return jsonResponse({ error: 'Campo obrigatorio: userId' }, 400);

      const alvoInvalido = await validarAlvoCoordenador(userId);
      if (alvoInvalido) return alvoInvalido;

      const { error: concError } = await supabaseAdmin
        .from('coordenador_segmento')
        .update({ ativo: false })
        .eq('coordenador_id', userId);
      if (concError) return jsonResponse({ error: `Falha ao encerrar concessoes: ${concError.message}` }, 500);

      const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        ban_duration: '87600h',
      });
      if (banError) return jsonResponse({ error: `Falha ao bloquear o login: ${banError.message}` }, 500);

      console.log(`[admin-coordenadores] Coordenador desativado: ${userId}`);
      return jsonResponse({ success: true });
    }

    return jsonResponse({ error: `Acao desconhecida: ${acao}` }, 400);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[admin-coordenadores] Erro inesperado:', error);
    return jsonResponse({ error: errorMessage }, 500);
  }
});
