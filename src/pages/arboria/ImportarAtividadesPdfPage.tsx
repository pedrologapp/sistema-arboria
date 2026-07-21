// ============================================================
// ImportarAtividadesPdfPage (/arboria/atividades/importar)
//
// Importador de atividades por PDF, no painel do DONO (super_admin). Sobe o PDF
// -> a IA (extrair-atividades-pdf) le e estrutura -> previa EDITAVEL -> salvar no
// banco. Mesmo padrao seguro: nada e' gravado sem o dono revisar. A gravacao usa
// a policy super_admin (FOR ALL) da tabela atividades.
// ============================================================
import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { infantilTheme as t } from '@/styles/infantilTheme';
import { ArrowLeft, Upload, FileText, Loader2, Check, AlertTriangle } from 'lucide-react';

const INTELIGENCIAS = [
  { id: 1, nome: 'Linguística' }, { id: 2, nome: 'Lógico-Matemática' },
  { id: 3, nome: 'Espacial' }, { id: 4, nome: 'Musical' },
  { id: 5, nome: 'Corporal-Cinestésica' }, { id: 6, nome: 'Naturalista' },
  { id: 7, nome: 'Interpessoal' }, { id: 8, nome: 'Intrapessoal' },
];
const SEGMENTOS = ['infantil', 'fundamental1', 'fundamental2'];
const AVISO_LABEL: Record<string, string> = {
  inteligencia_nao_reconhecida: 'Confira a inteligência',
  segmento_nao_reconhecido: 'Confira o segmento',
  faixa_nova_confira_grafia: 'Faixa nova (confira a grafia)',
  sem_nome: 'Sem nome',
  ja_existe: 'Já existe no banco',
};

interface Ativ {
  idx: number;
  inteligencia_id: number | null;
  segmento: string | null;
  faixa: string;
  faixa_pdf: string;
  ordem: number;
  nome: string;
  objetivo: string;
  materiais: string;
  como_conduzir: string;
  o_que_observar: string;
  avisos: string[];
  incluir: boolean;
}

