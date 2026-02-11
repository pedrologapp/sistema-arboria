import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ChevronRight, AlertCircle, CalendarDays, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { CasaBrasao } from '@/components/CasaBrasao';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import CalendarioFasesModal, { FaseComDatas } from '@/components/professor/CalendarioFasesModal';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  formatarDataBrasil,
  inicioDoDiaBrasil,
  calcularSemanaAtual,
  parseDataLocal,
} from '@/utils/timezone';

type FaseStatus = 'nao_configurada' | 'bloqueada' | 'proxima' | 'em_andamento' | 'concluida';
type Segmento = 'infantil' | 'fundamental1' | 'fundamental2';

interface Inteligencia {
  id: number;
  nome: string;
  codigo: string;
  cor_hex: string | null;
  emoji: string | null;
  brasao_url: string | null;
}

interface FaseDB {
  id: string;
  numero_fase: number;
  data_inicio: string;
  data_fim: string;
  ativo: boolean | null;
  semana_atual: number | null;
  inteligencia_id: number;
  segmento: string;
  serie: number | null;
}

interface FaseComStatus {
  id: string;
  inteligenciaId: number;
  numero_fase: number;
  data_inicio: string | null;
  data_fim: string | null;
  ativo: boolean | null;
  semana_atual: number | null;
  inteligencia: Inteligencia;
  status: FaseStatus;
  missoesCount: number;
  configurada: boolean;
  segmento: Segmento;
  serie: number | null;
}

const TOTAL_MISSOES_ESPERADO = 36;

const SERIES_POR_SEGMENTO: Record<Segmento, { numero: number; label: string }[]> = {
  infantil: [
    { numero: 2, label: 'Maternal II' },
    { numero: 3, label: 'Maternal III' },
    { numero: 4, label: 'Grupo IV' },
    { numero: 5, label: 'Grupo V' },
  ],
  fundamental1: [
    { numero: 1, label: '1º ANO' },
    { numero: 2, label: '2º ANO' },
    { numero: 3, label: '3º ANO' },
    { numero: 4, label: '4º ANO' },
    { numero: 5, label: '5º ANO' },
  ],
  fundamental2: [
    { numero: 6, label: '6º ANO' },
    { numero: 7, label: '7º ANO' },
    { numero: 8, label: '8º ANO' },
    { numero: 9, label: '9º ANO' },
  ],
};

const statusConfig: Record<FaseStatus, { 
  label: string; 
  text: string; 
  bg: string; 
  border: string;
  badgeBg: string;
}> = {
  nao_configurada: {
    label: 'Não configurada',
    text: 'text-gray-500',
    bg: 'bg-white/5',
    border: 'border-white/10',
    badgeBg: 'bg-gray-500/10',
  },
  bloqueada: {
    label: 'Bloqueada',
    text: 'text-gray-500',
    bg: 'bg-white/5',
    border: 'border-white/10',
    badgeBg: 'bg-gray-500/10',
  },
  proxima: {
    label: 'Próxima',
    text: 'text-amber-500',
    bg: 'bg-white/5',
    border: 'border-white/10',
    badgeBg: 'bg-amber-500/10',
  },
  em_andamento: {
    label: 'Em andamento',
    text: 'text-green-500',
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
    badgeBg: 'bg-green-500/15',
  },
  concluida: {
    label: 'Concluída',
    text: 'text-blue-500',
    bg: 'bg-blue-500/10',
    border: 'border-white/10',
    badgeBg: 'bg-blue-500/10',
  },
};

const segmentoLabels: Record<Segmento, string> = {
  infantil: 'Infantil',
  fundamental1: 'Fund. 1',
  fundamental2: 'Fund. 2',
};

const FasesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [anoLetivo, setAnoLetivo] = useState(new Date().getFullYear());
  const [segmentoAtivo, setSegmentoAtivo] = useState<Segmento>('fundamental2');
  const [serieSelecionada, setSerieSelecionada] = useState<number | null>(null);
  const [showCalendario, setShowCalendario] = useState(false);

  // Buscar institution_id do admin
  const { data: profile } = useQuery({
    queryKey: ['admin-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('institution_id')
        .eq('id', user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Buscar TODAS as 8 inteligências (fixas)
  const { data: inteligencias, isLoading: isLoadingInteligencias } = useQuery({
    queryKey: ['inteligencias'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inteligencias')
        .select('id, nome, codigo, cor_hex, emoji, brasao_url')
        .order('id');
      if (error) throw error;
      return data as Inteligencia[];
    },
  });

  // Buscar fases configuradas do ano (TODOS os segmentos)
  const { data: fases, isLoading: isLoadingFases } = useQuery({
    queryKey: ['fases-admin', profile?.institution_id, anoLetivo],
    queryFn: async () => {
      if (!profile?.institution_id) return [];
      
      const { data, error } = await supabase
        .from('fases')
        .select('id, numero_fase, data_inicio, data_fim, ativo, semana_atual, inteligencia_id, segmento, serie')
        .eq('institution_id', profile.institution_id)
        .eq('ano_letivo', anoLetivo)
        .order('numero_fase');

      if (error) throw error;
      return (data as FaseDB[]) || [];
    },
    enabled: !!profile?.institution_id,
  });

  // Buscar contagem de missões por fase
  const { data: missoesPorFase } = useQuery({
    queryKey: ['missoes-count-admin', fases?.map(f => f.id)],
    queryFn: async () => {
      if (!fases?.length) return {};
      const faseIds = fases.map(f => f.id);
      
      const { data, error } = await supabase
        .from('missoes')
        .select('fase_id')
        .in('fase_id', faseIds);

      if (error) throw error;

      const contagem: Record<string, number> = {};
      data?.forEach(m => {
        if (m.fase_id) {
          contagem[m.fase_id] = (contagem[m.fase_id] || 0) + 1;
        }
      });
      return contagem;
    },
    enabled: !!fases?.length,
  });

  // Determinar status de cada fase
  const getStatusFase = (fase: FaseDB, todasFases: FaseDB[]): FaseStatus => {
    const hoje = inicioDoDiaBrasil();
    if (fase.ativo) return 'em_andamento';

    const fim = parseDataLocal(fase.data_fim);
    const fimDia = new Date(fim.getFullYear(), fim.getMonth(), fim.getDate(), 23, 59, 59, 999);
    if (fimDia < hoje) return 'concluida';

    // Filtrar fases do mesmo segmento E serie
    const fasesSegmento = todasFases.filter(f => f.segmento === fase.segmento && f.serie === fase.serie);
    const fasesOrdenadas = [...fasesSegmento].sort((a, b) => a.numero_fase - b.numero_fase);
    const faseAtiva = fasesOrdenadas.find(f => f.ativo);
    
    if (!faseAtiva) {
      const primeiraFutura = fasesOrdenadas.find(f => parseDataLocal(f.data_inicio) > hoje);
      if (primeiraFutura?.id === fase.id) return 'proxima';
    } else {
      const indexAtiva = fasesOrdenadas.findIndex(f => f.ativo);
      if (indexAtiva >= 0 && fasesOrdenadas[indexAtiva + 1]?.id === fase.id) {
        return 'proxima';
      }
    }

    return 'bloqueada';
  };

  // Gerar fases completas para um segmento + serie específico
  const gerarFasesSegmentoSerie = (segmento: Segmento, serie: number): FaseComStatus[] => {
    return (inteligencias || []).map((intel, index) => {
      const faseDB = fases?.find(f => f.inteligencia_id === intel.id && f.segmento === segmento && f.serie === serie);

      if (faseDB) {
        return {
          id: faseDB.id,
          inteligenciaId: intel.id,
          numero_fase: faseDB.numero_fase,
          data_inicio: faseDB.data_inicio,
          data_fim: faseDB.data_fim,
          ativo: faseDB.ativo,
          semana_atual: faseDB.semana_atual,
          inteligencia: intel,
          status: getStatusFase(faseDB, fases || []),
          missoesCount: missoesPorFase?.[faseDB.id] || 0,
          configurada: true,
          segmento,
          serie,
        };
      } else {
        return {
          id: `temp-${segmento}-${serie}-${intel.id}`,
          inteligenciaId: intel.id,
          numero_fase: index + 1,
          data_inicio: null,
          data_fim: null,
          ativo: null,
          semana_atual: null,
          inteligencia: intel,
          status: 'nao_configurada' as FaseStatus,
          missoesCount: 0,
          configurada: false,
          segmento,
          serie,
        };
      }
    }).sort((a, b) => a.numero_fase - b.numero_fase);
  };

  // Contar fases configuradas por serie
  const contarFasesSerie = (segmento: Segmento, serie: number) => {
    const count = fases?.filter(f => f.segmento === segmento && f.serie === serie).length || 0;
    const temAtiva = fases?.some(f => f.segmento === segmento && f.serie === serie && f.ativo) || false;
    return { count, temAtiva };
  };

  // Formatar período
  const formatPeriodo = (dataInicio: string, dataFim: string) => {
    const inicio = formatarDataBrasil(dataInicio, 'dd MMM');
    const fim = formatarDataBrasil(dataFim, 'dd MMM');
    return `${inicio} - ${fim}`;
  };

  const getProgressColor = (count: number, total: number) => {
    const percent = (count / total) * 100;
    if (percent >= 80) return 'bg-green-500';
    if (percent >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const anosDisponiveis = [2025, 2026, 2027];
  const isLoading = isLoadingInteligencias || isLoadingFases || !profile;

  // Handler para trocar segmento (reseta serie)
  const handleSegmentoChange = (seg: string) => {
    setSegmentoAtivo(seg as Segmento);
    setSerieSelecionada(null);
  };

  // Renderizar grid de séries
  const renderSeriesGrid = (segmento: Segmento) => {
    const series = SERIES_POR_SEGMENTO[segmento];
    
    return (
      <div className="grid grid-cols-2 gap-3">
        {series.map((s) => {
          const { count, temAtiva } = contarFasesSerie(segmento, s.numero);
          
          return (
            <button
              key={s.numero}
              onClick={() => setSerieSelecionada(s.numero)}
              className={cn(
                "p-4 rounded-xl border text-left transition-all hover:bg-white/5",
                temAtiva 
                  ? "border-green-500/30 bg-green-500/5" 
                  : "border-white/10 bg-white/5"
              )}
            >
              <h3 className="text-white font-semibold text-base mb-1">
                {s.label}
              </h3>
              <p className="text-white/40 text-sm">
                {count} de 8 fases
              </p>
              {temAtiva && (
                <span className="inline-block mt-2 text-xs text-green-400 bg-green-500/10 px-2 py-0.5 rounded">
                  Fase ativa
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  };

  // Renderizar lista de fases (para uma serie selecionada)
  const renderFasesList = (segmento: Segmento, serie: number) => {
    const fasesSegmento = gerarFasesSegmentoSerie(segmento, serie);
    const faseAtual = fasesSegmento.find(f => f.status === 'em_andamento' && f.configurada);
    const serieLabel = SERIES_POR_SEGMENTO[segmento].find(s => s.numero === serie)?.label || '';

    return (
      <div className="space-y-2">
        {/* Botão Voltar para séries */}
        <button
          onClick={() => setSerieSelecionada(null)}
          className="flex items-center gap-2 text-white/60 hover:text-white mb-3 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Voltar para séries</span>
        </button>

        <h2 className="text-white font-semibold text-lg mb-3">{serieLabel}</h2>

        {/* Indicador de fase atual */}
        {faseAtual && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-white/60 text-sm">Fase atual: </span>
                <span className="text-green-400 font-medium">
                  {faseAtual.inteligencia.nome}
                </span>
              </div>
              <span className="text-white/40 text-xs">
                Semana {faseAtual.data_inicio && faseAtual.data_fim 
                  ? calcularSemanaAtual(faseAtual.data_inicio, faseAtual.data_fim) 
                  : faseAtual.semana_atual || 1} de 4
              </span>
            </div>
          </div>
        )}

        {fasesSegmento.map((fase) => {
          const config = statusConfig[fase.status];
          const semanaAtual = fase.data_inicio && fase.data_fim 
            ? calcularSemanaAtual(fase.data_inicio, fase.data_fim) 
            : fase.semana_atual || 1;

          return (
            <button
              key={fase.id}
              onClick={() => {
                if (fase.configurada) {
                  navigate(`/admin/fases/${fase.id}`);
                } else {
                  navigate(`/admin/fases/nova`, {
                    state: { inteligencia: fase.inteligencia, anoLetivo, segmento, serie }
                  });
                }
              }}
              className={cn(
                "w-full p-4 rounded-xl border text-left transition-all",
                config.bg,
                config.border,
                "hover:bg-white/5",
                fase.status === 'em_andamento' && "border-l-4 border-l-green-500",
                fase.status === 'bloqueada' && "opacity-60",
                fase.status === 'nao_configurada' && "opacity-80"
              )}
            >
              <div className="flex items-start gap-3">
                <span className="text-sm font-semibold text-gray-500 w-5 pt-2.5">
                  {fase.numero_fase}
                </span>

                <CasaBrasao
                  brasaoUrl={fase.inteligencia.brasao_url}
                  emoji={fase.inteligencia.emoji}
                  nome={fase.inteligencia.nome}
                  size="small"
                  className={cn(
                    fase.status === 'bloqueada' && "grayscale",
                    fase.status === 'nao_configurada' && "grayscale opacity-50"
                  )}
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn(
                      "font-medium truncate",
                      fase.status === 'em_andamento' ? 'text-white' : 
                      fase.status === 'nao_configurada' ? 'text-white/50' : 
                      'text-white/80'
                    )}>
                      {fase.inteligencia.nome}
                    </span>
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded shrink-0",
                      config.text,
                      config.badgeBg
                    )}>
                      {config.label}
                    </span>
                  </div>

                  {fase.configurada && fase.data_inicio && fase.data_fim ? (
                    <span className="text-sm text-white/40 block mt-0.5">
                      {formatPeriodo(fase.data_inicio, fase.data_fim)}
                    </span>
                  ) : (
                    <span className="text-xs text-white/30 block mt-0.5">
                      Clique para configurar
                    </span>
                  )}

                  {fase.status === 'em_andamento' && (
                    <span className="text-xs text-green-400 block mt-1">
                      Semana {semanaAtual} de 4
                    </span>
                  )}

                  {fase.configurada && (
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            getProgressColor(fase.missoesCount, TOTAL_MISSOES_ESPERADO)
                          )}
                          style={{ width: `${Math.min((fase.missoesCount / TOTAL_MISSOES_ESPERADO) * 100, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-white/30 shrink-0">
                        {fase.missoesCount}/{TOTAL_MISSOES_ESPERADO}
                      </span>
                    </div>
                  )}
                </div>

                <ChevronRight className="w-5 h-5 text-white/20 mt-2.5 shrink-0" />
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  // Renderizar conteúdo do segmento (séries ou fases)
  const renderSegmentoContent = (segmento: Segmento) => {
    if (serieSelecionada !== null) {
      return renderFasesList(segmento, serieSelecionada);
    }
    return renderSeriesGrid(segmento);
  };

  if (profile && !profile.institution_id) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] px-4 py-6">
        <div className="max-w-lg mx-auto text-center py-12">
          <AlertCircle className="w-12 h-12 mx-auto text-amber-400 mb-4" />
          <h2 className="text-white text-lg font-medium mb-2">
            Instituição não configurada
          </h2>
          <p className="text-white/50 text-sm">
            Seu perfil de administrador não está associado a nenhuma instituição.
            Entre em contato com o suporte para corrigir.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] px-4 py-6">
        <div className="max-w-lg mx-auto space-y-6">
          <Skeleton className="h-12 w-48" />
          <Skeleton className="h-12 w-full" />
          <div className="space-y-4 mt-8">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] px-4 py-6">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-1">Fases</h1>
          
          <div className="flex items-center justify-between mt-4">
            <Select
              value={anoLetivo.toString()}
              onValueChange={(value) => setAnoLetivo(Number(value))}
            >
              <SelectTrigger className="w-28 bg-[#1E293B] border-white/10 text-white h-9">
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent className="bg-[#1E293B] border-white/10">
                {anosDisponiveis.map(ano => (
                  <SelectItem 
                    key={ano} 
                    value={ano.toString()}
                    className="text-white hover:bg-white/10"
                  >
                    {ano}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCalendario(true)}
              className="gap-2 border-white/10 text-white/70 hover:text-white hover:bg-white/10"
            >
              <CalendarDays className="w-4 h-4" />
              Calendário
            </Button>
          </div>
        </div>

        {/* Tabs por Segmento */}
        <Tabs value={segmentoAtivo} onValueChange={handleSegmentoChange}>
          <TabsList className="w-full bg-[#1E293B] border border-white/10 mb-4">
            <TabsTrigger 
              value="infantil" 
              className="flex-1 data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/60"
            >
              {segmentoLabels.infantil}
            </TabsTrigger>
            <TabsTrigger 
              value="fundamental1" 
              className="flex-1 data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/60"
            >
              {segmentoLabels.fundamental1}
            </TabsTrigger>
            <TabsTrigger 
              value="fundamental2" 
              className="flex-1 data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/60"
            >
              {segmentoLabels.fundamental2}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="infantil">
            {renderSegmentoContent('infantil')}
          </TabsContent>

          <TabsContent value="fundamental1">
            {renderSegmentoContent('fundamental1')}
          </TabsContent>

          <TabsContent value="fundamental2">
            {renderSegmentoContent('fundamental2')}
          </TabsContent>
        </Tabs>

        {/* Modal Calendário */}
        <CalendarioFasesModal
          isOpen={showCalendario}
          onClose={() => setShowCalendario(false)}
          fases={(() => {
            if (serieSelecionada === null) return [];
            const fasesSegmento = gerarFasesSegmentoSerie(segmentoAtivo, serieSelecionada);
            return fasesSegmento
              .filter(f => f.configurada)
              .map(f => ({
                id: f.id,
                numero_fase: f.numero_fase,
                data_inicio: f.data_inicio || '',
                data_fim: f.data_fim || '',
                ativo: f.ativo,
                inteligencia: f.inteligencia ? {
                  nome: f.inteligencia.nome,
                  cor_hex: f.inteligencia.cor_hex,
                  emoji: f.inteligencia.emoji
                } : null
              })) as FaseComDatas[];
          })()}
          anoLetivo={anoLetivo}
          modoEdicao={true}
          onFaseClick={(faseId) => {
            setShowCalendario(false);
            navigate(`/admin/fases/${faseId}`);
          }}
        />
      </div>
    </div>
  );
};

export default FasesPage;
