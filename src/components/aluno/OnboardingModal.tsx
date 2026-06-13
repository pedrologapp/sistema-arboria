import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { CasaBrasao } from '@/components/CasaBrasao';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  casaNome?: string;
  casaCor?: string;
  casaBrasaoUrl?: string | null;
  casaEmoji?: string | null;
  alunoNome: string;
}

const slides = [
  {
    titulo: 'Bem-vindo ao Arboria!',
    texto: 'O Arboria é a sua jornada de descoberta. Aqui você vai entender melhor quem você é, o que te faz diferente e onde seus talentos podem te levar.',
    emoji: '🌱',
  },
  {
    titulo: 'Sua Casa',
    texto: 'Você pertence a uma Casa — um grupo de alunos que pensam de um jeito parecido. Sua casa tem cor, nome, brasão e uma identidade própria. Vocês vão competir e crescer juntos!',
    emoji: '🏠',
    usaCasa: true,
  },
  {
    titulo: 'As Fases',
    texto: 'Durante o ano, vocês passam por 8 fases. Cada fase dura 4 semanas e trabalha uma inteligência diferente. Não importa qual é a sua casa — todas as fases são para você.',
    emoji: '🔄',
  },
  {
    titulo: 'Missões',
    texto: 'Em cada semana da fase, você recebe missões para fazer. Complete, envie e receba pontos! Quanto mais você faz, mais sua Casa e seu perfil crescem.',
    emoji: '🎯',
  },
  {
    titulo: 'Vamos começar!',
    texto: 'Explore sua Casa, conheça seus colegas no Chat, e faça sua primeira missão. Sua jornada começa agora!',
    emoji: '🚀',
  },
];

const OnboardingModal = ({
  isOpen,
  onClose,
  casaNome,
  casaCor = '#8b5cf6',
  casaBrasaoUrl,
  casaEmoji,
  alunoNome,
}: OnboardingModalProps) => {
  const [step, setStep] = useState(0);

  const slide = slides[step];
  const isLast = step === slides.length - 1;
  const isFirst = step === 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 flex items-center justify-center p-5 z-50"
          style={{ background: `radial-gradient(120% 60% at 50% 0%, ${casaCor}1f, transparent 60%), #0A0A1A` }}
        >
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25 }}
            data-augmented-ui="tl-clip tr-clip bl-clip br-clip border"
            className="w-full max-w-sm text-center p-6"
            style={{ background: '#0A0E1A', color: '#e8f4f8', '--aug-border-bg': casaCor, '--aug-border-all': '1px' } as React.CSSProperties}
          >
            {/* Emoji / Brasão */}
            <div className="mb-6">
              {slide.usaCasa && casaBrasaoUrl ? (
                <div className="flex justify-center">
                  <CasaBrasao
                    brasaoUrl={casaBrasaoUrl}
                    emoji={casaEmoji}
                    nome={casaNome || ''}
                    size="large"
                    className="w-20 h-20"
                  />
                </div>
              ) : (
                <motion.p
                  initial={{ scale: 0.5 }}
                  animate={{ scale: 1 }}
                  className="text-5xl"
                >
                  {slide.emoji}
                </motion.p>
              )}
            </div>

            {/* Título */}
            <h2 className="text-xl font-bold text-white mb-3">
              {step === 0 ? `${slide.titulo.replace('!', '')}, ${alunoNome}!` : slide.titulo}
            </h2>

            {/* Subtítulo da casa */}
            {slide.usaCasa && casaNome && (
              <p className="text-lg font-semibold mb-2" style={{ color: casaCor }}>
                Casa {casaNome}
              </p>
            )}

            {/* Texto */}
            <p className="text-white/55 text-sm leading-relaxed px-2">
              {slide.texto}
            </p>

            {/* Indicadores de progresso */}
            <div className="flex items-center justify-center gap-2 mt-8 mb-6">
              {slides.map((_, i) => (
                <div
                  key={i}
                  className="h-1.5 rounded-full transition-all duration-300"
                  style={{
                    width: i === step ? 24 : 8,
                    backgroundColor: i === step ? casaCor : 'rgba(255,255,255,0.15)',
                  }}
                />
              ))}
            </div>

            {/* Botões */}
            <div className="flex gap-3">
              {!isFirst && (
                <button
                  onClick={() => setStep(s => s - 1)}
                  className="flex-1 py-3 rounded-xl bg-white/5 text-white/60 text-sm font-medium hover:bg-white/10 transition-colors flex items-center justify-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" /> Voltar
                </button>
              )}
              <button
                onClick={() => {
                  if (isLast) {
                    onClose();
                  } else {
                    setStep(s => s + 1);
                  }
                }}
                className="flex-1 py-3 rounded-xl text-white text-sm font-semibold transition-colors flex items-center justify-center gap-1"
                style={{ backgroundColor: casaCor }}
              >
                {isLast ? 'Começar!' : 'Próximo'} {!isLast && <ChevronRight className="w-4 h-4" />}
              </button>
            </div>

            {/* Pular */}
            {!isLast && (
              <button
                onClick={onClose}
                className="mt-3 text-xs text-white/25 hover:text-white/40 transition-colors"
              >
                Pular introdução
              </button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OnboardingModal;
