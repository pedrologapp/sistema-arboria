// ============================================================
// ArboriaTarefasPage (/arboria/tarefas) — o quadro de tarefas do dono, tipo Trello.
// Colunas A fazer / Fazendo / Feito. Adicionar, mover (setas), editar, apagar.
// So super_admin (tabela arboria_tarefas com RLS super). Pedido do Fundador 23/07.
// ============================================================
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { infantilTheme as t } from '@/styles/infantilTheme';
import { Plus, ChevronLeft, ChevronRight, Trash2, X, Check, GripVertical } from 'lucide-react';

type Status = 'a_fazer' | 'fazendo' | 'feito';
interface Tarefa { id: string; titulo: string; descricao: string | null; status: Status; ordem: number }

const COLUNAS: { status: Status; label: string; cor: string }[] = [
  { status: 'a_fazer', label: 'A fazer', cor: '#6E7788' },
  { status: 'fazendo', label: 'Fazendo', cor: '#4F46E5' },
  { status: 'feito', label: 'Feito', cor: '#22A06B' },
];
const fromAny = (tb: string) =>
  (supabase.from as never as (tb: string) => ReturnType<typeof supabase.from>)(tb);

const ArboriaTarefasPage = () => {
  const [tarefas, setTarefas] = useState<Tarefa[] | null>(null);
  const [novaCol, setNovaCol] = useState<Status | null>(null);
  const [novoTitulo, setNovoTitulo] = useState('');
  const [editando, setEditando] = useState<Tarefa | null>(null);
  const [editTitulo, setEditTitulo] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [busy, setBusy] = useState(false);

  const carregar = async () => {
    const { data } = await fromAny('arboria_tarefas')
      .select('id, titulo, descricao, status, ordem')
      .order('ordem', { ascending: true })
      .order('created_at', { ascending: true });
    setTarefas((data as unknown as Tarefa[]) ?? []);
  };
  useEffect(() => { carregar(); }, []);

  const adicionar = async (status: Status) => {
    if (!novoTitulo.trim()) { setNovaCol(null); return; }
    const maxOrdem = Math.max(0, ...(tarefas ?? []).map((x) => x.ordem));
    const { error } = await fromAny('arboria_tarefas').insert({ titulo: novoTitulo.trim(), status, ordem: maxOrdem + 1 } as never);
    if (error) { toast.error(error.message); return; }
    setNovoTitulo(''); setNovaCol(null); carregar();
  };

  const mover = async (tr: Tarefa, dir: -1 | 1) => {
    const ordemCols: Status[] = ['a_fazer', 'fazendo', 'feito'];
    const idx = ordemCols.indexOf(tr.status);
    const novo = ordemCols[idx + dir];
    if (!novo) return;
    await fromAny('arboria_tarefas').update({ status: novo, updated_at: new Date().toISOString() } as never).eq('id', tr.id);
    carregar();
  };

  const apagar = async (tr: Tarefa) => {
    await fromAny('arboria_tarefas').delete().eq('id', tr.id);
    setEditando(null); carregar();
  };

  const abrirEdicao = (tr: Tarefa) => { setEditando(tr); setEditTitulo(tr.titulo); setEditDesc(tr.descricao ?? ''); };
  const salvarEdicao = async () => {
    if (!editando || !editTitulo.trim() || busy) return;
    setBusy(true);
    try {
      const { error } = await fromAny('arboria_tarefas')
        .update({ titulo: editTitulo.trim(), descricao: editDesc.trim() || null, updated_at: new Date().toISOString() } as never)
        .eq('id', editando.id);
      if (error) throw error;
      setEditando(null); carregar();
    } catch (e) { toast.error((e as Error).message || 'Erro ao salvar'); }
    finally { setBusy(false); }
  };

  return (
    <div>
      <div className="mb-4">
        <h1 className="font-serif text-[22px]" style={{ color: t.text }}>Meu quadro</h1>
        <p className="text-[12px]" style={{ color: t.textFaint }}>As demandas do Arboria, em colunas. Adicione, mova e marque como feito.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {COLUNAS.map((col) => {
          const itens = (tarefas ?? []).filter((x) => x.status === col.status);
          return (
            <div key={col.status} className="rounded-2xl p-3" style={{ background: t.surfaceAlt, border: `1px solid ${t.border}` }}>
              <div className="flex items-center justify-between mb-2.5 px-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: col.cor }} />
                  <span className="text-[12px] font-bold uppercase tracking-wide" style={{ color: t.textMuted }}>{col.label}</span>
                  <span className="text-[11px]" style={{ color: t.textFaint }}>{itens.length}</span>
                </div>
                <button onClick={() => { setNovaCol(col.status); setNovoTitulo(''); }} className="p-1 rounded" style={{ color: t.accentText }} aria-label="Adicionar">
                  <Plus size={15} />
                </button>
              </div>

              {novaCol === col.status && (
                <div className="mb-2 rounded-lg p-2" style={{ background: t.surface, border: `1px solid ${t.accentBorder}` }}>
                  <textarea
                    autoFocus value={novoTitulo} onChange={(e) => setNovoTitulo(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); adicionar(col.status); } if (e.key === 'Escape') setNovaCol(null); }}
                    placeholder="O que precisa fazer?" rows={2}
                    className="w-full text-[13px] resize-none bg-transparent outline-none" style={{ color: t.text }}
                  />
                  <div className="flex gap-1.5 mt-1">
                    <button onClick={() => adicionar(col.status)} className="px-2.5 py-1 rounded text-[11.5px] font-semibold text-white" style={{ background: t.accent }}>Adicionar</button>
                    <button onClick={() => setNovaCol(null)} className="px-2 py-1 rounded text-[11.5px]" style={{ color: t.textMuted }}>Cancelar</button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {itens.map((tr) => {
                  const colIdx = ['a_fazer', 'fazendo', 'feito'].indexOf(tr.status);
                  return (
                    <div key={tr.id} className="rounded-lg p-2.5" style={{ background: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadowSm }}>
                      <button onClick={() => abrirEdicao(tr)} className="text-left w-full">
                        <p className="text-[13px] leading-snug" style={{ color: t.text, textDecoration: tr.status === 'feito' ? 'line-through' : 'none', opacity: tr.status === 'feito' ? 0.6 : 1 }}>
                          {tr.titulo}
                        </p>
                        {tr.descricao && (
                          <p className="text-[11px] mt-1 leading-snug" style={{ color: t.textFaint }}>
                            {tr.descricao.length > 90 ? tr.descricao.slice(0, 90) + '...' : tr.descricao}
                          </p>
                        )}
                      </button>
                      <div className="flex items-center justify-between mt-1.5">
                        <button onClick={() => mover(tr, -1)} disabled={colIdx === 0} className="p-1 disabled:opacity-25" style={{ color: t.textMuted }} aria-label="Mover para a esquerda">
                          <ChevronLeft size={15} />
                        </button>
                        <button onClick={() => abrirEdicao(tr)} className="text-[10px] uppercase tracking-wide" style={{ color: t.textFaint }}>editar</button>
                        <button onClick={() => mover(tr, 1)} disabled={colIdx === 2} className="p-1 disabled:opacity-25" style={{ color: t.textMuted }} aria-label="Mover para a direita">
                          <ChevronRight size={15} />
                        </button>
                      </div>
                    </div>
                  );
                })}
                {itens.length === 0 && novaCol !== col.status && (
                  <p className="text-[11.5px] text-center py-3" style={{ color: t.textFaint }}>Nada aqui.</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de edicao */}
      {editando && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ backgroundColor: 'rgba(28,34,48,0.45)' }} onClick={() => setEditando(null)}>
          <div className="w-full max-w-md rounded-2xl p-5" style={{ backgroundColor: t.surface, boxShadow: t.shadowLg }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-serif text-[17px] font-semibold" style={{ color: t.text }}>Editar tarefa</h3>
              <button onClick={() => setEditando(null)} aria-label="Fechar" style={{ color: t.textMuted }}><X size={18} /></button>
            </div>
            <label className="block mb-3">
              <span className="text-[11px] font-semibold" style={{ color: t.textMuted }}>Título</span>
              <input value={editTitulo} onChange={(e) => setEditTitulo(e.target.value)} className="w-full mt-1 rounded-lg px-2.5 py-2 text-[13px]" style={{ background: t.surfaceSunken, border: `1px solid ${t.border}`, color: t.text }} />
            </label>
            <label className="block mb-4">
              <span className="text-[11px] font-semibold" style={{ color: t.textMuted }}>Detalhes</span>
              <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={4} className="w-full mt-1 rounded-lg px-2.5 py-2 text-[12.5px] resize-y" style={{ background: t.surfaceSunken, border: `1px solid ${t.border}`, color: t.text }} />
            </label>
            <div className="flex items-center gap-2">
              <button onClick={salvarEdicao} disabled={busy} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[13.5px] font-semibold text-white disabled:opacity-50" style={{ background: t.accent }}>
                <Check className="w-4 h-4" /> Salvar
              </button>
              <button onClick={() => apagar(editando)} className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-[12.5px] font-semibold" style={{ color: '#B4462F', border: '1px solid #E7C3BA' }}>
                <Trash2 size={15} /> Apagar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArboriaTarefasPage;
