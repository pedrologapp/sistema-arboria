import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Observacao {
  sinal: string;
  sinal_codigo: string;
  valencia: string;
  data: string;
  emoji: string;
}

interface Hipotese {
  titulo: string;
  descricao: string;
  perguntas?: string[];
}

interface AcaoSugerida {
  acao: string;
  prioridade: "alta" | "media" | "baixa";
}

interface PadraoIdentificado {
  nome: string;
  significado: string;
  acao_recomendada?: string;
}

interface AlertaGerado {
  estado: "precisa_atencao" | "celebrar" | "nao_esquecer" | "neutro";
  deve_gerar_alerta: boolean;
  alerta?: {
    sinal_principal: string;
    sinal_codigo: string;
    quantidade: number;
    texto_acontecendo: string;
    padrao_identificado?: PadraoIdentificado;
    contexto: string[];
    hipoteses: Hipotese[];
    acoes_sugeridas?: AcaoSugerida[];
  };
}

// ==========================================
// DICIONÁRIO EXPANDIDO
// ==========================================

const DICIONARIO_SINAIS_EXPANDIDO = `
## SINAIS DE OBSERVAÇÃO

### Sinais Positivos (valencia="positivo")
| Código | Nome | Descrição | Indica que o aluno... |
|--------|------|-----------|----------------------|
| brilhou | Brilhou | Demonstrou domínio excepcional | Está engajado e confiante nessa inteligência |
| aprendeu_rapido | Aprendeu rápido | Absorveu o conteúdo rapidamente | Tem facilidade nessa área |
| inovou | Inovou | Trouxe uma solução criativa | Pensa fora da caixa |
| persistiu | Persistiu | Não desistiu diante da dificuldade | Está desenvolvendo resiliência |
| liderou | Liderou | Tomou a frente do grupo | Tem potencial de liderança |
| colaborou | Colaborou | Ajudou os colegas | Demonstra inteligência interpessoal |
| estava_bem | Estava bem | Parecia bem e equilibrado | Está emocionalmente estável |

### Sinais de Atenção (valencia="atencao")
| Código | Nome | Descrição | Indica que o aluno... | Gravidade |
|--------|------|-----------|----------------------|-----------|
| travou | Travou | Não conseguiu avançar | Está enfrentando bloqueio cognitivo ou emocional | Média |
| desistiu | Desistiu | Abandonou antes de terminar | Está frustrado ou desmotivado | Alta |
| isolou | Se isolou | Afastou-se do grupo | Pode estar passando por algo | Média |
| calado | Ficou calado | Não participou verbalmente | Pode estar inseguro ou pensativo | Média |
| conflitou | Conflitou | Teve desentendimento | Está com dificuldade de regulação | Alta |
| triste | Parecia triste | Expressou tristeza | Pode estar passando por dificuldade emocional | Alta |
| ansioso | Parecia ansioso | Mostrou sinais de ansiedade | Está sob pressão | Alta |
| algo_diferente | Algo diferente | Comportamento atípico | Algo mudou na vida dele | Média |
`;

