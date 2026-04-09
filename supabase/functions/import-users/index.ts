import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://arboria.escolaamadeus.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ImportUser {
  matricula?: string;
  nome: string;
  sobrenome: string;
  instituicao: string;
  serie?: string;
  turma?: string;
  segmento?: string;
  casa_id?: number | null;
  email?: string;
  int_intrapessoal?: number;
  int_interpessoal?: number;
  int_naturalista?: number;
  int_logico?: number;
  int_linguistica?: number;
  int_espacial?: number;
  int_corporal?: number;
  int_musical?: number;
}

interface ImportError {
  line: number;
  identifier: string;
  error: string;
}

const INTELIGENCIAS_MAP = [
  { campo: 'int_linguistica', id: 1 },
  { campo: 'int_logico', id: 2 },
  { campo: 'int_espacial', id: 3 },
  { campo: 'int_musical', id: 4 },
  { campo: 'int_corporal', id: 5 },
  { campo: 'int_naturalista', id: 6 },
  { campo: 'int_interpessoal', id: 7 },
  { campo: 'int_intrapessoal', id: 8 },
];

function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[''`]/g, '')
    .replace(/\s+/g, '')
    .toLowerCase()
    .trim();
}

function generateEmail(nome: string, sobrenome: string): string {
  const primeiroNome = normalizeText(nome.split(' ')[0]);
  const primeiroSobrenome = normalizeText(sobrenome.split(' ')[0]);
  return `${primeiroNome}.${primeiroSobrenome}@aluno.arboria.com`;
}

function generatePassword(sobrenome: string): string {
  return normalizeText(sobrenome) + '123';
}

async function getUniqueEmail(supabaseAdmin: any, baseEmail: string): Promise<string> {
  let email = baseEmail;
  let suffix = 1;
  
  while (true) {
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers({
      filter: `email.eq.${email}`,
      perPage: 1
    });
    
    if (!existingUsers?.users?.length) {
      return email;
    }
    
    suffix++;
    const [localPart, domain] = baseEmail.split('@');
    email = `${localPart}${suffix}@${domain}`;
  }
}

// Garante que o aluno tenha os 8 scores de inteligência inicializados
async function garantirScores(supabaseAdmin: any, alunoId: string, anoLetivo: number, inteligenciasFromCSV?: ImportUser) {
  for (const int of INTELIGENCIAS_MAP) {
    const valorCSV = inteligenciasFromCSV ? (inteligenciasFromCSV as any)[int.campo] || 0 : 0;
    const scoreNormalizado = Math.min(100, Math.max(0, valorCSV || 35)); // Default 35 se não vier do CSV
    
    await supabaseAdmin
      .from('inteligencia_scores')
      .upsert({
        aluno_id: alunoId,
        inteligencia_id: int.id,
        score_atual: scoreNormalizado,
        ano_letivo: anoLetivo
      }, {
        onConflict: 'aluno_id,inteligencia_id,ano_letivo'
      });
  }
}

// Garante que o usuário tenha a role 'user'
async function garantirRoleUser(supabaseAdmin: any, userId: string, role: string = 'user') {
  const { data: existingRole } = await supabaseAdmin
    .from('user_roles')
    .select('id')
    .eq('user_id', userId)
    .eq('role', role)
    .maybeSingle();
  
  if (!existingRole) {
    await supabaseAdmin
      .from('user_roles')
      .insert({ user_id: userId, role });
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

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

    const { data: callerRoles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id)
      .eq('role', 'admin')
      .single();

    if (!callerRoles) {
      return new Response(JSON.stringify({ error: 'Apenas administradores podem importar usuários' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { users, tipo } = await req.json() as { users: ImportUser[], tipo?: string };

    if (!users || !Array.isArray(users) || users.length === 0) {
      return new Response(JSON.stringify({ error: 'Nenhum usuário para importar' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[import-users] Iniciando lote de ${users.length} usuários (tipo: ${tipo || 'alunos'})`);

    const anoLetivo = new Date().getFullYear();
    const errors: ImportError[] = [];
    let createdCount = 0;
    let updatedCount = 0;

    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const lineNumber = i + 2;

      try {
        // Validações básicas
        if (!user.nome?.trim() || !user.sobrenome?.trim() || !user.instituicao?.trim()) {
          errors.push({ line: lineNumber, identifier: user.matricula || user.email || '', error: 'Nome, sobrenome e instituição são obrigatórios' });
          continue;
        }

        const institutionId = user.instituicao;
        const fullName = `${user.nome.trim()} ${user.sobrenome.trim()}`;
        const userRole = tipo === 'professores' ? 'professor' : 'user';
        const isAluno = userRole === 'user';

        // ========== LÓGICA DE UPSERT ==========
        if (isAluno && user.matricula?.trim()) {
          // Verificar se já existe aluno com esta matrícula nesta instituição
          const { data: existingProfile } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('matricula_externa', user.matricula.trim())
            .eq('institution_id', institutionId)
            .maybeSingle();

          if (existingProfile) {
            // ATUALIZAR aluno existente
            console.log(`[import-users] Atualizando aluno existente: ${user.matricula}`);
            
            await supabaseAdmin
              .from('profiles')
              .update({
                nome: user.nome.trim(),
                sobrenome: user.sobrenome.trim(),
                full_name: fullName,
                serie: user.serie?.trim() || null,
                turma: user.turma?.trim() || null,
                segmento: user.segmento?.trim() || null,
                casa_id: user.casa_id || null,
              })
              .eq('id', existingProfile.id);

            // Garantir scores e role
            await garantirScores(supabaseAdmin, existingProfile.id, anoLetivo, user);
            await garantirRoleUser(supabaseAdmin, existingProfile.id, userRole);

            updatedCount++;
            continue;
          }
        }

        // ========== CRIAR NOVO USUÁRIO ==========
        let email: string;
        if (isAluno) {
          if (!user.matricula?.trim()) {
            errors.push({ line: lineNumber, identifier: '', error: 'Matrícula é obrigatória para alunos' });
            continue;
          }
          const baseEmail = generateEmail(user.nome, user.sobrenome);
          email = await getUniqueEmail(supabaseAdmin, baseEmail);
        } else {
          if (!user.email?.trim()) {
            errors.push({ line: lineNumber, identifier: '', error: 'Email é obrigatório para professores' });
            continue;
          }
          email = user.email.trim();
        }

        const password = generatePassword(user.sobrenome);
        if (password.length < 6) {
          errors.push({ line: lineNumber, identifier: user.matricula || email, error: 'Sobrenome muito curto para gerar senha' });
          continue;
        }

        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            nome: user.nome.trim(),
            sobrenome: user.sobrenome.trim(),
            full_name: fullName,
            institution_id: institutionId,
            serie: user.serie?.trim() || null,
            turma: user.turma?.trim() || null,
            segmento: user.segmento?.trim() || null,
            casa_id: user.casa_id || null,
            matricula_externa: user.matricula?.trim() || null,
            must_change_password: true
          }
        });

        if (createError) {
          console.error(`[import-users] Erro ao criar ${email}:`, createError.message);
          errors.push({ line: lineNumber, identifier: user.matricula || email, error: createError.message });
          continue;
        }

        console.log(`[import-users] Usuário criado: ${email}`);

        // Atualizar profile
        await supabaseAdmin
          .from('profiles')
          .update({ 
            nome: user.nome.trim(),
            sobrenome: user.sobrenome.trim(),
            full_name: fullName,
            institution_id: institutionId,
            serie: user.serie?.trim() || null,
            turma: user.turma?.trim() || null,
            segmento: user.segmento?.trim() || null,
            casa_id: user.casa_id || null,
            matricula_externa: user.matricula?.trim() || null,
            must_change_password: true
          })
          .eq('id', newUser.user.id);

        // Garantir role e scores
        await garantirRoleUser(supabaseAdmin, newUser.user.id, userRole);

        if (isAluno) {
          await garantirScores(supabaseAdmin, newUser.user.id, anoLetivo, user);
        }

        // Link professor-casa se aplicável
        if (userRole === 'professor' && user.casa_id) {
          await supabaseAdmin
            .from('professor_casa')
            .insert({
              professor_id: newUser.user.id,
              casa_id: user.casa_id,
              institution_id: institutionId,
              ano_letivo: anoLetivo,
              eh_mentor_principal: true,
              ativo: true
            });
        }

        createdCount++;
      } catch (error) {
        console.error(`[import-users] Erro inesperado para ${user.matricula || user.email}:`, error);
        errors.push({ line: lineNumber, identifier: user.matricula || user.email || '', error: 'Erro inesperado' });
      }
    }

    console.log(`[import-users] Lote concluído: ${createdCount} criados, ${updatedCount} atualizados, ${errors.length} erros`);

    return new Response(JSON.stringify({ 
      success: true, 
      total: users.length,
      criados: createdCount,
      atualizados: updatedCount,
      errors: errors.map(e => `Linha ${e.line}: ${e.identifier} - ${e.error}`)
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[import-users] Erro fatal:', error);
    return new Response(JSON.stringify({ error: 'Erro interno do servidor' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
