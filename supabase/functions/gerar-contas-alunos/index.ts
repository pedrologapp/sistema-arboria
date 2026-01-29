import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[''`]/g, '')
    .replace(/\s+/g, '')
    .toLowerCase()
    .trim();
}

function generatePassword(sobrenome: string): string {
  return normalizeText(sobrenome) + '123';
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Verificar autenticação
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verificar se é admin
    const { data: callerRoles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id)
      .eq('role', 'admin')
      .single();

    if (!callerRoles) {
      return new Response(JSON.stringify({ error: 'Apenas administradores podem gerar contas' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { institutionId, segmento, limite } = await req.json() as { 
      institutionId: string;
      segmento?: string;
      limite?: number;
    };

    // Buscar alunos sem conta
    let query = supabaseAdmin
      .from('profiles')
      .select('id, nome, sobrenome, email_gerado, institution_id, serie, turma, segmento, casa_id, matricula_externa')
      .eq('institution_id', institutionId)
      .eq('conta_criada', false)
      .not('email_gerado', 'is', null);

    if (segmento) {
      query = query.eq('segmento', segmento);
    }

    if (limite) {
      query = query.limit(limite);
    }

    const { data: alunosSemConta, error: queryError } = await query;

    if (queryError) {
      console.error('[gerar-contas-alunos] Erro ao buscar alunos:', queryError);
      return new Response(JSON.stringify({ error: 'Erro ao buscar alunos' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!alunosSemConta || alunosSemConta.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Nenhum aluno sem conta encontrado',
        criados: 0,
        errors: []
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[gerar-contas-alunos] Gerando contas para ${alunosSemConta.length} alunos`);

    let criados = 0;
    const errors: string[] = [];

    for (const aluno of alunosSemConta) {
      try {
        const email = aluno.email_gerado;
        const password = generatePassword(aluno.sobrenome);
        
        if (password.length < 6) {
          errors.push(`${aluno.nome}: Sobrenome muito curto para gerar senha`);
          continue;
        }

        // Criar usuário Auth
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            nome: aluno.nome,
            sobrenome: aluno.sobrenome,
            full_name: `${aluno.nome} ${aluno.sobrenome}`,
            institution_id: aluno.institution_id,
            serie: aluno.serie,
            turma: aluno.turma,
            segmento: aluno.segmento,
            casa_id: aluno.casa_id,
            matricula_externa: aluno.matricula_externa,
            must_change_password: true
          }
        });

        if (createError) {
          console.error(`[gerar-contas-alunos] Erro ao criar ${email}:`, createError.message);
          errors.push(`${aluno.nome}: ${createError.message}`);
          continue;
        }

        // Atualizar o profile existente para vincular ao novo Auth user
        // IMPORTANTE: Precisamos mover os dados do profile antigo para o novo ID
        const newUserId = newUser.user.id;
        const oldProfileId = aluno.id;

        // 1. Copiar dados relacionados para o novo ID
        // (inteligencia_scores, user_roles, etc já apontam para o oldProfileId)
        
        // 2. Atualizar o profile antigo com o novo ID do Auth
        // Isso é complexo porque precisamos manter a integridade referencial
        
        // Estratégia: Deletar o profile antigo e criar um novo com o ID do Auth
        // Mas isso perderia os scores... 
        
        // Melhor estratégia: Usar o ID do Auth desde o início no import
        // Por ora, vamos apenas atualizar o email_gerado e conta_criada
        // e criar um profile trigger para quando o usuário fizer login
        
        // Atualizar profile original como "conta_criada"
        await supabaseAdmin
          .from('profiles')
          .update({ conta_criada: true })
          .eq('id', oldProfileId);

        // O novo profile foi criado automaticamente pelo trigger handle_new_user
        // Precisamos copiar os dados do antigo para o novo e deletar o antigo
        
        // Copiar dados para o novo profile
        await supabaseAdmin
          .from('profiles')
          .update({
            nome: aluno.nome,
            sobrenome: aluno.sobrenome,
            full_name: `${aluno.nome} ${aluno.sobrenome}`,
            institution_id: aluno.institution_id,
            serie: aluno.serie,
            turma: aluno.turma,
            segmento: aluno.segmento,
            casa_id: aluno.casa_id,
            matricula_externa: aluno.matricula_externa,
            email_gerado: email,
            conta_criada: true,
            must_change_password: true
          })
          .eq('id', newUserId);

        // Copiar user_roles do antigo para o novo
        await supabaseAdmin
          .from('user_roles')
          .upsert({ user_id: newUserId, role: 'user' }, { onConflict: 'user_id,role' });

        // Copiar inteligencia_scores
        const { data: oldScores } = await supabaseAdmin
          .from('inteligencia_scores')
          .select('*')
          .eq('aluno_id', oldProfileId);

        if (oldScores && oldScores.length > 0) {
          const newScores = oldScores.map(s => ({
            aluno_id: newUserId,
            inteligencia_id: s.inteligencia_id,
            score_atual: s.score_atual,
            ano_letivo: s.ano_letivo,
            fase_atual: s.fase_atual,
            score_ultima_fase: s.score_ultima_fase,
            total_evidencias: s.total_evidencias
          }));
          
          await supabaseAdmin
            .from('inteligencia_scores')
            .upsert(newScores, { onConflict: 'aluno_id,inteligencia_id,ano_letivo' });

          // Deletar scores antigos
          await supabaseAdmin
            .from('inteligencia_scores')
            .delete()
            .eq('aluno_id', oldProfileId);
        }

        // Deletar role antigo
        await supabaseAdmin
          .from('user_roles')
          .delete()
          .eq('user_id', oldProfileId);

        // Deletar profile antigo (o temporário sem Auth)
        await supabaseAdmin
          .from('profiles')
          .delete()
          .eq('id', oldProfileId);

        criados++;
        console.log(`[gerar-contas-alunos] Conta criada: ${email}`);
        
      } catch (err: any) {
        console.error(`[gerar-contas-alunos] Erro inesperado para ${aluno.nome}:`, err);
        errors.push(`${aluno.nome}: Erro inesperado`);
      }
    }

    console.log(`[gerar-contas-alunos] Concluído: ${criados} contas criadas, ${errors.length} erros`);

    return new Response(JSON.stringify({ 
      success: true, 
      total: alunosSemConta.length,
      criados,
      errors
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[gerar-contas-alunos] Erro fatal:', error);
    return new Response(JSON.stringify({ error: 'Erro interno do servidor' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
