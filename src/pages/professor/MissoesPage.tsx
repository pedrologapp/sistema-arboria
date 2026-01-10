import { Plus, ChevronRight, BarChart3, Zap, Users } from 'lucide-react';
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

interface AlunoLista {
  id: string;
  nome: string;
  sobrenome: string | null;
  serie: string | null;
  turma: string | null;
}

const MissoesPage = () => {
  const navigate = useNavigate();
  const { casaMentor, casaColor, profile } = useProfessor();
  
  // Modal state
  const [modalAberto, setModalAberto] = useState(false);
  const [modalTitulo, setModalTitulo] = useState('');
  const [modalAlunos, setModalAlunos] = useState<AlunoLista[]>([]);
  const [modalCor, setModalCor] = useState('');

  // Contar missões liberadas por série
  const { data: contagemPorSerie } = useQuery({
    queryKey: ['contagem-missoes-serie', casaMentor?.id, profile?.institution_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('missoes')
        .select('serie_filtro')
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
      return contagem;
    },
    enabled: !!casaMentor?.id && !!profile?.institution_id
  });

  // Total de missões ativas
  const totalMissoesAtivas = contagemPorSerie 
    ? Object.values(contagemPorSerie).reduce((a, b) => a + b, 0) / 4 // Divide por 4 pois soma em todas séries
    : 0;

  // Estatísticas gerais
  const { data: estatisticas } = useQuery({
    queryKey: ['estatisticas-missoes', casaMentor?.id, profile?.institution_id],
    queryFn: async () => {
      // Buscar IDs das missões da casa
      const { data: missoes } = await supabase
        .from('missoes')
        .select('id')
        .eq('casa_id', casaMentor!.id)
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
          .eq('status', 'pendente');
        entregasPendentes = count || 0;
      }

      // Total de entregas (aprovadas)
      let totalEntregas = 0;
      let entregasNoPrazo = 0;
      if (missaoIds.length > 0) {
        const { data: entregasData } = await supabase
          .from('entregas')
          .select('id, entregue_no_prazo')
          .in('missao_id', missaoIds)
          .eq('status', 'aprovado');
        
        totalEntregas = entregasData?.length || 0;
        entregasNoPrazo = entregasData?.filter(e => e.entregue_no_prazo).length || 0;
      }

      // Alunos ativos (última atividade nas últimas 24h)
      const ontem = new Date();
      ontem.setDate(ontem.getDate() - 1);
      
      const { count: alunosAtivos } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('casa_id', casaMentor!.id)
        .eq('institution_id', profile!.institution_id!)
        .not('casa_id', 'is', null)
        .gte('ultima_atividade', ontem.toISOString());

      // Percentual de entregas no prazo
      const percentualNoPrazo = totalEntregas > 0 
        ? Math.round((entregasNoPrazo / totalEntregas) * 100) 
        : 0;

      return {
        entregasPendentes,
        alunosAtivos: alunosAtivos || 0,
        percentualNoPrazo,
        missaoIds
      };
    },
    enabled: !!casaMentor?.id && !!profile?.institution_id
  });

  // Engajamento dos alunos
  const { data: engajamento } = useQuery({
    queryKey: ['engajamento-alunos', casaMentor?.id, profile?.institution_id],
    queryFn: async () => {
      // Buscar IDs das missões da casa
      const { data: missoes } = await supabase
        .from('missoes')
        .select('id, data_liberacao, data_prazo')
        .eq('casa_id', casaMentor!.id)
        .eq('institution_id', profile!.institution_id!)
        .eq('status', 'liberada');
      
      if (!missoes || missoes.length === 0) {
        return { rapidos: { count: 0, percent: 0 }, noPrazo: { count: 0, percent: 0 }, atrasados: { count: 0, percent: 0 } };
      }

      const missaoIds = missoes.map(m => m.id);
      const missaoMap = new Map(missoes.map(m => [m.id, m]));

      // Buscar entregas aprovadas
      const { data: entregas } = await supabase
        .from('entregas')
        .select('id, aluno_id, data_entrega, missao_id, entregue_no_prazo')
        .in('missao_id', missaoIds)
        .eq('status', 'aprovado');

      if (!entregas || entregas.length === 0) {
        return { rapidos: { count: 0, percent: 0 }, noPrazo: { count: 0, percent: 0 }, atrasados: { count: 0, percent: 0 } };
      }

      // Classificar entregas
      let rapidosCount = 0;
      let noPrazoCount = 0;
      let atrasadosCount = 0;

      entregas.forEach(entrega => {
        const missao = missaoMap.get(entrega.missao_id);
        if (!missao || !entrega.data_entrega) return;

        const liberacao = new Date(missao.data_liberacao).getTime();
        const prazo = new Date(missao.data_prazo).getTime();
        const entregou = new Date(entrega.data_entrega).getTime();
        
        const prazoTotal = prazo - liberacao;
        const tempoUsado = entregou - liberacao;
        const percentualUsado = (tempoUsado / prazoTotal) * 100;

        if (!entrega.entregue_no_prazo) {
          atrasadosCount++;
        } else if (percentualUsado <= 50) {
          rapidosCount++;
        } else {
          noPrazoCount++;
        }
      });

      const total = entregas.length;
      return {
        rapidos: { count: rapidosCount, percent: total > 0 ? Math.round((rapidosCount / total) * 100) : 0 },
        noPrazo: { count: noPrazoCount, percent: total > 0 ? Math.round((noPrazoCount / total) * 100) : 0 },
        atrasados: { count: atrasadosCount, percent: total > 0 ? Math.round((atrasadosCount / total) * 100) : 0 }
      };
    },
    enabled: !!casaMentor?.id && !!profile?.institution_id
  });

  // Status dos alunos
  const { data: statusAlunos } = useQuery({
    queryKey: ['status-alunos-missoes', casaMentor?.id, profile?.institution_id],
    queryFn: async () => {
      // Total de alunos da casa
      const { data: alunos } = await supabase
        .from('profiles')
        .select('id, nome, sobrenome, serie, turma')
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

      // Buscar IDs das missões ativas
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
    enabled: !!casaMentor?.id && !!profile?.institution_id
  });

  const abrirModal = (titulo: string, alunos: AlunoLista[], cor: string) => {
    setModalTitulo(titulo);
    setModalAlunos(alunos);
    setModalCor(cor);
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
              className="p-5 bg-white/5 hover:bg-white/10 rounded-xl text-center transition-colors border border-white/10"
            >
              <p className="text-3xl font-bold text-white">{serie}º</p>
              <p className="text-white/60 text-sm font-medium">ANO</p>
              <p 
                className="text-xs mt-1 font-semibold"
                style={{ color: casaColor }}
              >
                {contagemPorSerie?.[serie] || 0} ativas
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-white/10" />

      {/* 📊 Visão Geral */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 size={16} className="text-white/40" />
          <p className="text-white/40 text-xs uppercase tracking-widest font-medium">
            Visão Geral
          </p>
        </div>

        <div className="bg-white/5 rounded-xl border border-white/10 p-4">
          <div className="grid grid-cols-4 gap-2 text-center">
            <button 
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              onClick={() => {
                const element = document.querySelector('[data-series-section]');
                element?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <p className="text-2xl font-bold text-white">
                {Math.round(totalMissoesAtivas)}
              </p>
              <p className="text-[10px] text-white/40 font-medium">Missões<br/>ativas</p>
            </button>
            
            <button 
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <p className="text-2xl font-bold text-white">
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
                {estatisticas?.alunosAtivos || 0}
              </p>
              <p className="text-[10px] text-white/40 font-medium">Alunos<br/>ativos</p>
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

        <div className="bg-white/5 rounded-xl border border-white/10 p-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <button 
              className="p-3 rounded-lg hover:bg-white/10 transition-colors"
              onClick={() => engajamento?.rapidos.count && abrirModal('⚡ Alunos Rápidos', [], 'green')}
            >
              <p className="text-2xl mb-1">⚡</p>
              <p className="text-xl font-bold text-white">
                {engajamento?.rapidos.percent || 0}%
              </p>
              <p className="text-[10px] text-white/40 font-medium">
                {engajamento?.rapidos.count || 0} rápidos
              </p>
            </button>
            
            <button 
              className="p-3 rounded-lg hover:bg-white/10 transition-colors"
              onClick={() => engajamento?.noPrazo.count && abrirModal('🚶 Alunos No Prazo', [], 'blue')}
            >
              <p className="text-2xl mb-1">🚶</p>
              <p className="text-xl font-bold text-white">
                {engajamento?.noPrazo.percent || 0}%
              </p>
              <p className="text-[10px] text-white/40 font-medium">
                {engajamento?.noPrazo.count || 0} no prazo
              </p>
            </button>
            
            <button 
              className="p-3 rounded-lg hover:bg-white/10 transition-colors"
              onClick={() => engajamento?.atrasados.count && abrirModal('🐢 Alunos Atrasados', [], 'yellow')}
            >
              <p className="text-2xl mb-1">🐢</p>
              <p className="text-xl font-bold text-white">
                {engajamento?.atrasados.percent || 0}%
              </p>
              <p className="text-[10px] text-white/40 font-medium">
                {engajamento?.atrasados.count || 0} lentos
              </p>
            </button>
          </div>
        </div>
      </div>

      {/* 👥 Status dos Alunos */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Users size={16} className="text-white/40" />
          <p className="text-white/40 text-xs uppercase tracking-widest font-medium">
            Status dos Alunos
          </p>
        </div>

        <div className="bg-white/5 rounded-xl border border-white/10 p-4 space-y-4">
          {/* Entregaram */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm text-white flex items-center gap-2">
                <span className="text-green-500">🟢</span> Entregaram
              </span>
              <span className="text-sm text-white/60">
                {statusAlunos?.entregaram.count || 0} ({statusAlunos?.entregaram.percent || 0}%)
              </span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-500 rounded-full transition-all duration-500"
                style={{ width: `${statusAlunos?.entregaram.percent || 0}%` }}
              />
            </div>
          </div>

          {/* Atrasados */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm text-white flex items-center gap-2">
                <span className="text-yellow-500">🟡</span> Atrasados
              </span>
              <span className="text-sm text-white/60">
                {statusAlunos?.atrasados.count || 0} ({statusAlunos?.atrasados.percent || 0}%)
              </span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-yellow-500 rounded-full transition-all duration-500"
                style={{ width: `${statusAlunos?.atrasados.percent || 0}%` }}
              />
            </div>
          </div>

          {/* Não entregaram - Clicável */}
          <button 
            className="w-full text-left"
            onClick={() => statusAlunos?.naoEntregaram.alunos && statusAlunos.naoEntregaram.alunos.length > 0 && 
              abrirModal('🔴 Não Entregaram', statusAlunos.naoEntregaram.alunos, 'red')
            }
          >
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm text-white flex items-center gap-2">
                <span className="text-red-500">🔴</span> Não entregaram
              </span>
              <span className="text-sm text-white/60 flex items-center gap-1">
                {statusAlunos?.naoEntregaram.count || 0} ({statusAlunos?.naoEntregaram.percent || 0}%)
                {(statusAlunos?.naoEntregaram.count || 0) > 0 && (
                  <ChevronRight size={14} className="text-white/40" />
                )}
              </span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-red-500 rounded-full transition-all duration-500"
                style={{ width: `${statusAlunos?.naoEntregaram.percent || 0}%` }}
              />
            </div>
          </button>
        </div>
      </div>

      {/* Modal de Lista de Alunos */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="max-w-sm mx-auto bg-[#1a1a1a] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">{modalTitulo}</DialogTitle>
          </DialogHeader>
          
          <div className="max-h-[60vh] overflow-y-auto space-y-2">
            {modalAlunos.length === 0 ? (
              <p className="text-white/60 text-sm text-center py-4">
                Nenhum aluno encontrado
              </p>
            ) : (
              modalAlunos.map(aluno => (
                <div 
                  key={aluno.id}
                  className="flex items-center gap-3 p-3 bg-white/5 rounded-lg"
                >
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                    style={{ backgroundColor: casaColor }}
                  >
                    {aluno.nome?.charAt(0) || '?'}
                  </div>
                  <div>
                    <p className="text-white font-medium">
                      {aluno.nome} {aluno.sobrenome}
                    </p>
                    <p className="text-white/60 text-xs">
                      {aluno.serie}º {aluno.turma}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MissoesPage;
