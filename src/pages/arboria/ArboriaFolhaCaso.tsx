// A FOLHA DA PROFESSORA · duas páginas, uma por caso
//
// Mesmo desenho do documento que já foi para a professora do Ayrton
// (privado/casos/#1_Ayrton/folha_professora_arena.html), agora gerado a partir
// do caso. Duas páginas com propósitos opostos, e por isso duas peles:
//
//   1. ESCURA. É o Arboria falando. O que foi visto, com data, o que não fecha,
//      e a pergunta. Fundo preto porque é para ler, não para escrever.
//   2. CLARA. É onde a professora ESCREVE. Ninguém escreve a lápis em cima de
//      preto, e uma folha preta inteira gasta o toner da escola.
//
// A REGRA QUE ESTÁ TRAVADA AQUI: a folha NÃO leva a hipótese, nem o rival.
// Hipótese na mão de quem observa contamina o que ela vai ver na semana
// seguinte, e aí a volta dela não vale nada. Vai o que foi visto, a tensão, e a
// pergunta. Quem carrega a aposta é o caso, na tela, e não o papel.
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Printer, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tabela = (nome: string): any => (supabase as any).from(nome);

interface Dados {
  numero: number; titulo: string; pergunta: string | null;
  o_que_muda: string | null; proxima_peca: string | null;
  nome: string; turma: string | null;
  leitura: { quando: string; titulo: string | null; texto: string } | null;
  sondagem: { pedido: string; pergunta: string } | null;
}

const PARECE_DATA = /^(\d|1º|º)|(janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)/i;

