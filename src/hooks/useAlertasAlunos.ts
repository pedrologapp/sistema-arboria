import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfessor } from '@/contexts/ProfessorContext';

export interface AlertaAluno {
  id: string;
  aluno: {
    id: string;
    nome: string;
    avatarUrl?: string;
    serie: string;
    turma: string;
  };
  tipo_alerta: 'precisa_atencao' | 'celebrar' | 'nao_esquecer' | 'fase_anterior' | 'aguardando_explicacao';
  motivo: string;
  dados_contexto: Record<string, unknown>;
  created_at: string;
}

export interface AlertaFaseAnterior {
  id: string;
  aluno: {
    id: string;
    nome: string;
    avatarUrl?: string;
    serie: string;
    turma: string;
  };
  faseAnteriorNome: string;
  faseAnteriorEmoji: string;
  motivo: string;
  observadoFaseAtual: boolean;
  dados_contexto: Record<string, unknown>;
}

export interface AlertaExplicacao {
  id: string;
  aluno: {
    id: string;
    nome: string;
    avatarUrl?: string;
    serie: string;
    turma: string;
  };
  tipo_contradicao: string;
  perguntas_professor: string[];
  sugestao_anterior_resumo: string;
  observacao_nova: string;
  created_at: string;
  // Campos do N8N
  mensagem_professor: string;
  texto_acontecendo: string;
  // Campos estruturados para opções de ação
  observacao_contraditoria: { sinal: string; valencia: string } | null;
  sugestao_anterior: { estado: string; icone: string } | null;
}

export interface AlunoSimples {
  id: string;
  nome: string;
  avatarUrl?: string;
  serie?: string;
  turma?: string;
}

export interface BannerComeceAqui {
  faseNome: string;
  faseEmoji: string;
  quantidade: number;
  alunos: AlunoSimples[];
}

export interface BadgesAtivos {
  precisaAtencao: number;
  celebrar: number;
  naoEsquecer: number;
  atencaoFaseAnterior: number;
  aguardandoExplicacao: number;
}

export interface AlertasAgrupados {
  bannerComeceAqui: BannerComeceAqui | null;
  precisaAtencao: AlertaAluno[];
  celebrar: AlertaAluno[];
  naoEsquecer: AlertaAluno[];
  atencaoFaseAnterior: AlertaFaseAnterior[];
  aguardandoExplicacao: AlertaExplicacao[];
  totais: {
    precisaAtencao: number;
    celebrar: number;
    naoEsquecer: number;
    atencaoFaseAnterior: number;
    aguardandoExplicacao: number;
  };
  badgesAtivos: BadgesAtivos;
  isLoading: boolean;
}

