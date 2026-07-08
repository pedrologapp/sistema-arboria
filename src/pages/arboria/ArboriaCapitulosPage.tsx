import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { infantilTheme as t } from '@/styles/infantilTheme';

/**
 * CAPÍTULOS (Painel Arboria, do dono): listagem SÓ-LEITURA dos capítulos
 * cadastrados no banco, agrupados por segmento e Casa (inteligência). Serve
 * para o Fundador enxergar QUE capítulos existem (ex.: Arena / O Não Tão Show),
 * o formato de cada um (Assembleia, Times, ...) e quantos encontros/papéis tem.
 * A montagem/alocação por turma acontece no app do mentor (Administrar capítulo).
 */

const INTELIGENCIAS: Record<number, { nome: string; cor: string }> = {
  1: { nome: 'Linguística', cor: '#1E3A8A' },
  2: { nome: 'Lógico-Matemática', cor: '#047857' },
  3: { nome: 'Espacial', cor: '#7C3AED' },
  4: { nome: 'Musical', cor: '#7F1D1D' },
  5: { nome: 'Corporal-Cinestésica', cor: '#B8860B' },
  6: { nome: 'Naturalista', cor: '#78350F' },
  7: { nome: 'Interpessoal', cor: '#0891B2' },
  8: { nome: 'Intrapessoal', cor: '#EA580C' },
};

const SEGMENTOS: { chave: string; label: string }[] = [
  { chave: 'infantil', label: 'Educação Infantil' },
  { chave: 'fundamental1', label: 'Fundamental 1' },
  { chave: 'fundamental2', label: 'Fundamental 2' },
];

interface Instituicao {
  id: string;
  name: string;
}

interface CapituloRow {
  id: string;
  numero: number;
  nome: string;
  tema_curto: string | null;
  frase_ancora: string | null;
  ativo: boolean;
  fase: { segmento: string; inteligencia_id: number } | null;
  encontros: { id: string }[];
  papeis: { categoria: string }[];
}

const fromAny = (tb: string) =>
  (supabase.from as never as (tb: string) => ReturnType<typeof supabase.from>)(tb);

// Rótulo do formato do capítulo, derivado das categorias dos papéis.
const formatoDoCapitulo = (papeis: { categoria: string }[]): string => {
  const cats = new Set(papeis.map((p) => p.categoria));
  if (cats.has('time')) return 'Times';
  if (cats.has('mesa') || cats.has('delegacao') || cats.has('mediador')) return 'Assembleia';
  if (cats.size === 0) return 'Sem papéis';
  return 'Papéis';
};

const ArboriaCapitulosPage = () => {
  const [instituicoes, setInstituicoes] = useState<Instituicao[]>([]);
  const [instSel, setInstSel] = useState<string | null>(null);
  const [capitulos, setCapitulos] = useState<CapituloRow[] | null>(null);

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

  useEffect(() => {
    if (!instSel) return;
    (async () => {
      setCapitulos(null);
      const { data, error } = await fromAny('capitulos')
        .select(
          'id, numero, nome, tema_curto, frase_ancora, ativo, fase:fases!inner(segmento, inteligencia_id), encontros:capitulo_encontros(id), papeis:capitulo_papeis(categoria)'
        )
        .eq('institution_id', instSel)
        .order('numero');
      if (error) {
        toast.error(error.message);
        setCapitulos([]);
        return;
      }
      setCapitulos((data as unknown as CapituloRow[]) ?? []);
    })();
  }, [instSel]);

  const porSegmento = useMemo(() => {
    const m = new Map<string, CapituloRow[]>();
    for (const c of capitulos ?? []) {
      const seg = c.fase?.segmento ?? 'outro';
      if (!m.has(seg)) m.set(seg, []);
      m.get(seg)!.push(c);
    }
    return m;
  }, [capitulos]);

  return (
    <div>
      <h1 className="font-serif text-[22px] mb-1" style={{ color: t.text }}>
        Capítulos
      </h1>
      <p className="text-sm mb-4" style={{ color: t.textMuted }}>
        Os capítulos cadastrados no banco, por segmento e por Casa. Só leitura: a montagem por turma acontece no app do mentor.
      </p>

      {instituicoes.length > 1 && (
        <select
          value={instSel ?? ''}
          onChange={(e) => setInstSel(e.target.value)}
          className="mb-4 rounded-xl px-3 py-2 text-sm w-full sm:w-auto"
          style={{ backgroundColor: t.surface, border: `1px solid ${t.border}`, color: t.text }}
        >
          {instituicoes.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </select>
      )}

      {capitulos === null ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      ) : (capitulos ?? []).length === 0 ? (
        <div
          className="rounded-2xl p-6 text-center"
          style={{ border: `1px dashed ${t.silencio}`, backgroundColor: t.surface }}
        >
          <p className="text-sm" style={{ color: t.textMuted }}>
            Nenhum capítulo cadastrado nesta escola ainda.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {SEGMENTOS.filter((s) => porSegmento.has(s.chave)).map((seg) => (
            <section key={seg.chave}>
              <h2 className="text-[11px] uppercase tracking-wide font-bold mb-2" style={{ color: t.textFaint }}>
                {seg.label}
              </h2>
              <div className="space-y-2.5">
                {porSegmento
                  .get(seg.chave)!
                  .slice()
                  .sort((a, b) => a.numero - b.numero)
                  .map((c) => {
                    const casa = c.fase ? INTELIGENCIAS[c.fase.inteligencia_id] : undefined;
                    const cor = casa?.cor ?? t.accent;
                    return (
                      <div
                        key={c.id}
                        className="rounded-2xl p-3.5 flex items-start gap-3"
                        style={{
                          backgroundColor: t.surface,
                          border: `1px solid ${t.border}`,
                          boxShadow: t.shadowSm,
                          opacity: c.ativo ? 1 : 0.55,
                        }}
                      >
                        <span
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-[13px] font-bold flex-shrink-0"
                          style={{ backgroundColor: `${cor}18`, color: cor }}
                        >
                          {String(c.numero).padStart(2, '0')}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-bold" style={{ color: t.text }}>
                              {c.nome}
                            </p>
                            {!c.ativo && (
                              <span className="text-[10px] uppercase font-bold" style={{ color: t.textFaint }}>
                                inativo
                              </span>
                            )}
                          </div>
                          {casa && (
                            <p className="text-[11px] mt-0.5" style={{ color: cor, fontWeight: 600 }}>
                              Casa {casa.nome}
                            </p>
                          )}
                          {(c.tema_curto || c.frase_ancora) && (
                            <p className="text-[12px] mt-1 leading-snug" style={{ color: t.textMuted }}>
                              {c.tema_curto || c.frase_ancora}
                            </p>
                          )}
                          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                            <span
                              className="text-[10px] font-bold rounded-full px-2 py-0.5"
                              style={{ backgroundColor: `${cor}14`, color: cor }}
                            >
                              {formatoDoCapitulo(c.papeis)}
                            </span>
                            <span
                              className="text-[10px] font-semibold rounded-full px-2 py-0.5"
                              style={{ backgroundColor: t.surfaceAlt, color: t.textMuted }}
                            >
                              {c.encontros.length} encontro{c.encontros.length === 1 ? '' : 's'}
                            </span>
                            <span
                              className="text-[10px] font-semibold rounded-full px-2 py-0.5"
                              style={{ backgroundColor: t.surfaceAlt, color: t.textMuted }}
                            >
                              {c.papeis.length} pape{c.papeis.length === 1 ? 'l' : 'is'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
};

export default ArboriaCapitulosPage;
