import { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCoordenadorAluno } from '@/hooks/useCoordenadorAluno';
import { logCoordenadorLeitura } from '@/utils/logCoordenadorLeitura';
import { coordenadorTheme as t } from '@/styles/coordenadorTheme';
import { tempoRelativo } from '@/lib/coordenador';
import { getIniciais } from '@/lib/infantil';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';

const SEG_LABEL: Record<string, string> = {
  infantil: 'Educação Infantil',
  fundamental1: 'Fundamental 1',
  fundamental2: 'Fundamental 2',
};

const CoordenadorAlunoPage = () => {
  const { id: alunoId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: aluno, isLoading } = useCoordenadorAluno(alunoId);

  // LOG de leitura do perfil do aluno (fire-and-forget).
  const jaLogou = useRef(false);
  useEffect(() => {
    if (jaLogou.current || !alunoId || !user?.id) return;
    logCoordenadorLeitura(user.id, null, 'aluno');
    jaLogou.current = true;
  }, [alunoId, user?.id]);

  if (isLoading) {
    return (
      <div className="pt-3 space-y-3">
        <Skeleton className="h-8 w-40 rounded" style={{ backgroundColor: t.panel }} />
        <Skeleton className="h-20 w-full rounded-2xl" style={{ backgroundColor: t.panel }} />
        <Skeleton className="h-40 w-full rounded-2xl" style={{ backgroundColor: t.panel }} />
      </div>
    );
  }

  if (!aluno) {
    return (
      <div className="pt-3">
        <button
          onClick={() => navigate(-1)}
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
            Este aluno não está no seu escopo.
          </p>
        </div>
      </div>
    );
  }

  const subtitulo = [
    aluno.turmaNome,
    aluno.segmento ? SEG_LABEL[aluno.segmento] || aluno.segmento : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="pt-2">
      {/* Cabeçalho */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-[13px] mb-4"
        style={{ color: t.mut }}
      >
        <ArrowLeft size={16} /> Voltar
      </button>

      <div className="flex items-center gap-3 mb-5">
        <Avatar className="h-14 w-14 flex-none">
          <AvatarImage src={aluno.avatarUrl} className="object-cover" />
          <AvatarFallback
            className="text-[16px]"
            style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: t.ink2 }}
          >
            {getIniciais(aluno.nome)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <h1 className="text-lg font-semibold leading-tight" style={{ fontFamily: 'Georgia, serif', color: t.ink }}>
            {aluno.nome}
          </h1>
          {subtitulo && (
            <p className="text-[11px] truncate" style={{ color: t.mut }}>
              {subtitulo}
            </p>
          )}
          <p className="text-[10.5px] mt-0.5 inline-flex items-center gap-1" style={{ color: t.accent2 }}>
            <FileText size={11} />
            {aluno.totalObservacoes} {aluno.totalObservacoes === 1 ? 'observação' : 'observações'}
          </p>
        </div>
      </div>

      {/* Linha do tempo */}
      <div className="text-[9px] uppercase tracking-[0.24em] mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
        Linha do tempo
      </div>
      <div className="rounded-2xl p-3.5" style={{ backgroundColor: t.panel, border: `1px solid ${t.line}` }}>
        {aluno.historico.length === 0 ? (
          <div className="text-[12px]" style={{ color: t.mut }}>
            Nenhum registro deste aluno ainda.
          </div>
        ) : (
          aluno.historico.map((ev, i) => (
            <div
              key={ev.id}
              className="flex gap-2.5 py-2.5"
              style={{ borderTop: i === 0 ? undefined : `1px solid ${t.line}` }}
            >
              <span className="w-1.5 h-1.5 rounded-full mt-[6px] flex-none" style={{ backgroundColor: t.accent2 }} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap text-[10px]" style={{ color: t.mut2 }}>
                  <span>{tempoRelativo(ev.createdAt)}</span>
                  {ev.turmaNome && (
                    <>
                      <span>·</span>
                      <span>{ev.turmaNome}</span>
                    </>
                  )}
                  {ev.faseNome && (
                    <span
                      className="rounded px-1.5 py-[1px]"
                      style={{ backgroundColor: t.accentDim, color: t.accent2 }}
                    >
                      {ev.faseNome}
                    </span>
                  )}
                </div>
                {ev.professorNome && (
                  <div className="text-[10.5px] mt-0.5" style={{ color: t.mut }}>
                    registro de {ev.professorNome}
                  </div>
                )}
                {ev.texto ? (
                  <div className="text-[12.5px] leading-snug mt-1" style={{ color: t.ink }}>
                    {ev.texto}
                  </div>
                ) : (
                  <div className="text-[12px] italic mt-1" style={{ color: t.mut2 }}>
                    (sem texto)
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <p className="text-[9.5px] italic mt-3" style={{ color: t.mut2 }}>
        A linha do tempo reúne o que os professores registraram sobre o aluno. É um registro de
        processo, nunca um placar. Outras fontes (missões, desafios, diário) entram aqui conforme
        passam a ter conteúdo.
      </p>
    </div>
  );
};

export default CoordenadorAlunoPage;
