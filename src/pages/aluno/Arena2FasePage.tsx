// ============================================================
// Arena2FasePage (/arena/2fase) — a segunda fase da Arena Arboria.
//
// PROTOTIPO PARA TESTE NO LOCALHOST. Recebe de verdade: os arquivos sobem para
// o bucket privado 'arena-2fase' e o texto vai para a entrega. Ainda nao esta'
// ligado ao fluxo de missao do app, e por isso mora numa rota propria.
//
// COMO OS ARQUIVOS SAO RECEBIDOS (guia em privado/arena/README.md):
//  - bucket PRIVADO; nada de midia de crianca em bucket publico.
//  - upload DIRETO do navegador para o Storage. Nunca por Edge Function: base64
//    infla o arquivo em 33% e derruba a funcao sem mensagem util.
//  - imagem comprimida ANTES de subir, no navegador.
//  - o caminho nao carrega nome de crianca: {aluno_id}/{slot}/{arquivo}.
//
// TRES PASSOS: o pop-up que avisa, a tela do que reunir, e o formulario.
// ============================================================
import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Loader2, Check, X, Image as IconeImagem, Video, ArrowLeft } from 'lucide-react';
import { comprimirImagem, emMB, contarPalavras } from '@/lib/comprimirMidia';
import { subirComProgresso, type FalhaUpload } from '@/lib/subirArquivo';

const BUCKET = 'arena-2fase';
// A missao da 2a fase, criada em 18/08 e enderecada por missao_destinatarios
// aos integrantes dos projetos selecionados. E' ela que da' o missao_id da
// entrega, sem o qual o banco recusa a gravacao.
const MISSAO_2FASE = 'ddaf54d2-7781-4ab6-b3e7-2a54749329a5';
const MINIMO_PALAVRAS = 150;
const MAX_PORTFOLIO = 5;
const TIPO_POR_EXT: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
  heic: 'image/heic', heif: 'image/heif',
  mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm',
  mkv: 'video/x-matroska', '3gp': 'video/3gpp',
};
const MIN_PORTFOLIO = 3;
// Teto unico, para foto e para video. O teto REAL do upload nao e' so' o do
// bucket: o projeto inteiro tem um limite global de Storage, e vale o MENOR
// dos dois. Barrar aqui, antes de subir, e' a diferenca entre avisar em 1
// segundo e falhar depois de 8 minutos no 4G.
// A duracao do video nao trava nada: 2 minutos e' orientacao no texto, nao
// regra. Quem gravou 2min10 nao pode ser barrado por causa de 10 segundos.
const MAX_ARQUIVO_MB = 300;

const T = {
  arena: '#08080C', acc: '#5EE0D0', app: '#070C16', painel: '#101B30', borda: '#1E2E4A',
  texto: '#E8EFF7', texto2: '#93A8C2', texto3: '#5E7391', casa: '#5AC8FA', verde: '#3DD68C',
  serif: '"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif',
};

type Slot = 'capa' | 'portfolio' | 'video';
interface Arquivo {
  slot: Slot; caminho: string; nome: string; bytes: number; previa?: string;
  // Ja' esta' amarrado a uma entrega no banco. Um arquivo pode existir no bucket
  // e ainda nao ter sido enviado: sobe primeiro, e so' vira entrega no Enviar.
  salvo?: boolean;
  linhaId?: string;
}

