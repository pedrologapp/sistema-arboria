import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Calendar, ScrollText, Settings2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useProfessor } from '@/contexts/ProfessorContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const sb = supabase as any;

type Categoria = 'mesa' | 'mediador' | 'observatorio' | 'delegacao';

interface Capitulo {
  id: string;
  numero: number;
  nome: string;
  frase_ancora: string | null;
  tema_curto: string | null;
}

interface Papel {
  id: string;
  nome: string;
  categoria: Categoria;
  delegacao: string | null;
  descricao_curta: string | null;
  vagas_por_turma: number;
  ordem: number;
  time_label: string | null;
}

interface Delegacao {
  id: string;
  codigo: string;
  nome: string;
  objetivo: string | null;
  ordem: number;
}

interface Turma {
  id: string;
  nome: string;
  serie: string;
  turma_letra: string;
}

interface Aluno {
  id: string;
  nome: string | null;
  full_name: string | null;
  avatar_url: string | null;
  casa_id: number | null;
}

type Brasoes = Record<number, string | null>;

interface Alocacao {
  id: string;
  papel_id: string;
  aluno_id: string;
  turma_id: string;
}

interface TurmaConfig {
  id?: string;
  data_evento: string | null;
  delegacoes_ativas: string[];
}

interface MembroDelegacao {
  id: string;
  delegacao_codigo: string;
  aluno_id: string;
}

const MAX_MEMBROS_DELEG = 99;

const nomeAluno = (a: Aluno | undefined): string =>
  !a ? 'Aluno' : (a.nome || a.full_name || 'Aluno');

const nomeCompleto = (a: Aluno | undefined): string =>
  !a ? 'Aluno' : (a.full_name || a.nome || 'Aluno');

const primeiroNome = (n: string) => n.split(' ')[0];

const formatarTurma = (serie: string | null, letra: string | null, fallback: string): string => {
  if (!serie) return fallback;
  const num = String(serie).replace(/\D/g, '');
  if (!num) return fallback;
  return `${num}º Ano${letra ? ' ' + letra : ''}`;
};

const normalizar = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const filtrarAlunos = (lista: Aluno[], busca: string): Aluno[] => {
  const q = normalizar(busca.trim());
  if (!q) return lista;
  return lista.filter(a => normalizar(nomeCompleto(a)).includes(q));
};

const BuscaInput = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <div className="relative my-2">
    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Buscar pelo nome..."
      autoFocus
      className="w-full bg-[#0F0F1E] border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-indigo-400"
    />
  </div>
);

const SIZES = {
  xs: 'w-4 h-4 text-[8px]',
  sm: 'w-5 h-5 text-[9px]',
  md: 'w-8 h-8 text-xs',
} as const;

const AvatarAluno = ({
  aluno, brasoes, size = 'sm'
}: {
  aluno: Aluno | undefined;
  brasoes: Brasoes;
  size?: keyof typeof SIZES;
}) => {
  const cls = SIZES[size];
  const brasao = aluno?.casa_id ? brasoes[aluno.casa_id] : null;
  const inicial = nomeCompleto(aluno).slice(0, 1).toUpperCase();
  return (
    <div className={`${cls} rounded-full bg-amber-200/20 text-amber-200/80 flex items-center justify-center font-semibold overflow-hidden flex-shrink-0`}>
      {aluno?.avatar_url ? (
        <img src={aluno.avatar_url} alt="" className="w-full h-full object-cover" />
      ) : brasao ? (
        <img src={brasao} alt="" className="w-full h-full object-contain p-[1px]" />
      ) : (
        inicial
      )}
    </div>
  );
};

