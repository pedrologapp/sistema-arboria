import { useState } from 'react';
import { cn } from '@/lib/utils';

interface CasaBrasaoProps {
  brasaoUrl?: string | null;
  emoji?: string | null;
  nome?: string;
  size: 'mini' | 'medium' | 'large';
  className?: string;
}

const sizeMap = {
  mini: 'w-5 h-5',       // 20px - barras de inteligência
  medium: 'w-14 h-14',   // 56px - headers de fase/semana
  large: 'w-24 h-24',    // 96px - header da casa
};

const emojiSizeMap = {
  mini: 'text-base',
  medium: 'text-4xl',
  large: 'text-5xl',
};

export const CasaBrasao = ({ brasaoUrl, emoji, nome, size, className }: CasaBrasaoProps) => {
  const [imgError, setImgError] = useState(false);

  if (!brasaoUrl || imgError) {
    // Fallback para emoji
    return (
      <span className={cn(emojiSizeMap[size], 'inline-flex items-center justify-center', className)}>
        {emoji || '🏠'}
      </span>
    );
  }

  return (
    <img
      src={brasaoUrl}
      alt={nome ? `Brasão ${nome}` : 'Brasão da casa'}
      className={cn(sizeMap[size], 'rounded-full object-contain flex-shrink-0', className)}
      onError={() => setImgError(true)}
    />
  );
};
