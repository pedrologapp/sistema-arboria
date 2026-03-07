import { supabase } from '@/integrations/supabase/client';

type ActivityAction =
  | 'login'
  | 'logout'
  | 'missao_entrega'
  | 'missao_avaliada'
  | 'missao_criada'
  | 'observacao_criada'
  | 'chat_mensagem'
  | 'perfil_atualizado'
  | 'pontos_creditados';

function getDevice(): string {
  if (typeof window === 'undefined') return 'unknown';
  return window.innerWidth < 768 ? 'mobile' : 'desktop';
}

export async function logActivity(
  userId: string,
  action: ActivityAction,
  details: Record<string, any> = {}
) {
  try {
    await supabase.functions.invoke('log-activity', {
      body: {
        action,
        details: {
          ...details,
          device: getDevice(),
          user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        },
      },
    });
  } catch (e) {
    // Fire-and-forget: never block the user flow
    console.error('[logActivity]', e);
  }
}
