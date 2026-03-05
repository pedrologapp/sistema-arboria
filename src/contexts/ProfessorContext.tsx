import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';

type Segmento = 'infantil' | 'fundamental1' | 'fundamental2';

/**
 * Converte nome de série (texto) para número equivalente usado na tabela fases.
 * Ex: "Grupo V" → 5, "Maternal II" → 2, "1º Ano" → 1
 */
const converterSerieTextoParaNumero = (serieTexto: string): number | null => {
  if (!serieTexto) return null;
  const texto = serieTexto.trim().toLowerCase();

  // Mapa de algarismos romanos
  const romanos: Record<string, number> = {
    'i': 1, 'ii': 2, 'iii': 3, 'iv': 4, 'v': 5,
    'vi': 6, 'vii': 7, 'viii': 8, 'ix': 9
  };

  // Tentar extrair romano no final: "Grupo V" → "v" → 5
  const matchRomano = texto.match(/\b(ix|viii|vii|vi|iv|iii|ii|v|i)\s*$/);
  if (matchRomano) {
    return romanos[matchRomano[1]] ?? null;
  }

  // Tentar extrair número arábico: "1º Ano" → 1, "5º ano" → 5
  const matchNumero = texto.match(/(\d+)/);
  if (matchNumero) {
    return parseInt(matchNumero[1], 10);
  }

  return null;
};

interface Profile {
  id: string;
  full_name: string | null;
  nome: string | null;
  sobrenome: string | null;
  avatar_url: string | null;
  institution_id: string | null;
  segmento: Segmento | null;
}

interface Inteligencia {
  id: number;
  nome: string;
  codigo: string;
  cor_hex: string | null;
  emoji: string | null;
  brasao_url: string | null;
  descricao: string | null;
}

interface FaseAtual {
  id: string;
  numero_fase: number;
  semana_atual: number | null;
  data_inicio: string;
  data_fim: string;
  inteligencia: Inteligencia | null;
}

interface FaseCasaMentor {
  id: string;
  numero_fase: number;
  data_inicio: string;
  data_fim: string;
  inteligencia_id: number;
}

interface TurmaVinculada {
  id: string;
  nome: string;
  serie: number;
  turma_letra: string;
}

interface ProfessorContextType {
  profile: Profile | null;
  casaMentor: Inteligencia | null;
  casaColor: string;
  institutionName: string | null;
  faseAtual: FaseAtual | null;
  faseCasaMentor: FaseCasaMentor | null;
  segmento: Segmento | null;
  turmasVinculadas: TurmaVinculada[] | null;
  isLoading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
}

const ProfessorContext = createContext<ProfessorContextType | undefined>(undefined);

export const useProfessor = () => {
  const context = useContext(ProfessorContext);
  if (!context) {
    throw new Error('useProfessor must be used within a ProfessorProvider');
  }
  return context;
};

interface ProfessorProviderProps {
  children: ReactNode;
}