const Arena2FasePage = () => {
  const { user } = useAuth();
  const navegar = useNavigate();
  const local = useLocation();
  // A passagem (pop-up e boas-vindas) e o envio sao duas paradas diferentes.
  // Em /aluno/arena/2fase o aluno recebe a noticia e entende o que precisa
  // reunir; o "Comecar" leva ele para as missoes, que e' onde o envio mora de
  // fato. Assim a 2a fase nao vira um caminho paralelo ao resto do app.
  const soEnvio = local.pathname.endsWith('/enviar');
  const [passo, setPasso] = useState<1 | 2 | 3>(soEnvio ? 3 : 1);
  const [arquivos, setArquivos] = useState<Arquivo[]>([]);
  const [descricao, setDescricao] = useState('');
  const [subindo, setSubindo] = useState<Slot | null>(null);
  const [progresso, setProgresso] = useState('');
  // -1 = trabalhando sem quanto medir (compressao, espera do servidor).
  // 0 a 100 = a barra de verdade, alimentada pelo progresso do upload.
  const [pct, setPct] = useState(-1);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  // O envio deixa de ser porta de saida. O aluno manda, ve o que ja' foi, e
  // pode voltar depois para acrescentar ate' o prazo. Guardar o id da entrega
  // e' o que permite ACRESCENTAR em vez de duplicar.
  const [entregaId, setEntregaId] = useState<string | null>(null);
  const [enviadoEm, setEnviadoEm] = useState<string | null>(null);
  const [descricaoSalva, setDescricaoSalva] = useState('');
  const [carregando, setCarregando] = useState(true);
  // O erro fica NA TELA, e nao so' num toast. No celular o toast some antes de a
  // crianca ler, e ai ela conclui que "nao foi" sem saber por que, e fica
  // repetindo o mesmo envio. Foi o que aconteceu em 19/08: duas alunas subiram a
  // capa varias vezes e nenhuma conseguiu uma foto de portfolio.
  const [erro, setErro] = useState<string | null>(null);

  const refCapa = useRef<HTMLInputElement>(null);
  const refPort = useRef<HTMLInputElement>(null);
  const refVideo = useRef<HTMLInputElement>(null);

  useEffect(() => { window.scrollTo(0, 0); }, [passo]);

  // Ao abrir, busca o que este aluno ja' mandou. Sem isto, quem volta no dia
  // seguinte ve a tela em branco e conclui que perdeu tudo.
  useEffect(() => {
    if (!user) return;
    let vivo = true;
    (async () => {
      try {
        const { data: ent } = await supabase
          .from('entregas')
          .select('id, texto_resposta, created_at')
          .eq('missao_id', MISSAO_2FASE)
          .eq('aluno_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!vivo || !ent) return;

        const e = ent as { id: string; texto_resposta: string | null; created_at: string };
        setEntregaId(e.id);
        setEnviadoEm(e.created_at);
        setEnviado(true);
        setDescricao(e.texto_resposta ?? '');
        setDescricaoSalva(e.texto_resposta ?? '');

        const { data: arqs } = await supabase
          .from('entrega_arquivos')
          .select('id, nome_original, nome_storage, tipo_arquivo, tamanho_bytes')
          .eq('entrega_id', e.id);
        if (!vivo || !arqs) return;

        setArquivos((arqs as Array<Record<string, unknown>>).map((r) => ({
          slot: String(r.tipo_arquivo) as Slot,
          caminho: String(r.nome_storage),
          nome: String(r.nome_original),
          bytes: Number(r.tamanho_bytes ?? 0),
          salvo: true,
          linhaId: String(r.id),
        })));
      } catch {
        /* nao achar entrega anterior nao pode impedir um envio novo */
      } finally {
        if (vivo) setCarregando(false);
      }
    })();
    return () => { vivo = false; };
  }, [user]);

  // As duas rotas usam o MESMO componente, entao o React Router nao remonta na
  // troca: o endereco mudava para /enviar e a tela continuava na de boas-vindas,
  // porque o passo inicial so' e' calculado uma vez. Sem isto, o "Comecar" nao
  // levava a lugar nenhum.
  useEffect(() => {
    if (soEnvio && passo !== 3) setPasso(3);
    if (!soEnvio && passo === 3) setPasso(2);
  }, [soEnvio]);   // eslint-disable-line react-hooks/exhaustive-deps

  const capa = arquivos.find((a) => a.slot === 'capa');
  const portfolio = arquivos.filter((a) => a.slot === 'portfolio');
  const video = arquivos.find((a) => a.slot === 'video');
  const palavras = contarPalavras(descricao);

  const podeEnviar =
    !!capa && portfolio.length >= MIN_PORTFOLIO && !!video && palavras >= MINIMO_PALAVRAS;

  // O que ainda nao foi para o banco: arquivo novo no bucket, ou texto mexido.
  const novidade =
    arquivos.some((a) => !a.salvo) || descricao.trim() !== descricaoSalva.trim();

  // ---------------------------------------------------------------- upload
  async function subir(lista: FileList | null, slot: Slot) {
    if (!lista?.length || !user) return;

    // A FileList e' viva: ela morre quando o input e' limpo, e em alguns
    // navegadores de celular os File dentro dela deixam de poder ser lidos.
    // Copiar para um array ANTES de qualquer await e' o que garante que os
    // arquivos sobrevivam ao envio.
    const arquivosEscolhidos = Array.from(lista);

    setSubindo(slot);
    setErro(null);

    // Contador local. Ler portfolio.length dentro do laco pegava o valor do
    // render anterior e nao enxergava o que acabou de subir, entao o limite
    // nunca era respeitado de verdade num envio de varias fotos.
    let jaTem = arquivos.filter((a) => a.slot === 'portfolio').length;
    const falhas: string[] = [];
    let subiu = 0;

    for (const bruto of arquivosEscolhidos) {
      if (slot === 'portfolio' && jaTem >= MAX_PORTFOLIO) {
        falhas.push(`${bruto.name}: o limite e' ${MAX_PORTFOLIO} fotos`);
        continue;
      }

      // Cada arquivo tem o proprio try. Antes, uma foto ruim no meio de cinco
      // derrubava o lote inteiro e as que ja' tinham subido nao apareciam.
      try {
        if (bruto.size === 0) {
          throw new Error('o arquivo chegou vazio. Tente escolher de novo, direto da galeria.');
        }
        if (bruto.size > MAX_ARQUIVO_MB * 1024 * 1024) {
          throw new Error(`tem ${emMB(bruto.size)} e o limite e' ${MAX_ARQUIVO_MB} MB.`);
        }

        setPct(-1);
        setProgresso(slot === 'video' ? 'preparando o vídeo' : 'preparando a imagem');
        const { arquivo, bytesAntes, bytesDepois } = await comprimirImagem(bruto);

        setPct(0);
        setProgresso(`0 de ${emMB(bytesDepois)}`);
        const ext = (arquivo.name.split('.').pop() || 'bin').toLowerCase();
        // Armadilha 2 do guia: alguns navegadores mandam type vazio, e ai a
        // allowlist do bucket reprova sem dizer por que. Deduz da extensao.
        const tipo = arquivo.type || TIPO_POR_EXT[ext] || 'application/octet-stream';
        const caminho = `${user.id}/${slot}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

        await subirComProgresso(BUCKET, caminho, arquivo, tipo, (feito, enviados) => {
          setPct(feito);
          setProgresso(feito >= 100 ? 'guardando' : `${emMB(enviados)} de ${emMB(bytesDepois)}`);
        });

        const previa = arquivo.type.startsWith('image/') ? URL.createObjectURL(arquivo) : undefined;
        setArquivos((a) => [
          ...a.filter((x) => (slot === 'portfolio' ? true : x.slot !== slot)),
          { slot, caminho, nome: bruto.name, bytes: bytesDepois, previa },
        ]);
        if (slot === 'portfolio') jaTem += 1;
        subiu += 1;
        void bytesAntes;
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'não deu';
        console.error('[arena 2fase] falhou', bruto.name, bruto.type, bruto.size, e);
        falhas.push(`${bruto.name}: ${/exceeded|too large|413|payload|maximum allowed size/i.test(msg)
          ? `o servidor recusou o tamanho (limite ${MAX_ARQUIVO_MB} MB)`
          : msg}`);
      }
    }

    setSubindo(null);
    setProgresso('');
    setPct(-1);

    if (falhas.length) {
      setErro(
        (subiu > 0 ? `${subiu} de ${arquivosEscolhidos.length} foram. ` : '') +
        (falhas.length === 1 ? falhas[0] : falhas.join('  |  '))
      );
    } else if (subiu > 0) {
      toast({ title: subiu === 1 ? 'Enviado' : `${subiu} enviados` });
    }
  }

  async function remover(a: Arquivo) {
    // Se ja' estava numa entrega, sai dos dois lugares. Apagar so' do bucket
    // deixaria a professora com uma linha apontando para arquivo que sumiu.
    if (a.linhaId) {
      await supabase.from('entrega_arquivos').delete().eq('id', a.linhaId);
    }
    await supabase.storage.from(BUCKET).remove([a.caminho]);
    setArquivos((lista) => lista.filter((x) => x.caminho !== a.caminho));
  }

  async function enviar() {
    if (!user || enviando) return;
    if (!entregaId && !podeEnviar) return;
    setEnviando(true);
    setErro(null);
    try {
      let id = entregaId;

      // 1. A entrega. Uma so' por aluno nesta missao: se ja' existe, atualiza o
      //    texto em vez de criar outra. E' isso que deixa o aluno voltar depois
      //    para acrescentar sem duplicar o trabalho do grupo.
      if (!id) {
        const { data: nova, error: erroEntrega } = await supabase
          .from('entregas')
          .insert({
            missao_id: MISSAO_2FASE,
            aluno_id: user.id,
            texto_resposta: descricao.trim(),
            status: 'pendente',
            entregue_no_prazo: true,
            numero_tentativa: 1,
          } as never)
          .select('id, created_at')
          .single();
        if (erroEntrega) throw erroEntrega;
        const e = nova as { id: string; created_at: string };
        id = e.id;
        setEntregaId(e.id);
        setEnviadoEm(e.created_at);
      } else if (descricao.trim() !== descricaoSalva.trim()) {
        const { error: erroTexto } = await supabase
          .from('entregas')
          .update({ texto_resposta: descricao.trim() } as never)
          .eq('id', id);
        if (erroTexto) throw erroTexto;
      }

      // 2. So' os arquivos que ainda nao foram. Reenviar os que ja' estao la'
      //    criaria linha repetida e a professora veria a mesma foto duas vezes.
      const novos = arquivos.filter((a) => !a.salvo);
      if (id && novos.length > 0) {
        const { data: gravados, error: erroArquivos } = await supabase
          .from('entrega_arquivos')
          .insert(novos.map((a) => ({
            entrega_id: id,
            nome_original: a.nome,
            nome_storage: a.caminho,
            tipo_arquivo: a.slot,
            tamanho_bytes: a.bytes,
            url: `${BUCKET}/${a.caminho}`,
          })) as never)
          .select('id, nome_storage');
        if (erroArquivos) throw erroArquivos;

        const porCaminho = new Map(
          ((gravados ?? []) as Array<Record<string, unknown>>)
            .map((r) => [String(r.nome_storage), String(r.id)]),
        );
        setArquivos((lista) => lista.map((a) =>
          a.salvo ? a : { ...a, salvo: true, linhaId: porCaminho.get(a.caminho) }));
      }

      setDescricaoSalva(descricao.trim());
      setEnviado(true);
      toast({ title: enviado ? 'Atualizado' : 'Recebido!' });
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      console.error('[arena 2fase] envio falhou', e);
      setErro(
        /duplicate|unique/i.test(msg)
          ? 'Parece que alguém do grupo já enviou. Recarregue a página para ver o que já foi.'
          : 'O material está salvo. Toque em Enviar de novo daqui a pouco.',
      );
    } finally {
      setEnviando(false);
    }
  }

  // ================================================================= telas
  const fundo: React.CSSProperties = {
    minHeight: '100vh', background: T.app, color: T.texto,
    backgroundImage: `radial-gradient(700px 300px at 50% -6%, ${T.casa}22, transparent 70%),
      linear-gradient(180deg,#0A1424 0%, #070C16 46%, #05080F 100%)`,
  };

  // ---------------------------------------------------------- 1. o pop-up
  if (passo === 1) {
    return (
      <div style={fundo} className="flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center relative rounded-3xl px-6 pt-9 pb-6"
          style={{ background: T.arena, border: `1px solid ${T.acc}44`, boxShadow: `0 30px 70px rgba(0,0,0,.7), 0 0 90px ${T.acc}1A` }}>
          <div className="absolute pointer-events-none" style={{
            left: '50%', top: '-30%', width: '170%', height: '70%', transform: 'translateX(-50%)',
            background: `radial-gradient(closest-side, ${T.acc}38, transparent 72%)`,
          }} />
          <h2 className="relative m-0 font-extrabold" style={{ fontSize: 54, lineHeight: .76, letterSpacing: '-.055em' }}>
            <span className="block">Arena</span>
            <span className="block" style={{ color: T.acc }}>Arboria</span>
          </h2>
          <p className="relative font-bold mt-7 mb-0" style={{ fontSize: 19, letterSpacing: '-.01em' }}>
            Você passou<br /><span style={{ color: T.acc }}>para a 2ª fase</span>
          </p>
          <p className="relative mt-2 mb-0" style={{ fontSize: 13, color: '#6B6A7E', lineHeight: 1.5 }}>
            O seu projeto foi um dos escolhidos entre os 53 da Arena.
          </p>
          <button onClick={() => setPasso(2)} className="relative w-full mt-6 rounded-2xl font-extrabold uppercase"
            style={{ padding: 15, background: T.acc, color: '#04211E', fontSize: 14, letterSpacing: '.08em' }}>
            Prosseguir
          </button>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------ 2. o que reunir
  if (passo === 2) {
    return (
      <div style={fundo} className="px-5 pb-10">
        <div className="max-w-md mx-auto">
          <p className="pt-4 text-[11px] font-bold uppercase tracking-widest" style={{ color: T.texto3 }}>Arena Arboria</p>
          <h1 className="mt-4 mb-0" style={{ fontFamily: T.serif, fontSize: 29, lineHeight: 1.08, letterSpacing: '-.02em' }}>
            Seja bem-vindo<br /><span style={{ color: T.acc }}>à 2ª fase</span>
          </h1>
          <p className="mt-4" style={{ fontSize: 14.5, lineHeight: 1.55, color: T.texto2 }}>
            Para continuar, você precisa <b style={{ color: T.texto }}>enviar algumas informações sobre o seu projeto</b>.
            Quem vai ver isso não estava na sala: não viu vocês apresentarem e não conhece o projeto.
            Tudo o que essa pessoa vai saber é o que estiver aqui.
          </p>

          {[
            ['1', 'Uma foto que mostre o que é', 'A principal, a que aparece primeiro. Do produto, do protótipo, da maquete ou da tela. Não vale foto do slide.'],
            ['2', 'Fotos do portfólio', 'De 3 a 5, mostrando o projeto por dentro: as partes, o processo, o que vocês construíram.'],
            ['3', 'Um vídeo demonstrando na prática', 'Até 2 minutos, com o projeto funcionando. Ninguém aparece no vídeo: é o projeto que está sendo filmado.'],
            ['4', 'A descrição do projeto', 'No mínimo 150 palavras, contando o que resolve, como funciona por dentro, onde pode quebrar, e o que cada um fez.'],
          ].map(([n, t, d]) => (
            <div key={n} className="flex gap-3 items-start rounded-2xl px-3.5 py-3 mt-2"
              style={{ background: T.painel, border: `1px solid ${T.borda}` }}>
              <span className="flex-none w-7 h-7 rounded-xl flex items-center justify-center font-extrabold"
                style={{ background: `${T.acc}1F`, border: `1px solid ${T.acc}4D`, color: T.acc, fontSize: 13 }}>{n}</span>
              <span>
                <b className="block" style={{ fontSize: 14 }}>{t}</b>
                <span className="block" style={{ fontSize: 12, color: T.texto2, lineHeight: 1.4 }}>{d}</span>
              </span>
            </div>
          ))}

          <div className="flex items-center justify-between rounded-2xl px-3.5 py-3 mt-4"
            style={{ background: `${T.acc}14`, border: `1px solid ${T.acc}52` }}>
            <span className="text-[10px] font-extrabold uppercase tracking-widest" style={{ color: T.acc }}>Você tem até</span>
            <span style={{ fontFamily: T.serif, fontSize: 17, fontWeight: 700 }}>domingo, 23/08</span>
          </div>

          <p className="mt-3.5" style={{ fontSize: 11.5, color: T.texto3, lineHeight: 1.5 }}>
            Só um do grupo precisa enviar. E tudo o que vocês mandarem é <b style={{ color: T.texto2 }}>do projeto</b>,
            não de vocês: sem rosto na foto e sem ninguém no vídeo, porque isso vai para fora da escola.
          </p>

          <button onClick={() => navegar('/aluno/arena/2fase/enviar')} className="w-full mt-5 rounded-2xl font-extrabold uppercase"
            style={{ padding: 15, background: T.casa, color: '#04121C', fontSize: 14, letterSpacing: '.06em' }}>
            Começar
          </button>
        </div>
      </div>
    );
  }

  // A tela de "Recebido!" que fechava o fluxo saiu de proposito. O envio nao e'
  // porta de saida: enquanto o prazo estiver aberto, o aluno volta, ve o que ja'
  // mandou e acrescenta. O que era aquela tela virou a faixa verde do topo.

  // A etiqueta diz se AQUELE campo ja' foi enviado. Sem isso, depois do primeiro
  // envio a tela fica igual e o aluno nao sabe o que ja' esta' com o Arboria e o
  // que ele acabou de acrescentar.
  const Enviado = ({ slot }: { slot: Slot }) =>
    arquivos.some((a) => a.slot === slot && a.salvo) ? (
      <span className="inline-flex items-center gap-1" style={{ fontSize: 9.5, fontWeight: 800,
        letterSpacing: '.12em', textTransform: 'uppercase', color: T.verde }}>
        <Check size={11} strokeWidth={3} /> enviado
      </span>
    ) : null;

  const Rotulo = ({ n, texto, extra }: { n: string; texto: string; extra?: string }) => (
    <p className="flex justify-between items-baseline gap-2 mb-1.5" style={{ fontSize: 12.5, fontWeight: 700 }}>
      <span>{n} · {texto}</span>
      {extra && <span style={{ fontSize: 10, color: T.texto3, fontWeight: 600 }}>{extra}</span>}
    </p>
  );
  const Instrucao = ({ children }: { children: React.ReactNode }) => (
    <p className="mb-2" style={{ fontSize: 11.5, color: T.texto2, lineHeight: 1.45 }}>{children}</p>
  );
  const Veto = ({ children }: { children: React.ReactNode }) => (
    <p className="flex gap-1.5 items-start rounded-lg px-2.5 py-2 mt-2 mb-0"
      style={{ fontSize: 11, color: '#F0A9A9', background: 'rgba(240,120,120,.09)', border: '1px solid rgba(240,120,120,.22)', lineHeight: 1.4 }}>
      <X size={13} className="flex-none mt-0.5" /> <span>{children}</span>
    </p>
  );
  // O slot precisa entrar aqui: com um unico estado 'subindo' e sem saber de
  // quem ele e', as tres caixas mostravam "enviando" ao mesmo tempo e parecia
  // que o video estava subindo tambem nos campos de foto.
  const Caixa = ({ onClick, icone, label, slot }: { onClick: () => void; icone: React.ReactNode; label: string; slot: Slot }) => {
    const ativo = subindo === slot;
    // Duas leituras diferentes da mesma espera: quando da' para medir, a barra
    // enche de 0 a 100; quando nao da' (compressao), ela varre de um lado ao
    // outro. Barra parada em 0% seria lida como travamento.
    const medindo = ativo && pct >= 0;
    return (
      <button onClick={onClick} disabled={!!subindo} className="w-full rounded-2xl py-4 px-3 mt-2 text-center"
        style={{ border: `1.5px ${ativo ? 'solid' : 'dashed'} ${ativo ? T.casa : '#2E4468'}`, background: ativo ? 'rgba(90,200,250,.06)' : 'rgba(255,255,255,.02)', opacity: subindo && !ativo ? .4 : 1 }}>
        {ativo ? (
          <span className="block px-1">
            <span className="flex items-baseline justify-between mb-1.5">
              <span style={{ fontSize: 12, color: T.texto2 }}>{progresso || 'enviando'}</span>
              <span style={{ fontSize: 15, fontWeight: 800, color: T.casa, fontVariantNumeric: 'tabular-nums' }}>
                {medindo ? `${pct}%` : ''}
              </span>
            </span>
            <span className="block w-full rounded-full overflow-hidden" style={{ height: 7, background: 'rgba(255,255,255,.09)' }}>
              <span className="block h-full rounded-full"
                style={medindo
                  ? { width: `${pct}%`, background: `linear-gradient(90deg, ${T.casa}, ${T.acc})`, transition: 'width .25s linear' }
                  : { width: '38%', background: `linear-gradient(90deg, ${T.casa}, ${T.acc})`, animation: 'arenaVarre 1.1s ease-in-out infinite' }} />
            </span>
          </span>
        ) : (
          <>
            <span className="block" style={{ color: T.casa }}>{icone}</span>
            <span className="block mt-1.5" style={{ fontSize: 12, color: T.texto3 }}>{label}</span>
          </>
        )}
      </button>
    );
  };
  const Miniatura = ({ a }: { a: Arquivo }) => (
    <span className="relative block w-14 h-14 rounded-xl overflow-hidden flex-none"
      style={{ border: `1px solid ${T.verde}`, background: '#16233A' }}>
      {/* HEIC de iPhone tem type de imagem e o navegador nao desenha. Sem o
          onError a miniatura ficava um quadrado vazio, e a crianca lia isso
          como "nao subiu" mesmo com o arquivo ja' no servidor. */}
      {a.previa
        ? <img src={a.previa} alt="" className="w-full h-full object-cover"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
        : null}
      {!a.previa && <span className="w-full h-full flex items-center justify-center"><Video size={18} color={T.casa} /></span>}
      <span className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: -1 }}>
        <Check size={16} color={T.verde} />
      </span>
      <button onClick={() => remover(a)} className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full flex items-center justify-center"
        style={{ background: 'rgba(5,10,18,.85)' }}><X size={11} color="#fff" /></button>
    </span>
  );

  return (
    <div style={fundo} className="px-5 pb-12">
      <style>{`
        @keyframes arenaVarre {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes arenaVarre { 0%, 100% { transform: none; } }
        }
      `}</style>
      <div className="max-w-md mx-auto">
        <button onClick={() => navegar('/aluno')} className="flex items-center gap-1.5 pt-4 text-[11px] font-bold uppercase tracking-widest"
          style={{ color: T.texto3 }}><ArrowLeft size={13} /> 2ª fase · Arena</button>

        <h1 className="mt-4 mb-0" style={{ fontFamily: T.serif, fontSize: 24, lineHeight: 1.1, letterSpacing: '-.02em' }}>
          Vamos lá
        </h1>

        {enviado && (
          <div className="rounded-xl px-3.5 py-3 mt-3" style={{
            border: `1px solid ${T.verde}55`, background: `${T.verde}12`,
          }}>
            <p className="m-0 flex items-start gap-2" style={{ fontSize: 12.5, color: T.texto, lineHeight: 1.45 }}>
              <Check size={15} color={T.verde} className="flex-none mt-0.5" strokeWidth={3} />
              <span>
                <b>Recebido</b>{enviadoEm ? `, ${new Date(enviadoEm).toLocaleDateString('pt-BR')}` : ''}.
                <span style={{ color: T.texto2 }}> Está com o Arboria. Se quiser acrescentar mais alguma coisa, é só continuar aqui embaixo.</span>
              </span>
            </p>
          </div>
        )}

        {erro && (
          <div className="rounded-xl px-3.5 py-3 mt-3" style={{
            border: '1px solid rgba(240,120,120,.45)', background: 'rgba(240,120,120,.10)',
          }}>
            <p className="m-0 flex items-start gap-2" style={{ fontSize: 12.5, color: '#F3B4B4', lineHeight: 1.4 }}>
              <X size={14} className="flex-none mt-0.5" />
              <span><b style={{ color: '#fff' }}>Não deu para enviar.</b> {erro}</span>
            </p>
            <button onClick={() => setErro(null)} className="mt-2 text-[11px] font-bold uppercase tracking-widest"
              style={{ color: T.texto3 }}>Fechar</button>
          </div>
        )}
        <p className="mt-2" style={{ fontSize: 13.5, color: T.texto2, lineHeight: 1.5 }}>
          Para fazer parte da Arena, você precisa preencher o que vem a seguir.
          Pode enviar na ordem que quiser: o que já subiu fica salvo.
        </p>

        {/* 1. capa */}
        <div className="mt-6">
          <Rotulo n="1" texto="Foto principal" extra="obrigatória" /> <Enviado slot="capa" />
          <Instrucao>
            É <b style={{ color: T.texto }}>a foto que as pessoas vão ver na hora de votar</b>. Capriche: pode ser uma
            foto do produto, do protótipo ou da maquete, e pode ser uma imagem criada por inteligência artificial
            para representar o projeto. Escolham a que faz alguém querer saber mais.
          </Instrucao>
          {capa
            ? <div className="flex gap-2 mt-2"><Miniatura a={capa} /></div>
            : <Caixa onClick={() => refCapa.current?.click()} icone={<IconeImagem size={20} />} label="Toque para escolher a foto" slot="capa" />}
          <input ref={refCapa} type="file" accept="image/*" className="hidden"
            onChange={(e) => { subir(e.target.files, 'capa'); e.target.value = ''; }} />
        </div>

        {/* 2. portfolio */}
        <div className="mt-6">
          <Rotulo n="2" texto="Fotos do portfólio" extra={`${portfolio.length} de ${MIN_PORTFOLIO} a ${MAX_PORTFOLIO}`} /> <Enviado slot="portfolio" />
          <Instrucao>
            São fotos <b style={{ color: T.texto }}>extras</b>, que entram depois da principal. Mostrem outros ângulos,
            os detalhes, as partes separadas, o processo de montagem. É aqui que aparece o que vocês fizeram de verdade.
          </Instrucao>
          <div className="flex gap-2 flex-wrap mt-2">
            {portfolio.map((a) => <Miniatura key={a.caminho} a={a} />)}
          </div>
          {portfolio.length < MAX_PORTFOLIO &&
            <Caixa onClick={() => refPort.current?.click()} icone={<IconeImagem size={20} />} label="Adicionar fotos" slot="portfolio" />}
          <input ref={refPort} type="file" accept="image/*" multiple className="hidden"
            onChange={(e) => { subir(e.target.files, 'portfolio'); e.target.value = ''; }} />
        </div>

        {/* 3. video */}
        <div className="mt-6">
          <Rotulo n="3" texto="Vídeo" extra="até 2 minutos" /> <Enviado slot="video" />
          <Instrucao>
            Um vídeo <b style={{ color: T.texto }}>do projeto funcionando</b>. Grave a coisa acontecendo: o jogo sendo
            jogado, o aplicativo rodando, o circuito ligando. <b style={{ color: T.texto }}>No máximo 2 minutos.</b> Pode ser
            no celular, e pode ter a voz de vocês explicando por cima.
          </Instrucao>
          <Veto>Ninguém pode aparecer no vídeo. É o projeto que está sendo filmado, não o grupo.</Veto>
          {video
            ? <div className="flex gap-2 mt-2 items-center">
                <Miniatura a={video} />
                <span style={{ fontSize: 12, color: T.texto2 }}>{video.nome}<br /><span style={{ color: T.texto3 }}>{emMB(video.bytes)}</span></span>
              </div>
            : <Caixa onClick={() => refVideo.current?.click()} icone={<Video size={20} />} label="Gravar ou escolher do celular" slot="video" />}
          {/* SEM capture. Com capture="environment" o celular abre a camera
              direto e ESCONDE a galeria, entao quem ja' tinha gravado o video
              nao tinha como escolher o arquivo. Relatado por uma aluna do 9o
              ano em 20/08. */}
          <input ref={refVideo} type="file" accept="video/*" className="hidden"
            onChange={(e) => { subir(e.target.files, 'video'); e.target.value = ''; }} />
        </div>

        {/* 4. descricao */}
        <div className="mt-6">
          <Rotulo n="4" texto="Descrição do projeto" extra={`mínimo ${MINIMO_PALAVRAS} palavras`} />
          <Instrucao>
            Conte o projeto para quem nunca viu. Escreva sobre: <b style={{ color: T.texto }}>o que ele resolve</b>,{' '}
            <b style={{ color: T.texto }}>como funciona por dentro</b>, <b style={{ color: T.texto }}>onde ele pode quebrar</b>,
            e <b style={{ color: T.texto }}>o que cada um fez</b>.
          </Instrucao>
          <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={8}
            placeholder="Comece por aqui..."
            className="w-full rounded-2xl px-3 py-3 outline-none resize-y"
            style={{ border: `1px solid ${T.borda}`, background: 'rgba(255,255,255,.03)', color: T.texto, fontSize: 13.5, lineHeight: 1.5 }} />
          <p className="flex justify-between items-center mt-1.5 mb-0" style={{ fontSize: 11, color: T.texto3 }}>
            <span>Mínimo de {MINIMO_PALAVRAS} palavras</span>
            <span><b style={{ color: palavras >= MINIMO_PALAVRAS ? T.verde : T.casa }}>{palavras}</b> / {MINIMO_PALAVRAS}</span>
          </p>
        </div>

        {/* Tres estados. Antes de enviar, "Enviar" e so' acende quando esta' tudo
            ali. Depois de enviado, "Atualizar envio" acende quando ha' coisa nova,
            e fica apagado dizendo "Tudo enviado" quando nao ha' o que mandar. */}
        <button
          onClick={enviar}
          disabled={enviando || (enviado ? !novidade : !podeEnviar)}
          className="w-full mt-7 rounded-2xl font-extrabold uppercase flex items-center justify-center gap-2"
          style={{
            padding: 15, fontSize: 14, letterSpacing: '.06em',
            background: enviado && !novidade ? 'transparent' : T.casa,
            border: enviado && !novidade ? `1px solid ${T.verde}55` : 'none',
            color: enviado && !novidade ? T.verde : '#04121C',
            opacity: enviando ? .5 : (enviado ? (novidade ? 1 : .8) : (podeEnviar ? 1 : .35)),
          }}>
          {enviando && <Loader2 size={16} className="animate-spin" />}
          {enviado ? (novidade ? 'Atualizar envio' : 'Tudo enviado') : 'Enviar'}
        </button>

        {enviado && !novidade && (
          <p className="text-center mt-3 mb-0" style={{ fontSize: 12, color: T.texto3, lineHeight: 1.5 }}>
            Pode fechar. Se quiser acrescentar mais alguma coisa, é só voltar aqui antes do prazo.
          </p>
        )}

        {!enviado && !podeEnviar && (
          <p className="text-center mt-3 mb-0" style={{ fontSize: 12, color: T.texto3, lineHeight: 1.5 }}>
            Falta{' '}
            {[!capa && 'a foto principal',
              portfolio.length < MIN_PORTFOLIO && `${MIN_PORTFOLIO - portfolio.length} foto${MIN_PORTFOLIO - portfolio.length > 1 ? 's' : ''} do portfólio`,
              !video && 'o vídeo',
              palavras < MINIMO_PALAVRAS && `${MINIMO_PALAVRAS - palavras} palavras na descrição`,
            ].filter(Boolean).join(', ')}.
          </p>
        )}
      </div>
    </div>
  );
};

export default Arena2FasePage;
