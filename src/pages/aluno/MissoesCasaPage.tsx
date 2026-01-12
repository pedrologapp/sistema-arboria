import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useStudent } from '@/contexts/StudentContext';
import { ArrowLeft, CheckCircle, Circle, Clock, RefreshCw, Eye, Info, ClipboardList } from 'lucide-react';
import { motion } from 'framer-motion';
import { CasaBrasao } from '@/components/CasaBrasao';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
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

const statusLabels: Record<string, string> = {
  disponivel: 'Disponível',
  enviada: 'Aguardando avaliação',
  aprovada: 'Aprovada',
  refazer: 'Refazer',
};

const statusColors: Record<string, string> = {
  disponivel: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  enviada: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  aprovada: 'bg-green-500/20 text-green-300 border-green-500/30',
  refazer: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
};

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
        // Fetch phase data
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

        // Fetch selected house data
        const { data: casaData, error: casaError } = await supabase
          .from('inteligencias')
          .select('id, nome, cor_hex, brasao_url, emoji')
          .eq('id', casaIdNum)
          .single();

        if (casaError) throw casaError;
        setCasa(casaData);

        // Fetch student's house name if viewing another house
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

        // Fetch individual missions for this house in this week
        const { data: missoesData, error: missoesError } = await supabase
          .from('missoes')
          .select('id, titulo, descricao, pontos_base')
          .eq('fase_id', faseId)
          .eq('semana', semanaNum)
          .eq('tipo_missao', 'individual')
          .eq('casa_id', casaIdNum)
          .eq('status', 'liberada')
          .order('pontos_base', { ascending: true });

        if (missoesError) throw missoesError;

        // If it's the student's house, fetch their submissions
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
            // Get the most recent submission for each mission
            entregasData.forEach(e => {
              if (!entregasMap[e.missao_id]) {
                entregasMap[e.missao_id] = e;
              }
            });
          }
        }

        // Map missions with status
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
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'enviada':
        return <Clock className="w-5 h-5 text-amber-400" />;
      case 'refazer':
        return <RefreshCw className="w-5 h-5 text-orange-400" />;
      default:
        return <Circle className="w-5 h-5 text-blue-400" />;
    }
  };

  const corCasa = casa?.cor_hex || '#6366F1';

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0D1117] text-white pb-24">
        <div className="sticky top-0 z-10 bg-[#0D1117]/95 backdrop-blur-sm border-b border-white/10">
          <div className="px-4 py-3 flex items-center gap-3">
            <Skeleton className="w-8 h-8 rounded-full" />
            <Skeleton className="h-5 w-40" />
          </div>
        </div>
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-4 mb-6">
            <Skeleton className="w-16 h-16 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !fase || !casa) {
    return (
      <div className="min-h-screen bg-[#0D1117] text-white pb-24 flex items-center justify-center">
        <div className="text-center p-6">
          <p className="text-white/60 mb-4">{error || 'Dados não encontrados'}</p>
          <Button variant="outline" onClick={handleVoltar}>
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D1117] text-white pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0D1117]/95 backdrop-blur-sm border-b border-white/10">
        <div className="px-4 py-3 flex items-center gap-3">
          <button
            onClick={handleVoltar}
            className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-white/60">Individual -</span>
            <span className="font-medium" style={{ color: corCasa }}>
              {casa.nome}
            </span>
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* Banner for other house */}
        {!ehMinhaCasa && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 mb-6"
          >
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-blue-300">
                  Você é da Casa {minhaCasaNome}
                </p>
                <p className="text-sm text-blue-300/70 mt-1">
                  Você pode visualizar as missões da Casa {casa.nome}, mas não pode realizá-las.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* House header with shield */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-6"
        >
          <div
            className="relative"
            style={{
              opacity: ehMinhaCasa ? 1 : 0.5,
            }}
          >
            <CasaBrasao
              brasaoUrl={casa.brasao_url}
              emoji={casa.emoji}
              nome={casa.nome}
              size="large"
              className={ehMinhaCasa ? 'drop-shadow-[0_0_12px_rgba(255,255,255,0.3)]' : ''}
            />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">
              MISSÕES INDIVIDUAIS
            </h1>
            <p className="text-sm text-white/60">
              Casa {casa.nome} - Semana {semanaNum}
            </p>
            {!ehMinhaCasa && (
              <p className="text-xs text-white/40 mt-1">(modo visualização)</p>
            )}
          </div>
        </motion.div>

        {/* Missions list */}
        {missoes.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <ClipboardList className="w-12 h-12 text-white/20 mx-auto mb-3" />
            <p className="text-white/40">Nenhuma missão desta casa nesta semana</p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {missoes.map((missao, index) => (
              <motion.div
                key={missao.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleMissaoClick(missao.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  ehMinhaCasa
                    ? missao.status === 'aprovada'
                      ? 'bg-green-500/5 border-green-500/20 hover:border-green-500/40'
                      : missao.status === 'refazer'
                      ? 'bg-orange-500/5 border-orange-500/20 hover:border-orange-500/40'
                      : 'bg-white/[0.03] border-white/10 hover:border-white/20 hover:bg-white/[0.05]'
                    : 'bg-white/[0.02] border-white/5'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className="mt-0.5">
                    {ehMinhaCasa ? (
                      renderStatusIcon(missao.status)
                    ) : (
                      <Eye className="w-5 h-5 text-white/30" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3
                      className={`font-medium mb-1 ${
                        ehMinhaCasa ? 'text-white' : 'text-white/50'
                      }`}
                    >
                      {missao.titulo}
                    </h3>
                    {missao.descricao && (
                      <p
                        className={`text-sm line-clamp-2 mb-2 ${
                          ehMinhaCasa ? 'text-white/60' : 'text-white/30'
                        }`}
                      >
                        {missao.descricao}
                      </p>
                    )}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-sm font-medium ${
                          ehMinhaCasa ? '' : 'text-white/40'
                        }`}
                        style={{ color: ehMinhaCasa ? corCasa : undefined }}
                      >
                        +{missao.pontos_base} pts
                      </span>
                      {ehMinhaCasa && (
                        <Badge
                          variant="outline"
                          className={`text-xs ${statusColors[missao.status]}`}
                        >
                          {statusLabels[missao.status]}
                        </Badge>
                      )}
                      {!ehMinhaCasa && (
                        <span className="text-xs text-white/30">
                          (somente visualização)
                        </span>
                      )}
                    </div>

                    {/* Action button for own house */}
                    {ehMinhaCasa && (missao.status === 'disponivel' || missao.status === 'refazer') && (
                      <Button
                        size="sm"
                        className="mt-3 w-full"
                        style={{
                          background: `linear-gradient(135deg, ${corCasa}, ${corCasa}dd)`,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMissaoClick(missao.id);
                        }}
                      >
                        {missao.status === 'refazer' ? '🔄 Refazer missão' : '📝 Fazer missão'}
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MissoesCasaPage;
