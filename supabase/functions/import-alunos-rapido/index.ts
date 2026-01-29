import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AlunoImport {
  matricula: string;
  nome: string;
  sobrenome: string;
  serie: string;
  turma: string;
  segmento: string;
  casa_id?: number | null;
  int_intrapessoal?: number;
  int_interpessoal?: number;
  int_naturalista?: number;
  int_logico?: number;
  int_linguistica?: number;
  int_espacial?: number;
  int_corporal?: number;
  int_musical?: number;
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

function generateDeterministicEmail(nome: string, sobrenome: string, matricula: string): string {
  const primeiroNome = normalizeText(nome.split(' ')[0]);
  const primeiroSobrenome = normalizeText(sobrenome.split(' ')[0]);
  const matriculaNorm = matricula.replace(/[^a-zA-Z0-9]/g, '');
  return `${primeiroNome}.${primeiroSobrenome}.${matriculaNorm}@aluno.arboria.com`;
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
      return new Response(JSON.stringify({ error: 'Apenas administradores podem importar' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { alunos, institutionId } = await req.json() as { 
      alunos: AlunoImport[], 
      institutionId: string 
    };

    if (!alunos || !Array.isArray(alunos) || alunos.length === 0) {
      return new Response(JSON.stringify({ error: 'Nenhum aluno para importar' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[import-alunos-rapido] Iniciando importação de ${alunos.length} alunos`);

    const anoLetivo = new Date().getFullYear();
    let criados = 0;
    let atualizados = 0;
    const errors: string[] = [];

    // Buscar matrículas existentes para upsert
    const matriculas = alunos.map(a => a.matricula.trim());
    const { data: existingProfiles } = await supabaseAdmin
      .from('profiles')
      .select('id, matricula_externa')
      .eq('institution_id', institutionId)
      .in('matricula_externa', matriculas);

    const existingMap = new Map(existingProfiles?.map(p => [p.matricula_externa, p.id]) || []);

    // Preparar dados para inserção/atualização em batch
    const profilesToInsert: any[] = [];
    const profilesToUpdate: { id: string; data: any }[] = [];
    const rolesData: { user_id: string; role: string }[] = [];
    const scoresData: { aluno_id: string; inteligencia_id: number; score_atual: number; ano_letivo: number }[] = [];

    for (let i = 0; i < alunos.length; i++) {
      const aluno = alunos[i];
      const lineNumber = i + 2;

      // Validações básicas
      if (!aluno.matricula?.trim() || !aluno.nome?.trim() || !aluno.sobrenome?.trim()) {
        errors.push(`Linha ${lineNumber}: Matrícula, nome e sobrenome são obrigatórios`);
        continue;
      }

      const matricula = aluno.matricula.trim();
      const fullName = `${aluno.nome.trim()} ${aluno.sobrenome.trim()}`;
      const emailGerado = generateDeterministicEmail(aluno.nome, aluno.sobrenome, matricula);

      const existingId = existingMap.get(matricula);

      if (existingId) {
        // ATUALIZAR existente
        profilesToUpdate.push({
          id: existingId,
          data: {
            nome: aluno.nome.trim(),
            sobrenome: aluno.sobrenome.trim(),
            full_name: fullName,
            serie: aluno.serie?.trim() || null,
            turma: aluno.turma?.trim() || null,
            segmento: aluno.segmento?.trim() || null,
            casa_id: aluno.casa_id || null,
            email_gerado: emailGerado,
          }
        });
        atualizados++;

        // Atualizar scores se fornecidos
        for (const int of INTELIGENCIAS_MAP) {
          const valor = (aluno as any)[int.campo] || 0;
          if (valor > 0) {
            scoresData.push({
              aluno_id: existingId,
              inteligencia_id: int.id,
              score_atual: Math.min(100, Math.max(0, valor)),
              ano_letivo: anoLetivo
            });
          }
        }
      } else {
        // CRIAR novo - gerar UUID
        const newId = crypto.randomUUID();
        
        profilesToInsert.push({
          id: newId,
          nome: aluno.nome.trim(),
          sobrenome: aluno.sobrenome.trim(),
          full_name: fullName,
          institution_id: institutionId,
          serie: aluno.serie?.trim() || null,
          turma: aluno.turma?.trim() || null,
          segmento: aluno.segmento?.trim() || null,
          casa_id: aluno.casa_id || null,
          matricula_externa: matricula,
          email_gerado: emailGerado,
          conta_criada: false,
          must_change_password: true,
        });

        // Preparar role
        rolesData.push({ user_id: newId, role: 'user' });

        // Preparar scores iniciais (35 ou valor do CSV)
        for (const int of INTELIGENCIAS_MAP) {
          const valor = (aluno as any)[int.campo] || 35;
          scoresData.push({
            aluno_id: newId,
            inteligencia_id: int.id,
            score_atual: Math.min(100, Math.max(0, valor)),
            ano_letivo: anoLetivo
          });
        }

        criados++;
      }
    }

    // Executar inserções em batch
    if (profilesToInsert.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from('profiles')
        .insert(profilesToInsert);
      
      if (insertError) {
        console.error('[import-alunos-rapido] Erro ao inserir profiles:', insertError);
        errors.push(`Erro ao inserir profiles: ${insertError.message}`);
      }
    }

    // Executar atualizações (uma por uma, pois Supabase não suporta batch update)
    for (const update of profilesToUpdate) {
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update(update.data)
        .eq('id', update.id);
      
      if (updateError) {
        console.error(`[import-alunos-rapido] Erro ao atualizar ${update.id}:`, updateError);
      }
    }

    // Inserir roles em batch
    if (rolesData.length > 0) {
      const { error: rolesError } = await supabaseAdmin
        .from('user_roles')
        .upsert(rolesData, { onConflict: 'user_id,role' });
      
      if (rolesError) {
        console.error('[import-alunos-rapido] Erro ao inserir roles:', rolesError);
      }
    }

    // Inserir scores em batch
    if (scoresData.length > 0) {
      const { error: scoresError } = await supabaseAdmin
        .from('inteligencia_scores')
        .upsert(scoresData, { onConflict: 'aluno_id,inteligencia_id,ano_letivo' });
      
      if (scoresError) {
        console.error('[import-alunos-rapido] Erro ao inserir scores:', scoresError);
      }
    }

    console.log(`[import-alunos-rapido] Concluído: ${criados} criados, ${atualizados} atualizados, ${errors.length} erros`);

    return new Response(JSON.stringify({ 
      success: true, 
      total: alunos.length,
      criados,
      atualizados,
      errors
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[import-alunos-rapido] Erro fatal:', error);
    return new Response(JSON.stringify({ error: 'Erro interno do servidor' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
