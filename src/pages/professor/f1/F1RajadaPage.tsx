import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronDown, ChevronUp, Search, Eye, ClipboardList, List, LayoutGrid, ImagePlus, X, Sprout } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfessor } from '@/contexts/ProfessorContext';
import { useRajadaTurma, type AlunoRajada } from '@/hooks/useRajadaTurma';
import { useFaseTurma } from '@/hooks/useFaseTurma';
import { useTurmaAtividadePlano } from '@/hooks/useTurmaAtividadePlano';
import { useTurmaAtividadeEventos, derivarCorrente, marcarAtividadeConcluida } from '@/hooks/useTurmaAtividadeEventos';
import AtividadeCard from '@/components/professor/AtividadeCard';
import { SANTUARIO_INFANTIL } from '@/lib/infantilSantuario';
import { ACADEMIA_F1 } from '@/lib/f1';
import {
  getIniciais,
  formatTurmaLabel,
  getViewModePreferido,
  salvarViewModePreferido,
  getTurmaPreferida,
  salvarTurmaPreferida,
  normalizarBusca,
} from '@/lib/infantil';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { infantilTheme as t } from '@/styles/infantilTheme';
import LequeObservacao from '@/components/professor/LequeObservacao';

/** Modal de fechamento: celebra o que o professor VIU, nunca o que faltou.
 *  Backdrop/Esc = só fecha o modal (fica na aula); o botão é quem SAI. */
const ConcluirModal = ({
  registrados,
  moduloNome,
  corFio,
  corDia,
  onFechar,
  onSair,
}: {
  registrados: number;
  moduloNome?: string | null;
  corFio?: string;
  corDia?: string;
  onFechar: () => void;
  onSair: () => void;
}) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFechar();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onFechar]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md"
      style={{ backgroundColor: 'rgba(28,34,48,0.30)' }}
      onClick={onFechar}
      role="dialog"
      aria-modal="true"
      aria-label="Aula concluída"
    >
      <div
        className="w-full max-w-[360px] rounded-2xl overflow-hidden"
        style={{ backgroundColor: t.surface, boxShadow: t.shadowLg }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* A aula fecha na cor em que abriu: moldura do momento */}
        <div style={{ height: 3, backgroundColor: corFio ?? t.accent }} />
        <div className="p-5 space-y-4">
          <p className="text-[11px] uppercase tracking-wide font-semibold" style={{ color: t.accentText }}>
            A aula de hoje
            {moduloNome && (
              <span style={{ color: corDia ?? t.accentText }}> · {moduloNome}</span>
            )}
          </p>
          <h2 className="font-serif text-[19px] leading-snug" style={{ color: t.text }}>
            {registrados > 0
              ? `Você enxergou ${registrados} ${registrados === 1 ? 'aluno' : 'alunos'} hoje.`
              : 'Aula conduzida. Hoje você observou sem escrever, também faz parte.'}
          </h2>
          <p className="text-sm leading-relaxed italic" style={{ color: t.textMuted }}>
            O que você viu agora vive no Diário de cada um. O resto da turma segue com você, não some, só não pediu palavra hoje.
          </p>
          <button
            onClick={onSair}
            autoFocus
            className="w-full rounded-xl py-3 text-sm font-semibold"
            style={{ backgroundColor: t.accent, color: '#FFFFFF', boxShadow: t.shadowMd }}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Modal de texto pendente: substitui o auto-save SILENCIOSO ao trocar de
 * aluno/sair. Nada entra no diário de um aluno sem a professora ver
 * (o erro mais provável é exatamente texto no aluno errado).
 */
const PendenteModal = ({
  alunoNome,
  onGuardar,
  onDescartar,
  onFechar,
}: {
  alunoNome: string;
  onGuardar: () => void;
  onDescartar: () => void;
  onFechar: () => void;
}) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFechar();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onFechar]);

  const primeiroNome = alunoNome.split(' ')[0];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md"
      style={{ backgroundColor: 'rgba(28,34,48,0.30)' }}
      onClick={onFechar}
      role="dialog"
      aria-modal="true"
      aria-label="Registro em andamento"
    >
      <div
        className="w-full max-w-[360px] rounded-2xl overflow-hidden"
        style={{ backgroundColor: t.surface, boxShadow: t.shadowLg }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ height: 3, backgroundColor: t.accent }} />
        <div className="p-5 space-y-4">
          <p className="text-[11px] uppercase tracking-wide font-semibold" style={{ color: t.accentText }}>
            Registro em andamento
          </p>
          <h2 className="text-lg font-bold leading-snug" style={{ color: t.text }}>
            Guardar o que você escreveu sobre {primeiroNome}?
          </h2>
          <div className="space-y-2 pt-1">
            <button
              onClick={onGuardar}
              className="w-full rounded-xl py-3 text-sm font-semibold"
              style={{ backgroundColor: t.accent, color: '#FFFFFF', boxShadow: t.shadowMd }}
            >
              Guardar no diário de {primeiroNome}
            </button>
            <button
              onClick={onDescartar}
              className="w-full rounded-xl py-3 text-sm font-medium"
              style={{ backgroundColor: 'transparent', color: t.textMuted }}
            >
              Descartar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// A pergunta do editor RODA (por dia e por aluno): a pergunta certa é o que
