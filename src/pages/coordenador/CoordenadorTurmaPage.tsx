import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, List, LayoutGrid, FileText } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCoordenador } from '@/contexts/CoordenadorContext';
import { useCoordenadorTurma } from '@/hooks/useCoordenadorTurma';
import { useTurmaAtividadePlano } from '@/hooks/useTurmaAtividadePlano';
import { useTurmaAtividadeEventos, derivarCorrente } from '@/hooks/useTurmaAtividadeEventos';
import { logCoordenadorLeitura } from '@/utils/logCoordenadorLeitura';
import { coordenadorTheme as t } from '@/styles/coordenadorTheme';
import { tempoRelativo } from '@/lib/coordenador';
import { getIniciais } from '@/lib/infantil';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';

const SEGMENTO_LABEL: Record<string, string> = {
  infantil: 'Educação Infantil',
  fundamental1: 'Fundamental 1',
  fundamental2: 'Fundamental 2',
};

const TOTAL = 8;

const CoordenadorTurmaPage = () => {
  const { id: turmaId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { institutionId } = useCoordenador();
  const { data: turma, isLoading } = useCoordenadorTurma(turmaId, institutionId);

  // LOG de leitura da turma (fire-and-forget).
  const jaLogou = useRef(false);
  useEffect(() => {
    if (jaLogou.current || !turmaId || !user?.id) return;
    logCoordenadorLeitura(user.id, turmaId, 'turma');
    jaLogou.current = true;
  }, [turmaId, user?.id]);

  const ordem = turma?.ordemAtual ?? 0;
  const iniciada = ordem >= 1;

  // Visão dos alunos: lista (padrão) ou grade.
  const [vistaAlunos, setVistaAlunos] = useState<'lista' | 'grade'>('lista');

  // Atividades escolhidas para a fase corrente (canônico: inteligencia == ordem).
  const { data: plano } = useTurmaAtividadePlano(turmaId, iniciada ? ordem : null, iniciada);
  const atividadeIds = useMemo(() => (plano || []).map((a) => a.atividadeId), [plano]);
  const { data: concluidasSet } = useTurmaAtividadeEventos(turmaId, atividadeIds);
  const { concluidas } = useMemo(
    () => derivarCorrente(plano || [], concluidasSet || new Set<string>()),
    [plano, concluidasSet]
  );

  if (isLoading) {
    return (
      <div className="pt-3 space-y-3">
        <Skeleton className="h-8 w-40 rounded" style={{ backgroundColor: t.panel }} />
        <Skeleton className="h-20 w-full rounded-2xl" style={{ backgroundColor: t.panel }} />
        <Skeleton className="h-40 w-full rounded-2xl" style={{ backgroundColor: t.panel }} />
      </div>
    );
  }

  if (!turma) {
    return (
      <div className="pt-3">
        <button
          onClick={() => navigate('/coordenador')}
          className="inline-flex items-center gap-1.5 text-[13px] mb-4"
          style={{ color: t.mut }}
        >
          <ArrowLeft size={16} /> Voltar
        </button>
        <div
          className="rounded-2xl p-6 text-center"
          style={{ backgroundColor: t.panel, border: `1px solid ${t.line}` }}
        >
          <p className="text-sm" style={{ color: t.ink }}>
            Esta turma não está no seu escopo.
          </p>
        </div>
      </div>
    );
  }

  const rotuloSerie =
    /^\d+$/.test(turma.serie) ? `${turma.serie}º ano` : turma.serie;
  const subtitulo = [
    turma.professorNome,
    SEGMENTO_LABEL[turma.segmento] || turma.segmento,
    `${turma.nAlunos} ${turma.nAlunos === 1 ? 'aluno' : 'alunos'}`,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="pt-2">
      {/* Cabeçalho */}
      <div className="flex items-center gap-2.5 mb-4">
        <button
          onClick={() => navigate('/coordenador')}
          className="w-8 h-8 rounded-full flex items-center justify-center flex-none"
          style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: t.mut }}
          aria-label="Voltar"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="min-w-0">
          <h1 className="text-lg font-semibold leading-tight" style={{ fontFamily: 'Georgia, serif', color: t.ink }}>
            {turma.nome || rotuloSerie}
          </h1>
          <p className="text-[10.5px] truncate" style={{ color: t.mut }}>
            {subtitulo}
          </p>
        </div>
      </div>

      {/* Trilha do ano */}
      <div className="text-[9px] uppercase tracking-[0.24em] mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
        Trilha do ano
      </div>
      <div className="rounded-2xl p-3.5 mb-4" style={{ backgroundColor: t.panel, border: `1px solid ${t.line}` }}>
        <div className="flex items-center gap-1.5 mb-2">
          {Array.from({ length: TOTAL }).map((_, i) => {
            const pos = i + 1;
            const done = iniciada && pos < ordem;
            const now = iniciada && pos === ordem;
            return (
              <div key={pos} className="flex items-center gap-1.5 flex-1 last:flex-none">
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-none"
                  style={{
                    backgroundColor: done ? t.ok : now ? t.accent : 'rgba(255,255,255,0.06)',
                    color: done ? '#0c1a13' : now ? '#fff' : t.mut2,
                    boxShadow: now ? `0 0 0 3px ${t.accentDim}` : undefined,
                  }}
                >
                  {pos}
                </span>
                {pos < TOTAL && (
                  <span className="flex-1 h-0.5" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }} />
                )}
              </div>
            );
          })}
        </div>
        <div className="text-[11px]" style={{ color: t.ink2 }}>
          {iniciada ? (
            <>
              Agora na <span className="text-white font-semibold">Fase {turma.faseNome || ordem}</span> · {ordem} de {TOTAL}
            </>
          ) : (
            <span style={{ color: t.mut }}>Trilha ainda não iniciada nesta turma.</span>
          )}
        </div>
      </div>

      {/* Atividades escolhidas para a fase */}
      <div className="text-[9px] uppercase tracking-[0.24em] mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
        Atividades escolhidas para a fase
      </div>
      <div className="rounded-2xl p-3.5 mb-4" style={{ backgroundColor: t.panel, border: `1px solid ${t.line}` }}>
        {!iniciada ? (
          <div className="text-[12px]" style={{ color: t.mut }}>
            As atividades aparecem quando a turma entra na fase.
          </div>
        ) : (plano || []).length === 0 ? (
          <div className="text-[12px]" style={{ color: t.mut }}>
            Nenhuma atividade montada para esta fase ainda.
          </div>
        ) : (
          <div>
            {(plano || []).map((a, i) => {
              const feita = concluidas.has(a.atividadeId);
              return (
                <div
                  key={a.atividadeId}
                  className="flex items-center gap-2.5 py-2"
                  style={{ borderTop: i === 0 ? undefined : `1px solid ${t.line}` }}
                >
                  <span
                    className="rounded-md flex items-center justify-center text-[10px] flex-none"
                    style={{ width: 22, height: 22, backgroundColor: t.accentDim, color: t.accent2 }}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[12px] truncate" style={{ color: t.ink }}>
                      {a.nome}
                    </div>
                    {a.objetivo && (
                      <div className="text-[9.5px] truncate" style={{ color: t.mut }}>
                        {a.objetivo}
                      </div>
                    )}
                  </div>
                  {feita && (
                    <span className="text-[9px] flex-none" style={{ color: t.ok }}>
                      concluída
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Mural da turma: as observações registradas pelos professores, acima dos alunos. */}
      <div className="text-[9px] uppercase tracking-[0.24em] mb-2 mt-4" style={{ color: 'rgba(255,255,255,0.3)' }}>
        Mural da turma · {turma.mural.length} {turma.mural.length === 1 ? 'registro' : 'registros'}
      </div>
      <div className="rounded-2xl p-3.5 mb-5" style={{ backgroundColor: t.panel, border: `1px solid ${t.line}` }}>
        {turma.mural.length === 0 ? (
          <div className="text-[12px]" style={{ color: t.mut }}>
            Nenhuma observação registrada nesta turma ainda.
          </div>
        ) : (
          turma.mural.map((ev, i) => (
            <div
              key={ev.id}
              className="flex gap-2 py-2.5"
              style={{ borderTop: i === 0 ? undefined : `1px solid ${t.line}` }}
            >
              <span className="w-1.5 h-1.5 rounded-full mt-[6px] flex-none" style={{ backgroundColor: t.accent2 }} />
              <div className="min-w-0 flex-1">
                <div className="text-[11.5px] leading-snug" style={{ color: t.ink2 }}>
                  {ev.professorNome ? (
                    <>
                      <span>{ev.professorNome} registrou </span>
                      <span className="text-white font-semibold">{ev.alunoNome || 'aluno'}</span>
                    </>
                  ) : (
                    <span className="text-white font-semibold">{ev.alunoNome || 'Registro'}</span>
                  )}
                </div>
                {ev.texto && (
                  <div className="text-[11.5px] leading-snug mt-0.5" style={{ color: t.mut }}>
                    {ev.texto}
                  </div>
                )}
                <div className="text-[9px] mt-0.5" style={{ color: t.mut2 }}>
                  {tempoRelativo(ev.createdAt)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Alunos + medidor de cobertura */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="text-[9px] uppercase tracking-[0.24em] min-w-0 truncate" style={{ color: 'rgba(255,255,255,0.3)' }}>
          Alunos · {turma.nObservados} de {turma.nAlunos} observados na fase
        </div>
        {turma.alunos.length > 0 && (
          <div
            className="flex items-center gap-0.5 rounded-lg p-0.5 flex-none"
            style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: `1px solid ${t.line}` }}
          >
            <button
              onClick={() => setVistaAlunos('lista')}
              className="w-6 h-6 rounded-md flex items-center justify-center transition-colors"
              style={
                vistaAlunos === 'lista'
                  ? { backgroundColor: t.accent, color: '#fff' }
                  : { color: t.mut }
              }
              aria-label="Ver em lista"
            >
              <List size={13} />
            </button>
            <button
              onClick={() => setVistaAlunos('grade')}
              className="w-6 h-6 rounded-md flex items-center justify-center transition-colors"
              style={
                vistaAlunos === 'grade'
                  ? { backgroundColor: t.accent, color: '#fff' }
                  : { color: t.mut }
              }
              aria-label="Ver em grade"
            >
              <LayoutGrid size={13} />
            </button>
          </div>
        )}
      </div>
      <div className="rounded-2xl p-3.5" style={{ backgroundColor: t.panel, border: `1px solid ${t.line}` }}>
        {turma.alunos.length === 0 ? (
          <div className="text-[12px]" style={{ color: t.mut }}>
            Nenhum aluno vinculado a esta turma.
          </div>
        ) : vistaAlunos === 'grade' ? (
          <div className="grid grid-cols-3 gap-2.5">
            {turma.alunos.map((a) => (
              <button
                key={a.id}
                onClick={() => navigate(`/coordenador/aluno/${a.id}`)}
                className="relative flex flex-col items-center text-center rounded-xl p-2.5 transition-transform active:scale-[0.97]"
                style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: `1px solid ${t.line}` }}
              >
                <span
                  className="absolute top-1.5 right-1.5 w-[7px] h-[7px] rounded-full"
                  style={{ backgroundColor: a.observadoNaFase ? t.ok : 'rgba(255,255,255,0.15)' }}
                  title={a.observadoNaFase ? 'Já observado nesta fase' : 'Ainda não observado nesta fase'}
                />
                {a.nObs > 0 && (
                  <span
                    className="absolute top-1.5 left-1.5 inline-flex items-center gap-0.5 rounded-md px-1 py-[1px] text-[8.5px] font-semibold"
                    style={{ backgroundColor: t.accentDim, color: t.accent2 }}
                    title={`${a.nObs} ${a.nObs === 1 ? 'observação' : 'observações'}`}
                  >
                    <FileText size={9} />
                    {a.nObs}
                  </span>
                )}
                <Avatar className="h-11 w-11 mb-1.5">
                  <AvatarImage src={a.avatarUrl} className="object-cover" />
                  <AvatarFallback
                    className="text-[13px]"
                    style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: t.ink2 }}
                  >
                    {getIniciais(a.nome)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-[11px] text-white leading-tight line-clamp-2">{a.nome}</span>
              </button>
            ))}
          </div>
        ) : (
          turma.alunos.map((a, i) => (
            <button
              key={a.id}
              onClick={() => navigate(`/coordenador/aluno/${a.id}`)}
              className="w-full text-left flex items-center gap-2.5 py-2 transition-colors"
              style={{ borderTop: i === 0 ? undefined : `1px solid ${t.line}` }}
            >
              <Avatar className="h-7 w-7 flex-none">
                <AvatarImage src={a.avatarUrl} className="object-cover" />
                <AvatarFallback
                  className="text-[11px]"
                  style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: t.ink2 }}
                >
                  {getIniciais(a.nome)}
                </AvatarFallback>
              </Avatar>
              <span className="text-[12.5px] text-white flex-1 truncate">{a.nome}</span>
              {a.nObs > 0 && (
                <span
                  className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-[1px] text-[9.5px] font-semibold flex-none"
                  style={{ backgroundColor: t.accentDim, color: t.accent2 }}
                  title={`${a.nObs} ${a.nObs === 1 ? 'observação' : 'observações'}`}
                >
                  <FileText size={10} />
                  {a.nObs}
                </span>
              )}
              <span
                className="w-[7px] h-[7px] rounded-full flex-none"
                style={{ backgroundColor: a.observadoNaFase ? t.ok : 'rgba(255,255,255,0.15)' }}
                title={a.observadoNaFase ? 'Já observado nesta fase' : 'Ainda não observado nesta fase'}
              />
            </button>
          ))
        )}
      </div>
      <p className="text-[9.5px] italic mt-2.5" style={{ color: t.mut2 }}>
        O ponto verde marca que o aluno já foi observado nesta fase; apagado, ainda não. É a cobertura
        do professor, não um juízo sobre a criança. A etiqueta marca quantas observações cada aluno tem.
      </p>
    </div>
  );
};

export default CoordenadorTurmaPage;
