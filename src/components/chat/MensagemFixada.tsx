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
  /** Pele clara (F2 reformado). Default false = escura (aluno/admin). */
  light?: boolean;
}

// Com emoji (pele escura, aluno/admin) e sem emoji (pele clara, F2 reformado).
const CARGO_BADGE: Record<string, string> = {
  lider: '🦅 Líder',
  vice: '👑 Vice-Líder',
  coordenador: '⭐ Coordenador',
  embaixador: '🌍 Embaixador',
};

const CARGO_LABEL: Record<string, string> = {
  lider: 'Líder',
  vice: 'Vice-Líder',
  coordenador: 'Coordenador',
  embaixador: 'Embaixador',
};

export const MensagemFixada = ({ mensagem, casaColor, light = false }: MensagemFixadaProps) => {
  const nomeAutor = mensagem.autor?.full_name || 'Usuário';
  const cargoAtivo = mensagem.autor?.cargos_casa?.find(c => c.ativo);
  const cargoKey = cargoAtivo?.cargo;
  const cargoLabel = cargoKey ? (light ? CARGO_LABEL[cargoKey] : CARGO_BADGE[cargoKey]) : null;

  const c = light
    ? { wrap: 'bg-[#F6F7F9]', head: 'text-[#6E7788]', body: 'text-[#1C2230]', meta: 'text-[#6E7788]' }
    : { wrap: 'bg-white/5', head: 'text-white/60', body: 'text-white', meta: 'text-white/50' };

  return (
    <div
      className={`${c.wrap} rounded-lg p-3 border-l-2`}
      style={{ borderLeftColor: casaColor }}
    >
      <div className={`flex items-center gap-1.5 ${c.head} text-xs mb-2`}>
        <Pin className="h-3 w-3" />
        <span className="uppercase font-medium tracking-wide">Mensagem Fixada</span>
      </div>

      <p className={`${c.body} text-sm mb-2`}>
        {mensagem.conteudo}
      </p>

      <div className={`flex items-center gap-1.5 ${c.meta} text-xs`}>
        {!light && <span>: </span>}
        <span>{nomeAutor}</span>
        {cargoLabel && (
          <span>{cargoLabel}</span>
        )}
      </div>
    </div>
  );
};
