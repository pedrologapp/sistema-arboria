import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const AdminDmViewPage = () => {
  const { conversaId } = useParams();
  const navigate = useNavigate();

  // Participantes
  const { data: participantes = [] } = useQuery({
    queryKey: ['admin-dm-participantes', conversaId],
    queryFn: async () => {
      if (!conversaId) return [];
      const { data } = await supabase
        .from('conversa_participantes')
        .select('usuario_id, profiles:profiles!conversa_participantes_usuario_id_fkey(id, full_name, nome, avatar_url, serie, turma)')
        .eq('conversa_id', conversaId);
      return (data || []).map((p: any) => p.profiles).filter(Boolean);
    },
    enabled: !!conversaId,
  });

  // Mensagens
  const { data: mensagens = [], isLoading } = useQuery({
    queryKey: ['admin-dm-mensagens', conversaId],
    queryFn: async () => {
      if (!conversaId) return [];
      const { data } = await supabase
        .from('mensagens_privadas')
        .select('id, conteudo, created_at, autor_id, autor:profiles!mensagens_privadas_autor_id_fkey(id, full_name, nome, avatar_url)')
        .eq('conversa_id', conversaId)
        .order('created_at', { ascending: true });
      return data || [];
    },
    enabled: !!conversaId,
  });

  const getNomeCurto = (fullName: string | null) => {
    const nome = fullName || 'Usuario';
    const partes = nome.trim().split(/\s+/);
    return partes.length <= 2 ? nome : `${partes[0]} ${partes[1]}`;
  };

  const nomes = participantes.map((p: any) => getNomeCurto(p.full_name)).join(' e ');

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-violet-500/10">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06]">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex -space-x-2">
          {participantes.map((p: any) => (
            <div key={p.id} className="w-8 h-8 rounded-full overflow-hidden bg-white/10 border-2 border-[#1A1A2E]">
              {p.avatar_url ? (
                <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="flex items-center justify-center w-full h-full text-[10px] text-white/50">
                  {(p.nome || p.full_name || '?').charAt(0).toUpperCase()}
                </span>
              )}
            </div>
          ))}
        </div>
        <div>
          <p className="text-sm text-white font-medium">{nomes}</p>
          <p className="text-[10px] text-white/30">
            {participantes.map((p: any) => `${p.serie || ''} ${p.turma || ''}`).filter(Boolean).join(' · ')}
            {' · '}{mensagens.length} mensagens
          </p>
        </div>
      </div>

      {/* Mensagens */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-violet-500/50" />
          </div>
        ) : mensagens.length === 0 ? (
          <p className="text-center text-white/30 py-8">Nenhuma mensagem</p>
        ) : (
          mensagens.map((msg: any, idx: number) => {
            const autor = msg.autor as any;
            const prevMsg = idx > 0 ? mensagens[idx - 1] : null;
            const mesmoAutor = prevMsg && (prevMsg as any).autor_id === msg.autor_id;
            const hora = format(new Date(msg.created_at), 'HH:mm');
            const dia = format(new Date(msg.created_at), 'dd/MM');

            // Mostrar separador de dia
            const diaAnterior = prevMsg ? format(new Date((prevMsg as any).created_at), 'dd/MM') : null;
            const novoDia = dia !== diaAnterior;

            return (
              <div key={msg.id}>
                {novoDia && (
                  <div className="flex items-center gap-3 my-3">
                    <div className="flex-1 h-px bg-white/5" />
                    <span className="text-[9px] text-white/20">{dia}</span>
                    <div className="flex-1 h-px bg-white/5" />
                  </div>
                )}
                {!mesmoAutor ? (
                  <div className="flex gap-2.5">
                    <div className="w-7 h-7 rounded-full overflow-hidden bg-white/10 shrink-0 mt-0.5">
                      {autor?.avatar_url ? (
                        <img src={autor.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="flex items-center justify-center w-full h-full text-[10px] text-white/50">
                          {(autor?.nome || '?').charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-white">{getNomeCurto(autor?.full_name)}</span>
                        <span className="text-[9px] text-white/25">{hora}</span>
                      </div>
                      <p className="text-sm text-white/80 whitespace-pre-wrap break-words mt-0.5">{msg.conteudo}</p>
                    </div>
                  </div>
                ) : (
                  <div className="pl-[36px]">
                    <p className="text-sm text-white/80 whitespace-pre-wrap break-words">{msg.conteudo}</p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer read-only */}
      <div className="p-3 border-t border-violet-500/10 text-center">
        <p className="text-[10px] text-white/20">Visualizacao admin: somente leitura</p>
      </div>
    </div>
  );
};

export default AdminDmViewPage;
