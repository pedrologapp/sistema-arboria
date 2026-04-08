import { 
  AlertTriangle, 
  Star, 
  Award,
  FileText, 
  Lightbulb, 
  Target, 
  MessageCircle, 
  Eye, 
  Users,
  Home
} from 'lucide-react';

interface AcaoSugerida {
  titulo: string;
  icone: string;
  codigo: string;
}

interface Arquetipo {
  nome: string;
  significado: string;
  potencializar: string[];
}

interface AlertaAtivoCardProps {
  tipo: 'precisa_atencao' | 'celebrar';
  subtipo?: 'descoberta' | 'confirmacao';
  nomeAluno: string;
  motivo: string;
  contexto: string[];
  hipoteses: { titulo: string; descricao: string }[];
  sugestoes?: string[];
  acoesSugeridas?: AcaoSugerida[];
  arquetipo?: Arquetipo;
  onRegistrarAcaoClick: () => void;
  casaColor: string;
  sinalPredominante?: string;
  quantidadeSinal?: number;
}

// Mapear ícones de string para componentes
const iconeMap: Record<string, typeof MessageCircle> = {
  // Kebab-case (Lucide padrão)
  'message-circle': MessageCircle,
  'eye': Eye,
  'users': Users,
  'home': Home,
  // Códigos de ação
  'conversar': MessageCircle,
  'observar': Eye,
  'falar_colegas': Users,
  'verificar_familia': Home,
  // PascalCase (como vem do banco)
  'MessageCircle': MessageCircle,
  'Eye': Eye,
  'Users': Users,
  'Home': Home,
};

