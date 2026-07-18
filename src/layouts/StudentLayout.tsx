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
      <div className="min-h-screen bg-[#0E0E1C] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-violet-500"></div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-[#0E0E1C] text-white"
      style={{
        // Pele nova (mock): fundo NEUTRO do shell, pra telas SEM .scifi (ex.: dentro
        // do canal de chat) tambem herdarem o fundo do mock, e nao o roxo antigo.
        background: 'radial-gradient(ellipse at 50% 0%, #191932 0%, #0E0E1C 55%)',
        backgroundAttachment: 'fixed',
      }}
    >
      <StudentHeader />
      
      {/* Main content area with padding for header and nav (+ notch do iPhone) */}
      <main className="pb-24 px-4 max-w-lg mx-auto" style={{ paddingTop: 'calc(3.5rem + env(safe-area-inset-top, 0px))' }}>
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
