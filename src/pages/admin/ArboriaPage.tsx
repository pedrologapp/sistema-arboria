import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, TrendingUp, BookOpen, Sparkles, ChevronRight, Star, Target, Eye, Heart, Flame, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { CasaBrasao } from '@/components/CasaBrasao';
import { cn } from '@/lib/utils';
import { hojeBrasil, agoraBrasil } from '@/utils/timezone';

const ArboriaPage = () => {
  const navigate = useNavigate();
  const [busca, setBusca] = useState('');
  const [emojiAberto, setEmojiAberto] = useState<string | null>(null);
  const [historicoAberto, setHistoricoAberto] = useState<string | null>(null);

  // Buscar todos os alunos
  const { data: alunos = [], isLoading: loadingAlunos } = useQuery({
    queryKey: ['arboria-alunos'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, nome, sobrenome, full_name, serie, turma, casa_id, avatar_url, institution_id')
        .not('casa_id', 'is', null)
        .order('full_name');
      return data || [];
    },
  });

  // Buscar casas
  const { data: casas = [] } = useQuery({
    queryKey: ['arboria-casas'],
    queryFn: async () => {
      const { data } = await supabase
        .from('inteligencias')
        .select('id, nome, cor_hex, emoji, brasao_url')
        .order('id');
      return data || [];
    },
  });

  // Destaques: alunos com mais pontos
  const { data: ranking = [] } = useQuery({
    queryKey: ['arboria-ranking'],
    queryFn: async () => {
      const { data } = await supabase
        .from('ranking_alunos_por_casa')
        .select('aluno_id, aluno_nome, casa_id, casa_nome, casa_emoji, total_pontos, missoes_completadas, posicao_na_casa')
        .order('total_pontos', { ascending: false })
        .limit(10);
      return data || [];
    },
  });

  const hojeData = hojeBrasil();

  // Check-ins de hoje
  const { data: checkinsHoje = [] } = useQuery({
    queryKey: ['arboria-checkins-hoje', hojeData],
    queryFn: async () => {
      const { data } = await supabase
        .from('checkin_emocional')
        .select('aluno_id, emoji, label, data, created_at')
        .eq('data', hojeData)
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  // Histórico (últimos 5 dias, excluindo hoje)
  const { data: checkinsHistorico = [] } = useQuery({
    queryKey: ['arboria-checkins-historico', hojeData],
    queryFn: async () => {
      const cincoDiasAtras = agoraBrasil();
      cincoDiasAtras.setDate(cincoDiasAtras.getDate() - 5);
      const seteDiasAtrasStr = cincoDiasAtras.toLocaleDateString('en-CA');
      const { data } = await supabase
        .from('checkin_emocional')
        .select('aluno_id, emoji, label, data, created_at')
        .lt('data', hojeData)
        .gte('data', seteDiasAtrasStr)
        .order('created_at', { ascending: false })
        .limit(50);
      return data || [];
    },
  });

  // Últimos relatos
  const { data: relatosRecentes = [] } = useQuery({
    queryKey: ['arboria-relatos-recentes'],
    queryFn: async () => {
      const { data } = await supabase
        .from('relatos_alunos')
        .select('id, aluno_id, texto, created_at')
        .order('created_at', { ascending: false })
        .limit(5);
      return data || [];
    },
  });

  // Status das observações por turma (quais professores já fizeram)
  const { data: statusObservacoes = [] } = useQuery({
    queryKey: ['arboria-status-observacoes'],
    queryFn: async () => {
      const { data } = await supabase
        .from('observacao_semanal')
        .select('serie, turma, semana, status, professor_id, enviada_em')
        .order('serie')
        .order('turma');
      return data || [];
    },
  });

  // Observações com comentários (recentes)
  const [filtroObsSerie, setFiltroObsSerie] = useState<string | null>(null);
  const [filtroObsEstado, setFiltroObsEstado] = useState<string | null>(null);
  const { data: observacoesRecentes = [] } = useQuery({
    queryKey: ['arboria-observacoes-recentes'],
    queryFn: async () => {
      const { data } = await supabase
        .from('observacao_aluno')
        .select(`
          id, aluno_id, estado, observacao_texto, created_at,
          observacao_semanal:observacao_semanal_id (
            serie, turma, semana, professor_id
          )
        `)
        .not('observacao_texto', 'is', null)
        .neq('observacao_texto', '')
        .order('created_at', { ascending: false })
        .limit(50);
      return data || [];
    },
  });

  // Desafios diários — respostas de hoje e recentes
  const [filtroDesafioSerie, setFiltroDesafioSerie] = useState<string | null>(null);
  const { data: desafiosHoje = [] } = useQuery({
    queryKey: ['arboria-desafios-hoje', hojeData],
    queryFn: async () => {
      const { data } = await supabase
        .from('desafio_diario_respostas')
        .select('id, aluno_id, desafio_casa_codigo, desafio_tipo, habilidades, texto, data, created_at')
        .eq('data', hojeData)
        .order('created_at', { ascending: false })
        .limit(50);
      return data || [];
    },
  });

  const { data: desafiosRecentes = [] } = useQuery({
    queryKey: ['arboria-desafios-recentes'],
    queryFn: async () => {
      const seteDiasAtras = agoraBrasil();
      seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);
      const { data } = await supabase
        .from('desafio_diario_respostas')
        .select('id, aluno_id, desafio_casa_codigo, desafio_tipo, habilidades, texto, data, created_at')
        .gte('data', seteDiasAtras.toLocaleDateString('en-CA'))
        .order('created_at', { ascending: false })
        .limit(100);
      return data || [];
    },
  });

  const getCasa = (casaId: number | null) => casas.find(c => c.id === casaId);

  const alunosFiltrados = busca.trim()
    ? alunos.filter(a =>
        (a.full_name || '').toLowerCase().includes(busca.toLowerCase()) ||
        (a.serie || '').toLowerCase().includes(busca.toLowerCase()) ||
        (a.turma || '').toLowerCase().includes(busca.toLowerCase())
      )
    : [];

  // Resumo emocional (só hoje)
  const emojiContagem = checkinsHoje.reduce((acc, c) => {
    acc[c.emoji] = (acc[c.emoji] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Mapa emoji → label
  const emojiLabel = checkinsHoje.reduce((acc, c) => {
    if (c.emoji && c.label && !acc[c.emoji]) acc[c.emoji] = c.label;
    return acc;
  }, {} as Record<string, string>);

  // Histórico agrupado por dia (com checkins completos)
  const historicoAgrupado = checkinsHistorico.reduce((acc, c) => {
    const dia = c.data || '';
    if (!acc[dia]) acc[dia] = { contagem: {} as Record<string, number>, checkins: [] as typeof checkinsHistorico };
    acc[dia].contagem[c.emoji] = (acc[dia].contagem[c.emoji] || 0) + 1;
    acc[dia].checkins.push(c);
    return acc;
  }, {} as Record<string, { contagem: Record<string, number>; checkins: typeof checkinsHistorico }>);

  const getAlunoNome = (alunoId: string) => {
    const a = alunos.find(al => al.id === alunoId);
    return a?.nome || 'Aluno';
  };

  return (
    <div className="p-4 space-y-5 pb-24">
      {/* Header */}
      <div className="pt-2">
        <h1 className="text-xl font-bold text-white tracking-tight">O Arboria</h1>
        <p className="text-xs text-white/40 mt-1">O registro vivo de cada aluno</p>
      </div>

      {/* Busca de aluno */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <input
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar aluno pelo nome, serie ou turma..."
          className="w-full bg-[#252547] border border-violet-500/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-white/25 outline-none focus:border-white/20 transition-colors"
        />
      </div>

      {/* Resultados da busca */}
      {busca.trim() && (
        <div className="space-y-1.5">
          {alunosFiltrados.length === 0 && (
            <p className="text-sm text-white/30 text-center py-4">Nenhum aluno encontrado</p>
          )}
          {alunosFiltrados.slice(0, 10).map(aluno => {
            const casa = getCasa(aluno.casa_id);
            return (
              <button
                key={aluno.id}
                onClick={() => navigate(`/admin/arboria/aluno/${aluno.id}`)}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-[#252547] border border-violet-500/10 hover:bg-white/[0.06] transition-colors text-left"
              >
                <div className="w-9 h-9 rounded-full overflow-hidden border-2 shrink-0" style={{ borderColor: casa?.cor_hex || '#444' }}>
                  {aluno.avatar_url ? (
                    <img src={aluno.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="flex items-center justify-center w-full h-full text-sm text-white/40" style={{ backgroundColor: `${casa?.cor_hex || '#444'}20` }}>
                      {(aluno.nome || '?').charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{aluno.full_name}</p>
                  <p className="text-[10px] text-white/40">{aluno.serie} - Turma {aluno.turma}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  {casa && <span className="text-[10px]" style={{ color: casa.cor_hex }}>{casa.nome}</span>}
                  <BookOpen className="w-4 h-4 text-white/20" />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Conteúdo principal (quando não está buscando) */}
      {!busca.trim() && (
        <>
          {/* Pulso emocional */}
          {Object.keys(emojiContagem).length > 0 && (
            <div className="rounded-2xl border border-violet-500/10 bg-[#252547] p-4">
              <div className="flex items-center gap-2 mb-3">
                <Heart className="w-4 h-4 text-pink-400" />
                <p className="text-sm font-medium text-white">Pulso Emocional de Hoje</p>
              </div>
              <div className="flex items-end gap-3 justify-center">
                {Object.entries(emojiContagem)
                  .sort(([, a], [, b]) => b - a)
                  .map(([emoji, count]) => (
                    <button
                      key={emoji}
                      onClick={() => setEmojiAberto(emojiAberto === emoji ? null : emoji)}
                      className={cn(
                        'flex flex-col items-center gap-1 px-2 py-1.5 rounded-xl transition-all min-w-[52px]',
                        emojiAberto === emoji ? 'bg-white/10 scale-110' : 'hover:bg-white/5'
                      )}
                    >
                      <span className="text-[10px] text-white/40">{count}</span>
                      <span className="text-2xl">{emoji}</span>
                      {emojiLabel[emoji] && (
                        <span className="text-[9px] text-white/30 leading-tight text-center">{emojiLabel[emoji]}</span>
                      )}
                    </button>
                  ))}
              </div>
              <p className="text-[10px] text-white/25 text-center mt-2">
                {new Set(checkinsHoje.map(c => c.aluno_id)).size}/{alunos.length} alunos registraram hoje
              </p>

              {/* Detalhes: quem colocou esse emoji */}
              {emojiAberto && (
                <div className="mt-3 pt-3 border-t border-white/5 space-y-1.5">
                  <p className="text-[10px] text-white/30 mb-2">Quem se sentiu {emojiAberto} hoje:</p>
                  {checkinsHoje
                    .filter(c => c.emoji === emojiAberto)
                    .map((c, i) => {
                      const alunoInfo = alunos.find(a => a.id === c.aluno_id);
                      const casaInfo = alunoInfo ? getCasa(alunoInfo.casa_id) : null;
                      return (
                        <button
                          key={i}
                          onClick={() => navigate(`/admin/arboria/aluno/${c.aluno_id}`)}
                          className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-white/[0.04] transition-colors text-left"
                        >
                          <div className="w-7 h-7 rounded-full overflow-hidden border shrink-0" style={{ borderColor: casaInfo?.cor_hex || '#444' }}>
                            {alunoInfo?.avatar_url ? (
                              <img src={alunoInfo.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="flex items-center justify-center w-full h-full text-[10px] text-white/40" style={{ backgroundColor: `${casaInfo?.cor_hex || '#444'}20` }}>
                                {(alunoInfo?.nome || '?').charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-white truncate">{alunoInfo?.full_name || 'Aluno'}</p>
                            <p className="text-[9px] text-white/25">{alunoInfo?.serie} - Turma {alunoInfo?.turma}</p>
                          </div>
                          <div className="flex flex-col items-end shrink-0">
                            {c.created_at && (
                              <span className="text-[9px] text-white/30 font-mono">
                                {new Date(c.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                            {casaInfo && <span className="text-[9px]" style={{ color: casaInfo.cor_hex }}>{casaInfo.nome}</span>}
                          </div>
                        </button>
                      );
                    })}
                </div>
              )}
            </div>
          )}

          {/* Histórico emocional (últimos 7 dias) */}
          {Object.keys(historicoAgrupado).length > 0 && (
            <div className="rounded-2xl border border-violet-500/10 bg-[#252547] p-4">
              <div className="flex items-center gap-2 mb-3">
                <Heart className="w-4 h-4 text-white/30" />
                <p className="text-sm font-medium text-white/60">Historico Emocional</p>
                <span className="text-[10px] text-white/25">últimos 5 dias</span>
              </div>
              <div className="space-y-1">
                {Object.entries(historicoAgrupado)
                  .sort(([a], [b]) => b.localeCompare(a))
                  .map(([dia, { contagem, checkins }]) => {
                    const dataFormatada = new Date(dia + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
                    const totalDia = Object.values(contagem).reduce((s, n) => s + n, 0);
                    const isOpen = historicoAberto === dia;
                    return (
                      <div key={dia}>
                        <button
                          onClick={() => setHistoricoAberto(isOpen ? null : dia)}
                          className="w-full flex items-center gap-3 py-2 px-1 rounded-lg hover:bg-white/[0.04] transition-colors"
                        >
                          <span className="text-[10px] text-white/30 w-20 shrink-0 text-left">{dataFormatada}</span>
                          <div className="flex items-center gap-1.5 flex-1">
                            {Object.entries(contagem)
                              .sort(([, a], [, b]) => b - a)
                              .map(([emoji, count]) => (
                                <span key={emoji} className="text-sm">
                                  {emoji}<span className="text-[9px] text-white/30 ml-0.5">{count}</span>
                                </span>
                              ))}
                          </div>
                          <span className="text-[9px] text-white/20">{totalDia}</span>
                        </button>
                        {isOpen && (
                          <div className="ml-2 mb-2 pl-3 border-l border-white/5 space-y-1">
                            {checkins.map((c, i) => {
                              const alunoInfo = alunos.find(a => a.id === c.aluno_id);
                              const casaInfo = alunoInfo ? getCasa(alunoInfo.casa_id) : null;
                              return (
                                <button
                                  key={i}
                                  onClick={() => navigate(`/admin/arboria/aluno/${c.aluno_id}`)}
                                  className="w-full flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-white/[0.04] transition-colors text-left"
                                >
                                  <span className="text-base">{c.emoji}</span>
                                  <div className="w-6 h-6 rounded-full overflow-hidden border shrink-0" style={{ borderColor: casaInfo?.cor_hex || '#444' }}>
                                    {alunoInfo?.avatar_url ? (
                                      <img src={alunoInfo.avatar_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                      <span className="flex items-center justify-center w-full h-full text-[9px] text-white/40" style={{ backgroundColor: `${casaInfo?.cor_hex || '#444'}20` }}>
                                        {(alunoInfo?.nome || '?').charAt(0).toUpperCase()}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[11px] text-white/70 truncate">{alunoInfo?.full_name || 'Aluno'}</p>
                                  </div>
                                  {c.created_at && (
                                    <span className="text-[9px] text-white/25 font-mono shrink-0">
                                      {new Date(c.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Destaques */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-amber-400" />
              <p className="text-sm font-medium text-white">Destaques</p>
            </div>
            <div className="space-y-2">
              {ranking.slice(0, 5).map((r, i) => {
                const casa = getCasa(r.casa_id);
                return (
                  <button
                    key={r.aluno_id}
                    onClick={() => navigate(`/admin/arboria/aluno/${r.aluno_id}`)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-[#252547] border border-violet-500/10 hover:bg-white/[0.06] transition-colors text-left"
                  >
                    <span className={cn(
                      'w-6 h-6 flex items-center justify-center rounded-full text-[10px] font-bold',
                      i === 0 && 'bg-yellow-500/20 text-yellow-400',
                      i === 1 && 'bg-gray-400/20 text-gray-300',
                      i === 2 && 'bg-amber-700/20 text-amber-600',
                      i > 2 && 'bg-white/5 text-white/30',
                    )}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{r.aluno_nome}</p>
                      <p className="text-[10px]" style={{ color: casa?.cor_hex || '#666' }}>{r.casa_nome}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-yellow-500" fill="currentColor" />
                          <span className="text-sm font-bold text-white">{r.total_pontos}</span>
                        </div>
                        <span className="text-[9px] text-white/30">{r.missoes_completadas} missoes</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-white/15" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Últimos relatos */}
          {relatosRecentes.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Eye className="w-4 h-4 text-blue-400" />
                <p className="text-sm font-medium text-white">Ultimos Relatos</p>
              </div>
              <div className="space-y-2">
                {relatosRecentes.map(r => (
                  <button
                    key={r.id}
                    onClick={() => navigate(`/admin/arboria/aluno/${r.aluno_id}`)}
                    className="w-full p-3 rounded-xl bg-[#252547] border border-violet-500/10 hover:bg-white/[0.06] transition-colors text-left"
                  >
                    <p className="text-[10px] text-white/40 mb-1">{getAlunoNome(r.aluno_id)} — {new Date(r.created_at).toLocaleDateString('pt-BR')}</p>
                    <p className="text-sm text-white/70 line-clamp-2">"{r.texto}"</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ═══ STATUS DAS OBSERVAÇÕES POR TURMA ═══ */}
          {statusObservacoes.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <div className="w-1 h-3.5 rounded-full bg-emerald-500" />
                <p className="text-[10px] font-semibold text-emerald-400/80 uppercase tracking-widest">Observações por Turma</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {(() => {
                  // Agrupar por série+turma
                  const turmas: Record<string, { serie: string; turma: string; status: string; semana: number }> = {};
                  statusObservacoes.forEach((o: any) => {
                    const key = `${o.serie}-${o.turma}`;
                    if (!turmas[key] || o.status === 'enviada') {
                      turmas[key] = { serie: o.serie, turma: o.turma, status: o.status, semana: o.semana };
                    }
                  });

                  return Object.values(turmas).sort((a, b) => `${a.serie}${a.turma}`.localeCompare(`${b.serie}${b.turma}`)).map(t => (
                    <div key={`${t.serie}-${t.turma}`}
                      className={cn('p-3 rounded-xl border text-center',
                        t.status === 'enviada' ? 'bg-green-500/10 border-green-500/20' :
                        t.status === 'rascunho' ? 'bg-amber-500/10 border-amber-500/20' :
                        'bg-white/5 border-violet-500/10'
                      )}>
                      <p className="text-sm font-bold text-white">{t.serie}° {t.turma}</p>
                      <p className={cn('text-[10px] mt-0.5',
                        t.status === 'enviada' ? 'text-green-400' :
                        t.status === 'rascunho' ? 'text-amber-400' : 'text-white/30'
                      )}>
                        {t.status === 'enviada' ? 'Observação enviada' : t.status === 'rascunho' ? 'Rascunho' : 'Pendente'}
                      </p>
                      <p className="text-[9px] text-white/20 mt-0.5">Semana {t.semana}</p>
                    </div>
                  ));
                })()}
              </div>
            </div>
          )}

          {/* ═══ OBSERVAÇÕES DO PROFESSOR ═══ */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <div className="w-1 h-3.5 rounded-full bg-violet-500" />
              <p className="text-[10px] font-semibold text-violet-400/80 uppercase tracking-widest">Observações do Professor</p>
              <span className="text-[10px] text-white/20 ml-auto">{observacoesRecentes.length} com comentário</span>
            </div>

            {/* Filtros */}
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              <button onClick={() => setFiltroObsEstado(null)}
                className={cn('px-3 py-1.5 rounded-lg text-[10px] font-medium transition-colors shrink-0',
                  !filtroObsEstado ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30' : 'bg-white/[0.04] text-white/40')}>
                Todos
              </button>
              {[
                { key: 'surpreendeu', label: 'Foi além', cor: 'emerald' },
                { key: 'dificuldades', label: 'Dificuldades', cor: 'amber' },
                { key: 'nao_conseguiu', label: 'Não conseguiu', cor: 'red' },
                { key: 'fez', label: 'Fez', cor: 'blue' },
              ].map(e => (
                <button key={e.key} onClick={() => setFiltroObsEstado(filtroObsEstado === e.key ? null : e.key)}
                  className={cn(`px-3 py-1.5 rounded-lg text-[10px] font-medium transition-colors shrink-0`,
                    filtroObsEstado === e.key ? `bg-${e.cor}-500/20 text-${e.cor}-300 border border-${e.cor}-500/30` : 'bg-white/[0.04] text-white/40')}>
                  {e.label}
                </button>
              ))}
            </div>

            {/* Lista com scroll */}
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
              {(() => {
                const ESTADO_CONFIG: Record<string, { label: string; cor: string }> = {
                  surpreendeu: { label: 'Foi além', cor: '#22C55E' },
                  fez: { label: 'Fez', cor: '#3B82F6' },
                  dificuldades: { label: 'Dificuldades', cor: '#F59E0B' },
                  nao_conseguiu: { label: 'Não conseguiu', cor: '#EF4444' },
                  faltou: { label: 'Faltou', cor: '#6B7280' },
                };

                const filtradas = observacoesRecentes.filter((o: any) => {
                  if (filtroObsEstado && o.estado !== filtroObsEstado) return false;
                  if (filtroObsSerie) {
                    const obs = o.observacao_semanal as any;
                    if (obs?.serie !== filtroObsSerie) return false;
                  }
                  return true;
                });

                if (filtradas.length === 0) {
                  return (
                    <div className="p-4 rounded-xl bg-[#252547] border border-violet-500/10 text-center">
                      <p className="text-white/20 text-sm">Nenhuma observação com comentário</p>
                    </div>
                  );
                }

                return filtradas.slice(0, 10).map((o: any) => {
                  const aluno = alunos.find(a => a.id === o.aluno_id);
                  const obs = o.observacao_semanal as any;
                  const config = ESTADO_CONFIG[o.estado] || ESTADO_CONFIG.fez;

                  return (
                    <div key={o.id} className="p-3 rounded-xl bg-[#252547] border border-violet-500/10">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[9px] text-white/60 font-bold">
                          {(aluno?.nome || '?')[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] text-white/70 truncate">{aluno?.full_name || aluno?.nome || 'Aluno'}</p>
                          <p className="text-[9px] text-white/25">{obs?.serie}° {obs?.turma} · Sem. {obs?.semana}</p>
                        </div>
                        <span className="text-[8px] font-bold uppercase px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: `${config.cor}20`, color: config.cor }}>
                          {config.label}
                        </span>
                      </div>
                      <p className="text-xs text-white/55 leading-relaxed">"{o.observacao_texto}"</p>
                    </div>
                  );
                });
              })()}
            </div>
          </div>

          {/* ═══ DESAFIOS DIÁRIOS ═══ */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <div className="w-1 h-3.5 rounded-full bg-orange-500" />
              <p className="text-[10px] font-semibold text-orange-400/80 uppercase tracking-widest">Desafios Diários</p>
              <span className="text-[10px] text-white/20 ml-auto">
                {desafiosHoje.length} respostas hoje
              </span>
            </div>

            {/* Stats rápidos */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 rounded-xl text-center bg-[#252547] border border-violet-500/10">
                <span className="text-xl font-bold text-white">{desafiosHoje.length}</span>
                <p className="text-[9px] text-white/30 mt-0.5">Hoje</p>
              </div>
              <div className="p-3 rounded-xl text-center bg-[#252547] border border-violet-500/10">
                <span className="text-xl font-bold text-white">{desafiosRecentes.length}</span>
                <p className="text-[9px] text-white/30 mt-0.5">7 dias</p>
              </div>
              <div className="p-3 rounded-xl text-center bg-[#252547] border border-violet-500/10">
                <span className="text-xl font-bold text-white">
                  {new Set(desafiosRecentes.map((d: any) => d.aluno_id)).size}
                </span>
                <p className="text-[9px] text-white/30 mt-0.5">Alunos ativos</p>
              </div>
            </div>

            {/* Filtro por série */}
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              <button
                onClick={() => setFiltroDesafioSerie(null)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-[10px] font-medium transition-colors shrink-0',
                  !filtroDesafioSerie ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' : 'bg-white/[0.04] text-white/40'
                )}
              >
                Todas
              </button>
              {['6', '7', '8', '9'].map(s => (
                <button
                  key={s}
                  onClick={() => setFiltroDesafioSerie(filtroDesafioSerie === s ? null : s)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-[10px] font-medium transition-colors shrink-0',
                    filtroDesafioSerie === s ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' : 'bg-white/[0.04] text-white/40'
                  )}
                >
                  {s}° ano
                </button>
              ))}
            </div>

            {/* Respostas recentes */}
            <div className="space-y-2">
              {(() => {
                const respostasFiltradas = desafiosHoje.filter((d: any) => {
                  if (!filtroDesafioSerie) return true;
                  const aluno = alunos.find(a => a.id === d.aluno_id);
                  return aluno?.serie === filtroDesafioSerie;
                });

                if (respostasFiltradas.length === 0) {
                  return (
                    <div className="p-4 rounded-xl bg-[#252547] border border-violet-500/10 text-center">
                      <p className="text-white/20 text-sm">Nenhuma resposta hoje{filtroDesafioSerie ? ` no ${filtroDesafioSerie}° ano` : ''}</p>
                    </div>
                  );
                }

                const TIPO_LABELS: Record<string, string> = {
                  observacao: 'Observação', acao: 'Ação', reflexao: 'Reflexão', escuta: 'Escuta', registro: 'Registro'
                };
                const TIPO_CORES: Record<string, string> = {
                  observacao: '#3B82F6', acao: '#22C55E', reflexao: '#8B5CF6', escuta: '#F59E0B', registro: '#F97316'
                };

                return respostasFiltradas.slice(0, 10).map((d: any) => {
                  const aluno = alunos.find(a => a.id === d.aluno_id);
                  const corTipo = TIPO_CORES[d.desafio_tipo] || '#888';
                  return (
                    <div key={d.id} className="p-3 rounded-xl bg-[#252547] border border-violet-500/10">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[9px] text-white/60 font-bold">
                          {(aluno?.nome || '?')[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] text-white/70 truncate">{aluno?.full_name || aluno?.nome || 'Aluno'}</p>
                          <p className="text-[9px] text-white/25">{aluno?.serie}° {aluno?.turma}</p>
                        </div>
                        <span
                          className="text-[8px] font-bold uppercase px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: `${corTipo}20`, color: corTipo }}
                        >
                          {TIPO_LABELS[d.desafio_tipo] || d.desafio_tipo}
                        </span>
                      </div>
                      <p className="text-xs text-white/55 leading-relaxed line-clamp-3">"{d.texto}"</p>
                      {d.habilidades && d.habilidades.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {d.habilidades.map((h: string, i: number) => (
                            <span key={i} className="text-[8px] px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-300/60">
                              {h.replace(/_/g, ' ')}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          </div>

          {/* Call to action */}
          <div className="rounded-2xl border border-amber-500/15 bg-amber-500/5 p-4 text-center">
            <p className="text-sm text-white/70">Busque um aluno para ver seu <span className="font-semibold text-amber-300">Registro Vivo</span></p>
            <p className="text-[10px] text-white/30 mt-1">Missões, observações, emoções, relatos — a história completa</p>
          </div>
        </>
      )}
    </div>
  );
};

export default ArboriaPage;
