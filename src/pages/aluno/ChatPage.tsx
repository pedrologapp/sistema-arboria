import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, MessageCircle, Hash, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useStudent } from '@/contexts/StudentContext';
import { CasaBrasao } from '@/components/CasaBrasao';
import { CanalItem } from '@/components/chat/CanalItem';
import { MembroCard } from '@/components/chat/MembroCard';
import { Input } from '@/components/ui/input';
import { getStatusOnline } from '@/utils/statusOnline';
import { toast } from 'sonner';

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

  // Buscar membros da casa com cargos
  const { data: membrosCasa = [] } = useQuery({
    queryKey: ['membros-chat', casa?.id, profile?.institution_id],
    queryFn: async () => {
      if (!casa?.id || !profile?.institution_id) return [];
      
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          nome,
          sobrenome,
          avatar_url,
          ultima_atividade,
          cargos_casa!cargos_casa_aluno_id_fkey(cargo, ativo)
        `)
        .eq('casa_id', casa.id)
        .eq('institution_id', profile.institution_id);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!casa?.id && !!profile?.institution_id,
  });

  // Buscar membros online da casa
  const membrosOnline = useMemo(() => {
    return membrosCasa.filter(m => {
      const status = getStatusOnline(m.ultima_atividade);
      return status.status === 'online';
    }).length;
  }, [membrosCasa]);

  // Agrupar membros por cargo
  const { lideranca, membrosComuns } = useMemo(() => {
    const lideranca = membrosCasa.filter(m => {
      const cargoAtivo = m.cargos_casa?.find((c: { ativo: boolean }) => c.ativo);
      return cargoAtivo?.cargo;
    }).sort((a, b) => {
      // Ordenar: líder > vice > coordenador > embaixador
      const ordem = { lider: 1, vice: 2, coordenador: 3, embaixador: 4 };
      const cargoA = a.cargos_casa?.find((c: { ativo: boolean }) => c.ativo)?.cargo || '';
      const cargoB = b.cargos_casa?.find((c: { ativo: boolean }) => c.ativo)?.cargo || '';
      return (ordem[cargoA as keyof typeof ordem] || 99) - (ordem[cargoB as keyof typeof ordem] || 99);
    });
    
    const membrosComuns = membrosCasa.filter(m => {
      const cargoAtivo = m.cargos_casa?.find((c: { ativo: boolean }) => c.ativo);
      return !cargoAtivo?.cargo;
    });
    
    return { lideranca, membrosComuns };
  }, [membrosCasa]);

  // Filtrar canais e membros pelo termo de busca
  const canaisFiltrados = useMemo(() => {
    if (!searchTerm) return canais;
    const termo = searchTerm.toLowerCase();
    return canais.filter(c => c.nome.toLowerCase().includes(termo));
  }, [canais, searchTerm]);

  const liderancaFiltrada = useMemo(() => {
    if (!searchTerm) return lideranca;
    const termo = searchTerm.toLowerCase();
    return lideranca.filter(m => {
      const nome = m.nome?.toLowerCase() || '';
      const fullName = m.full_name?.toLowerCase() || '';
      return nome.includes(termo) || fullName.includes(termo);
    });
  }, [lideranca, searchTerm]);

  const membrosComunsFiltrados = useMemo(() => {
    if (!searchTerm) return membrosComuns;
    const termo = searchTerm.toLowerCase();
    return membrosComuns.filter(m => {
      const nome = m.nome?.toLowerCase() || '';
      const fullName = m.full_name?.toLowerCase() || '';
      return nome.includes(termo) || fullName.includes(termo);
    });
  }, [membrosComuns, searchTerm]);

  // Função para iniciar conversa com um membro
  const iniciarConversa = async (outroUsuarioId: string) => {
    console.log('=== INICIANDO CONVERSA (ChatPage) ===');
    console.log('1. Outro usuário ID:', outroUsuarioId);
    console.log('2. Meu ID:', profile?.id);
    console.log('3. Institution ID:', profile?.institution_id);

    if (!profile?.id || !profile?.institution_id) {
      console.error('❌ ERRO: userId ou institution_id não definido!');
      toast.error('Erro: dados do usuário não carregados');
      return;
    }
    
    try {
      // Buscar se já existe conversa entre os dois
      console.log('4. Buscando minhas conversas...');
      const { data: minhasConversas, error: erroMinhas } = await supabase
        .from('conversa_participantes')
        .select('conversa_id')
        .eq('usuario_id', profile.id);
      
      console.log('5. Minhas conversas:', minhasConversas);
      if (erroMinhas) console.error('ERRO ao buscar minhas conversas:', erroMinhas);
      
      if (minhasConversas?.length) {
        // Verificar se o outro usuário está em alguma dessas conversas
        console.log('6. Verificando se existe conversa com o outro...');
        const { data: conversaComum, error: erroComum } = await supabase
          .from('conversa_participantes')
          .select('conversa_id')
          .eq('usuario_id', outroUsuarioId)
          .in('conversa_id', minhasConversas.map(c => c.conversa_id))
          .limit(1)
          .maybeSingle();
        
        console.log('7. Conversa existente:', conversaComum);
        if (erroComum) console.error('ERRO ao buscar conversa existente:', erroComum);
        
        if (conversaComum) {
          console.log('8. ✅ Conversa já existe! Navegando para:', conversaComum.conversa_id);
          navigate(`/aluno/chat/dm/${conversaComum.conversa_id}`);
          return;
        }
      }
      
      // Criar nova conversa - gerar UUID no frontend para evitar problema de RLS no SELECT
      console.log('9. Criando nova conversa...');
      const novaConversaId = crypto.randomUUID();
      
      const { error: erroConversa } = await supabase
        .from('conversas_privadas')
        .insert({ id: novaConversaId, institution_id: profile.institution_id });
      
      console.log('10. Nova conversa ID:', novaConversaId);
      if (erroConversa) {
        console.error('❌ ERRO ao criar conversa:', erroConversa);
        toast.error('Erro ao criar conversa: ' + erroConversa.message);
        return;
      }
      
      // Adicionar participantes
      console.log('11. Adicionando participantes...');
      const { error: erroParticipantes } = await supabase
        .from('conversa_participantes')
        .insert([
          { conversa_id: novaConversaId, usuario_id: profile.id },
          { conversa_id: novaConversaId, usuario_id: outroUsuarioId },
        ]);
      
      if (erroParticipantes) {
        console.error('❌ ERRO ao adicionar participantes:', erroParticipantes);
        toast.error('Erro ao adicionar participantes: ' + erroParticipantes.message);
        return;
      }
      
      console.log('12. ✅ SUCESSO! Navegando para:', novaConversaId);
      navigate(`/aluno/chat/dm/${novaConversaId}`);
    } catch (error) {
      console.error('❌ ERRO GERAL:', error);
      toast.error('Erro ao iniciar conversa');
    }
  };

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
        <button
          onClick={() => navigate('/aluno/chat/membros')}
          className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          title="Ver todos os membros"
        >
          <Users className="w-5 h-5" />
        </button>
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
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <MessageCircle className="w-4 h-4 text-white/40" />
          <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wider">
            Mensagens Diretas
          </h2>
        </div>
        
        {/* Liderança */}
        {liderancaFiltrada.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs text-white/50 px-1 flex items-center gap-1.5">
              <span>🦅</span> LIDERANÇA
            </h3>
            <div className="space-y-1">
              {liderancaFiltrada.map((membro) => (
                <MembroCard
                  key={membro.id}
                  membro={membro}
                  isMe={membro.id === profile?.id}
                  onIniciarConversa={iniciarConversa}
                  casaColor={casaColor}
                />
              ))}
            </div>
          </div>
        )}

        {/* Membros */}
        <div className="space-y-2">
          <h3 className="text-xs text-white/50 px-1 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            <span>MEMBROS ({membrosComunsFiltrados.length})</span>
          </h3>
          <div className="space-y-1">
            {membrosComunsFiltrados.length === 0 ? (
              <p className="text-sm text-white/40 text-center py-4">
                Nenhum membro encontrado
              </p>
            ) : (
              membrosComunsFiltrados.map((membro) => (
                <MembroCard
                  key={membro.id}
                  membro={membro}
                  isMe={membro.id === profile?.id}
                  onIniciarConversa={iniciarConversa}
                  casaColor={casaColor}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