const ArboriaFolhaCaso = () => {
  const { numero } = useParams();
  const [d, setD] = useState<Dados | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: cs } = await tabela('casos')
        .select('id, numero, titulo, pergunta, o_que_muda, proxima_peca, aluno_id, quem')
        .eq('numero', Number(numero)).limit(1);
      const c = (cs ?? [])[0];
      if (!c) { setErro('Caso não encontrado.'); return; }

      const [{ data: p }, { data: le }, { data: so }] = await Promise.all([
        c.aluno_id
          ? tabela('profiles').select('full_name, serie, turma').eq('id', c.aluno_id).limit(1)
          : Promise.resolve({ data: [] }),
        tabela('caso_leitura').select('quando, titulo, texto')
          .eq('caso_id', c.id).order('quando', { ascending: false }).limit(1),
        tabela('caso_sondagem').select('pedido, pergunta')
          .eq('caso_id', c.id).order('enviada_em', { ascending: false }).limit(1),
      ]);
      const perfil = (p ?? [])[0];

      setD({
        numero: c.numero, titulo: c.titulo, pergunta: c.pergunta,
        o_que_muda: c.o_que_muda, proxima_peca: c.proxima_peca,
        nome: perfil?.full_name ?? c.quem ?? '',
        turma: perfil ? [perfil.serie, perfil.turma].filter(Boolean).join(' ') : null,
        leitura: (le ?? [])[0] ?? null,
        sondagem: (so ?? [])[0] ?? null,
      });
    })();
  }, [numero]);

  if (erro) return <p style={{ padding: 40 }}>{erro}</p>;
  if (!d) return (
    <p style={{ padding: 40, display: 'flex', gap: 8, alignItems: 'center' }}>
      <Loader2 size={16} className="animate-spin" /> montando a folha
    </p>
  );

  const primeiroNome = d.nome.split(/\s+/)[0];

  // O texto da leitura é a página 1 inteira. Ele já vem na ordem que convence:
  // as cenas com data, o que não combina, e por que não combina.
  const paragrafos = d.leitura ? d.leitura.texto.split(/\n\n+/) : [];

  const pinta = (texto: string) =>
    texto.split(/(\*\*[^*]+\*\*)/g).map((p, k) => {
      if (!(p.startsWith('**') && p.endsWith('**'))) return <span key={k}>{p}</span>;
      const dentro = p.slice(2, -2);
      return PARECE_DATA.test(dentro.trim())
        ? <b key={k} className="dt">{dentro}</b>
        : <b key={k} className="fr">{dentro}</b>;
    });

  return (
    <>
      <style>{`
        @page { size: A4; margin: 0; }
        .folha-raiz { --preto:#08080C; --acc:#5EE0D0;
          --claro:#F3F2F8; --claro2:#A9AEBC;
          --tinta:#14161A; --tinta2:#4A5058; --tinta3:#7B838D; --regua:#C9CFD6;
          --sans:"Segoe UI",system-ui,-apple-system,Roboto,Helvetica,Arial,sans-serif;
          --serif:"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif;
          font-family:var(--sans); font-size:11pt; line-height:1.5;
          -webkit-print-color-adjust:exact; print-color-adjust:exact; }
        .pg { width:210mm; height:297mm; margin:0 auto; padding:16mm 17mm;
          position:relative; overflow:hidden; display:flex; flex-direction:column; }
        .pg + .pg { page-break-before:always; break-before:page; }

        .escura { background:var(--preto); color:var(--claro); }
        .brilho { position:absolute; left:50%; top:-22%; width:150%; height:58%;
          transform:translateX(-50%); pointer-events:none;
          background:radial-gradient(closest-side, rgba(94,224,208,.16), transparent 70%); }
        .marca { position:relative; font-weight:800; letter-spacing:-.045em;
          font-size:30pt; line-height:1; margin:0; }
        .marca span { color:var(--acc); }
        .selo { position:relative; font-size:8pt; letter-spacing:.3em;
          text-transform:uppercase; color:var(--acc); font-weight:800; margin:2mm 0 0; }
        .escura h1 { position:relative; font-family:var(--serif); font-size:24pt;
          line-height:1.06; letter-spacing:-.02em; margin:7mm 0 5mm; font-weight:400; }
        .quem { position:relative; font-size:10pt; color:var(--claro2); margin:0 0 5mm; }
        .escura p.par { position:relative; margin:0 0 3.2mm; font-size:10.6pt; line-height:1.52; }
        .escura .dt { color:var(--acc); font-weight:800; }
        .escura .fr { color:#fff; font-weight:700; }
        .destaque { position:relative; border-left:3px solid var(--acc);
          padding:1mm 0 1mm 6mm; margin:6mm 0 0; }
        .destaque .rot { font-size:8pt; letter-spacing:.24em; text-transform:uppercase;
          color:var(--acc); font-weight:800; margin:0 0 2mm; }
        .destaque p { margin:0; font-family:var(--serif); font-size:14pt; line-height:1.35; }
        .assina { position:relative; margin-top:auto; padding-top:6mm;
          border-top:1px solid rgba(255,255,255,.14); font-size:9.6pt; color:var(--claro2); }
        .assina b { color:var(--acc); }

        .clara { background:#fff; color:var(--tinta); }
        .clara .topo { display:flex; align-items:baseline; gap:4mm;
          padding-bottom:3mm; border-bottom:1.6px solid var(--tinta); }
        .clara .topo .m { font-weight:800; letter-spacing:-.03em; font-size:15pt; }
        .clara .topo .m i { font-style:normal; color:#0E8E80; }
        .clara .topo .q { margin-left:auto; font-size:8.4pt; letter-spacing:.22em;
          text-transform:uppercase; color:var(--tinta3); font-weight:700; }
        .clara h2 { font-family:var(--serif); font-size:16pt; margin:6mm 0 2mm;
          line-height:1.15; font-weight:400; }
        .clara .intro { font-size:10.2pt; color:var(--tinta2); margin:0 0 5mm;
          white-space:pre-line; }
        .bloco { margin:0 0 5mm; break-inside:avoid; }
        .bloco .cab { display:flex; align-items:center; gap:3mm; margin-bottom:2mm; }
        .bloco .n { width:7mm; height:7mm; border-radius:50%; background:var(--tinta);
          color:#fff; display:flex; align-items:center; justify-content:center;
          font-weight:800; font-size:9pt; flex:none; }
        .bloco .t { font-size:11pt; font-weight:700; }
        .bloco .dt2 { margin-left:auto; font-size:8.4pt; color:var(--tinta3); }
        .bloco .dt2 u { display:inline-block; width:24mm;
          border-bottom:1px solid var(--regua); text-decoration:none; }
        .pauta u { display:block; border-bottom:1px solid var(--regua);
          height:8.4mm; text-decoration:none; }
        .chave { border:1.6px solid #0E8E80; border-radius:2.5mm; padding:4mm 4.5mm;
          margin-top:auto; background:rgba(94,224,208,.07); break-inside:avoid; }
        .chave .rot { font-size:8pt; letter-spacing:.22em; text-transform:uppercase;
          color:#0E8E80; font-weight:800; margin:0 0 1.5mm; }
        .chave .frase { font-family:var(--serif); font-size:13pt; line-height:1.3; margin:0; }
        .falta { color:#B4553F; font-size:10pt; }

        .barra { max-width:210mm; margin:0 auto 14px; display:flex; gap:12px;
          align-items:center; }
        @media screen {
          body { background:#E9EAEC; }
          .folha-raiz { padding:20px 8px; }
          .pg { box-shadow:0 14px 50px rgba(0,0,0,.22); border-radius:4px; margin-bottom:20px; }
        }
        @media print { .barra { display:none !important; } }
      `}</style>

      <div className="folha-raiz">
        <div className="barra">
          <Link to="/arboria/casos" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#0E8E80' }}>
            <ArrowLeft size={15} /> voltar aos casos
          </Link>
          <button onClick={() => window.print()}
            style={{
              marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 8,
              fontSize: 13, fontWeight: 700, padding: '9px 18px', borderRadius: 999,
              background: '#08080C', color: '#5EE0D0', border: 0, cursor: 'pointer',
            }}>
            <Printer size={15} /> Imprimir
          </button>
        </div>

        {/* ======================================== PÁGINA 1 · o Arboria fala */}
        <div className="pg escura">
          <div className="brilho" />
          <p className="marca">Arb<span>oria</span></p>
          <p className="selo">Sobre um aluno seu</p>

          <h1>{d.leitura?.titulo ?? d.titulo}</h1>
          <p className="quem">{d.nome}{d.turma ? ` · ${d.turma}` : ''}</p>

          {paragrafos.length === 0 ? (
            <p className="par falta">
              Este caso ainda não tem leitura escrita. A folha só faz sentido depois
              que a leitura existir, porque é ela que dá o argumento.
            </p>
          ) : paragrafos.map((p, i) => (
            <p key={i} className="par">{pinta(p)}</p>
          ))}

          <div className="destaque">
            <p className="rot">O que eu quero descobrir com a sua ajuda</p>
            <p>{d.titulo}</p>
          </div>

          <div className="assina">
            Nada disto é conclusão sobre {primeiroNome}, e nada volta para ele.
            É o que eu consegui juntar até aqui, e eu preciso da sua parte.<br />
            Obrigado por olhar. <b>Arboria</b>
          </div>
        </div>

        {/* ======================================== PÁGINA 2 · ela escreve */}
        <div className="pg clara">
          <div className="topo">
            <span className="m">Arb<i>oria</i></span>
            <span className="q">Para anotar · {primeiroNome}</span>
          </div>

          <h2>O que eu peço</h2>

          {d.sondagem ? (
            <>
              <p className="intro">{d.sondagem.pedido}</p>

              {[1, 2, 3].map((n) => (
                <div className="bloco" key={n}>
                  <div className="cab">
                    <span className="n">{n}</span>
                    <span className="t">O que aconteceu</span>
                    <span className="dt2">dia <u /></span>
                  </div>
                  <div className="pauta"><u /><u /><u /></div>
                </div>
              ))}

              <div className="chave">
                <p className="rot">E no fim, só isto</p>
                <p className="frase">{d.sondagem.pergunta}</p>
              </div>
            </>
          ) : (
            <>
              <p className="intro falta">
                Este caso ainda não tem sondagem escrita.
                {d.proxima_peca ? '\n\nA peça que a gente procura é esta, e ela ainda precisa virar pedido:\n' + d.proxima_peca : ''}
              </p>
              {[1, 2, 3].map((n) => (
                <div className="bloco" key={n}>
                  <div className="cab">
                    <span className="n">{n}</span>
                    <span className="t">O que aconteceu</span>
                    <span className="dt2">dia <u /></span>
                  </div>
                  <div className="pauta"><u /><u /><u /></div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default ArboriaFolhaCaso;
