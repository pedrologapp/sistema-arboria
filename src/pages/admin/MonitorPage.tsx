import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, RefreshCw, Eye } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CasaBrasao } from '@/components/CasaBrasao';
import ModalSincronizarScores from '@/components/admin/ModalSincronizarScores';

type FiltroTempo = 'hoje' | '7dias' | 'todas';

interface ObservacaoFeed {
  id: string;
  created_at: string;
  sinal_id: number;
  observacao_texto: string | null;
  foi_cross_im: boolean | null;
  aluno: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    casa_id: number | null;
  };
  professor: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
  sinal: {
    emoji: string;
    label_pt: string;
    valencia: string;
  };
  casa: {
    nome: string;
    emoji: string | null;
    cor_hex: string | null;
    brasao_url: string | null;
  } | null;
}

const getFilterDate = (filtro: FiltroTempo): string | null => {
  if (filtro === 'todas') return null;
  const now = new Date();
  if (filtro === 'hoje') {
    now.setHours(0, 0, 0, 0);
  } else {
    now.setDate(now.getDate() - 7);
    now.setHours(0, 0, 0, 0);
  }
  return now.toISOString();
};

const MonitorPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [filtro, setFiltro] = useState<FiltroTempo>('hoje');

  const { data: adminProfile, isLoading } = useQuery({
    queryKey: ['admin-profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('institution_id')
        .eq('id', user?.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const institutionId = adminProfile?.institution_id;

  const { data: observacoes = [], isLoading: loadingObs } = useQuery({
    queryKey: ['admin-observacoes-feed', institutionId, filtro],
    queryFn: async () => {
      let query = supabase
        .from('observacoes')
        .select('id, created_at, sinal_id, observacao_texto, foi_cross_im, aluno_id, professor_id')
        .eq('institution_id', institutionId!)
        .order('created_at', { ascending: false })
        .limit(50);

      const filterDate = getFilterDate(filtro);
      if (filterDate) {
        query = query.gte('created_at', filterDate);
      }

      const { data: obsData, error } = await query;
      if (error) throw error;
      if (!obsData || obsData.length === 0) return [];

      const alunoIds = [...new Set(obsData.map(o => o.aluno_id))];
      const professorIds = [...new Set(obsData.map(o => o.professor_id))];
      const sinalIds = [...new Set(obsData.map(o => o.sinal_id))];

      const [alunosRes, professoresRes, sinaisRes] = await Promise.all([
        supabase.from('profiles').select('id, full_name, avatar_url, casa_id').in('id', alunoIds),
        supabase.from('profiles').select('id, full_name, avatar_url').in('id', professorIds),
        supabase.from('sinais').select('id, emoji, label_pt, valencia').in('id', sinalIds),
      ]);

      const alunosMap: Record<string, any> = {};
      (alunosRes.data || []).forEach(a => { alunosMap[a.id] = a; });
      const profsMap: Record<string, any> = {};
      (professoresRes.data || []).forEach(p => { profsMap[p.id] = p; });
      const sinaisMap: Record<number, any> = {};
      (sinaisRes.data || []).forEach((s: any) => { sinaisMap[s.id] = s; });

      const casaIds = [...new Set(Object.values(alunosMap).map((a: any) => a.casa_id).filter(Boolean))];
      let casasMap: Record<number, any> = {};
      if (casaIds.length > 0) {
        const { data: casas } = await supabase
          .from('inteligencias')
          .select('id, nome, emoji, cor_hex, brasao_url')
          .in('id', casaIds);
        (casas || []).forEach((c: any) => {
          casasMap[c.id] = { nome: c.nome, emoji: c.emoji, cor_hex: c.cor_hex, brasao_url: c.brasao_url };
        });
      }

      return obsData.map(o => ({
        id: o.id,
        created_at: o.created_at,
        sinal_id: o.sinal_id,
        observacao_texto: o.observacao_texto,
        foi_cross_im: o.foi_cross_im,
        aluno: alunosMap[o.aluno_id] || { id: o.aluno_id, full_name: 'Aluno', avatar_url: null, casa_id: null },
        professor: profsMap[o.professor_id] || { id: o.professor_id, full_name: 'Professor', avatar_url: null },
        sinal: sinaisMap[o.sinal_id] || { emoji: '❓', label_pt: 'Desconhecido', valencia: '' },
        casa: alunosMap[o.aluno_id]?.casa_id ? casasMap[alunosMap[o.aluno_id].casa_id] || null : null,
      })) as ObservacaoFeed[];
    },
    enabled: !!institutionId,
    refetchInterval: 30000,
  });

  // Realtime subscription
  useEffect(() => {
    if (!institutionId) return;

    const channel = supabase
      .channel('admin-obs-feed')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'observacoes',
          filter: `institution_id=eq.${institutionId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['admin-observacoes-feed'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [institutionId, queryClient]);

  const getInitials = (name: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  };

  const getValenciaColor = (valencia: string) => {
    if (valencia === 'positiva' || valencia === 'positivo') return '#22C55E';
    if (valencia === 'atencao' || valencia === 'negativa' || valencia === 'negativo') return '#EF4444';
    return '#6B7280';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500" />
      </div>
    );
  }

  const filtros: { key: FiltroTempo; label: string }[] = [
    { key: 'hoje', label: 'Hoje' },
    { key: '7dias', label: '7 dias' },
    { key: 'todas', label: 'Todas' },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A] px-4 py-6">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center">
              <Activity className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Monitoramento</h1>
              <p className="text-sm text-white/50">Dashboard e sincronização</p>
            </div>
          </div>

          <Button
            onClick={() => setShowSyncModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
            disabled={!institutionId}
          >
            <RefreshCw className="w-4 h-4" />
            Sincronizar Scores
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
        <div className="grid gap-4">
          {/* Sync section */}
          <div className="p-6 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
                <RefreshCw className="w-6 h-6 text-indigo-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-white mb-1">
                  Sincronização de Scores
                </h2>
                <p className="text-sm text-white/60 mb-4">
                  Sincronize os scores de inteligência dos alunos com o sistema externo N8N.
                </p>
                <Button
                  onClick={() => setShowSyncModal(true)}
                  variant="outline"
                  className="border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 hover:text-indigo-300"
                  disabled={!institutionId}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Abrir Sincronização
                </Button>
              </div>
            </div>
          </div>

          {/* Feed de Observações */}
          <div className="p-6 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-indigo-400" />
                <h2 className="text-lg font-semibold text-white">Atividade Recente</h2>
              </div>
              <div className="flex gap-1">
                {filtros.map(f => (
                  <button
                    key={f.key}
                    onClick={() => setFiltro(f.key)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      filtro === f.key
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                        : 'bg-white/5 text-white/40 border border-white/10 hover:text-white/60'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {loadingObs ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-indigo-500" />
              </div>
            ) : observacoes.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-white/5 flex items-center justify-center">
                  <Eye className="w-6 h-6 text-white/20" />
                </div>
                <p className="text-white/40 text-sm">Nenhuma observação neste período</p>
              </div>
            ) : (
              <div className="space-y-1">
                {observacoes.map((obs) => {
                  const valenciaColor = getValenciaColor(obs.sinal.valencia);
                  const tempoRelativo = formatDistanceToNow(new Date(obs.created_at), {
                    addSuffix: true,
                    locale: ptBR,
                  });

                  return (
                    <div
                      key={obs.id}
                      className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors"
                    >
                      {/* Professor avatar */}
                      <Avatar className="w-8 h-8 shrink-0">
                        <AvatarImage src={obs.professor?.avatar_url || ''} />
                        <AvatarFallback className="bg-indigo-500/20 text-indigo-300 text-xs">
                          {getInitials(obs.professor?.full_name || '')}
                        </AvatarFallback>
                      </Avatar>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-white/80 text-sm font-medium truncate max-w-[120px]">
                            {obs.professor?.full_name?.split(' ')[0] || 'Professor'}
                          </span>
                          <span className="text-white/30 text-xs">observou</span>
                          <span className="text-white/80 text-sm font-medium truncate max-w-[120px]">
                            {obs.aluno?.full_name?.split(' ')[0] || 'Aluno'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mt-1">
                          {/* Valencia dot + sinal */}
                          <div
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: valenciaColor }}
                          />
                          <span className="text-white/60 text-xs">
                            {obs.sinal.emoji} {obs.sinal.label_pt}
                          </span>

                          {obs.foi_cross_im && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/20">
                              Cross-IM
                            </span>
                          )}
                        </div>

                        {obs.observacao_texto && (
                          <p className="text-white/30 text-xs mt-1 line-clamp-1">
                            "{obs.observacao_texto}"
                          </p>
                        )}
                      </div>

                      {/* Right side: casa + time */}
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-white/25 text-[10px]">{tempoRelativo}</span>
                        {obs.casa && (
                          <div className="flex items-center gap-1">
                            <CasaBrasao
                              brasaoUrl={obs.casa.brasao_url}
                              emoji={obs.casa.emoji}
                              nome={obs.casa.nome}
                              size="mini"
                            />
                            <span className="text-white/30 text-[10px] max-w-[60px] truncate">
                              {obs.casa.nome}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sync Modal */}
      {institutionId && (
        <ModalSincronizarScores
          open={showSyncModal}
          onOpenChange={setShowSyncModal}
          institutionId={institutionId}
        />
      )}
    </div>
  );
};

export default MonitorPage;
