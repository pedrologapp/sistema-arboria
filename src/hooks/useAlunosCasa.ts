import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfessor } from '@/contexts/ProfessorContext';

export interface AlunoComStatus {
  id: string;
  nome: string;
  serie: string;
  turma: string;
  avatarUrl?: string;
  status: 'destaque' | 'regular' | 'risco';
  percentualEntregas: number;
  mediaNotas: number;
  pontosTotais: number;
}

export const useAlunosCasa = () => {
  const { casaMentor, profile } = useProfessor();

  return useQuery({
    queryKey: ['alunos-casa', casaMentor?.id, profile?.institution_id],
    queryFn: async (): Promise<AlunoComStatus[]> => {
      if (!casaMentor?.id || !profile?.institution_id) {
        return [];
      }

      console.log('=== DEBUG useAlunosCasa ===');
      console.log('casaMentor.id:', casaMentor.id);
      console.log('institution_id:', profile.institution_id);

      // 1. Buscar alunos da casa
      // A RLS de profiles já garante que só retornará alunos que o professor pode ver
      const { data: alunos, error: alunosError } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          nome,
          sobrenome,
          serie,
          turma,
          avatar_url
        `)
        .eq('casa_id', casaMentor.id)
        .eq('institution_id', profile.institution_id);

      console.log('Alunos encontrados:', alunos?.length || 0);
      console.log('Erro:', alunosError);

      if (alunosError) {
        console.error('Erro ao buscar alunos:', alunosError);
        throw alunosError;
      }

      // Usar diretamente os alunos retornados (RLS já filtrou)
      const alunosValidos = alunos || [];

      if (alunosValidos.length === 0) {
        return [];
      }

      // 2. Buscar total de missões liberadas para a casa
      const { count: totalMissoes } = await supabase
        .from('missoes')
        .select('*', { count: 'exact', head: true })
        .eq('institution_id', profile.institution_id)
        .eq('status', 'liberada')
        .or(`casa_id.eq.${casaMentor.id},casa_id.is.null`);

      // 3. Buscar entregas de todos os alunos
      const alunoIdsArray = alunosValidos.map(a => a.id);
      
      const { data: entregas } = await supabase
        .from('entregas')
        .select('aluno_id, nota, status')
        .in('aluno_id', alunoIdsArray);

      // 4. Buscar pontos de todos os alunos
      const { data: pontos } = await supabase
        .from('pontos_gerais')
        .select('aluno_id, pontos')
        .in('aluno_id', alunoIdsArray);

      // 5. Calcular métricas para cada aluno
      const alunosComStatus: AlunoComStatus[] = alunosValidos.map(aluno => {
        // Entregas do aluno
        const entregasAluno = entregas?.filter(e => e.aluno_id === aluno.id) || [];
        const totalEntregas = entregasAluno.length;
        
        // Percentual de entregas
        const percentualEntregas = totalMissoes && totalMissoes > 0 
          ? Math.min(100, (totalEntregas / totalMissoes) * 100)
          : 0;
        
        // Média das notas (apenas entregas aprovadas com nota)
        const notasValidas = entregasAluno
          .filter(e => e.nota !== null && e.status === 'aprovada')
          .map(e => e.nota as number);
        
        const mediaNotas = notasValidas.length > 0 
          ? notasValidas.reduce((a, b) => a + b, 0) / notasValidas.length 
          : 0;

        // Pontos totais
        const pontosAluno = pontos?.filter(p => p.aluno_id === aluno.id) || [];
        const pontosTotais = pontosAluno.reduce((sum, p) => sum + (p.pontos || 0), 0);

        // Determinar status
        let status: 'destaque' | 'regular' | 'risco' = 'regular';
        
        if (percentualEntregas >= 80 && mediaNotas >= 7) {
          status = 'destaque';
        } else if (percentualEntregas < 40 || (notasValidas.length > 0 && mediaNotas < 5)) {
          status = 'risco';
        }

        // Nome formatado
        const nomeCompleto = aluno.full_name || 
          [aluno.nome, aluno.sobrenome].filter(Boolean).join(' ') || 
          'Sem nome';

        return {
          id: aluno.id,
          nome: nomeCompleto,
          serie: aluno.serie || '6º',
          turma: aluno.turma || 'A',
          avatarUrl: aluno.avatar_url || undefined,
          status,
          percentualEntregas: Math.round(percentualEntregas),
          mediaNotas: Math.round(mediaNotas * 10) / 10,
          pontosTotais
        };
      });

      // 6. Ordenar: Em risco primeiro, depois Regular, depois Destaque
      return alunosComStatus.sort((a, b) => {
        const ordem = { risco: 0, regular: 1, destaque: 2 };
        if (ordem[a.status] !== ordem[b.status]) {
          return ordem[a.status] - ordem[b.status];
        }
        // Dentro do mesmo status, ordenar por nome
        return a.nome.localeCompare(b.nome);
      });
    },
    enabled: !!casaMentor?.id && !!profile?.institution_id
  });
};
