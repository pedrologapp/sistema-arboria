import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, User, Users, Check, X } from 'lucide-react';
import { useProfessor } from '@/contexts/ProfessorContext';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface Aluno {
  id: string;
  full_name: string | null;
  nome: string | null;
  avatar_url: string | null;
  casa_id: number | null;
}

const CirculoAlunosPage = () => {
  const { serie, turma } = useParams<{ serie: string; turma: string }>();
  const { casaColor, profile, casaMentor } = useProfessor();
  const navigate = useNavigate();

  const serieNumero = parseInt(serie || '6');
  const turmaLetra = turma?.toUpperCase() || 'A';

  // Estados para seleção múltipla
  const [modoSelecao, setModoSelecao] = useState(false);
  const [alunosSelecionados, setAlunosSelecionados] = useState<Aluno[]>([]);

  const { data: alunos, isLoading } = useQuery({
    queryKey: ['circulo-alunos', profile?.institution_id, serieNumero, turmaLetra],
    queryFn: async () => {
      if (!profile?.institution_id) return [];

      // Buscar turma_id correspondente
      const { data: turmaData, error: turmaError } = await supabase
        .from('turmas')
        .select('id')
        .eq('institution_id', profile.institution_id)
        .eq('serie', `${serieNumero}`)
        .eq('turma_letra', turmaLetra)
        .eq('segmento', 'fundamental2')
        .eq('ativo', true)
        .maybeSingle();

      if (turmaError) throw turmaError;
      if (!turmaData) return [];

      // Buscar alunos via aluno_turma (sem filtro por casa_id)
      const { data, error } = await supabase
        .from('aluno_turma')
        .select(`
          aluno_id,
          profiles!inner (
            id,
            full_name,
            nome,
            avatar_url,
            casa_id
          )
        `)
        .eq('turma_id', turmaData.id)
        .eq('ativo', true);

      if (error) throw error;

      return (data || []).map(at => {
        const p = at.profiles as any;
        return {
          id: p.id,
          full_name: p.full_name,
          nome: p.nome,
          avatar_url: p.avatar_url,
          casa_id: p.casa_id,
        } as Aluno;
      }).sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
    },
    enabled: !!profile?.institution_id
  });

  const handleAlunoClick = (aluno: Aluno) => {
    if (modoSelecao) {
      // Toggle seleção
      setAlunosSelecionados(prev =>
        prev.find(a => a.id === aluno.id)
          ? prev.filter(a => a.id !== aluno.id)
          : [...prev, aluno]
      );
    } else {
      // Navegação normal
      navigate(`/professor/circulo/aluno/${aluno.id}?serie=${serieNumero}&turma=${turmaLetra}`);
    }
  };

  const handleCancelarSelecao = () => {
    setModoSelecao(false);
    setAlunosSelecionados([]);
  };

  const handleObservarMultiplos = () => {
    const ids = alunosSelecionados.map(a => a.id).join(',');
    navigate(`/professor/circulo/multiplos?serie=${serieNumero}&turma=${turmaLetra}&ids=${ids}`);
  };

  const getNomesResumo = (alunos: Aluno[]) => {
    const nomes = alunos.map(a => {
      const name = a.full_name || a.nome || 'Aluno';
      return name.split(' ')[0];
    });
    
    if (nomes.length <= 3) return nomes.join(', ');
    return `${nomes.slice(0, 2).join(', ')} e +${nomes.length - 2}`;
  };

  const isAlunoSelecionado = (alunoId: string) => {
    return alunosSelecionados.some(a => a.id === alunoId);
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
    <div className="space-y-6 pt-4 pb-24">
      {/* Header com voltar e botão de seleção */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(`/professor/circulo/serie/${serieNumero}`)}
            className="p-2 -ml-2 rounded-full hover:bg-white/10"
          >
            <ChevronLeft size={24} className="text-white" />
          </button>
          <h1 className="text-xl font-bold text-white">{serieNumero}º Ano {turmaLetra}</h1>
        </div>
        
        {/* Botão Selecionar vários / Cancelar */}
        <button
          onClick={() => modoSelecao ? handleCancelarSelecao() : setModoSelecao(true)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
            modoSelecao 
              ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
              : "bg-white/10 text-white/80 hover:bg-white/20"
          )}
        >
          {modoSelecao ? (
            <>
              <X size={16} />
              Cancelar
            </>
          ) : (
            <>
              <Users size={16} />
              Selecionar
            </>
          )}
        </button>
      </div>

      {/* Texto instrucional quando modo ativo */}
      {modoSelecao && (
        <p className="text-white/60 text-sm text-center -mt-2">
          Toque nos alunos para selecionar
        </p>
      )}

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
          {alunos.map((aluno) => {
            const isSelected = isAlunoSelecionado(aluno.id);
            return (
              <button
                key={aluno.id}
                onClick={() => handleAlunoClick(aluno)}
                className={cn(
                  "flex flex-col items-center gap-2 p-2 rounded-xl transition-all active:scale-95",
                  modoSelecao && "hover:bg-white/10",
                  !modoSelecao && "hover:bg-white/5"
                )}
              >
                <div className="relative">
                  <Avatar 
                    className={cn(
                      "w-[70px] h-[70px] border-2 transition-all",
                      isSelected && "ring-2 ring-blue-500 ring-offset-2 ring-offset-[#1a1a2e]"
                    )} 
                    style={{ borderColor: isSelected ? '#3B82F6' : `${casaColor}50` }}
                  >
                    <AvatarImage src={aluno.avatar_url || undefined} alt={aluno.full_name || 'Aluno'} />
                    <AvatarFallback 
                      className="text-white text-lg font-medium"
                      style={{ backgroundColor: isSelected ? '#3B82F650' : `${casaColor}30` }}
                    >
                      {getInitials(aluno)}
                    </AvatarFallback>
                  </Avatar>
                  
                  {/* Overlay com check quando selecionado */}
                  {isSelected && (
                    <div className="absolute inset-0 bg-blue-500/30 rounded-full flex items-center justify-center">
                      <div className="bg-blue-500 rounded-full p-1">
                        <Check size={20} className="text-white" />
                      </div>
                    </div>
                  )}
                </div>
                <span className={cn(
                  "text-xs text-center truncate w-full",
                  isSelected ? "text-blue-400 font-medium" : "text-white/80"
                )}>
                  {getAbreviatedName(aluno)}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <User size={48} className="mx-auto text-white/30 mb-4" />
          <p className="text-white/50">Nenhum aluno encontrado nesta turma</p>
        </div>
      )}

      {/* Botão flutuante quando há seleção */}
      {alunosSelecionados.length > 0 && (
        <div className="fixed bottom-20 left-4 right-4 z-50">
          <button
            onClick={handleObservarMultiplos}
            className="w-full py-4 rounded-xl flex flex-col items-center gap-1 shadow-lg transition-all active:scale-[0.98]"
            style={{ backgroundColor: casaColor }}
          >
            <div className="flex items-center gap-2 text-white font-semibold">
              <Users size={20} />
              <span>Observar {alunosSelecionados.length} {alunosSelecionados.length === 1 ? 'aluno' : 'alunos'}</span>
            </div>
            <span className="text-sm text-white/80">
              {getNomesResumo(alunosSelecionados)}
            </span>
          </button>
        </div>
      )}
    </div>
  );
};

export default CirculoAlunosPage;