const DICIONARIO_HIPOTESES_EXPANDIDO = `
## HIPÓTESES POR SINAL DE ATENÇÃO

### Parecia triste (triste)
1. **Problema familiar**: Pode haver tensão em casa, separação dos pais, conflitos familiares
   - Perguntas: "Está tudo bem em casa?" / "Quer me contar algo?"
2. **Perda ou luto**: Pode ter perdido alguém ou algo importante (pet, amizade, objeto)
   - Perguntas: "Aconteceu algo difícil recentemente?"
3. **Problema de amizade**: Pode ter brigado com amigo(a) ou se sentido excluído
   - Perguntas: "Como estão as coisas com seus amigos?"
4. **Frustração acadêmica**: Pode estar se sentindo incapaz ou comparando-se aos outros
   - Perguntas: "Tem algo nas aulas que está te incomodando?"
5. **Bullying**: Pode estar sofrendo intimidação e não sabe como reagir
   - Perguntas: "Alguém está te incomodando?" / Observar interações
6. **Mudança de fase**: Dificuldade de adaptação à nova etapa de desenvolvimento
   - Perguntas: "Como você está se sentindo com as mudanças?"

### Parecia ansioso (ansioso)
1. **Pressão por desempenho**: Pode estar sob cobrança excessiva (própria ou da família)
   - Perguntas: "Você sente que precisa tirar notas perfeitas?"
2. **Medo de errar**: Perfeccionismo que paralisa
   - Perguntas: "O que acontece se você não conseguir?"
3. **Problemas em casa**: Situação familiar gerando insegurança
   - Perguntas: "Tem algo preocupando você além da escola?"
4. **Ansiedade social**: Medo de exposição ou julgamento dos colegas
   - Perguntas: "Você se sente confortável com a turma?"
5. **Mudanças recentes**: Escola nova, mudança de cidade, novo irmão
   - Perguntas: "Como está sendo lidar com as mudanças?"
6. **Excesso de atividades**: Agenda sobrecarregada gerando estresse
   - Perguntas: "Quantas atividades você faz por dia?"

### Se isolou (isolou)
1. **Exclusão social**: Pode estar sendo excluído por colegas
   - Perguntas: "Com quem você gosta de passar tempo aqui?"
2. **Introspecção**: Pode estar processando algo interno
   - Perguntas: "Está pensando em algo específico?"
3. **Conflito recente**: Pode ter tido desentendimento e quer evitar confronto
   - Perguntas: "Aconteceu algo com alguém da turma?"
4. **Vergonha**: Pode ter se sentido humilhado em alguma situação
   - Perguntas: "Algo aconteceu que te deixou desconfortável?"
5. **Preferência natural**: Pode simplesmente preferir momentos solo (personalidade introvertida)
   - Observar se é padrão ou mudança de comportamento
6. **Bullying silencioso**: Pode estar evitando situações de bullying
   - Perguntas: "Você se sente seguro na escola?"

### Conflitou (conflitou)
1. **Dificuldade de regulação emocional**: Não sabe lidar com a frustração
   - Perguntas: "O que você sentiu antes de reagir?"
2. **Problemas em casa**: Pode estar espelhando conflitos domésticos
   - Perguntas: "Como estão as coisas em casa?"
3. **Sentimento de injustiça**: Pode sentir que foi tratado de forma injusta
   - Perguntas: "O que te fez sentir assim?"
4. **Provocação**: Pode estar sendo provocado e reagindo
   - Perguntas: "Alguém fez algo que te incomodou antes?"
5. **Fase da adolescência**: Hormônios e busca por autonomia
   - Entender o contexto da idade
6. **Necessidade não atendida**: Pode estar tentando chamar atenção para algo
   - Perguntas: "Do que você está precisando?"

### Desistiu (desistiu)
1. **Frustração acumulada**: Pode estar cansado de "não conseguir"
   - Perguntas: "Essa atividade te pareceu muito difícil?"
2. **Falta de conexão**: Pode não ver sentido na atividade
   - Perguntas: "O que tornaria isso mais interessante pra você?"
3. **Medo de falhar**: Prefere não tentar a arriscar errar
   - Perguntas: "O que acontece se não sair perfeito?"
4. **Dificuldade real**: Pode não ter a base necessária
   - Avaliar lacunas de conhecimento
5. **Comparação com outros**: Pode se sentir inferior aos colegas
   - Perguntas: "Você sente que os outros são melhores nisso?"
6. **Cansaço/esgotamento**: Pode estar física ou mentalmente exausto
   - Perguntas: "Como você está dormindo?"

### Travou (travou)
1. **Bloqueio cognitivo**: Não conseguiu processar a informação
   - Tentar explicar de outra forma
2. **Ansiedade de performance**: O medo de errar paralisou
   - Reduzir a pressão, normalizar o erro
3. **Falta de base**: Pode não ter conhecimento prévio necessário
   - Identificar lacunas
4. **Distração**: Algo externo pode ter tirado o foco
   - Perguntas: "Está conseguindo se concentrar hoje?"
5. **Estilo de aprendizagem diferente**: Pode precisar de outra abordagem
   - Testar método diferente (visual, prático, etc.)
6. **Fase fora da sua casa**: A inteligência trabalhada não é sua força
   - Usar a inteligência forte como ponte

### Ficou calado (calado)
1. **Timidez natural**: Pode ser característica de personalidade
   - Criar formas alternativas de participação
2. **Insegurança**: Medo de falar besteira na frente dos outros
   - Perguntas: "Você pensou em algo mas não quis falar?"
3. **Processamento interno**: Pode estar refletindo profundamente
   - Dar tempo e retomar depois
4. **Não entendeu**: Pode não ter compreendido o que foi pedido
   - Verificar entendimento individualmente
5. **Desinteresse**: Pode não estar engajado com o tema
   - Buscar conexão com interesses do aluno
6. **Algo pessoal**: Pode estar preocupado com algo fora da escola
   - Perguntas: "Está tudo bem com você hoje?"

### Algo diferente (algo_diferente)
1. **Mudança recente na vida**: Nova situação familiar, perda, mudança
   - Conversar em particular
2. **Saúde física**: Pode estar doente ou mal dormido
   - Verificar sinais físicos
3. **Problema emocional**: Pode estar passando por fase difícil
   - Acolher e observar continuidade
4. **Uso de substâncias**: Em adolescentes mais velhos, considerar
   - Observar outros sinais
5. **Relacionamento**: Pode estar vivendo primeiro amor ou término
   - Respeitar privacidade, mas mostrar disponibilidade
6. **Intuição do professor**: Às vezes o professor percebe antes de entender
   - Confiar no instinto e acompanhar de perto
`;