// fabrica registro de processo; UMA pergunta fixa vira gabarito (simulação 1000)
const PERGUNTAS_EDITOR = [
  (n: string) => `Como ${n} entrou na atividade hoje?`,
  (n: string) => `O que ${n} fez primeiro?`,
  (n: string) => `O que ${n} fez quando algo deu errado ou travou?`,
  (n: string) => `O que ${n} fez sem ninguém pedir?`,
  (n: string) => `Por onde ${n} começou, e o que veio depois?`,
];

// Inícios de frase: dão a primeira metade pra quem está sem repertório.
// NUNCA a frase inteira (senão vira resposta-modelo copiável).
const INICIOS_FRASE = [
  'Começou por',
  'Só entrou quando',
  'Diante do obstáculo,',
  'Sem ninguém pedir,',
  'Enquanto os outros',
];

const diaDeHoje = () => Math.floor(Date.now() / 86400000);

type Pendencia =
  | { tipo: 'trocar'; alvoId: string }
  | { tipo: 'turma'; alvoTurmaId: string }
  | { tipo: 'diario'; alunoId: string }
  | { tipo: 'sair' }
  | { tipo: 'finalizar' };

/**
 * REGISTRO EM RAJADA ("Iniciar aula"). Fundamental 1 (a Academia).
 *
 * A aula do dia no topo (o módulo + o que observar), a turma em lista, e o
 * professor toca em quem se destacou pra escrever ali mesmo. Uma observação por
 * aluno, texto livre, grava em `observacoes` e vai pro histórico dele (thread).
 *
 * A FASE vem da TURMA SELECIONADA (useFaseTurma com segmento fundamental1),
 * nunca do contexto global, que só enxerga a primeira turma.
 *
 * LEI DO MODELO: nunca empurra a preencher a turma toda. Quem não é tocado é o
 * estado natural, sem contador de restantes, sem "sem registro", sem cobrança.
 */
