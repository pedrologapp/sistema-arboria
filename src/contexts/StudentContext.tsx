// StudentContext - Contexto global para dados do aluno
import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

interface Profile {
  id: string;
  nome: string | null;
  sobrenome: string | null;
  full_name: string | null;
  serie: string | null;
  turma: string | null;
  casa_id: number | null;
  institution_id: string | null;
  institution: string | null;
  must_change_password: boolean | null;
  avatar_url: string | null;
}

interface Casa {
  id: number;
  nome: string;
  codigo: string;
  emoji: string | null;
  cor_hex: string | null;
  descricao: string | null;
  brasao_url: string | null;
}

interface InteligenciaScore {
  inteligencia_id: number;
  inteligencia_nome: string;
  inteligencia_codigo: string;
  inteligencia_emoji: string | null;
  inteligencia_cor: string | null;
  inteligencia_brasao_url: string | null;
  score_atual: number;
  total_evidencias: number;
  eh_casa_do_aluno: boolean;
}

interface RankingInfo {
  total_pontos: number;
  posicao_na_casa: number;
  missoes_completadas: number;
}

interface FaseAtual {
  id: string;
  numero_fase: number;
  semana_atual: number | null;
  data_inicio: string;
  data_fim: string;
  inteligencia: {
    id: number;
    nome: string;
    codigo: string;
    emoji: string | null;
    cor_hex: string | null;
  } | null;
}

interface StudentContextType {
  profile: Profile | null;
  casa: Casa | null;
  casaColor: string;
  institutionName: string | null;
  ranking: RankingInfo;
  inteligenciaScores: InteligenciaScore[];
  faseAtual: FaseAtual | null;
  isLoading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
}

const defaultRanking: RankingInfo = {
  total_pontos: 0,
  posicao_na_casa: 0,
  missoes_completadas: 0,
};

const StudentContext = createContext<StudentContextType | undefined>(undefined);

export const useStudent = () => {
  const context = useContext(StudentContext);
  if (context === undefined) {
    throw new Error('useStudent must be used within a StudentProvider');
  }
  return context;
};

interface StudentProviderProps {
  children: ReactNode;
}

export const StudentProvider = ({ children }: StudentProviderProps) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [casa, setCasa] = useState<Casa | null>(null);
  const [institutionName, setInstitutionName] = useState<string | null>(null);
  const [ranking, setRanking] = useState<RankingInfo>(defaultRanking);
  const [inteligenciaScores, setInteligenciaScores] = useState<InteligenciaScore[]>([]);
  const [faseAtual, setFaseAtual] = useState<FaseAtual | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStudentData = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 1. Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // 2. Fetch casa (if casa_id exists)
      if (profileData?.casa_id) {
        const { data: casaData, error: casaError } = await supabase
          .from('inteligencias')
          .select('*')
          .eq('id', profileData.casa_id)
          .single();

        if (!casaError && casaData) {
          setCasa(casaData);
        }
      }

      // 3. Fetch institution name and fase atual
      if (profileData?.institution_id) {
        const { data: instData } = await supabase
          .from('institutions')
          .select('name')
          .eq('id', profileData.institution_id)
          .single();

        if (instData) {
          setInstitutionName(instData.name);
        }

        // 3.5. Fetch fase atual (filtrada por segmento e série do aluno)
        let faseQuery = supabase
          .from('fases')
          .select(`
            id,
            numero_fase,
            semana_atual,
            data_inicio,
            data_fim,
            inteligencia:inteligencias!inteligencia_id (
              id,
              nome,
              codigo,
              emoji,
              cor_hex
            )
          `)
          .eq('institution_id', profileData.institution_id)
          .eq('ativo', true);

        // Filtrar por segmento do aluno
        if (profileData.serie) {
          // Extrair número da série para filtro
          const serieNum = parseInt(profileData.serie);
          if (!isNaN(serieNum)) {
            faseQuery = faseQuery.eq('serie', serieNum);
          }
        }

        const { data: faseData } = await faseQuery
          .order('numero_fase')
          .limit(1)
          .maybeSingle();

        if (faseData) {
          const inteligenciaData = Array.isArray(faseData.inteligencia) 
            ? faseData.inteligencia[0] 
            : faseData.inteligencia;
          
          setFaseAtual({
            id: faseData.id,
            numero_fase: faseData.numero_fase,
            semana_atual: faseData.semana_atual,
            data_inicio: faseData.data_inicio,
            data_fim: faseData.data_fim,
            inteligencia: inteligenciaData,
          });
        }
      }

      // 4. Fetch ranking info from view
      const { data: rankingData } = await supabase
        .from('ranking_alunos_por_casa')
        .select('total_pontos, posicao_na_casa, missoes_completadas')
        .eq('aluno_id', user.id)
        .maybeSingle();

      // 4.1 Calcular posição correta baseada em pontos (workaround para bug da view)
      let posicaoCalculada = rankingData?.posicao_na_casa || 0;
      
      if (profileData?.casa_id && profileData?.institution_id) {
        const { data: membrosCasa } = await supabase
          .from('ranking_alunos_por_casa')
          .select('aluno_id, total_pontos')
          .eq('casa_id', profileData.casa_id)
          .eq('institution_id', profileData.institution_id);

        if (membrosCasa && membrosCasa.length > 0) {
          // Ordenar por pontos (maior primeiro)
          const ordenado = [...membrosCasa].sort((a, b) => 
            (b.total_pontos || 0) - (a.total_pontos || 0)
          );
          
          // Encontrar posição do aluno atual (index + 1)
          const minhaPosicao = ordenado.findIndex(m => m.aluno_id === user.id) + 1;
          posicaoCalculada = minhaPosicao || 1;
        }
      }

      setRanking({
        total_pontos: rankingData?.total_pontos || 0,
        posicao_na_casa: posicaoCalculada,
        missoes_completadas: rankingData?.missoes_completadas || 0,
      });

      // 5. Fetch inteligencia scores from view
      const { data: scoresData } = await supabase
        .from('perfil_inteligencias_aluno')
        .select('*')
        .eq('aluno_id', user.id)
        .order('inteligencia_id');

      if (scoresData) {
        setInteligenciaScores(scoresData.map(s => ({
          inteligencia_id: s.inteligencia_id || 0,
          inteligencia_nome: s.inteligencia_nome || '',
          inteligencia_codigo: s.inteligencia_codigo || '',
          inteligencia_emoji: s.inteligencia_emoji,
          inteligencia_cor: s.inteligencia_cor,
          inteligencia_brasao_url: (s as Record<string, unknown>).inteligencia_brasao_url as string | null || null,
          score_atual: Number(s.score_atual) || 0,
          total_evidencias: s.total_evidencias || 0,
          eh_casa_do_aluno: s.eh_casa_do_aluno || false,
        })));
      }

    } catch (err) {
      console.error('Error fetching student data:', err);
      setError('Erro ao carregar dados do aluno');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchStudentData();
  }, [fetchStudentData]);

  const casaColor = casa?.cor_hex || '#6366f1'; // fallback to indigo

  const value: StudentContextType = {
    profile,
    casa,
    casaColor,
    institutionName,
    ranking,
    inteligenciaScores,
    faseAtual,
    isLoading,
    error,
    refreshData: fetchStudentData,
  };

  return <StudentContext.Provider value={value}>{children}</StudentContext.Provider>;
};
