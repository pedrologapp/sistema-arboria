import { ReactNode, Suspense } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useProfessor } from '@/contexts/ProfessorContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppBadge } from '@/hooks/useAppBadge';
import { infantilTheme as t } from '@/styles/infantilTheme';
import F2BottomNav from '@/components/professor/f2/F2BottomNav';

/**
 * Layout do professor. FUNDAMENTAL 2 (reforma, atrás do flag F2_REFORMA_ATIVA).
 *
 * Pele CLARA (infantilTheme), mesma linguagem de ferramenta do Infantil, com a
 * barra de 4 abas (Arboria, Inteligências, Diário, Sua Casa). Isolado do layout
 * escuro atual do F2 (ProfessorLayoutF2 em ProfessorLayout.tsx), que segue
 * intocado quando o flag está desligado.
 */

/** Fallback de chunk lazy: leve, dentro do chrome (nada de tela cheia). */
const PaginaCarregando = () => (
  <div className="pt-5 space-y-3">
    <Skeleton className="h-8 w-40 rounded" />
    <Skeleton className="h-24 w-full rounded-2xl" />
    <Skeleton className="h-16 w-full rounded-2xl" />
  </div>
);

const getIniciais = (nome?: string | null) => {
  if (!nome) return '?';
  const parts = nome.split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

interface ProfessorLayoutF2NovoProps {
  children: ReactNode;
}

const ProfessorLayoutF2Novo = ({ children }: ProfessorLayoutF2NovoProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, institutionName, casaMentor } = useProfessor();

  useAppBadge({
    userId: profile?.id,
    institutionId: profile?.institution_id,
    role: 'professor',
    casaMentorId: casaMentor?.id,
  });

  const nomeProfessor =
    profile?.full_name ||
    [profile?.nome, profile?.sobrenome].filter(Boolean).join(' ') ||
    'Professor';

  return (
    <div className="min-h-screen" style={{ backgroundColor: t.bg, color: t.text }}>
      <header
        className="fixed top-0 left-0 right-0 z-40 glass-light"
        style={{ boxShadow: '0 1px 3px rgba(28,34,48,0.06)', paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="max-w-lg mx-auto h-14 px-4 flex items-center justify-between">
          <div className="min-w-0 flex items-center gap-2.5">
            <svg
              viewBox="0 0 100 100"
              className="w-8 h-8 flex-shrink-0"
              style={{ color: t.accent }}
              aria-hidden="true"
            >
              <path
                d="M30 79 L50 27 L70 79"
                stroke="currentColor"
                strokeWidth="8.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              <path d="M50 27 C50 16 58 9 68 8 C69 19 61 26 50 27 Z" fill="currentColor" />
            </svg>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wide" style={{ color: t.textFaint }}>
                Arboria
              </p>
              <p className="text-sm font-semibold truncate" style={{ color: t.text }}>
                {institutionName || 'Fundamental 2'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={() => navigate('/professor/configuracoes')}
              className="flex-shrink-0 rounded-full transition-transform active:scale-95"
              aria-label="Menu do professor"
            >
              <Avatar className="h-9 w-9" style={{ border: `1px solid ${t.border}` }}>
                <AvatarImage src={profile?.avatar_url || undefined} className="object-cover" />
                <AvatarFallback
                  className="text-xs font-semibold"
                  style={{ backgroundColor: t.accentSoft, color: t.accentText }}
                >
                  {getIniciais(nomeProfessor)}
                </AvatarFallback>
              </Avatar>
            </button>
          </div>
        </div>
      </header>

      <main
        key={location.pathname}
        className="pb-24 px-4 max-w-lg mx-auto"
        style={{ paddingTop: 'calc(3.5rem + env(safe-area-inset-top, 0px))' }}
      >
        <Suspense fallback={<PaginaCarregando />}>{children}</Suspense>
      </main>

      <F2BottomNav />
    </div>
  );
};

export default ProfessorLayoutF2Novo;
