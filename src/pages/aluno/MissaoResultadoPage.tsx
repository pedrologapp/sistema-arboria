// ============================================================
// MissaoResultadoPage — o RECEBIMENTO da missão analisada (o loop que fecha).
// A criança abre a missão concluída e vê: os PONTOS que levou pra Casa (nunca a
// nota crua) + a "Leitura do Arboria" (texto de educador, voz do método, nunca
// de uma pessoa nem de IA). Ausência justificada não pontua: vira recado gentil.
//
// Fonte: v_minha_analise_missao (só o próprio aluno, RLS por auth.uid()).
// Textos aprovados pelo Fundador. Tema escuro do app, cor da Casa na atmosfera,
// selo dourado no momento de pico. Sem emoji, sem travessão.
// ============================================================
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Leaf } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useStudent } from '@/contexts/StudentContext';
import { corAcento } from '@/lib/corCasa';
import '@/styles/missoes-scifi.css';

interface MinhaAnalise {
  entrega_id: string;
  missao_titulo: string | null;
  pontos: number;
  caso_especial: string | null;
  texto_arboria: string | null;
}

const MissaoResultadoPage = () => {
  const { entregaId } = useParams<{ entregaId: string }>();
  const navigate = useNavigate();
  const { casa, casaColor } = useStudent();
  const accent = corAcento(casaColor || '#a78bfa');

  const { data, isLoading } = useQuery({
    queryKey: ['minha-analise', entregaId],
    enabled: !!entregaId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_minha_analise_missao')
        .select('entrega_id, missao_titulo, pontos, caso_especial, texto_arboria')
        .eq('entrega_id', entregaId)
        .maybeSingle();
      if (error) throw error;
      return data as MinhaAnalise | null;
    },
  });

  const ehAusencia = data?.caso_especial === 'nao_participou';

  return (
    <div className="scifi min-h-screen px-5 py-6 pb-24">
      <button
        onClick={() => navigate(-1)}
        className="p-2 -ml-2 rounded-full text-white/50 hover:text-white hover:bg-white/5 transition-colors"
        aria-label="Voltar"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      {isLoading ? (
        <div className="mt-8 space-y-4">
          <div className="w-36 h-36 rounded-full bg-white/5 animate-pulse mx-auto" />
          <div className="h-6 bg-white/5 rounded-lg animate-pulse w-3/4 mx-auto" />
          <div className="h-40 bg-white/5 rounded-2xl animate-pulse" />
        </div>
      ) : !data ? (
        <div className="mt-16 text-center text-white/50 text-sm">
          Ainda não há uma leitura desta missão. Assim que ela for lida, aparece aqui.
        </div>
      ) : ehAusencia ? (
        // Ausência justificada: sem pontos, recado pessoal e gentil.
        <div className="mt-6 flex flex-col items-center text-center">
          <div className="text-[10.5px] tracking-[0.2em] uppercase text-white/40 font-semibold">Registro pessoal</div>
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center my-5"
            style={{ backgroundColor: `${accent}22`, boxShadow: `inset 0 0 0 1px ${accent}55` }}
          >
            <Leaf className="w-7 h-7" style={{ color: accent }} />
          </div>
          <h1 className="font-serif text-[21px] text-white leading-snug mb-1 max-w-xs">Essa não valeu pontos, e tudo bem.</h1>
          {data.missao_titulo && <p className="text-[12px] text-white/40 mb-5">{data.missao_titulo}</p>}
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-5 text-left w-full">
            <div className="flex items-center gap-2 mb-2.5 text-[10.5px] tracking-[0.12em] uppercase font-bold" style={{ color: accent }}>
              <Leaf className="w-4 h-4" /> Leitura do Arboria
            </div>
            <p className="text-[14.5px] text-white/80 leading-relaxed">{data.texto_arboria}</p>
          </div>
        </div>
      ) : (
        // Celebração: pontos + Leitura do Arboria.
        <div
          className="mt-2 flex flex-col items-center text-center rounded-3xl pt-6 pb-2"
          style={{ background: `radial-gradient(120% 70% at 50% 0%, ${casaColor}26, transparent 62%)` }}
        >
          <div className="text-[10.5px] tracking-[0.2em] uppercase font-semibold" style={{ color: accent }}>Missão concluída</div>

          {/* Selo dourado */}
          <div
            className="w-36 h-36 rounded-full flex items-center justify-center my-4 relative"
            style={{
              background: 'radial-gradient(circle at 50% 36%, #e6c47e, #b8860b)',
              boxShadow: '0 12px 34px rgba(184,134,11,0.45)',
            }}
          >
            <div className="absolute inset-[9px] rounded-full" style={{ border: '2px solid rgba(255,255,255,0.5)' }} />
            <div className="relative">
              <span className="font-serif text-white text-[46px] font-bold leading-none">
                <span className="text-[22px] align-super">+</span>{data.pontos}
              </span>
              <div className="text-[10px] tracking-[0.16em] uppercase text-white/95 font-bold -mt-1">pontos</div>
            </div>
          </div>

          <h1 className="font-serif text-[22px] text-white leading-snug px-2 max-w-xs mb-1">
            Você levou {data.pontos} pontos para a <span style={{ color: accent }}>Casa {casa?.nome}</span>.
          </h1>
          {data.missao_titulo && <p className="text-[12px] text-white/40 mb-5">{data.missao_titulo}</p>}

          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5 text-left w-full">
            <div className="flex items-center gap-2 mb-2.5 text-[10.5px] tracking-[0.12em] uppercase font-bold" style={{ color: accent }}>
              <Leaf className="w-4 h-4" /> Leitura do Arboria
            </div>
            <p className="text-[14.5px] text-white/85 leading-relaxed">{data.texto_arboria}</p>
          </div>

          <button
            onClick={() => navigate('/aluno/percurso')}
            className="w-full rounded-xl mt-4 py-3 text-[14px] font-semibold text-white active:scale-[0.99] transition-transform"
            style={{ backgroundColor: `${accent}26`, border: `1px solid ${accent}55`, color: accent }}
          >
            Ver meu percurso
          </button>
        </div>
      )}
    </div>
  );
};

export default MissaoResultadoPage;
