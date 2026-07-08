import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Search, NotebookPen, List, LayoutGrid, ChevronRight } from 'lucide-react';
import { useProfessor } from '@/contexts/ProfessorContext';
import { useTurmasF2Instituicao, useAlunosF2Instituicao, type TurmaF2Diario } from '@/hooks/useF2Diario';
import {
  getIniciais,
  formatTurmaLabel,
  getViewModePreferido,
  salvarViewModePreferido,
  normalizarBusca,
} from '@/lib/infantil';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { infantilTheme as t } from '@/styles/infantilTheme';

const CHAVE_TURMA = 'f2-diario-turma';

/**
 * Card do grid-filtro de turmas (mesmo visual compacto do CartaoTurma da aba
 * Arboria: escudo + rótulo, borda de acento quando ativo). Aqui NÃO navega:
 * apenas troca o filtro da lista de alunos abaixo, na mesma tela.
 */
const CartaoFiltro = ({
  label,
  ativo,
  onClick,
}: {
  label: string;
  ativo: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className="flex-shrink-0 rounded-xl px-3.5 py-2 transition-transform active:scale-[0.97] whitespace-nowrap"
    style={{
      backgroundColor: ativo ? t.accent : t.surface,
      border: ativo ? `1.5px solid ${t.accent}` : `1px solid ${t.border}`,
      boxShadow: ativo ? t.shadowSm : 'none',
    }}
    aria-pressed={ativo}
  >
    <span className="text-[13px] font-semibold" style={{ color: ativo ? '#FFFFFF' : t.text }}>
      {label}
    </span>
  </button>
);

/**
 * Aba DIÁRIO (Fundamental 2, reforma). TELA ÚNICA:
 *   - No topo, o grid-filtro de turmas (mesmo grid deslizável de 2 linhas da aba
 *     Arboria), com "Todas" (default). Escolher uma turma só FILTRA a lista.
 *   - Abaixo, na mesma tela, a lista de alunos (visual claro do Infantil/F1:
 *     cards, busca, lista/círculos). Tocar num aluno abre o diário (thread).
 *
 * ACESSO COMPARTILHADO: no F2 não há vinculação por turma. Qualquer mentor vê
 * TODAS as turmas do F2 da instituição e TODOS os alunos delas
 * (useTurmasF2Instituicao / useAlunosF2Instituicao, por institution_id).
 *
 * Só é montada quando segmento === 'fundamental2' E F2_REFORMA_ATIVA
 * (o roteamento vive no AlunosPageWrapper). Tema claro, infantilTheme.
 */
const F2AlunosPage = () => {
  const navigate = useNavigate();
  const { profile, casaMentor } = useProfessor();
  const { data: turmas, isLoading: turmasLoading } = useTurmasF2Instituicao(profile?.institution_id);
  const { data: alunos, isLoading: alunosLoading } = useAlunosF2Instituicao(profile?.institution_id);

  // Filtro de turma persiste ao entrar/voltar de um thread. null = "Todas".
  const [turmaFiltro, setTurmaFiltroState] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem(CHAVE_TURMA);
    } catch {
      return null;
    }
  });
  const setTurmaFiltro = (id: string | null) => {
    setTurmaFiltroState(id);
    try {
      if (id) sessionStorage.setItem(CHAVE_TURMA, id);
      else sessionStorage.removeItem(CHAVE_TURMA);
    } catch {
      /* segue só em memória */
    }
  };

  const [busca, setBusca] = useState('');
  // Preferência compartilhada com a Rajada (quem escolhe círculos lá, encontra círculos aqui)
  const [viewMode, setViewModeState] = useState<'lista' | 'circulos'>(getViewModePreferido());
  const setViewMode = (modo: 'lista' | 'circulos') => {
    setViewModeState(modo);
    salvarViewModePreferido(modo);
  };

  const listaTurmas: TurmaF2Diario[] = turmas ?? [];

  // Se a turma salva não existe mais na instituição, cai em "Todas".
  const turmaAtiva = turmaFiltro && listaTurmas.some((x) => x.id === turmaFiltro) ? turmaFiltro : null;

  const alunosFiltrados = useMemo(() => {
    const base = alunos ?? [];
    // Filtro por turma; sem turma ("Todas") dedupe por aluno (um aluno pode ter
    // vínculo ativo em mais de uma turma e não deve aparecer repetido).
    let visiveis;
    if (turmaAtiva) {
      visiveis = base.filter((a) => a.turmaId === turmaAtiva);
    } else {
      const vistos = new Set<string>();
      visiveis = base.filter((a) => (vistos.has(a.id) ? false : (vistos.add(a.id), true)));
    }
    if (busca) {
      const q = normalizarBusca(busca);
      visiveis = visiveis.filter((a) => normalizarBusca(a.nome).includes(q));
    }
    return visiveis;
  }, [alunos, turmaAtiva, busca]);

  return (
    <div className="pt-5 space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: t.text }}>
          <NotebookPen size={22} style={{ color: t.accent }} strokeWidth={1.75} />
          Diário
        </h1>
        <p className="text-sm mt-0.5" style={{ color: t.textFaint }}>
          {alunosLoading ? 'Carregando alunos...' : `${alunosFiltrados.length} ${alunosFiltrados.length === 1 ? 'aluno' : 'alunos'}`}
        </p>
      </div>

      {/* Grid-filtro de turmas: mesmo grid deslizável de 2 linhas da aba Arboria.
          "Todas" (default) + uma turma por card. Escolher só filtra a lista. */}
      <div>
        <p className="text-[11px] uppercase tracking-wide font-semibold mb-2 px-1" style={{ color: t.textFaint }}>
          Escolha sua turma
        </p>
        {turmasLoading ? (
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div
            tabIndex={0}
            role="group"
            aria-label="Filtrar por turma. Deslize para o lado para ver mais."
            className="overflow-x-auto -mx-4 px-4 py-1"
            style={{ scrollSnapType: 'x proximity', WebkitOverflowScrolling: 'touch' }}
          >
            <div className="flex gap-2">
              <CartaoFiltro
                label="Todas"
                ativo={turmaAtiva === null}
                onClick={() => setTurmaFiltro(null)}
              />
              {listaTurmas.map((turma) => (
                <CartaoFiltro
                  key={turma.id}
                  label={formatTurmaLabel(turma.serie, turma.turma_letra) || turma.nome}
                  ativo={turmaAtiva === turma.id}
                  onClick={() => setTurmaFiltro(turma.id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Convite no presente */}
      {!alunosLoading && alunosFiltrados.length > 0 && (
        <div
          className="rounded-2xl p-3.5"
          style={{ backgroundColor: t.accentSoft, border: `1px solid ${t.accentBorder}` }}
        >
          <p className="text-sm font-semibold" style={{ color: t.accentText }}>
            Quem você vai enxergar hoje?
          </p>
        </div>
      )}

      {/* Busca + alternador de visão (lista / círculos): mesmo padrão da Rajada */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: t.textFaint }}
          />
          <input
            type="text"
            placeholder="Buscar aluno..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm transition-colors focus:outline-none focus-visible:ring-2"
            style={{
              backgroundColor: t.surfaceSunken,
              border: `1px solid ${t.border}`,
              color: t.text,
              ['--tw-ring-color' as string]: t.accent,
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = t.accent;
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = t.border;
            }}
          />
        </div>
        <div className="flex p-0.5 rounded-xl flex-shrink-0" style={{ backgroundColor: t.surfaceSunken }}>
          {([['lista', List], ['circulos', LayoutGrid]] as const).map(([modo, Icon]) => {
            const ativo = viewMode === modo;
            return (
              <button
                key={modo}
                onClick={() => setViewMode(modo)}
                className="p-2 rounded-lg transition-colors"
                style={ativo ? { backgroundColor: t.surface, boxShadow: t.shadowSm } : { backgroundColor: 'transparent' }}
                aria-label={modo === 'lista' ? 'Ver em lista' : 'Ver em círculos'}
                aria-pressed={ativo}
              >
                <Icon size={18} style={{ color: ativo ? t.accent : t.textMuted }} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Lista */}
      {alunosLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : alunosFiltrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 text-center">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mb-3"
            style={{ backgroundColor: t.accentSoft }}
          >
            <Users size={28} style={{ color: t.accent }} strokeWidth={1.5} />
          </div>
          <p className="text-sm" style={{ color: t.textMuted }}>
            {busca ? 'Nenhum aluno com esse filtro.' : 'Não há alunos nesta turma.'}
          </p>
        </div>
      ) : viewMode === 'lista' ? (
        <div className="space-y-2">
          {alunosFiltrados.map((aluno) => (
            <button
              key={aluno.id}
              onClick={() => navigate(`/professor/alunos/${aluno.id}`)}
              className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors active:scale-[0.99]"
              style={{ backgroundColor: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadowSm }}
            >
              <Avatar className="h-11 w-11 flex-shrink-0">
                <AvatarImage src={aluno.avatarUrl} className="object-cover" />
                <AvatarFallback
                  className="text-sm font-semibold"
                  style={{ backgroundColor: t.accentSoft, color: t.accentText }}
                >
                  {getIniciais(aluno.nome)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-snug" style={{ color: t.text }}>
                  {aluno.nome}
                </p>
                {/* Sem registro = linha limpa (nenhum subtítulo marcando ausência) */}
                {aluno.quantidadeObservacoes > 0 && (
                  <p className="text-xs mt-0.5" style={{ color: t.textFaint }}>
                    {aluno.quantidadeObservacoes}{' '}
                    {aluno.quantidadeObservacoes === 1 ? 'momento registrado' : 'momentos registrados'}
                  </p>
                )}
              </div>
              <ChevronRight size={18} style={{ color: t.textFaint }} className="flex-shrink-0" />
            </button>
          ))}
        </div>
      ) : (
        /* VISÃO EM CÍRCULOS: foto + nome, grade 3 colunas (mesmo padrão da Rajada) */
        <div className="grid grid-cols-3 gap-2">
          {alunosFiltrados.map((aluno) => (
            <button
              key={aluno.id}
              onClick={() => navigate(`/professor/alunos/${aluno.id}`)}
              className="flex flex-col items-center gap-1.5 p-2 rounded-xl active:scale-[0.98] transition-transform"
              style={{ backgroundColor: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadowSm }}
            >
              <Avatar className="h-16 w-16">
                <AvatarImage src={aluno.avatarUrl} className="object-cover" />
                <AvatarFallback
                  className="text-base font-semibold"
                  style={{ backgroundColor: t.accentSoft, color: t.accentText }}
                >
                  {getIniciais(aluno.nome)}
                </AvatarFallback>
              </Avatar>
              <p className="text-[11px] text-center leading-tight line-clamp-2" style={{ color: t.text }}>
                {aluno.nome}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default F2AlunosPage;
