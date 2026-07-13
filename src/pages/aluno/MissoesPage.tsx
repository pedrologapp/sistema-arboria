import { useEffect, useState, useMemo, useCallback, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle,
  RefreshCw,
  AlertCircle,
  ScrollText,
  Star,
  ChevronRight,
  Trophy,
  Pencil,
  Clock,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { agoraBrasil } from '@/utils/timezone';
import { useStudent } from '@/contexts/StudentContext';
import { F2_ALUNO_FASE_TRILHA } from '@/config/f2AlunoFase';
import { F2_ALUNO_VISOR_NOVO } from '@/config/f2AlunoVisorNovo';
import { cn } from '@/lib/utils';
import { CasaBrasao } from '@/components/CasaBrasao';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import { clearAppBadge } from '@/hooks/useAppBadge';
import '@/styles/missoes-scifi.css';

interface Inteligencia {
  id: number;
  nome: string;
  codigo?: string | null;
  cor_hex: string | null;
  brasao_url: string | null;
  emoji: string | null;
}

interface Fase {
  id: string;
  numero_fase: number;
  semana_atual: number | null;
  ativo: boolean;
  inteligencia_id: number;
  data_inicio: string;
  data_fim: string;
}

interface ItemFase {
  inteligencia: Inteligencia;
  fase: Fase | null;
  status: 'futura' | 'atual' | 'passada';
}

type StatusQuest = 'disponivel' | 'enviada' | 'refazer';

interface Quest {
  id: string;
  titulo: string;
  pontos: number | null;
  status: StatusQuest;
  legenda: string | null; // ex: "Seu papel: Presidente" ou "Casa Musical"
  brasaoUrl?: string | null; // brasão da fase (mostra a casa/fase, ex: Interpessoal)
  emoji?: string | null;
  casaNome?: string | null;
  prazo?: string | null; // ISO date; exibe "até dd/MM" ao lado dos pontos
}

interface Concluida {
  id: string;
  titulo: string;
  pontos: number | null;
  grupoKey: string;
  grupoLabel: string;
  grupoCor: string;
  tipo: 'feita' | 'perdida';
}

const STATUS_META: Record<StatusQuest, { label: string; classes: string; Icon: LucideIcon }> = {
  disponivel: { label: 'Fazer', classes: 'text-amber-300 bg-amber-400/10 border-amber-400/30', Icon: Pencil },
  enviada: { label: 'Enviada', classes: 'text-sky-300 bg-sky-400/10 border-sky-400/30', Icon: Clock },
  refazer: { label: 'Refazer', classes: 'text-orange-300 bg-orange-500/10 border-orange-400/30', Icon: RefreshCw },
};

// Ações primeiro: refazer → fazer → enviada (o que precisa de ação flutua pro topo)
const ORDEM_STATUS: Record<StatusQuest, number> = { refazer: 0, disponivel: 1, enviada: 2 };

// "#a78bfa" -> "167, 139, 250" (pra alimentar as variáveis CSS com a cor da casa)
const hexToRgb = (hex: string): string | null => {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  return m ? `${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)}` : null;
};

const FiltroChip = ({ ativo, onClick, label, cor }: { ativo: boolean; onClick: () => void; label: string; cor?: string }) => (
  <button
    onClick={onClick}
    data-augmented-ui="tl-clip br-clip border"
    className={cn(
      'sf-card inline-flex items-center gap-1.5 px-3 py-1 text-[12px] font-medium transition-colors',
      ativo ? 'sf-chip-active' : 'text-[#94A3B8]'
    )}
  >
    {cor && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: cor }} />}
    {label}
  </button>
);

