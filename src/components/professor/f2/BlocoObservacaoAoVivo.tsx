// ============================================================
// BlocoObservacaoAoVivo — o bloco de notas do professor durante a apresentacao
// de um grupo no capitulo do F2. Toca no alvo (o grupo ou um aluno), escreve,
// salva, o campo limpa pra proxima. Pedido do Fundador 26/07.
//
// - Nota de ALUNO -> observacoes (origem_captura='capitulo' + capitulo_id), ou
//   seja, vai pro diario com a referencia "Na apresentacao: [capitulo]" e
//   alimenta a leitura da IA depois. Aceita foto (bucket 'observacoes').
// - Nota de GRUPO -> capitulo_grupo_notas (nao forca o texto em cada crianca).
// - Ditar por voz: Web Speech API do navegador (custo zero; Chrome).
// ============================================================
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { X, Mic, Camera, Trash2, Loader2, Send, Check } from 'lucide-react';

const sb = supabase as unknown as {
  from: (t: string) => {
    select: (c: string) => any; insert: (v: unknown) => any; update: (v: unknown) => any; delete: () => any;
  };
};

// Cor-assinatura da Arena (mesma do site) e os 4 requisitos do projeto.
const COR_ARENA = '#5EE0D0';
const ARENA_REQS = [
  { key: 'resolve', label: 'O que resolve?' },
  { key: 'funciona', label: 'Como funciona?' },
  { key: 'usa', label: 'O que usa?' },
  { key: 'quebra', label: 'Onde pode quebrar?' },
] as const;

export interface MembroBloco { id: string; nome: string; avatarUrl?: string | null; corCasa?: string | null }
interface Props {
  onFechar: () => void;
  capitulo: { id: string; institution_id: string; fase_id: string | null; nome?: string };
  turmaId: string;
  papelId: string | null;
  grupo: number | null;
  tituloGrupo: string;
  membros: MembroBloco[];
  professorId: string;
  accent: string;        // versao CLARA: texto/borda sobre o escuro
  accentSolid: string;   // versao RICA: preenchimento (chip selecionado, botao) com texto branco
  ehArena: boolean;      // Casa Logico-Matematica: mostra os 4 requisitos do projeto
  temaGrupo: string;     // tema/recorte atual do grupo (subtema)
  onDefinirTema: (texto: string) => void; // salva o tema do grupo na config da turma
}
type Feed =
  | { kind: 'aluno'; id: string; alvo: string; texto: string; quando: string; anexo?: string | null }
  | { kind: 'grupo'; id: string; texto: string; quando: string; nome?: string | null };

const inicial = (n: string) => (n || '?').trim().slice(0, 1).toUpperCase();
const primeiroNome = (n: string) => (n || '').trim().split(/\s+/)[0] || n;

