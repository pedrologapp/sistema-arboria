import { AlertTriangle, Star, FileText, Lightbulb, Target, MessageCircle, Eye, Users } from 'lucide-react';

interface AlertaAtivoCardProps {
  tipo: 'precisa_atencao' | 'celebrar';
  nomeAluno: string;
  motivo: string;
  contexto: string[];
  hipoteses: { titulo: string; descricao: string }[];
  sugestoes?: string[];
  onAcaoClick: (tipoAcao: string) => void;
  casaColor: string;
}

const AlertaAtivoCard = ({
  tipo,
  nomeAluno,
  motivo,
  contexto,
  hipoteses,
  sugestoes,
  onAcaoClick,
  casaColor
}: AlertaAtivoCardProps) => {
  const isPrecisaAtencao = tipo === 'precisa_atencao';
  
  const headerColor = isPrecisaAtencao ? 'text-red-400' : 'text-yellow-400';
  const headerBg = isPrecisaAtencao ? 'bg-red-500/10 border-red-500/20' : 'bg-yellow-500/10 border-yellow-500/20';
  const HeaderIcon = isPrecisaAtencao ? AlertTriangle : Star;
  const headerText = isPrecisaAtencao ? 'ALERTA ATIVO' : 'DESCOBERTA!';

  return (
    <div className="space-y-4">
      {/* Card Principal */}
      <div className={`rounded-xl border ${headerBg} p-4`}>
        {/* Header */}
        <div className={`flex items-center gap-2 ${headerColor} font-semibold mb-3`}>
          <HeaderIcon className="w-4 h-4" strokeWidth={2} />
          <span className="text-sm uppercase tracking-wide">{headerText}</span>
        </div>
        
        {/* Motivo */}
        <div className="mb-4">
          <p className="text-white/60 text-xs mb-1">O que está acontecendo:</p>
          <p className="text-white text-sm">{motivo}</p>
        </div>
        
        {/* Divider */}
        <div className="border-t border-white/10 my-4" />
        
        {/* Contexto */}
        {contexto.length > 0 && (
          <>
            <div className="flex items-center gap-2 text-white/60 text-xs mb-2">
              <FileText className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span className="uppercase tracking-wide">{isPrecisaAtencao ? 'Contexto' : 'O que isso significa'}</span>
            </div>
            <ul className="space-y-1 mb-4">
              {contexto.map((item, index) => (
                <li key={index} className="text-white/80 text-sm flex items-start gap-2">
                  <span className="text-white/30">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </>
        )}
        
        {/* Divider */}
        {hipoteses.length > 0 && <div className="border-t border-white/10 my-4" />}
        
        {/* Hipóteses */}
        {hipoteses.length > 0 && (
          <>
            <div className="flex items-center gap-2 text-white/60 text-xs mb-2">
              <Lightbulb className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span className="uppercase tracking-wide">{isPrecisaAtencao ? 'Hipóteses' : 'Como potencializar'}</span>
            </div>
            <div className="space-y-3">
              {hipoteses.map((hipotese, index) => (
                <div key={index}>
                  <p className="text-white text-sm font-medium">
                    {isPrecisaAtencao && `${index + 1}. `}{hipotese.titulo}
                  </p>
                  <p className="text-white/60 text-xs mt-0.5">{hipotese.descricao}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      
      {/* Ações (apenas para precisa_atencao) */}
      {isPrecisaAtencao && (
        <>
          <div className="flex items-center gap-2 text-white/40 text-xs">
            <Target className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span className="uppercase tracking-wide">O que fazer</span>
          </div>
          
          <div className="space-y-2">
            <button
              onClick={() => onAcaoClick('conversar')}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-left"
            >
              <MessageCircle className="w-4 h-4 text-blue-400" strokeWidth={1.5} />
              <span className="text-white text-sm">Conversar com {nomeAluno}</span>
            </button>
            
            <button
              onClick={() => onAcaoClick('observar')}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-left"
            >
              <Eye className="w-4 h-4 text-purple-400" strokeWidth={1.5} />
              <span className="text-white text-sm">Apenas observar mais</span>
            </button>
            
            <button
              onClick={() => onAcaoClick('falar_colegas')}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-left"
            >
              <Users className="w-4 h-4 text-green-400" strokeWidth={1.5} />
              <span className="text-white text-sm">Falar com outros profs</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default AlertaAtivoCard;
