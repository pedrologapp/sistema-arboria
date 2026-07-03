import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { MECANISMOS_CASA, CROSS_IM_COMBINACOES } from '@/data/crossImData';

interface CrossImCardProps {
  casaCodigo: string;
  faseCodigo: string;
  corCasa: string;
  faseNome?: string;
}

const CrossImCard = ({ casaCodigo, faseCodigo, corCasa, faseNome }: CrossImCardProps) => {
  const [expandido, setExpandido] = useState(false);

  const combinacao = CROSS_IM_COMBINACOES.find(
    c => c.casa_codigo === casaCodigo && c.fase_codigo === faseCodigo
  );

  if (!combinacao) return null;

  const mecanismo = MECANISMOS_CASA[casaCodigo];
  const ehFasePropria = combinacao.fase_propria;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.4 }}
      className="relative rounded-2xl overflow-hidden"
      style={{
        background: `linear-gradient(180deg, ${corCasa}10 0%, #1a1a2e 6%, #1a1a2e 94%, ${corCasa}06 100%)`,
        border: `1px solid ${corCasa}20`,
        boxShadow: `0 0 30px ${corCasa}06, inset 0 1px 0 ${corCasa}12`,
      }}
    >
      {/* Borda decorativa superior */}
      <div
        className="h-[3px] w-full"
        style={{ background: `linear-gradient(90deg, transparent, ${corCasa}80, transparent)` }}
      />

      {/* Header com ornamento */}
      <div className="px-5 pt-5 pb-1 text-center">
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="h-px flex-1 max-w-[40px]" style={{ background: `linear-gradient(90deg, transparent, ${corCasa}40)` }} />
          <span
            className="text-[10px] font-bold uppercase tracking-[0.15em]"
            style={{ color: `${corCasa}AA` }}
          >
            {ehFasePropria
              ? `Fase ${faseNome || ''}: sua fase`
              : `Você na fase ${faseNome || ''}`
            }
          </span>
          <div className="h-px flex-1 max-w-[40px]" style={{ background: `linear-gradient(90deg, ${corCasa}40, transparent)` }} />
        </div>
      </div>

      {/* Conteúdo */}
      <div className="px-5 pb-4">
        {/* Mecanismo da casa (só quando NÃO é fase própria) */}
        {!ehFasePropria && mecanismo && (
          <div
            className="rounded-lg p-3 mb-4"
            style={{ backgroundColor: `${corCasa}06`, borderLeft: `2px solid ${corCasa}30` }}
          >
            <p className="text-white/40 text-xs italic leading-relaxed">
              {mecanismo}
            </p>
          </div>
        )}

        {/* Texto Cross-IM */}
        <p className="text-white/70 text-[13px] leading-relaxed">
          {combinacao.texto_aluno}
        </p>
      </div>

      {/* Ornamento separador */}
      <div className="flex items-center justify-center gap-2 px-5">
        <div className="h-px flex-1" style={{ background: `linear-gradient(90deg, transparent, ${corCasa}15)` }} />
        <div className="w-1 h-1 rounded-full" style={{ backgroundColor: `${corCasa}30` }} />
        <div className="h-px flex-1" style={{ background: `linear-gradient(90deg, ${corCasa}15, transparent)` }} />
      </div>

      {/* Botão expandir caminhos */}
      {combinacao.caminhos_possiveis.length > 0 && (
        <>
          <button
            onClick={() => setExpandido(!expandido)}
            className="w-full px-5 py-3 flex items-center justify-between transition-colors hover:bg-white/[0.02]"
          >
            <span className="text-xs font-medium" style={{ color: `${corCasa}80` }}>
              Onde isso pode te levar
            </span>
            <motion.div
              animate={{ rotate: expandido ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="w-4 h-4" style={{ color: `${corCasa}50` }} />
            </motion.div>
          </button>

          <AnimatePresence>
            {expandido && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="px-5 pb-5 space-y-2">
                  {combinacao.caminhos_possiveis.map((caminho, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="flex items-start gap-3 py-1"
                    >
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: `${corCasa}15`, color: `${corCasa}80` }}
                      >
                        {i + 1}
                      </div>
                      <span className="text-xs text-white/50 leading-relaxed">
                        {caminho}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* Borda decorativa inferior */}
      <div
        className="h-[2px] w-full"
        style={{ background: `linear-gradient(90deg, transparent, ${corCasa}30, transparent)` }}
      />
    </motion.div>
  );
};

export default CrossImCard;
