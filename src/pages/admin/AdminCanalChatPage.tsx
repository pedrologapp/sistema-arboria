import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Hash, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useRef, useMemo } from 'react';
import { MensagemBubble } from '@/components/chat/MensagemBubble';
import { MensagemFixada } from '@/components/chat/MensagemFixada';
import { DateSeparator } from '@/components/chat/DateSeparator';
import { format } from 'date-fns';
import { ChatInput } from '@/components/chat/ChatInput';

const AdminCanalChatPage = () => {
  const { canalId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const bottomRef = useRef<HTMLDivElement>(null);

  // Buscar perfil do admin
  const { data: profile } = useQuery({
    queryKey: ['admin-profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from('profiles')
        .select('id, institution_id, full_name, avatar_url')
        .eq('id', user.id)
        .single();
      return data;
    },
  });

  // Buscar dados do canal
  const { data: canal, isLoading: loadingCanal } = useQuery({
    queryKey: ['admin-canal-detail', canalId],
    queryFn: async () => {
      const { data } = await supabase
        .from('canais_casa')
        .select('*, casa:inteligencias(nome, emoji, cor_hex)')
        .eq('id', canalId)
        .single();
      return data;
    },
    enabled: !!canalId,
  });

  const isConselho = canal?.tipo === 'conselho_lideres';
  const casaColor = isConselho
    ? '#eab308'
    : (canal?.casa as any)?.cor_hex || '#6366f1';

  // Buscar mensagens — no conselho, incluir casa_id info do autor
  const { data: mensagens, isLoading: loadingMensagens } = useQuery({
    queryKey: ['admin-mensagens-canal', canalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mensagens_canal')
        .select(`
          *,
          autor:profiles!mensagens_canal_autor_id_fkey(
            id, full_name, avatar_url, casa_id,
            cargos_casa!cargos_casa_aluno_id_fkey(cargo, ativo),
            casa:inteligencias(nome, emoji, cor_hex)
          )
        `)
        .eq('canal_id', canalId!)
        .order('created_at', { ascending: true })
        .limit(200);

      if (error) throw error;
      return data || [];
    },
    enabled: !!canalId,
  });

  const mensagensFixadas = useMemo(() => mensagens?.filter(m => m.fixada) || [], [mensagens]);
  const mensagensNormais = useMemo(() => mensagens?.filter(m => !m.fixada) || [], [mensagens]);

  const deveAgrupar = (atual: any, anterior: any) => {
    if (!anterior) return false;
    if (atual.autor?.id !== anterior.autor?.id) return false;
    const diff = (new Date(atual.created_at).getTime() - new Date(anterior.created_at).getTime()) / 60000;
    return diff < 5;
  };

  // Realtime
  useEffect(() => {
    if (!canalId) return;
    const channel = supabase
      .channel(`admin-canal-${canalId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'mensagens_canal',
        filter: `canal_id=eq.${canalId}`
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['admin-mensagens-canal', canalId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [canalId, queryClient]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens]);

  // Marcar como lido
  useEffect(() => {
    if (!canalId || !profile?.id) return;
    supabase.from('canal_leituras').upsert({
      canal_id: canalId,
      usuario_id: profile.id,
      ultima_leitura: new Date().toISOString()
    }, { onConflict: 'canal_id,usuario_id' });
  }, [canalId, profile?.id]);

  const enviarMensagem = async (conteudo: string) => {
    if (!conteudo.trim() || !canalId || !profile?.id || !profile?.institution_id) return;
    await supabase.from('mensagens_canal').insert({
      canal_id: canalId,
      institution_id: profile.institution_id,
      autor_id: profile.id,
      conteudo: conteudo.trim()
    });
  };

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
            onClick={() => navigate('/admin/chat')}
            className="text-white/60 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          {isConselho ? (
            <Crown className="w-5 h-5 text-yellow-400" />
          ) : canal?.icone ? (
            <span className="text-lg">{canal.icone}</span>
          ) : (
            <Hash className="w-5 h-5 text-white/60" />
          )}
          <div>
            <h1 className="text-lg font-bold text-white">
              {isConselho ? 'Conselho de Líderes' : `#${canal?.nome || 'Canal'}`}
            </h1>
            {!isConselho && (canal?.casa as any)?.nome && (
              <span className="text-xs text-white/40">
                {(canal?.casa as any)?.emoji} {(canal?.casa as any)?.nome}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Mensagens Fixadas */}
      {mensagensFixadas.length > 0 && (
        <div className="py-3 space-y-2">
          {mensagensFixadas.map(msg => (
            <MensagemFixada key={msg.id} mensagem={msg} casaColor={casaColor} />
          ))}
        </div>
      )}

      {/* Área de mensagens */}
      <ScrollArea className="flex-1 px-1">
        <div className="py-4">
          {loadingMensagens ? (
            <div className="text-center text-white/40 py-8">Carregando mensagens...</div>
          ) : mensagensNormais.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
                style={{ backgroundColor: `${casaColor}20` }}
              >
                {isConselho ? (
                  <Crown className="w-6 h-6 text-yellow-400" />
                ) : (
                  <Hash className="w-6 h-6" style={{ color: casaColor }} />
                )}
              </div>
              <h3 className="text-white font-medium mb-1">
                {isConselho ? 'Conselho de Líderes' : `#${canal?.nome}`}
              </h3>
              <p className="text-white/50 text-sm max-w-xs">
                {canal?.descricao || 'Seja o primeiro a enviar uma mensagem!'}
              </p>
            </div>
          ) : (
            mensagensNormais.map((msg, index) => {
              const autorCasa = isConselho ? (msg.autor as any)?.casa : null;
              const msgCasaColor = autorCasa?.cor_hex || casaColor;
              const dataAtual = format(new Date(msg.created_at), 'yyyy-MM-dd');
              const dataAnterior = index > 0 ? format(new Date(mensagensNormais[index - 1].created_at), 'yyyy-MM-dd') : null;
              const mostrarData = dataAtual !== dataAnterior;

              return (
                <div key={msg.id}>
                  {mostrarData && <DateSeparator date={msg.created_at} />}
                  <MensagemBubble
                    mensagem={msg}
                    isMe={msg.autor?.id === profile?.id}
                    casaColor={msgCasaColor}
                    agruparComAnterior={!mostrarData && deveAgrupar(msg, mensagensNormais[index - 1] || null)}
                    casaBadge={isConselho ? { nome: autorCasa?.nome, emoji: autorCasa?.emoji, cor: autorCasa?.cor_hex } : undefined}
                  />
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="pt-3 pb-2">
        <ChatInput onEnviar={enviarMensagem} casaColor={casaColor} />
      </div>
    </div>
  );
};

export default AdminCanalChatPage;
