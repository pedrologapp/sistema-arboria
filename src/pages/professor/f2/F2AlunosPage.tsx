import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Search, NotebookPen, List, LayoutGrid, ChevronLeft, Shield, ChevronRight } from 'lucide-react';
import { useProfessor } from '@/contexts/ProfessorContext';
import { useTurmasF2Instituicao, useAlunosDaTurmaF2 } from '@/hooks/useF2Diario';
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
import { corDaCasa } from '@/config/f2Reforma';

const CHAVE_TURMA = 'f2-diario-turma';

/**
 * Aba DIÁRIO (Fundamental 2, reforma). Fluxo em DOIS passos porque o mentor tem
 * acesso a VÁRIAS turmas:
 *   1. Escolher a turma (grade no estilo da aba Arboria do F2).
 *   2. Lista de alunos daquela turma (mesmo visual claro do Infantil/F1);
 *      tocar num aluno abre o diário (thread).
 *
 * ACESSO COMPARTILHADO: no F2 não há vinculação por turma. Qualquer mentor vê
 * TODAS as turmas do Fundamental 2 da instituição e TODOS os alunos delas
 * (useTurmasF2Instituicao / useAlunosDaTurmaF2, por institution_id e turma_id).
 *
 * Só é montada quando segmento === 'fundamental2' E F2_REFORMA_ATIVA
 * (o roteamento vive no AlunosPageWrapper). Tema claro, infantilTheme.
 */
const F2AlunosPage = () => {
  const navigate = useNavigate();
  const { profile, casaMentor } = useProfessor();
  const { data: turmas, isLoading: turmasLoading } = useTurmasF2Instituicao(profile?.institution_id);

  // Turma escolhida persiste ao entrar/voltar de um thread (evita reescolher a
  // cada aluno). Uma só turma no F2 pula o passo 1 (default abaixo).
  const [turmaSel, setTurmaSelState] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem(CHAVE_TURMA);
    } catch {
      return null;
    }
  });
  const setTurmaSel = (id: string | null) => {
    setTurmaSelState(id);
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

  const cor = corDaCasa(casaMentor?.id);

  const listaTurmas = turmas ?? [];
  const turmaUnica = listaTurmas.length === 1 ? listaTurmas[0].id : null;
  const turmaAtiva = turmaSel ?? turmaUnica;
  // Se a turma salva não existe mais na instituição, volta pra escolha.
  const turmaValida = turmaAtiva && listaTurmas.some((x) => x.id === turmaAtiva) ? turmaAtiva : null;
  const turmaInfo = listaTurmas.find((x) => x.id === turmaValida) ?? null;

  // Alunos SÓ da turma escolhida (todos os alunos da turma, sem vinculação).
  const { data: alunos, isLoading: alunosLoading } = useAlunosDaTurmaF2(turmaValida);

  const alunosFiltrados = useMemo(() => {
    if (!alunos) return [];
    return alunos.filter((a) => {
      if (busca && !normalizarBusca(a.nome).includes(normalizarBusca(busca))) return false;
      return true;
    });
  }, [alunos, busca]);

  // ---- PASSO 1: escolher a turma ------------------------------------------
  if (!turmaValida) {
    return (
      <div className="pt-5 space-y-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: t.text }}>
            <NotebookPen size={22} style={{ color: t.accent }} strokeWidth={1.75} />
            Diário
          </h1>
          <p className="text-sm mt-0.5" style={{ color: t.textFaint }}>
            Escolha a turma para ver seus alunos.
          </p>
        </div>

        {turmasLoading ? (
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))}
          </div>
        ) : listaTurmas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mb-3"
              style={{ backgroundColor: t.accentSoft }}
            >
              <Users size={28} style={{ color: t.accent }} strokeWidth={1.5} />
            </div>
            <p className="text-sm" style={{ color: t.textMuted }}>
              Não há turmas do Fundamental 2 nesta instituição.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {listaTurmas.map((turma) => (
              <button
                key={turma.id}
                onClick={() => setTurmaSel(turma.id)}
                className="w-full h-full rounded-2xl p-3 text-left transition-transform active:scale-[0.99]"
                style={{ backgroundColor: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadowSm }}
              >
                <span
                  className="rounded-xl flex items-center justify-center"
                  style={{ width: 38, height: 38, backgroundColor: `${cor}1A` }}
                >
                  <Shield size={20} style={{ color: cor }} strokeWidth={1.75} />
                </span>
                <p className="text-sm font-bold mt-2.5" style={{ color: t.text }}>
                  {formatTurmaLabel(turma.serie, turma.turma_letra) || turma.nome}
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: t.textFaint }}>
                  Ver alunos
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ---- PASSO 2: lista de alunos da turma escolhida ------------------------
  const podeTrocar = listaTurmas.length > 1;
  const turmaLabel = turmaInfo
    ? formatTurmaLabel(turmaInfo.serie, turmaInfo.turma_letra) || turmaInfo.nome
    : '';
  const totalAlunos = alunos?.length ?? 0;

  return (
    <div className="pt-5 space-y-4">
      {/* Header com voltar pra escolha da turma */}
      <div>
        {podeTrocar && (
          <button
            onClick={() => {
              setTurmaSel(null);
              setBusca('');
            }}
            className="flex items-center gap-1 text-xs font-medium mb-1.5 -ml-1 p-1 rounded-lg"
            style={{ color: t.accentText }}
          >
            <ChevronLeft size={15} /> Trocar de turma
          </button>
        )}
        <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: t.text }}>
          <NotebookPen size={22} style={{ color: t.accent }} strokeWidth={1.75} />
          Diário
        </h1>
        <p className="text-sm mt-0.5" style={{ color: t.textFaint }}>
          {turmaLabel}
          {!alunosLoading ? ` · ${totalAlunos} ${totalAlunos === 1 ? 'aluno' : 'alunos'}` : ''}
        </p>
      </div>

      {/* Convite no presente */}
      {!alunosLoading && totalAlunos > 0 && (
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
