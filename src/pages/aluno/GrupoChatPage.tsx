import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStudent } from '@/contexts/StudentContext';
import { useEffect, useRef } from 'react';
import { MensagemBubble } from '@/components/chat/MensagemBubble';
import { DateSeparator } from '@/components/chat/DateSeparator';
import { format } from 'date-fns';
import { ChatInput } from '@/components/chat/ChatInput';
import { corAcento } from '@/lib/corCasa';
import { toast } from 'sonner';

// Tabelas do Capítulo podem não estar nos tipos gerados: via `sb` (any), como as
// demais telas do Capítulo, pro build não quebrar por tipagem.
const sb = supabase as any;

// ── Textos visíveis à criança: PROVISÓRIOS (Conteúdo & Comunicação revisará) ──
// Deixados juntos aqui pra troca fácil.
const rotuloTitulo = (capituloNome: string) => `${capituloNome} · seu grupo`;
const TEXTO_ENCERRADO = 'Conversa encerrada.';
const TEXTO_VAZIO = 'Nenhuma mensagem ainda. Usem este espaço para combinar o trabalho do grupo.';

interface MensagemGrupo {
  id: string;
  autor_id: string;
  conteudo: string;
  created_at: string;
  autor: { id: string; full_name: string | null; nome: string | null; avatar_url: string | null } | null;
}

const nomeCurto = (nome: string) => {
  const partes = (nome || 'Aluno').trim().split(/\s+/);
  return partes.length <= 2 ? nome : `${partes[0]} ${partes[1]}`;
};

const deveAgrupar = (atual: MensagemGrupo, anterior: MensagemGrupo | null) => {
  if (!anterior) return false;
  if (atual.autor_id !== anterior.autor_id) return false;
  const diff = (new Date(atual.created_at).getTime() - new Date(anterior.created_at).getTime()) / 60000;
  return diff < 5;
};

