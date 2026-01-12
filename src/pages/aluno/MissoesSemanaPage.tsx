import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useStudent } from '@/contexts/StudentContext';
import { ArrowLeft, ClipboardList, Home, CheckCircle, Circle, Clock, RefreshCw, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { CasaBrasao } from '@/components/CasaBrasao';
import { Badge } from '@/components/ui/badge';
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

const statusLabels: Record<string, string> = {
  'disponivel': 'Disponível',
  'enviada': 'Enviada',
  'aprovada': 'Aprovada',
  'refazer': 'Refazer'
};

const statusColors: Record<string, string> = {
  'disponivel': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  'enviada': 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  'aprovada': 'bg-green-500/20 text-green-300 border-green-500/30',
  'refazer': 'bg-orange-500/20 text-orange-300 border-orange-500/30'
};

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

        // 1. Buscar dados da fase
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

        // 2. Buscar missões GERAIS da semana
        const { data: geraisData, error: geraisError } = await supabase
          .from('missoes')
          .select('id, titulo, descricao, pontos_base')
          .eq('fase_id', faseId)
          .eq('semana', semanaNum)
          .eq('tipo_missao', 'geral')
          .eq('status', 'liberada');

        if (geraisError) throw geraisError;

        // 3. Buscar missões INDIVIDUAIS
        const { data: individuaisData, error: individuaisError } = await supabase
          .from('missoes')
          .select('id, titulo, casa_id')
          .eq('fase_id', faseId)
          .eq('semana', semanaNum)
          .eq('tipo_missao', 'individual')
          .eq('status', 'liberada');

        if (individuaisError) throw individuaisError;

        // 4. Buscar entregas do aluno
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

        // 5. Buscar todas as inteligências
        const { data: inteligenciasData, error: inteligenciasError } = await supabase
          .from('inteligencias')
          .select('id, nome, cor_hex, brasao_url, emoji')
          .order('id');

        if (inteligenciasError) throw inteligenciasError;

        // Processar status das missões gerais
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

        // Processar casas com contagem de missões
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

        // Ordenar: minha casa primeiro
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

  const corFase = fase?.inteligencia?.cor_hex || '#6366F1';

  const handleMissaoClick = (missaoId: string) => {
    navigate(`/aluno/missoes/${missaoId}`);
  };

  const handleCasaClick = (casaId: number) => {
    navigate(`/aluno/missoes/fase/${faseId}/semana/${semana}/casa/${casaId}`);
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
        return <Circle className="w-5 h-5 text-white/40" />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0D1117] text-white pb-24">
        <div className="px-4 py-4">
          <div className="h-6 w-32 bg-white/10 rounded animate-pulse mb-6" />
          <div className="flex flex-col items-center gap-3 mb-6">
            <div className="w-16 h-16 bg-white/10 rounded-full animate-pulse" />
            <div className="h-6 w-48 bg-white/10 rounded animate-pulse" />
          </div>
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-20 bg-white/5 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !fase) {
    return (
      <div className="min-h-screen bg-[#0D1117] text-white flex flex-col items-center justify-center p-4">
        <p className="text-white/60 mb-4">{error || 'Fase não encontrada'}</p>
        <button
          onClick={() => navigate(`/aluno/missoes/fase/${faseId}`)}
          className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
        >
          Voltar
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D1117] text-white pb-24">
      {/* Header */}
      <div className="px-4 py-4">
        <button
          onClick={() => navigate(`/aluno/missoes/fase/${faseId}`)}
          className="flex items-center gap-2 text-white/70 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Semana {semanaNum}</span>
        </button>

        {/* Brasão e Info da Fase */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div style={{ filter: `drop-shadow(0 0 12px ${corFase}60)` }}>
            <CasaBrasao
              brasaoUrl={fase.inteligencia.brasao_url}
              emoji={fase.inteligencia.emoji}
              nome={fase.inteligencia.nome}
              size="large"
            />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold" style={{ color: corFase }}>
              Fase {fase.inteligencia.nome}
            </h1>
            <p className="text-white/60">Missões da Semana {semanaNum}</p>
          </div>
        </div>

        {/* Seção GERAL */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${corFase}20` }}
            >
              <ClipboardList className="w-5 h-5" style={{ color: corFase }} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">GERAL</h2>
              <p className="text-sm text-white/50">Todos os alunos fazem</p>
            </div>
          </div>

          {missoesGerais.length === 0 ? (
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 text-center">
              <p className="text-white/50">Nenhuma missão geral nesta semana</p>
            </div>
          ) : (
            <div className="space-y-3">
              {missoesGerais.map((missao, index) => (
                <motion.button
                  key={missao.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleMissaoClick(missao.id)}
                  className="w-full p-4 rounded-xl bg-white/[0.03] border border-white/10 
                             hover:bg-white/[0.08] transition-all text-left"
                >
                  <div className="flex items-start gap-3">
                    {renderStatusIcon(missao.status)}
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-white block">{missao.titulo}</span>
                      {missao.descricao && (
                        <p className="text-sm text-white/60 line-clamp-1 mt-0.5">{missao.descricao}</p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <Badge className={statusColors[missao.status]}>
                        {statusLabels[missao.status]}
                      </Badge>
                      <p className="text-sm text-white/50 mt-1">+{missao.pontos_base} pts</p>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </div>

        {/* Separador */}
        <div className="h-px bg-white/10 mb-8" />

        {/* Seção INDIVIDUAL */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${corFase}20` }}
            >
              <Home className="w-5 h-5" style={{ color: corFase }} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">INDIVIDUAL (por casa)</h2>
              <p className="text-sm text-white/50">Cada casa tem missões específicas</p>
            </div>
          </div>

          <div className="space-y-3">
            {casasInfo.map((casa, index) => (
              <motion.button
                key={casa.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: (missoesGerais.length + index) * 0.05 }}
                onClick={() => handleCasaClick(casa.id)}
                className={`w-full p-4 rounded-xl transition-all text-left ${
                  casa.ehMinhaCasa
                    ? 'border-2 hover:scale-[1.02]'
                    : 'bg-white/[0.03] border border-white/10 hover:bg-white/[0.08]'
                }`}
                style={casa.ehMinhaCasa ? {
                  background: `linear-gradient(135deg, ${casa.cor_hex}25 0%, ${casa.cor_hex}10 100%)`,
                  borderColor: casa.cor_hex,
                  boxShadow: `0 0 20px ${casa.cor_hex}20`
                } : undefined}
              >
                <div className="flex items-center gap-4">
                  <div className={casa.ehMinhaCasa ? '' : 'opacity-50'}>
                    <CasaBrasao
                      brasaoUrl={casa.brasao_url}
                      emoji={casa.emoji}
                      nome={casa.nome}
                      size="medium"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-semibold ${casa.ehMinhaCasa ? 'text-white' : 'text-white/70'}`}>
                        {casa.nome}
                      </span>
                      {casa.ehMinhaCasa && (
                        <Badge 
                          className="text-xs"
                          style={{ backgroundColor: casa.cor_hex, color: 'white' }}
                        >
                          sua casa
                        </Badge>
                      )}
                    </div>
                    <p className={`text-sm ${casa.ehMinhaCasa ? 'text-white/70' : 'text-white/50'}`}>
                      {casa.totalMissoes === 0 
                        ? 'Nenhuma missão nesta semana'
                        : `${casa.totalMissoes} ${casa.totalMissoes === 1 ? 'missão' : 'missões'} disponíveis`
                      }
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold ${
                      casa.ehMinhaCasa 
                        ? casa.concluidas === casa.totalMissoes && casa.totalMissoes > 0
                          ? 'text-green-400'
                          : 'text-white'
                        : 'text-white/40'
                    }`}>
                      {casa.concluidas}/{casa.totalMissoes}
                    </span>
                    <ChevronRight 
                      className="w-5 h-5" 
                      style={{ color: casa.ehMinhaCasa ? casa.cor_hex : 'rgba(255,255,255,0.3)' }}
                    />
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MissoesSemanaPage;