export const useAlertasAlunos = () => {
  const { profile, casaMentor, faseAtual } = useProfessor();

  const query = useQuery({
    queryKey: ['alertas-alunos', profile?.institution_id, casaMentor?.id, faseAtual?.id],
    queryFn: async (): Promise<AlertasAgrupados> => {
      if (!profile?.institution_id || !casaMentor?.id) {
        return {
          bannerComeceAqui: null,
          precisaAtencao: [],
          celebrar: [],
          naoEsquecer: [],
          atencaoFaseAnterior: [],
          aguardandoExplicacao: [],
          totais: { precisaAtencao: 0, celebrar: 0, naoEsquecer: 0, atencaoFaseAnterior: 0, aguardandoExplicacao: 0 },
          badgesAtivos: { precisaAtencao: 0, celebrar: 0, naoEsquecer: 0, atencaoFaseAnterior: 0, aguardandoExplicacao: 0 },
          isLoading: false
        };
      }

      // 1. Buscar alunos da casa
      const { data: alunosCasa, error: alunosError } = await supabase
        .from('profiles')
        .select('id, nome, sobrenome, avatar_url, serie, turma')
        .eq('institution_id', profile.institution_id)
        .eq('casa_id', casaMentor.id);

      if (alunosError) {
        console.error('Erro ao buscar alunos:', alunosError);
        throw alunosError;
      }

      const alunoIds = alunosCasa?.map(a => a.id) || [];

      // 2. Buscar alertas ativos da tabela (fase atual)
      const { data: alertasDb, error: alertasError } = await supabase
        .from('alertas_alunos')
        .select(`
          id,
          tipo_alerta,
          motivo,
          dados_contexto,
          created_at,
          fase_id,
          fase_origem_id,
          notificacao_ativa,
          aluno:profiles!alertas_alunos_aluno_id_fkey (
            id,
            nome,
            sobrenome,
            avatar_url,
            serie,
            turma
          )
        `)
        .eq('institution_id', profile.institution_id)
        .eq('status', 'ativo')
        .order('created_at', { ascending: false });

      if (alertasError) {
        console.error('Erro ao buscar alertas:', alertasError);
        throw alertasError;
      }

      // 3. Buscar observações da FASE ATUAL para cada aluno (incluindo sinal para valencia)
      let observacoesFaseAtual: Record<string, { count: number; ultimaData: string | null; observacoes: { valencia: string }[] }> = {};
      
      if (alunoIds.length > 0 && faseAtual?.id) {
        const { data: observacoes, error: obsError } = await supabase
          .from('observacoes')
          .select('aluno_id, created_at, sinal_id')
          .in('aluno_id', alunoIds)
          .eq('fase_id', faseAtual.id)
          .is('excluida_em' as never, null)
          .order('created_at', { ascending: false });

        // Buscar sinais para saber a valencia
        const sinaisIds = [...new Set(observacoes?.map(o => o.sinal_id) || [])];
        let sinaisMap: Record<number, string> = {};
        if (sinaisIds.length > 0) {
          const { data: sinaisData } = await supabase
            .from('sinais')
            .select('id, valencia')
            .in('id', sinaisIds);
          if (sinaisData) {
            sinaisData.forEach(s => { sinaisMap[s.id] = s.valencia; });
          }
        }

        if (!obsError && observacoes) {
          observacoes.forEach(obs => {
            if (!observacoesFaseAtual[obs.aluno_id]) {
              observacoesFaseAtual[obs.aluno_id] = { count: 0, ultimaData: null, observacoes: [] };
            }
            observacoesFaseAtual[obs.aluno_id].count += 1;
            if (!observacoesFaseAtual[obs.aluno_id].ultimaData) {
              observacoesFaseAtual[obs.aluno_id].ultimaData = obs.created_at || null;
            }
            // Adicionar valencia às observações (máximo 2 para verificar padrão)
            if (observacoesFaseAtual[obs.aluno_id].observacoes.length < 2) {
              observacoesFaseAtual[obs.aluno_id].observacoes.push({
                valencia: sinaisMap[obs.sinal_id] || 'neutra'
              });
            }
          });
        }
      }

      // 4. Calcular BANNER "Comece por aqui" - alunos SEM observação na fase atual
      const alunosSemObsFase: AlunoSimples[] = (alunosCasa || [])
        .filter(aluno => !observacoesFaseAtual[aluno.id] || observacoesFaseAtual[aluno.id].count === 0)
        .map(aluno => ({
          id: aluno.id,
          nome: `${aluno.nome || ''} ${aluno.sobrenome || ''}`.trim() || 'Aluno',
          avatarUrl: aluno.avatar_url || undefined,
          serie: aluno.serie || undefined,
          turma: aluno.turma || undefined
        }));

      const bannerComeceAqui: BannerComeceAqui | null = alunosSemObsFase.length > 0 && faseAtual
        ? {
            faseNome: faseAtual.inteligencia?.nome || 'Atual',
            faseEmoji: faseAtual.inteligencia?.emoji || '📚',
            quantidade: alunosSemObsFase.length,
            alunos: alunosSemObsFase
          }
        : null;

      // 5. Calcular "Não esqueça" - alunos COM ≥1 obs na fase atual E 14+ dias sem nova
      const hoje = new Date();
      const limite14Dias = new Date(hoje);
      limite14Dias.setDate(limite14Dias.getDate() - 14);

      const alunosNaoEsquecer: AlertaAluno[] = (alunosCasa || [])
        .filter(aluno => {
          const obsData = observacoesFaseAtual[aluno.id];
          // Deve ter pelo menos 1 observação na fase
          if (!obsData || obsData.count === 0) return false;
          // E a última deve ser há 14+ dias
          if (!obsData.ultimaData) return false;
          return new Date(obsData.ultimaData) < limite14Dias;
        })
        .map(aluno => {
          const obsData = observacoesFaseAtual[aluno.id];
          const diasSemObs = obsData?.ultimaData 
            ? Math.floor((hoje.getTime() - new Date(obsData.ultimaData).getTime()) / (1000 * 60 * 60 * 24))
            : 0;
          
          return {
            id: `nao-esquecer-${aluno.id}`,
            aluno: {
              id: aluno.id,
              nome: `${aluno.nome || ''} ${aluno.sobrenome || ''}`.trim() || 'Aluno',
              avatarUrl: aluno.avatar_url || undefined,
              serie: aluno.serie || '',
              turma: aluno.turma || ''
            },
            tipo_alerta: 'nao_esquecer' as const,
            motivo: `Última observação há ${diasSemObs} dias`,
            dados_contexto: {},
            created_at: new Date().toISOString()
          };
        });

      // 6. Filtrar alertas do banco
      const alertasFiltrados = (alertasDb || [])
        .filter(a => alunoIds.includes(a.aluno?.id))
        .map(alerta => ({
          id: alerta.id,
          aluno: {
            id: alerta.aluno?.id || '',
            nome: `${alerta.aluno?.nome || ''} ${alerta.aluno?.sobrenome || ''}`.trim() || 'Aluno',
            avatarUrl: alerta.aluno?.avatar_url || undefined,
            serie: alerta.aluno?.serie || '',
            turma: alerta.aluno?.turma || ''
          },
          tipo_alerta: alerta.tipo_alerta as 'precisa_atencao' | 'celebrar' | 'nao_esquecer' | 'fase_anterior' | 'aguardando_explicacao',
          motivo: alerta.motivo,
          dados_contexto: (alerta.dados_contexto as Record<string, unknown>) || {},
          created_at: alerta.created_at || '',
          fase_id: alerta.fase_id,
          fase_origem_id: alerta.fase_origem_id
        }));

      // 7. Separar alertas da fase atual vs fase anterior
      // Alertas de fase_anterior vêm diretamente do banco (tipo_alerta = 'fase_anterior')
      // OU são alertas com fase_origem_id diferente da fase atual
      const alertasFaseAtual = alertasFiltrados.filter(a => 
        a.tipo_alerta !== 'fase_anterior' && 
        (!a.fase_origem_id || a.fase_origem_id === faseAtual?.id || a.fase_id === faseAtual?.id)
      );
      
      const alertasFaseAnteriorRaw = alertasFiltrados.filter(a => 
        a.tipo_alerta === 'fase_anterior' ||
        (a.fase_origem_id && a.fase_origem_id !== faseAtual?.id)
      );

      // 8. Buscar dados das fases anteriores para os alertas
      const faseOrigemIds = [...new Set(alertasFaseAnteriorRaw.map(a => a.fase_origem_id).filter(Boolean))];
      let fasesAnterioresMap: Record<string, { nome: string; emoji: string }> = {};
      
      if (faseOrigemIds.length > 0) {
        const { data: fasesData } = await supabase
          .from('fases')
          .select(`
            id,
            inteligencia:inteligencias!fases_inteligencia_id_fkey (
              nome,
              emoji
            )
          `)
          .in('id', faseOrigemIds as string[]);

        if (fasesData) {
          fasesData.forEach(fase => {
            fasesAnterioresMap[fase.id] = {
              nome: fase.inteligencia?.nome || 'Anterior',
              emoji: fase.inteligencia?.emoji || '📚'
            };
          });
        }
      }

      // 9. Montar alertas de fase anterior
      const atencaoFaseAnterior: AlertaFaseAnterior[] = alertasFaseAnteriorRaw.map(alerta => {
        const faseInfo = fasesAnterioresMap[alerta.fase_origem_id || ''] || { nome: 'Anterior', emoji: '📚' };
        const temObsFaseAtual = (observacoesFaseAtual[alerta.aluno.id]?.count || 0) > 0;
        
        return {
          id: alerta.id,
          aluno: alerta.aluno,
          faseAnteriorNome: faseInfo.nome,
          faseAnteriorEmoji: faseInfo.emoji,
          motivo: alerta.motivo,
          observadoFaseAtual: temObsFaseAtual,
          dados_contexto: alerta.dados_contexto
        };
      });

      // 10. PRIMEIRO: Extrair alertas de aguardando_explicacao e criar Set de exclusão
      const aguardandoExplicacao: AlertaExplicacao[] = alertasFaseAtual
        .filter(a => a.tipo_alerta === 'aguardando_explicacao')
        .map(alerta => ({
          id: alerta.id,
          aluno: alerta.aluno,
          tipo_contradicao: (alerta.dados_contexto?.tipo_contradicao as string) || '',
          perguntas_professor: (alerta.dados_contexto?.perguntas_professor as string[]) || [],
          sugestao_anterior_resumo: (alerta.dados_contexto?.sugestao_anterior_resumo as string) || '',
          observacao_nova: (alerta.dados_contexto?.observacao_nova as string) || '',
          created_at: alerta.created_at,
          // Campos do N8N
          mensagem_professor: (alerta.dados_contexto?.mensagem_professor as string) || '',
          texto_acontecendo: (alerta.dados_contexto?.texto_acontecendo as string) || '',
          // Campos estruturados para opções de ação
          observacao_contraditoria: (alerta.dados_contexto?.observacao_contraditoria as { sinal: string; valencia: string }) || null,
          sugestao_anterior: (alerta.dados_contexto?.sugestao_anterior as { estado: string; icone: string }) || null
        }));
      
      // 10.1 Criar Set de alunos com justificativa pendente para EXCLUSÃO MÚTUA
      const alunosComJustificativaPendente = new Set(
        aguardandoExplicacao.map(a => a.aluno.id)
      );
      
      // 10.2 Agrupar alertas da fase atual por tipo, EXCLUINDO alunos com justificativa pendente
      const precisaAtencao = alertasFaseAtual.filter(a => 
        a.tipo_alerta === 'precisa_atencao' && 
        !alunosComJustificativaPendente.has(a.aluno.id)
      );
      const celebrarDb = alertasFaseAtual.filter(a => 
        a.tipo_alerta === 'celebrar' && 
        !alunosComJustificativaPendente.has(a.aluno.id)
      );
      const naoEsquecerDb = alertasFaseAtual.filter(a => 
        a.tipo_alerta === 'nao_esquecer' && 
        !alunosComJustificativaPendente.has(a.aluno.id)
      );
      
      // 10.3 Calcular celebrações dinâmicas (2 positivos consecutivos)
      // EXCLUINDO alunos com justificativa pendente
      const celebracoesDinamicas: AlertaAluno[] = [];
      const alunosJaCelebrados = new Set(celebrarDb.map(c => c.aluno.id));
      
      for (const aluno of alunosCasa || []) {
        // Pular se já tem alerta de celebração no banco
        if (alunosJaCelebrados.has(aluno.id)) continue;
        
        // Pular se tem justificativa pendente
        if (alunosComJustificativaPendente.has(aluno.id)) continue;
        
        const obsData = observacoesFaseAtual[aluno.id];
        if (!obsData || obsData.observacoes.length < 2) continue;
        
        const [ultima, penultima] = obsData.observacoes;
        
        // 2 positivos consecutivos = celebrar
        if (ultima.valencia === 'positivo' && penultima.valencia === 'positivo') {
          celebracoesDinamicas.push({
            id: `celebrar-dinamico-${aluno.id}`,
            aluno: {
              id: aluno.id,
              nome: `${aluno.nome || ''} ${aluno.sobrenome || ''}`.trim() || 'Aluno',
              avatarUrl: aluno.avatar_url || undefined,
              serie: aluno.serie || '',
              turma: aluno.turma || ''
            },
            tipo_alerta: 'celebrar',
            motivo: '2 positivos consecutivos!',
            dados_contexto: { dinamico: true },
            created_at: new Date().toISOString()
          });
        }
      }
      
      // Combinar celebrações do banco + dinâmicas
      const celebrar = [...celebrarDb, ...celebracoesDinamicas];
      
      // 10.4 Filtrar nao_esquecer calculados excluindo alunos com justificativa pendente
      const alunosNaoEsquecerFiltrados = alunosNaoEsquecer.filter(
        a => !alunosComJustificativaPendente.has(a.aluno.id)
      );
      
      // Combinar nao_esquecer do banco + calculados dinamicamente
      const naoEsquecer = [...naoEsquecerDb, ...alunosNaoEsquecerFiltrados];

      // 11. Calcular badges ativos (contagem de alertas com notificacao_ativa = true)
      // EXCLUINDO alunos com justificativa pendente dos outros badges
      const alertasComBadge = (alertasDb || []).filter(a => a.notificacao_ativa === true);
      
      const badgesPrecisa = alertasComBadge.filter(a => 
        a.tipo_alerta === 'precisa_atencao' && 
        (!a.fase_origem_id || a.fase_origem_id === faseAtual?.id) &&
        !alunosComJustificativaPendente.has(a.aluno?.id || '')
      ).length;
      const badgesCelebrarDb = alertasComBadge.filter(a => 
        a.tipo_alerta === 'celebrar' && 
        (!a.fase_origem_id || a.fase_origem_id === faseAtual?.id) &&
        !alunosComJustificativaPendente.has(a.aluno?.id || '')
      ).length;
      const badgesCelebrar = badgesCelebrarDb + celebracoesDinamicas.length;
      const badgesNaoEsquecer = alertasComBadge.filter(a => 
        a.tipo_alerta === 'nao_esquecer' && 
        (!a.fase_origem_id || a.fase_origem_id === faseAtual?.id) &&
        !alunosComJustificativaPendente.has(a.aluno?.id || '')
      ).length;
      const badgesFaseAnterior = alertasComBadge.filter(a => 
        a.fase_origem_id && a.fase_origem_id !== faseAtual?.id &&
        !alunosComJustificativaPendente.has(a.aluno?.id || '')
      ).length;
      const badgesExplicacao = alertasComBadge.filter(a => 
        a.tipo_alerta === 'aguardando_explicacao'
      ).length;

      return {
        bannerComeceAqui,
        precisaAtencao,
        celebrar,
        naoEsquecer,
        atencaoFaseAnterior,
        aguardandoExplicacao,
        totais: {
          precisaAtencao: precisaAtencao.length,
          celebrar: celebrar.length,
          naoEsquecer: naoEsquecer.length,
          atencaoFaseAnterior: atencaoFaseAnterior.length,
          aguardandoExplicacao: aguardandoExplicacao.length
        },
        badgesAtivos: {
          precisaAtencao: badgesPrecisa,
          celebrar: badgesCelebrar,
          naoEsquecer: badgesNaoEsquecer + alunosNaoEsquecer.length, // Incluir calculados
          atencaoFaseAnterior: badgesFaseAnterior,
          aguardandoExplicacao: badgesExplicacao
        },
        isLoading: false
      };
    },
    enabled: !!profile?.institution_id && !!casaMentor?.id,
    staleTime: 1000 * 60 * 2,
    refetchInterval: 1000 * 60 * 5
  });

  return {
    ...query.data,
    isLoading: query.isLoading,
    bannerComeceAqui: query.data?.bannerComeceAqui || null,
    precisaAtencao: query.data?.precisaAtencao || [],
    celebrar: query.data?.celebrar || [],
    naoEsquecer: query.data?.naoEsquecer || [],
    atencaoFaseAnterior: query.data?.atencaoFaseAnterior || [],
    aguardandoExplicacao: query.data?.aguardandoExplicacao || [],
    totais: query.data?.totais || { precisaAtencao: 0, celebrar: 0, naoEsquecer: 0, atencaoFaseAnterior: 0, aguardandoExplicacao: 0 },
    badgesAtivos: query.data?.badgesAtivos || { precisaAtencao: 0, celebrar: 0, naoEsquecer: 0, atencaoFaseAnterior: 0, aguardandoExplicacao: 0 }
  };
};
