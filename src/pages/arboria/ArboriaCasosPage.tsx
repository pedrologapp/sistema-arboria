// A ABA #CASOS · o chão da fábrica
//
// A lista enumera os casos. Abrir um caso é entrar no laboratório daquela
// criança, e o laboratório é a linha de produção parada: dá para ver o que
// chegou, o que já cruzou, no que a gente apostou, o que foi perguntado e ainda
// não voltou, e o que morreu.
//
// A ORDEM DAS SEÇÕES NÃO É ESTÉTICA, É A LINHA:
//   interesses → mecanismos → apostas → sondagem → o que caiu → acervo
//
// O acervo fica por último e fechado. Ele existe (nada se perde) e não fica no
// caminho, porque o Fundador foi explícito: "não como um repositório, mas como
// algo que eu possa entender melhor esse aluno".
//
// E em lugar nenhum desta tela aparece nome de inteligência. O nome fecha a
// investigação: no instante em que se escreve "interpessoal", quem observa para
// de olhar. O mecanismo é descrito pelo que se vê, e o nome, se vier, vem por
// último e quase nunca é necessário.
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { infantilTheme as t } from '@/styles/infantilTheme';
import {
  Loader2, ArrowLeft, ChevronDown, ChevronRight, Home, School,
  Beaker, Scale, Send, Archive, XCircle,
} from 'lucide-react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tabela = (nome: string): any => (supabase as any).from(nome);

interface Caso {
  id: string; numero: number; aluno_id: string | null; quem: string | null;
  titulo: string; pergunta: string | null; estado: string;
  aberto_em: string; ultima_atividade: string;
  nome?: string; turma?: string; serie?: string;
  cenas?: number; mecanismos?: number; apostas?: number;
}
interface Cena {
  id: string; tipo: string; descricao: string; citacao: string | null;
  fonte: string; quem: string | null; quando: string | null;
  origem_tipo: string | null;
}
interface Mecanismo { id: string; descricao: string; ordem: number; cenas: string[] }
interface Aposta {
  id: string; hipotese: string; rival: string; o_que_derrubaria: string;
  estado: string; motivo_queda: string | null; data_aposta: string; checada_em: string | null;
}
interface Sondagem {
  id: string; pedido: string; pergunta: string; para_quem: string | null;
  enviada_em: string; volta: string | null; voltou_em: string | null;
}

const ESTADO_COR: Record<string, { fundo: string; letra: string }> = {
  aberto:    { fundo: t.accentSoft, letra: t.accentText },
  sondando:  { fundo: '#FFF2D9', letra: '#8A6A1F' },
  em_espera: { fundo: t.surfaceSunken, letra: t.textFaint },
  encerrado: { fundo: t.surfaceSunken, letra: t.textFaint },
};
const ESTADO_NOME: Record<string, string> = {
  aberto: 'aberto', sondando: 'sondando',
  em_espera: 'em espera', encerrado: 'encerrado',
};

