import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { RefreshCw, Users, Database, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

interface ModalSincronizarScoresProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  institutionId: string;
}

type TipoFiltro = 'aluno' | 'turma' | 'serie' | 'todos';

interface AlunoData {
  id: string;
  full_name: string;
  matricula_externa: string | null;
  serie: string | null;
  turma: string | null;
  casa_id: number | null;
  casa_nome: string | null;
}

interface ScoreData {
  aluno_id: string;
  inteligencia_id: number;
  inteligencia_codigo: string;
  inteligencia_nome: string;
  score_atual: number;
  score_ultima_fase: number | null;
  total_evidencias: number;
  fase_atual: number;
}

const ModalSincronizarScores = ({
  open,
  onOpenChange,
  institutionId,
}: ModalSincronizarScoresProps) => {
  const [tipoFiltro, setTipoFiltro] = useState<TipoFiltro>('todos');
  const [alunoSelecionado, setAlunoSelecionado] = useState<string>('');
  const [turmaSelecionada, setTurmaSelecionada] = useState<string>('');
  const [serieSelecionada, setSerieSelecionada] = useState<string>('');
  const [anoLetivo, setAnoLetivo] = useState<number>(new Date().getFullYear());
  const [isSyncing, setIsSyncing] = useState(false);
  const [resultado, setResultado] = useState<'sucesso' | 'erro' | null>(null);
  const [mensagemResultado, setMensagemResultado] = useState('');

  // Reset selections when filter type changes
  useEffect(() => {
    setAlunoSelecionado('');
    setTurmaSelecionada('');
    setSerieSelecionada('');
  }, [tipoFiltro]);

  // Fetch all students for the institution
  const { data: alunos = [], isLoading: loadingAlunos } = useQuery({
    queryKey: ['sync-alunos', institutionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          matricula_externa,
          serie,
          turma,
          casa_id,
          inteligencias!profiles_casa_id_fkey(nome)
        `)
        .eq('institution_id', institutionId)
        .order('serie')
        .order('turma')
        .order('full_name');

      if (error) throw error;

      // Filter only students by checking user_roles
      const { data: studentRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'user');

      const studentIds = new Set(studentRoles?.map((r) => r.user_id) || []);

      return (data || [])
        .filter((p) => studentIds.has(p.id))
        .map((p) => ({
          id: p.id,
          full_name: p.full_name || 'Sem nome',
          matricula_externa: p.matricula_externa,
          serie: p.serie,
          turma: p.turma,
          casa_id: p.casa_id,
          casa_nome: (p.inteligencias as any)?.nome || null,
        })) as AlunoData[];
    },
    enabled: open && !!institutionId,
  });

  // Extract unique turmas and series
  const turmas = useMemo(() => {
    const uniqueTurmas = new Set<string>();
    alunos.forEach((a) => {
      if (a.serie && a.turma) {
        uniqueTurmas.add(`${a.serie} - ${a.turma}`);
      }
    });
    return Array.from(uniqueTurmas).sort();
  }, [alunos]);

  const series = useMemo(() => {
    const uniqueSeries = new Set<string>();
    alunos.forEach((a) => {
      if (a.serie) {
        uniqueSeries.add(a.serie);
      }
    });
    return Array.from(uniqueSeries).sort();
  }, [alunos]);

  // Calculate filtered students based on selection
  const alunosFiltrados = useMemo(() => {
    switch (tipoFiltro) {
      case 'aluno':
        return alunos.filter((a) => a.id === alunoSelecionado);
      case 'turma':
        if (!turmaSelecionada) return [];
        const [serie, turma] = turmaSelecionada.split(' - ');
        return alunos.filter((a) => a.serie === serie && a.turma === turma);
      case 'serie':
        return alunos.filter((a) => a.serie === serieSelecionada);
      case 'todos':
        return alunos;
      default:
        return [];
    }
  }, [tipoFiltro, alunoSelecionado, turmaSelecionada, serieSelecionada, alunos]);

  // Preview counts
  const previewCount = alunosFiltrados.length;
  const previewRegistros = previewCount * 8; // 8 intelligences per student

  const canSync = useMemo(() => {
    if (previewCount === 0) return false;
    if (tipoFiltro === 'aluno' && !alunoSelecionado) return false;
    if (tipoFiltro === 'turma' && !turmaSelecionada) return false;
    if (tipoFiltro === 'serie' && !serieSelecionada) return false;
    return true;
  }, [tipoFiltro, alunoSelecionado, turmaSelecionada, serieSelecionada, previewCount]);

  const handleSincronizar = async () => {
    if (!canSync) return;

    setIsSyncing(true);
    setResultado(null);
    setMensagemResultado('');

    try {
      const alunoIds = alunosFiltrados.map((a) => a.id);

      // Fetch scores for all filtered students
      const { data: scoresData, error: scoresError } = await supabase
        .from('inteligencia_scores')
        .select(`
          aluno_id,
          inteligencia_id,
          score_atual,
          score_ultima_fase,
          total_evidencias,
          fase_atual,
          inteligencias!inteligencia_scores_inteligencia_id_fkey(
            codigo,
            nome
          )
        `)
        .in('aluno_id', alunoIds)
        .eq('ano_letivo', anoLetivo);

      if (scoresError) throw scoresError;

      // Group scores by student
      const scoresByAluno: Record<string, ScoreData[]> = {};
      (scoresData || []).forEach((s) => {
        if (!scoresByAluno[s.aluno_id]) {
          scoresByAluno[s.aluno_id] = [];
        }
        scoresByAluno[s.aluno_id].push({
          aluno_id: s.aluno_id,
          inteligencia_id: s.inteligencia_id,
          inteligencia_codigo: (s.inteligencias as any)?.codigo || '',
          inteligencia_nome: (s.inteligencias as any)?.nome || '',
          score_atual: s.score_atual,
          score_ultima_fase: s.score_ultima_fase,
          total_evidencias: s.total_evidencias,
          fase_atual: s.fase_atual,
        });
      });

      // Build payload
      const payload = {
        tipo: 'sincronizar_scores',
        instituicao_id: institutionId,
        data_sincronizacao: new Date().toISOString(),
        filtro: {
          tipo: tipoFiltro,
          valor:
            tipoFiltro === 'aluno'
              ? alunosFiltrados[0]?.full_name
              : tipoFiltro === 'turma'
              ? turmaSelecionada
              : tipoFiltro === 'serie'
              ? serieSelecionada
              : 'Todos os alunos',
        },
        alunos: alunosFiltrados.map((aluno) => ({
          aluno_id: aluno.id,
          aluno_matricula: aluno.matricula_externa || '',
          aluno_nome: aluno.full_name,
          serie: aluno.serie || '',
          turma: aluno.turma || '',
          casa_id: aluno.casa_id,
          casa_nome: aluno.casa_nome || '',
          ano_letivo: anoLetivo,
          scores: (scoresByAluno[aluno.id] || []).map((score) => ({
            inteligencia_id: score.inteligencia_id,
            inteligencia_codigo: score.inteligencia_codigo,
            inteligencia_nome: score.inteligencia_nome,
            score_atual: score.score_atual,
            score_ultima_fase: score.score_ultima_fase,
            total_evidencias: score.total_evidencias,
            fase_atual: score.fase_atual,
            eh_casa_do_aluno: aluno.casa_id === score.inteligencia_id,
          })),
        })),
        resumo: {
          total_alunos: previewCount,
          total_registros: (scoresData || []).length,
        },
      };

      // Send to N8N webhook
      const response = await fetch(
        'https://n8n.vinirossa.com.br/webhook/arboria-sync-scores',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      setResultado('sucesso');
      setMensagemResultado(
        `✅ Scores sincronizados: ${previewCount} alunos, ${(scoresData || []).length} registros`
      );

      toast({
        title: 'Sincronização concluída',
        description: `${previewCount} alunos sincronizados com sucesso!`,
      });
    } catch (error) {
      console.error('Erro na sincronização:', error);
      setResultado('erro');
      setMensagemResultado(
        `❌ Erro na sincronização: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      );

      toast({
        variant: 'destructive',
        title: 'Erro na sincronização',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClose = () => {
    if (!isSyncing) {
      setResultado(null);
      setMensagemResultado('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-[#111111] border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <RefreshCw className="w-5 h-5 text-indigo-400" />
            Sincronizar Scores de Inteligência
          </DialogTitle>
          <DialogDescription className="text-white/60">
            Envie os scores de inteligência dos alunos para o sistema externo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Filter type selection */}
          <div className="space-y-3">
            <Label className="text-white/80">Sincronizar:</Label>
            <RadioGroup
              value={tipoFiltro}
              onValueChange={(v) => setTipoFiltro(v as TipoFiltro)}
              className="space-y-2"
            >
              <div className="flex items-center gap-3">
                <RadioGroupItem value="aluno" id="aluno" className="border-white/30" />
                <Label htmlFor="aluno" className="text-white/70 cursor-pointer flex-1">
                  Um aluno
                </Label>
                {tipoFiltro === 'aluno' && (
                  <Select value={alunoSelecionado} onValueChange={setAlunoSelecionado}>
                    <SelectTrigger className="w-48 bg-white/5 border-white/10 text-white">
                      <SelectValue placeholder="Selecionar aluno..." />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a1a] border-white/10">
                      {alunos.map((aluno) => (
                        <SelectItem
                          key={aluno.id}
                          value={aluno.id}
                          className="text-white hover:bg-white/10"
                        >
                          {aluno.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="flex items-center gap-3">
                <RadioGroupItem value="turma" id="turma" className="border-white/30" />
                <Label htmlFor="turma" className="text-white/70 cursor-pointer flex-1">
                  Uma turma
                </Label>
                {tipoFiltro === 'turma' && (
                  <Select value={turmaSelecionada} onValueChange={setTurmaSelecionada}>
                    <SelectTrigger className="w-48 bg-white/5 border-white/10 text-white">
                      <SelectValue placeholder="Selecionar turma..." />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a1a] border-white/10">
                      {turmas.map((turma) => (
                        <SelectItem
                          key={turma}
                          value={turma}
                          className="text-white hover:bg-white/10"
                        >
                          {turma}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="flex items-center gap-3">
                <RadioGroupItem value="serie" id="serie" className="border-white/30" />
                <Label htmlFor="serie" className="text-white/70 cursor-pointer flex-1">
                  Uma série
                </Label>
                {tipoFiltro === 'serie' && (
                  <Select value={serieSelecionada} onValueChange={setSerieSelecionada}>
                    <SelectTrigger className="w-48 bg-white/5 border-white/10 text-white">
                      <SelectValue placeholder="Selecionar série..." />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a1a] border-white/10">
                      {series.map((serie) => (
                        <SelectItem
                          key={serie}
                          value={serie}
                          className="text-white hover:bg-white/10"
                        >
                          {serie}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="flex items-center gap-3">
                <RadioGroupItem value="todos" id="todos" className="border-white/30" />
                <Label htmlFor="todos" className="text-white/70 cursor-pointer">
                  Todos os alunos
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Year selection */}
          <div className="flex items-center gap-3">
            <Label className="text-white/80 w-24">Ano letivo:</Label>
            <Select
              value={anoLetivo.toString()}
              onValueChange={(v) => setAnoLetivo(parseInt(v))}
            >
              <SelectTrigger className="w-32 bg-white/5 border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a1a] border-white/10">
                <SelectItem value="2025" className="text-white hover:bg-white/10">
                  2025
                </SelectItem>
                <SelectItem value="2026" className="text-white hover:bg-white/10">
                  2026
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Preview card */}
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 text-white/80">
                <Database className="w-5 h-5 text-indigo-400" />
                <span className="font-medium">Prévia</span>
              </div>
              <div className="mt-2 flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1.5 text-white/60">
                  <Users className="w-4 h-4" />
                  {loadingAlunos ? '...' : previewCount} alunos
                </span>
                <span className="text-white/40">•</span>
                <span className="text-white/60">
                  {loadingAlunos ? '...' : previewRegistros} registros de inteligência
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Warning */}
          <div className="flex items-start gap-2 text-xs text-white/50">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>Esta operação pode levar alguns segundos dependendo da quantidade de alunos.</span>
          </div>

          {/* Result message */}
          {resultado && (
            <div
              className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
                resultado === 'sucesso'
                  ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}
            >
              {resultado === 'sucesso' ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <XCircle className="w-4 h-4" />
              )}
              <span>{mensagemResultado}</span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="ghost"
            onClick={handleClose}
            disabled={isSyncing}
            className="text-white/60 hover:text-white hover:bg-white/10"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSincronizar}
            disabled={!canSync || isSyncing}
            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
          >
            {isSyncing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Sincronizando...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Sincronizar Agora
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ModalSincronizarScores;
