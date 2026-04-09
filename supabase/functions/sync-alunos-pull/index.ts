import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://arboria.escolaamadeus.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-sync-token',
};

interface AlunoExterno {
  matricula: string;
  nome: string;
  sobrenome: string;
  sexo?: string;
  data_nascimento?: string;
  serie?: string;
  turma?: string;
  segmento?: string;
}

interface SyncResult {
  success: boolean;
  total: number;
  criados: number;
  atualizados: number;
  vinculados: number;
  erros: string[];
  fonte: string;
}

// Normalize surname to create password: remove accents, apostrophes, spaces, lowercase
function normalizeSobrenome(sobrenome: string): string {
  return sobrenome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/['`]/g, '') // Remove apostrophes
    .replace(/\s+/g, '') // Remove spaces
    .toLowerCase()
    .trim();
}

// Generate email from nome.sobrenome
function gerarEmail(nome: string, sobrenome: string, suffix?: number): string {
  const primeiroNome = nome.trim().split(' ')[0];
  const primeiroSobrenome = sobrenome.trim().split(' ')[0];
  
  const normalizar = (str: string) => str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z]/g, '')
    .toLowerCase();
  
  const local = `${normalizar(primeiroNome)}.${normalizar(primeiroSobrenome)}`;
  const suffixStr = suffix && suffix > 1 ? suffix.toString() : '';
  
  return `${local}${suffixStr}@aluno.arboria.com`;
}

// Search for user by email using admin API
async function buscarUserPorEmail(supabaseAdmin: any, email: string) {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      filter: `email.eq.${email}`
    });
    
    if (error) {
      console.error('Error searching user by email:', error);
      return null;
    }
    
    return data?.users?.find((u: any) => u.email === email) || null;
  } catch (err) {
    console.error('Exception searching user:', err);
    return null;
  }
}

// Find available email with suffix
async function gerarEmailUnico(supabaseAdmin: any, nome: string, sobrenome: string): Promise<string> {
  for (let suffix = 2; suffix <= 20; suffix++) {
    const email = gerarEmail(nome, sobrenome, suffix);
    const existingUser = await buscarUserPorEmail(supabaseAdmin, email);
    if (!existingUser) {
      return email;
    }
  }
  throw new Error('Muitos usuários com mesmo nome - limite de sufixos atingido');
}

// Ensure user has 'user' role
async function garantirRoleUser(supabaseAdmin: any, userId: string): Promise<void> {
  await supabaseAdmin
    .from('user_roles')
    .upsert(
      { user_id: userId, role: 'user' },
      { onConflict: 'user_id,role', ignoreDuplicates: true }
    );
}

// Ensure inteligencia_scores exist for all 8 IMs
async function garantirScores(supabaseAdmin: any, userId: string, anoLetivo: number): Promise<void> {
  for (let imId = 1; imId <= 8; imId++) {
    await supabaseAdmin
      .from('inteligencia_scores')
      .upsert({
        aluno_id: userId,
        inteligencia_id: imId,
        score_atual: 35.00,
        ano_letivo: anoLetivo
      }, { onConflict: 'aluno_id,inteligencia_id,ano_letivo', ignoreDuplicates: true });
  }
}

