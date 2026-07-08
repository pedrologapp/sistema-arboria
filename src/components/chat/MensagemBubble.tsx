import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { infantilTheme as t } from '@/styles/infantilTheme';
import { getIniciais } from '@/lib/infantil';

interface MensagemAutor {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  cargos_casa?: { cargo: string; ativo: boolean }[];
}

interface Mensagem {
  id: string;
  conteudo: string;
  created_at: string;
  tipo: string | null;
  fixada: boolean | null;
  autor: MensagemAutor;
}

interface CasaBadgeInfo {
  nome?: string;
  emoji?: string;
  cor?: string;
}

interface MensagemBubbleProps {
  mensagem: Mensagem;
  isMe: boolean;
  casaColor: string;
  agruparComAnterior?: boolean;
  casaBadge?: CasaBadgeInfo;
  /**
   * Pele CLARA (F2 reformado / Infantil / F1). Default false = pele escura
   * original, preservada para o chat do aluno e do admin.
   */
  light?: boolean;
  /**
   * Só no ramo CLARO: renderiza a gramática de BOLHA da conversa (minha msg à
   * direita em accentSoft; a do aluno à esquerda em surface). Usado na DM.
   * No canal (muitos autores) fica false = formato agrupado estilo Discord.
   */
  bolhaDm?: boolean;
}

const CARGO_BADGE: Record<string, string> = {
  lider: '🦅',
  vice: '👑',
  coordenador: '⭐',
  embaixador: '🌍',
};

const CARGO_LABEL: Record<string, string> = {
  lider: 'Líder',
  vice: 'Vice',
  coordenador: 'Coord',
  embaixador: 'Embaixador',
};

