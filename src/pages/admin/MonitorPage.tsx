import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AlertTriangle, CheckCircle, Clock, Users, Activity, ChevronDown, ChevronUp, Calendar, LogIn, MessageCircle, ChevronRight, ClipboardList, Eye, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { hojeBrasil, agoraBrasil, TIMEZONE_BRASIL } from '@/utils/timezone';

const MonitorPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [faseSelecionada, setFaseSelecionada] = useState<string | null>(null); // null = ativa
  const [serieFiltro, setSerieFiltro] = useState<string | null>(null);
  const [showFaseSelect, setShowFaseSelect] = useState(false);
  const [loginsExpandido, setLoginsExpandido] = useState(true);
  const [loginFiltro, setLoginFiltro] = useState<'todos' | 'lideres' | 'coordenadores'>('todos');
  const [dashboardTab, setDashboardTab] = useState<'login' | 'entregas' | 'observacoes' | 'desafios'>('login');

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

  // Fase selecionada (determina ativa por datas, nao pelo campo 'ativo')
  const faseAtual = faseSelecionada
    ? todasFases.find(f => f.id === faseSelecionada)
    : (() => {
        const hoje = new Date();
        hoje.setHours(12, 0, 0, 0);
        return todasFases.find(f => {
          if (!f.data_inicio || !f.data_fim) return false;
          const inicio = new Date(f.data_inicio + 'T12:00:00');
          const fim = new Date(f.data_fim + 'T12:00:00');
          return hoje >= inicio && hoje <= fim;
        }) || todasFases.find(f => f.ativo);
      })();

  const faseId = faseAtual?.id;
  const semanaAtual = faseAtual?.semana_atual || 1;
  const faseInt = faseAtual?.inteligencia as any;
  const faseNome = faseInt?.nome || 'Sem fase';
  const faseCor = faseInt?.cor_hex || '#6366f1';
  const ehFaseAtiva = (() => {
    if (!faseAtual?.data_inicio || !faseAtual?.data_fim) return false;
    const hoje = new Date();
    hoje.setHours(12, 0, 0, 0);
    const inicio = new Date(faseAtual.data_inicio + 'T12:00:00');
    const fim = new Date(faseAtual.data_fim + 'T12:00:00');
    return hoje >= inicio && hoje <= fim;
  })();

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
    queryKey: ['admin-visao-casas', institutionId, faseId],
    queryFn: async () => {
      if (!institutionId) return [];
      const { data: casas } = await supabase.from('inteligencias').select('id, nome, cor_hex').order('id');
      const { data: profiles } = await supabase.from('profiles').select('id, casa_id').eq('institution_id', institutionId).eq('segmento', 'fundamental2').not('casa_id', 'is', null);
      // Buscar missões da fase atual (ou todas liberadas se nao tem fase)
      let missaoQuery = supabase.from('missoes').select('id').eq('institution_id', institutionId).eq('status', 'liberada');
      if (faseId) missaoQuery = missaoQuery.eq('fase_id', faseId);
      const { data: missoes } = await missaoQuery;
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

  // Mensagens privadas recentes (últimas 24h) para badge
  const { data: msgPrivadasHoje = 0 } = useQuery({
    queryKey: ['admin-msgs-privadas-hoje', institutionId],
    queryFn: async () => {
      if (!institutionId) return 0;
      const ontem = new Date();
      ontem.setDate(ontem.getDate() - 1);
      const { count } = await supabase
        .from('mensagens_privadas')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', ontem.toISOString());
      return count || 0;
    },
    enabled: !!institutionId,
    staleTime: 60000,
    refetchInterval: 60000,
  });

  // Logins de hoje — alunos
  const { data: todosAlunos = [] } = useQuery({
    queryKey: ['monitor-alunos-login', institutionId],
    queryFn: async () => {
      if (!institutionId) return [];
      const { data } = await supabase.from('profiles')
        .select('id, full_name, nome, avatar_url, serie, turma, ultima_atividade')
        .eq('institution_id', institutionId)
        .eq('segmento', 'fundamental2')
        .not('serie', 'is', null)
        .order('full_name');
      return data || [];
    },
    enabled: !!institutionId,
    staleTime: 60000,
  });

  const hojeStr = hojeBrasil();

  // Contagem de logins por aluno hoje
  const { data: loginsCountMap = {} } = useQuery({
    queryKey: ['monitor-logins-count', hojeStr, todosAlunos.length],
    queryFn: async () => {
      if (!todosAlunos.length) return {};
      const alunoIds = todosAlunos.map(a => a.id);
      const map: Record<string, number> = {};
      for (let i = 0; i < alunoIds.length; i += 50) {
        const batch = alunoIds.slice(i, i + 50);
        const { data } = await supabase
          .from('activity_logs' as any)
          .select('user_id')
          .eq('action', 'login')
          .gte('created_at', `${hojeStr}T00:00:00`)
          .in('user_id', batch);
        (data || []).forEach((d: any) => { if (d.user_id) map[d.user_id] = (map[d.user_id] || 0) + 1; });
      }
      return map;
    },
    enabled: todosAlunos.length > 0,
    staleTime: 60000,
    refetchInterval: 60000,
  });

  // Cargos (líderes e coordenadores)
  const { data: cargosMap = {} } = useQuery({
    queryKey: ['monitor-cargos', institutionId],
    queryFn: async () => {
      if (!institutionId) return {};
      const { data } = await supabase.from('cargos_casa')
        .select('aluno_id, cargo')
        .eq('institution_id', institutionId)
        .eq('ativo', true)
        .in('cargo', ['lider', 'coordenador']);
      const map: Record<string, string> = {};
      (data || []).forEach(c => { map[c.aluno_id] = c.cargo; });
      return map;
    },
    enabled: !!institutionId,
    staleTime: 300000,
  });

  // Entregas recentes (para aba Entregas)
  const { data: entregasRecentes = [] } = useQuery({
    queryKey: ['monitor-entregas-recentes', institutionId, dashboardTab],
    queryFn: async () => {
      if (!institutionId) return [];
      const { data } = await supabase.from('entregas')
        .select('aluno_id, missao_id, status, created_at, missao:missoes!entregas_missao_id_fkey(titulo)')
        .order('created_at', { ascending: false })
        .limit(500);
      return data || [];
    },
    enabled: !!institutionId && dashboardTab === 'entregas',
    staleTime: 60000,
  });

  // Visualizações de missões (para aba Entregas)
  const { data: visualizacoesMissao = [] } = useQuery({
    queryKey: ['monitor-visualizacoes', institutionId, dashboardTab],
    queryFn: async () => {
      if (!institutionId) return [];
      const { data } = await supabase
        .from('missao_visualizacoes' as any)
        .select('aluno_id, missao_id, created_at')
        .order('created_at', { ascending: false })
        .limit(500);
      return data || [];
    },
    enabled: !!institutionId && dashboardTab === 'entregas',
    staleTime: 60000,
  });

  const visualizouSet = new Set((visualizacoesMissao || []).map((v: any) => v.aluno_id));

  // Observacoes de alunos recentes (para aba Observacoes)
  const { data: obsAlunasRecentes = [] } = useQuery({
    queryKey: ['monitor-obs-alunos-recentes', institutionId, dashboardTab],
    queryFn: async () => {
      if (!institutionId) return [];
      const { data } = await supabase.from('observacao_aluno')
        .select('aluno_id, estado, observacao_texto, created_at')
        .order('created_at', { ascending: false })
        .limit(500);
      return data || [];
    },
    enabled: !!institutionId && dashboardTab === 'observacoes',
    staleTime: 60000,
  });

  // Cross-IM registros (para aba Observações)
  const { data: crossImRegistros = [] } = useQuery({
    queryKey: ['monitor-crossim', institutionId, dashboardTab],
    queryFn: async () => {
      if (!institutionId) return [];
      const { data } = await supabase
        .from('cross_im_registros' as any)
        .select('aluno_id, inteligencia_detectada_id')
        .order('created_at', { ascending: false })
        .limit(200);
      return data || [];
    },
    enabled: !!institutionId && dashboardTab === 'observacoes',
    staleTime: 60000,
  });

  // Cross-IM por aluno
  const crossImMap = new Map<string, number[]>();
  crossImRegistros.forEach((r: any) => {
    const atual = crossImMap.get(r.aluno_id) || [];
    if (!atual.includes(r.inteligencia_detectada_id)) {
      crossImMap.set(r.aluno_id, [...atual, r.inteligencia_detectada_id]);
    }
  });

  // Cores das inteligências (para bolinhas Cross-IM)
  const { data: inteligenciasCores = {} } = useQuery({
    queryKey: ['inteligencias-cores'],
    queryFn: async () => {
      const { data } = await supabase.from('inteligencias').select('id, cor_hex');
      const map: Record<number, string> = {};
      (data || []).forEach((i: any) => { if (i.cor_hex) map[i.id] = i.cor_hex; });
      return map;
    },
    staleTime: 600000,
  });

  // Desafios diarios de hoje (para aba Desafios)
  const { data: desafiosHoje = [] } = useQuery({
    queryKey: ['monitor-desafios-hoje', institutionId, hojeStr, dashboardTab],
    queryFn: async () => {
      if (!institutionId) return [];
      const { data } = await supabase.from('desafio_diario_respostas' as any)
        .select('aluno_id, desafio_tipo, texto, data, created_at')
        .eq('data', hojeStr)
        .order('created_at', { ascending: false });
      return (data || []) as Array<{ aluno_id: string; desafio_tipo: string; texto: string; data: string; created_at: string }>;
    },
    enabled: !!institutionId && dashboardTab === 'desafios',
    staleTime: 60000,
  });

  // Sets derivados para as abas
  const entregouSet = new Set(entregasRecentes.map((e: any) => e.aluno_id));
  const obsMap = new Map<string, { estado: string; texto: string; created_at: string }>();
  obsAlunasRecentes.forEach((o: any) => {
    if (!obsMap.has(o.aluno_id)) obsMap.set(o.aluno_id, { estado: o.estado, texto: o.observacao_texto, created_at: o.created_at });
  });
  const desafioSet = new Set((desafiosHoje as any[]).map((d: any) => d.aluno_id));
  const desafioMap = new Map<string, { tipo: string; texto: string; created_at: string }>();
  (desafiosHoje as any[]).forEach((d: any) => {
    if (!desafioMap.has(d.aluno_id)) desafioMap.set(d.aluno_id, { tipo: d.desafio_tipo, texto: d.texto, created_at: d.created_at });
  });

  // Helper para formatar timestamp UTC -> Brasil
  const formatTimeBrasil = (ts: string) => {
    if (!ts) return '';
    return new Date(ts).toLocaleString('pt-BR', { timeZone: TIMEZONE_BRASIL, hour: '2-digit', minute: '2-digit' });
  };
  const formatDateTimeBrasil = (ts: string) => {
    if (!ts) return '';
    return new Date(ts).toLocaleString('pt-BR', { timeZone: TIMEZONE_BRASIL, day: '2-digit', month: '2-digit' }) + ' as ' + formatTimeBrasil(ts);
  };

  // Determinar quem acessou hoje usando ultima_atividade do profile
  // Converter UTC timestamp para timezone Brasil antes de comparar
  const logouHojeSet = new Set(
    todosAlunos
      .filter(a => {
        if (!a.ultima_atividade) return false;
        const dataBrasil = new Date(a.ultima_atividade).toLocaleDateString('en-CA', { timeZone: TIMEZONE_BRASIL });
        return dataBrasil === hojeStr;
      })
      .map(a => a.id)
  );

  // Filtrar alunos por cargo
  const alunosFiltrados = loginFiltro === 'todos'
    ? todosAlunos
    : todosAlunos.filter(a => cargosMap[a.id] === (loginFiltro === 'lideres' ? 'lider' : 'coordenador'));

  // Agrupar alunos por serie+turma para login map
  const gruposLogin = (() => {
    const map: Record<string, { serie: string; turma: string; alunos: typeof todosAlunos }> = {};
    alunosFiltrados.forEach(a => {
      const serieNum = a.serie?.replace(/\D/g, '') || '0';
      const turma = a.turma || 'S/T';
      const key = `${serieNum}-${turma}`;
      if (!map[key]) map[key] = { serie: serieNum, turma, alunos: [] };
      map[key].alunos.push(a);
    });
    return Object.entries(map)
      .filter(([, g]) => g.alunos.length > 0)
      .sort((a, b) => {
        const sd = parseInt(a[1].serie) - parseInt(b[1].serie);
        return sd !== 0 ? sd : a[1].turma.localeCompare(b[1].turma);
      });
  })();

  const totalLogaram = alunosFiltrados.filter(a => logouHojeSet.has(a.id)).length;

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
            <div className="absolute top-full left-0 mt-1 z-50 w-56 rounded-lg bg-[#1E1E3A] border border-violet-500/10 shadow-xl overflow-hidden">
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
          <div className="p-3.5 rounded-xl bg-[#252547] border border-violet-500/10">
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
            <div className="p-3 rounded-xl bg-[#252547] border border-violet-500/10 text-center">
              <span className={cn('text-lg font-bold', missoesPendentes > 0 ? 'text-amber-400' : 'text-white')}>{missoesPendentes}</span>
              <p className="text-[10px] text-white/40">Sem entrega</p>
            </div>
            <div className="p-3 rounded-xl bg-[#252547] border border-violet-500/10 text-center">
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
          <div className="p-4 rounded-xl bg-[#252547] border border-violet-500/10 space-y-3">
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
          <div className="p-4 rounded-xl bg-[#252547] border border-violet-500/10 text-center">
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
              <div className="p-3.5 rounded-xl bg-white/[0.04] border border-violet-500/10">
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

      {/* Dashboard dos Alunos */}
      {todosAlunos.length > 0 && (
        <div>
          <button
            onClick={() => setLoginsExpandido(!loginsExpandido)}
            className="w-full flex items-center gap-2 mb-3 px-1"
          >
            <div className="w-1 h-3.5 rounded-full bg-emerald-500" />
            <Users className="w-3.5 h-3.5 text-emerald-400/80" />
            <p className="text-[10px] font-semibold text-emerald-400/80 uppercase tracking-widest">Dashboard dos Alunos</p>
            <div className="flex-1" />
            {loginsExpandido ? <ChevronUp className="w-3.5 h-3.5 text-white/20" /> : <ChevronDown className="w-3.5 h-3.5 text-white/20" />}
          </button>

          {loginsExpandido && (
            <div className="flex gap-1.5 mb-3 px-1 overflow-x-auto">
              {([
                { id: 'login' as const, label: 'Login', icon: LogIn, cor: 'emerald' },
                { id: 'entregas' as const, label: 'Entregas', icon: ClipboardList, cor: 'blue' },
                { id: 'observacoes' as const, label: 'Observacoes', icon: Eye, cor: 'violet' },
                { id: 'desafios' as const, label: 'Desafios', icon: Zap, cor: 'orange' },
              ]).map(tab => {
                const isActive = dashboardTab === tab.id;
                const Icon = tab.icon;
                const corClasses: Record<string, { active: string; inactive: string }> = {
                  emerald: { active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40', inactive: 'bg-white/[0.04] text-white/30 hover:bg-white/[0.08] border-transparent' },
                  blue: { active: 'bg-blue-500/20 text-blue-400 border-blue-500/40', inactive: 'bg-white/[0.04] text-white/30 hover:bg-white/[0.08] border-transparent' },
                  violet: { active: 'bg-violet-500/20 text-violet-400 border-violet-500/40', inactive: 'bg-white/[0.04] text-white/30 hover:bg-white/[0.08] border-transparent' },
                  orange: { active: 'bg-orange-500/20 text-orange-400 border-orange-500/40', inactive: 'bg-white/[0.04] text-white/30 hover:bg-white/[0.08] border-transparent' },
                };
                return (
                  <button
                    key={tab.id}
                    onClick={() => setDashboardTab(tab.id)}
                    className={cn(
                      'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-medium transition-colors border shrink-0',
                      isActive ? corClasses[tab.cor].active : corClasses[tab.cor].inactive
                    )}
                  >
                    <Icon className="w-3 h-3" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Sub-filtro de cargos (apenas na aba Login) */}
          {loginsExpandido && dashboardTab === 'login' && (
            <div className="flex gap-1.5 mb-3 px-1">
              {([
                { id: 'todos', label: 'Todos' },
                { id: 'lideres', label: 'Lideres' },
                { id: 'coordenadores', label: 'Coordenadores' },
              ] as const).map(f => (
                <button
                  key={f.id}
                  onClick={() => setLoginFiltro(f.id)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-[10px] font-medium transition-colors',
                    loginFiltro === f.id ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/[0.04] text-white/30 hover:bg-white/[0.08]'
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}

          {/* Login Tab */}
          {loginsExpandido && dashboardTab === 'login' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-1 mb-2">
                <span className="text-[10px] font-medium text-emerald-400">{totalLogaram}/{alunosFiltrados.length} logaram hoje</span>
              </div>
              {gruposLogin.map(([key, grupo]) => {
                const logaram = grupo.alunos.filter(a => logouHojeSet.has(a.id)).length;
                return (
                  <div key={key}>
                    <div className="flex items-center gap-2 mb-2 px-1">
                      <span className="text-[10px] font-medium text-white/40">{grupo.serie}º {grupo.turma}</span>
                      <span className={cn(
                        'text-[9px] font-medium px-1.5 py-0.5 rounded-full',
                        logaram === grupo.alunos.length ? 'bg-emerald-500/20 text-emerald-400' :
                        logaram > 0 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-white/5 text-white/25'
                      )}>
                        {logaram}/{grupo.alunos.length}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 px-1">
                      {grupo.alunos.map(a => {
                        const logou = logouHojeSet.has(a.id);
                        const loginCount = (loginsCountMap as Record<string, number>)[a.id] || 0;
                        return (
                          <div key={a.id} className="relative group">
                            <div className={cn(
                              'w-8 h-8 rounded-full overflow-hidden border-2 transition-all',
                              logou ? 'border-emerald-400 opacity-100' : 'border-white/10 opacity-25 grayscale'
                            )}>
                              {a.avatar_url ? (
                                <img src={a.avatar_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <span className={cn(
                                  'flex items-center justify-center w-full h-full text-[10px] font-medium',
                                  logou ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-white/40'
                                )}>
                                  {(a.nome || a.full_name || '?').charAt(0).toUpperCase()}
                                </span>
                              )}
                            </div>
                            {loginCount > 0 && (
                              <div className="absolute -top-1 -right-1 min-w-[14px] h-[14px] flex items-center justify-center rounded-full bg-emerald-500 border-[1.5px] border-[#1A1A2E] text-[8px] font-bold text-white px-0.5">
                                {loginCount}
                              </div>
                            )}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1.5 rounded bg-black/95 text-[9px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 text-center">
                              <p>{a.full_name || a.nome || '?'}</p>
                              {a.ultima_atividade && (
                                <p className="text-white/50 mt-0.5">
                                  {new Date(a.ultima_atividade).toLocaleDateString('pt-BR', { timeZone: TIMEZONE_BRASIL, day: '2-digit', month: '2-digit' })} as {formatTimeBrasil(a.ultima_atividade)}
                                </p>
                              )}
                              {loginCount > 0 && (
                                <p className="text-emerald-400/70 mt-0.5">{loginCount}x hoje</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Entregas Tab */}
          {loginsExpandido && dashboardTab === 'entregas' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 px-1 mb-2">
                <span className="text-[10px] font-medium text-blue-400">{entregouSet.size} entregaram</span>
                <span className="text-[10px] font-medium text-orange-400">{visualizouSet.size} visualizaram</span>
              </div>
              <div className="flex gap-3 px-1 mb-2">
                <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-emerald-400" /><span className="text-[8px] text-white/30">Entregou</span></div>
                <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-orange-400" /><span className="text-[8px] text-white/30">Visualizou</span></div>
                <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-white/20" /><span className="text-[8px] text-white/30">Nada</span></div>
              </div>
              {gruposLogin.map(([key, grupo]) => {
                const entregaram = grupo.alunos.filter(a => entregouSet.has(a.id)).length;
                const visualizaram = grupo.alunos.filter(a => visualizouSet.has(a.id) && !entregouSet.has(a.id)).length;
                return (
                  <div key={key}>
                    <div className="flex items-center gap-2 mb-2 px-1">
                      <span className="text-[10px] font-medium text-white/40">{grupo.serie}º {grupo.turma}</span>
                      <span className={cn(
                        'text-[9px] font-medium px-1.5 py-0.5 rounded-full',
                        entregaram === grupo.alunos.length ? 'bg-emerald-500/20 text-emerald-400' :
                        entregaram > 0 ? 'bg-blue-500/15 text-blue-400/70' : 'bg-white/5 text-white/25'
                      )}>
                        {entregaram}/{grupo.alunos.length}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 px-1">
                      {grupo.alunos.map(a => {
                        const entregou = entregouSet.has(a.id);
                        const visualizou = visualizouSet.has(a.id);
                        const entregaInfo = entregasRecentes.find((e: any) => e.aluno_id === a.id);
                        const borderCor = entregou ? 'border-emerald-400' : visualizou ? 'border-orange-400' : 'border-white/10';
                        const bgCor = entregou ? 'bg-emerald-500/20 text-emerald-300' : visualizou ? 'bg-orange-500/20 text-orange-300' : 'bg-white/10 text-white/40';
                        return (
                          <div key={a.id} className="relative group">
                            <div className={cn(
                              'w-8 h-8 rounded-full overflow-hidden border-2 transition-all',
                              borderCor,
                              (entregou || visualizou) ? 'opacity-100' : 'opacity-25 grayscale'
                            )}>
                              {a.avatar_url ? (
                                <img src={a.avatar_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <span className={cn(
                                  'flex items-center justify-center w-full h-full text-[10px] font-medium',
                                  bgCor
                                )}>
                                  {(a.nome || a.full_name || '?').charAt(0).toUpperCase()}
                                </span>
                              )}
                            </div>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1.5 rounded bg-black/95 text-[9px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 text-center">
                              <p>{a.full_name || a.nome || '?'}</p>
                              {entregaInfo ? (
                                <>
                                  <p className="text-emerald-400/70 mt-0.5">{(entregaInfo as any).missao?.titulo || 'Missão'}</p>
                                  <p className="text-white/40 mt-0.5">{(entregaInfo as any).status} — {formatDateTimeBrasil((entregaInfo as any).created_at)}</p>
                                </>
                              ) : visualizou ? (
                                <p className="text-orange-400/70 mt-0.5">Visualizou a missão</p>
                              ) : (
                                <p className="text-white/30 mt-0.5">Não abriu missão</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Observacoes Tab */}
          {loginsExpandido && dashboardTab === 'observacoes' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-1 mb-2">
                <span className="text-[10px] font-medium text-violet-400">{obsMap.size} alunos com observacoes recentes</span>
              </div>
              {gruposLogin.map(([key, grupo]) => {
                const comObs = grupo.alunos.filter(a => obsMap.has(a.id)).length;
                return (
                  <div key={key}>
                    <div className="flex items-center gap-2 mb-2 px-1">
                      <span className="text-[10px] font-medium text-white/40">{grupo.serie}º {grupo.turma}</span>
                      <span className={cn(
                        'text-[9px] font-medium px-1.5 py-0.5 rounded-full',
                        comObs === grupo.alunos.length ? 'bg-violet-500/20 text-violet-400' :
                        comObs > 0 ? 'bg-violet-500/15 text-violet-400/70' : 'bg-white/5 text-white/25'
                      )}>
                        {comObs}/{grupo.alunos.length}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 px-1">
                      {grupo.alunos.map(a => {
                        const obs = obsMap.get(a.id);
                        const borderColor = obs
                          ? obs.estado === 'surpreendeu' ? 'border-amber-400' :
                            obs.estado === 'fez' ? 'border-emerald-400' :
                            obs.estado === 'dificuldades' ? 'border-red-400' :
                            'border-white/30'
                          : 'border-white/10';
                        const bgColor = obs
                          ? obs.estado === 'surpreendeu' ? 'bg-amber-500/20 text-amber-300' :
                            obs.estado === 'fez' ? 'bg-emerald-500/20 text-emerald-300' :
                            obs.estado === 'dificuldades' ? 'bg-red-500/20 text-red-300' :
                            'bg-white/10 text-white/40'
                          : 'bg-white/10 text-white/40';
                        const estadoLabel: Record<string, string> = {
                          surpreendeu: 'Foi alem',
                          fez: 'Fez',
                          dificuldades: 'Dificuldades',
                          nao_conseguiu: 'Nao conseguiu',
                        };
                        const temComentario = obs?.texto && obs.texto.trim();
                        const crossIms = crossImMap.get(a.id) || [];
                        return (
                          <div key={a.id} className="relative group">
                            <div className={cn(
                              'w-8 h-8 rounded-full overflow-hidden border-2 transition-all',
                              borderColor,
                              obs ? 'opacity-100' : 'opacity-25 grayscale'
                            )}>
                              {a.avatar_url ? (
                                <img src={a.avatar_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <span className={cn(
                                  'flex items-center justify-center w-full h-full text-[10px] font-medium',
                                  bgColor
                                )}>
                                  {(a.nome || a.full_name || '?').charAt(0).toUpperCase()}
                                </span>
                              )}
                            </div>
                            {/* Indicador comentário */}
                            {temComentario && (
                              <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-blue-500 border border-[#1A1A2E] flex items-center justify-center">
                                <span className="text-[5px] text-white font-bold">C</span>
                              </div>
                            )}
                            {/* Bolinhas Cross-IM */}
                            {crossIms.length > 0 && (
                              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-px">
                                {crossIms.slice(0, 3).map(intId => (
                                  <div key={intId} className="w-2 h-2 rounded-full border border-[#1A1A2E]"
                                    style={{ backgroundColor: (inteligenciasCores as Record<number, string>)[intId] || '#666' }} />
                                ))}
                              </div>
                            )}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1.5 rounded bg-black/95 text-[9px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 text-center max-w-[200px]">
                              <p>{a.full_name || a.nome || '?'}</p>
                              {obs ? (
                                <>
                                  <p className={cn('mt-0.5',
                                    obs.estado === 'surpreendeu' ? 'text-amber-400/70' :
                                    obs.estado === 'fez' ? 'text-emerald-400/70' :
                                    obs.estado === 'dificuldades' ? 'text-red-400/70' :
                                    'text-white/40'
                                  )}>{estadoLabel[obs.estado] || obs.estado}</p>
                                  {obs.texto && (
                                    <p className="text-white/40 mt-0.5 whitespace-normal">{obs.texto.length > 60 ? obs.texto.slice(0, 60) + '...' : obs.texto}</p>
                                  )}
                                </>
                              ) : (
                                <p className="text-white/30 mt-0.5">Sem observacoes recentes</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Desafios Tab */}
          {loginsExpandido && dashboardTab === 'desafios' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-1 mb-2">
                <span className="text-[10px] font-medium text-orange-400">{desafioSet.size} alunos responderam o desafio hoje</span>
              </div>
              {gruposLogin.map(([key, grupo]) => {
                const comDesafio = grupo.alunos.filter(a => desafioSet.has(a.id)).length;
                return (
                  <div key={key}>
                    <div className="flex items-center gap-2 mb-2 px-1">
                      <span className="text-[10px] font-medium text-white/40">{grupo.serie}º {grupo.turma}</span>
                      <span className={cn(
                        'text-[9px] font-medium px-1.5 py-0.5 rounded-full',
                        comDesafio === grupo.alunos.length ? 'bg-orange-500/20 text-orange-400' :
                        comDesafio > 0 ? 'bg-orange-500/15 text-orange-400/70' : 'bg-white/5 text-white/25'
                      )}>
                        {comDesafio}/{grupo.alunos.length}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 px-1">
                      {grupo.alunos.map(a => {
                        const desafio = desafioMap.get(a.id);
                        return (
                          <div key={a.id} className="relative group">
                            <div className={cn(
                              'w-8 h-8 rounded-full overflow-hidden border-2 transition-all',
                              desafio ? 'border-orange-400 opacity-100' : 'border-white/10 opacity-25 grayscale'
                            )}>
                              {a.avatar_url ? (
                                <img src={a.avatar_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <span className={cn(
                                  'flex items-center justify-center w-full h-full text-[10px] font-medium',
                                  desafio ? 'bg-orange-500/20 text-orange-300' : 'bg-white/10 text-white/40'
                                )}>
                                  {(a.nome || a.full_name || '?').charAt(0).toUpperCase()}
                                </span>
                              )}
                            </div>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1.5 rounded bg-black/95 text-[9px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 text-center max-w-[200px]">
                              <p>{a.full_name || a.nome || '?'}</p>
                              {desafio ? (
                                <>
                                  <p className="text-orange-400/70 mt-0.5">{desafio.tipo}</p>
                                  {desafio.texto && (
                                    <p className="text-white/40 mt-0.5 whitespace-normal">{desafio.texto.length > 60 ? desafio.texto.slice(0, 60) + '...' : desafio.texto}</p>
                                  )}
                                  <p className="text-white/30 mt-0.5">as {formatTimeBrasil(desafio.created_at)}</p>
                                </>
                              ) : (
                                <p className="text-white/30 mt-0.5">Nao respondeu hoje</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Casas */}
      <div>
        <div className="flex items-center gap-2 mb-3 px-1">
          <div className="w-1 h-3.5 rounded-full bg-emerald-500" />
          <p className="text-[10px] font-semibold text-emerald-400/80 uppercase tracking-widest">Casas</p>
        </div>
        <div className="rounded-xl bg-[#252547] border border-violet-500/10 overflow-hidden">
          <div className="flex items-center gap-3 py-2 px-3.5 text-[9px] text-white/25 uppercase tracking-wider">
            <span className="flex-1">Casa</span>
            <span className="w-8 text-center">Qtd</span>
            <span className="w-12 text-center">Pontos</span>
            <span className="w-20 text-center">Entregas</span>
          </div>
          {visaoCasas.map(casa => (
            <div key={casa.id} className="flex items-center gap-3 py-2.5 px-3.5 border-t border-violet-500/5">
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
          <div className="rounded-xl bg-[#252547] border border-violet-500/10 overflow-hidden">
            {timeline.map((item, idx) => (
              <div key={idx} className={cn('py-2.5 px-3.5', idx > 0 && 'border-t border-violet-500/5')}>
                <p className={cn('text-xs', item.cor)}>{item.texto}</p>
                <p className="text-[10px] text-white/20 mt-0.5">{formatDistanceToNow(new Date(item.tempo), { addSuffix: true, locale: ptBR })}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-[#252547] border border-violet-500/10 text-center">
            <Activity className="w-6 h-6 text-white/15 mx-auto mb-2" />
            <p className="text-white/30 text-xs">Nenhuma atividade recente</p>
          </div>
        )}
      </div>
      {/* Atalhos */}
      <div className="space-y-2">
        <button
          onClick={() => navigate('/admin/chat')}
          className="w-full flex items-center justify-between p-4 rounded-xl bg-[#252547] border border-violet-500/10 hover:bg-white/[0.06] transition-colors active:scale-[0.98]"
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <MessageCircle className="w-5 h-5 text-pink-400" />
              {msgPrivadasHoje > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold px-1">
                  {msgPrivadasHoje > 99 ? '99+' : msgPrivadasHoje}
                </span>
              )}
            </div>
            <div className="text-left">
              <span className="text-sm text-white/70">Comunicacao</span>
              <p className="text-[10px] text-white/30">
                Canais, conselho e conversas privadas
                {msgPrivadasHoje > 0 && <span className="text-pink-400/60 ml-1">· {msgPrivadasHoje} msgs hoje</span>}
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-white/30" />
        </button>
      </div>
    </div>
  );
};

export default MonitorPage;
