import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  Paperclip,
  Users,
  ScrollText,
  Plus,
  X,
  Search,
  Send,
  Shield,
  Route as RouteIcon,
  PenLine,
  CheckCircle2,
  Circle,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useProfessor } from '@/contexts/ProfessorContext';
import { infantilTheme as t } from '@/styles/infantilTheme';
import { corDaCasa, F2_REFORMA_ATIVA } from '@/config/f2Reforma';
import { formatTurmaLabel } from '@/lib/infantil';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import LequeObservacao from '@/components/professor/LequeObservacao';

/**
 * ADMINISTRAR CAPÍTULO: Fundamental 2 (reforma, atrás do flag F2_REFORMA_ATIVA).
 *
 * Centro de comando do mentor para UMA turma cuja vez é da Casa dele. Pele CLARA
 * (infantilTheme), a cor da Casa como acento. Reaproveita o MODELO DE DADOS e a
 * LÓGICA da tela escura antiga (CapituloProfessorPage), sem tocá-la: a antiga
 * segue servindo o F2 com o flag desligado.
 *
 * Seções: cabeçalho · data da assembleia · etapas do capítulo · elenco/papéis ·
 * missões (liberar + faltantes) · observações ao vivo. Tudo é salvo na hora
 * (upsert), como já fazia a tela antiga.
 */

// Tabelas da reforma podem não estar nos tipos gerados: via `sb` (any), como as
// demais telas do capítulo, para o build não quebrar por tipagem.
const sb = supabase as any;

type Categoria = 'mesa' | 'mediador' | 'observatorio' | 'delegacao';