async function fileToBase64(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

const ImportarAtividadesPdfPage = () => {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [institutions, setInstitutions] = useState<{ id: string; name: string }[]>([]);
  const [instSel, setInstSel] = useState('');
  const [nomeArquivo, setNomeArquivo] = useState('');
  const [calculando, setCalculando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [atividades, setAtividades] = useState<Ativ[]>([]);
  const [step, setStep] = useState<'upload' | 'previa'>('upload');

  useEffect(() => {
    supabase.from('institutions').select('id, name').order('name').then(({ data }) => {
      setInstitutions(data || []);
      if (data && data.length) setInstSel(data[0].id);
    });
  }, []);

  const lerPdf = async (file: File) => {
    if (!instSel) { toast.error('Escolha a instituição primeiro'); return; }
    if (file.type !== 'application/pdf') { toast.error('Precisa ser um PDF'); return; }
    setCalculando(true);
    setNomeArquivo(file.name);
    try {
      const pdf_base64 = await fileToBase64(file);
      const { data, error } = await supabase.functions.invoke('extrair-atividades-pdf', {
        body: { pdf_base64, institution_id: instSel },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || 'Falha na leitura');
      const lista: Ativ[] = (data.atividades || []).map((a: Omit<Ativ, 'incluir'>) => ({
        ...a, incluir: !a.avisos?.includes('ja_existe'),
      }));
      if (lista.length === 0) { toast.error('A IA não encontrou atividades no PDF'); return; }
      setAtividades(lista);
      setStep('previa');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao ler o PDF');
    } finally {
      setCalculando(false);
    }
  };

  const upd = (i: number, patch: Partial<Ativ>) =>
    setAtividades((as) => as.map((a, j) => (j === i ? { ...a, ...patch } : a)));

  const salvar = async () => {
    const escolhidas = atividades.filter((a) => a.incluir);
    if (escolhidas.length === 0) { toast.error('Nenhuma atividade marcada'); return; }
    const invalida = escolhidas.find((a) => !a.inteligencia_id || !a.segmento || !a.faixa.trim() || !a.nome.trim());
    if (invalida) { toast.error('Tem atividade sem inteligência, segmento, faixa ou nome'); return; }
    setSalvando(true);
    try {
      const rows = escolhidas.map((a) => ({
        institution_id: instSel,
        inteligencia_id: a.inteligencia_id,
        segmento: a.segmento,
        faixa: a.faixa.trim(),
        ordem: a.ordem,
        nome: a.nome.trim(),
        objetivo: a.objetivo,
        materiais: a.materiais,
        como_conduzir: a.como_conduzir,
        o_que_observar: a.o_que_observar,
        ativo: true,
      }));
      const { error } = await supabase.from('atividades').insert(rows);
      if (error) throw error;
      toast.success(`${rows.length} atividade(s) criada(s) no banco`);
      navigate('/arboria/atividades');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar');
    } finally {
      setSalvando(false);
    }
  };

  const campo = (label: string, val: string, onChange: (v: string) => void, linhas = 3) => (
    <label className="block">
      <span className="text-[11px] font-semibold" style={{ color: t.textMuted }}>{label}</span>
      <textarea value={val} onChange={(e) => onChange(e.target.value)} rows={linhas}
        className="w-full mt-1 rounded-lg px-2.5 py-2 text-[12.5px] resize-y"
        style={{ background: t.surfaceSunken, border: `1px solid ${t.border}`, color: t.text }} />
    </label>
  );

  return (
    <div className="min-h-screen px-4 py-5 pb-24 max-w-3xl mx-auto" style={{ background: t.bg, color: t.text }}>
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate('/arboria/atividades')} className="p-2 -ml-2 rounded-lg" style={{ color: t.textMuted }}>
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-serif text-[22px]">Importar atividades por PDF</h1>
          <p className="text-[12px]" style={{ color: t.textFaint }}>A IA lê o PDF e estrutura as atividades. Você revisa e aprova antes de gravar.</p>
        </div>
      </div>

      {step === 'upload' && (
        <div className="space-y-4">
          <label className="block">
            <span className="text-[12px] font-semibold" style={{ color: t.textMuted }}>Instituição</span>
            <select value={instSel} onChange={(e) => setInstSel(e.target.value)}
              className="w-full mt-1 rounded-lg px-3 py-2 text-[13px]"
              style={{ background: t.surface, border: `1px solid ${t.border}`, color: t.text }}>
              {institutions.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </label>

          <div onClick={() => !calculando && inputRef.current?.click()}
            className="rounded-2xl p-10 text-center cursor-pointer"
            style={{ background: t.surface, border: `2px dashed ${t.border}`, boxShadow: t.shadowSm }}>
            {calculando ? (
              <><Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin" style={{ color: t.accent }} />
                <p className="text-sm font-medium">Lendo o PDF com a IA...</p>
                <p className="text-[12px] mt-1" style={{ color: t.textFaint }}>{nomeArquivo}</p></>
            ) : (
              <><Upload className="w-9 h-9 mx-auto mb-3" style={{ color: t.textFaint }} />
                <p className="text-sm font-medium">Clique para escolher o PDF da atividade</p>
                <p className="text-[12px] mt-1" style={{ color: t.textFaint }}>Uma seção por faixa/série. A IA identifica cada uma.</p></>
            )}
            <input ref={inputRef} type="file" accept="application/pdf" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) lerPdf(f); e.currentTarget.value = ''; }} />
          </div>
        </div>
      )}

      {step === 'previa' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-semibold">{atividades.length} atividade(s) extraída(s) de {nomeArquivo}</p>
            <button onClick={() => { setStep('upload'); setAtividades([]); }} className="text-[12px] underline" style={{ color: t.textMuted }}>Trocar PDF</button>
          </div>

          {atividades.map((a, i) => (
            <div key={i} className="rounded-2xl p-4" style={{ background: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadowMd, opacity: a.incluir ? 1 : 0.55 }}>
              <div className="flex items-center justify-between mb-3">
                <label className="flex items-center gap-2 text-[13px] font-semibold cursor-pointer">
                  <input type="checkbox" checked={a.incluir} onChange={(e) => upd(i, { incluir: e.target.checked })} />
                  Incluir esta
                </label>
                {a.avisos.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 justify-end">
                    {a.avisos.map((av) => (
                      <span key={av} className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: '#FEF3C7', color: '#92400E' }}>
                        <AlertTriangle className="w-3 h-3" /> {AVISO_LABEL[av] || av}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                <label className="block">
                  <span className="text-[10.5px] font-semibold" style={{ color: t.textMuted }}>Inteligência</span>
                  <select value={a.inteligencia_id ?? ''} onChange={(e) => upd(i, { inteligencia_id: Number(e.target.value) || null })}
                    className="w-full mt-1 rounded-lg px-2 py-1.5 text-[12px]" style={{ background: t.surfaceSunken, border: `1px solid ${t.border}`, color: t.text }}>
                    <option value="">—</option>
                    {INTELIGENCIAS.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="text-[10.5px] font-semibold" style={{ color: t.textMuted }}>Segmento</span>
                  <select value={a.segmento ?? ''} onChange={(e) => upd(i, { segmento: e.target.value || null })}
                    className="w-full mt-1 rounded-lg px-2 py-1.5 text-[12px]" style={{ background: t.surfaceSunken, border: `1px solid ${t.border}`, color: t.text }}>
                    <option value="">—</option>
                    {SEGMENTOS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="text-[10.5px] font-semibold" style={{ color: t.textMuted }}>Faixa</span>
                  <input value={a.faixa} onChange={(e) => upd(i, { faixa: e.target.value })}
                    className="w-full mt-1 rounded-lg px-2 py-1.5 text-[12px]" style={{ background: t.surfaceSunken, border: `1px solid ${t.border}`, color: t.text }} />
                </label>
                <label className="block">
                  <span className="text-[10.5px] font-semibold" style={{ color: t.textMuted }}>Ordem</span>
                  <input type="number" value={a.ordem} onChange={(e) => upd(i, { ordem: Number(e.target.value) || 1 })}
                    className="w-full mt-1 rounded-lg px-2 py-1.5 text-[12px]" style={{ background: t.surfaceSunken, border: `1px solid ${t.border}`, color: t.text }} />
                </label>
              </div>

              <label className="block mb-3">
                <span className="text-[11px] font-semibold" style={{ color: t.textMuted }}>Nome da atividade</span>
                <input value={a.nome} onChange={(e) => upd(i, { nome: e.target.value })}
                  className="w-full mt-1 rounded-lg px-2.5 py-2 text-[13px] font-medium" style={{ background: t.surfaceSunken, border: `1px solid ${t.border}`, color: t.text }} />
              </label>

              <div className="space-y-2.5">
                {campo('Objetivo', a.objetivo, (v) => upd(i, { objetivo: v }))}
                {campo('Materiais / Histórias', a.materiais, (v) => upd(i, { materiais: v }), 4)}
                {campo('Como conduzir', a.como_conduzir, (v) => upd(i, { como_conduzir: v }), 4)}
                {campo('O que observar', a.o_que_observar, (v) => upd(i, { o_que_observar: v }), 4)}
              </div>
            </div>
          ))}

          <button onClick={salvar} disabled={salvando}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-[14px] font-semibold text-white disabled:opacity-50"
            style={{ background: t.accent }}>
            {salvando ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando</> : <><Check className="w-4 h-4" /> Salvar {atividades.filter((a) => a.incluir).length} atividade(s) no banco</>}
          </button>
        </div>
      )}
    </div>
  );
};

export default ImportarAtividadesPdfPage;
