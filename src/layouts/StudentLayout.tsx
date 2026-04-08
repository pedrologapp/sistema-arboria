import { ReactNode } from 'react';
import { StudentProvider, useStudent } from '@/contexts/StudentContext';
import StudentHeader from '@/components/aluno/StudentHeader';
import BottomNav from '@/components/aluno/BottomNav';
import { useUpdateActivity } from '@/hooks/useUpdateActivity';
import { useAppBadge } from '@/hooks/useAppBadge';

interface StudentLayoutProps {
  children: ReactNode;
}

// This component is rendered INSIDE StudentProvider, so it can safely use useStudent
const StudentLayoutContent = ({ children }: StudentLayoutProps) => {
  const { profile, isLoading } = useStudent();
  
  // Atualizar última atividade do usuário
  useUpdateActivity();

  // Ativar badge no ícone do app
  useAppBadge({
    userId: profile?.id,
    institutionId: profile?.institution_id,
    role: 'user'
  });

  // Show loading while context initializes
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#1A1A2E] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-violet-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1A1A2E] text-white">
      <StudentHeader />
      
      {/* Main content area with padding for header and nav */}
      <main className="pt-14 pb-24 px-4 max-w-lg mx-auto">
        {children}
      </main>
      
      <BottomNav />
    </div>
  );
};

const StudentLayout = ({ children }: StudentLayoutProps) => {
  return (
    <StudentProvider>
      <StudentLayoutContent>{children}</StudentLayoutContent>
    </StudentProvider>
  );
};

export default StudentLayout;
