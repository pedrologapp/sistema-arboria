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
import { Loader2, ArrowLeft, ChevronDown, ChevronRight, Home, School, FileText } from 'lucide-react';

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
  o_que_estamos_vendo: string | null; analise: string | null; proximos_passos: string[];
  o_que_nao_fecha: string | null; o_que_muda: string | null; tipo_tensao: string | null;
  pergunta_veio_de: string | null;
  pecas_soltas: string[]; proxima_peca: string | null;
  nome?: string; turma?: string; serie?: string; nascimento?: string | null;
  cenas?: number; mecanismos?: number; apostas?: number;
}
interface Cena {
  id: string; tipo: string; descricao: string; citacao: string | null;
  fonte: string; quem: string | null; quando: string | null; origem_tipo: string | null;
  contexto: string | null; aula: string | null;
}
interface Mecanismo { id: string; descricao: string; ordem: number; cenas: string[] }
interface Aposta {
  id: string; hipotese: string; rival: string; o_que_derrubaria: string;
  estado: string; motivo_queda: string | null; data_aposta: string; checada_em: string | null;
}
interface Sondagem {
  id: string; pedido: string; pergunta: string; para_quem: string | null;
  enviada_em: string; entregue_em: string | null; volta: string | null; voltou_em: string | null;
}
interface Ligacao { mecanismo_id: string; cena_id: string; papel: string }
interface Leitura {
  id: string; quando: string; titulo: string | null;
  texto: string; o_que_mudou: string | null;
}

// A SEMIÓTICA DA COR, copiada da folha impressa.
//
// Turquesa não é enfeite, é função: ela marca por onde o olho ENTRA. Na folha
// ela está nas datas, e é isso que deixa a leitura navegável, porque a data é a
// âncora de qualquer cronologia. Branco forte é onde a frase VIRA o argumento.
// Cinza é contexto. Três papéis, três tons, e nada de negrito decorativo.
//
// Antes disto a folha estava toda branca, e um texto todo branco não tem por
// onde o olho pousar: lê-se do começo ao fim ou não se lê.
const PARECE_DATA = /^(\d|1º|º)|(janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)/i;

const comNegrito = (texto: string) =>
  texto.split(/(\*\*[^*]+\*\*)/g).map((p, k) => {
    if (!(p.startsWith('**') && p.endsWith('**'))) return <span key={k}>{p}</span>;
    const dentro = p.slice(2, -2);
    return PARECE_DATA.test(dentro.trim())
      ? <b key={k} style={{ fontWeight: 800, color: F.acc, letterSpacing: '.01em' }}>{dentro}</b>
      : <b key={k} style={{ fontWeight: 700, color: '#fff' }}>{dentro}</b>;
  });

// OS TRÊS CAMINHOS DA COLETA, do desenho do Fundador.
//
// "Professores" e "Aula" são os dois lados da escola e não são a mesma coisa:
// o que a professora CONTA (conversa, entrevista, memória) e o que ficou
// REGISTRADO durante uma atividade. A diferença importa: relato de memória não
// tem data do fato, e registro de aula tem.
const CAMINHOS = [
  { id: 'pais', rotulo: 'Pais' },
  { id: 'professores', rotulo: 'Professores' },
  { id: 'aula', rotulo: 'Aula' },
] as const;

const caminhoDa = (c: Cena) =>
  c.fonte === 'casa' ? 'pais' : c.origem_tipo ? 'aula' : 'professores';

const ESTADO_NOME: Record<string, string> = {
  aberto: 'aberto', sondando: 'sondando', em_espera: 'em espera', encerrado: 'encerrado',
};

