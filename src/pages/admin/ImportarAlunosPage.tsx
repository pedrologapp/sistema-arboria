// ============================================================
// ImportarAlunosPage (Fase 3) - a cabine do admin pra importar alunos por planilha.
//
// Fluxo: upload .xlsx -> mapear colunas (com autodeteccao) -> chamar o cerebro
// (reconciliar-alunos-dry-run) -> ver a PREVIA do diff nos 4 baldes. NAO aplica
// nada aqui: o apply (Fase 4) e' o proximo passo, com confirmacao explicita.
//
// Contrato de seguranca (I1 do QA): a matricula e' lida como TEXTO (raw:false),
// pra nao perder zeros a esquerda que o Excel comeria num number.
// ============================================================
import { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  ArrowLeft, Upload, FileSpreadsheet, ArrowRight, UserPlus, UserMinus,
  RefreshCcw, AlertTriangle, CheckCircle2, ShieldQuestion, Loader2,
} from 'lucide-react';

type Escopo = 'escola_inteira' | 'segmento' | 'serie';
type Campo = 'matricula' | 'nome' | 'sobrenome' | 'serie' | 'turma' | 'segmento' | 'data_nascimento';

const CAMPOS: { key: Campo; label: string; rx: RegExp; obrigatorio: boolean }[] = [
  { key: 'matricula', label: 'Matrícula', rx: /matr[íi]c/i, obrigatorio: true },
  { key: 'nome', label: 'Nome', rx: /^nome|primeiro|completo/i, obrigatorio: true },
  { key: 'sobrenome', label: 'Sobrenome', rx: /sobren|[úu]ltimo/i, obrigatorio: false },
  { key: 'serie', label: 'Série', rx: /s[ée]rie|ano/i, obrigatorio: false },
  { key: 'turma', label: 'Turma', rx: /turma/i, obrigatorio: false },
  { key: 'segmento', label: 'Segmento', rx: /segmento|n[íi]vel|etapa/i, obrigatorio: false },
  { key: 'data_nascimento', label: 'Nascimento', rx: /nasc/i, obrigatorio: false },
];

interface DiffLinha {
  linha: number; matricula: string; nome: string;
  motivo?: string; criaLogin?: boolean;
  deltas?: Record<string, { de: string | null; para: string | null }>;
}
interface DiffResult {
  novo: DiffLinha[]; mudou: DiffLinha[]; saiu: DiffLinha[]; ambiguo: DiffLinha[];
  inalterados: number;
  resumo: {
    linhas_uteis: number; linhas_ignoradas_vazias: number;
    novos_f2_com_login: number; novos_carrier: number;
    ativos_no_escopo: number; sem_matricula_no_banco: number;
    matriculas_colidentes_no_banco: number;
  };
  alertas: { planilha_parcial: boolean; pct_sumiram: number };
}

const MOTIVO_LABEL: Record<string, string> = {
  sem_matricula: 'Linha sem matrícula',
  matricula_duplicada_na_planilha: 'Matrícula repetida na planilha',
  matricula_duplicada_no_banco: 'Matrícula duplicada na base atual',
  matricula_reciclada_ou_erro: 'Matrícula bate, mas o nome/nascimento não',
  fusao_duas_linhas_mesmo_aluno: 'Duas linhas para o mesmo aluno',
  segmento_desconhecido: 'Segmento não reconhecido',
};

