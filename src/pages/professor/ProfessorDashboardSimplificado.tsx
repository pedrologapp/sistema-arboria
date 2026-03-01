import { useState } from 'react';
import { useProfessor } from '@/contexts/ProfessorContext';
import { ClipboardList, Users, Settings, BookOpen, ChevronRight, CalendarDays } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

import BannerFaseInfo from '@/components/professor/BannerFaseInfo';
import { AlertBoxesTurmas } from '@/components/professor/AlertBoxesTurmas';
import CalendarioFasesModal, { FaseComDatas } from '@/components/professor/CalendarioFasesModal';

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

const ProfessorDashboardSimplificado = () => {
  const { profile, faseAtual, turmasVinculadas, segmento } = useProfessor();
  const navigate = useNavigate();
  
  const [showCalendarioModal, setShowCalendarioModal] = useState(false);
  
  // Cor fixa para professores sem casa
  const accentColor = '#6366f1';

  const genero = getGenero(profile?.full_name || profile?.nome || '');
  const titulo = genero === 'feminino' ? 'Professora' : 'Professor';

  // Buscar todas as fases do ano para o calendário
  const { data: fasesAno } = useQuery({
    queryKey: ['fases-ano-professor', profile?.institution_id, segmento],
    queryFn: async () => {
      if (!profile?.institution_id || !segmento) return [];
      
      const { data, error } = await supabase
        .from('fases')
        .select(`
          id, numero_fase, data_inicio, data_fim, ativo,
          inteligencias!fases_inteligencia_id_fkey (
            nome, cor_hex, emoji
          )
        `)
        .eq('institution_id', profile.institution_id)
        .eq('segmento', segmento)
        .eq('ano_letivo', new Date().getFullYear())
        .order('numero_fase');

      if (error) throw error;
      
      // Mapear para o formato esperado
      return (data || []).map(fase => ({
        id: fase.id,
        numero_fase: fase.numero_fase,
        data_inicio: fase.data_inicio,
        data_fim: fase.data_fim,
        ativo: fase.ativo,
        inteligencia: fase.inteligencias as { nome: string; cor_hex: string | null; emoji: string | null } | null
      })) as FaseComDatas[];
    },
    enabled: !!profile?.institution_id && !!segmento
  });

  const quickActions = [
    { 
      icon: <ClipboardList size={24} />, 
      label: 'Fazer Observação', 
      path: '/professor/circulo',
      description: 'Registrar observação de alunos',
      isModal: false,
      modalType: null
    },
    { 
      icon: <Users size={24} />, 
      label: 'Meus Alunos', 
      path: '/professor/alunos',
      description: 'Ver alunos das suas turmas',
      isModal: false,
      modalType: null
    },
    { 
      icon: <BookOpen size={24} />, 
      label: 'Conteúdo', 
      path: '/professor/conteudo',
      description: 'Materiais e essência Arboria',
      isModal: false,
      modalType: null
    },
    { 
      icon: <CalendarDays size={24} />, 
      label: 'Calendário', 
      path: null,
      description: 'Ver fases do ano letivo',
      isModal: true,
      modalType: 'calendario'
    },
  ];

  const firstName = profile?.nome || profile?.full_name?.split(' ')[0] || 'Professor';

  const handleActionClick = (action: typeof quickActions[0]) => {
    if (action.isModal) {
      if (action.modalType === 'calendario') {
        setShowCalendarioModal(true);
      }
    } else if (action.path) {
      navigate(action.path);
    }
  };

  // Label do segmento
  const segmentoLabel = segmento === 'infantil' ? 'Educação Infantil' : 
                         segmento === 'fundamental1' ? 'Fundamental 1' : '';

  return (
    <div className="p-4 space-y-6">
      {/* Welcome Section */}
      <div className="relative text-center pt-2">
        {/* Settings Icon */}
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
        
        <h1 className="text-2xl font-bold text-white mb-1">
          Olá, {firstName}!
        </h1>
        <p className="text-white/50 text-sm mb-4">
          {titulo} • <span style={{ color: faseAtual?.inteligencia?.cor_hex || '#fff' }}>
            {faseAtual?.inteligencia?.nome 
              ? `Fase ${faseAtual.inteligencia.nome}` 
              : 'Nenhuma fase ativa'}
          </span>
        </p>

        {/* Banner Informativo de Fase */}
        <BannerFaseInfo 
          faseAtual={faseAtual}
          faseCasaMentor={null}
          casaMentor={null}
        />
      </div>

      {/* Minhas Turmas */}
      {turmasVinculadas && turmasVinculadas.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-medium text-white/50 uppercase tracking-widest">
            Minhas Turmas
          </h3>
          
          <div className="grid grid-cols-2 gap-3">
            {turmasVinculadas.map((turma) => (
              <button
                key={turma.id}
                onClick={() => navigate(`/professor/circulo/turma/${turma.id}`)}
                className="p-4 rounded-xl text-center
                  bg-gradient-to-br from-white/[0.06] to-white/[0.02]
                  backdrop-blur-sm border border-white/10
                  hover:scale-[1.02] transition-all duration-300
                  active:scale-[0.98]"
                style={{
                  boxShadow: `0 4px 20px -4px ${accentColor}15`
                }}
              >
                <div className="text-xl font-bold text-white mb-1">
                  {turma.nome}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Alertas das Turmas */}
      {turmasVinculadas && turmasVinculadas.length > 0 && (
        <AlertBoxesTurmas 
          onAlunoClick={(alunoId) => navigate(`/professor/alunos/${alunoId}`)} 
        />
      )}

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
              className="relative flex items-center gap-4 p-4 rounded-xl text-left group
                bg-gradient-to-r from-white/[0.06] to-white/[0.02]
                backdrop-blur-sm border border-white/10
                hover:scale-[1.02] hover:border-white/20
                transition-all duration-300 ease-out
                active:scale-[0.98]"
              style={{
                boxShadow: `0 4px 20px -4px ${accentColor}15`
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = `0 8px 30px -4px ${accentColor}30`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = `0 4px 20px -4px ${accentColor}15`;
              }}
            >
              <div 
                className="p-3 rounded-lg shadow-lg transition-all duration-300 group-hover:scale-110"
                style={{ 
                  backgroundColor: `${accentColor}20`,
                  color: accentColor,
                  boxShadow: `0 4px 12px -2px ${accentColor}30`
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

      {/* Modal de Calendário */}
      <CalendarioFasesModal
        isOpen={showCalendarioModal}
        onClose={() => setShowCalendarioModal(false)}
        fases={fasesAno || []}
        anoLetivo={new Date().getFullYear()}
        modoEdicao={false}
      />
    </div>
  );
};

export default ProfessorDashboardSimplificado;
