import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Hash, Users, Eye, ArrowLeft, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useProfessor } from '@/contexts/ProfessorContext';
import { CasaBrasao } from '@/components/CasaBrasao';
import { MembroCard } from '@/components/chat/MembroCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getStatusOnline } from '@/utils/statusOnline';
import { toast } from 'sonner';

const ProfessorChatPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile, casaMentor } = useProfessor();
  const [searchTerm, setSearchTerm] = useState('');

  const casaColor = casaMentor?.cor_hex || '#6366f1';

  // Buscar canais da casa
  const { data: canais = [] } = useQuery({
    queryKey: ['professor-canais-casa', casaMentor?.id],
    queryFn: async () => {
      if (!casaMentor?.id) return [];
      const { data, error } = await supabase
        .from('canais_casa')
        .select('*')
        .eq('casa_id', casaMentor.id)
        .order('ordem');
      if (error) throw error;
      return data || [];
    },
    enabled: !!casaMentor?.id,
  });

  // Buscar última leitura do professor em cada canal
  const { data: leituras = [] } = useQuery({
    queryKey: ['professor-canal-leituras', profile?.id],
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
    queryKey: ['professor-mensagens-nao-lidas', canais.map(c => c.id), leituras],
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
          .gt('created_at', ultimaLeitura);
        
        if (!error && count) {
          resultado[canal.id] = count;
        }
      }
      
      return resultado;
    },
    enabled: canais.length > 0 && !!profile?.id,
  });

  // Buscar alunos da casa COM CARGOS
  const { data: alunosCasa = [] } = useQuery({
    queryKey: ['professor-alunos-chat', casaMentor?.id, profile?.institution_id],
    queryFn: async () => {
      if (!casaMentor?.id || !profile?.institution_id) return [];
      
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
        .eq('casa_id', casaMentor.id)
        .eq('institution_id', profile.institution_id)
        .order('full_name');
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 30000,
    enabled: !!casaMentor?.id && !!profile?.institution_id,
  });

  // Buscar DMs não lidas
  const { data: dmsNaoLidas = {} } = useQuery({
    queryKey: ['professor-dms-nao-lidas', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return {};
      
      const { data: participacoes } = await supabase
        .from('conversa_participantes')
        .select(`
          conversa_id,
          ultima_leitura,
          conversa:conversas_privadas(updated_at)
        `)
        .eq('usuario_id', profile.id);
      
      if (!participacoes) return {};
      
      const naoLidasPorAluno: Record<string, boolean> = {};
      
      for (const p of participacoes) {
        const ultimaLeitura = new Date(p.ultima_leitura || '1970-01-01').getTime();
        const conversaData = p.conversa as { updated_at: string | null } | null;
        const ultimaMsg = new Date(conversaData?.updated_at || '1970-01-01').getTime();
        
        if (ultimaMsg > ultimaLeitura) {
          const { data: outro } = await supabase
            .from('conversa_participantes')
            .select('usuario_id')
            .eq('conversa_id', p.conversa_id)
            .neq('usuario_id', profile.id)
            .single();
          
          if (outro) {
            naoLidasPorAluno[outro.usuario_id] = true;
          }
        }
      }
      
      return naoLidasPorAluno;
    },
    enabled: !!profile?.id,
    staleTime: 10000,
  });

  // Realtime para atualizar badges
  useEffect(() => {
    if (!profile?.id || !casaMentor?.id) return;
    
    const channel = supabase
      .channel('professor-chat-updates')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'mensagens_canal'
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['professor-mensagens-nao-lidas'] });
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'mensagens_privadas'
      }, (payload) => {
        if (payload.new.autor_id !== profile.id) {
          queryClient.invalidateQueries({ queryKey: ['professor-dms-nao-lidas'] });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, casaMentor?.id, queryClient]);

  // Contagem de membros online
  const membrosOnline = useMemo(() => {
    return alunosCasa.filter(m => {
      const status = getStatusOnline(m.ultima_atividade);
      return status.status === 'online';
    }).length;
  }, [alunosCasa]);

  // Separar liderança e membros comuns
  const { lideranca, membrosComuns } = useMemo(() => {
    const liderancaList: typeof alunosCasa = [];
    const membrosComunsList: typeof alunosCasa = [];
    
    for (const aluno of alunosCasa) {
      const cargoAtivo = aluno.cargos_casa?.find(c => c.ativo);
      if (cargoAtivo) {
        liderancaList.push(aluno);
      } else {
        membrosComunsList.push(aluno);
      }
    }
    
    return { lideranca: liderancaList, membrosComuns: membrosComunsList };
  }, [alunosCasa]);

  // Filtrar canais e alunos pelo termo de busca
  const canaisFiltrados = useMemo(() => {
    if (!searchTerm) return canais;
    const termo = searchTerm.toLowerCase();
    return canais.filter(c => c.nome.toLowerCase().includes(termo));
  }, [canais, searchTerm]);

  const liderancaFiltrada = useMemo(() => {
    if (!searchTerm) return lideranca;
    const termo = searchTerm.toLowerCase();
    return lideranca.filter(a => {
      const nome = a.nome?.toLowerCase() || '';
      const fullName = a.full_name?.toLowerCase() || '';
      return nome.includes(termo) || fullName.includes(termo);
    });
  }, [lideranca, searchTerm]);

  const membrosComunsFiltrados = useMemo(() => {
    if (!searchTerm) return membrosComuns;
    const termo = searchTerm.toLowerCase();
    return membrosComuns.filter(a => {
      const nome = a.nome?.toLowerCase() || '';
      const fullName = a.full_name?.toLowerCase() || '';
      return nome.includes(termo) || fullName.includes(termo);
    });
  }, [membrosComuns, searchTerm]);

  // Função para iniciar/retomar conversa com aluno
  const iniciarConversa = async (alunoId: string) => {
    if (!profile?.id || !profile?.institution_id) {
      toast.error('Erro: dados do usuário não carregados');
      return;
    }
    
    try {
      // Verificar se já existe conversa
      const { data: minhasConversas } = await supabase
        .from('conversa_participantes')
        .select('conversa_id')
        .eq('usuario_id', profile.id);
      
      if (minhasConversas?.length) {
        const { data: conversaComum } = await supabase
          .from('conversa_participantes')
          .select('conversa_id')
          .eq('usuario_id', alunoId)
          .in('conversa_id', minhasConversas.map(c => c.conversa_id))
          .limit(1)
          .maybeSingle();
        
        if (conversaComum) {
          navigate(`/professor/chat/dm/${conversaComum.conversa_id}`);
          return;
        }
      }
      
      // Criar nova conversa
      const novaConversaId = crypto.randomUUID();
      
      const { error: erroConversa } = await supabase
        .from('conversas_privadas')
        .insert({ id: novaConversaId, institution_id: profile.institution_id });
      
      if (erroConversa) {
        toast.error('Erro ao criar conversa');
        return;
      }
      
      // Adicionar participantes
      const { error: erroParticipantes } = await supabase
        .from('conversa_participantes')
        .insert([
          { conversa_id: novaConversaId, usuario_id: profile.id },
          { conversa_id: novaConversaId, usuario_id: alunoId },
        ]);
      
      if (erroParticipantes) {
        toast.error('Erro ao adicionar participantes');
        return;
      }
      
      navigate(`/professor/chat/dm/${novaConversaId}`);
    } catch (error) {
      console.error('Erro ao iniciar conversa:', error);
      toast.error('Erro ao iniciar conversa');
    }
  };

  if (!casaMentor) {
    return (
      <div className="py-6 flex flex-col items-center justify-center min-h-[60vh]">
        <p className="text-white/60">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="py-4 space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/professor/alunos')}
          className="text-white/60 hover:text-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <CasaBrasao 
          brasaoUrl={casaMentor.brasao_url} 
          emoji={casaMentor.emoji} 
          nome={casaMentor.nome} 
          size="medium" 
        />
        <div className="flex-1">
          <h1 className="text-lg font-bold text-white">
            Casa {casaMentor.nome}
          </h1>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-sm text-white/60">
              {membrosOnline} online
            </span>
          </div>
        </div>
      </div>

      {/* Banner Modo Observador */}
      <div 
        className="p-3 rounded-xl border flex items-center gap-3"
        style={{ 
          backgroundColor: 'rgba(234, 179, 8, 0.1)',
          borderColor: 'rgba(234, 179, 8, 0.2)'
        }}
      >
        <div 
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: 'rgba(234, 179, 8, 0.2)' }}
        >
          <Eye className="w-5 h-5 text-yellow-400" />
        </div>
        <div>
          <p className="text-yellow-400 font-medium text-sm">
            Modo Observador
          </p>
          <p className="text-yellow-400/70 text-xs">
            Você pode visualizar os canais e iniciar conversas privadas com os alunos
          </p>
        </div>
      </div>

      {/* Campo de busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
        <Input
          placeholder="Buscar..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40 text-base"
        />
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-6">
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
                {canaisFiltrados.map((canal) => {
                  const naoLidas = mensagensNaoLidas[canal.id] || 0;
                  
                  return (
                    <button
                      key={canal.id}
                      onClick={() => navigate(`/professor/chat/canal/${canal.id}`)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      <span className="text-lg">{canal.icone || '💬'}</span>
                      <span className="text-white/70 flex-1 text-left">{canal.nome}</span>
                      
                      {canal.apenas_lideranca && (
                        <Lock className="w-4 h-4 text-white/30" />
                      )}
                      
                      {naoLidas > 0 && (
                        <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-red-500 text-white">
                          {naoLidas}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Seção: Mensagens Diretas */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <span className="text-white/40 text-xs font-semibold uppercase tracking-wider">
                💬 Mensagens Diretas
              </span>
            </div>

            {/* Mentor da Casa (Próprio Professor) */}
            {profile && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <span className="text-lg">🎓</span>
                  <span className="text-white/50 text-xs font-semibold uppercase tracking-wider">
                    Mentor da Casa
                  </span>
                </div>
                
                <div className="space-y-1">
                  <MembroCard
                    membro={{
                      id: profile.id,
                      nome: profile.full_name || profile.nome || 'Professor',
                      sobrenome: null,
                      full_name: profile.full_name || null,
                      avatar_url: profile.avatar_url || null,
                      ultima_atividade: null,
                      cargos_casa: []
                    }}
                    isMe={true}
                    hideStatus={true}
                    onIniciarConversa={() => {}}
                  />
                </div>
              </div>
            )}

            {/* Liderança */}
            {liderancaFiltrada.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <span className="text-lg">🦅</span>
                  <span className="text-white/50 text-xs font-semibold uppercase tracking-wider">
                    Liderança
                  </span>
                </div>
                
                <div className="space-y-1">
                  {liderancaFiltrada.map((aluno) => {
                    const cargoAtivo = aluno.cargos_casa?.find(c => c.ativo);
                    
                    return (
                      <MembroCard
                        key={aluno.id}
                        membro={{
                          id: aluno.id,
                          nome: aluno.full_name || aluno.nome || 'Aluno',
                          sobrenome: null,
                          full_name: aluno.full_name || null,
                          avatar_url: aluno.avatar_url,
                          ultima_atividade: aluno.ultima_atividade,
                          cargos_casa: cargoAtivo ? [{ cargo: cargoAtivo.cargo, ativo: true }] : []
                        }}
                        isMe={false}
                        temDmNaoLida={!!dmsNaoLidas[aluno.id]}
                        onIniciarConversa={() => iniciarConversa(aluno.id)}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Membros Comuns */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <Users className="w-4 h-4 text-white/50" />
                <span className="text-white/50 text-xs font-semibold uppercase tracking-wider">
                  Membros ({membrosComunsFiltrados.length})
                </span>
              </div>
              
              <div className="space-y-1">
                {membrosComunsFiltrados.length === 0 ? (
                  <p className="text-sm text-white/40 text-center py-4">
                    Nenhum membro encontrado
                  </p>
                ) : (
                  membrosComunsFiltrados.map((aluno) => (
                    <MembroCard
                      key={aluno.id}
                      membro={{
                        id: aluno.id,
                        nome: aluno.full_name || aluno.nome || 'Aluno',
                        sobrenome: null,
                        full_name: aluno.full_name || null,
                        avatar_url: aluno.avatar_url,
                        ultima_atividade: aluno.ultima_atividade,
                        cargos_casa: []
                      }}
                      isMe={false}
                      temDmNaoLida={!!dmsNaoLidas[aluno.id]}
                      onIniciarConversa={() => iniciarConversa(aluno.id)}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

export default ProfessorChatPage;
