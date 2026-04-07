import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AlertTriangle, CheckCircle, Clock, Users, Activity, ChevronDown, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const MonitorPage = () => {
  const { user } = useAuth();
  const [faseSelecionada, setFaseSelecionada] = useState<string | null>(null); // null = ativa
  const [serieFiltro, setSerieFiltro] = useState<string | null>(null);
  const [showFaseSelect, setShowFaseSelect] = useState(false);

  // Institution
  const { data: institutionId } = useQuery({
    queryKey: ['admin-institution', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('institution_id').eq('id', user!.id).single();
      return data?.institution_id;
    },
    enabled: !!user?.id,
  });

  // Todas as fases (para selector)
  const { data: todasFases = [] } = useQuery({
    queryKey: ['admin-todas-fases', institutionId],
    queryFn: async () => {
      if (!institutionId) return [];
      const { data } = await supabase.from('fases')
        .select('id, numero_fase, semana_atual, ativo, data_inicio, data_fim, segmento, inteligencia:inteligencias!inteligencia_id(id, nome, cor_hex)')
        .eq('institution_id', institutionId)
        .eq('segmento', 'fundamental2')
        .order('numero_fase');
      return data || [];
    },
    enabled: !!institutionId,
  });

  // Fase selecionada (ativa por padrao)
  const faseAtual = faseSelecionada
    ? todasFases.find(f => f.id === faseSelecionada)
    : todasFases.find(f => f.ativo);

  const faseId = faseAtual?.id;
  const semanaAtual = faseAtual?.semana_atual || 1;
  const faseInt = faseAtual?.inteligencia as any;
  const faseNome = faseInt?.nome || 'Sem fase';
  const faseCor = faseInt?.cor_hex || '#6366f1';
  const ehFaseAtiva = faseAtual?.ativo;

  // Total alunos (filtrado por serie)
  const { data: totalAlunos = 0 } = useQuery({
    queryKey: ['admin-total-alunos', institutionId, serieFiltro],
    queryFn: async () => {
      if (!institutionId) return 0;
      let q = supabase.from('profiles').select('*', { count: 'exact', head: true })
        .eq('institution_id', institutionId).eq('segmento', 'fundamental2').not('casa_id', 'is', null);
      if (serieFiltro) q = q.ilike('serie', `%${serieFiltro}%`);
      const { count } = await q;
      return count || 0;
    },
    enabled: !!institutionId,
  });

  // Observacoes status da fase
  const { data: obsStatus } = useQuery({
    queryKey: ['admin-obs-status', institutionId, faseId],
    queryFn: async () => {
      if (!institutionId || !faseId) return { enviadas: 0, totalProfessores: 0, pendentes: [] as string[], semanasEnviadas: 0, totalSemanas: 4 };
      const { data: profs } = await supabase.from('professor_casa')
        .select('professor_id, profiles!professor_casa_professor_id_fkey(full_name)')
        .eq('institution_id', institutionId).eq('ativo', true);
      // Contar observacoes enviadas em TODAS as semanas da fase
      const { data: obs } = await supabase.from('observacao_semanal')
        .select('professor_id, semana, status')
        .eq('fase_id', faseId).eq('status', 'enviada');

      const totalProfs = profs?.length || 0;
      // Semanas com pelo menos 1 observacao enviada
      const semanasComObs = new Set(obs?.map(o => o.semana) || []);

      // Professores que nao enviaram na semana atual
      const enviaramSemanaAtual = new Set(obs?.filter(o => o.semana === semanaAtual).map(o => o.professor_id) || []);
      const pendentes = (profs || []).filter(p => !enviaramSemanaAtual.has(p.professor_id)).map(p => (p.profiles as any)?.full_name || 'Professor');

      return {
        enviadas: enviaramSemanaAtual.size,
        totalProfessores: totalProfs,
        pendentes,
        semanasEnviadas: semanasComObs.size,
        totalSemanas: 4,
      };
    },
    enabled: !!institutionId && !!faseId,
    staleTime: 60000,
  });

  // Status das aulas (agenda + confirmacao)
  const { data: aulasStatus } = useQuery({
    queryKey: ['admin-aulas-status', institutionId, faseId, semanaAtual],
    queryFn: async () => {
      if (!institutionId || !faseId) return null;
      const { data: profiles } = await supabase.from('profiles')
        .select('serie, turma').eq('institution_id', institutionId).eq('segmento', 'fundamental2').not('casa_id', 'is', null).not('turma', 'is', null);
      const turmasUnicas = new Map<string, { serie: string; turma: string }>();
      (profiles || []).forEach(p => {
        if (p.serie && p.turma) {
          const sn = p.serie.replace(/\D/g, '');
          turmasUnicas.set(`${sn}-${p.turma}`, { serie: sn, turma: p.turma });
        }
      });
      const { data: agendas } = await supabase.from('professor_agenda')
        .select('serie, turma, professor:profiles!professor_agenda_professor_id_fkey(full_name)')
        .eq('institution_id', institutionId).eq('fase_id', faseId).eq('ativo', true);
      const agendaMap = new Map<string, any>();
      (agendas || []).forEach(a => agendaMap.set(`${a.serie}-${a.turma}`, a));
      const { data: confs } = await supabase.from('aula_confirmacao')
        .select('serie, turma, confirmada, aula_nao_ocorreu, motivo_ausencia')
        .eq('fase_id', faseId).eq('semana', semanaAtual);
      const confMap = new Map<string, any>();
      (confs || []).forEach(c => confMap.set(`${c.serie}-${c.turma}`, c));

      const turmas = Array.from(turmasUnicas.values()).sort((a, b) => {
        const sd = parseInt(a.serie) - parseInt(b.serie);
        return sd !== 0 ? sd : a.turma.localeCompare(b.turma);
      }).map(t => {
        const key = `${t.serie}-${t.turma}`;
        const ag = agendaMap.get(key);
        const conf = confMap.get(key);
        return {
          serie: t.serie, turma: t.turma,
          agendaConfigurada: !!ag,
          aulaConfirmada: conf?.confirmada && !conf?.aula_nao_ocorreu,
          aulaCancelada: conf?.aula_nao_ocorreu,
          motivo: conf?.motivo_ausencia,
        };
      });
      return {
        turmas,
        semAgenda: turmas.filter(t => !t.agendaConfigurada).length,
        confirmadas: turmas.filter(t => t.aulaConfirmada).length,
        canceladas: turmas.filter(t => t.aulaCancelada).length,
        pendentes: turmas.filter(t => t.agendaConfigurada && !t.aulaConfirmada && !t.aulaCancelada).length,
        total: turmas.length,
      };
    },
    enabled: !!institutionId && !!faseId,
    staleTime: 60000,
  });

  // Missoes pendentes
  const { data: missoesPendentes = 0 } = useQuery({
    queryKey: ['admin-missoes-pendentes', institutionId, serieFiltro],
    queryFn: async () => {
      if (!institutionId) return 0;
      const { data: missoes } = await supabase.from('missoes').select('id, serie_filtro').eq('institution_id', institutionId).eq('status', 'liberada');
      if (!missoes?.length) return 0;
      const seriesComMissao = new Set<string>();
      missoes.forEach(m => {
        if (m.serie_filtro) seriesComMissao.add(String(m.serie_filtro));
        else ['6','7','8','9'].forEach(s => seriesComMissao.add(s));
      });
      if (serieFiltro && !seriesComMissao.has(serieFiltro)) return 0;

      let aQ = supabase.from('profiles').select('id, serie').eq('institution_id', institutionId).eq('segmento', 'fundamental2').not('casa_id', 'is', null);
      if (serieFiltro) {
        aQ = aQ.ilike('serie', `%${serieFiltro}%`);
      } else {
        const sf = Array.from(seriesComMissao).map(s => `serie.ilike.%${s}%`).join(',');
        if (sf) aQ = aQ.or(sf);
      }
      const { data: elegiveis } = await aQ;
      const { data: entregas } = await supabase.from('entregas').select('aluno_id').in('missao_id', missoes.map(m => m.id));
      const entregaram = new Set(entregas?.map(e => e.aluno_id) || []);
      return (elegiveis || []).filter(a => !entregaram.has(a.id)).length;
    },
    enabled: !!institutionId,
    staleTime: 60000,
  });

  // Distribuicao (toda a fase, nao so semana)
  const { data: distribuicao } = useQuery({
    queryKey: ['admin-distribuicao', faseId, serieFiltro],
    queryFn: async () => {
      if (!faseId) return null;
      const { data: obsSemanas } = await supabase.from('observacao_semanal')
        .select('id, serie').eq('fase_id', faseId).eq('status', 'enviada');
      if (!obsSemanas?.length) return null;

      // Filtrar por serie se selecionado
      const obsIds = serieFiltro
        ? obsSemanas.filter(o => o.serie?.includes(serieFiltro)).map(o => o.id)
        : obsSemanas.map(o => o.id);
      if (!obsIds.length) return null;

      const { data: obsAlunos } = await supabase.from('observacao_aluno').select('estado').in('observacao_semanal_id', obsIds);
      if (!obsAlunos?.length) return null;
      const total = obsAlunos.length;
      const c: Record<string, number> = { surpreendeu: 0, fez: 0, dificuldades: 0, nao_conseguiu: 0 };
      obsAlunos.forEach(o => { if (c[o.estado] !== undefined) c[o.estado]++; });
      return {
        foiAlem: { count: c.surpreendeu, pct: Math.round((c.surpreendeu / total) * 100) },
        fez: { count: c.fez, pct: Math.round((c.fez / total) * 100) },
        dificuldades: { count: c.dificuldades, pct: Math.round((c.dificuldades / total) * 100) },
        naoFez: { count: c.nao_conseguiu, pct: Math.round((c.nao_conseguiu / total) * 100) },
        total,
      };
    },
    enabled: !!faseId,
    staleTime: 120000,
  });

  // Atencao
  const { data: atencao } = useQuery({
    queryKey: ['admin-atencao', faseId],
    queryFn: async () => {
      if (!faseId) return null;
      const { data: obsSemanas } = await supabase.from('observacao_semanal').select('id').eq('fase_id', faseId).eq('status', 'enviada');
      if (!obsSemanas?.length) return null;
      const { data: obsAlunos } = await supabase.from('observacao_aluno').select('aluno_id, estado').in('observacao_semanal_id', obsSemanas.map(o => o.id));
      if (!obsAlunos?.length) return null;
      const naoFezCount: Record<string, number> = {};
      const foiAlemSet = new Set<string>();
      obsAlunos.forEach(o => {
        if (o.estado === 'nao_conseguiu') naoFezCount[o.aluno_id] = (naoFezCount[o.aluno_id] || 0) + 1;
        if (o.estado === 'surpreendeu') foiAlemSet.add(o.aluno_id);
      });
      return {
        consecutivos: Object.values(naoFezCount).filter(c => c >= 2).length,
        nuncaFoiAlem: new Set(obsAlunos.map(o => o.aluno_id)).size - foiAlemSet.size,
      };
    },
    enabled: !!faseId,
    staleTime: 120000,
  });

  // Casas
  const { data: visaoCasas = [] } = useQuery({
    queryKey: ['admin-visao-casas', institutionId],
    queryFn: async () => {
      if (!institutionId) return [];
      const { data: casas } = await supabase.from('inteligencias').select('id, nome, cor_hex').order('id');
      const { data: profiles } = await supabase.from('profiles').select('id, casa_id').eq('institution_id', institutionId).eq('segmento', 'fundamental2').not('casa_id', 'is', null);
      const { data: missoes } = await supabase.from('missoes').select('id').eq('institution_id', institutionId).eq('status', 'liberada');
      const { data: pontos } = await supabase.from('pontos_gerais').select('casa_id, pontos').eq('institution_id', institutionId);
      let entregasSet = new Set<string>();
      if (missoes?.length) {
        const { data: entregas } = await supabase.from('entregas').select('aluno_id').in('missao_id', missoes.map(m => m.id));
        entregasSet = new Set(entregas?.map(e => e.aluno_id) || []);
      }
      const pontosPorCasa: Record<number, number> = {};
      (pontos || []).forEach(p => { if (p.casa_id) pontosPorCasa[p.casa_id] = (pontosPorCasa[p.casa_id] || 0) + (p.pontos || 0); });
      const porCasa: Record<number, { total: number; entregaram: number }> = {};
      (profiles || []).forEach(p => {
        if (!p.casa_id) return;
        if (!porCasa[p.casa_id]) porCasa[p.casa_id] = { total: 0, entregaram: 0 };
        porCasa[p.casa_id].total++;
        if (entregasSet.has(p.id)) porCasa[p.casa_id].entregaram++;
      });
      return (casas || []).map(c => ({
        id: c.id, nome: c.nome, cor: c.cor_hex,
        total: porCasa[c.id]?.total || 0,
        pctEntrega: porCasa[c.id]?.total ? Math.round(((porCasa[c.id]?.entregaram || 0) / porCasa[c.id].total) * 100) : 0,
        pontos: pontosPorCasa[c.id] || 0,
      }));
    },
    enabled: !!institutionId,
    staleTime: 120000,
  });

  // Timeline (fase ativa) / Resumo (fase passada)
  const { data: timeline = [] } = useQuery({
    queryKey: ['admin-timeline', institutionId, faseId, ehFaseAtiva],
    queryFn: async () => {
      if (!institutionId) return [];
      const items: { texto: string; tempo: string; cor: string }[] = [];

      if (ehFaseAtiva) {
        // Fase ativa: atividade recente geral
        const { data: entregas } = await supabase.from('entregas')
          .select('created_at, status, aluno:profiles!entregas_aluno_id_fkey(full_name), missao:missoes!entregas_missao_id_fkey(titulo)')
          .order('created_at', { ascending: false }).limit(5);
        (entregas || []).forEach(e => {
          items.push({
            texto: `${(e.aluno as any)?.full_name || 'Aluno'} — ${e.status === 'aprovada' ? 'aprovada' : 'entregou'}: "${(e.missao as any)?.titulo || ''}"`,
            tempo: e.created_at, cor: e.status === 'aprovada' ? 'text-emerald-400' : 'text-amber-400',
          });
        });
        const { data: obs } = await supabase.from('observacao_semanal')
          .select('enviada_em, serie, turma, professor:profiles!observacao_semanal_professor_id_fkey(full_name)')
          .eq('status', 'enviada').order('enviada_em', { ascending: false }).limit(5);
        (obs || []).forEach(o => {
          items.push({
            texto: `${(o.professor as any)?.full_name || 'Professor'} enviou observacao ${o.serie}º ${o.turma}`,
            tempo: o.enviada_em || '', cor: 'text-violet-400',
          });
        });
      } else if (faseId) {
        // Fase passada: historico da fase
        const { data: obs } = await supabase.from('observacao_semanal')
          .select('enviada_em, serie, turma, semana, professor:profiles!observacao_semanal_professor_id_fkey(full_name)')
          .eq('fase_id', faseId).eq('status', 'enviada').order('enviada_em', { ascending: false }).limit(10);
        (obs || []).forEach(o => {
          items.push({
            texto: `${(o.professor as any)?.full_name || 'Professor'} — S${o.semana} ${o.serie}º ${o.turma}`,
            tempo: o.enviada_em || '', cor: 'text-violet-400',
          });
        });
        // Entregas da fase
        const { data: missoesFase } = await supabase.from('missoes').select('id').eq('fase_id', faseId);
        if (missoesFase?.length) {
          const { data: entregas } = await supabase.from('entregas')
            .select('created_at, status, aluno:profiles!entregas_aluno_id_fkey(full_name), missao:missoes!entregas_missao_id_fkey(titulo)')
            .in('missao_id', missoesFase.map(m => m.id)).order('created_at', { ascending: false }).limit(5);
          (entregas || []).forEach(e => {
            items.push({
              texto: `${(e.aluno as any)?.full_name || 'Aluno'} — ${e.status === 'aprovada' ? 'aprovada' : 'entregou'}: "${(e.missao as any)?.titulo || ''}"`,
              tempo: e.created_at, cor: e.status === 'aprovada' ? 'text-emerald-400' : 'text-amber-400',
            });
          });
        }
      }
      return items.filter(i => i.tempo).sort((a, b) => new Date(b.tempo).getTime() - new Date(a.tempo).getTime()).slice(0, 8);
    },
    enabled: !!institutionId,
    staleTime: 60000,
  });

  return (
    <div className="p-4 space-y-5 pb-24">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-white">Dashboard</h1>
        <p className="text-xs text-white/30 mt-0.5">Fundamental 2</p>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        {/* Fase selector */}
        <div className="relative">
          <button
            onClick={() => setShowFaseSelect(!showFaseSelect)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-violet-500/20 text-violet-300 border border-violet-500/30"
          >
            Fase {faseAtual?.numero_fase || '-'} — {faseNome}
            {ehFaseAtiva && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ml-1" />}
            <ChevronDown className="w-3 h-3" />
          </button>
          {showFaseSelect && (
            <div className="absolute top-full left-0 mt-1 z-50 w-56 rounded-lg bg-[#1a1a1e] border border-white/10 shadow-xl overflow-hidden">
              {todasFases.map(f => {
                const int = f.inteligencia as any;
                return (
                  <button
                    key={f.id}
                    onClick={() => { setFaseSelecionada(f.id); setShowFaseSelect(false); }}
                    className={cn(
                      'w-full text-left px-3 py-2 text-xs hover:bg-white/[0.06] transition-colors flex items-center gap-2',
                      faseId === f.id && 'bg-white/[0.08]'
                    )}
                  >
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: int?.cor_hex || '#666' }} />
                    <span className="text-white/70">Fase {f.numero_fase} — {int?.nome || '?'}</span>
                    {f.ativo && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ml-auto" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Serie filter */}
        {['6', '7', '8', '9'].map(s => (
          <button
            key={s}
            onClick={() => setSerieFiltro(serieFiltro === s ? null : s)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              serieFiltro === s ? 'bg-blue-600 text-white' : 'bg-white/[0.06] text-white/40 hover:bg-white/[0.1]'
            )}
          >
            {s}º
          </button>
        ))}
      </div>

      {/* Saude da Fase */}
      <div>
        <div className="flex items-center gap-2 mb-3 px-1">
          <div className="w-1 h-3.5 rounded-full bg-red-500" />
          <p className="text-[10px] font-semibold text-red-400/80 uppercase tracking-widest">Saude da Fase</p>
        </div>
        <div className="space-y-2">
          {/* Progresso da fase */}
          <div className="p-3.5 rounded-xl bg-[rgba(26,26,30,0.85)] border border-white/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-white">Progresso da fase</span>
              <span className="text-sm font-bold text-white">Semana {semanaAtual}/4</span>
            </div>
            <div className="flex gap-1">
              {[1, 2, 3, 4].map(s => (
                <div key={s} className={cn('flex-1 h-2 rounded-full', s <= semanaAtual ? 'bg-violet-500' : 'bg-white/10')} />
              ))}
            </div>
            {obsStatus && (
              <p className="text-[10px] text-white/25 mt-1.5">
                {obsStatus.semanasEnviadas} de {obsStatus.totalSemanas} semanas com observacoes registradas
              </p>
            )}
          </div>

          {/* Observacoes semana atual */}
          <div className={cn('p-3.5 rounded-xl border',
            obsStatus && obsStatus.pendentes.length > 0 ? 'bg-red-500/10 border-red-500/20' : 'bg-emerald-500/10 border-emerald-500/20'
          )}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {obsStatus && obsStatus.pendentes.length > 0 ? <AlertTriangle className="w-4 h-4 text-red-400" /> : <CheckCircle className="w-4 h-4 text-emerald-400" />}
                <span className="text-sm text-white">Observacoes semana {semanaAtual}</span>
              </div>
              <span className="text-sm font-bold text-white">{obsStatus?.enviadas || 0}/{obsStatus?.totalProfessores || 0}</span>
            </div>
            {obsStatus && obsStatus.pendentes.length > 0 && (
              <p className="text-[11px] text-red-400/60 mt-1.5 ml-6">Pendentes: {obsStatus.pendentes.join(', ')}</p>
            )}
          </div>

          {/* Status das aulas */}
          {aulasStatus && (
            <div className={cn('p-3.5 rounded-xl border',
              aulasStatus.semAgenda > 0 || aulasStatus.pendentes > 0 ? 'bg-amber-500/10 border-amber-500/20' :
              aulasStatus.canceladas > 0 ? 'bg-red-500/10 border-red-500/20' :
              'bg-emerald-500/10 border-emerald-500/20'
            )}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-400" />
                  <span className="text-sm text-white">Aulas semana {semanaAtual}</span>
                </div>
                <span className="text-sm font-bold text-white">{aulasStatus.confirmadas}/{aulasStatus.total}</span>
              </div>
              <div className="flex flex-wrap gap-1.5 ml-6">
                {aulasStatus.turmas.map(t => (
                  <span key={`${t.serie}-${t.turma}`} className={cn(
                    'text-[9px] px-1.5 py-0.5 rounded',
                    t.aulaConfirmada ? 'bg-emerald-500/20 text-emerald-400' :
                    t.aulaCancelada ? 'bg-red-500/20 text-red-400' :
                    !t.agendaConfigurada ? 'bg-white/[0.08] text-white/30' :
                    'bg-amber-500/15 text-amber-400/70'
                  )}>
                    {t.serie}º{t.turma} {!t.agendaConfigurada ? '(s/ agenda)' : t.aulaConfirmada ? '✓' : t.aulaCancelada ? '✕' : '...'}
                  </span>
                ))}
              </div>
              {aulasStatus.semAgenda > 0 && (
                <p className="text-[10px] text-amber-400/50 mt-1.5 ml-6">{aulasStatus.semAgenda} turmas sem horario configurado</p>
              )}
              {aulasStatus.canceladas > 0 && (
                <p className="text-[10px] text-red-400/50 mt-1 ml-6">{aulasStatus.canceladas} aulas nao ocorreram</p>
              )}
            </div>
          )}

          {/* Missoes + Alunos */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 rounded-xl bg-[rgba(26,26,30,0.85)] border border-white/10 text-center">
              <span className={cn('text-lg font-bold', missoesPendentes > 0 ? 'text-amber-400' : 'text-white')}>{missoesPendentes}</span>
              <p className="text-[10px] text-white/40">Sem entrega</p>
            </div>
            <div className="p-3 rounded-xl bg-[rgba(26,26,30,0.85)] border border-white/10 text-center">
              <span className="text-lg font-bold text-white">{totalAlunos}</span>
              <p className="text-[10px] text-white/40">Alunos{serieFiltro ? ` ${serieFiltro}º Ano` : ' F2'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Calibracao */}
      <div>
        <div className="flex items-center gap-2 mb-3 px-1">
          <div className="w-1 h-3.5 rounded-full bg-violet-500" />
          <p className="text-[10px] font-semibold text-violet-400/80 uppercase tracking-widest">Calibracao da Fase</p>
        </div>
        {distribuicao ? (
          <div className="p-4 rounded-xl bg-[rgba(26,26,30,0.85)] border border-white/10 space-y-3">
            {[
              { label: 'Foi alem', pct: distribuicao.foiAlem.pct, count: distribuicao.foiAlem.count, cor: 'bg-amber-500', ideal: '10-15%' },
              { label: 'Fez', pct: distribuicao.fez.pct, count: distribuicao.fez.count, cor: 'bg-emerald-500', ideal: '50-60%' },
              { label: 'Dificuldades', pct: distribuicao.dificuldades.pct, count: distribuicao.dificuldades.count, cor: 'bg-red-400', ideal: '20-25%' },
              { label: 'Nao fez', pct: distribuicao.naoFez.pct, count: distribuicao.naoFez.count, cor: 'bg-white/40', ideal: 'variavel' },
            ].map(item => (
              <div key={item.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-white/60">{item.label}</span>
                  <span className="text-xs text-white/40">{item.pct}% ({item.count}) <span className="text-white/20">ideal: {item.ideal}</span></span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className={cn('h-full rounded-full', item.cor)} style={{ width: `${item.pct}%` }} />
                </div>
              </div>
            ))}
            <p className="text-[10px] text-white/20 text-center">{distribuicao.total} registros na fase</p>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-[rgba(26,26,30,0.85)] border border-white/10 text-center">
            <p className="text-white/30 text-sm">Nenhuma observacao semanal enviada nesta fase</p>
          </div>
        )}
      </div>

      {/* Atencao */}
      {atencao && (atencao.consecutivos > 0 || atencao.nuncaFoiAlem > 0) && (
        <div>
          <div className="flex items-center gap-2 mb-3 px-1">
            <div className="w-1 h-3.5 rounded-full bg-amber-500" />
            <p className="text-[10px] font-semibold text-amber-400/80 uppercase tracking-widest">Atencao</p>
          </div>
          <div className="space-y-2">
            {atencao.consecutivos > 0 && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span className="text-sm text-white">{atencao.consecutivos} alunos com "Nao fez" em 2+ semanas</span>
                </div>
              </div>
            )}
            {atencao.nuncaFoiAlem > 0 && (
              <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/10">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-white/40" />
                  <span className="text-sm text-white/70">{atencao.nuncaFoiAlem} alunos nunca "Foi alem"</span>
                </div>
                <p className="text-[10px] text-white/30 mt-1 ml-6">Possivel crianca invisivel</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Casas */}
      <div>
        <div className="flex items-center gap-2 mb-3 px-1">
          <div className="w-1 h-3.5 rounded-full bg-emerald-500" />
          <p className="text-[10px] font-semibold text-emerald-400/80 uppercase tracking-widest">Casas</p>
        </div>
        <div className="rounded-xl bg-[rgba(26,26,30,0.85)] border border-white/10 overflow-hidden">
          <div className="flex items-center gap-3 py-2 px-3.5 text-[9px] text-white/25 uppercase tracking-wider">
            <span className="flex-1">Casa</span>
            <span className="w-8 text-center">Qtd</span>
            <span className="w-12 text-center">Pontos</span>
            <span className="w-20 text-center">Entregas</span>
          </div>
          {visaoCasas.map(casa => (
            <div key={casa.id} className="flex items-center gap-3 py-2.5 px-3.5 border-t border-white/5">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: casa.cor }} />
              <span className="text-sm text-white/70 flex-1 truncate">{casa.nome}</span>
              <span className="text-xs text-white/30 w-8 text-center">{casa.total}</span>
              <span className="text-xs text-yellow-400/70 w-12 text-center font-medium">{casa.pontos}</span>
              <div className="w-12">
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${casa.pctEntrega}%` }} />
                </div>
              </div>
              <span className="text-[10px] text-white/40 w-8 text-right">{casa.pctEntrega}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div>
        <div className="flex items-center gap-2 mb-3 px-1">
          <div className="w-1 h-3.5 rounded-full bg-blue-500" />
          <p className="text-[10px] font-semibold text-blue-400/80 uppercase tracking-widest">
            {ehFaseAtiva ? 'Atividade Recente' : `Historico da Fase ${faseAtual?.numero_fase || ''}`}
          </p>
        </div>
        {timeline.length > 0 ? (
          <div className="rounded-xl bg-[rgba(26,26,30,0.85)] border border-white/10 overflow-hidden">
            {timeline.map((item, idx) => (
              <div key={idx} className={cn('py-2.5 px-3.5', idx > 0 && 'border-t border-white/5')}>
                <p className={cn('text-xs', item.cor)}>{item.texto}</p>
                <p className="text-[10px] text-white/20 mt-0.5">{formatDistanceToNow(new Date(item.tempo), { addSuffix: true, locale: ptBR })}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-[rgba(26,26,30,0.85)] border border-white/10 text-center">
            <Activity className="w-6 h-6 text-white/15 mx-auto mb-2" />
            <p className="text-white/30 text-xs">Nenhuma atividade recente</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MonitorPage;
