import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, LayoutGrid, CheckCircle, AlertCircle } from 'lucide-react';

type Segmento = 'infantil' | 'fundamental1' | 'fundamental2';

interface TabelaVisaoGeralProps {
  institutionId: string;
}

const SERIES_POR_SEGMENTO: Record<Segmento, number[]> = {
  infantil: [2, 3, 4, 5],
  fundamental1: [1, 2, 3, 4, 5],
  fundamental2: [6, 7, 8, 9],
};

const SEGMENTO_LABELS: Record<Segmento, string> = {
  infantil: 'Infantil',
  fundamental1: 'Fund. I',
  fundamental2: 'Fund. II',
};

const TabelaVisaoGeralProfessores = ({ institutionId }: TabelaVisaoGeralProps) => {
  const [segmentoVisao, setSegmentoVisao] = useState<Segmento>('fundamental2');

  // Buscar turmas com vínculos de professores
  const { data: turmasData, isLoading: loadingTurmas } = useQuery({
    queryKey: ['quadro-turmas-professores', institutionId],
    queryFn: async () => {
      // Buscar turmas com segmento
      const { data: turmas, error: turmasError } = await supabase
        .from('turmas')
        .select('id, nome, serie, turma_letra, segmento')
        .eq('institution_id', institutionId)
        .order('serie')
        .order('turma_letra');

      if (turmasError) throw turmasError;

      // Buscar vínculos professor_turma ativos (sem JOIN)
      const { data: vinculos } = await supabase
        .from('professor_turma')
        .select('turma_id, professor_id')
        .eq('institution_id', institutionId)
        .eq('ativo', true);

      // Buscar nomes dos professores separadamente
      const professorIds = [...new Set(vinculos?.map(v => v.professor_id) || [])];
      let professorMap = new Map<string, string>();
      
      if (professorIds.length > 0) {
        const { data: professores } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', professorIds);
        
        professorMap = new Map(professores?.map(p => [p.id, p.full_name || '']) || []);
      }

      // Mapear turmas com TODOS os professores (múltiplos vínculos)
      const turmasComProfessor = turmas?.map(turma => {
        const vinculosTurma = vinculos?.filter(v => v.turma_id === turma.id) || [];
        const professores = vinculosTurma.map(v => ({
          id: v.professor_id,
          nome: professorMap.get(v.professor_id) || 'Sem nome'
        }));
        return {
          ...turma,
          professores,
        };
      }) || [];

      return turmasComProfessor;
    },
    enabled: !!institutionId
  });

  // Buscar casas com mentores (para F2)
  const { data: casasData, isLoading: loadingCasas } = useQuery({
    queryKey: ['quadro-casas-mentores', institutionId],
    queryFn: async () => {
      // Buscar casas/inteligências
      const { data: casas } = await supabase
        .from('inteligencias')
        .select('id, nome, emoji, codigo')
        .order('id');

      // Buscar mentores (sem JOIN)
      const { data: mentores } = await supabase
        .from('professor_casa')
        .select('casa_id, professor_id, eh_mentor_principal')
        .eq('institution_id', institutionId)
        .eq('ativo', true);

      // Buscar nomes dos mentores separadamente
      const mentorIds = [...new Set(mentores?.map(m => m.professor_id) || [])];
      let mentorMap = new Map<string, string>();
      
      if (mentorIds.length > 0) {
        const { data: mentoresProfiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', mentorIds);
        
        mentorMap = new Map(mentoresProfiles?.map(p => [p.id, p.full_name || '']) || []);
      }

      // Mapear casas com mentores
      const casasComMentor = casas?.map(casa => {
        const mentor = mentores?.find(m => m.casa_id === casa.id);
        return {
          ...casa,
          professor_id: mentor?.professor_id || null,
          professor_nome: mentor ? mentorMap.get(mentor.professor_id) || null : null,
          eh_mentor_principal: mentor?.eh_mentor_principal || false
        };
      }) || [];

      return casasComMentor;
    },
    enabled: !!institutionId && segmentoVisao === 'fundamental2'
  });

  // Filtrar turmas pelo segmento selecionado (usando coluna segmento da tabela)
  const turmasFiltradas = turmasData?.filter(turma => 
    turma.segmento === segmentoVisao
  ) || [];

  // Estatísticas para turmas
  const comProfessor = turmasFiltradas.filter(t => (t.professores?.length ?? 0) > 0).length;
  const semProfessor = turmasFiltradas.filter(t => (t.professores?.length ?? 0) === 0).length;

  // Estatísticas para casas (F2)
  const casasComMentor = casasData?.filter(c => c.professor_id).length || 0;
  const casasSemMentor = casasData?.filter(c => !c.professor_id).length || 0;

  const isLoading = loadingTurmas || (segmentoVisao === 'fundamental2' && loadingCasas);

  return (
    <div className="mt-8 bg-white/5 border border-white/10 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <LayoutGrid className="w-5 h-5 text-white/60" />
        <h3 className="text-white font-medium">Visão Geral: Turmas e Professores</h3>
      </div>

      {/* Tabs de Segmento */}
      <div className="flex gap-2 mb-4">
        {(Object.keys(SEGMENTO_LABELS) as Segmento[]).map(seg => (
          <button
            key={seg}
            onClick={() => setSegmentoVisao(seg)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              segmentoVisao === seg
                ? 'bg-white text-black'
                : 'bg-white/10 text-white/60 hover:bg-white/20'
            }`}
          >
            {SEGMENTO_LABELS[seg]}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-white/40 animate-spin" />
        </div>
      ) : (
        <>
          {/* Tabela para Infantil e Fund. I (Turmas) */}
          {segmentoVisao !== 'fundamental2' && (
            <>
              <div className="overflow-x-auto rounded-lg border border-white/10">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 hover:bg-transparent">
                      <TableHead className="text-white/60 text-xs uppercase">Turma</TableHead>
                      <TableHead className="text-white/60 text-xs uppercase">Professor</TableHead>
                      <TableHead className="text-white/60 text-xs uppercase text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {turmasFiltradas.length === 0 ? (
                      <TableRow className="border-white/10">
                        <TableCell colSpan={3} className="text-center text-white/40 py-8">
                          Nenhuma turma cadastrada para este segmento
                        </TableCell>
                      </TableRow>
                    ) : (
                      turmasFiltradas.map(turma => (
                        <TableRow key={turma.id} className="border-white/10 hover:bg-white/5">
                          <TableCell className="text-white text-sm font-medium">
                            {turma.nome}
                          </TableCell>
                          <TableCell className="text-white/80 text-sm">
                            {turma.professores.length > 0
                              ? turma.professores.map(p => p.nome).join(', ')
                              : '-'}
                          </TableCell>
                          <TableCell className="text-center">
                            {turma.professores.length > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
                                <CheckCircle className="w-3 h-3" />
                                {turma.professores.length} prof.
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">
                                <AlertCircle className="w-3 h-3" />
                                Sem professor
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Resumo */}
              <div className="mt-4 flex gap-4 text-sm">
                <span className="text-green-400 flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" />
                  {comProfessor} turmas atribuídas
                </span>
                <span className="text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {semProfessor} turmas sem professor
                </span>
              </div>
            </>
          )}

          {/* Tabela para Fundamental 2 (Casas) */}
          {segmentoVisao === 'fundamental2' && (
            <>
              <div className="overflow-x-auto rounded-lg border border-white/10">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 hover:bg-transparent">
                      <TableHead className="text-white/60 text-xs uppercase">Casa</TableHead>
                      <TableHead className="text-white/60 text-xs uppercase">Mentor</TableHead>
                      <TableHead className="text-white/60 text-xs uppercase text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {casasData?.map(casa => (
                      <TableRow key={casa.id} className="border-white/10 hover:bg-white/5">
                        <TableCell className="text-white text-sm font-medium">
                          <span className="mr-2">{casa.emoji}</span>
                          {casa.nome}
                        </TableCell>
                        <TableCell className="text-white/80 text-sm">
                          {casa.professor_nome || '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          {casa.professor_id ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
                              <CheckCircle className="w-3 h-3" />
                              Atribuído
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full">
                              <AlertCircle className="w-3 h-3" />
                              Sem mentor
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Resumo */}
              <div className="mt-4 flex gap-4 text-sm">
                <span className="text-green-400 flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" />
                  {casasComMentor} casas com mentor
                </span>
                <span className="text-amber-400 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {casasSemMentor} casas sem mentor
                </span>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default TabelaVisaoGeralProfessores;