export const ProfessorProvider = ({ children }: ProfessorProviderProps) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [casaMentor, setCasaMentor] = useState<Inteligencia | null>(null);
  const [institutionName, setInstitutionName] = useState<string | null>(null);
  const [faseAtual, setFaseAtual] = useState<FaseAtual | null>(null);
  const [faseCasaMentor, setFaseCasaMentor] = useState<FaseCasaMentor | null>(null);
  const [turmasVinculadas, setTurmasVinculadas] = useState<TurmaVinculada[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfessorData = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // 1. Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, nome, sobrenome, avatar_url, institution_id, segmento')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData as Profile);

      // 2. Fetch casa mentor (via professor_casa)
      const { data: professorCasaData, error: professorCasaError } = await supabase
        .from('professor_casa')
        .select(`
          casa_id,
          inteligencias!professor_casa_casa_id_fkey (
            id,
            nome,
            codigo,
            cor_hex,
            emoji,
            brasao_url,
            descricao
          )
        `)
        .eq('professor_id', user.id)
        .eq('ativo', true)
        .eq('eh_mentor_principal', true)
        .maybeSingle();

      if (professorCasaError) {
        console.error('Error fetching professor casa:', professorCasaError);
      }

      let casaMentorData: Inteligencia | null = null;
      if (professorCasaData?.inteligencias) {
        const intel = professorCasaData.inteligencias as unknown as Inteligencia;
        setCasaMentor(intel);
        casaMentorData = intel;
      }

      // 3. Fetch institution name
      if (profileData?.institution_id) {
        const { data: institutionData, error: institutionError } = await supabase
          .from('institutions')
          .select('name')
          .eq('id', profileData.institution_id)
          .single();

        if (institutionError) {
          console.error('Error fetching institution:', institutionError);
        } else {
          setInstitutionName(institutionData?.name || null);
        }

        // 4. Fetch fase atual - filtrar pela serie das turmas vinculadas
        // First get the teacher's series from turmas
        let serieDosProfessor: number | null = null;
        {
          const { data: turmasData } = await supabase
            .from('professor_turma')
            .select('turmas!inner(serie)')
            .eq('professor_id', user.id)
            .eq('ativo', true)
            .limit(1);
          
          if (turmasData && turmasData.length > 0) {
            const turma = turmasData[0].turmas as unknown as { serie: string };
            serieDosProfessor = converterSerieTextoParaNumero(turma.serie);
            console.log('[ProfessorContext] serie texto:', turma.serie, '→ número:', serieDosProfessor);
          }
        }

        let faseQuery = supabase
          .from('fases')
          .select(`
            id,
            numero_fase,
            semana_atual,
            data_inicio,
            data_fim,
            inteligencias!fases_inteligencia_id_fkey (
              id,
              nome,
              codigo,
              cor_hex,
              emoji,
              brasao_url,
              descricao
            )
          `)
          .eq('institution_id', profileData.institution_id)
          .eq('ativo', true);

        // Filter by serie if professor has turmas
        if (serieDosProfessor != null) {
          faseQuery = faseQuery.eq('serie', serieDosProfessor);
        }
        if (profileData.segmento) {
          faseQuery = faseQuery.eq('segmento', profileData.segmento);
        }

        const { data: faseData, error: faseError } = await faseQuery.maybeSingle();

        if (faseError) {
          console.error('Error fetching fase atual:', faseError);
        } else if (faseData) {
          setFaseAtual({
            id: faseData.id,
            numero_fase: faseData.numero_fase,
            semana_atual: faseData.semana_atual,
            data_inicio: faseData.data_inicio,
            data_fim: faseData.data_fim,
            inteligencia: faseData.inteligencias as unknown as Inteligencia || null
          });
        }

        // 5. Fetch fase da casa do mentor (para o banner informativo)
        if (casaMentorData) {
          const { data: faseProfData, error: faseProfError } = await supabase
            .from('fases')
            .select('id, numero_fase, data_inicio, data_fim, inteligencia_id')
            .eq('institution_id', profileData.institution_id)
            .eq('inteligencia_id', casaMentorData.id)
            .eq('ano_letivo', new Date().getFullYear())
            .maybeSingle();

          if (faseProfError) {
            console.error('Error fetching fase casa mentor:', faseProfError);
          } else if (faseProfData) {
            setFaseCasaMentor(faseProfData);
          }
        }

        // 6. Fetch turmas vinculadas (para Infantil/F1)
        if (profileData.segmento === 'infantil' || profileData.segmento === 'fundamental1') {
          const { data: turmasData, error: turmasError } = await supabase
            .from('professor_turma')
            .select(`
              turma_id,
              turmas!inner (
                id,
                nome,
                serie,
                turma_letra
              )
            `)
            .eq('professor_id', user.id)
            .eq('ativo', true);

          if (turmasError) {
            console.error('Error fetching turmas vinculadas:', turmasError);
          } else if (turmasData) {
            const turmas = turmasData.map(t => {
              const turma = t.turmas as unknown as TurmaVinculada;
              return {
                id: turma.id,
                nome: turma.nome,
                serie: turma.serie,
                turma_letra: turma.turma_letra
              };
            });
            setTurmasVinculadas(turmas);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching professor data:', err);
      setError('Erro ao carregar dados do professor');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchProfessorData();
  }, [fetchProfessorData]);

  // Realtime: recarregar quando fases mudam (admin ativa/desativa)
  useEffect(() => {
    if (!profile?.institution_id) return;

    const channel = supabase
      .channel('professor-fases-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'fases',
          filter: `institution_id=eq.${profile.institution_id}`,
        },
        (payload) => {
          console.log('[ProfessorContext] fase alterada via realtime:', payload.eventType);
          fetchProfessorData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.institution_id, fetchProfessorData]);

  const casaColor = casaMentor?.cor_hex || '#6366f1';

  const value: ProfessorContextType = {
    profile,
    casaMentor,
    casaColor,
    institutionName,
    faseAtual,
    faseCasaMentor,
    segmento: profile?.segmento || null,
    turmasVinculadas,
    isLoading,
    error,
    refreshData: fetchProfessorData
  };

  return (
    <ProfessorContext.Provider value={value}>
      {children}
    </ProfessorContext.Provider>
  );
};
