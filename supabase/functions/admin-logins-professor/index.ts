import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

interface TurmaInfo {
  id: string;
  nome: string;
  serie: string;
  turma_letra: string;
  segmento: string | null;
  institution_id: string;
}

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

    // Verificar autenticacao
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'Nao autorizado' }, 401);
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !caller) {
      return jsonResponse({ error: 'Nao autorizado' }, 401);
    }

    // Verificar se e admin ou super_admin
    const { data: callerRoles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id)
      .in('role', ['admin', 'super_admin']);

    if (!callerRoles || callerRoles.length === 0) {
      return jsonResponse({ error: 'Apenas administradores podem gerenciar logins de professores' }, 403);
    }

    // Instituicao do admin que chamou
    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('institution_id')
      .eq('id', caller.id)
      .single();

    const callerInstitutionId = callerProfile?.institution_id ?? null;

    const body = await req.json();
    const acao = body?.acao as string;
    const anoLetivo = new Date().getFullYear();

    // Helper: busca turmas por ids preservando a ordem enviada.
    // So retorna turmas da instituicao do admin chamador (isolamento multi-escola).
    const buscarTurmasOrdenadas = async (turmaIds: string[]): Promise<TurmaInfo[]> => {
      let query = supabaseAdmin
        .from('turmas')
        .select('id, nome, serie, turma_letra, segmento, institution_id')
        .in('id', turmaIds);
      if (callerInstitutionId) {
        query = query.eq('institution_id', callerInstitutionId);
      }
      const { data, error } = await query;
      if (error) throw new Error(`Erro ao buscar turmas: ${error.message}`);
      const map = new Map((data || []).map((t: TurmaInfo) => [t.id, t]));
      return turmaIds.map((id) => map.get(id)).filter(Boolean) as TurmaInfo[];
    };

    // Helper: valida que o alvo de resetar/desativar/vincular e um professor
    // da MESMA instituicao do admin, e nunca um admin/super_admin (anti-takeover).
    // Retorna null se ok, ou uma Response de erro pronta.
    const validarAlvoProfessor = async (userId: string): Promise<Response | null> => {
      const { data: alvoRoles } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);
      const roles = (alvoRoles || []).map((r) => r.role);
      if (roles.includes('admin') || roles.includes('super_admin')) {
        return jsonResponse({ error: 'Nao e permitido gerenciar esta conta' }, 403);
      }
      if (!roles.includes('professor')) {
        return jsonResponse({ error: 'A conta alvo nao e um professor' }, 403);
      }
      const { data: alvoProfile } = await supabaseAdmin
        .from('profiles')
        .select('institution_id')
        .eq('id', userId)
        .single();
      if (callerInstitutionId && alvoProfile?.institution_id !== callerInstitutionId) {
        return jsonResponse({ error: 'Este professor pertence a outra instituicao' }, 403);
      }
      return null;
    };

    // ============ LISTAR INSTITUICOES ============
    // O dono (super_admin) escolhe a instituicao antes de gerar logins.
    // Admin de escola so ve a propria.
    if (acao === 'listar_instituicoes') {
      let query = supabaseAdmin.from('institutions').select('id, name').order('name');
      if (callerInstitutionId) {
        query = query.eq('id', callerInstitutionId);
      }
      const { data, error } = await query;
      if (error) return jsonResponse({ error: error.message }, 500);
      return jsonResponse({ instituicoes: data || [] });
    }

    // ============ LISTAR TURMAS (pro seletor) ============
    // Via service role: contorna a RLS de turmas (que exige institution do usuario),
    // permitindo o dono (super_admin, sem institution) enxergar as turmas da escola.
    // Aceita institutionId opcional (a escola escolhida pelo dono no passo 1).
    if (acao === 'listar_turmas') {
      const { institutionId: instFiltro } = body as { institutionId?: string };
      const alvoInst = callerInstitutionId ?? instFiltro ?? null;
      let query = supabaseAdmin
        .from('turmas')
        .select('id, nome, serie, turma_letra, segmento')
        .order('serie')
        .order('turma_letra');
      if (alvoInst) {
        query = query.eq('institution_id', alvoInst);
      }
      const { data, error } = await query;
      if (error) return jsonResponse({ error: error.message }, 500);
      return jsonResponse({ turmas: data || [] });
    }

    // ============ CRIAR TURMA ============
    // Acrescentar uma turma nova (ex.: serie que ganhou uma turma D).
    if (acao === 'criar_turma') {
      const { institutionId: instTurma, serie, turma_letra, segmento } = body as {
        institutionId?: string; serie?: string; turma_letra?: string; segmento?: string;
      };
      const alvoInst = callerInstitutionId ?? instTurma ?? null;
      if (!alvoInst) return jsonResponse({ error: 'Escolha a instituicao da turma' }, 400);
      if (!serie?.trim() || !turma_letra?.trim()) {
        return jsonResponse({ error: 'Informe a serie e a letra da turma' }, 400);
      }
      const serieLimpa = serie.trim();
      const letraLimpa = turma_letra.trim().toUpperCase();
      // Ja existe essa turma?
      const { data: existente } = await supabaseAdmin
        .from('turmas')
        .select('id')
        .eq('institution_id', alvoInst)
        .eq('serie', serieLimpa)
        .eq('turma_letra', letraLimpa)
        .maybeSingle();
      if (existente) return jsonResponse({ error: 'Essa turma ja existe' }, 400);

      const { data: nova, error } = await supabaseAdmin
        .from('turmas')
        .insert({
          institution_id: alvoInst,
          nome: `${serieLimpa} ${letraLimpa}`,
          serie: serieLimpa,
          turma_letra: letraLimpa,
          segmento: segmento || null,
          ano_letivo: new Date().getFullYear(),
          ativo: true,
        })
        .select('id, nome, serie, turma_letra, segmento')
        .single();
      if (error) return jsonResponse({ error: error.message }, 500);
      return jsonResponse({ turma: nova });
    }

    // ============ LISTAR ============
    if (acao === 'listar') {
      // Usuarios com role professor
      const { data: roles, error: rolesError } = await supabaseAdmin
        .from('user_roles')
        .select('user_id')
        .eq('role', 'professor');
      if (rolesError) return jsonResponse({ error: rolesError.message }, 500);

      const professorIds = (roles || []).map((r) => r.user_id);
      if (professorIds.length === 0) return jsonResponse({ logins: [] });

      // Perfis da instituicao do admin
      let profilesQuery = supabaseAdmin
        .from('profiles')
        .select('id, nome, full_name, segmento, institution_id')
        .in('id', professorIds);
      if (callerInstitutionId) {
        profilesQuery = profilesQuery.eq('institution_id', callerInstitutionId);
      }
      const { data: profiles, error: profilesError } = await profilesQuery;
      if (profilesError) return jsonResponse({ error: profilesError.message }, 500);

      const idsDaInstituicao = (profiles || []).map((p) => p.id);
      if (idsDaInstituicao.length === 0) return jsonResponse({ logins: [] });

      // Vinculos ativos com turmas
      const { data: vinculos, error: vinculosError } = await supabaseAdmin
        .from('professor_turma')
        .select('professor_id, turma_id, ativo, turmas(id, nome, serie, turma_letra, segmento)')
        .in('professor_id', idsDaInstituicao)
        .eq('ativo', true);
      if (vinculosError) return jsonResponse({ error: vinculosError.message }, 500);

      // Emails e status de bloqueio via Auth Admin (paginado)
      const emailMap = new Map<string, { email: string; bannedUntil: string | null }>();
      let page = 1;
      const perPage = 1000;
      while (true) {
        const { data: usersPage, error: listError } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
        if (listError) return jsonResponse({ error: listError.message }, 500);
        for (const u of usersPage.users) {
          emailMap.set(u.id, {
            email: u.email ?? '',
            bannedUntil: (u as { banned_until?: string }).banned_until ?? null,
          });
        }
        if (usersPage.users.length < perPage) break;
        page++;
      }

      const agora = new Date();
      const logins = (profiles || []).map((p) => {
        const authInfo = emailMap.get(p.id);
        const bannedUntil = authInfo?.bannedUntil ? new Date(authInfo.bannedUntil) : null;
        const turmasDoProfessor = (vinculos || [])
          .filter((v) => v.professor_id === p.id && v.turmas)
          .map((v) => v.turmas as unknown as TurmaInfo);
        return {
          userId: p.id,
          email: authInfo?.email ?? '',
          nomeExibicao: p.full_name || p.nome || '',
          segmento: p.segmento,
          bloqueado: !!(bannedUntil && bannedUntil > agora),
          turmas: turmasDoProfessor.map((t) => ({
            id: t.id,
            nome: t.nome,
            serie: t.serie,
            turma_letra: t.turma_letra,
            segmento: t.segmento,
          })),
        };
      });

      return jsonResponse({ logins });
    }

    // ============ CRIAR ============
    if (acao === 'criar') {
      const { email, senha, nomeExibicao, turmaIds } = body as {
        email?: string; senha?: string; nomeExibicao?: string; turmaIds?: string[];
      };

      if (!email || !senha || !nomeExibicao || !turmaIds || turmaIds.length === 0) {
        return jsonResponse({ error: 'Campos obrigatorios: email, senha, nomeExibicao, turmaIds' }, 400);
      }
      if (!/^[a-z0-9._+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(email)) {
        return jsonResponse({ error: 'Email invalido' }, 400);
      }
      if (!/@arboria\.com$/i.test(email)) {
        return jsonResponse({ error: 'O email deve terminar com @arboria.com' }, 400);
      }
      if (senha.length < 8) {
        return jsonResponse({ error: 'A senha deve ter pelo menos 8 caracteres' }, 400);
      }

      const turmasSelecionadas = await buscarTurmasOrdenadas(turmaIds);
      if (turmasSelecionadas.length !== turmaIds.length) {
        return jsonResponse({ error: 'Uma ou mais turmas nao foram encontradas nesta instituicao' }, 400);
      }

      // A instituicao do novo professor e a do admin chamador, nunca a da turma.
      const institutionId = callerInstitutionId ?? turmasSelecionadas[0].institution_id;
      const segmento = turmasSelecionadas[0].segmento;

      console.log(`[admin-logins-professor] Criando login ${email} com ${turmaIds.length} turma(s)`);

      // 1. Criar usuario no Auth
      const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: senha,
        email_confirm: true,
        user_metadata: { full_name: nomeExibicao },
      });

      if (createError) {
        console.error('[admin-logins-professor] Erro no Auth:', createError);
        const msg = /already|registered|exists/i.test(createError.message)
          ? 'Este email ja esta em uso'
          : createError.message;
        return jsonResponse({ error: msg }, 400);
      }

      const userId = authData.user.id;

      // Desfaz a conta recem-criada se qualquer passo seguinte falhar,
      // evitando usuario orfao no Auth (que travaria o email numa nova tentativa).
      const rollback = async () => {
        await supabaseAdmin.auth.admin.deleteUser(userId);
      };

      // 2. Atualizar profile (criado pelo trigger handle_new_user)
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({
          nome: nomeExibicao,
          full_name: nomeExibicao,
          institution_id: institutionId,
          segmento,
          conta_criada: true,
        })
        .eq('id', userId);

      if (profileError) {
        console.error('[admin-logins-professor] Erro no profile:', profileError);
        await rollback();
        return jsonResponse({ error: `Falha ao salvar o perfil: ${profileError.message}` }, 500);
      }

      // 3. Role professor
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .insert({ user_id: userId, role: 'professor' });

      if (roleError) {
        console.error('[admin-logins-professor] Erro na role:', roleError);
        await rollback();
        return jsonResponse({ error: `Falha ao definir a funcao de professor: ${roleError.message}` }, 500);
      }

      // 4. Vinculos com as turmas
      const links = turmasSelecionadas.map((t) => ({
        professor_id: userId,
        turma_id: t.id,
        institution_id: t.institution_id,
        ano_letivo: anoLetivo,
        eh_regente: true,
        ativo: true,
      }));

      const { error: turmaError } = await supabaseAdmin.from('professor_turma').insert(links);

      if (turmaError) {
        console.error('[admin-logins-professor] Erro no vinculo de turmas:', turmaError);
        await rollback();
        return jsonResponse({ error: `Falha ao vincular turmas: ${turmaError.message}` }, 500);
      }

      console.log(`[admin-logins-professor] Login criado: ${userId}`);
      return jsonResponse({
        success: true,
        userId,
        email,
        nomeExibicao,
        turmas: turmasSelecionadas.map((t) => t.nome || `${t.serie} ${t.turma_letra}`),
      });
    }

    // ============ VINCULAR (substituir conjunto de turmas) ============
    if (acao === 'vincular') {
      const { userId, turmaIds } = body as { userId?: string; turmaIds?: string[] };

      if (!userId || !turmaIds || turmaIds.length === 0) {
        return jsonResponse({ error: 'Campos obrigatorios: userId, turmaIds' }, 400);
      }

      const alvoInvalido = await validarAlvoProfessor(userId);
      if (alvoInvalido) return alvoInvalido;

      const turmasSelecionadas = await buscarTurmasOrdenadas(turmaIds);
      if (turmasSelecionadas.length !== turmaIds.length) {
        return jsonResponse({ error: 'Uma ou mais turmas nao foram encontradas' }, 400);
      }

      // Vinculos existentes (ativos e inativos) do professor
      const { data: existentes, error: existentesError } = await supabaseAdmin
        .from('professor_turma')
        .select('id, turma_id, ativo')
        .eq('professor_id', userId);
      if (existentesError) return jsonResponse({ error: existentesError.message }, 500);

      const desejadas = new Set(turmaIds);
      const existentesMap = new Map((existentes || []).map((v) => [v.turma_id, v]));

      // Desativar os que sairam
      const idsParaDesativar = (existentes || [])
        .filter((v) => v.ativo && !desejadas.has(v.turma_id))
        .map((v) => v.id);
      if (idsParaDesativar.length > 0) {
        const { error } = await supabaseAdmin
          .from('professor_turma')
          .update({ ativo: false })
          .in('id', idsParaDesativar);
        if (error) return jsonResponse({ error: `Falha ao desativar vinculos: ${error.message}` }, 500);
      }

      // Reativar os que voltaram
      const idsParaReativar = (existentes || [])
        .filter((v) => !v.ativo && desejadas.has(v.turma_id))
        .map((v) => v.id);
      if (idsParaReativar.length > 0) {
        const { error } = await supabaseAdmin
          .from('professor_turma')
          .update({ ativo: true, ano_letivo: anoLetivo })
          .in('id', idsParaReativar);
        if (error) return jsonResponse({ error: `Falha ao reativar vinculos: ${error.message}` }, 500);
      }

      // Criar os novos
      const novos = turmasSelecionadas.filter((t) => !existentesMap.has(t.id));
      if (novos.length > 0) {
        const { error } = await supabaseAdmin.from('professor_turma').insert(
          novos.map((t) => ({
            professor_id: userId,
            turma_id: t.id,
            institution_id: t.institution_id,
            ano_letivo: anoLetivo,
            eh_regente: true,
            ativo: true,
          }))
        );
        if (error) return jsonResponse({ error: `Falha ao criar vinculos: ${error.message}` }, 500);
      }

      // Atualizar segmento do profile pela primeira turma
      const { error: segError } = await supabaseAdmin
        .from('profiles')
        .update({ segmento: turmasSelecionadas[0].segmento })
        .eq('id', userId);
      if (segError) {
        console.error('[admin-logins-professor] Erro ao atualizar segmento:', segError);
      }

      console.log(`[admin-logins-professor] Vinculos atualizados para ${userId}: ${turmaIds.length} turma(s)`);
      return jsonResponse({ success: true });
    }

    // ============ RESETAR SENHA ============
    if (acao === 'resetar_senha') {
      const { userId, senha } = body as { userId?: string; senha?: string };

      if (!userId || !senha) {
        return jsonResponse({ error: 'Campos obrigatorios: userId, senha' }, 400);
      }
      if (senha.length < 8) {
        return jsonResponse({ error: 'A senha deve ter pelo menos 8 caracteres' }, 400);
      }

      const alvoInvalido = await validarAlvoProfessor(userId);
      if (alvoInvalido) return alvoInvalido;

      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password: senha });
      if (error) return jsonResponse({ error: error.message }, 500);

      console.log(`[admin-logins-professor] Senha resetada para ${userId}`);
      return jsonResponse({ success: true });
    }

    // ============ DESATIVAR ============
    if (acao === 'desativar') {
      const { userId } = body as { userId?: string };

      if (!userId) {
        return jsonResponse({ error: 'Campo obrigatorio: userId' }, 400);
      }

      const alvoInvalido = await validarAlvoProfessor(userId);
      if (alvoInvalido) return alvoInvalido;

      // Nunca deletar: o historico de observacoes referencia o professor.
      // Desativa os vinculos e bloqueia o login por 10 anos.
      const { error: vinculoError } = await supabaseAdmin
        .from('professor_turma')
        .update({ ativo: false })
        .eq('professor_id', userId);
      if (vinculoError) return jsonResponse({ error: `Falha ao desativar vinculos: ${vinculoError.message}` }, 500);

      const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        ban_duration: '87600h',
      });
      if (banError) return jsonResponse({ error: `Falha ao bloquear o login: ${banError.message}` }, 500);

      console.log(`[admin-logins-professor] Login desativado: ${userId}`);
      return jsonResponse({ success: true });
    }

    return jsonResponse({ error: `Acao desconhecida: ${acao}` }, 400);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[admin-logins-professor] Erro inesperado:', error);
    return jsonResponse({ error: errorMessage }, 500);
  }
});
