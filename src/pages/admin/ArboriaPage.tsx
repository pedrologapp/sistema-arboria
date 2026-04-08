import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, TrendingUp, BookOpen, Sparkles, ChevronRight, Star, Target, Eye, Heart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { CasaBrasao } from '@/components/CasaBrasao';
import { cn } from '@/lib/utils';

const ArboriaPage = () => {
  const navigate = useNavigate();
  const [busca, setBusca] = useState('');
  const [emojiAberto, setEmojiAberto] = useState<string | null>(null);

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

  // Últimos check-ins emocionais (últimos 24h)
  const { data: checkinsRecentes = [] } = useQuery({
    queryKey: ['arboria-checkins-recentes'],
    queryFn: async () => {
      const ontem = new Date();
      ontem.setDate(ontem.getDate() - 1);
      const { data } = await supabase
        .from('checkin_emocional')
        .select('aluno_id, emoji, label, data')
        .gte('data', ontem.toISOString().split('T')[0])
        .order('created_at', { ascending: false })
        .limit(30);
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

  const getCasa = (casaId: number | null) => casas.find(c => c.id === casaId);

  const alunosFiltrados = busca.trim()
    ? alunos.filter(a =>
        (a.full_name || '').toLowerCase().includes(busca.toLowerCase()) ||
        (a.serie || '').toLowerCase().includes(busca.toLowerCase()) ||
        (a.turma || '').toLowerCase().includes(busca.toLowerCase())
      )
    : [];

  // Resumo emocional
  const emojiContagem = checkinsRecentes.reduce((acc, c) => {
    acc[c.emoji] = (acc[c.emoji] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

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
                        'flex flex-col items-center gap-1 px-2 py-1 rounded-xl transition-all',
                        emojiAberto === emoji ? 'bg-white/10 scale-110' : 'hover:bg-white/5'
                      )}
                    >
                      <span className="text-[10px] text-white/40">{count}</span>
                      <span className="text-2xl">{emoji}</span>
                    </button>
                  ))}
              </div>
              <p className="text-[10px] text-white/25 text-center mt-2">{checkinsRecentes.length} check-ins nas ultimas 24h</p>

              {/* Detalhes: quem colocou esse emoji */}
              {emojiAberto && (
                <div className="mt-3 pt-3 border-t border-white/5 space-y-1.5">
                  <p className="text-[10px] text-white/30 mb-2">Quem se sentiu {emojiAberto}:</p>
                  {checkinsRecentes
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
                          {casaInfo && <span className="text-[9px]" style={{ color: casaInfo.cor_hex }}>{casaInfo.nome}</span>}
                        </button>
                      );
                    })}
                </div>
              )}
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

          {/* Call to action */}
          <div className="rounded-2xl border border-amber-500/15 bg-amber-500/5 p-4 text-center">
            <p className="text-sm text-white/70">Busque um aluno para ver seu <span className="font-semibold text-amber-300">Registro Vivo</span></p>
            <p className="text-[10px] text-white/30 mt-1">Missoes, observacoes, emocoes, relatos — a historia completa</p>
          </div>
        </>
      )}
    </div>
  );
};

export default ArboriaPage;
