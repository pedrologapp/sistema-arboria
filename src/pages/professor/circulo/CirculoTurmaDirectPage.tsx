import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfessor } from '@/contexts/ProfessorContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface Aluno {
  id: string;
  nome: string;
  avatarUrl?: string;
}

const CirculoTurmaDirectPage = () => {
  const { turmaId } = useParams<{ turmaId: string }>();
  const navigate = useNavigate();
  const { profile, turmasVinculadas } = useProfessor();

  // Encontrar dados da turma
  const turmaInfo = turmasVinculadas?.find(t => t.id === turmaId);

  // Buscar alunos da turma
  const { data: alunos, isLoading } = useQuery({
    queryKey: ['alunos-turma-direta', turmaId],
    queryFn: async (): Promise<Aluno[]> => {
      if (!turmaId) return [];

      const { data, error } = await supabase
        .from('aluno_turma')
        .select(`
          aluno_id,
          profiles!inner (
            id,
            full_name,
            nome,
            sobrenome,
            avatar_url
          )
        `)
        .eq('turma_id', turmaId)
        .eq('ativo', true);

      if (error) {
        console.error('Erro ao buscar alunos:', error);
        throw error;
      }

      if (!data) return [];

      return data.map(at => {
        const p = at.profiles as any;
        const nomeCompleto = p.full_name || 
          [p.nome, p.sobrenome].filter(Boolean).join(' ') || 
          'Sem nome';

        return {
          id: p.id,
          nome: nomeCompleto,
          avatarUrl: p.avatar_url || undefined,
        };
      }).sort((a, b) => a.nome.localeCompare(b.nome));
    },
    enabled: !!turmaId
  });

  const handleAlunoClick = (alunoId: string) => {
    navigate(`/professor/circulo/aluno/${alunoId}`);
  };

  const accentColor = '#6366f1';

  return (
    <div className="space-y-6 pt-4">
      {/* Header com voltar */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/professor/circulo')}
          className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">
            {turmaInfo ? `${turmaInfo.serie}º ${turmaInfo.turma_letra}` : 'Turma'}
          </h1>
          {turmaInfo && (
            <p className="text-sm text-white/50">{turmaInfo.nome}</p>
          )}
        </div>
      </div>

      {/* Subtitle */}
      <div className="flex items-center gap-2">
        <Users className="w-4 h-4 text-white/50" />
        <p className="text-white/60 text-sm">
          {alunos?.length || 0} alunos • Selecione para observar
        </p>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {/* Lista de Alunos */}
      {!isLoading && alunos && (
        <div className="space-y-2">
          {alunos.map((aluno) => (
            <button
              key={aluno.id}
              onClick={() => handleAlunoClick(aluno.id)}
              className="w-full flex items-center gap-3 p-3 rounded-xl
                bg-gradient-to-r from-white/[0.06] to-white/[0.02]
                border border-white/10 hover:border-white/20
                transition-all duration-200 active:scale-[0.98]"
            >
              <Avatar className="h-10 w-10">
                <AvatarImage src={aluno.avatarUrl} />
                <AvatarFallback 
                  className="text-white text-sm font-medium"
                  style={{ backgroundColor: `${accentColor}30` }}
                >
                  {aluno.nome.split(' ').map(n => n[0]).slice(0, 2).join('')}
                </AvatarFallback>
              </Avatar>
              <span className="text-white font-medium flex-1 text-left">
                {aluno.nome}
              </span>
              <ChevronLeft className="w-4 h-4 text-white/30 rotate-180" />
            </button>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && (!alunos || alunos.length === 0) && (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/50">Nenhum aluno encontrado nesta turma</p>
        </div>
      )}
    </div>
  );
};

export default CirculoTurmaDirectPage;
