import { ReactNode } from 'react';
import { useProfessor } from '@/contexts/ProfessorContext';
import ProfessorHeaderSimplificado from '@/components/professor/ProfessorHeaderSimplificado';
import ProfessorBottomNavSimplificado from '@/components/professor/ProfessorBottomNavSimplificado';
import { useAppBadge } from '@/hooks/useAppBadge';

interface ProfessorLayoutSimplificadoProps {
  children: ReactNode;
}

const ProfessorLayoutSimplificado = ({ children }: ProfessorLayoutSimplificadoProps) => {
  const { profile, isLoading } = useProfessor();

  // Ativar badge no ícone do app (sem casa para Infantil/F1)
  useAppBadge({
    userId: profile?.id,
    institutionId: profile?.institution_id,
    role: 'professor',
    casaMentorId: undefined // Sem casa para Infantil/F1
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
      <ProfessorHeaderSimplificado />
      
      {/* Main content area with padding for header and nav */}
      <main className="pt-16 pb-24 px-4 max-w-lg mx-auto">
        {children}
      </main>
      
      <ProfessorBottomNavSimplificado />
    </div>
  );
};

export default ProfessorLayoutSimplificado;
