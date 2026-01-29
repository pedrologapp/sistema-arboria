import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Users2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfessor } from '@/contexts/ProfessorContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface Aluno {
  id: string;
  nome: string;
  nomeAbreviado: string;
  iniciais: string;
  avatarUrl?: string;
}

const CirculoTurmaDirectPage = () => {
  const { turmaId } = useParams<{ turmaId: string }>();
  const navigate = useNavigate();
  const { turmasVinculadas } = useProfessor();

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
        const primeiroNome = p.nome || p.full_name?.split(' ')[0] || 'Aluno';
        const sobrenome = p.sobrenome || p.full_name?.split(' ').slice(1).join(' ') || '';
        
        // Nome abreviado: Primeiro Nome + Inicial do sobrenome
        const nomeAbreviado = sobrenome 
          ? `${primeiroNome} ${sobrenome.charAt(0).toUpperCase()}.`
          : primeiroNome;
        
        // Iniciais para avatar
        const iniciais = primeiroNome.charAt(0).toUpperCase() + 
          (sobrenome ? sobrenome.charAt(0).toUpperCase() : '');

        return {
          id: p.id,
          nome: p.full_name || [p.nome, p.sobrenome].filter(Boolean).join(' ') || 'Sem nome',
          nomeAbreviado,
          iniciais,
          avatarUrl: p.avatar_url || undefined,
        };
      }).sort((a, b) => a.nome.localeCompare(b.nome));
    },
    enabled: !!turmaId
  });

  const handleAlunoClick = (alunoId: string) => {
    navigate(`/professor/circulo/aluno/${alunoId}`);
  };

  return (
    <div className="space-y-5 pt-4">
      {/* Header com voltar e botão Selecionar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/professor/circulo')}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-xl font-bold text-white">
            {turmaInfo ? `${turmaInfo.serie}º Ano ${turmaInfo.turma_letra}` : 'Turma'}
          </h1>
        </div>
        
        {/* Botão Selecionar (futuro) */}
        <button
          className="flex items-center gap-2 px-3 py-2 rounded-lg
            bg-white/5 hover:bg-white/10 transition-colors
            text-white/70 text-sm font-medium"
        >
          <Users2 className="w-4 h-4" />
          Selecionar
        </button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className="w-14 h-14 rounded-full bg-white/5 animate-pulse" />
              <div className="w-12 h-3 bg-white/5 rounded animate-pulse" />
            </div>
          ))}
        </div>
      )}

      {/* Grid de Alunos */}
      {!isLoading && alunos && alunos.length > 0 && (
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
          {alunos.map((aluno) => (
            <button
              key={aluno.id}
              onClick={() => handleAlunoClick(aluno.id)}
              className="flex flex-col items-center gap-1 p-1.5 rounded-xl
                hover:bg-white/5 transition-all duration-200 
                active:scale-95 group"
            >
              <Avatar className="h-14 w-14 ring-2 ring-transparent group-hover:ring-white/20 transition-all">
                <AvatarImage src={aluno.avatarUrl} className="object-cover" />
                <AvatarFallback 
                  className="text-white text-base font-semibold bg-[#1e3a5f]"
                >
                  {aluno.iniciais}
                </AvatarFallback>
              </Avatar>
              <span className="text-white/80 text-xs font-medium text-center leading-tight">
                {aluno.nomeAbreviado}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && (!alunos || alunos.length === 0) && (
        <div className="text-center py-12">
          <Users2 className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/50">Nenhum aluno encontrado nesta turma</p>
        </div>
      )}
    </div>
  );
};

export default CirculoTurmaDirectPage;
