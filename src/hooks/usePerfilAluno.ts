import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfessor } from '@/contexts/ProfessorContext';

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
  observacoes: {
    id: string;
    sinalEmoji: string;
    sinalLabel: string;
    texto?: string | null;
    dataHora: string;
  }[];
}

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

      if (aluno.casa_id) {
        const { data: casa } = await supabase
          .from('inteligencias')
          .select('id, nome, cor_hex, emoji')
          .eq('id', aluno.casa_id)
          .single();

        if (casa) {
          casaNome = casa.nome;
          casaCor = casa.cor_hex || '#6366f1';
          casaEmoji = casa.emoji || '🏠';
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

      // 6. Observações recentes (últimas 5)
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
        .limit(5);

      // Buscar sinais separadamente
      const sinaisIds = [...new Set(observacoesData?.map(o => o.sinal_id) || [])];
      const { data: sinaisData } = await supabase
        .from('sinais')
        .select('id, emoji, label_pt')
        .in('id', sinaisIds.length > 0 ? sinaisIds : [0]);

      const sinaisMap = new Map(sinaisData?.map(s => [s.id, s]) || []);

      const observacoes = (observacoesData || []).map(o => {
        const sinal = sinaisMap.get(o.sinal_id);
        return {
          id: o.id,
          sinalEmoji: sinal?.emoji || '📝',
          sinalLabel: sinal?.label_pt || 'Observação',
          texto: o.observacao_texto,
          dataHora: o.data_observacao
        };
      });

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
        pontosTotais,
        ranking,
        totalAlunosCasa,
        status,
        percentualEntregas,
        mediaNotas,
        inteligencias,
        missoes,
        observacoes
      };
    },
    enabled: !!alunoId && !!profile?.institution_id
  });
};
