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
  Target,
  Star,
  Award,
  MessageCircle,
  AlertOctagon,
  ThumbsUp
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

// Frases padrão baseadas em Carol Dweck
const FRASES_EVITAR_PADRAO = [
  '"Você é muito inteligente!" (elogio de pessoa)',
  '"Incrível! Perfeito!" (elogio inflado)',
  '"Você é natural nisso" (desvaloriza esforço)'
];

const FRASES_PREFERIR_PADRAO = [
  '"Eu vi como você se dedicou a isso" (processo)',
  '"Você encontrou uma forma criativa de..." (específico)',
  '"Percebi que você tentou de vários jeitos até conseguir" (persistência)'
];

interface ConversaRegistrada {
  tipo_acao: string;
  created_at: string;
}

interface FeedbackEstadoCardProps {
  estado: 'brilhando' | 'melhorando' | 'atencao_recente' | 'precisa_atencao' | 
          'bom_comeco' | 'fique_de_olho' | 'aguardando' | 'celebrar' |
          'celebrar_descoberta' | 'celebrar_confirmacao';
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
    sugestao_conversa?: string;
    frases_evitar?: string[];
    frases_preferir?: string[];
  };
  onRegistrarAcao?: () => void;
  onRegistrarObservacao?: () => void;
  onRegistrarConversa?: () => void;
  casaColor?: string;
  casaNome?: string;
  faseNome?: string;
  celebracaoSubtipo?: 'descoberta' | 'confirmacao';
  conversaRegistrada?: ConversaRegistrada | null;
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
    bgColor: 'bg-[#78350F]',
    textColor: 'text-white',
    iconColor: 'text-yellow-300',
    borderColor: 'border-amber-600',
    mensagemPadrao: 'Momento especial para celebrar!'
  },
  celebrar_descoberta: {
    titulo: 'DESCOBERTA!',
    icon: Star,
    bgColor: 'bg-[#78350F]',
    textColor: 'text-white',
    iconColor: 'text-yellow-300',
    borderColor: 'border-amber-600',
    mensagemPadrao: 'Uma nova força está emergindo!'
  },
  celebrar_confirmacao: {
    titulo: 'CONFIRMAÇÃO!',
    icon: Award,
    bgColor: 'bg-[#78350F]',
    textColor: 'text-white',
    iconColor: 'text-yellow-300',
    borderColor: 'border-amber-600',
    mensagemPadrao: 'A força principal está consolidada!'
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
  onRegistrarConversa,
  casaColor,
  casaNome,
  faseNome,
  celebracaoSubtipo,
  conversaRegistrada
}: FeedbackEstadoCardProps) {
  const [expandido, setExpandido] = useState(false);
  
  // Estados de celebração
  const estadosCelebracao = ['celebrar', 'celebrar_descoberta', 'celebrar_confirmacao', 'brilhando'];
  const ehCelebracao = estadosCelebracao.includes(estado);
  
  // Determinar subtipo: prop explícita > inferido do estado > inferido do arquétipo
  const subtipoFinal: 'descoberta' | 'confirmacao' | null = 
    celebracaoSubtipo || 
    (estado === 'celebrar_descoberta' ? 'descoberta' : null) ||
    (estado === 'celebrar_confirmacao' ? 'confirmacao' : null) ||
    (arquetipo?.tipo?.toLowerCase().includes('descoberta') ? 'descoberta' : null) ||
    (arquetipo?.tipo?.toLowerCase().includes('confirm') ? 'confirmacao' : null) ||
    (ehCelebracao ? 'confirmacao' : null); // Fallback para confirmação se for celebração sem subtipo
  
  // Para celebrações, sempre usar config de 'celebrar' (CELEBRE! no topo)
  const estadoConfig_key = ehCelebracao ? 'celebrar' : estado;
  const config = estadoConfig[estadoConfig_key] || estadoConfig.aguardando;
  const Icon = config.icon;
  
  const temDetalhes = (hipoteses && hipoteses.length > 0) || 
                      (acoesSugeridas && acoesSugeridas.length > 0) ||
                      (contexto && contexto.length > 0) ||
                      padrao ||
                      arquetipo;
  
  // Estados que mostram botão de ação
  const estadosComAcao = ['precisa_atencao', 'fique_de_olho', 'atencao_recente'];
  
  // Descoberta: só mostra arquétipo se tiver nome_arquetipo preenchido
  const ehDescoberta = subtipoFinal === 'descoberta' && arquetipo?.nome_arquetipo;
  const ehConfirmacao = subtipoFinal === 'confirmacao';

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
        
        {/* Arquétipo para celebrações de Descoberta */}
        {ehDescoberta && arquetipo && (
          <div className="mt-4 space-y-3">
            {/* Seção Arquétipo */}
            <div className="p-3 bg-black/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="w-4 h-4 text-yellow-300" />
                <span className="text-sm font-semibold text-yellow-300 uppercase tracking-wide">
                  Arquétipo Possível
                </span>
              </div>
              <p className="text-white font-medium text-lg">
                "{arquetipo.nome_arquetipo}"
              </p>
              <p className="text-white/80 text-sm mt-1">
                {arquetipo.significado}
              </p>
            </div>
            
            {/* Como Potencializar */}
            {arquetipo.potencializar && arquetipo.potencializar.length > 0 && (
              <div className="p-3 bg-black/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-yellow-300" />
                  <span className="text-sm font-semibold text-yellow-300 uppercase tracking-wide">
                    Como Potencializar
                  </span>
                </div>
                <ul className="space-y-1.5">
                  {arquetipo.potencializar.map((item, i) => (
                    <li key={i} className="text-white/90 text-sm flex items-start gap-2">
                      <span className="text-yellow-300">✨</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
        
        {/* Para Confirmação - Sugestões de potencialização (sempre mostra, mesmo se arquetipo vier sem nome) */}
        {ehConfirmacao && (
          <div className="mt-4 p-3 bg-black/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-yellow-300" />
              <span className="text-sm font-semibold text-yellow-300 uppercase tracking-wide">
                Como Potencializar
              </span>
            </div>
            <ul className="space-y-1.5">
              {arquetipo?.potencializar && arquetipo.potencializar.length > 0 ? (
                arquetipo.potencializar.map((item, i) => (
                  <li key={i} className="text-white/90 text-sm flex items-start gap-2">
                    <span className="text-yellow-300">✨</span>
                    {item}
                  </li>
                ))
              ) : (
                <>
                  <li className="text-white/90 text-sm flex items-start gap-2">
                    <span className="text-yellow-300">✨</span>
                    Desafios de nível avançado
                  </li>
                  <li className="text-white/90 text-sm flex items-start gap-2">
                    <span className="text-yellow-300">✨</span>
                    Papel de mentor para colegas
                  </li>
                  <li className="text-white/90 text-sm flex items-start gap-2">
                    <span className="text-yellow-300">✨</span>
                    Projetos de protagonismo{casaNome ? ` em ${casaNome}` : ''}
                  </li>
                </>
              )}
            </ul>
          </div>
        )}
        
        {/* Arquétipo simples (para estados NÃO celebração que têm arquétipo) */}
        {!ehCelebracao && arquetipo && (
          <div className="mt-3 p-2 bg-black/20 rounded-lg">
            <p className={cn('text-sm font-medium', config.textColor)}>
              🏆 {arquetipo.tipo}: {arquetipo.nome_arquetipo}
            </p>
            <p className={cn('text-xs opacity-80', config.textColor)}>
              {arquetipo.significado}
            </p>
          </div>
        )}
        
        {/* Fallback para celebração genérica sem arquetipo (sempre mostrar potencializar) */}
        {ehCelebracao && !ehDescoberta && !ehConfirmacao && (
          <div className="mt-4 p-3 bg-black/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-yellow-300" />
              <span className="text-sm font-semibold text-yellow-300 uppercase tracking-wide">
                Como Potencializar
              </span>
            </div>
            <ul className="space-y-1.5">
              <li className="text-white/90 text-sm flex items-start gap-2">
                <span className="text-yellow-300">✨</span>
                Desafios de nível avançado
              </li>
              <li className="text-white/90 text-sm flex items-start gap-2">
                <span className="text-yellow-300">✨</span>
                Papel de mentor para colegas
              </li>
              <li className="text-white/90 text-sm flex items-start gap-2">
                <span className="text-yellow-300">✨</span>
                Projetos de protagonismo{casaNome ? ` em ${casaNome}` : ''}
              </li>
            </ul>
          </div>
        )}
        
        {/* SEÇÃO: COMO FALAR COM O ALUNO (apenas para celebrações) */}
        {ehCelebracao && (
          <div className="mt-5 space-y-4">
            {/* Container destacado para "Como falar com o aluno" */}
            <div className="p-4 bg-amber-950/40 rounded-xl border border-amber-600/30">
              {/* Sugestão de conversa */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <MessageCircle className="w-5 h-5 text-yellow-300" />
                  <span className="text-base font-bold text-yellow-300 uppercase tracking-wide">
                    Como falar com {nomeAluno}
                  </span>
                </div>
                <p className="text-white/90 text-sm leading-relaxed italic bg-black/20 p-3 rounded-lg">
                  {arquetipo?.sugestao_conversa || (
                    subtipoFinal === 'descoberta' 
                      ? `"${nomeAluno}, eu percebi algo especial acontecendo. Você mostrou uma habilidade que eu não tinha visto antes. Isso é um sinal de que você está desenvolvendo algo novo. Que tal tentarmos um desafio maior nessa área?"`
                      : `"${nomeAluno}, você está mostrando muita força em ${casaNome || 'sua área'}. Eu vi como você se dedicou. Sabe o que estou pensando? Acho que você poderia ajudar um colega que está com dificuldade nisso. Topa?"`
                  )}
                </p>
              </div>
              
              {/* EVITAR e PREFERIR lado a lado */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* EVITAR */}
                <div className="p-3 bg-red-900/20 rounded-lg border border-red-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertOctagon className="w-4 h-4 text-red-400" />
                    <span className="text-sm font-semibold text-red-400 uppercase tracking-wide">
                      Evitar
                    </span>
                  </div>
                  <ul className="space-y-1">
                    {(arquetipo?.frases_evitar || FRASES_EVITAR_PADRAO).map((frase, i) => (
                      <li key={i} className="text-white/70 text-sm flex items-start gap-2">
                        <span className="text-red-400 flex-shrink-0">✗</span>
                        <span>{frase}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                {/* PREFERIR */}
                <div className="p-3 bg-green-900/20 rounded-lg border border-green-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <ThumbsUp className="w-4 h-4 text-green-400" />
                    <span className="text-sm font-semibold text-green-400 uppercase tracking-wide">
                      Preferir
                    </span>
                  </div>
                  <ul className="space-y-1">
                    {(arquetipo?.frases_preferir || FRASES_PREFERIR_PADRAO).map((frase, i) => (
                      <li key={i} className="text-white/70 text-sm flex items-start gap-2">
                        <span className="text-green-400 flex-shrink-0">✓</span>
                        <span>{frase}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
        
      </div>
      
      {/* Botão "Registrar que conversei" para celebrações */}
      {ehCelebracao && onRegistrarConversa && (
        <div className="px-4 pb-4 pt-2">
          {conversaRegistrada ? (
            // Estado: Conversa já registrada
            <div className="w-full py-3 px-4 rounded-xl bg-green-900/20 border-2 border-dashed border-green-500/30 flex items-center justify-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-green-400 text-sm font-medium">
                Conversa registrada em {new Date(conversaRegistrada.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
              </span>
            </div>
          ) : (
            // Estado: Ainda não registrou
            <button
              onClick={onRegistrarConversa}
              className="w-full py-3 rounded-xl border-2 border-dashed border-amber-500/50 
                         bg-amber-900/20 hover:bg-amber-900/40 transition-all duration-200
                         flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-4 h-4 text-amber-400" />
              <span className="text-amber-300 font-medium">Registrar que conversei com {nomeAluno}</span>
            </button>
          )}
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
      {temDetalhes && !ehCelebracao && (
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
              
              {/* Potencializar (para arquétipos - dentro de expandido) */}
              {!ehCelebracao && arquetipo?.potencializar && arquetipo.potencializar.length > 0 && (
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
              
              {/* Botão "Registrar minha ação" - após as ações sugeridas */}
              {estadosComAcao.includes(estado) && onRegistrarAcao && (
                <button
                  onClick={onRegistrarAcao}
                  className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 
                             hover:from-blue-500 hover:to-blue-400 transition-all duration-200
                             flex items-center justify-center gap-2 shadow-lg border border-blue-400/30"
                >
                  <Target className="w-4 h-4 text-white" />
                  <span className="text-white font-semibold">Registrar minha ação</span>
                </button>
              )}
            </div>
          )}
        </>
      )}
      
      {/* Botão "Registrar minha ação" fora do expandido para quando não há detalhes */}
      {!temDetalhes && estadosComAcao.includes(estado) && onRegistrarAcao && (
        <div className="px-4 pb-4">
          <button
            onClick={onRegistrarAcao}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 
                       hover:from-blue-500 hover:to-blue-400 transition-all duration-200
                       flex items-center justify-center gap-2 shadow-lg border border-blue-400/30"
          >
            <Target className="w-4 h-4 text-white" />
            <span className="text-white font-semibold">Registrar minha ação</span>
          </button>
        </div>
      )}
    </div>
  );
}