// NOME E SOBRENOME, sempre as duas primeiras palavras.
//
// Só o primeiro nome não bastava: Maria Cecília e Maria Helena viravam a mesma
// "Maria" na lista, e o número passava a ser a única diferença entre as duas.
// Duas palavras também resolvem o nome composto sem precisar de lista de nomes.
const nomeCurto = (n: string) =>
  n.replace(/,.*/, '').trim().split(/\s+/).filter(Boolean).slice(0, 2).join(' ');

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
  const [ligacoes, setLigacoes] = useState<Ligacao[]>([]);
  const [leituras, setLeituras] = useState<Leitura[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [verAcervo, setVerAcervo] = useState(false);

  // O perfil guarda a série ("5º Ano") e a turma ("A") em campos separados.
  // Sozinha, a turma é uma letra e não diz nada.
  const turmaCheia = (c: Caso) => [c.serie, c.turma].filter(Boolean).join(' ') || undefined;

  useEffect(() => { void carregarLista(); }, []);

  async function carregarLista() {
    const { data, error } = await tabela('casos')
      .select('id, numero, aluno_id, quem, titulo, pergunta, estado, resumo, gostos, o_que_estamos_vendo, analise, proximos_passos, o_que_nao_fecha, o_que_muda, tipo_tensao, pergunta_veio_de, pecas_soltas, proxima_peca, aberto_em, ultima_atividade')
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
    const listaCenas = (a.data ?? []) as Cena[];
    const listaMecs = (b.data ?? []) as Mecanismo[];
    setCenas(listaCenas);
    setMecs(listaMecs);
    setApostas((d.data ?? []) as Aposta[]);
    setSondagens((e.data ?? []) as Sondagem[]);

    // As ligações mecanismo↔cena. É o que dá lastro ao mecanismo: sem elas,
    // "Cria estrutura e povoa com gente" é uma afirmação sem prova nenhuma.
    const { data: lig } = listaMecs.length
      ? await tabela('caso_mecanismo_cena')
          .select('mecanismo_id, cena_id, papel')
          .in('mecanismo_id', listaMecs.map((m) => m.id))
      : { data: [] };
    setLigacoes((lig ?? []) as Ligacao[]);

    // As leituras, da mais nova para a mais velha. Nunca se corrigem: a de
    // ontem fica exatamente como estava, e a de hoje diz o que mudou.
    const { data: lei } = await tabela('caso_leitura')
      .select('id, quando, titulo, texto, o_que_mudou')
      .eq('caso_id', c.id)
      .order('quando', { ascending: false });
    setLeituras((lei ?? []) as Leitura[]);
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
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <button onClick={() => setAberto(null)}
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold"
            style={{ color: t.accentText }}>
            <ArrowLeft size={15} /> voltar aos casos
          </button>

          {/* A folha da professora. Duas páginas: o Arboria falando, e onde ela
              escreve. Não leva a hipótese, de propósito. */}
          <a href={`/arboria/casos/${aberto.numero}/folha`} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-2 text-[12.5px] font-bold ml-auto"
            style={{
              padding: '8px 16px', borderRadius: 999,
              backgroundColor: F.preto, color: F.acc,
            }}>
            <FileText size={14} /> Folha da professora
          </a>
        </div>

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
              Caso #{aberto.numero} · {nomeCurto(aberto.nome ?? aberto.quem ?? '')}
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
                turmaCheia(aberto),
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

            {/* ================================ OS TRÊS CAMINHOS DA COLETA */}
            <div style={{ borderTop: `1px solid ${F.linha}`, paddingTop: 30, margin: '0 0 34px' }}>
              <Selo>Coleta de dados</Selo>
              <div style={{ display: 'flex', gap: 1, background: F.linha, borderRadius: 12, overflow: 'hidden' }}>
                {CAMINHOS.map((cam) => {
                  const doCaminho = cenas.filter((c) => caminhoDa(c) === cam.id);
                  // O que ESTE caminho, sozinho, deixa ver: os mecanismos que
                  // bebem dele. É a "análise" de cada coluna do desenho.
                  const ids = new Set(doCaminho.map((c) => c.id));
                  const mecsDaqui = mecs.filter((m) =>
                    ligacoes.some((l) => l.mecanismo_id === m.id && ids.has(l.cena_id)));
                  return (
                    <div key={cam.id} style={{ flex: 1, background: F.preto, padding: '18px 16px', minWidth: 0 }}>
                      <p style={{
                        fontSize: 10.5, letterSpacing: '.2em', textTransform: 'uppercase',
                        fontWeight: 800, color: doCaminho.length ? F.acc : F.claro2, margin: '0 0 10px',
                      }}>{cam.rotulo}</p>
                      <p style={{ fontFamily: F.serif, fontSize: 30, lineHeight: 1, margin: '0 0 12px' }}>
                        {doCaminho.length}
                      </p>
                      {doCaminho.length === 0 ? (
                        <p style={{ fontSize: 12, color: 'rgba(169,174,188,.6)', margin: 0, fontStyle: 'italic' }}>
                          nada veio por aqui
                        </p>
                      ) : mecsDaqui.length === 0 ? (
                        <p style={{ fontSize: 12, color: 'rgba(169,174,188,.6)', margin: 0, fontStyle: 'italic' }}>
                          ainda não cruzou com nada
                        </p>
                      ) : (
                        <ul style={{ margin: 0, padding: 0 }}>
                          {mecsDaqui.map((m) => (
                            <li key={m.id} style={{
                              listStyle: 'none', fontSize: 12.5, lineHeight: 1.4,
                              color: F.claro2, margin: '0 0 7px',
                            }}>{m.descricao}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ==================== A LEITURA, DATADA E ACUMULADA
                Nada aqui se corrige. A leitura de hoje fica exatamente como
                está, e a de amanhã entra por cima dizendo o que mudou. É por
                isso que o Fundador chamava de diário: a visão de hoje precisa
                sobreviver à visão de amanhã.

                A prosa vem na ordem que convence, a mesma da folha que já vai
                para a professora: as cenas com data, o que não combina, por que
                não combina, e só então o que se quer descobrir. */}
            {leituras.map((l, k) => (
              <div key={l.id} style={{
                margin: '0 0 30px',
                opacity: k === 0 ? 1 : 0.62,
                borderLeft: k === 0 ? `3px solid ${F.acc}` : `1px solid ${F.linha}`,
                paddingLeft: 22,
              }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: 10.5, letterSpacing: '.26em', textTransform: 'uppercase',
                    color: k === 0 ? F.acc : F.claro2, fontWeight: 800,
                  }}>
                    {k === 0 ? 'A leitura de hoje' : 'Leitura de ' + dia(l.quando)}
                  </span>
                  {k === 0 && (
                    <span style={{ fontSize: 11.5, color: F.claro2 }}>{dia(l.quando)}</span>
                  )}
                </div>

                {l.titulo && (
                  <p style={{
                    fontFamily: F.serif, fontSize: 25, lineHeight: 1.24,
                    margin: '14px 0 18px', letterSpacing: '-.015em',
                  }}>{l.titulo}</p>
                )}

                {l.o_que_mudou && (
                  <p style={{
                    fontSize: 13.5, lineHeight: 1.55, margin: '0 0 18px',
                    color: F.acc, maxWidth: '62ch',
                  }}>
                    O que mudou desde a última: {l.o_que_mudou}
                  </p>
                )}

                {l.texto.split(/\n\n+/).map((par, i) => (
                  <p key={i} style={{
                    fontSize: 16, lineHeight: 1.68, margin: '0 0 16px',
                    maxWidth: '64ch', color: F.claro,
                  }}>{comNegrito(par)}</p>
                ))}
              </div>
            ))}

            {/* Agora a pergunta chega puxada pela tensão, e não do céu. */}
            <div style={{
              borderTop: `1px solid ${F.linha}`, paddingTop: 30, margin: '0 0 38px',
            }}>
              <Selo>Por isso a gente quer entender</Selo>
              <div style={{ borderLeft: `3px solid ${F.acc}`, padding: '4px 0 4px 22px' }}>
                <p style={{ fontFamily: F.serif, fontSize: 23, lineHeight: 1.3, margin: 0 }}>
                  {aberto.titulo}
                </p>
                {aberto.pergunta && (
                  <p style={{ fontSize: 14, color: F.claro2, lineHeight: 1.6, margin: '12px 0 0', maxWidth: '62ch' }}>
                    {aberto.pergunta}
                  </p>
                )}
                {aberto.pergunta_veio_de && (
                  <p style={{ fontSize: 11.5, color: 'rgba(169,174,188,.7)', margin: '14px 0 0' }}>
                    {aberto.pergunta_veio_de === 'professora'
                      ? 'Quem levantou foi a professora. A resposta já tem quem a queira.'
                      : aberto.pergunta_veio_de === 'familia'
                      ? 'Quem levantou foi a família.'
                      : 'Quem levantou foi o Arboria, no cruzamento. Ninguém pediu, então o bilhete precisa dar antes de pedir.'}
                  </p>
                )}
              </div>

              {/* O FREIO. Se ninguém consegue escrever o que muda, o caso não
                  deveria existir. É o que impede virar coleção de curiosidade
                  sobre criança, e é a regra do próprio Fundador de que nem tudo
                  precisa ser investigado. */}
              {aberto.o_que_muda && (
                <div style={{ marginTop: 26 }}>
                  <p style={{
                    fontSize: 10.5, letterSpacing: '.26em', textTransform: 'uppercase',
                    color: F.claro2, fontWeight: 800, margin: '0 0 10px',
                  }}>e o que muda se a gente entender</p>
                  <p style={{ fontSize: 15, lineHeight: 1.6, margin: 0, maxWidth: '64ch', color: F.claro }}>
                    {aberto.o_que_muda}
                  </p>
                </div>
              )}
            </div>

            {carregando && (
              <p style={{ color: F.claro2, fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Loader2 size={15} className="animate-spin" /> abrindo o laboratório
              </p>
            )}

            {/* ---------------------------------- mecanismos visíveis */}
            {/* SEM NUMERAÇÃO E SEM RANKING. A versão anterior numerava de 1 a 4
                e dizia "do mais sustentado para o menos" com os vínculos VAZIOS:
                era ranking sem prova, e com a forma de um perfil de
                predominância. Agora cada mecanismo mostra de quantas cenas ele
                nasceu, e as cenas ficam embaixo dele. Uma cena só aparece
                marcada como anedota, porque é isso que ela é. */}
            <Secao titulo="Mecanismos visíveis" n={mecs.length}
              nota="Uma cena sozinha é anedota. Duas que se encaixam viram mecanismo, e por isso cada um mostra de onde nasceu.">
              {mecs.length === 0 ? <Vazio>Nada cruzado ainda.</Vazio> : mecs.map((m) => {
                const suas = cenas.filter((c) =>
                  ligacoes.some((l) => l.mecanismo_id === m.id && l.cena_id === c.id));
                return (
                  <div key={m.id} style={{ margin: '0 0 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                      <span style={{
                        fontSize: 10.5, fontWeight: 800, letterSpacing: '.14em',
                        textTransform: 'uppercase', whiteSpace: 'nowrap',
                        color: suas.length >= 2 ? F.acc : 'rgba(169,174,188,.7)',
                      }}>
                        {suas.length === 0 ? 'sem lastro'
                          : suas.length === 1 ? '1 cena · anedota'
                          : `${suas.length} cenas`}
                      </span>
                      <p style={{ fontSize: 15.5, lineHeight: 1.4, margin: 0 }}>{m.descricao}</p>
                    </div>
                    {suas.map((c) => (
                      <p key={c.id} style={{
                        fontSize: 13, lineHeight: 1.5, color: F.claro2,
                        margin: '8px 0 0', paddingLeft: 16,
                        borderLeft: `1px solid ${F.linha}`, maxWidth: '64ch',
                      }}>
                        <span style={{ color: F.acc, fontWeight: 700 }}>{dia(c.quando)}</span>
                        {'  '}{c.citacao ?? c.descricao}
                        <span style={{ color: 'rgba(169,174,188,.6)' }}> · {c.quem}</span>
                      </p>
                    ))}
                  </div>
                );
              })}
            </Secao>

            {/* -------------------------------------------- apostas */}
            {/* AS LEITURAS, não as apostas. A palavra mudou junto com a
                doutrina: aposta pede vencedor, leitura convive. O rival
                continua obrigatório, e o trabalho dele deixou de ser competir:
                é impedir que a primeira leitura feche. */}
            <Secao titulo="As leituras em aberto" n={vivas.length}
              nota="Duas leituras podem valer ao mesmo tempo. O rival não é candidato a morrer: ele existe para a primeira não fechar.">
              {vivas.length === 0 ? <Vazio>Nenhuma leitura escrita ainda.</Vazio> : vivas.map((a) => (
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
                    {a.estado === 'convivem'
                      ? 'as duas leituras valem por enquanto · '
                      : ''}
                    escrita em {dia(a.data_aposta)}
                    {a.checada_em ? ` · revista em ${dia(a.checada_em)}` : ''}
                  </p>
                </div>
              ))}
            </Secao>

            {/* ===================== A MESA: PEÇAS SOLTAS E A PRÓXIMA */}
            {aberto.pecas_soltas.length > 0 && (
              <Secao titulo="Peças que ainda não encaixam" n={aberto.pecas_soltas.length}
                nota="Num quebra-cabeça isso não é fracasso, é o estado normal da mesa. Algumas só vão fazer sentido quando outra peça chegar.">
                <ul style={{ margin: 0, padding: 0 }}>
                  {aberto.pecas_soltas.map((p) => (
                    <li key={p} style={{
                      listStyle: 'none', position: 'relative', paddingLeft: 34,
                      margin: '0 0 12px', fontSize: 15, lineHeight: 1.5, color: F.claro2,
                    }}>
                      <span aria-hidden style={{
                        position: 'absolute', left: 0, top: 11, width: 20, height: 1.4,
                        background: 'rgba(169,174,188,.45)',
                      }} />
                      {p}
                    </li>
                  ))}
                </ul>
              </Secao>
            )}

            {aberto.proxima_peca && (
              <div style={{
                borderLeft: `3px solid ${F.acc}`, padding: '4px 0 4px 22px', margin: '0 0 34px',
              }}>
                <p style={{
                  fontSize: 10.5, letterSpacing: '.26em', textTransform: 'uppercase',
                  color: F.acc, fontWeight: 800, margin: '0 0 10px',
                }}>a próxima peça que a gente procura</p>
                <p style={{ fontSize: 16, lineHeight: 1.6, margin: 0, maxWidth: '64ch' }}>
                  {aberto.proxima_peca}
                </p>
              </div>
            )}

            {aberto.proximos_passos.length > 0 && (
              <Secao titulo="Próximos passos" n={aberto.proximos_passos.length}
                nota="Cabem no dia normal da professora. Sondagem que pede atividade nova não é feita.">
                <ol style={{ margin: 0, paddingLeft: 20 }}>
                  {aberto.proximos_passos.map((p) => (
                    <li key={p} style={{ fontSize: 15, lineHeight: 1.5, margin: '0 0 10px' }}>{p}</li>
                  ))}
                </ol>
              </Secao>
            )}

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
                    /* "Escrita e não entregue" é um estado diferente de "sem
                       volta": um espera o Fundador, o outro espera a professora.
                       Confundir os dois faz o painel mentir sobre quem está
                       devendo. */
                    <p style={{ fontSize: 11.5, color: F.claro2, margin: '14px 0 0' }}>
                      {s.entregue_em
                        ? `entregue em ${dia(s.entregue_em)}, ainda sem volta`
                        : `escrita em ${dia(s.enviada_em)}, ainda não entregue`}
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
                      {/* A data em turquesa, igual à folha: é por ela que o olho
                          entra numa lista de cenas. A fonte e o quem ficam em
                          cinza, porque são contexto e não âncora. */}
                      <p style={{
                        fontSize: 10.5, letterSpacing: '.2em', textTransform: 'uppercase',
                        fontWeight: 800, margin: '0 0 8px', color: F.claro2,
                      }}>
                        <span style={{ color: F.acc }}>{dia(c.quando)}</span>
                        {'  ·  '}{c.fonte === 'casa' ? 'casa' : 'escola'} · {c.quem}
                      </p>

                      {/* A AULA. O que a criança fez só é notável CONTRA o que
                          foi pedido: "ele entregou um campeonato" muda de peso
                          quando se sabe que a aula era "O Convite". */}
                      {c.aula && (
                        <p style={{
                          fontSize: 13.5, margin: '0 0 8px', fontWeight: 700,
                          color: F.acc,
                        }}>
                          Aula · {c.aula}
                        </p>
                      )}

                      {/* O CONTEXTO. Sem ele a cena é frase solta, e quem lê não
                          tem como pesar o que está lendo: não sabe qual pergunta
                          a mãe respondia, nem em que fase a professora estava. */}
                      {c.contexto && (
                        <p style={{
                          fontSize: 12, lineHeight: 1.45, margin: '0 0 10px',
                          color: 'rgba(169,174,188,.75)', fontStyle: 'italic',
                        }}>{c.contexto}</p>
                      )}
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
              {/* O número no mesmo tamanho do nome: os dois juntos são o
                  identificador do caso, e um miúdo ao lado do outro fazia o
                  número parecer marcador de lista. */}
              <span style={{
                color: F.acc, fontFamily: F.serif, fontSize: 22, lineHeight: 1.2,
                fontVariantNumeric: 'tabular-nums', minWidth: 34,
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
