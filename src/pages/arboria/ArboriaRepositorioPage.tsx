// ============================================================
// ArboriaRepositorioPage (/arboria/repositorio) — o repositório do dono por
// inteligência. Barra vertical com as 8 (+ abas custom); ao clicar, ve/adiciona
// IDEIAS (texto) e ARQUIVOS. So super_admin. Pedido do Fundador 25/07.
// ============================================================
import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { infantilTheme as t } from '@/styles/infantilTheme';
import { Plus, X, Trash2, Paperclip, Download, Lightbulb, Loader2, Check } from 'lucide-react';

interface Espaco { id: string; nome: string; cor: string | null; inteligencia_id: number | null; ordem: number }
interface Item { id: string; espaco_id: string; tipo: 'ideia' | 'arquivo'; texto: string | null; arquivo_nome: string | null; arquivo_path: string | null; created_at: string }

const fromAny = (tb: string) =>
  (supabase.from as never as (tb: string) => ReturnType<typeof supabase.from>)(tb);

const CORES_NOVA = ['#4F46E5', '#0891B2', '#047857', '#B8860B', '#7C3AED', '#7F1D1D', '#78350F', '#EA580C'];

const ArboriaRepositorioPage = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [espacos, setEspacos] = useState<Espaco[]>([]);
  const [selId, setSelId] = useState<string | null>(null);
  const [itens, setItens] = useState<Item[] | null>(null);
  const [novaIdeia, setNovaIdeia] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [subindo, setSubindo] = useState(false);
  const [novaAba, setNovaAba] = useState(false);
  const [nomeAba, setNomeAba] = useState('');
  const [corAba, setCorAba] = useState(CORES_NOVA[0]);

  const carregarEspacos = async () => {
    const { data } = await fromAny('arboria_espacos').select('id, nome, cor, inteligencia_id, ordem').order('ordem', { ascending: true });
    const lista = (data as unknown as Espaco[]) ?? [];
    setEspacos(lista);
    if (!selId && lista.length) setSelId(lista[0].id);
  };
  useEffect(() => { carregarEspacos(); /* eslint-disable-next-line */ }, []);

  const carregarItens = async (espacoId: string) => {
    setItens(null);
    const { data } = await fromAny('arboria_repo_itens')
      .select('id, espaco_id, tipo, texto, arquivo_nome, arquivo_path, created_at')
      .eq('espaco_id', espacoId).order('created_at', { ascending: false });
    setItens((data as unknown as Item[]) ?? []);
  };
  useEffect(() => { if (selId) carregarItens(selId); }, [selId]);

  const sel = useMemo(() => espacos.find((e) => e.id === selId) ?? null, [espacos, selId]);

  const addIdeia = async () => {
    if (!selId || !novaIdeia.trim() || salvando) return;
    setSalvando(true);
    try {
      const { error } = await fromAny('arboria_repo_itens').insert({ espaco_id: selId, tipo: 'ideia', texto: novaIdeia.trim() } as never);
      if (error) throw error;
      setNovaIdeia(''); carregarItens(selId);
    } catch (e) { toast.error((e as Error).message || 'Erro'); }
    finally { setSalvando(false); }
  };

  const subirArquivo = async (file: File) => {
    if (!selId) return;
    setSubindo(true);
    try {
      const safe = file.name.replace(/[^\w.\-]/g, '_');
      const path = `${selId}/${Date.now()}-${safe}`;
      const { error: upErr } = await supabase.storage.from('arboria-repositorio').upload(path, file);
      if (upErr) throw upErr;
      const { error } = await fromAny('arboria_repo_itens').insert({ espaco_id: selId, tipo: 'arquivo', arquivo_nome: file.name, arquivo_path: path } as never);
      if (error) throw error;
      carregarItens(selId);
    } catch (e) { toast.error((e as Error).message || 'Erro ao subir arquivo'); }
    finally { setSubindo(false); }
  };

  const baixar = async (it: Item) => {
    if (!it.arquivo_path) return;
    const { data } = await supabase.storage.from('arboria-repositorio').createSignedUrl(it.arquivo_path, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  };

  const apagarItem = async (it: Item) => {
    if (it.tipo === 'arquivo' && it.arquivo_path) {
      await supabase.storage.from('arboria-repositorio').remove([it.arquivo_path]);
    }
    await fromAny('arboria_repo_itens').delete().eq('id', it.id);
    if (selId) carregarItens(selId);
  };

  const criarAba = async () => {
    if (!nomeAba.trim()) return;
    const maxOrdem = Math.max(0, ...espacos.map((e) => e.ordem));
    const { data, error } = await fromAny('arboria_espacos')
      .insert({ nome: nomeAba.trim(), cor: corAba, ordem: maxOrdem + 1 } as never)
      .select('id').single();
    if (error) { toast.error(error.message); return; }
    setNovaAba(false); setNomeAba('');
    await carregarEspacos();
    setSelId((data as { id: string }).id);
  };

  const apagarAba = async (e: Espaco) => {
    if (e.inteligencia_id) { toast.error('As abas das 8 inteligências não podem ser apagadas.'); return; }
    await fromAny('arboria_espacos').delete().eq('id', e.id);
    await carregarEspacos();
    setSelId(espacos[0]?.id ?? null);
  };

  return (
    <div>
      <div className="mb-4">
        <h1 className="font-serif text-[22px]" style={{ color: t.text }}>Repositório</h1>
        <p className="text-[12px]" style={{ color: t.textFaint }}>Um espaço por inteligência (e os que você criar) pra guardar ideias e arquivos.</p>
      </div>

      <div className="flex gap-4">
        {/* Barra vertical das abas */}
        <aside className="w-44 flex-shrink-0">
          <div className="flex flex-col gap-1">
            {espacos.map((e) => {
              const ativa = e.id === selId;
              const cor = e.cor || t.accent;
              return (
                <button
                  key={e.id}
                  onClick={() => setSelId(e.id)}
                  className="flex items-center gap-2.5 w-full rounded-xl px-3 py-2.5 text-[12.5px] font-semibold text-left transition-colors"
                  style={ativa ? { backgroundColor: cor, color: '#fff' } : { backgroundColor: t.surface, color: t.textMuted, border: `1px solid ${t.border}` }}
                >
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: ativa ? '#fff' : cor }} />
                  <span className="truncate">{e.nome}</span>
                </button>
              );
            })}
            <button
              onClick={() => { setNovaAba(true); setNomeAba(''); }}
              className="flex items-center gap-2 w-full rounded-xl px-3 py-2.5 text-[12.5px] font-semibold mt-1"
              style={{ color: t.accentText, border: `1px dashed ${t.accentBorder}` }}
            >
              <Plus size={15} /> Nova aba
            </button>
          </div>
        </aside>

        {/* Conteúdo da aba */}
        <div className="flex-1 min-w-0">
          {sel && (
            <>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-serif text-[19px] font-semibold" style={{ color: sel.cor || t.text }}>{sel.nome}</h2>
                {!sel.inteligencia_id && (
                  <button onClick={() => apagarAba(sel)} className="text-[11px] flex items-center gap-1" style={{ color: t.textFaint }}>
                    <Trash2 size={13} /> apagar aba
                  </button>
                )}
              </div>

              {/* Adicionar ideia */}
              <div className="rounded-xl p-3 mb-2" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
                <textarea
                  value={novaIdeia} onChange={(e) => setNovaIdeia(e.target.value)} rows={2}
                  placeholder="Escreva uma ideia..." className="w-full text-[13px] resize-y bg-transparent outline-none" style={{ color: t.text }}
                />
                <div className="flex items-center justify-between mt-1.5">
                  <button
                    onClick={() => inputRef.current?.click()} disabled={subindo}
                    className="flex items-center gap-1.5 text-[12px] font-medium" style={{ color: t.textMuted }}
                  >
                    {subindo ? <Loader2 size={14} className="animate-spin" /> : <Paperclip size={14} />} Anexar arquivo
                  </button>
                  <input ref={inputRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) subirArquivo(f); e.currentTarget.value = ''; }} />
                  <button onClick={addIdeia} disabled={!novaIdeia.trim() || salvando} className="px-3 py-1.5 rounded-lg text-[12px] font-semibold text-white disabled:opacity-40" style={{ background: t.accent }}>
                    {salvando ? 'Salvando' : 'Adicionar ideia'}
                  </button>
                </div>
              </div>

              {/* Itens */}
              {itens === null ? (
                <p className="text-[12px] py-3" style={{ color: t.textFaint }}>Carregando...</p>
              ) : itens.length === 0 ? (
                <p className="text-[12.5px] py-6 text-center" style={{ color: t.textFaint }}>Ainda não há nada aqui. Comece com uma ideia ou um arquivo.</p>
              ) : (
                <div className="space-y-2">
                  {itens.map((it) => (
                    <div key={it.id} className="rounded-xl p-3 flex items-start gap-3" style={{ background: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadowSm }}>
                      <span className="mt-0.5 flex-shrink-0" style={{ color: it.tipo === 'arquivo' ? t.accentText : '#B8860B' }}>
                        {it.tipo === 'arquivo' ? <Paperclip size={16} /> : <Lightbulb size={16} />}
                      </span>
                      <div className="min-w-0 flex-1">
                        {it.tipo === 'ideia' ? (
                          <p className="text-[13.5px] whitespace-pre-wrap leading-snug" style={{ color: t.text }}>{it.texto}</p>
                        ) : (
                          <button onClick={() => baixar(it)} className="text-[13.5px] font-medium flex items-center gap-1.5" style={{ color: t.accentText }}>
                            {it.arquivo_nome} <Download size={13} />
                          </button>
                        )}
                        <p className="text-[10.5px] mt-1" style={{ color: t.textFaint }}>
                          {new Date(it.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </p>
                      </div>
                      <button onClick={() => apagarItem(it)} className="p-1 flex-shrink-0" style={{ color: t.textFaint }} aria-label="Apagar">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal nova aba */}
      {novaAba && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ backgroundColor: 'rgba(28,34,48,0.45)' }} onClick={() => setNovaAba(false)}>
          <div className="w-full max-w-sm rounded-2xl p-5" style={{ backgroundColor: t.surface, boxShadow: t.shadowLg }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-serif text-[17px] font-semibold" style={{ color: t.text }}>Nova aba</h3>
              <button onClick={() => setNovaAba(false)} aria-label="Fechar" style={{ color: t.textMuted }}><X size={18} /></button>
            </div>
            <input autoFocus value={nomeAba} onChange={(e) => setNomeAba(e.target.value)} placeholder="Nome da aba" className="w-full rounded-lg px-3 py-2 text-[13px] mb-3" style={{ background: t.surfaceSunken, border: `1px solid ${t.border}`, color: t.text }} />
            <div className="flex gap-1.5 mb-4">
              {CORES_NOVA.map((c) => (
                <button key={c} onClick={() => setCorAba(c)} className="w-6 h-6 rounded-full" style={{ background: c, outline: corAba === c ? `2px solid ${t.text}` : 'none', outlineOffset: 2 }} aria-label={c} />
              ))}
            </div>
            <button onClick={criarAba} disabled={!nomeAba.trim()} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[13.5px] font-semibold text-white disabled:opacity-50" style={{ background: t.accent }}>
              <Check className="w-4 h-4" /> Criar aba
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArboriaRepositorioPage;
