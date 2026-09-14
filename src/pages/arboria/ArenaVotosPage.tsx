// ============================================================
// ArenaVotosPage (/arboria/arena) — o placar da votacao, para o Fundador.
//
// QUEM VE' ISTO E' SO' O DONO. A funcao arena_apuracao roda com dono e recusa
// quem nao for super_admin; a tabela de votos nao tem policy nenhuma, entao
// ninguem le' ela direto, nem professor nem admin. E o site publico nunca
// devolve contagem.
//
// A LISTA VEM ORDENADA POR NUMERO, e nao por votos. Isso e' de proposito e vem
// do parecer de Riscos: ordenar e' ato do leitor. Uma tela que ja' chega
// ordenada por desempenho vira um podio, e placar de trabalho de crianca
// projetado numa sala e' exatamente o que nao se deve criar. Aqui existe um
// botao para ordenar, e ele e' um gesto consciente de quem esta' olhando.
//
// DUAS COLUNAS QUE NAO SAO ENFEITE. "Redes" e' quantas redes diferentes
// votaram naquele projeto, e "maior fatia" e' quanto do total dele veio de uma
// unica rede. Sao elas que respondem a uma contestacao sem identificar
// ninguem: 300 votos vindos de 12 redes tem uma historia, 300 vindos de 2 tem
// outra.
// ============================================================
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { infantilTheme as t } from '@/styles/infantilTheme';
import { RefreshCw, AlertTriangle } from 'lucide-react';

interface Linha {
  projeto_id: string;
  numero: number;
  titulo: string;
  estado: string;
  votos: number;
  redes_distintas: number;
  maior_fatia: number;
  nota: number | null;
  nota_faltando: boolean;
}

interface Edicao {
  id: string; nome: string; estado: string;
  abre_em: string | null; fecha_em: string | null;
  regra_resultado: string | null;
}

