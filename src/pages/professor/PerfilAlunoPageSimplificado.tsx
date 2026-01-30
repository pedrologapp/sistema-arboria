import { useState } from 'react';
import { 
  ArrowLeft, 
  MessageCircle, 
  Loader2, 
  Brain, 
  Eye,
  PlusCircle
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { usePerfilAlunoSimplificado, type PerfilAlunoSimplificadoData } from '@/hooks/usePerfilAlunoSimplificado';
import { FeedbackEstadoCard } from '@/components/professor/FeedbackEstadoCard';
import HistoricoObservacoes from '@/components/professor/HistoricoObservacoes';
import RegistrarAcaoModal from '@/components/professor/RegistrarAcaoModal';
import RegistrarConversaModal from '@/components/professor/RegistrarConversaModal';
import SugestaoAtivaModal from '@/components/professor/SugestaoAtivaModal';

// Cor fixa para Infantil/F1 (sem casa)
const ACCENT_COLOR = '#6366f1';

// ============ COMPONENTES AUXILIARES ============

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

// ============ PÁGINA PRINCIPAL ============

const PerfilAlunoPageSimplificado = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { data: aluno, isLoading, error, refetch } = usePerfilAlunoSimplificado(id);

  // Estado para modal de registrar ação
  const [modalRegistrarOpen, setModalRegistrarOpen] = useState(false);
  
  // Estado para modal de registrar conversa (celebração)
  const [modalConversaOpen, setModalConversaOpen] = useState(false);

  // Estado para modal de sugestão ativa
  const [modalSugestaoAtiva, setModalSugestaoAtiva] = useState(false);

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
    // Se tem alerta de atenção ativo, mostrar modal de aviso primeiro
    if (aluno.alertaAtivo?.tipo === 'precisa_atencao') {
      setModalSugestaoAtiva(true);
    } else {
      navigate(`/professor/circulo/aluno/${id}`);
    }
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

  const handleContinuarParaObservacao = () => {
    setModalSugestaoAtiva(false);
    navigate(`/professor/circulo/aluno/${id}`);
  };

  const handleAbrirRegistrarAcao = () => {
    setModalSugestaoAtiva(false);
    setModalRegistrarOpen(true);
  };

  const handleVerDetalhes = () => {
    setModalSugestaoAtiva(false);
    // Apenas fecha o modal para ver o card de feedback
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
          style={{ backgroundColor: `${ACCENT_COLOR}20` }}
        >
          <MessageCircle size={20} style={{ color: ACCENT_COLOR }} />
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
            style={{ borderColor: ACCENT_COLOR }}
          />
        ) : (
          <div 
            className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4"
            style={{ backgroundColor: `${ACCENT_COLOR}30` }}
          >
            {aluno.nome.charAt(0).toUpperCase()}
          </div>
        )}

        {/* Nome */}
        <h1 className="text-white text-xl font-semibold">{aluno.nome}</h1>
        
        {/* Série/Turma (SEM CASA) */}
        <p className="text-white/50 text-sm mt-1">
          {aluno.serie} {aluno.turma}
        </p>

        {/* SEM CARDS DE PONTOS E RANKING */}
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

      {/* OBSERVAÇÕES DO PROFESSOR */}
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
            (aluno.temObservacoes 
              ? `Continue observando ${primeiroNome}.`
              : `${primeiroNome} ainda não foi observado nesta fase.`)
          }
          sinalPrincipal={aluno.alertaAtivo?.sinalPredominante}
          sinalSecundario={aluno.alertaAtivo?.sinalSecundario}
          contexto={aluno.alertaAtivo?.contexto}
          hipoteses={aluno.alertaAtivo?.hipoteses}
          acoesSugeridas={aluno.alertaAtivo?.acoesSugeridas?.map(a => ({
            acao: a.titulo,
            prioridade: 'media' as const
          }))}
          padrao={aluno.alertaAtivo?.padrao}
          arquetipo={undefined}
          onRegistrarAcao={handleRegistrarAcao}
          onRegistrarObservacao={handleRegistrarObservacao}
          onRegistrarConversa={handleRegistrarConversa}
          casaColor={ACCENT_COLOR}
          casaNome="Turma"
          faseNome={aluno.faseAtualNome}
          celebracaoSubtipo={aluno.alertaAtivo?.subtipo as 'descoberta' | 'confirmacao' | undefined}
          conversaRegistrada={aluno.conversaRegistrada}
        />
        
        {/* Histórico de Observações */}
        {observacoesHistorico.length > 0 && (
          <HistoricoObservacoes
            observacoes={observacoesHistorico}
            faseAtualNome={faseAtualNome}
            onVerTudo={handleVerHistorico}
            casaColor={ACCENT_COLOR}
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

      {/* SEÇÃO DE MISSÕES OMITIDA - NÃO SE APLICA A INFANTIL/F1 */}

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

      {/* Modal de Sugestão Ativa */}
      <SugestaoAtivaModal
        isOpen={modalSugestaoAtiva}
        onClose={() => setModalSugestaoAtiva(false)}
        nomeAluno={primeiroNome}
        textoAcontecendo={aluno.alertaAtivo?.textoAcontecendo || 'Este aluno precisa de atenção.'}
        acoesSugeridas={aluno.alertaAtivo?.acoesSugeridas?.slice(0, 3).map(a => ({
          titulo: a.titulo
        }))}
        onRegistrarAcao={handleAbrirRegistrarAcao}
        onRegistrarObservacao={handleContinuarParaObservacao}
        onVerDetalhes={handleVerDetalhes}
      />
    </div>
  );
};

export default PerfilAlunoPageSimplificado;
