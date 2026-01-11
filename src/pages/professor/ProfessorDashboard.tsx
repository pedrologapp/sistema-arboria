import { useState } from 'react';
import { useProfessor } from '@/contexts/ProfessorContext';
import { ClipboardList, PenLine, Users, Settings, BookOpen, ChevronRight } from 'lucide-react';
import { CasaBrasao } from '@/components/CasaBrasao';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import ConteudoModal from '@/components/professor/ConteudoModal';

// Detectar gênero pelo primeiro nome (heurística simples)
const getGenero = (nome: string): 'masculino' | 'feminino' => {
  const primeiroNome = (nome?.toLowerCase() || '').split(' ')[0];
  const nomesFemininos = ['julianeide', 'maria', 'ana', 'paula', 'carla', 'fernanda', 'julia', 'beatriz', 'leticia', 'amanda', 'camila', 'larissa', 'bruna', 'gabriela', 'isabela', 'mariana', 'patricia', 'renata', 'vanessa', 'cristina', 'luciana', 'adriana', 'sandra', 'monica', 'tatiana', 'priscila', 'daniela', 'fabiana', 'juliana', 'rafaela', 'simone', 'viviane', 'alessandra', 'carolina', 'debora', 'elaine', 'flavia', 'gisele', 'helena', 'ines', 'jessica', 'katia', 'lidia', 'miriam', 'natalia', 'olivia', 'paloma', 'raquel', 'sabrina', 'thais', 'ursula', 'vera', 'wagner', 'ximena', 'yara', 'zelia'];
  const nomesExcecao = ['luca', 'josue', 'jonas', 'elias', 'matias', 'tobias', 'isaias', 'jeremias', 'esdras', 'barnaba'];
  
  if (nomesFemininos.includes(primeiroNome)) {
    return 'feminino';
  }
  
  if (nomesExcecao.includes(primeiroNome)) {
    return 'masculino';
  }
  
  // Heurística: nomes terminados em 'a' geralmente são femininos
  if (primeiroNome.endsWith('a')) {
    return 'feminino';
  }
  
  return 'masculino';
};

