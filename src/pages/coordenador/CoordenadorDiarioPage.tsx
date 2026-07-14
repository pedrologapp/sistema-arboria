import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronRight, ChevronDown, FileText } from 'lucide-react';
import { useCoordenador } from '@/contexts/CoordenadorContext';
import { useCoordenadorAlunos, CoordenadorAlunoLista } from '@/hooks/useCoordenadorAlunos';
import { coordenadorTheme as t } from '@/styles/coordenadorTheme';
import { getIniciais } from '@/lib/infantil';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';

const SEG_LABEL: Record<string, string> = {
  infantil: 'Educação Infantil',
  fundamental1: 'Fundamental 1',
  fundamental2: 'Fundamental 2',
};
const SEG_ORDEM = ['infantil', 'fundamental1', 'fundamental2'];
const ordemSerie = (s: string | null) => (s && /^\d+$/.test(s) ? parseInt(s, 10) : 100);

/**
 * Aba DIÁRIO do coordenador (como a dos professores): selecionar a turma OU
 * pesquisar um aluno para abrir o DIÁRIO dele (o histórico do aluno,
 * /coordenador/aluno/:id). Só leitura, escopo imposto no banco.
 */
const CoordenadorDiarioPage = () => {
  const navigate = useNavigate();
  const { segmentos } = useCoordenador();
  const { data: alunos, isLoading } = useCoordenadorAlunos();

  const segsOrdenados = useMemo(
    () => [...segmentos].sort((a, b) => SEG_ORDEM.indexOf(a) - SEG_ORDEM.indexOf(b)),
    [segmentos]
  );
  const [segSel, setSegSel] = useState<string>(() => segsOrdenados[0] || '');
  const segAtual = segSel || segsOrdenados[0] || '';
  const [busca, setBusca] = useState('');
  const [turmaAberta, setTurmaAberta] = useState<string | null>(null);

  const doSeg = useMemo(() => (alunos || []).filter((a) => a.segmento === segAtual), [alunos, segAtual]);

  // Turmas do segmento com seus alunos.
  const turmas = useMemo(() => {
    const map = new Map<string, { turmaId: string; turmaNome: string; serie: string | null; alunos: CoordenadorAlunoLista[] }>();
    for (const a of doSeg) {
      const g = map.get(a.turmaId) || { turmaId: a.turmaId, turmaNome: a.turmaNome, serie: a.serie, alunos: [] };
      g.alunos.push(a);
      map.set(a.turmaId, g);
    }
    return [...map.values()].sort(
      (x, y) => ordemSerie(x.serie) - ordemSerie(y.serie) || x.turmaNome.localeCompare(y.turmaNome)
    );
  }, [doSeg]);

  const buscaNorm = busca.trim().toLowerCase();
  const resultados = useMemo(
    () => (buscaNorm ? doSeg.filter((a) => a.nome.toLowerCase().includes(buscaNorm)) : []),
    [doSeg, buscaNorm]
  );

  const abrirAluno = (id: string) => navigate(`/coordenador/aluno/${id}`);

  const AlunoRow = ({ a, comTurma }: { a: CoordenadorAlunoLista; comTurma?: boolean }) => (
    <button
      onClick={() => abrirAluno(a.id)}
      className="w-full text-left flex items-center gap-2.5 py-2"
      style={{ borderTop: `1px solid ${t.line}` }}
    >
      <Avatar className="h-7 w-7 flex-none">
        <AvatarImage src={a.avatarUrl} className="object-cover" />
        <AvatarFallback className="text-[11px]" style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: t.ink2 }}>
          {getIniciais(a.nome)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="text-[12.5px] text-white truncate">{a.nome}</div>
        {comTurma && (
          <div className="text-[10px] truncate" style={{ color: t.mut }}>
            {a.turmaNome}
          </div>
        )}
      </div>
      <FileText size={13} className="flex-none" style={{ color: t.mut2 }} />
    </button>
  );

  return (
    <div className="pt-3">
      <div className="mb-4">
        <h1 className="text-xl font-semibold leading-tight" style={{ fontFamily: 'Georgia, serif', color: t.ink }}>
          Diário
        </h1>
        <p className="text-[12px] mt-0.5" style={{ color: t.mut }}>
          Selecione a turma ou pesquise um aluno para abrir o diário dele.
        </p>
      </div>

      {segsOrdenados.length === 0 ? (
        <div className="rounded-2xl p-6 text-center" style={{ backgroundColor: t.panel, border: `1px solid ${t.line}` }}>
          <p className="text-[13px]" style={{ color: t.mut }}>
            Nenhum segmento vinculado ao seu acesso ainda.
          </p>
        </div>
      ) : (
        <>
          {/* Segmento */}
          {segsOrdenados.length > 1 && (
            <div className="flex gap-2 flex-wrap mb-3">
              {segsOrdenados.map((s) => {
                const ativo = s === segAtual;
                return (
                  <button
                    key={s}
                    onClick={() => {
                      setSegSel(s);
                      setTurmaAberta(null);
                    }}
                    className="px-3.5 py-2 rounded-xl text-[12.5px] font-semibold transition-colors"
                    style={
                      ativo
                        ? { backgroundColor: t.accent, color: '#fff' }
                        : { backgroundColor: t.panel, color: t.ink2, border: `1px solid ${t.line}` }
                    }
                  >
                    {SEG_LABEL[s] || s}
                  </button>
                );
              })}
            </div>
          )}

          {/* Busca */}
          <div
            className="flex items-center gap-2 rounded-xl px-3 py-2.5 mb-4"
            style={{ backgroundColor: t.panel, border: `1px solid ${t.line}` }}
          >
            <Search size={15} style={{ color: t.mut }} />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Pesquisar aluno pelo nome"
              className="flex-1 bg-transparent text-[13px] outline-none"
              style={{ color: t.ink }}
            />
          </div>

          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-14 w-full rounded-xl" style={{ backgroundColor: t.panel }} />
              <Skeleton className="h-14 w-full rounded-xl" style={{ backgroundColor: t.panel }} />
            </div>
          ) : buscaNorm ? (
            /* Resultados da busca (flat, com a turma) */
            <div className="rounded-2xl p-3.5" style={{ backgroundColor: t.panel, border: `1px solid ${t.line}` }}>
              <div className="text-[9px] uppercase tracking-[0.2em] mb-1" style={{ color: t.mut2 }}>
                {resultados.length} {resultados.length === 1 ? 'aluno' : 'alunos'}
              </div>
              {resultados.length === 0 ? (
                <div className="text-[12.5px] py-3" style={{ color: t.mut }}>
                  Nenhum aluno encontrado neste segmento.
                </div>
              ) : (
                <div className="[&>*:first-child]:border-t-0">
                  {resultados.map((a) => (
                    <AlunoRow key={`${a.id}:${a.turmaId}`} a={a} comTurma />
                  ))}
                </div>
              )}
            </div>
          ) : turmas.length === 0 ? (
            <div className="rounded-2xl p-6 text-center" style={{ backgroundColor: t.panel, border: `1px solid ${t.line}` }}>
              <p className="text-[13px]" style={{ color: t.mut }}>
                Nenhuma turma neste segmento ainda.
              </p>
            </div>
          ) : (
            /* Turmas -> abre e mostra os alunos */
            <div className="space-y-2.5">
              {turmas.map((tur) => {
                const aberta = turmaAberta === tur.turmaId;
                return (
                  <div key={tur.turmaId} className="rounded-2xl overflow-hidden" style={{ backgroundColor: t.panel, border: `1px solid ${t.line}` }}>
                    <button
                      onClick={() => setTurmaAberta(aberta ? null : tur.turmaId)}
                      className="w-full flex items-center justify-between gap-2 p-3.5"
                    >
                      <span className="text-sm font-bold text-white truncate">{tur.turmaNome}</span>
                      <span className="flex items-center gap-2 flex-none">
                        <span className="text-[10.5px]" style={{ color: t.ink2 }}>
                          {tur.alunos.length} {tur.alunos.length === 1 ? 'aluno' : 'alunos'}
                        </span>
                        {aberta ? (
                          <ChevronDown size={16} style={{ color: t.mut }} />
                        ) : (
                          <ChevronRight size={16} style={{ color: t.mut }} />
                        )}
                      </span>
                    </button>
                    {aberta && (
                      <div className="px-3.5 pb-2 [&>*:first-child]:border-t-0" style={{ borderTop: `1px solid ${t.line}` }}>
                        {tur.alunos.map((a) => (
                          <AlunoRow key={a.id} a={a} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CoordenadorDiarioPage;