// Create new user with given email
async function criarNovoUsuario(
  supabaseAdmin: any, 
  aluno: AlunoExterno & { institution_id: string }, 
  email: string,
  anoLetivo: number
): Promise<{ success: boolean; userId?: string; error?: string }> {
  const normalizedSobrenome = normalizeSobrenome(aluno.sobrenome);
  const password = normalizedSobrenome + '123';
  const fullName = `${aluno.nome.trim()} ${aluno.sobrenome.trim()}`;

  if (password.length < 6) {
    return { success: false, error: 'Sobrenome muito curto para gerar senha válida' };
  }

  const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      nome: aluno.nome.trim(),
      sobrenome: aluno.sobrenome.trim(),
      full_name: fullName,
      institution_id: aluno.institution_id,
      serie: aluno.serie?.trim() || null,
      turma: aluno.turma?.trim() || null,
      must_change_password: true
    }
  });

  if (createError) {
    return { success: false, error: createError.message };
  }

  // Update profile with matricula_externa
  await supabaseAdmin
    .from('profiles')
    .update({
      nome: aluno.nome.trim(),
      sobrenome: aluno.sobrenome.trim(),
      full_name: fullName,
      institution_id: aluno.institution_id,
      serie: aluno.serie?.trim() || null,
      turma: aluno.turma?.trim() || null,
      segmento: aluno.segmento?.trim() || null,
      matricula_externa: aluno.matricula,
      must_change_password: true
    })
    .eq('id', newUser.user.id);

  // Add user role
  await garantirRoleUser(supabaseAdmin, newUser.user.id);

  // Initialize intelligence scores
  await garantirScores(supabaseAdmin, newUser.user.id, anoLetivo);

  return { success: true, userId: newUser.user.id };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Validate sync token
    const syncToken = Deno.env.get('SYNC_ALUNOS_TOKEN');
    const providedToken = req.headers.get('X-Sync-Token');
    
    if (!syncToken || providedToken !== syncToken) {
      console.error('Invalid or missing sync token');
      return new Response(JSON.stringify({ error: 'Token de sincronização inválido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Parse request body
    const { institutionId, segmento } = await req.json();
    
    if (!institutionId) {
      return new Response(JSON.stringify({ error: 'institutionId é obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Connect to EXTERNAL Supabase
    const externalUrl = Deno.env.get('EXTERNAL_SUPABASE_URL');
    const externalKey = Deno.env.get('EXTERNAL_SUPABASE_KEY');
    
    if (!externalUrl || !externalKey) {
      return new Response(JSON.stringify({ error: 'Credenciais do Supabase externo não configuradas' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Connecting to external Supabase: ${externalUrl}`);
    const externalClient = createClient(externalUrl, externalKey);

    // 4. Fetch students from arboria_alunos
    let query = externalClient
      .from('arboria_alunos')
      .select('*')
      .eq('ativo', true);

    if (segmento) {
      query = query.eq('segmento', segmento);
      console.log(`Filtering by segmento: ${segmento}`);
    }

    const { data: alunosExternos, error: fetchError } = await query;

    if (fetchError) {
      console.error('Error fetching from external DB:', fetchError);
      return new Response(JSON.stringify({ error: `Erro ao buscar alunos: ${fetchError.message}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!alunosExternos || alunosExternos.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        total: 0, 
        criados: 0, 
        atualizados: 0, 
        vinculados: 0, 
        erros: [],
        fonte: 'arboria_alunos',
        message: 'Nenhum aluno encontrado na tabela externa' 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${alunosExternos.length} students in external DB`);

    // 5. Connect to LOCAL Supabase (Lovable)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const anoLetivo = new Date().getFullYear();

    // 6. Initialize result
    const result: SyncResult = {
      success: true,
      total: alunosExternos.length,
      criados: 0,
      atualizados: 0,
      vinculados: 0,
      erros: [],
      fonte: 'arboria_alunos'
    };

    // 7. Process each student
    for (let i = 0; i < alunosExternos.length; i++) {
      const alunoExterno = alunosExternos[i];
      const lineNumber = i + 1;

      try {
        // Validate required fields
        if (!alunoExterno.matricula?.trim()) {
          result.erros.push(`Linha ${lineNumber}: Matrícula é obrigatória`);
          continue;
        }
        if (!alunoExterno.nome?.trim()) {
          result.erros.push(`Linha ${lineNumber}: ${alunoExterno.matricula} - Nome é obrigatório`);
          continue;
        }
        if (!alunoExterno.sobrenome?.trim()) {
          result.erros.push(`Linha ${lineNumber}: ${alunoExterno.matricula} - Sobrenome é obrigatório`);
          continue;
        }

        const aluno = {
          matricula: alunoExterno.matricula.trim(),
          nome: alunoExterno.nome.trim(),
          sobrenome: alunoExterno.sobrenome.trim(),
          sexo: alunoExterno.sexo?.trim() || null,
          data_nascimento: alunoExterno.data_nascimento || null,
          serie: alunoExterno.serie?.trim() || null,
          turma: alunoExterno.turma?.trim() || null,
          segmento: alunoExterno.segmento?.trim() || null,
          institution_id: institutionId
        };

        const fullName = `${aluno.nome} ${aluno.sobrenome}`;

        // Check if student exists by matricula_externa AND institution_id
        const { data: existingProfile, error: searchError } = await supabaseAdmin
          .from('profiles')
          .select('id, matricula_externa, institution_id')
          .eq('matricula_externa', aluno.matricula)
          .eq('institution_id', institutionId)
          .maybeSingle();

        if (searchError) {
          console.error(`Error searching for ${aluno.matricula}:`, searchError);
          result.erros.push(`Linha ${lineNumber}: ${aluno.matricula} - Erro ao buscar: ${searchError.message}`);
          continue;
        }

        if (existingProfile) {
          // UPDATE existing profile
          const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({
              nome: aluno.nome,
              sobrenome: aluno.sobrenome,
              full_name: fullName,
              serie: aluno.serie,
              turma: aluno.turma,
              segmento: aluno.segmento,
              institution_id: institutionId,
              matricula_externa: aluno.matricula,
            })
            .eq('id', existingProfile.id);

          if (updateError) {
            result.erros.push(`Linha ${lineNumber}: ${aluno.matricula} - Erro ao atualizar: ${updateError.message}`);
            continue;
          }

          await garantirRoleUser(supabaseAdmin, existingProfile.id);
          await garantirScores(supabaseAdmin, existingProfile.id, anoLetivo);

          console.log(`Updated: ${aluno.matricula}`);
          result.atualizados++;
          continue;
        }

        // Try to CREATE new user
        const baseEmail = gerarEmail(aluno.nome, aluno.sobrenome);
        const createResult = await criarNovoUsuario(supabaseAdmin, aluno, baseEmail, anoLetivo);

        if (createResult.success) {
          console.log(`Created: ${aluno.matricula} (${createResult.userId})`);
          result.criados++;
          continue;
        }

        // Handle email collision
        if (createResult.error?.includes('email address has already been registered')) {
          console.log(`Email ${baseEmail} already exists, checking profile...`);
          
          const existingUser = await buscarUserPorEmail(supabaseAdmin, baseEmail);
          
          if (existingUser) {
            const { data: profileCheck } = await supabaseAdmin
              .from('profiles')
              .select('matricula_externa, institution_id')
              .eq('id', existingUser.id)
              .single();

            const profileInstitutionId = profileCheck?.institution_id;
            const profileMatricula = profileCheck?.matricula_externa;

            // Can link if: no matricula AND (same institution OR null institution)
            const canLink = !profileMatricula && 
              (profileInstitutionId === institutionId || !profileInstitutionId);

            if (canLink) {
              // LINK to existing user
              const { error: linkError } = await supabaseAdmin
                .from('profiles')
                .update({
                  nome: aluno.nome,
                  sobrenome: aluno.sobrenome,
                  full_name: fullName,
                  serie: aluno.serie,
                  turma: aluno.turma,
                  segmento: aluno.segmento,
                  institution_id: institutionId,
                  matricula_externa: aluno.matricula,
                })
                .eq('id', existingUser.id);

              if (linkError) {
                result.erros.push(`Linha ${lineNumber}: ${aluno.matricula} - Erro ao vincular: ${linkError.message}`);
                continue;
              }

              await garantirRoleUser(supabaseAdmin, existingUser.id);
              await garantirScores(supabaseAdmin, existingUser.id, anoLetivo);

              console.log(`Linked: ${aluno.matricula} to existing user ${existingUser.id}`);
              result.vinculados++;
              continue;
            }

            // Cannot link - create with unique email
            console.log(`Cannot link to ${existingUser.id}, generating unique email...`);
            
            try {
              const uniqueEmail = await gerarEmailUnico(supabaseAdmin, aluno.nome, aluno.sobrenome);
              const retryResult = await criarNovoUsuario(supabaseAdmin, aluno, uniqueEmail, anoLetivo);
              
              if (retryResult.success) {
                console.log(`Created with unique email: ${aluno.matricula} → ${uniqueEmail}`);
                result.criados++;
                continue;
              }
              
              result.erros.push(`Linha ${lineNumber}: ${aluno.matricula} - ${retryResult.error}`);
            } catch (emailError: any) {
              result.erros.push(`Linha ${lineNumber}: ${aluno.matricula} - ${emailError.message}`);
            }
            continue;
          }
        }

        // Other creation error
        result.erros.push(`Linha ${lineNumber}: ${aluno.matricula} - ${createResult.error}`);

      } catch (error: any) {
        console.error(`Unexpected error for line ${lineNumber}:`, error);
        result.erros.push(`Linha ${lineNumber}: Erro inesperado: ${error.message}`);
      }
    }

    console.log(`Sync completed: ${result.criados} created, ${result.atualizados} updated, ${result.vinculados} linked, ${result.erros.length} errors`);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ error: 'Erro interno do servidor', details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
