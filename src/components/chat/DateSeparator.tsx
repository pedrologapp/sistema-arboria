import { format, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DateSeparatorProps {
  date: string;
}

export const DateSeparator = ({ date }: DateSeparatorProps) => {
  const d = new Date(date);
  const now = new Date();

  let label: string;
  if (isToday(d)) {
    label = 'Hoje';
  } else if (isYesterday(d)) {
    label = 'Ontem';
  } else if (d.getFullYear() === now.getFullYear()) {
    label = format(d, "dd 'de' MMMM", { locale: ptBR });
  } else {
    label = format(d, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  }

  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-white/10" />
      <span className="text-white/40 text-xs font-medium">{label}</span>
      <div className="flex-1 h-px bg-white/10" />
    </div>
  );
};
