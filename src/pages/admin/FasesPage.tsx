import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ChevronRight, Edit2, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const FasesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editando, setEditando] = useState<string | null>(null);
  const [editInicio, setEditInicio] = useState('');
  const [editFim, setEditFim] = useState('');
  const [salvando, setSalvando] = useState(false);

  const { data: institutionId } = useQuery({
    queryKey: ['admin-institution', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('institution_id').eq('id', user!.id).single();
      return data?.institution_id;
    },
    enabled: !!user?.id,
  });

  const { data: fases = [], isLoading } = useQuery({
    queryKey: ['admin-fases-grid', institutionId],
    queryFn: async () => {
      if (!institutionId) return [];
      const { data } = await supabase.from('fases')
        .select('id, numero_fase, data_inicio, data_fim, ativo, semana_atual, segmento, inteligencia:inteligencias!inteligencia_id(id, nome, cor_hex, codigo)')
        .eq('institution_id', institutionId)
        .eq('segmento', 'fundamental2')
        .order('numero_fase');
      return data || [];
    },
    enabled: !!institutionId,
  });

  // Habilidades configuradas por fase
  const { data: habConfig = {} } = useQuery({
    queryKey: ['admin-hab-config', institutionId],
    queryFn: async () => {
      if (!institutionId) return {};
      const { data } = await supabase.from('atividade_habilidades')
        .select('fase_id, semana')
        .eq('institution_id', institutionId);
      const map: Record<string, Set<number>> = {};
      (data || []).forEach(h => {
        if (!map[h.fase_id]) map[h.fase_id] = new Set();
        map[h.fase_id].add(h.semana);
      });
      const result: Record<string, number> = {};
      Object.entries(map).forEach(([faseId, semanas]) => { result[faseId] = semanas.size; });
      return result;
    },
    enabled: !!institutionId,
  });

  const getStatus = (fase: any) => {
    const hoje = new Date();
    hoje.setHours(12, 0, 0, 0);
    const inicio = new Date(fase.data_inicio + 'T12:00:00');
    const fim = new Date(fase.data_fim + 'T12:00:00');
    if (hoje >= inicio && hoje <= fim) return 'ativa';
    if (hoje > fim) return 'concluida';
    return 'futura';
  };

  const statusConfig: Record<string, { label: string; cor: string; bg: string }> = {
    ativa: { label: 'Ativa', cor: 'text-emerald-400', bg: 'bg-emerald-500/15' },
    concluida: { label: 'Concluida', cor: 'text-white/40', bg: 'bg-white/[0.06]' },
    futura: { label: 'Futura', cor: 'text-blue-400', bg: 'bg-blue-500/15' },
  };

  const iniciarEdicao = (fase: any) => {
    setEditando(fase.id);
    setEditInicio(fase.data_inicio || '');
    setEditFim(fase.data_fim || '');
  };

  const salvarDatas = async (faseId: string) => {
    if (!editInicio || !editFim) { toast.error('Preencha as duas datas'); return; }
    if (new Date(editFim) <= new Date(editInicio)) { toast.error('Data fim deve ser depois do inicio'); return; }
    setSalvando(true);
    try {
      const { error } = await supabase.from('fases').update({ data_inicio: editInicio, data_fim: editFim }).eq('id', faseId);
      if (error) throw error;
      toast.success('Datas atualizadas');
      setEditando(null);
      queryClient.invalidateQueries({ queryKey: ['admin-fases-grid'] });
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar');
    } finally {
      setSalvando(false);
    }
  };

  const formatDate = (d: string) => {
    if (!d) return '-';
    const date = new Date(d + 'T12:00:00');
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
  };

  return (
    <div className="p-4 space-y-5 pb-24">
      <div>
        <h1 className="text-xl font-semibold text-white">Fases</h1>
        <p className="text-xs text-white/30 mt-0.5">Fundamental 2. Configuracao das 8 fases</p>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1,2,3,4].map(i => <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="rounded-xl bg-[#252547] border border-violet-500/10 overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-12 gap-2 py-2 px-3 text-[9px] text-white/25 uppercase tracking-wider border-b border-violet-500/5">
            <span className="col-span-4">Fase</span>
            <span className="col-span-2 text-center">Inicio</span>
            <span className="col-span-2 text-center">Fim</span>
            <span className="col-span-2 text-center">Status</span>
            <span className="col-span-2 text-center">Hab.</span>
          </div>

          {fases.map((fase, idx) => {
            const int = fase.inteligencia as any;
            const status = getStatus(fase);
            const sc = statusConfig[status];
            const isEditing = editando === fase.id;
            const semanasConfig = habConfig[fase.id] || 0;

            return (
              <div key={fase.id} className={cn('border-t border-violet-500/5', status === 'ativa' && 'bg-emerald-500/[0.04]')}>
                {isEditing ? (
                  /* Modo edicao */
                  <div className="p-3 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: int?.cor_hex || '#666' }} />
                      <span className="text-sm font-medium text-white">Fase {fase.numero_fase}: {int?.nome || '?'}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-white/30 block mb-1">Inicio</label>
                        <input
                          type="date"
                          value={editInicio}
                          onChange={e => setEditInicio(e.target.value)}
                          className="w-full bg-white/[0.06] border border-violet-500/10 rounded-lg px-2 py-1.5 text-xs text-white outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-white/30 block mb-1">Fim</label>
                        <input
                          type="date"
                          value={editFim}
                          onChange={e => setEditFim(e.target.value)}
                          className="w-full bg-white/[0.06] border border-violet-500/10 rounded-lg px-2 py-1.5 text-xs text-white outline-none"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditando(null)}
                        className="flex-1 py-2 rounded-lg bg-white/[0.06] text-white/50 text-xs hover:bg-white/[0.1] flex items-center justify-center gap-1"
                      >
                        <X className="w-3 h-3" /> Cancelar
                      </button>
                      <button
                        onClick={() => salvarDatas(fase.id)}
                        disabled={salvando}
                        className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-500 flex items-center justify-center gap-1 disabled:opacity-50"
                      >
                        <Check className="w-3 h-3" /> Salvar
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Modo visualizacao */
                  <div className="grid grid-cols-12 gap-2 py-3 px-3 items-center">
                    {/* Fase nome */}
                    <button
                      onClick={() => navigate(`/admin/fases/${fase.id}`)}
                      className="col-span-4 flex items-center gap-2 text-left hover:opacity-80 transition-opacity"
                    >
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: int?.cor_hex || '#666' }} />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-white truncate">{int?.nome || '?'}</p>
                        <p className="text-[9px] text-white/25">Fase {fase.numero_fase}</p>
                      </div>
                    </button>

                    {/* Datas */}
                    <span className="col-span-2 text-[10px] text-white/50 text-center">{formatDate(fase.data_inicio)}</span>
                    <span className="col-span-2 text-[10px] text-white/50 text-center">{formatDate(fase.data_fim)}</span>

                    {/* Status */}
                    <div className="col-span-2 flex justify-center">
                      <span className={cn('text-[9px] font-medium px-1.5 py-0.5 rounded', sc.cor, sc.bg)}>
                        {sc.label}
                      </span>
                    </div>

                    {/* Habilidades + acoes */}
                    <div className="col-span-2 flex items-center justify-end gap-1.5">
                      <span className={cn('text-[9px]', semanasConfig === 4 ? 'text-emerald-400' : semanasConfig > 0 ? 'text-amber-400' : 'text-white/20')}>
                        {semanasConfig}/4
                      </span>
                      <button
                        onClick={() => iniciarEdicao(fase)}
                        className="p-1 text-white/25 hover:text-white/60 transition-colors"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => navigate(`/admin/fases/${fase.id}`)}
                        className="p-1 text-white/25 hover:text-white/60 transition-colors"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Legenda */}
      <div className="flex items-center justify-center gap-4 text-[10px] text-white/25">
        <span>Hab. = semanas com habilidades configuradas</span>
      </div>
    </div>
  );
};

export default FasesPage;
