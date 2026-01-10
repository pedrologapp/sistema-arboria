import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  full_name: string | null;
  nome: string | null;
  sobrenome: string | null;
  avatar_url: string | null;
  institution_id: string | null;
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

interface ProfessorContextType {
  profile: Profile | null;
  casaMentor: Inteligencia | null;
  casaColor: string;
  institutionName: string | null;
  faseAtual: FaseAtual | null;
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
        .select('id, full_name, nome, sobrenome, avatar_url, institution_id')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

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

      if (professorCasaData?.inteligencias) {
        const intel = professorCasaData.inteligencias as unknown as Inteligencia;
        setCasaMentor(intel);
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

        // 4. Fetch fase atual
        const { data: faseData, error: faseError } = await supabase
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
          .eq('ativo', true)
          .maybeSingle();

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

  const casaColor = casaMentor?.cor_hex || '#6366f1';

  const value: ProfessorContextType = {
    profile,
    casaMentor,
    casaColor,
    institutionName,
    faseAtual,
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
