import { ReactNode } from 'react';
import { StudentProvider } from '@/contexts/StudentContext';
import StudentHeader from '@/components/aluno/StudentHeader';
import BottomNav from '@/components/aluno/BottomNav';

interface StudentLayoutProps {
  children: ReactNode;
}

const StudentLayoutContent = ({ children }: StudentLayoutProps) => {
  return (
    <div className="min-h-screen bg-black text-white">
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
