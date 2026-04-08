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
  // Campos ricos do N8N
  script?: string;
  objetivo?: string;
  contexto?: string;
  comoEscutar?: string;
  porQueFunciona?: string;
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
  // Novos campos ricos do N8N
  mensagemProfessor?: string;
  oQueNaoFazer?: string[];
  // Novos campos ricos do N8N
  comoReagir?: {
    seAceitar: string;
    seRecusar: string;
    alerta?: string;
  };
  elementoPonte?: {
    forcas: string | string[];
    areaDificuldade: string;
  };
  // Flag para identificar origem N8N
  geradoPorN8N?: boolean;
}

// Helper para separar título e descrição de ação
const parseAcao = (acao: string): { titulo: string; descricao: string | null } => {
  const colonIndex = acao.indexOf(':');
  if (colonIndex === -1) {
    return { titulo: acao, descricao: null };
  }
  return {
    titulo: acao.substring(0, colonIndex).trim(),
    descricao: acao.substring(colonIndex + 1).trim()
  };
};

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
  conversaRegistrada,
  mensagemProfessor,
  oQueNaoFazer,
  comoReagir,
  elementoPonte,
  geradoPorN8N
}: FeedbackEstadoCardProps) {
  const [expandido, setExpandido] = useState(false);
  // Estado para texto acontecendo expansível
  const [textoExpandido, setTextoExpandido] = useState(false);
  // Estado para hipóteses colapsáveis individualmente (para layout N8N)
  const [hipotesesExpandidas, setHipotesesExpandidas] = useState<Record<number, boolean>>({});
  // Estado para ações colapsáveis individualmente
  const [acoesExpandidas, setAcoesExpandidas] = useState<Record<number, boolean>>({});
  
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
    (ehCelebracao ? 'confirmacao' : null);
  
  // Para celebrações, sempre usar config de 'celebrar'
  const estadoConfig_key = ehCelebracao ? 'celebrar' : estado;
  const config = estadoConfig[estadoConfig_key] || estadoConfig.aguardando;
  const Icon = config.icon;
  
  // Para N8N, verificar se tem dados ricos específicos
  const temDetalhesN8N = geradoPorN8N && (
    (hipoteses && hipoteses.length > 0) || 
    (acoesSugeridas && acoesSugeridas.length > 0) ||
    (arquetipo?.sugestao_conversa) ||
    (oQueNaoFazer && oQueNaoFazer.length > 0) ||
    mensagemProfessor
  );
  
  // Para não-N8N, usar lógica anterior
  const temDetalhes = temDetalhesN8N || (
    !geradoPorN8N && (
      (hipoteses && hipoteses.length > 0) || 
      (acoesSugeridas && acoesSugeridas.length > 0) ||
      (contexto && contexto.length > 0) ||
      (oQueNaoFazer && oQueNaoFazer.length > 0) ||
      mensagemProfessor ||
      padrao ||
      arquetipo
    )
  );
  
  // Toggle de hipótese individual
  const toggleHipotese = (index: number) => {
    setHipotesesExpandidas(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };
  
  // Toggle de ação individual
  const toggleAcao = (index: number) => {
    setAcoesExpandidas(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };
  
  // Estados que mostram botão de ação
  const estadosComAcao = ['precisa_atencao', 'fique_de_olho', 'atencao_recente'];
  
  // Texto expansível - limite de 150 caracteres
  const textoLongo = textoAcontecendo.length > 150;
  
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
          <span className={cn('font-semibold text-xs uppercase tracking-wider', config.textColor)}>
            {config.titulo}
          </span>
        </div>
        
        {/* Para N8N: Mostrar texto com "Ler mais/menos" + padrão */}
        {geradoPorN8N ? (
          <>
            {/* ELEMENTO DE PONTE - Novo! */}
            {elementoPonte && (
              <div className="mb-4 p-3 bg-purple-900/20 rounded-lg border border-purple-500/20">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-purple-400 text-xs font-semibold uppercase tracking-wide">
                    🔗 Elemento de Ponte
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm flex-wrap">
                  <span className="text-white font-medium">
                    Força: {Array.isArray(elementoPonte.forcas) 
                      ? elementoPonte.forcas.join(', ') 
                      : elementoPonte.forcas}
                  </span>
                  <span className="text-purple-400">→</span>
                  <span className="text-white/80">
                    Dificuldade: {elementoPonte.areaDificuldade}
                  </span>
                </div>
              </div>
            )}
            
            {/* Texto acontecendo expansível */}
            <div>
              <p className={cn('text-sm leading-relaxed', config.textColor)}>
                {textoLongo && !textoExpandido 
                  ? `${textoAcontecendo.substring(0, 150)}...` 
                  : textoAcontecendo}
              </p>
              {textoLongo && (
                <button
                  onClick={() => setTextoExpandido(!textoExpandido)}
                  className="mt-2 text-xs text-white/60 hover:text-white/80 flex items-center gap-1 transition-colors"
                >
                  {textoExpandido ? 'Ler menos' : 'Ler mais'}
                  {textoExpandido ? (
                    <ChevronUp className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                </button>
              )}
            </div>
            
            {/* Padrão identificado - destaque para N8N */}
            {padrao && (
              <div className="mt-4 p-3 bg-black/30 rounded-lg border border-violet-500/10">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-semibold text-amber-400 uppercase tracking-wide">
                    Padrão Detectado
                  </span>
                </div>
                <p className={cn('text-sm font-medium', config.textColor)}>
                  {padrao.nome}
                </p>
                <p className={cn('text-xs text-white/60 mt-1', config.textColor)}>
                  {padrao.significado}
                </p>
              </div>
            )}
          </>
        ) : (
          <>
            <p className={cn('text-sm leading-relaxed', config.textColor)}>
              {textoAcontecendo}
            </p>
            
            {/* Mensagem padrão - apenas para não-N8N */}
            <p className={cn('text-xs mt-2 text-white/60', config.textColor)}>
              {config.mensagemPadrao}
            </p>
            
            {/* Padrão identificado - layout antigo para não-N8N */}
            {padrao && (
              <div className="mt-3 p-2 bg-black/20 rounded-lg">
                <p className={cn('text-sm font-medium', config.textColor)}>
                  Padrão: {padrao.nome}
                </p>
                <p className={cn('text-xs text-white/60', config.textColor)}>
                  {padrao.significado}
                </p>
              </div>
            )}
          </>
        )}
        
        {/* === SEÇÕES ABAIXO SÓ APARECEM SE NÃO FOR N8N === */}
        {!geradoPorN8N && (
          <>
            {/* Arquétipo para celebrações de Descoberta */}
            {ehDescoberta && arquetipo && (
              <div className="mt-4 space-y-3">
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
                
                {/* Como Potencializar - apenas se NÃO for N8N */}
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
            
            {/* Para Confirmação - NÃO N8N */}
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
            
            {/* Arquétipo simples (para estados NÃO celebração) - NÃO N8N */}
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
            
            {/* Fallback para celebração genérica - NÃO N8N */}
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
          </>
        )}
        
        {/* SEÇÃO: COMO FALAR COM O ALUNO (apenas para celebrações NÃO N8N) */}
        {!geradoPorN8N && ehCelebracao && (
          <div className="mt-5 space-y-4">
            <div className="p-4 bg-amber-950/40 rounded-xl border border-amber-600/30">
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
            <div className="w-full py-3 px-4 rounded-xl bg-green-900/20 border-2 border-dashed border-green-500/30 flex items-center justify-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-green-400 text-sm font-medium">
                Conversa registrada em {new Date(conversaRegistrada.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
              </span>
            </div>
          ) : (
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
      
      {/* Expandir detalhes (para N8N ou não-celebração com detalhes) */}
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
              {/* === LAYOUT N8N === */}
              {geradoPorN8N ? (
                <>
                  {/* Hipóteses colapsáveis individualmente */}
                  {hipoteses && hipoteses.length > 0 && (
                    <div>
                      <h4 className={cn('text-sm font-semibold mb-3 flex items-center gap-2', config.textColor)}>
                        <Lightbulb className="w-4 h-4" />
                        Hipóteses
                      </h4>
                      <div className="space-y-2">
                        {hipoteses.map((hipotese, i) => (
                          <div key={i} className="bg-black/20 rounded-lg overflow-hidden">
                            <button
                              onClick={() => toggleHipotese(i)}
                              className="w-full p-3 flex items-center justify-between text-left hover:bg-black/10 transition-colors"
                            >
                              <span className={cn('text-sm font-medium', config.textColor)}>
                                ▸ {hipotese.titulo}
                              </span>
                              {hipotesesExpandidas[i] ? (
                                <ChevronUp className="w-4 h-4 text-white/60" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-white/60" />
                              )}
                            </button>
                            {hipotesesExpandidas[i] && (
                              <div className="px-3 pb-3 space-y-2">
                                <p className={cn('text-xs opacity-80', config.textColor)}>
                                  {hipotese.descricao}
                                </p>
                                {hipotese.perguntas && hipotese.perguntas.length > 0 && (
                                  <div className="mt-2 p-2 bg-blue-900/20 rounded-lg border border-blue-500/20">
                                    {hipotese.perguntas.map((pergunta, j) => (
                                      <p key={j} className="text-xs text-blue-300 italic">
                                        💬 "{pergunta}"
                                      </p>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Ações Sugeridas - Layout de Cards Expansíveis com Conteúdo Rico */}
                  {acoesSugeridas && acoesSugeridas.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-white/60 mb-3 flex items-center gap-2">
                        <Target className="w-3.5 h-3.5" />
                        Ações Sugeridas
                      </h4>
                      <div className="space-y-2">
                        {acoesSugeridas.map((acao, i) => {
                          const { titulo, descricao } = parseAcao(acao.acao);
                          const isExpanded = acoesExpandidas[i] ?? (i === 0); // Primeira aberta por padrão
                          const temConteudoRico = acao.script || acao.objetivo || acao.contexto || acao.comoEscutar || acao.porQueFunciona;
                          
                          return (
                            <div 
                              key={i} 
                              className={cn(
                                'rounded-lg border overflow-hidden transition-all',
                                acao.prioridade === 'alta' ? 'border-red-500/30 bg-red-900/20' :
                                acao.prioridade === 'media' ? 'border-amber-500/30 bg-amber-900/20' :
                                'border-green-500/30 bg-green-900/20'
                              )}
                            >
                              <button
                                onClick={() => toggleAcao(i)}
                                className="w-full p-3 flex items-start gap-3 text-left hover:bg-white/5 transition-colors"
                              >
                                {/* Badge de prioridade - chip colorido */}
                                <span className={cn(
                                  'text-[10px] font-semibold uppercase px-2 py-1 rounded flex-shrink-0 mt-0.5',
                                  acao.prioridade === 'alta' ? 'bg-red-500 text-white' :
                                  acao.prioridade === 'media' ? 'bg-amber-500 text-black' :
                                  'bg-green-500 text-white'
                                )}>
                                  {acao.prioridade === 'alta' ? 'Alta' : acao.prioridade === 'media' ? 'Média' : 'Baixa'}
                                </span>
                                
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-white">{titulo}</p>
                                  {descricao && !isExpanded && (
                                    <p className="text-xs text-white/60 mt-1 leading-relaxed line-clamp-1">
                                      {descricao}
                                    </p>
                                  )}
                                </div>
                                
                                {(temConteudoRico || descricao) && (
                                  <ChevronDown className={cn(
                                    'w-4 h-4 text-white/40 flex-shrink-0 transition-transform mt-0.5',
                                    isExpanded && 'rotate-180'
                                  )} />
                                )}
                              </button>
                              
                              {/* Conteúdo expandido com dados ricos */}
                              {isExpanded && (temConteudoRico || descricao) && (
                                <div className="px-3 pb-3 space-y-3 border-t border-violet-500/10">
                                  {/* Descrição completa */}
                                  {descricao && (
                                    <p className="text-white/80 text-sm pt-3">
                                      {descricao}
                                    </p>
                                  )}
                                  
                                  {/* Objetivo */}
                                  {acao.objetivo && (
                                    <p className="text-white/80 text-sm">
                                      <strong className="text-white">Objetivo:</strong> {acao.objetivo}
                                    </p>
                                  )}
                                  
                                  {/* Contexto */}
                                  {acao.contexto && (
                                    <p className="text-white/60 text-sm">
                                      <strong className="text-white/80">Contexto:</strong> {acao.contexto}
                                    </p>
                                  )}
                                  
                                  {/* SCRIPT EM DESTAQUE */}
                                  {acao.script && (
                                    <div className="p-3 bg-blue-900/40 rounded-lg border border-blue-500/30">
                                      <p className="text-blue-400 text-xs font-semibold mb-1">💬 DIGA:</p>
                                      <p className="text-white text-sm leading-relaxed italic">
                                        "{acao.script}"
                                      </p>
                                    </div>
                                  )}
                                  
                                  {/* Como escutar */}
                                  {acao.comoEscutar && (
                                    <p className="text-white/70 text-sm">
                                      <span className="text-amber-400">👂</span> {acao.comoEscutar}
                                    </p>
                                  )}
                                  
                                  {/* Por que funciona */}
                                  {acao.porQueFunciona && (
                                    <p className="text-green-400/80 text-sm">
                                      <span className="text-green-400">✓</span> Por que funciona: {acao.porQueFunciona}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  {/* Arquétipo com sugestao_conversa (para alertas N8N) */}
                  {arquetipo?.sugestao_conversa && (
                    <div className="p-3 bg-amber-900/20 rounded-lg border border-amber-500/20">
                      <h4 className="text-sm font-semibold mb-2 flex items-center gap-2 text-amber-400">
                        <Award className="w-4 h-4" />
                        {arquetipo.nome_arquetipo ? `Arquétipo: ${arquetipo.nome_arquetipo}` : 'Como usar a força do aluno'}
                      </h4>
                      <p className="text-sm text-white/90 leading-relaxed italic">
                        💬 "{arquetipo.sugestao_conversa}"
                      </p>
                    </div>
                  )}
                  
                  {/* COMO REAGIR (N8N) - Novo! */}
                  {comoReagir && (
                    <div className="p-3 bg-emerald-900/20 rounded-lg border border-emerald-500/20">
                      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2 text-emerald-400">
                        🔄 Como Reagir
                      </h4>
                      <div className="space-y-2">
                        <p className="text-sm text-white/90">
                          <span className="text-green-400 mr-2">✅</span>
                          <strong>Se aceitar:</strong> "{comoReagir.seAceitar}"
                        </p>
                        <p className="text-sm text-white/90">
                          <span className="text-red-400 mr-2">❌</span>
                          <strong>Se recusar:</strong> "{comoReagir.seRecusar}"
                        </p>
                        {comoReagir.alerta && (
                          <p className="text-sm text-amber-400 font-semibold mt-2">
                            ⚠️ {comoReagir.alerta}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* O QUE NÃO FAZER (N8N) */}
                  {oQueNaoFazer && oQueNaoFazer.length > 0 && (
                    <div className="p-3 bg-red-900/20 rounded-lg border border-red-500/20">
                      <h4 className="text-sm font-semibold mb-2 flex items-center gap-2 text-red-400">
                        <AlertOctagon className="w-4 h-4" />
                        O Que NÃO Fazer
                      </h4>
                      <ul className="space-y-1">
                        {oQueNaoFazer.map((item, i) => (
                          <li key={i} className="text-sm text-white/80 flex items-start gap-2">
                            <span className="text-red-400 flex-shrink-0">✗</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {/* MENSAGEM PARA O PROFESSOR (N8N) */}
                  {mensagemProfessor && (
                    <div className="p-3 bg-blue-900/20 rounded-lg border border-blue-500/20">
                      <h4 className="text-sm font-semibold mb-2 flex items-center gap-2 text-blue-400">
                        <MessageCircle className="w-4 h-4" />
                        Mensagem para Você
                      </h4>
                      <p className="text-sm text-white/90 leading-relaxed italic">
                        "{mensagemProfessor}"
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* === LAYOUT NÃO-N8N (original) === */}
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
                  
                  {/* O QUE NÃO FAZER */}
                  {oQueNaoFazer && oQueNaoFazer.length > 0 && (
                    <div className="p-3 bg-red-900/20 rounded-lg border border-red-500/20">
                      <h4 className="text-sm font-semibold mb-2 flex items-center gap-2 text-red-400">
                        <AlertOctagon className="w-4 h-4" />
                        O Que NÃO Fazer
                      </h4>
                      <ul className="space-y-1">
                        {oQueNaoFazer.map((item, i) => (
                          <li key={i} className="text-sm text-white/80 flex items-start gap-2">
                            <span className="text-red-400 flex-shrink-0">✗</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {/* MENSAGEM PARA O PROFESSOR */}
                  {mensagemProfessor && (
                    <div className="p-3 bg-blue-900/20 rounded-lg border border-blue-500/20">
                      <h4 className="text-sm font-semibold mb-2 flex items-center gap-2 text-blue-400">
                        <MessageCircle className="w-4 h-4" />
                        Mensagem para Você
                      </h4>
                      <p className="text-sm text-white/90 leading-relaxed italic">
                        "{mensagemProfessor}"
                      </p>
                    </div>
                  )}
                </>
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
