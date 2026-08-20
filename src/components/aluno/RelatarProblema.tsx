import { useCallback, useEffect, useState } from 'react';
import { HelpCircle, Send, Loader2, AlertCircle, MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Relato de problema do aluno, e a CONVERSA que vem depois.
 *
 * Ate 20/08 isto era mao unica: a crianca escrevia e nunca sabia se alguem
 * tinha lido. O Fundador leu os 15 relatos naquele dia e encontrou sete alunos
 * descrevendo o mesmo defeito em abril, treze relatos sem resposta nenhuma, e
 * uma aluna do 9o ano se desculpando por um problema que era do app.
 *
 * Agora e' conversa. O que a crianca escreve vai para problemas_alunos, a
 * resposta do Arboria vai para problema_mensagens, e ela pode responder de
 * volta. Ninguem alem dela e do dono do sistema le': nem professor, nem lider
 * de casa. Isso e' de proposito, porque muda o que ela se sente a vontade de
 * escrever.
 *
 * Do lado do Arboria nao existe nome de pessoa. A crianca conversa com o
 * Arboria, nao com um adulto especifico.
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

interface Mensagem { id: string; de: 'aluno' | 'arboria'; texto: string; lida_pelo_aluno: boolean; created_at: string }
interface Conversa {
  id: string; texto: string; created_at: string; mensagens: Mensagem[];
  // Quando o Arboria puxa a conversa, o texto do relato e' o ASSUNTO e nao a
  // fala de ninguem. Desenhar aquilo como bolha do aluno seria por na boca dele
  // uma frase que ele nao escreveu.
  iniciado_por?: 'aluno' | 'arboria';
}

// A tabela problema_mensagens ainda nao esta nos tipos gerados do Supabase, e o
// encadeamento tipado explode em "type instantiation is excessively deep". Um
// acesso solto resolve sem mexer no client, que e' arquivo gerado.
/* eslint-disable @typescript-eslint/no-explicit-any */
const fromAny = (tb: string): any => (supabase as any).from(tb);

const quando = (iso: string) => {
  const d = new Date(iso);
  const hoje = new Date();
  const mesmoDia = d.toDateString() === hoje.toDateString();
  return mesmoDia
    ? d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

const RelatarProblema = ({ userId, institutionId, contexto, variant = 'card' }: Props) => {
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [falhou, setFalhou] = useState(false);
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [novoAssunto, setNovoAssunto] = useState(false);

  // Quantas respostas do Arboria ela ainda nao viu. E' o que faz o cartao da
  // home mudar de cara: sem isso ela nunca saberia que foi respondida.
  const naoLidas = conversas.reduce(
    (n, c) => n + c.mensagens.filter((m) => m.de === 'arboria' && !m.lida_pelo_aluno).length, 0);

  const carregar = useCallback(async () => {
    if (!userId) return;
    const { data: relatos } = await fromAny('problemas_alunos')
      .select('id, texto, created_at, iniciado_por')
      .eq('aluno_id', userId)
      .order('created_at', { ascending: false })
      .limit(8);
    const lista = (relatos ?? []) as unknown as Array<{
      id: string; texto: string; created_at: string; iniciado_por?: 'aluno' | 'arboria';
    }>;
    if (!lista.length) { setConversas([]); return; }

    const { data: msgs } = await fromAny('problema_mensagens')
      .select('id, problema_id, de, texto, lida_pelo_aluno, created_at')
      .in('problema_id', lista.map((r) => r.id))
      .order('created_at', { ascending: true });
    const todas = (msgs ?? []) as unknown as Array<Mensagem & { problema_id: string }>;

    setConversas(lista.map((r) => ({
      ...r,
      mensagens: todas.filter((m) => m.problema_id === r.id),
    })));
  }, [userId]);

  useEffect(() => { void carregar(); }, [carregar]);

  // Marcar como lida so' quando ela ABRE, nunca ao carregar a home. Marcar sem
  // ela ter visto apagaria o aviso de uma resposta que ela nunca leu.
  const abrir = async () => {
    setAberto(true);
    const pendentes = conversas
      .flatMap((c) => c.mensagens)
      .filter((m) => m.de === 'arboria' && !m.lida_pelo_aluno)
      .map((m) => m.id);
    if (!pendentes.length) return;
    await fromAny('problema_mensagens').update({ lida_pelo_aluno: true } as never).in('id', pendentes);
    setConversas((cs) => cs.map((c) => ({
      ...c, mensagens: c.mensagens.map((m) => (pendentes.includes(m.id) ? { ...m, lida_pelo_aluno: true } : m)),
    })));
  };

  const enviarRelato = async () => {
    if (!userId || !institutionId || !texto.trim() || enviando) return;
    setEnviando(true);
    setFalhou(false);

    const { error } = await fromAny('problemas_alunos').insert({
      aluno_id: userId,
      institution_id: institutionId,
      texto: texto.trim(),
      contexto: {
        ...contexto,
        rota: typeof window !== 'undefined' ? window.location.pathname : null,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        registrado_em: new Date().toISOString(),
      },
    } as never);

    if (error) {
      console.error('[relatar-problema] falhou:', error);
      setFalhou(true);
    } else {
      setTexto('');
      setNovoAssunto(false);
      await carregar();
    }
    setEnviando(false);
  };

  const responder = async (conversaId: string) => {
    if (!texto.trim() || enviando) return;
    setEnviando(true);
    setFalhou(false);
    const { error } = await fromAny('problema_mensagens').insert({
      problema_id: conversaId, de: 'aluno', texto: texto.trim(),
    } as never);
    if (error) { console.error('[relatar-problema] resposta falhou:', error); setFalhou(true); }
    else { setTexto(''); await carregar(); }
    setEnviando(false);
  };

  // ------------------------------------------------------------- fechado
  if (!aberto) {
    if (variant === 'inline') {
      return (
        <button onClick={abrir} className="flex items-center gap-2 text-[11.5px] text-white/35 hover:text-white/60 transition-colors">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {naoLidas > 0 ? 'O Arboria te respondeu' : 'Deu problema nesta missão? Avise a gente'}
        </button>
      );
    }

    // Com resposta nova o cartao muda de cara. E' o unico aviso que ela tem.
    if (naoLidas > 0) {
      return (
        <button onClick={abrir}
          className="animate-fade-in rounded-[14px] w-full p-3.5 text-left active:scale-[0.98] transition-transform"
          style={{ border: '1px solid rgba(61,214,140,.45)', background: 'rgba(61,214,140,.10)' }}>
          <div className="flex items-center gap-3">
            <MessageCircle className="w-5 h-5 shrink-0" style={{ color: '#3DD68C' }} />
            <div className="flex-1">
              <p className="text-[13px] text-white font-semibold">O Arboria te respondeu</p>
              <p className="text-[11px] text-white/45 mt-0.5">
                {naoLidas === 1 ? 'Toque para ver' : `${naoLidas} respostas novas`}
              </p>
            </div>
          </div>
        </button>
      );
    }

    return (
      <button onClick={abrir}
        className="animate-fade-in rounded-[14px] border border-white/20 bg-white/[0.07] w-full p-3.5 text-left active:scale-[0.98] transition-transform">
        <div className="flex items-center gap-3">
          <HelpCircle className="w-5 h-5 text-white/70 shrink-0" />
          <div>
            <p className="text-[13px] text-white/85 font-medium">
              {conversas.length ? 'Falar com o Arboria' : 'Está com algum problema? Relate aqui'}
            </p>
            <p className="text-[11px] text-white/40 mt-0.5">
              {conversas.length ? 'Sua conversa está aqui' : 'A gente lê e responde'}
            </p>
          </div>
        </div>
      </button>
    );
  }

  // -------------------------------------------------------------- aberto
  const semConversa = conversas.length === 0 || novoAssunto;

  return (
    <div className="animate-fade-in rounded-[18px] border border-white/[0.08] bg-white/[0.035] p-3.5 space-y-3">

      {conversas.map((c) => (
        <div key={c.id} className="space-y-2">
          {c.iniciado_por === 'arboria' ? (
            <p className="text-[9px] font-bold uppercase tracking-[.14em] text-white/25 m-0 px-1">
              {c.texto}
            </p>
          ) : (
            <div className="rounded-xl px-3 py-2.5 bg-white/[0.06] border border-white/[0.06]">
              <p className="text-[9px] font-bold uppercase tracking-[.14em] text-white/30 mb-1">
                Você · {quando(c.created_at)}
              </p>
              <p className="text-[13px] text-white/85 leading-snug m-0">{c.texto}</p>
            </div>
          )}

          {c.mensagens.map((m) => (
            <div key={m.id}
              className={`rounded-xl px-3 py-2.5 ${m.de === 'arboria' ? 'ml-3' : ''}`}
              style={m.de === 'arboria'
                ? { background: 'rgba(61,214,140,.09)', border: '1px solid rgba(61,214,140,.28)' }
                : { background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.06)' }}>
              <p className="text-[9px] font-bold uppercase tracking-[.14em] mb-1"
                style={{ color: m.de === 'arboria' ? '#3DD68C' : 'rgba(255,255,255,.3)' }}>
                {m.de === 'arboria' ? 'Arboria' : 'Você'} · {quando(m.created_at)}
              </p>
              <p className="text-[13px] text-white/90 leading-snug m-0 whitespace-pre-line">{m.texto}</p>
            </div>
          ))}
        </div>
      ))}

      {semConversa && (
        <p className="text-xs text-white/40 m-0">
          {contexto?.missao_titulo ? `O que aconteceu em "${contexto.missao_titulo}"?` : 'Pode escrever do seu jeito. Eu leio.'}
        </p>
      )}

      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder={semConversa ? 'Ex: cliquei em enviar e apareceu um erro' : 'Escreva sua resposta'}
        maxLength={500}
        rows={3}
        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white placeholder:text-white/20 resize-none focus:outline-none focus:border-white/20"
      />

      {falhou && <p className="text-[11px] text-red-400 m-0">Não deu para enviar agora. Tente de novo em instantes.</p>}

      <div className="flex items-center justify-between">
        <button onClick={() => { setAberto(false); setTexto(''); setFalhou(false); setNovoAssunto(false); }}
          className="text-xs text-white/30">Fechar</button>

        <div className="flex items-center gap-3">
          {conversas.length > 0 && !novoAssunto && (
            <button onClick={() => { setNovoAssunto(true); setTexto(''); }} className="text-xs text-white/30">
              Falar de outra coisa
            </button>
          )}
          <button
            onClick={() => (semConversa ? enviarRelato() : responder(conversas[0].id))}
            disabled={!texto.trim() || enviando}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium bg-violet-500/20 text-violet-400 disabled:opacity-30">
            {enviando ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
};

export default RelatarProblema;
