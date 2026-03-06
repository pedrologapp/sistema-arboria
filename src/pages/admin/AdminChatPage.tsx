import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Crown, Home, MessageCircle, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CanalItem } from '@/components/chat/CanalItem';

const AdminChatPage = () => {
  const navigate = useNavigate();
  const [casaSelecionada, setCasaSelecionada] = useState<number | null>(null);

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

  const casaAtual = casas.find(c => c.id === casaSelecionada);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <MessageCircle className="w-6 h-6 text-indigo-400" />
        <h1 className="text-xl font-bold text-white">Comunicação</h1>
      </div>

      <Tabs defaultValue="conselho" className="w-full">
        <TabsList className="w-full bg-white/5 border border-white/10">
          <TabsTrigger value="conselho" className="flex-1 gap-1.5 data-[state=active]:bg-yellow-500/20 data-[state=active]:text-yellow-400">
            <Crown className="w-4 h-4" />
            Conselho
          </TabsTrigger>
          <TabsTrigger value="casas" className="flex-1 gap-1.5 data-[state=active]:bg-indigo-500/20 data-[state=active]:text-indigo-400">
            <Home className="w-4 h-4" />
            Casas
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
                    className="flex items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all active:scale-[0.98]"
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
      </Tabs>
    </div>
  );
};

export default AdminChatPage;
