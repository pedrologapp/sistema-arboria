import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Hash, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useProfessor } from '@/contexts/ProfessorContext';
import { Input } from '@/components/ui/input';
import { getStatusOnline } from '@/utils/statusOnline';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const ProfessorChatPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile, casaMentor } = useProfessor();
  const [searchTerm, setSearchTerm] = useState('');

  // ═══════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════

  // Canais da casa (texto + mentoria)
  const { data: canaisCasa = [] } = useQuery({
    queryKey: ['prof-canais-casa', casaMentor?.id],
    queryFn: async () => {
      if (!casaMentor?.id) return [];
      const { data } = await supabase
        .from('canais_casa')
        .select('*')
        .eq('casa_id', casaMentor.id)
        .in('tipo', ['texto', 'mentoria'])
        .order('ordem');
      return data || [];
    },
    enabled: !!casaMentor?.id,
  });

  // Canal lideranca
  const { data: canalLideranca } = useQuery({
    queryKey: ['prof-canal-lideranca', casaMentor?.id, profile?.institution_id],
    queryFn: async () => {
      if (!casaMentor?.id || !profile?.institution_id) return null;
      const { data } = await supabase
        .from('canais_casa')
        .select('*')
        .eq('tipo', 'lideranca_casa')
        .eq('casa_id', casaMentor.id)
        .eq('institution_id', profile.institution_id)
        .maybeSingle();
      return data;
    },
    enabled: !!casaMentor?.id && !!profile?.institution_id,
  });

  // Canais escola
  const { data: canaisEscola = [] } = useQuery({
    queryKey: ['prof-canais-escola', profile?.institution_id],
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

  // Leituras
  const { data: leituras = [] } = useQuery({
    queryKey: ['prof-canal-leituras', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data } = await supabase.from('canal_leituras').select('canal_id, ultima_leitura').eq('usuario_id', profile.id);
      return data || [];
    },
    enabled: !!profile?.id,
  });

  // Nao lidas
  const todosCanais = useMemo(() => {
    const ids = [...canaisCasa, ...canaisEscola];
    if (canalLideranca) ids.push(canalLideranca);
    return ids;
  }, [canaisCasa, canaisEscola, canalLideranca]);

  const { data: mensagensNaoLidas = {} } = useQuery({
    queryKey: ['prof-msg-nao-lidas', todosCanais.map(c => c.id), leituras],
    queryFn: async () => {
      if (!todosCanais.length || !profile?.id) return {};
      const resultado: Record<string, number> = {};
      for (const canal of todosCanais) {
        const leitura = leituras.find(l => l.canal_id === canal.id);
        const ultimaLeitura = leitura?.ultima_leitura || '1970-01-01';
        const { count } = await supabase.from('mensagens_canal')
          .select('*', { count: 'exact', head: true })
          .eq('canal_id', canal.id).gt('created_at', ultimaLeitura).neq('autor_id', profile.id);
        if (count) resultado[canal.id] = count;
      }
      return resultado;
    },
    enabled: todosCanais.length > 0 && !!profile?.id,
  });

  // Alunos da casa (para DMs)
  const { data: alunosCasa = [] } = useQuery({
    queryKey: ['prof-alunos-dm', casaMentor?.id, profile?.institution_id],
    queryFn: async () => {
      if (!casaMentor?.id || !profile?.institution_id) return [];
      const { data } = await supabase.from('profiles')
        .select('id, full_name, nome, sobrenome, avatar_url, ultima_atividade, serie, turma, cargos_casa!cargos_casa_aluno_id_fkey(cargo, ativo)')
        .eq('casa_id', casaMentor.id).eq('institution_id', profile.institution_id).order('full_name');
      return data || [];
    },
    staleTime: 120000,
    enabled: !!casaMentor?.id && !!profile?.institution_id,
  });

  // DMs nao lidas
  const { data: dmsNaoLidas = [] } = useQuery({
    queryKey: ['prof-dms-nao-lidas', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data: participacoes } = await supabase.from('conversa_participantes')
        .select('conversa_id, ultima_leitura, conversa:conversas_privadas(updated_at)').eq('usuario_id', profile.id);
      if (!participacoes) return [];
      const naoLidas: string[] = [];
      for (const p of participacoes) {
        const ul = new Date(p.ultima_leitura || '1970-01-01');
        const cd = p.conversa as { updated_at: string | null } | null;
        if (new Date(cd?.updated_at || '1970-01-01') > ul) {
          const { data: outro } = await supabase.from('conversa_participantes')
            .select('usuario_id').eq('conversa_id', p.conversa_id).neq('usuario_id', profile.id).single();
          if (outro) naoLidas.push(outro.usuario_id);
        }
      }
      return naoLidas;
    },
    enabled: !!profile?.id,
    staleTime: 30000,
  });

  // Realtime (com fallback se WebSocket falhar no mobile)
  useEffect(() => {
    if (!profile?.id) return;
    let ch: any = null;
    try {
      ch = supabase.channel('prof-chat-updates')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens_canal' }, (p) => {
          if (p.new.autor_id !== profile.id) queryClient.invalidateQueries({ queryKey: ['prof-msg-nao-lidas'] });
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens_privadas' }, (p) => {
          if (p.new.autor_id !== profile.id) queryClient.invalidateQueries({ queryKey: ['prof-dms-nao-lidas'] });
        })
        .subscribe();
    } catch (err) {
      console.warn('[ProfessorChat] WebSocket indisponível:', err);
    }
    return () => { if (ch) try { supabase.removeChannel(ch); } catch {} };
  }, [profile?.id, queryClient]);

  // ═══════════════════════════════════════
  // COMPUTED
  // ═══════════════════════════════════════

  const membrosOnline = useMemo(() =>
    alunosCasa.filter(m => getStatusOnline(m.ultima_atividade).status === 'online').length
  , [alunosCasa]);

  const dmNaoLidaIds = new Set(dmsNaoLidas);

  // Iniciar conversa
  const iniciarConversa = async (outroId: string) => {
    if (!profile?.id || !profile?.institution_id) return;
    try {
      const { data: minhas } = await supabase.from('conversa_participantes').select('conversa_id').eq('usuario_id', profile.id);
      if (minhas?.length) {
        const { data: existente } = await supabase.from('conversa_participantes').select('conversa_id')
          .eq('usuario_id', outroId).in('conversa_id', minhas.map(c => c.conversa_id)).limit(1).maybeSingle();
        if (existente) { navigate(`/professor/chat/dm/${existente.conversa_id}`); return; }
      }
      const id = crypto.randomUUID();
      await supabase.from('conversas_privadas').insert({ id, institution_id: profile.institution_id });
      await supabase.from('conversa_participantes').insert([
        { conversa_id: id, usuario_id: profile.id },
        { conversa_id: id, usuario_id: outroId },
      ]);
      navigate(`/professor/chat/dm/${id}`);
    } catch { toast.error('Erro ao iniciar conversa'); }
  };

  // ═══════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════

  const CanalRow = ({ canal, hashColor = 'text-white/30', readOnly = false }: { canal: any; hashColor?: string; readOnly?: boolean }) => {
    const naoLidas = mensagensNaoLidas[canal.id] || 0;
    return (
      <button
        onClick={() => navigate(`/professor/chat/canal/${canal.id}`)}
        className="w-full flex items-center gap-2.5 py-2.5 px-3 rounded-lg text-left hover:bg-white/[0.08] transition-all active:scale-[0.98]"
      >
        <Hash className={cn('w-4 h-4 shrink-0', hashColor)} />
        <span className={cn('flex-1 text-sm truncate', naoLidas > 0 ? 'text-white font-medium' : 'text-white/70')}>
          {canal.nome.toLowerCase()}
        </span>
        {readOnly && <span className="text-[9px] text-white/20">leitura</span>}
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
    const cargo = membro.cargos_casa?.find((c: any) => c.ativo)?.cargo;
    const cargoLabel = cargo === 'lider' ? 'Lider' : cargo === 'coordenador' ? 'Coord.' : '';
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
          <span className={cn('text-sm truncate block', badge ? 'text-white font-medium' : 'text-white/70')}>
            {membro.full_name || membro.nome || 'Sem nome'}
          </span>
          {(cargoLabel || membro.serie) && (
            <span className="text-[10px] text-white/30">
              {cargoLabel && <span className="text-amber-400/60 mr-1">{cargoLabel}</span>}
              {membro.serie} {membro.turma}
            </span>
          )}
        </div>
        {badge && <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />}
      </button>
    );
  };

  // ═══════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════

  const termo = searchTerm.toLowerCase();
  const filteredCasa = termo ? canaisCasa.filter(c => c.nome.toLowerCase().includes(termo)) : canaisCasa;
  const filteredEscola = termo ? canaisEscola.filter(c => c.nome.toLowerCase().includes(termo)) : canaisEscola;

  // Separar canais: mentoria vs texto (read-only)
  const canalMentoria = filteredCasa.find(c => c.tipo === 'mentoria');
  const canaisTexto = filteredCasa.filter(c => c.tipo === 'texto');

  // DM: lideranca primeiro, depois membros
  const liderancaAlunos = alunosCasa.filter(m => m.cargos_casa?.find((c: any) => c.ativo)?.cargo).sort((a, b) => {
    const ordem: Record<string, number> = { lider: 1, coordenador: 2, embaixador: 3 };
    const ca = a.cargos_casa?.find((c: any) => c.ativo)?.cargo || '';
    const cb = b.cargos_casa?.find((c: any) => c.ativo)?.cargo || '';
    return (ordem[ca] || 99) - (ordem[cb] || 99);
  });
  const membrosComuns = alunosCasa.filter(m => !m.cargos_casa?.find((c: any) => c.ativo)?.cargo);
  const filteredLideranca = termo ? liderancaAlunos.filter(m => (m.full_name || m.nome || '').toLowerCase().includes(termo)) : liderancaAlunos;
  const filteredMembros = termo ? membrosComuns.filter(m => (m.full_name || m.nome || '').toLowerCase().includes(termo)) : membrosComuns;

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
          placeholder="Buscar canais ou alunos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 bg-white/[0.04] border-violet-500/10 text-white placeholder:text-white/30 h-9 text-sm"
        />
      </div>

      {/* MINHA CASA */}
      <div>
        <div className="flex items-center gap-2 mb-2 px-1">
          <div className="w-1 h-3.5 rounded-full bg-blue-500" />
          <p className="text-[10px] font-semibold text-blue-400/80 uppercase tracking-widest">
            Casa {casaMentor?.nome || ''}
          </p>
        </div>
        <div className="space-y-0.5">
          {/* Mentoria: professor pode falar */}
          {canalMentoria && (
            <CanalRow canal={canalMentoria} hashColor="text-amber-400/50" />
          )}
          {/* Canais de texto: somente leitura */}
          {canaisTexto.map(canal => (
            <CanalRow key={canal.id} canal={canal} hashColor="text-blue-400/50" readOnly />
          ))}
          {/* Lideranca */}
          {canalLideranca && (
            <CanalRow canal={canalLideranca} hashColor="text-amber-400/50" />
          )}
        </div>
      </div>

      {/* ESCOLA */}
      {filteredEscola.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2 px-1">
            <div className="w-1 h-3.5 rounded-full bg-emerald-500" />
            <p className="text-[10px] font-semibold text-emerald-400/80 uppercase tracking-widest">Escola</p>
          </div>
          <div className="space-y-0.5">
            {filteredEscola.map(canal => (
              <CanalRow key={canal.id} canal={canal} hashColor="text-emerald-400/50" />
            ))}
          </div>
        </div>
      )}

      {/* MENSAGENS DIRETAS */}
      <div>
        <div className="flex items-center gap-2 mb-2 px-1">
          <div className="w-1 h-3.5 rounded-full bg-violet-500" />
          <p className="text-[10px] font-semibold text-violet-400/80 uppercase tracking-widest">Mensagens Diretas</p>
        </div>
        <div className="space-y-0.5">
          {/* Com mensagens nao lidas primeiro */}
          {[...filteredLideranca, ...filteredMembros]
            .filter(m => dmNaoLidaIds.has(m.id))
            .map(m => <DmRow key={m.id} membro={m} badge />)
          }
          {/* Lideranca */}
          {filteredLideranca
            .filter(m => !dmNaoLidaIds.has(m.id))
            .slice(0, 5)
            .map(m => <DmRow key={m.id} membro={m} />)
          }
          {/* Membros */}
          {filteredMembros
            .filter(m => !dmNaoLidaIds.has(m.id))
            .slice(0, 5)
            .map(m => <DmRow key={m.id} membro={m} />)
          }
          {alunosCasa.length > 10 && !searchTerm && (
            <p className="py-2 text-center text-[10px] text-white/25">
              {alunosCasa.length} alunos na casa
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfessorChatPage;
