import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  Trophy,
  Users,
  MessageCircle,
  RefreshCw,
  Crown,
  Star,
  ChevronRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useProfessor } from '@/contexts/ProfessorContext';
import { infantilTheme as t } from '@/styles/infantilTheme';
import { corDaCasa } from '@/config/f2Reforma';
import { getIniciais } from '@/lib/infantil';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Aba SUA CASA (Fundamental 2, reforma, atrás do flag F2_REFORMA_ATIVA).
 *
 * O painel da Casa que o professor MENTORA, no shell claro do F2 (infantilTheme)
 * com o acento na cor da Casa (corDaCasa). Reaproveita a mesma lógica de dados da
 * CasaPage do aluno (src/pages/aluno/CasaPage.tsx): usa casaMentor.id como casa_id
 * nas MESMAS tabelas (ranking_casas, ranking_alunos_por_casa, cargos_casa,
 * profiles). Diferença de papel: o mentor não é membro, é quem gere a Casa, então
 * o texto de identidade é neutro ("a Casa que você mentora") e não há "sua
 * contribuição".
 *
 * O chat da Casa reaproveita o chat do professor que já existe (rota
 * /professor/chat, ProfessorChatPage, que também opera sobre casaMentor.id): aqui
 * entramos por um cartão que leva a ele, sem reconstruir a infra de canais/DMs.
 *
 * Só é montada quando segmento === 'fundamental2' E F2_REFORMA_ATIVA (o roteamento
 * vive no CasaPageWrapper). Infantil/F1/aluno não são afetados.
 */

type Cargo = 'lider' | 'coordenador' | 'embaixador' | 'membro';

interface Membro {
  alunoId: string;
  nome: string;
  avatarUrl: string | null;
  serie: string | null;
  pontos: number;
  cargo: Cargo;
}

const cargoLabel: Record<Exclude<Cargo, 'membro'>, string> = {
  lider: 'Líder',
  coordenador: 'Coordenador',
  embaixador: 'Embaixador',
};

const serieCurta = (serie: string | null) => (serie ? serie.replace(' Ano', '') : '');

