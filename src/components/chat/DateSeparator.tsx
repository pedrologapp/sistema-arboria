import { format, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DateSeparatorProps {
  date: string;
  /** Pele clara (F2 reformado). Default false = escura (aluno/admin). */
  light?: boolean;
}

export const DateSeparator = ({ date, light = false }: DateSeparatorProps) => {
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
      <div className={`flex-1 h-px ${light ? 'bg-[#DDE0E6]' : 'bg-white/10'}`} />
      <span className={`text-xs font-medium ${light ? 'text-[#6E7788]' : 'text-white/40'}`}>{label}</span>
      <div className={`flex-1 h-px ${light ? 'bg-[#DDE0E6]' : 'bg-white/10'}`} />
    </div>
  );
};
