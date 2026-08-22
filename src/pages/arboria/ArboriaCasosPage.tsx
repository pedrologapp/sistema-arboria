// A ABA #CASOS · o chão da fábrica
//
// A lista enumera os casos, clara, dentro do painel. Abrir um caso troca a pele:
// vira a FOLHA do Arboria, com a mesma cara do documento que a gente já leva
// para a professora (privado/casos/#1_Ayrton). Preto, turquesa, marca em cima,
// nome em serifa grande, rótulos em caixa alta espaçada.
//
// Não é enfeite. É o mesmo objeto em dois estados: na tela ele tem
// funcionalidade, no papel ele vira folha, e a professora reconhece um do outro
// sem ninguém explicar.
//
// A ORDEM DAS SEÇÕES NÃO É ESTÉTICA, É A LINHA DA FÁBRICA:
//   interesses → mecanismos → apostas → sondagem → o que caiu → acervo
//
// O acervo fica por último e fechado. Ele existe (nada se perde) e não fica no
// caminho, porque ninguém entende uma criança lendo arquivo.
//
// E em lugar nenhum aparece nome de inteligência. O nome fecha a investigação:
// no instante em que se escreve "interpessoal", quem observa para de olhar.
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { infantilTheme as t } from '@/styles/infantilTheme';
import { Loader2, ArrowLeft, ChevronDown, ChevronRight, Home, School } from 'lucide-react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tabela = (nome: string): any => (supabase as any).from(nome);

// A paleta da folha, igual à do documento impresso.
const F = {
  preto: '#08080C',
  acc: '#5EE0D0',
  claro: '#F3F2F8',
  claro2: '#A9AEBC',
  linha: 'rgba(255,255,255,.14)',
  serif: '"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif',
};