const BlocoObservacaoAoVivo = ({ onFechar, capitulo, turmaId, papelId, grupo, tituloGrupo, membros, professorId, accent, accentSolid, ehArena, temaGrupo, onDefinirTema }: Props) => {
  const [alvo, setAlvo] = useState<'grupo' | 'avulso' | string>('grupo'); // 'grupo' | 'avulso' | aluno_id
  const [nomeAvulso, setNomeAvulso] = useState('');
  const [tema, setTema] = useState(temaGrupo);
  const [reqs, setReqs] = useState<Record<string, boolean>>({});      // marcação (atendido) por pergunta
  const [reqTexto, setReqTexto] = useState<Record<string, string>>({}); // texto em digitação por pergunta
  const [texto, setTexto] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [feed, setFeed] = useState<Feed[]>([]);
  const [gravando, setGravando] = useState(false);
  const [foto, setFoto] = useState<File | null>(null);
  const [subindoFoto, setSubindoFoto] = useState(false);
  const [nota, setNota] = useState<string>('');
  const [notaBusy, setNotaBusy] = useState(false);
  const fotoRef = useRef<HTMLInputElement>(null);
  const recRef = useRef<any>(null);

  const membrosById = new Map(membros.map((m) => [m.id, m]));

  // ---- Carrega o que ja foi anotado nesta apresentacao ----
  const carregar = async () => {
    const alunoIds = membros.map((m) => m.id);
    const [obsRes, grpRes] = await Promise.all([
      alunoIds.length
        ? sb.from('observacoes')
            .select('id, aluno_id, observacao_texto, created_at, anexo_url')
            .eq('capitulo_id', capitulo.id).eq('origem_captura', 'capitulo')
            .is('excluida_em', null).in('aluno_id', alunoIds)
            .order('created_at', { ascending: false })
        : Promise.resolve({ data: [] }),
      sb.from('capitulo_grupo_notas')
        .select('id, texto, created_at, aluno_nome_avulso')
        .eq('capitulo_id', capitulo.id).eq('turma_id', turmaId)
        .order('created_at', { ascending: false }),
    ]);
    const obs: Feed[] = ((obsRes as { data?: any[] }).data ?? []).map((o) => ({
      kind: 'aluno' as const, id: o.id, alvo: primeiroNome(membrosById.get(o.aluno_id)?.nome || 'Aluno'),
      texto: o.observacao_texto || '', quando: o.created_at, anexo: o.anexo_url,
    }));
    const grp: Feed[] = ((grpRes as { data?: any[] }).data ?? [])
      .map((g) => ({ kind: 'grupo' as const, id: g.id, texto: g.texto, quando: g.created_at, nome: g.aluno_nome_avulso }));
    setFeed([...obs, ...grp].sort((a, b) => (a.quando < b.quando ? 1 : -1)));
  };
  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, []);

  // ---- Nota do projeto do grupo (ponderador da votacao + trava de finalizacao) ----
  useEffect(() => {
    if (!papelId) return;
    (supabase.from('capitulo_projeto_nota') as any)
      .select('nota').eq('capitulo_id', capitulo.id).eq('turma_id', turmaId)
      .eq('papel_id', papelId).eq('grupo', grupo ?? 1).maybeSingle()
      .then(({ data }: any) => { if (data?.nota != null) setNota(String(data.nota)); });
    // eslint-disable-next-line
  }, []);

  const salvarNota = async () => {
    if (!papelId || nota.trim() === '' || notaBusy) return;
    const n = Number(nota.replace(',', '.'));
    if (isNaN(n) || n < 0 || n > 10) { toast.error('A nota vai de 0 a 10.'); return; }
    setNotaBusy(true);
    try {
      const { error } = await (supabase.from('capitulo_projeto_nota') as any).upsert({
        institution_id: capitulo.institution_id, capitulo_id: capitulo.id, turma_id: turmaId,
        papel_id: papelId, grupo: grupo ?? 1, nota: n, criado_por: professorId, updated_at: new Date().toISOString(),
      }, { onConflict: 'capitulo_id,turma_id,papel_id,grupo' });
      if (error) throw error;
      toast.success('Nota do projeto salva');
    } catch (e) {
      toast.error((e as { message?: string }).message || 'Erro ao salvar nota');
    } finally { setNotaBusy(false); }
  };

  // ---- Tema do grupo (recorte) ----
  useEffect(() => { setTema(temaGrupo); }, [temaGrupo]);

  // ---- Requisitos do projeto da Arena (4 perguntas) ----
  // A MARCAÇÃO (atendido/não) fica em capitulo_arena_projeto.requisitos (avalia o
  // projeto). A ANOTAÇÃO escrita vira uma nota do grupo (Salvar) e aparece em
  // "Nesta apresentação", igual às outras notas.
  useEffect(() => {
    if (!ehArena || !papelId) return;
    (supabase.from('capitulo_arena_projeto') as any)
      .select('requisitos').eq('capitulo_id', capitulo.id).eq('turma_id', turmaId)
      .eq('papel_id', papelId).eq('grupo', grupo ?? 1).maybeSingle()
      .then(({ data }: any) => {
        if (!data?.requisitos) return;
        const raw = data.requisitos as Record<string, unknown>;
        const norm: Record<string, boolean> = {};
        for (const k of Object.keys(raw)) {
          const v = raw[k];
          norm[k] = typeof v === 'boolean' ? v : !!(v as { ok?: boolean })?.ok;
        }
        setReqs(norm);
      });
    // eslint-disable-next-line
  }, []);

  const toggleReq = async (k: string) => {
    if (!papelId) return;
    const next = { ...reqs, [k]: !reqs[k] };
    setReqs(next);
    const { error } = await (supabase.from('capitulo_arena_projeto') as any).upsert({
      institution_id: capitulo.institution_id, capitulo_id: capitulo.id, turma_id: turmaId,
      papel_id: papelId, grupo: grupo ?? 1, requisitos: next, updated_at: new Date().toISOString(),
    }, { onConflict: 'capitulo_id,turma_id,papel_id,grupo' });
    if (error) toast.error('Não deu pra salvar a marcação. Tente de novo.');
  };

  // Salva a anotação de uma pergunta como nota do grupo -> vai pro feed.
  const salvarReqNota = async (k: string) => {
    const t = (reqTexto[k] ?? '').trim();
    if (!t) return;
    const label = ARENA_REQS.find((q) => q.key === k)?.label ?? '';
    const { error } = await sb.from('capitulo_grupo_notas').insert({
      institution_id: capitulo.institution_id, capitulo_id: capitulo.id, turma_id: turmaId,
      papel_id: papelId, grupo, texto: `${label} ${t}`, criado_por: professorId, aluno_nome_avulso: null,
    });
    if (error) { toast.error('Não deu pra salvar. Tente de novo.'); return; }
    setReqTexto((s) => ({ ...s, [k]: '' }));
    carregar();
  };

  // ---- Ditar por voz (navegador) ----
  const ditar = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { toast.error('Seu navegador não suporta ditar por voz. Use o Chrome.'); return; }
    if (gravando) { recRef.current?.stop(); return; }
    const rec = new SR();
    rec.lang = 'pt-BR'; rec.continuous = true; rec.interimResults = true;
    let base = texto ? texto + ' ' : '';
    rec.onresult = (e: any) => {
      let interino = '';
      for (let i = e.resultIndex; i < e.results.length; i++) interino += e.results[i][0].transcript;
      setTexto(base + interino);
    };
    rec.onend = () => setGravando(false);
    rec.onerror = () => setGravando(false);
    recRef.current = rec; rec.start(); setGravando(true);
  };

  const eColetivo = alvo === 'grupo' || alvo === 'avulso';

  const salvar = async () => {
    if (!texto.trim() || salvando) return;
    if (alvo === 'avulso' && !nomeAvulso.trim()) { toast.error('Escreva o nome da pessoa.'); return; }
    setSalvando(true);
    try {
      let anexoPath: string | null = null;
      if (foto && !eColetivo) {
        setSubindoFoto(true);
        const safe = foto.name.replace(/[^\w.\-]/g, '_');
        const path = `${capitulo.id}/${alvo}/${Date.now()}-${safe}`;
        const { error } = await supabase.storage.from('observacoes').upload(path, foto);
        setSubindoFoto(false);
        if (error) throw error;
        anexoPath = path;
      }
      if (eColetivo) {
        const { error } = await sb.from('capitulo_grupo_notas').insert({
          institution_id: capitulo.institution_id, capitulo_id: capitulo.id, turma_id: turmaId,
          papel_id: papelId, grupo, texto: texto.trim(), criado_por: professorId,
          aluno_nome_avulso: alvo === 'avulso' ? nomeAvulso.trim() : null,
        });
        if (error) throw error;
      } else {
        const { error } = await sb.from('observacoes').insert({
          institution_id: capitulo.institution_id, aluno_id: alvo, professor_id: professorId,
          turma_id: turmaId, fase_id: capitulo.fase_id, capitulo_id: capitulo.id,
          observacao_texto: texto.trim(), origem: 'manual', origem_captura: 'capitulo', anexo_url: anexoPath,
        });
        if (error) throw error;
      }
      setTexto(''); setFoto(null);
      carregar();
    } catch (e) {
      toast.error((e as { message?: string }).message || 'Erro ao salvar');
    } finally {
      setSalvando(false); setSubindoFoto(false);
    }
  };

  const apagar = async (it: Feed) => {
    if (it.kind === 'grupo') {
      await sb.from('capitulo_grupo_notas').delete().eq('id', it.id);
    } else {
      await sb.from('observacoes').update({ excluida_em: new Date().toISOString(), excluida_por: professorId }).eq('id', it.id);
    }
    carregar();
  };

  const alvoNome = alvo === 'grupo' ? 'o grupo'
    : alvo === 'avulso' ? (nomeAvulso.trim() || 'a pessoa')
    : primeiroNome(membrosById.get(alvo)?.nome || 'aluno');

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3" style={{ backgroundColor: 'rgba(6,6,14,0.6)' }} onClick={onFechar}>
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden flex flex-col max-h-[92vh]"
        style={{ background: 'radial-gradient(ellipse at 50% 0%, #191932, #0E0E1C 60%)', border: '1px solid rgba(255,255,255,0.12)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecalho */}
        <div className="px-4 pt-4 pb-3 flex items-start justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div>
            <div className="text-[9.5px] tracking-[0.22em] uppercase" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Observação ao vivo{capitulo.nome ? ` · ${capitulo.nome}` : ''}
            </div>
            <div className="font-serif text-[18px] font-semibold text-white mt-0.5">{tituloGrupo}</div>
          </div>
          <button onClick={onFechar} aria-label="Fechar" style={{ color: 'rgba(255,255,255,0.5)' }}><X size={19} /></button>
        </div>

        <div className="px-4 py-3 overflow-y-auto">
          {/* Nota do projeto (do grupo) */}
          {papelId && (
            <div className="mb-3 rounded-xl p-3 flex items-center gap-3" style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${accentSolid}` }}>
              <div className="flex-1 min-w-0">
                <div className="text-[11.5px] font-semibold" style={{ color: accent }}>Nota do projeto</div>
                <div className="text-[10.5px]" style={{ color: 'rgba(255,255,255,0.45)' }}>Pesa na votação e libera finalizar a fase (0 a 10).</div>
              </div>
              <input
                value={nota} onChange={(e) => setNota(e.target.value)} inputMode="decimal" placeholder="0-10"
                className="w-14 text-center rounded-lg px-1 py-1.5 text-[15px] font-bold text-white bg-transparent outline-none"
                style={{ border: '1px solid rgba(255,255,255,0.22)' }}
              />
              <button onClick={salvarNota} disabled={notaBusy} className="rounded-lg px-3 py-1.5 text-[12px] font-bold text-white disabled:opacity-40" style={{ background: accentSolid }}>
                {notaBusy ? '...' : 'Salvar'}
              </button>
            </div>
          )}

          {/* Tema do grupo (recorte) — vale pra qualquer capítulo */}
          {papelId && (
            <div className="mb-3">
              <div className="text-[9px] tracking-[0.2em] uppercase mb-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Tema do grupo</div>
              <input
                value={tema}
                onChange={(e) => setTema(e.target.value)}
                onBlur={() => { if ((tema.trim() || null) !== (temaGrupo.trim() || null)) onDefinirTema(tema); }}
                placeholder="Ex: games"
                className="w-full rounded-lg px-3 py-2 text-[13px] text-white bg-transparent outline-none placeholder:text-white/30"
                style={{ border: '1px solid rgba(255,255,255,0.18)' }}
              />
            </div>
          )}

          {/* Requisitos do projeto (só na Arena / Casa Lógico-Matemática) */}
          {ehArena && papelId && (
            <div className="mb-3">
              <div className="text-[9px] tracking-[0.2em] uppercase mb-2" style={{ color: 'rgba(255,255,255,0.35)' }}>Requisitos do projeto</div>
              <div className="grid grid-cols-2 gap-2">
                {ARENA_REQS.map((q) => {
                  const ok = !!reqs[q.key];
                  const txt = reqTexto[q.key] ?? '';
                  return (
                    <div key={q.key} className="rounded-xl p-2.5 flex flex-col" style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${ok ? COR_ARENA : 'rgba(255,255,255,0.12)'}` }}>
                      <button onClick={() => toggleReq(q.key)} className="flex items-center gap-1.5 text-left w-full">
                        <span className="w-4 h-4 rounded-[5px] flex items-center justify-center flex-none" style={ok ? { background: COR_ARENA } : { border: '1px solid rgba(255,255,255,0.3)' }}>
                          {ok && <Check size={11} strokeWidth={3} color="#08201C" />}
                        </span>
                        <span className="text-[11.5px] font-semibold leading-tight" style={{ color: ok ? COR_ARENA : 'rgba(255,255,255,0.75)' }}>{q.label}</span>
                      </button>
                      <input
                        value={txt}
                        onChange={(e) => setReqTexto((s) => ({ ...s, [q.key]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); salvarReqNota(q.key); } }}
                        placeholder="anotar..."
                        className="w-full mt-1.5 bg-transparent outline-none text-[11.5px] text-white placeholder:text-white/25"
                      />
                      {txt.trim() && (
                        <button
                          onClick={() => salvarReqNota(q.key)}
                          className="self-end mt-1.5 inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10.5px] font-bold"
                          style={{ background: accentSolid, color: '#fff' }}
                        >
                          <Send size={10} /> Salvar
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Alvos */}
          <div className="text-[9px] tracking-[0.2em] uppercase mb-2" style={{ color: 'rgba(255,255,255,0.35)' }}>Estou observando</div>
          <div className="flex flex-wrap gap-1.5 mb-3">
            <button
              onClick={() => setAlvo('grupo')}
              className="px-3 py-1.5 rounded-full text-[12px] font-semibold"
              style={alvo === 'grupo' ? { background: accentSolid, color: '#fff' } : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.14)' }}
            >
              O grupo
            </button>
            {membros.map((m) => {
              const on = alvo === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setAlvo(m.id)}
                  className="inline-flex items-center gap-1.5 pl-1 pr-3 py-1 rounded-full text-[12px] font-medium"
                  style={on ? { background: accentSolid, color: '#fff' } : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.14)' }}
                >
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white overflow-hidden" style={{ background: m.corCasa || '#5b6fb0' }}>
                    {m.avatarUrl ? <img src={m.avatarUrl} alt="" className="w-full h-full object-cover" /> : inicial(m.nome)}
                  </span>
                  {primeiroNome(m.nome)}
                </button>
              );
            })}
            <button
              onClick={() => setAlvo('avulso')}
              className="px-3 py-1.5 rounded-full text-[12px] font-semibold"
              style={alvo === 'avulso' ? { background: accentSolid, color: '#fff' } : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)', border: '1px dashed rgba(255,255,255,0.25)' }}
            >
              Outro
            </button>
          </div>

          {/* Nome avulso (aluno sem grupo / nao cadastrado) */}
          {alvo === 'avulso' && (
            <input
              value={nomeAvulso} onChange={(e) => setNomeAvulso(e.target.value)} autoFocus
              placeholder="Nome da pessoa"
              className="w-full mb-3 rounded-lg px-3 py-2 text-[13px] text-white bg-transparent outline-none placeholder:text-white/30"
              style={{ border: '1px solid rgba(255,255,255,0.18)' }}
            />
          )}

          {/* Campo */}
          <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.14)' }}>
            <div className="text-[11px] font-semibold mb-1.5" style={{ color: accent }}>Nota sobre {alvoNome}</div>
            <textarea
              value={texto} onChange={(e) => setTexto(e.target.value)} rows={3}
              placeholder="O que você está vendo agora?"
              className="w-full bg-transparent outline-none resize-y text-[14.5px] text-white placeholder:text-white/30"
            />
            {foto && <div className="text-[11px] mt-1" style={{ color: 'rgba(255,255,255,0.55)' }}>Foto anexada: {foto.name}</div>}
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-3">
                <button onClick={ditar} className="inline-flex items-center gap-1.5 text-[12px]" style={{ color: gravando ? '#F0708A' : 'rgba(255,255,255,0.7)' }}>
                  <Mic size={15} /> {gravando ? 'ouvindo...' : 'falar'}
                </button>
                <button
                  onClick={() => fotoRef.current?.click()} disabled={eColetivo}
                  className="inline-flex items-center gap-1.5 text-[12px] disabled:opacity-30"
                  style={{ color: 'rgba(255,255,255,0.7)' }}
                  title={eColetivo ? 'Foto só nas notas de aluno cadastrado' : 'Anexar foto'}
                >
                  <Camera size={15} /> foto
                </button>
                <input ref={fotoRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setFoto(f); e.currentTarget.value = ''; }} />
              </div>
              <button onClick={salvar} disabled={!texto.trim() || salvando} className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[13px] font-bold text-white disabled:opacity-40" style={{ background: accentSolid }}>
                {salvando ? <><Loader2 size={14} className="animate-spin" /> {subindoFoto ? 'foto...' : 'salvando'}</> : <><Send size={14} /> Salvar</>}
              </button>
            </div>
          </div>

          {/* Feed */}
          {feed.length > 0 && (
            <div className="mt-4">
              <div className="text-[9px] tracking-[0.2em] uppercase mb-2.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Nesta apresentação</div>
              <div className="space-y-0.5">
                {feed.map((it) => (
                  <div key={it.id} className="pl-3 py-2 flex items-start gap-2 group" style={{ borderLeft: `2px solid ${it.kind === 'grupo' ? '#E0B64A' : accent}` }}>
                    <div className="min-w-0 flex-1">
                      <div className="text-[10.5px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        {it.kind === 'grupo' ? (it.nome || 'O grupo') : it.alvo}
                      </div>
                      <div className="text-[13px]" style={{ color: 'rgba(255,255,255,0.85)' }}>{it.texto}</div>
                      {it.kind === 'aluno' && it.anexo && <div className="text-[10.5px] mt-0.5" style={{ color: accent }}>foto anexada</div>}
                    </div>
                    <button onClick={() => apagar(it)} className="p-1 opacity-40 hover:opacity-100" style={{ color: 'rgba(255,255,255,0.6)' }} aria-label="Apagar nota">
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BlocoObservacaoAoVivo;
