import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ChevronLeft, ChevronRight, BookOpen, Loader2 } from 'lucide-react';
import { CasaBrasao } from '@/components/CasaBrasao';
import { useAuth } from '@/contexts/AuthContext';

const ConteudoAdminPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Buscar institution_id do usuário
  const { data: userProfile } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('institution_id')
        .eq('id', user.id)
        .single();
      return data;
    },
    enabled: !!user?.id
  });

  // Buscar inteligências
  const { data: inteligencias, isLoading: loadingInteligencias } = useQuery({
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

  const institutionId = userProfile?.institution_id;

  // Buscar contagem de conteúdos por inteligência
  const { data: contagemConteudos } = useQuery({
    queryKey: ['conteudo-contagem', institutionId],
    queryFn: async () => {
      if (!institutionId) return {};
      
      const { data, error } = await supabase
        .from('conteudo_inteligencia')
        .select('inteligencia_id, serie')
        .eq('institution_id', institutionId);
      
      if (error) throw error;
      
      // Agrupar por inteligência
      const contagem: Record<number, { total: number; series: Set<number> }> = {};
      data?.forEach(item => {
        if (!contagem[item.inteligencia_id]) {
          contagem[item.inteligencia_id] = { total: 0, series: new Set() };
        }
        contagem[item.inteligencia_id].total++;
        contagem[item.inteligencia_id].series.add(item.serie);
      });
      
      return contagem;
    },
    enabled: !!institutionId
  });

  const formatarContagem = (inteligenciaId: number) => {
    const info = contagemConteudos?.[inteligenciaId];
    if (!info || info.total === 0) {
      return 'Nenhum arquivo';
    }
    const arquivos = info.total === 1 ? '1 arquivo' : `${info.total} arquivos`;
    const series = info.series.size === 1 ? '1 série' : `${info.series.size} séries`;
    return `${arquivos} em ${series}`;
  };

  if (loadingInteligencias) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white/40 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F172A] pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#0F172A]/95 backdrop-blur-lg border-b border-violet-500/5">
        <div className="px-4 py-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/60 hover:bg-white/10 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-400" />
              <h1 className="text-white font-semibold text-lg">Gerenciar Conteúdo</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="p-4 space-y-3">
        <p className="text-white/50 text-sm mb-4">
          Faça upload de PDFs de apoio para cada inteligência, organizados por série e semana.
        </p>

        {inteligencias?.map((inteligencia) => (
          <button
            key={inteligencia.id}
            onClick={() => navigate(`/admin/conteudo/inteligencia/${inteligencia.id}`)}
            className="w-full p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-left flex items-center justify-between group"
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
                <p className="text-white/40 text-xs">
                  {formatarContagem(inteligencia.id)}
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-white/30 group-hover:text-white/50 transition-colors" />
          </button>
        ))}
      </div>
    </div>
  );
};

export default ConteudoAdminPage;