const dia = (iso: string | null) => {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

// Uma seção do laboratório. O contador no título é o que diz, de longe, onde a
// linha está cheia e onde está vazia.
const Estacao = ({ icone, titulo, nota, n, children }: {
  icone: React.ReactNode; titulo: string; nota?: string; n?: number; children: React.ReactNode;
}) => (
  <section className="mb-7">
    <div className="flex items-center gap-2 mb-1">
      <span style={{ color: t.textFaint, display: 'flex' }}>{icone}</span>
      <h3 className="text-[13px] font-bold m-0" style={{ color: t.text, letterSpacing: '.02em' }}>
        {titulo}
      </h3>
      {n !== undefined && (
        <span className="text-[11px] font-bold px-1.5 rounded-full"
          style={{ backgroundColor: t.surfaceSunken, color: t.textFaint }}>{n}</span>
      )}
    </div>
    {nota && <p className="text-[11.5px] mb-3 mt-0" style={{ color: t.textFaint, lineHeight: 1.5 }}>{nota}</p>}
    {children}
  </section>
);

const ArboriaCasosPage = () => {
  const [casos, setCasos] = useState<Caso[] | null>(null);
  const [aberto, setAberto] = useState<Caso | null>(null);
  const [cenas, setCenas] = useState<Cena[]>([]);
  const [mecs, setMecs] = useState<Mecanismo[]>([]);
  const [apostas, setApostas] = useState<Aposta[]>([]);
  const [sondagens, setSondagens] = useState<Sondagem[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [verAcervo, setVerAcervo] = useState(false);

  useEffect(() => { void carregarLista(); }, []);

  async function carregarLista() {
    const { data, error } = await tabela('casos')
      .select('id, numero, aluno_id, quem, titulo, pergunta, estado, aberto_em, ultima_atividade')
      .order('numero');
    if (error) { toast.error('Não consegui carregar os casos'); setCasos([]); return; }
    const lista = (data ?? []) as Caso[];

    // Nome e turma vêm à parte porque o caso #0 não tem aluno: o método vale
    // para quem for investigado, e o Fundador quis ser o primeiro.
    const ids = lista.map((c) => c.aluno_id).filter(Boolean);
    const { data: pes } = ids.length
      ? await tabela('profiles').select('id, full_name, serie, turma').in('id', ids)
      : { data: [] };
    const porId = new Map((pes ?? []).map((p: Record<string, string>) => [p.id, p]));

    const contagens = await Promise.all(lista.map(async (c) => {
      const [a, b, d] = await Promise.all([
        tabela('caso_cena').select('id', { count: 'exact', head: true }).eq('caso_id', c.id),
        tabela('caso_mecanismo').select('id', { count: 'exact', head: true }).eq('caso_id', c.id),
        tabela('caso_aposta').select('id', { count: 'exact', head: true }).eq('caso_id', c.id),
      ]);
      return { cenas: a.count ?? 0, mecanismos: b.count ?? 0, apostas: d.count ?? 0 };
    }));

    setCasos(lista.map((c, k) => {
      const p = porId.get(c.aluno_id ?? '') as Record<string, string> | undefined;
      return { ...c, nome: p?.full_name, serie: p?.serie, turma: p?.turma, ...contagens[k] };
    }));
  }

  async function abrir(c: Caso) {
    setAberto(c); setCarregando(true); setVerAcervo(false);
    const [a, b, d, e] = await Promise.all([
      tabela('caso_cena').select('*').eq('caso_id', c.id).order('quando', { ascending: false }),
      tabela('caso_mecanismo').select('*').eq('caso_id', c.id).order('ordem'),
      tabela('caso_aposta').select('*').eq('caso_id', c.id).order('data_aposta', { ascending: false }),
      tabela('caso_sondagem').select('*').eq('caso_id', c.id).order('enviada_em', { ascending: false }),
    ]);
    setCenas((a.data ?? []) as Cena[]);
    setMecs((b.data ?? []) as Mecanismo[]);
    setApostas((d.data ?? []) as Aposta[]);
    setSondagens((e.data ?? []) as Sondagem[]);
    setCarregando(false);
  }

  const interesses = useMemo(() => cenas.filter((c) => c.tipo === 'interesse'), [cenas]);
  const doLado = useMemo(() => ({
    casa: cenas.filter((c) => c.fonte === 'casa').length,
    escola: cenas.filter((c) => c.fonte === 'escola').length,
  }), [cenas]);

  if (!casos) {
    return (
      <div className="flex items-center gap-2 py-10 text-sm" style={{ color: t.textMuted }}>
        <Loader2 size={16} className="animate-spin" /> carregando os casos
      </div>
    );
  }

  // ==================================================== O LABORATÓRIO
  if (aberto) {
    const vivas = apostas.filter((a) => a.estado !== 'derrubada');
    const caidas = apostas.filter((a) => a.estado === 'derrubada');
    const abertas = sondagens.filter((s) => !s.voltou_em);
    const voltaram = sondagens.filter((s) => s.voltou_em);

    return (
      <div>
        <button onClick={() => setAberto(null)}
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold mb-4"
          style={{ color: t.accentText }}>
          <ArrowLeft size={15} /> voltar aos casos
        </button>

        <div className="flex items-baseline gap-2.5 flex-wrap">
          <span className="text-[13px] font-bold" style={{ color: t.textFaint }}>#{aberto.numero}</span>
          <h2 className="text-xl font-bold m-0" style={{ color: t.text }}>
            {aberto.nome ?? aberto.quem}
          </h2>
          {aberto.turma && (
            <span className="text-[13px]" style={{ color: t.textMuted }}>{aberto.turma}</span>
          )}
        </div>

        <p className="text-[15px] mt-1 mb-1" style={{ color: t.text, fontWeight: 600 }}>{aberto.titulo}</p>
        {aberto.pergunta && (
          <p className="text-[13.5px] m-0" style={{ color: t.textMuted, lineHeight: 1.5, maxWidth: '68ch' }}>
            {aberto.pergunta}
          </p>
        )}

        <div className="flex gap-2 flex-wrap mt-4 mb-7">
          <span className="text-[11.5px] font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1.5"
            style={{ backgroundColor: t.surface, color: t.textMuted, border: `1px solid ${t.border}` }}>
            <Home size={12} /> {doLado.casa} de casa
          </span>
          <span className="text-[11.5px] font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1.5"
            style={{ backgroundColor: t.surface, color: t.textMuted, border: `1px solid ${t.border}` }}>
            <School size={12} /> {doLado.escola} da escola
          </span>
          {(doLado.casa === 0 || doLado.escola === 0) && (
            <span className="text-[11.5px] font-bold px-2.5 py-1 rounded-full"
              style={{ backgroundColor: '#FFF2D9', color: '#8A6A1F' }}>
              só um lado
            </span>
          )}
        </div>

        {carregando && (
          <div className="flex items-center gap-2 text-sm mb-6" style={{ color: t.textMuted }}>
            <Loader2 size={15} className="animate-spin" /> abrindo o laboratório
          </div>
        )}

        {/* ---------------------------------------------- o que ele procura */}
        {interesses.length > 0 && (
          <Estacao icone={<Beaker size={14} />} titulo="O que ele procura sozinho" n={interesses.length}
            nota="O mais durável do caso, e o que alimenta a escolha de atividade.">
            <div className="flex flex-col gap-1.5">
              {interesses.map((c) => (
                <div key={c.id} className="rounded-xl px-3.5 py-2.5"
                  style={{ backgroundColor: t.accentSoft, border: `1px solid ${t.accentBorder}` }}>
                  <p className="text-[14px] m-0" style={{ color: t.text }}>{c.descricao}</p>
                </div>
              ))}
            </div>
          </Estacao>
        )}

        {/* ------------------------------------------- mecanismos visíveis */}
        <Estacao icone={<Beaker size={14} />} titulo="Mecanismos visíveis" n={mecs.length}
          nota="Do mais sustentado para o menos. Uma cena sozinha é anedota; duas que se encaixam viram mecanismo.">
          {mecs.length === 0
            ? <p className="text-[13px]" style={{ color: t.silencio }}>Nada cruzado ainda.</p>
            : (
              <div className="flex flex-col gap-1.5">
                {mecs.map((m, k) => (
                  <div key={m.id} className="rounded-xl px-4 py-3 flex items-start gap-3"
                    style={{ backgroundColor: t.surface, border: `1px solid ${t.border}` }}>
                    <span className="text-[11px] font-bold mt-0.5" style={{ color: t.textFaint }}>{k + 1}</span>
                    <p className="text-[14.5px] m-0 flex-1" style={{ color: t.text, lineHeight: 1.4 }}>
                      {m.descricao}
                    </p>
                  </div>
                ))}
              </div>
            )}
        </Estacao>

        {/* ------------------------------------------------------ apostas */}
        <Estacao icone={<Scale size={14} />} titulo="As apostas" n={vivas.length}
          nota="Hipótese nunca anda sozinha. O banco recusa aposta sem rival e sem o que a derrubaria.">
          {vivas.length === 0
            ? <p className="text-[13px]" style={{ color: t.silencio }}>Nenhuma aposta feita ainda.</p>
            : vivas.map((a) => (
              <div key={a.id} className="rounded-2xl p-4 mb-2.5"
                style={{ backgroundColor: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadowSm }}>
                <p className="text-[11px] font-bold uppercase mb-1" style={{ color: t.accentText, letterSpacing: '.1em' }}>
                  hipótese
                </p>
                <p className="text-[14.5px] m-0 mb-3.5" style={{ color: t.text, lineHeight: 1.45 }}>{a.hipotese}</p>

                <p className="text-[11px] font-bold uppercase mb-1" style={{ color: t.textFaint, letterSpacing: '.1em' }}>
                  rival
                </p>
                <p className="text-[14px] m-0 mb-3.5" style={{ color: t.textMuted, lineHeight: 1.45 }}>{a.rival}</p>

                <p className="text-[11px] font-bold uppercase mb-1" style={{ color: t.textFaint, letterSpacing: '.1em' }}>
                  o que derrubaria
                </p>
                <p className="text-[14px] m-0" style={{ color: t.textMuted, lineHeight: 1.45 }}>{a.o_que_derrubaria}</p>

                <p className="text-[11px] mt-3.5 mb-0" style={{ color: t.textFaint }}>
                  apostada em {dia(a.data_aposta)}
                  {a.checada_em ? ` · checada em ${dia(a.checada_em)}` : ' · nunca checada'}
                </p>
              </div>
            ))}
        </Estacao>

        {/* ----------------------------------------------------- sondagem */}
        <Estacao icone={<Send size={14} />} titulo="Em sondagem" n={abertas.length}
          nota="Uma coisa por vez. Pergunta que só pode confirmar não entra.">
          {sondagens.length === 0
            ? <p className="text-[13px]" style={{ color: t.silencio }}>Nada foi perguntado ainda.</p>
            : sondagens.map((s) => (
              <div key={s.id} className="rounded-2xl p-4 mb-2.5"
                style={{ backgroundColor: t.surface, border: `1px solid ${s.voltou_em ? t.accentBorder : t.border}` }}>
                <p className="text-[14px] m-0 mb-2" style={{ color: t.text, lineHeight: 1.45 }}>{s.pedido}</p>
                <p className="text-[14px] m-0 font-semibold" style={{ color: t.accentText }}>{s.pergunta}</p>
                {s.volta
                  ? <p className="text-[14px] mt-3 mb-0 pl-3" style={{ color: t.textMuted, borderLeft: `2px solid ${t.accentBorder}` }}>
                      {s.volta} <span className="text-[11px]" style={{ color: t.textFaint }}>· {dia(s.voltou_em)}</span>
                    </p>
                  : <p className="text-[11.5px] mt-3 mb-0" style={{ color: t.textFaint }}>
                      enviada em {dia(s.enviada_em)}, ainda sem volta
                    </p>}
              </div>
            ))}
          <p className="text-[11.5px] mt-1" style={{ color: t.textFaint }}>
            {voltaram.length} já voltaram
          </p>
        </Estacao>

        {/* ------------------------------------------------- o que caiu */}
        {caidas.length > 0 && (
          <Estacao icone={<XCircle size={14} />} titulo="O que caiu" n={caidas.length}
            nota="Fica escrito. Sem isto, a IA reencontra a hipótese antiga e confirma para sempre.">
            {caidas.map((a) => (
              <div key={a.id} className="rounded-xl px-4 py-3 mb-2"
                style={{ backgroundColor: t.surfaceSunken, border: `1px solid ${t.border}` }}>
                <p className="text-[14px] m-0" style={{ color: t.textMuted, textDecoration: 'line-through' }}>
                  {a.hipotese}
                </p>
                {a.motivo_queda && (
                  <p className="text-[13px] mt-1.5 mb-0" style={{ color: t.text }}>{a.motivo_queda}</p>
                )}
              </div>
            ))}
          </Estacao>
        )}

        {/* ---------------------------------------------------- o acervo */}
        <section style={{ borderTop: `1px solid ${t.border}`, paddingTop: 18 }}>
          <button onClick={() => setVerAcervo((v) => !v)}
            className="inline-flex items-center gap-2 text-[13px] font-bold"
            style={{ color: t.textMuted }}>
            {verAcervo ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
            <Archive size={14} /> O acervo, cru ({cenas.length})
          </button>
          <p className="text-[11.5px] mt-1 mb-3" style={{ color: t.textFaint, lineHeight: 1.5 }}>
            Tudo que entrou, com data e fonte. Nada aqui se apaga nem se reescreve.
            Fica fechado porque ninguém entende uma criança lendo arquivo.
          </p>

          {verAcervo && (
            <div className="flex flex-col gap-2">
              {cenas.map((c) => (
                <div key={c.id} className="rounded-xl px-4 py-3"
                  style={{ backgroundColor: t.surface, border: `1px solid ${t.border}` }}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1"
                      style={c.fonte === 'casa'
                        ? { backgroundColor: t.accentSoft, color: t.accentText }
                        : { backgroundColor: t.surfaceSunken, color: t.textMuted }}>
                      {c.fonte === 'casa' ? <Home size={10} /> : <School size={10} />}
                      {c.quem}
                    </span>
                    <span className="text-[11px]" style={{ color: t.textFaint }}>{dia(c.quando)}</span>
                  </div>
                  <p className="text-[14px] m-0" style={{ color: t.text, lineHeight: 1.45 }}>
                    {c.citacao ?? c.descricao}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    );
  }

  // ========================================================= A LISTA
  return (
    <div>
      <h1 className="text-xl font-bold mb-1" style={{ color: t.text }}>Casos</h1>
      <p className="text-[13px] mb-6 max-w-2xl" style={{ color: t.textMuted, lineHeight: 1.55 }}>
        Investigação, não diagnóstico. Cada caso persegue uma pergunta sobre uma
        criança, com hipótese, rival e o que derrubaria as duas. Nome de
        inteligência não aparece aqui de propósito: o nome fecha a investigação, e
        quem observa para de olhar.
      </p>

      <div className="flex flex-col gap-2">
        {casos.map((c) => {
          const cor = ESTADO_COR[c.estado] ?? ESTADO_COR.aberto;
          const soUmLado = (c.cenas ?? 0) > 0 && (c.mecanismos ?? 0) < 3;
          return (
            <button key={c.id} onClick={() => void abrir(c)}
              className="rounded-2xl px-4 py-3.5 flex items-start gap-3.5 text-left w-full"
              style={{ backgroundColor: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadowSm }}>
              <span className="text-[15px] font-bold mt-0.5 tabular-nums"
                style={{ color: t.textFaint, minWidth: 26 }}>#{c.numero}</span>

              <span className="flex-1 min-w-0">
                <b className="block text-[15px] font-semibold" style={{ color: t.text }}>
                  {c.nome ?? c.quem}
                </b>
                <span className="block text-[13px] mb-1" style={{ color: t.text }}>{c.titulo}</span>
                <span className="text-[11.5px]" style={{ color: t.textFaint }}>
                  {c.turma ? c.turma + ' · ' : ''}
                  {c.cenas} no acervo · {c.mecanismos} mecanismos · {c.apostas} apostas
                  {soUmLado && ' · material fino'}
                </span>
              </span>

              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap"
                style={{ backgroundColor: cor.fundo, color: cor.letra }}>
                {ESTADO_NOME[c.estado] ?? c.estado}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ArboriaCasosPage;
