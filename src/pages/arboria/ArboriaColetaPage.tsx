// ============================================================
// ArboriaColetaPage (/arboria/coleta) — conversa de descoberta com as professoras.
//
// PARA QUE SERVE: aprender COMO E' UMA CRIANCA DE CADA IDADE antes de escrever os
// questionarios do professor e dos pais. Uma ficha por SERIE (Maternal 2, Maternal 3,
// Grupo IV, Grupo V), porque as professoras sao as mesmas e o objeto e' a faixa etaria,
// nao a turma. Ordem do Fundador em 12/08/2026.
//
// NAO GUARDA NADA DE CRIANCA. Sem aluno_id, sem turma_id, sem nome. E' sobre a idade e
// sobre a rotina da serie. Por isso nao toca nos vetos de Riscos de 12/08, que valem para
// os instrumentos que virao depois.
//
// Salva sozinho ao sair do campo: a ficha e' preenchida durante a conversa e precisa
// aguentar parar no meio.
// ============================================================
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { infantilTheme as t } from '@/styles/infantilTheme';
import { Loader2, Check, ChevronRight, ArrowLeft, ExternalLink } from 'lucide-react';

const fromAny = (tb: string) =>
  (supabase.from as never as (tb: string) => ReturnType<typeof supabase.from>)(tb);

// ------------------------------------------------------------ as perguntas

type TipoPergunta = 'texto' | 'longo' | 'checks';

interface Pergunta {
  id: string;
  bloco: number;
  texto: string;
  hint?: string;
  tipo: TipoPergunta;
  opcoes?: string[];
  bloqueante?: boolean;
}

const BLOCOS: { n: number; titulo: string; nota: string }[] = [
  { n: 1, titulo: 'Antes de explicar qualquer coisa', nota: 'O valor está em COMO ela responde, não no que diz. Faça antes de contar o que é o projeto.' },
  { n: 2, titulo: 'A régua da idade', nota: 'O coração da conversa. É o que faz a pergunta caber ou não caber na criança.' },
  { n: 3, titulo: 'Onde dá pra ver', nota: 'Uma pergunta só pode perguntar sobre cena que existe na rotina.' },
  { n: 4, titulo: 'As palavras', nota: 'O vocabulário dela vira matéria-prima do instrumento.' },
  { n: 5, titulo: 'O tamanho do instrumento', nota: 'Uma só, no fim.' },
];

