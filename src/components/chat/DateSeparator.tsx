import { format, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { infantilTheme as t } from '@/styles/infantilTheme';

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

  // Pele CLARA: pílula central (gramática do thread do Diário), sem as réguas
  // laterais. Pele escura (aluno/admin): mantida intacta.
  if (light) {
    return (
      <div className="flex justify-center my-3">
        <span
          className="rounded-full px-3 py-0.5 text-[11px] font-medium"
          style={{ backgroundColor: t.surfaceSunken, color: t.textMuted }}
        >
          {label}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-white/10" />
      <span className="text-xs font-medium text-white/40">{label}</span>
      <div className="flex-1 h-px bg-white/10" />
    </div>
  );
};
