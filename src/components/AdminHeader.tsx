'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MenuToggleIcon } from '@/components/ui/menu-toggle-icon';
import { createPortal } from 'react-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Activity,
  Users,
  Shield,
  Calendar,
  FileText,
  Settings,
  LogOut,
  TreeDeciduous,
  MessageCircle,
} from 'lucide-react';

const navItems = [
  { title: 'Monitor', href: '/admin/monitor', icon: Activity },
  { title: 'Pessoas', href: '/admin/pessoas', icon: Users },
  { title: 'Casas', href: '/admin/casas', icon: Shield },
  { title: 'Fases', href: '/admin/fases', icon: Calendar },
  { title: 'Chat', href: '/admin/chat', icon: MessageCircle },
  { title: 'Relatórios', href: '/admin/relatorios', icon: FileText },
  { title: 'Config', href: '/admin/config', icon: Settings },
];

export function AdminHeader() {
  const [open, setOpen] = useState(false);
  const scrolled = useScroll(10);
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const isActive = (href: string) => {
    return location.pathname.startsWith(href);
  };

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full transition-all duration-300',
        scrolled
          ? 'border-b border-white/10 bg-black/80 backdrop-blur-lg shadow-lg'
          : 'bg-transparent'
      )}
    >
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link to="/admin" className="flex items-center gap-2">
          <TreeDeciduous className="h-8 w-8 text-indigo-400" />
          <span className="text-xl font-bold text-white">Arboria</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive(item.href)
                  ? 'bg-indigo-500/20 text-indigo-300'
                  : 'text-white hover:text-indigo-300 hover:bg-white/5'
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.title}
            </Link>
          ))}
        </nav>

        {/* Desktop Sign Out */}
        <div className="hidden md:flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={handleSignOut}
            className="gap-2 text-white hover:text-indigo-300 hover:bg-white/5"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </Button>
        </div>

        {/* Mobile Menu Toggle */}
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden p-2"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label="Toggle menu"
        >
          <MenuToggleIcon open={open} className="h-6 w-6 text-white" />
        </button>
      </div>

      {/* Mobile Menu */}
      <MobileMenu open={open}>
        <div className="flex flex-col gap-2 p-6">
          {navItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg text-lg font-medium transition-colors',
                isActive(item.href)
                  ? 'bg-indigo-500/20 text-indigo-300'
                  : 'text-white hover:text-indigo-300 hover:bg-white/5'
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.title}
            </Link>
          ))}
        </div>
        <div className="mt-auto p-6 border-t border-white/10">
          <Button
            variant="ghost"
            onClick={() => {
              setOpen(false);
              handleSignOut();
            }}
            className="w-full justify-start gap-3 text-white hover:text-indigo-300 hover:bg-white/5"
          >
            <LogOut className="w-5 h-5" />
            Sair
          </Button>
        </div>
      </MobileMenu>
    </header>
  );
}

type MobileMenuProps = React.ComponentProps<'div'> & {
  open: boolean;
};

function MobileMenu({ open, children, className, ...props }: MobileMenuProps) {
  if (!open || typeof window === 'undefined') return null;

  return createPortal(
    <div
      className={cn(
        'fixed inset-0 z-40 bg-black/95 backdrop-blur-lg pt-20 flex flex-col animate-fade-in md:hidden',
        className
      )}
      {...props}
    >
      <div className="flex-1 flex flex-col overflow-y-auto">
        {children}
      </div>
    </div>,
    document.body
  );
}

function useScroll(threshold: number) {
  const [scrolled, setScrolled] = useState(false);

  const onScroll = useCallback(() => {
    setScrolled(window.scrollY > threshold);
  }, [threshold]);

  useEffect(() => {
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, [onScroll]);

  useEffect(() => {
    onScroll();
  }, [onScroll]);

  return scrolled;
}
