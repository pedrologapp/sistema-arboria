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

    // Helper: garante que TODAS as turmas do payload sao da MESMA instituicao
    // (e, no caso admin, a do proprio token). Como o super_admin nao tem
    // instituicao e o service_role bypassa a RLS, um payload com turmas de duas
    // escolas gravaria professor_casa com a institution da 1a turma e
    // professor_casa_turma de outra. Retorna a institution unica, ou uma Response
    // de erro pronta para os ramos de mentor de Casa.
    const instituicaoUnicaDasTurmas = (turmasSel: TurmaInfo[]): string | Response => {
      const insts = [...new Set(turmasSel.map((t) => t.institution_id))];
      if (insts.length !== 1) {
        return jsonResponse({ error: 'Todas as turmas devem ser da mesma instituicao' }, 400);
      }
      if (callerInstitutionId && insts[0] !== callerInstitutionId) {
        return jsonResponse({ error: 'As turmas pertencem a outra instituicao' }, 403);
      }
      return insts[0];
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
      if (rolesError) return jsonResponse({ error: `roles: ${rolesError.message}` }, 500);

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
      if (profilesError) return jsonResponse({ error: `profiles: ${profilesError.message}` }, 500);

      const idsDaInstituicao = (profiles || []).map((p) => p.id);
      if (idsDaInstituicao.length === 0) return jsonResponse({ logins: [] });

      // Vinculos ativos com turmas
      const { data: vinculos, error: vinculosError } = await supabaseAdmin
        .from('professor_turma')
        .select('professor_id, turma_id, ativo, turmas(id, nome, serie, turma_letra, segmento)')
        .in('professor_id', idsDaInstituicao)
        .eq('ativo', true);
      if (vinculosError) return jsonResponse({ error: `vinculos: ${vinculosError.message}` }, 500);

      // Emails e status de bloqueio: um getUserById por professor (so os que
      // interessam, nao os ~300 usuarios). Evita o listUsys paginado que
      // falhava com perPage alto.
      const emailMap = new Map<string, { email: string; bannedUntil: string | null }>();
      const emailResults = await Promise.all(
        idsDaInstituicao.map(async (id) => {
          const { data: u } = await supabaseAdmin.auth.admin.getUserById(id);
          return {
            id,
            email: u?.user?.email ?? '',
            bannedUntil: (u?.user as { banned_until?: string } | undefined)?.banned_until ?? null,
          };
        })
      );
      for (const e of emailResults) {
        emailMap.set(e.id, { email: e.email, bannedUntil: e.bannedUntil });
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

    // ============ LISTAR CASAS (as 8 inteligencias) ============
    // Referencia global; via service role para o dono (super_admin) sem instituicao.
    if (acao === 'listar_casas') {
      const { data, error } = await supabaseAdmin
        .from('inteligencias')
        .select('id, nome, codigo')
        .order('id');
      if (error) return jsonResponse({ error: error.message }, 500);
      return jsonResponse({ casas: data || [] });
    }

    // ============ LISTAR MENTORES (por instituicao) ============
    // Todos os vinculos de Casa (professor_casa) da instituicao, com as turmas
    // que cada mentor conduz (professor_casa_turma) e o status do login.
    if (acao === 'listar_mentores') {
      const { institutionId: instFiltro } = body as { institutionId?: string };
      const alvoInst = callerInstitutionId ?? instFiltro ?? null;
      if (!alvoInst) return jsonResponse({ error: 'Escolha a instituicao' }, 400);

      const { data: vinculosCasa, error: casaError } = await supabaseAdmin
        .from('professor_casa')
        .select('professor_id, casa_id, ativo, eh_mentor_principal')
        .eq('institution_id', alvoInst)
        .eq('ano_letivo', anoLetivo);
      if (casaError) return jsonResponse({ error: `casa: ${casaError.message}` }, 500);

      const professorIds = [...new Set((vinculosCasa || []).map((v) => v.professor_id))];
      if (professorIds.length === 0) return jsonResponse({ mentores: [] });

      // Nomes
      const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('id, nome, full_name')
        .in('id', professorIds);
      const nomeMap = new Map((profiles || []).map((p) => [p.id, p.full_name || p.nome || '']));

      // Turmas conduzidas por cada mentor (ativas)
      const { data: vinculosTurma } = await supabaseAdmin
        .from('professor_casa_turma')
        .select('professor_id, casa_id, ativo, turmas(id, nome, serie, turma_letra, segmento)')
        .in('professor_id', professorIds)
        .eq('ano_letivo', anoLetivo)
        .eq('ativo', true);

      // Email + status de bloqueio (um getUserById por mentor)
      const emailResults = await Promise.all(
        professorIds.map(async (id) => {
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

      const mentores = (vinculosCasa || []).map((v) => {
        const authInfo = emailMap.get(v.professor_id);
        const turmasDoMentor = (vinculosTurma || [])
          .filter((vt) => vt.professor_id === v.professor_id && vt.casa_id === v.casa_id && vt.turmas)
          .map((vt) => vt.turmas as unknown as TurmaInfo)
          .map((tt) => ({
            id: tt.id,
            nome: tt.nome,
            serie: tt.serie,
            turma_letra: tt.turma_letra,
            segmento: tt.segmento,
          }));
        return {
          professorId: v.professor_id,
          casaId: v.casa_id,
          nome: nomeMap.get(v.professor_id) || '',
          email: authInfo?.email ?? '',
          ativo: v.ativo,
          bloqueado: authInfo?.bloqueado ?? false,
          turmas: turmasDoMentor,
        };
      });

      return jsonResponse({ mentores });
    }

    // ============ CRIAR MENTOR ============
    // Cria um LOGIN INDIVIDUAL para um mentor de Casa do F2 e, na mesma transacao
    // logica: profile + role professor + professor_casa (identidade de Casa) +
    // professor_casa_turma (uma linha por turma que ele conduz).
    // Guardas Riscos: criado_por = caller.id nas DUAS tabelas; 1 mentor = 1 conta
    // (auth.createUser recusa email repetido); senha provisoria forte.
    if (acao === 'criar-mentor') {
      const { email, senha, nomeExibicao, casaId, turmaIds } = body as {
        email?: string; senha?: string; nomeExibicao?: string; casaId?: number; turmaIds?: string[];
      };

      if (!email || !senha || !nomeExibicao || !casaId || !turmaIds || turmaIds.length === 0) {
        return jsonResponse({ error: 'Campos obrigatorios: email, senha, nomeExibicao, casaId, turmaIds' }, 400);
      }
      if (!Number.isInteger(casaId) || casaId < 1 || casaId > 8) {
        return jsonResponse({ error: 'Casa invalida (deve ser de 1 a 8)' }, 400);
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
      // Mentor de Casa e do Fundamental 2: o recorte so aceita turmas do F2.
      const foraDoF2 = turmasSelecionadas.filter((t) => t.segmento !== 'fundamental2');
      if (foraDoF2.length > 0) {
        return jsonResponse({ error: 'Mentor de Casa conduz apenas turmas do Fundamental 2' }, 400);
      }

      // A instituicao do mentor: unica entre as turmas (e, para admin, a do token).
      const instUnica = instituicaoUnicaDasTurmas(turmasSelecionadas);
      if (instUnica instanceof Response) return instUnica;
      const institutionId = instUnica;

      console.log(`[admin-logins-professor] Criando MENTOR ${email} casa=${casaId} com ${turmaIds.length} turma(s)`);

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
        await supabaseAdmin.from('professor_casa_turma').delete().eq('professor_id', userId);
        await supabaseAdmin.from('professor_casa').delete().eq('professor_id', userId);
        await supabaseAdmin.auth.admin.deleteUser(userId);
      };

      // 2. Profile (mentor = segmento fundamental2)
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({
          nome: nomeExibicao,
          full_name: nomeExibicao,
          institution_id: institutionId,
          segmento: 'fundamental2',
          conta_criada: true,
        })
        .eq('id', userId);
      if (profileError) {
        await rollback();
        return jsonResponse({ error: `Falha ao salvar o perfil: ${profileError.message}` }, 500);
      }

      // 3. Role professor
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .insert({ user_id: userId, role: 'professor' });
      if (roleError) {
        await rollback();
        return jsonResponse({ error: `Falha ao definir a funcao de professor: ${roleError.message}` }, 500);
      }

      // 4. professor_casa (identidade de Casa) - criado_por = caller.id (Riscos)
      const { error: casaInsError } = await supabaseAdmin
        .from('professor_casa')
        .insert({
          professor_id: userId,
          casa_id: casaId,
          institution_id: institutionId,
          ano_letivo: anoLetivo,
          eh_mentor_principal: true,
          ativo: true,
          criado_por: caller.id,
        });
      if (casaInsError) {
        await rollback();
        return jsonResponse({ error: `Falha ao vincular a Casa: ${casaInsError.message}` }, 500);
      }

      // 5. professor_casa_turma (uma linha por turma) - criado_por = caller.id (Riscos)
      const linksTurma = turmasSelecionadas.map((t) => ({
        professor_id: userId,
        casa_id: casaId,
        turma_id: t.id,
        institution_id: t.institution_id,
        ano_letivo: anoLetivo,
        ativo: true,
        criado_por: caller.id,
      }));
      const { error: turmaError } = await supabaseAdmin.from('professor_casa_turma').insert(linksTurma);
      if (turmaError) {
        await rollback();
        return jsonResponse({ error: `Falha ao vincular turmas: ${turmaError.message}` }, 500);
      }

      console.log(`[admin-logins-professor] Mentor criado: ${userId}`);
      return jsonResponse({
        success: true,
        userId,
        email,
        nomeExibicao,
        casaId,
        turmas: turmasSelecionadas.map((t) => t.nome || `${t.serie} ${t.turma_letra}`),
      });
    }

    // ============ AJUSTAR TURMAS DO MENTOR ============
    // Reconcilia professor_casa_turma (adiciona/remove turmas) sem mexer no login.
    if (acao === 'ajustar-turmas-mentor') {
      const { userId, casaId, turmaIds } = body as {
        userId?: string; casaId?: number; turmaIds?: string[];
      };
      if (!userId || !casaId || !turmaIds || turmaIds.length === 0) {
        return jsonResponse({ error: 'Campos obrigatorios: userId, casaId, turmaIds' }, 400);
      }

      const alvoInvalido = await validarAlvoProfessor(userId);
      if (alvoInvalido) return alvoInvalido;

      const turmasSelecionadas = await buscarTurmasOrdenadas(turmaIds);
      if (turmasSelecionadas.length !== turmaIds.length) {
        return jsonResponse({ error: 'Uma ou mais turmas nao foram encontradas' }, 400);
      }
      const foraDoF2 = turmasSelecionadas.filter((t) => t.segmento !== 'fundamental2');
      if (foraDoF2.length > 0) {
        return jsonResponse({ error: 'Mentor de Casa conduz apenas turmas do Fundamental 2' }, 400);
      }
      // Todas as turmas do ajuste sao da mesma instituicao (as linhas de
      // professor_casa_turma gravam institution_id por turma).
      const instAjuste = instituicaoUnicaDasTurmas(turmasSelecionadas);
      if (instAjuste instanceof Response) return instAjuste;

      // A identidade de Casa precisa estar ativa (reativa se o mentor voltou).
      const { data: casaRow } = await supabaseAdmin
        .from('professor_casa')
        .select('id, ativo')
        .eq('professor_id', userId)
        .eq('casa_id', casaId)
        .eq('ano_letivo', anoLetivo)
        .maybeSingle();
      if (!casaRow) {
        return jsonResponse({ error: 'Este professor nao e mentor desta Casa neste ano' }, 400);
      }
      if (!casaRow.ativo) {
        await supabaseAdmin.from('professor_casa').update({ ativo: true }).eq('id', casaRow.id);
      }

      const { data: existentes, error: existentesError } = await supabaseAdmin
        .from('professor_casa_turma')
        .select('id, turma_id, ativo')
        .eq('professor_id', userId)
        .eq('casa_id', casaId)
        .eq('ano_letivo', anoLetivo);
      if (existentesError) return jsonResponse({ error: existentesError.message }, 500);

      const desejadas = new Set(turmaIds);
      const existentesMap = new Map((existentes || []).map((v) => [v.turma_id, v]));

      const idsParaDesativar = (existentes || [])
        .filter((v) => v.ativo && !desejadas.has(v.turma_id))
        .map((v) => v.id);
      if (idsParaDesativar.length > 0) {
        const { error } = await supabaseAdmin
          .from('professor_casa_turma')
          .update({ ativo: false })
          .in('id', idsParaDesativar);
        if (error) return jsonResponse({ error: `Falha ao remover turmas: ${error.message}` }, 500);
      }

      const idsParaReativar = (existentes || [])
        .filter((v) => !v.ativo && desejadas.has(v.turma_id))
        .map((v) => v.id);
      if (idsParaReativar.length > 0) {
        const { error } = await supabaseAdmin
          .from('professor_casa_turma')
          .update({ ativo: true })
          .in('id', idsParaReativar);
        if (error) return jsonResponse({ error: `Falha ao reativar turmas: ${error.message}` }, 500);
      }

      const novos = turmasSelecionadas.filter((t) => !existentesMap.has(t.id));
      if (novos.length > 0) {
        const { error } = await supabaseAdmin.from('professor_casa_turma').insert(
          novos.map((t) => ({
            professor_id: userId,
            casa_id: casaId,
            turma_id: t.id,
            institution_id: t.institution_id,
            ano_letivo: anoLetivo,
            ativo: true,
            criado_por: caller.id,
          }))
        );
        if (error) return jsonResponse({ error: `Falha ao adicionar turmas: ${error.message}` }, 500);
      }

      console.log(`[admin-logins-professor] Turmas do mentor ${userId} ajustadas: ${turmaIds.length}`);
      return jsonResponse({ success: true });
    }

    // ============ DESATIVAR MENTOR ============
    // Encerra o vinculo de Casa (professor_casa + professor_casa_turma) E bloqueia
    // o login. O historico de observacoes e preservado (nunca deletado).
    if (acao === 'desativar-mentor') {
      const { userId } = body as { userId?: string };
      if (!userId) return jsonResponse({ error: 'Campo obrigatorio: userId' }, 400);

      const alvoInvalido = await validarAlvoProfessor(userId);
      if (alvoInvalido) return alvoInvalido;

      const { error: pctError } = await supabaseAdmin
        .from('professor_casa_turma')
        .update({ ativo: false })
        .eq('professor_id', userId);
      if (pctError) return jsonResponse({ error: `Falha ao desativar turmas: ${pctError.message}` }, 500);

      const { error: pcError } = await supabaseAdmin
        .from('professor_casa')
        .update({ ativo: false })
        .eq('professor_id', userId);
      if (pcError) return jsonResponse({ error: `Falha ao desativar a Casa: ${pcError.message}` }, 500);

      // Tambem desativa vinculos de turma comuns, se existirem (higiene).
      await supabaseAdmin
        .from('professor_turma')
        .update({ ativo: false })
        .eq('professor_id', userId);

      const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        ban_duration: '87600h',
      });
      if (banError) return jsonResponse({ error: `Falha ao bloquear o login: ${banError.message}` }, 500);

      console.log(`[admin-logins-professor] Mentor desativado: ${userId}`);
      return jsonResponse({ success: true });
    }

    return jsonResponse({ error: `Acao desconhecida: ${acao}` }, 400);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[admin-logins-professor] Erro inesperado:', error);
    return jsonResponse({ error: errorMessage }, 500);
  }
});
