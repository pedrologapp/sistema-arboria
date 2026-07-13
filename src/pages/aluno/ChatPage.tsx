import { useState, useMemo, useEffect, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, MessageCircle, Hash, Users, Lock, AtSign, Crown, Megaphone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { F2_ALUNO_VISOR_NOVO } from '@/config/f2AlunoVisorNovo';
import { useStudent } from '@/contexts/StudentContext';
import { Input } from '@/components/ui/input';
import { getStatusOnline } from '@/utils/statusOnline';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ConselhoLideresLocked } from '@/components/chat/ConselhoLideresLocked';
import { LiderancaCasaLocked } from '@/components/chat/LiderancaCasaLocked';
import '@/styles/missoes-scifi.css';

// "#a78bfa" -> "167, 139, 250" (alimenta --sf-accent-rgb com a cor da casa)
const hexToRgb = (hex: string): string | null => {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  return m ? `${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)}` : null;
};

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
        .in('tipo', ['escola_avisos'])
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

  // Realtime (com fallback se WebSocket falhar no mobile)
  useEffect(() => {
    if (!profile?.id || !casa?.id) return;
    let channel: any = null;
    try {
      channel = supabase
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
    } catch (err) {
      console.warn('[Chat] WebSocket indisponível:', err);
    }
    return () => { if (channel) try { supabase.removeChannel(channel); } catch {} };
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

  // Iniciar conversa DM (só com membros da mesma casa, exceto líder→líder)
  const iniciarConversa = async (outroUsuarioId: string) => {
    if (!profile?.id || !profile?.institution_id) return;

    // Verificar se o outro usuario é da mesma casa (ou se sou líder falando com líder)
    const membroDaCasa = membrosCasa.some(m => m.id === outroUsuarioId);
    const ehMentor = mentorCasa?.id === outroUsuarioId;
    if (!membroDaCasa && !ehMentor) {
      // Se sou líder, verificar se o outro é líder de outra casa
      if (isLider) {
        const { data: cargoOutro } = await supabase.from('cargos_casa')
          .select('cargo').eq('aluno_id', outroUsuarioId).eq('ativo', true).eq('cargo', 'lider').maybeSingle();
        if (!cargoOutro) {
          toast.error('Voce so pode conversar com membros da sua casa');
          return;
        }
      } else {
        toast.error('Voce so pode conversar com membros da sua casa');
        return;
      }
    }

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

  // Nome curto: primeiro + segundo nome
  const getNomeCurto = (membro: any) => {
    const full = membro.full_name || membro.nome || 'Sem nome';
    const partes = full.trim().split(/\s+/);
    if (partes.length <= 2) return full;
    return `${partes[0]} ${partes[1]}`;
  };

  // Nomes amigáveis para canais por tipo
  const getNomeCanal = (canal: any) => {
    switch (canal.tipo) {
      case 'lideranca_casa': return `lideres-e-coordenadores`;
      case 'conselho_lideres': return `conselho-dos-lideres`;
      case 'escola_geral': return `geral-da-escola`;
      case 'escola_avisos': return `avisos-da-escola`;
      default: return canal.nome?.toLowerCase() || 'canal';
    }
  };

  // ── Visor novo: nome de exibicao do canal (titulo limpo, sem hashtag) ──
  const getNomeCanalNovo = (canal: any) => {
    switch (canal.tipo) {
      case 'mentoria': return 'Mentoria';
      case 'lideranca_casa': return 'Lideranca';
      case 'conselho_lideres': return 'Conselho dos lideres';
      case 'escola_avisos': return 'Avisos da escola';
      case 'escola_geral': return 'Geral da escola';
      default: return canal.nome || 'Canal';
    }
  };

  // ── Visor novo: linha de previa do canal (sem query nova; usa descricao/tipo) ──
  const getPreviewCanalNovo = (canal: any, locked: boolean) => {
    if (locked) {
      if (canal.tipo === 'conselho_lideres') return 'So para lideres de casa';
      return 'So para lideres e coordenadores';
    }
    if (canal.descricao) return canal.descricao;
    switch (canal.tipo) {
      case 'mentoria': return 'Conversa com o mentor da casa';
      case 'lideranca_casa': return 'So para lideres e coordenadores';
      case 'conselho_lideres': return 'So para lideres de casa';
      case 'escola_avisos': return 'Comunicados da escola';
      case 'escola_geral': return 'Conversa geral da escola';
      default: return 'Canal da casa';
    }
  };

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
          {getNomeCanal(canal)}
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
        className="w-full flex items-center gap-2 py-2 px-3 rounded-lg text-left hover:bg-white/[0.08] transition-all active:scale-[0.98]"
      >
        <div className="relative shrink-0">
          <div className="w-7 h-7 rounded-full bg-white/10 overflow-hidden">
            {membro.avatar_url ? (
              <img src={membro.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="flex items-center justify-center w-full h-full text-[10px] text-white/50">
                {(membro.nome || membro.full_name || '?').charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          {status.status === 'online' && (
            <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-500 border-[1.5px] border-[#0d0d0d]" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className={cn('text-xs truncate', badge ? 'text-white font-medium' : 'text-white/70')}>
              {getNomeCurto(membro)}
            </span>
            {membro.serie && <span className="text-[9px] text-white/25 shrink-0">{membro.serie?.replace(/\D/g, '')}º{membro.turma || ''}</span>}
            {label && <span className="text-[9px] text-violet-400/50">{label}</span>}
          </div>
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
  const filteredCasaCanais = termo ? canaisCasa.filter(c => getNomeCanal(c).includes(termo)) : canaisCasa;
  const filteredEscolaCanais = termo ? canaisEscola.filter(c => getNomeCanal(c).includes(termo)) : canaisEscola;

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

  // Filtrar DMs: só mostrar de membros da casa (+ mentor + líderes de outras casas se sou líder)
  const idsMinhaCasa = new Set(membrosCasa.map(m => m.id));
  if (mentorCasa?.id) idsMinhaCasa.add(mentorCasa.id);
  const dmsPermitidas = dmsNaoLidas.filter(d => idsMinhaCasa.has(d.outroUsuarioId));
  const dmNaoLidaIds = new Set(dmsPermitidas.map(d => d.outroUsuarioId));

  // Acento dos cards = cor da casa
  const accentColor = casaColor || casa?.cor_hex || '#a78bfa';
  const accentRgb = hexToRgb(accentColor) || '167, 139, 250';
  const scifiVars = { '--sf-accent': accentColor, '--sf-accent-rgb': accentRgb } as CSSProperties;

  // ═══════════════════════════════════════
  // VISOR NOVO (atras do flag F2_ALUNO_VISOR_NOVO)
  // Re-renderiza os MESMOS dados e regras de acesso no layout do mockup.
  // Nao cria query nova nem afrouxa gating: canais bloqueados seguem
  // apagados + cadeado, com o mesmo onLockedClick de hoje.
  // ═══════════════════════════════════════
  if (F2_ALUNO_VISOR_NOVO) {
    const accentTint = /^#[0-9a-f]{6}$/i.test(accentColor) ? `${accentColor}22` : 'rgba(255,255,255,.06)';

    const CanalRowNovo = ({ canal, locked = false, onLockedClick, icon }: { canal: any; locked?: boolean; onLockedClick?: () => void; icon: JSX.Element }) => {
      const naoLidas = mensagensNaoLidas[canal.id] || 0;
      return (
        <button
          onClick={() => (locked ? onLockedClick?.() : navigate(`/aluno/chat/canal/${canal.id}`))}
          className={cn(
            'w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-left border border-white/[0.08] bg-white/[0.035] transition-all',
            locked ? 'opacity-60' : 'hover:bg-white/[0.06] active:scale-[0.99]'
          )}
        >
          <div className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0" style={{ backgroundColor: accentTint, color: accentColor }}>
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-white truncate">{getNomeCanalNovo(canal)}</p>
            <p className="text-[11px] text-white/40 truncate">{getPreviewCanalNovo(canal, locked)}</p>
          </div>
          {locked && <Lock className="w-3.5 h-3.5 text-white/30 shrink-0" />}
          {!locked && naoLidas > 0 && <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: accentColor }} />}
        </button>
      );
    };

    // Canais da casa em GRADE (2 colunas). Mesmas regras de gating do CanalRowNovo.
    const CanalCardNovo = ({ canal, locked = false, onLockedClick, icon }: { canal: any; locked?: boolean; onLockedClick?: () => void; icon: JSX.Element }) => {
      const naoLidas = mensagensNaoLidas[canal.id] || 0;
      return (
        <button
          onClick={() => (locked ? onLockedClick?.() : navigate(`/aluno/chat/canal/${canal.id}`))}
          className={cn(
            'flex flex-col gap-2.5 p-3.5 rounded-2xl text-left border border-white/[0.08] bg-white/[0.035] transition-all min-h-[96px]',
            locked ? 'opacity-60' : 'hover:bg-white/[0.06] active:scale-[0.98]'
          )}
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0" style={{ backgroundColor: accentTint, color: accentColor }}>
              {icon}
            </div>
            {locked ? (
              <Lock className="w-3.5 h-3.5 text-white/30 shrink-0" />
            ) : (
              naoLidas > 0 && <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: accentColor }} />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-white truncate">{getNomeCanalNovo(canal)}</p>
            <p className="text-[11px] text-white/40 truncate">{getPreviewCanalNovo(canal, locked)}</p>
          </div>
        </button>
      );
    };

    const DmRowNovo = ({ membro, badge = false }: { membro: any; badge?: boolean }) => {
      const label = membro._label as string | undefined;
      const inicial = (membro.nome || membro.full_name || '?').charAt(0).toUpperCase();
      const serieTxt = membro.serie ? `${membro.serie.replace(/\D/g, '')}º${membro.turma || ''}` : '';
      const preview = label || (serieTxt ? `Membro da casa · ${serieTxt}` : 'Membro da casa');
      return (
        <button
          onClick={() => iniciarConversa(membro.id)}
          className="w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-left border border-white/[0.08] bg-white/[0.035] hover:bg-white/[0.06] active:scale-[0.99] transition-all"
        >
          <div className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 overflow-hidden bg-white/[0.06] text-white/70 text-[12px] font-bold">
            {membro.avatar_url ? <img src={membro.avatar_url} alt="" className="w-full h-full object-cover" /> : inicial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-white truncate">{getNomeCurto(membro)}</p>
            <p className="text-[11px] text-white/40 truncate">{preview}</p>
          </div>
          {badge && <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: accentColor }} />}
        </button>
      );
    };

    // DMs no visor novo: MESMAS pessoas e MESMAS regras que o layout atual.
    const cargoLabel: Record<string, string> = { lider: 'Lider da casa', vice: 'Vice-lider', coordenador: 'Coordenador', embaixador: 'Embaixador' };
    const dmMentor = mentorCasa ? [{ ...mentorCasa, _label: 'Mentor da casa' }] : [];
    const dmLideranca = filteredLideranca.map((m) => {
      const cargo = m.cargos_casa?.find((c: any) => c.ativo)?.cargo;
      return { ...m, _label: cargoLabel[cargo] || 'Lideranca' };
    });
    // Buscando: mostra TODOS os membros que casam; sem busca, so os 6 primeiros.
    const buscando = termo.length > 0;
    const dmMembrosVisiveis = buscando ? filteredMembros : filteredMembros.slice(0, 6);
    const dmMentorFiltrado = buscando
      ? dmMentor.filter((m) => (m.full_name || m.nome || '').toLowerCase().includes(termo))
      : dmMentor;
    const dmLista = [...dmMentorFiltrado, ...dmLideranca, ...dmMembrosVisiveis];

    return (
      <div className="p-4 pb-24 space-y-4">
        {/* Titulo */}
        <div className="flex items-center justify-between pt-1">
          <h1 className="font-serif text-[22px] font-semibold text-white">Conversas</h1>
          <div className="flex items-center gap-1.5 text-white/40 text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            {membrosOnline} online
          </div>
        </div>

        {/* Busca de membros */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar membro"
            className="w-full pl-9 pr-3 py-2.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-[13px] text-white placeholder-white/30 focus:outline-none focus:border-white/20"
          />
        </div>

        {/* Canais da casa */}
        {!buscando && (
        <div className="space-y-2">
          <p className="text-[10px] tracking-[0.28em] uppercase text-white/30 px-0.5">Canais da casa</p>
          <div className="grid grid-cols-2 gap-2">
            {canaisCasa.map((canal) => (
              <CanalCardNovo
                key={canal.id}
                canal={canal}
                icon={canal.tipo === 'mentoria' ? <AtSign className="w-4 h-4" /> : <Hash className="w-4 h-4" />}
              />
            ))}
            {canalLideranca && (
              <CanalCardNovo
                canal={canalLideranca}
                locked={!isLiderancaCasa}
                onLockedClick={() => setShowLiderancaLockedModal(true)}
                icon={<Crown className="w-4 h-4" />}
              />
            )}
            {canalConselho && (
              <CanalCardNovo
                canal={canalConselho}
                locked={!isLider}
                onLockedClick={() => setShowLockedModal(true)}
                icon={<Crown className="w-4 h-4" />}
              />
            )}
          </div>
        </div>
        )}

        {/* Escola */}
        {!buscando && canaisEscola.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] tracking-[0.28em] uppercase text-white/30 px-0.5">Escola</p>
            <div className="space-y-2">
              {canaisEscola.map((canal) => (
                <CanalRowNovo key={canal.id} canal={canal} icon={<Megaphone className="w-4 h-4" />} />
              ))}
            </div>
          </div>
        )}

        {/* Mensagens (DMs) / resultados da busca */}
        <div className="space-y-2">
          <p className="text-[10px] tracking-[0.28em] uppercase text-white/30 px-0.5">
            {buscando ? 'Membros' : 'Mensagens'}
          </p>
          <div className="space-y-2">
            {dmLista.map((m) => (
              <DmRowNovo key={m.id} membro={m} badge={dmNaoLidaIds.has(m.id)} />
            ))}
            {!buscando && filteredMembros.length > dmMembrosVisiveis.length && (
              <button
                onClick={() => navigate('/aluno/chat/membros')}
                className="w-full py-2.5 text-[11px] text-white/40 hover:text-white/70 transition-colors"
              >
                Ver todos os {membrosSemCargo.length} membros
              </button>
            )}
            {dmLista.length === 0 && (
              <p className="text-[12px] text-white/30 px-0.5 py-2">
                {buscando ? 'Nenhum membro encontrado.' : 'Ainda nao ha conversas por aqui.'}
              </p>
            )}
          </div>
        </div>

        {/* Modais de canal bloqueado (mesmo gating de hoje) */}
        <ConselhoLideresLocked isOpen={showLockedModal} onClose={() => setShowLockedModal(false)} />
        <LiderancaCasaLocked isOpen={showLiderancaLockedModal} onClose={() => setShowLiderancaLockedModal(false)} />
      </div>
    );
  }

  return (
    <div className="scifi p-4 space-y-5 pb-24" style={scifiVars}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-white">Chat</h1>
        <div className="flex items-center gap-1.5 text-white/40 text-xs">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          {membrosOnline} online
        </div>
      </div>

      {/* Search */}
      <div data-augmented-ui="tl-clip br-clip border" className="sf-card relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none z-10" />
        <Input
          placeholder="Buscar canais ou membros..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 bg-transparent border-0 text-white placeholder:text-white/30 h-10 text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
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
        <div data-augmented-ui="tl-clip tr-clip bl-clip br-clip border" className="sf-panel p-2 space-y-0.5">
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
          <div data-augmented-ui="tl-clip tr-clip bl-clip br-clip border" className="sf-panel p-2 space-y-0.5">
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
        <div data-augmented-ui="tl-clip tr-clip bl-clip br-clip border" className="sf-panel p-2 space-y-2">
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
