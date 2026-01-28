import { ReactNode } from 'react';
import { AdminHeader } from '@/components/AdminHeader';
import AdminBottomNav from '@/components/AdminBottomNav';

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="min-h-screen w-full bg-black">

      {/* Desktop Header */}
      <div className="hidden md:block">
        <AdminHeader />
      </div>

      {/* Mobile Header (simplified) */}
      <div className="md:hidden sticky top-0 z-50 bg-black/80 backdrop-blur-lg border-b border-white/10">
        <div className="flex items-center justify-center h-14">
          <span className="text-lg font-bold text-white">Arboria</span>
        </div>
      </div>

      {/* Main Content */}
      <main className="relative z-10 pb-24 md:pb-8">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <AdminBottomNav />
    </div>
  );
}
