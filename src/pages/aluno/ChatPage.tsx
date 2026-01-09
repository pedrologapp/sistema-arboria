import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, Plus, MessageCircle, Hash } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useStudent } from '@/contexts/StudentContext';
import { CasaBrasao } from '@/components/CasaBrasao';
import { CanalItem } from '@/components/chat/CanalItem';
import { DmItem } from '@/components/chat/DmItem';
import { Input } from '@/components/ui/input';
import { getStatusOnline } from '@/utils/statusOnline';

const ChatPage = () => {
  const navigate = useNavigate();
  const { profile, casa, casaColor } = useStudent();
  const [searchTerm, setSearchTerm] = useState('');

  // Buscar canais da casa do aluno
  const { data: canais = [] } = useQuery({
    queryKey: ['canais-casa', casa?.id],
    queryFn: async () => {
      if (!casa?.id) return [];
      const { data, error } = await supabase
        .from('canais_casa')
        .select('*')
        .eq('casa_id', casa.id)
        .order('ordem');
      if (error) throw error;
      return data || [];
    },
    enabled: !!casa?.id,
  });

  // Buscar última leitura do usuário em cada canal
  const { data: leituras = [] } = useQuery({
    queryKey: ['canal-leituras', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from('canal_leituras')
        .select('canal_id, ultima_leitura')
        .eq('usuario_id', profile.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.id,
  });

  // Buscar mensagens não lidas por canal
  const { data: mensagensNaoLidas = {} } = useQuery({
    queryKey: ['mensagens-nao-lidas', canais.map(c => c.id), leituras],
    queryFn: async () => {
      if (!canais.length || !profile?.id) return {};
      
      const resultado: Record<string, number> = {};
      
      for (const canal of canais) {
        const leitura = leituras.find(l => l.canal_id === canal.id);
        const ultimaLeitura = leitura?.ultima_leitura || '1970-01-01';
        
        const { count, error } = await supabase
          .from('mensagens_canal')
          .select('*', { count: 'exact', head: true })
          .eq('canal_id', canal.id)
          .gt('created_at', ultimaLeitura)
          .neq('autor_id', profile.id);
        
        if (!error && count) {
          resultado[canal.id] = count;
        }
      }
      
      return resultado;
    },
    enabled: canais.length > 0 && !!profile?.id,
  });

  // Buscar DMs do usuário
  const { data: conversas = [] } = useQuery({
    queryKey: ['minhas-dms', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      
      // Buscar participações do usuário
      const { data: participacoes, error } = await supabase
        .from('conversa_participantes')
        .select(`
          conversa_id,
          ultima_leitura,
          conversas_privadas!inner(id, updated_at)
        `)
        .eq('usuario_id', profile.id);
      
      if (error) throw error;
      if (!participacoes?.length) return [];
      
      // Para cada conversa, buscar o outro participante
      const conversasComDados = await Promise.all(
        participacoes.map(async (p) => {
          // Buscar outro participante
          const { data: outroParticipante } = await supabase
            .from('conversa_participantes')
            .select('usuario_id')
            .eq('conversa_id', p.conversa_id)
            .neq('usuario_id', profile.id)
            .single();
          
          if (!outroParticipante) return null;
          
          // Buscar dados do outro usuário
          const { data: usuario } = await supabase
            .from('profiles')
            .select('id, nome, sobrenome, full_name, avatar_url, ultima_atividade')
            .eq('id', outroParticipante.usuario_id)
            .single();
          
          // Contar mensagens não lidas
          const { count: naoLidas } = await supabase
            .from('mensagens_privadas')
            .select('*', { count: 'exact', head: true })
            .eq('conversa_id', p.conversa_id)
            .gt('created_at', p.ultima_leitura || '1970-01-01')
            .neq('autor_id', profile.id);
          
          return {
            conversaId: p.conversa_id,
            usuario,
            naoLidas: naoLidas || 0,
          };
        })
      );
      
      return conversasComDados.filter(Boolean);
    },
    enabled: !!profile?.id,
  });

  // Buscar membros online da casa
  const { data: membrosOnline = 0 } = useQuery({
    queryKey: ['membros-online', casa?.id],
    queryFn: async () => {
      if (!casa?.id) return 0;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('ultima_atividade')
        .eq('casa_id', casa.id);
      
      if (error) throw error;
      
      // Contar quantos estão online (menos de 5 min)
      const online = (data || []).filter(m => {
        const status = getStatusOnline(m.ultima_atividade);
        return status.status === 'online';
      });
      
      return online.length;
    },
    enabled: !!casa?.id,
    refetchInterval: 60000, // Atualizar a cada minuto
  });

  // Filtrar canais e conversas pelo termo de busca
  const canaisFiltrados = useMemo(() => {
    if (!searchTerm) return canais;
    const termo = searchTerm.toLowerCase();
    return canais.filter(c => c.nome.toLowerCase().includes(termo));
  }, [canais, searchTerm]);

  const conversasFiltradas = useMemo(() => {
    if (!searchTerm) return conversas;
    const termo = searchTerm.toLowerCase();
    return conversas.filter(c => {
      const nome = c?.usuario?.nome?.toLowerCase() || '';
      const fullName = c?.usuario?.full_name?.toLowerCase() || '';
      return nome.includes(termo) || fullName.includes(termo);
    });
  }, [conversas, searchTerm]);

  if (!casa) {
    return (
      <div className="py-6 flex flex-col items-center justify-center min-h-[60vh]">
        <p className="text-white/60">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="py-4 space-y-4">
      {/* Header da Casa */}
      <div className="flex items-center gap-3 px-1">
        <CasaBrasao 
          brasaoUrl={casa.brasao_url} 
          emoji={casa.emoji} 
          nome={casa.nome} 
          size="medium" 
        />
        <div className="flex-1">
          <h1 className="text-lg font-bold text-white">
            Casa {casa.nome}
          </h1>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-sm text-white/60">
              {membrosOnline} online
            </span>
          </div>
        </div>
      </div>

      {/* Campo de busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
        <Input
          placeholder="Buscar..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40"
        />
      </div>

      {/* Seção: Canais de Texto */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 px-1">
          <Hash className="w-4 h-4 text-white/40" />
          <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wider">
            Canais de Texto
          </h2>
        </div>
        
        {canaisFiltrados.length === 0 ? (
          <p className="text-sm text-white/40 text-center py-4">
            Nenhum canal disponível
          </p>
        ) : (
          <div className="space-y-1">
            {canaisFiltrados.map((canal) => (
              <CanalItem
                key={canal.id}
                canal={canal}
                naoLidas={mensagensNaoLidas[canal.id] || 0}
                casaColor={casaColor}
                onClick={() => navigate(`/aluno/chat/canal/${canal.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Seção: Mensagens Diretas */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 px-1">
          <MessageCircle className="w-4 h-4 text-white/40" />
          <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wider">
            Mensagens Diretas
          </h2>
        </div>
        
        {conversasFiltradas.length === 0 ? (
          <p className="text-sm text-white/40 text-center py-4">
            Nenhuma conversa ainda
          </p>
        ) : (
          <div className="space-y-1">
            {conversasFiltradas.map((conversa) => (
              conversa?.usuario && (
                <DmItem
                  key={conversa.conversaId}
                  usuario={conversa.usuario}
                  naoLidas={conversa.naoLidas}
                  casaColor={casaColor}
                  onClick={() => navigate(`/aluno/chat/dm/${conversa.conversaId}`)}
                />
              )
            ))}
          </div>
        )}

        {/* Botão Nova Conversa */}
        <button
          onClick={() => navigate('/aluno/chat/membros')}
          className="w-full flex items-center justify-center gap-2 p-3 rounded-lg border border-dashed border-white/20 text-white/60 hover:bg-white/5 hover:text-white/80 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm font-medium">Nova conversa</span>
        </button>
      </div>
    </div>
  );
};

export default ChatPage;
