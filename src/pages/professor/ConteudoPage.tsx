import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, TreePine, BookOpen } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { CasaBrasao } from '@/components/CasaBrasao';
import { Skeleton } from '@/components/ui/skeleton';

const ConteudoPage = () => {
  const navigate = useNavigate();

  const { data: inteligencias, isLoading } = useQuery({
    queryKey: ['inteligencias'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inteligencias')
        .select('id, nome, emoji, cor_hex, brasao_url')
        .order('id');
      
      if (error) throw error;
      return data;
    }
  });

  return (
    <div className="space-y-6 py-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <BookOpen className="w-6 h-6 text-white/70" />
        <h1 className="text-xl font-semibold text-white">Conteúdo</h1>
      </div>

      {/* Card Especial - Conteúdo Geral Arboria */}
      <button 
        onClick={() => navigate('/professor/conteudo/geral')}
        className="w-full p-4 rounded-xl text-left transition-all duration-200
          bg-gradient-to-r from-emerald-500/20 to-emerald-500/10
          border border-emerald-500/30 hover:border-emerald-500/50
          hover:bg-emerald-500/20 active:scale-[0.98]"
      >
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-xl bg-emerald-500/20 
            flex items-center justify-center flex-shrink-0">
            <TreePine className="w-7 h-7 text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold">Conteúdo Geral Arboria</p>
            <p className="text-white/50 text-sm">Filosofia, metodologia, guias</p>
          </div>
          <ChevronRight className="text-emerald-400/50 flex-shrink-0" />
        </div>
      </button>

      {/* Divisor */}
      <div className="border-t border-violet-500/10" />

      {/* Lista de Inteligências */}
      <div className="space-y-2">
        <p className="text-white/40 text-xs uppercase tracking-wider px-1">
          Conteúdo por Inteligência
        </p>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="p-3 rounded-xl bg-white/5 flex items-center gap-3">
                <Skeleton className="w-14 h-14 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {inteligencias?.map((inteligencia) => (
              <button
                key={inteligencia.id}
                onClick={() => navigate(`/professor/conteudo/inteligencia/${inteligencia.id}`)}
                className="w-full p-3 rounded-xl bg-white/5 hover:bg-white/10 
                  text-left transition-all duration-200 flex items-center justify-between
                  active:scale-[0.98]"
              >
                <div className="flex items-center gap-3">
                  <CasaBrasao 
                    brasaoUrl={inteligencia.brasao_url}
                    emoji={inteligencia.emoji}
                    nome={inteligencia.nome}
                    size="medium"
                  />
                  <div>
                    <p className="text-white font-medium">{inteligencia.nome}</p>
                    <p className="text-white/40 text-xs">Ver conteúdo da fase</p>
                  </div>
                </div>
                <ChevronRight className="text-white/30 flex-shrink-0" size={20} />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConteudoPage;
