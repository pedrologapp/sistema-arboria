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
import { X, Mic, Camera, Trash2, Loader2, Send } from 'lucide-react';

const sb = supabase as unknown as {
  from: (t: string) => {
    select: (c: string) => any; insert: (v: unknown) => any; update: (v: unknown) => any; delete: () => any;
  };
};

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
}
type Feed =
  | { kind: 'aluno'; id: string; alvo: string; texto: string; quando: string; anexo?: string | null }
  | { kind: 'grupo'; id: string; texto: string; quando: string; nome?: string | null };

const inicial = (n: string) => (n || '?').trim().slice(0, 1).toUpperCase();
const primeiroNome = (n: string) => (n || '').trim().split(/\s+/)[0] || n;

const BlocoObservacaoAoVivo = ({ onFechar, capitulo, turmaId, papelId, grupo, tituloGrupo, membros, professorId, accent, accentSolid }: Props) => {
  const [alvo, setAlvo] = useState<'grupo' | 'avulso' | string>('grupo'); // 'grupo' | 'avulso' | aluno_id
  const [nomeAvulso, setNomeAvulso] = useState('');
  const [texto, setTexto] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [feed, setFeed] = useState<Feed[]>([]);
  const [gravando, setGravando] = useState(false);
  const [foto, setFoto] = useState<File | null>(null);
  const [subindoFoto, setSubindoFoto] = useState(false);
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
