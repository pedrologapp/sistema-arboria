import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfessor } from '@/contexts/ProfessorContext';

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
  prioridade?: 'alta' | 'media' | 'baixa';
  script?: string;
  objetivo?: string;
  contexto?: string;
  comoEscutar?: string;
  porQueFunciona?: string;
}

interface Arquetipo {
  nome: string;
  significado: string;
  potencializar: string[];
  sugestao_conversa?: string;
  frases_evitar?: string[];
  frases_preferir?: string[];
}

interface AlertaAtivo {
  tipo: 'precisa_atencao' | 'celebrar' | 'brilhando' | 'melhorando' | 'atencao_recente' | 'bom_comeco' | 'fique_de_olho' | 'celebrar_descoberta' | 'celebrar_confirmacao';
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
  // Novos campos ricos do N8N
  mensagemProfessor?: string;
  oQueNaoFazer?: string[];
  comoReagir?: {
    seAceitar: string;
    seRecusar: string;
    alerta?: string;
  };
  elementoPonte?: {
    forcas: string | string[];
    areaDificuldade: string;
  };
  geradoPorN8N?: boolean;
  tipoRecomendacao?: string;
  nomeRecomendacao?: string;
  porQueEsteTipo?: string;
  prioridade?: 'urgente' | 'importante' | 'normal';
  oQueFazerAgora?: {
    objetivo: string;
    contexto: string;
    scriptPrincipal: string;
    comoEscutar: string;
  };
  useAForca?: {
    forcasUtilizadas: string;
    opcaoA?: { nome: string; script: string; porQueFunciona: string };
    opcaoB?: { nome: string; script: string; porQueFunciona: string };
  };
}

export interface ConversaRegistrada {
  tipo_acao: string;
  created_at: string;
}

export interface PerfilAlunoSimplificadoData {
  id: string;
  nome: string;
  serie: string;
  turma: string;
  turmaId: string;
  avatarUrl?: string;
  quantidadeObservacoes: number;
  temObservacoes: boolean;
  inteligencias: {
    id: number;
    nome: string;
    emoji: string;
    cor: string;
    score: number;
  }[];
  observacoes: Observacao[];
  alertaAtivo: AlertaAtivo | null;
  ultimaObservacao: { sinal: string; dataHora: string } | null;
  temObsFaseAtual: boolean;
  faseAtualNome?: string;
  conversaRegistrada?: ConversaRegistrada | null;
}

// Função para substituir variáveis nos templates
const substituirTemplate = (template: string, dados: Record<string, string | number>): string => {
  let resultado = template;
  for (const [chave, valor] of Object.entries(dados)) {
    resultado = resultado.replace(new RegExp(`\\{${chave}\\}`, 'g'), String(valor));
  }
  return resultado;
};

