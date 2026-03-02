import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfessor } from '@/contexts/ProfessorContext';

export interface AlunoComStatus {
  id: string;
  nome: string;
  serie: string;
  turma: string;
  avatarUrl?: string;
  casaNome: string | null;
  casaId: number | null;
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

      // 1. Buscar TODOS os alunos da instituição (sem filtro por casa_id)
      // Filtramos por segmento fundamental2 e que tenham serie preenchida (são alunos)
      const { data: alunos, error: alunosError } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          nome,
          sobrenome,
          serie,
          turma,
          avatar_url,
          casa_id
        `)
        .eq('institution_id', profile.institution_id)
        .not('serie', 'is', null);

      if (alunosError) {
        console.error('Erro ao buscar alunos:', alunosError);
        throw alunosError;
      }

      const alunosValidos = alunos || [];

      if (alunosValidos.length === 0) {
        return [];
      }

      // 2. Buscar nomes das casas (inteligências)
      const { data: casas } = await supabase
        .from('inteligencias')
        .select('id, nome');

      const casaMap = new Map<number, string>();
      casas?.forEach(c => casaMap.set(c.id, c.nome));

      // 3. Buscar total de missões liberadas
      const { count: totalMissoes } = await supabase
        .from('missoes')
        .select('*', { count: 'exact', head: true })
        .eq('institution_id', profile.institution_id)
        .eq('status', 'liberada');

      // 4. Buscar entregas de todos os alunos
      const alunoIdsArray = alunosValidos.map(a => a.id);
      
      const { data: entregas } = await supabase
        .from('entregas')
        .select('aluno_id, nota, status')
        .in('aluno_id', alunoIdsArray);

      // 5. Buscar pontos de todos os alunos
      const { data: pontos } = await supabase
        .from('pontos_gerais')
        .select('aluno_id, pontos')
        .in('aluno_id', alunoIdsArray);

      // 6. Calcular métricas para cada aluno
      const alunosComStatus: AlunoComStatus[] = alunosValidos.map(aluno => {
        const entregasAluno = entregas?.filter(e => e.aluno_id === aluno.id) || [];
        const totalEntregas = entregasAluno.length;
        
        const percentualEntregas = totalMissoes && totalMissoes > 0 
          ? Math.min(100, (totalEntregas / totalMissoes) * 100)
          : 0;
        
        const notasValidas = entregasAluno
          .filter(e => e.nota !== null && e.status === 'aprovada')
          .map(e => e.nota as number);
        
        const mediaNotas = notasValidas.length > 0 
          ? notasValidas.reduce((a, b) => a + b, 0) / notasValidas.length 
          : 0;

        const pontosAluno = pontos?.filter(p => p.aluno_id === aluno.id) || [];
        const pontosTotais = pontosAluno.reduce((sum, p) => sum + (p.pontos || 0), 0);

        let status: 'destaque' | 'regular' | 'risco' = 'regular';
        
        if (percentualEntregas >= 80 && mediaNotas >= 7) {
          status = 'destaque';
        } else if (percentualEntregas < 40 || (notasValidas.length > 0 && mediaNotas < 5)) {
          status = 'risco';
        }

        const nomeCompleto = aluno.full_name || 
          [aluno.nome, aluno.sobrenome].filter(Boolean).join(' ') || 
          'Sem nome';

        return {
          id: aluno.id,
          nome: nomeCompleto,
          serie: aluno.serie || '6º',
          turma: aluno.turma || 'A',
          avatarUrl: aluno.avatar_url || undefined,
          casaId: aluno.casa_id,
          casaNome: aluno.casa_id ? (casaMap.get(aluno.casa_id) || null) : null,
          status,
          percentualEntregas: Math.round(percentualEntregas),
          mediaNotas: Math.round(mediaNotas * 10) / 10,
          pontosTotais
        };
      });

      // 7. Ordenar: Em risco primeiro, depois Regular, depois Destaque
      return alunosComStatus.sort((a, b) => {
        const ordem = { risco: 0, regular: 1, destaque: 2 };
        if (ordem[a.status] !== ordem[b.status]) {
          return ordem[a.status] - ordem[b.status];
        }
        return a.nome.localeCompare(b.nome);
      });
    },
    enabled: !!casaMentor?.id && !!profile?.institution_id
  });
};
