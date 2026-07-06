import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Search, NotebookPen, List, LayoutGrid, ChevronDown, ChevronUp } from 'lucide-react';
import { useProfessor } from '@/contexts/ProfessorContext';
import { useAlunosTurmasComStatus } from '@/hooks/useAlunosTurmasComStatus';
import { useFaseTurma } from '@/hooks/useFaseTurma';
import { ACADEMIA_F1 } from '@/lib/f1';
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

/**
 * Aba DIÁRIO (Fundamental 1): os alunos cuja história o professor escreve.
 * Lista os alunos das turmas do professor; tocar abre a história (thread).
 */
const F1AlunosPage = () => {
  const navigate = useNavigate();
  const { turmasVinculadas, profile } = useProfessor();
  const { data: alunos, isLoading } = useAlunosTurmasComStatus();

  // Filtro de turma persiste ao entrar/voltar de um thread
  const [turmaFiltro, setTurmaFiltroState] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem('infantil-diario-filtro');
    } catch {
      return null;
    }
  });
  const setTurmaFiltro = (id: string | null) => {
    setTurmaFiltroState(id);
    try {
      if (id) sessionStorage.setItem('infantil-diario-filtro', id);
      else sessionStorage.removeItem('infantil-diario-filtro');
    } catch {
      /* segue só em memória */
    }
  };
  const [busca, setBusca] = useState('');
  const [exemplosAbertos, setExemplosAbertos] = useState(false);
  // Preferência compartilhada com a Rajada (quem escolhe círculos lá, encontra círculos aqui)
  const [viewMode, setViewModeState] = useState<'lista' | 'circulos'>(getViewModePreferido());
  const setViewMode = (modo: 'lista' | 'circulos') => {
    setViewModeState(modo);
    salvarViewModePreferido(modo);
  };

  const alunosFiltrados = useMemo(() => {
    if (!alunos) return [];
    return alunos.filter((a) => {
      if (turmaFiltro && a.turmaId !== turmaFiltro) return false;
      if (busca && !normalizarBusca(a.nome).includes(normalizarBusca(busca))) return false;
      return true;
    });
  }, [alunos, turmaFiltro, busca]);

  // Módulo pelo rótulo da TRILHA DA TURMA em foco (nunca o ramo genérico por
  // datas do ProfessorContext, que não conhece a trilha do F1). Com 2+ turmas
  // sem filtro, o rótulo é omitido: cada turma pode estar num módulo diferente.
  const turmaDoRotulo = turmaFiltro ?? (turmasVinculadas?.length === 1 ? turmasVinculadas[0].id : null);
  const { data: faseTurmaRotulo } = useFaseTurma(turmaDoRotulo, profile?.institution_id, 'fundamental1');
  const moduloAtualNome = faseTurmaRotulo?.fase?.inteligencia?.id
    ? ACADEMIA_F1[faseTurmaRotulo.fase.inteligencia.id]
    : null;

  return (
    <div className="pt-5 space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: t.text }}>
          <NotebookPen size={22} style={{ color: t.accent }} strokeWidth={1.75} />
          Diário
        </h1>
        <p className="text-sm mt-0.5" style={{ color: t.textFaint }}>
          {moduloAtualNome ? `Módulo ${moduloAtualNome} · ` : ''}
          {alunos?.length || 0} alunos
        </p>
      </div>

      {/* Convite no presente */}
      {!isLoading && (alunos?.length ?? 0) > 0 && (
        <div
          className="rounded-2xl p-3.5"
          style={{ backgroundColor: t.accentSoft, border: `1px solid ${t.accentBorder}` }}
        >
          {/* Só o convite, SEM contador de sem-registro (lei do modelo). */}
          <p className="text-sm font-semibold" style={{ color: t.accentText }}>
            Quem você vai enxergar hoje?
          </p>

          {/* EXPANSÍVEL: como registrar bem; a maior alavanca de qualidade
              do dado: ensinar "chegou assim" vs "foi bem". */}
          <button
            onClick={() => setExemplosAbertos((v) => !v)}
            className="flex items-center gap-1 text-xs font-medium mt-1.5"
            style={{ color: t.accentText }}
            aria-expanded={exemplosAbertos}
          >
            Como registrar bem?{' '}
            {exemplosAbertos ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>

          {exemplosAbertos && (
            <div className="mt-2.5 pt-2.5 space-y-2.5" style={{ borderTop: `1px solid ${t.accentBorder}` }}>
              <p className="text-xs leading-relaxed font-medium" style={{ color: t.accentText }}>
                Registre o caminho, não o resultado: o que o aluno fez primeiro, por onde
                entrou, como reagiu ao obstáculo, a fala dele.
              </p>

              <div className="rounded-xl p-2.5 space-y-0.5" style={{ backgroundColor: 'rgba(255,255,255,0.6)' }}>
                <p className="text-xs" style={{ color: t.textFaint }}>
                  <span className="font-semibold">✗</span> "Foi bem no trabalho em grupo."
                </p>
                <p className="text-xs leading-relaxed" style={{ color: t.text }}>
                  <span className="font-semibold" style={{ color: t.presenteText }}>✓</span>{' '}
                  "Diante do problema da lousa, não somou de cara: desenhou a situação no canto
                  do caderno, contou nos dedos pra conferir e só então armou a conta. Disse:
                  'primeiro eu preciso ver o que tá acontecendo pra saber que conta é'."
                </p>
              </div>

              <div className="rounded-xl p-2.5 space-y-0.5" style={{ backgroundColor: 'rgba(255,255,255,0.6)' }}>
                <p className="text-xs" style={{ color: t.textFaint }}>
                  <span className="font-semibold">✗</span> "Leu bem o texto."
                </p>
                <p className="text-xs leading-relaxed" style={{ color: t.text }}>
                  <span className="font-semibold" style={{ color: t.presenteText }}>✓</span>{' '}
                  "No reconto da segunda, lembrou a fala exata da personagem, não só o que
                  aconteceu. Guardou as palavras, não só o enredo."
                </p>
              </div>

              <div className="rounded-xl p-2.5 space-y-0.5" style={{ backgroundColor: 'rgba(255,255,255,0.6)' }}>
                <p className="text-xs" style={{ color: t.textFaint }}>
                  <span className="font-semibold">✗</span> "Não quis apresentar."
                </p>
                <p className="text-xs leading-relaxed" style={{ color: t.text }}>
                  <span className="font-semibold" style={{ color: t.presenteText }}>✓</span>{' '}
                  "Recusou apresentar, mas assistiu a dos colegas anotando o que faria diferente: entrou pela observação, não pelo palco."
                </p>
              </div>

              <p className="text-xs italic leading-relaxed" style={{ color: t.accentText }}>
                Você não precisa concluir nada: descreva a cena; a leitura vem depois.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Filtro por turma */}
      {turmasVinculadas && turmasVinculadas.length > 1 && (
        <div className="flex gap-1.5 flex-wrap">
          <FiltroChip ativo={turmaFiltro === null} onClick={() => setTurmaFiltro(null)}>
            Todas
          </FiltroChip>
          {turmasVinculadas.map((turma) => (
            <FiltroChip
              key={turma.id}
              ativo={turmaFiltro === turma.id}
              onClick={() => setTurmaFiltro(turma.id)}
            >
              {formatTurmaLabel(turma.serie, turma.turma_letra)}
            </FiltroChip>
          ))}
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
      {isLoading ? (
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
            {busca || turmaFiltro ? 'Nenhum aluno com esse filtro.' : 'Não há alunos nas suas turmas.'}
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
              {aluno.serie && (
                <span
                  className="flex-shrink-0 text-[11px] px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: t.surfaceAlt, color: t.textMuted, border: `1px solid ${t.border}` }}
                >
                  {aluno.serie}
                  {aluno.turma ? ` · ${aluno.turma}` : ''}
                </span>
              )}
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

const FiltroChip = ({
  ativo,
  onClick,
  children,
}: {
  ativo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    onClick={onClick}
    className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
    style={
      ativo
        ? { backgroundColor: t.accent, color: '#FFFFFF' }
        : { backgroundColor: t.surface, color: t.textMuted, border: `1px solid ${t.border}` }
    }
  >
    {children}
  </button>
);

export default F1AlunosPage;