const DICIONARIO_PADROES = `
## COMBINAÇÕES DE SINAIS (PADRÕES)

### Padrões de Alta Preocupação
| Combinação | Nome do Padrão | Significado | Ação Recomendada |
|------------|---------------|-------------|------------------|
| triste + isolou | Retraimento emocional | Pode estar em sofrimento psíquico | Conversa urgente com o aluno |
| triste + triste | Tristeza persistente | Possível quadro depressivo | Encaminhar para psicólogo escolar |
| conflitou + conflitou | Padrão de conflito | Dificuldade persistente de relacionamento | Envolver família e orientação |
| desistiu + desistiu | Desistência crônica | Baixa autoeficácia instalada | Trabalhar autoestima e pequenas vitórias |
| ansioso + travou | Ansiedade paralisante | Ansiedade está afetando desempenho | Reduzir pressão, criar ambiente seguro |
| isolou + calado | Isolamento total | Possível sofrimento não verbalizado | Prioridade máxima de atenção |
| triste + desistiu | Desesperança | Pode estar perdendo a motivação | Intervenção imediata |

### Padrões de Atenção Moderada
| Combinação | Nome do Padrão | Significado | Ação Recomendada |
|------------|---------------|-------------|------------------|
| travou + brilhou | Oscilação | Potencial com bloqueios | Identificar gatilhos |
| calado + colaborou | Participação seletiva | Se sente seguro em certos contextos | Expandir contextos seguros |
| desistiu + persistiu | Inconsistência | Motivação variável | Entender fatores motivacionais |
| algo_diferente + brilhou | Mudança positiva | Pode estar descobrindo algo novo | Observar e celebrar |
`;

const DICIONARIO_CONTEXTO_SERIE = `
## CONTEXTO POR SÉRIE/IDADE

### 6º Ano (10-11 anos)
- Transição do Fundamental I: tudo é novo e pode assustar
- Formando novas amizades: grupos ainda não consolidados
- Início da pré-adolescência: corpo começando a mudar
- Valoriza aprovação do professor: ainda muito ligado à autoridade
- Sente falta da rotina anterior: pode parecer "perdido"

### 7º Ano (11-12 anos)
- Buscando identidade: testa limites e questiona regras
- Grupos mais definidos: exclusão pode ser muito dolorosa
- Puberdade em andamento: oscilações de humor frequentes
- Começa a questionar autoridades: pode parecer "respondão"
- Interesse por aceitação social: medo intenso de julgamento

### 8º Ano (12-13 anos)
- Quer autonomia: pode resistir a intervenções
- Pressão do grupo é forte: faz coisas para pertencer
- Oscilações emocionais intensas: choro fácil ou raiva
- Primeiros relacionamentos amorosos: pode afetar muito o humor
- Preocupação com aparência: autoestima frágil

### 9º Ano (13-14 anos)
- Pensando no futuro: pressão do "o que vai ser"
- Mais reflexivo: pode parecer mais maduro
- Amizades mais profundas: perdas são muito sentidas
- Cobrança acadêmica maior: vestibular começa a aparecer
- Senso de identidade mais formado: opiniões próprias
`;