interface Capitulo {
  id: string;
  numero: number;
  nome: string;
  frase_ancora: string | null;
  descricao: string | null;
  institution_id: string;
  fase_id: string;
}
interface TurmaInfo {
  id: string;
  nome: string;
  serie: string | null;
  turma_letra: string | null;
}
interface Encontro {
  id: string;
  ordem: number;
  titulo: string;
  objetivo: string | null;
  instrucoes: string | null;
}
interface Anexo {
  id: string;
  encontro_id: string;
  url: string;
  nome: string | null;
  tipo: string | null;
}
interface EncontroTurma {
  encontro_id: string;
  data_prevista: string | null;
  realizado: boolean;
}
interface Papel {
  id: string;
  nome: string;
  categoria: Categoria;
  delegacao: string | null;
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
interface Alocacao {
  id: string;
  papel_id: string;
  aluno_id: string;
}
interface MembroDelegacao {
  id: string;
  delegacao_codigo: string;
  aluno_id: string;
}
interface Aluno {
  id: string;
  nome: string | null;
  full_name: string | null;
  avatar_url: string | null;
  casa_id: number | null;
}
interface TurmaConfig {
  id?: string;
  data_evento: string | null;
  delegacoes_ativas: string[];
  missoes_liberadas_em?: string | null;
  missoes_data_prazo?: string | null;
}
interface Missao {
  id: string;
  titulo: string;
  papel_id: string | null;
  para_membros_delegacao: boolean | null;
  status: string | null;
}
type Brasoes = Record<number, string | null>;

const MAX_MEMBROS_DELEG = 99;

const nomeCompleto = (a: Aluno | undefined): string =>
  !a ? 'Aluno' : a.full_name || a.nome || 'Aluno';

const normalizar = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const filtrarAlunos = (lista: Aluno[], busca: string): Aluno[] => {
  const q = normalizar(busca.trim());
  if (!q) return lista;
  return lista.filter((a) => normalizar(nomeCompleto(a)).includes(q));
};

/** Escudo da Casa: brasão real se houver, senão escudo na cor da Casa. */
const EscudoCasa = ({ casaId, brasao, size = 44 }: { casaId: number | null; brasao: string | null; size?: number }) => {
  const cor = corDaCasa(casaId);
  if (brasao) {
    return <img src={brasao} alt="" className="object-contain flex-shrink-0" style={{ width: size, height: size }} />;
  }
  return (
    <span
      className="rounded-xl flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size, backgroundColor: `${cor}1A` }}
    >
      <Shield size={size * 0.55} style={{ color: cor }} strokeWidth={1.75} />
    </span>
  );
};

/** Avatar pequeno do aluno (foto, brasão da casa ou inicial). */
const AvatarAluno = ({ aluno, brasoes, size = 22 }: { aluno: Aluno | undefined; brasoes: Brasoes; size?: number }) => {
  const brasao = aluno?.casa_id ? brasoes[aluno.casa_id] : null;
  const inicial = nomeCompleto(aluno).slice(0, 1).toUpperCase();
  return (
    <span
      className="rounded-full flex items-center justify-center font-semibold overflow-hidden flex-shrink-0"
      style={{ width: size, height: size, backgroundColor: t.surfaceSunken, color: t.textMuted, fontSize: size * 0.42 }}
    >
      {aluno?.avatar_url ? (
        <img src={aluno.avatar_url} alt="" className="w-full h-full object-cover" />
      ) : brasao ? (
        <img src={brasao} alt="" className="w-full h-full object-contain p-[1px]" />
      ) : (
        inicial
      )}
    </span>
  );
};

/** Título de seção com ícone. */
const SecaoTitulo = ({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) => (
  <div className="flex items-center gap-2 mb-2 px-0.5">
    <span style={{ color: t.accent }}>{icon}</span>
    <h2 className="text-sm font-semibold" style={{ color: t.text }}>
      {children}
    </h2>
  </div>
);

// ============================================================
// Página
// ============================================================
const F2CapituloPage = () => {
  const navigate = useNavigate();
  const { turmaId } = useParams<{ turmaId: string }>();
  const qc = useQueryClient();
  const { profile, casaMentor, segmento, isLoading: ctxLoading } = useProfessor();

  const accent = corDaCasa(casaMentor?.id);
  const anoLetivo = new Date().getFullYear();

  // Só o F2 reformado entra aqui. Segmento errado / flag off: volta pra home.
  useEffect(() => {
    if (ctxLoading) return;
    if (!F2_REFORMA_ATIVA || segmento !== 'fundamental2') navigate('/professor', { replace: true });
  }, [ctxLoading, segmento, navigate]);

  // ---- Turma ----
  const { data: turma } = useQuery<TurmaInfo | null>({
    queryKey: ['f2cap-turma', turmaId],
    enabled: !!turmaId,
    queryFn: async () => {
      const { data } = await sb.from('turmas').select('id, nome, serie, turma_letra').eq('id', turmaId!).maybeSingle();
      return (data as TurmaInfo | null) ?? null;
    },
  });

  // ---- Capítulo ativo da fase da Casa do mentor ----
  const { data: capitulo, isLoading: loadingCap } = useQuery<Capitulo | null>({
    queryKey: ['f2cap-capitulo', profile?.institution_id, casaMentor?.id, anoLetivo],
    enabled: !!profile?.institution_id && !!casaMentor?.id,
    queryFn: async () => {
      const { data: fase } = await sb
        .from('fases')
        .select('id')
        .eq('institution_id', profile!.institution_id)
        .eq('segmento', 'fundamental2')
        .eq('ano_letivo', anoLetivo)
        .eq('inteligencia_id', casaMentor!.id)
        .maybeSingle();
      if (!fase) return null;
      const { data: cap } = await sb
        .from('capitulos')
        .select('id, numero, nome, frase_ancora, descricao_convocacao, institution_id, fase_id')
        .eq('institution_id', profile!.institution_id)
        .eq('fase_id', fase.id)
        .eq('ativo', true)
        .maybeSingle();
      if (!cap) return null;
      return {
        id: cap.id,
        numero: cap.numero,
        nome: cap.nome,
        frase_ancora: cap.frase_ancora ?? null,
        descricao: cap.descricao_convocacao ?? null,
        institution_id: cap.institution_id,
        fase_id: cap.fase_id,
      } as Capitulo;
    },
  });

  const capId = capitulo?.id ?? null;

  // ---- Encontros + anexos + instância por turma ----
  const { data: encontros = [] } = useQuery<Encontro[]>({
    queryKey: ['f2cap-encontros', capId],
    enabled: !!capId,
    queryFn: async () => {
      const { data } = await sb
        .from('capitulo_encontros')
        .select('id, ordem, titulo, objetivo, instrucoes')
        .eq('capitulo_id', capId!)
        .order('ordem');
      return (data as Encontro[]) ?? [];
    },
  });

  const encontroIds = useMemo(() => encontros.map((e) => e.id), [encontros]);

  const { data: anexos = [] } = useQuery<Anexo[]>({
    queryKey: ['f2cap-anexos', capId, encontroIds.length],
    enabled: encontroIds.length > 0,
    queryFn: async () => {
      const { data } = await sb
        .from('capitulo_encontro_anexos')
        .select('id, encontro_id, url, nome, tipo, ordem')
        .in('encontro_id', encontroIds)
        .order('ordem');
      return (data as Anexo[]) ?? [];
    },
  });

  const { data: encontroTurma = [], refetch: refetchEncTurma } = useQuery<EncontroTurma[]>({
    queryKey: ['f2cap-encontro-turma', capId, turmaId, encontroIds.length],
    enabled: encontroIds.length > 0 && !!turmaId,
    queryFn: async () => {
      const { data } = await sb
        .from('capitulo_encontro_turma')
        .select('encontro_id, data_prevista, realizado')
        .eq('turma_id', turmaId!)
        .in('encontro_id', encontroIds);
      return (data as EncontroTurma[]) ?? [];
    },
  });

  // ---- Papéis / delegações / alocações / membros ----
  const { data: papeis = [] } = useQuery<Papel[]>({
    queryKey: ['f2cap-papeis', capId],
    enabled: !!capId,
    queryFn: async () => {
      const { data } = await sb
        .from('capitulo_papeis')
        .select('id, nome, categoria, delegacao, vagas_por_turma, ordem, time_label')
        .eq('capitulo_id', capId!)
        .order('ordem');
      return (data as Papel[]) ?? [];
    },
  });

  const { data: delegacoes = [] } = useQuery<Delegacao[]>({
    queryKey: ['f2cap-delegacoes', capId],
    enabled: !!capId,
    queryFn: async () => {
      const { data } = await sb
        .from('capitulo_delegacoes')
        .select('id, codigo, nome, objetivo, ordem')
        .eq('capitulo_id', capId!)
        .order('ordem');
      return (data as Delegacao[]) ?? [];
    },
  });

  const { data: turmaConfig, refetch: refetchConfig } = useQuery<TurmaConfig | null>({
    queryKey: ['f2cap-config', capId, turmaId],
    enabled: !!capId && !!turmaId,
    queryFn: async () => {
      const { data } = await sb
        .from('capitulo_turma_config')
        .select('id, data_evento, delegacoes_ativas, missoes_liberadas_em, missoes_data_prazo')
        .eq('capitulo_id', capId!)
        .eq('turma_id', turmaId!)
        .maybeSingle();
      return (data as TurmaConfig | null) ?? null;
    },
  });

  const { data: alocacoes = [], refetch: refetchAloc } = useQuery<Alocacao[]>({
    queryKey: ['f2cap-aloc', capId, turmaId],
    enabled: !!capId && !!turmaId,
    queryFn: async () => {
      const { data } = await sb
        .from('capitulo_alocacoes')
        .select('id, papel_id, aluno_id')
        .eq('capitulo_id', capId!)
        .eq('turma_id', turmaId!);
      return (data as Alocacao[]) ?? [];
    },
  });

  const { data: membros = [], refetch: refetchMembros } = useQuery<MembroDelegacao[]>({
    queryKey: ['f2cap-membros', capId, turmaId],
    enabled: !!capId && !!turmaId,
    queryFn: async () => {
      const { data } = await sb
        .from('capitulo_delegacao_membros')
        .select('id, delegacao_codigo, aluno_id')
        .eq('capitulo_id', capId!)
        .eq('turma_id', turmaId!);
      return (data as MembroDelegacao[]) ?? [];
    },
  });

  const { data: alunosDaTurma = [] } = useQuery<Aluno[]>({
    queryKey: ['f2cap-alunos', turmaId],
    enabled: !!turmaId,
    queryFn: async () => {
      const { data } = await sb
        .from('aluno_turma')
        .select('profiles!inner(id, nome, full_name, avatar_url, casa_id)')
        .eq('turma_id', turmaId!)
        .eq('ativo', true);
      const list = ((data ?? []) as any[]).map((r) => r.profiles as Aluno);
      return list.sort((a, b) => nomeCompleto(a).localeCompare(nomeCompleto(b)));
    },
  });

  const { data: brasoes = {} } = useQuery<Brasoes>({
    queryKey: ['f2cap-brasoes'],
    queryFn: async () => {
      const { data } = await sb.from('inteligencias').select('id, brasao_url');
      const map: Brasoes = {};
      ((data ?? []) as any[]).forEach((i) => {
        map[i.id as number] = i.brasao_url ?? null;
      });
      return map;
    },
  });

  const { data: observacoes = [], refetch: refetchObs } = useQuery<{ id: string; aluno_id: string; observacao_texto: string | null }[]>({
    queryKey: ['f2cap-obs', capId, turmaId],
    enabled: !!capId && !!turmaId,
    queryFn: async () => {
      const { data } = await sb
        .from('observacoes')
        .select('id, aluno_id, observacao_texto')
        .eq('capitulo_id', capId!)
        .eq('turma_id', turmaId!)
        .is('excluida_em', null);
      return (data ?? []) as { id: string; aluno_id: string; observacao_texto: string | null }[];
    },
  });

  // ---- Missões do capítulo + entregas da turma (faltantes) ----
  const { data: missoes = [], refetch: refetchMissoes } = useQuery<Missao[]>({
    queryKey: ['f2cap-missoes', capId],
    enabled: !!capId,
    queryFn: async () => {
      const { data } = await sb
        .from('missoes')
        .select('id, titulo, papel_id, para_membros_delegacao, status')
        .eq('capitulo_id', capId!);
      return (data as Missao[]) ?? [];
    },
  });

  const missaoIds = useMemo(() => missoes.map((m) => m.id), [missoes]);
  const alunoIds = useMemo(() => alunosDaTurma.map((a) => a.id), [alunosDaTurma]);

  const { data: entregas = [] } = useQuery<{ missao_id: string; aluno_id: string }[]>({
    queryKey: ['f2cap-entregas', missaoIds.length, alunoIds.length, turmaId],
    enabled: missaoIds.length > 0 && alunoIds.length > 0,
    queryFn: async () => {
      const { data } = await sb
        .from('entregas')
        .select('missao_id, aluno_id')
        .in('missao_id', missaoIds)
        .in('aluno_id', alunoIds);
      return (data ?? []) as { missao_id: string; aluno_id: string }[];
    },
  });

  // ---- Derivados ----
  const alunosById = useMemo(() => {
    const m: Record<string, Aluno> = {};
    alunosDaTurma.forEach((a) => {
      m[a.id] = a;
    });
    return m;
  }, [alunosDaTurma]);

  const alocPorPapel = useMemo(() => {
    const m: Record<string, Alocacao[]> = {};
    alocacoes.forEach((a) => {
      (m[a.papel_id] ||= []).push(a);
    });
    return m;
  }, [alocacoes]);

  const anexosPorEncontro = useMemo(() => {
    const m: Record<string, Anexo[]> = {};
    anexos.forEach((a) => {
      (m[a.encontro_id] ||= []).push(a);
    });
    return m;
  }, [anexos]);

  const dataPrevistaPorEncontro = useMemo(() => {
    const m: Record<string, string | null> = {};
    encontroTurma.forEach((e) => {
      m[e.encontro_id] = e.data_prevista ?? null;
    });
    return m;
  }, [encontroTurma]);

  const delegacoesAtivas = useMemo(() => new Set(turmaConfig?.delegacoes_ativas ?? []), [turmaConfig]);

  const membrosPorDelegacao = useMemo(() => {
    const m: Record<string, MembroDelegacao[]> = {};
    membros.forEach((mem) => {
      (m[mem.delegacao_codigo] ||= []).push(mem);
    });
    return m;
  }, [membros]);

  const alunosEmMembros = useMemo(() => new Set(membros.map((m) => m.aluno_id)), [membros]);
  const alunosEmTimeFixo = useMemo(() => {
    const set = new Set<string>();
    alocacoes.forEach((a) => {
      const p = papeis.find((pp) => pp.id === a.papel_id);
      if (p && p.categoria !== 'delegacao') set.add(a.aluno_id);
    });
    return set;
  }, [alocacoes, papeis]);

  const obsByAluno = useMemo(() => {
    const m = new Map<string, { id: string; aluno_id: string; observacao_texto: string | null }>();
    observacoes.forEach((o) => m.set(o.aluno_id, o));
    return m;
  }, [observacoes]);

  // Papel de cada aluno (rótulo), pra roster de observações e faltantes
  const papelDoAluno = useMemo(() => {
    const m: Record<string, string> = {};
    alocacoes.forEach((a) => {
      const p = papeis.find((pp) => pp.id === a.papel_id);
      if (p) m[a.aluno_id] = p.nome;
    });
    membros.forEach((mem) => {
      if (!m[mem.aluno_id]) {
        const d = delegacoes.find((dd) => dd.codigo === mem.delegacao_codigo);
        if (d) m[mem.aluno_id] = d.nome;
      }
    });
    return m;
  }, [alocacoes, membros, papeis, delegacoes]);

  // ---- Mutations ----
  const [savingConfig, setSavingConfig] = useState(false);

  const upsertConfig = async (patch: Partial<TurmaConfig>) => {
    if (!capId || !turmaId || !profile?.id) return;
    setSavingConfig(true);
    const proxima = {
      capitulo_id: capId,
      turma_id: turmaId,
      data_evento: turmaConfig?.data_evento ?? null,
      delegacoes_ativas: turmaConfig?.delegacoes_ativas ?? [],
      configurado_por: profile.id,
      ...patch,
    };
    const { error } = await sb.from('capitulo_turma_config').upsert(proxima, { onConflict: 'capitulo_id,turma_id' });
    setSavingConfig(false);
    if (error) {
      toast.error(error.message || 'Erro ao salvar');
      return;
    }
    refetchConfig();
  };

  const salvarDataEncontro = async (encontroId: string, data: string) => {
    if (!turmaId) return;
    const { error } = await sb
      .from('capitulo_encontro_turma')
      .upsert(
        { encontro_id: encontroId, turma_id: turmaId, data_prevista: data || null },
        { onConflict: 'encontro_id,turma_id' }
      );
    if (error) {
      toast.error(error.message || 'Erro ao salvar a data da etapa');
      return;
    }
    refetchEncTurma();
  };

  const liberarMissoes = async () => {
    const agora = new Date();
    const prazo = new Date(agora.getTime() + 7 * 24 * 60 * 60 * 1000);
    await upsertConfig({
      missoes_liberadas_em: agora.toISOString(),
      missoes_data_prazo: prazo.toISOString(),
    });
    toast.success(`Missões liberadas. Prazo: ${prazo.toLocaleDateString('pt-BR')}`);
  };

  const alocar = async (papelId: string, alunoId: string) => {
    if (!capId || !turmaId || !profile?.id) return;
    const { error } = await sb
      .from('capitulo_alocacoes')
      .insert({ capitulo_id: capId, papel_id: papelId, aluno_id: alunoId, turma_id: turmaId, alocado_por: profile.id });
    if (error) {
      toast.error(error.message || 'Erro ao alocar');
      return;
    }
    refetchAloc();
    qc.invalidateQueries({ queryKey: ['f2cap-aloc', capId, turmaId] });
  };

  const desalocar = async (id: string) => {
    const { error } = await sb.from('capitulo_alocacoes').delete().eq('id', id);
    if (error) {
      toast.error(error.message || 'Erro ao remover');
      return;
    }
    refetchAloc();
  };

  const addMembro = async (delegacaoCodigo: string, alunoId: string) => {
    if (!capId || !turmaId || !profile?.id) return;
    const { error } = await sb.from('capitulo_delegacao_membros').insert({
      capitulo_id: capId,
      turma_id: turmaId,
      delegacao_codigo: delegacaoCodigo,
      aluno_id: alunoId,
      alocado_por: profile.id,
    });
    if (error) {
      toast.error(error.message || 'Erro ao adicionar');
      return;
    }
    refetchMembros();
  };

  const removerMembro = async (membroId: string, alunoId: string) => {
    if (!capId || !turmaId) return;
    await sb
      .from('capitulo_alocacoes')
      .delete()
      .eq('capitulo_id', capId)
      .eq('turma_id', turmaId)
      .eq('aluno_id', alunoId);
    const { error } = await sb.from('capitulo_delegacao_membros').delete().eq('id', membroId);
    if (error) {
      toast.error(error.message || 'Erro ao remover');
      return;
    }
    refetchMembros();
    refetchAloc();
  };

  const atribuirPapel = async (papelId: string, alunoId: string) => {
    if (!capId || !turmaId || !profile?.id) return;
    if ((alocPorPapel[papelId] || []).some((a) => a.aluno_id === alunoId)) return;
    const { error } = await sb
      .from('capitulo_alocacoes')
      .insert({ capitulo_id: capId, papel_id: papelId, aluno_id: alunoId, turma_id: turmaId, alocado_por: profile.id });
    if (error) {
      toast.error(error.message || 'Erro ao atribuir');
      return;
    }
    refetchAloc();
  };

  const removerPapelDeAluno = async (papelId: string, alunoId: string) => {
    if (!capId || !turmaId) return;
    const { error } = await sb
      .from('capitulo_alocacoes')
      .delete()
      .eq('capitulo_id', capId)
      .eq('turma_id', turmaId)
      .eq('papel_id', papelId)
      .eq('aluno_id', alunoId);
    if (error) {
      toast.error(error.message || 'Erro');
      return;
    }
    refetchAloc();
  };

  // ---- Observação ao vivo ----
  const [alunoObs, setAlunoObs] = useState<{ id: string; nome: string; papel: string } | null>(null);
  const [textoObs, setTextoObs] = useState('');
  const [salvandoObs, setSalvandoObs] = useState(false);

  const abrirObs = (aluno: Aluno) => {
    const nome = nomeCompleto(aluno);
    const existente = obsByAluno.get(aluno.id);
    setAlunoObs({ id: aluno.id, nome, papel: papelDoAluno[aluno.id] || 'Sem papel' });
    setTextoObs(existente?.observacao_texto || '');
  };

  const fecharObs = () => {
    setAlunoObs(null);
    setTextoObs('');
  };

  const salvarObs = async () => {
    if (!alunoObs || !capitulo || !turmaId || !profile?.id) return;
    if (!textoObs.trim()) {
      toast.error('Escreva algo antes de salvar.');
      return;
    }
    setSalvandoObs(true);
    const existente = obsByAluno.get(alunoObs.id);
    let error: unknown;
    if (existente) {
      const res = await sb
        .from('observacoes')
        .update({ observacao_texto: textoObs.trim(), origem: 'manual' })
        .eq('id', existente.id);
      error = res.error;
    } else {
      const res = await sb.from('observacoes').insert({
        institution_id: capitulo.institution_id,
        aluno_id: alunoObs.id,
        professor_id: profile.id,
        turma_id: turmaId,
        fase_id: capitulo.fase_id,
        capitulo_id: capitulo.id,
        observacao_texto: textoObs.trim(),
        origem: 'manual',
      });
      error = res.error;
    }
    setSalvandoObs(false);
    if (error) {
      toast.error((error as { message?: string }).message || 'Erro ao salvar observação');
      return;
    }
    toast.success('Observação salva');
    refetchObs();
    fecharObs();
  };

  // ---- Dialog state (alocação) ----
  const [papelParaAlocar, setPapelParaAlocar] = useState<Papel | null>(null);
  const [delegParaAddMembro, setDelegParaAddMembro] = useState<Delegacao | null>(null);
  const [rosterAberto, setRosterAberto] = useState(false);

  // ===================== Render =====================
  if (ctxLoading || loadingCap) {
    return (
      <div className="pt-4 space-y-3">
        <Skeleton className="h-8 w-32 rounded" />
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>
    );
  }

  if (!capitulo) {
    return (
      <div className="pt-4">
        <BotaoVoltar onClick={() => navigate('/professor')} />
        <div
          className="rounded-2xl p-5 text-center mt-3"
          style={{ backgroundColor: t.surface, border: `1px solid ${t.border}` }}
        >
          <h2 className="text-base font-bold" style={{ color: t.text }}>
            Sem capítulo ativo nesta fase
          </h2>
          <p className="text-sm mt-1.5 max-w-xs mx-auto" style={{ color: t.textMuted }}>
            Quando a fase da sua Casa tiver um capítulo cadastrado, ele aparece aqui para administrar.
          </p>
        </div>
      </div>
    );
  }

  const turmaLabel = turma ? formatTurmaLabel(turma.serie, turma.turma_letra) || turma.nome : '';
  const missoesLiberadas = !!turmaConfig?.missoes_liberadas_em;

  const papeisMesa = papeis.filter((p) => p.categoria === 'mesa');
  const papeisMed = papeis.filter((p) => p.categoria === 'mediador');
  const papeisObs = papeis.filter((p) => p.categoria === 'observatorio');
  const delegAtivasList = delegacoes.filter((d) => delegacoesAtivas.has(d.codigo));

  return (
    <div className="pt-4 pb-10 space-y-6">
      <BotaoVoltar onClick={() => navigate('/professor')} />

      {/* 1. CABEÇALHO */}
      <div
        className="rounded-2xl p-5"
        style={{ backgroundColor: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadowMd }}
      >
        <div className="flex items-start gap-3">
          <EscudoCasa casaId={casaMentor?.id ?? null} brasao={casaMentor?.brasao_url ?? null} size={48} />
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide font-semibold" style={{ color: accent }}>
              Casa {casaMentor?.nome ?? ''} {turmaLabel ? `· ${turmaLabel}` : ''}
            </p>
            <h1 className="text-xl font-bold mt-0.5 leading-tight" style={{ color: t.text }}>
              {capitulo.nome}
            </h1>
            <p className="text-[11px] uppercase tracking-wide mt-0.5" style={{ color: t.textFaint }}>
              Capítulo {String(capitulo.numero).padStart(2, '0')}
            </p>
          </div>
        </div>
        {(capitulo.descricao || capitulo.frase_ancora) && (
          <p className="text-sm mt-3 leading-relaxed" style={{ color: t.textMuted }}>
            {capitulo.descricao || capitulo.frase_ancora}
          </p>
        )}
      </div>

      {/* 2. DATA DA ASSEMBLEIA */}
      <section>
        <SecaoTitulo icon={<CalendarDays size={16} strokeWidth={1.75} />}>Data da assembleia</SecaoTitulo>
        <div
          className="rounded-xl p-4"
          style={{ backgroundColor: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadowSm }}
        >
          <label className="text-[11px] uppercase tracking-wide font-semibold block mb-1.5" style={{ color: t.textFaint }}>
            Dia do encontro final desta turma
          </label>
          <input
            type="date"
            value={turmaConfig?.data_evento ?? ''}
            onChange={(e) => upsertConfig({ data_evento: e.target.value || null })}
            disabled={savingConfig}
            className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
            style={{ backgroundColor: t.surfaceSunken, border: `1px solid ${t.border}`, color: t.text }}
          />
        </div>
      </section>

      {/* 3. ETAPAS DO CAPÍTULO */}
      <section>
        <SecaoTitulo icon={<RouteIcon size={16} strokeWidth={1.75} />}>Etapas do capítulo</SecaoTitulo>
        {encontros.length === 0 ? (
          <div
            className="rounded-xl p-4 text-sm"
            style={{ backgroundColor: t.surface, border: `1px dashed ${t.border}`, color: t.textFaint }}
          >
            As etapas deste capítulo ainda não foram cadastradas.
          </div>
        ) : (
          <div className="space-y-2">
            {encontros.map((e, i) => (
              <EtapaEncontro
                key={e.id}
                encontro={e}
                posicao={i + 1}
                accent={accent}
                dataPrevista={dataPrevistaPorEncontro[e.id] ?? null}
                anexos={anexosPorEncontro[e.id] ?? []}
                onSalvarData={(d) => salvarDataEncontro(e.id, d)}
              />
            ))}
          </div>
        )}
      </section>

      {/* 4. ELENCO / PAPÉIS */}
      <section>
        <SecaoTitulo icon={<Users size={16} strokeWidth={1.75} />}>Elenco e papéis</SecaoTitulo>
        {papeis.length === 0 ? (
          <div
            className="rounded-xl p-4 text-sm"
            style={{ backgroundColor: t.surface, border: `1px dashed ${t.border}`, color: t.textFaint }}
          >
            Este capítulo não tem papéis cadastrados.
          </div>
        ) : (
          <div className="space-y-3">
            {papeisMesa.length > 0 && (
              <BlocoPapeis titulo="Mesa diretora">
                {papeisMesa.map((p) => (
                  <PapelLinha
                    key={p.id}
                    papel={p}
                    alocacoes={alocPorPapel[p.id] || []}
                    alunosById={alunosById}
                    brasoes={brasoes}
                    accent={accent}
                    onAdd={() => setPapelParaAlocar(p)}
                    onRemove={desalocar}
                  />
                ))}
              </BlocoPapeis>
            )}
            {papeisMed.length > 0 && (
              <BlocoPapeis titulo="Mediadores">
                {papeisMed.map((p) => (
                  <PapelLinha
                    key={p.id}
                    papel={p}
                    alocacoes={alocPorPapel[p.id] || []}
                    alunosById={alunosById}
                    brasoes={brasoes}
                    accent={accent}
                    onAdd={() => setPapelParaAlocar(p)}
                    onRemove={desalocar}
                  />
                ))}
              </BlocoPapeis>
            )}
            {papeisObs.length > 0 && (
              <BlocoPapeis titulo="Observatório">
                {papeisObs.map((p) => (
                  <PapelLinha
                    key={p.id}
                    papel={p}
                    alocacoes={alocPorPapel[p.id] || []}
                    alunosById={alunosById}
                    brasoes={brasoes}
                    accent={accent}
                    onAdd={() => setPapelParaAlocar(p)}
                    onRemove={desalocar}
                  />
                ))}
              </BlocoPapeis>
            )}
            {delegAtivasList.length > 0 && (
              <BlocoPapeis titulo="Delegações">
                <div className="space-y-2.5">
                  {delegAtivasList.map((deleg) => (
                    <CartaoDelegacao
                      key={deleg.id}
                      delegacao={deleg}
                      papeisDeleg={papeis
                        .filter((p) => p.categoria === 'delegacao' && p.delegacao === deleg.codigo)
                        .sort((a, b) => a.ordem - b.ordem)}
                      membros={membrosPorDelegacao[deleg.codigo] || []}
                      alunosById={alunosById}
                      brasoes={brasoes}
                      accent={accent}
                      alocPorPapel={alocPorPapel}
                      onAddMembro={() => setDelegParaAddMembro(deleg)}
                      onRemoverMembro={removerMembro}
                      onAtribuirPapel={atribuirPapel}
                      onRemoverPapel={removerPapelDeAluno}
                    />
                  ))}
                </div>
              </BlocoPapeis>
            )}
          </div>
        )}
      </section>

      {/* 5. MISSÕES */}
      <section>
        <SecaoTitulo icon={<Send size={16} strokeWidth={1.75} />}>Missões do capítulo</SecaoTitulo>
        <SecaoMissoes
          missoes={missoes}
          entregas={entregas}
          alunosDaTurma={alunosDaTurma}
          alunosById={alunosById}
          brasoes={brasoes}
          alocPorPapel={alocPorPapel}
          alunosEmMembros={alunosEmMembros}
          liberadas={missoesLiberadas}
          prazo={turmaConfig?.missoes_data_prazo ?? null}
          savingConfig={savingConfig}
          accent={accent}
          onLiberar={liberarMissoes}
        />
      </section>

      {/* 6. OBSERVAÇÕES AO VIVO */}
      <section>
        <SecaoTitulo icon={<PenLine size={16} strokeWidth={1.75} />}>Observações do projeto</SecaoTitulo>
        <div
          className="rounded-xl p-4"
          style={{ backgroundColor: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadowSm }}
        >
          <p className="text-sm leading-relaxed" style={{ color: t.textMuted }}>
            Durante o encontro, registre ao vivo como cada aluno chegou: o mecanismo que apareceu, o
            caminho que ele usou. {observacoes.length > 0 && (
              <span style={{ color: t.presenteText }}>{observacoes.length} já registrada{observacoes.length === 1 ? '' : 's'}.</span>
            )}
          </p>
          <button
            onClick={() => setRosterAberto(true)}
            className="w-full mt-3 rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-1.5"
            style={{ backgroundColor: accent, color: '#FFFFFF', boxShadow: t.shadowSm }}
          >
            <PenLine size={16} /> Abrir observações ao vivo
          </button>
        </div>
      </section>

      {/* Rodapé: tudo salvo automaticamente */}
      <p className="text-center text-[11px]" style={{ color: t.textFaint }}>
        Cada mudança é salva automaticamente.
      </p>

      {/* ===== Dialog: alocar papel ===== */}
      <AlocarDialog
        open={!!papelParaAlocar}
        titulo={papelParaAlocar?.nome ?? ''}
        subtitulo={papelParaAlocar?.time_label ?? 'Escolha quem assume este papel'}
        alunos={alunosDaTurma}
        brasoes={brasoes}
        accent={accent}
        estaBloqueado={(al) => {
          if (!papelParaAlocar) return { bloqueado: false, motivo: '' };
          const jaNoPapel = (alocPorPapel[papelParaAlocar.id] || []).some((a) => a.aluno_id === al.id);
          const emDeleg = alunosEmMembros.has(al.id);
          const emOutroFixo = alunosEmTimeFixo.has(al.id) && !jaNoPapel;
          if (jaNoPapel) return { bloqueado: true, motivo: 'já no papel' };
          if (emDeleg) return { bloqueado: true, motivo: 'em uma delegação' };
          if (emOutroFixo) return { bloqueado: true, motivo: 'já em time fixo' };
          return { bloqueado: false, motivo: '' };
        }}
        onEscolher={(al) => {
          if (papelParaAlocar) alocar(papelParaAlocar.id, al.id);
          setPapelParaAlocar(null);
        }}
        onClose={() => setPapelParaAlocar(null)}
      />

      {/* ===== Dialog: adicionar membro à delegação ===== */}
      <AlocarDialog
        open={!!delegParaAddMembro}
        titulo={delegParaAddMembro ? `Adicionar à ${delegParaAddMembro.nome}` : ''}
        subtitulo="Escolha quem entra nesta delegação. Os papéis você define depois."
        alunos={alunosDaTurma}
        brasoes={brasoes}
        accent={accent}
        estaBloqueado={(al) => {
          const emDeleg = alunosEmMembros.has(al.id);
          const emFixo = alunosEmTimeFixo.has(al.id);
          if (emDeleg) return { bloqueado: true, motivo: 'já em delegação' };
          if (emFixo) return { bloqueado: true, motivo: 'em time fixo' };
          return { bloqueado: false, motivo: '' };
        }}
        onEscolher={(al) => {
          if (delegParaAddMembro) addMembro(delegParaAddMembro.codigo, al.id);
          setDelegParaAddMembro(null);
        }}
        onClose={() => setDelegParaAddMembro(null)}
      />

      {/* ===== Dialog: roster de observações ===== */}
      <Dialog open={rosterAberto} onOpenChange={(o) => !o && setRosterAberto(false)}>
        <DialogContent
          className="max-w-md"
          style={{ backgroundColor: t.surface, border: `1px solid ${t.border}`, color: t.text }}
        >
          <DialogHeader>
            <DialogTitle style={{ color: t.text }}>Observações ao vivo</DialogTitle>
            <DialogDescription style={{ color: t.textMuted }}>
              Toque num aluno para registrar como ele chegou neste capítulo.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto -mx-1 px-1 space-y-1.5">
            {alunosDaTurma.length === 0 ? (
              <p className="text-sm py-4" style={{ color: t.textMuted }}>
                Nenhum aluno nesta turma.
              </p>
            ) : (
              alunosDaTurma.map((al) => {
                const temObs = obsByAluno.has(al.id);
                return (
                  <button
                    key={al.id}
                    onClick={() => {
                      setRosterAberto(false);
                      abrirObs(al);
                    }}
                    className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors"
                    style={{ backgroundColor: t.surfaceAlt }}
                  >
                    <AvatarAluno aluno={al} brasoes={brasoes} size={30} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium truncate" style={{ color: t.text }}>
                        {nomeCompleto(al)}
                      </span>
                      <span className="block text-[11px] truncate" style={{ color: t.textFaint }}>
                        {papelDoAluno[al.id] || 'Sem papel'}
                      </span>
                    </span>
                    {temObs ? (
                      <CheckCircle2 size={18} style={{ color: t.presente }} />
                    ) : (
                      <Circle size={18} style={{ color: t.silencio }} />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== Dialog: editor de observação de um aluno ===== */}
      <Dialog open={!!alunoObs} onOpenChange={(o) => !o && fecharObs()}>
        <DialogContent
          className="max-w-lg"
          style={{ backgroundColor: t.surface, border: `1px solid ${t.border}`, color: t.text }}
        >
          {alunoObs && (
            <>
              <DialogHeader>
                <DialogTitle style={{ color: t.text }}>{alunoObs.nome}</DialogTitle>
                <DialogDescription style={{ color: t.textMuted }}>
                  Papel: <span style={{ color: t.text }}>{alunoObs.papel}</span>
                </DialogDescription>
              </DialogHeader>
              <textarea
                value={textoObs}
                onChange={(e) => setTextoObs(e.target.value)}
                placeholder="Como este aluno chegou? (o mecanismo que apareceu, o caminho que ele usou)"
                rows={6}
                className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none resize-none"
                style={{ backgroundColor: t.surfaceSunken, border: `1px solid ${t.border}`, color: t.text }}
              />
              <div className="flex items-center justify-between gap-2 pt-1">
                <LequeObservacao
                  inteligenciaId={casaMentor?.id ?? null}
                  valorAtual={textoObs}
                  onInserir={(trecho) => setTextoObs((v) => (v ? `${v} ${trecho}` : trecho))}
                  cores={{ acento: accent }}
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={fecharObs}
                    disabled={salvandoObs}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-40"
                    style={{ color: t.textMuted }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={salvarObs}
                    disabled={salvandoObs || !textoObs.trim()}
                    className="px-4 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-40"
                    style={{ backgroundColor: accent, color: '#FFFFFF' }}
                  >
                    {salvandoObs ? 'Salvando…' : obsByAluno.has(alunoObs.id) ? 'Salvar alterações' : 'Salvar'}
                  </button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ============================================================
// Subcomponentes
// ============================================================

const BotaoVoltar = ({ onClick }: { onClick: () => void }) => (
  <button
    onClick={onClick}
    className="inline-flex items-center gap-1.5 text-sm font-medium rounded-lg px-2 py-1 -ml-2"
    style={{ color: t.textMuted }}
  >
    <ArrowLeft size={16} /> Voltar
  </button>
);

const BlocoPapeis = ({ titulo, children }: { titulo: string; children: React.ReactNode }) => (
  <div className="rounded-xl p-3.5" style={{ backgroundColor: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadowSm }}>
    <h3 className="text-[11px] tracking-wide uppercase font-semibold mb-2.5 flex items-center gap-1.5" style={{ color: t.textFaint }}>
      <ScrollText size={12} /> {titulo}
    </h3>
    <div className="space-y-2">{children}</div>
  </div>
);

const ChipAluno = ({
  aluno,
  brasoes,
  onRemove,
}: {
  aluno: Aluno | undefined;
  brasoes: Brasoes;
  onRemove: () => void;
}) => (
  <button
    onClick={onRemove}
    className="group flex items-center gap-1.5 pl-1 pr-2 py-0.5 rounded-full text-xs transition-colors"
    style={{ backgroundColor: t.accentSoft, color: t.accentText, border: `1px solid ${t.accentBorder}` }}
    title="Toque para remover"
  >
    <AvatarAluno aluno={aluno} brasoes={brasoes} size={18} />
    <span>{nomeCompleto(aluno)}</span>
    <X size={12} className="opacity-50 group-hover:opacity-100" />
  </button>
);

const BotaoAlocar = ({ label, accent, onClick }: { label: string; accent: string; onClick: () => void }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-1 pl-2 pr-3 py-1 rounded-full text-xs font-medium"
    style={{ border: `1px dashed ${accent}66`, color: accent }}
  >
    <Plus size={12} /> {label}
  </button>
);

const PapelLinha = ({
  papel,
  alocacoes,
  alunosById,
  brasoes,
  accent,
  onAdd,
  onRemove,
}: {
  papel: Papel;
  alocacoes: Alocacao[];
  alunosById: Record<string, Aluno>;
  brasoes: Brasoes;
  accent: string;
  onAdd: () => void;
  onRemove: (id: string) => void;
}) => {
  const ilimitado = papel.vagas_por_turma > 30;
  const cheio = !ilimitado && alocacoes.length >= papel.vagas_por_turma;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="text-sm min-w-[130px] mr-1" style={{ color: t.text }}>
        {papel.nome}
        {ilimitado
          ? alocacoes.length > 0 && (
              <span className="text-[10px] ml-1" style={{ color: t.textFaint }}>
                ({alocacoes.length})
              </span>
            )
          : papel.vagas_por_turma > 1 && (
              <span className="text-[10px] ml-1" style={{ color: t.textFaint }}>
                ({alocacoes.length}/{papel.vagas_por_turma})
              </span>
            )}
      </div>
      {alocacoes.map((a) => (
        <ChipAluno key={a.id} aluno={alunosById[a.aluno_id]} brasoes={brasoes} onRemove={() => onRemove(a.id)} />
      ))}
      {!cheio && <BotaoAlocar label="alocar" accent={accent} onClick={onAdd} />}
    </div>
  );
};

const CartaoDelegacao = ({
  delegacao,
  papeisDeleg,
  membros,
  alunosById,
  brasoes,
  accent,
  alocPorPapel,
  onAddMembro,
  onRemoverMembro,
  onAtribuirPapel,
  onRemoverPapel,
}: {
  delegacao: Delegacao;
  papeisDeleg: Papel[];
  membros: MembroDelegacao[];
  alunosById: Record<string, Aluno>;
  brasoes: Brasoes;
  accent: string;
  alocPorPapel: Record<string, Alocacao[]>;
  onAddMembro: () => void;
  onRemoverMembro: (membroId: string, alunoId: string) => void;
  onAtribuirPapel: (papelId: string, alunoId: string) => void;
  onRemoverPapel: (papelId: string, alunoId: string) => void;
}) => {
  const cheio = membros.length >= MAX_MEMBROS_DELEG;
  return (
    <div className="rounded-lg p-3" style={{ backgroundColor: t.surfaceAlt, border: `1px solid ${t.border}` }}>
      <div className="text-sm font-semibold mb-2.5" style={{ color: t.text }}>
        {delegacao.nome}
      </div>

      {/* Time */}
      <div className="mb-3">
        <div className="text-[10px] tracking-wide uppercase mb-1.5" style={{ color: t.textFaint }}>
          Time{membros.length > 0 ? ` · ${membros.length}` : ''}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {membros.map((m) => (
            <ChipAluno
              key={m.id}
              aluno={alunosById[m.aluno_id]}
              brasoes={brasoes}
              onRemove={() => onRemoverMembro(m.id, m.aluno_id)}
            />
          ))}
          {!cheio && <BotaoAlocar label="adicionar" accent={accent} onClick={onAddMembro} />}
        </div>
      </div>

      {/* Papéis */}
      <div>
        <div className="text-[10px] tracking-wide uppercase mb-1.5" style={{ color: t.textFaint }}>
          Papéis
        </div>
        {membros.length === 0 ? (
          <div className="text-[11px] italic py-1" style={{ color: t.textFaint }}>
            Adicione membros à delegação primeiro.
          </div>
        ) : (
          <div className="space-y-2">
            {papeisDeleg.map((p) => {
              const alocs = alocPorPapel[p.id] || [];
              const alocadosIds = new Set(alocs.map((a) => a.aluno_id));
              const disponiveis = membros.filter((m) => !alocadosIds.has(m.aluno_id));
              return (
                <div key={p.id} className="flex flex-wrap items-center gap-1.5">
                  <div className="text-[12px] min-w-[100px]" style={{ color: t.text }}>
                    {p.nome}
                  </div>
                  {alocs.map((a) => (
                    <ChipAluno
                      key={a.id}
                      aluno={alunosById[a.aluno_id]}
                      brasoes={brasoes}
                      onRemove={() => onRemoverPapel(p.id, a.aluno_id)}
                    />
                  ))}
                  {disponiveis.length > 0 && (
                    <select
                      value=""
                      onChange={(e) => {
                        if (e.target.value) onAtribuirPapel(p.id, e.target.value);
                      }}
                      className="rounded-full px-2 py-0.5 text-[11px] focus:outline-none"
                      style={{ backgroundColor: t.surface, border: `1px dashed ${t.border}`, color: t.textMuted }}
                    >
                      <option value="">+ atribuir</option>
                      {disponiveis.map((m) => (
                        <option key={m.aluno_id} value={m.aluno_id}>
                          {nomeCompleto(alunosById[m.aluno_id])}
                        </option>
                      ))}
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

const EtapaEncontro = ({
  encontro,
  posicao,
  accent,
  dataPrevista,
  anexos,
  onSalvarData,
}: {
  encontro: Encontro;
  posicao: number;
  accent: string;
  dataPrevista: string | null;
  anexos: Anexo[];
  onSalvarData: (data: string) => void;
}) => {
  const [aberto, setAberto] = useState(false);
  return (
    <div className="rounded-xl overflow-hidden" style={{ backgroundColor: t.surface, border: `1px solid ${t.border}` }}>
      <button onClick={() => setAberto((v) => !v)} className="w-full flex items-center gap-2.5 p-3 text-left">
        <span
          className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
          style={{ backgroundColor: `${accent}1A`, color: accent }}
        >
          {posicao}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold truncate" style={{ color: t.text }}>
            {encontro.titulo}
          </span>
          {dataPrevista && (
            <span className="block text-[11px] flex items-center gap-1 mt-0.5" style={{ color: t.textFaint }}>
              <Clock size={11} /> {new Date(`${dataPrevista}T12:00:00`).toLocaleDateString('pt-BR')}
            </span>
          )}
        </span>
        <ChevronDown
          size={16}
          style={{ color: t.textFaint, transform: aberto ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}
        />
      </button>

      {aberto && (
        <div className="px-3 pb-3 space-y-2.5" style={{ borderTop: `1px solid ${t.border}` }}>
          <div className="pt-2.5">
            <label className="text-[10px] uppercase tracking-wide font-semibold block mb-1" style={{ color: t.textFaint }}>
              Data prevista para esta turma
            </label>
            <input
              type="date"
              value={dataPrevista ?? ''}
              onChange={(e) => onSalvarData(e.target.value)}
              className="rounded-lg px-2.5 py-1.5 text-sm focus:outline-none"
              style={{ backgroundColor: t.surfaceSunken, border: `1px solid ${t.border}`, color: t.text }}
            />
          </div>
          {encontro.objetivo && (
            <p className="text-xs leading-relaxed" style={{ color: t.textMuted }}>
              <span className="font-semibold" style={{ color: t.text }}>
                Objetivo.{' '}
              </span>
              {encontro.objetivo}
            </p>
          )}
          {encontro.instrucoes ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: t.textMuted }}>
              {encontro.instrucoes}
            </p>
          ) : (
            <p className="text-xs italic" style={{ color: t.textFaint }}>
              Sem instruções cadastradas para esta etapa.
            </p>
          )}
          {anexos.length > 0 && (
            <div className="space-y-1.5 pt-1">
              {anexos.map((a) => (
                <a
                  key={a.id}
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm"
                  style={{ backgroundColor: t.surfaceAlt, color: t.accentText }}
                >
                  <Paperclip size={14} strokeWidth={2} />
                  <span className="truncate">{a.nome || a.tipo || 'Anexo'}</span>
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const SecaoMissoes = ({
  missoes,
  entregas,
  alunosDaTurma,
  alunosById,
  brasoes,
  alocPorPapel,
  alunosEmMembros,
  liberadas,
  prazo,
  savingConfig,
  accent,
  onLiberar,
}: {
  missoes: Missao[];
  entregas: { missao_id: string; aluno_id: string }[];
  alunosDaTurma: Aluno[];
  alunosById: Record<string, Aluno>;
  brasoes: Brasoes;
  alocPorPapel: Record<string, Alocacao[]>;
  alunosEmMembros: Set<string>;
  liberadas: boolean;
  prazo: string | null;
  savingConfig: boolean;
  accent: string;
  onLiberar: () => void;
}) => {
  const entreguesPorMissao = useMemo(() => {
    const m: Record<string, Set<string>> = {};
    entregas.forEach((e) => {
      (m[e.missao_id] ||= new Set()).add(e.aluno_id);
    });
    return m;
  }, [entregas]);

  const elegiveisDe = (missao: Missao): Aluno[] => {
    if (missao.papel_id) {
      const ids = new Set((alocPorPapel[missao.papel_id] || []).map((a) => a.aluno_id));
      return alunosDaTurma.filter((a) => ids.has(a.id));
    }
    if (missao.para_membros_delegacao) {
      return alunosDaTurma.filter((a) => alunosEmMembros.has(a.id));
    }
    return alunosDaTurma;
  };

  return (
    <div className="space-y-3">
      {/* Liberar */}
      <div className="rounded-xl p-4" style={{ backgroundColor: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadowSm }}>
        {liberadas ? (
          <div className="text-sm" style={{ color: t.textMuted }}>
            <p className="flex items-center gap-1.5 font-medium" style={{ color: t.presenteText }}>
              <CheckCircle2 size={16} /> Missões liberadas para esta turma.
            </p>
            {prazo && (
              <p className="mt-1 text-[12px]" style={{ color: t.textFaint }}>
                Prazo de entrega: {new Date(prazo).toLocaleDateString('pt-BR')}
              </p>
            )}
          </div>
        ) : (
          <>
            <p className="text-sm leading-relaxed" style={{ color: t.textMuted }}>
              Ao liberar, cada aluno passa a ver a missão do papel dele. O prazo é automático: 7 dias.
            </p>
            <button
              onClick={onLiberar}
              disabled={savingConfig}
              className="w-full mt-3 rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50"
              style={{ backgroundColor: accent, color: '#FFFFFF', boxShadow: t.shadowSm }}
            >
              <Send size={16} /> Liberar missões do capítulo
            </button>
          </>
        )}
      </div>

      {/* Faltantes por missão (só faz sentido quando liberadas) */}
      {liberadas && missoes.length > 0 && (
        <div className="space-y-2">
          {missoes.map((missao) => {
            const elegiveis = elegiveisDe(missao);
            const entregues = entreguesPorMissao[missao.id] || new Set<string>();
            const faltantes = elegiveis.filter((a) => !entregues.has(a.id));
            return (
              <div
                key={missao.id}
                className="rounded-xl p-3.5"
                style={{ backgroundColor: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadowSm }}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium min-w-0 truncate" style={{ color: t.text }}>
                    {missao.titulo}
                  </p>
                  <span className="text-[11px] whitespace-nowrap font-semibold" style={{ color: faltantes.length === 0 ? t.presenteText : t.textMuted }}>
                    {elegiveis.length - faltantes.length}/{elegiveis.length} entregaram
                  </span>
                </div>
                {elegiveis.length === 0 ? (
                  <p className="text-[11px] italic mt-1" style={{ color: t.textFaint }}>
                    Ninguém elegível ainda (aloque os papéis).
                  </p>
                ) : faltantes.length === 0 ? (
                  <p className="text-[11px] mt-1 flex items-center gap-1" style={{ color: t.presenteText }}>
                    <CheckCircle2 size={12} /> Todos entregaram.
                  </p>
                ) : (
                  <div className="mt-2">
                    <p className="text-[10px] uppercase tracking-wide font-semibold mb-1.5" style={{ color: t.textFaint }}>
                      Faltam entregar
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {faltantes.map((a) => (
                        <span
                          key={a.id}
                          className="flex items-center gap-1.5 pl-1 pr-2 py-0.5 rounded-full text-xs"
                          style={{ backgroundColor: t.surfaceSunken, color: t.textMuted }}
                        >
                          <AvatarAluno aluno={alunosById[a.id]} brasoes={brasoes} size={18} />
                          {nomeCompleto(a)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const AlocarDialog = ({
  open,
  titulo,
  subtitulo,
  alunos,
  brasoes,
  accent,
  estaBloqueado,
  onEscolher,
  onClose,
}: {
  open: boolean;
  titulo: string;
  subtitulo: string;
  alunos: Aluno[];
  brasoes: Brasoes;
  accent: string;
  estaBloqueado: (a: Aluno) => { bloqueado: boolean; motivo: string };
  onEscolher: (a: Aluno) => void;
  onClose: () => void;
}) => {
  const [busca, setBusca] = useState('');
  useEffect(() => {
    if (!open) setBusca('');
  }, [open]);
  const lista = filtrarAlunos(alunos, busca);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-md"
        style={{ backgroundColor: t.surface, border: `1px solid ${t.border}`, color: t.text }}
      >
        <DialogHeader>
          <DialogTitle style={{ color: t.text }}>{titulo}</DialogTitle>
          <DialogDescription style={{ color: t.textMuted }}>{subtitulo}</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: t.textFaint }} />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar pelo nome..."
            autoFocus
            className="w-full rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none"
            style={{ backgroundColor: t.surfaceSunken, border: `1px solid ${t.border}`, color: t.text }}
          />
        </div>
        <div className="max-h-[50vh] overflow-y-auto -mx-1 px-1">
          {alunos.length === 0 ? (
            <p className="text-sm py-4" style={{ color: t.textMuted }}>
              Nenhum aluno nesta turma.
            </p>
          ) : lista.length === 0 ? (
            <p className="text-sm py-4 text-center" style={{ color: t.textFaint }}>
              Nenhum resultado.
            </p>
          ) : (
            <div className="space-y-1">
              {lista.map((al) => {
                const { bloqueado, motivo } = estaBloqueado(al);
                return (
                  <button
                    key={al.id}
                    disabled={bloqueado}
                    onClick={() => onEscolher(al)}
                    className={cn('w-full text-left flex items-center gap-3 p-2 rounded-lg transition-colors', bloqueado && 'opacity-40 cursor-not-allowed')}
                    style={{ backgroundColor: bloqueado ? 'transparent' : t.surfaceAlt }}
                  >
                    <AvatarAluno aluno={al} brasoes={brasoes} size={32} />
                    <span className="text-sm" style={{ color: t.text }}>
                      {nomeCompleto(al)}
                    </span>
                    {motivo && (
                      <span className="ml-auto text-[10px]" style={{ color: t.textFaint }}>
                        {motivo}
                      </span>
                    )}
                    {!bloqueado && <Plus size={16} className="ml-auto" style={{ color: accent }} />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default F2CapituloPage;