const PERGUNTAS: Pergunta[] = [
  { id: 'q01', bloco: 1, tipo: 'longo',
    texto: 'Escolhe uma criança dessa série e me conta o seu último dia com ela.',
    hint: 'Depois fique calado e deixe correr. Anote o mais literal que der: as palavras dela são matéria-prima.' },

  { id: 'q02', bloco: 2, tipo: 'longo',
    texto: 'O que uma criança dessa série já faz sozinha que a da série anterior ainda não fazia?' },
  { id: 'q03', bloco: 2, tipo: 'longo', bloqueante: true,
    texto: 'Nessa idade, como a criança te mostra que entendeu alguma coisa?',
    hint: 'Define o que conta como evidência. Aos 2 anos não é fala, é ação.' },
  { id: 'q04', bloco: 2, tipo: 'longo', bloqueante: true,
    texto: 'O que muda mais de uma criança pra outra nessa mesma série? E onde todas são parecidas?',
    hint: 'A mais importante das 22. Pergunta só serve onde há variação: a variação é onde mora o sinal.' },
  { id: 'q05', bloco: 2, tipo: 'texto', bloqueante: true,
    texto: 'Ela consegue contar depois uma coisa que aconteceu antes? No mesmo dia, no dia seguinte, semana passada?',
    hint: 'Decide se a pergunta aos pais pode ser ancorada em "da última vez que".' },
  { id: 'q06', bloco: 2, tipo: 'texto',
    texto: 'Ela fala enquanto faz, ou faz calada? Quando fala, é com você, com o colega, ou sozinha?' },
  { id: 'q07', bloco: 2, tipo: 'texto',
    texto: 'Quando ela quer alguma coisa e não consegue pedir com palavras, o que ela faz?' },
  { id: 'q08', bloco: 2, tipo: 'texto',
    texto: 'Quanto tempo ela fica na mesma coisa quando ninguém interrompe?' },
  { id: 'q09', bloco: 2, tipo: 'longo',
    texto: 'O que ela faz quando alguma coisa não sai como ela queria?',
    hint: 'A cena mais valiosa em qualquer idade: quando o caminho fácil falha, a criança cai no filtro dela.' },
  { id: 'q10', bloco: 2, tipo: 'longo',
    texto: 'Ela repara quando alguma coisa está errada ou fora do lugar? Me dá um exemplo.' },
  { id: 'q11', bloco: 2, tipo: 'texto',
    texto: 'Ela brinca perto das outras ou junto com as outras? Isso mudou ao longo do ano?' },
  { id: 'q12', bloco: 2, tipo: 'longo', bloqueante: true,
    texto: 'O que dessa idade os pais não veem em casa? E o que eles veem que você não vê?',
    hint: 'Divide o trabalho entre os dois questionários. Sem isso, pergunto a mesma coisa aos dois.' },
  { id: 'q13', bloco: 2, tipo: 'longo',
    texto: 'Tem alguma coisa que quase toda criança dessa idade faz e que quem não é da área acharia estranho ou preocupante?' },
  { id: 'q14', bloco: 2, tipo: 'longo',
    texto: 'Se chegasse uma criança nova dessa série amanhã, o que você olharia primeiro pra começar a conhecer ela?',
    hint: 'O instinto de quem tem anos de sala. Provavelmente sai daqui a melhor pergunta do instrumento.' },

  { id: 'q15', bloco: 3, tipo: 'longo',
    texto: 'Me conta o dia inteiro dessa série, do portão até a saída, com o nome que vocês dão pra cada momento.' },
  { id: 'q16', bloco: 3, tipo: 'longo',
    texto: 'Em que momento a criança escolhe o que fazer sem vocês definirem? Quanto tempo dura, quantas opções ela tem de verdade, e quem monta essas opções?',
    hint: 'O cardápio da sala é o teto do que dá pra enxergar.' },
  { id: 'q17', bloco: 3, tipo: 'longo',
    texto: 'Quando uma criança trava e não consegue, o que acontece na prática? Vocês ajudam na hora, esperam, mandam tentar de novo?' },
  { id: 'q18', bloco: 3, tipo: 'checks',
    texto: 'Quais desses momentos são COM VOCÊ? Os não marcados são com outro professor.',
    hint: 'O que ela não vê, ela não tem como contar.',
    opcoes: ['Parque', 'Música', 'Movimento', 'Contação de história', 'Jogo de encaixe ou de regra', 'Atividade com bicho ou planta', 'Lanche', 'Acolhida e saída'] },
  { id: 'q19', bloco: 3, tipo: 'texto',
    texto: 'Quem mais vê essa criança toda semana, e em qual momento?' },

  { id: 'q20', bloco: 4, tipo: 'longo',
    texto: 'Que palavras você usa pra descrever uma criança dessa idade? E quais você evita quando fala com a mãe?' },
  { id: 'q21', bloco: 4, tipo: 'longo',
    texto: 'Quando eu falo inteligência dentro do Arboria, o que essa palavra significa pra você?',
    hint: 'Ouça sem corrigir na hora.' },

  { id: 'q22', bloco: 5, tipo: 'texto',
    texto: 'Se eu te desse uma ficha por criança pra preencher, quantos minutos por criança você teria de verdade, e a partir de qual criança você começaria a repetir a resposta?',
    hint: 'A palavra "de verdade" é proposital: autoriza o número honesto em vez do simpático.' },
];

const TOTAL = PERGUNTAS.length;

// ------------------------------------------------------------ tipos

