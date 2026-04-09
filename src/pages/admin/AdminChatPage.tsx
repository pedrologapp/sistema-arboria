import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Crown, Home, MessageCircle, Zap, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CanalItem } from '@/components/chat/CanalItem';
import { cn } from '@/lib/utils';

const AdminChatPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [casaSelecionada, setCasaSelecionada] = useState<number | null>(null);
  const [casaDmSelecionada, setCasaDmSelecionada] = useState<number | null>(null);

  // Buscar canal do conselho
  const { data: canalConselho } = useQuery({
    queryKey: ['admin-canal-conselho'],
    queryFn: async () => {
      const { data } = await supabase
        .from('canais_casa')
        .select('*')
        .eq('tipo', 'conselho_lideres')
        .maybeSingle();
      return data;
    },
  });

  // Buscar todas as casas
  const { data: casas = [] } = useQuery({
    queryKey: ['admin-casas-chat'],
    queryFn: async () => {
      const { data } = await supabase
        .from('inteligencias')
        .select('id, nome, emoji, cor_hex')
        .order('id');
      return data || [];
    },
  });

  // Buscar canais da casa selecionada (excluindo lideranca_casa)
  const { data: canaisCasa = [] } = useQuery({
    queryKey: ['admin-canais-casa', casaSelecionada],
    queryFn: async () => {
      if (!casaSelecionada) return [];
      const { data } = await supabase
        .from('canais_casa')
        .select('*')
        .eq('casa_id', casaSelecionada)
        .neq('tipo', 'lideranca_casa')
        .order('ordem');
      return data || [];
    },
    enabled: !!casaSelecionada,
  });

  // Buscar canal de liderança da casa selecionada
  const { data: canalLideranca } = useQuery({
    queryKey: ['admin-canal-lideranca', casaSelecionada],
    queryFn: async () => {
      if (!casaSelecionada) return null;
      const { data } = await supabase
        .from('canais_casa')
        .select('*')
        .eq('casa_id', casaSelecionada)
        .eq('tipo', 'lideranca_casa')
        .maybeSingle();
      return data;
    },
    enabled: !!casaSelecionada,
  });

  // Institution
  const { data: institutionId } = useQuery({
    queryKey: ['admin-institution-chat', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('institution_id').eq('id', user!.id).single();
      return data?.institution_id;
    },
    enabled: !!user?.id,
  });

  // Conversas privadas ativas da casa selecionada
  const { data: conversasAtivas = [], isLoading: loadingDms } = useQuery({
    queryKey: ['admin-dms-casa', casaDmSelecionada, institutionId],
    queryFn: async () => {
      if (!casaDmSelecionada || !institutionId) return [];

      // Buscar alunos desta casa
      const { data: alunosCasa } = await supabase.from('profiles')
        .select('id, full_name, nome, avatar_url, serie, turma')
        .eq('casa_id', casaDmSelecionada)
        .eq('institution_id', institutionId)
        .eq('segmento', 'fundamental2');

      if (!alunosCasa?.length) return [];
      const alunoIds = alunosCasa.map(a => a.id);
      const alunoMap = Object.fromEntries(alunosCasa.map(a => [a.id, a]));

      // Buscar participações em conversas desses alunos
      const { data: participacoes } = await supabase
        .from('conversa_participantes')
        .select('conversa_id, usuario_id')
        .in('usuario_id', alunoIds);

      if (!participacoes?.length) return [];

      // Agrupar por conversa
      const conversaMap: Record<string, string[]> = {};
      participacoes.forEach(p => {
        if (!conversaMap[p.conversa_id]) conversaMap[p.conversa_id] = [];
        conversaMap[p.conversa_id].push(p.usuario_id);
      });

      // Buscar o outro participante de cada conversa
      const conversaIds = Object.keys(conversaMap);
      const { data: todosParticipantes } = await supabase
        .from('conversa_participantes')
        .select('conversa_id, usuario_id')
        .in('conversa_id', conversaIds);

      // Buscar última mensagem de cada conversa
      const { data: ultimasMsgs } = await supabase
        .from('mensagens_privadas')
        .select('conversa_id, conteudo, created_at, autor_id')
        .in('conversa_id', conversaIds)
        .order('created_at', { ascending: false });

      // Montar lista de conversas com info
      const conversas: {
        conversaId: string;
        participantes: { id: string; nome: string; avatar: string | null; serie: string | null; turma: string | null }[];
        ultimaMensagem: string | null;
        ultimaData: string | null;
      }[] = [];

      // IDs de todos os participantes para buscar perfis
      const todosIds = new Set<string>();
      (todosParticipantes || []).forEach(p => todosIds.add(p.usuario_id));
      const idsExtras = Array.from(todosIds).filter(id => !alunoMap[id]);

      let extrasMap: Record<string, any> = {};
      if (idsExtras.length > 0) {
        const { data: extras } = await supabase.from('profiles')
          .select('id, full_name, nome, avatar_url, serie, turma')
          .in('id', idsExtras);
        extrasMap = Object.fromEntries((extras || []).map(a => [a.id, a]));
      }

      const allProfiles = { ...alunoMap, ...extrasMap };

      // Última mensagem por conversa
      const ultimaMsgMap: Record<string, any> = {};
      (ultimasMsgs || []).forEach(m => {
        if (!ultimaMsgMap[m.conversa_id]) ultimaMsgMap[m.conversa_id] = m;
      });

      for (const cId of conversaIds) {
        const parts = (todosParticipantes || []).filter(p => p.conversa_id === cId);
        if (parts.length < 2) continue;

        const ultima = ultimaMsgMap[cId];
        if (!ultima) continue; // Sem mensagens = não ativa

        const participantesInfo = parts.map(p => {
          const prof = allProfiles[p.usuario_id];
          const fullName = prof?.full_name || prof?.nome || 'Usuario';
          const partes = fullName.trim().split(/\s+/);
          return {
            id: p.usuario_id,
            nome: partes.length <= 2 ? fullName : `${partes[0]} ${partes[1]}`,
            avatar: prof?.avatar_url || null,
            serie: prof?.serie || null,
            turma: prof?.turma || null,
          };
        });

        conversas.push({
          conversaId: cId,
          participantes: participantesInfo,
          ultimaMensagem: ultima.conteudo,
          ultimaData: ultima.created_at,
        });
      }

      // Ordenar por última mensagem mais recente
      return conversas.sort((a, b) => new Date(b.ultimaData || 0).getTime() - new Date(a.ultimaData || 0).getTime());
    },
    enabled: !!casaDmSelecionada && !!institutionId,
    staleTime: 30000,
  });

  const casaAtual = casas.find(c => c.id === casaSelecionada);
  const casaDmAtual = casas.find(c => c.id === casaDmSelecionada);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <MessageCircle className="w-6 h-6 text-indigo-400" />
        <h1 className="text-xl font-bold text-white">Comunicação</h1>
      </div>

      <Tabs defaultValue="conselho" className="w-full">
        <TabsList className="w-full bg-white/5 border border-violet-500/10">
          <TabsTrigger value="conselho" className="flex-1 gap-1.5 data-[state=active]:bg-yellow-500/20 data-[state=active]:text-yellow-400">
            <Crown className="w-4 h-4" />
            Conselho
          </TabsTrigger>
          <TabsTrigger value="casas" className="flex-1 gap-1.5 data-[state=active]:bg-indigo-500/20 data-[state=active]:text-indigo-400">
            <Home className="w-4 h-4" />
            Casas
          </TabsTrigger>
          <TabsTrigger value="privadas" className="flex-1 gap-1.5 data-[state=active]:bg-pink-500/20 data-[state=active]:text-pink-400">
            <Lock className="w-4 h-4" />
            Privadas
          </TabsTrigger>
        </TabsList>

        {/* Aba Conselho de Líderes */}
        <TabsContent value="conselho" className="mt-4">
          {canalConselho ? (
            <div className="space-y-3">
              <p className="text-white/50 text-sm">
                Canal exclusivo de comunicação com os Líderes de todas as Casas.
              </p>
              <button
                onClick={() => navigate(`/admin/chat/canal/${canalConselho.id}`)}
                className="w-full flex items-center gap-3 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30 hover:bg-yellow-500/15 transition-all active:scale-[0.98]"
              >
                <span className="text-2xl">👑</span>
                <div className="flex-1 text-left">
                  <span className="text-yellow-400 font-semibold">Conselho de Líderes</span>
                  <p className="text-white/40 text-xs mt-0.5">Envie mensagens para todos os líderes</p>
                </div>
              </button>
            </div>
          ) : (
            <p className="text-white/40 text-center py-8">Canal não encontrado</p>
          )}
        </TabsContent>

        {/* Aba Casas */}
        <TabsContent value="casas" className="mt-4 space-y-4">
          {!casaSelecionada ? (
            <>
              <p className="text-white/50 text-sm">Selecione uma casa para visualizar seus canais.</p>
              <div className="grid grid-cols-2 gap-2">
                {casas.map((casa) => (
                  <button
                    key={casa.id}
                    onClick={() => setCasaSelecionada(casa.id)}
                    className="flex items-center gap-2 p-3 rounded-xl bg-white/5 border border-violet-500/10 hover:bg-white/10 transition-all active:scale-[0.98]"
                  >
                    <span className="text-xl">{casa.emoji}</span>
                    <span className="text-white/80 text-sm font-medium truncate">{casa.nome}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <button
                onClick={() => setCasaSelecionada(null)}
                className="text-indigo-400 text-sm hover:underline"
              >
                ← Voltar às casas
              </button>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{casaAtual?.emoji}</span>
                <h2 className="text-white font-semibold">
                  {casaAtual?.nome}
                </h2>
              </div>

              {/* Canal de Liderança */}
              {canalLideranca && (
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 px-1">
                    <Zap className="w-4 h-4" style={{ color: `${casaAtual?.cor_hex || '#6366f1'}99` }} />
                    <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: `${casaAtual?.cor_hex || '#6366f1'}99` }}>
                      Liderança da Casa
                    </h3>
                  </div>
                  <button
                    onClick={() => navigate(`/admin/chat/canal/${canalLideranca.id}`)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg bg-white/[0.06] border hover:bg-white/10 transition-all active:scale-[0.98]"
                    style={{ borderColor: `${casaAtual?.cor_hex || '#6366f1'}40` }}
                  >
                    <span className="text-lg">⚡</span>
                    <span className="text-white/90 font-medium flex-1 text-left">Liderança</span>
                  </button>
                </div>
              )}

              {/* Canais normais */}
              <div className="space-y-1">
                {canaisCasa.map((canal) => (
                  <CanalItem
                    key={canal.id}
                    canal={canal}
                    onClick={() => navigate(`/admin/chat/canal/${canal.id}`)}
                    casaColor={casaAtual?.cor_hex}
                  />
                ))}
                {canaisCasa.length === 0 && (
                  <p className="text-white/40 text-center py-4 text-sm">Nenhum canal encontrado</p>
                )}
              </div>
            </>
          )}
        </TabsContent>
        {/* Aba Conversas Privadas */}
        <TabsContent value="privadas" className="mt-4 space-y-4">
          {!casaDmSelecionada ? (
            <>
              <p className="text-white/50 text-sm">Selecione uma casa para ver as conversas privadas ativas.</p>
              <div className="grid grid-cols-2 gap-2">
                {casas.map((casa) => (
                  <button
                    key={casa.id}
                    onClick={() => setCasaDmSelecionada(casa.id)}
                    className="flex items-center gap-2 p-3 rounded-xl bg-white/5 border border-violet-500/10 hover:bg-white/10 transition-all active:scale-[0.98]"
                  >
                    <span className="text-xl">{casa.emoji}</span>
                    <span className="text-white/80 text-sm font-medium truncate">{casa.nome}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <button
                onClick={() => setCasaDmSelecionada(null)}
                className="text-pink-400 text-sm hover:underline"
              >
                ← Voltar às casas
              </button>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{casaDmAtual?.emoji}</span>
                <h2 className="text-white font-semibold">{casaDmAtual?.nome}</h2>
                <span className="text-xs text-white/30">{conversasAtivas.length} conversas ativas</span>
              </div>

              {loadingDms ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-violet-500/50" />
                </div>
              ) : conversasAtivas.length === 0 ? (
                <div className="text-center py-8">
                  <Lock className="w-8 h-8 text-white/10 mx-auto mb-2" />
                  <p className="text-white/30 text-sm">Nenhuma conversa privada ativa nesta casa</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {conversasAtivas.map((conv) => {
                    const tempo = conv.ultimaData
                      ? (() => {
                          const d = new Date(conv.ultimaData);
                          const hoje = new Date().toISOString().split('T')[0];
                          const diaMsg = conv.ultimaData.split('T')[0];
                          if (diaMsg === hoje) return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                          return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                        })()
                      : '';

                    return (
                      <div
                        key={conv.conversaId}
                        className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-violet-500/10 hover:bg-white/[0.06] transition-colors"
                      >
                        {/* Avatares sobrepostos */}
                        <div className="flex -space-x-2 shrink-0">
                          {conv.participantes.slice(0, 2).map((p, idx) => (
                            <div key={p.id} className={cn('w-8 h-8 rounded-full overflow-hidden bg-white/10 border-2 border-[#1A1A2E]', idx > 0 && 'z-0')}>
                              {p.avatar ? (
                                <img src={p.avatar} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <span className="flex items-center justify-center w-full h-full text-[10px] text-white/50">
                                  {p.nome.charAt(0).toUpperCase()}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            {conv.participantes.map((p, idx) => (
                              <span key={p.id} className="text-xs text-white/70">
                                {p.nome}{p.serie && <span className="text-white/25 ml-0.5">{p.serie.replace(/\D/g, '')}º{p.turma || ''}</span>}
                                {idx < conv.participantes.length - 1 && <span className="text-white/20 mx-1">↔</span>}
                              </span>
                            ))}
                          </div>
                          <p className="text-[11px] text-white/30 truncate mt-0.5">{conv.ultimaMensagem}</p>
                        </div>

                        {/* Hora */}
                        <span className="text-[9px] text-white/20 shrink-0">{tempo}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminChatPage;
