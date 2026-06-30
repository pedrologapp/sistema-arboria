import { BookOpen, Eye, Library } from 'lucide-react';
import { useProfessor } from '@/contexts/ProfessorContext';
import { Skeleton } from '@/components/ui/skeleton';
import { infantilTheme as t } from '@/styles/infantilTheme';

/**
 * Aba FASE (Infantil) — o ESTUDO / APOIO.
 * É o app ensinando o professor: o que é o mecanismo da fase, como observar,
 * e o banco de atividades. Separa "entender" (aqui) de "fazer" (Arboria).
 *
 * Inc.1: estrutura + dados reais da fase. Conteúdo do mecanismo, guia de
 * observação e banco de atividades entram no Inc.4.
 */
const InfantilFasePage = () => {
  const { faseAtual, isLoading } = useProfessor();
  const mecanismo = faseAtual?.inteligencia?.nome ?? null;
  const descricao = faseAtual?.inteligencia?.descricao ?? null;

  const Bloco = ({
    icon,
    titulo,
    children,
  }: {
    icon: React.ReactNode;
    titulo: string;
    children: React.ReactNode;
  }) => (
    <section
      className="rounded-2xl p-4"
      style={{ backgroundColor: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadowMd }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span style={{ color: t.accent }}>{icon}</span>
        <h2 className="text-sm font-semibold" style={{ color: t.text }}>
          {titulo}
        </h2>
      </div>
      <div className="text-sm leading-relaxed" style={{ color: t.textMuted }}>
        {children}
      </div>
    </section>
  );

  return (
    <div className="pt-5 space-y-5">
      <div>
        <p className="text-[11px] uppercase tracking-wide" style={{ color: t.textFaint }}>
          Estudo da fase
        </p>
        {isLoading ? (
          <Skeleton className="h-7 w-44 mt-1 rounded" />
        ) : (
          <h1 className="text-2xl font-bold mt-0.5" style={{ color: t.text }}>
            {mecanismo || 'Mecanismo'}
          </h1>
        )}
      </div>

      <Bloco icon={<BookOpen size={18} strokeWidth={1.75} />} titulo="O que é este mecanismo">
        {descricao || 'A descrição do mecanismo desta fase aparece aqui, em linguagem simples.'}
      </Bloco>

      <Bloco icon={<Eye size={18} strokeWidth={1.75} />} titulo="Como observar">
        Em breve: o que olhar nas crianças durante a fase — sem rotular, só registrar o que aparece.
      </Bloco>

      <Bloco icon={<Library size={18} strokeWidth={1.75} />} titulo="Banco de atividades">
        Em breve: atividades que convidam o mecanismo desta fase, pra você escolher e adaptar.
      </Bloco>
    </div>
  );
};

export default InfantilFasePage;
