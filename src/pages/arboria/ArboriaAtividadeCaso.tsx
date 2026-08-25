import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, Printer } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

// A ATIVIDADE INVESTIGATIVA, gerada por caso.
//
// Mesmo desenho da folha da professora, e de propósito: as duas viram papel e
// andam juntas na mesma pasta. O que muda é para quem cada uma fala.
//
// A folha da professora NÃO leva a hipótese, porque hipótese na mão de quem
// observa contamina o que ela vai ver. Esta leva tudo: quem a segura é o
// Fundador, que é o investigador do caso e não a observadora ingênua.
//
// DUAS PÁGINAS, e a ordem importa:
//   1. CLARA · o que fazer na sala. Ele lê antes de entrar, e a turma pode ver
//      por cima do ombro dele sem que nada seja revelado: não tem nome de
//      criança nem hipótese nenhuma.
//   2. ESCURA · a investigação. Nome da criança, onde olhar, o que anotar e o
//      que cada saída significa. Esta não se deixa sobre a mesa.
// Mesmo atalho das outras telas de caso: os tipos gerados do Supabase estão
// desatualizados e não conhecem caso_atividade.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tabela = (nome: string): any => (supabase as any).from(nome);

interface Dados {
  numero: number;
  nome: string; turma: string | null;
  pergunta_caso: string | null;
  nome_atv: string; duracao: string | null; material: string | null;
  para_a_turma: string;
  o_que_nao_fazer: string[];
  onde_olhar: string;
  o_que_anotar: string[];
  o_que_cada_saida_diz: string;
}

const negrito = (texto: string, classe: string) =>
  texto.split(/(\*\*[^*]+\*\*)/g).map((p, k) =>
    p.startsWith('**') && p.endsWith('**')
      ? <b key={k} className={classe}>{p.slice(2, -2)}</b>
      : <span key={k}>{p}</span>);

