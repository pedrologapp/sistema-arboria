import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
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
  institution_id: string;
}

interface SyncResult {
  success: boolean;
  total: number;
  criados: number;
  atualizados: number;
  erros: string[];
}

// Normalize surname to create password: remove accents, apostrophes, spaces, lowercase
function normalizeSobrenome(sobrenome: string): string {
  return sobrenome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[''`]/g, '') // Remove apostrophes
    .replace(/\s+/g, '') // Remove spaces
    .toLowerCase()
    .trim();
}

// Generate email from nome.sobrenome
function gerarEmail(nome: string, sobrenome: string): string {
  // Get first name and first surname
  const primeiroNome = nome.trim().split(' ')[0];
  const primeiroSobrenome = sobrenome.trim().split(' ')[0];
  
  // Normalize: remove accents, lowercase, remove special characters
  const normalizar = (str: string) => str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z]/g, '')
    .toLowerCase();
  
  return `${normalizar(primeiroNome)}.${normalizar(primeiroSobrenome)}@aluno.arboria.com`;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const syncToken = Deno.env.get('SYNC_ALUNOS_TOKEN');

    // Validate sync token
    const providedToken = req.headers.get('X-Sync-Token');
    if (!syncToken || providedToken !== syncToken) {
      console.error('Invalid or missing sync token');
      return new Response(JSON.stringify({ error: 'Token de sincronização inválido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Parse request body
    const { alunos } = await req.json() as { alunos: AlunoExterno[] };

    if (!alunos || !Array.isArray(alunos) || alunos.length === 0) {
      return new Response(JSON.stringify({ error: 'Nenhum aluno para sincronizar' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Starting sync of ${alunos.length} alunos`);

    // Get current year for ano_letivo
    const anoLetivo = new Date().getFullYear();

    const result: SyncResult = {
      success: true,
      total: alunos.length,
      criados: 0,
      atualizados: 0,
      erros: []
    };

    for (let i = 0; i < alunos.length; i++) {
      const aluno = alunos[i];
      const lineNumber = i + 1;

      try {
        // Validate required fields
        if (!aluno.matricula || !aluno.matricula.trim()) {
          result.erros.push(`Linha ${lineNumber}: Matrícula é obrigatória`);
          continue;
        }
        if (!aluno.nome || !aluno.nome.trim()) {
          result.erros.push(`Linha ${lineNumber}: ${aluno.matricula} - Nome é obrigatório`);
          continue;
        }
        if (!aluno.sobrenome || !aluno.sobrenome.trim()) {
          result.erros.push(`Linha ${lineNumber}: ${aluno.matricula} - Sobrenome é obrigatório`);
          continue;
        }
        if (!aluno.institution_id) {
          result.erros.push(`Linha ${lineNumber}: ${aluno.matricula} - institution_id é obrigatório`);
          continue;
        }

        // Check if student already exists by matricula_externa
        const { data: existingProfile, error: searchError } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('matricula_externa', aluno.matricula)
          .maybeSingle();

        if (searchError) {
          console.error(`Error searching for ${aluno.matricula}:`, searchError);
          result.erros.push(`Linha ${lineNumber}: ${aluno.matricula} - Erro ao buscar: ${searchError.message}`);
          continue;
        }

        const fullName = `${aluno.nome.trim()} ${aluno.sobrenome.trim()}`;

        if (existingProfile) {
          // UPDATE existing student
          const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({
              nome: aluno.nome.trim(),
              sobrenome: aluno.sobrenome.trim(),
              full_name: fullName,
              serie: aluno.serie?.trim() || null,
              turma: aluno.turma?.trim() || null,
              segmento: aluno.segmento?.trim() || null,
            })
            .eq('id', existingProfile.id);

          if (updateError) {
            console.error(`Error updating ${aluno.matricula}:`, updateError);
            result.erros.push(`Linha ${lineNumber}: ${aluno.matricula} - Erro ao atualizar: ${updateError.message}`);
            continue;
          }

          console.log(`Updated: ${aluno.matricula} (${existingProfile.id})`);
          result.atualizados++;

        } else {
          // CREATE new student
          const normalizedSobrenome = normalizeSobrenome(aluno.sobrenome);
          const password = normalizedSobrenome + '123';

          // Validate password length
          if (password.length < 6) {
            result.erros.push(`Linha ${lineNumber}: ${aluno.matricula} - Sobrenome muito curto para gerar senha válida`);
            continue;
          }

          const email = gerarEmail(aluno.nome, aluno.sobrenome);

          // Create user in auth.users
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
            console.error(`Error creating user ${aluno.matricula}:`, createError);
            result.erros.push(`Linha ${lineNumber}: ${aluno.matricula} - ${createError.message}`);
            continue;
          }

          console.log(`User created: ${aluno.matricula} (${newUser.user.id})`);

          // Update profile with all fields including matricula_externa
          const { error: profileError } = await supabaseAdmin
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

          if (profileError) {
            console.error(`Error updating profile for ${aluno.matricula}:`, profileError);
            // Don't fail completely, user was created
          }

          // Add user role
          const { error: roleError } = await supabaseAdmin
            .from('user_roles')
            .insert({
              user_id: newUser.user.id,
              role: 'user'
            });

          if (roleError) {
            console.error(`Error adding role for ${aluno.matricula}:`, roleError);
            // Don't fail completely
          }

          // Initialize intelligence scores (8 IMs)
          for (let imId = 1; imId <= 8; imId++) {
            await supabaseAdmin
              .from('inteligencia_scores')
              .upsert({
                aluno_id: newUser.user.id,
                inteligencia_id: imId,
                score_atual: 35.00,
                ano_letivo: anoLetivo
              }, {
                onConflict: 'aluno_id,inteligencia_id,ano_letivo'
              });
          }

          result.criados++;
        }

      } catch (error) {
        console.error(`Unexpected error for ${aluno.matricula}:`, error);
        result.erros.push(`Linha ${lineNumber}: ${aluno.matricula} - Erro inesperado`);
      }
    }

    console.log(`Sync completed: ${result.criados} created, ${result.atualizados} updated, ${result.erros.length} errors`);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ error: 'Erro interno do servidor' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
