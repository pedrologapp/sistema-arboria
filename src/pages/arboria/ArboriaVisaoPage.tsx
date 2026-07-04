import { useEffect, useState } from 'react';
import { School, Users, GraduationCap, NotebookPen, Sprout, Library, CalendarClock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { infantilTheme as t } from '@/styles/infantilTheme';

interface VisaoGeral {
  escolas: number;
  professores_distintos: number;
  alunos: number;
  turmas: number;
  observacoes_total: number;
  observacoes_7d: number;
  formacoes_concluidas: number;
  atividades_cadastradas: number;
}

/** Termômetro do dono: contagens vivas de toda a plataforma, sem gráfico complexo. */
const ArboriaVisaoPage = () => {
  const [dados, setDados] = useState<VisaoGeral | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await (supabase.rpc as (fn: string) => ReturnType<typeof supabase.rpc>)(
        'arboria_visao_geral'
      );
      if (error) setErro(error.message);
      else setDados(data as unknown as VisaoGeral);
    })();
  }, []);

  const cards: { label: string; valor: number | undefined; icone: React.ReactNode; nota?: string }[] = [
    { label: 'Escolas', valor: dados?.escolas, icone: <School size={18} strokeWidth={1.75} /> },
    { label: 'Professores', valor: dados?.professores_distintos, icone: <Users size={18} strokeWidth={1.75} /> },
    { label: 'Alunos', valor: dados?.alunos, icone: <GraduationCap size={18} strokeWidth={1.75} /> },
    { label: 'Turmas', valor: dados?.turmas, icone: <CalendarClock size={18} strokeWidth={1.75} /> },
    {
      label: 'Observações na semana',
      valor: dados?.observacoes_7d,
      icone: <NotebookPen size={18} strokeWidth={1.75} />,
      nota: dados ? `${dados.observacoes_total} desde o início` : undefined,
    },
    { label: 'Formações concluídas', valor: dados?.formacoes_concluidas, icone: <Sprout size={18} strokeWidth={1.75} /> },
    { label: 'Atividades no banco', valor: dados?.atividades_cadastradas, icone: <Library size={18} strokeWidth={1.75} /> },
  ];

  return (
    <div>
      <h1 className="font-serif text-[22px] mb-1" style={{ color: t.text }}>
        Visão geral
      </h1>
      <p className="text-sm mb-5" style={{ color: t.textMuted }}>
        O termômetro do Arboria inteiro, agora.
      </p>

      {erro && (
        <div
          className="rounded-xl p-3 text-sm mb-4"
          style={{ backgroundColor: '#FBF3E6', color: '#8A5A12' }}
        >
          Não consegui carregar os números: {erro}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-2xl p-4"
            style={{ backgroundColor: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadowSm }}
          >
            <span
              className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
              style={{ backgroundColor: t.accentSoft, color: t.accent }}
            >
              {c.icone}
            </span>
            {dados ? (
              <p className="font-serif text-[26px] leading-none" style={{ color: t.text }}>
                {c.valor ?? 0}
              </p>
            ) : (
              <Skeleton className="h-7 w-14 rounded" />
            )}
            <p className="text-xs mt-1.5 font-medium" style={{ color: t.textMuted }}>
              {c.label}
            </p>
            {c.nota && (
              <p className="text-[10.5px] mt-0.5" style={{ color: t.textFaint }}>
                {c.nota}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ArboriaVisaoPage;
