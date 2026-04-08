import { useEffect, useState, useCallback } from 'react';
import { Trophy, Users, RefreshCw, ChevronRight, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useStudent } from '@/contexts/StudentContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { CasaBrasao } from '@/components/CasaBrasao';
import { Progress } from '@/components/ui/progress';

interface MembroComCargo {
  aluno_id: string;
  aluno_nome: string;
  avatar_url: string | null;
  total_pontos: number;
  posicao_na_casa: number;
  cargo: 'lider' | 'coordenador' | 'embaixador' | 'membro';
  serie: string | null;
}

const descricoesPadrao: Record<string, string> = {
  'linguistica': 'Nos somos a voz que ecoa. Transformamos ideias em palavras que movem pessoas, contam historias e mudam perspectivas. Onde outros veem silencio, nos criamos significado.',
  'logico-matematica': 'Nos enxergamos a ordem por tras do caos. Padroes, conexoes e solucoes que ninguem mais percebe — esse e o nosso territorio. Pensamos com precisao e agimos com estrategia.',
  'espacial': 'Nos vemos o que ainda nao existe. Formas, espacos e possibilidades ganham vida na nossa mente antes de existirem no mundo. Onde outros veem o obvio, nos imaginamos o extraordinario.',
  'musical': 'Nos sentimos o mundo em frequencias. Ritmo, harmonia e melodia nao sao apenas sons — sao a forma como processamos a realidade. Ouvimos o que os outros nao percebem.',
  'corporal-cinestesica': 'Nos pensamos em movimento. O corpo nao apenas executa — ele descobre, cria e resolve. Onde outros param para planejar, nos ja estamos em acao encontrando o caminho.',
  'naturalista': 'Nos lemos o mundo como um sistema vivo. Classificamos, conectamos e entendemos o que une todas as coisas. Onde outros veem desordem, nos encontramos padroes da natureza.',
  'interpessoal': 'Nos entendemos as pessoas antes mesmo das palavras. Emocoes, intencoes e dinamicas de grupo sao a nossa linguagem natural. Conectamos, lideramos e construimos junto.',
  'intrapessoal': 'Nos conhecemos a forca que existe dentro de cada um. Autoconhecimento, reflexao e clareza interior sao o nosso poder. Sabemos quem somos — e isso muda tudo.',
};

const cargoLabels: Record<string, string> = {
  lider: 'Lider',
  coordenador: 'Coordenador',
  embaixador: 'Embaixador',
};

const CasaPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { casa, casaColor, profile, ranking, isLoading: contextLoading, refreshData } = useStudent();
  const [membros, setMembros] = useState<MembroComCargo[]>([]);
  const [pontosTotaisCasa, setPontosTotaisCasa] = useState(0);
  const [posicaoCasa, setPosicaoCasa] = useState(0);
  const [totalCasas, setTotalCasas] = useState(8);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!casa?.id || !profile?.institution_id) {
      setIsLoading(false);
      return;
    }

    try {
      const [rankingCasaRes, rankingTodasRes, membrosRes, cargosRes] = await Promise.all([
        supabase
          .from('ranking_casas')
          .select('total_pontos, posicao')
          .eq('casa_id', casa.id)
          .eq('institution_id', profile.institution_id)
          .maybeSingle(),
        supabase
          .from('ranking_casas')
          .select('casa_id')
          .eq('institution_id', profile.institution_id),
        supabase
          .from('ranking_alunos_por_casa')
          .select('aluno_id, aluno_nome, total_pontos, posicao_na_casa')
          .eq('casa_id', casa.id)
          .eq('institution_id', profile.institution_id)
          .order('posicao_na_casa', { ascending: true })
          .limit(50),
        supabase
          .from('cargos_casa')
          .select('aluno_id, cargo')
          .eq('casa_id', casa.id)
          .eq('institution_id', profile.institution_id)
          .eq('ano_letivo', new Date().getFullYear())
          .eq('ativo', true),
      ]);

      if (membrosRes.error) throw membrosRes.error;

      setPontosTotaisCasa(rankingCasaRes.data?.total_pontos || 0);
      setPosicaoCasa(rankingCasaRes.data?.posicao || 0);
      setTotalCasas(rankingTodasRes.data?.length || 8);

      // Buscar avatars e serie
      const alunoIds = membrosRes.data?.map(m => m.aluno_id).filter(Boolean) || [];
      let profilesMap: Record<string, { avatar_url: string | null; serie: string | null }> = {};

      if (alunoIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, avatar_url, serie')
          .in('id', alunoIds);

        profilesMap = Object.fromEntries(
          profilesData?.map(a => [a.id, { avatar_url: a.avatar_url, serie: a.serie }]) || []
        );
      }

      const cargosMap = Object.fromEntries(
        cargosRes.data?.map(c => [c.aluno_id, c.cargo]) || []
      );

      const membrosComCargo: MembroComCargo[] = (membrosRes.data || []).map(m => ({
        aluno_id: m.aluno_id || '',
        aluno_nome: m.aluno_nome || 'Sem nome',
        avatar_url: profilesMap[m.aluno_id || '']?.avatar_url || null,
        serie: profilesMap[m.aluno_id || '']?.serie || null,
        total_pontos: Number(m.total_pontos) || 0,
        posicao_na_casa: Number(m.posicao_na_casa) || 0,
        cargo: (cargosMap[m.aluno_id || ''] as MembroComCargo['cargo']) || 'membro'
      }));

      setMembros(membrosComCargo);
    } catch (err) {
      console.error('Error fetching casa data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [casa?.id, profile?.institution_id]);

  useEffect(() => {
    if (!contextLoading) fetchData();
  }, [contextLoading, fetchData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchData(), refreshData()]);
    setIsRefreshing(false);
  };

  if (contextLoading || isLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="h-40 bg-white/5 rounded-2xl animate-pulse" />
        <div className="h-20 bg-white/5 rounded-xl animate-pulse" />
        <div className="h-48 bg-white/5 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!casa) {
    return (
      <div className="p-4">
        <div className="p-6 rounded-2xl text-center bg-white/[0.03] border border-white/[0.06]">
          <p className="text-white/60">Voce ainda nao foi atribuido a uma casa.</p>
        </div>
      </div>
    );
  }

  const codigoNormalizado = casa.codigo?.toLowerCase().replace(/_/g, '-') || '';
  const descricao = casa.descricao || descricoesPadrao[codigoNormalizado] || '';

  const getSerieNum = (serie: string | null) => {
    if (!serie) return 0;
    const match = serie.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  };

  const sortBySerie = (a: MembroComCargo, b: MembroComCargo) => {
    const diff = getSerieNum(b.serie) - getSerieNum(a.serie);
    if (diff !== 0) return diff;
    return (a.aluno_nome || '').localeCompare(b.aluno_nome || '', 'pt-BR');
  };

  const lider = membros.find(m => m.cargo === 'lider');
  const coordenadores = membros.filter(m => m.cargo === 'coordenador').sort(sortBySerie);
  const totalMembros = membros.length;

  // Top 5 por pontos
  const top5 = [...membros].sort((a, b) => b.total_pontos - a.total_pontos).slice(0, 5);
  const minhaPosicao = [...membros].sort((a, b) => b.total_pontos - a.total_pontos).findIndex(m => m.aluno_id === user?.id) + 1;
  const meusDados = membros.find(m => m.aluno_id === user?.id);
  const meuspontos = meusDados?.total_pontos || 0;
  const contribuicao = pontosTotaisCasa > 0 ? Math.round((meuspontos / pontosTotaisCasa) * 100) : 0;

  return (
    <div className="p-4 space-y-5 pb-24">
      {/* Header com refresh */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-white">Minha Casa</h1>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors text-white/40 hover:text-white disabled:opacity-50"
        >
          <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
        </button>
      </div>

      {/* Card principal: Brasao + Nome + Descricao (unico com cor da casa) */}
      <div
        className="relative overflow-hidden p-5 rounded-2xl bg-[#252547] backdrop-blur-xl border border-violet-500/10"
        style={{ boxShadow: `0 16px 32px -8px ${casaColor}25` }}
      >
        <div
          className="absolute -top-10 -right-10 w-36 h-36 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ backgroundColor: casaColor }}
        />
        <div className="relative z-10 flex items-center gap-4">
          <CasaBrasao
            brasaoUrl={casa.brasao_url}
            emoji={casa.emoji}
            nome={casa.nome}
            size="large"
            className="w-16 h-16"
          />
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold" style={{ color: casaColor }}>
              Casa {casa.nome}
            </h2>
            {descricao && (
              <p className="text-white/40 text-xs mt-1 leading-relaxed line-clamp-2">
                {descricao}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Stats: Posicao da casa + Pontos da casa */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-xl text-center bg-[#252547] border border-violet-500/10">
          <span className="text-2xl font-bold text-white">{posicaoCasa || '--'}</span>
          <span className="text-white/40 text-sm">a</span>
          <span className="text-white/40 text-sm ml-0.5">de {totalCasas}</span>
          <p className="text-xs text-white/40 mt-1">Posicao geral</p>
        </div>
        <div className="p-4 rounded-xl text-center bg-[#252547] border border-violet-500/10">
          <div className="flex items-center justify-center gap-1.5">
            <Trophy className="w-4 h-4 text-yellow-500" />
            <span className="text-2xl font-bold text-white">{pontosTotaisCasa.toLocaleString('pt-BR')}</span>
          </div>
          <p className="text-xs text-white/40 mt-1">Pontos da casa</p>
        </div>
      </div>

      {/* Sua contribuicao */}
      <div className="p-4 rounded-xl bg-[#252547] border border-violet-500/10">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-white/60">Sua contribuicao</span>
          <span className="text-sm text-white font-medium">{meuspontos} pts ({contribuicao}%)</span>
        </div>
        <Progress value={contribuicao} className="h-2 bg-white/10" />
        {minhaPosicao > 0 && (
          <p className="text-xs text-white/30 mt-2">
            Voce esta em {minhaPosicao}º lugar entre {totalMembros} membros
          </p>
        )}
      </div>

      {/* Destaques da fase (top 5) */}
      {top5.length > 0 && top5.some(m => m.total_pontos > 0) && (
        <div>
          <h3 className="text-xs font-medium text-white/40 uppercase tracking-widest mb-3">
            Destaques
          </h3>
          <div className="rounded-xl overflow-hidden bg-[#252547] border border-violet-500/10">
            {top5.filter(m => m.total_pontos > 0).map((membro, idx) => {
              const isMe = membro.aluno_id === user?.id;
              return (
                <div
                  key={membro.aluno_id}
                  className={cn(
                    'flex items-center justify-between py-2.5 px-3',
                    isMe && 'bg-white/5',
                    idx > 0 && 'border-t border-violet-500/5'
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-5 text-center text-sm text-white/40">{idx + 1}</span>
                    <div className="w-6 h-6 rounded-full bg-white/10 overflow-hidden shrink-0">
                      {membro.avatar_url ? (
                        <img src={membro.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="flex items-center justify-center w-full h-full text-xs text-white/60">
                          {membro.aluno_nome.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <span className={cn('text-sm truncate', isMe ? 'text-white font-medium' : 'text-white/80')}>
                      {membro.aluno_nome}
                      {isMe && <span className="text-white/30 ml-1">(voce)</span>}
                    </span>
                  </div>
                  <span className="text-sm text-green-400 shrink-0">{membro.total_pontos} pts</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Lideranca */}
      <div>
        <h3 className="text-xs font-medium text-white/40 uppercase tracking-widest mb-3">
          Lideranca
        </h3>
        <div className="rounded-xl overflow-hidden bg-[#252547] border border-violet-500/10">
          {lider && (
            <div className="flex items-center justify-between py-2.5 px-3">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 rounded-full bg-white/10 overflow-hidden shrink-0">
                  {lider.avatar_url ? (
                    <img src={lider.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="flex items-center justify-center w-full h-full text-xs text-white/60">
                      {lider.aluno_nome.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <span className="text-sm text-white truncate">{lider.aluno_nome}</span>
                {lider.serie && <span className="text-white/25 text-xs">{lider.serie.replace(' Ano', '')}</span>}
              </div>
              <span className="text-xs text-amber-400/80 font-medium">Lider</span>
            </div>
          )}
          {!lider && (
            <div className="py-2.5 px-3 text-sm text-white/30">Nenhum lider eleito</div>
          )}
          {coordenadores.length > 0 && (
            <>
              <div className="border-t border-violet-500/5" />
              {coordenadores.slice(0, 4).map(coord => (
                <div key={coord.aluno_id} className="flex items-center justify-between py-2 px-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-5 h-5 rounded-full bg-white/10 overflow-hidden shrink-0">
                      {coord.avatar_url ? (
                        <img src={coord.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="flex items-center justify-center w-full h-full text-[10px] text-white/60">
                          {coord.aluno_nome.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-white/70 truncate">{coord.aluno_nome}</span>
                    {coord.serie && <span className="text-white/20 text-[10px]">{coord.serie.replace(' Ano', '')}</span>}
                  </div>
                  <span className="text-[10px] text-white/30">Coord.</span>
                </div>
              ))}
              {coordenadores.length > 4 && (
                <div className="py-2 px-3 text-xs text-white/25 text-center">
                  +{coordenadores.length - 4} coordenadores
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Conquistas */}
      <button
        onClick={() => navigate('/aluno/conquistas')}
        className="w-full flex items-center justify-between p-4 rounded-xl
          bg-[#252547] border border-violet-500/10
          hover:bg-white/[0.06] transition-colors active:scale-[0.98]"
      >
        <div className="flex items-center gap-3">
          <Trophy className="w-5 h-5 text-amber-400" />
          <span className="text-sm text-white/70">Conquistas da Casa</span>
        </div>
        <ChevronRight className="w-4 h-4 text-white/30" />
      </button>

      {/* Ver todos os membros */}
      <button
        onClick={() => navigate('/aluno/chat/membros')}
        className="w-full flex items-center justify-between p-4 rounded-xl
          bg-[#252547] border border-violet-500/10
          hover:bg-white/[0.06] transition-colors active:scale-[0.98]"
      >
        <div className="flex items-center gap-3">
          <Users className="w-5 h-5 text-white/40" />
          <span className="text-sm text-white/70">Ver todos os {totalMembros} membros</span>
        </div>
        <ChevronRight className="w-4 h-4 text-white/30" />
      </button>
    </div>
  );
};

// Componente removido - conquistas agora em pagina propria
function _ConquistasSection_UNUSED({ pontosCasa, institutionId }: { pontosCasa: number; institutionId: string | null | undefined }) {
  const { data: conquistas = [] } = useQuery({
    queryKey: ['conquistas', institutionId],
    queryFn: async () => {
      if (!institutionId) return [];
      const { data } = await supabase.from('conquistas')
        .select('*').eq('institution_id', institutionId).eq('ativo', true).order('ordem');
      return data || [];
    },
    enabled: !!institutionId,
    staleTime: 300000,
  });

  if (conquistas.length === 0) return null;

  // Proxima conquista a desbloquear
  const proximaConquista = conquistas.find(c => pontosCasa < c.pontos_necessarios);
  const ultimaDesbloqueada = [...conquistas].reverse().find(c => pontosCasa >= c.pontos_necessarios);

  return (
    <div>
      <h3 className="text-xs font-medium text-white/40 uppercase tracking-widest mb-3">Conquistas</h3>

      {/* Proxima meta (destaque) */}
      {proximaConquista && (
        <div className="mb-3 p-4 rounded-xl border" style={{ backgroundColor: `${proximaConquista.cor}10`, borderColor: `${proximaConquista.cor}30` }}>
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-sm font-medium text-white">{proximaConquista.nome}</p>
              <p className="text-[10px] text-white/40">{proximaConquista.descricao}</p>
            </div>
            <span className="text-lg font-bold" style={{ color: proximaConquista.cor }}>
              {Math.round((pontosCasa / proximaConquista.pontos_necessarios) * 100)}%
            </span>
          </div>
          <div className="h-3 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{ width: `${Math.min((pontosCasa / proximaConquista.pontos_necessarios) * 100, 100)}%`, backgroundColor: proximaConquista.cor }}
            />
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-[10px] text-white/30">{pontosCasa.toLocaleString('pt-BR')} pts</span>
            <span className="text-[10px] text-white/30">Meta: {proximaConquista.pontos_necessarios.toLocaleString('pt-BR')} pts</span>
          </div>
          <p className="text-[10px] text-white/20 text-center mt-1">
            Faltam {(proximaConquista.pontos_necessarios - pontosCasa).toLocaleString('pt-BR')} pontos
          </p>
        </div>
      )}

      {/* Todas as conquistas */}
      <div className="space-y-1.5">
        {conquistas.map(c => {
          const desbloqueada = pontosCasa >= c.pontos_necessarios;
          const pct = Math.min(Math.round((pontosCasa / c.pontos_necessarios) * 100), 100);

          return (
            <div key={c.id} className={cn(
              'flex items-center gap-3 py-2.5 px-3 rounded-lg border transition-all',
              desbloqueada ? 'border-white/15 bg-white/[0.06]' : 'border-violet-500/5 bg-white/[0.02]'
            )}>
              {/* Icone */}
              <div className={cn('w-8 h-8 rounded-full flex items-center justify-center shrink-0', desbloqueada ? '' : 'opacity-30')}
                style={{ backgroundColor: desbloqueada ? `${c.cor}25` : 'rgba(255,255,255,0.05)' }}>
                {desbloqueada ? (
                  <Trophy className="w-4 h-4" style={{ color: c.cor }} />
                ) : (
                  <Lock className="w-3.5 h-3.5 text-white/30" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className={cn('text-xs font-medium', desbloqueada ? 'text-white' : 'text-white/40')}>{c.nome}</p>
                {!desbloqueada && (
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden max-w-[80px]">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: c.cor }} />
                    </div>
                    <span className="text-[9px] text-white/25">{pct}%</span>
                  </div>
                )}
              </div>

              {/* Status */}
              {desbloqueada ? (
                <span className="text-[9px] font-medium" style={{ color: c.cor }}>Desbloqueada</span>
              ) : (
                <span className="text-[9px] text-white/20">{c.pontos_necessarios.toLocaleString('pt-BR')} pts</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default CasaPage;
