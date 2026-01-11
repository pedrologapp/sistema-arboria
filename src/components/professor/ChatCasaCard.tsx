import React from 'react';
import { MessageCircle, Eye, ChevronRight } from 'lucide-react';

interface ChatCasaCardProps {
  casaNome: string;
  casaColor: string;
  novasMensagens?: number;
  onClick: () => void;
}

export const ChatCasaCard = React.forwardRef<HTMLButtonElement, ChatCasaCardProps>(
  ({ casaNome, casaColor, novasMensagens = 0, onClick }, ref) => {
    return (
      <button
        ref={ref}
      onClick={onClick}
      className="w-full p-4 rounded-xl text-left group
        bg-gradient-to-r from-white/[0.06] to-white/[0.02]
        backdrop-blur-sm border border-white/10
        hover:scale-[1.02] hover:border-white/20
        transition-all duration-300 ease-out
        active:scale-[0.98]"
      style={{
        boxShadow: `0 8px 24px -8px ${casaColor}25`
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = `0 12px 32px -8px ${casaColor}35`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = `0 8px 24px -8px ${casaColor}25`;
      }}
    >
      <div className="flex items-start gap-4">
        {/* Ícone */}
        <div 
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110"
          style={{ 
            backgroundColor: `${casaColor}20`,
            boxShadow: `0 4px 12px -2px ${casaColor}30`
          }}
        >
          <MessageCircle 
            className="w-6 h-6" 
            style={{ color: casaColor }}
            strokeWidth={1.5}
          />
        </div>
        
        <div className="flex-1 min-w-0">
          {/* Título */}
          <h3 className="text-white font-semibold">
            Chat da Casa {casaNome}
          </h3>
          
          {/* Subtítulo - Modo Observador */}
          <p className="text-white/40 text-sm mt-0.5 flex items-center gap-1.5 font-light">
            <Eye className="w-3.5 h-3.5" strokeWidth={1.5} />
            Modo Observador
          </p>
          
          {/* Descrição */}
          <p className="text-white/50 text-sm mt-2 font-light">
            Veja as conversas dos seus alunos nos canais da casa
          </p>
          
          {/* Badge de novas mensagens */}
          {novasMensagens > 0 && (
            <p className="text-sm mt-2 flex items-center gap-1.5" style={{ color: casaColor }}>
              <span 
                className="w-2 h-2 rounded-full animate-pulse" 
                style={{ backgroundColor: casaColor }}
              />
              {novasMensagens} {novasMensagens === 1 ? 'mensagem nova' : 'mensagens novas'}
            </p>
          )}
        </div>
        
        {/* Seta */}
        <ChevronRight 
          className="w-5 h-5 text-white/30 flex-shrink-0 group-hover:text-white/50 transition-colors" 
          strokeWidth={1.5}
        />
        </div>
      </button>
    );
  }
);

ChatCasaCard.displayName = 'ChatCasaCard';
