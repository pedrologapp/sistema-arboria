import { ReactNode, Suspense, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CoordenadorProvider, useCoordenador } from '@/contexts/CoordenadorContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { coordenadorTheme as t } from '@/styles/coordenadorTheme';
import CoordenadorBottomNav from '@/components/coordenador/CoordenadorBottomNav';

// Ordem das abas (Gestão=0 · Inteligências=1 · Diário=2): dita a direção do deslize.
const tabIndex = (path: string) => {
  if (path.startsWith('/coordenador/inteligencias')) return 1;
  if (path.startsWith('/coordenador/diario')) return 2;
  if (path === '/coordenador') return 0;
  return -1;
};

// Rotas onde o SWIPE troca de aba (só as 3 abas de topo). Nunca dentro de uma turma.
const TAB_PATHS = ['/coordenador', '/coordenador/inteligencias', '/coordenador/diario'];

const PaginaCarregando = () => (
  <div className="pt-5 space-y-3">
    <Skeleton className="h-8 w-40 rounded" style={{ backgroundColor: t.panel }} />
    <Skeleton className="h-24 w-full rounded-2xl" style={{ backgroundColor: t.panel }} />
    <Skeleton className="h-16 w-full rounded-2xl" style={{ backgroundColor: t.panel }} />
  </div>
);

const getIniciais = (nome?: string | null) => {
  if (!nome) return '?';
  const parts = nome.split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

const SEGMENTO_LABEL: Record<string, string> = {
  infantil: 'Educação Infantil',
  fundamental1: 'Fundamental 1',
  fundamental2: 'Fundamental 2',
};

const CoordenadorLayoutContent = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, institutionName, segmentos } = useCoordenador();

  // Deslize direcional entre abas (mesma lógica do Infantil).
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

  // Swipe entre abas: arrastar para a esquerda avança, para a direita volta.
  const toqueRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    const t0 = e.touches[0];
    toqueRef.current = { x: t0.clientX, y: t0.clientY, t: Date.now() };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const ini = toqueRef.current;
    toqueRef.current = null;
    if (!ini) return;
    const pos = TAB_PATHS.indexOf(location.pathname);
    if (pos < 0) return; // fora das abas de topo (ex.: visor de turma): swipe desligado
    const fim = e.changedTouches[0];
    const dx = fim.clientX - ini.x;
    const dy = fim.clientY - ini.y;
    const dt = Date.now() - ini.t;
    if (Math.abs(dx) < 64 || Math.abs(dx) < Math.abs(dy) * 1.8 || dt > 600) return;
    const destino = dx < 0 ? pos + 1 : pos - 1;
    if (destino >= 0 && destino < TAB_PATHS.length) navigate(TAB_PATHS[destino]);
  };

  const nomeCoordenador =
    profile?.full_name ||
    [profile?.nome, profile?.sobrenome].filter(Boolean).join(' ') ||
    'Coordenação';

  const rotuloSegmentos =
    segmentos.length > 0
      ? segmentos.map((s) => SEGMENTO_LABEL[s] || s).join(' e ')
      : 'Coordenação';

  return (
    <div
      className="min-h-screen"
      style={{ background: t.bgGradient, color: t.ink }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <header
        className="fixed top-0 left-0 right-0 z-40"
        style={{
          backgroundColor: 'rgba(14,16,23,0.9)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: `1px solid ${t.line}`,
          paddingTop: 'env(safe-area-inset-top, 0px)',
        }}
      >
        <div className="max-w-lg mx-auto h-14 px-4 flex items-center justify-between">
          <div className="min-w-0 flex items-center gap-2.5">
            {/* Marca "A que Brota" */}
            <svg
              viewBox="0 0 100 100"
              className="w-8 h-8 flex-shrink-0"
              style={{ color: t.accent2 }}
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
              <p className="text-[11px] uppercase tracking-wide" style={{ color: t.mut }}>
                Arboria
              </p>
              <p className="text-sm font-semibold truncate" style={{ color: t.ink }}>
                {institutionName || 'Coordenação'}
              </p>
            </div>
          </div>

          {/* Avatar identitário. O menu pessoal (configurações/sair) do
              coordenador é passo próprio; por ora é só a marca de quem está logado. */}
          <div className="flex-shrink-0" title={nomeCoordenador}>
            <Avatar className="h-9 w-9" style={{ border: `1px solid ${t.line2}` }}>
              <AvatarImage src={profile?.avatar_url || undefined} className="object-cover" />
              <AvatarFallback
                className="text-xs font-semibold"
                style={{ backgroundColor: t.accentDim, color: t.accent2 }}
              >
                {getIniciais(nomeCoordenador)}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
        {/* Sublinha com o escopo do coordenador (segmentos concedidos) */}
        <div className="max-w-lg mx-auto px-4 pb-1 -mt-1">
          <p className="text-[10.5px]" style={{ color: t.mut2 }}>
            {rotuloSegmentos}
          </p>
        </div>
      </header>

      <main
        key={location.pathname}
        className={`pb-24 px-4 max-w-lg mx-auto ${slideClass}`}
        style={{ paddingTop: 'calc(4rem + env(safe-area-inset-top, 0px))' }}
      >
        <Suspense fallback={<PaginaCarregando />}>{children}</Suspense>
      </main>

      <CoordenadorBottomNav />
    </div>
  );
};

/**
 * Layout do VISOR DO COORDENADOR. DARK. Header (instituição + avatar) e a barra
 * de 3 abas (Gestão · Inteligências · Diário). Monta o CoordenadorProvider uma
 * única vez para as abas trocarem só o conteúdo.
 */
const CoordenadorLayout = ({ children }: { children: ReactNode }) => {
  return (
    <CoordenadorProvider>
      <CoordenadorLayoutContent>{children}</CoordenadorLayoutContent>
    </CoordenadorProvider>
  );
};

export default CoordenadorLayout;