interface Ficha {
  id: string;
  segmento: string;
  serie: string;
  ordem: number;
  professoras: string | null;
  num_criancas: number | null;
  idade_referencia: string | null;
  respostas: Record<string, string | string[]>;
  status: string;
}

const respondidas = (r: Record<string, string | string[]>) =>
  PERGUNTAS.filter((p) => {
    const v = r?.[p.id];
    return Array.isArray(v) ? v.length > 0 : !!(v && String(v).trim());
  }).length;

const SEGMENTOS = [
  { id: 'infantil', label: 'Infantil' },
  { id: 'fundamental1', label: 'Fundamental 1' },
  { id: 'fundamental2', label: 'Fundamental 2' },
];

// Dois instrumentos diferentes vivem nesta aba.
type Instrumento = 'conhecimento' | 'pais';

const INSTRUMENTOS: { id: Instrumento; label: string; nota: string }[] = [
  { id: 'conhecimento', label: 'Conhecimento das turmas', nota: 'A conversa com as professoras, uma ficha por série, para entender como é uma criança de cada idade.' },
  { id: 'pais', label: 'Questionário dos pais', nota: 'O que a família responde sobre o próprio filho, um link por criança. Ainda em protótipo, sem vínculo com turma.' },
];

// Turmas do Infantil. Cada faixa tem o seu proprio conjunto de cenas, porque o
// que uma crianca de 2 anos pode ter feito e o que uma de 4 pode ter feito sao
// coisas diferentes. Por isso o prototipo abre POR FAIXA, e nao um so' para
// todas: 'link' diz qual versao aquela turma abriria.
const TURMAS_PAIS: { turma: string; idade: string; link: string | null }[] = [
  { turma: 'Maternal 2 A', idade: '2 anos', link: null },
  { turma: 'Maternal 2 B', idade: '2 anos', link: '/arboria/coleta/pais/preview' },
  { turma: 'Maternal 3 A', idade: '3 anos', link: null },
  { turma: 'Maternal 3 B', idade: '3 anos', link: null },
  { turma: 'Grupo IV A', idade: '4 anos', link: '/arboria/coleta/pais/preview?faixa=g4' },
  { turma: 'Grupo IV B', idade: '4 anos', link: null },
  { turma: 'Grupo V A', idade: '5 anos', link: null },
  { turma: 'Grupo V B', idade: '5 anos', link: null },
];

// ============================================================

