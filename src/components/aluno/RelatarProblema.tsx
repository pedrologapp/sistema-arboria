import { useState } from 'react';
import { HelpCircle, Send, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Relato de problema do aluno. Vai para problemas_alunos e aparece no painel
 * /arboria. Junto do texto viaja o `contexto`: sem ele, "não consegui enviar"
 * não dá para rastrear.
 *
 * variant 'card'   - cartão da home
 * variant 'inline' - linha discreta dentro da missão
 */
export interface ContextoProblema {
  missao_id?: string;
  missao_titulo?: string;
  grupo_ref?: string | null;
  ultimo_erro?: string | null;
  tela?: string;
}

interface Props {
  userId?: string;
  institutionId?: string;
  contexto?: ContextoProblema;
  variant?: 'card' | 'inline';
}

const RelatarProblema = ({ userId, institutionId, contexto, variant = 'card' }: Props) => {
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [falhou, setFalhou] = useState(false);

  const enviar = async () => {
    if (!userId || !institutionId || !texto.trim() || enviando) return;
    setEnviando(true);
    setFalhou(false);

    const { error } = await supabase.from('problemas_alunos').insert({
      aluno_id: userId,
      institution_id: institutionId,
      texto: texto.trim(),
      contexto: {
        ...contexto,
        rota: typeof window !== 'undefined' ? window.location.pathname : null,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        registrado_em: new Date().toISOString(),
      },
    } as any);

    if (error) {
      console.error('[relatar-problema] falhou:', error);
      setFalhou(true);
    } else {
      setTexto('');
      setEnviado(true);
      setAberto(false);
      setTimeout(() => setEnviado(false), 4000);
    }
    setEnviando(false);
  };

  if (enviado) {
    return (
      <div className="animate-fade-in rounded-[18px] border border-emerald-400/40 bg-emerald-400/[0.05] p-3 text-center">
        <p className="text-xs text-green-400">
          Recebemos. Seu mentor vai olhar isso. Se você já escreveu sua resposta, ela não se perdeu.
        </p>
      </div>
    );
  }

  if (!aberto) {
    return variant === 'inline' ? (
      <button
        onClick={() => setAberto(true)}
        className="flex items-center gap-2 text-[11.5px] text-white/35 hover:text-white/60 transition-colors"
      >
        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
        Deu problema nesta missão? Avise a gente
      </button>
    ) : (
      <button
        onClick={() => setAberto(true)}
        className="animate-fade-in rounded-[14px] border border-white/20 bg-white/[0.07] w-full p-3.5 text-left active:scale-[0.98] transition-transform"
      >
        <div className="flex items-center gap-3">
          <HelpCircle className="w-5 h-5 text-white/70 shrink-0" />
          <div>
            <p className="text-[13px] text-white/85 font-medium">Está com algum problema? Relate aqui</p>
            <p className="text-[11px] text-white/40 mt-0.5">A gente lê e resolve</p>
          </div>
        </div>
      </button>
    );
  }

  return (
    <div className="animate-fade-in rounded-[18px] border border-white/[0.08] bg-white/[0.035] p-3.5 space-y-2">
      <p className="text-xs text-white/40">
        {contexto?.missao_titulo ? `O que aconteceu em "${contexto.missao_titulo}"?` : 'Descreva o problema:'}
      </p>
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Ex: cliquei em enviar e apareceu um erro"
        maxLength={500}
        rows={3}
        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white placeholder:text-white/20 resize-none focus:outline-none focus:border-white/20"
      />
      {falhou && (
        <p className="text-[11px] text-red-400">Não deu para enviar agora. Tente de novo em instantes.</p>
      )}
      <div className="flex items-center justify-between">
        <button
          onClick={() => { setAberto(false); setTexto(''); setFalhou(false); }}
          className="text-xs text-white/30"
        >
          Cancelar
        </button>
        <button
          onClick={enviar}
          disabled={!texto.trim() || enviando}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium bg-violet-500/20 text-violet-400 disabled:opacity-30"
        >
          {enviando ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
          Enviar
        </button>
      </div>
    </div>
  );
};

export default RelatarProblema;
