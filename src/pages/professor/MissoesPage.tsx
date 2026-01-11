import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfessor } from '@/contexts/ProfessorContext';
import ProfessorBottomNav from '@/components/professor/ProfessorBottomNav';
import MissoesAtivasModal from '@/components/professor/MissoesAtivasModal';
import EntregasPorTurmaModal from '@/components/professor/EntregasPorTurmaModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Plus, 
  BarChart3, 
  Users, 
  Zap, 
  Timer, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  XCircle,
  TrendingUp,
  ChevronRight,
  Target
} from 'lucide-react';

interface AlunoLista {
  id: string;
  nome: string;
  sobrenome: string | null;
  full_name?: string;
  serie: string | null;
  turma: string | null;
  avatar_url?: string | null;
  entregas?: number;
  tempoMedio?: number;
}

interface CategoriaConfig {
  icone: React.ReactNode;
  corBg: string;
  corIcone: string;
  subtitulo: string;
}

const categoriasConfig: Record<string, CategoriaConfig> = {
  green: { 
    icone: <Zap size={20} strokeWidth={1.5} />, 
    corBg: 'bg-green-500/20',
    corIcone: 'text-green-400',
    subtitulo: 'Entregaram em menos de 50% do prazo' 
  },
  blue: { 
    icone: <Timer size={20} strokeWidth={1.5} />, 
    corBg: 'bg-blue-500/20',
    corIcone: 'text-blue-400',
    subtitulo: 'Entregaram entre 50% e 100% do prazo' 
  },
  orange: { 
    icone: <Clock size={20} strokeWidth={1.5} />, 
    corBg: 'bg-orange-500/20',
    corIcone: 'text-orange-400',
    subtitulo: 'Entregaram após o prazo' 
  },
  red: { 
    icone: <XCircle size={20} strokeWidth={1.5} />, 
    corBg: 'bg-red-500/20',
    corIcone: 'text-red-400',
    subtitulo: 'Ainda não entregaram' 
  }
};

interface EngajamentoData {
  rapidos: { count: number; percent: number; alunos: AlunoLista[] };
  noPrazo: { count: number; percent: number; alunos: AlunoLista[] };
  atrasados: { count: number; percent: number; alunos: AlunoLista[] };
}