const GrupoChatPage = () => {
  const { canalId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile, casaColor } = useStudent();
  const bottomRef = useRef<HTMLDivElement>(null);
  const acento = corAcento(casaColor || '#6366f1');

  // ── Canal + capítulo (nome / ativo) ──────────────────────────────────────
  const { data: canal, isLoading: loadingCanal } = useQuery({
    queryKey: ['grupo-canal', canalId],
    enabled: !!canalId,
    queryFn: async () => {
      const { data: c } = await sb
        .from('capitulo_grupo_canais')
        .select('id, capitulo_id, turma_id, papel_id, grupo, nome')
        .eq('id', canalId)
        .maybeSingle();
      if (!c) return null;
      const { data: cap } = await sb
        .from('capitulos')
        .select('nome, ativo')
        .eq('id', c.capitulo_id)
        .maybeSingle();
      return {
        id: c.id as string,
        capituloId: c.capitulo_id as string,
        turmaId: c.turma_id as string,
        papelId: c.papel_id as string,
        grupo: (c.grupo ?? 1) as number,
        capituloNome: (cap?.nome as string) ?? 'Capítulo',
        capituloAtivo: !!cap?.ativo,
      };
    },
  });

  // ── Membros do grupo (qualquer Casa) ─────────────────────────────────────
  const { data: membros = [] } = useQuery({
    queryKey: ['grupo-membros', canal?.capituloId, canal?.turmaId, canal?.papelId, canal?.grupo],
    enabled: !!canal,
    queryFn: async () => {
      const { data: alocs } = await sb
        .from('capitulo_alocacoes')
        .select('aluno_id, grupo')
        .eq('capitulo_id', canal!.capituloId)
        .eq('turma_id', canal!.turmaId)
        .eq('papel_id', canal!.papelId);
      const ids = (alocs || [])
        .filter((a: any) => (a.grupo ?? 1) === canal!.grupo)
        .map((a: any) => a.aluno_id as string);
      if (ids.length === 0) return [];
      const { data: perfis } = await supabase
        .from('profiles')
        .select('id, full_name, nome, avatar_url, casa_id')
        .in('id', ids);
      return (perfis || []) as { id: string; full_name: string | null; nome: string | null; avatar_url: string | null; casa_id: number | null }[];
    },
  });

  // ── Mensagens + autores ──────────────────────────────────────────────────
  const { data: mensagens = [], isLoading: loadingMensagens } = useQuery<MensagemGrupo[]>({
    queryKey: ['grupo-mensagens', canalId],
    enabled: !!canalId,
    queryFn: async () => {
      const { data: msgs } = await sb
        .from('capitulo_grupo_mensagens')
        .select('id, autor_id, conteudo, created_at')
        .eq('canal_id', canalId)
        .order('created_at', { ascending: true })
        .limit(200);
      const lista = (msgs || []) as { id: string; autor_id: string; conteudo: string; created_at: string }[];
      const autorIds = [...new Set(lista.map((m) => m.autor_id))];
      let perfis: any[] = [];
      if (autorIds.length) {
        const { data } = await supabase
          .from('profiles')
          .select('id, full_name, nome, avatar_url')
          .in('id', autorIds);
        perfis = data || [];
      }
      const pById = new Map(perfis.map((p) => [p.id, p]));
      return lista.map((m) => ({ ...m, autor: pById.get(m.autor_id) || null }));
    },
  });

  // ── Realtime (com fallback se WebSocket falhar no mobile) ─────────────────
  useEffect(() => {
    if (!canalId) return;
    let channel: any = null;
    try {
      channel = supabase
        .channel(`grupo-${canalId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'capitulo_grupo_mensagens', filter: `canal_id=eq.${canalId}` },
          () => queryClient.invalidateQueries({ queryKey: ['grupo-mensagens', canalId] })
        )
        .subscribe();
    } catch (err) {
      console.warn('[GrupoChat] WebSocket indisponível:', err);
    }
    return () => { if (channel) try { supabase.removeChannel(channel); } catch {} };
  }, [canalId, queryClient]);

  // Auto scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens]);

  const enviarMensagem = async (conteudo: string) => {
    if (!conteudo.trim() || !canalId || !profile?.id) return;
    const { error } = await sb
      .from('capitulo_grupo_mensagens')
      .insert({ canal_id: canalId, autor_id: profile.id, conteudo: conteudo.trim() });
    if (error) {
      console.error('[GrupoChat] erro ao enviar:', error);
      toast.error('Não foi possível enviar a mensagem. Tente de novo.');
      throw error; // preserva o texto no campo (o ChatInput não limpa quando dá erro)
    }
    queryClient.invalidateQueries({ queryKey: ['grupo-mensagens', canalId] });
  };

  if (loadingCanal) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white/60" />
      </div>
    );
  }

  if (!canal) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 px-6 text-center">
        <p className="text-white/50 text-sm">Não encontramos essa conversa de grupo.</p>
        <button
          onClick={() => navigate('/aluno/chat')}
          className="px-4 py-2 rounded-xl text-sm font-medium text-white"
          style={{ backgroundColor: acento }}
        >
          Voltar às conversas
        </button>
      </div>
    );
  }

  const encerrado = !canal.capituloAtivo;

  return (
    <div className="flex flex-col h-[calc(100vh-140px)]">
      {/* Header */}
      <div className="py-3 px-1 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate('/aluno/chat')}
            className="p-2 -ml-1 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Voltar"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div
            className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${acento}22`, color: acento }}
          >
            <Users className="w-4.5 h-4.5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-semibold text-white truncate">{rotuloTitulo(canal.capituloNome)}</h1>
            <p className="text-[11px] text-white/40">
              {membros.length} {membros.length === 1 ? 'integrante' : 'integrantes'}
            </p>
          </div>
        </div>

        {/* Membros do grupo (qualquer Casa) — grade que quebra em linhas, sem scroll */}
        {membros.length > 0 && (
          <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 mt-2.5 pl-1">
            {membros.map((m) => {
              const nome = m.full_name || m.nome || 'Aluno';
              return (
                <div key={m.id} className="flex items-center gap-1.5 min-w-0">
                  <div className="w-6 h-6 rounded-full overflow-hidden bg-white/10 flex items-center justify-center shrink-0">
                    {m.avatar_url ? (
                      <img src={m.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[10px] text-white/60">{nome.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <span className="text-[11px] text-white/60 truncate">{nomeCurto(nome)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Mensagens */}
      <ScrollArea className="flex-1 px-1">
        <div className="py-4">
          {loadingMensagens ? (
            <div className="text-center text-white/30 py-8 text-sm">Carregando mensagens...</div>
          ) : mensagens.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3" style={{ backgroundColor: `${acento}22`, color: acento }}>
                <Users className="w-5 h-5" />
              </div>
              <p className="text-white/40 text-xs max-w-[240px]">{TEXTO_VAZIO}</p>
            </div>
          ) : (
            mensagens.map((msg, index) => {
              const dataAtual = format(new Date(msg.created_at), 'yyyy-MM-dd');
              const dataAnterior = index > 0 ? format(new Date(mensagens[index - 1].created_at), 'yyyy-MM-dd') : null;
              const mostrarData = dataAtual !== dataAnterior;
              return (
                <div key={msg.id}>
                  {mostrarData && <DateSeparator date={msg.created_at} />}
                  <MensagemBubble
                    mensagem={{
                      id: msg.id,
                      conteudo: msg.conteudo,
                      created_at: msg.created_at,
                      tipo: null,
                      fixada: null,
                      autor: {
                        id: msg.autor?.id || msg.autor_id,
                        full_name: msg.autor?.full_name || msg.autor?.nome || 'Aluno',
                        avatar_url: msg.autor?.avatar_url || null,
                        cargos_casa: [],
                      },
                    }}
                    isMe={msg.autor_id === profile?.id}
                    casaColor={casaColor || '#6366f1'}
                    agruparComAnterior={!mostrarData && deveAgrupar(msg, mensagens[index - 1] || null)}
                  />
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Input ou aviso de encerrado */}
      <div className="pt-2 pb-2 px-1">
        {encerrado ? (
          <div className="text-center py-3 px-4 bg-white/[0.04] rounded-2xl text-white/40 text-sm">
            {TEXTO_ENCERRADO}
          </div>
        ) : (
          <ChatInput onEnviar={enviarMensagem} casaColor={acento} placeholder="Mensagem para o grupo..." />
        )}
      </div>
    </div>
  );
};

export default GrupoChatPage;