const MissoesPage = () => {
  const navigate = useNavigate();
  const { profile, casa, isLoading: contextLoading } = useStudent();

  const [itens, setItens] = useState<ItemFase[]>([]);
  const [questsFase, setQuestsFase] = useState<Quest[]>([]);
  const [questsCapitulo, setQuestsCapitulo] = useState<Quest[]>([]);
  const [concluidas, setConcluidas] = useState<Concluida[]>([]);
  const [filtroConcluidas, setFiltroConcluidas] = useState<string>('todas');
  // Segmento da aba nova (atras do flag F2_ALUNO_VISOR_NOVO). Inerte com flag off.
  const [segNovo, setSegNovo] = useState<'ativas' | 'concluidas'>('ativas');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!profile?.institution_id || !profile?.id) return;

    try {
      setError(null);

      const serieNum = profile.serie ? parseInt(String(profile.serie).replace(/\D/g, ''), 10) : null;
      const segmento = profile.segmento || 'fundamental2';
      const agoraISO = new Date().toISOString();
      const agoraMs = Date.now();

      // Missões cujo prazo encerrou sem entrega aprovada → vão pra Concluídas em vermelho ("não entregue")
      const perdidas: Concluida[] = [];
      const prazoEncerrado = (dataPrazo: string | null, permiteAtraso: boolean | null) =>
        !!dataPrazo && !permiteAtraso && new Date(dataPrazo).getTime() < agoraMs;

      // ---------- Inteligências ----------
      const { data: inteligencias, error: intError } = await supabase
        .from('inteligencias')
        .select('id, nome, codigo, cor_hex, brasao_url, emoji')
        .order('id');
      if (intError) throw intError;

      // Inteligência Interpessoal (fase dos capítulos como a Grande Assembleia): pro brasão
      const interpessoal = (inteligencias || []).find(i => i.codigo === 'interpessoal') || null;

      // ---------- Fases (a jornada) ----------
      let query = supabase
        .from('fases')
        .select('id, numero_fase, semana_atual, ativo, inteligencia_id, data_inicio, data_fim, serie')
        .eq('institution_id', profile.institution_id)
        .eq('segmento', segmento);
      if (serieNum) query = query.or(`serie.eq.${serieNum},serie.is.null`);

      const { data: fases, error: fasesError } = await query;
      if (fasesError) throw fasesError;

      // Deduplicate por numero_fase (preferir série específica)
      const fasesDedup = new Map<number, (typeof fases)[number]>();
      for (const fase of fases || []) {
        const existing = fasesDedup.get(fase.numero_fase);
        if (!existing || (fase.serie !== null && existing.serie === null)) {
          fasesDedup.set(fase.numero_fase, fase);
        }
      }

      const hoje = agoraBrasil();
      hoje.setHours(12, 0, 0, 0);

      // Fase atual pela TRILHA (flag on), igual ao StudentContext: a Casa da vez
      // define a fase 'atual', em vez das datas. Sem flag/trilha, segue por data.
      let intelTrilha: number | null = null;
      if (F2_ALUNO_FASE_TRILHA) {
        try {
          const { data: rpcFase } = await (
            supabase as unknown as { rpc: (fn: string) => Promise<{ data: unknown }> }
          ).rpc('fase_atual_do_aluno');
          if (Array.isArray(rpcFase) && rpcFase.length > 0) {
            intelTrilha = (rpcFase[0] as { inteligencia_id?: number }).inteligencia_id ?? null;
          }
        } catch {
          /* segue por data */
        }
      }

      const itensLista: ItemFase[] = (Array.from(fasesDedup.values())
        .map(fase => {
          const inteligencia = inteligencias?.find(i => i.id === fase.inteligencia_id);
          if (!inteligencia) return null;
          const inicio = new Date(fase.data_inicio + 'T12:00:00');
          const fim = new Date(fase.data_fim + 'T12:00:00');
          let status: 'futura' | 'atual' | 'passada' = 'futura';
          if (hoje >= inicio && hoje <= fim) status = 'atual';
          else if (hoje > fim) status = 'passada';
          // Convergencia trilha: a fase ATUAL e a da Casa da trilha (nao a por
          // data). A que era atual por data vira passada; as demais mantem.
          if (intelTrilha != null) {
            status =
              fase.inteligencia_id === intelTrilha
                ? 'atual'
                : status === 'atual'
                  ? 'passada'
                  : status;
          }
          return {
            inteligencia,
            fase,
            status,
          };
        })
        .filter(Boolean) as ItemFase[]).sort(
        (a, b) => (a.fase?.numero_fase ?? 999) - (b.fase?.numero_fase ?? 999)
      );
      setItens(itensLista);

      const faseAtual = itensLista.find(i => i.status === 'atual');

      // Helper de status (a partir das entregas do aluno)
      const statusDe = (entregaStatus: string | undefined): StatusQuest | 'aprovada' => {
        if (!entregaStatus) return 'disponivel';
        if (entregaStatus === 'aprovada') return 'aprovada';
        if (entregaStatus === 'refazer') return 'refazer';
        return 'enviada';
      };

      // ---------- Missões da Fase atual (gerais + a da casa do aluno) ----------
      // Sem filtro de semana: mostra todas as missões liberadas da fase ativa
      // (feriado/falta de aula deslocam as semanas; a fase ativa é o que vale).
      const questsFaseArr: Quest[] = [];
      if (faseAtual?.fase) {
        const fi = faseAtual.inteligencia;
        let geraisQuery = supabase
          .from('missoes')
          .select('id, titulo, pontos_base, data_prazo, permite_entrega_atrasada')
          .eq('fase_id', faseAtual.fase.id)
          .eq('tipo_missao', 'geral')
          .eq('status', 'liberada')
          .lte('data_liberacao', agoraISO);
        if (serieNum) geraisQuery = geraisQuery.eq('serie_filtro', serieNum);

        let individuaisQuery = supabase
          .from('missoes')
          .select('id, titulo, pontos_base, casa_id, data_prazo, permite_entrega_atrasada')
          .eq('fase_id', faseAtual.fase.id)
          .eq('tipo_missao', 'individual')
          .eq('status', 'liberada')
          .lte('data_liberacao', agoraISO);
        if (serieNum) individuaisQuery = individuaisQuery.eq('serie_filtro', serieNum);

        const [{ data: geraisData }, { data: indData }] = await Promise.all([geraisQuery, individuaisQuery]);

        // Só a missão individual da CASA do aluno
        const minhasIndividuais = (indData || []).filter(m => m.casa_id === profile.casa_id);
        const todas = [
          ...(geraisData || []).map(m => ({ id: m.id, titulo: m.titulo, pontos_base: m.pontos_base, legenda: 'Missão geral da fase', data_prazo: m.data_prazo, permite: m.permite_entrega_atrasada })),
          ...minhasIndividuais.map(m => ({ id: m.id, titulo: m.titulo, pontos_base: m.pontos_base, legenda: 'Missão da sua casa', data_prazo: m.data_prazo, permite: m.permite_entrega_atrasada })),
        ];

        if (todas.length > 0) {
          const ids = todas.map(m => m.id);
          const { data: entregas } = await supabase
            .from('entregas')
            .select('missao_id, status')
            .eq('aluno_id', profile.id)
            .in('missao_id', ids)
            .order('created_at', { ascending: false });

          for (const m of todas) {
            const ent = (entregas || []).find(e => e.missao_id === m.id);
            const st = statusDe(ent?.status);
            if (st === 'aprovada') continue; // concluídas vão pra outra aba
            // Prazo encerrado e não entregue (e não permite atraso) → "perdida" (Concluídas, vermelho)
            if (st !== 'enviada' && prazoEncerrado(m.data_prazo, m.permite)) {
              perdidas.push({
                id: `perdida-${m.id}`,
                titulo: m.titulo,
                pontos: null,
                grupoKey: fi ? `f${fi.id}` : 'fase',
                grupoLabel: fi?.nome || 'Fase',
                grupoCor: fi?.cor_hex || '#22C55E',
                tipo: 'perdida',
              });
              continue;
            }
            questsFaseArr.push({ id: m.id, titulo: m.titulo, pontos: m.pontos_base, status: st, legenda: m.legenda, brasaoUrl: fi?.brasao_url, emoji: fi?.emoji, casaNome: fi?.nome, prazo: m.data_prazo });
          }
        }
      }
      questsFaseArr.sort((a, b) => ORDEM_STATUS[a.status] - ORDEM_STATUS[b.status]);
      setQuestsFase(questsFaseArr);

      // ---------- Missões do Capítulo (por cargo, por delegação, ou geral) ----------
      const questsCapArr: Quest[] = [];
      try {
        // Papéis fixos (Mesa / Mediador / Observatório): em capitulo_alocacoes
        const { data: alocacoes } = await supabase
          .from('capitulo_alocacoes')
          .select('capitulo_id, turma_id, papel_id, papel:capitulo_papeis(nome)')
          .eq('aluno_id', profile.id);

        // Membros de delegação: em tabela separada
        const { data: membros } = await supabase
          .from('capitulo_delegacao_membros')
          .select('capitulo_id, turma_id, delegacao_codigo')
          .eq('aluno_id', profile.id);

        const meusCapitulos = Array.from(
          new Set([
            ...(alocacoes || []).map(a => a.capitulo_id),
            ...(membros || []).map(m => m.capitulo_id),
          ])
        );

        if (meusCapitulos.length > 0) {
          const meusPapeis = new Map<string, string>(); // papel_id -> nome
          for (const a of alocacoes || []) {
            const papel = Array.isArray(a.papel) ? a.papel[0] : a.papel;
            if (a.papel_id && papel?.nome) meusPapeis.set(a.papel_id, papel.nome);
          }
          const souMembroDe = new Set((membros || []).map(m => m.capitulo_id)); // capítulos onde sou membro de delegação

          // Nome da minha delegação por capítulo (pra legenda)
          const delegNome = new Map<string, string>();
          if (membros && membros.length > 0) {
            const { data: degs } = await supabase
              .from('capitulo_delegacoes')
              .select('capitulo_id, codigo, nome')
              .in('capitulo_id', Array.from(souMembroDe));
            for (const m of membros) {
              const d = (degs || []).find(x => x.capitulo_id === m.capitulo_id && x.codigo === m.delegacao_codigo);
              if (d?.nome) delegNome.set(m.capitulo_id, d.nome);
            }
          }

          // Turma do aluno em cada capítulo (pra checar a liberação por turma)
          const minhaTurma = new Map<string, string>(); // capitulo_id -> turma_id
          for (const a of alocacoes || []) if (a.capitulo_id && a.turma_id) minhaTurma.set(a.capitulo_id, a.turma_id);
          for (const m of membros || []) if (m.capitulo_id && m.turma_id) minhaTurma.set(m.capitulo_id, m.turma_id);

          // Liberação por turma: o professor libera em capitulo_turma_config e define o prazo (+7 dias).
          // Só mostra a missão se a MINHA turma foi liberada; o prazo usado é o da liberação.
          const libPrazo = new Map<string, string | null>(); // capitulo_id -> prazo (se liberado pra minha turma)
          const { data: configs } = await supabase
            .from('capitulo_turma_config')
            .select('capitulo_id, turma_id, missoes_liberadas_em, missoes_data_prazo')
            .in('capitulo_id', meusCapitulos);
          for (const c of configs || []) {
            if (c.missoes_liberadas_em && minhaTurma.get(c.capitulo_id) === c.turma_id) {
              libPrazo.set(c.capitulo_id, c.missoes_data_prazo);
            }
          }

          const { data: missoesCap } = await supabase
            .from('missoes')
            .select('id, titulo, pontos_base, papel_id, para_membros_delegacao, capitulo_id, permite_entrega_atrasada')
            .in('capitulo_id', meusCapitulos)
            .eq('status', 'liberada');

          const elegiveis = (missoesCap || []).filter(m => {
            if (!libPrazo.has(m.capitulo_id)) return false; // turma ainda não liberada → não mostra
            if (m.papel_id) return meusPapeis.has(m.papel_id); // por cargo
            if (m.para_membros_delegacao) return souMembroDe.has(m.capitulo_id); // membro de delegação
            return true; // geral (todos do capítulo)
          });

          if (elegiveis.length > 0) {
            const ids = elegiveis.map(m => m.id);
            const { data: entregas } = await supabase
              .from('entregas')
              .select('missao_id, status')
              .eq('aluno_id', profile.id)
              .in('missao_id', ids)
              .order('created_at', { ascending: false });

            for (const m of elegiveis) {
              const ent = (entregas || []).find(e => e.missao_id === m.id);
              const st = statusDe(ent?.status);
              if (st === 'aprovada') continue;
              if (st !== 'enviada' && prazoEncerrado(libPrazo.get(m.capitulo_id) ?? null, m.permite_entrega_atrasada)) {
                perdidas.push({
                  id: `perdida-${m.id}`,
                  titulo: m.titulo,
                  pontos: null,
                  grupoKey: 'capitulo',
                  grupoLabel: 'Capítulo',
                  grupoCor: '#A78BFA',
                  tipo: 'perdida',
                });
                continue;
              }
              const legenda = m.papel_id
                ? `Seu papel: ${meusPapeis.get(m.papel_id)}`
                : m.para_membros_delegacao
                ? `Sua delegação${delegNome.get(m.capitulo_id) ? `: ${delegNome.get(m.capitulo_id)}` : ''}`
                : 'Missão do capítulo';
              questsCapArr.push({ id: m.id, titulo: m.titulo, pontos: m.pontos_base, status: st, legenda, brasaoUrl: interpessoal?.brasao_url, emoji: interpessoal?.emoji, casaNome: interpessoal?.nome, prazo: libPrazo.get(m.capitulo_id) ?? null });
            }
          }
        }
      } catch (capErr) {
        // Coluna ainda não migrada / sem capítulo: simplesmente não há missões de capítulo
        console.warn('Missões de capítulo indisponíveis:', capErr);
      }
      questsCapArr.sort((a, b) => ORDEM_STATUS[a.status] - ORDEM_STATUS[b.status]);
      setQuestsCapitulo(questsCapArr);

      // ---------- Concluídas (com grupo p/ filtro por fase) ----------
      const { data: aprovadas } = await supabase
        .from('entregas')
        .select('id, pontos_concedidos, missao:missoes(titulo, capitulo_id, fase_id)')
        .eq('aluno_id', profile.id)
        .eq('status', 'aprovada')
        .order('data_avaliacao', { ascending: false });

      // Mapa fase_id -> inteligência (nome/cor) das missões concluídas
      const faseIds = Array.from(
        new Set(
          (aprovadas || [])
            .map(e => (Array.isArray(e.missao) ? e.missao[0] : e.missao)?.fase_id)
            .filter(Boolean) as string[]
        )
      );
      const faseParaIntel = new Map<string, Inteligencia>();
      if (faseIds.length > 0) {
        const { data: fasesConcl } = await supabase
          .from('fases')
          .select('id, inteligencia_id')
          .in('id', faseIds);
        for (const f of fasesConcl || []) {
          const intel = inteligencias?.find(i => i.id === f.inteligencia_id);
          if (intel) faseParaIntel.set(f.id, intel);
        }
      }

      const concluidasArr: Concluida[] = (aprovadas || []).map(e => {
        const missao = Array.isArray(e.missao) ? e.missao[0] : e.missao;
        let grupoKey = 'outras';
        let grupoLabel = 'Outras';
        let grupoCor = '#94A3B8';
        if (missao?.capitulo_id) {
          grupoKey = 'capitulo';
          grupoLabel = 'Capítulo';
          grupoCor = '#A78BFA';
        } else if (missao?.fase_id && faseParaIntel.has(missao.fase_id)) {
          const intel = faseParaIntel.get(missao.fase_id)!;
          grupoKey = `f${intel.id}`;
          grupoLabel = intel.nome;
          grupoCor = intel.cor_hex || '#22C55E';
        }
        return {
          id: e.id,
          titulo: missao?.titulo || 'Missão',
          pontos: e.pontos_concedidos,
          grupoKey,
          grupoLabel,
          grupoCor,
          tipo: 'feita' as const,
        };
      });
      setConcluidas([...concluidasArr, ...perdidas]);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Não foi possível carregar as missões. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  }, [profile?.institution_id, profile?.id, profile?.serie, profile?.segmento, profile?.casa_id]);

  useEffect(() => {
    fetchData();
    clearAppBadge();
  }, [fetchData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const faseAtual = useMemo(() => itens.find(i => i.status === 'atual'), [itens]);

  const gruposConcluidas = useMemo(() => {
    const map = new Map<string, { key: string; label: string; cor: string }>();
    for (const c of concluidas) {
      if (!map.has(c.grupoKey)) map.set(c.grupoKey, { key: c.grupoKey, label: c.grupoLabel, cor: c.grupoCor });
    }
    return Array.from(map.values());
  }, [concluidas]);

  const concluidasFiltradas = useMemo(
    () => (filtroConcluidas === 'todas' ? concluidas : concluidas.filter(c => c.grupoKey === filtroConcluidas)),
    [concluidas, filtroConcluidas]
  );

  if (contextLoading || isLoading) {
    return (
      <div className="min-h-screen bg-[#1A1A2E] px-5 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="h-6 w-24 bg-[#252547] rounded animate-pulse" />
          <div className="h-8 w-8 bg-[#252547] rounded-full animate-pulse" />
        </div>
        <div className="h-9 w-full bg-[#252547] rounded-lg animate-pulse mb-5" />
        <div className="h-16 w-full bg-[#252547] rounded-2xl animate-pulse mb-3" />
        <div className="h-14 w-full bg-[#252547] rounded-2xl animate-pulse mb-3" />
        <div className="h-14 w-full bg-[#252547] rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#1A1A2E] px-5 py-6">
        <div className="p-6 rounded-xl border border-red-500/20 bg-[#252547] text-center">
          <AlertCircle className="w-8 h-8 mx-auto mb-3 text-red-400" />
          <p className="text-[#94A3B8] text-sm mb-4">{error}</p>
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#334155] text-[#94A3B8] hover:bg-[#283548] text-sm"
          >
            <RefreshCw className="w-4 h-4" /> Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  const renderQuest = (q: Quest, index: number) => {
    const meta = STATUS_META[q.status];
    const StatusIcon = meta.Icon;
    return (
      <button
        key={q.id}
        onClick={() => navigate(`/aluno/missoes/${q.id}`)}
        data-augmented-ui="tl-clip br-clip border"
        style={{ animationDelay: `${Math.min(index * 0.06, 0.4)}s` }}
        className="sf-card sf-boot w-full flex items-center gap-3 px-3 py-2.5 text-left"
      >
        {/* ícone chanfrado com glow */}
        <div
          data-augmented-ui="tl-clip br-clip border"
          className="sf-icon-box shrink-0 w-9 h-9 flex items-center justify-center"
        >
          <CasaBrasao brasaoUrl={q.brasaoUrl ?? null} emoji={q.emoji ?? null} nome={q.casaNome ?? ''} size="small" className="!w-6 !h-6" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium leading-tight truncate">{q.titulo}</p>
          {(q.pontos != null || q.prazo) && (
            <p className="text-[11px] mt-0.5 tabular-nums" style={{ color: 'var(--sf-accent)' }}>
              {q.pontos != null && <>+{q.pontos} pts</>}
              {q.pontos != null && q.prazo && ' · '}
              {q.prazo && <>até {new Date(q.prazo).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</>}
            </p>
          )}
        </div>

        {q.status === 'disponivel' ? (
          <span data-augmented-ui="tl-clip br-clip border" className="sf-exec shrink-0 text-[11px] px-2.5 py-1">
            Fazer
          </span>
        ) : (
          <span className={cn('shrink-0 inline-flex items-center gap-1 text-[11px] font-medium', q.status === 'refazer' ? 'text-orange-300' : 'text-[#94A3B8]')}>
            <StatusIcon className="w-3 h-3" />
            {meta.label}
          </span>
        )}
        <ChevronRight className="w-4 h-4 shrink-0" style={{ color: 'var(--sf-accent)' }} />
      </button>
    );
  };

  const renderEmpty = (tipo: 'capitulo' | 'fase') => (
    <div className="flex flex-col items-center justify-center text-center py-6 px-4">
      <motion.div
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        data-augmented-ui="tl-clip br-clip border"
        className="sf-icon-box w-12 h-12 flex items-center justify-center mb-3"
      >
        <ScrollText className="w-5 h-5" style={{ color: 'var(--sf-accent)' }} />
      </motion.div>
      <h3 className="font-medium text-[14px] mb-1" style={{ color: 'var(--sf-text)' }}>
        {tipo === 'capitulo' ? 'Nenhuma missão do Capítulo ainda' : 'Nenhuma missão da fase ainda'}
      </h3>
      <p className="text-[12px] max-w-[240px]" style={{ color: 'var(--sf-text-dim)' }}>
        {tipo === 'capitulo'
          ? 'Quando o Capítulo liberar uma missão pra você, ela aparece aqui.'
          : 'Conforme sua turma avança na fase, novas missões surgem aqui.'}
      </p>
    </div>
  );

  const totalAtivas = questsFase.length + questsCapitulo.length;

  // Acento do painel = cor da casa do aluno (fallback roxo)
  const accentColor = casa?.cor_hex || '#a78bfa';
  const accentRgb = hexToRgb(accentColor) || '167, 139, 250';
  const scifiVars = { '--sf-accent': accentColor, '--sf-accent-rgb': accentRgb } as CSSProperties;

  // ================= VISOR NOVO (atras do flag F2_ALUNO_VISOR_NOVO) =================
  // Reproduz a aba "Missoes" do mockup aprovado (aluno_abas_proposta.html): titulo
  // serif, abas Ativas/Concluidas, secao "Do capitulo" em card destacado e secao
  // "Da fase" como lista com chip de status. Reaproveita os MESMOS dados de hoje
  // (questsFase, questsCapitulo, concluidas); nenhuma query nova. Sem semanas.
  // Desligada, cai no return de sempre abaixo (nenhuma regressao).
  if (F2_ALUNO_VISOR_NOVO) {
    const casaColor = accentColor;
    const fmtPrazo = (iso: string) =>
      new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

    const subtitulo = (q: Quest) => {
      const partes: string[] = [];
      if (q.legenda) partes.push(q.legenda);
      if (q.prazo) partes.push(`até ${fmtPrazo(q.prazo)}`);
      return partes.join(' · ');
    };

    // Chip de status. "A fazer" usa a cor da casa (acento); os demais, cores fixas
    // do mockup (enviada ambar, aprovada verde, refazer vermelho suave).
    const renderChip = (status: StatusQuest | 'aprovada') => {
      const base = 'shrink-0 text-[9.5px] font-bold uppercase tracking-[0.04em] px-2 py-[3px] rounded-md';
      if (status === 'disponivel') {
        return (
          <span className={base} style={{ color: casaColor, backgroundColor: `${casaColor}28` }}>
            A fazer
          </span>
        );
      }
      if (status === 'enviada') {
        return <span className={cn(base, 'text-[#F0C97F]')} style={{ backgroundColor: 'rgba(245,158,11,0.14)' }}>Enviada</span>;
      }
      if (status === 'aprovada') {
        return <span className={cn(base, 'text-[#7FE3C1]')} style={{ backgroundColor: 'rgba(16,185,129,0.15)' }}>Aprovada</span>;
      }
      return <span className={cn(base, 'text-[#F0A17F]')} style={{ backgroundColor: 'rgba(224,72,59,0.16)' }}>Refazer</span>;
    };

    const lbl = 'text-[9.5px] tracking-[0.28em] uppercase text-white/30 px-0.5';

    return (
      <div className="scifi min-h-screen px-5 py-6 pb-24" style={scifiVars}>
        {/* Cabecalho: titulo serif + refresh discreto */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-serif text-[22px] font-semibold text-white leading-tight">Missões</h1>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors text-white/40 hover:text-white disabled:opacity-50"
          >
            <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
          </button>
        </div>

        {/* Abas Ativas / Concluidas (segtabs do mockup) */}
        <div className="flex gap-5 text-[13px] mb-5">
          <button
            onClick={() => setSegNovo('ativas')}
            className={cn(
              'pb-1 transition-colors',
              segNovo === 'ativas' ? 'text-white font-semibold' : 'text-white/35'
            )}
            style={segNovo === 'ativas' ? { borderBottom: `2px solid ${casaColor}` } : undefined}
          >
            Ativas
          </button>
          <button
            onClick={() => setSegNovo('concluidas')}
            className={cn(
              'pb-1 transition-colors',
              segNovo === 'concluidas' ? 'text-white font-semibold' : 'text-white/35'
            )}
            style={segNovo === 'concluidas' ? { borderBottom: `2px solid ${casaColor}` } : undefined}
          >
            Concluídas
          </button>
        </div>

        {segNovo === 'ativas' ? (
          <div className="space-y-3">
            {/* Do capitulo: sempre presente; placeholder quando vazia */}
            {questsCapitulo.length > 0 ? (
              <>
                <div className={lbl}>Do capítulo</div>
                {questsCapitulo.map(q => (
                  <button
                    key={q.id}
                    onClick={() => navigate(`/aluno/missoes/${q.id}`)}
                    className="relative overflow-hidden rounded-2xl border border-white/[0.10] bg-white/[0.035] w-full text-left p-3.5 active:scale-[0.99] transition-transform"
                  >
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{ background: `radial-gradient(120% 90% at 50% -20%, ${casaColor}2e 0%, transparent 60%)` }}
                    />
                    <div className="relative z-10">
                      <div className="text-[9.5px] tracking-[0.30em] uppercase text-white/30">
                        {q.legenda || 'Missão do capítulo'}
                      </div>
                      <h3 className="font-serif text-[17px] font-semibold text-white mt-1.5 leading-tight">
                        {q.titulo}
                      </h3>
                      <div className="flex items-center justify-between gap-2 mt-3">
                        {renderChip(q.status)}
                        {(q.pontos != null || q.prazo) && (
                          <span className="text-[10.5px] font-semibold text-amber-400 tabular-nums">
                            {q.pontos != null && <>vale {q.pontos} pts</>}
                            {q.pontos != null && q.prazo && ' · '}
                            {q.prazo && <>até {fmtPrazo(q.prazo)}</>}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </>
            ) : (
              <>
                <div className={lbl}>Do capítulo</div>
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-3.5">
                  <div className="text-[13px] font-semibold text-white">Em breve</div>
                  <p className="text-[11px] text-white/35 mt-1">A missão do capítulo aparece aqui quando o professor liberar.</p>
                </div>
              </>
            )}

            {/* Da fase: sempre presente; placeholder quando vazia */}
            {questsFase.length > 0 ? (
              <>
                <div className={cn(lbl, 'pt-1')}>
                  Da fase{faseAtual ? ` · ${faseAtual.inteligencia.nome}` : ''}
                </div>
                {questsFase.map(q => (
                  <button
                    key={q.id}
                    onClick={() => navigate(`/aluno/missoes/${q.id}`)}
                    className="rounded-2xl border border-white/[0.08] bg-white/[0.035] w-full text-left active:scale-[0.99] transition-transform"
                  >
                    <div className="flex items-center gap-3 px-3.5 py-3">
                      <div className="flex-1 min-w-0">
                        <b className="text-[12.5px] font-semibold text-white block truncate">{q.titulo}</b>
                        {subtitulo(q) && (
                          <p className="text-[10.5px] text-white/30 mt-0.5 truncate">{subtitulo(q)}</p>
                        )}
                      </div>
                      {renderChip(q.status)}
                    </div>
                  </button>
                ))}
              </>
            ) : (
              <>
                <div className={cn(lbl, 'pt-1')}>
                  Da fase{faseAtual ? ` · ${faseAtual.inteligencia.nome}` : ''}
                </div>
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-3.5">
                  <div className="text-[13px] font-semibold text-white">Em breve será liberada</div>
                  <p className="text-[11px] text-white/35 mt-1">As missões desta fase são liberadas conforme a turma avança.</p>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {concluidas.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-12 px-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
                  style={{ backgroundColor: `${casaColor}24` }}
                >
                  <Trophy className="w-5 h-5" style={{ color: casaColor }} />
                </div>
                <h3 className="font-medium text-[14px] text-white mb-1">Nenhuma missão concluída ainda</h3>
                <p className="text-[12px] text-white/35 max-w-[240px]">Suas missões aprovadas aparecem aqui.</p>
              </div>
            ) : (
              <>
                {/* Filtro por fase / capitulo */}
                {gruposConcluidas.length > 1 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    <button
                      onClick={() => setFiltroConcluidas('todas')}
                      className={cn(
                        'text-[12px] font-medium px-3 py-1 rounded-full border transition-colors',
                        filtroConcluidas === 'todas' ? 'text-white' : 'text-white/40 border-white/[0.08]'
                      )}
                      style={filtroConcluidas === 'todas' ? { color: casaColor, borderColor: `${casaColor}4d`, backgroundColor: `${casaColor}18` } : undefined}
                    >
                      Todas
                    </button>
                    {gruposConcluidas.map(g => (
                      <button
                        key={g.key}
                        onClick={() => setFiltroConcluidas(g.key)}
                        className={cn(
                          'inline-flex items-center gap-1.5 text-[12px] font-medium px-3 py-1 rounded-full border transition-colors',
                          filtroConcluidas === g.key ? 'text-white' : 'text-white/40 border-white/[0.08]'
                        )}
                        style={filtroConcluidas === g.key ? { color: casaColor, borderColor: `${casaColor}4d`, backgroundColor: `${casaColor}18` } : undefined}
                      >
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: g.cor }} />
                        {g.label}
                      </button>
                    ))}
                  </div>
                )}

                {concluidasFiltradas.map(c => (
                  <div
                    key={c.id}
                    className="rounded-2xl border border-white/[0.08] bg-white/[0.035]"
                  >
                    <div className="flex items-center gap-3 px-3.5 py-3">
                      <div className="flex-1 min-w-0">
                        <b className="text-[12.5px] font-semibold text-white block truncate">{c.titulo}</b>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: c.grupoCor }} />
                          <span className="text-[10.5px] text-white/30 truncate">{c.grupoLabel}</span>
                        </div>
                      </div>
                      {c.tipo === 'feita' ? (
                        renderChip('aprovada')
                      ) : (
                        <span className="shrink-0 text-[9.5px] font-bold uppercase tracking-[0.04em] px-2 py-[3px] rounded-md text-white/40 bg-white/[0.06]">
                          Não entregue
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="scifi min-h-screen px-5 py-6 pb-24" style={scifiVars}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-semibold tracking-tight" style={{ color: 'var(--sf-text)' }}>
          Missões
        </h1>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors text-white/40 hover:text-white disabled:opacity-50"
        >
          <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
        </button>
      </div>

      <Tabs defaultValue="ativas" className="w-full">
        <TabsList className="flex w-full justify-start gap-6 bg-transparent border-b border-[rgba(var(--sf-accent-rgb),0.2)] rounded-none p-0 mb-5 h-auto">
          <TabsTrigger value="ativas" className="bg-transparent rounded-none px-1 pb-2 font-medium text-[13px] text-[#94A3B8] data-[state=active]:bg-transparent data-[state=active]:text-[var(--sf-accent)] data-[state=active]:shadow-[0_2px_0_0_var(--sf-accent)]">
            <span className="flex items-center gap-2">
              Ativas
              {totalAtivas > 0 && (
                <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-semibold rounded-full tabular-nums" style={{ backgroundColor: 'rgba(var(--sf-accent-rgb),0.18)', color: 'var(--sf-accent)' }}>
                  {totalAtivas}
                </span>
              )}
            </span>
          </TabsTrigger>
          <TabsTrigger value="concluidas" className="bg-transparent rounded-none px-1 pb-2 font-medium text-[13px] text-[#94A3B8] data-[state=active]:bg-transparent data-[state=active]:text-[var(--sf-accent)] data-[state=active]:shadow-[0_2px_0_0_var(--sf-accent)]">
            Concluídas
          </TabsTrigger>
        </TabsList>

        {/* ============ ATIVAS ============ */}
        <TabsContent value="ativas" className="mt-0 space-y-4">
          {/* Banner da fase ativa */}
          {faseAtual && (
            <div
              data-augmented-ui="tl-clip tr-clip bl-clip br-clip border"
              className="sf-panel sf-accent-border sf-boot p-4 flex items-center gap-3"
            >
              <div data-augmented-ui="tl-clip br-clip border" className="sf-icon-box shrink-0 w-11 h-11 flex items-center justify-center">
                <CasaBrasao
                  brasaoUrl={faseAtual.inteligencia.brasao_url}
                  emoji={faseAtual.inteligencia.emoji}
                  nome={faseAtual.inteligencia.nome}
                  size="small"
                  className="!w-7 !h-7"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-widest text-[#94A3B8]">Você está na fase</p>
                <p className="text-[16px] font-semibold leading-tight" style={{ color: 'var(--sf-text)' }}>
                  {faseAtual.inteligencia.nome}
                </p>
              </div>
              <span className="flex items-center gap-1.5 text-[11px] font-medium" style={{ color: 'var(--sf-success)' }}>
                <span className="sf-dot inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--sf-success)' }} />
                Ativa
              </span>
            </div>
          )}

          <Accordion type="multiple" defaultValue={['capitulo', 'fase']} className="space-y-3">
            {/* Missão do Capítulo */}
            <AccordionItem value="capitulo" data-augmented-ui="tl-clip tr-clip bl-clip br-clip border" className="sf-panel border-0 px-4">
              <AccordionTrigger className="hover:no-underline py-3">
                <div className="flex items-center gap-2.5">
                  <ScrollText className="w-4 h-4" style={{ color: 'var(--sf-accent)' }} />
                  <span className="text-[14px] font-semibold">Missão do Capítulo</span>
                  <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-semibold rounded-full tabular-nums" style={{ backgroundColor: 'rgba(var(--sf-accent-rgb),0.18)', color: 'var(--sf-accent)' }}>{questsCapitulo.length}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-3.5">
                {questsCapitulo.length > 0 ? (
                  <div className="space-y-2">{questsCapitulo.map((q, i) => renderQuest(q, i))}</div>
                ) : (
                  renderEmpty('capitulo')
                )}
              </AccordionContent>
            </AccordionItem>

            {/* Missões da Fase */}
            <AccordionItem value="fase" data-augmented-ui="tl-clip tr-clip bl-clip br-clip border" className="sf-panel border-0 px-4">
              <AccordionTrigger className="hover:no-underline py-3">
                <div className="flex items-center gap-2.5">
                  <Star className="w-4 h-4" style={{ color: 'var(--sf-accent)' }} />
                  <span className="text-[14px] font-semibold">Missões da Fase</span>
                  <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-semibold rounded-full tabular-nums" style={{ backgroundColor: 'rgba(var(--sf-accent-rgb),0.18)', color: 'var(--sf-accent)' }}>{questsFase.length}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-3.5">
                {questsFase.length > 0 ? (
                  <div className="space-y-2">{questsFase.map((q, i) => renderQuest(q, i))}</div>
                ) : (
                  renderEmpty('fase')
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </TabsContent>

        {/* ============ CONCLUÍDAS ============ */}
        <TabsContent value="concluidas" className="mt-0">
          {concluidas.length === 0 ? (
            <div data-augmented-ui="tl-clip tr-clip bl-clip br-clip border" className="sf-panel p-8 text-center">
              <Trophy className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--sf-text-dim)' }} />
              <h3 className="font-medium text-[15px] mb-1" style={{ color: 'var(--sf-text)' }}>Nenhuma missão concluída ainda</h3>
              <p className="text-[12px]" style={{ color: 'var(--sf-text-dim)' }}>Suas missões aprovadas aparecem aqui.</p>
            </div>
          ) : (
            <>
              {/* Filtro por fase / capítulo */}
              {gruposConcluidas.length > 1 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  <FiltroChip ativo={filtroConcluidas === 'todas'} onClick={() => setFiltroConcluidas('todas')} label="Todas" />
                  {gruposConcluidas.map(g => (
                    <FiltroChip
                      key={g.key}
                      ativo={filtroConcluidas === g.key}
                      onClick={() => setFiltroConcluidas(g.key)}
                      label={g.label}
                      cor={g.cor}
                    />
                  ))}
                </div>
              )}
              <div className="space-y-2">
                {concluidasFiltradas.map((c, i) => (
                  <div
                    key={c.id}
                    data-augmented-ui="tl-clip br-clip border"
                    style={{ animationDelay: `${Math.min(i * 0.05, 0.3)}s` }}
                    className="sf-card sf-boot flex items-center gap-3 px-3 py-2.5"
                  >
                    {c.tipo === 'feita' ? (
                      <CheckCircle className="w-5 h-5 shrink-0" style={{ color: 'var(--sf-success)' }} />
                    ) : (
                      <XCircle className="w-5 h-5 shrink-0 text-orange-400/90" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium leading-tight truncate">{c.titulo}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: c.grupoCor }} />
                        <span className="text-[11px]" style={{ color: 'var(--sf-text-dim)' }}>{c.grupoLabel}</span>
                      </div>
                    </div>
                    {c.tipo === 'feita' ? (
                      c.pontos != null && (
                        <span className="text-[12px] font-medium whitespace-nowrap tabular-nums" style={{ color: 'var(--sf-success)' }}>+{c.pontos} pts</span>
                      )
                    ) : (
                      <span className="text-[11px] font-medium text-orange-300 whitespace-nowrap">Não entregue</span>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </TabsContent>

      </Tabs>
    </div>
  );
};

export default MissoesPage;
