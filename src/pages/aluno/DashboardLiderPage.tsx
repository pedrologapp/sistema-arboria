import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStudent } from '@/contexts/StudentContext';
import { AlertTriangle, CheckCircle, Users, Trophy, ChevronDown, ChevronUp, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const DashboardLiderPage = () => {
  const navigate = useNavigate();
  const { profile, casa, casaColor, faseAtual } = useStudent();
  const [expandirSemEntrega, setExpandirSemEntrega] = useState(false);

  // Check cargo (lider ve tudo, coordenador ve so sua turma)
  const { data: meuCargo } = useQuery({
    queryKey: ['dashboard-meu-cargo', profile?.id, casa?.id],
    queryFn: async () => {
      if (!profile?.id || !casa?.id) return null;
      const { data } = await supabase.from('cargos_casa')
        .select('cargo').eq('aluno_id', profile.id).eq('casa_id', casa.id).eq('ativo', true).maybeSingle();
      return data?.cargo || null;
    },
    enabled: !!profile?.id && !!casa?.id,
    staleTime: 300000,
  });

  const isLider = meuCargo === 'lider';
  const isCoordenador = meuCargo === 'coordenador';
  const minhaSerie = profile?.serie?.replace(/\D/g, '') || '';
  const minhaTurma = profile?.turma || '';

  // Membros da casa (filtrado por turma se coordenador)
  const { data: membros = [] } = useQuery({
    queryKey: ['lider-membros', casa?.id, profile?.institution_id, meuCargo, minhaSerie, minhaTurma],
    queryFn: async () => {
      if (!casa?.id || !profile?.institution_id) return [];
      let q = supabase.from('profiles')
        .select('id, full_name, nome, serie, turma, avatar_url')
        .eq('casa_id', casa.id).eq('institution_id', profile.institution_id).eq('segmento', 'fundamental2')
        .order('full_name');
      // Coordenador so ve sua serie+turma
      if (isCoordenador && minhaSerie && minhaTurma) {
        q = q.ilike('serie', `%${minhaSerie}%`).eq('turma', minhaTurma);
      }
      const { data } = await q;
      return data || [];
    },
    enabled: !!casa?.id && !!profile?.institution_id && !!meuCargo,
    staleTime: 120000,
  });

  // Entregas (com prazo)
  const { data: entregasData } = useQuery({
    queryKey: ['lider-entregas', profile?.institution_id, casa?.id, membros.length],
    queryFn: async () => {
      if (!profile?.institution_id || membros.length === 0) return null;
      const { data: missoes } = await supabase.from('missoes').select('id, data_prazo, serie_filtro')
        .eq('institution_id', profile.institution_id).eq('status', 'liberada');
      if (!missoes?.length) return { entregaram: [], dentroPrazo: [], prazoApertado: [], naoEntregaram: [], total: 0 };

      // Determinar quais membros deveriam entregar (baseado na serie_filtro das missoes)
      const seriesComMissao = new Set<string>();
      missoes.forEach(m => {
        if (m.serie_filtro) seriesComMissao.add(String(m.serie_filtro));
        else ['6', '7', '8', '9'].forEach(s => seriesComMissao.add(s));
      });
      const membrosElegiveis = membros.filter(m => {
        const serieNum = m.serie?.replace(/\D/g, '') || '0';
        return seriesComMissao.has(serieNum);
      });

      const { data: entregas } = await supabase.from('entregas').select('aluno_id').in('missao_id', missoes.map(m => m.id));
      const entregaramIds = new Set(entregas?.map(e => e.aluno_id) || []);
      const naoEntregaram = membrosElegiveis.filter(m => !entregaramIds.has(m.id));

      // Verificar prazo mais proximo
      const agora = new Date();
      const doisDias = new Date(agora.getTime() + 2 * 24 * 60 * 60 * 1000);
      const prazoMaisProximo = missoes.reduce((min, m) => {
        const p = new Date(m.data_prazo);
        return p < min ? p : min;
      }, new Date('2099-01-01'));

      const prazoApertado = prazoMaisProximo <= doisDias;

      return {
        entregaram: membrosElegiveis.filter(m => entregaramIds.has(m.id)),
        dentroPrazo: prazoApertado ? [] : naoEntregaram,
        prazoApertado: prazoApertado ? naoEntregaram : [],
        naoEntregaram,
        total: membrosElegiveis.length,
        prazoData: prazoMaisProximo,
      };
    },
    enabled: !!profile?.institution_id && membros.length > 0,
    staleTime: 120000,
  });

  // Ranking da casa
  const { data: rankingCasa } = useQuery({
    queryKey: ['lider-ranking', casa?.id, profile?.institution_id],
    queryFn: async () => {
      if (!casa?.id || !profile?.institution_id) return null;
      const { data } = await supabase.from('ranking_casas')
        .select('total_pontos, posicao').eq('casa_id', casa.id).eq('institution_id', profile.institution_id).maybeSingle();
      return data;
    },
    enabled: !!casa?.id && !!profile?.institution_id,
  });

  // Coordenadores
  const { data: coordenadores = [] } = useQuery({
    queryKey: ['lider-coords', casa?.id, profile?.institution_id],
    queryFn: async () => {
      if (!casa?.id || !profile?.institution_id) return [];
      const { data } = await supabase.from('cargos_casa')
        .select('aluno_id, profiles:profiles!cargos_casa_aluno_id_fkey(id, full_name, nome, serie, turma, avatar_url)')
        .eq('casa_id', casa.id).eq('institution_id', profile.institution_id).eq('ativo', true).eq('cargo', 'coordenador');
      return data || [];
    },
    enabled: !!casa?.id && !!profile?.institution_id,
  });

  // Top 5
  const { data: top5 = [] } = useQuery({
    queryKey: ['lider-top5', casa?.id, profile?.institution_id],
    queryFn: async () => {
      if (!casa?.id || !profile?.institution_id) return [];
      const { data } = await supabase.from('ranking_alunos_por_casa')
        .select('aluno_id, aluno_nome, total_pontos')
        .eq('casa_id', casa.id).eq('institution_id', profile.institution_id)
        .order('total_pontos', { ascending: false }).limit(5);
      return data || [];
    },
    enabled: !!casa?.id && !!profile?.institution_id,
  });

  // Aula confirmada?
  const { data: aulaStatus } = useQuery({
    queryKey: ['lider-aula-status', faseAtual?.id, faseAtual?.semana_atual],
    queryFn: async () => {
      if (!faseAtual?.id || !profile?.institution_id) return null;
      const { data } = await supabase.from('aula_confirmacao')
        .select('confirmada, aula_nao_ocorreu')
        .eq('fase_id', faseAtual.id).eq('semana', faseAtual.semana_atual || 1);
      if (!data?.length) return 'pendente';
      if (data.some(c => c.confirmada && !c.aula_nao_ocorreu)) return 'confirmada';
      if (data.some(c => c.aula_nao_ocorreu)) return 'cancelada';
      return 'pendente';
    },
    enabled: !!faseAtual?.id,
  });

  // Contribuicao por serie+turma (inclui todos, mesmo sem turma)
  const turmaStat = (() => {
    const map: Record<string, { serie: string; turma: string; total: number; entregaram: number }> = {};
    membros.forEach(m => {
      const s = m.serie?.replace(/\D/g, '') || '0';
      const t = m.turma || '';
      const key = s && t ? `${s}-${t}` : s ? `${s}-sem` : 'sem-turma';
      const label = t || 'S/T';
      if (!map[key]) map[key] = { serie: s || '?', turma: label, total: 0, entregaram: 0 };
      map[key].total++;
    });
    const entregaramIds = new Set(entregasData?.entregaram?.map(e => e.id) || []);
    membros.forEach(m => {
      const s = m.serie?.replace(/\D/g, '') || '0';
      const t = m.turma || '';
      const key = s && t ? `${s}-${t}` : s ? `${s}-sem` : 'sem-turma';
      if (entregaramIds.has(m.id) && map[key]) map[key].entregaram++;
    });
    return Object.entries(map).sort((a, b) => {
      const sd = parseInt(a[1].serie) - parseInt(b[1].serie);
      return sd !== 0 ? sd : a[1].turma.localeCompare(b[1].turma);
    });
  })();

  const pctEntrega = entregasData ? Math.round((entregasData.entregaram.length / entregasData.total) * 100) : 0;

  // Iniciar DM
  const iniciarDM = async (outroId: string) => {
    if (!profile?.id || !profile?.institution_id) return;
    try {
      const { data: minhas } = await supabase.from('conversa_participantes').select('conversa_id').eq('usuario_id', profile.id);
      if (minhas?.length) {
        const { data: existente } = await supabase.from('conversa_participantes').select('conversa_id')
          .eq('usuario_id', outroId).in('conversa_id', minhas.map(c => c.conversa_id)).limit(1).maybeSingle();
        if (existente) { navigate(`/aluno/chat/dm/${existente.conversa_id}`); return; }
      }
      const id = crypto.randomUUID();
      await supabase.from('conversas_privadas').insert({ id, institution_id: profile.institution_id });
      await supabase.from('conversa_participantes').insert([
        { conversa_id: id, usuario_id: profile.id },
        { conversa_id: id, usuario_id: outroId },
      ]);
      navigate(`/aluno/chat/dm/${id}`);
    } catch { toast.error('Erro ao iniciar conversa'); }
  };

  const AvatarPequeno = ({ aluno, onClick }: { aluno: any; onClick?: () => void }) => (
    <button onClick={onClick} className="flex flex-col items-center gap-1 w-14 active:scale-95">
      <div className="w-9 h-9 rounded-full overflow-hidden border-2 shrink-0" style={{ borderColor: casaColor }}>
        {aluno.avatar_url ? <img src={aluno.avatar_url} alt="" className="w-full h-full object-cover" /> :
        <span className="flex items-center justify-center w-full h-full text-[10px] text-white/50" style={{ backgroundColor: `${casaColor}20` }}>
          {(aluno.nome || aluno.full_name || '?').charAt(0).toUpperCase()}</span>}
      </div>
      <span className="text-[8px] text-white/40 text-center leading-tight truncate w-full">
        {aluno.nome || aluno.full_name?.split(' ')[0]}
      </span>
    </button>
  );

  return (
    <div className="p-4 space-y-5 pb-24">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-white">Dashboard</h1>
        <p className="text-xs text-white/30 mt-0.5">
          Casa {casa?.nome} — {isLider ? 'Lider' : `Coordenador ${minhaSerie}º ${minhaTurma}`}
        </p>
      </div>

      {/* Reportar ao mentor/lider */}
      <ReportarMentor userId={profile?.id} institutionId={profile?.institution_id} casaId={casa?.id} casaColor={casaColor} cargo={meuCargo} />

      {/* Reportes dos coordenadores (só para líder) */}
      {isLider && <ReportesCoordSection institutionId={profile?.institution_id} casaId={casa?.id} casaColor={casaColor} />}

      {/* Atencao agora */}
      <div>
        <div className="flex items-center gap-2 mb-3 px-1">
          <div className="w-1 h-3.5 rounded-full bg-red-500" />
          <p className="text-[10px] font-semibold text-red-400/80 uppercase tracking-widest">Atencao</p>
        </div>
        <div className="space-y-2">
          {entregasData && entregasData.naoEntregaram && entregasData.naoEntregaram.length > 0 && (
            <div className="space-y-2">
              {entregasData.dentroPrazo.length > 0 && (
                <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-blue-400" />
                      <span className="text-sm text-white">No prazo</span>
                    </div>
                    <span className="text-sm font-bold text-blue-400">{entregasData.dentroPrazo.length}</span>
                  </div>
                  <p className="text-[10px] text-blue-400/50 mt-1 ml-6">
                    Prazo ate {entregasData.prazoData ? new Date(entregasData.prazoData).toLocaleDateString('pt-BR') : ''}
                  </p>
                </div>
              )}
              {entregasData.prazoApertado.length > 0 && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                      <span className="text-sm text-white">Prazo encerrando</span>
                    </div>
                    <span className="text-sm font-bold text-red-400">{entregasData.prazoApertado.length}</span>
                  </div>
                  <p className="text-[10px] text-red-400/50 mt-1 ml-6">Menos de 2 dias para entregar</p>
                </div>
              )}
            </div>
          )}
          <div className={cn('p-3.5 rounded-xl border',
            aulaStatus === 'confirmada' ? 'bg-emerald-500/10 border-emerald-500/20' :
            aulaStatus === 'cancelada' ? 'bg-red-500/10 border-red-500/20' :
            'bg-white/[0.04] border-violet-500/10'
          )}>
            <div className="flex items-center gap-2">
              {aulaStatus === 'confirmada' ? <CheckCircle className="w-4 h-4 text-emerald-400" /> :
               aulaStatus === 'cancelada' ? <AlertTriangle className="w-4 h-4 text-red-400" /> :
               <AlertTriangle className="w-4 h-4 text-white/30" />}
              <span className="text-sm text-white">
                Missao da semana: {aulaStatus === 'confirmada' ? 'Liberada' : aulaStatus === 'cancelada' ? 'Aula nao ocorreu' : 'Aguardando professor'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl text-center bg-[#252547] border border-violet-500/10">
          <div className="flex items-center justify-center gap-1 mb-0.5">
            <Trophy className="w-3.5 h-3.5 text-yellow-500" />
            <span className="text-xl font-bold text-white">{rankingCasa?.total_pontos || 0}</span>
          </div>
          <p className="text-[10px] text-white/40">Pontos</p>
        </div>
        <div className="p-3.5 rounded-xl text-center bg-[#252547] border border-violet-500/10">
          <Users className="w-3.5 h-3.5 text-blue-400 mx-auto mb-0.5" />
          <span className="text-xl font-bold text-white">{membros.length}</span>
          <p className="text-[10px] text-white/40">Membros</p>
        </div>
        <div className="p-3.5 rounded-xl text-center bg-[#252547] border border-violet-500/10">
          <span className={cn('text-xl font-bold', pctEntrega >= 80 ? 'text-emerald-400' : pctEntrega >= 50 ? 'text-amber-400' : 'text-red-400')}>{pctEntrega}%</span>
          <p className="text-[10px] text-white/40">Entregas</p>
        </div>
      </div>

      {/* Por turma */}
      <div>
        <div className="flex items-center gap-2 mb-3 px-1">
          <div className="w-1 h-3.5 rounded-full bg-blue-500" />
          <p className="text-[10px] font-semibold text-blue-400/80 uppercase tracking-widest">Por turma</p>
        </div>
        <div className="space-y-1.5">
          {turmaStat.map(([key, stat]) => {
            const pct = stat.total > 0 ? Math.round((stat.entregaram / stat.total) * 100) : 0;
            return (
              <div key={key} className="flex items-center gap-3 p-2.5 rounded-lg bg-[#252547] border border-violet-500/10">
                <span className="text-xs font-bold text-white w-12">{stat.serie}º {stat.turma}</span>
                <div className="flex-1">
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className={cn('h-full rounded-full', pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500')} style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <span className="text-xs text-white/50 w-12 text-right">{stat.entregaram}/{stat.total}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sem entrega (expandivel com avatares clicaveis) */}
      {entregasData && entregasData.naoEntregaram.length > 0 && (
        <div>
          <button onClick={() => setExpandirSemEntrega(!expandirSemEntrega)}
            className="flex items-center gap-2 mb-3 px-1 w-full text-left">
            <div className="w-1 h-3.5 rounded-full bg-red-500" />
            <p className="text-[10px] font-semibold text-red-400/80 uppercase tracking-widest flex-1">Sem entrega ({entregasData.naoEntregaram.length})</p>
            {expandirSemEntrega ? <ChevronUp className="w-3.5 h-3.5 text-white/30" /> : <ChevronDown className="w-3.5 h-3.5 text-white/30" />}
          </button>
          {expandirSemEntrega && (
            <div className="rounded-xl bg-[#252547] border border-violet-500/10 p-3">
              <div className="flex flex-wrap gap-2">
                {entregasData.naoEntregaram.map(a => (
                  <AvatarPequeno key={a.id} aluno={a} onClick={() => iniciarDM(a.id)} />
                ))}
              </div>
              <p className="text-[9px] text-white/20 text-center mt-2">Toque para enviar mensagem</p>
            </div>
          )}
        </div>
      )}

      {/* Top 5 */}
      {top5.some(m => (m.total_pontos || 0) > 0) && (
        <div>
          <div className="flex items-center gap-2 mb-3 px-1">
            <div className="w-1 h-3.5 rounded-full bg-yellow-500" />
            <p className="text-[10px] font-semibold text-yellow-400/80 uppercase tracking-widest">Destaques</p>
          </div>
          <div className="rounded-xl bg-[#252547] border border-violet-500/10 overflow-hidden">
            {top5.filter(m => (m.total_pontos || 0) > 0).map((m, idx) => (
              <div key={m.aluno_id} className={cn('flex items-center gap-3 py-2.5 px-3.5', idx > 0 && 'border-t border-violet-500/5')}>
                <span className="text-sm text-white/40 w-5 text-center">{idx + 1}</span>
                <span className="text-sm text-white/80 flex-1 truncate">{m.aluno_nome}</span>
                <span className="text-sm text-emerald-400 font-medium">{m.total_pontos} pts</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Coordenadores (para líderes) ou Meus Alunos (para coordenadores) */}
      {isLider && coordenadores.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3 px-1">
            <div className="w-1 h-3.5 rounded-full bg-amber-500" />
            <p className="text-[10px] font-semibold text-amber-400/80 uppercase tracking-widest">Coordenadores</p>
          </div>
          <div className="rounded-xl bg-[#252547] border border-violet-500/10 overflow-hidden">
            {coordenadores.map((c: any, idx) => {
              const prof = c.profiles as any;
              const serie = prof?.serie?.replace(/\D/g, '') || '?';
              const turmaCoord = prof?.turma || '?';
              const tData = turmaStat.find(([k, s]) => s.serie === serie && s.turma === turmaCoord);
              return (
                <button key={c.aluno_id}
                  onClick={() => iniciarDM(c.aluno_id)}
                  className={cn('w-full flex items-center gap-3 py-2.5 px-3.5 hover:bg-white/[0.04] transition-colors text-left', idx > 0 && 'border-t border-violet-500/5')}>
                  <div className="w-8 h-8 rounded-full overflow-hidden border-2 shrink-0" style={{ borderColor: casaColor }}>
                    {prof?.avatar_url ? <img src={prof.avatar_url} alt="" className="w-full h-full object-cover" /> :
                    <span className="flex items-center justify-center w-full h-full text-[10px] text-white/50" style={{ backgroundColor: `${casaColor}20` }}>
                      {(prof?.nome || '?').charAt(0).toUpperCase()}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/70 truncate">{prof?.full_name || 'Coordenador'}</p>
                    <p className="text-[10px] text-white/30">{prof?.serie} {prof?.turma} {tData ? `— ${tData[1].entregaram}/${tData[1].total} entregas` : ''}</p>
                  </div>
                  <MessageCircle className="w-4 h-4 text-white/20" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {isCoordenador && membros.filter(m => m.id !== profile?.id).length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3 px-1">
            <div className="w-1 h-3.5 rounded-full bg-amber-500" />
            <p className="text-[10px] font-semibold text-amber-400/80 uppercase tracking-widest">Meus Alunos</p>
          </div>
          <div className="rounded-xl bg-[#252547] border border-violet-500/10 overflow-hidden">
            {membros.filter(m => m.id !== profile?.id).map((m, idx) => (
              <button key={m.id}
                onClick={() => iniciarDM(m.id)}
                className={cn('w-full flex items-center gap-3 py-2.5 px-3.5 hover:bg-white/[0.04] transition-colors text-left', idx > 0 && 'border-t border-violet-500/5')}>
                <div className="w-8 h-8 rounded-full overflow-hidden border-2 shrink-0" style={{ borderColor: casaColor }}>
                  {m.avatar_url ? <img src={m.avatar_url} alt="" className="w-full h-full object-cover" /> :
                  <span className="flex items-center justify-center w-full h-full text-[10px] text-white/50" style={{ backgroundColor: `${casaColor}20` }}>
                    {(m.nome || '?').charAt(0).toUpperCase()}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/70 truncate">{m.full_name || 'Aluno'}</p>
                  <p className="text-[10px] text-white/30">{m.serie} {m.turma}</p>
                </div>
                <MessageCircle className="w-4 h-4 text-white/20" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Fase */}
      {faseAtual && (
        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center">
          <p className="text-xs text-white/30">
            Fase {faseAtual.numero_fase} — {faseAtual.inteligencia?.nome} · Semana {faseAtual.semana_atual || 1} de 4
          </p>
        </div>
      )}
    </div>
  );
};

// === Reportar ao Mentor ===
// Seção para o líder ver reportes dos coordenadores
const ReportesCoordSection = ({ institutionId, casaId, casaColor }: {
  institutionId?: string;
  casaId?: number;
  casaColor: string;
}) => {
  const { data: reportes = [] } = useQuery({
    queryKey: ['reportes-coord', institutionId, casaId],
    queryFn: async () => {
      if (!institutionId || !casaId) return [];
      const { data } = await supabase
        .from('reportes_mentor' as any)
        .select('*, aluno:profiles!reportes_mentor_aluno_id_fkey(nome, full_name, serie, turma, avatar_url)')
        .eq('institution_id', institutionId)
        .eq('casa_id', casaId)
        .eq('tipo', 'para_lider')
        .eq('status', 'aberto')
        .order('created_at', { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!institutionId && !!casaId,
    staleTime: 30000,
  });

  if (reportes.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className="w-1 h-3.5 rounded-full bg-orange-500" />
        <p className="text-[10px] font-semibold text-orange-400/80 uppercase tracking-widest">Relatos dos Coordenadores</p>
        <span className="text-[10px] text-orange-400 font-medium ml-1">{reportes.length}</span>
      </div>
      <div className="space-y-2">
        {reportes.map((r: any) => {
          const aluno = r.aluno as any;
          const nome = aluno?.full_name?.split(/\s+/).slice(0, 2).join(' ') || 'Coordenador';
          const hora = new Date(r.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          const dia = new Date(r.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
          return (
            <div key={r.id} className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-6 h-6 rounded-full overflow-hidden bg-white/10 shrink-0">
                  {aluno?.avatar_url ? <img src={aluno.avatar_url} alt="" className="w-full h-full object-cover" /> :
                  <span className="flex items-center justify-center w-full h-full text-[9px] text-white/50">{(aluno?.nome || '?').charAt(0).toUpperCase()}</span>}
                </div>
                <span className="text-xs text-white/70 font-medium">{nome}</span>
                <span className="text-[9px] text-white/25">{aluno?.serie} {aluno?.turma}</span>
                <span className="text-[9px] text-white/20 ml-auto">{dia} {hora}</span>
              </div>
              <p className="text-xs text-white/60 leading-relaxed">{r.texto}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ReportarMentor = ({ userId, institutionId, casaId, casaColor, cargo }: {
  userId?: string;
  institutionId?: string;
  casaId?: number;
  casaColor: string;
  cargo?: string | null;
}) => {
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [salvando, setSalvando] = useState(false);

  // Coordenador → relata ao líder | Líder → relata ao mentor
  const isCoordenador = cargo === 'coordenador';
  const destinatario = isCoordenador ? 'lider' : 'mentor';
  const destinatarioLabel = isCoordenador ? 'lider' : 'mentor';
  const tipo = isCoordenador ? 'para_lider' : 'para_mentor';

  const enviar = async () => {
    if (!userId || !institutionId || !texto.trim() || salvando) return;
    setSalvando(true);
    await supabase.from('reportes_mentor' as any).insert({
      aluno_id: userId,
      institution_id: institutionId,
      casa_id: casaId || null,
      texto: texto.trim(),
      tipo,
    });
    setTexto('');
    setEnviado(true);
    setSalvando(false);
    setTimeout(() => { setEnviado(false); setAberto(false); }, 2500);
  };

  return (
    <div>
      {!aberto ? (
        <button
          onClick={() => setAberto(true)}
          className="w-full p-3.5 rounded-2xl border text-left transition-all hover:bg-white/[0.03] active:scale-[0.98]"
          style={{ borderColor: `${casaColor}15`, background: `linear-gradient(135deg, ${casaColor}05, #252547)` }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl" style={{ backgroundColor: `${casaColor}15` }}>
              <MessageCircle className="w-4 h-4" style={{ color: casaColor }} />
            </div>
            <div>
              <p className="text-sm text-white/60">Precisa falar com seu {destinatarioLabel}?</p>
              <p className="text-[10px] text-white/25 mt-0.5">
                {isCoordenador
                  ? 'Reporte algo ao lider da sua casa. Ele vai receber e pode te responder.'
                  : 'Reporte algo que aconteceu, uma duvida ou algo que precisa de ajuda. Seu mentor vai receber e pode te responder.'}
              </p>
            </div>
          </div>
        </button>
      ) : (
        <div className="rounded-2xl border p-4" style={{ borderColor: `${casaColor}20`, background: `linear-gradient(135deg, ${casaColor}08, #252547)` }}>
          <p className="text-sm text-white/60 mb-1">Fale com seu {destinatarioLabel}</p>
          <p className="text-[10px] text-white/25 mb-2">
            {isCoordenador
              ? 'Conte o que aconteceu ou algo que o lider precisa saber.'
              : 'Conte o que aconteceu, peça ajuda ou tire uma duvida. Ele vai receber e responder para voce.'}
          </p>
          <textarea
            value={texto}
            onChange={e => setTexto(e.target.value)}
            placeholder={isCoordenador
              ? 'Ex: Aconteceu algo na turma... / Preciso informar que...'
              : 'Ex: Aconteceu algo na aula... / Tenho uma duvida sobre... / Preciso de ajuda com...'}
            maxLength={500}
            rows={3}
            autoFocus
            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white placeholder:text-white/20 resize-none focus:outline-none focus:border-white/20 transition-colors"
          />
          <div className="flex items-center justify-between mt-2">
            <button onClick={() => setAberto(false)} className="text-[10px] text-white/30 hover:text-white/50">Cancelar</button>
            {enviado ? (
              <span className="text-xs text-green-400">Enviado ao {destinatarioLabel}!</span>
            ) : (
              <button
                onClick={enviar}
                disabled={!texto.trim() || salvando}
                className="px-4 py-1.5 rounded-full text-xs font-medium transition-all disabled:opacity-30"
                style={{ backgroundColor: `${casaColor}30`, color: casaColor }}
              >
                {salvando ? 'Enviando...' : 'Enviar'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardLiderPage;
