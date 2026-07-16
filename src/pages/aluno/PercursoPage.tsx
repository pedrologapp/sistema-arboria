// ============================================================
// PercursoPage — a TRILHA privada do aluno (pontuação individual em trilha).
// Decisao do Fundador: os pontos individuais são SÓ do aluno; nenhum colega vê.
// Enquadrado como crescimento ("você já levou X pra sua Casa"), nunca boletim,
// nunca nota, nunca comparação com outros. Cada item abre o recebimento.
//
// Fonte: v_minha_analise_missao (RLS por auth.uid()). Ausência justificada
// aparece sem pontos, como registro.
// ============================================================
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Lock, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useStudent } from '@/contexts/StudentContext';
import { corAcento } from '@/lib/corCasa';
import { cn } from '@/lib/utils';
import '@/styles/missoes-scifi.css';

interface ItemPercurso {
  entrega_id: string;
  missao_titulo: string | null;
  mecanismo_nome: string | null;
  pontos: number;
  caso_especial: string | null;
  processado_em: string | null;
  data_entrega: string | null;
}

const PercursoPage = () => {
  const navigate = useNavigate();
  const { casa, casaColor } = useStudent();
  const accent = corAcento(casaColor || '#a78bfa');

  const { data: itens = [], isLoading } = useQuery({
    queryKey: ['meu-percurso'],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_minha_analise_missao')
        .select('entrega_id, missao_titulo, mecanismo_nome, pontos, caso_especial, processado_em, data_entrega')
        .order('processado_em', { ascending: false });
      if (error) throw error;
      return (data || []) as ItemPercurso[];
    },
  });

  const totalPontos = itens.reduce((s, i) => s + (i.pontos || 0), 0);

  return (
    <div className="scifi min-h-screen px-5 py-6 pb-24">
      {/* Cabecalho */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-full text-white/50 hover:text-white hover:bg-white/5 transition-colors"
          aria-label="Voltar"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="font-serif text-[22px] font-semibold text-white leading-tight flex-1">Seu percurso</h1>
      </div>

      {/* Selo de privacidade */}
      <div className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold text-white/50 bg-white/[0.06] px-3 py-1.5 rounded-full mb-4">
        <Lock className="w-3 h-3" /> Só você vê isto
      </div>

      {/* Total como crescimento */}
      <div
        className="rounded-2xl border border-white/[0.08] p-5 mb-6"
        style={{ background: `linear-gradient(160deg, ${casaColor}22, ${casaColor}05 70%)` }}
      >
        <p className="font-serif text-[21px] text-white leading-snug">
          Você já conquistou <span style={{ color: accent }}>{totalPontos.toLocaleString('pt-BR')} pontos</span> até aqui.
        </p>
        <p className="text-[12.5px] text-white/45 mt-1.5">
          {itens.length > 0 ? 'Cada missão te fez crescer um pouco. Olha o seu caminho até aqui.' : 'Sua primeira missão começa o caminho.'}
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : itens.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] px-5 py-8 text-center">
          <p className="text-white/45 text-[13px] leading-snug">
            Quando suas missões forem lidas, elas aparecem aqui, uma a uma, com o que você levou pra Casa.
          </p>
        </div>
      ) : (
        <div className="relative pl-5">
          {/* linha da trilha */}
          <div className="absolute left-[5px] top-2 bottom-2 w-px bg-white/[0.12]" />
          {itens.map((it) => {
            const ehAusencia = it.caso_especial === 'nao_participou';
            return (
              <button
                key={it.entrega_id}
                onClick={() => navigate(`/aluno/missao-resultado/${it.entrega_id}`)}
                className="relative w-full text-left mb-3 group"
              >
                <span
                  className="absolute -left-[18px] top-1.5 w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: accent, boxShadow: '0 0 0 3px #15152A' }}
                />
                <div className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.035] px-3.5 py-3 active:scale-[0.99] transition-transform">
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] text-white/90 font-medium leading-tight truncate">
                      {it.missao_titulo || 'Missão'}
                    </div>
                    {it.mecanismo_nome && (
                      <div className="text-[11px] text-white/40 mt-0.5">fase {it.mecanismo_nome}</div>
                    )}
                  </div>
                  <span
                    className={cn('text-[13px] font-bold shrink-0 tabular-nums', ehAusencia && 'text-white/35 font-medium')}
                    style={!ehAusencia ? { color: '#e0b64a' } : undefined}
                  >
                    {ehAusencia ? 'registro' : `+${it.pontos}`}
                  </span>
                  <ChevronRight className="w-4 h-4 text-white/25 shrink-0" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PercursoPage;
