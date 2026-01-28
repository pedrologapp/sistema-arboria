import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ImportUser {
  // Campos para alunos (email gerado automaticamente)
  matricula?: string;
  nome: string;
  sobrenome: string;
  instituicao: string;
  serie?: string;
  turma?: string;
  segmento?: string;
  casa_id?: number | null;
  // Email é obrigatório apenas para professores
  email?: string;
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

// Normaliza texto: remove acentos, apóstrofos, espaços, converte para minúsculas
function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[''`]/g, '') // Remove apóstrofos
    .replace(/\s+/g, '') // Remove espaços
    .toLowerCase()
    .trim();
}

// Gera email no padrão nome.sobrenome@aluno.arboria.com
function generateEmail(nome: string, sobrenome: string): string {
  const primeiroNome = normalizeText(nome.split(' ')[0]);
  const primeiroSobrenome = normalizeText(sobrenome.split(' ')[0]);
  return `${primeiroNome}.${primeiroSobrenome}@aluno.arboria.com`;
}

// Gera senha: sobrenome normalizado + 123
function generatePassword(sobrenome: string): string {
  return normalizeText(sobrenome) + '123';
}

// Verifica se email já existe e gera alternativo se necessário
async function getUniqueEmail(supabaseAdmin: any, baseEmail: string): Promise<string> {
  let email = baseEmail;
  let suffix = 1;
  
  while (true) {
    // Verificar se o email já existe no Auth
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers({
      filter: `email.eq.${email}`,
      perPage: 1
    });
    
    if (!existingUsers?.users?.length) {
      return email;
    }
    
    // Se existe, adicionar sufixo numérico
    suffix++;
    const [localPart, domain] = baseEmail.split('@');
    email = `${localPart}${suffix}@${domain}`;
  }
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
        if (!user.nome || !user.nome.trim()) {
          errors.push({ line: lineNumber, email: user.email || user.matricula || '', error: 'Nome é obrigatório' });
          continue;
        }
        if (!user.sobrenome || !user.sobrenome.trim()) {
          errors.push({ line: lineNumber, email: user.email || user.matricula || '', error: 'Sobrenome é obrigatório' });
          continue;
        }
        if (!user.instituicao || !user.instituicao.trim()) {
          errors.push({ line: lineNumber, email: user.email || user.matricula || '', error: 'Instituição é obrigatória' });
          continue;
        }

        // Institution ID is passed directly
        const institutionId = user.instituicao;
        const fullName = `${user.nome.trim()} ${user.sobrenome.trim()}`;

        // Determine role based on tipo
        const userRole = tipo === 'professores' ? 'professor' : 'user';
        const isAluno = userRole === 'user';

        // Generate or use provided email
        let email: string;
        if (isAluno) {
          // For students, validate matricula and generate email
          if (!user.matricula || !user.matricula.trim()) {
            errors.push({ line: lineNumber, email: '', error: 'Matrícula é obrigatória para alunos' });
            continue;
          }
          const baseEmail = generateEmail(user.nome, user.sobrenome);
          email = await getUniqueEmail(supabaseAdmin, baseEmail);
        } else {
          // For professors, email is required
          if (!user.email || !user.email.trim()) {
            errors.push({ line: lineNumber, email: '', error: 'Email é obrigatório para professores' });
            continue;
          }
          email = user.email.trim();
        }

        // Generate password from surname
        const password = generatePassword(user.sobrenome);

        // Validate password length
        if (password.length < 6) {
          errors.push({ line: lineNumber, email, error: 'Sobrenome muito curto para gerar senha válida (mínimo 3 letras)' });
          continue;
        }

        // Create the user using admin API
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
          console.error(`Error creating user ${email}:`, createError);
          errors.push({ line: lineNumber, email, error: createError.message });
          continue;
        }

        console.log(`User created: ${email} (${newUser.user.id})`);

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
            segmento: user.segmento?.trim() || null,
            casa_id: user.casa_id || null,
            matricula_externa: user.matricula?.trim() || null,
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
        if (isAluno) {
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
        console.error(`Unexpected error for user ${user.email || user.matricula}:`, error);
        errors.push({ line: lineNumber, email: user.email || user.matricula || '', error: 'Erro inesperado' });
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
