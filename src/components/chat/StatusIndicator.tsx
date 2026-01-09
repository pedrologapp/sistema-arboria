import { getStatusOnline } from '@/utils/statusOnline';

interface StatusIndicatorProps {
  ultimaAtividade: string | null;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusIndicator = ({ 
  ultimaAtividade, 
  showLabel = false,
  size = 'md'
}: StatusIndicatorProps) => {
  const status = getStatusOnline(ultimaAtividade);
  
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };
  
  return (
    <div className="flex items-center gap-1.5">
      <div 
        className={`${sizeClasses[size]} rounded-full`}
        style={{ backgroundColor: status.cor }}
      />
      {showLabel && (
        <span className={`${textSizeClasses[size]} text-muted-foreground`}>
          {status.label}
        </span>
      )}
    </div>
  );
};