export const usePerfilAlunoSimplificado = (alunoId: string | undefined) => {
  const { profile, faseAtual } = useProfessor();

  return useQuery({
    queryKey: ['perfil-aluno-simplificado', alunoId],
    queryFn: async (): Promise<PerfilAlunoSimplificadoData> => {
      if (!alunoId) throw new Error('Aluno ID não fornecido');

      // 1. Dados básicos do aluno
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
          institution_id
        `)
        .eq('id', alunoId)
        .single();

      if (alunoError) throw alunoError;
      if (!aluno) throw new Error('Aluno não encontrado');

      // 2. Buscar turma do aluno
      const { data: alunoTurma } = await supabase
        .from('aluno_turma')
        .select('turma_id')
        .eq('aluno_id', alunoId)
        .eq('ativo', true)
        .maybeSingle();

      const turmaId = alunoTurma?.turma_id || '';

      // Buscar nome da fase atual
      let faseAtualNome = '';
      if (faseAtual?.inteligencia?.id) {
        const { data: faseInteligencia } = await supabase
          .from('inteligencias')
          .select('nome')
          .eq('id', faseAtual.inteligencia.id)
          .single();
        
        if (faseInteligencia) {
          faseAtualNome = faseInteligencia.nome;
        }
      }

      // 3. Scores das 8 inteligências
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

      // 7. Observações recentes (últimas 20 para histórico)
      const { data: observacoesData } = await supabase
        .from('observacoes')
        .select(`
          id,
          observacao_texto,
          data_observacao,
          sinal_id
        `)
        .eq('aluno_id', alunoId)
        .is('excluida_em' as never, null)
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
          .eq('fase_id', faseAtual.id)
          .is('excluida_em' as never, null);

        temObsFaseAtual = (count || 0) > 0;
      }

      // Última observação
      const ultimaObservacao = observacoes.length > 0 
        ? { sinal: observacoes[0].sinalLabel, dataHora: observacoes[0].dataHora }
        : null;

      // 8. Buscar alerta ativo do aluno (simplificado)
      let alertaAtivo: AlertaAtivo | null = null;
      
      if (aluno.institution_id) {
        // FILTRAR APENAS ALERTAS DO N8N (ignora IA interna)
        const { data: alertaData } = await supabase
          .from('alertas_alunos')
          .select('*')
          .eq('aluno_id', alunoId)
          .eq('institution_id', aluno.institution_id)
          .eq('motivo', 'analise_n8n')
          .in('status', ['ativo', 'visualizado', 'em_acompanhamento'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (alertaData) {
          const dadosContexto = alertaData.dados_contexto as Record<string, unknown> | null;
          const sinalCodigo = (dadosContexto?.sinal_codigo as string) || '';
          const padraoCodigo = (dadosContexto?.padrao_codigo as string) || '';
          
          const nomeCompleto = aluno.full_name || 
            `${aluno.nome || ''} ${aluno.sobrenome || ''}`.trim() || 
            'Aluno';
          const primeiroNome = nomeCompleto.split(' ')[0];
          
          // Buscar hipóteses dinâmicas
          let hipoteses: { titulo: string; descricao: string }[] = [];
          
          if (alertaData.tipo_alerta === 'precisa_atencao') {
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
            
            if (hipoteses.length === 0) {
              hipoteses = (dadosContexto?.hipoteses as { titulo: string; descricao: string }[]) || [];
            }
          }
          
          // Verificar se veio do N8N (pelo campo gerado_por OU pelo motivo analise_n8n)
          const geradoPorN8N = dadosContexto?.gerado_por === 'n8n' || alertaData.motivo === 'analise_n8n';
          
          // Buscar ações sugeridas
          let acoesSugeridas: AcaoSugerida[] = [];
          
          // Se veio do N8N, priorizar dados do dados_contexto
          if (geradoPorN8N && dadosContexto?.acoes_sugeridas) {
            const acoesN8N = dadosContexto.acoes_sugeridas as Array<{
              acao: string;
              prioridade: 'alta' | 'media' | 'baixa';
              script?: string;
              objetivo?: string;
              contexto?: string;
              como_escutar?: string;
              por_que_funciona?: string;
            }>;
            acoesSugeridas = acoesN8N.map(a => ({
              titulo: a.acao,
              icone: 'MessageCircle',
              codigo: a.acao,
              prioridade: a.prioridade,
              script: a.script,
              objetivo: a.objetivo,
              contexto: a.contexto,
              comoEscutar: a.como_escutar,
              porQueFunciona: a.por_que_funciona
            }));
          } else if (alertaData.tipo_alerta === 'precisa_atencao') {
            const { data: acoesData } = await supabase
              .from('acoes_sugeridas')
              .select('titulo, icone')
              .eq('tipo_alerta', 'atencao_geral')
              .order('ordem');
            
            if (acoesData && acoesData.length > 0) {
              acoesSugeridas = acoesData.map(a => ({
                titulo: substituirTemplate(a.titulo, { nome: primeiroNome }),
                icone: a.icone,
                codigo: a.icone
              }));
            }
          }
          
          // Extrair padrão identificado do N8N
          const padraoIdentificado = dadosContexto?.padrao_identificado as { nome: string; significado: string } | undefined;
          
          alertaAtivo = {
            tipo: alertaData.tipo_alerta as AlertaAtivo['tipo'],
            subtipo: (dadosContexto?.tipo_celebracao as 'descoberta' | 'confirmacao') || undefined,
            motivo: (dadosContexto?.texto_acontecendo as string) || alertaData.motivo,
            contexto: (dadosContexto?.contexto as string[]) || [],
            hipoteses,
            sugestoes: (dadosContexto?.sugestoes as string[]) || [],
            acoesSugeridas,
            created_at: alertaData.created_at || '',
            alertaId: alertaData.id,
            sinalCodigo,
            padraoCodigo,
            sinalPredominante: (dadosContexto?.sinal_predominante as string) || (dadosContexto?.sinal_principal as string),
            sinalSecundario: dadosContexto?.sinal_secundario as string,
            quantidadeSinal: dadosContexto?.quantidade_sinal as number,
            textoAcontecendo: (dadosContexto?.texto_acontecendo as string) || alertaData.motivo,
            padrao: padraoIdentificado || (dadosContexto?.padrao as { nome: string; significado: string; acao_recomendada?: string }),
            // Novos campos do N8N
            mensagemProfessor: (dadosContexto?.mensagem_professor as string) || undefined,
            oQueNaoFazer: (dadosContexto?.o_que_nao_fazer as string[]) || undefined,
            // Campos ricos do N8N
            comoReagir: dadosContexto?.como_reagir ? {
              seAceitar: (dadosContexto.como_reagir as any).se_aceitar,
              seRecusar: (dadosContexto.como_reagir as any).se_recusar,
              alerta: (dadosContexto.como_reagir as any).alerta
            } : undefined,
            elementoPonte: dadosContexto?.elemento_ponte ? {
              forcas: (dadosContexto.elemento_ponte as any).forcas,
              areaDificuldade: (dadosContexto.elemento_ponte as any).area_dificuldade
            } : undefined,
            geradoPorN8N,
            // Campos N8N estruturados completos
            tipoRecomendacao: (dadosContexto?.tipo_recomendacao as string) || undefined,
            nomeRecomendacao: (dadosContexto?.nome_recomendacao as string) || undefined,
            porQueEsteTipo: (dadosContexto?.por_que_este_tipo as string) || undefined,
            prioridade: (dadosContexto?.prioridade as 'urgente' | 'importante' | 'normal') || undefined,
            oQueFazerAgora: dadosContexto?.o_que_fazer_agora ? {
              objetivo: (dadosContexto.o_que_fazer_agora as any).objetivo || '',
              contexto: (dadosContexto.o_que_fazer_agora as any).contexto || '',
              scriptPrincipal: (dadosContexto.o_que_fazer_agora as any).script_principal || '',
              comoEscutar: (dadosContexto.o_que_fazer_agora as any).como_escutar || ''
            } : undefined,
            useAForca: dadosContexto?.use_a_forca ? {
              forcasUtilizadas: (dadosContexto.use_a_forca as any).forcas_utilizadas || '',
              opcaoA: (dadosContexto.use_a_forca as any).opcao_a ? {
                nome: (dadosContexto.use_a_forca as any).opcao_a.nome || '',
                script: (dadosContexto.use_a_forca as any).opcao_a.script || '',
                porQueFunciona: (dadosContexto.use_a_forca as any).opcao_a.por_que_funciona || ''
              } : undefined,
              opcaoB: (dadosContexto.use_a_forca as any).opcao_b ? {
                nome: (dadosContexto.use_a_forca as any).opcao_b.nome || '',
                script: (dadosContexto.use_a_forca as any).opcao_b.script || '',
                porQueFunciona: (dadosContexto.use_a_forca as any).opcao_b.por_que_funciona || ''
              } : undefined
            } : undefined
          };
        }
      }

      // 9. Buscar conversa registrada
      let conversaRegistrada: ConversaRegistrada | null = null;
      if (alertaAtivo?.alertaId) {
        const { data: conversaData } = await supabase
          .from('acoes_celebracao')
          .select('tipo_acao, created_at')
          .eq('alerta_id', alertaAtivo.alertaId)
          .eq('aluno_id', alunoId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (conversaData) {
          conversaRegistrada = {
            tipo_acao: conversaData.tipo_acao,
            created_at: conversaData.created_at || ''
          };
        }
      }

      // Montar nome completo
      const nomeCompleto = aluno.full_name || 
        `${aluno.nome || ''} ${aluno.sobrenome || ''}`.trim() || 
        'Aluno';

      // Quantidade de observações para o novo sistema
      const quantidadeObservacoes = observacoes.length;
      const temObservacoes = quantidadeObservacoes > 0;

      return {
        id: aluno.id,
        nome: nomeCompleto,
        serie: aluno.serie || '',
        turma: aluno.turma || '',
        turmaId,
        avatarUrl: aluno.avatar_url || undefined,
        quantidadeObservacoes,
        temObservacoes,
        inteligencias,
        observacoes,
        alertaAtivo,
        ultimaObservacao,
        temObsFaseAtual,
        faseAtualNome,
        conversaRegistrada
      };
    },
    enabled: !!alunoId
  });
};