const MissoesPage = () => {
  const navigate = useNavigate();
  const { casaMentor, casaColor, profile, faseAtual } = useProfessor();
  const corCasa = casaColor || casaMentor?.cor_hex || '#3B82F6';
  
  // Modal state
  const [modalAberto, setModalAberto] = useState(false);
  const [modalTitulo, setModalTitulo] = useState('');
  const [modalSubtitulo, setModalSubtitulo] = useState('');
  const [modalIcone, setModalIcone] = useState<React.ReactNode>(null);
  const [modalAlunos, setModalAlunos] = useState<AlunoLista[]>([]);
  const [modalCor, setModalCor] = useState('');
  
  // Modal de missões ativas
  const [showMissoesModal, setShowMissoesModal] = useState(false);
  
  // Modal de entregas por turma
  const [showEntregasModal, setShowEntregasModal] = useState(false);

  // Contar missões liberadas por série
  const { data: contagemMissoes } = useQuery({
    queryKey: ['contagem-missoes-serie', casaMentor?.id, profile?.institution_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('missoes')
        .select('id, serie_filtro')
        .eq('casa_id', casaMentor!.id)
        .eq('institution_id', profile!.institution_id!)
        .eq('status', 'liberada');

      if (error) throw error;

      const contagem: Record<number, number> = { 6: 0, 7: 0, 8: 0, 9: 0 };
      data?.forEach(m => {
        if (m.serie_filtro) {
          contagem[m.serie_filtro] = (contagem[m.serie_filtro] || 0) + 1;
        } else {
          [6, 7, 8, 9].forEach(s => contagem[s]++);
        }
      });
      
      return {
        porSerie: contagem,
        totalUnico: data?.length || 0
      };
    },
    enabled: !!casaMentor?.id && !!profile?.institution_id
  });

  // Query para buscar entregas por série e turma
  const { data: entregasPorTurma } = useQuery({
    queryKey: ['entregas-por-turma', casaMentor?.id, profile?.institution_id],
    queryFn: async () => {
      const { data: alunos, error: errAlunos } = await supabase
        .from('profiles')
        .select('id, serie, turma')
        .eq('casa_id', casaMentor!.id)
        .eq('institution_id', profile!.institution_id!);

      if (errAlunos) throw errAlunos;

      const { data: missoes, error: errMissoes } = await supabase
        .from('missoes')
        .select('id')
        .eq('casa_id', casaMentor!.id)
        .eq('institution_id', profile!.institution_id!)
        .eq('status', 'liberada');

      if (errMissoes) throw errMissoes;

      const missaoIds = missoes?.map(m => m.id) || [];

      let entregas: { aluno_id: string }[] = [];
      if (missaoIds.length > 0) {
        const { data, error: errEntregas } = await supabase
          .from('entregas')
          .select('aluno_id')
          .in('missao_id', missaoIds);

        if (errEntregas) throw errEntregas;
        entregas = data || [];
      }

      const alunosPorSerieTurma: Record<number, Record<string, string[]>> = {};
      
      alunos?.forEach(aluno => {
        const serie = parseInt(aluno.serie || '0');
        const turma = aluno.turma || 'A';
        
        if (!alunosPorSerieTurma[serie]) {
          alunosPorSerieTurma[serie] = {};
        }
        if (!alunosPorSerieTurma[serie][turma]) {
          alunosPorSerieTurma[serie][turma] = [];
        }
        alunosPorSerieTurma[serie][turma].push(aluno.id);
      });

      const alunosQueEntregaram = new Set(entregas.map(e => e.aluno_id));

      const resultado = [6, 7, 8, 9].map(serie => {
        const turmasDaSerie = alunosPorSerieTurma[serie] || {};
        
        const turmas = Object.entries(turmasDaSerie)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([turma, alunoIds]) => {
            const total = alunoIds.length;
            const entregaram = alunoIds.filter(id => alunosQueEntregaram.has(id)).length;
            const percentual = total > 0 ? Math.round((entregaram / total) * 100) : 0;
            
            return { turma, entregaram, total, percentual };
          });

        return { serie, turmas };
      });

      return resultado;
    },
    enabled: !!casaMentor?.id && !!profile?.institution_id
  });

  const { data: estatisticas } = useQuery({
    queryKey: ['estatisticas-missoes', casaMentor?.id, profile?.institution_id],
    queryFn: async () => {
      const { data: missoes } = await supabase
        .from('missoes')
        .select('id')
        .eq('casa_id', casaMentor!.id)
        .eq('institution_id', profile!.institution_id!)
        .eq('status', 'liberada');
      
      const missaoIds = missoes?.map(m => m.id) || [];
      
      let entregasPendentes = 0;
      if (missaoIds.length > 0) {
        const { count } = await supabase
          .from('entregas')
          .select('*', { count: 'exact', head: true })
          .in('missao_id', missaoIds)
          .is('nota', null)
          .neq('status', 'refazer');
        entregasPendentes = count || 0;
      }

      let totalEntregas = 0;
      let entregasNoPrazo = 0;
      if (missaoIds.length > 0) {
        const { data: entregasData } = await supabase
          .from('entregas')
          .select('id, entregue_no_prazo')
          .in('missao_id', missaoIds)
          .eq('status', 'aprovada');
        
        totalEntregas = entregasData?.length || 0;
        entregasNoPrazo = entregasData?.filter(e => e.entregue_no_prazo).length || 0;
      }

      const { count: totalAlunos } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('casa_id', casaMentor!.id)
        .eq('institution_id', profile!.institution_id!)
        .not('casa_id', 'is', null);

      const percentualNoPrazo = totalEntregas > 0 
        ? Math.round((entregasNoPrazo / totalEntregas) * 100) 
        : 0;

      return {
        entregasPendentes,
        totalAlunos: totalAlunos || 0,
        percentualNoPrazo,
        missaoIds
      };
    },
    enabled: !!casaMentor?.id && !!profile?.institution_id
  });

  // Engajamento dos alunos
  const { data: engajamento } = useQuery<EngajamentoData>({
    queryKey: ['engajamento-alunos', casaMentor?.id, profile?.institution_id],
    queryFn: async (): Promise<EngajamentoData> => {
      const { data: missoes } = await supabase
        .from('missoes')
        .select('id, data_liberacao, data_prazo')
        .eq('casa_id', casaMentor!.id)
        .eq('institution_id', profile!.institution_id!)
        .eq('status', 'liberada');
      
      if (!missoes || missoes.length === 0) {
        return { 
          rapidos: { count: 0, percent: 0, alunos: [] }, 
          noPrazo: { count: 0, percent: 0, alunos: [] }, 
          atrasados: { count: 0, percent: 0, alunos: [] } 
        };
      }

      const missaoIds = missoes.map(m => m.id);
      const missaoMap = new Map(missoes.map(m => [m.id, m]));

      const { data: entregas } = await supabase
        .from('entregas')
        .select(`
          id, aluno_id, data_entrega, missao_id, entregue_no_prazo,
          aluno:profiles!entregas_aluno_id_fkey(id, nome, sobrenome, full_name, serie, turma, avatar_url)
        `)
        .in('missao_id', missaoIds)
        .eq('status', 'aprovada');

      if (!entregas || entregas.length === 0) {
        return { 
          rapidos: { count: 0, percent: 0, alunos: [] }, 
          noPrazo: { count: 0, percent: 0, alunos: [] }, 
          atrasados: { count: 0, percent: 0, alunos: [] } 
        };
      }

      const rapidosMap = new Map<string, { aluno: AlunoLista; entregas: number; tempoTotal: number }>();
      const noPrazoMap = new Map<string, { aluno: AlunoLista; entregas: number; tempoTotal: number }>();
      const atrasadosMap = new Map<string, { aluno: AlunoLista; entregas: number; tempoTotal: number }>();

      entregas.forEach(entrega => {
        const missao = missaoMap.get(entrega.missao_id);
        if (!missao || !entrega.data_entrega || !entrega.aluno) return;

        const alunoData = entrega.aluno as unknown as AlunoLista;
        const alunoId = alunoData.id;

        const liberacao = new Date(missao.data_liberacao).getTime();
        const entregou = new Date(entrega.data_entrega).getTime();
        const tempoHoras = (entregou - liberacao) / (1000 * 60 * 60);

        let targetMap: Map<string, { aluno: AlunoLista; entregas: number; tempoTotal: number }>;

        if (entrega.entregue_no_prazo === false) {
          targetMap = atrasadosMap;
        } else {
          const prazo = new Date(missao.data_prazo).getTime();
          const prazoTotal = prazo - liberacao;
          const tempoUsado = entregou - liberacao;
          const percentualUsado = prazoTotal > 0 ? (tempoUsado / prazoTotal) * 100 : 0;
          
          targetMap = percentualUsado <= 50 ? rapidosMap : noPrazoMap;
        }

        if (targetMap.has(alunoId)) {
          const existing = targetMap.get(alunoId)!;
          existing.entregas++;
          existing.tempoTotal += tempoHoras;
        } else {
          targetMap.set(alunoId, { aluno: alunoData, entregas: 1, tempoTotal: tempoHoras });
        }
      });

      const converterParaLista = (map: Map<string, { aluno: AlunoLista; entregas: number; tempoTotal: number }>): AlunoLista[] => {
        return Array.from(map.values())
          .map(item => ({
            ...item.aluno,
            entregas: item.entregas,
            tempoMedio: Math.round(item.tempoTotal / item.entregas)
          }))
          .sort((a, b) => (b.entregas || 0) - (a.entregas || 0));
      };

      const rapidosAlunos = converterParaLista(rapidosMap);
      const noPrazoAlunos = converterParaLista(noPrazoMap);
      const atrasadosAlunos = converterParaLista(atrasadosMap);

      const totalEntregasRapidas = Array.from(rapidosMap.values()).reduce((s, i) => s + i.entregas, 0);
      const totalEntregasNoPrazo = Array.from(noPrazoMap.values()).reduce((s, i) => s + i.entregas, 0);
      const totalEntregasAtrasadas = Array.from(atrasadosMap.values()).reduce((s, i) => s + i.entregas, 0);
      const total = entregas.length;

      return {
        rapidos: { 
          count: rapidosAlunos.length, 
          percent: total > 0 ? Math.round((totalEntregasRapidas / total) * 100) : 0,
          alunos: rapidosAlunos
        },
        noPrazo: { 
          count: noPrazoAlunos.length, 
          percent: total > 0 ? Math.round((totalEntregasNoPrazo / total) * 100) : 0,
          alunos: noPrazoAlunos
        },
        atrasados: { 
          count: atrasadosAlunos.length, 
          percent: total > 0 ? Math.round((totalEntregasAtrasadas / total) * 100) : 0,
          alunos: atrasadosAlunos
        }
      };
    },
    enabled: !!casaMentor?.id && !!profile?.institution_id
  });

  // Status dos alunos
  const { data: statusAlunos } = useQuery({
    queryKey: ['status-alunos-missoes', casaMentor?.id, profile?.institution_id],
    queryFn: async () => {
      const { data: alunos } = await supabase
        .from('profiles')
        .select('id, nome, sobrenome, serie, turma, avatar_url')
        .eq('casa_id', casaMentor!.id)
        .eq('institution_id', profile!.institution_id!)
        .not('casa_id', 'is', null);

      const totalAlunos = alunos?.length || 0;
      if (totalAlunos === 0) {
        return { 
          entregaram: { count: 0, percent: 0, alunos: [] }, 
          atrasados: { count: 0, percent: 0, alunos: [] }, 
          naoEntregaram: { count: 0, percent: 0, alunos: [] },
          total: 0
        };
      }

      const { data: missoes } = await supabase
        .from('missoes')
        .select('id')
        .eq('casa_id', casaMentor!.id)
        .eq('institution_id', profile!.institution_id!)
        .eq('status', 'liberada');
      
      const missaoIds = missoes?.map(m => m.id) || [];
      
      if (missaoIds.length === 0) {
        return { 
          entregaram: { count: 0, percent: 0, alunos: [] }, 
          atrasados: { count: 0, percent: 0, alunos: [] }, 
          naoEntregaram: { count: totalAlunos, percent: 100, alunos: alunos || [] },
          total: totalAlunos
        };
      }

      const { data: entregas } = await supabase
        .from('entregas')
        .select('aluno_id, entregue_no_prazo')
        .in('missao_id', missaoIds);

      const alunosComEntrega = new Set(entregas?.map(e => e.aluno_id) || []);
      const alunosAtrasados = new Set(entregas?.filter(e => !e.entregue_no_prazo).map(e => e.aluno_id) || []);

      const alunosSemEntrega = alunos?.filter(a => !alunosComEntrega.has(a.id)) || [];
      const alunosQueEntregaram = alunos?.filter(a => alunosComEntrega.has(a.id) && !alunosAtrasados.has(a.id)) || [];
      const alunosComAtraso = alunos?.filter(a => alunosAtrasados.has(a.id)) || [];

      return {
        entregaram: { 
          count: alunosQueEntregaram.length, 
          percent: Math.round((alunosQueEntregaram.length / totalAlunos) * 100),
          alunos: alunosQueEntregaram
        },
        atrasados: { 
          count: alunosComAtraso.length, 
          percent: Math.round((alunosComAtraso.length / totalAlunos) * 100),
          alunos: alunosComAtraso
        },
        naoEntregaram: { 
          count: alunosSemEntrega.length, 
          percent: Math.round((alunosSemEntrega.length / totalAlunos) * 100),
          alunos: alunosSemEntrega
        },
        total: totalAlunos
      };
    },
    enabled: !!casaMentor?.id && !!profile?.institution_id
  });

  const abrirModal = (titulo: string, alunos: AlunoLista[], cor: string) => {
    setModalTitulo(titulo);
    setModalAlunos(alunos);
    setModalCor(cor);
    setModalIcone(categoriasConfig[cor]?.icone || <Users size={20} strokeWidth={1.5} />);
    setModalSubtitulo(categoriasConfig[cor]?.subtitulo || '');
    setModalAberto(true);
  };

  const series = [6, 7, 8, 9];

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white pb-24">
      <div className="p-4 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight">Missões</h1>
          <button
            onClick={() => navigate('/professor/missoes/nova')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold 
              transition-all duration-300 ease-out
              hover:scale-[1.02] active:scale-[0.98]"
            style={{ 
              backgroundColor: corCasa, 
              color: '#fff',
              boxShadow: `0 4px 16px -2px ${corCasa}50`
            }}
          >
            <Plus size={18} strokeWidth={2} />
            Nova
          </button>
        </div>

        {/* Seleção de Série */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Target size={16} strokeWidth={1.5} className="text-white/50" />
            <p className="text-white/50 text-xs uppercase tracking-widest font-medium">
              Selecione a Série
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {series.map((serie) => (
              <button
                key={serie}
                onClick={() => navigate(`/professor/missoes/serie/${serie}`)}
                className="p-6 rounded-2xl text-center transition-all duration-300 ease-out
                  bg-gradient-to-br from-white/[0.06] to-white/[0.02]
                  backdrop-blur-sm border border-white/10
                  hover:scale-[1.02] hover:border-white/20
                  active:scale-[0.98]"
                style={{
                  boxShadow: `0 4px 20px -4px ${corCasa}15`
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = `0 8px 30px -4px ${corCasa}30`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = `0 4px 20px -4px ${corCasa}15`;
                }}
              >
                <div className="text-4xl font-bold tracking-tight text-white">{serie}º</div>
                <div className="text-white/70 text-sm font-light">ANO</div>
                <div 
                  className="text-sm font-medium mt-2"
                  style={{ color: corCasa }}
                >
                  {contagemMissoes?.porSerie?.[serie] || 0} ativas
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Separador */}
        <div className="h-px bg-white/10" />

        {/* Visão Geral */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={16} strokeWidth={1.5} className="text-white/50" />
            <p className="text-white/50 text-xs uppercase tracking-widest font-medium">
              Visão Geral
            </p>
          </div>
          <div 
            className="grid grid-cols-4 gap-3 p-4 rounded-2xl border border-white/10
              bg-gradient-to-br from-white/[0.06] to-white/[0.02] backdrop-blur-sm"
            style={{
              boxShadow: `0 4px 24px -4px ${corCasa}10`
            }}
          >
            <button 
              onClick={() => setShowMissoesModal(true)}
              className="text-center transition-all duration-200 hover:scale-105 active:scale-95"
            >
              <div className="text-3xl font-bold text-white">{contagemMissoes?.totalUnico || 0}</div>
              <div className="text-xs text-white/50 font-light leading-tight mt-1">Missões<br/>Ativas</div>
            </button>
            <div className="text-center">
              <div className="text-3xl font-bold text-white">{estatisticas?.percentualNoPrazo || 0}%</div>
              <div className="text-xs text-white/50 font-light leading-tight mt-1">No<br/>Prazo</div>
            </div>
            <button 
              onClick={() => setShowEntregasModal(true)}
              className="text-center transition-all duration-200 hover:scale-105 active:scale-95"
            >
              <div 
                className="text-3xl font-bold"
                style={{ color: (estatisticas?.entregasPendentes || 0) > 0 ? '#F59E0B' : 'white' }}
              >
                {estatisticas?.entregasPendentes || 0}
              </div>
              <div className="text-xs text-white/50 font-light leading-tight mt-1">Avaliações<br/>Pendentes</div>
            </button>
            <div className="text-center">
              <div className="text-3xl font-bold text-white">{estatisticas?.totalAlunos || 0}</div>
              <div className="text-xs text-white/50 font-light leading-tight mt-1">Total<br/>Alunos</div>
            </div>
          </div>
        </section>

        {/* Engajamento */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} strokeWidth={1.5} className="text-white/50" />
            <p className="text-white/50 text-xs uppercase tracking-widest font-medium">
              Engajamento
            </p>
          </div>
          <div 
            className="p-4 rounded-2xl border border-white/10
              bg-gradient-to-br from-white/[0.06] to-white/[0.02] backdrop-blur-sm"
            style={{
              boxShadow: `0 4px 24px -4px ${corCasa}10`
            }}
          >
            <div className="grid grid-cols-3 gap-4">
              {/* Rápidos */}
              <button
                onClick={() => abrirModal('Rápidos', engajamento?.rapidos.alunos || [], 'green')}
                className="text-center transition-all duration-200 hover:scale-105 active:scale-95"
              >
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2"
                  style={{ backgroundColor: `${corCasa}20` }}
                >
                  <Zap size={20} strokeWidth={1.5} className="text-green-400" />
                </div>
                <div className="text-2xl font-bold text-white">
                  {engajamento?.rapidos.percent || 0}%
                </div>
                <div className="text-xs text-white/50 font-light">rápidos</div>
              </button>

              {/* No Prazo */}
              <button
                onClick={() => abrirModal('No Prazo', engajamento?.noPrazo.alunos || [], 'blue')}
                className="text-center transition-all duration-200 hover:scale-105 active:scale-95"
              >
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2"
                  style={{ backgroundColor: `${corCasa}20` }}
                >
                  <Timer size={20} strokeWidth={1.5} className="text-blue-400" />
                </div>
                <div className="text-2xl font-bold text-white">
                  {engajamento?.noPrazo.percent || 0}%
                </div>
                <div className="text-xs text-white/50 font-light">no prazo</div>
              </button>

              {/* Atrasados */}
              <button
                onClick={() => abrirModal('Atrasados', engajamento?.atrasados.alunos || [], 'orange')}
                className="text-center transition-all duration-200 hover:scale-105 active:scale-95"
              >
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2"
                  style={{ backgroundColor: `${corCasa}20` }}
                >
                  <Clock size={20} strokeWidth={1.5} className="text-orange-400" />
                </div>
                <div className="text-2xl font-bold text-white">
                  {engajamento?.atrasados.percent || 0}%
                </div>
                <div className="text-xs text-white/50 font-light">atrasados</div>
              </button>
            </div>
          </div>
        </section>

        {/* Status dos Alunos */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Users size={16} strokeWidth={1.5} className="text-white/50" />
            <p className="text-white/50 text-xs uppercase tracking-widest font-medium">
              Status dos Alunos
            </p>
          </div>
          <div 
            className="p-4 rounded-2xl border border-white/10 space-y-4
              bg-gradient-to-br from-white/[0.06] to-white/[0.02] backdrop-blur-sm"
            style={{
              boxShadow: `0 4px 24px -4px ${corCasa}10`
            }}
          >
            {/* Entregaram */}
            <button
              onClick={() => abrirModal('Entregaram', statusAlunos?.entregaram.alunos || [], 'green')}
              className="w-full text-left transition-all duration-200 hover:bg-white/5 rounded-xl p-2 -m-2"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} strokeWidth={1.5} className="text-green-400" />
                  <span className="text-sm font-medium text-white">Entregaram</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-white/70">
                    {statusAlunos?.entregaram.count || 0} ({statusAlunos?.entregaram.percent || 0}%)
                  </span>
                  <ChevronRight size={16} strokeWidth={1.5} className="text-white/40" />
                </div>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 rounded-full transition-all duration-500"
                  style={{ width: `${statusAlunos?.entregaram.percent || 0}%` }}
                />
              </div>
            </button>

            {/* Atrasados */}
            <button
              onClick={() => abrirModal('Atrasados', statusAlunos?.atrasados.alunos || [], 'orange')}
              className="w-full text-left transition-all duration-200 hover:bg-white/5 rounded-xl p-2 -m-2"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <AlertCircle size={16} strokeWidth={1.5} className="text-yellow-400" />
                  <span className="text-sm font-medium text-white">Atrasados</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-white/70">
                    {statusAlunos?.atrasados.count || 0} ({statusAlunos?.atrasados.percent || 0}%)
                  </span>
                  <ChevronRight size={16} strokeWidth={1.5} className="text-white/40" />
                </div>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-yellow-500 rounded-full transition-all duration-500"
                  style={{ width: `${statusAlunos?.atrasados.percent || 0}%` }}
                />
              </div>
            </button>

            {/* Não entregaram */}
            <button
              onClick={() => abrirModal('Não Entregaram', statusAlunos?.naoEntregaram.alunos || [], 'red')}
              className="w-full text-left transition-all duration-200 hover:bg-white/5 rounded-xl p-2 -m-2"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <XCircle size={16} strokeWidth={1.5} className="text-red-400" />
                  <span className="text-sm font-medium text-white">Não entregaram</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-white/70">
                    {statusAlunos?.naoEntregaram.count || 0} ({statusAlunos?.naoEntregaram.percent || 0}%)
                  </span>
                  <ChevronRight size={16} strokeWidth={1.5} className="text-white/40" />
                </div>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-red-500 rounded-full transition-all duration-500"
                  style={{ width: `${statusAlunos?.naoEntregaram.percent || 0}%` }}
                />
              </div>
            </button>
          </div>
        </section>
      </div>

      {/* Modal de Lista de Alunos */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="bg-[rgba(26,26,30,0.95)] backdrop-blur-xl border-white/10 text-white max-w-md max-h-[70vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div 
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  modalCor === 'green' ? 'bg-green-500/20 text-green-400' :
                  modalCor === 'blue' ? 'bg-blue-500/20 text-blue-400' :
                  modalCor === 'orange' ? 'bg-orange-500/20 text-orange-400' :
                  modalCor === 'yellow' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-red-500/20 text-red-400'
                }`}
              >
                {modalIcone}
              </div>
              <div>
                <span className="text-lg font-semibold">{modalTitulo}</span>
                <p className="text-xs text-white/50 font-light mt-0.5">{modalSubtitulo}</p>
              </div>
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[50vh] pr-4">
            {modalAlunos.length === 0 ? (
              <p className="text-center text-white/50 py-8 text-sm">Nenhum aluno nesta categoria</p>
            ) : (
              <div className="space-y-2">
                {modalAlunos.map((aluno) => (
                  <div 
                    key={aluno.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10
                      hover:bg-white/10 transition-colors cursor-pointer"
                    onClick={() => {
                      setModalAberto(false);
                      navigate(`/professor/alunos/${aluno.id}`);
                    }}
                  >
                    <div>
                      <p className="font-medium text-sm text-white">
                        {aluno.full_name || `${aluno.nome || ''} ${aluno.sobrenome || ''}`.trim()}
                      </p>
                      <p className="text-xs text-white/50">{aluno.serie} - Turma {aluno.turma}</p>
                    </div>
                    <div className="text-right">
                      {aluno.entregas !== undefined && (
                        <p className="text-xs text-white/70">{aluno.entregas} entregas</p>
                      )}
                      {aluno.tempoMedio !== undefined && (
                        <p className="text-xs text-white/50">{aluno.tempoMedio}h média</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Modal Missões Ativas */}
      <MissoesAtivasModal
        open={showMissoesModal}
        onOpenChange={setShowMissoesModal}
        missaoIds={estatisticas?.missaoIds || []}
        casaColor={corCasa}
      />

      {/* Modal Entregas por Turma */}
      <EntregasPorTurmaModal
        open={showEntregasModal}
        onOpenChange={setShowEntregasModal}
        entregasPorTurma={entregasPorTurma || []}
        casaColor={corCasa}
      />

      <ProfessorBottomNav />
    </div>
  );
};

export default MissoesPage;
