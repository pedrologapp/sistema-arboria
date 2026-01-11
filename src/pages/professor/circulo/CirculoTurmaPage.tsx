import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react';
import { useProfessor } from '@/contexts/ProfessorContext';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

interface TurmaComContagem {
  turma_letra: string;
  count: number;
}

const CirculoTurmaPage = () => {
  const { serie } = useParams<{ serie: string }>();
  const { casaColor, profile, casaMentor } = useProfessor();
  const navigate = useNavigate();

  const serieNumero = parseInt(serie || '6');
  const serieTexto = `${serieNumero}º ano`;

  const { data: turmas, isLoading } = useQuery({
    queryKey: ['circulo-turmas', profile?.institution_id, casaMentor?.id, serieNumero],
    queryFn: async () => {
      if (!profile?.institution_id || !casaMentor?.id) return [];

      // Buscar alunos da casa do professor, filtrando por série
      const { data: alunos, error } = await supabase
        .from('profiles')
        .select('turma')
        .eq('institution_id', profile.institution_id)
        .eq('casa_id', casaMentor.id)
        .ilike('serie', `${serieNumero}%`);

      if (error) throw error;

      // Agrupar por turma e contar
      const turmaMap = new Map<string, number>();
      alunos?.forEach((aluno) => {
        if (aluno.turma) {
          const turmaUpper = aluno.turma.toUpperCase();
          turmaMap.set(turmaUpper, (turmaMap.get(turmaUpper) || 0) + 1);
        }
      });

      // Converter para array ordenado
      const result: TurmaComContagem[] = [];
      turmaMap.forEach((count, turma_letra) => {
        result.push({ turma_letra, count });
      });

      return result.sort((a, b) => a.turma_letra.localeCompare(b.turma_letra));
    },
    enabled: !!profile?.institution_id && !!casaMentor?.id
  });

  const handleTurmaClick = (turmaLetra: string) => {
    navigate(`/professor/circulo/serie/${serieNumero}/turma/${turmaLetra}`);
  };

  return (
    <div className="space-y-6 pt-4">
      {/* Header com voltar */}
      <div className="flex items-center gap-3">
        <button 
          onClick={() => navigate('/professor/circulo')}
          className="p-2 -ml-2 rounded-full hover:bg-white/10"
        >
          <ChevronLeft size={24} className="text-white" />
        </button>
        <h1 className="text-xl font-bold text-white">{serieTexto}</h1>
      </div>

      {/* Subtitle */}
      <p className="text-white/60 text-sm">SELECIONE A TURMA</p>

      {/* Grid de turmas */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="aspect-square rounded-2xl bg-white/10" />
          ))}
        </div>
      ) : turmas && turmas.length > 0 ? (
        <div className="grid grid-cols-2 gap-4">
          {turmas.map((turma) => (
            <button
              key={turma.turma_letra}
              onClick={() => handleTurmaClick(turma.turma_letra)}
              className="aspect-square rounded-2xl flex flex-col items-center justify-center gap-2 transition-all active:scale-95"
              style={{ 
                backgroundColor: `${casaColor}15`,
                border: `1px solid ${casaColor}30`
              }}
            >
              <span 
                className="text-2xl font-bold"
                style={{ color: casaColor }}
              >
                TURMA {turma.turma_letra}
              </span>
              <span className="text-white/70 text-sm">
                {turma.count} {turma.count === 1 ? 'aluno' : 'alunos'}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-white/50">Nenhuma turma encontrada para esta série</p>
        </div>
      )}
    </div>
  );
};

export default CirculoTurmaPage;
