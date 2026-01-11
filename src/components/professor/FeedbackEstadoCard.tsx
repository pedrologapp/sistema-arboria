import { 
  Sparkles, 
  TrendingUp, 
  AlertCircle, 
  AlertTriangle, 
  CheckCircle, 
  Eye,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Target
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface Hipotese {
  titulo: string;
  descricao: string;
  perguntas?: string[];
}

interface AcaoSugerida {
  acao: string;
  prioridade: 'alta' | 'media' | 'baixa';
}

interface FeedbackEstadoCardProps {
  estado: 'brilhando' | 'melhorando' | 'atencao_recente' | 'precisa_atencao' | 
          'bom_comeco' | 'fique_de_olho' | 'aguardando' | 'celebrar';
  nomeAluno: string;
  textoAcontecendo: string;
  sinalPrincipal?: string;
  sinalSecundario?: string;
  contexto?: string[];
  hipoteses?: Hipotese[];
  acoesSugeridas?: AcaoSugerida[];
  padrao?: {
    nome: string;
    significado: string;
    acao_recomendada?: string;
  };
  arquetipo?: {
    nome_arquetipo: string;
    tipo: string;
    significado: string;
    potencializar: string[];
  };
  onRegistrarAcao?: () => void;
  onRegistrarObservacao?: () => void;
  casaColor?: string;
}

const estadoConfig = {
  brilhando: {
    titulo: 'BRILHANDO!',
    icon: Sparkles,
    bgColor: 'bg-[#14532D]',
    textColor: 'text-white',
    iconColor: 'text-yellow-300',
    borderColor: 'border-green-600',
    mensagemPadrao: 'Continue observando e celebrando!'
  },
  melhorando: {
    titulo: 'MELHORANDO!',
    icon: TrendingUp,
    bgColor: 'bg-[#166534]',
    textColor: 'text-white',
    iconColor: 'text-green-200',
    borderColor: 'border-green-500',
    mensagemPadrao: 'Continue acompanhando de perto.'
  },
  atencao_recente: {
    titulo: 'ATENÇÃO RECENTE',
    icon: AlertCircle,
    bgColor: 'bg-[#78350F]',
    textColor: 'text-white',
    iconColor: 'text-yellow-300',
    borderColor: 'border-yellow-600',
    mensagemPadrao: 'Fique atento nas próximas observações.'
  },
  precisa_atencao: {
    titulo: 'ALERTA ATIVO',
    icon: AlertTriangle,
    bgColor: 'bg-[#7F1D1D]',
    textColor: 'text-white',
    iconColor: 'text-red-300',
    borderColor: 'border-red-600',
    mensagemPadrao: 'Atenção redobrada necessária.'
  },
  bom_comeco: {
    titulo: 'BOM COMEÇO!',
    icon: CheckCircle,
    bgColor: 'bg-[#14532D]',
    textColor: 'text-white',
    iconColor: 'text-green-200',
    borderColor: 'border-green-600',
    mensagemPadrao: 'Continue observando!'
  },
  fique_de_olho: {
    titulo: 'FIQUE DE OLHO',
    icon: Eye,
    bgColor: 'bg-[#78350F]',
    textColor: 'text-white',
    iconColor: 'text-yellow-300',
    borderColor: 'border-yellow-600',
    mensagemPadrao: 'Observe mais para entender o padrão.'
  },
  aguardando: {
    titulo: 'AGUARDANDO SEU OLHAR',
    icon: Eye,
    bgColor: 'bg-muted',
    textColor: 'text-muted-foreground',
    iconColor: 'text-muted-foreground',
    borderColor: 'border-muted',
    mensagemPadrao: 'Registre sua primeira observação.'
  },
  celebrar: {
    titulo: 'CELEBRE!',
    icon: Sparkles,
    bgColor: 'bg-[#14532D]',
    textColor: 'text-white',
    iconColor: 'text-yellow-300',
    borderColor: 'border-green-600',
    mensagemPadrao: 'Momento especial para celebrar!'
  }
};

export function FeedbackEstadoCard({
  estado,
  nomeAluno,
  textoAcontecendo,
  sinalPrincipal,
  sinalSecundario,
  contexto,
  hipoteses,
  acoesSugeridas,
  padrao,
  arquetipo,
  onRegistrarAcao,
  onRegistrarObservacao,
  casaColor
}: FeedbackEstadoCardProps) {
  const [expandido, setExpandido] = useState(false);
  
  const config = estadoConfig[estado] || estadoConfig.aguardando;
  const Icon = config.icon;
  
  const temDetalhes = (hipoteses && hipoteses.length > 0) || 
                      (acoesSugeridas && acoesSugeridas.length > 0) ||
                      (contexto && contexto.length > 0) ||
                      padrao ||
                      arquetipo;
  
  // Estados que mostram botão de ação
  const estadosComAcao = ['precisa_atencao', 'fique_de_olho', 'atencao_recente'];

  return (
    <div className={cn(
      'rounded-xl overflow-hidden border-2',
      config.bgColor,
      config.borderColor
    )}>
      {/* Header */}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Icon className={cn('w-5 h-5', config.iconColor)} />
          <span className={cn('font-bold text-sm uppercase tracking-wide', config.textColor)}>
            {config.titulo}
          </span>
        </div>
        
        <p className={cn('text-base leading-relaxed', config.textColor)}>
          {textoAcontecendo}
        </p>
        
        {/* Mensagem padrão */}
        <p className={cn('text-sm mt-2 opacity-80', config.textColor)}>
          {config.mensagemPadrao}
        </p>
        
        {/* Padrão identificado (se houver) */}
        {padrao && (
          <div className="mt-3 p-2 bg-black/20 rounded-lg">
            <p className={cn('text-sm font-medium', config.textColor)}>
              Padrão: {padrao.nome}
            </p>
            <p className={cn('text-xs opacity-80', config.textColor)}>
              {padrao.significado}
            </p>
          </div>
        )}
        
        {/* Arquétipo (para celebrações) */}
        {arquetipo && (
          <div className="mt-3 p-2 bg-black/20 rounded-lg">
            <p className={cn('text-sm font-medium', config.textColor)}>
              🏆 {arquetipo.tipo}: {arquetipo.nome_arquetipo}
            </p>
            <p className={cn('text-xs opacity-80', config.textColor)}>
              {arquetipo.significado}
            </p>
          </div>
        )}
        
      </div>
      
      {/* Botão "Registrar minha ação" - Estilo original, largo e azul */}
      {estadosComAcao.includes(estado) && onRegistrarAcao && (
        <div className="px-4 pb-4">
          <button
            onClick={onRegistrarAcao}
            className="w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
          >
            <Target className="w-4 h-4 text-white" />
            <span className="text-white font-medium">Registrar minha ação</span>
          </button>
        </div>
      )}
      
      {/* Botão para aguardando */}
      {estado === 'aguardando' && onRegistrarObservacao && (
        <div className="px-4 pb-4">
          <button
            onClick={onRegistrarObservacao}
            className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center gap-2"
          >
            <Eye className="w-4 h-4 text-white/60" />
            <span className="text-white/60 font-medium">Registrar observação</span>
          </button>
        </div>
      )}
      
      {/* Expandir detalhes (apenas para estados com mais info) */}
      {temDetalhes && (
        <>
          <button
            onClick={() => setExpandido(!expandido)}
            className={cn(
              'w-full py-2 px-4 flex items-center justify-center gap-2 transition-colors',
              'bg-black/10 hover:bg-black/20',
              config.textColor
            )}
          >
            <span className="text-sm font-medium">
              {expandido ? 'Ver menos' : 'Ver mais'}
            </span>
            {expandido ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
          
          {expandido && (
            <div className="p-4 bg-black/10 space-y-4">
              {/* Contexto */}
              {contexto && contexto.length > 0 && (
                <div>
                  <h4 className={cn('text-sm font-semibold mb-2 flex items-center gap-2', config.textColor)}>
                    <Eye className="w-4 h-4" />
                    Contexto
                  </h4>
                  <ul className="space-y-1">
                    {contexto.map((item, i) => (
                      <li key={i} className={cn('text-sm opacity-90', config.textColor)}>
                        • {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Hipóteses */}
              {hipoteses && hipoteses.length > 0 && (
                <div>
                  <h4 className={cn('text-sm font-semibold mb-2 flex items-center gap-2', config.textColor)}>
                    <Lightbulb className="w-4 h-4" />
                    Hipóteses
                  </h4>
                  <ul className="space-y-2">
                    {hipoteses.map((hipotese, i) => (
                      <li key={i} className="bg-black/10 p-2 rounded-lg">
                        <p className={cn('text-sm font-medium', config.textColor)}>
                          {hipotese.titulo}
                        </p>
                        <p className={cn('text-xs opacity-80', config.textColor)}>
                          {hipotese.descricao}
                        </p>
                        {hipotese.perguntas && hipotese.perguntas.length > 0 && (
                          <div className="mt-1">
                            {hipotese.perguntas.map((pergunta, j) => (
                              <p key={j} className={cn('text-xs italic opacity-70', config.textColor)}>
                                💬 "{pergunta}"
                              </p>
                            ))}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Ações Sugeridas */}
              {acoesSugeridas && acoesSugeridas.length > 0 && (
                <div>
                  <h4 className={cn('text-sm font-semibold mb-2 flex items-center gap-2', config.textColor)}>
                    <Target className="w-4 h-4" />
                    Ações Sugeridas
                  </h4>
                  <ul className="space-y-1">
                    {acoesSugeridas.map((acao, i) => (
                      <li 
                        key={i} 
                        className={cn(
                          'text-sm flex items-center gap-2 p-2 rounded-lg',
                          acao.prioridade === 'alta' ? 'bg-red-900/30' :
                          acao.prioridade === 'media' ? 'bg-yellow-900/30' :
                          'bg-green-900/30',
                          config.textColor
                        )}
                      >
                        <span className={cn(
                          'text-xs px-1.5 py-0.5 rounded font-medium',
                          acao.prioridade === 'alta' ? 'bg-red-500 text-white' :
                          acao.prioridade === 'media' ? 'bg-yellow-500 text-black' :
                          'bg-green-500 text-white'
                        )}>
                          {acao.prioridade === 'alta' ? '!' : acao.prioridade === 'media' ? '•' : '○'}
                        </span>
                        {acao.acao}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Potencializar (para arquétipos) */}
              {arquetipo?.potencializar && arquetipo.potencializar.length > 0 && (
                <div>
                  <h4 className={cn('text-sm font-semibold mb-2 flex items-center gap-2', config.textColor)}>
                    <Sparkles className="w-4 h-4" />
                    Como Potencializar
                  </h4>
                  <ul className="space-y-1">
                    {arquetipo.potencializar.map((item, i) => (
                      <li key={i} className={cn('text-sm opacity-90', config.textColor)}>
                        ✨ {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
