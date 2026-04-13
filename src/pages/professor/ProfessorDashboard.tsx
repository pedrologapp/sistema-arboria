import { useState } from 'react';
import { useProfessor } from '@/contexts/ProfessorContext';
import { ClipboardList, PenLine, Users, Settings, BookOpen, ChevronRight, Calendar, Check, X, Plus, AlertTriangle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { CasaBrasao } from '@/components/CasaBrasao';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import ConteudoModal from '@/components/professor/ConteudoModal';
import { useAlertasAlunos } from '@/hooks/useAlertasAlunos';
import BannerFaseInfo from '@/components/professor/BannerFaseInfo';

// Detectar gênero pelo primeiro nome (heurística simples)
const getGenero = (nome: string): 'masculino' | 'feminino' => {
  const primeiroNome = (nome?.toLowerCase() || '').split(' ')[0];
  const nomesFemininos = ['julianeide', 'maria', 'ana', 'paula', 'carla', 'fernanda', 'julia', 'beatriz', 'leticia', 'amanda', 'camila', 'larissa', 'bruna', 'gabriela', 'isabela', 'mariana', 'patricia', 'renata', 'vanessa', 'cristina', 'luciana', 'adriana', 'sandra', 'monica', 'tatiana', 'priscila', 'daniela', 'fabiana', 'juliana', 'rafaela', 'simone', 'viviane', 'alessandra', 'carolina', 'debora', 'elaine', 'flavia', 'gisele', 'helena', 'ines', 'jessica', 'katia', 'lidia', 'miriam', 'natalia', 'olivia', 'paloma', 'raquel', 'sabrina', 'thais', 'ursula', 'vera', 'wagner', 'ximena', 'yara', 'zelia'];
  const nomesExcecao = ['luca', 'josue', 'jonas', 'elias', 'matias', 'tobias', 'isaias', 'jeremias', 'esdras', 'barnaba'];
  
  if (nomesFemininos.includes(primeiroNome)) {
    return 'feminino';
  }
  
  if (nomesExcecao.includes(primeiroNome)) {
    return 'masculino';
  }
  
  // Heurística: nomes terminados em 'a' geralmente são femininos
  if (primeiroNome.endsWith('a')) {
    return 'feminino';
  }
  
  return 'masculino';
};

const ProfessorDashboard = () => {
  const { profile, casaMentor, casaColor, faseAtual, faseCasaMentor } = useProfessor();
  const navigate = useNavigate();
  const [showConteudoModal, setShowConteudoModal] = useState(false);
  const [showAgendaModal, setShowAgendaModal] = useState(false);
  const [agendaSerie, setAgendaSerie] = useState('');
  const [agendaTurma, setAgendaTurma] = useState('');
  const [agendaDia, setAgendaDia] = useState(1);
  const [agendaHorario, setAgendaHorario] = useState('14:00');
  const [showMotivoModal, setShowMotivoModal] = useState<{ serie: string; turma: string } | null>(null);
  const [motivo, setMotivo] = useState('');
  const [confirmando, setConfirmando] = useState(false);
  const { badgesAtivos } = useAlertasAlunos();
  
  // Calcular total de alertas para badge
  const totalAlertas = (badgesAtivos?.precisaAtencao || 0) + 
                       (badgesAtivos?.celebrar || 0) + 
                       (badgesAtivos?.naoEsquecer || 0) + 
                       (badgesAtivos?.atencaoFaseAnterior || 0) +
                       (badgesAtivos?.aguardandoExplicacao || 0);

  // Query: Missões Ativas
  const { data: missoesAtivas } = useQuery({
    queryKey: ['missoes-ativas-count', profile?.institution_id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('missoes')
        .select('*', { count: 'exact', head: true })
        .eq('institution_id', profile?.institution_id!)
        .eq('status', 'liberada');

      if (error) {
        console.error('Erro ao contar missões:', error);
        return 0;
      }
      return count || 0;
    },
    enabled: !!profile?.institution_id
  });

  // Query: Entregas Pendentes
  const { data: entregasPendentes } = useQuery({
    queryKey: ['entregas-pendentes-count', profile?.institution_id],
    queryFn: async () => {
      const { data: missoes } = await supabase
        .from('missoes')
        .select('id')
        .eq('institution_id', profile?.institution_id!);

      if (!missoes || missoes.length === 0) return 0;

      const { count, error } = await supabase
        .from('entregas')
        .select('*', { count: 'exact', head: true })
        .in('missao_id', missoes.map(m => m.id))
        .eq('status', 'pendente');

      if (error) {
        console.error('Erro ao contar entregas:', error);
        return 0;
      }
      return count || 0;
    },
    enabled: !!profile?.institution_id
  });

  const queryClient = useQueryClient();
  const [expandirOrganizar, setExpandirOrganizar] = useState(false);
  const [confirmandoTurma, setConfirmandoTurma] = useState<string | null>(null); // "serie-turma" aguardando confirmacao

  // Turmas da instituicao (pre-populadas)
  const { data: turmasInstituicao = [] } = useQuery({
    queryKey: ['prof-turmas-inst', profile?.institution_id],
    queryFn: async () => {
      if (!profile?.institution_id) return [];
      const { data } = await supabase.from('profiles')
        .select('serie, turma').eq('institution_id', profile.institution_id)
        .eq('segmento', 'fundamental2').not('casa_id', 'is', null).not('turma', 'is', null);
      const unique = new Map<string, { serie: string; turma: string }>();
      (data || []).forEach(d => {
        if (d.serie && d.turma) {
          const serieNum = d.serie.replace(/\D/g, '');
          const key = `${serieNum}-${d.turma}`;
          if (!unique.has(key)) unique.set(key, { serie: serieNum, turma: d.turma });
        }
      });
      return Array.from(unique.values()).sort((a, b) => {
        const sd = parseInt(a.serie) - parseInt(b.serie);
        return sd !== 0 ? sd : a.turma.localeCompare(b.turma);
      });
    },
    enabled: !!profile?.institution_id,
    staleTime: 300000,
  });

  // Agenda do professor
  const { data: agenda = [] } = useQuery({
    queryKey: ['prof-agenda', profile?.id, faseAtual?.id],
    queryFn: async () => {
      if (!profile?.id || !faseAtual?.id) return [];
      const { data } = await supabase.from('professor_agenda')
        .select('*').eq('professor_id', profile.id).eq('fase_id', faseAtual.id).eq('ativo', true).order('serie,turma');
      return data || [];
    },
    enabled: !!profile?.id && !!faseAtual?.id,
    staleTime: 120000,
  });

  // Confirmacoes de aula da semana atual
  const { data: confirmacoes = [] } = useQuery({
    queryKey: ['prof-confirmacoes', profile?.id, faseAtual?.id, faseAtual?.semana_atual],
    queryFn: async () => {
      if (!profile?.id || !faseAtual?.id) return [];
      const { data } = await supabase.from('aula_confirmacao')
        .select('*').eq('professor_id', profile.id).eq('fase_id', faseAtual.id).eq('semana', faseAtual.semana_atual || 1);
      return data || [];
    },
    enabled: !!profile?.id && !!faseAtual?.id,
    staleTime: 60000,
  });

  const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

  const getConfirmacao = (serie: string, turma: string) =>
    confirmacoes.find(c => c.serie === serie && c.turma === turma);

  const confirmarAula = async (serie: string, turma: string) => {
    if (!profile?.id || !profile?.institution_id || !faseAtual?.id) return;
    setConfirmando(true);
    try {
      await supabase.from('aula_confirmacao').upsert({
        professor_id: profile.id, institution_id: profile.institution_id,
        fase_id: faseAtual.id, semana: faseAtual.semana_atual || 1,
        serie, turma, confirmada: true, aula_nao_ocorreu: false,
      }, { onConflict: 'professor_id,fase_id,semana,serie,turma' });

      // Liberar missões desta série/semana (rascunho ou pre_configurada)
      const agora = new Date();
      const liberacao = agora.toISOString();
      // Prazo: próximo domingo às 00:00 (7 dias)
      const diasAteDomingo = 7 - agora.getDay(); // 0=dom, 1=seg...
      const proximoDomingo = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + (diasAteDomingo === 0 ? 7 : diasAteDomingo), 0, 0, 0);
      const prazo = proximoDomingo.toISOString();
      const serieNum = parseInt(serie.replace(/\D/g, ''));

      await supabase.from('missoes')
        .update({ status: 'liberada', data_liberacao: liberacao, data_prazo: prazo })
        .eq('fase_id', faseAtual.id).eq('semana', faseAtual.semana_atual || 1)
        .in('status', ['rascunho', 'pre_configurada'])
        .or(`serie_filtro.eq.${serieNum},serie_filtro.is.null`);

      toast.success(`Aula confirmada! Missões do ${serie} liberadas para os alunos.`);
      queryClient.invalidateQueries({ queryKey: ['prof-confirmacoes'] });
    } catch (err: any) { toast.error(err.message || 'Erro'); } finally { setConfirmando(false); }
  };

  const informarAusencia = async () => {
    if (!showMotivoModal || !profile?.id || !profile?.institution_id || !faseAtual?.id) return;
    setConfirmando(true);
    try {
      await supabase.from('aula_confirmacao').upsert({
        professor_id: profile.id, institution_id: profile.institution_id,
        fase_id: faseAtual.id, semana: faseAtual.semana_atual || 1,
        serie: showMotivoModal.serie, turma: showMotivoModal.turma,
        confirmada: false, aula_nao_ocorreu: true, motivo_ausencia: motivo,
      }, { onConflict: 'professor_id,fase_id,semana,serie,turma' });
      toast.success('Coordenador sera notificado');
      setShowMotivoModal(null); setMotivo('');
      queryClient.invalidateQueries({ queryKey: ['prof-confirmacoes'] });
    } catch (err: any) { toast.error(err.message || 'Erro'); } finally { setConfirmando(false); }
  };

  const salvarAgenda = async () => {
    if (!profile?.id || !profile?.institution_id || !faseAtual?.id || !agendaSerie || !agendaTurma) return;
    try {
      await supabase.from('professor_agenda').upsert({
        professor_id: profile.id, institution_id: profile.institution_id,
        fase_id: faseAtual.id, serie: agendaSerie, turma: agendaTurma,
        dia_semana: agendaDia, horario: agendaHorario,
      }, { onConflict: 'professor_id,fase_id,serie,turma' });
      toast.success('Horario salvo!');
      setShowAgendaModal(false);
      setAgendaSerie(''); setAgendaTurma('');
      queryClient.invalidateQueries({ queryKey: ['prof-agenda'] });
    } catch (err: any) { toast.error(err.message || 'Erro'); }
  };

  const genero = getGenero(profile?.full_name || profile?.nome || '');
  const tituloMentor = genero === 'feminino' ? 'Mentora' : 'Mentor';

  const quickActions = [
    {
      icon: <ClipboardList size={24} />,
      label: 'Observar',
      path: '/professor/circulo',
      description: 'Observacao semanal',
      isModal: false,
      color: '#8b5cf6',
      bgColor: 'rgba(139,92,246,0.12)',
    },
    {
      icon: <PenLine size={24} />,
      label: 'Avaliar',
      path: '/professor/entregas',
      description: 'Entregas pendentes',
      isModal: false,
      color: '#10b981',
      bgColor: 'rgba(16,185,129,0.12)',
    },
    {
      icon: <Users size={24} />,
      label: 'Alunos',
      path: '/professor/alunos',
      description: 'Ver todos os alunos',
      isModal: false,
      color: '#ec4899',
      bgColor: 'rgba(236,72,153,0.12)',
    },
    {
      icon: <BookOpen size={24} />,
      label: 'Conteudo',
      path: null,
      description: 'Materiais Arboria',
      isModal: true,
      color: '#06b6d4',
      bgColor: 'rgba(6,182,212,0.12)',
    },
  ];

  const firstName = profile?.nome || profile?.full_name?.split(' ')[0] || 'Professor';

  const handleActionClick = (action: typeof quickActions[0]) => {
    if (action.isModal) {
      setShowConteudoModal(true);
    } else if (action.path) {
      navigate(action.path);
    }
  };

  return (
    <div className="p-4 space-y-5 pb-24">
      {/* Header: Saudação + Settings */}
      <div className="relative pt-2">
        <button
          onClick={() => navigate('/professor/configuracoes')}
          className="absolute top-0 right-0 p-2 rounded-full
            text-white/40 bg-white/5
            hover:text-white hover:bg-white/10 hover:scale-110
            transition-all duration-200"
          aria-label="Configurações"
        >
          <Settings className="w-5 h-5" />
        </button>

        <h1 className="text-2xl font-bold text-white">
          Olá, {firstName}!
        </h1>
        {casaMentor && (
          <p className="text-white/40 text-sm mt-0.5">
            {tituloMentor} da Casa {casaMentor.nome}
          </p>
        )}
      </div>

      {/* Card principal: Casa + Fase */}
      {casaMentor && (
        <div
          className="relative overflow-hidden p-5 rounded-2xl
            bg-[#252547] backdrop-blur-xl
            border border-violet-500/10"
          style={{ boxShadow: `0 16px 32px -8px ${casaColor}25` }}
        >
          {/* Glow decorativo */}
          <div
            className="absolute -top-10 -right-10 w-36 h-36 rounded-full blur-3xl opacity-20 pointer-events-none"
            style={{ backgroundColor: casaColor }}
          />

          <div className="relative z-10 flex items-center gap-4">
            <CasaBrasao
              brasaoUrl={casaMentor.brasao_url}
              emoji={casaMentor.emoji}
              nome={casaMentor.nome}
              size="medium"
            />
            <div className="flex-1 min-w-0">
              <h2
                className="text-lg font-bold"
                style={{ color: casaColor }}
              >
                Casa {casaMentor.nome}
              </h2>
              {faseAtual && faseAtual.inteligencia ? (
                <div className="mt-1">
                  <p className="text-white/70 text-sm">
                    Fase {faseAtual.numero_fase} — {faseAtual.inteligencia.nome}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <p className="text-white/40 text-xs">
                      Semana {faseAtual.semana_atual || 1} de 4
                    </p>
                    <div className="flex-1 max-w-[80px]">
                      <Progress
                        value={((faseAtual.semana_atual || 0) / 4) * 100}
                        className="h-1.5 bg-white/10"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-white/40 text-sm mt-1">Nenhuma fase ativa</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Organize sua Fase — Card expansivel */}
      {faseAtual && (
        <div className="rounded-xl bg-[#252547] border border-violet-500/10 overflow-hidden">
          {/* Header colapsavel */}
          <button
            onClick={() => setExpandirOrganizar(!expandirOrganizar)}
            className="w-full p-4 text-left hover:bg-white/[0.02] transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-violet-400" />
                <span className="text-sm font-medium text-white">Organize sua Fase — Semana {faseAtual?.semana_atual || 1}</span>
              </div>
              <div className="flex items-center gap-2">
                {/* Resumo quando fechado */}
                {!expandirOrganizar && agenda.length > 0 && (
                  <span className="text-[10px] text-white/30">
                    {confirmacoes.filter(c => c.confirmada && !c.aula_nao_ocorreu).length}/{turmasInstituicao.length} aulas
                  </span>
                )}
                <ChevronRight className={cn('w-4 h-4 text-white/30 transition-transform', expandirOrganizar && 'rotate-90')} />
              </div>
            </div>
            {!expandirOrganizar && (
              <p className="text-[10px] text-white/25 mt-1">Confirme suas aulas da semana {faseAtual?.semana_atual || 1} para liberar as missões</p>
            )}
          </button>

          {/* Conteudo expandido */}
          {expandirOrganizar && (
            <div className="px-4 pb-4 space-y-3 border-t border-violet-500/5 pt-3">
              <p className="text-[10px] text-white/30 leading-relaxed">
                Abaixo estao todas as turmas da instituicao. Configure o dia e horario da sua aula em cada turma. Ao confirmar que deu a aula, as missoes serao liberadas automaticamente para os alunos as 18h daquele dia.
              </p>

              {/* Lista de turmas */}
              <div className="space-y-1.5">
                {turmasInstituicao.map(t => {
                  const key = `${t.serie}-${t.turma}`;
                  const ag = agenda.find((a: any) => a.serie === t.serie && a.turma === t.turma);
                  const conf = getConfirmacao(t.serie, t.turma);
                  const aulaConfirmada = conf?.confirmada && !conf?.aula_nao_ocorreu;
                  const aulaCancelada = conf?.aula_nao_ocorreu;
                  const aguardandoConfirmacao = confirmandoTurma === key;

                  return (
                    <div key={key} className={cn(
                      'py-2.5 px-3 rounded-lg border transition-all',
                      aulaConfirmada ? 'bg-emerald-500/10 border-emerald-500/20' :
                      aulaCancelada ? 'bg-red-500/10 border-red-500/20' :
                      'bg-white/[0.03] border-white/[0.08]'
                    )}>
                      <div className="flex items-center gap-2.5">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white font-medium">{t.serie}º Ano — Turma {t.turma}</p>
                          {ag ? (
                            <button
                              onClick={(e) => { e.stopPropagation(); setAgendaSerie(t.serie); setAgendaTurma(t.turma); setAgendaDia(ag.dia_semana); setAgendaHorario(ag.horario?.slice(0, 5) || '08:00'); setShowAgendaModal(true); }}
                              className="text-[10px] text-white/40 hover:text-violet-300 transition-colors"
                            >
                              {diasSemana[ag.dia_semana]} {ag.horario?.slice(0, 5)} (editar)
                            </button>
                          ) : (
                            <button
                              onClick={(e) => { e.stopPropagation(); setAgendaSerie(t.serie); setAgendaTurma(t.turma); setShowAgendaModal(true); }}
                              className="text-[10px] text-violet-400/60 hover:text-violet-300"
                            >
                              + Definir horario
                            </button>
                          )}
                        </div>

                        {aulaConfirmada ? (
                          <span className="flex items-center gap-1 text-[10px] text-emerald-400 shrink-0">
                            <Check className="w-3.5 h-3.5" /> Aula confirmada
                          </span>
                        ) : aulaCancelada ? (
                          <span className="text-[10px] text-red-400/60 shrink-0">Nao ocorreu</span>
                        ) : aguardandoConfirmacao ? (
                          <div className="flex gap-1.5 shrink-0">
                            <button
                              onClick={() => { confirmarAula(t.serie, t.turma); setConfirmandoTurma(null); }}
                              disabled={confirmando}
                              className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-emerald-500 text-white hover:bg-emerald-400 transition-colors disabled:opacity-50"
                            >
                              Confirmar
                            </button>
                            <button
                              onClick={() => setConfirmandoTurma(null)}
                              className="px-2 py-1.5 rounded-lg text-[10px] bg-white/[0.08] text-white/40"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : ag ? (
                          <div className="flex gap-1.5 shrink-0">
                            <button
                              onClick={() => setConfirmandoTurma(key)}
                              className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors"
                            >
                              Aula dada
                            </button>
                            <button
                              onClick={() => setShowMotivoModal({ serie: t.serie, turma: t.turma })}
                              className="px-2 py-1.5 rounded-lg text-[10px] bg-white/[0.06] text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>

              {turmasInstituicao.length === 0 && (
                <p className="text-[10px] text-white/20 text-center py-3">Nenhuma turma encontrada na instituicao</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal: Definir horario */}
      {showAgendaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#1E1E3A] border border-violet-500/10 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Definir horario</p>
                <p className="text-xs text-white/30">{agendaSerie}º Ano — Turma {agendaTurma}</p>
              </div>
              <button onClick={() => setShowAgendaModal(false)} className="p-1 text-white/30 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-white/30 block mb-1">Dia da semana</label>
                <select value={agendaDia} onChange={e => setAgendaDia(Number(e.target.value))}
                  className="w-full bg-white/[0.06] border border-violet-500/10 rounded-lg px-2 py-2 text-xs text-white outline-none">
                  {[1, 2, 3, 4, 5].map(d => <option key={d} value={d}>{diasSemana[d]}a-feira</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-white/30 block mb-1">Horario</label>
                <input type="time" value={agendaHorario} onChange={e => setAgendaHorario(e.target.value)}
                  className="w-full bg-white/[0.06] border border-violet-500/10 rounded-lg px-2 py-2 text-xs text-white outline-none" />
              </div>
            </div>
            <button onClick={salvarAgenda}
              className="w-full py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 transition-colors">
              Salvar
            </button>
            {agenda.find((a: any) => a.serie === agendaSerie && a.turma === agendaTurma) && (
              <button
                onClick={async () => {
                  if (!profile?.id || !faseAtual?.id || !agendaSerie || !agendaTurma) return;
                  try {
                    await supabase.from('professor_agenda')
                      .update({ ativo: false })
                      .eq('professor_id', profile.id)
                      .eq('fase_id', faseAtual.id)
                      .eq('serie', agendaSerie)
                      .eq('turma', agendaTurma);
                    toast.success('Horario removido');
                    setShowAgendaModal(false);
                    setAgendaSerie(''); setAgendaTurma('');
                    queryClient.invalidateQueries({ queryKey: ['prof-agenda'] });
                  } catch (err: any) { toast.error(err.message || 'Erro'); }
                }}
                className="w-full py-2.5 rounded-xl bg-red-500/10 text-red-400 text-sm font-medium hover:bg-red-500/20 transition-colors"
              >
                Remover horario
              </button>
            )}
          </div>
        </div>
      )}

      {/* Modal: Motivo ausencia */}
      {showMotivoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#1E1E3A] border border-violet-500/10 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Aula nao ocorreu</p>
                <p className="text-xs text-white/30">{showMotivoModal.serie}º Ano — Turma {showMotivoModal.turma}</p>
              </div>
              <button onClick={() => { setShowMotivoModal(null); setMotivo(''); }} className="p-1 text-white/30 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div>
              <label className="text-[10px] text-white/30 block mb-1">Motivo</label>
              <textarea value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Informe o motivo..."
                rows={3} className="w-full bg-white/[0.04] border border-violet-500/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 resize-none outline-none" />
            </div>
            <p className="text-[10px] text-amber-400/60">O coordenador Arboria sera notificado sobre esta ausencia.</p>
            <button onClick={informarAusencia} disabled={!motivo.trim() || confirmando}
              className="w-full py-2.5 rounded-xl bg-red-500/80 text-white text-sm font-medium hover:bg-red-500 transition-colors disabled:opacity-40">
              {confirmando ? 'Enviando...' : 'Informar ausencia'}
            </button>
          </div>
        </div>
      )}

      {/* Stats: Missões + Entregas */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => navigate('/professor/missoes')}
          className="p-4 rounded-xl text-center
            bg-[#252547] border border-violet-500/10
            hover:border-white/20 hover:scale-[1.02]
            transition-all duration-200 active:scale-[0.98]"
        >
          <div className="text-2xl font-bold text-white">
            {missoesAtivas ?? '--'}
          </div>
          <div className="text-xs text-white/40 mt-0.5">Missões Ativas</div>
        </button>
        <button
          onClick={() => navigate('/professor/entregas')}
          className="p-4 rounded-xl text-center
            bg-[#252547] border border-violet-500/10
            hover:border-white/20 hover:scale-[1.02]
            transition-all duration-200 active:scale-[0.98]"
        >
          <div className={cn(
            "text-2xl font-bold",
            entregasPendentes && entregasPendentes > 0
              ? "text-yellow-400"
              : "text-white"
          )}>
            {entregasPendentes ?? '--'}
          </div>
          <div className="text-xs text-white/40 mt-0.5">Entregas Pendentes</div>
        </button>
      </div>

      {/* Ações Rápidas - Grid 2x2 com cor neutra */}
      <div className="space-y-3">
        <h3 className="text-xs font-medium text-white/40 uppercase tracking-widest">
          Ações Rápidas
        </h3>

        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((action) => (
            <button
              key={action.label}
              onClick={() => handleActionClick(action)}
              className="relative flex flex-col items-center gap-2.5 p-4 rounded-xl text-center group
                bg-[#252547] border border-violet-500/10
                hover:border-white/20 hover:bg-white/[0.06]
                transition-all duration-200 active:scale-[0.97]"
            >
              {/* Badge para Alunos */}
              {action.label === 'Alunos' && totalAlertas > 0 && (
                <span className="absolute top-2 right-2 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1 shadow-lg">
                  {totalAlertas > 99 ? '99+' : totalAlertas}
                </span>
              )}
              <div
                className="p-2.5 rounded-lg transition-transform group-hover:scale-110"
                style={{ backgroundColor: action.bgColor }}
              >
                <div style={{ color: action.color }}>{action.icon}</div>
              </div>
              <div>
                <span className="text-white/90 text-sm font-medium block">{action.label}</span>
                <span className="text-white/35 text-[11px] leading-tight">{action.description}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Banner Informativo de Fase (se houver) */}
      <BannerFaseInfo
        faseAtual={faseAtual}
        faseCasaMentor={faseCasaMentor}
        casaMentor={casaMentor}
      />

      {/* Modal de Conteúdo */}
      <ConteudoModal
        isOpen={showConteudoModal}
        onClose={() => setShowConteudoModal(false)}
        faseAtual={faseAtual}
      />
    </div>
  );
};

export default ProfessorDashboard;
