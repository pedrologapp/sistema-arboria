import { ReactNode, Suspense, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useProfessor } from '@/contexts/ProfessorContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppBadge } from '@/hooks/useAppBadge';
import { infantilTheme as t } from '@/styles/infantilTheme';
import InfantilBottomNav from '@/components/professor/infantil/InfantilBottomNav';
import TutorialInfantil, { abrirTutorialInfantil } from '@/components/professor/infantil/TutorialInfantil';
import { HelpCircle } from 'lucide-react';

// Ordem das abas (Arboria=0 · Fase=1 · Diário=2) — dita a DIREÇÃO do deslize
const tabIndex = (path: string) => {
  if (path.startsWith('/professor/fase')) return 1;
  if (path.startsWith('/professor/alunos')) return 2;
  if (path === '/professor' || path.startsWith('/professor/aula')) return 0;
  return -1;
};

// Rotas onde o SWIPE troca de aba — só as 3 abas de topo. Nunca na aula
// (rajada) nem no thread: um gesto acidental não pode tirar a professora
// do meio do registro.
const TAB_PATHS = ['/professor', '/professor/fase', '/professor/alunos'];

/** Fallback de chunk lazy — leve, DENTRO do chrome (nada de tela cheia escura). */
const PaginaCarregando = () => (
  <div className="pt-5 space-y-3">
    <Skeleton className="h-8 w-40 rounded" />
    <Skeleton className="h-24 w-full rounded-2xl" />
    <Skeleton className="h-16 w-full rounded-2xl" />
  </div>
);

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
  const location = useLocation();
  const { profile, institutionName } = useProfessor();

  // Deslize direcional entre abas: pra frente = entra da direita; pra trás,
  // da esquerda. Navegação dentro da mesma aba (ex.: abrir um thread) = fade.
  const idx = tabIndex(location.pathname);
  const prevIdxRef = useRef(idx);
  const prevIdx = prevIdxRef.current;
  const slideClass =
    idx >= 0 && prevIdx >= 0 && idx !== prevIdx
      ? idx > prevIdx
        ? 'tab-in-left'
        : 'tab-in-right'
      : 'tab-in-fade';
  useEffect(() => {
    prevIdxRef.current = idx;
  }, [idx]);

  // Aba Fase = santuário imersivo escuro → o chrome (header/nav) escurece junto
  const santuario = location.pathname.startsWith('/professor/fase');

  // Swipe entre abas (pedido do Fundador 02/07): arrastar ← avança, → volta.
  // Guardas: gesto claramente horizontal, rápido, e só nas 3 abas de topo.
  const toqueRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    const t0 = e.touches[0];
    toqueRef.current = { x: t0.clientX, y: t0.clientY, t: Date.now() };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const ini = toqueRef.current;
    toqueRef.current = null;
    if (!ini) return;
    // Dentro do santuário (aba Fase) o swipe troca de MECANISMO — a página cuida
    if (location.pathname.startsWith('/professor/fase')) return;
    const pos = TAB_PATHS.indexOf(location.pathname);
    if (pos < 0) return; // fora das abas de topo (aula, thread) — swipe desligado
    const fim = e.changedTouches[0];
    const dx = fim.clientX - ini.x;
    const dy = fim.clientY - ini.y;
    const dt = Date.now() - ini.t;
    if (Math.abs(dx) < 64 || Math.abs(dx) < Math.abs(dy) * 1.8 || dt > 600) return;
    const destino = dx < 0 ? pos + 1 : pos - 1;
    if (destino >= 0 && destino < TAB_PATHS.length) navigate(TAB_PATHS[destino]);
  };

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
    <div
      className="min-h-screen"
      style={{ backgroundColor: t.bg, color: t.text }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Header — no santuário (aba Fase) o glass escurece junto com a tela */}
      <header
        className={`fixed top-0 left-0 right-0 z-40 ${santuario ? 'glass-dark' : 'glass-light'}`}
        style={{ boxShadow: '0 1px 3px rgba(28,34,48,0.06)' }}
      >
        <div className="max-w-lg mx-auto h-14 px-4 flex items-center justify-between">
          <div className="min-w-0">
            <p
              className="text-[11px] uppercase tracking-wide"
              style={{ color: santuario ? 'rgba(255,255,255,0.6)' : t.textFaint }}
            >
              Arboria
            </p>
            <p
              className="text-sm font-semibold truncate"
              style={{ color: santuario ? '#FFFFFF' : t.text }}
            >
              {institutionName || 'Educação Infantil'}
            </p>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Ajuda — abre o tutorial "Como usar o Arboria" (pedido do Fundador 03/07) */}
            <button
              onClick={abrirTutorialInfantil}
              className="p-2 rounded-full transition-transform active:scale-95"
              style={{ color: santuario ? 'rgba(255,255,255,0.75)' : t.textMuted }}
              aria-label="Ajuda — como usar o Arboria"
            >
              <HelpCircle size={21} strokeWidth={1.75} />
            </button>
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

      {/* Conteúdo — key pela rota reinicia a animação de entrada a cada troca */}
      <main key={location.pathname} className={`pt-14 pb-24 px-4 max-w-lg mx-auto ${slideClass}`}>
        <Suspense fallback={<PaginaCarregando />}>{children}</Suspense>
      </main>

      <InfantilBottomNav dark={santuario} />

      {/* Tutorial "caderninho de bolso" — abre sozinho na 1ª entrada; reabrível
          pelo ícone Ajuda (acima) e por Configurações → Como usar o Arboria */}
      <TutorialInfantil />
    </div>
  );
};

export default ProfessorLayoutInfantil;