const ArboriaColetaPage = () => {
  const [fichas, setFichas] = useState<Ficha[] | null>(null);
  const [instrumento, setInstrumento] = useState<Instrumento>('conhecimento');
  const [segmento, setSegmento] = useState('infantil');
  const [abertaId, setAbertaId] = useState<string | null>(null);
  const [salvando, setSalvando] = useState<string | null>(null);
  const [salvos, setSalvos] = useState<Record<string, boolean>>({});

  const carregar = async () => {
    const { data, error } = await fromAny('coleta_descoberta')
      .select('id, segmento, serie, ordem, professoras, num_criancas, idade_referencia, respostas, status')
      .order('ordem');
    if (error) { toast.error('Não consegui carregar as fichas'); setFichas([]); return; }
    setFichas(((data ?? []) as unknown as Ficha[]).map((f) => ({ ...f, respostas: f.respostas ?? {} })));
  };

  useEffect(() => { carregar(); }, []);

  const doSegmento = useMemo(
    () => (fichas ?? []).filter((f) => f.segmento === segmento),
    [fichas, segmento],
  );

  const aberta = useMemo(
    () => (fichas ?? []).find((f) => f.id === abertaId) ?? null,
    [fichas, abertaId],
  );

  // ---------------------------------------------------------- gravação

  const patch = async (ficha: Ficha, campos: Record<string, unknown>, marca?: string) => {
    setSalvando(marca ?? 'ficha');
    const novoStatus =
      ficha.status === 'nao_iniciada' ? 'em_andamento' : ficha.status;
    const { error } = await fromAny('coleta_descoberta')
      .update({ ...campos, status: campos.status ?? novoStatus })
      .eq('id', ficha.id);
    setSalvando(null);
    if (error) { toast.error('Não consegui salvar'); return; }
    setFichas((prev) =>
      (prev ?? []).map((f) =>
        f.id === ficha.id ? { ...f, ...(campos as Partial<Ficha>), status: (campos.status as string) ?? novoStatus } : f,
      ),
    );
    if (marca) {
      setSalvos((s) => ({ ...s, [marca]: true }));
      setTimeout(() => setSalvos((s) => ({ ...s, [marca]: false })), 2200);
    }
  };

  const salvarResposta = (ficha: Ficha, qid: string, valor: string | string[]) => {
    const atual = ficha.respostas?.[qid];
    const igual = Array.isArray(valor)
      ? JSON.stringify(atual ?? []) === JSON.stringify(valor)
      : (atual ?? '') === valor;
    if (igual) return;
    const respostas = { ...(ficha.respostas ?? {}), [qid]: valor };
    patch(ficha, { respostas }, qid);
  };

  // ---------------------------------------------------------- lista

  if (fichas === null) {
    return (
      <div className="flex items-center gap-2 py-16 justify-center" style={{ color: t.textFaint }}>
        <Loader2 className="animate-spin" size={18} /> carregando
      </div>
    );
  }

  if (!aberta) {
    const feitas = doSegmento.filter((f) => f.status === 'concluida').length;
    const inst = INSTRUMENTOS.find((x) => x.id === instrumento)!;
    return (
      <div>
        <h1 className="text-xl font-bold mb-3" style={{ color: t.text }}>Coleta</h1>

        {/* seletor de instrumento */}
        <div className="flex gap-2 flex-wrap mb-3">
          {INSTRUMENTOS.map((x) => {
            const on = instrumento === x.id;
            return (
              <button
                key={x.id}
                onClick={() => setInstrumento(x.id)}
                className="text-[13px] font-bold px-4 py-2 rounded-xl transition-colors"
                style={on
                  ? { backgroundColor: t.accent, color: '#fff', boxShadow: t.shadowSm }
                  : { backgroundColor: t.surface, color: t.textMuted, border: `1px solid ${t.border}` }}
              >
                {x.label}
              </button>
            );
          })}
        </div>
        <p className="text-[13px] mb-5 max-w-2xl" style={{ color: t.textMuted }}>{inst.nota}</p>

        {instrumento === 'pais' ? (
          <>
            <div
              className="rounded-2xl px-4 py-3.5 mb-4"
              style={{ backgroundColor: t.accentSoft, border: `1px solid ${t.accentBorder}` }}
            >
              <p className="text-[12.5px] m-0" style={{ color: t.textMuted }}>
                <b style={{ color: t.accentText }}>Ainda não vinculado.</b> O protótipo abaixo abre a versão do
                Maternal 2, como o pai veria no celular. Nada é gravado, e nenhuma família recebeu link.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              {TURMAS_PAIS.map((x) => (
                <div
                  key={x.turma}
                  className="rounded-2xl px-4 py-3 flex items-center gap-3"
                  style={{ backgroundColor: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadowSm }}
                >
                  <span
                    className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center text-[11px] font-bold"
                    style={x.link
                      ? { backgroundColor: t.accentSoft, color: t.accentText }
                      : { backgroundColor: t.surfaceSunken, color: t.textFaint }}
                  >
                    {x.idade.replace(' anos', 'a')}
                  </span>
                  <span className="flex-1 min-w-0">
                    <b className="block text-sm font-semibold" style={{ color: t.text }}>{x.turma}</b>
                    <span className="text-[11.5px]" style={{ color: t.textFaint }}>
                      {x.link ? 'protótipo desta faixa' : 'sem link gerado'}
                    </span>
                  </span>
                  {x.link ? (
                    <a
                      href={x.link}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[12px] font-bold px-3 py-2 rounded-xl flex items-center gap-1.5"
                      style={{ backgroundColor: t.accent, color: '#fff', boxShadow: t.shadowSm }}
                    >
                      Abrir <ExternalLink size={13} />
                    </a>
                  ) : (
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                      style={{ backgroundColor: t.surfaceSunken, color: t.textFaint }}>
                      não iniciada
                    </span>
                  )}
                </div>
              ))}
            </div>
          </>
        ) : (
        <>
        <div className="flex gap-2 flex-wrap mb-5">
          {SEGMENTOS.map((s) => {
            const tem = (fichas ?? []).some((f) => f.segmento === s.id);
            const on = segmento === s.id;
            return (
              <button
                key={s.id}
                onClick={() => tem && setSegmento(s.id)}
                disabled={!tem}
                className="text-[12.5px] font-semibold px-3.5 py-1.5 rounded-full transition-colors"
                style={
                  on
                    ? { backgroundColor: t.accent, color: '#fff', boxShadow: t.shadowSm }
                    : { backgroundColor: t.surface, color: tem ? t.textMuted : t.silencio, border: `1px solid ${t.border}` }
                }
              >
                {s.label}
              </button>
            );
          })}
        </div>

        {doSegmento.length === 0 ? (
          <p className="text-[13px]" style={{ color: t.textFaint }}>Ainda não há fichas para este segmento.</p>
        ) : (
          <>
            <div
              className="rounded-2xl px-4 py-3.5 mb-4 flex items-center gap-3.5"
              style={{ backgroundColor: t.accentSoft, border: `1px solid ${t.accentBorder}` }}
            >
              <span className="text-2xl font-bold tabular-nums" style={{ color: t.accentText }}>
                {feitas}/{doSegmento.length}
              </span>
              <p className="text-[12.5px] m-0" style={{ color: t.textMuted }}>
                <b style={{ color: t.accentText }}>Séries conversadas.</b> Nenhuma pergunta é obrigatória: em branco também é resposta.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              {doSegmento.map((f) => {
                const n = respondidas(f.respostas);
                const done = f.status === 'concluida';
                const doing = !done && n > 0;
                return (
                  <button
                    key={f.id}
                    onClick={() => setAbertaId(f.id)}
                    className="rounded-2xl px-4 py-3 flex items-center gap-3 text-left w-full"
                    style={{ backgroundColor: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadowSm }}
                  >
                    <span
                      className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center text-[11px] font-bold"
                      style={
                        done
                          ? { backgroundColor: '#E4F4EC', color: t.presenteText }
                          : doing
                          ? { backgroundColor: t.accentSoft, color: t.accentText }
                          : { backgroundColor: t.surfaceSunken, color: t.textFaint }
                      }
                    >
                      {f.idade_referencia?.replace(' anos', 'a') ?? '?'}
                    </span>
                    <span className="flex-1 min-w-0">
                      <b className="block text-sm font-semibold" style={{ color: t.text }}>{f.serie}</b>
                      <span className="text-[11.5px]" style={{ color: t.textFaint }}>
                        {f.idade_referencia}
                        {f.professoras ? ` · ${f.professoras}` : ''}
                      </span>
                    </span>
                    <span
                      className="text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap"
                      style={
                        done
                          ? { backgroundColor: '#E4F4EC', color: t.presenteText }
                          : doing
                          ? { backgroundColor: t.accentSoft, color: t.accentText }
                          : { backgroundColor: t.surfaceSunken, color: t.textFaint }
                      }
                    >
                      {done ? 'conversada' : doing ? `${n} de ${TOTAL}` : 'não iniciada'}
                    </span>
                    <ChevronRight size={17} style={{ color: t.silencio }} className="flex-shrink-0" />
                  </button>
                );
              })}
            </div>
          </>
        )}
        </>
        )}
      </div>
    );
  }

  // ---------------------------------------------------------- ficha aberta

  const n = respondidas(aberta.respostas);
  const pct = Math.round((n / TOTAL) * 100);

  return (
    <div>
      <button
        onClick={() => setAbertaId(null)}
        className="flex items-center gap-1.5 text-[12px] font-semibold mb-3"
        style={{ color: t.textMuted }}
      >
        <ArrowLeft size={14} /> Coleta
      </button>

      <div
        className="rounded-2xl px-4 py-4 mb-4"
        style={{ backgroundColor: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadowSm }}
      >
        <h2 className="text-lg font-bold m-0" style={{ color: t.text }}>{aberta.serie}</h2>
        <p className="text-[12.5px] m-0 mb-3" style={{ color: t.textMuted }}>
          Conversa sobre como é uma criança de {aberta.idade_referencia}. Não é sobre nenhuma criança específica.
        </p>

        <div className="flex gap-3 flex-wrap">
          <label className="text-[11.5px] flex-1 min-w-[160px]" style={{ color: t.textFaint }}>
            Professoras
            <input
              key={`${aberta.id}-prof`}
              defaultValue={aberta.professoras ?? ''}
              onBlur={(e) => patch(aberta, { professoras: e.target.value || null }, 'prof')}
              placeholder="quem respondeu"
              className="w-full mt-1 rounded-xl px-3 py-2 text-[13px] outline-none"
              style={{ backgroundColor: t.surfaceSunken, border: `1px solid ${t.border}`, color: t.text }}
            />
          </label>
          <label className="text-[11.5px] w-32" style={{ color: t.textFaint }}>
            Crianças na série
            <input
              key={`${aberta.id}-num`}
              type="number"
              defaultValue={aberta.num_criancas ?? ''}
              onBlur={(e) => patch(aberta, { num_criancas: e.target.value ? Number(e.target.value) : null }, 'num')}
              placeholder="0"
              className="w-full mt-1 rounded-xl px-3 py-2 text-[13px] outline-none"
              style={{ backgroundColor: t.surfaceSunken, border: `1px solid ${t.border}`, color: t.text }}
            />
          </label>
        </div>

        <div className="h-1.5 rounded-full mt-3.5 overflow-hidden" style={{ backgroundColor: t.surfaceSunken }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: t.accent }} />
        </div>
        <p className="text-[11px] mt-1.5 m-0" style={{ color: t.textFaint }}>{n} de {TOTAL} respondidas</p>
      </div>

      {BLOCOS.map((b) => {
        const doBloco = PERGUNTAS.filter((p) => p.bloco === b.n);
        return (
          <div key={b.n}>
            <p className="text-[11px] font-bold uppercase tracking-wider mt-6 mb-1" style={{ color: t.textFaint }}>
              Bloco {b.n} · {b.titulo}
            </p>
            <p className="text-[12px] italic mb-3 max-w-2xl" style={{ color: t.textFaint }}>{b.nota}</p>

            {doBloco.map((p) => {
              const valor = aberta.respostas?.[p.id];
              const preenchida = Array.isArray(valor) ? valor.length > 0 : !!(valor && String(valor).trim());
              return (
                <div
                  // a chave carrega a ficha: sem isso o React reaproveita o textarea entre
                  // series e o texto do Maternal 2 aparece ao abrir o Maternal 3 (defaultValue
                  // so' e' lido na montagem).
                  key={`${aberta.id}-${p.id}`}
                  className="rounded-2xl px-4 py-3.5 mb-2"
                  style={{
                    backgroundColor: t.surface,
                    border: `1px solid ${preenchida ? t.accentBorder : t.border}`,
                    boxShadow: t.shadowSm,
                  }}
                >
                  <div className="flex gap-2.5 items-start mb-2.5">
                    <span
                      className="text-[11.5px] font-bold rounded-md px-1.5 py-0.5 flex-shrink-0 mt-0.5 tabular-nums"
                      style={{ backgroundColor: t.accentSoft, color: t.accentText }}
                    >
                      {p.id.replace('q', '')}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold m-0 leading-snug" style={{ color: t.text }}>{p.texto}</p>
                      {p.bloqueante && (
                        <span className="text-[10.5px] font-bold uppercase tracking-wide" style={{ color: '#7d2f4d' }}>
                          bloqueante
                        </span>
                      )}
                      {p.hint && (
                        <p className="text-[11.5px] italic m-0 mt-0.5" style={{ color: t.textFaint }}>{p.hint}</p>
                      )}
                    </div>
                  </div>

                  {p.tipo === 'checks' ? (
                    <div className="flex flex-wrap gap-2">
                      {(p.opcoes ?? []).map((op) => {
                        const marcadas = Array.isArray(valor) ? valor : [];
                        const on = marcadas.includes(op);
                        return (
                          <button
                            key={op}
                            onClick={() =>
                              salvarResposta(
                                aberta,
                                p.id,
                                on ? marcadas.filter((x) => x !== op) : [...marcadas, op],
                              )
                            }
                            className="text-[12.5px] font-semibold px-3 py-1.5 rounded-full flex items-center gap-2"
                            style={
                              on
                                ? { backgroundColor: t.accentSoft, border: `1px solid ${t.accentBorder}`, color: t.accentText }
                                : { backgroundColor: t.surfaceAlt, border: `1px solid ${t.border}`, color: t.textMuted }
                            }
                          >
                            <span
                              className="w-3 h-3 rounded-[3px] flex-shrink-0"
                              style={{
                                backgroundColor: on ? t.accent : 'transparent',
                                border: `1.5px solid ${on ? t.accent : t.silencio}`,
                              }}
                            />
                            {op}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <textarea
                      defaultValue={typeof valor === 'string' ? valor : ''}
                      onBlur={(e) => salvarResposta(aberta, p.id, e.target.value)}
                      rows={p.tipo === 'longo' ? 4 : 2}
                      placeholder="anote enquanto ela fala"
                      className="w-full rounded-xl px-3 py-2.5 text-[13.5px] outline-none resize-y leading-relaxed"
                      style={{
                        backgroundColor: preenchida ? t.surface : t.surfaceSunken,
                        border: `1px solid ${t.border}`,
                        color: t.text,
                      }}
                    />
                  )}

                  {salvando === p.id ? (
                    <span className="text-[11px] font-semibold mt-1.5 inline-flex items-center gap-1.5" style={{ color: t.textFaint }}>
                      <Loader2 size={12} className="animate-spin" /> salvando
                    </span>
                  ) : salvos[p.id] ? (
                    <span className="text-[11px] font-semibold mt-1.5 inline-flex items-center gap-1.5" style={{ color: t.presenteText }}>
                      <Check size={12} /> salvo
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
        );
      })}

      <div
        className="sticky bottom-2 rounded-2xl px-4 py-3 mt-4 flex items-center gap-3 flex-wrap"
        style={{ backgroundColor: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadowMd }}
      >
        <p className="text-[12px] m-0 flex-1 min-w-[180px]" style={{ color: t.textMuted }}>
          Tudo salvo. Dá pra fechar e continuar depois, nesta série ou em outra.
        </p>
        <button
          onClick={() => setAbertaId(null)}
          className="text-[12.5px] font-bold px-4 py-2 rounded-xl"
          style={{ backgroundColor: t.surface, color: t.textMuted, border: `1px solid ${t.border}` }}
        >
          Voltar à lista
        </button>
        <button
          onClick={() =>
            patch(
              aberta,
              { status: aberta.status === 'concluida' ? 'em_andamento' : 'concluida' },
              'status',
            ).then(() => toast.success(aberta.status === 'concluida' ? 'Reaberta' : 'Marcada como conversada'))
          }
          className="text-[12.5px] font-bold px-4 py-2 rounded-xl"
          style={{ backgroundColor: t.accent, color: '#fff', boxShadow: t.shadowSm }}
        >
          {aberta.status === 'concluida' ? 'Reabrir' : 'Marcar como conversada'}
        </button>
      </div>
    </div>
  );
};

export default ArboriaColetaPage;
