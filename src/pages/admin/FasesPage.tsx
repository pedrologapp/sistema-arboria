import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ChevronRight, Calendar, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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

type FaseStatus = 'bloqueada' | 'proxima' | 'em_andamento' | 'concluida';

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
  inteligencias: Inteligencia;
}

interface FaseComStatus {
  id: string;
  numero_fase: number;
  data_inicio: string;
  data_fim: string;
  ativo: boolean | null;
  semana_atual: number | null;
  inteligencia: Inteligencia;
  status: FaseStatus;
  missoesCount: number;
}

const TOTAL_MISSOES_ESPERADO = 36;

const statusConfig: Record<FaseStatus, { label: string; text: string; bg: string; border: string }> = {
  em_andamento: {
    label: 'Em andamento',
    text: 'text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
  },
  proxima: {
    label: 'Próxima',
    text: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
  },
  concluida: {
    label: 'Concluída',
    text: 'text-white/40',
    bg: 'bg-white/5',
    border: 'border-white/10',
  },
  bloqueada: {
    label: 'Bloqueada',
    text: 'text-white/30',
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

  // Buscar fases do ano com inteligência
  const { data: fases, isLoading: isLoadingFases } = useQuery({
    queryKey: ['fases-admin', profile?.institution_id, anoLetivo],
    queryFn: async () => {
      if (!profile?.institution_id) return [];
      const { data, error } = await supabase
        .from('fases')
        .select(`
          id,
          numero_fase,
          data_inicio,
          data_fim,
          ativo,
          semana_atual,
          inteligencia_id,
          inteligencias (
            id, nome, codigo, cor_hex, emoji, brasao_url
          )
        `)
        .eq('institution_id', profile.institution_id)
        .eq('ano_letivo', anoLetivo)
        .order('numero_fase');

      if (error) throw error;
      return (data as unknown as FaseDB[]) || [];
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
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

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

  // Processar fases com status e contagem
  const fasesComStatus: FaseComStatus[] = (fases || []).map(fase => ({
    id: fase.id,
    numero_fase: fase.numero_fase,
    data_inicio: fase.data_inicio,
    data_fim: fase.data_fim,
    ativo: fase.ativo,
    semana_atual: fase.semana_atual,
    inteligencia: fase.inteligencias,
    status: getStatusFase(fase, fases || []),
    missoesCount: missoesPorFase?.[fase.id] || 0,
  }));

  // Encontrar fase atual (em andamento)
  const faseAtual = fasesComStatus.find(f => f.status === 'em_andamento');

  // Formatar período
  const formatPeriodo = (dataInicio: string, dataFim: string) => {
    const inicio = format(new Date(dataInicio), 'dd/MM', { locale: ptBR });
    const fim = format(new Date(dataFim), 'dd/MM', { locale: ptBR });
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

  const isLoading = isLoadingFases || !profile;

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
          <p className="text-white/50 text-sm">
            Configure o calendário e as missões
          </p>
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
                    <span>Semana {faseAtual.semana_atual || 1} de 4</span>
                  </div>
                  <span className="text-xs text-white/40 mt-1 block">
                    {formatPeriodo(faseAtual.data_inicio, faseAtual.data_fim)}
                  </span>
                </div>
                <ChevronRight className="w-5 h-5 text-green-400/50" />
              </div>
            </button>
          </div>
        )}

        {/* Lista de Todas as Fases */}
        <div>
          <span className="text-xs text-white/40 uppercase tracking-wider block mb-3">
            Todas as Fases
          </span>

          {fasesComStatus.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 mx-auto text-white/20 mb-4" />
              <p className="text-white/40">Nenhuma fase configurada para {anoLetivo}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {fasesComStatus.map((fase) => {
                const config = statusConfig[fase.status];
                const temAlerta = fase.missoesCount < TOTAL_MISSOES_ESPERADO && 
                                 (fase.status === 'em_andamento' || fase.status === 'proxima');

                return (
                  <button
                    key={fase.id}
                    onClick={() => navigate(`/admin/fases/${fase.id}`)}
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
                        {/* Número da fase */}
                        <span className="w-6 h-6 rounded-full bg-white/10 text-white/60 text-xs flex items-center justify-center font-medium">
                          {fase.numero_fase}
                        </span>

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
                            <span className={cn("font-medium", fase.status === 'em_andamento' ? 'text-white' : config.text)}>
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
                            <span className="text-white/20">•</span>
                            <span className="text-white/40">
                              {formatPeriodo(fase.data_inicio, fase.data_fim)}
                            </span>
                          </div>

                          {/* Contador de missões e barra de progresso */}
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
                        </div>
                      </div>

                      {/* Seta */}
                      <ChevronRight className="w-5 h-5 text-white/20" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FasesPage;
