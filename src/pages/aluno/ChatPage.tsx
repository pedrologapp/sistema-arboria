import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, MessageCircle, Hash, Users, Crown, Lock, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useStudent } from '@/contexts/StudentContext';
import { CasaBrasao } from '@/components/CasaBrasao';
import { CanalItem } from '@/components/chat/CanalItem';
import { MembroCard } from '@/components/chat/MembroCard';
import { Input } from '@/components/ui/input';
import { getStatusOnline } from '@/utils/statusOnline';
import { toast } from 'sonner';
import { ConselhoLideresLocked } from '@/components/chat/ConselhoLideresLocked';
import { LiderancaCasaLocked } from '@/components/chat/LiderancaCasaLocked';

const ChatPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile, casa, casaColor } = useStudent();
  const [searchTerm, setSearchTerm] = useState('');
  const [showLockedModal, setShowLockedModal] = useState(false);
  const [showLiderancaLockedModal, setShowLiderancaLockedModal] = useState(false);

  // Buscar canal do Conselho de Líderes
  const { data: canalConselho } = useQuery({
    queryKey: ['canal-conselho', profile?.institution_id],
    queryFn: async () => {
      if (!profile?.institution_id) return null;
      const { data } = await supabase
        .from('canais_casa')
        .select('*')
        .eq('tipo', 'conselho_lideres')
        .eq('institution_id', profile.institution_id)
        .maybeSingle();
      return data;
    },
    enabled: !!profile?.institution_id,
  });



  // Buscar canal de Liderança da casa
  const { data: canalLideranca } = useQuery({
    queryKey: ['canal-lideranca', casa?.id, profile?.institution_id],
    queryFn: async () => {
      if (!casa?.id || !profile?.institution_id) return null;
      const { data } = await supabase
        .from('canais_casa')
        .select('*')
        .eq('tipo', 'lideranca_casa')
        .eq('casa_id', casa.id)
        .eq('institution_id', profile.institution_id)
        .maybeSingle();
      return data;
    },
    enabled: !!casa?.id && !!profile?.institution_id,
  });

  // Buscar canais da casa do aluno (excluindo lideranca_casa)
  const { data: canais = [] } = useQuery({
    queryKey: ['canais-casa', casa?.id],
    queryFn: async () => {
      if (!casa?.id) return [];
      const { data, error } = await supabase
        .from('canais_casa')
        .select('*')
        .eq('casa_id', casa.id)
        .neq('tipo', 'lideranca_casa')
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

  // Buscar DMs não lidas
  const { data: dmsNaoLidas = [] } = useQuery({
    queryKey: ['dms-nao-lidas', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      
      // Buscar conversas onde eu participo
      const { data: participacoes } = await supabase
        .from('conversa_participantes')
        .select(`
          conversa_id,
          ultima_leitura,
          conversa:conversas_privadas(updated_at)
        `)
        .eq('usuario_id', profile.id);
      
      if (!participacoes) return [];
      
      // Identificar conversas com mensagens não lidas
      const naoLidas: { conversaId: string; outroUsuarioId: string }[] = [];
      
      for (const p of participacoes) {
        const ultimaLeitura = new Date(p.ultima_leitura || '1970-01-01');
        const conversaData = p.conversa as { updated_at: string | null } | null;
        const ultimaMsg = new Date(conversaData?.updated_at || '1970-01-01');
        
        if (ultimaMsg > ultimaLeitura) {
          // Buscar ID do outro participante
          const { data: outro } = await supabase
            .from('conversa_participantes')
            .select('usuario_id')
            .eq('conversa_id', p.conversa_id)
            .neq('usuario_id', profile.id)
            .single();
          
          if (outro) {
            naoLidas.push({ 
              conversaId: p.conversa_id, 
              outroUsuarioId: outro.usuario_id 
            });
          }
        }
      }
      
      return naoLidas;
    },
    enabled: !!profile?.id,
    staleTime: 10000,
  });

  // Realtime: escutar novas mensagens para atualizar badges
  useEffect(() => {
    if (!profile?.id || !casa?.id) return;
    
    const channel = supabase
      .channel('global-chat-updates')
      // Novas mensagens em canais
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'mensagens_canal'
      }, (payload) => {
        // Só atualizar se for mensagem de outro usuário
        if (payload.new.autor_id !== profile.id) {
          queryClient.invalidateQueries({ queryKey: ['mensagens-nao-lidas'] });
          queryClient.invalidateQueries({ queryKey: ['canal-leituras'] });
        }
      })
      // Novas mensagens em DMs
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'mensagens_privadas'
      }, (payload) => {
        if (payload.new.autor_id !== profile.id) {
          queryClient.invalidateQueries({ queryKey: ['dms-nao-lidas'] });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, casa?.id, queryClient]);

  // Buscar mentor da casa (professor)
  const { data: mentorCasa } = useQuery({
    queryKey: ['mentor-casa', casa?.id, profile?.institution_id],
    queryFn: async () => {
      if (!casa?.id || !profile?.institution_id) return null;
      
      const { data, error } = await supabase
        .from('professor_casa')
        .select(`
          professor_id,
          profiles!professor_casa_professor_id_fkey(
            id, full_name, nome, sobrenome, avatar_url
          )
        `)
        .eq('casa_id', casa.id)
        .eq('institution_id', profile.institution_id)
        .eq('ativo', true)
        .eq('eh_mentor_principal', true)
        .maybeSingle();
      
      if (error) {
        console.error('Erro ao buscar mentor:', error);
        return null;
      }
      
      // Type assertion para acessar profiles corretamente
      const profileData = data?.profiles as { id: string; full_name: string | null; nome: string | null; sobrenome: string | null; avatar_url: string | null } | null;
      return profileData || null;
    },
    staleTime: 60000,
    enabled: !!casa?.id && !!profile?.institution_id,
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
    staleTime: 30000,
    enabled: !!casa?.id && !!profile?.institution_id,
  });

  // Buscar membros online da casa
  const membrosOnline = useMemo(() => {
    return membrosCasa.filter(m => {
      const status = getStatusOnline(m.ultima_atividade);
      return status.status === 'online';
    }).length;
  }, [membrosCasa]);

  // Verificar se o aluno é líder
  const isLider = useMemo(() => {
    if (!profile?.id) return false;
    const meu = membrosCasa?.find(m => m.id === profile.id);
    const cargoAtivo = meu?.cargos_casa?.find((c: { ativo: boolean; cargo: string }) => c.ativo && c.cargo === 'lider');
    return !!cargoAtivo;
  }, [membrosCasa, profile?.id]);

  // Verificar se o aluno tem acesso ao canal de liderança (líder ou coordenador)
  const isLiderancaCasa = useMemo(() => {
    if (!profile?.id) return false;
    const meu = membrosCasa?.find(m => m.id === profile.id);
    const cargoAtivo = meu?.cargos_casa?.find((c: { ativo: boolean; cargo: string }) => c.ativo && (c.cargo === 'lider' || c.cargo === 'coordenador'));
    return !!cargoAtivo;
  }, [membrosCasa, profile?.id]);

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

  // Filtrar mentor pelo termo de busca
  const mentorFiltrado = useMemo(() => {
    if (!mentorCasa) return null;
    if (!searchTerm) return mentorCasa;
    const termo = searchTerm.toLowerCase();
    const nome = mentorCasa.nome?.toLowerCase() || '';
    const fullName = mentorCasa.full_name?.toLowerCase() || '';
    return nome.includes(termo) || fullName.includes(termo) ? mentorCasa : null;
  }, [mentorCasa, searchTerm]);

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

      {/* Seção: Canais da Diretoria */}
      {canalConselho && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <Crown className="w-4 h-4 text-yellow-500/60" />
            <h2 className="text-xs font-semibold text-yellow-500/60 uppercase tracking-wider">
              Canais da Diretoria
            </h2>
          </div>
          <button
            onClick={() => {
              if (isLider) {
                navigate(`/aluno/chat/canal/${canalConselho.id}`);
              } else {
                setShowLockedModal(true);
              }
            }}
            className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left active:scale-[0.98] ${
              isLider
                ? 'bg-yellow-500/10 border border-yellow-500/30 hover:bg-yellow-500/15'
                : 'bg-white/[0.03] border border-white/5 opacity-60 hover:opacity-70'
            }`}
          >
            <span className="text-lg flex-shrink-0">👑</span>
            <span className={`flex-1 font-medium truncate ${isLider ? 'text-yellow-400' : 'text-white/60'}`}>
              Conselho de Líderes
            </span>
            {!isLider && <Lock className="w-4 h-4 text-white/30 flex-shrink-0" />}
          </button>
        </div>
      )}

      {/* Seção: Liderança da Casa */}
      {canalLideranca && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <Zap className="w-4 h-4" style={{ color: `${casaColor}99` }} />
            <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: `${casaColor}99` }}>
              Liderança da Casa
            </h2>
          </div>
          <button
            onClick={() => {
              if (isLiderancaCasa) {
                navigate(`/aluno/chat/canal/${canalLideranca.id}`);
              } else {
                setShowLiderancaLockedModal(true);
              }
            }}
            className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left active:scale-[0.98] ${
              isLiderancaCasa
                ? 'bg-white/[0.06] border hover:bg-white/10'
                : 'bg-white/[0.03] border border-white/5 opacity-60 hover:opacity-70'
            }`}
            style={isLiderancaCasa ? { borderColor: `${casaColor}40` } : undefined}
          >
            <span className="text-lg flex-shrink-0">⚡</span>
            <span className={`flex-1 font-medium truncate ${isLiderancaCasa ? 'text-white/90' : 'text-white/60'}`}>
              Liderança
            </span>
            {!isLiderancaCasa && <Lock className="w-4 h-4 text-white/30 flex-shrink-0" />}
          </button>
        </div>
      )}

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

        {/* Mentor da Casa */}
        {mentorFiltrado && (
          <div className="space-y-2">
            <h3 className="text-xs text-white/50 px-1 flex items-center gap-1.5">
              <span>🎓</span> MENTOR DA CASA
            </h3>
            <div className="space-y-1">
              <MembroCard
                membro={{
                  id: mentorFiltrado.id,
                  nome: mentorFiltrado.nome,
                  sobrenome: mentorFiltrado.sobrenome,
                  full_name: mentorFiltrado.full_name,
                  avatar_url: mentorFiltrado.avatar_url,
                  ultima_atividade: null,
                  cargos_casa: []
                }}
                isMe={false}
                hideStatus={true}
                onIniciarConversa={iniciarConversa}
                casaColor={casaColor}
                temDmNaoLida={dmsNaoLidas.some(dm => dm.outroUsuarioId === mentorFiltrado.id)}
              />
            </div>
          </div>
        )}
        
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
                  temDmNaoLida={dmsNaoLidas.some(dm => dm.outroUsuarioId === membro.id)}
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
                  temDmNaoLida={dmsNaoLidas.some(dm => dm.outroUsuarioId === membro.id)}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal de canal bloqueado */}
      <ConselhoLideresLocked open={showLockedModal} onOpenChange={setShowLockedModal} />
      <LiderancaCasaLocked open={showLiderancaLockedModal} onOpenChange={setShowLiderancaLockedModal} casaColor={casaColor} />
    </div>
  );
};

export default ChatPage;
