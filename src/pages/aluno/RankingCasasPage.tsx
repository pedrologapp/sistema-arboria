// ============================================================
// RankingCasasPage — a tabela das 8 Casas (aba Casa -> "Onde estamos hoje").
// Decisao do Fundador (16/07): ranking Casa vs Casa e pertencimento; eles passam
// pelas 8 fases no ano e lutam pela Casa deles. A mesa (Gardner + Pedagogica)
// alertou sobre ranquear inteligências; o Fundador decidiu com fundamento.
//
// Dados: view ranking_casas (casa_id, casa_nome, casa_cor, posicao, total_pontos).
// Cor por Casa via corAcento (legivel sobre o fundo escuro). Sua Casa destacada,
// coroa no 1o. Sem placar individual aqui (isso e o percurso privado, so do aluno).
// ============================================================
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Crown, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useStudent } from '@/contexts/StudentContext';
import { corAcento } from '@/lib/corCasa';
import { cn } from '@/lib/utils';
import { CasaBrasao } from '@/components/CasaBrasao';
import '@/styles/missoes-scifi.css';

interface CasaRank {
  casa_id: number;
  casa_nome: string;
  casa_cor: string | null;
  posicao: number;
  total_pontos: number;
  brasao_url: string | null;
  emoji: string | null;
}

const RankingCasasPage = () => {
  const navigate = useNavigate();
  const { casa, profile, casaColor } = useStudent();

  const { data: casas = [], isLoading } = useQuery({
    queryKey: ['ranking-casas', profile?.institution_id],
    enabled: !!profile?.institution_id,
    staleTime: 60_000,
    queryFn: async () => {
      const [rkRes, intelRes] = await Promise.all([
        supabase
          .from('ranking_casas')
          .select('casa_id, casa_nome, casa_cor, posicao, total_pontos')
          .eq('institution_id', profile!.institution_id)
          .order('total_pontos', { ascending: false }),
        supabase.from('inteligencias').select('id, brasao_url, emoji'),
      ]);
      if (rkRes.error) throw rkRes.error;
      const brasaoMap = Object.fromEntries(
        (intelRes.data || []).map((i) => [Number(i.id), { brasao_url: i.brasao_url as string | null, emoji: i.emoji as string | null }])
      );
      return (rkRes.data || []).map((r) => ({
        casa_id: Number(r.casa_id),
        casa_nome: r.casa_nome || '',
        casa_cor: r.casa_cor,
        posicao: Number(r.posicao) || 0,
        total_pontos: Number(r.total_pontos) || 0,
        brasao_url: brasaoMap[Number(r.casa_id)]?.brasao_url ?? null,
        emoji: brasaoMap[Number(r.casa_id)]?.emoji ?? null,
      })) as CasaRank[];
    },
  });

  const accent = corAcento(casaColor || '#a78bfa');
  const anoLetivo = new Date().getFullYear();
  const temPontos = casas.some((c) => c.total_pontos > 0);

  return (
    <div className="scifi min-h-screen px-5 py-6 pb-24">
      {/* Cabecalho */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/aluno/casa')}
          className="p-2 -ml-2 rounded-full text-white/50 hover:text-white hover:bg-white/5 transition-colors"
          aria-label="Voltar"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="font-serif text-[22px] font-semibold text-white leading-tight flex-1">
          Ranking das Casas
        </h1>
        <span className="text-[9.5px] tracking-[0.18em] uppercase text-white/35 font-semibold">
          Temporada {anoLetivo}
        </span>
      </div>

      {isLoading ? (
        <div className="space-y-2.5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-[70px] bg-white/5 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : !temPontos ? (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] px-5 py-10 text-center mt-2">
          <Shield className="w-9 h-9 mx-auto mb-3" style={{ color: accent }} />
          <p className="text-white/70 text-[15px] font-medium mb-1">A temporada está começando</p>
          <p className="text-white/40 text-[13px] leading-snug max-w-xs mx-auto">
            Ainda ninguém pontuou. Cada missão que você faz leva pontos pra sua Casa e move este ranking.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {casas.map((c, idx) => {
            const isMine = c.casa_id === casa?.id;
            const isFirst = idx === 0;
            const cor = corAcento(c.casa_cor || '#a78bfa');
            return (
              <div
                key={c.casa_id}
                className={cn(
                  'flex items-center gap-3 rounded-2xl border px-3.5 py-3 transition-colors',
                  isMine
                    ? 'bg-white/[0.06]'
                    : 'bg-white/[0.035] border-white/[0.08]'
                )}
                style={isMine ? { borderColor: `${cor}88`, boxShadow: `0 0 0 1px ${cor}33` } : undefined}
              >
                {/* posicao */}
                <span
                  className="font-serif text-[17px] font-semibold w-6 text-center tabular-nums shrink-0"
                  style={{ color: isFirst ? '#e0b64a' : 'rgba(255,255,255,0.4)' }}
                >
                  {idx + 1}
                </span>

                {/* brasao real da Casa (cai no emoji se nao houver imagem) */}
                <CasaBrasao
                  brasaoUrl={c.brasao_url}
                  emoji={c.emoji}
                  nome={c.casa_nome}
                  size="small"
                  className="w-9 h-9 shrink-0"
                />

                {/* nome */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className={cn('text-[14px] font-semibold truncate', isMine ? 'text-white' : 'text-white/85')}>
                      Casa {c.casa_nome}
                    </span>
                    {isFirst && <Crown className="w-3.5 h-3.5 shrink-0" style={{ color: '#e0b64a' }} />}
                    {isMine && (
                      <span
                        className="text-[8.5px] tracking-[0.05em] uppercase font-bold px-1.5 py-0.5 rounded-full shrink-0"
                        style={{ backgroundColor: cor, color: '#15152A' }}
                      >
                        sua Casa
                      </span>
                    )}
                  </div>
                </div>

                {/* pontos */}
                <span className="font-serif text-[16px] font-semibold text-white tabular-nums shrink-0">
                  {c.total_pontos.toLocaleString('pt-BR')}
                  <span className="font-sans text-[9.5px] uppercase tracking-wide text-white/35 ml-1">pts</span>
                </span>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-center text-[12px] italic mt-6" style={{ color: accent }}>
        É pela sua Casa que você joga. Cada missão conta.
      </p>
    </div>
  );
};

export default RankingCasasPage;