const F1RajadaPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { turmasVinculadas, profile } = useProfessor();

  const turmaInicial =
    (location.state as { turmaId?: string } | null)?.turmaId ??
    getTurmaPreferida() ??
    turmasVinculadas?.[0]?.id ??
    null;
  const [turmaSel, setTurmaSelState] = useState<string | null>(turmaInicial);
  const setTurmaSel = (id: string) => {
    setTurmaSelState(id);
    salvarTurmaPreferida(id);
  };
  const [busca, setBusca] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [texto, setTexto] = useState('');
  const [concluirOpen, setConcluirOpen] = useState(false);
  const [pendencia, setPendencia] = useState<Pendencia | null>(null);
  const [viewMode, setViewModeState] = useState<'lista' | 'circulos'>(getViewModePreferido());
  const [contextoRecolhidoManual, setContextoRecolhidoManual] = useState<boolean | null>(null);
  const [imagem, setImagem] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const setViewMode = (modo: 'lista' | 'circulos') => {
    setViewModeState(modo);
    salvarViewModePreferido(modo);
  };

  const escolherArquivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setImagem(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
    e.target.value = '';
  };

  const removerImagem = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setImagem(null);
    setPreviewUrl(null);
  };

  const turmaId = turmaSel ?? turmasVinculadas?.[0]?.id ?? null;
  // Fase da TURMA selecionada (não do contexto: cada turma tem sua trilha)
  const { data: faseTurma, isLoading: faseLoading } = useFaseTurma(turmaId, profile?.institution_id, 'fundamental1');
  const fase = faseTurma?.fase ?? null;
  const ordem = faseTurma?.ordem ?? 0;
  const total = faseTurma?.total ?? 8; // nº de fases ativas (8 no fallback)
  const { data: alunos, isLoading } = useRajadaTurma(turmaId, fase?.id ?? null, user?.id ?? null);
  const rajadaKey = ['rajada-turma', turmaId, fase?.id ?? null, user?.id ?? null];

  // PLANO do módulo + eventos de conclusão: a atividade DA VEZ à mão na aula.
  // Tolerante: sem plano, atividadeExibir = null e a moldura fantasma segue igual.
  const { data: planoAtividades = [] } = useTurmaAtividadePlano(turmaId, fase?.inteligencia?.id ?? null);
  const { data: concluidasSet } = useTurmaAtividadeEventos(
    turmaId,
    planoAtividades.map((a) => a.atividadeId)
  );
  const { correnteItem, correnteId, correnteNumero, todasConcluidas } = derivarCorrente(
    planoAtividades,
    concluidasSet ?? new Set()
  );
  // Card a EXIBIR: a da vez; se o plano acabou, a última (marcada concluída).
  const atividadeExibir = correnteItem ?? (todasConcluidas ? planoAtividades[planoAtividades.length - 1] : null);
  const numeroExibir = correnteItem ? correnteNumero : planoAtividades.length;

  // O FIO DE COR: a cor oficial do mecanismo da fase costura o chrome da aula
  // (4 pontos fixos), e nunca pousa num aluno. Regra: cor da fase = AULA;
  // índigo = CADERNO (Guardar, busca, modais); verde = REGISTRO FEITO (selo).
  // Indexado por inteligencia_id (com subconjunto/ordem, a posição != id).
  const fioIntel = fase?.inteligencia?.id ?? 0;
  const fio = fioIntel >= 1 && fioIntel <= 8 ? SANTUARIO_INFANTIL[fioIntel] : null;
  const fioTransition = { transition: 'background-color 600ms ease, border-color 600ms ease, color 600ms ease' };

  // 2 cenas concretas do santuário pro convite da aula, rotacionando por dia
  // (conteúdo compartilhado com o Infantil: as cenas de observação servem)
  const observarHoje = useMemo(() => {
    const lista = fio?.observar ?? [];
    if (lista.length === 0) return [];
    const dia = diaDeHoje();
    const a = dia % lista.length;
    const b = (dia + 1) % lista.length;
    return a === b ? [lista[a]] : [lista[a], lista[b]];
  }, [fio]);

  // Respiro de abertura ("a luz acende", ~950ms): SÓ quando veio do botão
  // Iniciar aula, 1× por turma/dia, qualquer toque pula. Nunca em re-entrada.
  const [respiro, setRespiro] = useState(false);
  const [respiroSaindo, setRespiroSaindo] = useState(false);
  const veioDoBotao = !!(location.state as { turmaId?: string } | null)?.turmaId;
  useEffect(() => {
    if (!veioDoBotao || !fase || !turmaId) return;
    const chave = `aula-respiro-${turmaId}-${new Date().toISOString().slice(0, 10)}`;
    try {
      if (sessionStorage.getItem(chave)) return;
      sessionStorage.setItem(chave, 'ok');
    } catch {
      /* segue sem guarda */
    }
    setRespiro(true);
    const t1 = setTimeout(() => setRespiroSaindo(true), 650);
    const t2 = setTimeout(() => setRespiro(false), 950);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [veioDoBotao, fase?.id, turmaId]);
  const pularRespiro = () => {
    setRespiroSaindo(true);
    setTimeout(() => setRespiro(false), 150);
  };

  // O nome de ação do módulo (a Academia); a professora pode ver o nome técnico.
  // ACADEMIA_F1 é indexado por inteligencia_id (com subconjunto, posição != id).
  const moduloNome = fioIntel >= 1 && fioIntel <= 8 ? ACADEMIA_F1[fioIntel] : null;
  const turmaLabel = useMemo(() => {
    const tv = turmasVinculadas?.find((x) => x.id === turmaId);
    return tv ? formatTurmaLabel(tv.serie, tv.turma_letra) : '';
  }, [turmasVinculadas, turmaId]);

  const podeRegistrar = !!user?.id && !!turmaId && !!fase?.id && !!profile?.institution_id;

  const alunosFiltrados = useMemo(() => {
    if (!alunos) return [];
    if (!busca) return alunos;
    return alunos.filter((a) => normalizarBusca(a.nome).includes(normalizarBusca(busca)));
  }, [alunos, busca]);

  // Contagem do fechamento: alunos únicos registrados hoje POR QUEM ESTÁ LOGADA.
  // Sobrevive a refresh.
  const registradosCount = useMemo(
    () => (alunos ?? []).filter((a) => a.registradoHojePorMim).length,
    [alunos]
  );

  // Contexto (o que observar + convite) recolhe sozinho após o primeiro registro
  // do dia: a lista sobe pra perto do polegar. A professora pode reabrir.
  const contextoRecolhido = contextoRecolhidoManual ?? registradosCount > 0;

  const registrar = useMutation({
    mutationFn: async ({ alunoId, textoObs, file }: { alunoId: string; textoObs: string; file: File | null }) => {
      if (!podeRegistrar || !fase?.id) {
        throw new Error('Sem módulo ativo ou turma, não dá pra registrar agora.');
      }
      // Se há foto, sobe primeiro no bucket privado 'observacoes' ({aluno_id}/{uuid}.{ext})
      let anexoPath: string | null = null;
      if (file) {
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
        const rid =
          typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        const path = `${alunoId}/${rid}.${ext}`;
        const { error: upErr } = await supabase.storage.from('observacoes').upload(path, file);
        if (upErr) throw upErr;
        anexoPath = path;
      }
      // As reticências do leque são só CUE de continuação: não vão pro diário
      // (decisão do Fundador). O textarea segue mostrando "..." pra o professor;
      // aqui, só no ponto de salvar, limpamos e normalizamos os espaços.
      const textoLimpo = textoObs.replace(/\.\.\./g, '').replace(/\s{2,}/g, ' ').trim();
      const { error } = await supabase.from('observacoes').insert({
        aluno_id: alunoId,
        professor_id: user!.id,
        turma_id: turmaId,
        fase_id: fase.id,
        institution_id: profile?.institution_id,
        observacao_texto: textoLimpo,
        anexo_url: anexoPath,
      } as any);
      if (error) throw error;
    },
    // O selo acende NA HORA (otimista): o gesto mais repetido do dia não pode ser mudo.
    onMutate: async ({ alunoId }) => {
      await queryClient.cancelQueries({ queryKey: rajadaKey });
      const prev = queryClient.getQueryData<AlunoRajada[]>(rajadaKey);
      if (prev) {
        queryClient.setQueryData<AlunoRajada[]>(
          rajadaKey,
          prev.map((a) =>
            a.id === alunoId
              ? {
                  ...a,
                  registradoHoje: true,
                  registradoHojePorMim: true,
                  momentosNaFase: a.momentosNaFase + 1,
                }
              : a
          )
        );
      }
      return { prev };
    },
    onSuccess: (_data, { alunoId }) => {
      queryClient.invalidateQueries({ queryKey: ['aluno-thread', alunoId] });
      queryClient.invalidateQueries({ queryKey: ['alunos-turmas-com-status'] });
    },
    onError: (e: Error, vars, context) => {
      // Não perde NADA: desfaz o selo otimista e reabre o card com texto E foto.
      if (context?.prev) queryClient.setQueryData(rajadaKey, context.prev);
      toast.error(e.message || 'Não foi possível registrar agora.');
      setActiveId(vars.alunoId);
      setTexto(vars.textoObs);
      if (vars.file) {
        setImagem(vars.file);
        setPreviewUrl(URL.createObjectURL(vars.file));
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['rajada-turma'] });
    },
  });

  const temPendencia = !!activeId && (!!texto.trim() || !!imagem);

  const abrirDireto = (alunoId: string) => {
    setActiveId(alunoId);
    setTexto('');
    removerImagem();
    // Traz o editor pra vista (teclado cobre a metade de baixo; nos círculos ele abre acima da grade)
    setTimeout(() => {
      const el =
        document.getElementById('rajada-editor-ativo') ??
        document.getElementById(`rajada-card-${alunoId}`);
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 80);
  };

  const fecharEditor = () => {
    setActiveId(null);
    setTexto('');
    removerImagem();
  };

  // O leque só EMPURRA texto pro campo (concatena com espaço); o professor
  // segue editando/apagando normal no teclado. Aditivo: não toca no fluxo atual.
  const inserirDoLeque = (trecho: string) => {
    setTexto((prev) => {
      const base = prev.replace(/\s+$/, '');
      return base ? `${base} ${trecho}` : trecho;
    });
  };

  const abrirCard = (alunoId: string) => {
    if (activeId === alunoId) {
      fecharEditor();
      return;
    }
    if (temPendencia) {
      // NUNCA salva em silêncio no aluno anterior: pergunta antes.
      setPendencia({ tipo: 'trocar', alvoId: alunoId });
      return;
    }
    abrirDireto(alunoId);
  };

  const guardar = (alunoId: string) => {
    const conteudo = texto.trim();
    if ((!conteudo && !imagem) || registrar.isPending || !podeRegistrar) return;
    registrar.mutate({ alunoId, textoObs: conteudo, file: imagem });
    // Recolhe o card na hora (otimista); se der erro, o onError reabre com o texto.
    fecharEditor();
  };

  const resolverPendencia = (guardarAntes: boolean) => {
    const p = pendencia;
    if (!p) return;
    setPendencia(null);

    const prosseguir = () => {
      if (p.tipo === 'trocar') abrirDireto(p.alvoId);
      if (p.tipo === 'turma') setTurmaSel(p.alvoTurmaId);
      if (p.tipo === 'diario') navigate(`/professor/alunos/${p.alunoId}`);
      if (p.tipo === 'sair') navigate(-1);
      if (p.tipo === 'finalizar') setConcluirOpen(true);
    };

    if (!guardarAntes || !activeId || !podeRegistrar || registrar.isPending) {
      fecharEditor();
      prosseguir();
      return;
    }

    const vars = { alunoId: activeId, textoObs: texto.trim(), file: imagem };
    const mesmaTela = p.tipo === 'trocar' || p.tipo === 'turma';
    fecharEditor();
    if (mesmaTela) {
      // Continua na tela: pode prosseguir já (em erro, o onError reabre o card)
      registrar.mutate(vars);
      prosseguir();
    } else {
      // Sair/diário/finalizar: SÓ prossegue depois do guardar CONFIRMAR
      // (nunca perda silenciosa quando a rede cai após navegar).
      registrar.mutate(vars, { onSuccess: prosseguir });
    }
  };

  const onVoltar = () => {
    if (temPendencia) setPendencia({ tipo: 'sair' });
    else navigate(-1);
  };

  const onFinalizar = () => {
    if (temPendencia) setPendencia({ tipo: 'finalizar' });
    else setConcluirOpen(true);
  };

  // Finalizar a aula (botão do ConcluirModal): marca a atividade DA VEZ como
  // concluída pra turma (idempotente) e sai. Marcar NUNCA bloqueia a saída, se
  // falhar, a aula fecha do mesmo jeito; o registro dos alunos já foi salvo.
  const finalizarAula = async () => {
    setConcluirOpen(false);
    if (turmaId && correnteId && user?.id) {
      const ok = await marcarAtividadeConcluida(turmaId, correnteId, user.id);
      if (ok) {
        queryClient.invalidateQueries({ queryKey: ['turma-atividade-eventos', turmaId] });
        queryClient.invalidateQueries({ queryKey: ['turma-atividade-plano', turmaId] });
      }
    }
    navigate(-1);
  };

  const activeAluno = useMemo(
    () => alunosFiltrados.find((a) => a.id === activeId) ?? null,
    [alunosFiltrados, activeId]
  );

  const alunoPendente = useMemo(
    () => (alunos ?? []).find((a) => a.id === activeId) ?? null,
    [alunos, activeId]
  );

  // Editor de observação (texto + foto): reusado na lista e nos círculos.
  const renderEditor = (aluno: AlunoRajada) => (
    <div className="px-3 pb-3" id="rajada-editor-ativo">
      {previewUrl && (
        <div className="relative mb-2 inline-block">
          <img src={previewUrl} alt="" className="h-16 w-16 rounded-lg object-cover" />
          <button
            onClick={removerImagem}
            className="absolute -top-1.5 -right-1.5 rounded-full p-0.5"
            style={{ backgroundColor: t.surface, border: `1px solid ${t.border}` }}
            aria-label="Remover foto"
          >
            <X size={14} style={{ color: t.textMuted }} />
          </button>
        </div>
      )}
      {/* Chips de início de frase, só com o campo vazio (a primeira metade
          da frase pra quem trava; some assim que ela escreve) */}
      {!texto && (
        <div className="flex gap-1.5 overflow-x-auto pb-1.5 -mx-1 px-1">
          {INICIOS_FRASE.map((c) => (
            <button
              key={c}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setTexto(`${c} `)}
              className="flex-shrink-0 px-2.5 py-1 rounded-full text-xs"
              style={{ backgroundColor: t.surface, border: `1px solid ${t.border}`, color: t.textMuted }}
            >
              {c}…
            </button>
          ))}
        </div>
      )}
      <textarea
        autoFocus
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder={PERGUNTAS_EDITOR[(diaDeHoje() + aluno.nome.length) % PERGUNTAS_EDITOR.length](
          aluno.nome.split(' ')[0]
        )}
        rows={3}
        className="w-full rounded-xl p-3 text-sm resize-none focus:outline-none focus-visible:ring-2"
        style={{
          backgroundColor: t.surfaceSunken,
          border: `1px solid ${t.border}`,
          color: t.text,
          ['--tw-ring-color' as string]: t.accent,
        }}
      />
      {/* Fio de continuidade, SÓ dentro do editor aberto e SÓ quando > 0
          (zero não aparece: silêncio não é marcado; lei do modelo) */}
      {aluno.momentosNaFase > 0 && (
        <button
          onClick={() => {
            // NUNCA navegar por cima de texto pendente (perdia em silêncio)
            if (texto.trim() || imagem) setPendencia({ tipo: 'diario', alunoId: aluno.id });
            else navigate(`/professor/alunos/${aluno.id}`);
          }}
          className="text-xs mt-1 underline-offset-2 hover:underline"
          style={{ color: t.textMuted }}
        >
          {aluno.momentosNaFase} {aluno.momentosNaFase === 1 ? 'momento' : 'momentos'} neste módulo · ver no Diário
        </button>
      )}
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-0.5 min-w-0">
          <LequeObservacao
            inteligenciaId={fase?.inteligencia?.id ?? null}
            valorAtual={texto}
            onInserir={inserirDoLeque}
            cores={{ acento: fio?.corDia, lavagem: fio?.corLavagem, borda: fio?.corBorda }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 text-xs font-medium rounded-lg px-2 py-2"
            style={{ color: t.textMuted }}
          >
            <ImagePlus size={16} /> Foto do trabalho (não do aluno)
          </button>
        </div>
        <button
          onClick={() => guardar(aluno.id)}
          disabled={(!texto.trim() && !imagem) || registrar.isPending}
          className="text-sm font-semibold rounded-xl px-4 py-2.5 disabled:opacity-50"
          style={{ backgroundColor: t.accent, color: '#FFFFFF' }}
        >
          Guardar
        </button>
      </div>
    </div>
  );

  const seloRegistrado = (
    <p className="text-xs mt-0.5 flex items-center gap-1 sprout-in" style={{ color: t.presenteText }}>
      <Sprout size={13} strokeWidth={2} style={{ color: t.presente }} /> registrado hoje
    </p>
  );

  return (
    <div>
      {/* Respiro de abertura: "a luz acende" */}
      {respiro && fio && (
        <button
          onClick={pularRespiro}
          className="fixed inset-0 z-[70] flex flex-col items-center justify-center text-center px-8 cursor-default"
          style={{
            background: `radial-gradient(110% 70% at 50% -5%, ${fio.corLavagem} 0%, #FFFFFF 60%)`,
            opacity: respiroSaindo ? 0 : 1,
            transition: 'opacity 300ms ease',
          }}
          aria-label="Começar a aula"
        >
          <p
            className="text-[11px] uppercase font-semibold vf-rise"
            style={{ color: fio.corDia, letterSpacing: '0.3em' }}
          >
            Aula{turmaLabel ? ` · ${turmaLabel}` : ''}
          </p>
          <h2 className="font-serif text-[27px] mt-3 vf-rise" style={{ color: t.text, animationDelay: '80ms' }}>
            {moduloNome}
          </h2>
          <div
            className="vf-draw rounded-full mt-3.5"
            style={{ width: 76, height: 6, backgroundColor: fio.cor, animationDelay: '200ms' }}
          />
          <p
            className="text-sm italic mt-3.5 max-w-[220px] vf-rise"
            style={{ color: t.textMuted, animationDelay: '280ms' }}
          >
            Repare por onde cada aluno entra.
          </p>
        </button>
      )}

      {/* Sub-header (sob o header da instituição). FIO 1: a linha da fase */}
      <div
        className="fixed top-14 left-0 right-0 z-30 glass-light"
        style={{ borderBottom: `1px solid ${t.border}` }}
      >
        {fio && (
          <div
            className="absolute top-0 left-0 right-0"
            style={{ height: 3, backgroundColor: fio.cor, ...fioTransition }}
            aria-hidden="true"
          />
        )}
        <div className="max-w-lg mx-auto h-14 px-2 flex items-center gap-2">
          <button
            onClick={onVoltar}
            className="p-1.5 rounded-full active:scale-95"
            style={{ color: t.textMuted }}
            aria-label="Voltar"
          >
            <ChevronLeft size={22} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate" style={{ color: t.text }}>
              Registro da turma
            </p>
            <p className="text-[11px] truncate" style={{ color: t.textFaint }}>
              {fase ? `Módulo · ${moduloNome}` : 'Sem módulo ativo'}
              {turmaLabel ? ` · ${turmaLabel}` : ''}
            </p>
          </div>
          <button
            onClick={onFinalizar}
            className="flex-shrink-0 text-sm font-semibold rounded-full px-4 py-2.5"
            style={{ backgroundColor: t.accentSoft, color: t.accentText }}
          >
            Finalizar aula
          </button>
        </div>
      </div>

      {/* Conteúdo (o layout já dá pt-14/px-4/pb-24: aqui só limpa o sub-header) */}
      <div className="pt-16 space-y-4">
        {/* Seletor de turma, SEMPRE visível (fora do ramo da fase: sem ele aqui,
            trocar pra uma turma sem trilha prendia a professora na tela vazia). */}
        {turmasVinculadas && turmasVinculadas.length > 1 && (
          <div className="grid grid-cols-2 gap-2">
            {turmasVinculadas.map((tv) => {
              const ativo = turmaId === tv.id;
              return (
                <button
                  key={tv.id}
                  onClick={() => {
                    if (tv.id === turmaId) return;
                    if (temPendencia) {
                      setPendencia({ tipo: 'turma', alvoTurmaId: tv.id });
                      return;
                    }
                    setTurmaSel(tv.id);
                    fecharEditor();
                  }}
                  className="rounded-xl py-3 px-3 text-sm font-semibold transition-colors"
                  style={
                    ativo
                      ? { backgroundColor: t.accent, color: '#FFFFFF', boxShadow: t.shadowMd }
                      : { backgroundColor: t.surface, color: t.textMuted, border: `1px solid ${t.border}` }
                  }
                  aria-pressed={ativo}
                >
                  {formatTurmaLabel(tv.serie, tv.turma_letra)}
                </button>
              );
            })}
          </div>
        )}

        {faseLoading ? (
          <div className="space-y-3 pt-2">
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
          </div>
        ) : !fase ? (
          <div className="pt-10 text-center space-y-3">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mx-auto"
              style={{ backgroundColor: t.accentSoft }}
            >
              <Eye size={28} style={{ color: t.accent }} strokeWidth={1.5} />
            </div>
            <p className="text-sm max-w-xs mx-auto" style={{ color: t.textMuted }}>
              {ordem > total
                ? `Os ${total} módulos do ano foram concluídos com ${turmaLabel ? `a turma ${turmaLabel}` : 'esta turma'}. A história de cada aluno continua viva no Diário.`
                : `${turmaLabel ? `A turma ${turmaLabel}` : 'Esta turma'} ainda não começou a trilha; os alunos aparecem aqui assim que o primeiro módulo começar.`}
            </p>
            {/* Botão de ação (a nav está escondida dentro da aula) */}
            {ordem <= total && (
              <button
                onClick={() => navigate('/professor')}
                className="rounded-full px-4 py-2.5 text-sm font-semibold"
                style={{ backgroundColor: t.accent, color: '#FFFFFF', boxShadow: t.shadowMd }}
              >
                Começar a trilha em "O ano"
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Faixa de status. FIO 2: o pulso da aula bate na cor da fase */}
            <div
              className="w-full rounded-xl px-3.5 py-2.5 flex items-center gap-2.5"
              style={{
                backgroundColor: t.surface,
                border: `1px solid ${fio?.corBorda ?? t.accentBorder}`,
                boxShadow: t.shadowSm,
                ...fioTransition,
              }}
            >
              <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                <span
                  className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
                  style={{ backgroundColor: fio?.cor ?? t.accent, ...fioTransition }}
                />
                <span
                  className="relative inline-flex rounded-full h-2.5 w-2.5"
                  style={{ backgroundColor: fio?.cor ?? t.accent, ...fioTransition }}
                />
              </span>
              <p className="text-sm min-w-0 truncate" style={{ color: t.text }}>
                <span className="font-semibold">Aula em andamento</span>
                <span className="font-semibold" style={{ color: fio?.corDia ?? t.textMuted, ...fioTransition }}>
                  {' '}
                  · {moduloNome}
                </span>
              </p>
            </div>

            {/* Contexto da aula: recolhe após o primeiro registro (a lista sobe) */}
            {contextoRecolhido ? (
              <button
                onClick={() => setContextoRecolhidoManual(false)}
                className="w-full rounded-xl px-3.5 py-2.5 flex items-center justify-between"
                style={{
                  backgroundColor: t.surfaceAlt,
                  border: `1px solid ${t.border}`,
                  borderLeft: `3px solid ${fio?.cor ?? t.accent}`,
                  ...fioTransition,
                }}
              >
                <span className="flex items-center gap-2 text-sm min-w-0" style={{ color: t.textMuted }}>
                  <ClipboardList size={16} className="flex-shrink-0" style={{ color: fio?.corDia ?? t.accent }} strokeWidth={1.75} />
                  <span className="truncate">{atividadeExibir ? atividadeExibir.nome : 'Detalhe da atividade'}</span>
                </span>
                <ChevronDown size={16} className="flex-shrink-0" style={{ color: t.textFaint }} />
              </button>
            ) : (
              <>
                {/* Detalhe da atividade: especificações da atividade desta aula.
                    Alimentado pelo banco de atividades: por ora, moldura fantasma. */}
                <section
                  className="rounded-2xl p-4"
                  style={{
                    backgroundColor: t.surface,
                    border: `1px solid ${t.border}`,
                    borderLeft: `3px solid ${fio?.cor ?? t.accent}`,
                    boxShadow: t.shadowSm,
                    ...fioTransition,
                  }}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <ClipboardList size={18} style={{ color: fio?.corDia ?? t.accent }} strokeWidth={1.75} />
                      <h2 className="text-sm font-semibold" style={{ color: t.text }}>
                        Detalhe da atividade
                      </h2>
                    </div>
                    <button
                      onClick={() => setContextoRecolhidoManual(true)}
                      className="p-1 rounded-lg"
                      aria-label="Recolher"
                    >
                      <ChevronUp size={16} style={{ color: t.textFaint }} />
                    </button>
                  </div>
                  {atividadeExibir ? (
                    <div className="mt-1">
                      <p className="text-[11px] mb-2" style={{ color: t.textFaint }}>
                        {todasConcluidas
                          ? 'Todas as atividades deste módulo foram concluídas.'
                          : 'A atividade da vez neste módulo:'}
                      </p>
                      <AtividadeCard
                        atividade={atividadeExibir}
                        numero={numeroExibir}
                        variante="claro"
                        defaultAberto
                        concluida={todasConcluidas}
                        corrente={!todasConcluidas}
                      />
                    </div>
                  ) : (
                    <p className="text-sm leading-relaxed" style={{ color: t.textFaint }}>
                      Use qualquer atividade sua: o Arboria registra o seu olhar sobre os
                      alunos, não a atividade. Quando o banco de atividades chegar, as
                      especificações da aula aparecem aqui.
                    </p>
                  )}
                </section>

                {/* Convite. FIO 4: a única pele colorida da aula. CONCRETO: mostra
                    2 cenas reais do santuário, rotacionando por dia. */}
                <div
                  className="rounded-2xl p-3.5"
                  style={{
                    backgroundColor: fio?.corLavagem ?? t.accentSoft,
                    border: `1px solid ${fio?.corBorda ?? t.accentBorder}`,
                    ...fioTransition,
                  }}
                >
                  <p
                    className="text-[10.5px] uppercase tracking-wide font-bold"
                    style={{ color: fio?.corDia ?? t.accentText, ...fioTransition }}
                  >
                    Pra reparar hoje · {moduloNome}
                  </p>
                  {observarHoje.map((cena) => (
                    <p
                      key={cena}
                      className="text-sm font-medium mt-1.5 leading-snug texto-justificado"
                      style={{ color: fio?.corDia ?? t.accentText, ...fioTransition }}
                    >
                      {cena}
                    </p>
                  ))}
                  <p className="text-xs mt-2" style={{ color: fio?.corDia ?? t.accentText, opacity: 0.85 }}>
                    Viu algo assim, ou diferente? Toque no nome do aluno e conte a cena.
                    Pode ditar pelo microfone do teclado.
                  </p>
                </div>
              </>
            )}

            {/* Input de foto escondido (disparado pelo botão do editor) */}
            {/* Sem `capture`: o celular oferece CÂMERA ou GALERIA */}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={escolherArquivo}
            />

            {/* Busca + alternador de visão (lista / círculos) */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: t.textFaint }} />
                <input
                  type="text"
                  placeholder="Buscar aluno..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus-visible:ring-2"
                  style={{
                    backgroundColor: t.surfaceSunken,
                    border: `1px solid ${t.border}`,
                    color: t.text,
                    ['--tw-ring-color' as string]: t.accent,
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
                      className="p-2.5 rounded-lg transition-colors"
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

            {/* Turma */}
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-xl" />
                ))}
              </div>
            ) : alunosFiltrados.length === 0 ? (
              <p className="text-sm text-center py-10" style={{ color: t.textMuted }}>
                {busca ? 'Nenhum aluno com esse nome.' : 'Não há alunos nesta turma.'}
              </p>
            ) : viewMode === 'lista' ? (
              /* VISÃO EM LISTA: um abaixo do outro, escrita inline */
              <div className="space-y-2">
                {alunosFiltrados.map((aluno) => {
                  const aberto = activeId === aluno.id;
                  return (
                    <div
                      key={aluno.id}
                      id={`rajada-card-${aluno.id}`}
                      className="rounded-xl overflow-hidden"
                      style={{
                        backgroundColor: t.surface,
                        border: `1px solid ${aberto ? t.accent : t.border}`,
                        boxShadow: t.shadowSm,
                      }}
                    >
                      <button
                        onClick={() => abrirCard(aluno.id)}
                        className="w-full flex items-center gap-3 p-3 text-left active:scale-[0.99] transition-transform"
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
                          {aluno.registradoHoje && seloRegistrado}
                        </div>
                      </button>

                      {aberto && renderEditor(aluno)}
                    </div>
                  );
                })}
              </div>
            ) : (
              /* VISÃO EM CÍRCULOS: foto + nome e sobrenome; o editor abre acima da grade */
              <div className="space-y-3">
                {activeAluno && (
                  <div
                    className="rounded-xl overflow-hidden"
                    style={{ backgroundColor: t.surface, border: `1px solid ${t.accent}`, boxShadow: t.shadowMd }}
                  >
                    <div className="flex items-center gap-3 p-3">
                      <Avatar className="h-11 w-11 flex-shrink-0">
                        <AvatarImage src={activeAluno.avatarUrl} className="object-cover" />
                        <AvatarFallback
                          className="text-sm font-semibold"
                          style={{ backgroundColor: t.accentSoft, color: t.accentText }}
                        >
                          {getIniciais(activeAluno.nome)}
                        </AvatarFallback>
                      </Avatar>
                      <p className="text-sm font-semibold" style={{ color: t.text }}>
                        {activeAluno.nome}
                      </p>
                    </div>
                    {renderEditor(activeAluno)}
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2">
                  {alunosFiltrados.map((aluno) => {
                    const ativo = activeId === aluno.id;
                    return (
                      <button
                        key={aluno.id}
                        id={`rajada-card-${aluno.id}`}
                        onClick={() => abrirCard(aluno.id)}
                        className="flex flex-col items-center gap-1.5 p-2 rounded-xl active:scale-[0.98] transition-transform"
                        style={{
                          backgroundColor: t.surface,
                          border: `1px solid ${ativo ? t.accent : t.border}`,
                          boxShadow: t.shadowSm,
                        }}
                      >
                        <div className="relative">
                          <Avatar className="h-16 w-16">
                            <AvatarImage src={aluno.avatarUrl} className="object-cover" />
                            <AvatarFallback
                              className="text-base font-semibold"
                              style={{ backgroundColor: t.accentSoft, color: t.accentText }}
                            >
                              {getIniciais(aluno.nome)}
                            </AvatarFallback>
                          </Avatar>
                          {aluno.registradoHoje && (
                            <span
                              className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center sprout-in"
                              style={{ backgroundColor: t.presente, border: `2px solid ${t.surface}` }}
                              aria-label="registrado hoje"
                            >
                              <Sprout size={11} strokeWidth={2.5} color="#FFFFFF" />
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-center leading-tight line-clamp-2" style={{ color: t.text }}>
                          {aluno.nome}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {pendencia && alunoPendente && (
        <PendenteModal
          alunoNome={alunoPendente.nome}
          onGuardar={() => resolverPendencia(true)}
          onDescartar={() => resolverPendencia(false)}
          onFechar={() => setPendencia(null)}
        />
      )}

      {concluirOpen && (
        <ConcluirModal
          registrados={registradosCount}
          moduloNome={moduloNome}
          corFio={fio?.cor}
          corDia={fio?.corDia}
          onFechar={() => setConcluirOpen(false)}
          onSair={finalizarAula}
        />
      )}
    </div>
  );
};

export default F1RajadaPage;