const DICIONARIO_ACOES = `
## SUGESTÕES DE AÇÃO POR TIPO DE SINAL

### Para sinais emocionais (triste, ansioso, algo_diferente)
| Ação | Descrição | Prioridade |
|------|-----------|------------|
| Conversa individual | Encontrar momento privado para conversar | Alta |
| Escuta ativa | Mais ouvir do que falar | Alta |
| Normalizar sentimentos | "É normal sentir isso às vezes" | Média |
| Encaminhar | Se persistir, encaminhar para orientação/psicólogo | Alta |
| Informar família | Compartilhar observação com responsáveis | Média |
| Reduzir pressão | Ajustar expectativas temporariamente | Média |

### Para sinais sociais (isolou, conflitou, calado)
| Ação | Descrição | Prioridade |
|------|-----------|------------|
| Observar dinâmicas | Entender o contexto social da turma | Alta |
| Mediar conflito | Se houver partes, mediar conversa | Alta |
| Reorganizar grupos | Colocar com colegas mais acolhedores | Média |
| Atividade de integração | Propor atividade que una a turma | Média |
| Conversar com turma | Trabalhar empatia e inclusão | Média |
| Papel especial | Dar responsabilidade que valorize o aluno | Baixa |

### Para sinais cognitivos (travou, desistiu)
| Ação | Descrição | Prioridade |
|------|-----------|------------|
| Explicar diferente | Usar outra abordagem pedagógica | Alta |
| Dividir em partes | Fragmentar a tarefa em etapas menores | Alta |
| Usar força dele | Conectar com a inteligência principal | Média |
| Elogiar esforço | Valorizar tentativa, não só resultado | Média |
| Oferecer ajuda | Disponibilizar monitoria ou apoio extra | Média |
| Ajustar desafio | Adequar nível de dificuldade | Média |
`;

const DICIONARIO_TEMPLATES = `
## TEMPLATES DE FRASES PARA ALERTAS

### Para 2 atenções iguais:
"{nome} registrou '{sinal}' nas últimas 2 observações consecutivas."
"{nome} apresentou '{sinal}' duas vezes seguidas, o que pode indicar..."

### Para 2 atenções diferentes:
"{nome} apresentou sinais de atenção: '{sinal_1}' e '{sinal_2}'."
"{nome} mostrou '{sinal_1}' seguido de '{sinal_2}', sugerindo..."

### Para padrão de alta preocupação:
"{nome} está mostrando um padrão preocupante: {nome_padrao}."
"ATENÇÃO: {nome} demonstra {significado_padrao}."

### Para mudança abrupta:
"{nome} tinha histórico positivo, mas mudou recentemente para sinais de atenção."
"Mudança importante: {nome} passou de comportamentos positivos para {sinal}."

### Para melhora/recuperação:
"{nome} está mostrando melhora após período difícil."
"Boas notícias: {nome} voltou a apresentar sinais positivos!"
`;

const DICIONARIO_CELEBRACOES = `
## TIPOS DE CELEBRAÇÃO

| Tipo | Condição | Título Sugerido |
|------|----------|-----------------|
| descoberta | 3+ positivos em fase ≠ casa | 🌟 DESCOBERTA! |
| confirmacao | 5+ positivos em fase = casa | ⭐ CONFIRMAÇÃO! |
| recuperacao | Saiu de alerta para positivo | 🎉 RECUPERAÇÃO! |
| consistencia | 5+ positivos consecutivos | 🔥 CONSISTÊNCIA! |
| lideranca | Sinal "liderou" registrado | 👑 LIDERANÇA! |
| colaboracao | Sinal "colaborou" registrado | 🤝 COLABORAÇÃO! |
`;

