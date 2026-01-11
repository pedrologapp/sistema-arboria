import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface AnalisarObservacoesParams {
  alunoId: string;
}

interface AnaliseResult {
  success: boolean;
  analise?: {
    estado: 'precisa_atencao' | 'celebrar' | 'neutro';
    deve_gerar_alerta: boolean;
    alerta?: {
      sinal_principal: string;
      sinal_codigo: string;
      quantidade: number;
      texto_acontecendo: string;
      contexto: string[];
      hipoteses: { titulo: string; descricao: string }[];
    };
  };
  aluno?: {
    id: string;
    nome: string;
  };
  message?: string;
  error?: string;
}

export const useAnalisarObservacoes = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ alunoId }: AnalisarObservacoesParams): Promise<AnaliseResult> => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analisar-observacoes`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ aluno_id: alunoId }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate the student profile query to refresh alert data
      queryClient.invalidateQueries({ queryKey: ['perfil-aluno', variables.alunoId] });
    },
  });
};

// Helper to check if analysis is needed (older than 1 hour)
export const shouldRefreshAnalysis = (timestampAnalise: string | undefined): boolean => {
  if (!timestampAnalise) return true;
  
  const analysisTime = new Date(timestampAnalise).getTime();
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  
  return now - analysisTime > oneHour;
};
