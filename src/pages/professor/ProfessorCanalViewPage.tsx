import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Hash, Users, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfessor } from '@/contexts/ProfessorContext';
import { useEffect, useRef, useMemo } from 'react';
import { MensagemBubble } from '@/components/chat/MensagemBubble';
import { MensagemFixada } from '@/components/chat/MensagemFixada';
import { DateSeparator } from '@/components/chat/DateSeparator';
import { format } from 'date-fns';

const ProfessorCanalViewPage = () => {
  const { canalId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { casaMentor, profile } = useProfessor();
  const bottomRef = useRef<HTMLDivElement>(null);

  const casaColor = casaMentor?.cor_hex || '#6366f1';

  // Buscar dados do canal
  const { data: canal, isLoading: loadingCanal } = useQuery({
    queryKey: ['professor-canal', canalId],
    queryFn: async () => {
      const { data } = await supabase
        .from('canais_casa')
        .select('*')
        .eq('id', canalId)
        .single();
      return data;
    },
    enabled: !!canalId,
  });

  // Contagem de membros online
  const { data: onlineCount } = useQuery({
    queryKey: ['professor-canal-online', canal?.casa_id],
    queryFn: async () => {
      const cincoMinutosAtras = new Date(Date.now() - 5 * 60000).toISOString();
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('casa_id', canal!.casa_id)
        .gte('ultima_atividade', cincoMinutosAtras);
      return count || 0;
    },
    enabled: !!canal?.casa_id,
    refetchInterval: 60000,
  });

  // Buscar mensagens do canal
  const { data: mensagens, isLoading: loadingMensagens } = useQuery({
    queryKey: ['professor-mensagens-canal', canalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mensagens_canal')
        .select(`
          *,
          autor:profiles!mensagens_canal_autor_id_fkey(
            id, full_name, avatar_url,
            cargos_casa!cargos_casa_aluno_id_fkey(cargo, ativo)
          )
        `)
        .eq('canal_id', canalId!)
        .order('created_at', { ascending: true })
        .limit(100);
      
      if (error) {
        console.error('Erro ao buscar mensagens:', error);
        throw error;
      }
      
      return data || [];
    },
    enabled: !!canalId,
  });

  // Função para verificar se deve agrupar mensagens
  const deveAgrupar = (atual: typeof mensagens[0], anterior: typeof mensagens[0] | null) => {
    if (!anterior) return false;
    if (atual.autor?.id !== anterior.autor?.id) return false;
    
    const diffMinutos = (new Date(atual.created_at).getTime() - 
                         new Date(anterior.created_at).getTime()) / 60000;
    return diffMinutos < 5;
  };

  // Separar mensagens fixadas
  const mensagensFixadas = useMemo(() => {
    return mensagens?.filter(m => m.fixada) || [];
  }, [mensagens]);

  const mensagensNormais = useMemo(() => {
    return mensagens?.filter(m => !m.fixada) || [];
  }, [mensagens]);

  // Realtime: escutar novas mensagens
  useEffect(() => {
    if (!canalId) return;
    
    const channel = supabase
      .channel(`professor-canal-${canalId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'mensagens_canal',
        filter: `canal_id=eq.${canalId}`
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['professor-mensagens-canal', canalId] });
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [canalId, queryClient]);

  // Scroll automático para última mensagem
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens]);

  // Marcar canal como lido ao entrar
  useEffect(() => {
    const marcarComoLido = async () => {
      if (!canalId || !profile?.id) return;
      
      await supabase
        .from('canal_leituras')
        .upsert({
          canal_id: canalId,
          usuario_id: profile.id,
          ultima_leitura: new Date().toISOString()
        }, {
          onConflict: 'canal_id,usuario_id'
        });
      
      queryClient.invalidateQueries({ queryKey: ['professor-mensagens-nao-lidas'] });
      queryClient.invalidateQueries({ queryKey: ['professor-canal-leituras'] });
    };
    
    marcarComoLido();
  }, [canalId, profile?.id, queryClient]);

  if (loadingCanal) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-pulse text-white/60">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-140px)]">
      {/* Header */}
      <div className="flex items-center justify-between py-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/professor/chat')}
            className="text-white/60 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          {canal?.icone ? (
            <span className="text-lg">{canal.icone}</span>
          ) : (
            <Hash className="w-5 h-5 text-white/60" />
          )}
          <h1 className="text-lg font-bold text-white">
            #{canal?.nome || 'Canal'}
          </h1>
        </div>
        
        <div className="flex items-center gap-1.5 text-white/60 text-sm">
          <Users className="w-4 h-4" />
          <span>{onlineCount || 0}</span>
        </div>
      </div>

      {/* Mensagens Fixadas */}
      {mensagensFixadas.length > 0 && (
        <div className="py-3 space-y-2">
          {mensagensFixadas.map(msg => (
            <MensagemFixada
              key={msg.id}
              mensagem={msg}
              casaColor={casaColor}
            />
          ))}
        </div>
      )}

      {/* Área de mensagens */}
      <ScrollArea className="flex-1 px-1">
        <div className="py-4">
          {loadingMensagens ? (
            <div className="text-center text-white/40 py-8">
              Carregando mensagens...
            </div>
          ) : mensagensNormais.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
                style={{ backgroundColor: `${casaColor}20` }}
              >
                {canal?.icone ? (
                  <span className="text-2xl">{canal.icone}</span>
                ) : (
                  <Hash className="w-6 h-6" style={{ color: casaColor }} />
                )}
              </div>
              <h3 className="text-white font-medium mb-1">
                #{canal?.nome}
              </h3>
              <p className="text-white/50 text-sm max-w-xs">
                {canal?.descricao || 'Nenhuma mensagem ainda neste canal.'}
              </p>
            </div>
          ) : (
            mensagensNormais.map((msg, index) => (
              <MensagemBubble
                key={msg.id}
                mensagem={msg}
                isMe={false}
                casaColor={casaColor}
                agruparComAnterior={deveAgrupar(msg, mensagensNormais[index - 1] || null)}
              />
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Footer - Aviso Modo Observador (SEM input) */}
      <div className="py-3 border-t border-white/10">
        <div 
          className="p-3 rounded-xl text-center"
          style={{ 
            backgroundColor: 'rgba(234, 179, 8, 0.1)',
            border: '1px solid rgba(234, 179, 8, 0.2)'
          }}
        >
          <div className="flex items-center justify-center gap-2">
            <Eye className="w-4 h-4 text-yellow-400" />
            <span className="text-yellow-400 text-sm font-medium">
              Modo Observador
            </span>
          </div>
          <p className="text-yellow-400/60 text-xs mt-1">
            Não é possível enviar mensagens
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProfessorCanalViewPage;