const CapituloProfessorPage = () => {
  const { profile, faseAtual, isLoading } = useProfessor();
  const qc = useQueryClient();
  const [turmaAtivaId, setTurmaAtivaId] = useState<string | null>(null);
  const [papelParaAlocar, setPapelParaAlocar] = useState<Papel | null>(null);
  const [delegacaoParaAddMembro, setDelegacaoParaAddMembro] = useState<Delegacao | null>(null);
  const [savingConfig, setSavingConfig] = useState(false);
  const [buscaPapel, setBuscaPapel] = useState('');
  const [buscaMembro, setBuscaMembro] = useState('');

  const { data: capitulo, isLoading: loadingCap } = useQuery<Capitulo | null>({
    queryKey: ['prof-cap-ativo', faseAtual?.id, profile?.institution_id],
    enabled: !!faseAtual?.id && !!profile?.institution_id,
    queryFn: async () => {
      const { data } = await sb.from('capitulos')
        .select('id, numero, nome, frase_ancora, tema_curto')
        .eq('institution_id', profile!.institution_id)
        .eq('fase_id', faseAtual!.id)
        .eq('ativo', true).maybeSingle();
      return (data as Capitulo | null) ?? null;
    },
  });

  // Detecta se o professor é mentor da casa do capítulo
  const { data: ehMentor, isLoading: loadingMentor } = useQuery<boolean>({
    queryKey: ['eh-mentor-cap', profile?.id, capitulo?.id],
    enabled: !!profile?.id && !!capitulo?.id,
    queryFn: async () => {
      const { data } = await sb.rpc('eh_mentor_do_capitulo', {
        p_capitulo_id: capitulo!.id,
        p_user_id: profile!.id,
      });
      return Boolean(data);
    },
  });

  // Mentor vê TODAS as turmas da instituição
  const { data: turmas = [] } = useQuery<Turma[]>({
    queryKey: ['cap-turmas-mentor', profile?.institution_id, ehMentor],
    enabled: !!profile?.institution_id && !!ehMentor,
    queryFn: async () => {
      const { data } = await sb.from('turmas')
        .select('id, nome, serie, turma_letra')
        .eq('institution_id', profile!.institution_id)
        .order('serie').order('turma_letra');
      return (data as Turma[]) ?? [];
    },
  });

  const turmaId = turmaAtivaId ?? turmas[0]?.id ?? null;

  const { data: delegacoes = [] } = useQuery<Delegacao[]>({
    queryKey: ['prof-cap-delegacoes', capitulo?.id],
    enabled: !!capitulo?.id,
    queryFn: async () => {
      const { data } = await sb.from('capitulo_delegacoes')
        .select('id, codigo, nome, objetivo, ordem')
        .eq('capitulo_id', capitulo!.id).order('ordem');
      return (data as Delegacao[]) ?? [];
    },
  });

  const { data: papeis = [] } = useQuery<Papel[]>({
    queryKey: ['prof-cap-papeis', capitulo?.id],
    enabled: !!capitulo?.id,
    queryFn: async () => {
      const { data } = await sb.from('capitulo_papeis')
        .select('id, nome, categoria, delegacao, descricao_curta, vagas_por_turma, ordem, time_label')
        .eq('capitulo_id', capitulo!.id).order('ordem');
      return (data as Papel[]) ?? [];
    },
  });

  const { data: turmaConfig, refetch: refetchConfig } = useQuery<TurmaConfig | null>({
    queryKey: ['prof-turma-config', capitulo?.id, turmaId],
    enabled: !!capitulo?.id && !!turmaId,
    queryFn: async () => {
      const { data } = await sb.from('capitulo_turma_config')
        .select('id, data_evento, delegacoes_ativas')
        .eq('capitulo_id', capitulo!.id).eq('turma_id', turmaId!).maybeSingle();
      return data ?? null;
    },
  });

  const { data: alocacoes = [], refetch: refetchAloc } = useQuery<Alocacao[]>({
    queryKey: ['prof-cap-alocacoes', capitulo?.id, turmaId],
    enabled: !!capitulo?.id && !!turmaId,
    queryFn: async () => {
      const { data } = await sb.from('capitulo_alocacoes')
        .select('id, papel_id, aluno_id, turma_id')
        .eq('capitulo_id', capitulo!.id).eq('turma_id', turmaId!);
      return (data as Alocacao[]) ?? [];
    },
  });

  const { data: membros = [], refetch: refetchMembros } = useQuery<MembroDelegacao[]>({
    queryKey: ['prof-cap-membros', capitulo?.id, turmaId],
    enabled: !!capitulo?.id && !!turmaId,
    queryFn: async () => {
      const { data } = await sb.from('capitulo_delegacao_membros')
        .select('id, delegacao_codigo, aluno_id')
        .eq('capitulo_id', capitulo!.id).eq('turma_id', turmaId!);
      return (data as MembroDelegacao[]) ?? [];
    },
  });

  const { data: alunosDaTurma = [] } = useQuery<Aluno[]>({
    queryKey: ['prof-alunos-turma-cap', turmaId],
    enabled: !!turmaId,
    queryFn: async () => {
      const { data } = await sb.from('aluno_turma')
        .select('profiles!inner(id, nome, full_name, avatar_url, casa_id)')
        .eq('turma_id', turmaId!).eq('ativo', true);
      const list = (data ?? []).map((r: any) => r.profiles as Aluno);
      return list.sort((a: Aluno, b: Aluno) => nomeAluno(a).localeCompare(nomeAluno(b)));
    },
  });

  const { data: brasoes = {} } = useQuery<Brasoes>({
    queryKey: ['cap-brasoes', profile?.institution_id],
    enabled: !!profile?.institution_id,
    queryFn: async () => {
      const { data } = await sb.from('inteligencias')
        .select('id, brasao_url');
      const map: Brasoes = {};
      (data ?? []).forEach((i: any) => { map[i.id as number] = i.brasao_url ?? null; });
      return map;
    },
  });

  const delegacoesAtivas = useMemo(
    () => new Set(turmaConfig?.delegacoes_ativas ?? []),
    [turmaConfig]
  );

  const alocPorPapel = useMemo(() => {
    const m: Record<string, Alocacao[]> = {};
    alocacoes.forEach(a => {
      if (!m[a.papel_id]) m[a.papel_id] = [];
      m[a.papel_id].push(a);
    });
    return m;
  }, [alocacoes]);

  const alunosById = useMemo(() => {
    const m: Record<string, Aluno> = {};
    alunosDaTurma.forEach(a => { m[a.id] = a; });
    return m;
  }, [alunosDaTurma]);

  const totalVagasAtivas = useMemo(() => {
    return papeis.reduce((acc, p) => {
      if (p.categoria === 'delegacao' && (!p.delegacao || !delegacoesAtivas.has(p.delegacao))) return acc;
      return acc + p.vagas_por_turma;
    }, 0);
  }, [papeis, delegacoesAtivas]);

  const totalAlocacoes = useMemo(() => {
    return papeis.reduce((acc, p) => {
      if (p.categoria === 'delegacao' && (!p.delegacao || !delegacoesAtivas.has(p.delegacao))) return acc;
      return acc + (alocPorPapel[p.id]?.length ?? 0);
    }, 0);
  }, [papeis, alocPorPapel, delegacoesAtivas]);

  // ===== Mutations =====
  const upsertConfig = async (patch: Partial<TurmaConfig>) => {
    if (!capitulo?.id || !turmaId || !profile?.id) return;
    setSavingConfig(true);
    const proxima = {
      capitulo_id: capitulo.id,
      turma_id: turmaId,
      data_evento: turmaConfig?.data_evento ?? null,
      delegacoes_ativas: turmaConfig?.delegacoes_ativas ?? [],
      configurado_por: profile.id,
      ...patch,
    };
    const { error } = await sb.from('capitulo_turma_config')
      .upsert(proxima, { onConflict: 'capitulo_id,turma_id' });
    setSavingConfig(false);
    if (error) {
      toast.error(error.message || 'Erro ao salvar');
      return;
    }
    refetchConfig();
  };

  const toggleDelegacao = (codigo: string) => {
    const atual = turmaConfig?.delegacoes_ativas ?? [];
    const proxima = atual.includes(codigo)
      ? atual.filter(c => c !== codigo)
      : [...atual, codigo];
    upsertConfig({ delegacoes_ativas: proxima });
  };

  const setData = (data: string) => {
    upsertConfig({ data_evento: data || null });
  };

  const alocar = async (papelId: string, alunoId: string) => {
    if (!capitulo?.id || !turmaId || !profile?.id) return;
    const { error } = await sb.from('capitulo_alocacoes').insert({
      capitulo_id: capitulo.id, papel_id: papelId, aluno_id: alunoId,
      turma_id: turmaId, alocado_por: profile.id,
    });
    if (error) { toast.error(error.message || 'Erro ao alocar'); return; }
    toast.success('Aluno alocado');
    refetchAloc();
    qc.invalidateQueries({ queryKey: ['prof-cap-alocacoes', capitulo.id, turmaId] });
    setPapelParaAlocar(null);
  };

  const desalocar = async (id: string) => {
    const { error } = await sb.from('capitulo_alocacoes').delete().eq('id', id);
    if (error) { toast.error(error.message || 'Erro ao remover'); return; }
    toast.success('Removido');
    refetchAloc();
  };

  const addMembro = async (delegacaoCodigo: string, alunoId: string) => {
    if (!capitulo?.id || !turmaId || !profile?.id) return;
    const { error } = await sb.from('capitulo_delegacao_membros').insert({
      capitulo_id: capitulo.id, turma_id: turmaId,
      delegacao_codigo: delegacaoCodigo, aluno_id: alunoId,
      alocado_por: profile.id,
    });
    if (error) { toast.error(error.message || 'Erro ao adicionar membro'); return; }
    toast.success('Membro adicionado');
    refetchMembros();
    setDelegacaoParaAddMembro(null);
  };

  const removerMembro = async (membroId: string, alunoId: string) => {
    if (!capitulo?.id || !turmaId) return;
    // Remove papéis desse aluno na delegação primeiro (cascade lógico)
    await sb.from('capitulo_alocacoes')
      .delete()
      .eq('capitulo_id', capitulo.id)
      .eq('turma_id', turmaId)
      .eq('aluno_id', alunoId);
    const { error } = await sb.from('capitulo_delegacao_membros').delete().eq('id', membroId);
    if (error) { toast.error(error.message || 'Erro ao remover membro'); return; }
    toast.success('Membro removido');
    refetchMembros();
    refetchAloc();
  };

  const atribuirPapel = async (papelId: string, alunoId: string) => {
    if (!capitulo?.id || !turmaId || !profile?.id) return;
    // Se aluno já tem esse papel, ignora
    const ja = (alocPorPapel[papelId] || []).some(a => a.aluno_id === alunoId);
    if (ja) return;
    // Remove qualquer alocação anterior deste aluno nesse papel (não, não deve ter)
    const { error } = await sb.from('capitulo_alocacoes').insert({
      capitulo_id: capitulo.id, papel_id: papelId, aluno_id: alunoId,
      turma_id: turmaId, alocado_por: profile.id,
    });
    if (error) { toast.error(error.message || 'Erro ao atribuir'); return; }
    refetchAloc();
  };

  const removerPapelDeAluno = async (papelId: string, alunoId: string) => {
    if (!capitulo?.id || !turmaId) return;
    const { error } = await sb.from('capitulo_alocacoes')
      .delete()
      .eq('capitulo_id', capitulo.id)
      .eq('turma_id', turmaId)
      .eq('papel_id', papelId)
      .eq('aluno_id', alunoId);
    if (error) { toast.error(error.message || 'Erro'); return; }
    refetchAloc();
  };

  // Conjuntos derivados (pra desabilitar opções no UX)
  const alunosEmMembros = useMemo(() => new Set(membros.map(m => m.aluno_id)), [membros]);
  const alunosEmTimeFixo = useMemo(() => {
    const set = new Set<string>();
    alocacoes.forEach(a => {
      const p = papeis.find(pp => pp.id === a.papel_id);
      if (p && p.categoria !== 'delegacao') set.add(a.aluno_id);
    });
    return set;
  }, [alocacoes, papeis]);

  const membrosPorDelegacao = useMemo(() => {
    const m: Record<string, MembroDelegacao[]> = {};
    membros.forEach(mem => {
      if (!m[mem.delegacao_codigo]) m[mem.delegacao_codigo] = [];
      m[mem.delegacao_codigo].push(mem);
    });
    return m;
  }, [membros]);

  const alunosSemPapel = useMemo(
    () => alunosDaTurma.filter(a => !alunosEmMembros.has(a.id) && !alunosEmTimeFixo.has(a.id)),
    [alunosDaTurma, alunosEmMembros, alunosEmTimeFixo]
  );

  if (isLoading || loadingCap || loadingMentor) {
    return (
      <div className="flex justify-center pt-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500" />
      </div>
    );
  }

  if (!capitulo) {
    return (
      <div className="text-center pt-16 px-6">
        <h2 className="font-serif text-xl text-white/70">Sem capítulo ativo</h2>
        <p className="text-sm text-white/40 mt-3">
          Quando a fase atual tiver um Grande Projeto, aparece aqui pra alocar.
        </p>
      </div>
    );
  }

  if (!ehMentor) {
    return (
      <div className="text-center pt-16 px-6 max-w-sm mx-auto">
        <div className="text-[10px] tracking-[0.4em] uppercase text-white/40 mb-3">
          Capítulo {String(capitulo.numero).padStart(2, '0')}
        </div>
        <h2 className="font-serif text-xl text-white">Aba do mentor</h2>
        <p className="text-sm text-white/55 mt-3 leading-relaxed">
          A alocação dos alunos em <span className="font-serif italic text-white/80">{capitulo.nome}</span> é responsabilidade do mentor da casa da fase ativa.
        </p>
      </div>
    );
  }

  if (turmas.length === 0) {
    return (
      <div className="text-center pt-16 px-6">
        <h2 className="font-serif text-xl text-white/70">Nenhuma turma encontrada</h2>
        <p className="text-sm text-white/40 mt-3">A instituição não tem turmas cadastradas.</p>
      </div>
    );
  }

  // Papéis Time 2
  const t2Mesa = papeis.filter(p => p.categoria === 'mesa');
  const t2Med = papeis.filter(p => p.categoria === 'mediador');
  const t2Obs = papeis.filter(p => p.categoria === 'observatorio');

  return (
    <div className="space-y-5 pb-8">
      {/* Header capítulo */}
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-900/30 to-[#161423] p-5">
        <div className="text-[10px] tracking-[0.4em] uppercase text-white/40 mb-1">
          Capítulo {String(capitulo.numero).padStart(2, '0')}
        </div>
        <h1 className="font-serif text-2xl text-white">{capitulo.nome}</h1>
        {capitulo.frase_ancora && (
          <p className="text-xs italic font-serif text-amber-200/70 mt-1">{capitulo.frase_ancora}</p>
        )}
      </div>

      {/* Tabs turma */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
        {turmas.map(t => (
          <button
            key={t.id}
            onClick={() => setTurmaAtivaId(t.id)}
            className={cn(
              'px-4 py-2 rounded-full text-sm whitespace-nowrap transition',
              t.id === turmaId
                ? 'bg-indigo-500 text-white'
                : 'bg-white/5 text-white/70 hover:bg-white/10'
            )}
          >
            {formatarTurma(t.serie, t.turma_letra, t.nome)}
          </button>
        ))}
      </div>

      {/* Configuração da turma */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-4">
        <div className="flex items-center gap-2 text-[11px] tracking-[0.25em] uppercase text-white/60">
          <Settings2 className="w-3.5 h-3.5" /> Configuração da turma
        </div>

        {/* Data do evento */}
        <div>
          <label className="text-[11px] uppercase tracking-wider text-white/50 flex items-center gap-1 mb-1.5">
            <Calendar className="w-3 h-3" /> Data da Assembleia
          </label>
          <input
            type="date"
            value={turmaConfig?.data_evento ?? ''}
            onChange={(e) => setData(e.target.value)}
            disabled={savingConfig}
            className="bg-[#0F0F1E] border border-white/10 rounded-lg px-3 py-2 text-sm text-white w-full focus:outline-none focus:border-indigo-400"
          />
        </div>

        {/* Delegações ativas */}
        <div>
          <label className="text-[11px] uppercase tracking-wider text-white/50 mb-1.5 block">
            Delegações ativas nessa turma
          </label>
          <p className="text-[11px] text-white/40 mb-2">
            Marque quais delegações vão participar. As desmarcadas não aparecem pros alunos.
          </p>
          <div className="grid grid-cols-1 gap-1.5">
            {delegacoes.map(d => {
              const ativa = delegacoesAtivas.has(d.codigo);
              return (
                <button
                  key={d.id}
                  onClick={() => toggleDelegacao(d.codigo)}
                  disabled={savingConfig}
                  className={cn(
                    'flex items-start gap-3 p-2.5 rounded-lg text-left transition',
                    ativa
                      ? 'bg-amber-200/10 ring-1 ring-amber-200/40'
                      : 'bg-white/[0.02] hover:bg-white/[0.05] ring-1 ring-white/5'
                  )}
                >
                  <div className={cn(
                    'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 mt-0.5',
                    ativa ? 'bg-amber-200/30 border-amber-200/60' : 'border-white/20'
                  )}>
                    {ativa && <span className="text-amber-100 text-[10px]">✓</span>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className={cn('text-sm font-serif', ativa ? 'text-white' : 'text-white/60')}>
                      {d.nome}
                    </div>
                    {d.objetivo && (
                      <div className="text-[11px] text-white/40 leading-snug mt-0.5">{d.objetivo}</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Status alocação */}
      <div className="text-xs text-white/50 px-1">
        <span className="text-white">{totalAlocacoes}</span> de {totalVagasAtivas} vagas preenchidas
      </div>

      {/* Alunos ainda sem papel */}
      {alunosSemPapel.length > 0 && (
        <div className="rounded-xl border border-amber-200/20 bg-amber-950/20 p-3">
          <div className="text-[11px] tracking-[0.25em] uppercase text-amber-200/80 mb-2">
            {alunosSemPapel.length} {alunosSemPapel.length === 1 ? 'aluno sem papel' : 'alunos sem papel'}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {alunosSemPapel.map(al => (
              <span
                key={al.id}
                className="inline-flex items-center gap-1.5 pl-1 pr-2 py-0.5 rounded-full bg-amber-200/10 text-[11px] text-white/85"
              >
                <AvatarAluno aluno={al} brasoes={brasoes} size="xs" />
                {nomeCompleto(al)}
              </span>
            ))}
          </div>
        </div>
      )}

      {alunosDaTurma.length > 0 && alunosSemPapel.length === 0 && (
        <div className="rounded-xl border border-emerald-400/20 bg-emerald-950/20 px-3 py-2 text-[11px] text-emerald-200/80 tracking-wide">
          Todos os alunos da turma têm papel.
        </div>
      )}

      {/* TIME 2 — MESA */}
      <SecaoCat titulo="Mesa Diretora">
        {t2Mesa.map(p => (
          <PapelLinha
            key={p.id} papel={p} alocacoes={alocPorPapel[p.id] || []} alunosById={alunosById}
            brasoes={brasoes}
            onAdd={() => setPapelParaAlocar(p)} onRemove={desalocar}
          />
        ))}
      </SecaoCat>

      {/* TIME 2 — MEDIADORES */}
      {t2Med.length > 0 && (
        <SecaoCat titulo="Mediadores">
          {t2Med.map(p => (
            <PapelLinha
              key={p.id} papel={p} alocacoes={alocPorPapel[p.id] || []} alunosById={alunosById}
              brasoes={brasoes}
              onAdd={() => setPapelParaAlocar(p)} onRemove={desalocar}
            />
          ))}
        </SecaoCat>
      )}

      {/* TIME 2 — OBSERVATÓRIO */}
      {t2Obs.length > 0 && (
        <SecaoCat titulo="Observatório">
          {t2Obs.map(p => (
            <PapelLinha
              key={p.id} papel={p} alocacoes={alocPorPapel[p.id] || []} alunosById={alunosById}
              brasoes={brasoes}
              onAdd={() => setPapelParaAlocar(p)} onRemove={desalocar}
            />
          ))}
        </SecaoCat>
      )}

      {/* TIME 1 — DELEGAÇÕES (só ativas) */}
      {delegacoes.filter(d => delegacoesAtivas.has(d.codigo)).length > 0 && (
        <SecaoCat titulo="Delegações">
          <div className="space-y-3">
            {delegacoes.filter(d => delegacoesAtivas.has(d.codigo)).map(deleg => (
              <CartaoDelegacao
                key={deleg.id}
                delegacao={deleg}
                papeisDeleg={papeis
                  .filter(p => p.categoria === 'delegacao' && p.delegacao === deleg.codigo)
                  .sort((a, b) => a.ordem - b.ordem)}
                membros={membrosPorDelegacao[deleg.codigo] || []}
                alunosById={alunosById}
                brasoes={brasoes}
                alocPorPapel={alocPorPapel}
                onAddMembro={() => setDelegacaoParaAddMembro(deleg)}
                onRemoverMembro={removerMembro}
                onAtribuirPapel={atribuirPapel}
                onRemoverPapel={removerPapelDeAluno}
              />
            ))}
          </div>
        </SecaoCat>
      )}

      {/* Modal alocação papel (Mesa/Mediador/Observatório) */}
      <Dialog open={!!papelParaAlocar} onOpenChange={(o) => { if (!o) { setPapelParaAlocar(null); setBuscaPapel(''); } }}>
        <DialogContent className="bg-[#12122A] border-white/10 text-white">
          {papelParaAlocar && (
            <>
              <DialogHeader>
                <DialogTitle className="text-white font-serif">{papelParaAlocar.nome}</DialogTitle>
                <DialogDescription className="text-white/60">
                  {papelParaAlocar.time_label}
                </DialogDescription>
              </DialogHeader>
              <BuscaInput value={buscaPapel} onChange={setBuscaPapel} />
              <div className="max-h-[400px] overflow-y-auto -mx-2 px-2">
                {(() => {
                  const lista = filtrarAlunos(alunosDaTurma, buscaPapel);
                  if (alunosDaTurma.length === 0) {
                    return <div className="text-sm text-white/60 py-4">Nenhum aluno nessa turma.</div>;
                  }
                  if (lista.length === 0) {
                    return <div className="text-sm text-white/40 py-4 text-center">Nenhum resultado pra "{buscaPapel}".</div>;
                  }
                  return (
                    <div className="space-y-1">
                      {lista.map(al => {
                        const jaNoPapel = (alocPorPapel[papelParaAlocar.id] || []).some(a => a.aluno_id === al.id);
                        const emDelegacao = alunosEmMembros.has(al.id);
                        const emOutroFixo = alunosEmTimeFixo.has(al.id) && !jaNoPapel;
                        const bloqueado = jaNoPapel || emDelegacao || emOutroFixo;
                        const motivo = jaNoPapel ? 'já no papel' : emDelegacao ? 'em uma delegação' : emOutroFixo ? 'já em time fixo' : '';
                        return (
                          <button
                            key={al.id}
                            disabled={bloqueado}
                            onClick={() => { alocar(papelParaAlocar.id, al.id); setBuscaPapel(''); }}
                            className={cn(
                              'w-full text-left flex items-center gap-3 p-2 rounded-lg transition',
                              bloqueado ? 'opacity-40 cursor-not-allowed' : 'hover:bg-white/10'
                            )}
                          >
                            <AvatarAluno aluno={al} brasoes={brasoes} size="md" />
                            <span className="text-sm">{nomeCompleto(al)}</span>
                            {motivo && <span className="ml-auto text-[10px] text-white/40">{motivo}</span>}
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal adicionar membro à delegação */}
      <Dialog open={!!delegacaoParaAddMembro} onOpenChange={(o) => { if (!o) { setDelegacaoParaAddMembro(null); setBuscaMembro(''); } }}>
        <DialogContent className="bg-[#12122A] border-white/10 text-white">
          {delegacaoParaAddMembro && (
            <>
              <DialogHeader>
                <DialogTitle className="text-white font-serif">
                  Adicionar à {delegacaoParaAddMembro.nome}
                </DialogTitle>
                <DialogDescription className="text-white/60">
                  Escolha quem entra nessa delegação. Você define os papéis depois.
                </DialogDescription>
              </DialogHeader>
              <BuscaInput value={buscaMembro} onChange={setBuscaMembro} />
              <div className="max-h-[400px] overflow-y-auto -mx-2 px-2">
                {(() => {
                  const lista = filtrarAlunos(alunosDaTurma, buscaMembro);
                  if (alunosDaTurma.length === 0) {
                    return <div className="text-sm text-white/60 py-4">Nenhum aluno nessa turma.</div>;
                  }
                  if (lista.length === 0) {
                    return <div className="text-sm text-white/40 py-4 text-center">Nenhum resultado pra "{buscaMembro}".</div>;
                  }
                  return (
                    <div className="space-y-1">
                      {lista.map(al => {
                        const emDelegacao = alunosEmMembros.has(al.id);
                        const emFixo = alunosEmTimeFixo.has(al.id);
                        const bloqueado = emDelegacao || emFixo;
                        const motivo = emDelegacao ? 'já em delegação' : emFixo ? 'em time fixo' : '';
                        return (
                          <button
                            key={al.id}
                            disabled={bloqueado}
                            onClick={() => { addMembro(delegacaoParaAddMembro.codigo, al.id); setBuscaMembro(''); }}
                            className={cn(
                              'w-full text-left flex items-center gap-3 p-2 rounded-lg transition',
                              bloqueado ? 'opacity-40 cursor-not-allowed' : 'hover:bg-white/10'
                            )}
                          >
                            <AvatarAluno aluno={al} brasoes={brasoes} size="md" />
                            <span className="text-sm">{nomeCompleto(al)}</span>
                            {motivo && <span className="ml-auto text-[10px] text-white/40">{motivo}</span>}
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// =====================
// Cartão de delegação (2 sub-blocos: Time + Papéis)
// =====================
const CartaoDelegacao = ({
  delegacao, papeisDeleg, membros, alunosById, brasoes, alocPorPapel,
  onAddMembro, onRemoverMembro, onAtribuirPapel, onRemoverPapel,
}: {
  delegacao: Delegacao;
  papeisDeleg: Papel[];
  membros: MembroDelegacao[];
  alunosById: Record<string, Aluno>;
  brasoes: Brasoes;
  alocPorPapel: Record<string, Alocacao[]>;
  onAddMembro: () => void;
  onRemoverMembro: (membroId: string, alunoId: string) => void;
  onAtribuirPapel: (papelId: string, alunoId: string) => void;
  onRemoverPapel: (papelId: string, alunoId: string) => void;
}) => {
  const cheio = membros.length >= MAX_MEMBROS_DELEG;
  const ilimitado = MAX_MEMBROS_DELEG > 30;

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
      <div className="text-sm font-serif text-amber-200/90 mb-3">{delegacao.nome}</div>

      {/* SUB-BLOCO 1: TIME */}
      <div className="mb-4">
        <div className="text-[10px] tracking-[0.25em] uppercase text-white/50 mb-2">
          Time{membros.length > 0 ? ` · ${membros.length}` : ''}{ilimitado ? '' : `/${MAX_MEMBROS_DELEG}`}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {membros.map(m => {
            const al = alunosById[m.aluno_id];
            const nomeFull = al?.full_name || al?.nome || 'Aluno';
            return (
              <button
                key={m.id}
                onClick={() => onRemoverMembro(m.id, m.aluno_id)}
                className="group flex items-center gap-1.5 pl-1 pr-2 py-0.5 rounded-full bg-amber-200/10 hover:bg-red-500/20 transition text-xs"
                title="Clique para remover (apaga papéis dele nesta delegação)"
              >
                <AvatarAluno aluno={al} brasoes={brasoes} size="sm" />
                <span>{nomeFull}</span>
                <X className="w-3 h-3 opacity-50 group-hover:opacity-100" />
              </button>
            );
          })}
          {!cheio && (
            <button
              onClick={onAddMembro}
              className="flex items-center gap-1 pl-2 pr-3 py-0.5 rounded-full border border-dashed border-white/20 text-xs text-white/60 hover:bg-white/5 hover:text-white"
            >
              <Plus className="w-3 h-3" /> adicionar
            </button>
          )}
        </div>
      </div>

      {/* SUB-BLOCO 2: PAPÉIS */}
      <div>
        <div className="text-[10px] tracking-[0.25em] uppercase text-white/50 mb-2">Papéis</div>
        {membros.length === 0 ? (
          <div className="text-[11px] text-white/40 italic py-2">
            Adicione membros à delegação primeiro.
          </div>
        ) : (
          <div className="space-y-2">
            {papeisDeleg.map(p => {
              const alocs = alocPorPapel[p.id] || [];
              const alocadosIds = new Set(alocs.map(a => a.aluno_id));
              const disponiveis = membros.filter(m => !alocadosIds.has(m.aluno_id));
              return (
                <div key={p.id} className="flex flex-wrap items-center gap-1.5">
                  <div className="text-[12px] text-white/85 min-w-[110px]">{p.nome}</div>
                  {alocs.map(a => {
                    const al = alunosById[a.aluno_id];
                    const nomeFull = al?.full_name || al?.nome || 'Aluno';
                    return (
                      <button
                        key={a.id}
                        onClick={() => onRemoverPapel(p.id, a.aluno_id)}
                        className="group flex items-center gap-1.5 pl-1 pr-2 py-0.5 rounded-full bg-amber-200/10 hover:bg-red-500/20 transition text-xs"
                        title="Clique para remover atribuição"
                      >
                        <AvatarAluno aluno={al} brasoes={brasoes} size="sm" />
                        <span>{nomeFull}</span>
                        <X className="w-3 h-3 opacity-50 group-hover:opacity-100" />
                      </button>
                    );
                  })}
                  {disponiveis.length > 0 && (
                    <select
                      value=""
                      onChange={(e) => {
                        if (e.target.value) onAtribuirPapel(p.id, e.target.value);
                      }}
                      className="bg-[#0F0F1E] border border-dashed border-white/20 rounded-full px-2 py-0.5 text-[11px] text-white/60 focus:outline-none focus:border-indigo-400"
                    >
                      <option value="">+ atribuir</option>
                      {disponiveis.map(m => {
                        const al = alunosById[m.aluno_id];
                        return (
                          <option key={m.aluno_id} value={m.aluno_id}>
                            {al?.full_name || al?.nome || 'Aluno'}
                          </option>
                        );
                      })}
                    </select>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const SecaoCat = ({ titulo, children }: { titulo: string; children: React.ReactNode }) => (
  <section>
    <h3 className="text-[11px] tracking-[0.3em] uppercase text-white/55 mb-2 px-1 flex items-center gap-1.5">
      <ScrollText className="w-3 h-3" /> {titulo}
    </h3>
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 space-y-1.5">
      {children}
    </div>
  </section>
);

const PapelLinha = ({
  papel, alocacoes, alunosById, brasoes, onAdd, onRemove, compacto
}: {
  papel: Papel;
  alocacoes: Alocacao[];
  alunosById: Record<string, Aluno>;
  brasoes: Brasoes;
  onAdd: () => void;
  onRemove: (id: string) => void;
  compacto?: boolean;
}) => {
  const ilimitado = papel.vagas_por_turma > 30;
  const cheio = !ilimitado && alocacoes.length >= papel.vagas_por_turma;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className={cn('text-white/85 mr-1', compacto ? 'text-[12px] min-w-[110px]' : 'text-sm min-w-[140px]')}>
        {papel.nome}
        {ilimitado ? (
          alocacoes.length > 0 && (
            <span className="text-[10px] text-white/40 ml-1">({alocacoes.length})</span>
          )
        ) : papel.vagas_por_turma > 1 && (
          <span className="text-[10px] text-white/40 ml-1">
            ({alocacoes.length}/{papel.vagas_por_turma})
          </span>
        )}
      </div>
      {alocacoes.map(a => {
        const al = alunosById[a.aluno_id];
        return (
          <button
            key={a.id}
            onClick={() => onRemove(a.id)}
            className="group flex items-center gap-1.5 pl-1 pr-2 py-0.5 rounded-full bg-amber-200/10 hover:bg-red-500/20 transition text-xs"
            title="Clique para remover"
          >
            <AvatarAluno aluno={al} brasoes={brasoes} size="sm" />
            <span>{nomeCompleto(al)}</span>
            <X className="w-3 h-3 opacity-50 group-hover:opacity-100" />
          </button>
        );
      })}
      {!cheio && (
        <button
          onClick={onAdd}
          className="flex items-center gap-1 pl-2 pr-3 py-0.5 rounded-full border border-dashed border-white/20 text-xs text-white/60 hover:bg-white/5 hover:text-white"
        >
          <Plus className="w-3 h-3" /> alocar
        </button>
      )}
    </div>
  );
};

export default CapituloProfessorPage;
