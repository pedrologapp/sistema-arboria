// O PAINEL DO QUESTIONARIO DOS PAIS
//
// Tres decisoes vieram do primeiro dia no ar, e nao do desenho:
//
// 1. CONTA VOZ, NAO CRIANCA. Em tres horas, tres criancas ja tinham duas vozes:
//    mae e avo, mae e pai. Numa contagem de "respondeu sim ou nao" isso vira uma
//    linha so, e o que o instrumento tem de mais valioso some do painel.
//
// 2. QUEM PAROU, E ONDE. Dezessete familias pararam no meio no primeiro dia, e
//    nao havia como saber se desistiram, foram interrompidas, ou se a tela
//    quebrou naquele aparelho. Desistencia se espalha por todas as perguntas;
//    defeito se concentra numa so. O numero da pergunta separa as duas.
//
// 3. QUANTAS LETRAS. A variacao foi de 7 a 1.050 por envio. Isso NAO e' nota da
//    familia e nao vira cobranca de ninguem: e' aviso para a leitura, que
//    precisa saber que um relato de sete letras nao sustenta hipotese nenhuma.
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { infantilTheme as t } from '@/styles/infantilTheme';
import { Loader2, ArrowLeft, Search, Users, Clock } from 'lucide-react';

interface Linha {
  aluno_id: string;
  nome_completo: string;
  turma: string;
  serie: string;
  vozes: number;
  vozes_concluidas: number;
  respondentes: string[] | null;
  letras: number;
  acrescimos: number;
  primeira: string | null;
  ultima: string | null;
  parou_na_pergunta: number | null;
}

interface Resposta {
  envio_id: string;
  respondente: string | null;
  quem_fica_mais_tempo: string | null;
  iniciado_em: string;
  concluido_em: string | null;
  ordem: number | null;
  pergunta_texto: string | null;
  cena_texto: string | null;
  texto: string | null;
  marcadas: string[] | null;
}

const SERIES = ['Maternal 2', 'Maternal 3', 'Grupo IV', 'Grupo V',
  '1º Ano', '2º Ano', '3º Ano', '4º Ano', '5º Ano'];

type Lente = 'todas' | 'responderam' | 'meio' | 'faltam';

const LENTES: { id: Lente; label: string }[] = [
  { id: 'todas', label: 'Todas' },
  { id: 'responderam', label: 'Responderam' },
  { id: 'meio', label: 'Pararam no meio' },
  { id: 'faltam', label: 'Ainda faltam' },
];

const quando = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    + ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

