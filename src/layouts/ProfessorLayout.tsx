import { ReactNode } from 'react';
import { ProfessorProvider, useProfessor } from '@/contexts/ProfessorContext';
import ProfessorHeader from '@/components/professor/ProfessorHeader';
import ProfessorBottomNav from '@/components/professor/ProfessorBottomNav';
import { useAppBadge } from '@/hooks/useAppBadge';

interface ProfessorLayoutProps {
  children: ReactNode;
}

const ProfessorLayoutContent = ({ children }: ProfessorLayoutProps) => {
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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white">
      <ProfessorHeader />
      
      {/* Main content area with padding for header and nav */}
      <main className="pt-16 pb-24 px-4 max-w-lg mx-auto">
        {children}
      </main>
      
      <ProfessorBottomNav />
    </div>
  );
};

const ProfessorLayout = ({ children }: ProfessorLayoutProps) => {
  return (
    <ProfessorProvider>
      <ProfessorLayoutContent>{children}</ProfessorLayoutContent>
    </ProfessorProvider>
  );
};

export default ProfessorLayout;
