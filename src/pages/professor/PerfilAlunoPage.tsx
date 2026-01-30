import { useState } from 'react';
import { 
  ArrowLeft, 
  MessageCircle, 
  Loader2, 
  Star, 
  BarChart3, 
  AlertTriangle, 
  Brain, 
  Eye,
  ClipboardList,
  CheckCircle,
  PlusCircle
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useProfessor } from '@/contexts/ProfessorContext';
import { usePerfilAluno, type PerfilAlunoData } from '@/hooks/usePerfilAluno';
import { FeedbackEstadoCard } from '@/components/professor/FeedbackEstadoCard';
import HistoricoObservacoes from '@/components/professor/HistoricoObservacoes';
import RegistrarAcaoModal from '@/components/professor/RegistrarAcaoModal';
import RegistrarConversaModal from '@/components/professor/RegistrarConversaModal';

// ============ COMPONENTES AUXILIARES ============

interface StatusCardProps {
  status: PerfilAlunoData['status'];
  percentual: number;
  media: number;
}

const StatusCard = ({ status, percentual, media }: StatusCardProps) => {
  const config = {
    destaque: {
      bg: 'bg-green-500/10',
      border: 'border-green-500/20',
      texto: 'text-green-400',
      Icon: Star,
      label: 'DESTAQUE'
    },
    regular: {
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/20',
      texto: 'text-yellow-400',
      Icon: BarChart3,
      label: 'REGULAR'
    },
    risco: {
      bg: 'bg-red-500/10',
      border: 'border-red-500/20',
      texto: 'text-red-400',
      Icon: AlertTriangle,
      label: 'EM RISCO'
    }
  }[status];

  const IconComponent = config.Icon;

  return (
    <div className={`p-4 rounded-xl border ${config.bg} ${config.border}`}>
      <p className={`font-semibold ${config.texto} flex items-center gap-2`}>
        <IconComponent className="w-4 h-4" strokeWidth={2} />
        <span>{config.label}</span>
      </p>
      <p className="text-white/60 text-sm mt-1">
        {Math.round(percentual)}% entregas • Média {media.toFixed(1)}
      </p>
    </div>
  );
};

interface InteligenciaProgressBarProps {
  emoji: string;
  nome: string;
  score: number;
  cor: string;
}

const InteligenciaProgressBar = ({ emoji, nome, score, cor }: InteligenciaProgressBarProps) => {
  return (
    <div className="flex items-center gap-3">
      <span className="text-base w-6 flex-shrink-0">{emoji}</span>
      <span className="text-white/60 text-sm w-24 truncate flex-shrink-0">{nome}</span>
      <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
        <div 
          className="h-full rounded-full transition-all duration-500"
          style={{ 
            width: `${Math.min(score, 100)}%`,
            backgroundColor: cor 
          }}
        />
      </div>
      <span className="text-white/40 text-xs w-10 text-right flex-shrink-0">
        {Math.round(score)}%
      </span>
    </div>
  );
};

interface MissaoStatusLinhaProps {
  missao: PerfilAlunoData['missoes'][0];
}

const MissaoStatusLinha = ({ missao }: MissaoStatusLinhaProps) => {
  const statusConfig = {
    aprovada: { color: '#22C55E', label: 'Aprovada' },
    aguardando: { color: '#EAB308', label: 'Aguardando' },
    pendente: { color: '#F97316', label: 'Pendente' },
    nao_entregue: { color: '#EF4444', label: 'Não entregue' }
  }[missao.status];

  const titulo = missao.semana 
    ? `Semana ${missao.semana} - ${missao.tipoMissao === 'geral' ? 'Geral' : 'Individual'}`
    : missao.titulo;

  const statusTexto = missao.status === 'aprovada' && missao.nota !== null
    ? `${missao.nota}/10`
    : statusConfig.label;

  return (
    <div className="flex items-center justify-between py-2.5 px-3 bg-white/5 rounded-lg">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div 
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: statusConfig.color }}
        />
        <span className="text-white/80 text-sm truncate">{titulo}</span>
      </div>
      <span 
        className="text-sm flex-shrink-0 ml-2"
        style={{ color: statusConfig.color }}
      >
        {statusTexto}
      </span>
    </div>
  );
};

// ============ PÁGINA PRINCIPAL ============

const PerfilAlunoPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { casaColor } = useProfessor();
  const { data: aluno, isLoading, error, refetch } = usePerfilAluno(id);

  // Estado para modal de registrar ação
  const [modalRegistrarOpen, setModalRegistrarOpen] = useState(false);
  
  // Estado para modal de registrar conversa (celebração)
  const [modalConversaOpen, setModalConversaOpen] = useState(false);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white/40 animate-spin" />
      </div>
    );
  }

  // Error state
  if (error || !aluno) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-white/40">Aluno não encontrado</p>
        <button
          onClick={() => navigate('/professor/alunos')}
          className="text-blue-400 hover:underline text-sm"
        >
          Voltar para lista
        </button>
      </div>
    );
  }

  const handleChatClick = () => {
    navigate(`/professor/chat/dm/${id}`);
  };

  const handleRegistrarAcao = () => {
    setModalRegistrarOpen(true);
  };

  const handleRegistrarObservacao = () => {
    // Navegar diretamente para tela de registro de observação (Círculo)
    navigate(`/professor/circulo/aluno/${id}`);
  };

  const handleRegistrarConversa = () => {
    setModalConversaOpen(true);
  };

  const handleSalvarAcao = () => {
    refetch();
  };

  const handleSalvarConversa = () => {
    refetch();
  };

  const handleVerHistorico = () => {
    navigate(`/professor/alunos/${id}/observacoes`);
  };

  // Extrair primeiro nome
  const primeiroNome = aluno.nome.split(' ')[0];

  // Mapear observações para o formato do HistoricoObservacoes
  const observacoesHistorico = aluno.observacoes.map(obs => ({
    id: obs.id,
    data: obs.dataHora,
    sinal: obs.sinalLabel,
    valencia: obs.valencia || 'neutra'
  }));

  // Nome da fase atual para o histórico
  const faseAtualNome = aluno.faseAtualNome || 'Fase Atual';

  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between pt-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
        >
          <ArrowLeft size={20} className="text-white" />
        </button>
        <button 
          onClick={handleChatClick}
          className="p-2 rounded-full hover:bg-white/10 transition-colors"
          style={{ backgroundColor: `${aluno.casaCor}20` }}
        >
          <MessageCircle size={20} style={{ color: aluno.casaCor }} />
        </button>
      </div>

      {/* Seção de Perfil */}
      <div className="text-center py-2">
        {/* Avatar Grande */}
        {aluno.avatarUrl ? (
          <img 
            src={aluno.avatarUrl} 
            alt={aluno.nome}
            className="w-20 h-20 rounded-full object-cover mx-auto mb-4 border-2"
            style={{ borderColor: aluno.casaCor }}
          />
        ) : (
          <div 
            className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4"
            style={{ backgroundColor: `${aluno.casaCor}30` }}
          >
            {aluno.nome.charAt(0).toUpperCase()}
          </div>
        )}

        {/* Nome */}
        <h1 className="text-white text-xl font-semibold">{aluno.nome}</h1>
        
        {/* Série/Turma e Casa */}
        <p className="text-white/50 text-sm mt-1">
          {aluno.serie} {aluno.turma} • {aluno.casaNome}
        </p>

        {/* Cards de Pontos e Ranking */}
        <div className="flex justify-center gap-4 mt-6">
          <div className="bg-white/5 border border-white/10 rounded-xl px-6 py-3 text-center min-w-[100px]">
            <p className="text-green-400 text-2xl font-bold">{aluno.pontosTotais}</p>
            <p className="text-white/40 text-xs mt-1">Pontos</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl px-6 py-3 text-center min-w-[100px]">
            <p className="text-2xl font-bold" style={{ color: aluno.casaCor }}>
              #{aluno.ranking}
            </p>
            <p className="text-white/40 text-xs mt-1">
              de {aluno.totalAlunosCasa}
            </p>
          </div>
        </div>
      </div>

      {/* Card de Status */}
      <div className="px-0">
        <p className="text-white/40 text-xs uppercase tracking-wider mb-2 flex items-center gap-2">
          <BarChart3 className="w-3.5 h-3.5" strokeWidth={1.5} />
          Status
        </p>
        <StatusCard 
          status={aluno.status} 
          percentual={aluno.percentualEntregas} 
          media={aluno.mediaNotas} 
        />
      </div>

      {/* Inteligências */}
      <div className="px-0">
        <p className="text-white/40 text-xs uppercase tracking-wider mb-3 flex items-center gap-2">
          <Brain className="w-3.5 h-3.5" strokeWidth={1.5} />
          Inteligências
        </p>
        <div className="space-y-2.5 bg-white/5 rounded-xl p-4 border border-white/10">
          {aluno.inteligencias.map((intel) => (
            <InteligenciaProgressBar 
              key={intel.id}
              emoji={intel.emoji}
              nome={intel.nome}
              score={intel.score}
              cor={intel.cor}
            />
          ))}
        </div>
      </div>

      {/* OBSERVAÇÕES DO PROFESSOR - NOVA SEÇÃO */}
      <div className="px-0">
        <p className="text-white/40 text-xs uppercase tracking-wider mb-3 flex items-center gap-2">
          <Eye className="w-3.5 h-3.5" strokeWidth={1.5} />
          Observações do Professor
        </p>
        
        {/* Card de Feedback de Estado */}
        <FeedbackEstadoCard
          estado={aluno.alertaAtivo?.tipo || (aluno.temObsFaseAtual ? 'aguardando' : 'aguardando')}
          nomeAluno={primeiroNome}
          textoAcontecendo={
            aluno.alertaAtivo?.textoAcontecendo || 
            (aluno.temObsFaseAtual 
              ? `Continue observando ${primeiroNome}.`
              : `${primeiroNome} ainda não foi observado nesta fase.`)
          }
          sinalPrincipal={aluno.alertaAtivo?.sinalPredominante}
          sinalSecundario={aluno.alertaAtivo?.sinalSecundario}
          contexto={aluno.alertaAtivo?.contexto}
          hipoteses={aluno.alertaAtivo?.hipoteses}
          acoesSugeridas={aluno.alertaAtivo?.acoesSugeridas?.map(a => ({
            acao: a.titulo,
            prioridade: a.prioridade || 'media' as const
          }))}
          padrao={aluno.alertaAtivo?.padrao}
          arquetipo={aluno.alertaAtivo?.arquetipo ? {
            nome_arquetipo: aluno.alertaAtivo.arquetipo.nome,
            tipo: aluno.alertaAtivo.subtipo === 'descoberta' ? 'Descoberta' : 'Confirmação',
            significado: aluno.alertaAtivo.arquetipo.significado,
            potencializar: aluno.alertaAtivo.arquetipo.potencializar
          } : undefined}
          onRegistrarAcao={handleRegistrarAcao}
          onRegistrarObservacao={handleRegistrarObservacao}
          onRegistrarConversa={handleRegistrarConversa}
          casaColor={aluno.casaCor}
          casaNome={aluno.casaNome}
          faseNome={aluno.faseAtualNome}
          celebracaoSubtipo={aluno.alertaAtivo?.subtipo as 'descoberta' | 'confirmacao' | undefined}
          conversaRegistrada={aluno.conversaRegistrada}
          mensagemProfessor={aluno.alertaAtivo?.mensagemProfessor}
          oQueNaoFazer={aluno.alertaAtivo?.oQueNaoFazer}
          geradoPorN8N={aluno.alertaAtivo?.geradoPorN8N}
        />
        
        {/* Histórico de Observações */}
        {observacoesHistorico.length > 0 && (
          <HistoricoObservacoes
            observacoes={observacoesHistorico}
            faseAtualNome={faseAtualNome}
            onVerTudo={handleVerHistorico}
            casaColor={aluno.casaCor}
          />
        )}
        
        {/* Botão Registrar Observação */}
        <button
          onClick={handleRegistrarObservacao}
          className="w-full mt-4 py-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 flex items-center justify-center gap-2 hover:bg-green-500/20 transition-colors"
        >
          <PlusCircle className="w-4 h-4" strokeWidth={1.5} />
          <span className="text-sm font-medium">Registrar observação</span>
        </button>
      </div>

      {/* Missões da Fase */}
      {aluno.missoes.length > 0 && (
        <div className="px-0">
          <p className="text-white/40 text-xs uppercase tracking-wider mb-3 flex items-center gap-2">
            <ClipboardList className="w-3.5 h-3.5" strokeWidth={1.5} />
            Missões da Fase
          </p>
          <div className="space-y-2">
            {aluno.missoes.map((missao) => (
              <MissaoStatusLinha key={missao.id} missao={missao} />
            ))}
          </div>
        </div>
      )}

      {/* Modal de Registrar Ação */}
      <RegistrarAcaoModal
        isOpen={modalRegistrarOpen}
        onClose={() => setModalRegistrarOpen(false)}
        nomeAluno={primeiroNome}
        alunoId={aluno.id}
        alertaId={aluno.alertaAtivo?.alertaId || ''}
        onSalvar={handleSalvarAcao}
      />

      {/* Modal de Registrar Conversa (Celebração) */}
      <RegistrarConversaModal
        isOpen={modalConversaOpen}
        onClose={() => setModalConversaOpen(false)}
        nomeAluno={primeiroNome}
        alunoId={aluno.id}
        alertaId={aluno.alertaAtivo?.alertaId}
        subtipo={aluno.alertaAtivo?.subtipo as 'descoberta' | 'confirmacao' | undefined}
        onSalvar={handleSalvarConversa}
      />
    </div>
  );
};

export default PerfilAlunoPage;
