import { ReactNode, Suspense } from 'react';
import { ProfessorProvider, useProfessor } from '@/contexts/ProfessorContext';
import ProfessorHeader from '@/components/professor/ProfessorHeader';
import ProfessorBottomNav from '@/components/professor/ProfessorBottomNav';
import ProfessorLayoutInfantil from '@/layouts/ProfessorLayoutInfantil';
import ProfessorLayoutF2Novo from '@/layouts/ProfessorLayoutF2Novo';
import { F2_REFORMA_ATIVA } from '@/config/f2Reforma';
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
      <main className="pb-24 px-4 max-w-lg mx-auto" style={{ paddingTop: 'calc(4rem + env(safe-area-inset-top, 0px))' }}>
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

  // Fundamental 1: mesmo shell do Infantil (3 abas Arboria/Inteligências/Diário),
  // sem o tutorial do Infantil (o texto é específico daquele segmento)
  if (segmento === 'fundamental1') {
    return (
      <ProfessorLayoutInfantil tituloFallback="Fundamental 1">
        {children}
      </ProfessorLayoutInfantil>
    );
  }

  // Fundamental 2 (reforma, atrás do flag): shell claro de 4 abas. Com o flag
  // DESLIGADO cai no layout escuro atual (ProfessorLayoutF2), 100% intacto.
  if (segmento === 'fundamental2' && F2_REFORMA_ATIVA) {
    return <ProfessorLayoutF2Novo>{children}</ProfessorLayoutF2Novo>;
  }

  // Fundamental 2 (atual) usa layout completo escuro (com casa/mentor)
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