export default function ArenaVotosPage() {
  const [edicao, setEdicao] = useState<Edicao | null>(null);
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [porVotos, setPorVotos] = useState(false);
  const [atualizadoEm, setAtualizadoEm] = useState<Date | null>(null);

  async function carregar() {
    setCarregando(true);
    setErro(null);
    try {
      const sb = supabase as unknown as {
        from: (t: string) => { select: (c: string) => { order: (c: string, o: { ascending: boolean }) => { limit: (n: number) => Promise<{ data: Edicao[] | null; error: unknown }> } } };
        rpc: (f: string, a: Record<string, string>) => Promise<{ data: Linha[] | null; error: { message: string } | null }>;
      };
      const { data: eds } = await sb.from('arena_edicao')
        .select('id, nome, estado, abre_em, fecha_em, regra_resultado')
        .order('ano', { ascending: false }).limit(1);
      const ed = eds?.[0] ?? null;
      setEdicao(ed);
      if (!ed) { setLinhas([]); return; }

      const { data, error } = await sb.rpc('arena_apuracao', { p_edicao: ed.id });
      if (error) throw new Error(error.message);
      setLinhas(data ?? []);
      setAtualizadoEm(new Date());
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'não foi possível ler a apuração');
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    void carregar();
    // Meio minuto e' suficiente: ninguem toma decisao olhando voto entrar ao
    // vivo, e atualizar mais rapido so' convida a ficar olhando.
    const relogio = setInterval(() => void carregar(), 30000);
    return () => clearInterval(relogio);
  }, []);

  const total = useMemo(() => linhas.reduce((s, l) => s + Number(l.votos), 0), [linhas]);
  const maior = useMemo(() => Math.max(1, ...linhas.map((l) => Number(l.votos))), [linhas]);
  const mostradas = useMemo(
    () => (porVotos ? [...linhas].sort((a, b) => Number(b.votos) - Number(a.votos)) : linhas),
    [linhas, porVotos],
  );
  const semNota = linhas.filter((l) => l.nota_faltando && l.estado === 'publicado').length;
  const concentrados = linhas.filter((l) => Number(l.votos) >= 20 && Number(l.maior_fatia) >= 0.6);

  const fecha = edicao?.fecha_em ? new Date(edicao.fecha_em) : null;
  const aberta = edicao?.estado === 'aberta' && fecha !== null && fecha > new Date();

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: t.text }}>Votos da Arena</h1>
          <p className="text-sm mt-1" style={{ color: t.textFaint }}>
            {edicao ? edicao.nome : 'Nenhuma edição criada'}
            {fecha && ` · ${aberta ? 'fecha' : 'fechou'} em ${fecha.toLocaleString('pt-BR')}`}
          </p>
        </div>
        <button
          onClick={() => void carregar()}
          className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg border"
          style={{ borderColor: t.border, color: t.textFaint }}
        >
          <RefreshCw size={15} className={carregando ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </div>

      {erro && (
        <p className="text-sm mb-4 p-3 rounded-lg" style={{ color: '#F5B84B', background: 'rgba(245,184,75,.08)' }}>
          {erro}
        </p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { rotulo: 'Votos', valor: String(total) },
          { rotulo: 'Projetos', valor: String(linhas.length) },
          { rotulo: 'Situação', valor: aberta ? 'Aberta' : 'Fechada' },
          { rotulo: 'Atualizado', valor: atualizadoEm ? atualizadoEm.toLocaleTimeString('pt-BR') : '-' },
        ].map((c) => (
          <div key={c.rotulo} className="p-3 rounded-xl border" style={{ borderColor: t.border, background: t.surface }}>
            <p className="text-[11px] uppercase tracking-wide" style={{ color: t.textFaint }}>{c.rotulo}</p>
            <p className="text-lg font-semibold mt-0.5" style={{ color: t.text }}>{c.valor}</p>
          </div>
        ))}
      </div>

      {/* Dois avisos que valem mais que a contagem. */}
      {semNota > 0 && (
        <p className="text-sm mb-3 flex items-start gap-2" style={{ color: '#F5B84B' }}>
          <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
          {semNota === 1 ? 'Um projeto publicado está' : `${semNota} projetos publicados estão`} sem
          nota lançada. A apuração não fecha enquanto faltar nota.
        </p>
      )}
      {concentrados.length > 0 && (
        <p className="text-sm mb-3 flex items-start gap-2" style={{ color: '#F5B84B' }}>
          <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
          {concentrados.map((l) => l.titulo).join(', ')}: mais de 60% dos votos vieram de uma
          única rede. Não prova fraude, mas é o que se olha primeiro numa contestação.
        </p>
      )}

      <div className="flex justify-end mb-2">
        <button
          onClick={() => setPorVotos((v) => !v)}
          className="text-xs px-2.5 py-1.5 rounded-lg border"
          style={{ borderColor: t.border, color: t.textFaint }}
        >
          {porVotos ? 'Ver na ordem dos projetos' : 'Ordenar por votos'}
        </button>
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: t.border }}>
        {mostradas.map((l, i) => (
          <div
            key={l.projeto_id}
            className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0"
            style={{ borderColor: t.border, background: i % 2 ? t.surface : t.surfaceAlt }}
          >
            <span className="text-xs w-6 flex-shrink-0" style={{ color: t.textFaint }}>
              {String(l.numero).padStart(2, '0')}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate" style={{ color: t.text }}>{l.titulo}</p>
              <div className="h-1.5 rounded-full mt-1.5 overflow-hidden" style={{ background: t.border }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${(Number(l.votos) / maior) * 100}%`, background: t.accent }}
                />
              </div>
            </div>
            <div className="text-right flex-shrink-0 w-14">
              <p className="text-base font-semibold" style={{ color: t.text }}>{l.votos}</p>
              <p className="text-[10px]" style={{ color: t.textFaint }}>
                {total > 0 ? `${Math.round((Number(l.votos) / total) * 100)}%` : '0%'}
              </p>
            </div>
            <div className="text-right flex-shrink-0 w-16 hidden sm:block">
              <p className="text-sm" style={{ color: t.textFaint }}>{l.redes_distintas}</p>
              <p className="text-[10px]" style={{ color: t.textFaint }}>redes</p>
            </div>
            <div className="text-right flex-shrink-0 w-16 hidden sm:block">
              <p className="text-sm" style={{ color: Number(l.maior_fatia) >= 0.6 && Number(l.votos) >= 20 ? '#F5B84B' : t.textFaint }}>
                {Math.round(Number(l.maior_fatia) * 100)}%
              </p>
              <p className="text-[10px]" style={{ color: t.textFaint }}>maior fatia</p>
            </div>
            <div className="text-right flex-shrink-0 w-12 hidden md:block">
              <p className="text-sm" style={{ color: l.nota_faltando ? '#F5B84B' : t.textFaint }}>
                {l.nota ?? '-'}
              </p>
              <p className="text-[10px]" style={{ color: t.textFaint }}>nota</p>
            </div>
          </div>
        ))}
        {!carregando && mostradas.length === 0 && (
          <p className="px-4 py-6 text-sm text-center" style={{ color: t.textFaint }}>
            Nenhum projeto publicado nesta edição.
          </p>
        )}
      </div>

      {edicao?.regra_resultado && (
        <div className="mt-5 p-3 rounded-xl border" style={{ borderColor: t.border }}>
          <p className="text-[11px] uppercase tracking-wide mb-1" style={{ color: t.textFaint }}>
            Regra do resultado, publicada antes da abertura
          </p>
          <p className="text-sm" style={{ color: t.textFaint }}>{edicao.regra_resultado}</p>
        </div>
      )}

      <p className="text-xs mt-4" style={{ color: t.textFaint }}>
        Ninguém mais enxerga esta tela. A tabela de votos não é legível por professor nem por
        admin, e o site público nunca devolve contagem. Os votos não identificam quem votou:
        o que existe é um resumo embaralhado do aparelho e da rede, apagado noventa dias
        depois do fechamento.
      </p>
    </div>
  );
}