const ArboriaAtividadeCaso = () => {
  const { numero } = useParams();
  const [d, setD] = useState<Dados | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: cs } = await tabela('casos')
        .select('id, numero, quem, pergunta, aluno_id, contexto_abertura')
        .eq('numero', Number(numero)).limit(1);
      const c = (cs ?? [])[0];
      if (!c) { setErro('Caso não encontrado.'); return; }

      const [{ data: p }, { data: at }] = await Promise.all([
        c.aluno_id
          ? tabela('profiles').select('full_name').eq('id', c.aluno_id).limit(1)
          : Promise.resolve({ data: [] }),
        tabela('caso_atividade').select('*')
          .eq('caso_id', c.id).order('criada_em', { ascending: false }).limit(1),
      ]);
      const a = (at ?? [])[0];
      if (!a) { setErro('Este caso ainda não tem atividade investigativa.'); return; }

      setD({
        numero: c.numero,
        nome: (p ?? [])[0]?.full_name ?? c.quem ?? '',
        turma: c.contexto_abertura,
        pergunta_caso: c.pergunta,
        nome_atv: a.nome, duracao: a.duracao, material: a.material,
        para_a_turma: a.para_a_turma,
        o_que_nao_fazer: a.o_que_nao_fazer ?? [],
        onde_olhar: a.onde_olhar,
        o_que_anotar: a.o_que_anotar ?? [],
        o_que_cada_saida_diz: a.o_que_cada_saida_diz,
      });
    })();
  }, [numero]);

  if (erro) return <p style={{ padding: 40 }}>{erro}</p>;
  if (!d) return (
    <p style={{ padding: 40, display: 'flex', gap: 8, alignItems: 'center' }}>
      <Loader2 size={16} className="animate-spin" /> montando a atividade
    </p>
  );

  const primeiroNome = d.nome.split(/\s+/)[0];

  return (
    <>
      <style>{`
        @page { size: A4; margin: 0; }
        .atv-raiz { --preto:#08080C; --acc:#5EE0D0;
          --claro:#F3F2F8; --claro2:#A9AEBC;
          --tinta:#14161A; --tinta2:#4A5058; --tinta3:#7B838D; --regua:#C9CFD6;
          --sans:"Segoe UI",system-ui,-apple-system,Roboto,Helvetica,Arial,sans-serif;
          --serif:"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif;
          font-family:var(--sans); font-size:11pt; line-height:1.5;
          -webkit-print-color-adjust:exact; print-color-adjust:exact; }
        .pg { width:210mm; height:297mm; margin:0 auto; padding:15mm 17mm;
          position:relative; overflow:hidden; display:flex; flex-direction:column; }
        .pg + .pg { page-break-before:always; break-before:page; }

        /* ---------------------------------------------- pagina 1, clara */
        .clara { background:#fff; color:var(--tinta); }
        .clara .topo { display:flex; align-items:baseline; gap:4mm;
          padding-bottom:3mm; border-bottom:1.6px solid var(--tinta); }
        .clara .topo .m { font-weight:800; letter-spacing:-.03em; font-size:15pt; }
        .clara .topo .m i { font-style:normal; color:#0E8E80; }
        .clara .topo .q { margin-left:auto; font-size:8.4pt; letter-spacing:.22em;
          text-transform:uppercase; color:var(--tinta3); font-weight:700; }
        .clara h1 { font-family:var(--serif); font-size:26pt; margin:7mm 0 2mm;
          line-height:1.08; font-weight:400; letter-spacing:-.015em; }
        .ficha { display:flex; gap:6mm; font-size:9pt; color:var(--tinta3);
          margin:0 0 6mm; }
        .ficha b { color:var(--tinta2); font-weight:700; }

        .rot { font-size:8pt; letter-spacing:.24em; text-transform:uppercase;
          font-weight:800; color:#0E8E80; margin:0 0 2.5mm; }
        .corpo p { margin:0 0 3.4mm; font-size:10.8pt; line-height:1.55; }
        .corpo blockquote { margin:4mm 0; padding:3mm 0 3mm 6mm;
          border-left:3px solid var(--regua); color:var(--tinta2);
          font-size:10.4pt; line-height:1.5; }
        .corpo .fr { font-weight:700; color:var(--tinta); }
        .material { font-size:9.4pt; color:var(--tinta2); background:#F4F6F7;
          border-radius:2mm; padding:3mm 4mm; margin:0 0 5mm; }

        .nao { margin-top:auto; border:1.6px solid #B4553F; border-radius:2.5mm;
          padding:4mm 4.5mm; background:rgba(180,85,63,.05); break-inside:avoid; }
        .nao .rot { color:#B4553F; }
        .nao ul { margin:0; padding:0; list-style:none; }
        .nao li { font-size:9.8pt; line-height:1.45; padding-left:5mm;
          position:relative; margin-bottom:1.6mm; }
        .nao li:last-child { margin-bottom:0; }
        .nao li:before { content:""; position:absolute; left:0; top:2.1mm;
          width:2.6mm; height:1.4px; background:#B4553F; }

        /* --------------------------------------------- pagina 2, escura */
        .escura { background:var(--preto); color:var(--claro); }
        .brilho { position:absolute; left:50%; top:-22%; width:150%; height:58%;
          transform:translateX(-50%); pointer-events:none;
          background:radial-gradient(closest-side, rgba(94,224,208,.16), transparent 70%); }
        .marca { position:relative; font-weight:800; letter-spacing:-.045em;
          font-size:30pt; line-height:1; margin:0; }
        .marca span { color:var(--acc); }
        .selo { position:relative; font-size:8pt; letter-spacing:.3em;
          text-transform:uppercase; color:var(--acc); font-weight:800; margin:2mm 0 0; }
        .escura h2 { position:relative; font-family:var(--serif); font-size:23pt;
          line-height:1.08; margin:6mm 0 1.5mm; font-weight:400; letter-spacing:-.02em; }
        .quem { position:relative; font-size:9.6pt; color:var(--claro2); margin:0 0 6mm; }
        .escura .bl { position:relative; margin:0 0 5.5mm; }
        .escura .bl .rot { color:var(--acc); }
        .escura .bl p { margin:0; font-size:10.6pt; line-height:1.55; }
        .escura .fr { color:#fff; font-weight:700; }
        .anotar { position:relative; margin:0 0 5.5mm; }
        .anotar ol { margin:0; padding:0; list-style:none; counter-reset:a; }
        .anotar li { counter-increment:a; position:relative; padding-left:9mm;
          margin-bottom:3.4mm; font-size:10.4pt; line-height:1.45; }
        .anotar li:before { content:counter(a); position:absolute; left:0; top:-.3mm;
          width:6mm; height:6mm; border-radius:50%; border:1.4px solid var(--acc);
          color:var(--acc); font-size:8.4pt; font-weight:800;
          display:flex; align-items:center; justify-content:center; }
        .anotar u { display:block; margin-top:2.2mm;
          border-bottom:1px solid rgba(255,255,255,.2); height:7mm; text-decoration:none; }
        .leitura { position:relative; margin-top:auto; border-left:3px solid var(--acc);
          padding:1mm 0 1mm 6mm; break-inside:avoid; }
        .leitura p { margin:0; font-family:var(--serif); font-size:11.6pt; line-height:1.4; }
        .rodape { position:relative; padding-top:5mm; margin-top:5mm;
          border-top:1px solid rgba(255,255,255,.14);
          font-size:8.6pt; color:var(--claro2); }

        .barra { max-width:210mm; margin:0 auto 14px; display:flex; gap:12px;
          align-items:center; }
        @media screen {
          body { background:#E9EAEC; }
          .atv-raiz { padding:20px 8px; }
          .pg { box-shadow:0 14px 50px rgba(0,0,0,.22); border-radius:4px; margin-bottom:20px; }
        }
        @media print { .barra { display:none !important; } }
      `}</style>

      <div className="atv-raiz">
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

        {/* ============================== PÁGINA 1 · o que fazer na sala */}
        {/* Sem nome de criança e sem hipótese: pode ficar aberta sobre a mesa. */}
        <div className="pg clara">
          <div className="topo">
            <span className="m">Arb<i>oria</i></span>
            <span className="q">Atividade investigativa</span>
          </div>

          <h1>{d.nome_atv}</h1>
          <p className="ficha">
            {d.duracao && <span><b>Duração</b> {d.duracao}</span>}
            <span><b>Formato</b> turma inteira, sem demonstração</span>
          </p>

          {d.material && <p className="material"><b>Material.</b> {d.material}</p>}

          <p className="rot">Na sala</p>
          <div className="corpo">
            {d.para_a_turma.split(/\n\n+/).map((p, k) => (
              p.startsWith('>')
                ? <blockquote key={k}>
                    {p.split('\n').map((l, j) => (
                      <div key={j}>{negrito(l.replace(/^>\s?/, ''), 'fr')}</div>
                    ))}
                  </blockquote>
                : <p key={k}>{negrito(p, 'fr')}</p>
            ))}
          </div>

          <div className="nao">
            <p className="rot">O que não fazer</p>
            <ul>
              {d.o_que_nao_fazer.map((x, k) => <li key={k}>{x}</li>)}
            </ul>
          </div>
        </div>

        {/* ============================== PÁGINA 2 · a investigação */}
        {/* Esta tem nome de criança e hipótese. Não fica sobre a mesa. */}
        <div className="pg escura">
          <div className="brilho" />
          <p className="marca">Arb<span>oria</span></p>
          <p className="selo">Caso #{d.numero} · só para você</p>

          <h2>{d.pergunta_caso ?? 'A pergunta do caso'}</h2>
          <p className="quem">{d.nome}{d.turma ? ` - ${d.turma}` : ''}</p>

          <div className="bl">
            <p className="rot">Onde olhar</p>
            <p>{negrito(d.onde_olhar, 'fr')}</p>
          </div>

          <div className="anotar">
            <p className="rot">O que anotar, e nada além disso</p>
            <ol>
              {d.o_que_anotar.map((x, k) => (
                <li key={k}>{x}<u> </u></li>
              ))}
            </ol>
          </div>

          <div className="leitura">
            <p className="rot">O que cada saída diz</p>
            <p>{negrito(d.o_que_cada_saida_diz, 'fr')}</p>
          </div>

          <p className="rodape">
            A turma inteira faz a mesma coisa, e ninguém sabe que a atividade foi
            pensada para {primeiroNome}. Não ajude, não demonstre, não intervenha
            quando ele ou ela travar: a dificuldade é o momento em que o mecanismo
            aparece. O que você anotar aqui entra no acervo do caso.
          </p>
        </div>
      </div>
    </>
  );
};

export default ArboriaAtividadeCaso;
