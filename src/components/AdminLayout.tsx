import { ReactNode } from 'react';
import { AdminHeader } from '@/components/AdminHeader';
import AdminBottomNav from '@/components/AdminBottomNav';

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="min-h-screen w-full bg-[#0A0A0A]">
      <div className="max-w-lg mx-auto">
      {/* Main Content */}
      <main className="relative z-10 pb-24">
        {children}
      </main>

      </div>
      {/* Bottom Navigation */}
      <AdminBottomNav />
    </div>
  );
}
