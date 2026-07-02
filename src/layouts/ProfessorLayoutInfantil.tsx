import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfessor } from '@/contexts/ProfessorContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAppBadge } from '@/hooks/useAppBadge';
import { infantilTheme as t } from '@/styles/infantilTheme';
import InfantilBottomNav from '@/components/professor/infantil/InfantilBottomNav';

interface ProfessorLayoutInfantilProps {
  children: ReactNode;
}

const getIniciais = (nome?: string | null) => {
  if (!nome) return '?';
  const parts = nome.split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

/**
 * Layout do professor — INFANTIL. Pele neutra/clara, de ferramenta.
 * Header sóbrio (instituição + avatar → menu pessoal) e a barra de 3 abas.
 */
const ProfessorLayoutInfantil = ({ children }: ProfessorLayoutInfantilProps) => {
  const navigate = useNavigate();
  const { profile, institutionName } = useProfessor();

  useAppBadge({
    userId: profile?.id,
    institutionId: profile?.institution_id,
    role: 'professor',
    casaMentorId: undefined, // Infantil não tem casa
  });

  const nomeProfessor =
    profile?.full_name ||
    [profile?.nome, profile?.sobrenome].filter(Boolean).join(' ') ||
    'Professor';

  return (
    <div className="min-h-screen" style={{ backgroundColor: t.bg, color: t.text }}>
      {/* Header */}
      <header
        className="fixed top-0 left-0 right-0 z-40 glass-light"
        style={{ boxShadow: '0 1px 3px rgba(28,34,48,0.06)' }}
      >
        <div className="max-w-lg mx-auto h-14 px-4 flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide" style={{ color: t.textFaint }}>
              Arboria
            </p>
            <p className="text-sm font-semibold truncate" style={{ color: t.text }}>
              {institutionName || 'Educação Infantil'}
            </p>
          </div>

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
      </header>

      {/* Conteúdo */}
      <main className="pt-14 pb-24 px-4 max-w-lg mx-auto">{children}</main>

      <InfantilBottomNav />
    </div>
  );
};

export default ProfessorLayoutInfantil;
