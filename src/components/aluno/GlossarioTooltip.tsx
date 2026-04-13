import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { HelpCircle } from 'lucide-react';
import { GLOSSARIO } from '@/data/glossario';

interface GlossarioTooltipProps {
  termo: string; // chave do glossario (ex: 'interpessoal', 'casa', 'fase')
  children: React.ReactNode;
  cor?: string;
}

const GlossarioTooltip = ({ termo, children, cor }: GlossarioTooltipProps) => {
  const [aberto, setAberto] = useState(false);

  const descricao = GLOSSARIO[termo] || GLOSSARIO[termo.replace('-', '_')];
  if (!descricao) return <>{children}</>;

  return (
    <span className="relative inline-flex items-center gap-1">
      {children}
      <button
        onClick={(e) => { e.stopPropagation(); setAberto(!aberto); }}
        className="inline-flex opacity-40 hover:opacity-80 transition-opacity"
      >
        <HelpCircle className="w-3.5 h-3.5" style={{ color: cor || 'white' }} />
      </button>

      <AnimatePresence>
        {aberto && (
          <>
            {/* Overlay para fechar */}
            <div className="fixed inset-0 z-40" onClick={() => setAberto(false)} />
            <motion.div
              initial={{ opacity: 0, y: 5, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 5, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 top-full mt-1.5 z-50 w-64 p-3 rounded-xl bg-[#252547] border border-violet-500/20 shadow-xl"
            >
              <p className="text-xs text-white/70 leading-relaxed">{descricao}</p>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </span>
  );
};

export default GlossarioTooltip;
