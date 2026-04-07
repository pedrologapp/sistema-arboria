import { useState, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, Save, ChevronDown, ChevronUp, X } from 'lucide-react';
import { useProfessor } from '@/contexts/ProfessorContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type Estado = 'fez' | 'surpreendeu' | 'dificuldades' | 'nao_conseguiu' | 'faltou';

interface Aluno {
  id: string;
  full_name: string | null;
  nome: string | null;
  sobrenome: string | null;
  avatar_url: string | null;
  casa_id: number | null;
}

interface AlunoComEstado extends Aluno {
  estado: Estado;
  texto: string;
}

const estadoConfig: Record<string, { label: string; cor: string; bg: string; border: string }> = {
  surpreendeu: { label: 'Foi alem', cor: 'text-amber-400', bg: 'bg-amber-500/15', border: 'border-amber-500/30' },
  dificuldades: { label: 'Dificuldades', cor: 'text-red-400', bg: 'bg-red-500/15', border: 'border-red-500/30' },
  nao_conseguiu: { label: 'Nao fez', cor: 'text-white/60', bg: 'bg-white/[0.08]', border: 'border-white/20' },
  fez: { label: 'Fez', cor: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  faltou: { label: 'Faltou', cor: 'text-white/40', bg: 'bg-white/[0.04]', border: 'border-white/10' },
};

const CirculoAlunosPage = () => {
  const { serie, turma } = useParams<{ serie: string; turma: string }>();
  const { profile, faseAtual } = useProfessor();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const serieNumero = parseInt(serie || '6');
  const turmaLetra = turma?.toUpperCase() || 'A';

  const [alunosEstado, setAlunosEstado] = useState<Map<string, { estado: Estado; texto: string }>>(new Map());
  const [modalAluno, setModalAluno] = useState<Aluno | null>(null);
  const [modalEstado, setModalEstado] = useState<Estado>('fez');
  const [modalTexto, setModalTexto] = useState('');
  const [expandido, setExpandido] = useState<Record<string, boolean>>({});
  const [salvando, setSalvando] = useState(false);
  const [mostrarResumo, setMostrarResumo] = useState(false);
  const [dragAluno, setDragAluno] = useState<Aluno | null>(null);

  // Fetch alunos
  const { data: alunos = [], isLoading } = useQuery({
    queryKey: ['circulo-alunos', profile?.institution_id, serieNumero, turmaLetra],
    queryFn: async () => {
      if (!profile?.institution_id) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, nome, sobrenome, avatar_url, casa_id')
        .eq('institution_id', profile.institution_id)
        .eq('segmento', 'fundamental2')
        .ilike('serie', `%${serieNumero}%`)
        .eq('turma', turmaLetra)
        .not('casa_id', 'is', null)
        .order('full_name');
      if (error) throw error;
      return (data || []) as Aluno[];
    },
    enabled: !!profile?.institution_id,
    staleTime: 120000,
  });

  // Fetch cores das casas
  const { data: casaCores = {} } = useQuery({
    queryKey: ['casa-cores'],
    queryFn: async () => {
      const { data } = await supabase.from('inteligencias').select('id, cor_hex');
      const map: Record<number, string> = {};
      (data || []).forEach((i: any) => { if (i.cor_hex) map[i.id] = i.cor_hex; });
      return map;
    },
    staleTime: 600000,
  });

  const getCasaCor = (casaId: number | null) => casaCores[casaId || 0] || '#444';

  // Check existing draft
  const { data: rascunhoExistente } = useQuery({
    queryKey: ['observacao-rascunho', profile?.id, faseAtual?.id, serieNumero, turmaLetra],
    queryFn: async () => {
      if (!profile?.id || !faseAtual?.id) return null;
      const semanaAtual = faseAtual.semana_atual || 1;
      const { data } = await supabase
        .from('observacao_semanal')
        .select('id, semana, status, observacao_aluno(aluno_id, estado, observacao_texto)')
        .eq('professor_id', profile.id)
        .eq('fase_id', faseAtual.id)
        .ilike('serie', `%${serieNumero}%`)
        .eq('turma', turmaLetra)
        .eq('semana', semanaAtual)
        .maybeSingle();
      return data;
    },
    enabled: !!profile?.id && !!faseAtual?.id,
  });

  // Load draft into state
  useState(() => {
    if (rascunhoExistente?.observacao_aluno) {
      const map = new Map<string, { estado: Estado; texto: string }>();
      (rascunhoExistente.observacao_aluno as any[]).forEach((oa: any) => {
        map.set(oa.aluno_id, { estado: oa.estado, texto: oa.observacao_texto || '' });
      });
      setAlunosEstado(map);
    }
  });

  const getEstado = (alunoId: string): Estado => alunosEstado.get(alunoId)?.estado || 'fez';
  const getTexto = (alunoId: string): string => alunosEstado.get(alunoId)?.texto || '';

  const setEstadoAluno = (alunoId: string, estado: Estado, texto?: string) => {
    setAlunosEstado(prev => {
      const next = new Map(prev);
      next.set(alunoId, { estado, texto: texto ?? (prev.get(alunoId)?.texto || '') });
      return next;
    });
  };

  const getNomeAbreviado = (aluno: Aluno) => {
    const nome = aluno.nome || aluno.full_name?.split(' ')[0] || '?';
    const partes = (aluno.full_name || aluno.nome || '').split(' ');
    const segundoNome = partes.length > 1 ? partes[1]?.[0] + '.' : '';
    return `${nome} ${segundoNome}`.trim();
  };

  const getInitial = (aluno: Aluno) => (aluno.nome || aluno.full_name || '?').charAt(0).toUpperCase();

  // Agrupar alunos por estado
  const alunosPorEstado = useCallback((estado: Estado) => {
    return alunos.filter(a => getEstado(a.id) === estado);
  }, [alunos, alunosEstado]);

  // Handle drop on zone
  const handleDrop = (estado: Estado) => {
    if (!dragAluno) return;
    if (estado === 'surpreendeu' || estado === 'dificuldades' || estado === 'nao_conseguiu') {
      setModalAluno(dragAluno);
      setModalEstado(estado);
      setModalTexto(getTexto(dragAluno.id));
    } else {
      setEstadoAluno(dragAluno.id, estado);
    }
    setDragAluno(null);
  };

  const handleModalSalvar = () => {
    if (modalAluno) {
      setEstadoAluno(modalAluno.id, modalEstado, modalTexto);
    }
    setModalAluno(null);
    setModalTexto('');
  };

  const handleModalPular = () => {
    if (modalAluno) {
      setEstadoAluno(modalAluno.id, modalEstado, '');
    }
    setModalAluno(null);
    setModalTexto('');
  };

  // Tap to cycle (mobile friendly alternative to drag)
  const handleTap = (aluno: Aluno) => {
    const estadoAtual = getEstado(aluno.id);
    if (estadoAtual === 'fez') {
      // Open modal to choose state
      setModalAluno(aluno);
      setModalEstado('surpreendeu');
      setModalTexto('');
    } else if (estadoAtual === 'faltou') {
      setEstadoAluno(aluno.id, 'fez');
    } else {
      // Already marked, tap to return to Fez
      setEstadoAluno(aluno.id, 'fez');
    }
  };

  // Contagens
  const contagens = {
    surpreendeu: alunosPorEstado('surpreendeu').length,
    fez: alunosPorEstado('fez').length,
    dificuldades: alunosPorEstado('dificuldades').length,
    nao_conseguiu: alunosPorEstado('nao_conseguiu').length,
    faltou: alunosPorEstado('faltou').length,
  };

  // Salvar
  const salvar = async (enviar: boolean) => {
    if (!profile?.id || !profile?.institution_id || !faseAtual?.id) return;
    setSalvando(true);

    try {
      const semanaAtual = faseAtual.semana_atual || 1;

      // Upsert observacao_semanal
      const { data: obs, error: obsError } = await supabase
        .from('observacao_semanal')
        .upsert({
          ...(rascunhoExistente?.id ? { id: rascunhoExistente.id } : {}),
          institution_id: profile.institution_id,
          professor_id: profile.id,
          fase_id: faseAtual.id,
          serie: `${serieNumero}`,
          turma: turmaLetra,
          semana: semanaAtual,
          status: enviar ? 'enviada' : 'rascunho',
          enviada_em: enviar ? new Date().toISOString() : null,
        }, { onConflict: 'institution_id,professor_id,fase_id,serie,turma,semana' })
        .select('id')
        .single();

      if (obsError) throw obsError;

      // Delete existing aluno records for this observation
      await supabase.from('observacao_aluno').delete().eq('observacao_semanal_id', obs.id);

      // Insert all aluno states (excluding faltou - they get nothing)
      const registros = alunos
        .filter(a => getEstado(a.id) !== 'faltou')
        .map(a => ({
          observacao_semanal_id: obs.id,
          aluno_id: a.id,
          estado: getEstado(a.id),
          observacao_texto: getTexto(a.id) || null,
        }));

      if (registros.length > 0) {
        const { error: regError } = await supabase.from('observacao_aluno').insert(registros);
        if (regError) throw regError;
      }

      // If enviar, generate talent tree points + process cross-IM
      if (enviar) {
        // 1. Generate talent tree points (exceto "nao_conseguiu" e "faltou")
        const { data: habSemana } = await supabase
          .from('atividade_habilidades')
          .select('habilidade_id')
          .eq('fase_id', faseAtual.id)
          .eq('semana', semanaAtual);

        if (habSemana && habSemana.length > 0) {
          const tipoMap: Record<string, string> = {
            surpreendeu: 'consolidacao',
            fez: 'desenvolvimento',
            dificuldades: 'contato',
            nao_conseguiu: 'exposicao',
          };

          // Todos geram ponto exceto "faltou"
          const pontos = alunos
            .filter(a => {
              const estado = getEstado(a.id);
              return estado !== 'faltou' && tipoMap[estado];
            })
            .flatMap(a => habSemana.map(h => ({
              aluno_id: a.id,
              habilidade_id: h.habilidade_id,
              inteligencia_id: faseAtual.inteligencia?.id,
              fase_id: faseAtual.id,
              semana: semanaAtual,
              ano_letivo: new Date().getFullYear(),
              tipo_ponto: tipoMap[getEstado(a.id)] || 'desenvolvimento',
              fonte: 'observacao',
              fonte_id: obs.id,
            })));

          if (pontos.length > 0) {
            await supabase.from('arvore_talentos').insert(pontos);
          }
        }

        // 2. Coletar alunos com comentarios para Cross-IM (enviar ao N8N)
        const alunosComComentario = alunos
          .filter(a => {
            const texto = getTexto(a.id);
            return texto && texto.trim().length > 0;
          })
          .map(a => ({
            aluno_id: a.id,
            aluno_nome: a.full_name || a.nome,
            estado: getEstado(a.id),
            comentario: getTexto(a.id),
            fase_inteligencia: faseAtual.inteligencia?.nome,
            fase_inteligencia_id: faseAtual.inteligencia?.id,
            fase_id: faseAtual.id,
            semana: semanaAtual,
          }));

        // TODO: Enviar para N8N webhook quando configurado
        // if (alunosComComentario.length > 0) {
        //   await fetch('N8N_WEBHOOK_URL', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify({
        //       observacao_semanal_id: obs.id,
        //       professor_id: profile.id,
        //       institution_id: profile.institution_id,
        //       alunos: alunosComComentario,
        //     }),
        //   });
        // }
        console.log('[Cross-IM] Alunos com comentario para processar:', alunosComComentario.length);
      }

      queryClient.invalidateQueries({ queryKey: ['observacao-rascunho'] });

      if (enviar) {
        setMostrarResumo(true);
      } else {
        toast.success('Rascunho salvo!');
      }
    } catch (err: any) {
      console.error('Erro ao salvar:', err);
      toast.error(err.message || 'Erro ao salvar observacoes');
    } finally {
      setSalvando(false);
    }
  };

  // Avatar component
  const AvatarItem = ({ aluno, size = 'md' }: { aluno: Aluno; size?: 'sm' | 'md' }) => {
    const isSmall = size === 'sm';
    const casaColor = getCasaCor(aluno.casa_id);

    return (
      <button
        draggable
        onDragStart={() => setDragAluno(aluno)}
        onDragEnd={() => setDragAluno(null)}
        onClick={() => handleTap(aluno)}
        className={cn(
          'flex flex-col items-center gap-1 transition-all active:scale-90',
          isSmall ? 'w-14' : 'w-16'
        )}
      >
        <div
          className={cn('rounded-full overflow-hidden border-2', isSmall ? 'w-10 h-10' : 'w-12 h-12')}
          style={{ borderColor: casaColor }}
        >
          {aluno.avatar_url ? (
            <img src={aluno.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span
              className={cn('flex items-center justify-center w-full h-full text-white/70', isSmall ? 'text-xs' : 'text-sm')}
              style={{ backgroundColor: `${casaColor}20` }}
            >
              {getInitial(aluno)}
            </span>
          )}
        </div>
        <span className={cn('text-center leading-tight truncate w-full', isSmall ? 'text-[9px]' : 'text-[10px]', 'text-white/60')}>
          {getNomeAbreviado(aluno)}
        </span>
      </button>
    );
  };

  // Drop Zone component
  const DropZone = ({ estado, children }: { estado: Estado; children?: React.ReactNode }) => {
    const [dragOver, setDragOver] = useState(false);
    const config = estadoConfig[estado];
    const alunosNaZona = alunosPorEstado(estado);
    const isExpanded = expandido[estado];
    const mostrar = isExpanded ? alunosNaZona : alunosNaZona.slice(0, 5);

    return (
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleDrop(estado); }}
        className={cn(
          'rounded-xl border p-3 transition-all min-h-[80px]',
          config.border, config.bg,
          dragOver && 'ring-2 ring-white/30 scale-[1.02]'
        )}
      >
        <div className="flex items-center justify-between mb-2">
          <span className={cn('text-xs font-semibold uppercase tracking-wide', config.cor)}>
            {config.label}
          </span>
          {alunosNaZona.length > 0 && (
            <span className="text-[10px] text-white/30">{alunosNaZona.length}</span>
          )}
        </div>
        {alunosNaZona.length === 0 ? (
          <p className="text-[10px] text-white/20 text-center py-2">Arraste alunos aqui</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {mostrar.map(a => <AvatarItem key={a.id} aluno={a} size="sm" />)}
            </div>
            {alunosNaZona.length > 5 && (
              <button
                onClick={() => setExpandido(p => ({ ...p, [estado]: !p[estado] }))}
                className="mt-2 text-[10px] text-white/40 hover:text-white/60 flex items-center gap-1 mx-auto"
              >
                {isExpanded ? <><ChevronUp className="w-3 h-3" /> Menos</> : <><ChevronDown className="w-3 h-3" /> Ver +{alunosNaZona.length - 5}</>}
              </button>
            )}
          </>
        )}
        {children}
      </div>
    );
  };

  // Resumo screen
  if (mostrarResumo) {
    return (
      <div className="p-4 space-y-5 pb-24">
        <div className="pt-8 text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
            <Check className="w-7 h-7 text-emerald-400" />
          </div>
          <h1 className="text-xl font-bold text-white mb-1">Observacoes enviadas!</h1>
          <p className="text-white/40 text-sm">{serieNumero}o Ano {turmaLetra} — Semana {faseAtual?.semana_atual || 1}</p>
        </div>

        <div className="space-y-3">
          {(['surpreendeu', 'fez', 'dificuldades', 'nao_conseguiu', 'faltou'] as Estado[]).map(estado => {
            const lista = alunosPorEstado(estado);
            if (lista.length === 0) return null;
            const config = estadoConfig[estado];
            return (
              <div key={estado} className={cn('rounded-xl border p-3', config.border, config.bg)}>
                <p className={cn('text-xs font-semibold mb-1', config.cor)}>{config.label} ({lista.length})</p>
                <p className="text-[11px] text-white/50">{lista.map(a => getNomeAbreviado(a)).join(', ')}</p>
              </div>
            );
          })}
        </div>

        <button
          onClick={() => navigate(`/professor/circulo/serie/${serieNumero}`)}
          className="w-full py-3 rounded-xl bg-white/[0.08] border border-white/10 text-white/70 text-sm font-medium hover:bg-white/[0.12] transition-colors"
        >
          Voltar para turmas
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="h-10 bg-white/5 rounded-xl animate-pulse" />
        <div className="h-32 bg-white/5 rounded-xl animate-pulse" />
        <div className="h-48 bg-white/5 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 pb-36">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(`/professor/circulo/serie/${serieNumero}`)}
          className="p-2 -ml-1 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-lg font-semibold text-white">{serieNumero}o Ano {turmaLetra}</h1>
          <p className="text-xs text-white/30">
            Semana {faseAtual?.semana_atual || 1} — {faseAtual?.inteligencia?.nome || 'Fase'} — {alunos.length} alunos
          </p>
        </div>
      </div>

      {/* Instrucao */}
      <p className="text-[11px] text-white/30 text-center">
        Toque no aluno para marcar ou arraste para a zona correspondente
      </p>

      {/* Zonas de excecao (1x3 grid) */}
      <div className="grid grid-cols-3 gap-2">
        <DropZone estado="surpreendeu" />
        <DropZone estado="dificuldades" />
        <DropZone estado="nao_conseguiu" />
      </div>

      {/* Zona Fez (padrao - grande) */}
      <DropZone estado="fez" />

      {/* Zona Faltaram */}
      <DropZone estado="faltou" />

      {/* Rodape fixo com resumo e botoes */}
      <div className="fixed bottom-20 left-0 right-0 p-4 bg-gradient-to-t from-[#0d0d0d] via-[#0d0d0d]/95 to-transparent">
        <div className="flex items-center justify-center gap-3 text-[10px] text-white/40 mb-3">
          <span className="text-amber-400">{contagens.surpreendeu} foi alem</span>
          <span>·</span>
          <span className="text-emerald-400">{contagens.fez} fez</span>
          <span>·</span>
          <span className="text-red-400">{contagens.dificuldades} dific.</span>
          <span>·</span>
          <span>{contagens.nao_conseguiu} n/fez</span>
          <span>·</span>
          <span>{contagens.faltou} falt.</span>
        </div>
        <div className="flex gap-3 max-w-md mx-auto">
          <button
            onClick={() => salvar(false)}
            disabled={salvando}
            className="flex-1 py-3 rounded-xl bg-white/[0.08] border border-white/10 text-white/60 text-sm font-medium hover:bg-white/[0.12] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            Rascunho
          </button>
          <button
            onClick={() => salvar(true)}
            disabled={salvando}
            className="flex-1 py-3 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            Enviar
          </button>
        </div>
      </div>

      {/* Modal de texto */}
      {modalAluno && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#1a1a1e] border border-white/10 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">{modalAluno.full_name || modalAluno.nome || 'Aluno'}</p>
                <p className={cn('text-xs', estadoConfig[modalEstado].cor)}>{estadoConfig[modalEstado].label}</p>
              </div>
              <button onClick={() => { setModalAluno(null); setModalTexto(''); }} className="p-1 text-white/30 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Estado selector */}
            <div className="flex gap-2">
              {(['surpreendeu', 'dificuldades', 'nao_conseguiu'] as Estado[]).map(e => (
                <button
                  key={e}
                  onClick={() => setModalEstado(e)}
                  className={cn(
                    'flex-1 py-2 rounded-lg text-xs font-medium border transition-colors',
                    modalEstado === e
                      ? `${estadoConfig[e].bg} ${estadoConfig[e].border} ${estadoConfig[e].cor}`
                      : 'bg-white/[0.04] border-white/10 text-white/40'
                  )}
                >
                  {estadoConfig[e].label}
                </button>
              ))}
            </div>

            {(() => {
              const comentarioObrigatorio = modalEstado === 'surpreendeu' || modalEstado === 'nao_conseguiu';
              return (
                <>
                  <div>
                    <textarea
                      value={modalTexto}
                      onChange={(e) => setModalTexto(e.target.value)}
                      placeholder={comentarioObrigatorio ? 'Descreva o que observou...' : 'O que voce observou? (opcional)'}
                      rows={3}
                      className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 resize-none outline-none focus:border-white/20"
                    />
                    {comentarioObrigatorio && (
                      <p className="text-[10px] text-amber-400/60 mt-1">Comentario obrigatorio para este estado</p>
                    )}
                  </div>

                  <div className="flex gap-3">
                    {!comentarioObrigatorio && (
                      <button
                        onClick={handleModalPular}
                        className="flex-1 py-2.5 rounded-lg bg-white/[0.06] text-white/50 text-sm hover:bg-white/[0.1] transition-colors"
                      >
                        Sem texto
                      </button>
                    )}
                    <button
                      onClick={handleModalSalvar}
                      disabled={comentarioObrigatorio && !modalTexto.trim()}
                      className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Salvar
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default CirculoAlunosPage;
