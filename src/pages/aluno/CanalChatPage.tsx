import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Hash, Users } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStudent } from '@/contexts/StudentContext';
import { useEffect, useRef, useMemo } from 'react';
import { MensagemBubble } from '@/components/chat/MensagemBubble';
import { DateSeparator } from '@/components/chat/DateSeparator';
import { format } from 'date-fns';
import { MensagemFixada } from '@/components/chat/MensagemFixada';
import { ChatInput } from '@/components/chat/ChatInput';

const CanalChatPage = () => {
  const { canalId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { casa, profile } = useStudent();
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: canal, isLoading: loadingCanal } = useQuery({
    queryKey: ['canal', canalId],
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

  const { data: onlineCount } = useQuery({
    queryKey: ['canal-online', canal?.casa_id],
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

  const { data: mensagens, isLoading: loadingMensagens } = useQuery({
    queryKey: ['mensagens-canal', canalId],
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
      if (error) throw error;
      return data || [];
    },
    enabled: !!canalId,
  });

  const { data: meusCargos } = useQuery({
    queryKey: ['meus-cargos', profile?.id, casa?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('cargos_casa')
        .select('cargo, ativo')
        .eq('aluno_id', profile!.id)
        .eq('casa_id', casa!.id)
        .eq('ativo', true);
      return data || [];
    },
    enabled: !!profile?.id && !!casa?.id,
  });

  const podePostar = useMemo(() => {
    // Canal mentoria: apenas o mentor fala, alunos so leem
    if (canal?.tipo === 'mentoria') return false;
    // Canais com apenas_lideranca: so cargos de lideranca
    if (canal?.apenas_lideranca) {
      const cargosLideranca = ['lider', 'vice', 'coordenador', 'embaixador'];
      return meusCargos?.some(c => cargosLideranca.includes(c.cargo)) || false;
    }
    return true;
  }, [canal?.apenas_lideranca, canal?.tipo, meusCargos]);

  const mensagensFixadas = useMemo(() => mensagens?.filter(m => m.fixada) || [], [mensagens]);
  const mensagensNormais = useMemo(() => mensagens?.filter(m => !m.fixada) || [], [mensagens]);

  const deveAgrupar = (atual: any, anterior: any) => {
    if (!anterior) return false;
    if (atual.autor?.id !== anterior.autor?.id) return false;
    const diffMinutos = (new Date(atual.created_at).getTime() - new Date(anterior.created_at).getTime()) / 60000;
    return diffMinutos < 5;
  };

  // Realtime
  useEffect(() => {
    if (!canalId) return;
    const channel = supabase
      .channel(`canal-${canalId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mensagens_canal', filter: `canal_id=eq.${canalId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['mensagens-canal', canalId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [canalId, queryClient]);

  // Auto scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens]);

  // Marcar como lido
  useEffect(() => {
    if (!canalId || !profile?.id) return;
    supabase.from('canal_leituras').upsert(
      { canal_id: canalId, usuario_id: profile.id, ultima_leitura: new Date().toISOString() },
      { onConflict: 'canal_id,usuario_id' }
    );
    queryClient.invalidateQueries({ queryKey: ['mensagens-nao-lidas'] });
    queryClient.invalidateQueries({ queryKey: ['count-canais-nao-lidos'] });
  }, [canalId, profile?.id, queryClient]);

  // Enviar
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
    return <div className="flex items-center justify-center min-h-[50vh]"><p className="text-white/40 text-sm">Carregando...</p></div>;
  }

  // Determinar cor do header baseado no tipo do canal (nao da casa)
  const headerHashColor = canal?.tipo === 'escola_avisos' || canal?.tipo === 'escola_geral'
    ? 'text-emerald-400/60'
    : canal?.tipo === 'conselho_lideres' || canal?.tipo === 'lideranca_casa'
    ? 'text-amber-400/60'
    : 'text-blue-400/60';

  return (
    <div className="flex flex-col h-[calc(100vh-140px)]">
      {/* Header */}
      <div className="flex items-center justify-between py-3 px-1 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate('/aluno/chat')}
            className="p-2 -ml-1 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Hash className={`w-4.5 h-4.5 ${headerHashColor}`} />
          <div>
            <h1 className="text-base font-semibold text-white">
              {canal?.nome?.toLowerCase() || 'canal'}
            </h1>
            {canal?.descricao && (
              <p className="text-[11px] text-white/30 truncate max-w-[200px]">{canal.descricao}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-white/30 text-xs pr-1">
          <Users className="w-3.5 h-3.5" />
          <span>{onlineCount || 0}</span>
        </div>
      </div>

      {/* Mensagens Fixadas */}
      {mensagensFixadas.length > 0 && (
        <div className="py-2 px-2 space-y-1.5 border-b border-white/5">
          {mensagensFixadas.map(msg => (
            <MensagemFixada key={msg.id} mensagem={msg} casaColor="#6366f1" />
          ))}
        </div>
      )}

      {/* Area de mensagens */}
      <ScrollArea className="flex-1 px-1">
        <div className="py-4">
          {loadingMensagens ? (
            <div className="text-center text-white/30 py-8 text-sm">Carregando mensagens...</div>
          ) : mensagensNormais.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3 bg-white/[0.06]">
                <Hash className={`w-5 h-5 ${headerHashColor}`} />
              </div>
              <h3 className="text-white/70 font-medium text-sm mb-1">
                Inicio do #{canal?.nome?.toLowerCase()}
              </h3>
              <p className="text-white/30 text-xs max-w-[240px]">
                {canal?.descricao || 'Seja o primeiro a enviar uma mensagem!'}
              </p>
            </div>
          ) : (
            mensagensNormais.map((msg, index) => {
              const dataAtual = format(new Date(msg.created_at), 'yyyy-MM-dd');
              const dataAnterior = index > 0 ? format(new Date(mensagensNormais[index - 1].created_at), 'yyyy-MM-dd') : null;
              const mostrarData = dataAtual !== dataAnterior;
              return (
                <div key={msg.id}>
                  {mostrarData && <DateSeparator date={msg.created_at} />}
                  <MensagemBubble
                    mensagem={msg}
                    isMe={msg.autor?.id === profile?.id}
                    casaColor="#94a3b8"
                    agruparComAnterior={!mostrarData && deveAgrupar(msg, mensagensNormais[index - 1] || null)}
                  />
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="pt-2 pb-2 px-1">
        {podePostar ? (
          <ChatInput onEnviar={enviarMensagem} placeholder={`Mensagem em #${canal?.nome?.toLowerCase() || 'canal'}...`} />
        ) : (
          <div className="text-center py-3 px-4 bg-white/[0.04] rounded-xl text-white/30 text-sm">
            {canal?.tipo === 'mentoria'
              ? 'Apenas o mentor fala neste canal'
              : 'Apenas a lideranca pode postar neste canal'}
          </div>
        )}
      </div>
    </div>
  );
};

export default CanalChatPage;
