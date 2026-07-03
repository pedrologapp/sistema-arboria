import { useState } from 'react';
import { X } from 'lucide-react';

const STORAGE_KEY = 'arboria_banner_observar_mapa';

export const BannerObservarVsMapa = () => {
  const [visible, setVisible] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === null ? true : saved === 'true';
  });

  const close = () => {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, 'false');
  };

  const open = () => {
    setVisible(true);
    localStorage.setItem(STORAGE_KEY, 'true');
  };

  if (!visible) {
    return (
      <button
        onClick={open}
        className="w-full text-left px-3 py-2 rounded-lg text-xs text-amber-300/80 hover:text-amber-300 hover:bg-white/5 transition-colors"
      >
        💡 Ver orientação: Observar vs Mapa
      </button>
    );
  }

  return (
    <div className="relative rounded-xl border border-violet-500/10 overflow-hidden"
      style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.06) 0%, rgba(59,130,246,0.06) 100%)' }}
    >
      {/* Close */}
      <button onClick={close} className="absolute top-2 right-2 p-1 rounded-full hover:bg-white/10 text-white/40 hover:text-white/70 transition-colors z-10">
        <X size={16} />
      </button>

      <div className="p-3 space-y-3">
        {/* Title */}
        <p className="text-amber-400 font-semibold text-sm pr-6">💡 Quando usar cada ferramenta?</p>

        {/* Two columns */}
        <div className="grid grid-cols-2 gap-2">
          {/* OBSERVAR */}
          <div className="rounded-lg border border-amber-500/30 p-2.5 space-y-1.5" style={{ backgroundColor: 'rgba(245,158,11,0.05)' }}>
            <p className="font-semibold text-xs text-amber-400">👁️ OBSERVAR</p>
            <p className="text-[11px] text-white/80 leading-snug">Apenas para momentos relevantes ou de muita atenção.</p>
            <p className="text-[10px] text-white/50 leading-snug">Algo que se destacou: positivo ou preocupante. Um sinal claro que precisa ser registrado.</p>
            <div className="flex flex-wrap gap-1 pt-1">
              {['⭐ Brilhou', '🧱 Travou', '💡 Inovou'].map(t => (
                <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300/80">{t}</span>
              ))}
            </div>
          </div>

          {/* MAPA */}
          <div className="rounded-lg border border-blue-500/30 p-2.5 space-y-1.5" style={{ backgroundColor: 'rgba(59,130,246,0.05)' }}>
            <p className="font-semibold text-xs text-blue-400">🗺️ MAPA</p>
            <p className="text-[11px] text-white/80 leading-snug">Para observações normais e de mapeamento geral.</p>
            <p className="text-[10px] text-white/50 leading-snug">O retrato do dia a dia. Como o aluno está se comportando em geral nessa fase.</p>
            <div className="flex flex-wrap gap-1 pt-1">
              {['📊 Geral', '📝 Rotina', '🔄 Padrão'].map(t => (
                <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300/80">{t}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Footer rule */}
        <div className="rounded-lg px-3 py-2" style={{ backgroundColor: 'rgba(0,0,0,0.25)' }}>
          <p className="text-[11px] text-white/70 leading-snug">
            🎯 <span className="text-white/50">Regra rápida:</span> Se você pensou <strong className="text-amber-400">"isso preciso registrar"</strong>, é <strong className="text-amber-400">Observar</strong>. Se é o comportamento esperado, é <strong className="text-blue-400">Mapa</strong>.
          </p>
        </div>
      </div>
    </div>
  );
};
