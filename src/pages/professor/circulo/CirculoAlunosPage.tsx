import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, User } from 'lucide-react';
import { useProfessor } from '@/contexts/ProfessorContext';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface Aluno {
  id: string;
  full_name: string | null;
  nome: string | null;
  avatar_url: string | null;
}

const CirculoAlunosPage = () => {
  const { serie, turma } = useParams<{ serie: string; turma: string }>();
  const { casaColor, profile, casaMentor } = useProfessor();
  const navigate = useNavigate();

  const serieNumero = parseInt(serie || '6');
  const turmaLetra = turma?.toUpperCase() || 'A';

  const { data: alunos, isLoading } = useQuery({
    queryKey: ['circulo-alunos', profile?.institution_id, casaMentor?.id, serieNumero, turmaLetra],
    queryFn: async () => {
      if (!profile?.institution_id || !casaMentor?.id) return [];

      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, nome, avatar_url')
        .eq('institution_id', profile.institution_id)
        .eq('casa_id', casaMentor.id)
        .ilike('serie', `${serieNumero}%`)
        .ilike('turma', turmaLetra)
        .order('full_name');

      if (error) throw error;
      return data as Aluno[];
    },
    enabled: !!profile?.institution_id && !!casaMentor?.id
  });

  const handleAlunoClick = (alunoId: string) => {
    navigate(`/professor/circulo/aluno/${alunoId}?serie=${serieNumero}&turma=${turmaLetra}`);
  };

  const getAbreviatedName = (aluno: Aluno) => {
    const name = aluno.full_name || aluno.nome || 'Aluno';
    const parts = name.split(' ');
    if (parts.length === 1) return parts[0];
    return `${parts[0]} ${parts[parts.length - 1][0]}.`;
  };

  const getInitials = (aluno: Aluno) => {
    const name = aluno.full_name || aluno.nome || 'A';
    const parts = name.split(' ');
    if (parts.length === 1) return parts[0][0];
    return `${parts[0][0]}${parts[parts.length - 1][0]}`;
  };

  return (
    <div className="space-y-6 pt-4">
      {/* Header com voltar */}
      <div className="flex items-center gap-3">
        <button 
          onClick={() => navigate(`/professor/circulo/serie/${serieNumero}`)}
          className="p-2 -ml-2 rounded-full hover:bg-white/10"
        >
          <ChevronLeft size={24} className="text-white" />
        </button>
        <h1 className="text-xl font-bold text-white">{serieNumero}º Ano {turmaLetra}</h1>
      </div>

      {/* Grid de alunos - 4 colunas */}
      {isLoading ? (
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <Skeleton className="w-[70px] h-[70px] rounded-full bg-white/10" />
              <Skeleton className="w-16 h-4 bg-white/10" />
            </div>
          ))}
        </div>
      ) : alunos && alunos.length > 0 ? (
        <div className="grid grid-cols-4 gap-3">
          {alunos.map((aluno) => (
            <button
              key={aluno.id}
              onClick={() => handleAlunoClick(aluno.id)}
              className="flex flex-col items-center gap-2 p-2 rounded-xl transition-all active:scale-95 hover:bg-white/5"
            >
              <Avatar className="w-[70px] h-[70px] border-2" style={{ borderColor: `${casaColor}50` }}>
                <AvatarImage src={aluno.avatar_url || undefined} alt={aluno.full_name || 'Aluno'} />
                <AvatarFallback 
                  className="text-white text-lg font-medium"
                  style={{ backgroundColor: `${casaColor}30` }}
                >
                  {getInitials(aluno)}
                </AvatarFallback>
              </Avatar>
              <span className="text-white/80 text-xs text-center truncate w-full">
                {getAbreviatedName(aluno)}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <User size={48} className="mx-auto text-white/30 mb-4" />
          <p className="text-white/50">Nenhum aluno encontrado nesta turma</p>
        </div>
      )}
    </div>
  );
};

export default CirculoAlunosPage;
