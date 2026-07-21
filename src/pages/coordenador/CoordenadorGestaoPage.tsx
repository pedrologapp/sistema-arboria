import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCoordenador } from '@/contexts/CoordenadorContext';
import { useCoordenadorGestao, CoordenadorTurmaCard } from '@/hooks/useCoordenadorGestao';
import { useCoordenadorCasas } from '@/hooks/useCoordenadorCasas';
import { logCoordenadorLeituraLote } from '@/utils/logCoordenadorLeitura';
import { coordenadorTheme as t } from '@/styles/coordenadorTheme';
import { sinalUltimoAcesso, rotuloAcesso, corCobertura, tempoRelativo } from '@/lib/coordenador';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const SEG_LABEL: Record<string, string> = {
  infantil: 'Educação Infantil',
  fundamental1: 'Fundamental 1',
  fundamental2: 'Fundamental 2',
};
const SEG_ORDEM = ['infantil', 'fundamental1', 'fundamental2'];

// Linha de turmas rolavel. No touch, desliza com o dedo. No DESKTOP, aparecem
// setas ‹ › quando ha turma escondida (ex.: 5o ano A/B/C: a C ficava
// inalcancavel no mouse porque a barra de scroll e' escondida).
const LinhaTurmas = ({ children }: { children: ReactNode }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [canL, setCanL] = useState(false);
  const [canR, setCanR] = useState(false);
  const atualiza = () => {
    const el = ref.current;
    if (!el) return;
    setCanL(el.scrollLeft > 2);
    setCanR(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  };
  useEffect(() => {
    atualiza();
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(atualiza);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const rolar = (dir: number) => ref.current?.scrollBy({ left: dir * 280, behavior: 'smooth' });
  const btnCls = 'hidden md:flex absolute top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full items-center justify-center';
  const btnStyle = { backgroundColor: t.panel, border: `1px solid ${t.line}`, boxShadow: '0 2px 8px rgba(0,0,0,0.14)' } as const;
  return (
    <div className="relative">
      {canL && (
        <button aria-label="Turmas anteriores" onClick={() => rolar(-1)} className={`${btnCls} left-0`} style={btnStyle}>
          <ChevronLeft size={18} style={{ color: t.ink }} />
        </button>
      )}
      {canR && (
        <button aria-label="Mais turmas" onClick={() => rolar(1)} className={`${btnCls} right-0`} style={btnStyle}>
          <ChevronRight size={18} style={{ color: t.ink }} />
        </button>
      )}
      <div
        ref={ref}
        onScroll={atualiza}
        className="flex gap-2.5 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {children}
      </div>
    </div>
  );
};

const CardTurma = ({ turma, onOpen }: { turma: CoordenadorTurmaCard; onOpen: () => void }) => {
  const sinal = sinalUltimoAcesso(turma.ultimaAtividade);
  const pctObs = turma.nAlunos > 0 ? Math.round((turma.nObservados / turma.nAlunos) * 100) : 0;
  const iniciada = turma.ordemAtual >= 1;
  // Anel de cobertura (SVG): r=20.5 → circunferência ~128.8.
  const RING_C = 128.8;

  return (
    <button
      onClick={onOpen}
      className="flex-none flex flex-col text-left rounded-2xl p-3.5 transition-transform active:scale-[0.99]"
      style={{
        width: 244,
        height: 304, // ALTURA FIXA: o card não cresce com o texto. O mural rola por dentro.
        scrollSnapAlign: 'start',
        backgroundColor: t.panel,
        border: `1px solid ${t.line}`,
      }}
    >
      {/* Linha 1: turma + professor + sinal de acesso */}
      <div className="flex items-start justify-between gap-2 flex-none">
        <div className="min-w-0">
          <div className="text-sm font-bold text-white truncate">{turma.nome}</div>
          <div className="text-[10.5px] truncate" style={{ color: t.mut }}>
            {turma.professorNome ||
              (turma.segmento === 'fundamental2' ? 'Mentoria por Casa' : 'Sem professor vinculado')}
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 text-[10px] whitespace-nowrap" style={{ color: t.ink2 }} title="Último acesso do professor">
          <span className="w-[7px] h-[7px] rounded-full" style={{ backgroundColor: sinal.cor }} />
          {rotuloAcesso(turma.ultimaAtividade)}
        </span>
      </div>

      {/* Cobertura da fase: anel (círculo) + rótulo ao lado */}
      <div className="mt-3 flex items-center gap-3 flex-none">
        <div className="relative flex-none" style={{ width: 46, height: 46 }}>
          <svg width={46} height={46} className="-rotate-90">
            <circle cx={23} cy={23} r={20.5} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={5} />
            <circle
              cx={23}
              cy={23}
              r={20.5}
              fill="none"
              stroke={corCobertura(turma.nObservados, turma.nAlunos) || 'rgba(255,255,255,0.1)'}
              strokeWidth={5}
              strokeLinecap="round"
              strokeDasharray={RING_C}
              strokeDashoffset={RING_C * (1 - pctObs / 100)}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-white">
            {turma.nObservados}
          </div>
        </div>
        <div className="min-w-0">
          <div className="text-[10px]" style={{ color: t.mut }}>
            Observados na fase
          </div>
          <div className="text-[12px] font-semibold text-white">
            <span style={{ color: t.accent2 }}>{turma.nObservados}</span> de {turma.nAlunos}
          </div>
        </div>
      </div>

      {/* Trilha: linha de pontinhos, cada um na cor da sua Casa */}
      <div className="mt-3 flex-none">
        <div className="flex items-center justify-between text-[10px] mb-1.5">
          <span style={{ color: t.mut }}>Trilha</span>
          {iniciada ? (
            <span className="text-white font-semibold">
              {turma.faseNome || 'Fase'} · {turma.ordemAtual}/{turma.totalFases}
            </span>
          ) : (
            <span style={{ color: t.mut }}>Não iniciada</span>
          )}
        </div>
        <div className="flex items-center justify-between px-0.5">
          {turma.coresTrilha.map((cor, i) => {
            const pos = i + 1;
            const done = iniciada && pos < turma.ordemAtual;
            const now = iniciada && pos === turma.ordemAtual;
            return (
              <span
                key={pos}
                className="rounded-full flex-none"
                style={{
                  width: now ? 9 : 7,
                  height: now ? 9 : 7,
                  backgroundColor: cor,
                  opacity: now ? 1 : done ? 0.9 : 0.28,
                  boxShadow: now ? '0 0 0 2px rgba(255,255,255,0.16)' : undefined,
                }}
                title={`Fase ${pos}`}
              />
            );
          })}
        </div>
      </div>

      {/* Atividades da fase: bolinhas (feitas cheias, faltantes vazias) + X/N */}
      {iniciada && (
        <div className="mt-2.5 flex items-center justify-between text-[10px] flex-none">
          <span style={{ color: t.mut }}>Atividades</span>
          {turma.atividadesTotal > 0 ? (
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1">
                {Array.from({ length: turma.atividadesTotal }).map((_, i) => (
                  <span
                    key={i}
                    className="rounded-full flex-none"
                    style={{
                      width: 7,
                      height: 7,
                      backgroundColor: i < turma.atividadesFeitas ? t.accent2 : 'transparent',
                      border: i < turma.atividadesFeitas ? undefined : '1px solid rgba(255,255,255,0.28)',
                    }}
                  />
                ))}
              </div>
              <span className="text-white font-semibold">
                {turma.atividadesFeitas}/{turma.atividadesTotal}
              </span>
            </div>
          ) : (
            <span style={{ color: t.mut2 }}>a montar</span>
          )}
        </div>
      )}

      {/* Mural: cabeçalho fixo, lista rola por dentro (altura do card não muda). */}
      <div className="mt-3 pt-2.5 flex-1 min-h-0 flex flex-col" style={{ borderTop: `1px solid ${t.line}` }}>
        <div className="text-[8.5px] uppercase tracking-[0.14em] mb-1.5 flex-none" style={{ color: t.mut2 }}>
          Mural
        </div>
        {turma.mural.length === 0 ? (
          <div className="text-[10.5px] italic" style={{ color: t.mut2 }}>
            Nenhum registro ainda nesta turma.
          </div>
        ) : (
          <div className="space-y-1.5 flex-1 min-h-0 overflow-y-auto scrollbar-hide">
            {turma.mural.map((ev) => (
              <div key={ev.id} className="flex gap-1.5">
                <span
                  className="w-1.5 h-1.5 rounded-full mt-[5px] flex-none"
                  style={{ backgroundColor: t.accent2 }}
                />
                <div className="min-w-0">
                  <div className="text-[10.5px] leading-snug" style={{ color: t.ink2 }}>
                    {ev.professorNome ? (
                      <>
                        <span>{ev.professorNome} registrou </span>
                        <span className="text-white font-medium">{ev.alunoNome || 'aluno'}</span>
                      </>
                    ) : (
                      <span className="text-white font-medium">{ev.alunoNome || 'Registro'}</span>
                    )}
                  </div>
                  {ev.texto && (
                    <div className="text-[10.5px] leading-snug line-clamp-2" style={{ color: t.mut }}>
                      {ev.texto}
                    </div>
                  )}
                  <div className="text-[9px]" style={{ color: t.mut2 }}>
                    {tempoRelativo(ev.createdAt)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </button>
  );
};

const CoordenadorGestaoPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, segmentos } = useCoordenador();
  const { data: series, isLoading } = useCoordenadorGestao();

  // Segmentos concedidos, na ordem canônica.
  const segsOrdenados = useMemo(
    () => [...segmentos].sort((a, b) => SEG_ORDEM.indexOf(a) - SEG_ORDEM.indexOf(b)),
    [segmentos]
  );

  // Segmento selecionado. Default: o primeiro concedido. Se só há um, ele fica fixo.
  const [segSel, setSegSel] = useState<string | null>(null);
  useEffect(() => {
    if (!segSel && segsOrdenados.length > 0) setSegSel(segsOrdenados[0]);
  }, [segSel, segsOrdenados]);

  // Lente do F2: por Turmas (acadêmico) ou por Casas (mentoria). Só o F2 tem Casas.
  const [lenteF2, setLenteF2] = useState<'turmas' | 'casas'>('turmas');
  const { data: casas } = useCoordenadorCasas();
  const verCasas = segSel === 'fundamental2' && lenteF2 === 'casas';

  // LOG de leitura do mural (fire-and-forget): uma linha por turma cujo mural
  // tem conteúdo, uma vez por carga. É a mitigação central da decisão de 14/07.
  const jaLogou = useRef(false);
  useEffect(() => {
    if (jaLogou.current || !series || !user?.id) return;
    const comMural = series
      .flatMap((s) => s.turmas)
      .filter((tt) => tt.mural.length > 0)
      .map((tt) => tt.turmaId);
    if (comMural.length > 0) {
      logCoordenadorLeituraLote(user.id, comMural, 'mural');
      jaLogou.current = true;
    }
  }, [series, user?.id]);

  // Séries do segmento selecionado (as turmas já trazem o campo segmento).
  const seriesDoSegmento = useMemo(() => {
    if (!series || !segSel) return [];
    return series
      .map((s) => ({ ...s, turmas: s.turmas.filter((tt) => tt.segmento === segSel) }))
      .filter((s) => s.turmas.length > 0);
  }, [series, segSel]);

  const resumo = useMemo(() => {
    const turmas = seriesDoSegmento.flatMap((s) => s.turmas);
    const ativas = turmas.filter((tt) => tt.ordemAtual >= 1).length;
    return { total: turmas.length, ativas };
  }, [seriesDoSegmento]);

  const primeiroNome =
    (profile?.nome || profile?.full_name || '').trim().split(' ')[0] || null;

  if (isLoading) {
    return (
      <div className="pt-4 space-y-4">
        <Skeleton className="h-7 w-40 rounded" style={{ backgroundColor: t.panel }} />
        <Skeleton className="h-10 w-56 rounded-xl" style={{ backgroundColor: t.panel }} />
        <Skeleton className="h-52 w-full rounded-2xl" style={{ backgroundColor: t.panel }} />
      </div>
    );
  }

  const semEscopo = !series || series.length === 0 || segsOrdenados.length === 0;

  return (
    <div className="pt-3">
      {/* Saudação */}
      <div className="mb-4">
        <h1 className="text-xl font-semibold leading-tight" style={{ fontFamily: 'Georgia, serif', color: t.ink }}>
          {primeiroNome ? `Olá, ${primeiroNome}` : 'Olá'}
        </h1>
        <p className="text-[12px] mt-0.5" style={{ color: t.mut }}>
          Este é o pulso das suas turmas.
        </p>
      </div>

      {semEscopo ? (
        <div
          className="mt-2 rounded-2xl p-6 text-center"
          style={{ backgroundColor: t.panel, border: `1px solid ${t.line}` }}
        >
          <p className="text-sm font-medium" style={{ color: t.ink }}>
            Nenhum segmento vinculado ao seu acesso ainda.
          </p>
          <p className="mt-2 text-[13px] leading-relaxed" style={{ color: t.mut }}>
            Quando a coordenação da plataforma vincular um segmento a você, as séries e turmas
            aparecem aqui, com o andamento de cada uma.
          </p>
        </div>
      ) : (
        <>
          {/* Escolha do segmento (só aparece se houver mais de um) */}
          {segsOrdenados.length > 1 && (
            <div className="mb-4">
              <div className="text-[9px] uppercase tracking-[0.2em] mb-2" style={{ color: t.mut2 }}>
                Escolha o segmento
              </div>
              <div className="flex gap-2 flex-wrap">
                {segsOrdenados.map((s) => {
                  const ativo = s === segSel;
                  return (
                    <button
                      key={s}
                      onClick={() => setSegSel(s)}
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
            </div>
          )}

          {/* Lente do F2: Turmas (acadêmico) | Casas (mentoria) */}
          {segSel === 'fundamental2' && (
            <div className="mb-4">
              <div className="text-[9px] uppercase tracking-[0.2em] mb-2" style={{ color: t.mut2 }}>
                Ver por
              </div>
              <div className="flex gap-2">
                {(['turmas', 'casas'] as const).map((l) => {
                  const ativo = lenteF2 === l;
                  return (
                    <button
                      key={l}
                      onClick={() => setLenteF2(l)}
                      className="px-3.5 py-2 rounded-xl text-[12.5px] font-semibold transition-colors"
                      style={
                        ativo
                          ? { backgroundColor: t.accent, color: '#fff' }
                          : { backgroundColor: t.panel, color: t.ink2, border: `1px solid ${t.line}` }
                      }
                    >
                      {l === 'turmas' ? 'Turmas' : 'Casas'}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {verCasas ? (
            <>
              <div className="flex items-baseline justify-between mb-3">
                <div className="text-[9px] uppercase tracking-[0.2em]" style={{ color: t.mut2 }}>
                  Casas e mentores
                </div>
                <div className="text-[11px]" style={{ color: t.ink2 }}>
                  <span className="text-white font-semibold">{(casas || []).length}</span> Casas
                </div>
              </div>
              {(casas || []).length === 0 ? (
                <div
                  className="rounded-2xl p-6 text-center"
                  style={{ backgroundColor: t.panel, border: `1px solid ${t.line}` }}
                >
                  <p className="text-[13px]" style={{ color: t.mut }}>
                    Nenhuma Casa vinculada ao seu escopo ainda.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {(casas || []).map((casa) => {
                    const pctObs = casa.nAlunos > 0 ? Math.round((casa.nObservados / casa.nAlunos) * 100) : 0;
                    return (
                      <button
                        key={casa.casaId}
                        onClick={() => navigate(`/coordenador/casa/${casa.casaId}`)}
                        className="w-full text-left rounded-2xl p-3.5 transition-transform active:scale-[0.99]"
                        style={{
                          backgroundColor: t.panel,
                          border: `1px solid ${t.line}`,
                          borderLeft: `3px solid ${casa.cor}`,
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-sm font-bold text-white truncate">{casa.nome}</div>
                          <span className="text-[10px] whitespace-nowrap" style={{ color: t.ink2 }}>
                            {casa.nAlunos} {casa.nAlunos === 1 ? 'aluno' : 'alunos'}
                          </span>
                        </div>
                        <div className="mt-1.5 text-[11px]" style={{ color: t.mut }}>
                          {casa.mentores.length === 0
                            ? 'Sem mentor vinculado'
                            : casa.mentores.length === 1
                              ? `Mentor: ${casa.mentores[0]}`
                              : `Mentores: ${casa.mentores[0]} e mais ${casa.mentores.length - 1}`}
                        </div>

                        {/* Cobertura da Casa */}
                        <div className="mt-2.5">
                          <div className="flex items-center justify-between text-[10px] mb-1">
                            <span style={{ color: t.mut }}>Observados</span>
                            <span className="text-white font-semibold">
                              <span style={{ color: t.accent2 }}>{casa.nObservados}</span>/{casa.nAlunos}
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
                            <span
                              className="block h-full rounded-full"
                              style={{ width: `${pctObs}%`, backgroundColor: corCobertura(casa.nObservados, casa.nAlunos) }}
                            />
                          </div>
                        </div>

                        {/* Mural da Casa (trecho) */}
                        <div className="mt-2.5 pt-2.5" style={{ borderTop: `1px solid ${t.line}` }}>
                          <div className="text-[8.5px] uppercase tracking-[0.14em] mb-1.5" style={{ color: t.mut2 }}>
                            Mural
                          </div>
                          {casa.mural.length === 0 ? (
                            <div className="text-[10.5px] italic" style={{ color: t.mut2 }}>
                              Nenhum registro ainda nesta Casa.
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              {casa.mural.slice(0, 2).map((ev) => (
                                <div key={ev.id} className="flex gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full mt-[5px] flex-none" style={{ backgroundColor: casa.cor }} />
                                  <div className="min-w-0">
                                    <div className="text-[10.5px] leading-snug" style={{ color: t.ink2 }}>
                                      {ev.professorNome ? (
                                        <>
                                          <span>{ev.professorNome} registrou </span>
                                          <span className="text-white font-medium">{ev.alunoNome || 'aluno'}</span>
                                        </>
                                      ) : (
                                        <span className="text-white font-medium">{ev.alunoNome || 'Registro'}</span>
                                      )}
                                    </div>
                                    {ev.texto && (
                                      <div className="text-[10.5px] leading-snug line-clamp-2" style={{ color: t.mut }}>
                                        {ev.texto}
                                      </div>
                                    )}
                                    <div className="text-[9px]" style={{ color: t.mut2 }}>
                                      {tempoRelativo(ev.createdAt)}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              <p className="text-[9.5px] italic mt-3" style={{ color: t.mut2 }}>
                A Casa é o time de mentoria do F2: mostra quem conduz e quantos alunos pertencem. Não é
                diagnóstico nem placar da criança.
              </p>
            </>
          ) : (
            <>
          {/* Título da lista + resumo */}
          <div className="flex items-baseline justify-between mb-3">
            <div className="text-[9px] uppercase tracking-[0.2em]" style={{ color: t.mut2 }}>
              Veja o andamento da turma
            </div>
            <div className="text-[11px]" style={{ color: t.ink2 }}>
              <span className="text-white font-semibold">
                {resumo.total} {resumo.total === 1 ? 'turma' : 'turmas'}
              </span>{' '}
              · {resumo.ativas} ativas
            </div>
          </div>

          {seriesDoSegmento.length === 0 ? (
            <div
              className="rounded-2xl p-6 text-center"
              style={{ backgroundColor: t.panel, border: `1px solid ${t.line}` }}
            >
              <p className="text-[13px]" style={{ color: t.mut }}>
                Nenhuma turma neste segmento ainda.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {seriesDoSegmento.map((grupo) => (
                <section key={grupo.serie}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: t.ink }}>
                      {grupo.serieLabel}
                    </span>
                    {grupo.turmas.length > 1 && (
                      <span className="text-[9.5px] ml-auto" style={{ color: t.mut2 }}>
                        deslize para o lado
                      </span>
                    )}
                  </div>
                  <LinhaTurmas>
                    {grupo.turmas.map((turma) => (
                      <CardTurma
                        key={turma.turmaId}
                        turma={turma}
                        onOpen={() => navigate(`/coordenador/turma/${turma.turmaId}`)}
                      />
                    ))}
                  </LinhaTurmas>
                </section>
              ))}
            </div>
          )}
            </>
          )}

          {/* Nota de doutrina: a cobertura protege o aluno silencioso, não julga. */}
          <div
            className="mt-6 rounded-xl p-3.5 text-[12px] leading-relaxed"
            style={{ backgroundColor: t.accentDim, border: '1px solid rgba(94,139,216,0.22)', color: t.ink2 }}
          >
            <span className="font-semibold" style={{ color: t.accent2 }}>
              Leitura de cobertura.{' '}
            </span>
            O medidor "observados na fase" mostra se todos os alunos estão sendo vistos pelo professor.
            Ele protege a criança silenciosa de passar despercebida. Não é nota, não compara crianças.
          </div>
        </>
      )}
    </div>
  );
};

export default CoordenadorGestaoPage;
