import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useStudent } from '@/contexts/StudentContext';
import { ArrowLeft, ClipboardList, Home, CheckCircle, Circle, Clock, RefreshCw, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { CasaBrasao } from '@/components/CasaBrasao';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface MissaoGeral {
  id: string;
  titulo: string;
  descricao: string | null;
  pontos_base: number;
  status: 'disponivel' | 'enviada' | 'aprovada' | 'refazer';
}

interface CasaInfo {
  id: number;
  nome: string;
  cor_hex: string | null;
  brasao_url: string | null;
  emoji: string | null;
  ehMinhaCasa: boolean;
  totalMissoes: number;
  concluidas: number;
}

interface Fase {
  id: string;
  numero_fase: number;
  inteligencia: {
    id: number;
    nome: string;
    cor_hex: string | null;
    brasao_url: string | null;
    emoji: string | null;
  };
}

interface Entrega {
  missao_id: string;
  status: string;
}

const MissoesSemanaPage = () => {
  const { faseId, semana } = useParams<{ faseId: string; semana: string }>();
  const navigate = useNavigate();
  const { profile } = useStudent();
  
  const [fase, setFase] = useState<Fase | null>(null);
  const [missoesGerais, setMissoesGerais] = useState<MissaoGeral[]>([]);
  const [casasInfo, setCasasInfo] = useState<CasaInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const semanaNum = parseInt(semana || '1', 10);

  useEffect(() => {
    const fetchData = async () => {
      if (!faseId || !profile?.id) return;

      try {
        setIsLoading(true);
        setError(null);

        const { data: faseData, error: faseError } = await supabase
          .from('fases')
          .select(`
            id, numero_fase,
            inteligencia:inteligencias!inteligencia_id (id, nome, cor_hex, brasao_url, emoji)
          `)
          .eq('id', faseId)
          .single();

        if (faseError) throw faseError;
        if (!faseData) {
          setError('Fase não encontrada');
          return;
        }

        const faseFormatted: Fase = {
          id: faseData.id,
          numero_fase: faseData.numero_fase,
          inteligencia: Array.isArray(faseData.inteligencia) 
            ? faseData.inteligencia[0] 
            : faseData.inteligencia
        };
        setFase(faseFormatted);

        const { data: geraisData, error: geraisError } = await supabase
          .from('missoes')
          .select('id, titulo, descricao, pontos_base')
          .eq('fase_id', faseId)
          .eq('semana', semanaNum)
          .eq('tipo_missao', 'geral')
          .eq('status', 'liberada');

        if (geraisError) throw geraisError;

        const { data: individuaisData, error: individuaisError } = await supabase
          .from('missoes')
          .select('id, titulo, casa_id')
          .eq('fase_id', faseId)
          .eq('semana', semanaNum)
          .eq('tipo_missao', 'individual')
          .eq('status', 'liberada');

        if (individuaisError) throw individuaisError;

        const allMissaoIds = [
          ...(geraisData || []).map(m => m.id),
          ...(individuaisData || []).map(m => m.id)
        ];

        let entregas: Entrega[] = [];
        if (allMissaoIds.length > 0) {
          const { data: entregasData, error: entregasError } = await supabase
            .from('entregas')
            .select('missao_id, status')
            .eq('aluno_id', profile.id)
            .in('missao_id', allMissaoIds)
            .order('created_at', { ascending: false });

          if (entregasError) throw entregasError;
          entregas = entregasData || [];
        }

        const { data: inteligenciasData, error: inteligenciasError } = await supabase
          .from('inteligencias')
          .select('id, nome, cor_hex, brasao_url, emoji')
          .order('id');

        if (inteligenciasError) throw inteligenciasError;

        const getStatusMissao = (missaoId: string): 'disponivel' | 'enviada' | 'aprovada' | 'refazer' => {
          const entrega = entregas.find(e => e.missao_id === missaoId);
          if (!entrega) return 'disponivel';
          if (entrega.status === 'aprovada') return 'aprovada';
          if (entrega.status === 'refazer') return 'refazer';
          return 'enviada';
        };

        const missoesGeraisProcessadas: MissaoGeral[] = (geraisData || []).map(m => ({
          id: m.id,
          titulo: m.titulo,
          descricao: m.descricao,
          pontos_base: m.pontos_base,
          status: getStatusMissao(m.id)
        }));
        setMissoesGerais(missoesGeraisProcessadas);

        const casasProcessadas: CasaInfo[] = (inteligenciasData || []).map(intel => {
          const missoesDaCasa = (individuaisData || []).filter(m => m.casa_id === intel.id);
          const concluidas = missoesDaCasa.filter(m => getStatusMissao(m.id) === 'aprovada').length;

          return {
            id: intel.id,
            nome: intel.nome,
            cor_hex: intel.cor_hex,
            brasao_url: intel.brasao_url,
            emoji: intel.emoji,
            ehMinhaCasa: intel.id === profile.casa_id,
            totalMissoes: missoesDaCasa.length,
            concluidas
          };
        });

        const casasOrdenadas = [
          ...casasProcessadas.filter(c => c.ehMinhaCasa),
          ...casasProcessadas.filter(c => !c.ehMinhaCasa)
        ];
        setCasasInfo(casasOrdenadas);

      } catch (err) {
        console.error('Erro ao carregar dados:', err);
        setError('Erro ao carregar missões da semana');
        toast.error('Erro ao carregar dados');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [faseId, semanaNum, profile?.id, profile?.casa_id]);

  const handleMissaoClick = (missaoId: string) => {
    navigate(`/aluno/missoes/${missaoId}`);
  };

  const handleCasaClick = (casaId: number) => {
    navigate(`/aluno/missoes/fase/${faseId}/semana/${semana}/casa/${casaId}`);
  };

  const renderStatusIcon = (status: string) => {
    switch (status) {
      case 'aprovada':
        return <CheckCircle className="w-4 h-4 text-[#22C55E]" />;
      case 'enviada':
        return <Clock className="w-4 h-4 text-[#F59E0B]" />;
      case 'refazer':
        return <RefreshCw className="w-4 h-4 text-[#F97316]" />;
      default:
        return <Circle className="w-4 h-4 text-[#64748B]" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'aprovada': return 'Aprovada';
      case 'enviada': return 'Enviada';
      case 'refazer': return 'Refazer';
      default: return 'Disponível';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aprovada': return 'text-[#22C55E]';
      case 'enviada': return 'text-[#F59E0B]';
      case 'refazer': return 'text-[#F97316]';
      default: return 'text-[#3B82F6]';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0F172A] px-5 py-6">
        <div className="h-5 w-24 bg-[#252547] rounded animate-pulse mb-8" />
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-[#252547] rounded-full animate-pulse" />
          <div className="h-5 w-40 bg-[#252547] rounded animate-pulse" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-16 bg-[#252547] rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !fase) {
    return (
      <div className="min-h-screen bg-[#1A1A2E] flex flex-col items-center justify-center p-5">
        <p className="text-[#64748B] text-sm mb-4">{error || 'Fase não encontrada'}</p>
        <button
          onClick={() => navigate(`/aluno/missoes/fase/${faseId}`)}
          className="px-4 py-2 bg-[#252547] rounded-lg hover:bg-[#283548] text-sm text-white transition-colors"
        >
          Voltar
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1A1A2E] px-5 py-6 pb-24">
      {/* Back button */}
      <button
        onClick={() => navigate(`/aluno/missoes/fase/${faseId}`)}
        className="flex items-center gap-2 text-[#94A3B8] hover:text-white transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm">Semana {semanaNum}</span>
      </button>

      {/* Centered header */}
      <div className="flex flex-col items-center gap-3 mb-8">
        <CasaBrasao
          brasaoUrl={fase.inteligencia.brasao_url}
          emoji={fase.inteligencia.emoji}
          nome={fase.inteligencia.nome}
          size="medium"
        />
        <div className="text-center">
          <h1 className="text-xl font-semibold text-white tracking-tight">
            Fase {fase.inteligencia.nome}
          </h1>
          <p className="text-sm text-[#94A3B8]">Missões da Semana {semanaNum}</p>
        </div>
      </div>

      {/* GERAL Section */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <ClipboardList className="w-4 h-4 text-[#94A3B8]" />
          <span className="text-xs font-medium text-[#9CA3AF] uppercase tracking-widest">
            Geral
          </span>
          <span className="text-xs text-[#64748B]">· Todos os alunos fazem</span>
        </div>

        {missoesGerais.length === 0 ? (
          <div className="py-4 px-4 rounded-xl bg-[#252547] text-center">
            <p className="text-[#64748B] text-sm">Nenhuma missão geral nesta semana</p>
          </div>
        ) : (
          <div className="space-y-3">
            {missoesGerais.map((missao, index) => {
              // Badge de notificação: disponível ou refazer
              const precisaBadge = missao.status === 'disponivel' || missao.status === 'refazer';
              
              return (
                <motion.button
                  key={missao.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => handleMissaoClick(missao.id)}
                  className="w-full py-4 px-4 rounded-xl bg-[#252547] hover:bg-[#283548] transition-all text-left relative"
                >
                  {/* Badge de pendente */}
                  {precisaBadge && (
                    <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  )}
                  
                  <div className="flex items-center gap-3">
                    {renderStatusIcon(missao.status)}
                    
                    <div className="flex-1 min-w-0">
                      <span className="text-[15px] font-medium text-white block">{missao.titulo}</span>
                      {missao.descricao && (
                        <p className="text-[13px] text-[#94A3B8] line-clamp-1 mt-0.5">{missao.descricao}</p>
                      )}
                    </div>
                    
                    <div className="text-right flex-shrink-0 pr-3">
                      <span className={cn('text-xs', getStatusColor(missao.status))}>
                        {getStatusLabel(missao.status)}
                      </span>
                      <p className="text-xs text-[#64748B] mt-0.5">+{missao.pontos_base} pts</p>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>

      {/* Separator */}
      <div className="h-px bg-[#334155] mb-8" />

      {/* INDIVIDUAL Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Home className="w-4 h-4 text-[#94A3B8]" />
          <span className="text-xs font-medium text-[#9CA3AF] uppercase tracking-widest">
            Individual
          </span>
          <span className="text-xs text-[#64748B]">· Por casa</span>
        </div>

        <div className="space-y-3">
          {casasInfo.map((casa, index) => (
            <motion.button
              key={casa.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: (missoesGerais.length + index) * 0.03 }}
              onClick={() => handleCasaClick(casa.id)}
              className={cn(
                'w-full py-4 px-4 rounded-xl transition-all text-left',
                casa.ehMinhaCasa
                  ? 'bg-[#252547] border border-[#3B82F6]/40 hover:bg-[#283548]'
                  : 'bg-[#252547] hover:bg-[#283548]'
              )}
            >
              <div className="flex items-center gap-4">
                <div className={casa.ehMinhaCasa ? '' : 'opacity-50'}>
                  <CasaBrasao
                    brasaoUrl={casa.brasao_url}
                    emoji={casa.emoji}
                    nome={casa.nome}
                    size="mini"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'text-[15px] font-medium',
                      casa.ehMinhaCasa ? 'text-white' : 'text-[#94A3B8]'
                    )}>
                      {casa.nome}
                    </span>
                    {casa.ehMinhaCasa && (
                      <span className="text-xs text-[#3B82F6]">sua casa</span>
                    )}
                  </div>
                  <p className={cn(
                    'text-[13px]',
                    casa.ehMinhaCasa ? 'text-[#94A3B8]' : 'text-[#64748B]'
                  )}>
                    {casa.totalMissoes === 0 
                      ? 'Nenhuma missão nesta semana'
                      : `${casa.totalMissoes} ${casa.totalMissoes === 1 ? 'missão' : 'missões'} disponíveis`
                    }
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'text-sm font-medium',
                    casa.ehMinhaCasa 
                      ? casa.concluidas === casa.totalMissoes && casa.totalMissoes > 0
                        ? 'text-[#22C55E]'
                        : 'text-white'
                      : 'text-[#64748B]'
                  )}>
                    {casa.concluidas}/{casa.totalMissoes}
                  </span>
                  <ChevronRight className={cn(
                    'w-4 h-4',
                    casa.ehMinhaCasa ? 'text-[#3B82F6]' : 'text-[#475569]'
                  )} />
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MissoesSemanaPage;
