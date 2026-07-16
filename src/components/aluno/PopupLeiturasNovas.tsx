// ============================================================
// PopupLeiturasNovas — pop-up na Home avisando o aluno quando a IA leu missões
// dele e ele ainda não viu o recebimento. Fecha o loop sem o aluno precisar
// caçar na aba Concluídas. "Já viu" fica em localStorage (por dispositivo);
// dispensar vale só pra sessão (lembra de novo no próximo acesso se ainda houver
// leitura nova). Autocontido: própria query, próprio estado.
// ============================================================
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Leaf } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useStudent } from '@/contexts/StudentContext';
import { corAcento } from '@/lib/corCasa';
import { getLeiturasVistas } from '@/lib/leiturasVistas';

const SESSION_KEY = 'arboria-leitura-popup-dispensado';

const PopupLeiturasNovas = () => {
  const navigate = useNavigate();
  const { casaColor } = useStudent();
  const accent = corAcento(casaColor || '#a78bfa');

  const [fechado, setFechado] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(SESSION_KEY) === '1';
    } catch {
      return false;
    }
  });

  const { data: novas = [] } = useQuery({
    queryKey: ['leituras-novas'],
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_minha_analise_missao')
        .select('entrega_id, processado_em')
        .order('processado_em', { ascending: false });
      if (error) throw error;
      const vistas = getLeiturasVistas();
      return (data || []).filter((r) => !vistas.has(r.entrega_id as string)) as { entrega_id: string }[];
    },
  });

  if (fechado || novas.length === 0) return null;

  const n = novas.length;
  const dispensar = () => {
    try {
      sessionStorage.setItem(SESSION_KEY, '1');
    } catch {
      /* segue */
    }
    setFechado(true);
  };
  const verAgora = () => {
    dispensar();
    navigate(`/aluno/missao-resultado/${novas[0].entrega_id}`);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(8,8,18,0.62)', backdropFilter: 'blur(4px)' }}
      onClick={dispensar}
      role="dialog"
      aria-modal="true"
      aria-label="Novas leituras do Arboria"
    >
      <div
        className="w-full max-w-sm rounded-3xl overflow-hidden"
        style={{ backgroundColor: '#1b1b30', border: `1px solid ${accent}33`, boxShadow: '0 24px 64px rgba(0,0,0,0.55)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 text-center">
          <div
            className="w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-4"
            style={{ backgroundColor: `${accent}22`, boxShadow: `inset 0 0 0 1px ${accent}55` }}
          >
            <Leaf className="w-8 h-8" style={{ color: accent }} />
          </div>
          <h2 className="font-serif text-[22px] text-white leading-snug mb-1.5">
            {n === 1 ? 'Você tem uma nova leitura do Arboria' : `Você tem ${n} novas leituras do Arboria`}
          </h2>
          <p className="text-[13.5px] text-white/55 leading-relaxed mb-5">
            {n === 1
              ? 'Uma missão sua foi lida. Veja o que o Arboria achou e os pontos que você levou pra sua Casa.'
              : 'Suas missões foram lidas. Veja o que o Arboria achou e os pontos que você levou pra sua Casa.'}
          </p>
          <button
            onClick={verAgora}
            className="w-full rounded-xl py-3 text-[15px] font-semibold active:scale-[0.99] transition-transform"
            style={{ backgroundColor: accent, color: '#15152A' }}
          >
            Ver agora
          </button>
          <button onClick={dispensar} className="w-full rounded-xl py-2.5 mt-1.5 text-[13px] font-medium text-white/40">
            Agora não
          </button>
        </div>
      </div>
    </div>
  );
};

export default PopupLeiturasNovas;