const semAcento = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const PainelQuestionarioPais = () => {
  const [linhas, setLinhas] = useState<Linha[] | null>(null);
  const [lente, setLente] = useState<Lente>('todas');
  const [serie, setSerie] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [aberta, setAberta] = useState<Linha | null>(null);
  const [respostas, setRespostas] = useState<Resposta[] | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc('painel_questionario_pais' as never, {} as never);
      if (error) { toast.error('Não consegui carregar o painel'); setLinhas([]); return; }
      setLinhas((data ?? []) as unknown as Linha[]);
    })();
  }, []);

  async function abrir(l: Linha) {
    setAberta(l);
    setRespostas(null);
    const { data, error } = await supabase.rpc('respostas_da_crianca' as never, {
      p_aluno_id: l.aluno_id,
    } as never);
    if (error) { toast.error('Não consegui abrir as respostas'); setRespostas([]); return; }
    setRespostas((data ?? []) as unknown as Resposta[]);
  }

  const resumo = useMemo(() => {
    const ls = linhas ?? [];
    return {
      alvo: ls.length,
      responderam: ls.filter((l) => l.vozes_concluidas > 0).length,
      vozes: ls.reduce((a, l) => a + l.vozes, 0),
      duasVozes: ls.filter((l) => l.vozes_concluidas > 1).length,
      meio: ls.filter((l) => l.vozes > l.vozes_concluidas).length,
      letras: ls.reduce((a, l) => a + l.letras, 0),
      acrescimos: ls.reduce((a, l) => a + l.acrescimos, 0),
    };
  }, [linhas]);

  const visiveis = useMemo(() => {
    let ls = linhas ?? [];
    if (serie) ls = ls.filter((l) => l.serie === serie);
    if (lente === 'responderam') ls = ls.filter((l) => l.vozes_concluidas > 0);
    if (lente === 'meio') ls = ls.filter((l) => l.vozes > l.vozes_concluidas);
    if (lente === 'faltam') ls = ls.filter((l) => l.vozes === 0);
    const b = semAcento(busca.trim());
    if (b) ls = ls.filter((l) => semAcento(l.nome_completo).includes(b));
    // Quem tem mais para ler primeiro. Quem nao respondeu vai para o fim: o
    // painel serve para LER o que chegou, e so depois para cobrar o que falta.
    return [...ls].sort((a, b2) =>
      b2.vozes_concluidas - a.vozes_concluidas
      || b2.letras - a.letras
      || a.nome_completo.localeCompare(b2.nome_completo, 'pt-BR'));
  }, [linhas, lente, serie, busca]);

  if (!linhas) {
    return (
      <div className="flex items-center gap-2 py-10 text-sm" style={{ color: t.textMuted }}>
        <Loader2 size={16} className="animate-spin" /> carregando o painel
      </div>
    );
  }

  // ===================================================== UMA CRIANÇA
  if (aberta) {
    // Um bloco por VOZ. As duas leituras da mesma criança ficam uma embaixo da
    // outra de propósito: a divergência entre a mãe e a avó é dado, não ruído.
    const vozes: Resposta[][] = [];
    for (const r of respostas ?? []) {
      const ultimo = vozes[vozes.length - 1];
      if (!ultimo || ultimo[0].envio_id !== r.envio_id) vozes.push([r]);
      else ultimo.push(r);
    }

    return (
      <div>
        <button
          onClick={() => { setAberta(null); setRespostas(null); }}
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold mb-4"
          style={{ color: t.accentText }}
        >
          <ArrowLeft size={15} /> voltar ao painel
        </button>

        <h2 className="text-lg font-bold m-0" style={{ color: t.text }}>{aberta.nome_completo}</h2>
        <p className="text-[13px] mb-5" style={{ color: t.textMuted }}>
          {aberta.turma}
          {aberta.vozes > 0 && ` · ${aberta.vozes} ${aberta.vozes === 1 ? 'voz' : 'vozes'}`}
          {aberta.letras > 0 && ` · ${aberta.letras.toLocaleString('pt-BR')} letras`}
        </p>

        {respostas === null && (
          <div className="flex items-center gap-2 text-sm" style={{ color: t.textMuted }}>
            <Loader2 size={15} className="animate-spin" /> abrindo
          </div>
        )}

        {respostas !== null && vozes.length === 0 && (
          <p className="text-sm" style={{ color: t.textMuted }}>
            Nenhuma família respondeu sobre {aberta.nome_completo.split(' ')[0]} ainda.
          </p>
        )}

        {vozes.map((voz) => {
          const cab = voz[0];
          const perguntas = voz.filter((r) => r.ordem !== null && r.ordem < 900);
          const extras = voz.filter((r) => r.ordem !== null && r.ordem >= 900);
          return (
            <div
              key={cab.envio_id}
              className="rounded-2xl p-5 mb-4"
              style={{ backgroundColor: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadowSm }}
            >
              <div className="flex items-center gap-2.5 flex-wrap mb-4 pb-3" style={{ borderBottom: `1px solid ${t.border}` }}>
                <b className="text-sm" style={{ color: t.text }}>{cab.respondente ?? 'Não disse quem é'}</b>
                <span className="text-[11.5px]" style={{ color: t.textFaint }}>{quando(cab.iniciado_em)}</span>
                <span
                  className="text-[11px] font-bold px-2.5 py-1 rounded-full ml-auto"
                  style={cab.concluido_em
                    ? { backgroundColor: t.accentSoft, color: t.accentText }
                    : { backgroundColor: t.surfaceSunken, color: t.textFaint }}
                >
                  {cab.concluido_em ? 'concluído' : 'parou no meio'}
                </span>
              </div>

              {cab.quem_fica_mais_tempo && (
                <p className="text-[12.5px] mb-4" style={{ color: t.textMuted }}>
                  Quem fica mais tempo com {aberta.nome_completo.split(' ')[0]}: <b style={{ color: t.text }}>{cab.quem_fica_mais_tempo}</b>
                </p>
              )}

              {perguntas.map((r) => (
                <div key={r.ordem} className="mb-5">
                  <p className="text-[12px] font-bold mb-1" style={{ color: t.textFaint }}>
                    {r.ordem}. {r.pergunta_texto}
                  </p>
                  {/* O relato e' a resposta. Ele vem em corpo de leitura, e a
                      opcao marcada vem depois, pequena: ela e' isca de memoria,
                      e trata-la como resposta inverteria o instrumento. */}
                  {r.texto
                    ? <p className="text-[15px] leading-relaxed m-0" style={{ color: t.text }}>{r.texto}</p>
                    : <p className="text-[13px] italic m-0" style={{ color: t.silencio }}>não escreveu</p>}
                  {r.marcadas && r.marcadas.length > 0 && (
                    <div className="flex gap-1.5 flex-wrap mt-2">
                      {r.marcadas.map((m) => (
                        <span key={m} className="text-[11px] px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: t.surfaceSunken, color: t.textMuted }}>{m}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {extras.map((r) => (
                <div key={r.ordem} className="rounded-xl px-4 py-3 mt-1"
                  style={{ backgroundColor: t.accentSoft, border: `1px solid ${t.accentBorder}` }}>
                  <p className="text-[11.5px] font-bold mb-1" style={{ color: t.accentText }}>
                    Voltou depois para contar
                  </p>
                  <p className="text-[15px] leading-relaxed m-0" style={{ color: t.text }}>{r.texto}</p>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    );
  }

  // ========================================================= O PAINEL
  const Numero = ({ n, label, forte }: { n: string | number; label: string; forte?: boolean }) => (
    <div className="rounded-2xl px-4 py-3 flex-1 min-w-[132px]"
      style={forte
        ? { backgroundColor: t.accentSoft, border: `1px solid ${t.accentBorder}` }
        : { backgroundColor: t.surface, border: `1px solid ${t.border}` }}>
      <b className="block text-xl font-bold leading-none mb-1"
        style={{ color: forte ? t.accentText : t.text }}>{n}</b>
      <span className="text-[11.5px]" style={{ color: t.textMuted }}>{label}</span>
    </div>
  );

  return (
    <div>
      <div className="flex gap-2 flex-wrap mb-4">
        <Numero forte n={`${resumo.responderam} de ${resumo.alvo}`} label="crianças com resposta" />
        <Numero n={resumo.vozes} label="vozes ao todo" />
        <Numero n={resumo.duasVozes} label="com duas vozes ou mais" />
        <Numero n={resumo.meio} label="pararam no meio" />
        <Numero n={resumo.letras.toLocaleString('pt-BR')} label="letras escritas" />
      </div>

      <div className="flex gap-2 flex-wrap mb-3">
        {LENTES.map((x) => {
          const on = lente === x.id;
          return (
            <button
              key={x.id}
              onClick={() => setLente(x.id)}
              className="text-[12.5px] font-semibold px-3.5 py-1.5 rounded-full transition-colors"
              style={on
                ? { backgroundColor: t.accent, color: '#fff', boxShadow: t.shadowSm }
                : { backgroundColor: t.surface, color: t.textMuted, border: `1px solid ${t.border}` }}
            >
              {x.label}
            </button>
          );
        })}
      </div>

      <div className="flex gap-2 flex-wrap items-center mb-4">
        <button
          onClick={() => setSerie(null)}
          className="text-[12px] font-semibold px-3 py-1 rounded-full"
          style={!serie
            ? { backgroundColor: t.accentSoft, color: t.accentText, border: `1px solid ${t.accentBorder}` }
            : { backgroundColor: t.surface, color: t.textFaint, border: `1px solid ${t.border}` }}
        >
          todas as séries
        </button>
        {SERIES.map((s) => {
          const on = serie === s;
          return (
            <button
              key={s}
              onClick={() => setSerie(on ? null : s)}
              className="text-[12px] font-semibold px-3 py-1 rounded-full"
              style={on
                ? { backgroundColor: t.accentSoft, color: t.accentText, border: `1px solid ${t.accentBorder}` }
                : { backgroundColor: t.surface, color: t.textFaint, border: `1px solid ${t.border}` }}
            >
              {s}
            </button>
          );
        })}
      </div>

      <div className="relative mb-4">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: t.textFaint }} />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="procurar pelo nome da criança"
          className="w-full text-sm rounded-xl outline-none"
          style={{ padding: '10px 14px 10px 36px', backgroundColor: t.surface, border: `1px solid ${t.border}`, color: t.text }}
        />
      </div>

      <p className="text-[12px] mb-2" style={{ color: t.textFaint }}>
        {visiveis.length} {visiveis.length === 1 ? 'criança' : 'crianças'}
      </p>

      <div className="flex flex-col gap-1.5">
        {visiveis.map((l) => {
          const respondeu = l.vozes_concluidas > 0;
          const noMeio = l.vozes > l.vozes_concluidas;
          return (
            <button
              key={l.aluno_id}
              onClick={() => l.vozes > 0 && abrir(l)}
              className="rounded-2xl px-4 py-3 flex items-center gap-3 text-left w-full transition-colors"
              style={{
                backgroundColor: t.surface,
                border: `1px solid ${respondeu ? t.accentBorder : t.border}`,
                cursor: l.vozes > 0 ? 'pointer' : 'default',
                opacity: l.vozes > 0 ? 1 : 0.72,
              }}
            >
              <span className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center text-[12px] font-bold"
                style={respondeu
                  ? { backgroundColor: t.accentSoft, color: t.accentText }
                  : { backgroundColor: t.surfaceSunken, color: t.textFaint }}>
                {l.vozes_concluidas || (noMeio ? '·' : '')}
              </span>

              <span className="flex-1 min-w-0">
                <b className="block text-sm font-semibold truncate" style={{ color: t.text }}>{l.nome_completo}</b>
                <span className="text-[11.5px]" style={{ color: t.textFaint }}>
                  {l.turma}
                  {(l.respondentes ?? []).length > 0 && ' · ' + (l.respondentes ?? []).join(', ')}
                </span>
              </span>

              {l.acrescimos > 0 && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
                  style={{ backgroundColor: t.accentSoft, color: t.accentText }}>
                  voltou pra contar
                </span>
              )}

              {noMeio && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap inline-flex items-center gap-1"
                  style={{ backgroundColor: t.surfaceSunken, color: t.textMuted }}>
                  <Clock size={11} />
                  {l.parou_na_pergunta ? `parou na ${l.parou_na_pergunta}ª` : 'abriu e saiu'}
                </span>
              )}

              {l.letras > 0 && (
                <span className="text-[11.5px] font-bold tabular-nums whitespace-nowrap"
                  style={{ color: l.letras >= 300 ? t.accentText : t.textFaint }}>
                  {l.letras.toLocaleString('pt-BR')}
                </span>
              )}

              {l.vozes === 0 && (
                <span className="text-[11px] whitespace-nowrap" style={{ color: t.silencio }}>
                  sem resposta
                </span>
              )}
            </button>
          );
        })}
      </div>

      {visiveis.length === 0 && (
        <p className="text-sm py-6 text-center" style={{ color: t.textMuted }}>
          Nenhuma criança nesse recorte.
        </p>
      )}

      <p className="text-[11.5px] mt-5 flex items-start gap-1.5" style={{ color: t.textFaint, lineHeight: 1.5 }}>
        <Users size={13} className="flex-shrink-0 mt-0.5" />
        O número no círculo é quantas <b>vozes</b> concluíram sobre aquela criança, e
        não quantas crianças responderam. Mãe e avó contam duas, e a divergência
        entre elas é dado. O número da direita é quantas letras a família escreveu:
        ele não é nota de ninguém, é aviso para a leitura.
      </p>
    </div>
  );
};

export default PainelQuestionarioPais;
