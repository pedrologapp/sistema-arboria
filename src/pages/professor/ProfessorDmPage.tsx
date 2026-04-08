import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfessor } from '@/contexts/ProfessorContext';
import { useEffect, useRef } from 'react';
import { ChatInput } from '@/components/chat/ChatInput';
import { StatusIndicator } from '@/components/chat/StatusIndicator';
import { MensagemBubble } from '@/components/chat/MensagemBubble';

interface MensagemPrivada {
  id: string;
  conteudo: string;
  created_at: string;
  autor_id: string;
  autor: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface OutroParticipante {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  ultima_atividade: string | null;
}

// Função para agrupar mensagens do mesmo autor
const deveAgrupar = (atual: MensagemPrivada, anterior: MensagemPrivada | null): boolean => {
  if (!anterior) return false;
  if (atual.autor?.id !== anterior.autor?.id) return false;
  
  const diffMinutos = (
    new Date(atual.created_at).getTime() - 
    new Date(anterior.created_at).getTime()
  ) / 60000;
  
  return diffMinutos < 5;
};

const ProfessorDmPage = () => {
  const { conversaId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile, casaMentor } = useProfessor();
  const bottomRef = useRef<HTMLDivElement>(null);

  const casaColor = casaMentor?.cor_hex || '#6366F1';

  // Buscar dados do outro participante (aluno)
  const { data: outroParticipante, isLoading: loadingParticipante } = useQuery({
    queryKey: ['professor-dm-conversa', conversaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('conversa_participantes')
        .select(`
          usuario:profiles!usuario_id(
            id, full_name, avatar_url, ultima_atividade
          )
        `)
        .eq('conversa_id', conversaId!)
        .neq('usuario_id', profile?.id!)
        .single();
      
      if (error) throw error;
      return data?.usuario as OutroParticipante | null;
    },
    enabled: !!conversaId && !!profile?.id,
  });

  // Buscar mensagens
  const { data: mensagens, isLoading: loadingMensagens } = useQuery({
    queryKey: ['professor-dm-mensagens', conversaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mensagens_privadas')
        .select(`
          *,
          autor:profiles!autor_id(
            id, full_name, avatar_url
          )
        `)
        .eq('conversa_id', conversaId!)
        .order('created_at', { ascending: true })
        .limit(100);
      
      if (error) throw error;
      return (data || []) as MensagemPrivada[];
    },
    enabled: !!conversaId,
  });

  // Marcar como lida ao abrir
  useEffect(() => {
    const marcarComoLido = async () => {
      if (!conversaId || !profile?.id) return;
      
      await supabase
        .from('conversa_participantes')
        .update({ ultima_leitura: new Date().toISOString() })
        .eq('conversa_id', conversaId)
        .eq('usuario_id', profile.id);
      
      queryClient.invalidateQueries({ queryKey: ['professor-dms-nao-lidas'] });
    };
    
    marcarComoLido();
  }, [conversaId, profile?.id, queryClient]);

  // Realtime para novas mensagens
  useEffect(() => {
    if (!conversaId) return;
    
    const channel = supabase
      .channel(`professor-dm-${conversaId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'mensagens_privadas',
        filter: `conversa_id=eq.${conversaId}`
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['professor-dm-mensagens', conversaId] });
        // Atualizar leitura quando receber nova mensagem
        if (profile?.id) {
          supabase
            .from('conversa_participantes')
            .update({ ultima_leitura: new Date().toISOString() })
            .eq('conversa_id', conversaId)
            .eq('usuario_id', profile.id);
        }
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversaId, queryClient, profile?.id]);

  // Scroll automático para última mensagem
  useEffect(() => {
    if (mensagens && mensagens.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [mensagens]);

  // Enviar mensagem
  const enviarMensagem = async (conteudo: string) => {
    if (!conteudo.trim() || !conversaId || !profile?.id) return;
    
    const { error } = await supabase.from('mensagens_privadas').insert({
      conversa_id: conversaId,
      autor_id: profile.id,
      conteudo: conteudo.trim()
    });
    
    if (error) {
      console.error('Erro ao enviar mensagem:', error);
      return;
    }
    
    // Atualizar timestamp da conversa
    await supabase
      .from('conversas_privadas')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversaId);
    
    queryClient.invalidateQueries({ queryKey: ['professor-dm-mensagens', conversaId] });
  };

  const nomeAluno = outroParticipante?.full_name || 'Aluno';
  const iniciaisAluno = nomeAluno.slice(0, 2).toUpperCase();

  if (loadingParticipante) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white/60" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-140px)]">
      {/* Header */}
      <div className="flex items-center justify-between py-3 border-b border-violet-500/10">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate('/professor/chat')}
            className="text-white/60 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          
          <div className="relative">
            <Avatar className="h-9 w-9">
              <AvatarImage src={outroParticipante?.avatar_url || undefined} alt={nomeAluno} />
              <AvatarFallback className="bg-white/10 text-white/70 text-sm">
                {iniciaisAluno}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-0.5 -right-0.5 border-2 border-background rounded-full">
              <StatusIndicator 
                ultimaAtividade={outroParticipante?.ultima_atividade || null} 
                size="sm" 
              />
            </div>
          </div>
          
          <div>
            <span className="font-medium text-white">{nomeAluno}</span>
          </div>
        </div>
        
        <Button variant="ghost" size="icon" className="text-white/60 hover:text-white">
          <MoreHorizontal className="w-5 h-5" />
        </Button>
      </div>

      {/* Mensagens */}
      <ScrollArea className="flex-1 px-2 py-4">
        {loadingMensagens ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-white/40" />
          </div>
        ) : mensagens && mensagens.length > 0 ? (
          <>
            {mensagens.map((msg, index) => (
              <MensagemBubble
                key={msg.id}
                mensagem={{
                  id: msg.id,
                  conteudo: msg.conteudo,
                  created_at: msg.created_at,
                  tipo: null,
                  fixada: null,
                  autor: msg.autor ? {
                    id: msg.autor.id,
                    full_name: msg.autor.full_name,
                    avatar_url: msg.autor.avatar_url,
                    cargos_casa: []
                  } : { id: '', full_name: 'Usuário', avatar_url: null, cargos_casa: [] }
                }}
                isMe={msg.autor?.id === profile?.id}
                casaColor={casaColor}
                agruparComAnterior={deveAgrupar(msg, mensagens[index - 1] || null)}
              />
            ))}
            <div ref={bottomRef} />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <Avatar className="h-10 w-10">
                <AvatarImage src={outroParticipante?.avatar_url || undefined} />
                <AvatarFallback className="bg-white/10 text-white/50">
                  {iniciaisAluno}
                </AvatarFallback>
              </Avatar>
            </div>
            <p className="text-white/60 text-sm">
              Inicie uma conversa com {nomeAluno}
            </p>
          </div>
        )}
      </ScrollArea>

      {/* Input - Professor PODE enviar DMs */}
      <div className="pt-3 pb-2 border-t border-violet-500/10">
        <ChatInput
          onEnviar={enviarMensagem}
          casaColor={casaColor}
          placeholder={`Mensagem para ${nomeAluno}...`}
        />
      </div>
    </div>
  );
};

export default ProfessorDmPage;
