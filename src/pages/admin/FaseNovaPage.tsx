import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { CasaBrasao } from '@/components/CasaBrasao';

type Segmento = 'infantil' | 'fundamental1' | 'fundamental2';

const segmentoLabels: Record<Segmento, string> = {
  infantil: 'Infantil',
  fundamental1: 'Fundamental 1',
  fundamental2: 'Fundamental 2',
};

interface LocationState {
  inteligencia: {
    id: number;
    nome: string;
    codigo: string;
    emoji: string | null;
    cor_hex: string | null;
    brasao_url: string | null;
  };
  anoLetivo: number;
  segmento: Segmento;
}

const FaseNovaPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  const state = location.state as LocationState | null;
  
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  // Se não tiver state, voltar para a lista
  if (!state) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/60 mb-4">Dados da fase não encontrados</p>
          <button
            onClick={() => navigate('/admin/fases')}
            className="px-4 py-2 bg-white text-black rounded-xl"
          >
            Voltar para Fases
          </button>
        </div>
      </div>
    );
  }

  const { inteligencia, anoLetivo, segmento } = state;

  const criarMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Usuário não autenticado');
      
      // Buscar institution_id do admin
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('institution_id')
        .eq('id', user.id)
        .single();
      
      if (profileError || !profile?.institution_id) {
        throw new Error('Instituição não encontrada');
      }

      // Buscar próximo número de fase para este segmento
      const { data: fasesExistentes } = await supabase
        .from('fases')
        .select('numero_fase')
        .eq('institution_id', profile.institution_id)
        .eq('ano_letivo', anoLetivo)
        .eq('segmento', segmento)
        .order('numero_fase', { ascending: false })
        .limit(1);

      const proximoNumero = fasesExistentes && fasesExistentes.length > 0 
        ? fasesExistentes[0].numero_fase + 1 
        : 1;

      // Criar a fase
      const { data, error } = await supabase
        .from('fases')
        .insert({
          institution_id: profile.institution_id,
          inteligencia_id: inteligencia.id,
          ano_letivo: anoLetivo,
          numero_fase: proximoNumero,
          data_inicio: dataInicio,
          data_fim: dataFim,
          segmento: segmento,
          ativo: false,
          semana_atual: 1
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success('Fase criada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['fases-admin'] });
      // Redirecionar para detalhes da fase criada
      navigate(`/admin/fases/${data.id}`);
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar fase: ' + error.message);
    }
  });

  const handleCriar = () => {
    if (!dataInicio || !dataFim) {
      toast.error('Preencha as datas de início e fim');
      return;
    }

    if (new Date(dataFim) < new Date(dataInicio)) {
      toast.error('A data de fim deve ser posterior à data de início');
      return;
    }

    criarMutation.mutate();
  };

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
          <CasaBrasao 
            brasaoUrl={inteligencia.brasao_url}
            emoji={inteligencia.emoji}
            nome={inteligencia.nome}
            size="medium"
          />
          <div>
            <h1 className="text-xl font-bold text-white">
              Nova Fase: {inteligencia.nome}
            </h1>
            <p className="text-white/60 text-sm">
              {segmentoLabels[segmento]} • {anoLetivo}
            </p>
          </div>
        </div>
      </div>

      {/* Formulário */}
      <div className="p-4 space-y-6">
        {/* Info do segmento */}
        <div className="p-3 bg-white/5 border border-white/10 rounded-xl">
          <p className="text-white/60 text-sm">
            Esta fase será criada para o segmento <strong className="text-white">{segmentoLabels[segmento]}</strong>
          </p>
        </div>

        {/* Datas */}
        <div className="bg-[#1E293B] rounded-xl p-4 space-y-4">
          <h2 className="text-white font-semibold text-sm uppercase tracking-wider">
            Período da Fase
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
          
          <p className="text-white/40 text-xs">
            A fase será dividida automaticamente em 4 semanas
          </p>
        </div>

        {/* Botão Criar */}
        <button
          onClick={handleCriar}
          disabled={criarMutation.isPending || !dataInicio || !dataFim}
          className="w-full p-4 bg-white text-black font-medium rounded-xl hover:bg-white/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {criarMutation.isPending ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Criando...
            </>
          ) : (
            'Criar Fase'
          )}
        </button>
      </div>
    </div>
  );
};

export default FaseNovaPage;
