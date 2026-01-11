import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfessor } from '@/contexts/ProfessorContext';
import { useEffect, useRef } from 'react';
interface Observacao {
  id: string;
  sinalEmoji: string;
  sinalLabel: string;
  texto?: string | null;
  dataHora: string;
  valencia: string;
}

interface AcaoSugerida {
  titulo: string;
  icone: string;
  codigo: string;
}

interface Arquetipo {
  nome: string;
  significado: string;
  potencializar: string[];
}

interface AlertaAtivo {
  tipo: 'precisa_atencao' | 'celebrar' | 'brilhando' | 'melhorando' | 'atencao_recente' | 'bom_comeco' | 'fique_de_olho';
  subtipo?: 'descoberta' | 'confirmacao';
  motivo: string;
  contexto: string[];
  hipoteses: { titulo: string; descricao: string; perguntas?: string[] }[];
  sugestoes: string[];
  acoesSugeridas: AcaoSugerida[];
  arquetipo?: Arquetipo;
  created_at: string;
  alertaId: string;
  sinalCodigo?: string;
  padraoCodigo?: string;
  sinalPredominante?: string;
  sinalSecundario?: string;
  quantidadeSinal?: number;
  textoAcontecendo?: string;
  padrao?: {
    nome: string;
    significado: string;
    acao_recomendada?: string;
  };
}

export interface PerfilAlunoData {
  id: string;
  nome: string;
  serie: string;
  turma: string;
  avatarUrl?: string;
  casaId: number;
  casaNome: string;
  casaCor: string;
  casaEmoji: string;
  casaCodigo: string;
  pontosTotais: number;
  ranking: number;
  totalAlunosCasa: number;
  status: 'destaque' | 'regular' | 'risco';
  percentualEntregas: number;
  mediaNotas: number;
  inteligencias: {
    id: number;
    nome: string;
    emoji: string;
    cor: string;
    score: number;
  }[];
  missoes: {
    id: string;
    titulo: string;
    semana: number | null;
    tipoMissao: string | null;
    status: 'aprovada' | 'aguardando' | 'pendente' | 'nao_entregue';
    nota?: number | null;
  }[];
  observacoes: Observacao[];
  alertaAtivo: AlertaAtivo | null;
  ultimaObservacao: { sinal: string; dataHora: string } | null;
  temObsFaseAtual: boolean;
  faseAtualCodigo?: string;
  faseAtualNome?: string;
}

// Função para substituir variáveis nos templates
const substituirTemplate = (template: string, dados: Record<string, string | number>): string => {
  let resultado = template;
  for (const [chave, valor] of Object.entries(dados)) {
    resultado = resultado.replace(new RegExp(`\\{${chave}\\}`, 'g'), String(valor));
  }
  return resultado;
};

// Helper to check if AI analysis is stale (older than 1 hour)
const shouldRefreshAnalysis = (timestampAnalise: string | undefined): boolean => {
  if (!timestampAnalise) return true;
  
  const analysisTime = new Date(timestampAnalise).getTime();
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  
  return now - analysisTime > oneHour;
};

