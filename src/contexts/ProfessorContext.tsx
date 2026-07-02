import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { calcularSemanaAtualDaFase, hojeBrasil } from '@/utils/timezone';

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

      // 2-6 EM PARALELO — antes era uma FILA de ~8 idas ao banco (login de ~7s).
      // Onda 1: profile (acima). Onda 2: tudo que só depende dele, junto.
      // Onda 3: as duas fases, juntas.
      const ehInfantilOuF1 =
        profileData.segmento === 'infantil' || profileData.segmento === 'fundamental1';

      const [professorCasaRes, institutionRes, turmaFirstRes, turmasVincRes] = await Promise.all([
        supabase
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
          .maybeSingle(),
        profileData?.institution_id
          ? supabase.from('institutions').select('name').eq('id', profileData.institution_id).single()
          : Promise.resolve({ data: null, error: null }),
        supabase
          .from('professor_turma')
          .select('turma_id, turmas!inner(serie)')
          .eq('professor_id', user.id)
          .eq('ativo', true)
          .limit(1),
        ehInfantilOuF1
          ? supabase
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
              .eq('ativo', true)
          : Promise.resolve({ data: null, error: null }),
      ]);

      // Casa mentor
      if (professorCasaRes.error) {
        console.error('Error fetching professor casa:', professorCasaRes.error);
      }
      let casaMentorData: Inteligencia | null = null;
      if ((professorCasaRes.data as any)?.inteligencias) {
        const intel = (professorCasaRes.data as any).inteligencias as unknown as Inteligencia;
        setCasaMentor(intel);
        casaMentorData = intel;
      }

      // Nome da instituição
      if (institutionRes.error) {
        console.error('Error fetching institution:', institutionRes.error);
      } else {
        setInstitutionName((institutionRes.data as { name?: string } | null)?.name || null);
      }

      // Série/turma de referência (1ª turma vinculada)
      let serieDosProfessor: number | null = null;
      let turmaIdDoProfessor: string | null = null;
      const turmasFirst = turmaFirstRes.data as any[] | null;
      if (turmasFirst && turmasFirst.length > 0) {
        turmaIdDoProfessor = (turmasFirst[0] as { turma_id: string }).turma_id;
        const turma = turmasFirst[0].turmas as unknown as { serie: string };
        serieDosProfessor = converterSerieTextoParaNumero(turma.serie);
      }

      // Turmas vinculadas (Infantil/F1)
      if (turmasVincRes.error) {
        console.error('Error fetching turmas vinculadas:', turmasVincRes.error);
      } else if (turmasVincRes.data) {
        const turmas = (turmasVincRes.data as any[]).map(t => {
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

      if (profileData?.institution_id) {
        // Campos da fase (usados pelo Infantil via marcador e por F1/F2 via data)
        const faseSelectFields = `
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
          `;

        const carregarFaseAtual = async () => {
          if (profileData.segmento === 'infantil') {
            // INFANTIL: a fase atual é "qual fase a turma está" (marcador turma_trilha), SEM datas.
            const anoLetivo = new Date().getFullYear();
            let faseInfantilSet = false;
            if (turmaIdDoProfessor) {
              const { data: trilha } = await supabase
                .from('turma_trilha')
                .select('ordem_atual')
                .eq('turma_id', turmaIdDoProfessor)
                .eq('ano_letivo', anoLetivo)
                .maybeSingle();
              const ordem = (trilha?.ordem_atual as number | undefined) ?? 0;
              if (ordem >= 1 && ordem <= 8) {
                // ordem == inteligencia_id (1..8) na sequência recomendada
                const { data: faseInf } = await supabase
                  .from('fases')
                  .select(faseSelectFields)
                  .eq('institution_id', profileData.institution_id)
                  .eq('segmento', 'infantil')
                  .eq('ano_letivo', anoLetivo)
                  .eq('inteligencia_id', ordem)
                  .maybeSingle();
                if (faseInf) {
                  setFaseAtual({
                    id: faseInf.id,
                    numero_fase: faseInf.numero_fase,
                    semana_atual: null,
                    data_inicio: faseInf.data_inicio,
                    data_fim: faseInf.data_fim,
                    inteligencia: faseInf.inteligencias as unknown as Inteligencia || null,
                  });
                  faseInfantilSet = true;
                }
              }
            }
            if (!faseInfantilSet) setFaseAtual(null);
          } else {
            // F1/F2: fase atual baseada nas DATAS (lógica original, intacta)
            const hoje = hojeBrasil();

            let faseQuery = supabase
              .from('fases')
              .select(faseSelectFields)
              .eq('institution_id', profileData.institution_id)
              .lte('data_inicio', hoje)
              .gte('data_fim', hoje);

            if (serieDosProfessor != null) {
              faseQuery = faseQuery.or(`serie.eq.${serieDosProfessor},serie.is.null`);
            }
            if (profileData.segmento) {
              faseQuery = faseQuery.or(`segmento.eq.${profileData.segmento},segmento.is.null`);
            }

            let { data: faseData, error: faseError } = await faseQuery.order('numero_fase', { ascending: true }).limit(1).maybeSingle();

            // Fallback: se nenhuma fase cobre hoje, buscar a próxima fase futura
            if (!faseData && !faseError) {
              let fallbackQuery = supabase
                .from('fases')
                .select(faseSelectFields)
                .eq('institution_id', profileData.institution_id)
                .gt('data_inicio', hoje);

              if (serieDosProfessor != null) {
                fallbackQuery = fallbackQuery.or(`serie.eq.${serieDosProfessor},serie.is.null`);
              }
              if (profileData.segmento) {
                fallbackQuery = fallbackQuery.or(`segmento.eq.${profileData.segmento},segmento.is.null`);
              }

              const fallback = await fallbackQuery.order('data_inicio', { ascending: true }).limit(1).maybeSingle();
              faseData = fallback.data;
              faseError = fallback.error;
            }

            if (faseError) {
              console.error('Error fetching fase atual:', faseError);
            } else if (faseData) {
              setFaseAtual({
                id: faseData.id,
                numero_fase: faseData.numero_fase,
                semana_atual: calcularSemanaAtualDaFase(faseData.data_inicio, faseData.data_fim),
                data_inicio: faseData.data_inicio,
                data_fim: faseData.data_fim,
                inteligencia: faseData.inteligencias as unknown as Inteligencia || null
              });
            }
          }
        };

        const carregarFaseCasaMentor = async () => {
          if (!casaMentorData) return;
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
        };

        await Promise.all([carregarFaseAtual(), carregarFaseCasaMentor()]);
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
    let channel: any = null;
    try {
      channel = supabase
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
    } catch (err) {
      console.warn('[ProfessorContext] WebSocket indisponível:', err);
    }
    return () => { if (channel) try { supabase.removeChannel(channel); } catch {} };
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
