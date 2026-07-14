import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';

/**
 * Contexto do COORDENADOR (papel novo, só leitura). Enxuto de propósito:
 * o coordenador não tem casa/mentor/fase própria; ele só precisa de identidade
 * (nome, avatar), instituição e a lista de segmentos concedidos (para o rótulo
 * do header). O escopo REAL das turmas é imposto no banco (RLS +
 * coordenador_segmento), nunca calculado aqui.
 */

const fromAny = (tb: string) =>
  (supabase.from as never as (tb: string) => ReturnType<typeof supabase.from>)(tb);

type Segmento = 'infantil' | 'fundamental1' | 'fundamental2';

interface CoordenadorProfile {
  id: string;
  full_name: string | null;
  nome: string | null;
  sobrenome: string | null;
  avatar_url: string | null;
  institution_id: string | null;
}

interface CoordenadorContextType {
  profile: CoordenadorProfile | null;
  institutionName: string | null;
  institutionId: string | null;
  /** Segmentos concedidos ao coordenador (lidos de coordenador_segmento, ativos). */
  segmentos: Segmento[];
  isLoading: boolean;
  error: string | null;
}

const CoordenadorContext = createContext<CoordenadorContextType | undefined>(undefined);

export const useCoordenador = () => {
  const ctx = useContext(CoordenadorContext);
  if (!ctx) throw new Error('useCoordenador must be used within a CoordenadorProvider');
  return ctx;
};

export const CoordenadorProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<CoordenadorProfile | null>(null);
  const [institutionName, setInstitutionName] = useState<string | null>(null);
  const [segmentos, setSegmentos] = useState<Segmento[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }
      try {
        setIsLoading(true);
        setError(null);

        const { data: prof, error: profErr } = await supabase
          .from('profiles')
          .select('id, full_name, nome, sobrenome, avatar_url, institution_id')
          .eq('id', user.id)
          .single();
        if (profErr) throw profErr;
        if (!mounted) return;
        setProfile(prof as CoordenadorProfile);

        const [instRes, segRes] = await Promise.all([
          prof?.institution_id
            ? supabase.from('institutions').select('name').eq('id', prof.institution_id).single()
            : Promise.resolve({ data: null, error: null }),
          // Segmentos concedidos (tolerante: tabela pode não estar nos tipos gerados).
          fromAny('coordenador_segmento')
            .select('segmento')
            .eq('coordenador_id', user.id)
            .eq('ativo', true),
        ]);

        if (!mounted) return;
        setInstitutionName((instRes.data as { name?: string } | null)?.name || null);

        const segs = ((segRes.data as Array<{ segmento: Segmento }> | null) || [])
          .map((r) => r.segmento)
          .filter(Boolean);
        setSegmentos([...new Set(segs)]);
      } catch (err) {
        console.error('Error fetching coordenador data:', err);
        if (mounted) setError('Erro ao carregar dados do coordenador');
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  const value: CoordenadorContextType = {
    profile,
    institutionName,
    institutionId: profile?.institution_id ?? null,
    segmentos,
    isLoading,
    error,
  };

  return <CoordenadorContext.Provider value={value}>{children}</CoordenadorContext.Provider>;
};
