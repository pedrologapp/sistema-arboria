import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  ArrowLeft,
  Calendar,
  FileText,
  Target,
  Check,
  Circle,
  Loader2
} from 'lucide-react';
import { addDays, differenceInDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { agoraBrasil } from '@/utils/timezone';
import { CasaBrasao } from '@/components/CasaBrasao';

type TabType = 'periodo' | 'conteudo' | 'missoes';
type StatusType = 'bloqueada' | 'proxima' | 'em_andamento' | 'concluida';

const FaseDetalhesPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [tabAtiva, setTabAtiva] = useState<TabType>('periodo');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [status, setStatus] = useState<StatusType>('bloqueada');
  const [hasChanges, setHasChanges] = useState(false);

  // Buscar dados da fase com inteligência
  const { data: fase, isLoading } = useQuery({
    queryKey: ['fase-detalhe', id],
    queryFn: async () => {
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
            id,
            nome,
            codigo,
            emoji,
            cor_hex,
            brasao_url
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id
  });

  // Preencher campos quando carregar
  useEffect(() => {
    if (fase) {
      setDataInicio(fase.data_inicio || '');
      setDataFim(fase.data_fim || '');
      // Determinar status baseado no campo ativo
      if (fase.ativo) {
        setStatus('em_andamento');
      } else {
        // Se não está ativo, verificar datas para determinar status
        const agora = agoraBrasil();
        const inicio = fase.data_inicio ? new Date(fase.data_inicio) : null;
        const fim = fase.data_fim ? new Date(fase.data_fim) : null;
        
        if (fim && agora > fim) {
          setStatus('concluida');
        } else if (inicio && agora < inicio) {
          setStatus('proxima');
        } else {
          setStatus('bloqueada');
        }
      }
    }
  }, [fase]);

  // Calcular semanas automaticamente
  const semanas = useMemo(() => {
    if (!dataInicio || !dataFim) return [];

    const inicio = new Date(dataInicio);
    const fim = new Date(dataFim);
    const totalDias = differenceInDays(fim, inicio) + 1;
    const diasPorSemana = Math.ceil(totalDias / 4);
    
    const agora = agoraBrasil();
    const resultado = [];

    for (let i = 0; i < 4; i++) {
      const semanaInicio = addDays(inicio, i * diasPorSemana);
      const semanaFim = i === 3 
        ? fim 
        : addDays(semanaInicio, diasPorSemana - 1);

      let statusSemana: 'concluida' | 'atual' | 'futura' = 'futura';
      if (agora > semanaFim) {
        statusSemana = 'concluida';
      } else if (agora >= semanaInicio && agora <= semanaFim) {
        statusSemana = 'atual';
      }

      resultado.push({
        numero: i + 1,
        inicio: semanaInicio,
        fim: semanaFim,
        status: statusSemana
      });
    }

    return resultado;
  }, [dataInicio, dataFim]);

  // Mutation para salvar
  const salvarMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('fases')
        .update({
          data_inicio: dataInicio,
          data_fim: dataFim,
          ativo: status === 'em_andamento',
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Fase atualizada com sucesso');
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ['fase-detalhe', id] });
      queryClient.invalidateQueries({ queryKey: ['fases-admin'] });
    },
    onError: (error) => {
      toast.error('Erro ao salvar: ' + error.message);
    }
  });

  // Detectar mudanças
  useEffect(() => {
    if (fase) {
      const statusOriginal = fase.ativo ? 'em_andamento' : 'bloqueada';
      const mudou = 
        dataInicio !== (fase.data_inicio || '') ||
        dataFim !== (fase.data_fim || '') ||
        (status === 'em_andamento') !== fase.ativo;
      setHasChanges(mudou);
    }
  }, [dataInicio, dataFim, status, fase]);

  // Configuração das tabs
  const tabs = [
    { id: 'periodo' as TabType, label: 'Período', icon: Calendar },
    { id: 'conteudo' as TabType, label: 'Conteúdo', icon: FileText },
    { id: 'missoes' as TabType, label: 'Missões', icon: Target },
  ];

  // Status options
  const statusOptions = [
    { value: 'bloqueada', label: 'Bloqueada' },
    { value: 'proxima', label: 'Próxima' },
    { value: 'em_andamento', label: 'Em andamento' },
    { value: 'concluida', label: 'Concluída' },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white/60 animate-spin" />
      </div>
    );
  }

  if (!fase) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <p className="text-white/60">Fase não encontrada</p>
      </div>
    );
  }

  const inteligencia = fase.inteligencias;

  return (
    <div className="min-h-screen bg-[#0A0A0A] pb-24">
      {/* Header */}
      <div className="p-4">
        <button
          onClick={() => navigate('/admin/fases')}
          className="flex items-center gap-2 text-white/60 hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Voltar</span>
        </button>
        
        <div className="flex items-center gap-4">
          {inteligencia && (
            <CasaBrasao 
              brasaoUrl={inteligencia.brasao_url}
              emoji={inteligencia.emoji}
              nome={inteligencia.nome}
              size="medium"
            />
          )}
          <div>
            <h1 className="text-xl font-bold text-white">
              {inteligencia?.nome || 'Inteligência'}
            </h1>
            <p className="text-white/60 text-sm">
              Fase {fase.numero_fase} de 8
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 px-4">
        {tabs.map((tab) => {
          const IconTab = tab.icon;
          const isActive = tabAtiva === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => setTabAtiva(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                isActive 
                  ? 'text-white border-b-2 border-white' 
                  : 'text-white/40 hover:text-white/60'
              }`}
            >
              <IconTab className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Conteúdo da Tab */}
      <div className="p-4 space-y-6">
        {tabAtiva === 'periodo' && (
          <>
            {/* Datas */}
            <div className="bg-[#1E293B] rounded-xl p-4 space-y-4">
              <h2 className="text-white font-semibold text-sm uppercase tracking-wider">
                Datas da Fase
              </h2>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-white/60 text-sm">
                    Data início
                  </label>
                  <input
                    type="date"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-white/20"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-white/60 text-sm">
                    Data fim
                  </label>
                  <input
                    type="date"
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                    className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-white/20"
                  />
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="bg-[#1E293B] rounded-xl p-4 space-y-4">
              <h2 className="text-white font-semibold text-sm uppercase tracking-wider">
                Status
              </h2>
              
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as StatusType)}
                className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-white/20 appearance-none cursor-pointer"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value} className="bg-[#1E293B]">
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Semanas */}
            {semanas.length > 0 && (
              <div className="bg-[#1E293B] rounded-xl p-4 space-y-4">
                <div>
                  <h2 className="text-white font-semibold text-sm uppercase tracking-wider">
                    Semanas
                  </h2>
                  <p className="text-white/40 text-xs mt-1">
                    Calculadas automaticamente com base nas datas
                  </p>
                </div>
                
                <div className="space-y-3">
                  {semanas.map((semana) => (
                    <div
                      key={semana.numero}
                      className={`p-3 rounded-xl border transition-colors ${
                        semana.status === 'atual'
                          ? 'bg-green-500/10 border-green-500/30'
                          : 'bg-white/5 border-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {/* Indicador de status */}
                          {semana.status === 'concluida' ? (
                            <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                              <Check className="w-4 h-4 text-green-500" />
                            </div>
                          ) : semana.status === 'atual' ? (
                            <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center animate-pulse">
                              <div className="w-2 h-2 rounded-full bg-white" />
                            </div>
                          ) : (
                            <Circle className="w-6 h-6 text-white/20" />
                          )}
                          
                          <div>
                            <p className={`font-medium text-sm ${
                              semana.status === 'atual' ? 'text-green-400' : 'text-white'
                            }`}>
                              Semana {semana.numero}
                            </p>
                            <p className={`text-xs ${
                              semana.status === 'concluida' ? 'text-white/60' :
                              semana.status === 'atual' ? 'text-green-400/80' :
                              'text-white/40'
                            }`}>
                              {semana.status === 'concluida' && 'Concluída'}
                              {semana.status === 'atual' && 'Atual'}
                              {semana.status === 'futura' && 'Futura'}
                            </p>
                          </div>
                        </div>
                        
                        <p className="text-white/60 text-sm">
                          {format(semana.inicio, 'dd/MM', { locale: ptBR })} - {format(semana.fim, 'dd/MM', { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Botão Salvar */}
            {hasChanges && (
              <button
                onClick={() => salvarMutation.mutate()}
                disabled={salvarMutation.isPending}
                className="w-full p-4 bg-white text-black font-medium rounded-xl hover:bg-white/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {salvarMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar Alterações'
                )}
              </button>
            )}
          </>
        )}

        {tabAtiva === 'conteudo' && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="w-12 h-12 text-white/20 mb-4" />
            <h3 className="text-white font-medium mb-2">Tab Conteúdo</h3>
            <p className="text-white/40 text-sm">
              Será implementada no próximo prompt
            </p>
          </div>
        )}

        {tabAtiva === 'missoes' && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Target className="w-12 h-12 text-white/20 mb-4" />
            <h3 className="text-white font-medium mb-2">Tab Missões</h3>
            <p className="text-white/40 text-sm">
              Será implementada no próximo prompt
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FaseDetalhesPage;
