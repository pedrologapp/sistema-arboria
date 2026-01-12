import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ChevronRight, AlertCircle, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { CasaBrasao } from '@/components/CasaBrasao';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
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
} from '@/utils/timezone';

type FaseStatus = 'nao_configurada' | 'bloqueada' | 'proxima' | 'em_andamento' | 'concluida';

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
}

const TOTAL_MISSOES_ESPERADO = 36;

const statusConfig: Record<FaseStatus, { label: string; sublabel: string | null; text: string; bg: string; border: string }> = {
  nao_configurada: {
    label: 'Não configurada',
    sublabel: 'Clique para configurar',
    text: 'text-white/30',
    bg: 'bg-white/5',
    border: 'border-white/10',
  },
  bloqueada: {
    label: 'Bloqueada',
    sublabel: null,
    text: 'text-white/40',
    bg: 'bg-white/5',
    border: 'border-white/10',
  },
  proxima: {
    label: 'Próxima',
    sublabel: null,
    text: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
  },
  em_andamento: {
    label: 'Em andamento',
    sublabel: null,
    text: 'text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
  },
  concluida: {
    label: 'Concluída',
    sublabel: null,
    text: 'text-white/50',
    bg: 'bg-white/5',
    border: 'border-white/10',
  },
};

const FasesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [anoLetivo, setAnoLetivo] = useState(new Date().getFullYear());

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

  // Buscar fases configuradas do ano (pode retornar 0, algumas ou todas)
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
        .select('id, numero_fase, data_inicio, data_fim, ativo, semana_atual, inteligencia_id')
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

    const fim = new Date(fase.data_fim);
    fim.setHours(23, 59, 59, 999);

    // Se data_fim < hoje → 'concluida'
    if (fim < hoje) return 'concluida';

    // Encontrar a próxima fase (primeira futura não ativa)
    const fasesOrdenadas = [...todasFases].sort((a, b) => a.numero_fase - b.numero_fase);
    const faseAtiva = fasesOrdenadas.find(f => f.ativo);
    
    if (!faseAtiva) {
      // Se não há fase ativa, a primeira futura é 'proxima'
      const primeiraFutura = fasesOrdenadas.find(f => new Date(f.data_inicio) > hoje);
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

  // SEMPRE mapear as 8 inteligências, verificando se existem fases no banco
  const fasesCompletas: FaseComStatus[] = (inteligencias || []).map((intel, index) => {
    // Procurar se existe fase configurada no banco para esta inteligência
    const faseDB = fases?.find(f => f.inteligencia_id === intel.id);

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
      };
    } else {
      // Fase NÃO existe no banco - mostrar como não configurada
      return {
        id: `temp-${intel.id}`,
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
      };
    }
  });

  // Encontrar fase atual (em andamento e configurada)
  const faseAtual = fasesCompletas.find(f => f.status === 'em_andamento' && f.configurada);

  // Formatar período (usando timezone Brasil)
  const formatPeriodo = (dataInicio: string, dataFim: string) => {
    const inicio = formatarDataBrasil(dataInicio, 'dd/MM');
    const fim = formatarDataBrasil(dataFim, 'dd/MM');
    return `${inicio} - ${fim}`;
  };

  // Data/hora atual no Brasil (para exibição no header)
  const horaAtual = formatarDataBrasil(new Date(), 'HH:mm');
  const dataAtual = formatarDataBrasil(new Date(), "dd 'de' MMMM");

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
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Fases</h1>
            <p className="text-white/50 text-sm">
              Configure o calendário e as missões
            </p>
          </div>
          {/* Horário atual (Brasil) */}
          <div className="text-right">
            <div className="flex items-center gap-1.5 text-white/60 text-sm">
              <Clock className="w-4 h-4" />
              {horaAtual}
            </div>
            <p className="text-white/40 text-xs">{dataAtual}</p>
          </div>
        </div>

        {/* Seletor de Ano */}
        <div className="mb-6">
          <span className="text-xs text-white/40 uppercase tracking-wider block mb-2">
            Ano Letivo
          </span>
          <Select
            value={anoLetivo.toString()}
            onValueChange={(value) => setAnoLetivo(Number(value))}
          >
            <SelectTrigger className="w-full bg-[#1E293B] border-white/10 text-white">
              <SelectValue placeholder="Selecione o ano" />
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

        {/* Card da Fase Atual */}
        {faseAtual && (
          <div className="mb-6">
            <span className="text-xs text-white/40 uppercase tracking-wider block mb-2">
              Fase Atual
            </span>
            <button
              onClick={() => navigate(`/admin/fases/${faseAtual.id}`)}
              className="w-full p-4 bg-green-500/10 border border-green-500/30 rounded-xl text-left transition-colors hover:bg-green-500/15"
            >
              <div className="flex items-center gap-4">
                <CasaBrasao
                  brasaoUrl={faseAtual.inteligencia.brasao_url}
                  emoji={faseAtual.inteligencia.emoji}
                  nome={faseAtual.inteligencia.nome}
                  size="medium"
                />
                <div className="flex-1">
                  <span className="text-lg font-semibold text-white">
                    {faseAtual.inteligencia.nome}
                  </span>
                  <div className="flex items-center gap-2 text-sm text-green-400 mt-0.5">
                    <span>Em andamento</span>
                    <span className="text-white/20">•</span>
                    <span>Semana {faseAtual.data_inicio && faseAtual.data_fim 
                      ? calcularSemanaAtual(faseAtual.data_inicio, faseAtual.data_fim) 
                      : faseAtual.semana_atual || 1} de 4</span>
                  </div>
                  {faseAtual.data_inicio && faseAtual.data_fim && (
                    <span className="text-xs text-white/40 mt-1 block">
                      {formatPeriodo(faseAtual.data_inicio, faseAtual.data_fim)}
                    </span>
                  )}
                </div>
                <ChevronRight className="w-5 h-5 text-green-400/50" />
              </div>
            </button>
          </div>
        )}

        {/* Lista de Todas as Fases (SEMPRE 8 inteligências) */}
        <div>
          <span className="text-xs text-white/40 uppercase tracking-wider block mb-3">
            Todas as Fases
          </span>

          <div className="space-y-3">
            {fasesCompletas.map((fase) => {
              const config = statusConfig[fase.status];
              const temAlerta = fase.configurada &&
                fase.missoesCount < TOTAL_MISSOES_ESPERADO && 
                (fase.status === 'em_andamento' || fase.status === 'proxima');

              return (
                <button
                  key={fase.id}
                  onClick={() => {
                    if (fase.configurada) {
                      navigate(`/admin/fases/${fase.id}`);
                    } else {
                      navigate(`/admin/fases/nova`, {
                        state: { inteligencia: fase.inteligencia, anoLetivo }
                      });
                    }
                  }}
                  className={cn(
                    "w-full p-4 rounded-xl border text-left transition-colors",
                    config.bg,
                    config.border,
                    "hover:bg-white/5",
                    fase.status === 'em_andamento' && "border-l-4 border-l-green-500"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* Brasão */}
                      <CasaBrasao
                        brasaoUrl={fase.inteligencia.brasao_url}
                        emoji={fase.inteligencia.emoji}
                        nome={fase.inteligencia.nome}
                        size="medium"
                      />

                      {/* Info */}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "font-medium",
                            fase.status === 'em_andamento' ? 'text-white' : 
                            fase.status === 'nao_configurada' ? 'text-white/60' : config.text
                          )}>
                            {fase.inteligencia.nome}
                          </span>
                          {temAlerta && (
                            <AlertCircle className="w-4 h-4 text-amber-400" />
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs mt-0.5">
                          <span className={config.text}>
                            {config.label}
                          </span>
                          {fase.configurada && fase.data_inicio && fase.data_fim && (
                            <>
                              <span className="text-white/20">•</span>
                              <span className="text-white/40">
                                {formatPeriodo(fase.data_inicio, fase.data_fim)}
                              </span>
                            </>
                          )}
                        </div>

                        {/* Sublabel para fases não configuradas */}
                        {config.sublabel && (
                          <span className="text-white/20 text-xs block mt-0.5">
                            {config.sublabel}
                          </span>
                        )}

                        {/* Contador de missões e barra de progresso (só se configurada) */}
                        {fase.configurada && (
                          <div className="mt-2">
                            <span className="text-xs text-white/30">
                              {fase.missoesCount}/{TOTAL_MISSOES_ESPERADO} missões
                            </span>
                            <div className="w-32 h-1 bg-white/10 rounded-full mt-1">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all",
                                  getProgressColor(fase.missoesCount, TOTAL_MISSOES_ESPERADO)
                                )}
                                style={{ width: `${Math.min((fase.missoesCount / TOTAL_MISSOES_ESPERADO) * 100, 100)}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Seta */}
                    <ChevronRight className="w-5 h-5 text-white/20" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FasesPage;