const AlertaAtivoCard = ({
  tipo,
  subtipo,
  nomeAluno,
  motivo,
  contexto,
  hipoteses,
  sugestoes,
  acoesSugeridas,
  arquetipo,
  onRegistrarAcaoClick,
  casaColor,
  sinalPredominante,
  quantidadeSinal
}: AlertaAtivoCardProps) => {
  const isPrecisaAtencao = tipo === 'precisa_atencao';
  const isDescoberta = tipo === 'celebrar' && subtipo === 'descoberta';
  const isConfirmacao = tipo === 'celebrar' && subtipo === 'confirmacao';
  
  // Configurações visuais baseadas no tipo
  let headerColor = 'text-red-400';
  let headerBg = 'bg-[#7F1D1D] border-red-500/30';
  let HeaderIcon = AlertTriangle;
  let headerText = 'ALERTA ATIVO';
  
  if (isDescoberta) {
    headerColor = 'text-yellow-400';
    headerBg = 'bg-[#78350F] border-yellow-500/30';
    HeaderIcon = Star;
    headerText = 'DESCOBERTA!';
  } else if (isConfirmacao) {
    headerColor = 'text-yellow-400';
    headerBg = 'bg-[#78350F] border-yellow-500/30';
    HeaderIcon = Award;
    headerText = 'CONFIRMAÇÃO!';
  }

  // Ações padrão para precisa_atencao se não vier do banco
  const acoesParaRenderizar = acoesSugeridas && acoesSugeridas.length > 0 
    ? acoesSugeridas 
    : isPrecisaAtencao ? [
        { titulo: `Conversar com ${nomeAluno}`, icone: 'conversar', codigo: 'conversar' },
        { titulo: 'Apenas observar mais', icone: 'observar', codigo: 'observar' },
        { titulo: 'Falar com outros profs', icone: 'falar_colegas', codigo: 'falar_colegas' }
      ] : [];

  return (
    <div className="space-y-4">
      {/* Card Principal */}
      <div className={`rounded-xl border ${headerBg} p-4`}>
        {/* Header */}
        <div className={`flex items-center gap-2 ${headerColor} font-semibold mb-3`}>
          <HeaderIcon className="w-4 h-4" strokeWidth={2} />
          <span className="text-sm uppercase tracking-wide">{headerText}</span>
        </div>
        
        {/* Badge do sinal (apenas para precisa_atencao) */}
        {isPrecisaAtencao && sinalPredominante && (
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-900/50 text-red-200 border border-red-500/30">
              <span className="w-2 h-2 rounded-full bg-red-400" />
              {sinalPredominante}
              {quantidadeSinal && quantidadeSinal > 1 && (
                <span className="text-red-300">({quantidadeSinal}x)</span>
              )}
            </span>
          </div>
        )}
        
        {/* Motivo / O que está acontecendo */}
        <div className="mb-4">
          <p className="text-white/60 text-xs mb-1">
            {isPrecisaAtencao ? 'O que está acontecendo:' : ''}
          </p>
          <p className="text-white text-sm">{motivo}</p>
        </div>
        
        {/* Divider */}
        <div className="border-t border-violet-500/10 my-4" />
        
        {/* PARA PRECISA_ATENCAO: Contexto */}
        {isPrecisaAtencao && contexto.length > 0 && (
          <>
            <div className="flex items-center gap-2 text-white/60 text-xs mb-2">
              <FileText className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span className="uppercase tracking-wide">Contexto</span>
            </div>
            <ul className="space-y-1 mb-4">
              {contexto.map((item, index) => (
                <li key={index} className="text-white/80 text-sm flex items-start gap-2">
                  <span className="text-white/30">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="border-t border-violet-500/10 my-4" />
          </>
        )}
        
        {/* PARA PRECISA_ATENCAO: Hipóteses */}
        {isPrecisaAtencao && hipoteses.length > 0 && (
          <>
            <div className="flex items-center gap-2 text-white/60 text-xs mb-2">
              <Lightbulb className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span className="uppercase tracking-wide">Hipóteses</span>
            </div>
            <div className="space-y-3">
              {hipoteses.map((hipotese, index) => (
                <div key={index}>
                  <p className="text-white text-sm font-medium">
                    {index + 1}. {hipotese.titulo}
                  </p>
                  <p className="text-white/60 text-xs mt-0.5">{hipotese.descricao}</p>
                </div>
              ))}
            </div>
          </>
        )}
        
        {/* PARA DESCOBERTA: O que isso significa + Arquétipo */}
        {isDescoberta && arquetipo && (
          <>
            <div className="flex items-center gap-2 text-white/60 text-xs mb-2">
              <Lightbulb className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span className="uppercase tracking-wide">O que isso significa</span>
            </div>
            <p className="text-white/80 text-sm mb-3">{arquetipo.significado}</p>
            {arquetipo.nome && (
              <p className="text-yellow-400/80 text-sm">
                Arquétipo possível: <span className="font-medium">"{arquetipo.nome}"</span>
              </p>
            )}
            <div className="border-t border-violet-500/10 my-4" />
          </>
        )}
        
        {/* PARA DESCOBERTA/CONFIRMACAO: Como potencializar */}
        {(isDescoberta || isConfirmacao) && arquetipo && arquetipo.potencializar.length > 0 && (
          <>
            <div className="flex items-center gap-2 text-white/60 text-xs mb-2">
              <Target className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span className="uppercase tracking-wide">Como potencializar</span>
            </div>
            <ul className="space-y-1">
              {arquetipo.potencializar.map((item, index) => (
                <li key={index} className="text-white/80 text-sm flex items-start gap-2">
                  <span className="text-white/30">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
      
      {/* Ações (apenas para precisa_atencao) */}
      {isPrecisaAtencao && acoesParaRenderizar.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center gap-2 text-white/40 text-xs mb-3">
            <Target className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span className="uppercase tracking-wide">O que fazer</span>
          </div>
          
          {/* Sugestões como texto (não clicáveis) */}
          <div className="text-white/60 text-sm mb-4">
            <p className="text-white/40 text-xs mb-2">Sugestões:</p>
            <ul className="space-y-1.5">
              {acoesParaRenderizar.map((acao, index) => {
                const IconComponent = iconeMap[acao.icone] || MessageCircle;
                const iconeNormalizado = acao.icone.toLowerCase();
                let iconColor = 'text-blue-400/60';
                if (iconeNormalizado === 'eye' || iconeNormalizado === 'observar') iconColor = 'text-purple-400/60';
                if (iconeNormalizado === 'users' || iconeNormalizado === 'falar_colegas') iconColor = 'text-green-400/60';
                if (iconeNormalizado === 'home' || iconeNormalizado === 'verificar_familia') iconColor = 'text-orange-400/60';
                
                return (
                  <li key={index} className="flex items-center gap-2">
                    <IconComponent className={`w-3.5 h-3.5 ${iconColor}`} strokeWidth={1.5} />
                    <span>{acao.titulo}</span>
                  </li>
                );
              })}
            </ul>
          </div>
          
          {/* Botão único para registrar ação */}
          <button
            onClick={onRegistrarAcaoClick}
            className="w-full py-3 rounded-xl bg-blue-600 text-white flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors font-medium text-sm"
          >
            <Target className="w-4 h-4" strokeWidth={2} />
            <span>Registrar minha ação</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default AlertaAtivoCard;
