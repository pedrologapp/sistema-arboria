import { useState, KeyboardEvent, forwardRef } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ChatInputProps {
  onEnviar: (conteudo: string) => Promise<void>;
  casaColor: string;
  disabled?: boolean;
  placeholder?: string;
}

export const ChatInput = forwardRef<HTMLDivElement, ChatInputProps>(({ 
  onEnviar, 
  casaColor, 
  disabled = false,
  placeholder = 'Digite sua mensagem...'
}, ref) => {
  const [mensagem, setMensagem] = useState('');
  const [enviando, setEnviando] = useState(false);

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
    // Enter para enviar, Shift+Enter para nova linha
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleEnviar();
    }
  };

  return (
    <div ref={ref} className="flex items-end gap-2 p-3 bg-white/5 rounded-xl border border-white/10">
      <textarea
        value={mensagem}
        onChange={(e) => setMensagem(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled || enviando}
        rows={1}
        className="
          flex-1 bg-transparent text-white placeholder:text-white/40
          text-sm resize-none outline-none
          min-h-[24px] max-h-[120px]
        "
        style={{ height: 'auto' }}
        onInput={(e) => {
          const target = e.target as HTMLTextAreaElement;
          target.style.height = 'auto';
          target.style.height = Math.min(target.scrollHeight, 120) + 'px';
        }}
      />
      
      <Button
        onClick={handleEnviar}
        disabled={!mensagem.trim() || enviando || disabled}
        size="icon"
        className="h-8 w-8 rounded-full flex-shrink-0 transition-colors"
        style={{ 
          backgroundColor: mensagem.trim() ? casaColor : undefined,
          opacity: mensagem.trim() ? 1 : 0.5
        }}
      >
        <Send className="h-4 w-4" />
      </Button>
    </div>
  );
});

ChatInput.displayName = 'ChatInput';
