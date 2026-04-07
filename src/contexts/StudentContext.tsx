// StudentContext - Contexto global para dados do aluno
import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { calcularSemanaAtualDaFase } from '@/utils/timezone';

interface Profile {
  id: string;
  nome: string | null;
  sobrenome: string | null;
  full_name: string | null;
  serie: string | null;
  turma: string | null;
  segmento: string | null;
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
      // 1. Fetch profile first (needed for subsequent queries)
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // 2. Fetch everything else IN PARALLEL
      const serieNum = profileData?.serie ? parseInt(profileData.serie) : null;

      // Build fase query
      let faseQuery = supabase
        .from('fases')
        .select('id, numero_fase, semana_atual, data_inicio, data_fim, inteligencia:inteligencias!inteligencia_id(id, nome, codigo, emoji, cor_hex)')
        .eq('institution_id', profileData.institution_id)
        .eq('ativo', true);
      if (profileData.segmento) faseQuery = faseQuery.or(`segmento.eq.${profileData.segmento},segmento.is.null`);
      if (serieNum) faseQuery = faseQuery.or(`serie.eq.${serieNum},serie.is.null`);

      const [casaRes, instRes, faseRes, rankingRes, membrosRes, scoresRes] = await Promise.all([
        // Casa
        profileData?.casa_id
          ? supabase.from('inteligencias').select('*').eq('id', profileData.casa_id).single()
          : Promise.resolve({ data: null, error: null }),
        // Institution
        profileData?.institution_id
          ? supabase.from('institutions').select('name').eq('id', profileData.institution_id).single()
          : Promise.resolve({ data: null, error: null }),
        // Fase atual
        profileData?.institution_id
          ? faseQuery.order('numero_fase').limit(1).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        // Ranking do aluno
        supabase.from('ranking_alunos_por_casa').select('total_pontos, posicao_na_casa, missoes_completadas').eq('aluno_id', user.id).maybeSingle(),
        // Membros da casa (para calcular posicao correta)
        profileData?.casa_id && profileData?.institution_id
          ? supabase.from('ranking_alunos_por_casa').select('aluno_id, total_pontos').eq('casa_id', profileData.casa_id).eq('institution_id', profileData.institution_id)
          : Promise.resolve({ data: null, error: null }),
        // Scores de inteligencia
        supabase.from('perfil_inteligencias_aluno').select('*').eq('aluno_id', user.id).order('inteligencia_id'),
      ]);

      // Process casa
      if (casaRes.data) setCasa(casaRes.data);

      // Process institution
      if (instRes.data) setInstitutionName((instRes.data as any).name);

      // Process fase
      if (faseRes.data) {
        const faseData = faseRes.data as any;
        const inteligenciaData = Array.isArray(faseData.inteligencia) ? faseData.inteligencia[0] : faseData.inteligencia;
        setFaseAtual({
          id: faseData.id,
          numero_fase: faseData.numero_fase,
          semana_atual: calcularSemanaAtualDaFase(faseData.data_inicio, faseData.data_fim),
          data_inicio: faseData.data_inicio,
          data_fim: faseData.data_fim,
          inteligencia: inteligenciaData,
        });
      }

      // Process ranking with correct position
      let posicaoCalculada = rankingRes.data?.posicao_na_casa || 0;
      if (membrosRes.data && membrosRes.data.length > 0) {
        const ordenado = [...membrosRes.data].sort((a: any, b: any) => (b.total_pontos || 0) - (a.total_pontos || 0));
        const minhaPosicao = ordenado.findIndex((m: any) => m.aluno_id === user.id) + 1;
        posicaoCalculada = minhaPosicao || 1;
      }
      setRanking({
        total_pontos: rankingRes.data?.total_pontos || 0,
        posicao_na_casa: posicaoCalculada,
        missoes_completadas: rankingRes.data?.missoes_completadas || 0,
      });

      // Process scores
      if (scoresRes.data) {
        setInteligenciaScores(scoresRes.data.map((s: any) => ({
          inteligencia_id: s.inteligencia_id || 0,
          inteligencia_nome: s.inteligencia_nome || '',
          inteligencia_codigo: s.inteligencia_codigo || '',
          inteligencia_emoji: s.inteligencia_emoji,
          inteligencia_cor: s.inteligencia_cor,
          inteligencia_brasao_url: s.inteligencia_brasao_url || null,
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
