import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { toast } from 'sonner';

/**
 * Service Worker: cacheia os assets (aberturas repetidas ficam quase instantâneas).
 * registerType "prompt" → quando sai versão nova, mostra um aviso pro usuário
 * escolher atualizar (em vez de aplicar sozinho e arriscar cache velho).
 */
export const PwaUpdatePrompt = () => {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  useEffect(() => {
    if (needRefresh) {
      toast('Nova versão disponível', {
        description: 'Toque em Atualizar para carregar a versão mais recente.',
        duration: Infinity,
        action: {
          label: 'Atualizar',
          onClick: () => updateServiceWorker(true),
        },
      });
    }
  }, [needRefresh, updateServiceWorker]);

  return null;
};