// Build the complete expanded prompt
function montarPromptExpandido(
  aluno: { 
    nome: string; 
    serie: string; 
    casa: string; 
    casaCodigo: string; 
    faseAtual: string; 
    faseAtualCodigo: string 
  },
  observacoes: Observacao[]
): string {
  const obsFormatadas = observacoes
    .map((o, i) => `${i + 1}. ${o.emoji} ${o.sinal} (${o.valencia}) - ${o.data}`)
    .join("\n");

  // Detectar série para contexto
  const serieNum = parseInt(aluno.serie) || 6;
  
  return `Você é um assistente especializado do Projeto Arboria que analisa observações de alunos para gerar alertas precisos e contextualizados.

# DADOS DO ALUNO
- Nome: ${aluno.nome}
- Série: ${aluno.serie}
- Casa (inteligência principal): ${aluno.casa} (código: ${aluno.casaCodigo})
- Fase atual: ${aluno.faseAtual} (código: ${aluno.faseAtualCodigo})

# ÚLTIMAS OBSERVAÇÕES (da mais recente para a mais antiga)
${obsFormatadas}

${DICIONARIO_SINAIS_EXPANDIDO}

${DICIONARIO_HIPOTESES_EXPANDIDO}

${DICIONARIO_PADROES}

${DICIONARIO_CONTEXTO_SERIE}

${DICIONARIO_ACOES}

${DICIONARIO_TEMPLATES}

${DICIONARIO_CELEBRACOES}

# REGRAS DE ANÁLISE

## Determinação do Estado
1. As 2 ÚLTIMAS observações determinam o estado atual
2. Se as 2 últimas são de ATENÇÃO → estado = "precisa_atencao", deve_gerar_alerta = true
3. Se as 2 últimas são POSITIVAS → estado = "celebrar", deve_gerar_alerta = false (tratado separadamente)
4. Se mistas (1 atenção + 1 positiva) → estado = "neutro", deve_gerar_alerta = false

## Detecção de Padrões
- Verifique se as 2 últimas observações formam algum padrão da tabela de combinações
- Se identificar padrão de "Alta Preocupação", priorize na análise
- Considere o contexto da série/idade do aluno

## Seleção de Hipóteses
- Selecione 2-3 hipóteses mais relevantes do dicionário para o sinal observado
- Considere a idade/série do aluno ao selecionar
- Inclua as perguntas sugeridas quando relevantes

## Sugestões de Ação
- Selecione 2-3 ações mais apropriadas para a situação
- Considere o tipo de sinal (emocional, social, cognitivo)
- Defina prioridade baseada na gravidade

# ESTRUTURA DE RESPOSTA (JSON)

{
  "estado": "precisa_atencao" | "celebrar" | "neutro",
  "deve_gerar_alerta": true | false,
  "alerta": {
    "sinal_principal": "string - nome do sinal nas ÚLTIMAS 2 observações",
    "sinal_codigo": "string - código em snake_case",
    "quantidade": number,
    "texto_acontecendo": "string - use os templates fornecidos",
    "padrao_identificado": {
      "nome": "string - nome do padrão se identificado",
      "significado": "string - o que esse padrão indica",
      "acao_recomendada": "string - ação prioritária"
    },
    "contexto": [
      "string - consideração 1 baseada na série/idade",
      "string - consideração 2 sobre o padrão",
      "string - consideração 3 sobre histórico"
    ],
    "hipoteses": [
      {
        "titulo": "string - título da hipótese",
        "descricao": "string - explicação",
        "perguntas": ["string - pergunta sugerida"]
      }
    ],
    "acoes_sugeridas": [
      {
        "acao": "string - descrição da ação",
        "prioridade": "alta" | "media" | "baixa"
      }
    ]
  }
}

# IMPORTANTE
- O "sinal_principal" DEVE ser baseado nas 2 ÚLTIMAS observações
- Use os templates de frases para o "texto_acontecendo"
- Considere a série do aluno (${aluno.serie} = ${serieNum}º ano) ao contextualizar
- Se identificar padrão de alta preocupação, indique claramente
- As ações devem ser práticas e executáveis pelo professor
- Se estado = "neutro" ou "celebrar", ainda retorne o JSON mas com deve_gerar_alerta = false

Retorne APENAS o JSON válido, sem explicações adicionais.`;
}

