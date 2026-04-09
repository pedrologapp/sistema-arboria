import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://arboria.escolaamadeus.com',
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

interface SuccessfulUser {
  authId: string;
  aluno: AlunoImport;
  email: string;
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

// Preposições comuns em sobrenomes portugueses
const PREPOSICOES = ['de', 'da', 'do', 'dos', 'das', 'e', 'del', 'di'];

function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[''`]/g, '')
    .replace(/\s+/g, '')
    .toLowerCase()
    .trim();
}

// Encontra o primeiro fragmento significativo (não-preposição)
function getFragmentoSignificativo(texto: string): string {
  const partes = texto.split(' ').filter(p => p.trim());
  for (const parte of partes) {
    if (!PREPOSICOES.includes(parte.toLowerCase())) {
      return parte;
    }
  }
  return partes[0] || texto; // Fallback para primeiro fragmento
}

function generateDeterministicEmail(nome: string, sobrenome: string, matricula: string): string {
  const primeiroNome = normalizeText(nome.split(' ')[0]);
  const fragmentoSobrenome = normalizeText(getFragmentoSignificativo(sobrenome));
  const matriculaNorm = matricula.replace(/[^a-zA-Z0-9]/g, '');
  return `${primeiroNome}.${fragmentoSobrenome}.${matriculaNorm}@aluno.arboria.com`;
}

function generatePassword(sobrenome: string): string {
  const fragmento = getFragmentoSignificativo(sobrenome);
  return normalizeText(fragmento) + '123';
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

    console.log(`[import-alunos-rapido] Iniciando importação de ${alunos.length} alunos com Auth paralelo`);

    const anoLetivo = new Date().getFullYear();
    const errors: string[] = [];
    const successfulUsers: SuccessfulUser[] = [];
    const updatedUsers: { id: string; aluno: AlunoImport; email: string }[] = [];

    // Buscar matrículas existentes para upsert
    const matriculas = alunos.map(a => a.matricula.trim());
    const { data: existingProfiles } = await supabaseAdmin
      .from('profiles')
      .select('id, matricula_externa, email_gerado')
      .eq('institution_id', institutionId)
      .in('matricula_externa', matriculas);

    const existingMap = new Map(existingProfiles?.map(p => [p.matricula_externa, p]) || []);

    // Separar alunos novos dos existentes
    const alunosNovos: AlunoImport[] = [];
    const alunosExistentes: { aluno: AlunoImport; profileId: string }[] = [];

    for (const aluno of alunos) {
      if (!aluno.matricula?.trim() || !aluno.nome?.trim() || !aluno.sobrenome?.trim()) {
        errors.push(`Matrícula ${aluno.matricula || 'vazia'}: dados incompletos`);
        continue;
      }

      const existing = existingMap.get(aluno.matricula.trim());
      if (existing) {
        alunosExistentes.push({ aluno, profileId: existing.id });
      } else {
        alunosNovos.push(aluno);
      }
    }

    console.log(`[import-alunos-rapido] ${alunosNovos.length} novos, ${alunosExistentes.length} existentes`);

    // FASE 1: Criar contas Auth para alunos NOVOS em paralelo (lotes de 10)
    const BATCH_SIZE = 10;
    
    for (let i = 0; i < alunosNovos.length; i += BATCH_SIZE) {
      const batch = alunosNovos.slice(i, i + BATCH_SIZE);
      
      const results = await Promise.allSettled(
        batch.map(async (aluno) => {
          const email = generateDeterministicEmail(aluno.nome, aluno.sobrenome, aluno.matricula);
          const password = generatePassword(aluno.sobrenome);
          
          if (password.length < 6) {
            throw new Error(`Sobrenome muito curto: ${aluno.sobrenome}`);
          }

          const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
              nome: aluno.nome,
              sobrenome: aluno.sobrenome,
              full_name: `${aluno.nome} ${aluno.sobrenome}`,
              institution_id: institutionId,
              must_change_password: true
            }
          });

          if (createError) {
            throw new Error(createError.message);
          }

          return {
            authId: newUser.user.id,
            aluno,
            email
          };
        })
      );

      // Processar resultados do lote
      for (let j = 0; j < results.length; j++) {
        const result = results[j];
        const aluno = batch[j];
        
        if (result.status === 'fulfilled') {
          successfulUsers.push(result.value);
        } else {
          errors.push(`${aluno.nome} ${aluno.sobrenome}: ${result.reason?.message || 'Erro desconhecido'}`);
        }
      }

      console.log(`[import-alunos-rapido] Lote ${Math.floor(i / BATCH_SIZE) + 1}: ${successfulUsers.length} criados`);
    }

    // FASE 2: Atualizar profiles criados pelo trigger handle_new_user
    if (successfulUsers.length > 0) {
      for (const user of successfulUsers) {
        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({
            nome: user.aluno.nome.trim(),
            sobrenome: user.aluno.sobrenome.trim(),
            full_name: `${user.aluno.nome.trim()} ${user.aluno.sobrenome.trim()}`,
            institution_id: institutionId,
            serie: user.aluno.serie?.trim() || null,
            turma: user.aluno.turma?.trim() || null,
            segmento: user.aluno.segmento?.trim() || null,
            casa_id: user.aluno.casa_id || null,
            matricula_externa: user.aluno.matricula.trim(),
            email_gerado: user.email,
            conta_criada: true,
            must_change_password: true,
          })
          .eq('id', user.authId);

        if (updateError) {
          console.error(`[import-alunos-rapido] Erro ao atualizar profile ${user.authId}:`, updateError);
        }
      }

      // FASE 3: Inserir roles individualmente para evitar problemas com enum
      for (const user of successfulUsers) {
        const { error: roleError } = await supabaseAdmin
          .from('user_roles')
          .insert({ 
            user_id: user.authId, 
            role: 'user' 
          });
        
        if (roleError) {
          console.error(`[import-alunos-rapido] Erro role ${user.authId}:`, roleError);
        }
      }

      // FASE 4: Inserir scores em batch
      const scoresData: { aluno_id: string; inteligencia_id: number; score_atual: number; ano_letivo: number }[] = [];
      
      for (const user of successfulUsers) {
        for (const int of INTELIGENCIAS_MAP) {
          const valor = (user.aluno as any)[int.campo] || 35;
          scoresData.push({
            aluno_id: user.authId,
            inteligencia_id: int.id,
            score_atual: Math.min(100, Math.max(0, valor)),
            ano_letivo: anoLetivo
          });
        }
      }

      const { error: scoresError } = await supabaseAdmin
        .from('inteligencia_scores')
        .upsert(scoresData, { onConflict: 'aluno_id,inteligencia_id,ano_letivo' });

      if (scoresError) {
        console.error('[import-alunos-rapido] Erro ao inserir scores:', scoresError);
      }
    }

    // FASE 5: Atualizar alunos existentes
    for (const { aluno, profileId } of alunosExistentes) {
      const email = generateDeterministicEmail(aluno.nome, aluno.sobrenome, aluno.matricula);
      
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
          nome: aluno.nome.trim(),
          sobrenome: aluno.sobrenome.trim(),
          full_name: `${aluno.nome.trim()} ${aluno.sobrenome.trim()}`,
          serie: aluno.serie?.trim() || null,
          turma: aluno.turma?.trim() || null,
          segmento: aluno.segmento?.trim() || null,
          casa_id: aluno.casa_id || null,
          email_gerado: email,
        })
        .eq('id', profileId);

      if (updateError) {
        errors.push(`Atualização ${aluno.nome}: ${updateError.message}`);
      } else {
        updatedUsers.push({ id: profileId, aluno, email });
      }

      // Atualizar scores se fornecidos
      for (const int of INTELIGENCIAS_MAP) {
        const valor = (aluno as any)[int.campo];
        if (valor && valor > 0) {
          await supabaseAdmin
            .from('inteligencia_scores')
            .upsert({
              aluno_id: profileId,
              inteligencia_id: int.id,
              score_atual: Math.min(100, Math.max(0, valor)),
              ano_letivo: anoLetivo
            }, { onConflict: 'aluno_id,inteligencia_id,ano_letivo' });
        }
      }
    }

    console.log(`[import-alunos-rapido] Concluído: ${successfulUsers.length} criados, ${updatedUsers.length} atualizados, ${errors.length} erros`);

    return new Response(JSON.stringify({ 
      success: true, 
      total: alunos.length,
      criados: successfulUsers.length,
      atualizados: updatedUsers.length,
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
