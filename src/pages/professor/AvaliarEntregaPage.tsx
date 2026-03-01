import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfessor } from '@/contexts/ProfessorContext';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { ArrowLeft, Eye, FileText, Image as ImageIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CasaBrasao } from '@/components/CasaBrasao';

const AvaliarEntregaPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile, casaColor } = useProfessor();

  const [nota, setNota] = useState<number | null>(null);
  const [feedback, setFeedback] = useState('');

  // Buscar dados da entrega
  const { data: entrega, isLoading } = useQuery({
    queryKey: ['entrega-avaliar', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('entregas')
        .select(`
          *,
          aluno:profiles!entregas_aluno_id_fkey(
            id,
            full_name,
            avatar_url,
            serie,
            turma,
            casa_id
          ),
          missao:missoes!entregas_missao_id_fkey(
            id,
            titulo,
            tipo,
            tipo_missao,
            pontos_base,
            semana,
            data_prazo,
            descricao,
            instrucoes
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error('Erro ao buscar entrega:', error);
        throw error;
      }

      return data;
    },
    enabled: !!id
  });

  // Buscar arquivos da entrega (com URLs assinadas)
  const { data: arquivos } = useQuery({
    queryKey: ['entrega-arquivos', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('entrega_arquivos')
        .select('*')
        .eq('entrega_id', id!);
      
      if (!data || data.length === 0) return [];

      // Generate fresh signed URLs from nome_storage
      const withSignedUrls = await Promise.all(
        data.map(async (arquivo) => {
          if (arquivo.nome_storage) {
            const { data: signedUrlData } = await supabase.storage
              .from('entregas')
              .createSignedUrl(arquivo.nome_storage, 3600); // 1 hour
            return { ...arquivo, url: signedUrlData?.signedUrl || arquivo.url };
          }
          return arquivo;
        })
      );
      return withSignedUrls;
    },
    enabled: !!id
  });

  // Buscar dados da casa do aluno
  const { data: casaAluno } = useQuery({
    queryKey: ['casa-aluno', entrega?.aluno?.casa_id],
    queryFn: async () => {
      const { data } = await supabase
        .from('inteligencias')
        .select('id, nome, emoji, cor_hex, brasao_url')
        .eq('id', entrega!.aluno!.casa_id!)
        .single();
      return data;
    },
    enabled: !!entrega?.aluno?.casa_id
  });

  // Calcular pontos baseado na nota
  const calcularPontos = (notaSelecionada: number) => {
    if (!entrega?.missao?.pontos_base) return 0;
    return Math.round((notaSelecionada / 10) * entrega.missao.pontos_base);
  };

  // Mutation para aprovar
  const aprovarMutation = useMutation({
    mutationFn: async () => {
      if (!nota) throw new Error('Selecione uma nota');
      if (!entrega) throw new Error('Entrega não encontrada');

      const pontosCalculados = calcularPontos(nota);

      // Atualizar entrega - O TRIGGER processar_entrega_aprovada
      // já cuida de registrar os pontos em pontos_gerais e criar evidências!
      const { error } = await supabase
        .from('entregas')
        .update({
          status: 'aprovada',
          nota,
          pontos_concedidos: pontosCalculados,
          feedback_professor: feedback || null,
          avaliado_por: profile?.id,
          data_avaliacao: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      return { pontosCalculados };
    },
    onSuccess: (data) => {
      toast.success(`Entrega aprovada! ${data.pontosCalculados} pontos concedidos.`);
      queryClient.invalidateQueries({ queryKey: ['entregas'] });
      queryClient.invalidateQueries({ queryKey: ['entrega-avaliar'] });
      queryClient.invalidateQueries({ queryKey: ['entregas-pendentes-count'] });
      queryClient.invalidateQueries({ queryKey: ['app-badge-count'] });
      setTimeout(() => {
        // Voltar para a lista de entregas da missão
        if (entrega?.missao?.id) {
          navigate(`/professor/entregas/missao/${entrega.missao.id}`, { replace: true });
        } else {
          navigate('/professor/entregas', { replace: true });
        }
      }, 100);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao aprovar entrega');
    }
  });

  // Mutation para pedir refazer
  const refazerMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('entregas')
        .update({
          status: 'refazer',
          feedback_professor: feedback || 'Por favor, refaça a atividade seguindo as instruções.',
          avaliado_por: profile?.id,
          data_avaliacao: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.info('Solicitado que o aluno refaça a atividade');
      queryClient.invalidateQueries({ queryKey: ['entregas'] });
      queryClient.invalidateQueries({ queryKey: ['entrega-avaliar'] });
      queryClient.invalidateQueries({ queryKey: ['entregas-pendentes-count'] });
      queryClient.invalidateQueries({ queryKey: ['app-badge-count'] });
      setTimeout(() => {
        // Voltar para a lista de entregas da missão
        if (entrega?.missao?.id) {
          navigate(`/professor/entregas/missao/${entrega.missao.id}`, { replace: true });
        } else {
          navigate('/professor/entregas', { replace: true });
        }
      }, 100);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao solicitar refazer');
    }
  });

  // Tempo de espera
  const tempoEspera = entrega?.created_at
    ? formatDistanceToNow(new Date(entrega.created_at), { addSuffix: false, locale: ptBR })
    : '';

  // Formatar data
  const formatarData = (dataStr: string | null) => {
    if (!dataStr) return 'N/A';
    return new Date(dataStr).toLocaleDateString('pt-BR');
  };

  const formatarDataHora = (dataStr: string | null) => {
    if (!dataStr) return 'N/A';
    const data = new Date(dataStr);
    return `${data.toLocaleDateString('pt-BR')} às ${data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  };

  // Obter cor da nota
  const getNotaColor = (n: number, isSelected: boolean) => {
    if (!isSelected) return 'bg-white/10 text-white/60 hover:bg-white/20';
    if (n >= 7) return 'bg-green-600 text-white';
    if (n >= 5) return 'bg-yellow-600 text-white';
    return 'bg-red-600 text-white';
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-white/50" />
        <p className="text-white/50 mt-4">Carregando entrega...</p>
      </div>
    );
  }

  if (!entrega) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-white/50">Entrega não encontrada</p>
        <button
          onClick={() => navigate('/professor/entregas')}
          className="mt-4 text-sm text-white/60 hover:text-white underline"
        >
          Voltar
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0d0d]">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-white/10">
        <button 
          onClick={() => {
            if (entrega?.missao?.id) {
              navigate(`/professor/entregas/missao/${entrega.missao.id}`, { replace: true });
            } else {
              navigate('/professor/entregas', { replace: true });
            }
          }}
          className="text-white/60 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-semibold text-white">Avaliar Entrega</h1>
      </div>

      <div className="p-4 space-y-4 pb-8">
        {/* Card da Missão */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-xs text-white/40 uppercase tracking-wider mb-2">📋 Missão</p>
          <h2 className="text-lg font-semibold text-white mb-1">
            {entrega.missao?.titulo}
          </h2>
          <p className="text-sm text-white/60">
            {entrega.missao?.tipo_missao === 'geral' ? 'Geral' : 'Individual'} • {entrega.missao?.pontos_base} pts • Semana {entrega.missao?.semana || '?'}
          </p>
          <p className="text-xs text-white/40 mt-1">
            Prazo: {formatarData(entrega.missao?.data_prazo)}
          </p>
        </div>

        {/* Card do Aluno */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-xs text-white/40 uppercase tracking-wider mb-3">👤 Aluno</p>
          
          <div className="flex items-center gap-3 mb-3">
            {/* Avatar */}
            <div className="w-12 h-12 rounded-full overflow-hidden bg-white/10 flex items-center justify-center">
              {entrega.aluno?.avatar_url ? (
                <img 
                  src={entrega.aluno.avatar_url} 
                  alt="" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-2xl">👤</span>
              )}
            </div>
            
            {/* Info */}
            <div className="flex-1">
              <h3 className="text-white font-medium">{entrega.aluno?.full_name}</h3>
              <div className="flex items-center gap-2 text-sm text-white/60">
                <span>{entrega.aluno?.serie}º{entrega.aluno?.turma}</span>
                <span>•</span>
                <div className="flex items-center gap-1">
                  {casaAluno && (
                    <CasaBrasao 
                      brasaoUrl={casaAluno.brasao_url}
                      emoji={casaAluno.emoji}
                      nome={casaAluno.nome}
                      size="mini"
                    />
                  )}
                  <span style={{ color: casaAluno?.cor_hex || '#fff' }}>
                    {casaAluno?.nome}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-1 text-sm">
            <p className="text-white/60">
              📅 Entregue: {formatarDataHora(entrega.created_at)}
            </p>
            <p className="text-yellow-400/80">
              ⏰ Aguardando há {tempoEspera}
            </p>
          </div>
        </div>

        {/* Resposta do Aluno */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-xs text-white/40 uppercase tracking-wider mb-3">📝 Resposta do Aluno</p>
          
          {entrega.texto_resposta ? (
            <div className="bg-black/30 rounded-lg p-3">
              <p className="text-white/90 text-sm whitespace-pre-wrap">
                {entrega.texto_resposta}
              </p>
            </div>
          ) : (
            <p className="text-white/40 text-sm italic">Nenhuma resposta em texto</p>
          )}
        </div>

        {/* Arquivos Anexados */}
        {arquivos && arquivos.length > 0 && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <p className="text-xs text-white/40 uppercase tracking-wider mb-3">📎 Arquivos Anexados</p>
            <div className="space-y-2">
              {arquivos.map((arquivo) => (
                <a
                  key={arquivo.id}
                  href={arquivo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 bg-black/20 rounded-lg hover:bg-black/30 transition-colors"
                >
                  <div className="flex items-center gap-2 text-white/80">
                    {arquivo.tipo_arquivo?.includes('image') ? (
                      <ImageIcon className="w-4 h-4" />
                    ) : (
                      <FileText className="w-4 h-4" />
                    )}
                    <span className="text-sm truncate max-w-[200px]">
                      {arquivo.nome_original || 'Arquivo'}
                    </span>
                  </div>
                  <Eye className="w-4 h-4 text-white/40" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Seção de Avaliação */}
        {entrega.status === 'aprovada' ? (
          // Entrega já aprovada - mostrar resumo, NÃO permitir refazer
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">✅</span>
              <p className="text-green-400 font-semibold">Entrega Aprovada</p>
            </div>
            <div className="space-y-2 text-sm">
              <p className="text-white/80">
                <strong>Nota:</strong> {entrega.nota}/10
              </p>
              <p className="text-white/80">
                <strong>Pontos concedidos:</strong> {entrega.pontos_concedidos} pts
              </p>
              {entrega.feedback_professor && (
                <div className="mt-3 pt-3 border-t border-white/10">
                  <p className="text-white/60 text-xs uppercase mb-1">Feedback:</p>
                  <p className="text-white/80">{entrega.feedback_professor}</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          // Entrega pendente ou refazer - mostrar formulário completo
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-4">
            <p className="text-xs text-white/40 uppercase tracking-wider">⭐ Avaliação</p>
            
            {/* Seletor de Nota */}
            <div>
              <p className="text-sm text-white/70 mb-2">Nota (1-10):</p>
              <div className="grid grid-cols-10 gap-1">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setNota(n)}
                    className={cn(
                      "py-3 rounded-lg text-center font-bold transition-colors text-sm",
                      getNotaColor(n, nota === n)
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Pontos calculados */}
            {nota && (
              <div 
                className="p-3 rounded-lg"
                style={{ backgroundColor: `${casaColor}20` }}
              >
                <p className="text-sm text-white/80">
                  💰 Pontos calculados: <strong className="text-white">{calcularPontos(nota)} pts</strong>
                  <span className="text-white/50 ml-1">
                    (nota {nota}/10 de {entrega.missao?.pontos_base} pts)
                  </span>
                </p>
              </div>
            )}

            {/* Feedback */}
            <div>
              <p className="text-sm text-white/70 mb-2">Feedback para o aluno (opcional):</p>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Escreva um comentário sobre o trabalho do aluno..."
                rows={3}
                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/30 resize-none focus:outline-none focus:border-white/30"
              />
            </div>

            {/* Botões de ação */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => refazerMutation.mutate()}
                disabled={refazerMutation.isPending}
                className="flex-1 py-3 bg-yellow-600/20 border border-yellow-600/50 text-yellow-400 rounded-lg font-medium hover:bg-yellow-600/30 disabled:opacity-50 transition-colors"
              >
                {refazerMutation.isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Enviando...
                  </span>
                ) : (
                  '🔄 Pedir Refazer'
                )}
              </button>
              
              <button
                type="button"
                onClick={() => aprovarMutation.mutate()}
                disabled={!nota || aprovarMutation.isPending}
                className="flex-1 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {aprovarMutation.isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Aprovando...
                  </span>
                ) : (
                  '✅ Aprovar'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AvaliarEntregaPage;