// Fallback analysis when AI fails
function analiseFallback(observacoes: Observacao[], nomeAluno: string): AlertaGerado {
  if (observacoes.length < 2) {
    return { estado: "neutro", deve_gerar_alerta: false };
  }

  const ultimas2 = observacoes.slice(0, 2);
  const ambas_atencao = ultimas2.every((o) => o.valencia === "atencao");
  const ambas_positivas = ultimas2.every((o) => o.valencia === "positivo");

  if (ambas_atencao) {
    const sinalPrincipal = ultimas2[0].sinal;
    const sinalCodigo = ultimas2[0].sinal_codigo;
    const sinal2Codigo = ultimas2[1].sinal_codigo;
    const quantidade = observacoes.filter((o) => o.sinal === sinalPrincipal).length;

    // Detect high concern patterns
    const padroesAltaPreocupacao: Record<string, PadraoIdentificado> = {
      "triste+isolou": { nome: "Retraimento emocional", significado: "Pode estar em sofrimento psíquico", acao_recomendada: "Conversa urgente" },
      "triste+triste": { nome: "Tristeza persistente", significado: "Possível quadro depressivo", acao_recomendada: "Encaminhar psicólogo" },
      "conflitou+conflitou": { nome: "Padrão de conflito", significado: "Dificuldade persistente de relacionamento", acao_recomendada: "Envolver família" },
      "desistiu+desistiu": { nome: "Desistência crônica", significado: "Baixa autoeficácia", acao_recomendada: "Trabalhar autoestima" },
      "ansioso+travou": { nome: "Ansiedade paralisante", significado: "Ansiedade afetando desempenho", acao_recomendada: "Reduzir pressão" },
      "isolou+calado": { nome: "Isolamento total", significado: "Possível sofrimento não verbalizado", acao_recomendada: "Prioridade de atenção" },
    };

    const chavePadrao = `${sinalCodigo}+${sinal2Codigo}`;
    const chaveInversa = `${sinal2Codigo}+${sinalCodigo}`;
    const padraoEncontrado = padroesAltaPreocupacao[chavePadrao] || padroesAltaPreocupacao[chaveInversa];

    return {
      estado: "precisa_atencao",
      deve_gerar_alerta: true,
      alerta: {
        sinal_principal: sinalPrincipal,
        sinal_codigo: sinalCodigo,
        quantidade: Math.min(quantidade, 3),
        texto_acontecendo: sinalCodigo === sinal2Codigo
          ? `${nomeAluno} registrou '${sinalPrincipal}' nas últimas 2 observações consecutivas.`
          : `${nomeAluno} apresentou sinais de atenção: '${ultimas2[0].sinal}' e '${ultimas2[1].sinal}'.`,
        padrao_identificado: padraoEncontrado,
        contexto: [
          "Padrão de atenção identificado nas observações recentes",
          "Verificar se há fatores externos afetando o comportamento",
          padraoEncontrado ? `Padrão detectado: ${padraoEncontrado.nome}` : "Observar continuidade do comportamento"
        ],
        hipoteses: [],
        acoes_sugeridas: padraoEncontrado?.acao_recomendada 
          ? [{ acao: padraoEncontrado.acao_recomendada, prioridade: "alta" as const }]
          : [{ acao: "Conversar individualmente com o aluno", prioridade: "alta" as const }],
      },
    };
  }

  if (ambas_positivas) {
    return {
      estado: "celebrar",
      deve_gerar_alerta: false,
    };
  }

  return { estado: "neutro", deve_gerar_alerta: false };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { aluno_id } = await req.json();

    if (!aluno_id) {
      return new Response(JSON.stringify({ error: "aluno_id é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase credentials not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Fetch student data
    const { data: aluno, error: alunoError } = await supabase
      .from("profiles")
      .select(`
        id, 
        full_name, 
        nome, 
        sobrenome, 
        serie, 
        turma, 
        casa_id,
        institution_id
      `)
      .eq("id", aluno_id)
      .single();

    if (alunoError || !aluno) {
      console.error("Error fetching student:", alunoError);
      return new Response(JSON.stringify({ error: "Aluno não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get student's house info
    let casaNome = "Sem casa";
    let casaCodigo = "";
    if (aluno.casa_id) {
      const { data: casa } = await supabase
        .from("inteligencias")
        .select("nome, codigo")
        .eq("id", aluno.casa_id)
        .single();
      if (casa) {
        casaNome = casa.nome;
        casaCodigo = casa.codigo;
      }
    }

    // Get current phase
    let faseAtualId = null;
    let faseAtualNome = "";
    let faseAtualCodigo = "";
    if (aluno.institution_id) {
      const { data: fase } = await supabase
        .from("fases")
        .select("id, inteligencia_id")
        .eq("institution_id", aluno.institution_id)
        .eq("ativo", true)
        .single();

      if (fase) {
        faseAtualId = fase.id;
        const { data: faseInteligencia } = await supabase
          .from("inteligencias")
          .select("nome, codigo")
          .eq("id", fase.inteligencia_id)
          .single();
        if (faseInteligencia) {
          faseAtualNome = faseInteligencia.nome;
          faseAtualCodigo = faseInteligencia.codigo;
        }
      }
    }

    // 2. Fetch last 15 observations
    const { data: observacoesRaw } = await supabase
      .from("observacoes")
      .select(`
        id,
        data_observacao,
        sinal_id,
        observacao_texto
      `)
      .eq("aluno_id", aluno_id)
      .order("data_observacao", { ascending: false })
      .limit(15);

    const sinaisIds = [...new Set(observacoesRaw?.map((o) => o.sinal_id) || [])];
    const { data: sinaisData } = await supabase
      .from("sinais")
      .select("id, label_pt, codigo, valencia, emoji")
      .in("id", sinaisIds.length > 0 ? sinaisIds : [0]);

    const sinaisMap = new Map(sinaisData?.map((s) => [s.id, s]) || []);

    const observacoes: Observacao[] = (observacoesRaw || []).map((o) => {
      const sinal = sinaisMap.get(o.sinal_id);
      return {
        sinal: sinal?.label_pt || "Observação",
        sinal_codigo: sinal?.codigo || "",
        valencia: sinal?.valencia || "neutra",
        data: new Date(o.data_observacao).toLocaleDateString("pt-BR"),
        emoji: sinal?.emoji || "📝",
      };
    });

    if (observacoes.length < 2) {
      console.log("Not enough observations for analysis");
      return new Response(
        JSON.stringify({
          success: true,
          message: "Sem observações suficientes para análise",
          analise: { estado: "neutro", deve_gerar_alerta: false },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format student name
    const nomeCompleto =
      aluno.full_name || `${aluno.nome || ""} ${aluno.sobrenome || ""}`.trim() || "Aluno";
    const primeiroNome = nomeCompleto.split(" ")[0];

    let analise: AlertaGerado;

    // 3. Try AI analysis with expanded dictionary
    if (LOVABLE_API_KEY) {
      try {
        const prompt = montarPromptExpandido(
          {
            nome: primeiroNome,
            serie: aluno.serie || "6º",
            casa: casaNome,
            casaCodigo,
            faseAtual: faseAtualNome || "Sem fase",
            faseAtualCodigo,
          },
          observacoes
        );

        console.log("Calling Lovable AI Gateway with expanded dictionary...");

        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              {
                role: "system",
                content: "Você é um assistente especializado em análise de comportamento de alunos do Projeto Arboria. Use SEMPRE o dicionário expandido fornecido para suas análises. Retorne apenas JSON válido.",
              },
              { role: "user", content: prompt },
            ],
          }),
        });

        if (!aiResponse.ok) {
          const errorText = await aiResponse.text();
          console.error("AI Gateway error:", aiResponse.status, errorText);
          
          if (aiResponse.status === 429) {
            console.log("Rate limited, using fallback");
            analise = analiseFallback(observacoes, primeiroNome);
          } else if (aiResponse.status === 402) {
            console.log("Payment required, using fallback");
            analise = analiseFallback(observacoes, primeiroNome);
          } else {
            throw new Error(`AI error: ${aiResponse.status}`);
          }
        } else {
          const aiData = await aiResponse.json();
          const content = aiData.choices?.[0]?.message?.content;

          if (!content) {
            throw new Error("Empty AI response");
          }

          // Parse JSON from AI response (handle markdown code blocks)
          let jsonStr = content.trim();
          if (jsonStr.startsWith("```json")) {
            jsonStr = jsonStr.slice(7);
          }
          if (jsonStr.startsWith("```")) {
            jsonStr = jsonStr.slice(3);
          }
          if (jsonStr.endsWith("```")) {
            jsonStr = jsonStr.slice(0, -3);
          }
          jsonStr = jsonStr.trim();

          analise = JSON.parse(jsonStr);
          console.log("AI analysis result:", analise.estado, analise.deve_gerar_alerta);
          
          if (analise.alerta?.padrao_identificado) {
            console.log("Pattern detected:", analise.alerta.padrao_identificado.nome);
          }
        }
      } catch (aiError) {
        console.error("AI analysis error, using fallback:", aiError);
        analise = analiseFallback(observacoes, primeiroNome);
      }
    } else {
      console.log("No AI key, using fallback analysis");
      analise = analiseFallback(observacoes, primeiroNome);
    }

    // 4. Archive existing alerts and create new one if needed
    if (aluno.institution_id) {
      // Archive old active alerts of conflicting types
      if (analise.estado === "precisa_atencao") {
        await supabase
          .from("alertas_alunos")
          .update({ status: "arquivado", updated_at: new Date().toISOString() })
          .eq("aluno_id", aluno_id)
          .eq("tipo_alerta", "celebrar")
          .eq("status", "ativo");
      } else if (analise.estado === "celebrar" || analise.estado === "neutro") {
        await supabase
          .from("alertas_alunos")
          .update({ status: "arquivado", updated_at: new Date().toISOString() })
          .eq("aluno_id", aluno_id)
          .eq("tipo_alerta", "precisa_atencao")
          .eq("status", "ativo");
      }

      // Create new alert if needed
      if (analise.deve_gerar_alerta && analise.alerta) {
        // Check if there's already an active alert of this type
        const { data: existingAlert } = await supabase
          .from("alertas_alunos")
          .select("id")
          .eq("aluno_id", aluno_id)
          .eq("tipo_alerta", analise.estado)
          .eq("status", "ativo")
          .maybeSingle();

        const dadosContexto = {
          sinal_predominante: analise.alerta.sinal_principal,
          sinal_codigo: analise.alerta.sinal_codigo,
          quantidade: analise.alerta.quantidade,
          texto_acontecendo: analise.alerta.texto_acontecendo,
          padrao_identificado: analise.alerta.padrao_identificado,
          contexto: analise.alerta.contexto,
          hipoteses: analise.alerta.hipoteses,
          acoes_sugeridas: analise.alerta.acoes_sugeridas,
          gerado_por: "ia",
          timestamp_analise: new Date().toISOString(),
        };

        if (existingAlert) {
          // Update existing alert with new data
          await supabase
            .from("alertas_alunos")
            .update({
              dados_contexto: dadosContexto,
              motivo: "analise_ia",
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingAlert.id);

          console.log("Updated existing alert:", existingAlert.id);
        } else {
          // Create new alert
          const { error: insertError } = await supabase.from("alertas_alunos").insert({
            institution_id: aluno.institution_id,
            aluno_id: aluno_id,
            tipo_alerta: analise.estado,
            motivo: "analise_ia",
            status: "ativo",
            notificacao_ativa: true,
            fase_id: faseAtualId,
            dados_contexto: dadosContexto,
          });

          if (insertError) {
            console.error("Error inserting alert:", insertError);
          } else {
            console.log("Created new alert for student:", aluno_id);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        analise,
        aluno: { id: aluno_id, nome: primeiroNome },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in analisar-observacoes:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
