import { useState, KeyboardEvent, forwardRef } from 'react';
import { Send } from 'lucide-react';
import { infantilTheme as t } from '@/styles/infantilTheme';

interface ChatInputProps {
  onEnviar: (conteudo: string) => Promise<void>;
  casaColor?: string;
  disabled?: boolean;
  placeholder?: string;
  /**
   * Pele CLARA (F2 reformado / Infantil / F1). Default false = pele escura
   * original, preservada para o chat do aluno e do admin.
   */
  light?: boolean;
}

export const ChatInput = forwardRef<HTMLDivElement, ChatInputProps>(({
  onEnviar,
  casaColor,
  disabled = false,
  placeholder = 'Digite sua mensagem...',
  light = false,
}, ref) => {
  const [mensagem, setMensagem] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [focado, setFocado] = useState(false);

  const handleEnviar = async () => {
    if (!mensagem.trim() || enviando || disabled) return;
    setEnviando(true);
    try {
      await onEnviar(mensagem);
      setMensagem('');
    } finally {
      setEnviando(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleEnviar();
    }
  };

  // Pele CLARA: container rounded-2xl em surfaceSunken, borda pintando em t.accent
  // no foco (via estado, para consumir o token e não hex no pseudo-classe).
  const wrapperClass = light
    ? 'flex items-end gap-2 px-3 py-2.5 rounded-2xl transition-colors'
    : 'flex items-end gap-2 px-3 py-2.5 bg-white/[0.06] rounded-xl border border-violet-500/10';

  const wrapperStyle = light
    ? { backgroundColor: t.surfaceSunken, border: `1px solid ${focado ? t.accent : t.border}` }
    : undefined;

  const textareaClass = light
    ? 'flex-1 bg-transparent placeholder:text-[#6E7788] text-sm resize-none outline-none min-h-[22px] max-h-[120px]'
    : 'flex-1 bg-transparent text-white placeholder:text-white/30 text-sm resize-none outline-none min-h-[22px] max-h-[120px]';

  const sendClass = light
    ? 'w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed text-white'
    : 'h-8 w-8 rounded-full flex-shrink-0 flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-blue-600 hover:bg-blue-500 text-white';

  return (
    <div ref={ref} className={wrapperClass} style={wrapperStyle}>
      <textarea
        value={mensagem}
        onChange={(e) => setMensagem(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => setFocado(true)}
        onBlur={() => setFocado(false)}
        placeholder={placeholder}
        disabled={disabled || enviando}
        rows={1}
        className={textareaClass}
        style={light ? { height: 'auto', color: t.text } : { height: 'auto' }}
        onInput={(e) => {
          const target = e.target as HTMLTextAreaElement;
          target.style.height = 'auto';
          target.style.height = Math.min(target.scrollHeight, 120) + 'px';
        }}
      />
      <button
        onClick={handleEnviar}
        disabled={!mensagem.trim() || enviando || disabled}
        className={sendClass}
        style={light ? { backgroundColor: casaColor || t.accent } : undefined}
        aria-label="Enviar mensagem"
      >
        <Send className={light ? '' : 'h-3.5 w-3.5'} size={light ? 18 : undefined} />
      </button>
    </div>
  );
});

ChatInput.displayName = 'ChatInput';
