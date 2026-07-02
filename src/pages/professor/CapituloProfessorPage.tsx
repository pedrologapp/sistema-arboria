import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Calendar, ScrollText, Settings2, Search, ClipboardCheck, Users, FileText, Upload, Trash2, Sparkles } from 'lucide-react';
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { enviarParaIA } from '@/lib/n8n';

const sb = supabase as any;

type Categoria = 'mesa' | 'mediador' | 'observatorio' | 'delegacao';

interface Capitulo {
  id: string;
  numero: number;
  nome: string;
  frase_ancora: string | null;
  tema_curto: string | null;
  institution_id: string;
  fase_id: string;
  relatorio_url: string | null;
  relatorio_processado_em: string | null;
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
  missoes_liberadas_em?: string | null;
  missoes_data_prazo?: string | null;
  missoes_liberadas_por?: string | null;
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
  const [editandoPrazo, setEditandoPrazo] = useState(false);
  const [novoPrazo, setNovoPrazo] = useState('');
  const [aplicarTodasTurmas, setAplicarTodasTurmas] = useState(false);
  const [subTab, setSubTab] = useState<'elenco' | 'avaliacao'>('elenco');
  const [alunoAvaliando, setAlunoAvaliando] = useState<{ id: string; nome: string; papel: string } | null>(null);
  const [textoObs, setTextoObs] = useState('');
  const [salvandoObs, setSalvandoObs] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [removendoPdf, setRemovendoPdf] = useState(false);
  const [papelParaAlocar, setPapelParaAlocar] = useState<Papel | null>(null);
  const [delegacaoParaAddMembro, setDelegacaoParaAddMembro] = useState<Delegacao | null>(null);
  const [savingConfig, setSavingConfig] = useState(false);
  const [buscaPapel, setBuscaPapel] = useState('');
  const [buscaMembro, setBuscaMembro] = useState('');