const F2CasaPage = () => {
  const navigate = useNavigate();
  const { casaMentor, profile, isLoading: contextLoading } = useProfessor();
  const cor = corDaCasa(casaMentor?.id);

  const [membros, setMembros] = useState<Membro[]>([]);
  const [pontosCasa, setPontosCasa] = useState(0);
  const [posicaoCasa, setPosicaoCasa] = useState(0);
  const [totalCasas, setTotalCasas] = useState(8);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rankingIndisponivel, setRankingIndisponivel] = useState(false);
  const [membrosIndisponiveis, setMembrosIndisponiveis] = useState(false);
  const [expandirMembros, setExpandirMembros] = useState(false);

  const fetchData = useCallback(async () => {
    if (!casaMentor?.id || !profile?.institution_id) {
      setLoading(false);
      return;
    }
    const casaId = casaMentor.id;
    const institutionId = profile.institution_id;
    const anoLetivo = new Date().getFullYear();

    const [rankingCasaRes, todasCasasRes, rankingAlunosRes, cargosRes, profilesRes] =
      await Promise.allSettled([
        supabase
          .from('ranking_casas')
          .select('total_pontos, posicao')
          .eq('casa_id', casaId)
          .eq('institution_id', institutionId)
          .maybeSingle(),
        supabase.from('ranking_casas').select('casa_id').eq('institution_id', institutionId),
        supabase
          .from('ranking_alunos_por_casa')
          .select('aluno_id, aluno_nome, total_pontos, posicao_na_casa')
          .eq('casa_id', casaId)
          .eq('institution_id', institutionId)
          .order('posicao_na_casa', { ascending: true })
          .limit(300),
        supabase
          .from('cargos_casa')
          .select('aluno_id, cargo')
          .eq('casa_id', casaId)
          .eq('institution_id', institutionId)
          .eq('ano_letivo', anoLetivo)
          .eq('ativo', true),
        // Fonte comprovadamente legível pelo mentor (mesma leitura do chat do
        // professor): garante avatar/série/nome e serve de fallback se a view de
        // ranking de alunos estiver bloqueada por RLS.
        supabase
          .from('profiles')
          .select('id, full_name, nome, sobrenome, avatar_url, serie')
          .eq('casa_id', casaId)
          .eq('institution_id', institutionId),
      ]);

    // Pontos e posição da Casa
    const rankingOk =
      rankingCasaRes.status === 'fulfilled' && !rankingCasaRes.value.error;
    if (rankingOk) {
      setPontosCasa(rankingCasaRes.value.data?.total_pontos || 0);
      setPosicaoCasa(rankingCasaRes.value.data?.posicao || 0);
      setRankingIndisponivel(false);
    } else {
      setRankingIndisponivel(true);
    }

    if (todasCasasRes.status === 'fulfilled' && todasCasasRes.value.data?.length) {
      setTotalCasas(todasCasasRes.value.data.length);
    }

    // Perfis por casa: avatar/série/nome + fallback de lista
    const perfis =
      profilesRes.status === 'fulfilled' && !profilesRes.value.error
        ? profilesRes.value.data || []
        : [];
    const perfilPorId = new Map(
      perfis.map((p) => [
        p.id,
        {
          nome:
            p.full_name ||
            [p.nome, p.sobrenome].filter(Boolean).join(' ') ||
            'Sem nome',
          avatarUrl: p.avatar_url as string | null,
          serie: p.serie as string | null,
        },
      ]),
    );

    // Cargos ativos
    const cargoPorId = new Map<string, Cargo>();
    if (cargosRes.status === 'fulfilled' && !cargosRes.value.error) {
      for (const c of cargosRes.value.data || []) {
        if (c.aluno_id) cargoPorId.set(c.aluno_id, (c.cargo as Cargo) || 'membro');
      }
    }

    // Lista de membros: preferimos a view de ranking (traz pontos); se indisponível
    // por RLS, caímos para os perfis da casa (sem pontos), preservando a tela.
    const rankingAlunos =
      rankingAlunosRes.status === 'fulfilled' && !rankingAlunosRes.value.error
        ? rankingAlunosRes.value.data || []
        : null;

    let lista: Membro[];
    if (rankingAlunos && rankingAlunos.length > 0) {
      setMembrosIndisponiveis(false);
      lista = rankingAlunos.map((m) => {
        const id = m.aluno_id || '';
        const perfil = perfilPorId.get(id);
        return {
          alunoId: id,
          nome: perfil?.nome || m.aluno_nome || 'Sem nome',
          avatarUrl: perfil?.avatarUrl || null,
          serie: perfil?.serie || null,
          pontos: Number(m.total_pontos) || 0,
          cargo: cargoPorId.get(id) || 'membro',
        };
      });
    } else if (perfis.length > 0) {
      // Fallback: mostra os membros mesmo sem os pontos do ranking.
      setMembrosIndisponiveis(rankingAlunos === null);
      lista = perfis.map((p) => ({
        alunoId: p.id,
        nome: perfilPorId.get(p.id)?.nome || 'Sem nome',
        avatarUrl: (p.avatar_url as string | null) || null,
        serie: (p.serie as string | null) || null,
        pontos: 0,
        cargo: cargoPorId.get(p.id) || 'membro',
      }));
    } else {
      setMembrosIndisponiveis(rankingAlunos === null);
      lista = [];
    }

    setMembros(lista);
    setLoading(false);
  }, [casaMentor?.id, profile?.institution_id]);

  useEffect(() => {
    if (!contextLoading) fetchData();
  }, [contextLoading, fetchData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  if (contextLoading || loading) {
    return (
      <div className="pt-5 space-y-4">
        <Skeleton className="h-8 w-40 rounded" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
        </div>
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  if (!casaMentor) {
    return (
      <div className="pt-10 text-center space-y-3">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mx-auto"
          style={{ backgroundColor: t.accentSoft }}
        >
          <Shield size={26} style={{ color: t.accent }} strokeWidth={1.5} />
        </div>
        <p className="text-sm max-w-xs mx-auto" style={{ color: t.textMuted }}>
          Você ainda não está vinculado como mentor de uma Casa.
        </p>
      </div>
    );
  }

  const porPontos = [...membros].sort((a, b) => b.pontos - a.pontos);
  const destaques = porPontos.filter((m) => m.pontos > 0).slice(0, 5);
  const lider = membros.find((m) => m.cargo === 'lider');
  const coordenadores = membros.filter((m) => m.cargo === 'coordenador');
  const embaixadores = membros.filter((m) => m.cargo === 'embaixador');
  const temLideranca = !!lider || coordenadores.length > 0 || embaixadores.length > 0;
  const totalMembros = membros.length;

  // Escudo da Casa: brasão real se houver, senão escudo na cor da Casa.
  const Escudo = ({ size }: { size: number }) =>
    casaMentor.brasao_url ? (
      <img
        src={casaMentor.brasao_url}
        alt=""
        className="object-contain flex-shrink-0 rounded-2xl"
        style={{ width: size, height: size }}
      />
    ) : (
      <span
        className="rounded-2xl flex items-center justify-center flex-shrink-0"
        style={{ width: size, height: size, backgroundColor: `${cor}1A` }}
      >
        <Shield size={size * 0.5} style={{ color: cor }} strokeWidth={1.75} />
      </span>
    );

  const AvatarMembro = ({ membro, size }: { membro: Membro; size: number }) => (
    <Avatar style={{ width: size, height: size }} className="flex-shrink-0">
      <AvatarImage src={membro.avatarUrl || undefined} className="object-cover" />
      <AvatarFallback
        className="font-semibold"
        style={{ backgroundColor: t.accentSoft, color: t.accentText, fontSize: size * 0.34 }}
      >
        {getIniciais(membro.nome)}
      </AvatarFallback>
    </Avatar>
  );

  return (
    <div className="pt-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p
            className="text-[11px] uppercase tracking-wide font-semibold"
            style={{ color: t.textFaint }}
          >
            Sua Casa
          </p>
          <h1 className="text-2xl font-bold mt-0.5" style={{ color: t.text }}>
            Casa {casaMentor.nome}
          </h1>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2 rounded-full transition-colors active:scale-95 disabled:opacity-50"
          style={{ backgroundColor: t.surface, border: `1px solid ${t.border}` }}
          aria-label="Atualizar"
        >
          <RefreshCw
            size={16}
            style={{ color: t.textMuted }}
            className={refreshing ? 'animate-spin' : ''}
          />
        </button>
      </div>

      {/* Identidade da Casa */}
      <div
        className="rounded-2xl p-5 flex flex-col items-center text-center gap-3 relative overflow-hidden"
        style={{ backgroundColor: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadowMd }}
      >
        <div
          className="absolute -top-10 -right-10 w-40 h-40 rounded-full pointer-events-none"
          style={{ backgroundColor: cor, opacity: 0.08 }}
        />
        <div className="relative z-10 flex flex-col items-center gap-3">
          <Escudo size={88} />
          <h2 className="text-xl font-bold" style={{ color: cor }}>
            Casa {casaMentor.nome}
          </h2>
          <p className="text-sm leading-relaxed max-w-xs" style={{ color: t.textMuted }}>
            {casaMentor.descricao || 'A Casa que você mentora.'}
          </p>
        </div>
      </div>

      {/* Pontos + posição da Casa */}
      <div className="grid grid-cols-2 gap-3">
        <div
          className="rounded-2xl p-4 text-center"
          style={{ backgroundColor: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadowSm }}
        >
          {rankingIndisponivel ? (
            <span className="text-lg font-medium" style={{ color: t.textFaint }}>
              -
            </span>
          ) : posicaoCasa ? (
            <div>
              <span className="text-2xl font-bold tabular-nums" style={{ color: t.text }}>
                {posicaoCasa}
              </span>
              <span className="text-sm ml-1" style={{ color: t.textFaint }}>
                / {totalCasas}
              </span>
            </div>
          ) : (
            <span className="text-lg font-medium" style={{ color: t.textFaint }}>
              Calculando
            </span>
          )}
          <p className="text-xs mt-1" style={{ color: t.textFaint }}>
            Posição geral
          </p>
        </div>
        <div
          className="rounded-2xl p-4 text-center"
          style={{ backgroundColor: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadowSm }}
        >
          <div className="flex items-center justify-center gap-1.5">
            <Trophy size={16} style={{ color: cor }} />
            <span className="text-2xl font-bold tabular-nums" style={{ color: t.text }}>
              {rankingIndisponivel ? '-' : pontosCasa.toLocaleString('pt-BR')}
            </span>
          </div>
          <p className="text-xs mt-1" style={{ color: t.textFaint }}>
            Pontos da Casa
          </p>
        </div>
      </div>

      {rankingIndisponivel && (
        <p className="text-xs px-1" style={{ color: t.textFaint }}>
          A pontuação da Casa não está disponível para o seu perfil no momento.
        </p>
      )}

      {/* Chat da Casa (reaproveita o chat do professor existente) */}
      <button
        onClick={() => navigate('/professor/chat')}
        className="w-full rounded-2xl p-4 flex items-center gap-3 text-left transition-transform active:scale-[0.99]"
        style={{ backgroundColor: t.accentSoft, border: `1px solid ${t.accentBorder}` }}
      >
        <span
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: t.surface }}
        >
          <MessageCircle size={20} style={{ color: cor }} strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold" style={{ color: t.accentText }}>
            Chat da Casa
          </p>
          <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>
            Canais e conversas com a sua Casa
          </p>
        </div>
        <ChevronRight size={18} style={{ color: t.textFaint }} className="flex-shrink-0" />
      </button>

      {/* Destaques (ranking dos alunos por pontos) */}
      {destaques.length > 0 && (
        <section>
          <p
            className="text-[11px] uppercase tracking-wide font-semibold mb-2 px-1"
            style={{ color: t.textFaint }}
          >
            Destaques da Casa
          </p>
          <div
            className="rounded-2xl overflow-hidden"
            style={{ backgroundColor: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadowSm }}
          >
            {destaques.map((m, idx) => (
              <div
                key={m.alunoId}
                className="flex items-center gap-3 py-2.5 px-3"
                style={idx > 0 ? { borderTop: `1px solid ${t.border}` } : undefined}
              >
                <span
                  className="w-5 text-center text-sm font-semibold tabular-nums"
                  style={{ color: idx === 0 ? cor : t.textFaint }}
                >
                  {idx + 1}
                </span>
                <AvatarMembro membro={m} size={28} />
                <span className="flex-1 text-sm truncate" style={{ color: t.text }}>
                  {m.nome}
                </span>
                <span className="text-sm font-semibold tabular-nums" style={{ color: t.presenteText }}>
                  {m.pontos} pts
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Liderança */}
      {temLideranca && (
        <section>
          <p
            className="text-[11px] uppercase tracking-wide font-semibold mb-2 px-1"
            style={{ color: t.textFaint }}
          >
            Liderança
          </p>
          <div
            className="rounded-2xl overflow-hidden"
            style={{ backgroundColor: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadowSm }}
          >
            {lider && (
              <div className="flex items-center gap-3 py-2.5 px-3">
                <AvatarMembro membro={lider} size={32} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm truncate" style={{ color: t.text }}>
                    {lider.nome}
                  </p>
                  {lider.serie && (
                    <p className="text-[11px]" style={{ color: t.textFaint }}>
                      {serieCurta(lider.serie)}
                    </p>
                  )}
                </div>
                <span
                  className="flex items-center gap-1 text-xs font-semibold flex-shrink-0"
                  style={{ color: cor }}
                >
                  <Crown size={13} />
                  {cargoLabel.lider}
                </span>
              </div>
            )}
            {[...coordenadores, ...embaixadores].map((m, idx) => (
              <div
                key={m.alunoId}
                className="flex items-center gap-3 py-2 px-3"
                style={{ borderTop: lider || idx > 0 ? `1px solid ${t.border}` : undefined }}
              >
                <AvatarMembro membro={m} size={26} />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] truncate" style={{ color: t.text }}>
                    {m.nome}
                  </p>
                  {m.serie && (
                    <p className="text-[10px]" style={{ color: t.textFaint }}>
                      {serieCurta(m.serie)}
                    </p>
                  )}
                </div>
                <span
                  className="flex items-center gap-1 text-[11px] font-medium flex-shrink-0"
                  style={{ color: t.textMuted }}
                >
                  <Star size={12} style={{ color: cor }} />
                  {cargoLabel[m.cargo as 'coordenador' | 'embaixador']}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Membros */}
      <section className="space-y-2">
        <button
          onClick={() => setExpandirMembros((v) => !v)}
          className="w-full rounded-2xl p-4 flex items-center gap-3 transition-transform active:scale-[0.99]"
          style={{ backgroundColor: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadowSm }}
          aria-expanded={expandirMembros}
        >
          <Users size={20} style={{ color: t.textMuted }} strokeWidth={1.75} />
          <span className="flex-1 text-left text-sm" style={{ color: t.text }}>
            {totalMembros > 0
              ? `Ver os ${totalMembros} ${totalMembros === 1 ? 'membro' : 'membros'} da Casa`
              : 'Membros da Casa'}
          </span>
          {expandirMembros ? (
            <ChevronUp size={18} style={{ color: t.textFaint }} />
          ) : (
            <ChevronDown size={18} style={{ color: t.textFaint }} />
          )}
        </button>

        {expandirMembros &&
          (totalMembros === 0 ? (
            <div
              className="rounded-2xl p-6 text-center"
              style={{ backgroundColor: t.surface, border: `1px solid ${t.border}` }}
            >
              <p className="text-sm" style={{ color: t.textMuted }}>
                {membrosIndisponiveis
                  ? 'Os membros da Casa não estão disponíveis para o seu perfil no momento.'
                  : 'Ainda não há alunos nesta Casa.'}
              </p>
            </div>
          ) : (
            <div
              className="rounded-2xl overflow-hidden"
              style={{ backgroundColor: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadowSm }}
            >
              {porPontos.map((m, idx) => (
                <div
                  key={m.alunoId}
                  className="flex items-center gap-3 py-2.5 px-3"
                  style={idx > 0 ? { borderTop: `1px solid ${t.border}` } : undefined}
                >
                  <span
                    className="w-5 text-center text-xs tabular-nums"
                    style={{ color: t.textFaint }}
                  >
                    {idx + 1}
                  </span>
                  <AvatarMembro membro={m} size={28} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm truncate" style={{ color: t.text }}>
                      {m.nome}
                    </p>
                    {m.serie && (
                      <p className="text-[10px]" style={{ color: t.textFaint }}>
                        {m.serie}
                      </p>
                    )}
                  </div>
                  {m.pontos > 0 && (
                    <span
                      className="text-sm font-medium tabular-nums flex-shrink-0"
                      style={{ color: t.presenteText }}
                    >
                      {m.pontos} pts
                    </span>
                  )}
                </div>
              ))}
            </div>
          ))}
      </section>
    </div>
  );
};

export default F2CasaPage;
