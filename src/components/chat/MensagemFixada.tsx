import { Pin } from 'lucide-react';

interface MensagemAutor {
  id: string;
  full_name: string | null;
  cargos_casa?: { cargo: string; ativo: boolean }[];
}

interface MensagemFixadaProps {
  mensagem: {
    id: string;
    conteudo: string;
    autor: MensagemAutor;
  };
  casaColor: string;
}

const CARGO_BADGE: Record<string, string> = {
  lider: '🦅 Líder',
  vice: '👑 Vice-Líder',
  coordenador: '⭐ Coordenador',
  embaixador: '🌍 Embaixador',
};

export const MensagemFixada = ({ mensagem, casaColor }: MensagemFixadaProps) => {
  const nomeAutor = mensagem.autor?.full_name || 'Usuário';
  const cargoAtivo = mensagem.autor?.cargos_casa?.find(c => c.ativo);
  const cargoLabel = cargoAtivo?.cargo ? CARGO_BADGE[cargoAtivo.cargo] : null;

  return (
    <div 
      className="bg-white/5 rounded-lg p-3 border-l-2"
      style={{ borderLeftColor: casaColor }}
    >
      <div className="flex items-center gap-1.5 text-white/60 text-xs mb-2">
        <Pin className="h-3 w-3" />
        <span className="uppercase font-medium tracking-wide">Mensagem Fixada</span>
      </div>
      
      <p className="text-white text-sm mb-2">
        {mensagem.conteudo}
      </p>
      
      <div className="flex items-center gap-1.5 text-white/50 text-xs">
        <span>—</span>
        <span>{nomeAutor}</span>
        {cargoLabel && (
          <span>{cargoLabel}</span>
        )}
      </div>
    </div>
  );
};
