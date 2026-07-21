import { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, PenLine, FileText, X, Loader2, ChevronUp, ChevronDown, ChevronRight, Upload } from 'lucide-react';
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

const TODAS = 'Todas as séries';

// Do Maternal ao 9º ano (nomes idênticos aos das turmas no banco)
const SERIES_ESCOLA = [
  'Maternal 2',
  'Maternal 3',
  'Grupo IV',
  'Grupo V',
  '1º Ano',
  '2º Ano',
  '3º Ano',
  '4º Ano',
  '5º Ano',
  '6º Ano',
  '7º Ano',
  '8º Ano',
  '9º Ano',
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
  objetivo: '',
  materiais: '',
  como_conduzir: '',
  o_que_observar: '',
};

/**
 * BANCO DE ATIVIDADES (Painel Arboria): navegação em COLUNAS EM CASCATA
 * (pedido do Fundador 04/07): coluna 1 = inteligências, coluna 2 = séries
 * (Maternal ao 9º ano), coluna 3 = as atividades daquele cruzamento.
 * O + cadastra escolhendo inteligência e série no próprio formulário.
 */
const ArboriaAtividadesPage = () => {
  const navigate = useNavigate();
  const [instituicoes, setInstituicoes] = useState<Instituicao[]>([]);
  const [instSel, setInstSel] = useState<string | null>(null);
  const [atividades, setAtividades] = useState<Atividade[] | null>(null);

  const [intelSel, setIntelSel] = useState(1);
  const [serieSel, setSerieSel] = useState<string>(TODAS);

  const [editando, setEditando] = useState<Atividade | 'nova' | null>(null);
  const [form, setForm] = useState(VAZIA);
  const [formIntel, setFormIntel] = useState(1);
  const [formFaixa, setFormFaixa] = useState<string>(TODAS);
  const [pdf, setPdf] = useState<File | null>(null);
  const [salvando, setSalvando] = useState(false);
  const pdfRef = useRef<HTMLInputElement>(null);

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
  }, [instSel]);

  const chaveFaixa = (a: Atividade) => a.faixa ?? TODAS;

  const contagemIntel = useMemo(() => {
    const m = new Map<number, number>();
    for (const a of atividades ?? []) m.set(a.inteligencia_id, (m.get(a.inteligencia_id) ?? 0) + 1);
    return m;
  }, [atividades]);

  const contagemSerie = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of atividades ?? []) {
      if (a.inteligencia_id !== intelSel) continue;
      m.set(chaveFaixa(a), (m.get(chaveFaixa(a)) ?? 0) + 1);
    }
    return m;
  }, [atividades, intelSel]);

  const listaAtual = useMemo(
    () =>
      (atividades ?? [])
        .filter((a) => a.inteligencia_id === intelSel && chaveFaixa(a) === serieSel)
        .sort((a, b) => a.ordem - b.ordem),
    [atividades, intelSel, serieSel]
  );

  const intel = INTELIGENCIAS.find((i) => i.id === intelSel)!;
  const intelForm = INTELIGENCIAS.find((i) => i.id === formIntel)!;

  const abrirNova = (preIntel?: number, preFaixa?: string) => {
    setForm(VAZIA);
    setFormIntel(preIntel ?? intelSel);
    setFormFaixa(preFaixa ?? serieSel);
    setPdf(null);
    setEditando('nova');
  };

  const abrirEdicao = (a: Atividade) => {
    setForm({
      nome: a.nome,
      objetivo: a.objetivo ?? '',
      materiais: a.materiais ?? '',
      como_conduzir: a.como_conduzir ?? '',
      o_que_observar: a.o_que_observar ?? '',
    });
    setFormIntel(a.inteligencia_id);
    setFormFaixa(a.faixa ?? TODAS);
    setPdf(null);
    setEditando(a);
  };

  const salvar = async () => {
    if (!instSel || !form.nome.trim() || salvando) return;
    setSalvando(true);
    try {
      let pdfUrl: string | null = editando !== 'nova' && editando ? editando.pdf_url : null;
      if (pdf) {
        const path = `${instSel}/${formIntel}/${Date.now()}-${pdf.name.replace(/[^\w.\-]/g, '_')}`;
        const { error: upErr } = await supabase.storage.from('atividades').upload(path, pdf);
        if (upErr) throw upErr;
        pdfUrl = supabase.storage.from('atividades').getPublicUrl(path).data.publicUrl;
      }

      const payload = {
        nome: form.nome.trim(),
        inteligencia_id: formIntel,
        faixa: formFaixa === TODAS ? null : formFaixa,
        objetivo: form.objetivo.trim() || null,
        materiais: form.materiais.trim() || null,
        como_conduzir: form.como_conduzir.trim() || null,
        o_que_observar: form.o_que_observar.trim() || null,
        pdf_url: pdfUrl,
      };

      if (editando === 'nova') {
        const grupo = (atividades ?? []).filter(
          (a) => a.inteligencia_id === formIntel && chaveFaixa(a) === formFaixa
        );
        const { error } = await fromAny('atividades').insert({
          ...payload,
          institution_id: instSel,
          ordem: grupo.length + 1,
        } as never);
        if (error) throw error;
        toast.success('Atividade cadastrada.');
        setIntelSel(formIntel);
        setSerieSel(formFaixa);
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
    const idx = listaAtual.findIndex((x) => x.id === a.id);
    const vizinho = listaAtual[idx + direcao];
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

  const colunaCss = {
    backgroundColor: t.surface,
    border: `1px solid ${t.border}`,
    boxShadow: t.shadowSm,
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-1">
        <h1 className="font-serif text-[22px]" style={{ color: t.text }}>
          Banco de atividades
        </h1>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => navigate('/arboria/atividades/importar')}
            className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold"
            style={{ backgroundColor: t.accentSoft, color: t.accentText, border: `1px solid ${t.accentBorder}` }}
          >
            <Upload size={15} /> Importar PDF
          </button>
          <button
            onClick={() => abrirNova()}
            className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold"
            style={{ backgroundColor: t.accent, color: '#FFFFFF', boxShadow: t.shadowSm }}
          >
            <Plus size={15} /> Nova atividade
          </button>
        </div>
      </div>
      <p className="text-sm mb-4" style={{ color: t.textMuted }}>
        Inteligência, depois a série, depois o caminho de atividades.
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

      {atividades === null ? (
        <div className="flex gap-3">
          <Skeleton className="h-72 w-52 rounded-2xl" />
          <Skeleton className="h-72 w-44 rounded-2xl" />
          <Skeleton className="h-72 flex-1 rounded-2xl" />
        </div>
      ) : (
        /* AS TRÊS COLUNAS EM CASCATA */
        <div className="flex gap-3 overflow-x-auto pb-2 items-start">
          {/* Coluna 1: inteligências */}
          <div className="w-52 flex-shrink-0 rounded-2xl overflow-hidden" style={colunaCss}>
            {INTELIGENCIAS.map((i) => {
              const ativa = i.id === intelSel;
              const total = contagemIntel.get(i.id) ?? 0;
              return (
                <button
                  key={i.id}
                  onClick={() => {
                    setIntelSel(i.id);
                    setSerieSel(TODAS);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors"
                  style={{
                    backgroundColor: ativa ? `${i.cor}12` : 'transparent',
                    borderLeft: `3px solid ${ativa ? i.cor : 'transparent'}`,
                    borderBottom: `1px solid ${t.surfaceAlt}`,
                  }}
                >
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: i.cor }} />
                  <span
                    className="flex-1 text-[13px] truncate"
                    style={{ color: ativa ? t.text : t.textMuted, fontWeight: ativa ? 700 : 500 }}
                  >
                    {i.nome}
                  </span>
                  {total > 0 && (
                    <span className="text-[10.5px] font-semibold" style={{ color: t.textFaint }}>
                      {total}
                    </span>
                  )}
                  {ativa && <ChevronRight size={14} style={{ color: i.cor }} />}
                </button>
              );
            })}
          </div>

          {/* Coluna 2: séries (Maternal ao 9º ano) */}
          <div className="w-44 flex-shrink-0 rounded-2xl overflow-hidden" style={colunaCss}>
            {[TODAS, ...SERIES_ESCOLA].map((s) => {
              const ativa = s === serieSel;
              const total = contagemSerie.get(s) ?? 0;
              return (
                <button
                  key={s}
                  onClick={() => setSerieSel(s)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left transition-colors"
                  style={{
                    backgroundColor: ativa ? `${intel.cor}12` : 'transparent',
                    borderLeft: `3px solid ${ativa ? intel.cor : 'transparent'}`,
                    borderBottom: `1px solid ${t.surfaceAlt}`,
                  }}
                >
                  <span
                    className="flex-1 text-[12.5px] truncate"
                    style={{
                      color: ativa ? t.text : total > 0 ? t.textMuted : t.textFaint,
                      fontWeight: ativa ? 700 : 500,
                      fontStyle: s === TODAS ? 'italic' : 'normal',
                    }}
                  >
                    {s}
                  </span>
                  {total > 0 && (
                    <span
                      className="text-[10px] font-bold rounded-full px-1.5 py-0.5"
                      style={{ backgroundColor: `${intel.cor}18`, color: intel.cor }}
                    >
                      {total}
                    </span>
                  )}
                  {ativa && <ChevronRight size={13} style={{ color: intel.cor }} />}
                </button>
              );
            })}
          </div>

          {/* Coluna 3: as atividades do cruzamento */}
          <div className="flex-1 min-w-[300px] rounded-2xl p-3.5" style={colunaCss}>
            <div className="flex items-center justify-between gap-2 mb-3">
              <p className="text-[11px] uppercase tracking-wide font-bold truncate" style={{ color: intel.cor }}>
                {intel.nome} · {serieSel}
              </p>
              <button
                onClick={() => abrirNova(intelSel, serieSel)}
                className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold flex-shrink-0"
                style={{ backgroundColor: `${intel.cor}14`, color: intel.cor }}
              >
                <Plus size={12} /> aqui
              </button>
            </div>

            {listaAtual.length === 0 ? (
              <div className="rounded-xl p-6 text-center" style={{ border: `1px dashed ${t.silencio}` }}>
                <p className="text-sm" style={{ color: t.textMuted }}>
                  Nenhuma atividade em {intel.nome} · {serieSel}.
                </p>
                <button
                  onClick={() => abrirNova(intelSel, serieSel)}
                  className="mt-2.5 rounded-full px-4 py-2 text-xs font-semibold"
                  style={{ backgroundColor: intel.cor, color: '#FFFFFF' }}
                >
                  Cadastrar a primeira
                </button>
              </div>
            ) : (
              <div className="space-y-1.5">
                {listaAtual.map((a, idx) => (
                  <div
                    key={a.id}
                    className="rounded-xl p-2.5 flex items-center gap-2.5"
                    style={{
                      backgroundColor: t.surfaceAlt,
                      border: `1px solid ${t.border}`,
                      opacity: a.ativo ? 1 : 0.55,
                    }}
                  >
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                      style={{ backgroundColor: `${intel.cor}18`, color: intel.cor }}
                    >
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate" style={{ color: t.text }}>
                        {a.nome}
                        {!a.ativo && (
                          <span className="ml-2 text-[10px] uppercase font-bold" style={{ color: t.textFaint }}>
                            inativa
                          </span>
                        )}
                      </p>
                      <p className="text-[11px] truncate" style={{ color: t.textFaint }}>
                        {a.objetivo || 'Sem objetivo cadastrado'}
                        {a.pdf_url ? ' · PDF' : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-0 flex-shrink-0">
                      <button
                        onClick={() => mover(a, -1)}
                        disabled={idx === 0}
                        className="p-1.5 disabled:opacity-25"
                        style={{ color: t.textFaint }}
                        aria-label="Subir"
                      >
                        <ChevronUp size={15} />
                      </button>
                      <button
                        onClick={() => mover(a, 1)}
                        disabled={idx === listaAtual.length - 1}
                        className="p-1.5 disabled:opacity-25"
                        style={{ color: t.textFaint }}
                        aria-label="Descer"
                      >
                        <ChevronDown size={15} />
                      </button>
                      <button
                        onClick={() => abrirEdicao(a)}
                        className="p-2"
                        style={{ color: t.accent }}
                        aria-label="Editar"
                      >
                        <PenLine size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
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
            <div style={{ height: 3, backgroundColor: intelForm.cor, transition: 'background-color 300ms' }} />
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold" style={{ color: t.text }}>
                  {editando === 'nova' ? 'Nova atividade' : 'Editar atividade'}
                </h2>
                <button
                  onClick={() => setEditando(null)}
                  className="p-2 -m-2"
                  style={{ color: t.textFaint }}
                  aria-label="Fechar"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: t.textMuted }}>
                      Inteligência
                    </label>
                    <select
                      value={formIntel}
                      onChange={(e) => setFormIntel(Number(e.target.value))}
                      className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                      style={{
                        backgroundColor: t.surfaceSunken,
                        border: `1px solid ${intelForm.cor}`,
                        color: t.text,
                      }}
                    >
                      {INTELIGENCIAS.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: t.textMuted }}>
                      Série (faixa)
                    </label>
                    <select
                      value={formFaixa}
                      onChange={(e) => setFormFaixa(e.target.value)}
                      className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                      style={{
                        backgroundColor: t.surfaceSunken,
                        border: `1px solid ${t.border}`,
                        color: t.text,
                      }}
                    >
                      <option value={TODAS}>{TODAS}</option>
                      {SERIES_ESCOLA.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

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
