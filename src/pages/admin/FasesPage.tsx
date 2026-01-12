import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, ChevronRight, Lock, CheckCircle, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { CasaBrasao } from '@/components/CasaBrasao';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

type StatusFase = 'bloqueada' | 'proxima' | 'em_andamento' | 'concluida';

interface Inteligencia {
  id: number;
  nome: string;
  cor_hex: string | null;
  brasao_url: string | null;
  emoji: string | null;
}

interface FaseData {
  id: string;
  numero_fase: number;
  semana_atual: number | null;
  data_inicio: string;
  data_fim: string;
  ativo: boolean;
  ano_letivo: number;
  inteligencias: Inteligencia;
}

const TOTAL_MISSOES_ESPERADAS = 36;

const FasesPage = () => {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();
  const [anoSelecionado, setAnoSelecionado] = useState<string>(currentYear.toString());
  const [institutionId, setInstitutionId] = useState<string | null>(null);

  // Buscar institution (para admin)
  useEffect(() => {
    const fetchInstitution = async () => {
      const { data } = await supabase
        .from('institutions')
        .select('id')
        .limit(1)
        .single();
      if (data) setInstitutionId(data.id);
    };
    fetchInstitution();
  }, []);

  // Query principal: fases + inteligências
  const { data: fases, isLoading } = useQuery({
    queryKey: ['admin-fases', institutionId, anoSelecionado],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fases')
        .select(`
          id, numero_fase, semana_atual, data_inicio, data_fim, ativo, ano_letivo,
          inteligencias!fases_inteligencia_id_fkey (id, nome, cor_hex, brasao_url, emoji)
        `)
        .eq('institution_id', institutionId!)
        .eq('ano_letivo', parseInt(anoSelecionado))
        .order('numero_fase');
      
      if (error) throw error;
      return data as unknown as FaseData[];
    },
    enabled: !!institutionId
  });

  // Query: contagem de missões por fase
  const { data: missoesCounts } = useQuery({
    queryKey: ['admin-missoes-count', fases?.map(f => f.id)],
    queryFn: async () => {
      if (!fases || fases.length === 0) return {};
      
      const faseIds = fases.map(f => f.id);
      const { data, error } = await supabase
        .from('missoes')
        .select('fase_id')
        .in('fase_id', faseIds);
      
      if (error) throw error;
      
      // Contar por fase
      const counts: Record<string, number> = {};
      faseIds.forEach(id => counts[id] = 0);
      data?.forEach(m => {
        if (m.fase_id) {
          counts[m.fase_id] = (counts[m.fase_id] || 0) + 1;
        }
      });
      return counts;
    },
    enabled: !!fases && fases.length > 0
  });

  // Encontrar fase ativa
  const faseAtiva = fases?.find(f => f.ativo);

  // Calcular status da fase
  const getStatus = (fase: FaseData): StatusFase => {
    if (fase.ativo) return 'em_andamento';
    
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dataFim = new Date(fase.data_fim);
    dataFim.setHours(23, 59, 59, 999);
    
    if (dataFim < hoje) return 'concluida';
    
    // Verificar se é a próxima (menor numero_fase ainda não iniciada após a ativa)
    if (faseAtiva && fase.numero_fase === faseAtiva.numero_fase + 1) {
      return 'proxima';
    }
    
    // Se não há fase ativa, a primeira não concluída é próxima
    if (!faseAtiva) {
      const dataInicio = new Date(fase.data_inicio);
      if (dataInicio > hoje) {
        const fasesNaoConcluidas = fases?.filter(f => {
          const fim = new Date(f.data_fim);
          return fim >= hoje && !f.ativo;
        }).sort((a, b) => a.numero_fase - b.numero_fase);
        
        if (fasesNaoConcluidas && fasesNaoConcluidas[0]?.id === fase.id) {
          return 'proxima';
        }
      }
    }
    
    return 'bloqueada';
  };

  // Calcular semana atual
  const calcularSemanaAtual = (dataInicio: string): number => {
    const hoje = new Date();
    const inicio = new Date(dataInicio);
    const diffMs = hoje.getTime() - inicio.getTime();
    const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const semana = Math.floor(diffDias / 7) + 1;
    return Math.max(1, Math.min(semana, 4));
  };

  // Cores da barra de progresso
  const getProgressColor = (porcentagem: number): string => {
    if (porcentagem >= 80) return 'bg-green-500';
    if (porcentagem >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Config visual por status
  const getStatusConfig = (status: StatusFase) => {
    switch (status) {
      case 'em_andamento':
        return {
          tag: 'Em andamento',
          tagClass: 'bg-green-500/20 text-green-400',
          cardClass: 'border-l-2 border-l-green-500',
          opacity: 'opacity-100',
          icon: null
        };
      case 'concluida':
        return {
          tag: 'Concluída',
          tagClass: 'bg-blue-500/20 text-blue-400',
          cardClass: '',
          opacity: 'opacity-100',
          icon: <CheckCircle className="w-3.5 h-3.5" />
        };
      case 'proxima':
        return {
          tag: 'Próxima',
          tagClass: 'bg-amber-500/20 text-amber-400',
          cardClass: '',
          opacity: 'opacity-100',
          icon: null
        };
      case 'bloqueada':
      default:
        return {
          tag: 'Bloqueada',
          tagClass: 'bg-white/10 text-white/40',
          cardClass: '',
          opacity: 'opacity-50',
          icon: <Lock className="w-3.5 h-3.5" />
        };
    }
  };

  // Handler de clique no card
  const handleFaseClick = (fase: FaseData, status: StatusFase) => {
    if (status === 'bloqueada') {
      toast.info('Esta fase ainda não foi liberada');
      return;
    }
    navigate(`/admin/fases/${fase.id}`);
  };

  // Anos disponíveis para seleção
  const anosDisponiveis = [currentYear - 1, currentYear, currentYear + 1];

  return (
    <div className="min-h-screen bg-[#0A0A0A] px-4 py-6 pb-24">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold text-white">Fases</h1>
          <button 
            className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:bg-white/10 hover:text-white transition-colors"
            onClick={() => toast.info('Funcionalidade em desenvolvimento')}
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Filtros e info */}
        <div className="flex items-center justify-between mb-6 gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-white/60">Ano letivo:</span>
            <Select value={anoSelecionado} onValueChange={setAnoSelecionado}>
              <SelectTrigger className="w-24 h-8 bg-white/5 border-white/10 text-white text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {anosDisponiveis.map(ano => (
                  <SelectItem key={ano} value={ano.toString()}>
                    {ano}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {faseAtiva && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-white/60">Fase atual:</span>
              <span className="text-sm font-medium text-green-400">
                {faseAtiva.inteligencias.nome}
              </span>
            </div>
          )}
        </div>

        {/* Lista de Fases */}
        <div className="space-y-3">
          {isLoading ? (
            // Skeleton loading
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-start gap-4">
                  <Skeleton className="w-12 h-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-1.5 w-full mt-3" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                </div>
              </div>
            ))
          ) : fases && fases.length > 0 ? (
            fases.map((fase) => {
              const status = getStatus(fase);
              const config = getStatusConfig(status);
              const missoesCount = missoesCounts?.[fase.id] || 0;
              const progressoPct = Math.round((missoesCount / TOTAL_MISSOES_ESPERADAS) * 100);
              const semanaAtual = status === 'em_andamento' ? calcularSemanaAtual(fase.data_inicio) : null;
              
              return (
                <button
                  key={fase.id}
                  onClick={() => handleFaseClick(fase, status)}
                  className={cn(
                    "w-full text-left p-4 rounded-xl bg-white/5 border border-white/10",
                    "hover:bg-white/[0.07] transition-all duration-200",
                    "focus:outline-none focus:ring-2 focus:ring-white/20",
                    config.cardClass,
                    config.opacity
                  )}
                >
                  <div className="flex items-start gap-4">
                    {/* Brasão */}
                    <div className="flex-shrink-0">
                      <CasaBrasao
                        brasaoUrl={fase.inteligencias.brasao_url}
                        emoji={fase.inteligencias.emoji}
                        nome={fase.inteligencias.nome}
                        size="medium"
                      />
                    </div>

                    {/* Conteúdo */}
                    <div className="flex-1 min-w-0">
                      {/* Título e Tag */}
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base font-medium text-white truncate">
                          {fase.inteligencias.nome}
                        </h3>
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1",
                          config.tagClass
                        )}>
                          {config.icon}
                          {config.tag}
                        </span>
                      </div>

                      {/* Período e Semana */}
                      <p className="text-sm text-white/50 mb-3">
                        {format(new Date(fase.data_inicio), 'dd/MM', { locale: ptBR })} - {format(new Date(fase.data_fim), 'dd/MM/yyyy', { locale: ptBR })}
                        {semanaAtual && (
                          <span className="text-white/70"> · Semana {semanaAtual} de 4</span>
                        )}
                      </p>

                      {/* Barra de Progresso */}
                      <div className="mb-1.5">
                        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                          <div 
                            className={cn(
                              "h-full rounded-full transition-all duration-500",
                              getProgressColor(progressoPct)
                            )}
                            style={{ width: `${Math.min(progressoPct, 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* Contador de Missões */}
                      <p className={cn(
                        "text-xs",
                        missoesCount === 0 ? "text-red-400" : 
                        progressoPct < 50 ? "text-amber-400" : "text-white/50"
                      )}>
                        {missoesCount}/{TOTAL_MISSOES_ESPERADAS} missões configuradas
                      </p>
                    </div>

                    {/* Seta */}
                    <div className="flex-shrink-0 self-center">
                      <ChevronRight className="w-5 h-5 text-white/30" />
                    </div>
                  </div>
                </button>
              );
            })
          ) : (
            // Estado vazio
            <div className="text-center py-16">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                <Calendar className="w-8 h-8 text-white/30" />
              </div>
              <p className="text-white/60 text-sm">
                Nenhuma fase encontrada para {anoSelecionado}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FasesPage;