  const { data: capitulo, isLoading: loadingCap, refetch: refetchCapitulo } = useQuery<Capitulo | null>({
    queryKey: ['prof-cap-ativo', faseAtual?.id, profile?.institution_id],
    enabled: !!faseAtual?.id && !!profile?.institution_id,
    queryFn: async () => {
      const { data } = await sb.from('capitulos')
        .select('id, numero, nome, frase_ancora, tema_curto, institution_id, fase_id, relatorio_url, relatorio_processado_em')
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
        .select('id, data_evento, delegacoes_ativas, missoes_liberadas_em, missoes_data_prazo')
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

  // Observações da Avaliação deste capítulo (filtrado por turma via aluno_id, depois)
  const { data: avaliacoes = [], refetch: refetchAvaliacoes } = useQuery<{ id: string; aluno_id: string; observacao_texto: string | null; origem: string }[]>({
    queryKey: ['prof-cap-avaliacoes', capitulo?.id, turmaId],
    enabled: !!capitulo?.id && !!turmaId,
    queryFn: async () => {
      const { data } = await sb.from('observacoes')
        .select('id, aluno_id, observacao_texto, origem')
        .eq('capitulo_id', capitulo!.id)
        .eq('turma_id', turmaId!)
        .is('excluida_em' as never, null);
      return data ?? [];
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

  const liberarMissoes = async () => {
    const agora = new Date();
    const prazo = new Date(agora.getTime() + 7 * 24 * 60 * 60 * 1000); // +7 dias
    await upsertConfig({
      missoes_liberadas_em: agora.toISOString(),
      missoes_data_prazo: prazo.toISOString(),
      missoes_liberadas_por: profile?.id ?? null,
    });
    toast.success(`Missões do capítulo liberadas! Prazo: ${prazo.toLocaleDateString('pt-BR')}`);
  };

  const abrirEditorPrazo = () => {
    // pré-preenche com o prazo atual OU hoje + 7 dias
    const base = turmaConfig?.missoes_data_prazo
      ? new Date(turmaConfig.missoes_data_prazo)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    // input type="date" precisa de YYYY-MM-DD
    const yyyy = base.getFullYear();
    const mm = String(base.getMonth() + 1).padStart(2, '0');
    const dd = String(base.getDate()).padStart(2, '0');
    setNovoPrazo(`${yyyy}-${mm}-${dd}`);
    setAplicarTodasTurmas(false);
    setEditandoPrazo(true);
  };

  const salvarNovoPrazo = async () => {
    if (!capitulo?.id || !profile?.id || !novoPrazo) return;
    setSavingConfig(true);
    // 23:59:59 -03 do dia escolhido (Brasília)
    const dataIso = new Date(`${novoPrazo}T23:59:59-03:00`).toISOString();

    if (aplicarTodasTurmas) {
      // Atualiza TODAS as turmas JÁ liberadas deste capítulo
      const { error: updErr } = await sb.from('capitulo_turma_config')
        .update({ missoes_data_prazo: dataIso, missoes_liberadas_por: profile.id })
        .eq('capitulo_id', capitulo.id)
        .not('missoes_liberadas_em', 'is', null);
      if (updErr) {
        toast.error(updErr.message || 'Erro ao atualizar turmas');
        setSavingConfig(false);
        return;
      }
      // Se ESTA turma ainda não estava liberada, libera agora
      if (turmaId && !turmaConfig?.missoes_liberadas_em) {
        await upsertConfig({
          missoes_liberadas_em: new Date().toISOString(),
          missoes_data_prazo: dataIso,
          missoes_liberadas_por: profile.id,
        });
      } else {
        refetchConfig();
      }
      toast.success(`Prazo atualizado em todas as turmas já liberadas: ${new Date(dataIso).toLocaleDateString('pt-BR')}`);
    } else {
      // Só esta turma
      await upsertConfig({
        missoes_liberadas_em: turmaConfig?.missoes_liberadas_em || new Date().toISOString(),
        missoes_data_prazo: dataIso,
        missoes_liberadas_por: profile.id,
      });
      toast.success(`Prazo atualizado: ${new Date(dataIso).toLocaleDateString('pt-BR')}`);
    }

    // Sincroniza missoes.data_prazo com o MAIOR prazo entre as turmas.
    // Assim cada turma é limitada pelo seu próprio prazo (em capitulo_turma_config),
    // e missoes.data_prazo vira o teto global — evita que turmas com prazo maior
    // expirem antes da hora por causa de uma config com prazo menor.
    const { data: configs } = await sb.from('capitulo_turma_config')
      .select('missoes_data_prazo')
      .eq('capitulo_id', capitulo.id)
      .not('missoes_data_prazo', 'is', null);

    const prazos = (configs ?? [])
      .map(c => c.missoes_data_prazo as string | null)
      .filter((p): p is string => !!p);
    const maxPrazo = prazos.length > 0
      ? prazos.reduce((a, b) => (a > b ? a : b))
      : dataIso;

    const { error: missErr } = await sb.from('missoes')
      .update({ data_prazo: maxPrazo })
      .eq('capitulo_id', capitulo.id);
    if (missErr) {
      console.warn('[prazo] Falha ao sincronizar missoes.data_prazo:', missErr.message);
    }

    setEditandoPrazo(false);
    setSavingConfig(false);
  };

  // ===== Avaliação do Capítulo =====
  const abrirAvaliacao = (aluno: { id: string; nome: string }, papelNome: string) => {
    const existente = avaliacoes.find(a => a.aluno_id === aluno.id);
    setAlunoAvaliando({ id: aluno.id, nome: aluno.nome, papel: papelNome });
    setTextoObs(existente?.observacao_texto || '');
  };

  const fecharAvaliacao = () => {
    setAlunoAvaliando(null);
    setTextoObs('');
  };

  const salvarAvaliacao = async (confirmarRascunhoIa = false) => {
    if (!alunoAvaliando || !capitulo || !turmaId || !profile?.id) return;
    if (!textoObs.trim()) {
      toast.error('Escreve algo antes de salvar.');
      return;
    }
    setSalvandoObs(true);

    const existente = avaliacoes.find(a => a.aluno_id === alunoAvaliando.id);
    // Se está confirmando um rascunho IA → origem='ia_confirmada'. Senão 'manual'.
    const novaOrigem = confirmarRascunhoIa ? 'ia_confirmada' : 'manual';

    let error: unknown;
    if (existente) {
      const res = await sb.from('observacoes')
        .update({ observacao_texto: textoObs.trim(), origem: novaOrigem })
        .eq('id', existente.id);
      error = res.error;
    } else {
      const res = await sb.from('observacoes').insert({
        institution_id: capitulo.institution_id,
        aluno_id: alunoAvaliando.id,
        professor_id: profile.id,
        turma_id: turmaId,
        fase_id: capitulo.fase_id,
        capitulo_id: capitulo.id,
        observacao_texto: textoObs.trim(),
        origem: novaOrigem,
      });
      error = res.error;
    }

    if (error) {
      const msg = (error as { message?: string }).message || 'Erro ao salvar observação';
      toast.error(msg);
      setSalvandoObs(false);
      return;
    }
    toast.success('Observação salva');
    refetchAvaliacoes();
    setSalvandoObs(false);
    fecharAvaliacao();
  };

  // ===== Upload do relatório (PDF) =====
  const uploadRelatorio = async (file: File) => {
    if (!capitulo || !profile?.id) return;
    if (file.type !== 'application/pdf') {
      toast.error('Só PDF, por favor.');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error('PDF acima de 15 MB.');
      return;
    }
    setUploadingPdf(true);
    const path = `${capitulo.institution_id}/${capitulo.id}/relatorio.pdf`;
    const { error: upErr } = await sb.storage
      .from('capitulo-relatorios')
      .upload(path, file, { upsert: true, contentType: 'application/pdf' });
    if (upErr) {
      toast.error(upErr.message || 'Erro ao subir o PDF');
      setUploadingPdf(false);
      return;
    }
    // Marca o capítulo: PDF anexado, ainda não processado pela IA
    const { error: updErr } = await sb.from('capitulos')
      .update({ relatorio_url: path, relatorio_processado_em: null })
      .eq('id', capitulo.id);
    if (updErr) {
      toast.error(updErr.message || 'Erro ao registrar o relatório');
      setUploadingPdf(false);
      return;
    }
    toast.success('Relatório anexado. A IA vai processar em breve.');
    refetchCapitulo();
    setUploadingPdf(false);

    // Dispara o webhook do n8n pra processar o PDF (fire-and-forget).
    // O n8n insere os rascunhos (origem='ia_rascunho', professor_id = quem
    // subiu o PDF) e atualiza capitulos.relatorio_processado_em quando termina.
    enviarParaIA('capitulo_relatorio', capitulo.institution_id, {
      capitulo_id: capitulo.id,
      fase_id: capitulo.fase_id,
      professor_id: profile.id,
      path,
    });
  };

  const removerRelatorio = async () => {
    if (!capitulo?.relatorio_url) return;
    if (!confirm('Remover o relatório anexado? (rascunhos já gerados não são apagados)')) return;
    setRemovendoPdf(true);
    await sb.storage.from('capitulo-relatorios').remove([capitulo.relatorio_url]);
    const { error } = await sb.from('capitulos')
      .update({ relatorio_url: null, relatorio_processado_em: null })
      .eq('id', capitulo.id);
    if (error) {
      toast.error(error.message || 'Erro ao remover');
      setRemovendoPdf(false);
      return;
    }
    toast.success('Relatório removido.');
    refetchCapitulo();
    setRemovendoPdf(false);
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

      {/* Relatório do Capítulo (PDF para a IA) — global, vale pra todas as turmas */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-violet-300" />
          <div className="text-[11px] tracking-[0.25em] uppercase text-white/65">
            Relatório do Capítulo
          </div>
          <span className="text-[10px] text-white/40 ml-auto">vale pra todas as turmas</span>
        </div>

        {!capitulo.relatorio_url ? (
          <>
            <p className="text-[12px] text-white/55 leading-relaxed">
              Anexe o relatório do evento em PDF. A IA lê o documento e cria{' '}
              <span className="text-orange-300/90">rascunhos de observação</span> pra cada aluno
              identificado, em qualquer turma. Você revisa e confirma na aba{' '}
              <span className="text-white/80">Avaliação</span>.
            </p>
            <label className={cn(
              'flex items-center justify-center gap-2 rounded-lg border border-dashed border-violet-300/40 bg-violet-500/[0.05] hover:bg-violet-500/[0.10] px-4 py-3 text-sm text-violet-100 cursor-pointer transition',
              uploadingPdf && 'opacity-50 cursor-wait'
            )}>
              <Upload className="w-4 h-4" />
              {uploadingPdf ? 'Enviando…' : 'Anexar relatório (PDF)'}
              <input
                type="file"
                accept="application/pdf"
                disabled={uploadingPdf}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadRelatorio(f);
                  e.target.value = '';
                }}
                className="hidden"
              />
            </label>
          </>
        ) : (
          <div className="space-y-2.5">
            <div className="flex items-start gap-3 rounded-lg bg-white/[0.04] border border-white/10 p-3">
              <FileText className="w-5 h-5 text-violet-300 flex-shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <div className="text-sm text-white truncate">relatorio.pdf</div>
                {capitulo.relatorio_processado_em ? (
                  <div className="text-[11px] text-emerald-300/90 flex items-center gap-1 mt-0.5">
                    <Sparkles className="w-3 h-3" />
                    Processado em {new Date(capitulo.relatorio_processado_em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} — confira os rascunhos na aba Avaliação
                  </div>
                ) : (
                  <div className="text-[11px] text-orange-300/85 mt-0.5">
                    Aguardando a IA processar… (pode levar alguns minutos)
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <label className={cn(
                'flex items-center gap-1.5 text-[11px] text-white/60 hover:text-white px-2 py-1 cursor-pointer transition',
                uploadingPdf && 'opacity-50 cursor-wait'
              )}>
                <Upload className="w-3 h-3" />
                {uploadingPdf ? 'Trocando…' : 'Trocar PDF'}
                <input
                  type="file"
                  accept="application/pdf"
                  disabled={uploadingPdf}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadRelatorio(f);
                    e.target.value = '';
                  }}
                  className="hidden"
                />
              </label>
              <button
                onClick={removerRelatorio}
                disabled={removendoPdf}
                className="flex items-center gap-1.5 text-[11px] text-red-300/80 hover:text-red-200 px-2 py-1 transition disabled:opacity-50"
              >
                <Trash2 className="w-3 h-3" />
                {removendoPdf ? 'Removendo…' : 'Remover'}
              </button>
            </div>
          </div>
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

        {/* Liberar missões do capítulo */}
        <div className="rounded-lg border border-amber-300/20 bg-amber-300/[0.04] p-3">
          <label className="text-[11px] uppercase tracking-wider text-amber-200/70 mb-1.5 block">
            Missões do capítulo
          </label>

          {editandoPrazo ? (
            <div className="text-[12px] text-white/70 space-y-2.5">
              <label className="block">
                <span className="text-[10px] uppercase tracking-wider text-white/50 block mb-1">Nova data de prazo</span>
                <input
                  type="date"
                  value={novoPrazo}
                  onChange={e => setNovoPrazo(e.target.value)}
                  className="bg-[#0F0F1E] border border-white/15 rounded-lg px-3 py-2 text-sm text-white w-full focus:outline-none focus:border-amber-300/50"
                />
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={aplicarTodasTurmas}
                  onChange={e => setAplicarTodasTurmas(e.target.checked)}
                  className="rounded border-white/20"
                />
                <span className="text-[12px] text-white/70">Aplicar a <strong>todas as turmas</strong> já liberadas</span>
              </label>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  onClick={() => setEditandoPrazo(false)}
                  disabled={savingConfig}
                  className="text-[11px] text-white/50 hover:text-white/80 px-2 py-1"
                >
                  Cancelar
                </button>
                <button
                  onClick={salvarNovoPrazo}
                  disabled={savingConfig || !novoPrazo}
                  className="rounded-lg bg-amber-300/20 hover:bg-amber-300/30 ring-1 ring-amber-300/40 px-3 py-1.5 text-amber-100 text-xs font-medium disabled:opacity-50"
                >
                  {savingConfig ? 'Salvando…' : 'Salvar'}
                </button>
              </div>
            </div>
          ) : turmaConfig?.missoes_liberadas_em ? (
            <div className="text-[12px] text-white/70">
              <p>✓ Liberadas para esta turma.</p>
              <p className="text-white/45 mt-0.5">
                Prazo de entrega: {turmaConfig.missoes_data_prazo ? new Date(turmaConfig.missoes_data_prazo).toLocaleDateString('pt-BR') : '—'}
              </p>
              <div className="flex items-center gap-3 mt-2">
                <button
                  onClick={abrirEditorPrazo}
                  disabled={savingConfig}
                  className="text-[11px] text-amber-200/90 underline underline-offset-2 hover:text-amber-100 disabled:opacity-50"
                >
                  Alterar data
                </button>
                <button
                  onClick={liberarMissoes}
                  disabled={savingConfig}
                  className="text-[11px] text-white/50 underline underline-offset-2 hover:text-white/80 disabled:opacity-50"
                >
                  Reliberar (+7 dias)
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-[11px] text-white/40 mb-2">
                Ao liberar, os alunos desta turma passam a ver a missão do papel deles. O prazo é automático: 7 dias a partir de agora.
              </p>
              <button
                onClick={liberarMissoes}
                disabled={savingConfig}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-amber-300/15 hover:bg-amber-300/25 ring-1 ring-amber-300/40 px-4 py-2.5 text-amber-100 text-sm font-medium transition disabled:opacity-50"
              >
                Liberar missões do capítulo
              </button>
              <button
                onClick={abrirEditorPrazo}
                disabled={savingConfig}
                className="mt-2 w-full text-[11px] text-white/50 underline underline-offset-2 hover:text-white/80 disabled:opacity-50"
              >
                Liberar escolhendo outra data
              </button>
            </>
          )}
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

      {/* Tabs: Elenco ↔ Avaliação */}
      <Tabs value={subTab} onValueChange={(v) => setSubTab(v as 'elenco' | 'avaliacao')} className="space-y-3">
        <TabsList className="grid grid-cols-2 bg-white/[0.04] border border-white/10 p-1 h-auto">
          <TabsTrigger value="elenco" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/60 text-xs uppercase tracking-wider gap-1.5">
            <Users className="w-3.5 h-3.5" /> Elenco
          </TabsTrigger>
          <TabsTrigger value="avaliacao" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/60 text-xs uppercase tracking-wider gap-1.5">
            <ClipboardCheck className="w-3.5 h-3.5" /> Avaliação
          </TabsTrigger>
        </TabsList>

        <TabsContent value="elenco" className="space-y-3 mt-3">

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

        </TabsContent>

        {/* ===== ABA AVALIAÇÃO ===== */}
        <TabsContent value="avaliacao" className="space-y-3 mt-3">
          <PainelAvaliacao
            t2Mesa={t2Mesa}
            t2Med={t2Med}
            t2Obs={t2Obs}
            alocPorPapel={alocPorPapel}
            membrosPorDelegacao={membrosPorDelegacao}
            delegacoes={delegacoes}
            delegacoesAtivas={delegacoesAtivas}
            alunosById={alunosById}
            brasoes={brasoes}
            avaliacoes={avaliacoes}
            onAbrir={abrirAvaliacao}
          />
        </TabsContent>
      </Tabs>

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

      {/* ===== Modal: editar/escrever observação do capítulo ===== */}
      <Dialog open={!!alunoAvaliando} onOpenChange={(o) => { if (!o) fecharAvaliacao(); }}>
        <DialogContent className="bg-[#12122A] border-white/10 text-white max-w-lg">
          {alunoAvaliando && (() => {
            const obsAtual = avaliacoes.find(a => a.aluno_id === alunoAvaliando.id);
            const eRascunhoIa = obsAtual?.origem === 'ia_rascunho';
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="text-white font-serif">
                    {alunoAvaliando.nome}
                  </DialogTitle>
                  <DialogDescription className="text-white/60">
                    Observação do capítulo — papel: <span className="text-white/80">{alunoAvaliando.papel}</span>
                  </DialogDescription>
                </DialogHeader>

                {eRascunhoIa && (
                  <div className="rounded-lg border border-orange-400/40 bg-orange-500/10 px-3 py-2 text-[12px] text-orange-100/90 mb-2">
                    Rascunho gerado pela IA a partir do relatório. Revise, edite se quiser, e confirme.
                  </div>
                )}

                <textarea
                  value={textoObs}
                  onChange={(e) => setTextoObs(e.target.value)}
                  placeholder="O que esse aluno demonstrou nesse capítulo? (atitudes, contribuições, dificuldades)"
                  rows={6}
                  className="w-full rounded-lg bg-white/[0.04] border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 resize-none"
                />

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    onClick={fecharAvaliacao}
                    disabled={salvandoObs}
                    className="px-3 py-1.5 rounded-lg text-xs text-white/60 hover:text-white hover:bg-white/5 transition disabled:opacity-40"
                  >
                    Cancelar
                  </button>
                  {eRascunhoIa ? (
                    <button
                      onClick={() => salvarAvaliacao(true)}
                      disabled={salvandoObs || !textoObs.trim()}
                      className="px-4 py-1.5 rounded-lg bg-emerald-400/15 hover:bg-emerald-400/25 ring-1 ring-emerald-400/40 text-emerald-100 text-xs font-medium transition disabled:opacity-40"
                    >
                      Confirmar revisão
                    </button>
                  ) : (
                    <button
                      onClick={() => salvarAvaliacao(false)}
                      disabled={salvandoObs || !textoObs.trim()}
                      className="px-4 py-1.5 rounded-lg bg-emerald-400/15 hover:bg-emerald-400/25 ring-1 ring-emerald-400/40 text-emerald-100 text-xs font-medium transition disabled:opacity-40"
                    >
                      {obsAtual ? 'Salvar alterações' : 'Salvar observação'}
                    </button>
                  )}
                </div>
              </>
            );
          })()}
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

// ===== Painel da Avaliação do Capítulo =====
type Avaliacao = { id: string; aluno_id: string; observacao_texto: string | null; origem: string };
type AvalByAluno = Map<string, Avaliacao>;

const PainelAvaliacao = ({
  t2Mesa, t2Med, t2Obs,
  alocPorPapel, membrosPorDelegacao, delegacoes, delegacoesAtivas,
  alunosById, brasoes, avaliacoes, onAbrir,
}: {
  t2Mesa: Papel[];
  t2Med: Papel[];
  t2Obs: Papel[];
  alocPorPapel: Record<string, Alocacao[]>;
  membrosPorDelegacao: Record<string, MembroDelegacao[]>;
  delegacoes: Delegacao[];
  delegacoesAtivas: Set<string>;
  alunosById: Record<string, Aluno>;
  brasoes: Brasoes;
  avaliacoes: Avaliacao[];
  onAbrir: (aluno: { id: string; nome: string }, papelNome: string) => void;
}) => {
  // Lookup aluno_id → avaliação
  const avalByAluno: AvalByAluno = new Map(avaliacoes.map(a => [a.aluno_id, a]));

  // Coleta TODOS os alunos que aparecem (pra contadores)
  const todos: { alunoId: string }[] = [];
  [...t2Mesa, ...t2Med, ...t2Obs].forEach(p => {
    (alocPorPapel[p.id] || []).forEach(a => todos.push({ alunoId: a.aluno_id }));
  });
  delegacoes.filter(d => delegacoesAtivas.has(d.codigo)).forEach(d => {
    (membrosPorDelegacao[d.codigo] || []).forEach(m => todos.push({ alunoId: m.aluno_id }));
  });

  const tot = todos.length;
  const feitas = todos.filter(t => {
    const av = avalByAluno.get(t.alunoId);
    return av && av.origem !== 'ia_rascunho';
  }).length;
  const rascunhos = todos.filter(t => avalByAluno.get(t.alunoId)?.origem === 'ia_rascunho').length;

  if (tot === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 text-center text-white/50 text-sm">
        Ninguém alocado ainda. Volte na aba <span className="text-white/80">Elenco</span> e distribua os papéis primeiro.
      </div>
    );
  }

  const delegAtivas = delegacoes.filter(d => delegacoesAtivas.has(d.codigo));

  return (
    <div className="space-y-3">
      {/* Contador */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-[11px] text-white/60 flex items-center gap-3 flex-wrap">
        <span><span className="text-white">{feitas}</span> de {tot} avaliados</span>
        {rascunhos > 0 && (
          <span className="text-orange-300/80">· {rascunhos} aguardando revisão</span>
        )}
      </div>

      {/* MESA */}
      <SecaoCat titulo="Mesa Diretora">
        {t2Mesa.map(p => (
          <LinhaAvaliacaoPapel
            key={p.id}
            papel={p}
            alocacoes={alocPorPapel[p.id] || []}
            alunosById={alunosById}
            brasoes={brasoes}
            avalByAluno={avalByAluno}
            onAbrir={onAbrir}
          />
        ))}
      </SecaoCat>

      {/* MEDIADORES */}
      {t2Med.length > 0 && (
        <SecaoCat titulo="Mediadores">
          {t2Med.map(p => (
            <LinhaAvaliacaoPapel
              key={p.id}
              papel={p}
              alocacoes={alocPorPapel[p.id] || []}
              alunosById={alunosById}
              brasoes={brasoes}
              avalByAluno={avalByAluno}
              onAbrir={onAbrir}
            />
          ))}
        </SecaoCat>
      )}

      {/* OBSERVATÓRIO */}
      {t2Obs.length > 0 && (
        <SecaoCat titulo="Observatório">
          {t2Obs.map(p => (
            <LinhaAvaliacaoPapel
              key={p.id}
              papel={p}
              alocacoes={alocPorPapel[p.id] || []}
              alunosById={alunosById}
              brasoes={brasoes}
              avalByAluno={avalByAluno}
              onAbrir={onAbrir}
            />
          ))}
        </SecaoCat>
      )}

      {/* DELEGAÇÕES */}
      {delegAtivas.length > 0 && (
        <SecaoCat titulo="Delegações">
          <div className="space-y-3">
            {delegAtivas.map(d => (
              <BlocoAvaliacaoDelegacao
                key={d.id}
                delegacao={d}
                membros={membrosPorDelegacao[d.codigo] || []}
                alunosById={alunosById}
                brasoes={brasoes}
                avalByAluno={avalByAluno}
                onAbrir={onAbrir}
              />
            ))}
          </div>
        </SecaoCat>
      )}
    </div>
  );
};

// Card colorido individual de aluno na aba avaliação
const CardAvaliacaoAluno = ({
  aluno, papelNome, brasoes, av, onAbrir,
}: {
  aluno: Aluno;
  papelNome: string;
  brasoes: Brasoes;
  av: Avaliacao | undefined;
  onAbrir: (aluno: { id: string; nome: string }, papelNome: string) => void;
}) => {
  let cor: 'amarelo' | 'laranja' | 'verde';
  if (!av) cor = 'amarelo';
  else if (av.origem === 'ia_rascunho') cor = 'laranja';
  else cor = 'verde';

  const styles: Record<typeof cor, string> = {
    amarelo: 'border-amber-300/40 bg-amber-500/[0.06] hover:bg-amber-500/[0.10]',
    laranja: 'border-orange-400/50 bg-orange-500/[0.10] hover:bg-orange-500/[0.16]',
    verde:   'border-emerald-400/40 bg-emerald-500/[0.08] hover:bg-emerald-500/[0.14]',
  };
  const dot: Record<typeof cor, string> = {
    amarelo: 'bg-amber-300',
    laranja: 'bg-orange-400',
    verde:   'bg-emerald-400',
  };

  return (
    <button
      onClick={() => onAbrir({ id: aluno.id, nome: nomeCompleto(aluno) }, papelNome)}
      className={cn(
        'flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-full border transition text-xs',
        styles[cor]
      )}
    >
      <AvatarAluno aluno={aluno} brasoes={brasoes} size="sm" />
      <span className="text-white/90">{nomeCompleto(aluno)}</span>
      <span className={cn('w-1.5 h-1.5 rounded-full ml-1', dot[cor])} />
    </button>
  );
};

// Linha por papel: nome do papel à esquerda + cards de alunos à direita
const LinhaAvaliacaoPapel = ({
  papel, alocacoes, alunosById, brasoes, avalByAluno, onAbrir,
}: {
  papel: Papel;
  alocacoes: Alocacao[];
  alunosById: Record<string, Aluno>;
  brasoes: Brasoes;
  avalByAluno: AvalByAluno;
  onAbrir: (aluno: { id: string; nome: string }, papelNome: string) => void;
}) => {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="text-sm text-white/85 min-w-[140px] mr-1">
        {papel.nome}
        {alocacoes.length > 0 && papel.vagas_por_turma > 1 && (
          <span className="text-[10px] text-white/40 ml-1">({alocacoes.length})</span>
        )}
      </div>
      {alocacoes.length === 0 ? (
        <span className="text-[11px] text-white/30 italic">sem ninguém alocado</span>
      ) : (
        alocacoes.map(a => {
          const al = alunosById[a.aluno_id];
          if (!al) return null;
          return (
            <CardAvaliacaoAluno
              key={a.id}
              aluno={al}
              papelNome={papel.nome}
              brasoes={brasoes}
              av={avalByAluno.get(al.id)}
              onAbrir={onAbrir}
            />
          );
        })
      )}
    </div>
  );
};

// Bloco de delegação na aba avaliação
const BlocoAvaliacaoDelegacao = ({
  delegacao, membros, alunosById, brasoes, avalByAluno, onAbrir,
}: {
  delegacao: Delegacao;
  membros: MembroDelegacao[];
  alunosById: Record<string, Aluno>;
  brasoes: Brasoes;
  avalByAluno: AvalByAluno;
  onAbrir: (aluno: { id: string; nome: string }, papelNome: string) => void;
}) => {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-2.5">
      <div className="text-[12px] font-serif text-white/85 mb-2 px-1">
        {delegacao.nome}
        {membros.length > 0 && (
          <span className="text-[10px] text-white/40 ml-1">({membros.length})</span>
        )}
      </div>
      {membros.length === 0 ? (
        <div className="text-[11px] text-white/30 italic px-1 pb-1">sem membros</div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {membros.map(m => {
            const al = alunosById[m.aluno_id];
            if (!al) return null;
            return (
              <CardAvaliacaoAluno
                key={m.id}
                aluno={al}
                papelNome={delegacao.nome}
                brasoes={brasoes}
                av={avalByAluno.get(al.id)}
                onAbrir={onAbrir}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CapituloProfessorPage;
