import { useEffect, useMemo, useState, useRef } from 'react';
import { Plus, PenLine, FileText, X, Loader2, ChevronUp, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { infantilTheme as t } from '@/styles/infantilTheme';

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

interface Atividade {
  id: string;
  institution_id: string;
  inteligencia_id: number;
  faixa: string | null;
  ordem: number;
  nome: string;
  objetivo: string | null;
  materiais: string | null;
  como_conduzir: string | null;
  o_que_observar: string | null;
  pdf_url: string | null;
  ativo: boolean;
}

interface Instituicao {
  id: string;
  name: string;
}

const fromAny = (tb: string) =>
  (supabase.from as never as (tb: string) => ReturnType<typeof supabase.from>)(tb);

const VAZIA = {
  nome: '',
  faixa: '',
  objetivo: '',
  materiais: '',
  como_conduzir: '',
  o_que_observar: '',
};

/**
 * BANCO DE ATIVIDADES (Painel Arboria): o dono cadastra a atividade de cada
 * exploração; as professoras consomem no cockpit e na aula.
 */
const ArboriaAtividadesPage = () => {
  const [instituicoes, setInstituicoes] = useState<Instituicao[]>([]);
  const [instSel, setInstSel] = useState<string | null>(null);
  const [intelSel, setIntelSel] = useState(1);
  const [atividades, setAtividades] = useState<Atividade[] | null>(null);

  const [editando, setEditando] = useState<Atividade | 'nova' | null>(null);
  const [form, setForm] = useState(VAZIA);
  const [pdf, setPdf] = useState<File | null>(null);
  const [salvando, setSalvando] = useState(false);
  const pdfRef = useRef<HTMLInputElement>(null);

  const intel = INTELIGENCIAS.find((i) => i.id === intelSel)!;

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('institutions').select('id, name').order('name');
      if (error) {
        toast.error('Erro ao listar escolas: rode as migrations do Painel Arboria.');
        return;
      }
      setInstituicoes((data as Instituicao[]) ?? []);
      if (data?.[0]) setInstSel(data[0].id);
    })();
  }, []);

  const carregar = async () => {
    if (!instSel) return;
    setAtividades(null);
    const { data, error } = await fromAny('atividades')
      .select('*')
      .eq('institution_id', instSel)
      .eq('inteligencia_id', intelSel)
      .order('ordem');
    if (error) {
      toast.error(error.message);
      setAtividades([]);
      return;
    }
    setAtividades((data as unknown as Atividade[]) ?? []);
  };

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instSel, intelSel]);

  const abrirNova = () => {
    setForm(VAZIA);
    setPdf(null);
    setEditando('nova');
  };

  const abrirEdicao = (a: Atividade) => {
    setForm({
      nome: a.nome,
      faixa: a.faixa ?? '',
      objetivo: a.objetivo ?? '',
      materiais: a.materiais ?? '',
      como_conduzir: a.como_conduzir ?? '',
      o_que_observar: a.o_que_observar ?? '',
    });
    setPdf(null);
    setEditando(a);
  };

  const salvar = async () => {
    if (!instSel || !form.nome.trim() || salvando) return;
    setSalvando(true);
    try {
      let pdfUrl: string | null = editando !== 'nova' && editando ? editando.pdf_url : null;
      if (pdf) {
        const path = `${instSel}/${intelSel}/${Date.now()}-${pdf.name.replace(/[^\w.\-]/g, '_')}`;
        const { error: upErr } = await supabase.storage.from('atividades').upload(path, pdf);
        if (upErr) throw upErr;
        pdfUrl = supabase.storage.from('atividades').getPublicUrl(path).data.publicUrl;
      }

      const payload = {
        nome: form.nome.trim(),
        faixa: form.faixa.trim() || null,
        objetivo: form.objetivo.trim() || null,
        materiais: form.materiais.trim() || null,
        como_conduzir: form.como_conduzir.trim() || null,
        o_que_observar: form.o_que_observar.trim() || null,
        pdf_url: pdfUrl,
      };

      if (editando === 'nova') {
        const proximaOrdem = (atividades?.length ?? 0) + 1;
        const { error } = await fromAny('atividades').insert({
          ...payload,
          institution_id: instSel,
          inteligencia_id: intelSel,
          ordem: proximaOrdem,
        } as never);
        if (error) throw error;
        toast.success('Atividade cadastrada.');
      } else if (editando) {
        const { error } = await fromAny('atividades')
          .update({ ...payload, updated_at: new Date().toISOString() } as never)
          .eq('id', editando.id);
        if (error) throw error;
        toast.success('Atividade atualizada.');
      }
      setEditando(null);
      carregar();
    } catch (e) {
      toast.error((e as Error).message || 'Erro ao salvar.');
    } finally {
      setSalvando(false);
    }
  };

  const mover = async (a: Atividade, direcao: -1 | 1) => {
    if (!atividades) return;
    const idx = atividades.findIndex((x) => x.id === a.id);
    const vizinho = atividades[idx + direcao];
    if (!vizinho) return;
    await Promise.all([
      fromAny('atividades').update({ ordem: vizinho.ordem } as never).eq('id', a.id),
      fromAny('atividades').update({ ordem: a.ordem } as never).eq('id', vizinho.id),
    ]);
    carregar();
  };

  const alternarAtiva = async (a: Atividade) => {
    await fromAny('atividades').update({ ativo: !a.ativo } as never).eq('id', a.id);
    carregar();
  };

  const campos: { chave: keyof typeof VAZIA; label: string; multi?: boolean; dica?: string }[] = useMemo(
    () => [
      { chave: 'nome', label: 'Nome da atividade' },
      { chave: 'faixa', label: 'Faixa (opcional)', dica: 'Ex.: Maternal II, Grupo IV. Vazio = todas.' },
      { chave: 'objetivo', label: 'Objetivo', multi: true },
      { chave: 'materiais', label: 'Materiais', multi: true },
      { chave: 'como_conduzir', label: 'Como conduzir', multi: true },
      {
        chave: 'o_que_observar',
        label: 'O que observar',
        multi: true,
        dica: 'Vira o convite "Pra reparar hoje" na aula da professora. Cenas concretas, uma por linha.',
      },
    ],
    []
  );

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-1">
        <h1 className="font-serif text-[22px]" style={{ color: t.text }}>
          Banco de atividades
        </h1>
        <button
          onClick={abrirNova}
          className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold flex-shrink-0"
          style={{ backgroundColor: t.accent, color: '#FFFFFF', boxShadow: t.shadowSm }}
        >
          <Plus size={15} /> Nova atividade
        </button>
      </div>
      <p className="text-sm mb-4" style={{ color: t.textMuted }}>
        O caminho de cada exploração, na ordem em que as turmas vão percorrer.
      </p>

      {instituicoes.length > 1 && (
        <select
          value={instSel ?? ''}
          onChange={(e) => setInstSel(e.target.value)}
          className="mb-3 rounded-xl px-3 py-2 text-sm w-full sm:w-auto"
          style={{ backgroundColor: t.surface, border: `1px solid ${t.border}`, color: t.text }}
        >
          {instituicoes.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </select>
      )}

      {/* Seletor das 8 */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4">
        {INTELIGENCIAS.map((i) => {
          const ativa = i.id === intelSel;
          return (
            <button
              key={i.id}
              onClick={() => setIntelSel(i.id)}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold flex-shrink-0 transition-all"
              style={
                ativa
                  ? { backgroundColor: i.cor, color: '#FFFFFF', boxShadow: t.shadowSm }
                  : { backgroundColor: t.surface, color: t.textMuted, border: `1px solid ${t.border}` }
              }
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: ativa ? '#FFFFFF' : i.cor }}
              />
              {i.nome}
            </button>
          );
        })}
      </div>

      {/* Lista */}
      {atividades === null ? (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
        </div>
      ) : atividades.length === 0 ? (
        <div
          className="rounded-2xl p-8 text-center"
          style={{ backgroundColor: t.surface, border: `1px dashed ${t.silencio}` }}
        >
          <p className="text-sm" style={{ color: t.textMuted }}>
            Nenhuma atividade na Exploração {intel.nome} ainda.
          </p>
          <button
            onClick={abrirNova}
            className="mt-3 rounded-full px-4 py-2 text-xs font-semibold"
            style={{ backgroundColor: t.accent, color: '#FFFFFF' }}
          >
            Cadastrar a primeira
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {atividades.map((a, idx) => (
            <div
              key={a.id}
              className="rounded-2xl p-3.5 flex items-center gap-3"
              style={{
                backgroundColor: t.surface,
                border: `1px solid ${t.border}`,
                borderLeft: `3px solid ${intel.cor}`,
                boxShadow: t.shadowSm,
                opacity: a.ativo ? 1 : 0.55,
              }}
            >
              <span
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                style={{ backgroundColor: `${intel.cor}18`, color: intel.cor }}
              >
                {idx + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate" style={{ color: t.text }}>
                  {a.nome}
                  {!a.ativo && (
                    <span className="ml-2 text-[10px] uppercase font-bold" style={{ color: t.textFaint }}>
                      inativa
                    </span>
                  )}
                </p>
                <p className="text-xs truncate" style={{ color: t.textFaint }}>
                  {a.faixa ? `${a.faixa} · ` : ''}
                  {a.objetivo || 'Sem objetivo cadastrado'}
                  {a.pdf_url ? ' · PDF anexado' : ''}
                </p>
              </div>
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <button onClick={() => mover(a, -1)} disabled={idx === 0} className="p-1.5 disabled:opacity-25" style={{ color: t.textFaint }} aria-label="Subir">
                  <ChevronUp size={16} />
                </button>
                <button onClick={() => mover(a, 1)} disabled={idx === atividades.length - 1} className="p-1.5 disabled:opacity-25" style={{ color: t.textFaint }} aria-label="Descer">
                  <ChevronDown size={16} />
                </button>
                <button onClick={() => abrirEdicao(a)} className="p-2" style={{ color: t.accent }} aria-label="Editar">
                  <PenLine size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de cadastro/edição */}
      {editando && (
        <div
          className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 overflow-y-auto backdrop-blur-md"
          style={{ backgroundColor: 'rgba(28,34,48,0.30)' }}
          onClick={() => !salvando && setEditando(null)}
        >
          <div
            className="w-full max-w-xl rounded-2xl overflow-hidden my-6"
            style={{ backgroundColor: t.surface, boxShadow: t.shadowLg }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ height: 3, backgroundColor: intel.cor }} />
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[10.5px] uppercase tracking-wide font-bold" style={{ color: intel.cor }}>
                    Exploração {intel.nome}
                  </p>
                  <h2 className="text-lg font-bold" style={{ color: t.text }}>
                    {editando === 'nova' ? 'Nova atividade' : 'Editar atividade'}
                  </h2>
                </div>
                <button onClick={() => setEditando(null)} className="p-2 -m-2" style={{ color: t.textFaint }} aria-label="Fechar">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3">
                {campos.map((c) => (
                  <div key={c.chave}>
                    <label className="block text-xs font-semibold mb-1" style={{ color: t.textMuted }}>
                      {c.label}
                    </label>
                    {c.multi ? (
                      <textarea
                        value={form[c.chave]}
                        onChange={(e) => setForm((f) => ({ ...f, [c.chave]: e.target.value }))}
                        rows={3}
                        className="w-full rounded-xl p-3 text-sm resize-y focus:outline-none focus-visible:ring-2"
                        style={{
                          backgroundColor: t.surfaceSunken,
                          border: `1px solid ${t.border}`,
                          color: t.text,
                          ['--tw-ring-color' as string]: t.accent,
                        }}
                      />
                    ) : (
                      <input
                        value={form[c.chave]}
                        onChange={(e) => setForm((f) => ({ ...f, [c.chave]: e.target.value }))}
                        className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none focus-visible:ring-2"
                        style={{
                          backgroundColor: t.surfaceSunken,
                          border: `1px solid ${t.border}`,
                          color: t.text,
                          ['--tw-ring-color' as string]: t.accent,
                        }}
                      />
                    )}
                    {c.dica && (
                      <p className="text-[11px] mt-1" style={{ color: t.textFaint }}>
                        {c.dica}
                      </p>
                    )}
                  </div>
                ))}

                {/* PDF */}
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: t.textMuted }}>
                    PDF da atividade (opcional)
                  </label>
                  <input
                    ref={pdfRef}
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={(e) => setPdf(e.target.files?.[0] ?? null)}
                  />
                  <button
                    onClick={() => pdfRef.current?.click()}
                    className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm w-full"
                    style={{ backgroundColor: t.surfaceSunken, border: `1px dashed ${t.silencio}`, color: t.textMuted }}
                  >
                    <FileText size={16} />
                    {pdf
                      ? pdf.name
                      : editando !== 'nova' && editando?.pdf_url
                        ? 'PDF anexado (toque pra trocar)'
                        : 'Anexar PDF'}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-5">
                {editando !== 'nova' && (
                  <button
                    onClick={() => {
                      alternarAtiva(editando as Atividade);
                      setEditando(null);
                    }}
                    className="rounded-xl px-3.5 py-3 text-xs font-semibold"
                    style={{ backgroundColor: 'transparent', color: t.textFaint, border: `1px solid ${t.border}` }}
                  >
                    {(editando as Atividade).ativo ? 'Desativar' : 'Reativar'}
                  </button>
                )}
                <button
                  onClick={salvar}
                  disabled={!form.nome.trim() || salvando}
                  className="flex-1 rounded-xl py-3 text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ backgroundColor: t.accent, color: '#FFFFFF', boxShadow: t.shadowMd }}
                >
                  {salvando && <Loader2 size={15} className="animate-spin" />}
                  {editando === 'nova' ? 'Cadastrar' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArboriaAtividadesPage;
