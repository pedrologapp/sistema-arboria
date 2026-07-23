// ============================================================
// ArboriaAndamentoPage (/arboria/andamento) — o dono ve a fase atual de cada
// turma e pode VOLTAR a fase (reset), sem depender do CEO mexer no banco.
// Pedido do Fundador 23/07 (finaliza fase sem querer testando).
//
// SEGURO: chama a RPC arboria_resetar_fase (super_admin gated), que NUNCA toca
// observacoes. So muda a posicao (turma_trilha.ordem_atual) e limpa os eventos
// posteriores. Mapa de fase = canonico (ordem == inteligencia_id); turmas com
// trilha custom sao raras no F1/Infantil e o reset por posicao funciona igual.
// ============================================================
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { infantilTheme as t } from '@/styles/infantilTheme';
import { RotateCcw, Loader2, Check, X } from 'lucide-react';

const INTELIGENCIAS = [
  { id: 1, nome: 'Linguística', cor: '#1E3A8A' },
  { id: 2, nome: 'Lógico-Matemática', cor: '#047857' },
  { id: 3, nome: 'Espacial', cor: '#7C3AED' },
  { id: 4, nome: 'Musical', cor: '#7F1D1D' },
  { id: 5, nome: 'Corporal-Cinestésica', cor: '#B8860B' },
  { id: 6, nome: 'Naturalista', cor: '#78350F' },
  { id: 7, nome: 'Interpessoal', cor: '#0891B2' },
  { id: 8, nome: 'Intrapessoal', cor: '#EA580C' },
];
const faseNome = (ordem: number) => INTELIGENCIAS.find((i) => i.id === ordem)?.nome ?? null;
const faseCor = (ordem: number) => INTELIGENCIAS.find((i) => i.id === ordem)?.cor ?? t.textMuted;

const SEG_LABEL: Record<string, string> = {
  infantil: 'Educação Infantil', fundamental1: 'Fundamental 1', fundamental2: 'Fundamental 2',
};
const SEG_ORDEM = ['infantil', 'fundamental1', 'fundamental2'];

interface Instituicao { id: string; name: string }
interface TurmaAndamento { id: string; nome: string; serie: string | null; segmento: string | null; ordem_atual: number }

const fromAny = (tb: string) =>
  (supabase.from as never as (tb: string) => ReturnType<typeof supabase.from>)(tb);