// Function to trigger AI analysis
const triggerAIAnalysis = async (alunoId: string): Promise<void> => {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analisar-observacoes`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ aluno_id: alunoId }),
      }
    );
    
    if (!response.ok) {
      console.warn('AI analysis request failed:', response.status);
    }
  } catch (error) {
    console.warn('Failed to trigger AI analysis:', error);
  }
};

export const usePerfilAluno = (alunoId: string | undefined) => {
  const { profile, faseAtual } = useProfessor();

  return useQuery({
    queryKey: ['perfil-aluno', alunoId],
    queryFn: async (): Promise<PerfilAlunoData> => {
      if (!alunoId) throw new Error('Aluno ID não fornecido');

      // 1. Dados básicos do aluno com casa
      const { data: aluno, error: alunoError } = await supabase
        .from('profiles')
        .select(`
          id, 
          full_name,
          nome,
          sobrenome,
          serie, 
          turma, 
          avatar_url,
          casa_id,
          institution_id
        `)
        .eq('id', alunoId)
        .single();

      if (alunoError) throw alunoError;
      if (!aluno) throw new Error('Aluno não encontrado');

      // Buscar dados da casa
      let casaNome = 'Sem casa';
      let casaCor = '#6366f1';
      let casaEmoji = '🏠';
      let casaCodigo = '';

      if (aluno.casa_id) {
        const { data: casa } = await supabase
          .from('inteligencias')
          .select('id, nome, cor_hex, emoji, codigo')
          .eq('id', aluno.casa_id)
          .single();

        if (casa) {
          casaNome = casa.nome;
          casaCor = casa.cor_hex || '#6366f1';
          casaEmoji = casa.emoji || '🏠';
          casaCodigo = casa.codigo;
        }
      }

      // Buscar código e nome da fase atual
      let faseAtualCodigo = '';
      let faseAtualNome = '';
      if (faseAtual?.inteligencia?.id) {
        const { data: faseInteligencia } = await supabase
          .from('inteligencias')
          .select('codigo, nome')
          .eq('id', faseAtual.inteligencia.id)
          .single();
        
        if (faseInteligencia) {
          faseAtualCodigo = faseInteligencia.codigo;
          faseAtualNome = faseInteligencia.nome;
        }
      }

      // 2. Pontos totais do aluno
      const { data: pontosData } = await supabase
        .from('pontos_gerais')
        .select('pontos')
        .eq('aluno_id', alunoId);

      const pontosTotais = pontosData?.reduce((sum, p) => sum + (p.pontos || 0), 0) || 0;

      // 3. Ranking na casa - buscar todos alunos da mesma casa com pontos
      let ranking = 1;
      let totalAlunosCasa = 1;

      if (aluno.casa_id && aluno.institution_id) {
        const { data: alunosCasa } = await supabase
          .from('profiles')
          .select('id')
          .eq('casa_id', aluno.casa_id)
          .eq('institution_id', aluno.institution_id);

        totalAlunosCasa = alunosCasa?.length || 1;

        // Para cada aluno, calcular pontos e contar quantos têm mais que o atual
        if (alunosCasa) {
          for (const a of alunosCasa) {
            if (a.id !== alunoId) {
              const { data: pontosOutro } = await supabase
                .from('pontos_gerais')
                .select('pontos')
                .eq('aluno_id', a.id);
              
              const totalOutro = pontosOutro?.reduce((sum, p) => sum + (p.pontos || 0), 0) || 0;
              if (totalOutro > pontosTotais) ranking++;
            }
          }
        }
      }

      // 4. Scores das 8 inteligências
      const { data: allInteligencias } = await supabase
        .from('inteligencias')
        .select('id, nome, emoji, cor_hex')
        .order('ordem');

      const { data: scoresData } = await supabase
        .from('inteligencia_scores')
        .select('inteligencia_id, score_atual')
        .eq('aluno_id', alunoId);

      const scoresMap = new Map(scoresData?.map(s => [s.inteligencia_id, s.score_atual]) || []);

      const inteligencias = (allInteligencias || []).map(intel => ({
        id: intel.id,
        nome: intel.nome,
        emoji: intel.emoji || '🧠',
        cor: intel.cor_hex || '#6366f1',
        score: scoresMap.get(intel.id) || 35 // Score padrão inicial
      }));

      // 5. Missões da fase atual + status de entrega
      let missoes: PerfilAlunoData['missoes'] = [];

      if (faseAtual?.id && aluno.institution_id) {
        // Buscar missões da fase
        const { data: missoesData } = await supabase
          .from('missoes')
          .select('id, titulo, semana, tipo_missao')
          .eq('institution_id', aluno.institution_id)
          .eq('fase_id', faseAtual.id)
          .eq('status', 'liberada')
          .order('semana')
          .order('tipo_missao');

        // Buscar entregas do aluno - ordenar por data ASC para que o Map sobrescreva com a mais recente
        const { data: entregasData } = await supabase
          .from('entregas')
          .select('missao_id, status, nota')
          .eq('aluno_id', alunoId)
          .order('created_at', { ascending: true });

        const entregasMap = new Map(
          entregasData?.map(e => [e.missao_id, { status: e.status, nota: e.nota }]) || []
        );

        missoes = (missoesData || []).map(m => {
          const entrega = entregasMap.get(m.id);
          let status: PerfilAlunoData['missoes'][0]['status'] = 'nao_entregue';
          
          if (entrega) {
            if (entrega.status === 'aprovada') status = 'aprovada';
            else if (entrega.status === 'refazer') status = 'aguardando'; // Refazer = precisa reenviar
            else if (entrega.status === 'aguardando') status = 'aguardando';
            else status = 'pendente';
          }

          return {
            id: m.id,
            titulo: m.titulo,
            semana: m.semana,
            tipoMissao: m.tipo_missao,
            status,
            nota: entrega?.nota
          };
        });
      }

      // 6. Observações recentes (últimas 20 para histórico)
      const { data: observacoesData } = await supabase
        .from('observacoes')
        .select(`
          id,
          observacao_texto,
          data_observacao,
          sinal_id
        `)
        .eq('aluno_id', alunoId)
        .order('data_observacao', { ascending: false })
        .limit(20);

      // Buscar sinais separadamente
      const sinaisIds = [...new Set(observacoesData?.map(o => o.sinal_id) || [])];
      const { data: sinaisData } = await supabase
        .from('sinais')
        .select('id, emoji, label_pt, valencia, codigo')
        .in('id', sinaisIds.length > 0 ? sinaisIds : [0]);

      const sinaisMap = new Map(sinaisData?.map(s => [s.id, s]) || []);

      const observacoes: Observacao[] = (observacoesData || []).map(o => {
        const sinal = sinaisMap.get(o.sinal_id);
        return {
          id: o.id,
          sinalEmoji: sinal?.emoji || '📝',
          sinalLabel: sinal?.label_pt || 'Observação',
          texto: o.observacao_texto,
          dataHora: o.data_observacao,
          valencia: sinal?.valencia || 'neutra'
        };
      });

      // Verificar se tem observação na fase atual
      let temObsFaseAtual = false;
      if (faseAtual?.id) {
        const { count } = await supabase
          .from('observacoes')
          .select('id', { count: 'exact', head: true })
          .eq('aluno_id', alunoId)
          .eq('fase_id', faseAtual.id);
        
        temObsFaseAtual = (count || 0) > 0;
      }

      // Última observação
      const ultimaObservacao = observacoes.length > 0 
        ? { sinal: observacoes[0].sinalLabel, dataHora: observacoes[0].dataHora }
        : null;

// Calcular estado baseado nas observações (quando não há alerta)
      const calcularEstadoBaseadoEmObservacoes = (obs: Observacao[]): AlertaAtivo['tipo'] | null => {
        if (obs.length === 0) return null;
        
        if (obs.length === 1) {
          return obs[0].valencia === 'positivo' ? 'bom_comeco' : 'fique_de_olho';
        }
        
        const ultima = obs[0];
        const penultima = obs[1];
        
        if (ultima.valencia === 'atencao' && penultima.valencia === 'atencao') {
          return 'precisa_atencao';
        }
        if (ultima.valencia === 'positivo' && penultima.valencia === 'positivo') {
          return 'brilhando';
        }
        if (ultima.valencia === 'atencao' && penultima.valencia === 'positivo') {
          return 'atencao_recente';
        }
        if (ultima.valencia === 'positivo' && penultima.valencia === 'atencao') {
          return 'melhorando';
        }
        
        return null;
      };

      // Buscar alerta ativo do aluno
      let alertaAtivo: AlertaAtivo | null = null;
      
      if (aluno.institution_id) {
        const { data: alertaData } = await supabase
          .from('alertas_alunos')
          .select('*')
          .eq('aluno_id', alunoId)
          .eq('institution_id', aluno.institution_id)
          .in('tipo_alerta', ['precisa_atencao', 'celebrar', 'brilhando', 'melhorando', 'atencao_recente', 'bom_comeco', 'fique_de_olho'])
          .in('status', ['ativo', 'visualizado', 'em_acompanhamento'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (alertaData) {
          // Parse dados_contexto do alerta
          const dadosContexto = alertaData.dados_contexto as Record<string, unknown> | null;
          const sinalCodigo = (dadosContexto?.sinal_codigo as string) || '';
          const padraoCodigo = (dadosContexto?.padrao_codigo as string) || '';
          const timestampAnalise = dadosContexto?.timestamp_analise as string | undefined;
          const geradoPorIA = dadosContexto?.gerado_por === 'ia';
          
          // Formatar nome do aluno
          const nomeCompleto = aluno.full_name || 
            `${aluno.nome || ''} ${aluno.sobrenome || ''}`.trim() || 
            'Aluno';
          const primeiroNome = nomeCompleto.split(' ')[0];
          
          // Check if analysis is stale and trigger refresh (async, non-blocking)
          if (shouldRefreshAnalysis(timestampAnalise)) {
            triggerAIAnalysis(alunoId).catch(() => {}); // Fire and forget
          }
          
          // Determinar subtipo para celebrar
          let subtipo: 'descoberta' | 'confirmacao' | undefined;
          if (alertaData.tipo_alerta === 'celebrar') {
            // É descoberta se a fase atual for diferente da casa do aluno
            subtipo = faseAtualCodigo !== casaCodigo ? 'descoberta' : 'confirmacao';
          }
          
          // Buscar hipóteses dinâmicas
          let hipoteses: { titulo: string; descricao: string }[] = [];
          
          if (alertaData.tipo_alerta === 'precisa_atencao') {
            // Primeiro tentar buscar por sinal
            if (sinalCodigo) {
              const { data: hipotesesSinal } = await supabase
                .from('hipoteses_por_sinal')
                .select('titulo, descricao')
                .eq('sinal_codigo', sinalCodigo)
                .order('ordem');
              
              if (hipotesesSinal && hipotesesSinal.length > 0) {
                hipoteses = hipotesesSinal;
              }
            }
            
            // Se não encontrou por sinal, buscar por padrão
            if (hipoteses.length === 0 && padraoCodigo) {
              const { data: hipotesesPadrao } = await supabase
                .from('hipoteses_por_padrao')
                .select('titulo, descricao')
                .eq('padrao_codigo', padraoCodigo)
                .order('ordem');
              
              if (hipotesesPadrao && hipotesesPadrao.length > 0) {
                hipoteses = hipotesesPadrao;
              }
            }
            
            // Fallback para dados do contexto se não encontrou no banco
            if (hipoteses.length === 0) {
              hipoteses = (dadosContexto?.hipoteses as { titulo: string; descricao: string }[]) || [];
            }
          }
          
          // Buscar ações sugeridas
          let acoesSugeridas: AcaoSugerida[] = [];
          if (alertaData.tipo_alerta === 'precisa_atencao') {
            const { data: acoesData } = await supabase
              .from('acoes_sugeridas')
              .select('titulo, icone')
              .eq('tipo_alerta', 'atencao_geral')
              .order('ordem');
            
            if (acoesData && acoesData.length > 0) {
              acoesSugeridas = acoesData.map(a => ({
                titulo: substituirTemplate(a.titulo, { nome: primeiroNome }),
                icone: a.icone,
                codigo: a.icone // Usar icone como código da ação
              }));
            }
          }
          
          // Buscar arquétipo para celebração
          let arquetipo: Arquetipo | undefined;
          if (alertaData.tipo_alerta === 'celebrar' && subtipo === 'descoberta' && casaCodigo && faseAtualCodigo) {
            const { data: arquetipoData } = await supabase
              .from('arquetipos')
              .select('nome_arquetipo, significado, potencializar')
              .eq('casa_codigo', casaCodigo)
              .eq('fase_codigo', faseAtualCodigo)
              .eq('tipo', 'descoberta')
              .maybeSingle();
            
            if (arquetipoData) {
              arquetipo = {
                nome: arquetipoData.nome_arquetipo || '',
                significado: substituirTemplate(arquetipoData.significado, { nome: primeiroNome }),
                potencializar: arquetipoData.potencializar || []
              };
            }
          } else if (alertaData.tipo_alerta === 'celebrar' && subtipo === 'confirmacao' && casaCodigo) {
            const { data: arquetipoData } = await supabase
              .from('arquetipos')
              .select('nome_arquetipo, significado, potencializar')
              .eq('casa_codigo', casaCodigo)
              .eq('tipo', 'confirmacao')
              .maybeSingle();
            
            if (arquetipoData) {
              arquetipo = {
                nome: arquetipoData.nome_arquetipo || '',
                significado: substituirTemplate(arquetipoData.significado, { nome: primeiroNome }),
                potencializar: arquetipoData.potencializar || []
              };
            }
          }
          
          // Buscar template de texto ou usar texto gerado pela IA
          let motivo = alertaData.motivo;
          
          // Priorizar texto gerado pela IA se disponível
          const textoAcontecendo = dadosContexto?.texto_acontecendo as string | undefined;
          
          if (textoAcontecendo && geradoPorIA) {
            // Usar texto gerado pela IA diretamente
            motivo = textoAcontecendo;
          } else if (alertaData.tipo_alerta === 'precisa_atencao') {
            // Fallback para templates quando não há análise de IA
            let templateCodigo = 'alerta_mesmo_sinal'; // Default
            
            if (alertaData.motivo === 'padrao_negativo_consecutivo' || alertaData.motivo === 'mesmo_sinal_consecutivo') {
              templateCodigo = 'alerta_mesmo_sinal';
            } else if (alertaData.motivo === 'mudanca_abrupta') {
              templateCodigo = 'alerta_mudanca_abrupta';
            } else if (alertaData.motivo === 'ultimas_2_atencao') {
              templateCodigo = 'alerta_2_atencao';
            }
            
            const { data: templateData } = await supabase
              .from('templates_texto')
              .select('template')
              .eq('codigo', templateCodigo)
              .maybeSingle();
            
            if (templateData?.template) {
              motivo = substituirTemplate(templateData.template, {
                nome: primeiroNome,
                sinal: (dadosContexto?.sinal_predominante as string) || 'sinal de atenção',
                sinal_1: (dadosContexto?.sinal_1 as string) || (dadosContexto?.sinal_predominante as string) || 'sinal',
                sinal_2: (dadosContexto?.sinal_2 as string) || (dadosContexto?.sinal_predominante as string) || 'sinal',
                quantidade: (dadosContexto?.quantidade as number) || 2
              });
            }
          } else if (alertaData.tipo_alerta === 'celebrar') {
            const templateCodigo = subtipo === 'descoberta' ? 'celebrar_descoberta' : 'celebrar_confirmacao';
            const { data: templateData } = await supabase
              .from('templates_texto')
              .select('template')
              .eq('codigo', templateCodigo)
              .maybeSingle();
            
            if (templateData?.template) {
              const contagem = (dadosContexto?.contagem as number) || 3;
              motivo = substituirTemplate(templateData.template, {
                nome: primeiroNome,
                contagem: contagem,
                fase: faseAtualCodigo,
                casa: casaNome
              });
            }
          }

          alertaAtivo = {
            tipo: alertaData.tipo_alerta as AlertaAtivo['tipo'],
            subtipo,
            motivo,
            contexto: (dadosContexto?.contexto as string[]) || [],
            hipoteses,
            sugestoes: (dadosContexto?.sugestoes as string[]) || [],
            acoesSugeridas,
            arquetipo,
            created_at: alertaData.created_at || '',
            alertaId: alertaData.id,
            sinalCodigo,
            padraoCodigo,
            sinalPredominante: (dadosContexto?.sinal_predominante as string) || undefined,
            sinalSecundario: (dadosContexto?.sinal_secundario as string) || undefined,
            quantidadeSinal: (dadosContexto?.quantidade as number) || undefined,
            textoAcontecendo: motivo
          };
        } else {
          // Se não há alerta no banco, calcular estado baseado nas observações
          const estadoCalculado = calcularEstadoBaseadoEmObservacoes(observacoes);
          if (estadoCalculado && temObsFaseAtual) {
            const primeiroNome = (aluno.full_name || `${aluno.nome || ''} ${aluno.sobrenome || ''}`.trim() || 'Aluno').split(' ')[0];
            const ultimaObs = observacoes[0];
            const penultimaObs = observacoes[1];
            
            // Gerar texto baseado no estado calculado
            let textoGerado = '';
            switch (estadoCalculado) {
              case 'brilhando':
                textoGerado = ultimaObs.sinalLabel === penultimaObs?.sinalLabel
                  ? `${primeiroNome} está brilhando! Registrou "${ultimaObs.sinalLabel}" nas últimas 2 observações.`
                  : `${primeiroNome} está indo muito bem! Últimas observações: "${ultimaObs.sinalLabel}" e "${penultimaObs?.sinalLabel}".`;
                break;
              case 'melhorando':
                textoGerado = `${primeiroNome} mostrou melhora! Após "${penultimaObs?.sinalLabel}", registrou "${ultimaObs.sinalLabel}".`;
                break;
              case 'atencao_recente':
                textoGerado = `${primeiroNome} estava bem, mas a última observação foi "${ultimaObs.sinalLabel}". Fique atento!`;
                break;
              case 'bom_comeco':
                textoGerado = `${primeiroNome} teve sua primeira observação positiva: "${ultimaObs.sinalLabel}".`;
                break;
              case 'fique_de_olho':
                textoGerado = `A primeira observação de ${primeiroNome} foi "${ultimaObs.sinalLabel}". Fique de olho!`;
                break;
              default:
                textoGerado = `Continue observando ${primeiroNome}.`;
            }
            
            alertaAtivo = {
              tipo: estadoCalculado,
              motivo: textoGerado,
              contexto: [],
              hipoteses: [],
              sugestoes: [],
              acoesSugeridas: [],
              created_at: new Date().toISOString(),
              alertaId: '',
              textoAcontecendo: textoGerado
            };
          }
        }
      }

      // 7. Calcular métricas para status
      // Buscar total de missões liberadas para a instituição
      let totalMissoesDisponiveis = 0;
      if (aluno.institution_id) {
        const { count } = await supabase
          .from('missoes')
          .select('id', { count: 'exact', head: true })
          .eq('institution_id', aluno.institution_id)
          .eq('status', 'liberada');
        
        totalMissoesDisponiveis = count || 0;
      }

      // Buscar todas as entregas do aluno
      const { data: todasEntregas } = await supabase
        .from('entregas')
        .select('status, nota')
        .eq('aluno_id', alunoId);

      const totalEntregas = todasEntregas?.length || 0;
      const entregasAvaliadas = todasEntregas?.filter(e => e.nota !== null) || [];
      const mediaNotas = entregasAvaliadas.length > 0
        ? entregasAvaliadas.reduce((sum, e) => sum + (e.nota || 0), 0) / entregasAvaliadas.length
        : 0;

      const percentualEntregas = totalMissoesDisponiveis > 0
        ? (totalEntregas / totalMissoesDisponiveis) * 100
        : 0;

      // Determinar status
      let status: 'destaque' | 'regular' | 'risco' = 'regular';
      if (percentualEntregas >= 80 && mediaNotas >= 7) {
        status = 'destaque';
      } else if (percentualEntregas < 40 || mediaNotas < 5) {
        status = 'risco';
      }

      // Formatar nome
      const nomeCompleto = aluno.full_name || 
        `${aluno.nome || ''} ${aluno.sobrenome || ''}`.trim() || 
        'Aluno';

      return {
        id: aluno.id,
        nome: nomeCompleto,
        serie: aluno.serie || '',
        turma: aluno.turma || '',
        avatarUrl: aluno.avatar_url || undefined,
        casaId: aluno.casa_id || 0,
        casaNome,
        casaCor,
        casaEmoji,
        casaCodigo,
        pontosTotais,
        ranking,
        totalAlunosCasa,
        status,
        percentualEntregas,
        mediaNotas,
        inteligencias,
        missoes,
        observacoes,
        alertaAtivo,
        ultimaObservacao,
        temObsFaseAtual,
        faseAtualCodigo,
        faseAtualNome
      };
    },
    enabled: !!alunoId && !!profile?.institution_id
  });
};
