import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useStudent } from '@/contexts/StudentContext';
import { ArrowLeft, CheckCircle, Circle, Clock, RefreshCw, Eye, Info, ClipboardList } from 'lucide-react';
import { motion } from 'framer-motion';
import { CasaBrasao } from '@/components/CasaBrasao';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Missao {
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
}

interface Fase {
  id: string;
  numero_fase: number;
  inteligencia: {
    id: number;
    nome: string;
    cor_hex: string | null;
  };
}

interface Entrega {
  missao_id: string;
  status: string;
}

const MissoesCasaPage = () => {
  const { faseId, semana, casaId } = useParams<{ faseId: string; semana: string; casaId: string }>();
  const navigate = useNavigate();
  const { profile } = useStudent();

  const [fase, setFase] = useState<Fase | null>(null);
  const [casa, setCasa] = useState<CasaInfo | null>(null);
  const [missoes, setMissoes] = useState<Missao[]>([]);
  const [minhaCasaNome, setMinhaCasaNome] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const semanaNum = parseInt(semana || '1', 10);
  const casaIdNum = parseInt(casaId || '0', 10);
  const ehMinhaCasa = profile?.casa_id === casaIdNum;

  useEffect(() => {
    const fetchData = async () => {
      if (!faseId || !casaId || !profile?.id) return;

      setIsLoading(true);
      setError(null);

      try {
        const { data: faseData, error: faseError } = await supabase
          .from('fases')
          .select(`
            id,
            numero_fase,
            inteligencia:inteligencias!inteligencia_id (
              id,
              nome,
              cor_hex
            )
          `)
          .eq('id', faseId)
          .single();

        if (faseError) throw faseError;
        
        const faseTyped = faseData as unknown as Fase;
        setFase(faseTyped);

        const { data: casaData, error: casaError } = await supabase
          .from('inteligencias')
          .select('id, nome, cor_hex, brasao_url, emoji')
          .eq('id', casaIdNum)
          .single();

        if (casaError) throw casaError;
        setCasa(casaData);

        if (!ehMinhaCasa && profile.casa_id) {
          const { data: minhaCasaData } = await supabase
            .from('inteligencias')
            .select('nome')
            .eq('id', profile.casa_id)
            .single();

          if (minhaCasaData) {
            setMinhaCasaNome(minhaCasaData.nome);
          }
        }

        // Filtrar por série do aluno + data_liberacao
        const serieNum = profile?.serie ? parseInt(profile.serie) : null;
        const agora = new Date().toISOString();

        let missaoQuery = supabase
          .from('missoes')
          .select('id, titulo, descricao, pontos_base')
          .eq('fase_id', faseId)
          .eq('semana', semanaNum)
          .eq('tipo_missao', 'individual')
          .eq('casa_id', casaIdNum)
          .eq('status', 'liberada')
          .lte('data_liberacao', agora)
          .order('pontos_base', { ascending: true });
        if (serieNum) missaoQuery = missaoQuery.eq('serie_filtro', serieNum);

        const { data: missoesData, error: missoesError } = await missaoQuery;

        if (missoesError) throw missoesError;

        let entregasMap: Record<string, Entrega> = {};
        if (ehMinhaCasa && missoesData && missoesData.length > 0) {
          const missaoIds = missoesData.map(m => m.id);
          
          const { data: entregasData } = await supabase
            .from('entregas')
            .select('missao_id, status')
            .eq('aluno_id', profile.id)
            .in('missao_id', missaoIds)
            .order('created_at', { ascending: false });

          if (entregasData) {
            entregasData.forEach(e => {
              if (!entregasMap[e.missao_id]) {
                entregasMap[e.missao_id] = e;
              }
            });
          }
        }

        const missoesComStatus: Missao[] = (missoesData || []).map(m => {
          let status: Missao['status'] = 'disponivel';
          
          if (ehMinhaCasa) {
            const entrega = entregasMap[m.id];
            if (entrega) {
              if (entrega.status === 'aprovada') status = 'aprovada';
              else if (entrega.status === 'refazer') status = 'refazer';
              else status = 'enviada';
            }
          }

          return {
            ...m,
            status,
          };
        });

        setMissoes(missoesComStatus);
      } catch (err) {
        console.error('Erro ao carregar missões da casa:', err);
        setError('Não foi possível carregar as missões.');
        toast.error('Erro ao carregar missões');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [faseId, semanaNum, casaIdNum, profile?.id, profile?.casa_id, ehMinhaCasa]);

  const handleMissaoClick = (missaoId: string) => {
    navigate(`/aluno/missoes/${missaoId}`);
  };

  const handleVoltar = () => {
    navigate(`/aluno/missoes/fase/${faseId}/semana/${semana}`);
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
        return <Circle className="w-4 h-4 text-[#3B82F6]" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'aprovada': return 'Aprovada';
      case 'enviada': return 'Aguardando';
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
      <div className="min-h-screen bg-[#1A1A2E] px-5 py-6">
        <div className="h-5 w-40 bg-[#252547] rounded animate-pulse mb-8" />
        <div className="flex items-center gap-4 mb-6">
          <div className="w-10 h-10 bg-[#252547] rounded-full animate-pulse" />
          <div className="space-y-2">
            <div className="h-4 w-32 bg-[#252547] rounded animate-pulse" />
            <div className="h-3 w-40 bg-[#252547] rounded animate-pulse" />
          </div>
        </div>
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 bg-[#252547] rounded-xl animate-pulse mb-3" />
        ))}
      </div>
    );
  }

  if (error || !fase || !casa) {
    return (
      <div className="min-h-screen bg-[#1A1A2E] flex items-center justify-center p-5">
        <div className="text-center">
          <p className="text-[#64748B] text-sm mb-4">{error || 'Dados não encontrados'}</p>
          <Button variant="outline" onClick={handleVoltar} className="border-[#334155]">
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  const corCasa = casa.cor_hex || '#8b5cf6';

  return (
    <div className="min-h-screen bg-[#1A1A2E] px-5 py-6 pb-24">
      {/* Back button */}
      <button
        onClick={handleVoltar}
        className="flex items-center gap-2 text-white/50 hover:text-white transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm">Voltar</span>
      </button>

      {/* Banner for other house */}
      {!ehMinhaCasa && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 mb-5"
        >
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-white/50">
              <span className="text-blue-400">Você é da Casa {minhaCasaNome}.</span> Estas missões são apenas para visualização.
            </p>
          </div>
        </motion.div>
      )}

      {/* House header — estilo pergaminho */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-3 mb-6 text-center"
      >
        <div className={ehMinhaCasa ? '' : 'opacity-50'}>
          <CasaBrasao brasaoUrl={casa.brasao_url} emoji={casa.emoji} nome={casa.nome} size="medium" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-white">
            Casa {casa.nome}
          </h1>
          <p className="text-xs text-white/40 mt-0.5">
            Missões individuais · Semana {semanaNum}
          </p>
        </div>
      </motion.div>

      {/* Missions list */}
      {missoes.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
          <ClipboardList className="w-10 h-10 text-white/10 mx-auto mb-3" />
          <p className="text-white/30 text-sm">Nenhuma missão nesta semana</p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {missoes.map((missao, index) => (
            <motion.button
              key={missao.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              onClick={() => handleMissaoClick(missao.id)}
              className={cn(
                'w-full p-4 rounded-xl text-left transition-all border',
                ehMinhaCasa
                  ? 'hover:bg-white/[0.04] active:scale-[0.98]'
                  : 'opacity-60'
              )}
              style={{
                borderColor: `${corCasa}20`,
                background: `linear-gradient(135deg, ${corCasa}08, #252547)`,
              }}
            >
              <div className="flex items-center gap-3">
                {/* Status icon */}
                <div className="flex-shrink-0">
                  {ehMinhaCasa ? renderStatusIcon(missao.status) : <Eye className="w-4 h-4 text-white/20" />}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-white">{missao.titulo}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-semibold" style={{ color: corCasa }}>+{missao.pontos_base} pts</span>
                    {ehMinhaCasa && (
                      <>
                        <span className="text-white/15">·</span>
                        <span className={cn('text-xs', getStatusColor(missao.status))}>{getStatusLabel(missao.status)}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
};

export default MissoesCasaPage;