const ImportarAlunosPage = () => {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<'upload' | 'mapear' | 'previa'>('upload');
  const [nomeArquivo, setNomeArquivo] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<Campo, string>>({} as Record<Campo, string>);
  const [escopo, setEscopo] = useState<Escopo>('escola_inteira');
  const [escopoValor, setEscopoValor] = useState('');
  const [completa, setCompleta] = useState(false);
  const [calculando, setCalculando] = useState(false);
  const [diff, setDiff] = useState<DiffResult | null>(null);

  const autodetecta = (hs: string[]): Record<Campo, string> => {
    const m = {} as Record<Campo, string>;
    for (const c of CAMPOS) {
      const achado = hs.find((h) => c.rx.test(h));
      if (achado) m[c.key] = achado;
    }
    return m;
  };

  const lerArquivo = async (file: File) => {
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      // raw:false => celulas como TEXTO formatado (preserva zeros a esquerda de
      // matriculas-texto e datas como string). defval:'' => sem furos.
      const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: false, defval: '' });
      const hs = ((aoa[0] as unknown[]) || []).map((h) => String(h ?? '').trim());
      const rs = aoa.slice(1).map((r) => hs.map((_, i) => String((r as unknown[])[i] ?? '').trim()));
      if (hs.length === 0) { toast.error('Não achei um cabeçalho na planilha'); return; }
      setHeaders(hs);
      setRows(rs);
      setMapping(autodetecta(hs));
      setNomeArquivo(file.name);
      setDiff(null);
      setStep('mapear');
    } catch (e) {
      console.error(e);
      toast.error('Não consegui ler o arquivo. É um .xlsx ou .csv válido?');
    }
  };

  const mappingOk = useMemo(
    () => CAMPOS.filter((c) => c.obrigatorio).every((c) => mapping[c.key]),
    [mapping],
  );

  const montarAlunos = () => {
    const idx: Partial<Record<Campo, number>> = {};
    for (const c of CAMPOS) if (mapping[c.key]) idx[c.key] = headers.indexOf(mapping[c.key]);
    return rows.map((r) => {
      const val = (k: Campo) => (idx[k] != null && idx[k]! >= 0 ? r[idx[k]!] : undefined);
      return {
        matricula: val('matricula'),
        nome: val('nome'),
        sobrenome: val('sobrenome'),
        serie: val('serie'),
        turma: val('turma'),
        segmento: val('segmento'),
        data_nascimento: val('data_nascimento') || null,
      };
    });
  };

  const calcularPrevia = async () => {
    if (!mappingOk) { toast.error('Falta mapear matrícula e nome'); return; }
    if (escopo !== 'escola_inteira' && !escopoValor.trim()) {
      toast.error('Diga qual segmento/série esta planilha cobre'); return;
    }
    setCalculando(true);
    try {
      const { data, error } = await supabase.functions.invoke('reconciliar-alunos-dry-run', {
        body: { alunos: montarAlunos(), escopo, escopoValor: escopoValor.trim() || undefined },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || 'Falha ao calcular');
      setDiff(data.diff as DiffResult);
      setStep('previa');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro ao calcular a prévia';
      toast.error(msg);
    } finally {
      setCalculando(false);
    }
  };

  return (
    <div className="min-h-screen text-white px-4 py-5 pb-24 max-w-3xl mx-auto">
      {/* Cabecalho */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate('/admin/pessoas')} className="p-2 -ml-2 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06]">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-lg font-semibold">Importar alunos por planilha</h1>
          <p className="text-[12px] text-white/40">Sobe a lista, o Arboria compara com a base e mostra o que mudou antes de aplicar.</p>
        </div>
      </div>

      {/* Passos */}
      <div className="flex items-center gap-2 mb-6 text-[11px]">
        {(['upload', 'mapear', 'previa'] as const).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <span className={cn('px-2.5 py-1 rounded-full font-semibold',
              step === s ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/[0.06] text-white/40')}>
              {i + 1}. {s === 'upload' ? 'Arquivo' : s === 'mapear' ? 'Colunas' : 'Prévia'}
            </span>
            {i < 2 && <ArrowRight className="w-3 h-3 text-white/20" />}
          </div>
        ))}
      </div>

      {/* PASSO 1: UPLOAD */}
      {step === 'upload' && (
        <div
          onClick={() => inputRef.current?.click()}
          className="rounded-2xl border-2 border-dashed border-white/15 bg-white/[0.03] p-10 text-center cursor-pointer hover:border-emerald-500/40 transition-colors"
        >
          <Upload className="w-9 h-9 mx-auto mb-3 text-white/40" />
          <p className="text-sm font-medium">Clique para escolher a planilha</p>
          <p className="text-[12px] text-white/40 mt-1">.xlsx ou .csv. A coluna de matrícula deve estar como texto.</p>
          <input
            ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) lerArquivo(f); e.currentTarget.value = ''; }}
          />
        </div>
      )}

      {/* PASSO 2: MAPEAR */}
      {step === 'mapear' && (
        <div className="space-y-5">
          <div className="flex items-center gap-2 text-[12px] text-white/50">
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> {nomeArquivo} · {rows.length} linhas
          </div>

          {/* Mapeamento de colunas */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-[13px] font-semibold mb-3">Qual coluna é o quê?</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {CAMPOS.map((c) => (
                <label key={c.key} className="flex items-center justify-between gap-2 text-[13px]">
                  <span className="text-white/70">{c.label}{c.obrigatorio && <span className="text-emerald-400"> *</span>}</span>
                  <select
                    value={mapping[c.key] || ''}
                    onChange={(e) => setMapping((m) => ({ ...m, [c.key]: e.target.value }))}
                    className="bg-[#12122a] border border-white/15 rounded-lg px-2 py-1.5 text-[12px] max-w-[55%]"
                  >
                    <option value="">— nenhuma —</option>
                    {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </label>
              ))}
            </div>
          </div>

          {/* Escopo */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
            <p className="text-[13px] font-semibold">O que esta planilha cobre?</p>
            <div className="flex flex-wrap gap-2">
              {([['escola_inteira', 'Escola inteira'], ['segmento', 'Um segmento'], ['serie', 'Uma série']] as const).map(([v, l]) => (
                <button key={v} onClick={() => setEscopo(v)}
                  className={cn('px-3 py-1.5 rounded-full text-[12px] font-medium border',
                    escopo === v ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-200' : 'border-white/15 text-white/50')}>
                  {l}
                </button>
              ))}
            </div>
            {escopo !== 'escola_inteira' && (
              <input value={escopoValor} onChange={(e) => setEscopoValor(e.target.value)}
                placeholder={escopo === 'segmento' ? 'ex.: fundamental2' : 'ex.: 9º Ano'}
                className="w-full bg-[#12122a] border border-white/15 rounded-lg px-3 py-2 text-[13px]" />
            )}
            <label className="flex items-start gap-2 text-[12px] text-white/60 cursor-pointer">
              <input type="checkbox" checked={completa} onChange={(e) => setCompleta(e.target.checked)} className="mt-0.5" />
              <span>Esta planilha é a relação <b>completa</b> desse escopo. (Se faltar gente, quem faltar pode ser marcado como quem saiu.)</span>
            </label>
          </div>

          {/* Previa das 5 primeiras linhas */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 overflow-x-auto">
            <p className="text-[12px] text-white/40 mb-2">Primeiras linhas (confira se o mapeamento está certo):</p>
            <table className="text-[11px] w-full">
              <thead>
                <tr className="text-white/40 text-left">
                  {CAMPOS.filter((c) => mapping[c.key]).map((c) => <th key={c.key} className="pr-3 pb-1 font-medium">{c.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 5).map((r, i) => (
                  <tr key={i} className="text-white/75">
                    {CAMPOS.filter((c) => mapping[c.key]).map((c) => (
                      <td key={c.key} className="pr-3 py-0.5 whitespace-nowrap">{r[headers.indexOf(mapping[c.key])]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-2">
            <button onClick={() => setStep('upload')} className="px-4 py-2.5 rounded-xl text-[13px] text-white/60 border border-white/15">Trocar arquivo</button>
            <button onClick={calcularPrevia} disabled={!mappingOk || calculando}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 disabled:opacity-40">
              {calculando ? <><Loader2 className="w-4 h-4 animate-spin" /> Calculando</> : <>Calcular prévia <ArrowRight className="w-4 h-4" /></>}
            </button>
          </div>
        </div>
      )}

      {/* PASSO 3: PREVIA */}
      {step === 'previa' && diff && (
        <div className="space-y-4">
          {/* Alertas */}
          {diff.alertas.planilha_parcial && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/[0.08] p-3 flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
              <p className="text-[12.5px] text-amber-100/90">
                <b>{diff.alertas.pct_sumiram}%</b> dos alunos com matrícula não apareceram na planilha. Isso costuma ser <b>planilha parcial</b>, não gente que saiu. Confira antes de aplicar.
              </p>
            </div>
          )}
          {diff.resumo.matriculas_colidentes_no_banco > 0 && (
            <div className="rounded-xl border border-orange-500/40 bg-orange-500/[0.08] p-3 text-[12.5px] text-orange-100/90">
              {diff.resumo.matriculas_colidentes_no_banco} matrícula(s) estão duplicadas na base atual e foram para revisão.
            </div>
          )}

          {/* Cartoes de resumo */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <Card icon={UserPlus} cor="#34d399" n={diff.novo.length} label="Novos"
              sub={`${diff.resumo.novos_f2_com_login} com login · ${diff.resumo.novos_carrier} carrier`} />
            <Card icon={RefreshCcw} cor="#60a5fa" n={diff.mudou.length} label="Mudaram" sub="série/turma/nome" />
            <Card icon={UserMinus} cor="#f87171" n={diff.saiu.length} label="Saíram" sub="serão desativados" />
            <Card icon={ShieldQuestion} cor="#fbbf24" n={diff.ambiguo.length} label="Ambíguos" sub="revisão humana" />
          </div>
          <div className="flex items-center gap-2 text-[12px] text-white/45">
            <CheckCircle2 className="w-4 h-4 text-white/30" />
            {diff.inalterados} sem mudança · {diff.resumo.linhas_uteis} linhas lidas
            {diff.resumo.linhas_ignoradas_vazias > 0 && ` · ${diff.resumo.linhas_ignoradas_vazias} vazias ignoradas`}
          </div>

          {/* Listas por balde */}
          <Bucket titulo="Ambíguos (precisam de você)" cor="#fbbf24" itens={diff.ambiguo}
            render={(l) => `${l.nome || '(sem nome)'} · mat ${l.matricula || '—'} · ${MOTIVO_LABEL[l.motivo || ''] || l.motivo}`} />
          <Bucket titulo="Vão sair (desativar)" cor="#f87171" itens={diff.saiu}
            render={(l) => `${l.nome} · mat ${l.matricula}`} />
          <Bucket titulo="Novos" cor="#34d399" itens={diff.novo}
            render={(l) => `${l.nome} · mat ${l.matricula} · ${l.criaLogin ? 'cria login (F2)' : 'carrier'}`} />
          <Bucket titulo="Mudaram" cor="#60a5fa" itens={diff.mudou}
            render={(l) => `${l.nome} · ${Object.entries(l.deltas || {}).map(([c, d]) => `${c}: ${d.de || '—'}→${d.para || '—'}`).join(', ')}`} />

          {/* Acao (Fase 4) */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <button disabled title="A aplicação chega na próxima etapa (Fase 4)"
              className="w-full px-4 py-2.5 rounded-xl text-[13px] font-semibold bg-white/[0.06] text-white/40 cursor-not-allowed">
              Confirmar e aplicar (em breve)
            </button>
            <p className="text-[11px] text-white/35 mt-2 text-center">
              Esta é a prévia. Aplicar de verdade (criar, atualizar, desativar) chega no próximo passo, com confirmação e registro de auditoria.
            </p>
          </div>

          <button onClick={() => setStep('mapear')} className="text-[12px] text-white/50 underline">Voltar e ajustar</button>
        </div>
      )}
    </div>
  );
};

function Card({ icon: Icon, cor, n, label, sub }: { icon: typeof UserPlus; cor: string; n: number; label: string; sub: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <Icon className="w-4 h-4 mb-1.5" style={{ color: cor }} />
      <div className="text-xl font-bold tabular-nums">{n}</div>
      <div className="text-[11px] text-white/60">{label}</div>
      <div className="text-[9.5px] text-white/35 mt-0.5">{sub}</div>
    </div>
  );
}

function Bucket({ titulo, cor, itens, render }: { titulo: string; cor: string; itens: DiffLinha[]; render: (l: DiffLinha) => string }) {
  const [aberto, setAberto] = useState(false);
  if (itens.length === 0) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
      <button onClick={() => setAberto((a) => !a)} className="w-full flex items-center justify-between px-4 py-2.5 text-left">
        <span className="text-[13px] font-semibold" style={{ color: cor }}>{titulo}</span>
        <span className="text-[12px] text-white/40">{itens.length}</span>
      </button>
      {aberto && (
        <div className="px-4 pb-3 max-h-72 overflow-y-auto space-y-1">
          {itens.map((l, i) => (
            <div key={i} className="text-[11.5px] text-white/70 py-0.5 border-t border-white/[0.05] first:border-0">{render(l)}</div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ImportarAlunosPage;
