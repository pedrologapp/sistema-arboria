import { ArrowLeft, MessageCircle, Loader2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useProfessor } from '@/contexts/ProfessorContext';
import { usePerfilAluno, type PerfilAlunoData } from '@/hooks/usePerfilAluno';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
      icone: '⭐',
      label: 'DESTAQUE'
    },
    regular: {
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/20',
      texto: 'text-yellow-400',
      icone: '📊',
      label: 'REGULAR'
    },
    risco: {
      bg: 'bg-red-500/10',
      border: 'border-red-500/20',
      texto: 'text-red-400',
      icone: '⚠️',
      label: 'EM RISCO'
    }
  }[status];

  return (
    <div className={`p-4 rounded-xl border ${config.bg} ${config.border}`}>
      <p className={`font-semibold ${config.texto} flex items-center gap-2`}>
        <span>{config.icone}</span>
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
    aprovada: { icone: '✅', cor: 'text-green-400' },
    aguardando: { icone: '🟡', cor: 'text-yellow-400' },
    pendente: { icone: '🟠', cor: 'text-orange-400' },
    nao_entregue: { icone: '🔴', cor: 'text-red-400' }
  }[missao.status];

  const titulo = missao.semana 
    ? `Semana ${missao.semana} - ${missao.tipoMissao === 'geral' ? 'Geral' : 'Individual'}`
    : missao.titulo;

  const statusTexto = missao.status === 'aprovada' && missao.nota !== null
    ? `${missao.nota}/10`
    : missao.status === 'aguardando'
    ? 'Aguardando'
    : missao.status === 'pendente'
    ? 'Pendente'
    : 'Não entregue';

  return (
    <div className="flex items-center justify-between py-2.5 px-3 bg-white/5 rounded-lg">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="flex-shrink-0">{statusConfig.icone}</span>
        <span className="text-white/80 text-sm truncate">{titulo}</span>
      </div>
      <span className={`text-sm flex-shrink-0 ml-2 ${statusConfig.cor}`}>
        {statusTexto}
      </span>
    </div>
  );
};

interface ObservacaoLinhaProps {
  observacao: PerfilAlunoData['observacoes'][0];
}

const ObservacaoLinha = ({ observacao }: ObservacaoLinhaProps) => {
  const tempoRelativo = formatDistanceToNow(new Date(observacao.dataHora), { 
    locale: ptBR, 
    addSuffix: true 
  });

  return (
    <div className="py-2.5 px-3 bg-white/5 rounded-lg">
      <div className="flex items-center gap-2">
        <span>{observacao.sinalEmoji}</span>
        <span className="text-white/60 text-sm">{observacao.sinalLabel}</span>
        <span className="text-white/30 text-xs">• {tempoRelativo}</span>
      </div>
      {observacao.texto && (
        <p className="text-white/40 text-xs mt-1 truncate">{observacao.texto}</p>
      )}
    </div>
  );
};

// ============ PÁGINA PRINCIPAL ============

const PerfilAlunoPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { casaColor } = useProfessor();
  const { data: aluno, isLoading, error } = usePerfilAluno(id);

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
    // Navegar para chat DM com o aluno (será implementado no futuro)
    navigate(`/professor/chat/dm/${id}`);
  };

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
          {aluno.serie} {aluno.turma} • {aluno.casaEmoji} {aluno.casaNome}
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
        <p className="text-white/40 text-xs uppercase tracking-wider mb-2 flex items-center gap-1">
          📊 Status
        </p>
        <StatusCard 
          status={aluno.status} 
          percentual={aluno.percentualEntregas} 
          media={aluno.mediaNotas} 
        />
      </div>

      {/* Inteligências */}
      <div className="px-0">
        <p className="text-white/40 text-xs uppercase tracking-wider mb-3 flex items-center gap-1">
          🧠 Inteligências
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

      {/* Missões da Fase */}
      {aluno.missoes.length > 0 && (
        <div className="px-0">
          <p className="text-white/40 text-xs uppercase tracking-wider mb-3 flex items-center gap-1">
            📋 Missões da Fase
          </p>
          <div className="space-y-2">
            {aluno.missoes.map((missao) => (
              <MissaoStatusLinha key={missao.id} missao={missao} />
            ))}
          </div>
        </div>
      )}

      {/* Observações Recentes */}
      {aluno.observacoes.length > 0 && (
        <div className="px-0">
          <p className="text-white/40 text-xs uppercase tracking-wider mb-3 flex items-center gap-1">
            📝 Observações Recentes
          </p>
          <div className="space-y-2">
            {aluno.observacoes.map((obs) => (
              <ObservacaoLinha key={obs.id} observacao={obs} />
            ))}
          </div>
          {aluno.observacoes.length >= 5 && (
            <button 
              onClick={() => navigate(`/professor/alunos/${id}/observacoes`)}
              className="text-sm mt-3 hover:underline"
              style={{ color: aluno.casaCor }}
            >
              Ver todas →
            </button>
          )}
        </div>
      )}

      {/* Mensagem se não houver dados */}
      {aluno.missoes.length === 0 && aluno.observacoes.length === 0 && (
        <div className="text-center py-8">
          <p className="text-white/30 text-sm">
            Nenhuma atividade registrada ainda
          </p>
        </div>
      )}
    </div>
  );
};

export default PerfilAlunoPage;
