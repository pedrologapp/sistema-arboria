import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Search, NotebookPen } from 'lucide-react';
import { useProfessor } from '@/contexts/ProfessorContext';
import { useAlunosTurmasComStatus } from '@/hooks/useAlunosTurmasComStatus';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { infantilTheme as t } from '@/styles/infantilTheme';

const getIniciais = (nome: string) => {
  const parts = nome.split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

/**
 * Aba DIÁRIO (Infantil) — as crianças cuja história o professor escreve.
 * Lista as crianças das turmas do professor; tocar abre a história (thread).
 */
const InfantilAlunosPage = () => {
  const navigate = useNavigate();
  const { turmasVinculadas, faseAtual } = useProfessor();
  const { data: alunos, isLoading } = useAlunosTurmasComStatus();

  const [turmaFiltro, setTurmaFiltro] = useState<string | null>(null);
  const [busca, setBusca] = useState('');

  const alunosFiltrados = useMemo(() => {
    if (!alunos) return [];
    return alunos.filter((a) => {
      if (turmaFiltro && a.turmaId !== turmaFiltro) return false;
      if (busca && !a.nome.toLowerCase().includes(busca.toLowerCase())) return false;
      return true;
    });
  }, [alunos, turmaFiltro, busca]);

  const semRegistro = (alunos || []).filter((a) => a.quantidadeObservacoes === 0).length;

  return (
    <div className="pt-5 space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: t.text }}>
          <NotebookPen size={22} style={{ color: t.accent }} strokeWidth={1.75} />
          Diário
        </h1>
        <p className="text-sm mt-0.5" style={{ color: t.textFaint }}>
          {faseAtual?.inteligencia?.nome ? `Fase ${faseAtual.inteligencia.nome} · ` : ''}
          {alunos?.length || 0} crianças
        </p>
      </div>

      {/* Convite no presente */}
      {!isLoading && (alunos?.length ?? 0) > 0 && (
        <div
          className="rounded-2xl p-3.5"
          style={{ backgroundColor: t.accentSoft, border: `1px solid ${t.border}` }}
        >
          <p className="text-sm font-semibold" style={{ color: t.accentText }}>
            Quem você vai enxergar hoje?
          </p>
          {semRegistro > 0 && (
            <p className="text-xs mt-0.5" style={{ color: t.accentText }}>
              {semRegistro === 1
                ? '1 criança ainda espera um momento seu.'
                : `${semRegistro} crianças ainda esperam um momento seu.`}
            </p>
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
              {turma.serie}º {turma.turma_letra}
            </FiltroChip>
          ))}
        </div>
      )}

      {/* Busca */}
      <div className="relative">
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
      ) : (
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
                <p className="text-xs mt-0.5" style={{ color: t.textFaint }}>
                  {aluno.quantidadeObservacoes > 0
                    ? `${aluno.quantidadeObservacoes} ${aluno.quantidadeObservacoes === 1 ? 'momento registrado' : 'momentos registrados'}`
                    : 'História ainda em branco'}
                </p>
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

export default InfantilAlunosPage;
