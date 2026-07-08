import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Hash, Users, Eye, ChevronLeft } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfessor } from '@/contexts/ProfessorContext';
import { useEffect, useRef, useMemo } from 'react';
import { MensagemBubble } from '@/components/chat/MensagemBubble';
import { MensagemFixada } from '@/components/chat/MensagemFixada';
import { DateSeparator } from '@/components/chat/DateSeparator';
import { ChatInput } from '@/components/chat/ChatInput';
import { format } from 'date-fns';
import { F2_REFORMA_ATIVA, corDaCasa } from '@/config/f2Reforma';
import { infantilTheme as t } from '@/styles/infantilTheme';
import { cn } from '@/lib/utils';

const ProfessorCanalViewPage = () => {
  const { canalId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { casaMentor, profile, segmento } = useProfessor();
  const bottomRef = useRef<HTMLDivElement>(null);

  // Pele CLARA no mesmo gate do chrome (Infantil/F1/F2 reformado); escura só no
  // F2 antigo. No claro o acento usa a cor da Casa; no escuro segue cinza neutro.
  const claro = !(segmento === 'fundamental2' && !F2_REFORMA_ATIVA);
  // Claro: acento na cor canônica da Casa (corDaCasa por id, como F2CasaPage).
  // Escuro: cinza neutro do chat do aluno/admin, intacto.
  const cor = claro ? corDaCasa(casaMentor?.id) : '#94a3b8';

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
    
    let channel: any = null;
    try {
      channel = supabase
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
    } catch (err) {
      console.warn('[ProfessorCanalViewPage] WebSocket indisponível:', err);
    }

    return () => { if (channel) try { supabase.removeChannel(channel); } catch {} };
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
        <div className={cn('animate-pulse', claro ? 'text-[#5A6473]' : 'text-white/60')}>Carregando...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-140px)]">
      {/* Header */}
      {claro ? (
        <div className="glass-light flex items-center gap-2 py-2.5 -mx-4 px-4" style={{ borderBottom: `1px solid ${t.border}` }}>
          <button
            onClick={() => navigate('/professor/chat')}
            className="p-1.5 -ml-1.5 rounded-full active:scale-95 flex-shrink-0"
            style={{ color: t.textMuted }}
            aria-label="Voltar para o chat"
          >
            <ChevronLeft size={22} />
          </button>
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${cor}1A` }}
          >
            <Hash size={18} style={{ color: cor }} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: t.text }}>
              {(canal?.nome || 'Canal').toLowerCase()}
            </p>
            <p className="text-[11px] flex items-center gap-1" style={{ color: t.textFaint }}>
              <Users size={11} />
              {onlineCount || 0} online
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between py-3 border-b border-violet-500/10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/professor/chat')}
              className="p-2 -ml-1 rounded-lg transition-colors text-white/50 hover:text-white hover:bg-white/[0.06]"
              aria-label="Voltar para o chat"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            {canal?.icone ? (
              <span className="text-lg">{canal.icone}</span>
            ) : (
              <Hash className="w-5 h-5 text-white/60" />
            )}
            <h1 className="text-lg font-bold text-white">
              #{canal?.nome || 'Canal'}
            </h1>
          </div>

          <div className="flex items-center gap-1.5 text-sm text-white/60">
            <Users className="w-4 h-4" />
            <span>{onlineCount || 0}</span>
          </div>
        </div>
      )}

      {/* Mensagens Fixadas */}
      {mensagensFixadas.length > 0 && (
        <div className="py-3 space-y-2">
          {mensagensFixadas.map(msg => (
            <MensagemFixada
              key={msg.id}
              mensagem={msg}
              casaColor={cor}
              light={claro}
            />
          ))}
        </div>
      )}

      {/* Área de mensagens */}
      <ScrollArea className="flex-1 px-1">
        <div className="py-4">
          {loadingMensagens ? (
            <div className={cn('text-center py-8', claro ? 'text-[#6E7788]' : 'text-white/40')}>
              Carregando mensagens...
            </div>
          ) : mensagensNormais.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
                style={{ backgroundColor: `${cor}20` }}
              >
                {canal?.icone ? (
                  <span className="text-2xl">{canal.icone}</span>
                ) : (
                  <Hash className="w-6 h-6" style={{ color: cor }} />
                )}
              </div>
              <h3 className={cn('font-medium mb-1', claro ? 'text-[#1C2230]' : 'text-white')}>
                #{canal?.nome}
              </h3>
              <p className={cn('text-sm max-w-xs', claro ? 'text-[#5A6473]' : 'text-white/50')}>
                {canal?.descricao || 'Nenhuma mensagem ainda neste canal.'}
              </p>
            </div>
          ) : (
            mensagensNormais.map((msg, index) => {
              const dataAtual = format(new Date(msg.created_at), 'yyyy-MM-dd');
              const dataAnterior = index > 0 ? format(new Date(mensagensNormais[index - 1].created_at), 'yyyy-MM-dd') : null;
              const mostrarData = dataAtual !== dataAnterior;
              return (
                <div key={msg.id}>
                  {mostrarData && <DateSeparator date={msg.created_at} light={claro} />}
                  <MensagemBubble
                    mensagem={msg}
                    isMe={false}
                    casaColor={cor}
                    light={claro}
                    agruparComAnterior={!mostrarData && deveAgrupar(msg, mensagensNormais[index - 1] || null)}
                  />
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="pt-2 pb-2 px-1">
        {canal?.tipo === 'mentoria' || canal?.tipo === 'lideranca_casa' || canal?.tipo === 'escola_avisos' || canal?.tipo === 'escola_geral' ? (
          <ChatInput
            onEnviar={async (conteudo: string) => {
              if (!conteudo.trim() || !canalId || !profile?.id || !profile?.institution_id) return;
              await supabase.from('mensagens_canal').insert({
                canal_id: canalId,
                institution_id: profile.institution_id,
                autor_id: profile.id,
                conteudo: conteudo.trim(),
              });
            }}
            placeholder={`Mensagem em #${canal?.nome?.toLowerCase() || 'canal'}...`}
            light={claro}
            casaColor={cor}
          />
        ) : (
          <div
            className={cn('p-2.5 rounded-xl text-center', !claro && 'bg-white/[0.04]')}
            style={claro ? { backgroundColor: t.surfaceSunken } : undefined}
          >
            <div className="flex items-center justify-center gap-1.5">
              <Eye className={cn('w-3.5 h-3.5', !claro && 'text-white/25')} style={claro ? { color: t.textMuted } : undefined} />
              <span className={cn('text-xs', !claro && 'text-white/25')} style={claro ? { color: t.textMuted } : undefined}>Modo leitura</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfessorCanalViewPage;
