import { Plus, ChevronRight, BarChart3, Zap, Users, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useProfessor } from '@/contexts/ProfessorContext';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import MissoesAtivasModal from '@/components/professor/MissoesAtivasModal';
import EntregasPorTurmaModal from '@/components/professor/EntregasPorTurmaModal';

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

// Configuração visual por categoria de engajamento
const categoriasConfig: Record<string, { corBg: string; subtitulo: string }> = {
  green: {
    corBg: 'bg-green-500/20',
    subtitulo: 'Entregaram em menos de 50% do prazo'
  },
  blue: {
    corBg: 'bg-blue-500/20',
    subtitulo: 'Entregaram entre 50% e 100% do prazo'
  },
  orange: {
    corBg: 'bg-orange-500/20',
    subtitulo: 'Entregaram apos o prazo'
  },
  red: {
    corBg: 'bg-red-500/20',
    subtitulo: 'Ainda nao entregaram'
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
  
  // Modal state
  const [modalAberto, setModalAberto] = useState(false);
  const [modalTitulo, setModalTitulo] = useState('');
  const [modalSubtitulo, setModalSubtitulo] = useState('');
  const [modalIcone, setModalIcone] = useState('');
  const [modalAlunos, setModalAlunos] = useState<AlunoLista[]>([]);
  const [modalCor, setModalCor] = useState('');
  
  // Modal de missões ativas
  const [showMissoesModal, setShowMissoesModal] = useState(false);
  
  // Modal de entregas por turma
  const [showEntregasModal, setShowEntregasModal] = useState(false);

  // Contar missões liberadas por série (retorna tanto contagem por série quanto total único)
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
          // Missão para todas as séries
          [6, 7, 8, 9].forEach(s => contagem[s]++);
        }
      });
      
      return {
        porSerie: contagem,
        totalUnico: data?.length || 0  // Total REAL de missões únicas
      };
    },
    enabled: !!casaMentor?.id && !!profile?.institution_id
  });
  
  // Preparar dados para o modal de missões ativas
  const dadosMissoesModal = [6, 7, 8, 9].map(serie => ({
    serie,
    semanaAtiva: faseAtual?.semana_atual || 1,
    missoesAtivas: contagemMissoes?.porSerie?.[serie] || 0
  }));

  // Query para buscar entregas por série e turma
  const { data: entregasPorTurma } = useQuery({
    queryKey: ['entregas-por-turma', casaMentor?.id, profile?.institution_id],
    queryFn: async () => {
      // 1. Buscar TODOS os alunos F2 agrupados por série e turma
      const { data: alunos, error: errAlunos } = await supabase
        .from('profiles')
        .select('id, serie, turma')
        .eq('institution_id', profile!.institution_id!)
        .eq('segmento', 'fundamental2')
        .not('casa_id', 'is', null);

      if (errAlunos) throw errAlunos;

      // 2. Buscar TODAS as missões liberadas da instituição
      const { data: missoes, error: errMissoes } = await supabase
        .from('missoes')
        .select('id')
        .eq('institution_id', profile!.institution_id!)
        .eq('status', 'liberada');

      if (errMissoes) throw errMissoes;

      const missaoIds = missoes?.map(m => m.id) || [];

      // 3. Buscar entregas das missões ativas
      let entregas: { aluno_id: string }[] = [];
      if (missaoIds.length > 0) {
        const { data, error: errEntregas } = await supabase
          .from('entregas')
          .select('aluno_id')
          .in('missao_id', missaoIds);

        if (errEntregas) throw errEntregas;
        entregas = data || [];
      }

      // 4. Agrupar alunos por série e turma
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

      // 5. Calcular entregas por turma
      const alunosQueEntregaram = new Set(entregas.map(e => e.aluno_id));

      // 6. Montar resultado
      const resultado = [6, 7, 8, 9].map(serie => {
        const turmasDaSerie = alunosPorSerieTurma[serie] || {};
        
        const turmas = Object.entries(turmasDaSerie)
          .sort(([a], [b]) => a.localeCompare(b)) // Ordenar A, B, C...
          .map(([turma, alunoIds]) => {
            const total = alunoIds.length;
            const entregaram = alunoIds.filter(id => alunosQueEntregaram.has(id)).length;
            const percentual = total > 0 ? Math.round((entregaram / total) * 100) : 0;
            
            return {
              turma,
              entregaram,
              total,
              percentual
            };
          });

        return {
          serie,
          turmas
        };
      });

      return resultado;
    },
    enabled: !!casaMentor?.id && !!profile?.institution_id
  });


  const { data: estatisticas } = useQuery({
    queryKey: ['estatisticas-missoes', profile?.institution_id],
    queryFn: async () => {
      // Buscar TODAS as missões liberadas da instituição
      const { data: missoes } = await supabase
        .from('missoes')
        .select('id')
        .eq('institution_id', profile!.institution_id!)
        .eq('status', 'liberada');

      const missaoIds = missoes?.map(m => m.id) || [];

      // Entregas pendentes de avaliação
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

      // Total de entregas aprovadas
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

      // TOTAL de alunos F2 da instituição
      const { count: totalAlunos } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('institution_id', profile!.institution_id!)
        .eq('segmento', 'fundamental2')
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
    enabled: !!profile?.institution_id
  });

  // Engajamento dos alunos (com dados para os modais)
  const { data: engajamento } = useQuery<EngajamentoData>({
    queryKey: ['engajamento-alunos', casaMentor?.id, profile?.institution_id],
    queryFn: async (): Promise<EngajamentoData> => {
      // Buscar TODAS as missões ativas com datas
      const { data: missoes } = await supabase
        .from('missoes')
        .select('id, data_liberacao, data_prazo')
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

      // Buscar entregas aprovadas COM dados do aluno
      const { data: entregas } = await supabase
        .from('entregas')
        .select(`
          id, 
          aluno_id, 
          data_entrega, 
          missao_id, 
          entregue_no_prazo,
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

      // AGRUPAR entregas por aluno usando Maps
      const rapidosMap = new Map<string, { aluno: AlunoLista; entregas: number; tempoTotal: number }>();
      const noPrazoMap = new Map<string, { aluno: AlunoLista; entregas: number; tempoTotal: number }>();
      const atrasadosMap = new Map<string, { aluno: AlunoLista; entregas: number; tempoTotal: number }>();

      entregas.forEach(entrega => {
        const missao = missaoMap.get(entrega.missao_id);
        if (!missao || !entrega.data_entrega || !entrega.aluno) return;

        const alunoData = entrega.aluno as unknown as AlunoLista;
        const alunoId = alunoData.id;

        // Calcular tempo de resposta em horas
        const liberacao = new Date(missao.data_liberacao).getTime();
        const entregou = new Date(entrega.data_entrega).getTime();
        const tempoHoras = (entregou - liberacao) / (1000 * 60 * 60);

        // Determinar categoria
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

        // Agrupar por aluno
        if (targetMap.has(alunoId)) {
          const existing = targetMap.get(alunoId)!;
          existing.entregas++;
          existing.tempoTotal += tempoHoras;
        } else {
          targetMap.set(alunoId, {
            aluno: alunoData,
            entregas: 1,
            tempoTotal: tempoHoras
          });
        }
      });

      // Converter Maps para arrays com dados calculados
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

      // Calcular totais de entregas (não de alunos)
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

  // Status dos alunos — filtra por séries que têm missões ativas
  const { data: statusAlunos } = useQuery({
    queryKey: ['status-alunos-missoes', profile?.institution_id],
    queryFn: async () => {
      // Buscar TODAS as missões liberadas com serie_filtro
      const { data: missoes } = await supabase
        .from('missoes')
        .select('id, serie_filtro')
        .eq('institution_id', profile!.institution_id!)
        .eq('status', 'liberada');

      const missaoIds = missoes?.map(m => m.id) || [];
      if (missaoIds.length === 0) return null;

      // Determinar quais séries têm missões
      const seriesComMissao = new Set<string>();
      missoes?.forEach(m => {
        if (m.serie_filtro) {
          seriesComMissao.add(String(m.serie_filtro));
        } else {
          // Missão sem filtro de série = para todas
          ['6', '7', '8', '9'].forEach(s => seriesComMissao.add(s));
        }
      });

      // Buscar alunos APENAS das séries que têm missões
      let alunosQuery = supabase
        .from('profiles')
        .select('id, nome, sobrenome, serie, turma, avatar_url, casa_id')
        .eq('institution_id', profile!.institution_id!)
        .eq('segmento', 'fundamental2')
        .not('casa_id', 'is', null);

      // Filtrar por séries com missão
      const serieFilters = Array.from(seriesComMissao).map(s => `serie.ilike.%${s}%`).join(',');
      if (serieFilters) {
        alunosQuery = alunosQuery.or(serieFilters);
      }

      const { data: alunos } = await alunosQuery;
      const totalAlunos = alunos?.length || 0;
      if (totalAlunos === 0) return null;

      // Buscar entregas
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
    enabled: !!profile?.institution_id
  });

  const abrirModal = (titulo: string, alunos: AlunoLista[], cor: string) => {
    setModalTitulo(titulo);
    setModalAlunos(alunos);
    setModalCor(cor);
    setModalIcone('');
    setModalSubtitulo(categoriasConfig[cor]?.subtitulo || '');
    setModalAberto(true);
  };

  return (
    <div className="p-4 space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-white">Missões</h1>
        <button
          onClick={() => navigate('/professor/missoes/nova')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all"
          style={{ backgroundColor: casaColor, color: '#fff' }}
        >
          <Plus size={18} />
          Nova
        </button>
      </div>

      {/* Selecione a Série */}
      <div>
        <p className="text-white/40 text-xs uppercase tracking-widest mb-3 font-medium">
          Selecione a Série
        </p>

        <div className="grid grid-cols-2 gap-3">
          {[6, 7, 8, 9].map((serie) => (
            <button
              key={serie}
              onClick={() => navigate(`/professor/missoes/serie/${serie}`)}
              className="p-5 bg-white/5 hover:bg-white/10 rounded-xl text-center transition-colors border border-violet-500/10"
            >
              <p className="text-3xl font-bold text-white">{serie}º</p>
              <p className="text-white/60 text-sm font-medium">ANO</p>
              <p 
                className="text-xs mt-1 font-semibold"
                style={{ color: casaColor }}
              >
                {contagemMissoes?.porSerie?.[serie] || 0} ativas
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-violet-500/10" />

      {/* 📊 Visão Geral */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 size={16} className="text-white/40" />
          <p className="text-white/40 text-xs uppercase tracking-widest font-medium">
            Visão Geral
          </p>
        </div>

        <div className="bg-white/5 rounded-xl border border-violet-500/10 p-4">
          <div className="grid grid-cols-4 gap-2 text-center">
            <button 
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              onClick={() => setShowMissoesModal(true)}
            >
              <p className="text-2xl font-bold text-white">
                {contagemMissoes?.totalUnico || 0}
              </p>
              <p className="text-[10px] text-white/40 font-medium">Missões<br/>ativas</p>
            </button>
            
            <button 
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              onClick={() => setShowEntregasModal(true)}
            >
              <p className={`font-bold text-white ${
                (estatisticas?.percentualNoPrazo || 0) === 100 ? 'text-lg' : 'text-2xl'
              }`}>
                {estatisticas?.percentualNoPrazo || 0}%
              </p>
              <p className="text-[10px] text-white/40 font-medium">Entregas<br/>no prazo</p>
            </button>
            
            <button 
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              onClick={() => navigate('/professor/entregas')}
            >
              <p className={`text-2xl font-bold ${(estatisticas?.entregasPendentes || 0) > 0 ? 'text-yellow-500' : 'text-white'}`}>
                {estatisticas?.entregasPendentes || 0}
              </p>
              <p className="text-[10px] text-white/40 font-medium">Pendentes<br/>avaliar</p>
            </button>
            
            <button 
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              onClick={() => navigate('/professor/alunos')}
            >
              <p className="text-2xl font-bold text-white">
                {estatisticas?.totalAlunos || 0}
              </p>
              <p className="text-[10px] text-white/40 font-medium">Alunos</p>
            </button>
          </div>
        </div>
      </div>

      {/* ⚡ Engajamento */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Zap size={16} className="text-white/40" />
          <p className="text-white/40 text-xs uppercase tracking-widest font-medium">
            Engajamento
          </p>
        </div>

        <div className="bg-white/5 rounded-xl border border-violet-500/10 p-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <button 
              className="p-3 rounded-lg hover:bg-white/10 transition-colors"
              onClick={() => engajamento?.rapidos.count && abrirModal('Alunos Rápidos', engajamento.rapidos.alunos, 'green')}
            >
              <p className="text-xl font-bold text-green-400">
                {engajamento?.rapidos.percent || 0}%
              </p>
              <p className="text-[10px] text-white/40 font-medium">
                {engajamento?.rapidos.count || 0} rapidos
              </p>
            </button>

            <button
              className="p-3 rounded-lg hover:bg-white/10 transition-colors"
              onClick={() => engajamento?.noPrazo.count && abrirModal('No Prazo', engajamento.noPrazo.alunos, 'blue')}
            >
              <p className="text-xl font-bold text-blue-400">
                {engajamento?.noPrazo.percent || 0}%
              </p>
              <p className="text-[10px] text-white/40 font-medium">
                {engajamento?.noPrazo.count || 0} no prazo
              </p>
            </button>

            <button
              className="p-3 rounded-lg hover:bg-white/10 transition-colors"
              onClick={() => engajamento?.atrasados.count && abrirModal('Atrasados', engajamento.atrasados.alunos, 'orange')}
            >
              <p className="text-xl font-bold text-orange-400">
                {engajamento?.atrasados.percent || 0}%
              </p>
              <p className="text-[10px] text-white/40 font-medium">
                {engajamento?.atrasados.count || 0} atrasados
              </p>
            </button>
          </div>
        </div>
      </div>

      {/* Status dos Alunos */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Users size={16} className="text-white/40" />
          <p className="text-white/40 text-xs uppercase tracking-widest font-medium">
            Status dos Alunos
          </p>
        </div>

        {statusAlunos ? (
          <div className="bg-white/5 rounded-xl border border-violet-500/10 p-4 space-y-4">
            {/* Entregaram */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500" /> Entregaram
                </span>
                <span className="text-sm text-white/60">
                  {statusAlunos.entregaram.count} ({statusAlunos.entregaram.percent}%)
                </span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all duration-500"
                  style={{ width: `${statusAlunos.entregaram.percent}%` }}
                />
              </div>
            </div>

            {/* Atrasados */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-yellow-500" /> Atrasados
                </span>
                <span className="text-sm text-white/60">
                  {statusAlunos.atrasados.count} ({statusAlunos.atrasados.percent}%)
                </span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-yellow-500 rounded-full transition-all duration-500"
                  style={{ width: `${statusAlunos.atrasados.percent}%` }}
                />
              </div>
            </div>

            {/* Não entregaram - Clicável */}
            <button
              className="w-full text-left"
              onClick={() => statusAlunos.naoEntregaram.alunos.length > 0 &&
                abrirModal('Não Entregaram', statusAlunos.naoEntregaram.alunos, 'red')
              }
            >
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500" /> Não entregaram
                </span>
                <span className="text-sm text-white/60 flex items-center gap-1">
                  {statusAlunos.naoEntregaram.count} ({statusAlunos.naoEntregaram.percent}%)
                  {statusAlunos.naoEntregaram.count > 0 && (
                    <ChevronRight size={14} className="text-white/40" />
                  )}
                </span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-500 rounded-full transition-all duration-500"
                  style={{ width: `${statusAlunos.naoEntregaram.percent}%` }}
                />
              </div>
            </button>
          </div>
        ) : (
          <div className="bg-white/5 rounded-xl border border-violet-500/10 p-4 text-center">
            <p className="text-white/40 text-sm">Nenhuma missão ativa no momento</p>
          </div>
        )}
      </div>

      {/* Modal de Lista de Alunos - Layout Compacto */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="max-w-sm mx-auto bg-[#1E1E3A] border-violet-500/10 p-0 gap-0" hideCloseButton>
        <DialogHeader className="p-4 border-b border-violet-500/10">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-white font-medium text-base flex items-center gap-2">
                <span>{modalIcone}</span>
                <span>{modalTitulo}</span>
              </DialogTitle>
              <p className="text-white/40 text-xs mt-0.5">
                {modalSubtitulo}
              </p>
            </div>
            
            <button 
              onClick={() => setModalAberto(false)}
              className="text-white/40 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </DialogHeader>
          
          {/* Cabeçalho da lista */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-violet-500/5">
            <span className="text-white/30 text-xs uppercase">Aluno</span>
            <div className="flex gap-4">
              <span className="text-white/30 text-xs uppercase w-8 text-center">Qtd</span>
              <span className="text-white/30 text-xs uppercase w-10 text-right">Média</span>
            </div>
          </div>
          
          {/* Lista compacta estilo Discord */}
          <div className="max-h-[60vh] overflow-y-auto">
            {modalAlunos.length === 0 ? (
              <p className="text-white/60 text-sm text-center py-8">
                Nenhum aluno encontrado
              </p>
            ) : (
              <div className="py-1">
                {modalAlunos.map(aluno => (
                  <div 
                    key={aluno.id}
                    className="flex items-center gap-2 py-2 px-4 hover:bg-white/5 transition-colors"
                  >
                    {/* Avatar pequeno (28px) com foto ou inicial */}
                    {aluno.avatar_url ? (
                      <img 
                        src={aluno.avatar_url} 
                        alt={aluno.nome || 'Aluno'}
                        className="w-7 h-7 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div 
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
                        style={{ backgroundColor: casaColor }}
                      >
                        {aluno.nome?.charAt(0).toUpperCase() || '?'}
                      </div>
                    )}
                    
                    {/* Nome + Série/Turma na mesma linha */}
                    <div className="flex-1 min-w-0 flex items-center">
                      <span className="text-white text-sm font-medium truncate">
                        {aluno.nome}
                      </span>
                      <span className="text-white/40 text-xs ml-2 flex-shrink-0">
                        {aluno.serie}º{aluno.turma}
                      </span>
                    </div>
                    
                    {/* Quantidade de entregas */}
                    <span className={`text-sm font-bold w-8 text-center ${
                      modalCor === 'green' ? 'text-green-400' : 
                      modalCor === 'blue' ? 'text-blue-400' : 
                      modalCor === 'orange' ? 'text-orange-400' : 'text-white'
                    }`}>
                      {aluno.entregas || '-'}
                    </span>
                    
                    {/* Tempo médio */}
                    <span className="text-white/40 text-xs w-10 text-right">
                      {aluno.tempoMedio !== undefined 
                        ? (aluno.tempoMedio < 24 ? `${aluno.tempoMedio}h` : `${Math.floor(aluno.tempoMedio / 24)}d`)
                        : '-'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Footer com contagem */}
          <div className="p-4 border-t border-violet-500/10">
            <p className="text-white/40 text-xs text-center">
              {modalAlunos.length} {modalAlunos.length === 1 ? 'aluno' : 'alunos'} • {modalAlunos.reduce((s, a) => s + (a.entregas || 0), 0)} entregas
            </p>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Modal de Missões Ativas por Série */}
      <MissoesAtivasModal
        isOpen={showMissoesModal}
        onClose={() => setShowMissoesModal(false)}
        dados={dadosMissoesModal}
      />
      
      {/* Modal de Entregas por Turma */}
      <EntregasPorTurmaModal
        isOpen={showEntregasModal}
        onClose={() => setShowEntregasModal(false)}
        dados={entregasPorTurma || []}
      />
    </div>
  );
};

export default MissoesPage;
