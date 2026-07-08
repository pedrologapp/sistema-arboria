import { Pin } from 'lucide-react';
import { infantilTheme as t } from '@/styles/infantilTheme';

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

  // Pele CLARA: cartão tokenizado (rounded-2xl + shadowSm), eyebrow na cor da Casa.
  if (light) {
    return (
      <div
        className="rounded-2xl p-3 border-l-[3px]"
        style={{ backgroundColor: t.surface, borderLeftColor: casaColor, boxShadow: t.shadowSm }}
      >
        <div className="flex items-center gap-1.5 text-[11px] mb-2 uppercase tracking-wide font-semibold" style={{ color: casaColor }}>
          <Pin className="h-3 w-3" />
          <span>Mensagem Fixada</span>
        </div>

        <p className="text-sm mb-2 leading-relaxed" style={{ color: t.text }}>
          {mensagem.conteudo}
        </p>

        <div className="flex items-center gap-1.5 text-xs" style={{ color: t.textFaint }}>
          <span>{nomeAutor}</span>
          {cargoLabel && <span>{cargoLabel}</span>}
        </div>
      </div>
    );
  }

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
        <span>: </span>
        <span>{nomeAutor}</span>
        {cargoLabel && (
          <span>{cargoLabel}</span>
        )}
      </div>
    </div>
  );
};