const ProfessorDashboard = () => {
  const { profile, casaMentor, casaColor, faseAtual } = useProfessor();
  const navigate = useNavigate();
  const [showConteudoModal, setShowConteudoModal] = useState(false);

  // Query: Missões Ativas
  const { data: missoesAtivas } = useQuery({
    queryKey: ['missoes-ativas-count', profile?.institution_id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('missoes')
        .select('*', { count: 'exact', head: true })
        .eq('institution_id', profile?.institution_id!)
        .eq('status', 'liberada');

      if (error) {
        console.error('Erro ao contar missões:', error);
        return 0;
      }
      return count || 0;
    },
    enabled: !!profile?.institution_id
  });

  // Query: Entregas Pendentes
  const { data: entregasPendentes } = useQuery({
    queryKey: ['entregas-pendentes-count', profile?.institution_id],
    queryFn: async () => {
      const { data: missoes } = await supabase
        .from('missoes')
        .select('id')
        .eq('institution_id', profile?.institution_id!);

      if (!missoes || missoes.length === 0) return 0;

      const { count, error } = await supabase
        .from('entregas')
        .select('*', { count: 'exact', head: true })
        .in('missao_id', missoes.map(m => m.id))
        .eq('status', 'pendente');

      if (error) {
        console.error('Erro ao contar entregas:', error);
        return 0;
      }
      return count || 0;
    },
    enabled: !!profile?.institution_id
  });

  const genero = getGenero(profile?.full_name || profile?.nome || '');
  const tituloMentor = genero === 'feminino' ? 'Mentora' : 'Mentor';

  const quickActions = [
    { 
      icon: <ClipboardList size={24} />, 
      label: 'Fazer Observação', 
      path: '/professor/circulo',
      description: 'Nova observação para alunos',
      isModal: false
    },
    { 
      icon: <PenLine size={24} />, 
      label: 'Avaliar Entregas', 
      path: '/professor/entregas',
      description: 'Pendentes de avaliação',
      isModal: false
    },
    { 
      icon: <Users size={24} />, 
      label: 'Meus Alunos', 
      path: '/professor/alunos',
      description: 'Ver alunos da casa',
      isModal: false
    },
    { 
      icon: <BookOpen size={24} />, 
      label: 'Conteúdo', 
      path: null,
      description: 'Materiais e essência Arboria',
      isModal: true
    },
  ];

  const firstName = profile?.nome || profile?.full_name?.split(' ')[0] || 'Professor';

  const handleActionClick = (action: typeof quickActions[0]) => {
    if (action.isModal) {
      setShowConteudoModal(true);
    } else if (action.path) {
      navigate(action.path);
    }
  };

  return (
    <div className="p-4 space-y-6">
      {/* Welcome Section */}
      <div className="relative text-center pt-2">
        {/* Settings Icon - Premium */}
        <button
          onClick={() => navigate('/professor/configuracoes')}
          className="absolute top-0 right-0 p-2 rounded-full 
            text-white/40 bg-white/5
            hover:text-white hover:bg-white/10 hover:scale-110
            transition-all duration-200"
          aria-label="Configurações"
        >
          <Settings className="w-5 h-5" />
        </button>
        
        <h1 className="text-2xl font-bold text-white mb-6">
          Olá, {firstName}! 👋
        </h1>

        {/* Casa Card - Premium Glassmorphism */}
        {casaMentor && (
          <div 
            className="relative overflow-hidden p-6 rounded-2xl text-center
              bg-[rgba(26,26,30,0.85)] backdrop-blur-xl
              border border-white/10
              shadow-xl transition-all duration-300"
            style={{
              boxShadow: `0 20px 40px -12px ${casaColor}30`
            }}
          >
            {/* Glow decorativo superior direito */}
            <div 
              className="absolute -top-12 -right-12 w-40 h-40 rounded-full blur-3xl opacity-20 pointer-events-none"
              style={{ backgroundColor: casaColor }}
            />
            {/* Glow decorativo inferior esquerdo */}
            <div 
              className="absolute -bottom-12 -left-12 w-32 h-32 rounded-full blur-2xl opacity-15 pointer-events-none"
              style={{ backgroundColor: casaColor }}
            />
            
            <div className="relative z-10">
              <div className="flex justify-center mb-3">
                <CasaBrasao 
                  brasaoUrl={casaMentor.brasao_url} 
                  emoji={casaMentor.emoji} 
                  nome={casaMentor.nome}
                  size="large"
                />
              </div>
              <h2 
                className="text-xl font-bold mb-1"
                style={{ color: casaColor }}
              >
                Casa {casaMentor.nome}
              </h2>
              <p className="text-white/50 text-sm font-light">{tituloMentor}</p>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="space-y-3">
        <h3 className="text-xs font-medium text-white/50 uppercase tracking-widest">
          Ações Rápidas
        </h3>
        
        <div className="grid gap-3">
          {quickActions.map((action) => (
            <button
              key={action.label}
              onClick={() => handleActionClick(action)}
              className="flex items-center gap-4 p-4 rounded-xl text-left group
                bg-gradient-to-r from-white/[0.06] to-white/[0.02]
                backdrop-blur-sm border border-white/10
                hover:scale-[1.02] hover:border-white/20
                transition-all duration-300 ease-out
                active:scale-[0.98]"
              style={{
                boxShadow: `0 4px 20px -4px ${casaColor}15`
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = `0 8px 30px -4px ${casaColor}30`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = `0 4px 20px -4px ${casaColor}15`;
              }}
            >
              <div 
                className="p-3 rounded-lg shadow-lg transition-all duration-300 group-hover:scale-110"
                style={{ 
                  backgroundColor: `${casaColor}20`,
                  color: casaColor,
                  boxShadow: `0 4px 12px -2px ${casaColor}30`
                }}
              >
                {action.icon}
              </div>
              <div className="flex-1">
                <span className="text-white font-semibold block">{action.label}</span>
                <span className="text-white/50 text-sm font-light">{action.description}</span>
              </div>
              <ChevronRight 
                className="w-5 h-5 text-white/30 group-hover:text-white/60 group-hover:translate-x-1 transition-all duration-300" 
              />
            </button>
          ))}
        </div>
      </div>

      {/* Stats - Premium */}
      <div className="grid grid-cols-2 gap-3">
        <div 
          className="p-4 rounded-xl text-center
            bg-gradient-to-br from-white/[0.06] to-white/[0.02]
            backdrop-blur-sm border border-white/10
            hover:scale-[1.02] transition-all duration-300
            active:scale-[0.98] cursor-pointer"
          style={{
            boxShadow: `0 4px 20px -4px ${casaColor}15`
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = `0 8px 25px -4px ${casaColor}25`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = `0 4px 20px -4px ${casaColor}15`;
          }}
        >
          <div className="text-2xl font-bold text-white">
            {missoesAtivas ?? '--'}
          </div>
          <div className="text-xs text-white/50 font-light">Missões Ativas</div>
        </div>
        <div 
          className="p-4 rounded-xl text-center
            bg-gradient-to-br from-white/[0.06] to-white/[0.02]
            backdrop-blur-sm border border-white/10
            hover:scale-[1.02] transition-all duration-300
            active:scale-[0.98] cursor-pointer"
          style={{
            boxShadow: `0 4px 20px -4px ${casaColor}15`
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = `0 8px 25px -4px ${casaColor}25`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = `0 4px 20px -4px ${casaColor}15`;
          }}
        >
          <div className={cn(
            "text-2xl font-bold",
            entregasPendentes && entregasPendentes > 0 
              ? "text-yellow-400" 
              : "text-white"
          )}>
            {entregasPendentes ?? '--'}
          </div>
          <div className="text-xs text-white/50 font-light">Entregas Pendentes</div>
        </div>
      </div>

      {/* Modal de Conteúdo */}
      <ConteudoModal
        isOpen={showConteudoModal}
        onClose={() => setShowConteudoModal(false)}
        faseAtual={faseAtual}
      />
    </div>
  );
};

export default ProfessorDashboard;
