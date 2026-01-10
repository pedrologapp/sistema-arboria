import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Verify caller is admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !caller) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if caller is admin
    const { data: callerRole } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id)
      .eq('role', 'admin')
      .single()

    if (!callerRole) {
      return new Response(
        JSON.stringify({ error: 'Only admins can create professors' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const { email, nome, sobrenome, password, institution_id, casa_id, ano_letivo = 2025 } = await req.json()

    if (!email || !nome || !sobrenome || !password || !institution_id || !casa_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email, nome, sobrenome, password, institution_id, casa_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[create-professor] Creating professor: ${nome} ${sobrenome} (${email})`)

    // 1. Create user in Auth
    const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        nome,
        sobrenome,
        full_name: `${nome} ${sobrenome}`,
        must_change_password: true
      }
    })

    if (createError) {
      console.error('[create-professor] Auth error:', createError)
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = authData.user.id
    console.log(`[create-professor] User created with ID: ${userId}`)

    // 2. Update profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        nome,
        sobrenome,
        full_name: `${nome} ${sobrenome}`,
        institution_id,
        must_change_password: true
      })
      .eq('id', userId)

    if (profileError) {
      console.error('[create-professor] Profile error:', profileError)
    }

    // 3. Insert role 'professor' in user_roles
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({ user_id: userId, role: 'professor' })

    if (roleError) {
      console.error('[create-professor] Role error:', roleError)
      return new Response(
        JSON.stringify({ error: `Failed to set professor role: ${roleError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Link to casa via professor_casa
    const { error: casaError } = await supabaseAdmin
      .from('professor_casa')
      .insert({
        professor_id: userId,
        casa_id,
        institution_id,
        ano_letivo,
        eh_mentor_principal: true,
        ativo: true
      })

    if (casaError) {
      console.error('[create-professor] Casa link error:', casaError)
      return new Response(
        JSON.stringify({ error: `Failed to link professor to casa: ${casaError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[create-professor] Professor ${nome} ${sobrenome} created successfully!`)

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: userId,
          email,
          nome,
          sobrenome,
          full_name: `${nome} ${sobrenome}`,
          casa_id,
          institution_id
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[create-professor] Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
