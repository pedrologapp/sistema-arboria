import { ReactNode, Suspense } from 'react';
import { ProfessorProvider, useProfessor } from '@/contexts/ProfessorContext';
import ProfessorHeader from '@/components/professor/ProfessorHeader';
import ProfessorBottomNav from '@/components/professor/ProfessorBottomNav';
import ProfessorLayoutSimplificado from '@/layouts/ProfessorLayoutSimplificado';
import ProfessorLayoutInfantil from '@/layouts/ProfessorLayoutInfantil';
import { useAppBadge } from '@/hooks/useAppBadge';

interface ProfessorLayoutProps {
  children: ReactNode;
}

// Layout completo para Fundamental 2 (com Casa/Mentor)
const ProfessorLayoutF2 = ({ children }: ProfessorLayoutProps) => {
  const { profile, casaMentor, isLoading } = useProfessor();

  // Ativar badge no ícone do app
  useAppBadge({
    userId: profile?.id,
    institutionId: profile?.institution_id,
    role: 'professor',
    casaMentorId: casaMentor?.id
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#1A1A2E] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1A1A2E] text-white">
      <ProfessorHeader />
      
      {/* Main content area with padding for header and nav */}
      <main className="pt-16 pb-24 px-4 max-w-lg mx-auto">
        <Suspense
          fallback={
            <div className="pt-8 flex justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-indigo-500" />
            </div>
          }
        >
          {children}
        </Suspense>
      </main>
      
      <ProfessorBottomNav />
    </div>
  );
};

// Router que escolhe layout baseado no segmento
const ProfessorLayoutContent = ({ children }: ProfessorLayoutProps) => {
  const { segmento, isLoading } = useProfessor();

  // Spinner SÓ no primeiro load (segmento ainda desconhecido). Em refreshes
  // (refreshData após finalizar fase etc.), manter as páginas MONTADAS: // desmontar aqui apagava estado local (ex.: turma selecionada voltava pra 1ª).
  if (isLoading && !segmento) {
    return (
      <div className="min-h-screen bg-[#1A1A2E] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  // Infantil: nova camada (pele neutra, 3 abas); reforma 26/06
  if (segmento === 'infantil') {
    return <ProfessorLayoutInfantil>{children}</ProfessorLayoutInfantil>;
  }

  // Fundamental 1 segue no layout simplificado (ainda não reformado)
  if (segmento === 'fundamental1') {
    return <ProfessorLayoutSimplificado>{children}</ProfessorLayoutSimplificado>;
  }

  // Fundamental 2 usa layout completo (com casa/mentor)
  return <ProfessorLayoutF2>{children}</ProfessorLayoutF2>;
};

const ProfessorLayout = ({ children }: ProfessorLayoutProps) => {
  return (
    <ProfessorProvider>
      <ProfessorLayoutContent>{children}</ProfessorLayoutContent>
    </ProfessorProvider>
  );
};

export default ProfessorLayout;
