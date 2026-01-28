import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ChevronRight, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { CasaBrasao } from '@/components/CasaBrasao';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
}

const TOTAL_MISSOES_ESPERADO = 36;

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
      if (!profile?.institution_id) {
        console.log('⚠️ FasesPage: institution_id não definido no perfil');
        return [];
      }
      
      console.log('🔍 Buscando fases:', { institution_id: profile.institution_id, ano_letivo: anoLetivo });
      
      const { data, error } = await supabase
        .from('fases')
        .select('id, numero_fase, data_inicio, data_fim, ativo, semana_atual, inteligencia_id, segmento')
        .eq('institution_id', profile.institution_id)
        .eq('ano_letivo', anoLetivo)
        .order('numero_fase');

      if (error) {
        console.error('❌ Erro ao buscar fases:', error);
        throw error;
      }
      
      console.log('✅ Fases encontradas:', data?.length);
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

  // Determinar status de cada fase (usando timezone Brasil)
  const getStatusFase = (fase: FaseDB, todasFases: FaseDB[]): FaseStatus => {
    const hoje = inicioDoDiaBrasil();

    // Se fase.ativo === true → 'em_andamento'
    if (fase.ativo) return 'em_andamento';

    // Usar parseDataLocal para evitar bug de timezone
    const fim = parseDataLocal(fase.data_fim);
    const fimDia = new Date(fim.getFullYear(), fim.getMonth(), fim.getDate(), 23, 59, 59, 999);

    // Se data_fim < hoje → 'concluida'
    if (fimDia < hoje) return 'concluida';

    // Filtrar fases do mesmo segmento para determinar ordem
    const fasesSegmento = todasFases.filter(f => f.segmento === fase.segmento);
    const fasesOrdenadas = [...fasesSegmento].sort((a, b) => a.numero_fase - b.numero_fase);
    const faseAtiva = fasesOrdenadas.find(f => f.ativo);
    
    if (!faseAtiva) {
      // Se não há fase ativa, a primeira futura é 'proxima'
      const primeiraFutura = fasesOrdenadas.find(f => parseDataLocal(f.data_inicio) > hoje);
      if (primeiraFutura?.id === fase.id) return 'proxima';
    } else {
      // A fase logo após a ativa é 'proxima'
      const indexAtiva = fasesOrdenadas.findIndex(f => f.ativo);
      if (indexAtiva >= 0 && fasesOrdenadas[indexAtiva + 1]?.id === fase.id) {
        return 'proxima';
      }
    }

    return 'bloqueada';
  };

  // Gerar fases completas para um segmento específico
  const gerarFasesSegmento = (segmento: Segmento): FaseComStatus[] => {
    return (inteligencias || []).map((intel, index) => {
      // Procurar se existe fase configurada no banco para esta inteligência E segmento
      const faseDB = fases?.find(f => f.inteligencia_id === intel.id && f.segmento === segmento);

      if (faseDB) {
        // Fase existe no banco - usar dados reais
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
        };
      } else {
        // Fase NÃO existe no banco - mostrar como não configurada
        return {
          id: `temp-${segmento}-${intel.id}`,
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
        };
      }
    }).sort((a, b) => a.numero_fase - b.numero_fase);
  };

  // Gerar fases para cada segmento
  const fasesInfantil = gerarFasesSegmento('infantil');
  const fasesFundamental1 = gerarFasesSegmento('fundamental1');
  const fasesFundamental2 = gerarFasesSegmento('fundamental2');

  // Encontrar fase atual do segmento ativo
  const getFaseAtualSegmento = (fasesSegmento: FaseComStatus[]) => {
    return fasesSegmento.find(f => f.status === 'em_andamento' && f.configurada);
  };

  // Formatar período (usando timezone Brasil) - formato "dd MMM"
  const formatPeriodo = (dataInicio: string, dataFim: string) => {
    const inicio = formatarDataBrasil(dataInicio, 'dd MMM');
    const fim = formatarDataBrasil(dataFim, 'dd MMM');
    return `${inicio} - ${fim}`;
  };

  // Cor da barra de progresso
  const getProgressColor = (count: number, total: number) => {
    const percent = (count / total) * 100;
    if (percent >= 80) return 'bg-green-500';
    if (percent >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Anos disponíveis para seleção
  const anosDisponiveis = [2025, 2026, 2027];

  const isLoading = isLoadingInteligencias || isLoadingFases || !profile;

  // Renderizar lista de fases
  const renderFasesList = (fasesSegmento: FaseComStatus[], segmento: Segmento) => {
    const faseAtual = getFaseAtualSegmento(fasesSegmento);

    return (
      <div className="space-y-2">
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
                    state: { inteligencia: fase.inteligencia, anoLetivo, segmento }
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
                {/* Número da fase */}
                <span className="text-sm font-semibold text-gray-500 w-5 pt-2.5">
                  {fase.numero_fase}
                </span>

                {/* Brasão */}
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

                {/* Conteúdo */}
                <div className="flex-1 min-w-0">
                  {/* Linha 1: Nome + Status badge */}
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

                  {/* Linha 2: Período */}
                  {fase.configurada && fase.data_inicio && fase.data_fim ? (
                    <span className="text-sm text-white/40 block mt-0.5">
                      {formatPeriodo(fase.data_inicio, fase.data_fim)}
                    </span>
                  ) : (
                    <span className="text-xs text-white/30 block mt-0.5">
                      Clique para configurar
                    </span>
                  )}

                  {/* Linha 3: Semana (só para fase ativa) */}
                  {fase.status === 'em_andamento' && (
                    <span className="text-xs text-green-400 block mt-1">
                      Semana {semanaAtual} de 4
                    </span>
                  )}

                  {/* Linha 4: Barra de progresso de missões */}
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

                {/* Seta */}
                <ChevronRight className="w-5 h-5 text-white/20 mt-2.5 shrink-0" />
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  // Tratamento quando institution_id não está configurado
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
            {/* Seletor de ano compacto */}
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
          </div>
        </div>

        {/* Tabs por Segmento */}
        <Tabs value={segmentoAtivo} onValueChange={(v) => setSegmentoAtivo(v as Segmento)}>
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
            {renderFasesList(fasesInfantil, 'infantil')}
          </TabsContent>

          <TabsContent value="fundamental1">
            {renderFasesList(fasesFundamental1, 'fundamental1')}
          </TabsContent>

          <TabsContent value="fundamental2">
            {renderFasesList(fasesFundamental2, 'fundamental2')}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default FasesPage;