export const MensagemBubble = ({
  mensagem,
  isMe,
  casaColor,
  agruparComAnterior = false,
  casaBadge,
  light = false,
  bolhaDm = false,
}: MensagemBubbleProps) => {
  const nomeCompleto = mensagem.autor?.full_name || 'Usuário';
  const partes = nomeCompleto.trim().split(/\s+/);
  const nomeAutor = partes.length <= 2 ? nomeCompleto : `${partes[0]} ${partes[1]}`;
  const cargoAtivo = mensagem.autor?.cargos_casa?.find(c => c.ativo);
  const cargoKey = cargoAtivo?.cargo;
  const hora = format(new Date(mensagem.created_at), 'HH:mm');
  const isAnuncio = mensagem.tipo === 'anuncio';

  // ── Pele CLARA, modo BOLHA (DM): gramática do thread do Diário ──────────────
  // Minha msg à direita (accentSoft, rounded-br-sm); a do aluno à esquerda
  // (surface, borderLeft accent, rounded-tl-sm). Nunca bolha cheia na cor da
  // Casa (risco de contraste AA).
  if (light && bolhaDm) {
    if (isMe) {
      return (
        <div className={`flex justify-end ${agruparComAnterior ? 'mt-0.5' : 'mt-2'}`}>
          <div
            className="rounded-2xl rounded-br-sm px-3 py-2 max-w-[85%]"
            style={{ backgroundColor: t.accentSoft }}
          >
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words" style={{ color: t.text }}>
              {mensagem.conteudo}
            </p>
            <p className="text-[10px] text-right mt-1" style={{ color: t.textFaint }}>{hora}</p>
          </div>
        </div>
      );
    }
    return (
      <div className={`flex justify-start ${agruparComAnterior ? 'mt-0.5' : 'mt-2'}`}>
        <div
          className="rounded-2xl rounded-tl-sm px-3 py-2 max-w-[85%]"
          style={{ backgroundColor: t.surface, borderLeft: `3px solid ${t.accent}`, boxShadow: t.shadowSm }}
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words" style={{ color: t.text }}>
            {mensagem.conteudo}
          </p>
          <p className="text-[10px] mt-1" style={{ color: t.textFaint }}>{hora}</p>
        </div>
      </div>
    );
  }

  // ── Pele CLARA, modo AGRUPADO (canal, muitos autores): reskin em tokens ─────
  if (light) {
    if (agruparComAnterior) {
      return (
        <div className="group flex px-2 py-0.5">
          <div className="pl-[48px]">
            <p className="text-sm whitespace-pre-wrap break-words" style={{ color: t.text }}>
              {mensagem.conteudo}
            </p>
          </div>
        </div>
      );
    }
    return (
      <div
        className="group flex gap-3 px-2 pt-2 pb-1 rounded-xl"
        style={isAnuncio ? { backgroundColor: t.accentSoft, borderLeft: `3px solid ${t.accent}` } : undefined}
      >
        <Avatar className="h-9 w-9 flex-shrink-0">
          <AvatarImage src={mensagem.autor?.avatar_url || undefined} />
          <AvatarFallback className="text-xs font-semibold" style={{ backgroundColor: t.accentSoft, color: t.accentText }}>
            {getIniciais(nomeAutor)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-medium" style={{ color: t.text }}>{nomeAutor}</span>
            {cargoKey && CARGO_LABEL[cargoKey] && (
              <span className="text-xs" style={{ color: t.textFaint }}>{CARGO_LABEL[cargoKey]}</span>
            )}
            <span className="text-[10px]" style={{ color: t.textFaint }}>{hora}</span>
          </div>
          <p className="text-sm whitespace-pre-wrap break-words mt-0.5" style={{ color: t.text }}>
            {mensagem.conteudo}
          </p>
        </div>
      </div>
    );
  }

  // Pele: clara (F2 reformado) vs escura (aluno/admin, default)
  const c = light
    ? {
        hover: 'hover:bg-black/[0.03]',
        anuncio: 'bg-amber-50 border-l-2 border-amber-400',
        name: 'text-[#1C2230]',
        cargo: 'text-[#6E7788]',
        hora: 'text-[#6E7788]',
        texto: 'text-[#1C2230]',
      }
    : {
        hover: 'hover:bg-white/5',
        anuncio: 'bg-yellow-500/10 border-l-2 border-yellow-500',
        name: 'text-white',
        cargo: 'text-white/50',
        hora: 'text-white/30',
        texto: 'text-white/90',
      };

  // Mensagem agrupada (continuação do mesmo autor)
  if (agruparComAnterior) {
    return (
      <div className={`group flex ${c.hover} px-2 py-0.5`}>
        <div className="pl-[48px]">
          <p className={`${c.texto} text-sm whitespace-pre-wrap break-words`}>
            {mensagem.conteudo}
          </p>
        </div>
      </div>
    );
  }

  // Mensagem com header completo
  return (
    <div className={`group flex gap-3 ${c.hover} px-2 pt-2 pb-1 ${
      isAnuncio ? c.anuncio : ''
    }`}>
      {/* Avatar */}
      <Avatar className="h-9 w-9 flex-shrink-0">
        <AvatarImage src={mensagem.autor?.avatar_url || undefined} />
        <AvatarFallback
          className="text-white font-medium"
          style={{ backgroundColor: casaColor }}
        >
          {nomeAutor.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      {/* Conteúdo */}
      <div className="flex-1 min-w-0">
        {/* Header: Nome + Cargo + Hora */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`text-sm font-medium ${c.name}`}>
            {nomeAutor}
          </span>

          {casaBadge?.nome && (
            <span
              className="text-[10px] px-1 py-0.5 rounded-full font-medium"
              style={{
                backgroundColor: `${casaBadge.cor || casaColor}20`,
                color: casaBadge.cor || casaColor
              }}
            >
              {light ? casaBadge.nome : `${casaBadge.emoji} ${casaBadge.nome}`}
            </span>
          )}

          {cargoKey && CARGO_LABEL[cargoKey] && (
            <span className={`text-xs ${c.cargo}`}>
              {light ? CARGO_LABEL[cargoKey] : `${CARGO_BADGE[cargoKey] || ''} ${CARGO_LABEL[cargoKey]}`}
            </span>
          )}

          <span className={`text-[10px] ${c.hora}`}>
            {hora}
          </span>
        </div>

        {/* Conteúdo da mensagem */}
        <p className={`${c.texto} text-sm whitespace-pre-wrap break-words mt-0.5`}>
          {mensagem.conteudo}
        </p>
      </div>
    </div>
  );
};
