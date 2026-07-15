import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MensagemBubble } from '@/components/chat/MensagemBubble';

// Tabelas do Capítulo podem não estar nos tipos gerados: via `sb` (any).
const sb = supabase as any;

interface MensagemGrupo {
  id: string;
  autor_id: string;
  conteudo: string;
  created_at: string;
  autor: { id: string; full_name: string | null; nome: string | null; avatar_url: string | null } | null;
}

const deveAgrupar = (atual: MensagemGrupo, anterior: MensagemGrupo | null) => {
  if (!anterior) return false;
  if (atual.autor_id !== anterior.autor_id) return false;
  const diff = (new Date(atual.created_at).getTime() - new Date(anterior.created_at).getTime()) / 60000;
  return diff < 5;
};

interface Props {
  open: boolean;
  onClose: () => void;
  capituloId: string | null;
  turmaId: string | null;
  papelId: string | null;
  grupo: number | null;
  titulo: string;
  subtitulo?: string;
  accent: string;
  bgDeep: string;
  line: string;
}

/**
 * Visão SÓ-LEITURA da conversa de um grupo, pro mentor (condição C4: supervisão).
 * O mentor LÊ tudo pela RLS (`eh_mentor_do_capitulo`), mas NÃO posta — por isso
 * não há input aqui. Descobre o canal pela tupla (capítulo, turma, papel, grupo).
 */
export const GrupoConversaModal = ({
  open,
  onClose,
  capituloId,
  turmaId,
  papelId,
  grupo,
  titulo,
  subtitulo,
  accent,
  bgDeep,
  line,
}: Props) => {
  const queryClient = useQueryClient();
  const bottomRef = useRef<HTMLDivElement>(null);
  const ativo = open && !!capituloId && !!turmaId && !!papelId && grupo != null;

  const { data: canalId } = useQuery<string | null>({
    queryKey: ['prof-grupo-canal', capituloId, turmaId, papelId, grupo],
    enabled: ativo,
    queryFn: async () => {
      const { data } = await sb
        .from('capitulo_grupo_canais')
        .select('id')
        .eq('capitulo_id', capituloId)
        .eq('turma_id', turmaId)
        .eq('papel_id', papelId)
        .eq('grupo', grupo)
        .maybeSingle();
      return (data?.id as string) ?? null;
    },
  });

  const { data: mensagens = [], isLoading } = useQuery<MensagemGrupo[]>({
    queryKey: ['prof-grupo-mensagens', canalId],
    enabled: !!canalId,
    queryFn: async () => {
      const { data: msgs } = await sb
        .from('capitulo_grupo_mensagens')
        .select('id, autor_id, conteudo, created_at')
        .eq('canal_id', canalId)
        .order('created_at', { ascending: true })
        .limit(300);
      const lista = (msgs || []) as { id: string; autor_id: string; conteudo: string; created_at: string }[];
      const ids = [...new Set(lista.map((m) => m.autor_id))];
      let perfis: any[] = [];
      if (ids.length) {
        const { data } = await supabase
          .from('profiles')
          .select('id, full_name, nome, avatar_url')
          .in('id', ids);
        perfis = data || [];
      }
      const pById = new Map(perfis.map((p) => [p.id, p]));
      return lista.map((m) => ({ ...m, autor: pById.get(m.autor_id) || null }));
    },
  });

  // Realtime (o mentor vê chegar em tempo real, mas não participa).
  useEffect(() => {
    if (!canalId) return;
    let channel: any = null;
    try {
      channel = supabase
        .channel(`prof-grupo-${canalId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'capitulo_grupo_mensagens', filter: `canal_id=eq.${canalId}` },
          () => queryClient.invalidateQueries({ queryKey: ['prof-grupo-mensagens', canalId] })
        )
        .subscribe();
    } catch (err) {
      console.warn('[GrupoConversaModal] WebSocket indisponível:', err);
    }
    return () => { if (channel) try { supabase.removeChannel(channel); } catch {} };
  }, [canalId, queryClient]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens]);

  const faint = 'rgba(244,246,255,0.5)';

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-lg p-0 overflow-hidden"
        style={{ backgroundColor: bgDeep, border: `1px solid ${line}`, color: '#FFFFFF' }}
      >
        <DialogHeader className="px-5 pt-5">
          <DialogTitle style={{ color: '#FFFFFF' }}>{titulo}</DialogTitle>
          <DialogDescription style={{ color: 'rgba(244,246,255,0.62)' }}>
            {subtitulo || 'Você acompanha a conversa do grupo. Só leitura.'}
          </DialogDescription>
        </DialogHeader>
        <div className="px-3 pb-4">
          <ScrollArea className="h-[52vh] pr-1">
            {isLoading ? (
              <p className="text-center text-sm py-10" style={{ color: faint }}>Carregando...</p>
            ) : !canalId ? (
              <p className="text-center text-sm py-10" style={{ color: faint }}>
                A conversa deste grupo ainda não foi aberta.
              </p>
            ) : mensagens.length === 0 ? (
              <p className="text-center text-sm py-10" style={{ color: faint }}>
                Nenhuma mensagem ainda.
              </p>
            ) : (
              mensagens.map((msg, i) => (
                <MensagemBubble
                  key={msg.id}
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
                  isMe={false}
                  casaColor={accent}
                  agruparComAnterior={deveAgrupar(msg, mensagens[i - 1] || null)}
                />
              ))
            )}
            <div ref={bottomRef} />
          </ScrollArea>
          <p className="text-center text-[11px] pt-3" style={{ color: faint }}>
            Modo leitura: o mentor acompanha, mas não participa da conversa.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
