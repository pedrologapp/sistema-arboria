import { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCoordenadorCasa } from '@/hooks/useCoordenadorCasa';
import { logCoordenadorLeitura } from '@/utils/logCoordenadorLeitura';
import { coordenadorTheme as t } from '@/styles/coordenadorTheme';
import { tempoRelativo } from '@/lib/coordenador';
import { getIniciais } from '@/lib/infantil';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';

const CoordenadorCasaPage = () => {
  const { id } = useParams<{ id: string }>();
  const casaId = id ? Number(id) : null;
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: casa, isLoading } = useCoordenadorCasa(casaId);

  const jaLogou = useRef(false);
  useEffect(() => {
    if (jaLogou.current || casaId == null || !user?.id) return;
    logCoordenadorLeitura(user.id, null, 'casa');
    jaLogou.current = true;
  }, [casaId, user?.id]);

  if (isLoading) {
    return (
      <div className="pt-3 space-y-3">
        <Skeleton className="h-8 w-40 rounded" style={{ backgroundColor: t.panel }} />
        <Skeleton className="h-20 w-full rounded-2xl" style={{ backgroundColor: t.panel }} />
        <Skeleton className="h-40 w-full rounded-2xl" style={{ backgroundColor: t.panel }} />
      </div>
    );
  }

  if (!casa) {
    return (
      <div className="pt-3">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-[13px] mb-4"
          style={{ color: t.mut }}
        >
          <ArrowLeft size={16} /> Voltar
        </button>
        <div className="rounded-2xl p-6 text-center" style={{ backgroundColor: t.panel, border: `1px solid ${t.line}` }}>
          <p className="text-sm" style={{ color: t.ink }}>
            Esta Casa não está no seu escopo.
          </p>
        </div>
      </div>
    );
  }

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

      <div className="rounded-2xl p-4 mb-5" style={{ backgroundColor: t.panel, border: `1px solid ${t.line}`, borderLeft: `4px solid ${casa.cor}` }}>
        <h1 className="text-lg font-semibold leading-tight" style={{ fontFamily: 'Georgia, serif', color: t.ink }}>
          {casa.nome}
        </h1>
        <p className="text-[11px] mt-1" style={{ color: t.mut }}>
          {casa.nAlunos} {casa.nAlunos === 1 ? 'aluno' : 'alunos'} · {casa.nObservados} observados
        </p>
        <div className="mt-2.5 text-[9px] uppercase tracking-[0.2em] mb-1" style={{ color: t.mut2 }}>
          {casa.mentores.length === 1 ? 'Mentor' : 'Mentores'}
        </div>
        {casa.mentores.length === 0 ? (
          <div className="text-[12px]" style={{ color: t.mut }}>Sem mentor vinculado.</div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {casa.mentores.map((m, i) => (
              <span
                key={i}
                className="text-[11.5px] rounded-lg px-2 py-1"
                style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: t.ink2 }}
              >
                {m.nome}
                {m.principal && <span style={{ color: t.accent2 }}> · principal</span>}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Alunos da Casa */}
      <div className="text-[9px] uppercase tracking-[0.24em] mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
        Alunos da Casa
      </div>
      <div className="rounded-2xl p-3.5 mb-5" style={{ backgroundColor: t.panel, border: `1px solid ${t.line}` }}>
        {casa.alunos.length === 0 ? (
          <div className="text-[12px]" style={{ color: t.mut }}>Nenhum aluno vinculado a esta Casa.</div>
        ) : (
          casa.alunos.map((a, i) => (
            <button
              key={a.id}
              onClick={() => navigate(`/coordenador/aluno/${a.id}`)}
              className="w-full text-left flex items-center gap-2.5 py-2"
              style={{ borderTop: i === 0 ? undefined : `1px solid ${t.line}` }}
            >
              <Avatar className="h-7 w-7 flex-none">
                <AvatarImage src={a.avatarUrl} className="object-cover" />
                <AvatarFallback className="text-[11px]" style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: t.ink2 }}>
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
            </button>
          ))
        )}
      </div>

      {/* Mural da Casa */}
      <div className="text-[9px] uppercase tracking-[0.24em] mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
        Mural da Casa · {casa.mural.length} {casa.mural.length === 1 ? 'registro' : 'registros'}
      </div>
      <div className="rounded-2xl p-3.5" style={{ backgroundColor: t.panel, border: `1px solid ${t.line}` }}>
        {casa.mural.length === 0 ? (
          <div className="text-[12px]" style={{ color: t.mut }}>Nenhuma observação registrada nesta Casa ainda.</div>
        ) : (
          casa.mural.map((ev, i) => (
            <div
              key={ev.id}
              className="flex gap-2 py-2.5"
              style={{ borderTop: i === 0 ? undefined : `1px solid ${t.line}` }}
            >
              <span className="w-1.5 h-1.5 rounded-full mt-[6px] flex-none" style={{ backgroundColor: casa.cor }} />
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

      <p className="text-[9.5px] italic mt-3" style={{ color: t.mut2 }}>
        A Casa é o time de mentoria do F2. Cobertura e mural mostram o acompanhamento, não são
        diagnóstico nem placar da criança.
      </p>
    </div>
  );
};

export default CoordenadorCasaPage;
