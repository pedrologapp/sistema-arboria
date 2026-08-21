// A PORTA DA FAMILIA
//
// Unica tela do Arboria sem login. O pai chega pelo QR do aviso da escola, diz
// de quem estamos falando, e entra. Nada aqui pergunta quem ELE e': o vinculo
// que interessa e' com a crianca, e exigir cadastro do adulto perderia metade
// das familias na primeira tela.
//
// SAO DOIS PASSOS, E A ORDEM IMPORTA.
//
// 1. Ele digita o nome e a crianca aparece para escolher. Acertar o nome
//    completo de cabeca, com acento, e' onde o pai desiste; escolher numa lista
//    e' onde ele segue. A busca so' comeca com quatro letras e devolve no
//    maximo oito, e mostra o minimo para reconhecer o filho: nome e turma.
//
// 2. Ele confirma com a data de nascimento. E' AQUI que a porta abre. Achar o
//    nome nao da acesso a nada, nem a serie, nem ao questionario: quem entrega
//    isso e' confirmar_crianca, e ela so' responde com a data certa.
//
// Depois daqui a pagina RECARREGA de verdade, e nao e' desleixo: o questionario
// monta as 114 perguntas com o nome da crianca no instante em que o modulo
// carrega. Entrar por recarga faz ele nascer ja' sabendo de quem se trata, sem
// reescrever o arquivo inteiro, e sem pendurar o id da crianca na URL.
import { useState, useEffect, useRef } from 'react';
import { ChevronLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const CEU = '/arboria/ceu.png';
const T = {
  fundo: '#135E96',
  serif: '"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif',
};
const MINIMO = 4;

interface Achado { aluno_id: string; nome_completo: string; turma: string }
interface Confirmada extends Achado {
  primeiro_nome: string; serie: string; segmento: string;
  sexo: string | null; faixa: string | null;
}

const FamiliaEntrada = () => {
  const [termo, setTermo] = useState('');
  const [achados, setAchados] = useState<Achado[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [procurou, setProcurou] = useState(false);

  const [escolhido, setEscolhido] = useState<Achado | null>(null);
  const [nascimento, setNascimento] = useState('');
  const [entrando, setEntrando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Uma busca por pausa de digitacao, e nao uma por tecla. Sem isto, escrever
  // "Ana Julia" dispara nove consultas e as respostas chegam fora de ordem: a
  // lista de "Ana" chega depois da lista de "Ana Julia" e sobrescreve a certa.
  const pedido = useRef(0);
  useEffect(() => {
    const t = termo.trim();
    if (escolhido) return;
    if (t.length < MINIMO) { setAchados([]); setProcurou(false); return; }

    setBuscando(true);
    const meu = ++pedido.current;
    const timer = setTimeout(async () => {
      const { data, error } = await supabase.rpc('procurar_criancas' as never, { p_termo: t } as never);
      if (meu !== pedido.current) return;   // chegou atrasada, ja tem busca mais nova
      setAchados(error ? [] : ((data ?? []) as unknown as Achado[]));
      setProcurou(true);
      setBuscando(false);
    }, 350);

    return () => clearTimeout(timer);
  }, [termo, escolhido]);

  async function entrar() {
    if (!escolhido || !nascimento || entrando) return;
    setEntrando(true);
    setErro(null);

    const { data, error } = await supabase.rpc('confirmar_crianca' as never, {
      p_aluno_id: escolhido.aluno_id,
      p_nascimento: nascimento,
    } as never);

    const c = ((data ?? []) as unknown as Confirmada[])[0];

    if (error || !c) {
      // A mensagem aponta para a data de proposito: o nome ele acabou de
      // escolher numa lista, entao o que pode estar errado e' a data.
      setErro('Essa data não confere com a que a escola tem. Confira e tente de novo.');
      setEntrando(false);
      return;
    }

    // O envio nasce AQUI, antes da primeira pergunta. E' o que permite gravar
    // resposta por resposta depois, e e' o que faz aparecer no painel da escola
    // quem abriu e parou no meio: sem isso, quem desiste na terceira pergunta
    // some sem deixar rastro e ninguem descobre que a tela quebrou no aparelho
    // dele.
    const { data: envio, error: erroEnvio } = await supabase
      .from('questionario_pais_envio')
      .insert({
        aluno_id: c.aluno_id,
        faixa: c.faixa ?? 'm2',
        serie: c.serie,
        contexto: { turma: c.turma, segmento: c.segmento },
      } as never)
      .select('id')
      .single();

    if (erroEnvio || !envio) {
      setErro('Não consegui abrir agora. Tente de novo daqui a pouco.');
      setEntrando(false);
      return;
    }

    sessionStorage.setItem('arboria:familia', JSON.stringify({
      envio: (envio as { id: string }).id,
      aluno: c.aluno_id,
      faixa: c.faixa,
      nome: c.primeiro_nome,
      nomeCompleto: c.nome_completo,
      turma: c.turma,
      serie: c.serie,
      sexo: c.sexo,
    }));

    // Recarga de verdade, nao navegacao do React: ver o comentario do topo.
    window.location.assign('/familia/perguntas');
  }

  const rotulo: React.CSSProperties = { fontSize: 13, color: 'rgba(255,255,255,.76)' };
  const campo: React.CSSProperties = {
    borderBottom: '1px solid rgba(255,255,255,.5)', padding: '12px 0',
    fontFamily: T.serif, fontSize: 24, color: '#fff', background: 'transparent',
  };

  return (
    <div className="flex flex-col relative" style={{
      minHeight: '100dvh',
      overflowX: 'clip',
      backgroundColor: T.fundo,
      backgroundImage: `linear-gradient(180deg, rgba(6,38,66,.30) 0%, rgba(6,38,66,0) 40%), url("${CEU}")`,
      backgroundSize: 'cover, cover',
      backgroundPosition: 'center top, center',
      color: '#fff',
    }}>
      <div className="absolute pointer-events-none" style={{ left: '-14%', right: '-14%', bottom: '-110px', height: 210, borderRadius: '50%', background: '#3E8F63', opacity: 0.55, zIndex: 0 }} />
      <div className="absolute pointer-events-none" style={{ left: '-14%', right: '-14%', bottom: '-140px', height: 222, borderRadius: '50%', background: '#1F6141', zIndex: 0 }} />

      <div className="relative flex-1 flex flex-col w-full max-w-lg mx-auto px-6 pt-10 pb-8" style={{ zIndex: 2 }}>

        <div className="flex items-center justify-between mb-9" style={{ minHeight: 30 }}>
          {escolhido ? (
            <button
              onClick={() => { setEscolhido(null); setNascimento(''); setErro(null); }}
              className="p-1 -ml-1" style={{ color: 'rgba(255,255,255,.88)' }} aria-label="Voltar"
            ><ChevronLeft size={19} /></button>
          ) : <span />}
          <p style={{ fontWeight: 800, letterSpacing: '-.045em', fontSize: 21, lineHeight: 1, margin: 0 }}>
            Arb<span style={{ color: '#A8E6C1' }}>oria</span>
          </p>
        </div>

        {/* =================================================== 2. A DATA */}
        {escolhido ? (
          <>
            <p style={{ fontFamily: T.serif, fontSize: 30, lineHeight: 1.15, letterSpacing: '-.02em', margin: '0 0 26px' }}>
              Só pra eu ter certeza.
            </p>

            <div style={{ borderLeft: '2px solid rgba(255,255,255,.7)', padding: '4px 0 4px 16px', marginBottom: 34 }}>
              <p style={{ fontFamily: T.serif, fontSize: 27, fontWeight: 700, margin: '0 0 2px' }}>{escolhido.nome_completo}</p>
              <p className="text-[14px] m-0" style={{ color: 'rgba(255,255,255,.78)' }}>{escolhido.turma}</p>
            </div>

            <label style={rotulo}>Data de nascimento</label>
            {/* Campo de data do proprio aparelho: abre o seletor do celular e
                acaba com o dia trocado por mes, que e' de longe o erro que mais
                impede o pai de entrar. */}
            <input
              type="date"
              value={nascimento}
              onChange={(e) => { setNascimento(e.target.value); setErro(null); }}
              max={new Date().toISOString().slice(0, 10)}
              className="w-full outline-none"
              style={{ ...campo, colorScheme: 'dark' }}
            />

            {erro && (
              <p style={{
                marginTop: 24, padding: '14px 16px', borderRadius: 14,
                background: 'rgba(255,255,255,.14)', border: '1px solid rgba(255,255,255,.4)',
                fontFamily: T.serif, fontSize: 19, lineHeight: 1.4,
              }}>{erro}</p>
            )}

            <div className="pt-9 flex justify-end">
              <button
                onClick={() => void entrar()}
                disabled={!nascimento || entrando}
                className="inline-flex items-center gap-2.5 font-bold uppercase"
                style={{
                  fontSize: 15, letterSpacing: '.14em', padding: '14px 26px', borderRadius: 999,
                  background: '#fff', color: '#0E3F66',
                  opacity: nascimento && !entrando ? 1 : 0.4,
                  cursor: nascimento && !entrando ? 'pointer' : 'default',
                }}
              >
                {entrando ? 'Um instante' : 'Começar'}
                {!entrando && <span aria-hidden style={{ fontSize: 17, lineHeight: 1 }}>→</span>}
              </button>
            </div>

            <p className="text-[13px] mt-10" style={{ color: 'rgba(255,255,255,.66)', lineHeight: 1.5 }}>
              Peço a data de nascimento para ter certeza de que é a sua criança,
              e não a de outra família.
            </p>
          </>
        ) : (
          /* ================================================== 1. O NOME */
          <>
            <p style={{ fontFamily: T.serif, fontSize: 34, lineHeight: 1.12, letterSpacing: '-.022em', margin: '0 0 12px' }}>
              Vamos começar.
            </p>
            <p style={{ fontFamily: T.serif, fontSize: 21, lineHeight: 1.5, fontWeight: 600, margin: '0 0 32px', color: 'rgba(255,255,255,.9)' }}>
              Me diz de quem a gente vai falar.
            </p>

            <label style={rotulo}>Nome da criança</label>
            <input
              value={termo}
              onChange={(e) => setTermo(e.target.value)}
              placeholder="comece a escrever o nome"
              autoComplete="off" autoCorrect="off" autoCapitalize="words"
              className="w-full outline-none"
              style={campo}
            />

            <div style={{ marginTop: 26, minHeight: 120 }}>
              {termo.trim().length > 0 && termo.trim().length < MINIMO && (
                <p className="text-[14px]" style={{ color: 'rgba(255,255,255,.7)' }}>
                  Escreva pelo menos {MINIMO} letras.
                </p>
              )}

              {buscando && termo.trim().length >= MINIMO && (
                <p className="text-[14px]" style={{ color: 'rgba(255,255,255,.7)' }}>Procurando...</p>
              )}

              {!buscando && procurou && achados.length === 0 && (
                <p style={{ fontFamily: T.serif, fontSize: 19, lineHeight: 1.45, color: 'rgba(255,255,255,.9)' }}>
                  Não achei ninguém com esse nome. Tente escrever de outro jeito,
                  ou só o primeiro nome.
                </p>
              )}

              {!buscando && achados.map((c) => (
                <button
                  key={c.aluno_id}
                  onClick={() => { setEscolhido(c); setErro(null); }}
                  className="w-full text-left"
                  style={{
                    borderTop: '1px solid rgba(255,255,255,.24)',
                    borderBottom: '1px solid rgba(255,255,255,.24)',
                    marginTop: -1, padding: '15px 0',
                  }}
                >
                  <p style={{ fontFamily: T.serif, fontSize: 22, fontWeight: 700, margin: '0 0 2px' }}>{c.nome_completo}</p>
                  <p className="text-[13px] m-0" style={{ color: 'rgba(255,255,255,.76)' }}>{c.turma}</p>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default FamiliaEntrada;