const ArboriaAndamentoPage = () => {
  const [instituicoes, setInstituicoes] = useState<Instituicao[]>([]);
  const [instSel, setInstSel] = useState<string | null>(null);
  const [turmas, setTurmas] = useState<TurmaAndamento[] | null>(null);
  const [resetando, setResetando] = useState<TurmaAndamento | null>(null);
  const [ordemAlvo, setOrdemAlvo] = useState<number>(1);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('institutions').select('id, name').order('name');
      setInstituicoes((data as Instituicao[]) ?? []);
      if (data?.[0]) setInstSel(data[0].id);
    })();
  }, []);

  const carregar = async () => {
    if (!instSel) return;
    setTurmas(null);
    const anoLetivo = new Date().getFullYear();
    const [{ data: trms }, { data: trilhas }] = await Promise.all([
      supabase.from('turmas').select('id, nome, serie, segmento').eq('institution_id', instSel),
      fromAny('turma_trilha').select('turma_id, ordem_atual').eq('institution_id', instSel).eq('ano_letivo', anoLetivo),
    ]);
    const ordemMap = new Map<string, number>(
      ((trilhas as unknown as { turma_id: string; ordem_atual: number }[]) ?? []).map((r) => [r.turma_id, r.ordem_atual])
    );
    const lista = ((trms as { id: string; nome: string; serie: string | null; segmento: string | null }[]) ?? []).map((tt) => ({
      ...tt, ordem_atual: ordemMap.get(tt.id) ?? 0,
    }));
    lista.sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR'));
    setTurmas(lista);
  };
  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, [instSel]);

  const gruposPorSegmento = useMemo(() => {
    const m = new Map<string, TurmaAndamento[]>();
    for (const tt of turmas ?? []) {
      const seg = tt.segmento ?? 'outros';
      (m.get(seg) ?? m.set(seg, []).get(seg)!).push(tt);
    }
    return [...m.entries()].sort((a, b) => SEG_ORDEM.indexOf(a[0]) - SEG_ORDEM.indexOf(b[0]));
  }, [turmas]);

  const abrirReset = (tt: TurmaAndamento) => {
    setResetando(tt);
    setOrdemAlvo(Math.max(1, tt.ordem_atual - 1)); // sugere voltar uma fase
  };

  const confirmarReset = async () => {
    if (!resetando || busy) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc('arboria_resetar_fase' as never, {
        p_turma_id: resetando.id,
        p_ordem_alvo: ordemAlvo,
      } as never);
      if (error) throw error;
      if (!(data as { ok?: boolean })?.ok) throw new Error('Falha ao resetar');
      toast.success(
        ordemAlvo === 0
          ? `${resetando.nome}: voltou para "não iniciada".`
          : `${resetando.nome}: voltou para a fase ${faseNome(ordemAlvo)}.`
      );
      setResetando(null);
      carregar();
    } catch (e) {
      toast.error((e as Error).message || 'Erro ao resetar');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="mb-1">
        <h1 className="font-serif text-[22px]" style={{ color: t.text }}>Andamento das turmas</h1>
        <p className="text-[12px]" style={{ color: t.textFaint }}>
          Veja a fase atual de cada turma e volte a fase se alguma foi finalizada sem querer. Não afeta observações.
        </p>
      </div>

      <div className="my-4">
        <select
          value={instSel ?? ''}
          onChange={(e) => setInstSel(e.target.value || null)}
          className="rounded-lg px-3 py-2 text-[13px]"
          style={{ background: t.surface, border: `1px solid ${t.border}`, color: t.text }}
        >
          {instituicoes.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
      </div>

      {turmas === null ? (
        <p className="text-[13px]" style={{ color: t.textFaint }}>Carregando...</p>
      ) : (
        gruposPorSegmento.map(([seg, lista]) => (
          <section key={seg} className="mb-5">
            <h2 className="text-[10px] uppercase tracking-[0.2em] mb-2" style={{ color: t.textMuted }}>
              {SEG_LABEL[seg] || seg}
            </h2>
            <div className="space-y-1.5">
              {lista.map((tt) => {
                const nome = tt.ordem_atual === 0 ? 'Não iniciada' : (faseNome(tt.ordem_atual) ?? `Posição ${tt.ordem_atual}`);
                const cor = tt.ordem_atual === 0 ? t.textFaint : faseCor(tt.ordem_atual);
                return (
                  <div
                    key={tt.id}
                    className="rounded-xl p-3 flex items-center gap-3"
                    style={{ backgroundColor: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadowSm }}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium" style={{ color: t.text }}>{tt.nome}</p>
                      <p className="text-[11.5px]" style={{ color: t.textFaint }}>
                        Fase atual: <span style={{ color: cor, fontWeight: 600 }}>{nome}</span>
                        {tt.ordem_atual > 0 && <span style={{ color: t.textFaint }}> · posição {tt.ordem_atual} de 8</span>}
                      </p>
                    </div>
                    <button
                      onClick={() => abrirReset(tt)}
                      disabled={tt.ordem_atual === 0}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold disabled:opacity-40"
                      style={{ backgroundColor: t.accentSoft, color: t.accentText, border: `1px solid ${t.accentBorder}` }}
                    >
                      <RotateCcw size={14} /> Voltar fase
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        ))
      )}

      {/* Modal de reset */}
      {resetando && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(28,34,48,0.45)' }}
          onClick={() => !busy && setResetando(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl p-5"
            style={{ backgroundColor: t.surface, boxShadow: t.shadowLg }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-1">
              <div>
                <p className="text-[10.5px] font-semibold uppercase tracking-wide" style={{ color: t.accentText }}>Voltar fase</p>
                <h3 className="font-serif text-[18px] font-semibold" style={{ color: t.text }}>{resetando.nome}</h3>
              </div>
              <button onClick={() => setResetando(null)} aria-label="Fechar" style={{ color: t.textMuted }}><X size={18} /></button>
            </div>
            <p className="text-[12px] mb-3" style={{ color: t.textFaint }}>
              Escolha a fase para onde a turma volta. A fase escolhida fica ativa (não finalizada). As observações registradas não são apagadas.
            </p>
            <div className="flex flex-wrap gap-1.5 mb-4">
              <button
                onClick={() => setOrdemAlvo(0)}
                className="px-2.5 py-1 rounded-full text-[11.5px] font-medium"
                style={ordemAlvo === 0 ? { background: t.textMuted, color: '#fff' } : { background: t.surfaceSunken, color: t.textMuted, border: `1px solid ${t.border}` }}
              >
                Não iniciada
              </button>
              {INTELIGENCIAS.map((i) => {
                const marcada = ordemAlvo === i.id;
                const futura = i.id > resetando.ordem_atual; // não deixa "avançar" por aqui
                return (
                  <button
                    key={i.id}
                    disabled={futura}
                    onClick={() => setOrdemAlvo(i.id)}
                    className="px-2.5 py-1 rounded-full text-[11.5px] font-medium disabled:opacity-30"
                    style={marcada ? { background: i.cor, color: '#fff' } : { background: t.surfaceSunken, color: t.textMuted, border: `1px solid ${t.border}` }}
                    title={futura ? 'Use a virada de fase normal para avançar' : undefined}
                  >
                    {i.id}. {i.nome}
                  </button>
                );
              })}
            </div>
            <button
              onClick={confirmarReset}
              disabled={busy}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[13.5px] font-semibold text-white disabled:opacity-50"
              style={{ background: t.accent }}
            >
              {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Voltando</> : <><Check className="w-4 h-4" /> Voltar {resetando.nome} para {ordemAlvo === 0 ? 'não iniciada' : faseNome(ordemAlvo)}</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArboriaAndamentoPage;
