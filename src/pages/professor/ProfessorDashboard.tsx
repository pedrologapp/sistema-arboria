import { useProfessor } from '@/contexts/ProfessorContext';
import { ClipboardList, PenLine, Users, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ProfessorDashboard = () => {
  const { profile, casaMentor, casaColor } = useProfessor();
  const navigate = useNavigate();

  const quickActions = [
    { 
      icon: <ClipboardList size={24} />, 
      label: 'Criar Missão', 
      path: '/professor/missoes/nova',
      description: 'Nova tarefa para os alunos'
    },
    { 
      icon: <PenLine size={24} />, 
      label: 'Avaliar Entregas', 
      path: '/professor/entregas',
      description: 'Pendentes de avaliação'
    },
    { 
      icon: <Users size={24} />, 
      label: 'Meus Alunos', 
      path: '/professor/alunos',
      description: 'Ver alunos da casa'
    },
  ];

  const firstName = profile?.nome || profile?.full_name?.split(' ')[0] || 'Professor';

  return (
    <div className="space-y-6 pt-4">
      {/* Welcome Section */}
      <div className="relative text-center space-y-2">
        {/* Settings Icon */}
        <button
          onClick={() => navigate('/professor/configuracoes')}
          className="absolute top-0 right-0 p-2 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Configurações"
        >
          <Settings className="w-5 h-5" />
        </button>
        
        <h1 className="text-2xl font-bold text-white">
          Olá, {firstName}! 👋
        </h1>
        {casaMentor && (
          <p className="text-white/60">
            Mentor da Casa{' '}
            <span style={{ color: casaColor }}>
              {casaMentor.emoji} {casaMentor.nome}
            </span>
          </p>
        )}
      </div>

      {/* Casa Card */}
      {casaMentor && (
        <div 
          className="p-6 rounded-2xl border text-center"
          style={{
            backgroundColor: `${casaColor}10`,
            borderColor: `${casaColor}30`
          }}
        >
          <div className="text-5xl mb-3">{casaMentor.emoji}</div>
          <h2 
            className="text-xl font-bold mb-1"
            style={{ color: casaColor }}
          >
            Casa {casaMentor.nome}
          </h2>
          <p className="text-white/50 text-sm">{casaMentor.descricao}</p>
        </div>
      )}

      {/* Quick Actions */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-white/40 uppercase tracking-wider">
          Ações Rápidas
        </h3>
        
        <div className="grid gap-3">
          {quickActions.map((action) => (
            <button
              key={action.path}
              onClick={() => navigate(action.path)}
              className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-left group"
            >
              <div 
                className="p-3 rounded-lg"
                style={{ 
                  backgroundColor: `${casaColor}20`,
                  color: casaColor 
                }}
              >
                {action.icon}
              </div>
              <div className="flex-1">
                <span className="text-white font-medium block">{action.label}</span>
                <span className="text-white/40 text-sm">{action.description}</span>
              </div>
              <span className="text-white/30 group-hover:text-white/60 transition-colors">→</span>
            </button>
          ))}
        </div>
      </div>

      {/* Placeholder Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
          <div className="text-2xl font-bold text-white">--</div>
          <div className="text-xs text-white/40">Missões Ativas</div>
        </div>
        <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
          <div className="text-2xl font-bold text-white">--</div>
          <div className="text-xs text-white/40">Entregas Pendentes</div>
        </div>
      </div>
    </div>
  );
};

export default ProfessorDashboard;
