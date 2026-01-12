import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ImportUser {
  email: string;
  nome: string;
  sobrenome: string;
  instituicao: string;
  serie?: string;
  turma?: string;
  casa_id?: number;
  // Inteligências opcionais (0-100)
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
  email: string;
  error: string;
}

// Mapeamento de campos para IDs de inteligência
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

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Get the authorization header to verify the caller is an admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify the caller is an admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !caller) {
      console.error('Auth error:', authError);
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if caller has admin role
    const { data: callerRoles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id)
      .eq('role', 'admin')
      .single();

    if (rolesError || !callerRoles) {
      console.error('Caller is not an admin:', rolesError);
      return new Response(JSON.stringify({ error: 'Apenas administradores podem importar usuários' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const { users, tipo } = await req.json() as { users: ImportUser[], tipo?: string };

    if (!users || !Array.isArray(users) || users.length === 0) {
      return new Response(JSON.stringify({ error: 'Nenhum usuário para importar' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Starting import of ${users.length} users (tipo: ${tipo || 'alunos'})`);

    // Get current year for ano_letivo
    const anoLetivo = new Date().getFullYear();

    const errors: ImportError[] = [];
    let successCount = 0;

    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const lineNumber = i + 2; // +2 because of header row and 0-indexing

      try {
        // Validate required fields
        if (!user.email || !user.email.trim()) {
          errors.push({ line: lineNumber, email: user.email || '', error: 'Email é obrigatório' });
          continue;
        }
        if (!user.nome || !user.nome.trim()) {
          errors.push({ line: lineNumber, email: user.email, error: 'Nome é obrigatório' });
          continue;
        }
        if (!user.sobrenome || !user.sobrenome.trim()) {
          errors.push({ line: lineNumber, email: user.email, error: 'Sobrenome é obrigatório' });
          continue;
        }
        if (!user.instituicao || !user.instituicao.trim()) {
          errors.push({ line: lineNumber, email: user.email, error: 'Instituição é obrigatória' });
          continue;
        }

        // Institution ID is passed directly now
        const institutionId = user.instituicao;

        // Generate password from surname
        const normalizedSobrenome = normalizeSobrenome(user.sobrenome);
        const password = normalizedSobrenome + '123';
        const fullName = `${user.nome.trim()} ${user.sobrenome.trim()}`;

        // Validate password length
        if (password.length < 6) {
          errors.push({ line: lineNumber, email: user.email, error: 'Sobrenome muito curto para gerar senha válida (mínimo 3 letras)' });
          continue;
        }

        // Determine role based on tipo
        const userRole = tipo === 'professores' ? 'professor' : 'user';

        // Create the user using admin API
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: user.email.trim(),
          password,
          email_confirm: true,
          user_metadata: {
            nome: user.nome.trim(),
            sobrenome: user.sobrenome.trim(),
            full_name: fullName,
            institution_id: institutionId,
            serie: user.serie?.trim() || null,
            turma: user.turma?.trim() || null,
            casa_id: user.casa_id || null,
            must_change_password: true
          }
        });

        if (createError) {
          console.error(`Error creating user ${user.email}:`, createError);
          errors.push({ line: lineNumber, email: user.email, error: createError.message });
          continue;
        }

        console.log(`User created: ${user.email} (${newUser.user.id})`);

        // Update the profile with all fields
        await supabaseAdmin
          .from('profiles')
          .update({ 
            nome: user.nome.trim(),
            sobrenome: user.sobrenome.trim(),
            full_name: fullName,
            institution_id: institutionId,
            serie: user.serie?.trim() || null,
            turma: user.turma?.trim() || null,
            casa_id: user.casa_id || null,
            must_change_password: true
          })
          .eq('id', newUser.user.id);

        // Add user role
        await supabaseAdmin
          .from('user_roles')
          .insert({
            user_id: newUser.user.id,
            role: userRole
          });

        // If professor with casa_id, create professor_casa link
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

        // Insert intelligence scores if provided (for alunos only)
        if (userRole === 'user') {
          for (const int of INTELIGENCIAS_MAP) {
            const valor = (user as any)[int.campo] || 0;
            if (valor > 0) {
              const scoreNormalizado = Math.min(100, Math.max(0, valor));
              
              await supabaseAdmin
                .from('inteligencia_scores')
                .upsert({
                  aluno_id: newUser.user.id,
                  inteligencia_id: int.id,
                  score_atual: scoreNormalizado,
                  ano_letivo: anoLetivo
                }, {
                  onConflict: 'aluno_id,inteligencia_id,ano_letivo'
                });
            }
          }
        }

        successCount++;
      } catch (error) {
        console.error(`Unexpected error for user ${user.email}:`, error);
        errors.push({ line: lineNumber, email: user.email, error: 'Erro inesperado' });
      }
    }

    console.log(`Import completed: ${successCount} success, ${errors.length} errors`);

    return new Response(JSON.stringify({ 
      success: true, 
      total: users.length,
      success_count: successCount,
      errors: errors.map(e => `Linha ${e.line}: ${e.email} - ${e.error}`)
    }), {
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
