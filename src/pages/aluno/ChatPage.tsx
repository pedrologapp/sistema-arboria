import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, MessageCircle, Hash, Users, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useStudent } from '@/contexts/StudentContext';
import { Input } from '@/components/ui/input';
import { getStatusOnline } from '@/utils/statusOnline';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ConselhoLideresLocked } from '@/components/chat/ConselhoLideresLocked';
import { LiderancaCasaLocked } from '@/components/chat/LiderancaCasaLocked';

const ChatPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile, casa, casaColor } = useStudent();
  const [searchTerm, setSearchTerm] = useState('');
  const [showLockedModal, setShowLockedModal] = useState(false);
  const [showLiderancaLockedModal, setShowLiderancaLockedModal] = useState(false);

  // ═══════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════

  // Canais da casa (texto + missoes)
  const { data: canaisCasa = [] } = useQuery({
    queryKey: ['canais-casa', casa?.id],
    queryFn: async () => {
      if (!casa?.id) return [];
      const { data } = await supabase
        .from('canais_casa')
        .select('*')
        .eq('casa_id', casa.id)
        .in('tipo', ['texto', 'mentoria'])
        .order('ordem');
      return data || [];
    },
    enabled: !!casa?.id,
  });

  // Canal de lideranca
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

  // Canal conselho lideres
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

  // Canais da escola (escola_avisos + escola_geral)
  const { data: canaisEscola = [] } = useQuery({
    queryKey: ['canais-escola', profile?.institution_id],
    queryFn: async () => {
      if (!profile?.institution_id) return [];
      const { data } = await supabase
        .from('canais_casa')
        .select('*')
        .eq('institution_id', profile.institution_id)
        .in('tipo', ['escola_avisos', 'escola_geral'])
        .order('ordem');
      return data || [];
    },
    enabled: !!profile?.institution_id,
  });

  // Leituras do usuario
  const { data: leituras = [] } = useQuery({
    queryKey: ['canal-leituras', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data } = await supabase
        .from('canal_leituras')
        .select('canal_id, ultima_leitura')
        .eq('usuario_id', profile.id);
      return data || [];
    },
    enabled: !!profile?.id,
  });

  // Mensagens nao lidas por canal
  const todosCanais = useMemo(() => {
    const ids = [...canaisCasa, ...canaisEscola];
    if (canalLideranca) ids.push(canalLideranca);
    if (canalConselho) ids.push(canalConselho);
    return ids;
  }, [canaisCasa, canaisEscola, canalLideranca, canalConselho]);

  const { data: mensagensNaoLidas = {} } = useQuery({
    queryKey: ['mensagens-nao-lidas', todosCanais.map(c => c.id), leituras],
    queryFn: async () => {
      if (!todosCanais.length || !profile?.id) return {};
      const resultado: Record<string, number> = {};
      for (const canal of todosCanais) {
        const leitura = leituras.find(l => l.canal_id === canal.id);
        const ultimaLeitura = leitura?.ultima_leitura || '1970-01-01';
        const { count } = await supabase
          .from('mensagens_canal')
          .select('*', { count: 'exact', head: true })
          .eq('canal_id', canal.id)
          .gt('created_at', ultimaLeitura)
          .neq('autor_id', profile.id);
        if (count) resultado[canal.id] = count;
      }
      return resultado;
    },
    enabled: todosCanais.length > 0 && !!profile?.id,
  });

  // Membros da casa (para online count + cargo check)
  const { data: membrosCasa = [] } = useQuery({
    queryKey: ['membros-chat', casa?.id, profile?.institution_id],
    queryFn: async () => {
      if (!casa?.id || !profile?.institution_id) return [];
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, nome, sobrenome, avatar_url, ultima_atividade, serie, turma, cargos_casa!cargos_casa_aluno_id_fkey(cargo, ativo)')
        .eq('casa_id', casa.id)
        .eq('institution_id', profile.institution_id);
      return data || [];
    },
    staleTime: 30000,
    enabled: !!casa?.id && !!profile?.institution_id,
  });

  // Mentor
  const { data: mentorCasa } = useQuery({
    queryKey: ['mentor-casa', casa?.id, profile?.institution_id],
    queryFn: async () => {
      if (!casa?.id || !profile?.institution_id) return null;
      const { data } = await supabase
        .from('professor_casa')
        .select('professor_id, profiles!professor_casa_professor_id_fkey(id, full_name, nome, sobrenome, avatar_url, ultima_atividade)')
        .eq('casa_id', casa.id)
        .eq('institution_id', profile.institution_id)
        .eq('ativo', true)
        .eq('eh_mentor_principal', true)
        .maybeSingle();
      return (data?.profiles as any) || null;
    },
    staleTime: 60000,
    enabled: !!casa?.id && !!profile?.institution_id,
  });

  // DMs nao lidas
  const { data: dmsNaoLidas = [] } = useQuery({
    queryKey: ['dms-nao-lidas', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data: participacoes } = await supabase
        .from('conversa_participantes')
        .select('conversa_id, ultima_leitura, conversa:conversas_privadas(updated_at)')
        .eq('usuario_id', profile.id);
      if (!participacoes) return [];
      const naoLidas: { conversaId: string; outroUsuarioId: string }[] = [];
      for (const p of participacoes) {
        const ultimaLeitura = new Date(p.ultima_leitura || '1970-01-01');
        const conversaData = p.conversa as { updated_at: string | null } | null;
        const ultimaMsg = new Date(conversaData?.updated_at || '1970-01-01');
        if (ultimaMsg > ultimaLeitura) {
          const { data: outro } = await supabase
            .from('conversa_participantes')
            .select('usuario_id')
            .eq('conversa_id', p.conversa_id)
            .neq('usuario_id', profile.id)
            .single();
          if (outro) naoLidas.push({ conversaId: p.conversa_id, outroUsuarioId: outro.usuario_id });
        }
      }
      return naoLidas;
    },
    enabled: !!profile?.id,
    staleTime: 10000,
  });

  // Realtime
  useEffect(() => {
    if (!profile?.id || !casa?.id) return;
    const channel = supabase
      .channel('global-chat-updates')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens_canal' }, (payload) => {
        if (payload.new.autor_id !== profile.id) {
          queryClient.invalidateQueries({ queryKey: ['mensagens-nao-lidas'] });
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens_privadas' }, (payload) => {
        if (payload.new.autor_id !== profile.id) {
          queryClient.invalidateQueries({ queryKey: ['dms-nao-lidas'] });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile?.id, casa?.id, queryClient]);

  // ═══════════════════════════════════════
  // COMPUTED
  // ═══════════════════════════════════════

  const membrosOnline = useMemo(() =>
    membrosCasa.filter(m => getStatusOnline(m.ultima_atividade).status === 'online').length
  , [membrosCasa]);

  const isLider = useMemo(() => {
    const meu = membrosCasa?.find(m => m.id === profile?.id);
    return !!meu?.cargos_casa?.find((c: any) => c.ativo && c.cargo === 'lider');
  }, [membrosCasa, profile?.id]);

  const isLiderancaCasa = useMemo(() => {
    const meu = membrosCasa?.find(m => m.id === profile?.id);
    return !!meu?.cargos_casa?.find((c: any) => c.ativo && (c.cargo === 'lider' || c.cargo === 'coordenador'));
  }, [membrosCasa, profile?.id]);

  // Iniciar conversa DM
  const iniciarConversa = async (outroUsuarioId: string) => {
    if (!profile?.id || !profile?.institution_id) return;
    try {
      const { data: minhasConversas } = await supabase
        .from('conversa_participantes').select('conversa_id').eq('usuario_id', profile.id);
      if (minhasConversas?.length) {
        const { data: conversaComum } = await supabase
          .from('conversa_participantes').select('conversa_id')
          .eq('usuario_id', outroUsuarioId)
          .in('conversa_id', minhasConversas.map(c => c.conversa_id))
          .limit(1).maybeSingle();
        if (conversaComum) { navigate(`/aluno/chat/dm/${conversaComum.conversa_id}`); return; }
      }
      const novaConversaId = crypto.randomUUID();
      await supabase.from('conversas_privadas').insert({ id: novaConversaId, institution_id: profile.institution_id });
      await supabase.from('conversa_participantes').insert([
        { conversa_id: novaConversaId, usuario_id: profile.id },
        { conversa_id: novaConversaId, usuario_id: outroUsuarioId },
      ]);
      navigate(`/aluno/chat/dm/${novaConversaId}`);
    } catch { toast.error('Erro ao iniciar conversa'); }
  };

  // ═══════════════════════════════════════
  // RENDER HELPERS
  // ═══════════════════════════════════════

  const CanalRow = ({ canal, locked = false, onLockedClick, hashColor = 'text-white/30' }: { canal: any; locked?: boolean; onLockedClick?: () => void; hashColor?: string }) => {
    const naoLidas = mensagensNaoLidas[canal.id] || 0;
    return (
      <button
        onClick={() => locked ? onLockedClick?.() : navigate(`/aluno/chat/canal/${canal.id}`)}
        className={cn(
          'w-full flex items-center gap-2.5 py-2.5 px-3 rounded-lg text-left transition-all',
          locked ? 'opacity-40 hover:opacity-50' : 'hover:bg-white/[0.08] active:scale-[0.98]'
        )}
      >
        <Hash className={cn('w-4 h-4 shrink-0', hashColor)} />
        <span className={cn('flex-1 text-sm truncate', naoLidas > 0 ? 'text-white font-medium' : 'text-white/70')}>
          {canal.nome.toLowerCase()}
        </span>
        {locked && <Lock className="w-3.5 h-3.5 text-white/20 shrink-0" />}
        {naoLidas > 0 && (
          <span className="min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
            {naoLidas > 99 ? '99+' : naoLidas}
          </span>
        )}
      </button>
    );
  };

  const DmRow = ({ membro, badge = false }: { membro: any; badge?: boolean }) => {
    const status = getStatusOnline(membro.ultima_atividade);
    const label = membro._label as string | undefined;
    return (
      <button
        onClick={() => iniciarConversa(membro.id)}
        className="w-full flex items-center gap-2.5 py-2.5 px-3 rounded-lg text-left hover:bg-white/[0.08] transition-all active:scale-[0.98]"
      >
        <div className="relative shrink-0">
          <div className="w-8 h-8 rounded-full bg-white/10 overflow-hidden">
            {membro.avatar_url ? (
              <img src={membro.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="flex items-center justify-center w-full h-full text-xs text-white/50">
                {(membro.nome || membro.full_name || '?').charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          {status.status === 'online' && (
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-[#0d0d0d]" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className={cn('text-sm truncate', badge ? 'text-white font-medium' : 'text-white/70')}>
              {membro.full_name || membro.nome || 'Sem nome'}
            </span>
            {membro.serie && (
              <span className="text-[9px] text-white/25 shrink-0">{membro.serie?.replace(/\D/g, '')}º{membro.turma || ''}</span>
            )}
          </div>
          {label && <span className="text-[10px] text-violet-400/60">{label}</span>}
        </div>
        {badge && (
          <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
        )}
      </button>
    );
  };

  // ═══════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════

  if (!casa) {
    return <div className="py-6 flex items-center justify-center min-h-[60vh]"><p className="text-white/60">Carregando...</p></div>;
  }

  // Filter
  const termo = searchTerm.toLowerCase();
  const filteredCasaCanais = termo ? canaisCasa.filter(c => c.nome.toLowerCase().includes(termo)) : canaisCasa;
  const filteredEscolaCanais = termo ? canaisEscola.filter(c => c.nome.toLowerCase().includes(termo)) : canaisEscola;

  // DM members sorted by role
  const liderancaMembros = membrosCasa.filter(m => {
    const cargo = m.cargos_casa?.find((c: any) => c.ativo);
    return cargo?.cargo && m.id !== profile?.id;
  }).sort((a, b) => {
    const ordem: Record<string, number> = { lider: 1, vice: 2, coordenador: 3, embaixador: 4 };
    const ca = a.cargos_casa?.find((c: any) => c.ativo)?.cargo || '';
    const cb = b.cargos_casa?.find((c: any) => c.ativo)?.cargo || '';
    return (ordem[ca] || 99) - (ordem[cb] || 99);
  });

  const membrosSemCargo = membrosCasa.filter(m => {
    const cargo = m.cargos_casa?.find((c: any) => c.ativo);
    return !cargo?.cargo && m.id !== profile?.id;
  });

  const filteredLideranca = termo ? liderancaMembros.filter(m => (m.full_name || m.nome || '').toLowerCase().includes(termo)) : liderancaMembros;
  const filteredMembros = termo ? membrosSemCargo.filter(m => (m.full_name || m.nome || '').toLowerCase().includes(termo)) : membrosSemCargo;

  const dmNaoLidaIds = new Set(dmsNaoLidas.map(d => d.outroUsuarioId));

  return (
    <div className="p-4 space-y-5 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-white">Chat</h1>
        <div className="flex items-center gap-1.5 text-white/40 text-xs">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          {membrosOnline} online
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <Input
          placeholder="Buscar canais ou membros..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 bg-white/[0.04] border-white/10 text-white placeholder:text-white/30 h-9 text-sm"
        />
      </div>

      {/* ── MINHA CASA ── */}
      <div>
        <div className="flex items-center gap-2 mb-2 px-1">
          <div className="w-1 h-3.5 rounded-full bg-blue-500" />
          <p className="text-[10px] font-semibold text-blue-400/80 uppercase tracking-widest">
            Minha Casa
          </p>
        </div>
        <div className="space-y-0.5">
          {filteredCasaCanais.map(canal => (
            <CanalRow key={canal.id} canal={canal} hashColor="text-blue-400/50" />
          ))}
          {canalLideranca && (
            <CanalRow
              canal={canalLideranca}
              locked={!isLiderancaCasa}
              onLockedClick={() => setShowLiderancaLockedModal(true)}
              hashColor="text-amber-400/50"
            />
          )}
          {canalConselho && (
            <CanalRow
              canal={canalConselho}
              locked={!isLider}
              onLockedClick={() => setShowLockedModal(true)}
              hashColor="text-amber-400/50"
            />
          )}
        </div>
      </div>

      {/* ── ESCOLA ── */}
      {filteredEscolaCanais.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2 px-1">
            <div className="w-1 h-3.5 rounded-full bg-emerald-500" />
            <p className="text-[10px] font-semibold text-emerald-400/80 uppercase tracking-widest">
              Escola
            </p>
          </div>
          <div className="space-y-0.5">
            {filteredEscolaCanais.map(canal => (
              <CanalRow key={canal.id} canal={canal} hashColor="text-emerald-400/50" />
            ))}
          </div>
        </div>
      )}

      {/* ── MENSAGENS DIRETAS ── */}
      <div>
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="flex items-center gap-2">
            <div className="w-1 h-3.5 rounded-full bg-violet-500" />
            <p className="text-[10px] font-semibold text-violet-400/80 uppercase tracking-widest">
              Mensagens Diretas
            </p>
          </div>
        </div>
        <div className="space-y-2">
          {/* Nao lidas (prioridade, sempre visivel) */}
          {[mentorCasa, ...filteredLideranca, ...filteredMembros].filter(Boolean).filter(m => dmNaoLidaIds.has(m!.id)).length > 0 && (
            <div>
              <p className="text-[9px] text-red-400/50 uppercase tracking-wider mb-1 px-3">Nao lidas</p>
              <div className="space-y-0.5">
                {[mentorCasa, ...filteredLideranca, ...filteredMembros].filter(Boolean).filter(m => dmNaoLidaIds.has(m!.id)).map(m => (
                  <DmRow key={m!.id} membro={m} badge={true} />
                ))}
              </div>
            </div>
          )}

          {/* Mentor */}
          {mentorCasa && !dmNaoLidaIds.has(mentorCasa.id) && (
            <div>
              <p className="text-[9px] text-white/20 uppercase tracking-wider mb-1 px-3">Mentor</p>
              <DmRow membro={{...mentorCasa, _label: 'Mentor'}} />
            </div>
          )}

          {/* Lider */}
          {(() => {
            const lider = filteredLideranca.filter(m => m.cargos_casa?.find((c: any) => c.ativo && c.cargo === 'lider') && !dmNaoLidaIds.has(m.id));
            return lider.length > 0 ? (
              <div>
                <p className="text-[9px] text-white/20 uppercase tracking-wider mb-1 px-3">Lider</p>
                <div className="space-y-0.5">{lider.map(m => <DmRow key={m.id} membro={m} />)}</div>
              </div>
            ) : null;
          })()}

          {/* Coordenadores */}
          {(() => {
            const coords = filteredLideranca.filter(m => m.cargos_casa?.find((c: any) => c.ativo && c.cargo === 'coordenador') && !dmNaoLidaIds.has(m.id));
            return coords.length > 0 ? (
              <div>
                <p className="text-[9px] text-white/20 uppercase tracking-wider mb-1 px-3">Coordenadores</p>
                <div className="space-y-0.5">{coords.map(m => <DmRow key={m.id} membro={m} />)}</div>
              </div>
            ) : null;
          })()}

          {/* Membros */}
          {filteredMembros.filter(m => !dmNaoLidaIds.has(m.id)).length > 0 && (
            <div>
              <p className="text-[9px] text-white/20 uppercase tracking-wider mb-1 px-3">Membros</p>
              <div className="space-y-0.5">
                {filteredMembros.filter(m => !dmNaoLidaIds.has(m.id)).slice(0, searchTerm ? 999 : 5).map(m => (
                  <DmRow key={m.id} membro={m} />
                ))}
                {!searchTerm && filteredMembros.filter(m => !dmNaoLidaIds.has(m.id)).length > 5 && (
                  <button onClick={() => navigate('/aluno/chat/membros')}
                    className="w-full py-2 text-[10px] text-violet-400/50 hover:text-violet-400 transition-colors">
                    Ver todos os {membrosSemCargo.length} membros
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <ConselhoLideresLocked isOpen={showLockedModal} onClose={() => setShowLockedModal(false)} />
      <LiderancaCasaLocked isOpen={showLiderancaLockedModal} onClose={() => setShowLiderancaLockedModal(false)} />
    </div>
  );
};

export default ChatPage;
