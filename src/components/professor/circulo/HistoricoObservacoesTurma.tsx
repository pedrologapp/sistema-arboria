import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { History, Eye, Shuffle } from 'lucide-react';
import { formatarDataBrasil } from '@/utils/timezone';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface AlunoBasico {
  id: string;
  nome: string;
  nomeAbreviado: string;
  iniciais: string;
  avatarUrl?: string;
}

interface HistoricoObservacoesTurmaProps {
  turmaId: string;
  faseId: string;
  semanaSelecionada: number | null; // null = todas
  dataInicioFase: string;
  alunos: AlunoBasico[];
}

const calcularSemanaDaObservacao = (dataObs: string, dataInicioFase: string): number => {
  const [anoObs, mesObs, diaObs] = dataObs.split('-').map(Number);
  const [anoIni, mesIni, diaIni] = dataInicioFase.split('-').map(Number);
  const obs = new Date(anoObs, mesObs - 1, diaObs);
  const ini = new Date(anoIni, mesIni - 1, diaIni);
  const diffDias = Math.floor((obs.getTime() - ini.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDias < 0) return 0;
  if (diffDias <= 6) return 1;
  if (diffDias <= 13) return 2;
  if (diffDias <= 20) return 3;
  return 4;
};

const HistoricoObservacoesTurma = ({
  turmaId,
  faseId,
  semanaSelecionada,
  dataInicioFase,
  alunos,
}: HistoricoObservacoesTurmaProps) => {
  const { data: observacoes, isLoading } = useQuery({
    queryKey: ['historico-obs-turma', turmaId, faseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('observacoes')
        .select(`
          id,
          aluno_id,
          data_observacao,
          foi_cross_im,
          observacao_texto,
          created_at,
          sinal_id,
          sinais (
            emoji,
            label_pt,
            valencia
          ),
          profiles!observacoes_aluno_id_fkey (
            full_name,
            nome,
            sobrenome
          )
        `)
        .eq('turma_id', turmaId)
        .eq('fase_id', faseId)
        .is('excluida_em' as never, null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!turmaId && !!faseId,
  });

  // Filter by week
  const obsFiltradas = (observacoes || []).filter((o: any) => {
    if (semanaSelecionada === null) return true;
    return calcularSemanaDaObservacao(o.data_observacao, dataInicioFase) === semanaSelecionada;
  });

  // Find students not observed in selected week
  const alunosObservadosIds = new Set(obsFiltradas.map((o: any) => o.aluno_id));
  const alunosNaoObservados = alunos.filter(a => !alunosObservadosIds.has(a.id));

  if (isLoading) {
    return (
      <div className="space-y-3 mt-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 rounded-xl bg-white/5 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-2">
      {/* Header */}
      <div className="flex items-center gap-2 text-white/40 text-xs">
        <History className="w-3.5 h-3.5" strokeWidth={1.5} />
        <span className="uppercase tracking-wide">
          Observações {semanaSelecionada ? `— Semana ${semanaSelecionada}` : '— Todas'}
        </span>
        <span className="ml-auto text-white/30">{obsFiltradas.length} registros</span>
      </div>

      {/* Empty State */}
      {obsFiltradas.length === 0 && (
        <div className="rounded-xl bg-white/5 border border-violet-500/10 p-6 text-center">
          <Eye className="w-8 h-8 text-white/20 mx-auto mb-2" />
          <p className="text-white/40 text-sm">
            Nenhuma observação registrada nesta semana ainda.
          </p>
        </div>
      )}

      {/* Observation List */}
      {obsFiltradas.length > 0 && (
        <div className="space-y-2">
          {obsFiltradas.map((obs: any) => {
            const sinal = obs.sinais;
            const profile = obs.profiles;
            if (!sinal || !profile) return null;
            const nomeAluno = profile.full_name ||
              [profile.nome, profile.sobrenome].filter(Boolean).join(' ') || 'Aluno';
            const primeiroNome = profile.nome || profile.full_name?.split(' ')[0] || 'Aluno';

            return (
              <div
                key={obs.id}
                className="rounded-xl bg-white/5 border border-violet-500/10 p-3 space-y-1.5"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-base">{sinal.emoji}</span>
                  <span className="text-white/90 text-sm font-medium">{sinal.label_pt}</span>
                  <span className="text-white/40 text-xs">•</span>
                  <span className="text-white/70 text-sm">{primeiroNome}</span>

                  {obs.foi_cross_im && (
                    <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-[10px] px-1.5 py-0">
                      <Shuffle className="w-2.5 h-2.5 mr-0.5" />
                      Cross-IM
                    </Badge>
                  )}

                  <span className="ml-auto text-white/30 text-xs">
                    {formatarDataBrasil(obs.data_observacao, 'dd/MM')}
                  </span>
                </div>

                {obs.observacao_texto && (
                  <p className="text-white/50 text-xs leading-relaxed pl-7">
                    {obs.observacao_texto}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Students Not Yet Observed */}
      {alunosNaoObservados.length > 0 && (
        <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-4">
          <div className="flex items-center gap-2 text-amber-400/80 text-xs font-medium mb-3">
            <Eye className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>Ainda não observados ({alunosNaoObservados.length})</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {alunosNaoObservados.map(aluno => (
              <div
                key={aluno.id}
                className="flex items-center gap-1.5 bg-white/5 rounded-full px-2.5 py-1"
              >
                <Avatar className="h-5 w-5">
                  <AvatarImage src={aluno.avatarUrl} className="object-cover" />
                  <AvatarFallback className="text-[8px] text-white/60 bg-white/10">
                    {aluno.iniciais}
                  </AvatarFallback>
                </Avatar>
                <span className="text-white/60 text-xs">{aluno.nomeAbreviado}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoricoObservacoesTurma;