interface Caso {
  id: string; numero: number; aluno_id: string | null; quem: string | null;
  titulo: string; pergunta: string | null; estado: string;
  aberto_em: string; ultima_atividade: string;
  resumo: string | null; gostos: string[];
  nome?: string; turma?: string; serie?: string; nascimento?: string | null;
  cenas?: number; mecanismos?: number; apostas?: number;
}
interface Cena {
  id: string; tipo: string; descricao: string; citacao: string | null;
  fonte: string; quem: string | null; quando: string | null; origem_tipo: string | null;
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

const ESTADO_NOME: Record<string, string> = {
  aberto: 'aberto', sondando: 'sondando', em_espera: 'em espera', encerrado: 'encerrado',
};

// O caso é conhecido pelo primeiro nome, igual às pastas em privado/casos.
// Nome composto leva duas palavras, senão Maria Cecília e Maria Helena viram a
// mesma "Maria" e o número passa a ser a única diferença entre elas.
const COMPOSTOS = new Set(['maria', 'ana', 'joão', 'joao', 'josé', 'jose', 'luiz',
  'luís', 'luis', 'pedro', 'antônio', 'antonio', 'carlos', 'paulo', 'francisco']);
const nomeCurto = (n: string) => {
  const p = n.replace(/,.*/, '').trim().split(/\s+/);
  if (p.length < 2) return p[0] ?? '';
  return COMPOSTOS.has(p[0].toLowerCase()) ? `${p[0]} ${p[1]}` : p[0];
};

// Idade em anos cheios. Aparece logo abaixo do nome porque muda o que cada
// cena quer dizer: repetir a mesma historia aos tres anos e o esperado, aos dez
// e outra coisa.
const idade = (nasc: string | null | undefined) => {
  if (!nasc) return null;
  const n = new Date(nasc + 'T00:00:00');
  const h = new Date();
  let a = h.getFullYear() - n.getFullYear();
  const m = h.getMonth() - n.getMonth();
  if (m < 0 || (m === 0 && h.getDate() < n.getDate())) a--;
  return a;
};

const dia = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '';

// O rótulo de seção da folha: caixa alta, muito espaçado, turquesa.
const Selo = ({ children, n }: { children: React.ReactNode; n?: number }) => (
  <p style={{
    fontSize: 11, letterSpacing: '.26em', textTransform: 'uppercase',
    color: F.acc, fontWeight: 800, margin: '0 0 12px',
  }}>
    {children}{n !== undefined && <span style={{ color: F.claro2, fontWeight: 700 }}> · {n}</span>}
  </p>
);

const Secao = ({ titulo, n, nota, children }: {
  titulo: string; n?: number; nota?: string; children: React.ReactNode;
}) => (
  <section style={{ margin: '0 0 34px' }}>
    <Selo n={n}>{titulo}</Selo>
    {nota && (
      <p style={{ fontSize: 12.5, color: F.claro2, lineHeight: 1.55, margin: '-6px 0 14px', maxWidth: '64ch' }}>
        {nota}
      </p>
    )}
    {children}
  </section>
);

const Vazio = ({ children }: { children: React.ReactNode }) => (
  <p style={{ fontSize: 13.5, color: 'rgba(169,174,188,.65)', margin: 0, fontStyle: 'italic' }}>
    {children}
  </p>
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
      .select('id, numero, aluno_id, quem, titulo, pergunta, estado, resumo, gostos, aberto_em, ultima_atividade')
      .order('numero');
    if (error) { toast.error('Não consegui carregar os casos'); setCasos([]); return; }
    const lista = (data ?? []) as Caso[];

    // Nome e turma vêm à parte porque o caso #0 não tem aluno: o método vale
    // para quem for investigado, e o Fundador quis ser o primeiro.
    const ids = lista.map((c) => c.aluno_id).filter(Boolean);
    const { data: pes } = ids.length
      ? await tabela('profiles').select('id, full_name, serie, turma, data_nascimento').in('id', ids)
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
      return { ...c, nome: p?.full_name, serie: p?.serie, turma: p?.turma,
               nascimento: p?.data_nascimento, ...contagens[k] };
    }));
  }

  async function abrir(c: Caso) {
    setAberto(c); setCarregando(true); setVerAcervo(false);
    window.scrollTo(0, 0);
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

  // ============================================ A FOLHA DE UM CASO
  if (aberto) {
    const vivas = apostas.filter((a) => a.estado !== 'derrubada');
    const caidas = apostas.filter((a) => a.estado === 'derrubada');

    return (
      <div>
        <button onClick={() => setAberto(null)}
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold mb-4"
          style={{ color: t.accentText }}>
          <ArrowLeft size={15} /> voltar aos casos
        </button>

        <div style={{
          position: 'relative', overflow: 'hidden',
          background: F.preto, color: F.claro, borderRadius: 18,
          padding: '38px 40px 42px',
          boxShadow: '0 18px 60px rgba(8,8,12,.28)',
        }}>
          {/* O brilho do alto, igual ao da folha impressa. */}
          <div aria-hidden style={{
            position: 'absolute', left: '50%', top: '-24%', width: '150%', height: '62%',
            transform: 'translateX(-50%)', pointerEvents: 'none',
            background: 'radial-gradient(closest-side, rgba(94,224,208,.16), transparent 70%)',
          }} />

          <div style={{ position: 'relative' }}>
            <p style={{ fontWeight: 800, letterSpacing: '-.045em', fontSize: 30, lineHeight: 1, margin: 0 }}>
              Arb<span style={{ color: F.acc }}>oria</span>
            </p>
            <p style={{
              fontSize: 10.5, letterSpacing: '.3em', textTransform: 'uppercase',
              color: F.acc, fontWeight: 800, margin: '8px 0 0',
            }}>
              Caso #{aberto.numero}
            </p>

            <h1 style={{
              fontFamily: F.serif, fontSize: 38, lineHeight: 1.04, letterSpacing: '-.02em',
              fontWeight: 400, margin: '24px 0 8px',
            }}>
              {aberto.nome ?? aberto.quem}
            </h1>

            {/* Idade, série e turma, e mais nada. Contagem de acervo saiu daqui:
                a folha abria em "6 de casa · 4 da escola" e o Fundador leu e não
                entendeu, com razão. Número de fonte é coisa do fim, quando já se
                sabe de quem se trata. */}
            <p style={{ fontSize: 13.5, color: F.claro2, margin: '0 0 26px' }}>
              {[
                idade(aberto.nascimento) !== null ? `${idade(aberto.nascimento)} anos` : null,
                aberto.turma,
              ].filter(Boolean).join('  ·  ')}
            </p>

            {/* QUEM É, antes de qualquer pergunta. Descreve o que a criança FAZ,
                com cena concreta, e nunca o que ela é. */}
            {aberto.resumo && (
              <p style={{
                fontSize: 16, lineHeight: 1.62, margin: '0 0 30px',
                maxWidth: '66ch', color: F.claro,
              }}>
                {aberto.resumo}
              </p>
            )}

            {aberto.gostos.length > 0 && (
              <div style={{ margin: '0 0 34px' }}>
                <Selo>O que ele procura sozinho</Selo>
                <ul style={{ margin: 0, padding: 0 }}>
                  {aberto.gostos.map((g) => (
                    <li key={g} style={{
                      listStyle: 'none', position: 'relative', paddingLeft: 34,
                      margin: '0 0 10px', fontSize: 15, lineHeight: 1.45,
                    }}>
                      <span aria-hidden style={{
                        position: 'absolute', left: 0, top: 10, width: 20, height: 1.4, background: F.acc,
                      }} />
                      {g}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Só agora a pergunta faz sentido, porque já se sabe de quem ela é. */}
            <div style={{
              borderTop: `1px solid ${F.linha}`, paddingTop: 30, margin: '0 0 38px',
            }}>
              <Selo>A pergunta do caso</Selo>
              <div style={{ borderLeft: `3px solid ${F.acc}`, padding: '4px 0 4px 22px' }}>
                <p style={{ fontFamily: F.serif, fontSize: 21, lineHeight: 1.35, margin: 0 }}>
                  {aberto.titulo}
                </p>
                {aberto.pergunta && (
                  <p style={{ fontSize: 14, color: F.claro2, lineHeight: 1.6, margin: '12px 0 0', maxWidth: '62ch' }}>
                    {aberto.pergunta}
                  </p>
                )}
              </div>
            </div>

            {carregando && (
              <p style={{ color: F.claro2, fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Loader2 size={15} className="animate-spin" /> abrindo o laboratório
              </p>
            )}

            {/* ---------------------------------- mecanismos visíveis */}
            <Secao titulo="Mecanismos visíveis" n={mecs.length}
              nota="Do mais sustentado para o menos. Uma cena sozinha é anedota; duas que se encaixam viram mecanismo.">
              {mecs.length === 0 ? <Vazio>Nada cruzado ainda.</Vazio> : (
                <ul style={{ margin: 0, padding: 0 }}>
                  {mecs.map((m, k) => (
                    <li key={m.id} style={{
                      listStyle: 'none', position: 'relative', paddingLeft: 34,
                      margin: '0 0 13px', fontSize: 15.5, lineHeight: 1.45,
                    }}>
                      <span aria-hidden style={{
                        position: 'absolute', left: 0, top: 11, width: 20, height: 1.4, background: F.acc,
                      }} />
                      <b style={{ color: F.acc, fontWeight: 700, marginRight: 8 }}>{k + 1}</b>
                      {m.descricao}
                    </li>
                  ))}
                </ul>
              )}
            </Secao>

            {/* -------------------------------------------- apostas */}
            <Secao titulo="As apostas" n={vivas.length}
              nota="Hipótese nunca anda sozinha. O banco recusa aposta sem rival e sem o que a derrubaria.">
              {vivas.length === 0 ? <Vazio>Nenhuma aposta feita ainda.</Vazio> : vivas.map((a) => (
                <div key={a.id} style={{
                  border: `1px solid ${F.linha}`, borderRadius: 12,
                  padding: '20px 22px', margin: '0 0 12px',
                  background: 'rgba(94,224,208,.045)',
                }}>
                  <Selo>hipótese</Selo>
                  <p style={{ fontFamily: F.serif, fontSize: 17.5, lineHeight: 1.4, margin: '0 0 22px' }}>
                    {a.hipotese}
                  </p>

                  <p style={{
                    fontSize: 10.5, letterSpacing: '.26em', textTransform: 'uppercase',
                    color: F.claro2, fontWeight: 800, margin: '0 0 8px',
                  }}>rival</p>
                  <p style={{ fontSize: 14.5, lineHeight: 1.5, margin: '0 0 22px', color: F.claro }}>
                    {a.rival}
                  </p>

                  <p style={{
                    fontSize: 10.5, letterSpacing: '.26em', textTransform: 'uppercase',
                    color: F.claro2, fontWeight: 800, margin: '0 0 8px',
                  }}>o que derrubaria</p>
                  <p style={{ fontSize: 14.5, lineHeight: 1.5, margin: 0, color: F.claro }}>
                    {a.o_que_derrubaria}
                  </p>

                  <p style={{ fontSize: 11.5, color: F.claro2, margin: '20px 0 0' }}>
                    apostada em {dia(a.data_aposta)}
                    {a.checada_em ? ` · checada em ${dia(a.checada_em)}` : ' · nunca checada'}
                  </p>
                </div>
              ))}
            </Secao>

            {/* ------------------------------------------- sondagem */}
            <Secao titulo="Em sondagem" n={sondagens.filter((s) => !s.voltou_em).length}
              nota="Uma coisa por vez. Pergunta que só pode confirmar não entra.">
              {sondagens.length === 0 ? <Vazio>Nada foi perguntado ainda.</Vazio> : sondagens.map((s) => (
                <div key={s.id} style={{
                  border: `1px solid ${F.linha}`, borderRadius: 12,
                  padding: '18px 20px', margin: '0 0 12px',
                }}>
                  <p style={{ fontSize: 14.5, lineHeight: 1.5, margin: '0 0 10px' }}>{s.pedido}</p>
                  <p style={{ fontSize: 15, fontWeight: 700, color: F.acc, margin: 0 }}>{s.pergunta}</p>
                  {s.volta ? (
                    <p style={{
                      fontSize: 14.5, lineHeight: 1.5, margin: '16px 0 0',
                      paddingLeft: 16, borderLeft: `2px solid ${F.acc}`, color: F.claro,
                    }}>
                      {s.volta}
                      <span style={{ color: F.claro2, fontSize: 11.5 }}> · {dia(s.voltou_em)}</span>
                    </p>
                  ) : (
                    <p style={{ fontSize: 11.5, color: F.claro2, margin: '14px 0 0' }}>
                      enviada em {dia(s.enviada_em)}, ainda sem volta
                    </p>
                  )}
                </div>
              ))}
            </Secao>

            {/* ---------------------------------------- o que caiu */}
            {caidas.length > 0 && (
              <Secao titulo="O que caiu" n={caidas.length}
                nota="Fica escrito. Sem isto, a leitura reencontra a hipótese antiga e confirma para sempre.">
                {caidas.map((a) => (
                  <div key={a.id} style={{
                    border: `1px solid ${F.linha}`, borderRadius: 12,
                    padding: '16px 20px', margin: '0 0 10px', opacity: .75,
                  }}>
                    <p style={{ fontSize: 14.5, margin: 0, color: F.claro2, textDecoration: 'line-through' }}>
                      {a.hipotese}
                    </p>
                    {a.motivo_queda && (
                      <p style={{ fontSize: 13.5, margin: '8px 0 0', color: F.claro }}>{a.motivo_queda}</p>
                    )}
                  </div>
                ))}
              </Secao>
            )}

            {/* ------------------------------------------- o acervo */}
            <section style={{ borderTop: `1px solid ${F.linha}`, paddingTop: 24 }}>
              <button onClick={() => setVerAcervo((v) => !v)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  fontSize: 11, letterSpacing: '.26em', textTransform: 'uppercase',
                  color: F.acc, fontWeight: 800, background: 'none', border: 0, padding: 0,
                }}>
                {verAcervo ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                O acervo, cru · {doLado.casa} de casa · {doLado.escola} da escola
              </button>
              <p style={{ fontSize: 12.5, color: F.claro2, lineHeight: 1.55, margin: '10px 0 0', maxWidth: '64ch' }}>
                Tudo que entrou, com data e fonte. Nada aqui se apaga nem se reescreve.
                Fica fechado porque ninguém entende uma criança lendo arquivo.
              </p>

              {verAcervo && (
                <div style={{ marginTop: 18 }}>
                  {cenas.map((c) => (
                    <div key={c.id} style={{
                      border: `1px solid ${F.linha}`, borderRadius: 12,
                      padding: '16px 18px', margin: '0 0 10px',
                    }}>
                      <p style={{
                        fontSize: 10.5, letterSpacing: '.2em', textTransform: 'uppercase',
                        fontWeight: 800, margin: '0 0 8px',
                        color: c.fonte === 'casa' ? F.acc : F.claro2,
                      }}>
                        {c.fonte === 'casa' ? 'casa' : 'escola'} · {c.quem} · {dia(c.quando)}
                      </p>
                      <p style={{ fontSize: 14.5, lineHeight: 1.5, margin: 0 }}>
                        {c.citacao ?? c.descricao}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* A assinatura da folha, igual à do documento impresso: fecha a
                página dizendo em que pé a investigação está. */}
            <p style={{
              marginTop: 30, paddingTop: 18, borderTop: `1px solid ${F.linha}`,
              fontSize: 12, color: F.claro2,
            }}>
              Caso aberto em {dia(aberto.aberto_em)} · {ESTADO_NOME[aberto.estado] ?? aberto.estado}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ================================================== A LISTA
  // A mesma pele da folha. A lista e o sumario do caderno: numero e nome, mais
  // nada. Contagem de acervo e estado sao coisas do laboratorio, e aqui elas so
  // enchiam a linha entre o Fundador e a crianca que ele quer abrir.
  return (
    <div style={{
      position: 'relative', overflow: 'hidden',
      background: F.preto, color: F.claro, borderRadius: 18,
      padding: '38px 40px 30px',
      boxShadow: '0 18px 60px rgba(8,8,12,.28)',
    }}>
      <div aria-hidden style={{
        position: 'absolute', left: '50%', top: '-24%', width: '150%', height: '62%',
        transform: 'translateX(-50%)', pointerEvents: 'none',
        background: 'radial-gradient(closest-side, rgba(94,224,208,.16), transparent 70%)',
      }} />

      <div style={{ position: 'relative' }}>
        <p style={{ fontWeight: 800, letterSpacing: '-.045em', fontSize: 30, lineHeight: 1, margin: 0 }}>
          Arb<span style={{ color: F.acc }}>oria</span>
        </p>
        <p style={{
          fontSize: 10.5, letterSpacing: '.3em', textTransform: 'uppercase',
          color: F.acc, fontWeight: 800, margin: '8px 0 0',
        }}>Casos</p>
        <p style={{ fontSize: 13.5, color: F.claro2, margin: '14px 0 30px' }}>
          Investigação, não diagnóstico.
        </p>

        <div>
          {casos.map((c, k) => (
            <button key={c.id} onClick={() => void abrir(c)}
              style={{
                display: 'flex', alignItems: 'baseline', gap: 18, width: '100%',
                textAlign: 'left', background: 'none', border: 0,
                borderTop: k === 0 ? 'none' : `1px solid ${F.linha}`,
                padding: '17px 2px', color: F.claro, cursor: 'pointer',
              }}>
              <span style={{
                color: F.acc, fontWeight: 800, fontSize: 13,
                fontVariantNumeric: 'tabular-nums', minWidth: 26,
              }}>#{c.numero}</span>
              <span style={{ fontFamily: F.serif, fontSize: 22, lineHeight: 1.2 }}>
                {nomeCurto(c.nome ?? c.quem ?? '')}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ArboriaCasosPage;
