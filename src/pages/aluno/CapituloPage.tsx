import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, ChevronRight, Users, ScrollText, Download, BookOpen, Info, Clock, Shirt, HelpCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useStudent } from '@/contexts/StudentContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import { cn } from '@/lib/utils';
import { F2_ALUNO_CAPITULO_PREVIEW } from '@/config/f2AlunoCapituloPreview';
import ArenaBoasVindas from './ArenaBoasVindas';
import '@/styles/missoes-scifi.css';

const sb = supabase as any;

// "#a78bfa" -> "167, 139, 250" (alimenta --sf-accent-rgb com a cor da casa)
const hexToRgb = (hex: string): string | null => {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  return m ? `${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)}` : null;
};

type Categoria = 'mesa' | 'mediador' | 'observatorio' | 'delegacao' | 'time';

interface Capitulo {
  id: string;
  numero: number;
  nome: string;
  frase_ancora: string | null;
  descricao_convocacao: string | null;
  tema_curto: string | null;
  briefing_chamada: string | null;
  briefing_o_que_aconteceu: string[] | null;
  briefing_porque_importa: string[] | null;
  regra_de_ouro: string | null;
  fases_assembleia: Array<{ numero: number; nome: string; duracao_min: number; descricao: string }> | null;
}

interface Delegacao {
  id: string;
  codigo: string;
  nome: string;
  quem_sao: string | null;
  objetivo: string | null;
  nao_cedem: string | null;
  topam_negociar: string | null;
  ordem: number;
}

interface ComoFazerBloco { titulo: string; passos: string[] }
interface ExemploFala { titulo: string; fala: string }
interface MomentoFala { tempo: string; titulo: string; instrucao?: string; fala: string }
interface FaseFalas { fase_nome: string; fase_intervalo: string; momentos: MomentoFala[] }

interface Papel {
  id: string;
  nome: string;
  categoria: Categoria;
  delegacao: string | null;
  descricao_curta: string | null;
  roteiro_papel: string | null;
  roteiro_como_fazer: ComoFazerBloco[] | null;
  roteiro_exemplos: ExemploFala[] | null;
  roteiro_falas_cronologico: FaseFalas[] | null;
  vagas_por_turma: number;
  ordem: number;
  time_label: string | null;
}

interface AlocacaoComAluno {
  id: string;
  aluno_id: string;
  papel_id: string;
  aluno: {
    id: string;
    nome: string | null;
    full_name: string | null;
    avatar_url: string | null;
    casa_id: number | null;
  } | null;
}

interface MembroComAluno {
  id: string;
  delegacao_codigo: string;
  aluno: {
    id: string;
    nome: string | null;
    full_name: string | null;
    avatar_url: string | null;
    casa_id: number | null;
  } | null;
}

type Brasoes = Record<number, string | null>;

interface TurmaConfig {
  data_evento: string | null;
  delegacoes_ativas: string[];
}

const calcularDias = (data: string | null): number | null => {
  if (!data) return null;
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const evento = new Date(data + 'T00:00:00');
  return Math.ceil((evento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
};

const formatarData = (data: string | null): string => {
  if (!data) return '';
  const d = new Date(data + 'T00:00:00');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
};

const nomeAluno = (a: AlocacaoComAluno['aluno']): string => {
  if (!a) return 'Aluno';
  return a.nome || a.full_name || 'Aluno';
};

const nomeCompleto = (a: AlocacaoComAluno['aluno']): string => {
  if (!a) return 'Aluno';
  return a.full_name || a.nome || 'Aluno';
};

const nomeESobrenome = (a: AlocacaoComAluno['aluno']): string => {
  const completo = nomeCompleto(a).trim();
  const partes = completo.split(/\s+/).filter(Boolean);
  if (partes.length <= 1) return completo;
  return `${partes[0]} ${partes[partes.length - 1]}`;
};

const primeiroNome = (n: string) => n.split(' ')[0];

const PDF_POR_DELEGACAO: Record<string, string> = {
  big_techs: 'delegacao-big-techs',
  adolescentes_organizados: 'delegacao-adolescentes-organizados',
  criadores_conteudo: 'delegacao-criadores-conteudo',
  industria_jogos: 'delegacao-industria-jogos',
  vozes_internet: 'delegacao-vozes-internet',
  familias: 'delegacao-familias-conselho',
};

const pdfDaDelegacao = (codigo: string): string | null => {
  const slug = PDF_POR_DELEGACAO[codigo];
  return slug ? `/docs/delegacoes/${slug}.pdf` : null;
};

// PDF de apoio do time (formato TIMES, ex.: Arena Arboria). Servido como asset
// estático por ordem do papel/time (1..8). Fora dessa faixa: sem PDF.
const pdfDoTime = (ordem: number): string | null =>
  ordem >= 1 && ordem <= 8 ? `/materiais/arena/tema${ordem}.pdf` : null;

const iniciais = (nome: string) =>
  nome.split(' ').slice(0, 2).map(n => n[0]?.toUpperCase()).join('');

const CapituloPage = () => {
  const { user } = useAuth();
  const { profile, faseAtual, casa, casaColor, isLoading: loadingStudent } = useStudent();
  const [papelAberto, setPapelAberto] = useState<Papel | null>(null);
  const [delegacaoAberta, setDelegacaoAberta] = useState<Delegacao | null>(null);
  const [boasVindasAberta, setBoasVindasAberta] = useState(false);

  const { data: turmaId } = useQuery({
    queryKey: ['minha-turma-cap', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await sb.from('aluno_turma')
        .select('turma_id').eq('aluno_id', user!.id).eq('ativo', true).limit(1).maybeSingle();
      return (data?.turma_id as string | undefined) ?? null;
    },
  });

  const { data: capitulo, isLoading: loadingCap } = useQuery<Capitulo | null>({
    queryKey: ['capitulo-ativo-v2', faseAtual?.id, profile?.institution_id],
    enabled: !!faseAtual?.id && !!profile?.institution_id,
    queryFn: async () => {
      const { data } = await sb.from('capitulos')
        .select('*')
        .eq('institution_id', profile!.institution_id)
        .eq('fase_id', faseAtual!.id)
        .eq('ativo', true)
        .maybeSingle();
      return (data as Capitulo | null) ?? null;
    },
  });

  const { data: turmaConfig } = useQuery<TurmaConfig | null>({
    queryKey: ['turma-config', capitulo?.id, turmaId],
    enabled: !!capitulo?.id && !!turmaId,
    queryFn: async () => {
      const { data } = await sb.from('capitulo_turma_config')
        .select('data_evento, delegacoes_ativas')
        .eq('capitulo_id', capitulo!.id)
        .eq('turma_id', turmaId!)
        .maybeSingle();
      return data ?? null;
    },
  });

  const { data: delegacoes = [] } = useQuery<Delegacao[]>({
    queryKey: ['cap-delegacoes', capitulo?.id],
    enabled: !!capitulo?.id,
    queryFn: async () => {
      const { data } = await sb.from('capitulo_delegacoes')
        .select('*').eq('capitulo_id', capitulo!.id).order('ordem');
      return (data as Delegacao[]) ?? [];
    },
  });

  const { data: papeis = [] } = useQuery<Papel[]>({
    queryKey: ['cap-papeis-v2', capitulo?.id],
    enabled: !!capitulo?.id,
    queryFn: async () => {
      const { data } = await sb.from('capitulo_papeis')
        .select('*').eq('capitulo_id', capitulo!.id).order('ordem');
      return (data as Papel[]) ?? [];
    },
  });

  const { data: alocacoes = [] } = useQuery<AlocacaoComAluno[]>({
    queryKey: ['cap-alocacoes-v2', capitulo?.id, turmaId],
    enabled: !!capitulo?.id && !!turmaId,
    queryFn: async () => {
      const { data } = await sb.from('capitulo_alocacoes').select(`
        id, aluno_id, papel_id,
        aluno:profiles!capitulo_alocacoes_aluno_id_fkey ( id, nome, full_name, avatar_url, casa_id )
      `).eq('capitulo_id', capitulo!.id).eq('turma_id', turmaId!);
      return (data as AlocacaoComAluno[]) ?? [];
    },
  });

  const { data: brasoes = {} } = useQuery<Brasoes>({
    queryKey: ['cap-brasoes-aluno', profile?.institution_id],
    enabled: !!profile?.institution_id,
    queryFn: async () => {
      const { data } = await sb.from('inteligencias').select('id, brasao_url');
      const map: Brasoes = {};
      (data ?? []).forEach((i: any) => { map[i.id as number] = i.brasao_url ?? null; });
      return map;
    },
  });

  const { data: membrosDelegacoes = [] } = useQuery<MembroComAluno[]>({
    queryKey: ['cap-membros-aluno', capitulo?.id, turmaId],
    enabled: !!capitulo?.id && !!turmaId,
    queryFn: async () => {
      const { data } = await sb.from('capitulo_delegacao_membros').select(`
        id, delegacao_codigo,
        aluno:profiles!capitulo_delegacao_membros_aluno_id_fkey ( id, nome, full_name, avatar_url, casa_id )
      `).eq('capitulo_id', capitulo!.id).eq('turma_id', turmaId!);
      return (data as MembroComAluno[]) ?? [];
    },
  });

  const brasaoCapitulo = (faseAtual?.inteligencia as any)?.brasao_url
    ?? (faseAtual?.inteligencia?.id ? brasoes[faseAtual.inteligencia.id] : null)
    ?? casa?.brasao_url
    ?? null;

  const delegacoesAtivas = useMemo(() => {
    const codigos = new Set(turmaConfig?.delegacoes_ativas ?? []);
    return delegacoes.filter(d => codigos.has(d.codigo));
  }, [delegacoes, turmaConfig]);

  const minhaAlocacao = useMemo(
    () => alocacoes.find(a => a.aluno_id === user?.id),
    [alocacoes, user?.id]
  );

  const meuPapel = useMemo(
    () => minhaAlocacao ? papeis.find(p => p.id === minhaAlocacao.papel_id) ?? null : null,
    [minhaAlocacao, papeis]
  );

  const minhaDelegacao = useMemo(
    () => meuPapel?.delegacao ? delegacoes.find(d => d.codigo === meuPapel.delegacao) ?? null : null,
    [meuPapel, delegacoes]
  );

  // Detecta o formato TIMES (papéis com categoria 'time', ex.: Arena Arboria).
  const times = useMemo(
    () => papeis.filter(p => p.categoria === 'time').sort((a, b) => a.ordem - b.ordem),
    [papeis]
  );
  const ehTimes = times.length > 0;

  // Time do aluno: alocação real (papel_id aponta pra um papel 'time').
  const meuTimeReal = ehTimes && meuPapel?.categoria === 'time' ? meuPapel : null;
  // Prévia de localhost: sem alocação real, o 1º time (por ordem) faz de "seu time".
  const ehPreviewTime = F2_ALUNO_CAPITULO_PREVIEW && ehTimes && !meuTimeReal;
  const meuTime = meuTimeReal ?? (ehPreviewTime ? times[0] ?? null : null);

  // Destrava por alocação: só quem tem alocação real vê o capítulo TIMES.
  const temAlocacaoReal = !!minhaAlocacao;

  // Chave do "já viu as boas-vindas" (por capítulo + aluno).
  const chaveBoasVindas =
    capitulo?.id && user?.id ? `arboria_arena_boasvindas_v1_${capitulo.id}_${user.id}` : null;

  // AUTO-SURGE: com alocação REAL e sem ter visto ainda, a tela de boas-vindas
  // abre sozinha ao carregar. Na prévia (sem alocação) não auto-abre: o Fundador
  // usa o botão "?".
  useEffect(() => {
    if (!ehTimes || !temAlocacaoReal || !chaveBoasVindas) return;
    try {
      if (localStorage.getItem(chaveBoasVindas)) return;
    } catch {
      return;
    }
    setBoasVindasAberta(true);
  }, [ehTimes, temAlocacaoReal, chaveBoasVindas]);

  const fecharBoasVindas = () => {
    if (chaveBoasVindas) {
      try {
        localStorage.setItem(chaveBoasVindas, '1');
      } catch {
        /* localStorage indisponível: apenas fecha */
      }
    }
    setBoasVindasAberta(false);
  };

  const dias = calcularDias(turmaConfig?.data_evento ?? null);

  if (loadingStudent || loadingCap) {
    return (
      <div className="flex justify-center pt-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-200/40" />
      </div>
    );
  }

  if (!capitulo) {
    return (
      <div className="text-center pt-16 px-6">
        <div className="text-xs tracking-[0.4em] uppercase text-white/30 mb-3">Capítulo</div>
        <h2 className="font-serif text-xl text-white/70">Aguardando o próximo capítulo</h2>
        <p className="text-sm text-white/40 mt-3 max-w-xs mx-auto">
          Quando a próxima fase começar, o Grande Projeto aparece aqui.
        </p>
      </div>
    );
  }

  // Acento dos cards = cor da casa (Hero NÃO usa: mantém estilo original)
  const accentColor = casaColor || '#a78bfa';
  const accentRgb = hexToRgb(accentColor) || '167, 139, 250';
  const scifiVars = { '--sf-accent': accentColor, '--sf-accent-rgb': accentRgb } as CSSProperties;

  // GATE (só formato TIMES): sem alocação real e fora da prévia, o aluno vê a tela
  // de espera. A prévia do Fundador sobrepõe a destrava, para ele conseguir ver.
  if (ehTimes && !temAlocacaoReal && !F2_ALUNO_CAPITULO_PREVIEW) {
    return (
      <div className="scifi -mx-4 px-4 pt-16" style={scifiVars}>
        <div className="text-center px-2">
          <div className="text-xs tracking-[0.4em] uppercase text-white/30 mb-3">Capítulo</div>
          <h2 className="font-serif text-xl text-white/70 mb-4">Aguardando liberação do professor</h2>
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-5 text-center max-w-xs mx-auto">
          <p className="text-sm text-white/60 leading-relaxed">
            Seu professor vai te alocar em um time. Quando isso acontecer, a Arena abre aqui pra você.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="scifi relative space-y-10 pb-8 -mx-4 px-4" style={scifiVars}>

      {/* Botão "?" · reabre a tela de boas-vindas da Arena (só no formato TIMES com time) */}
      {ehTimes && meuTime && (
        <button
          onClick={() => setBoasVindasAberta(true)}
          aria-label="Sobre a Arena"
          className="absolute top-2 right-2 z-10 p-2 rounded-full text-white/50 hover:text-white/80 hover:bg-white/[0.06] transition"
        >
          <HelpCircle className="w-5 h-5" />
        </button>
      )}

      {/* ============ STAGE 1 · HERO ============ */}
      <Hero
        capitulo={capitulo}
        brasaoUrl={brasaoCapitulo}
        casaColor={casaColor}
        dataEvento={turmaConfig?.data_evento ?? null}
        dias={dias}
        faseNome={faseAtual?.inteligencia?.nome ?? null}
      />

      {/* ============ STAGE 2 · A TRETA ============ */}
      <Treta capitulo={capitulo} />

      {ehTimes ? (
        <>
          {/* ============ SOBRE A ARENA ============ */}
          <SobreArena />

          {/* ============ STAGE 3 · SEU TIME ============ */}
          <SeuTime
            time={meuTime}
            ehPreview={ehPreviewTime}
            onAbrirGuia={() => meuTime && setPapelAberto(meuTime)}
          />

          {/* ============ STAGE 4 · OS TIMES ============ */}
          <OsTimes
            times={times}
            alocacoes={alocacoes}
            brasoes={brasoes}
            meuTimeId={meuTime?.id ?? null}
            onAbrirGuia={(p) => setPapelAberto(p)}
          />
        </>
      ) : (
        <>
          {/* ============ STAGE 3 · VOCÊ ============ */}
          <SeuPapel
            papel={meuPapel}
            delegacao={minhaDelegacao}
            casaColor={casaColor}
            onAbrirGuia={() => meuPapel && setPapelAberto(meuPapel)}
          />

          {/* ============ STAGE 4 · ELENCO ============ */}
          <Elenco
            papeis={papeis}
            alocacoes={alocacoes}
            delegacoes={delegacoesAtivas}
            membrosDelegacoes={membrosDelegacoes}
            brasoes={brasoes}
            onAbrirGuia={(p) => setPapelAberto(p)}
            onAbrirDelegacao={(d) => setDelegacaoAberta(d)}
            meuId={user?.id ?? null}
          />
        </>
      )}

      {/* ============ STAGE 5 · O DIA ============ */}
      <ODia capitulo={capitulo} />

      {/* ============ DRAWER · GUIA DA FUNÇÃO ============ */}
      <Drawer open={!!papelAberto} onOpenChange={(o) => !o && setPapelAberto(null)}>
        <DrawerContent className="bg-[#1A1A2E] border-white/10 text-white max-h-[92vh]">
          {papelAberto && (
            <GuiaConteudo
              papel={papelAberto}
              delegacoes={delegacoes}
              ehMeuTime={!!meuTime && papelAberto.id === meuTime.id}
            />
          )}
        </DrawerContent>
      </Drawer>

      {/* ============ DRAWER · GUIA DA DELEGAÇÃO ============ */}
      <Drawer open={!!delegacaoAberta} onOpenChange={(o) => !o && setDelegacaoAberta(null)}>
        <DrawerContent className="bg-[#1A1A2E] border-white/10 text-white max-h-[92vh]">
          {delegacaoAberta && <GuiaConteudoDelegacao delegacao={delegacaoAberta} />}
        </DrawerContent>
      </Drawer>

      {/* ============ OVERLAY · BOAS-VINDAS DA ARENA (formato TIMES) ============ */}
      {ehTimes && meuTime && boasVindasAberta && (
        <ArenaBoasVindas
          capituloNome={capitulo.nome}
          timeNome={meuTime.nome}
          timeDescricao={meuTime.descricao_curta}
          casaColor={accentColor}
          onFechar={fecharBoasVindas}
        />
      )}
    </div>
  );
};

// ============================================
// HERO
// ============================================
const Hero = ({
  capitulo, brasaoUrl, casaColor, dataEvento, dias, faseNome
}: {
  capitulo: Capitulo;
  brasaoUrl: string | null;
  casaColor: string;
  dataEvento: string | null;
  dias: number | null;
  faseNome: string | null;
}) => (
  <section
    className="relative overflow-hidden -mx-4 px-6 pt-10 pb-12"
    style={{
      background: `radial-gradient(ellipse at center top, ${casaColor}22 0%, #0F0F1E 70%)`,
    }}
  >
    {/* medalha brasão */}
    <div className="flex justify-center mb-5">
      <div
        className="w-24 h-24 rounded-full flex items-center justify-center"
        style={{
          background: `radial-gradient(circle, ${casaColor}33 0%, transparent 70%)`,
          boxShadow: `inset 0 0 0 1px ${casaColor}55, 0 0 30px ${casaColor}33`,
        }}
      >
        {brasaoUrl ? (
          <img src={brasaoUrl} alt="Brasão" className="w-16 h-16 object-contain" />
        ) : (
          <div className="text-3xl font-serif text-white/40">A</div>
        )}
      </div>
    </div>

    {/* tag */}
    <div className="text-center text-[10px] tracking-[0.4em] uppercase text-white/50 mb-3">
      Capítulo {String(capitulo.numero).padStart(2, '0')}{faseNome ? ` · Fase ${faseNome}` : ''}
    </div>

    {/* título */}
    <h1 className="text-center font-serif text-3xl leading-tight text-white">
      {capitulo.nome}
    </h1>

    {/* frase âncora */}
    {capitulo.frase_ancora && (
      <p
        className="text-center font-serif italic text-base mt-4 mx-auto max-w-xs leading-relaxed"
        style={{ color: casaColor }}
      >
        {capitulo.frase_ancora}
      </p>
    )}

    {/* contagem regressiva / data */}
    {(dataEvento || dias !== null) && (
      <div className="flex items-center justify-center gap-2 mt-6 text-xs text-white/60">
        <Calendar className="w-3.5 h-3.5" />
        {dias !== null && dias > 0 && (
          <span>Faltam <span className="text-white font-semibold">{dias}</span> {dias === 1 ? 'dia' : 'dias'}</span>
        )}
        {dias === 0 && <span className="text-amber-300 font-semibold tracking-wider">É HOJE</span>}
        {dias !== null && dias < 0 && <span>Encerrado</span>}
        {dataEvento && <span className="text-white/30">·</span>}
        {dataEvento && <span>{formatarData(dataEvento)}</span>}
      </div>
    )}
  </section>
);

// ============================================
// STAGE 2 · A TRETA
// ============================================
const Treta = ({ capitulo }: { capitulo: Capitulo }) => {
  if (!capitulo.briefing_chamada && !capitulo.briefing_o_que_aconteceu) return null;
  return (
    <section>
      <div className="text-[10px] tracking-[0.4em] uppercase text-white/40 mb-3">
        Parte 1 · Qual é a treta
      </div>
      {capitulo.briefing_chamada && (
        <h2 className="font-serif text-2xl leading-snug text-white mb-5">
          {capitulo.briefing_chamada}
        </h2>
      )}

      {capitulo.briefing_o_que_aconteceu && (
        <BlocoBriefing
          tag={capitulo.tema_curto || 'O QUE ACONTECEU'}
          itens={capitulo.briefing_o_que_aconteceu}
        />
      )}
      {capitulo.briefing_porque_importa && (
        <div className="mt-4">
          <BlocoBriefing tag="E AÍ, POR QUÊ?" itens={capitulo.briefing_porque_importa} variante="alt" />
        </div>
      )}
    </section>
  );
};

const BlocoBriefing = ({ tag, itens, variante }: { tag: string; itens: string[]; variante?: 'alt' }) => (
  <div
    data-augmented-ui="tl-clip tr-clip bl-clip br-clip border"
    className="sf-panel p-4"
    style={variante === 'alt' ? { ['--aug-border-bg' as string]: 'rgba(252, 211, 77, 0.35)' } : undefined}
  >
    <div className="text-[10px] tracking-[0.3em] uppercase text-amber-200/60 mb-3">{tag}</div>
    <ul className="space-y-2.5">
      {itens.map((it, i) => (
        <li key={i} className="text-sm text-white/85 flex gap-2 leading-relaxed">
          <span className="text-amber-200/40 mt-0.5">▸</span>
          <span>{it}</span>
        </li>
      ))}
    </ul>
  </div>
);

// ============================================
// STAGE 3 · VOCÊ
// ============================================
const SeuPapel = ({
  papel, delegacao, casaColor, onAbrirGuia
}: {
  papel: Papel | null;
  delegacao: Delegacao | null;
  casaColor: string;
  onAbrirGuia: () => void;
}) => {
  if (!papel) {
    return (
      <section>
        <div className="text-[10px] tracking-[0.4em] uppercase text-white/40 mb-3">Você</div>
        <div data-augmented-ui="tl-clip tr-clip bl-clip br-clip border" className="sf-panel p-5 text-center">
          <p className="text-sm text-white/60">
            Você ainda não foi convocado.
          </p>
          <p className="text-xs text-white/40 mt-1">
            Seu professor vai te alocar em uma função.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="text-[10px] tracking-[0.4em] uppercase text-white/40 mb-3">Você</div>
      <button
        onClick={onAbrirGuia}
        data-augmented-ui="tl-clip tr-clip bl-clip br-clip border"
        className="sf-panel sf-accent-border w-full text-left p-5 transition"
      >
        <div className="text-[10px] tracking-[0.3em] uppercase text-white/40 mb-2">
          {papel.time_label || 'Sua função'}
        </div>
        <div className="font-serif text-2xl text-white leading-tight">{papel.nome}</div>
        {delegacao && (
          <div className="text-sm mt-1.5" style={{ color: casaColor }}>
            Delegação {delegacao.nome}
          </div>
        )}
        {papel.descricao_curta && (
          <p className="text-sm text-white/75 mt-3 leading-relaxed italic font-serif">
            “{papel.descricao_curta}”
          </p>
        )}
        <div className="flex items-center gap-1 mt-4 text-xs text-amber-200/70">
          <ScrollText className="w-3.5 h-3.5" />
          <span>Abrir guia da função</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </div>
      </button>
    </section>
  );
};

// ============================================
// STAGE 4 · ELENCO
// ============================================
const Elenco = ({
  papeis, alocacoes, delegacoes, membrosDelegacoes, brasoes, onAbrirGuia, onAbrirDelegacao, meuId
}: {
  papeis: Papel[];
  alocacoes: AlocacaoComAluno[];
  delegacoes: Delegacao[];
  membrosDelegacoes: MembroComAluno[];
  brasoes: Brasoes;
  onAbrirGuia: (p: Papel) => void;
  onAbrirDelegacao: (d: Delegacao) => void;
  meuId: string | null;
}) => {
  const alocPorPapel = useMemo(() => {
    const m: Record<string, AlocacaoComAluno[]> = {};
    alocacoes.forEach(a => {
      if (!m[a.papel_id]) m[a.papel_id] = [];
      m[a.papel_id].push(a);
    });
    return m;
  }, [alocacoes]);

  const time2Mesa = papeis.filter(p => p.categoria === 'mesa');
  const time2Med = papeis.filter(p => p.categoria === 'mediador');
  const time2Obs = papeis.filter(p => p.categoria === 'observatorio');

  return (
    <section>
      <div className="text-[10px] tracking-[0.4em] uppercase text-white/40 mb-3 flex items-center gap-2">
        <Users className="w-3 h-3" /> Parte 2 · O elenco
      </div>

      <div
        data-augmented-ui="tl-clip br-clip border"
        className="sf-card px-3.5 py-2.5 mb-5 flex items-start gap-2.5"
        style={{ ['--aug-border-bg' as string]: 'rgba(252, 211, 77, 0.35)' }}
      >
        <BookOpen className="w-3.5 h-3.5 text-amber-200/80 mt-0.5 flex-shrink-0" />
        <p className="text-[12px] text-white/75 leading-relaxed">
          <span className="text-amber-200/90 font-semibold">Toque em qualquer função</span> para abrir o guia completo: o que você faz, como fazer e exemplos de fala.
        </p>
      </div>

      {/* TIME 2. MESA */}
      <SubHeader>Mesa Diretora</SubHeader>
      <GradeRetabulo>
        {time2Mesa.map(p => (
          <CardElenco key={p.id} papel={p} alocacoes={alocPorPapel[p.id] || []} brasoes={brasoes} onClick={() => onAbrirGuia(p)} meuId={meuId} />
        ))}
      </GradeRetabulo>

      {/* TIME 2. MEDIADORES */}
      {time2Med.length > 0 && (
        <>
          <SubHeader>Mediadores</SubHeader>
          {time2Med.map(p => (
            <SlotsLista key={p.id} papel={p} alocacoes={alocPorPapel[p.id] || []} brasoes={brasoes} onClick={() => onAbrirGuia(p)} meuId={meuId} />
          ))}
        </>
      )}

      {/* TIME 2. OBSERVATÓRIO */}
      {time2Obs.length > 0 && (
        <>
          <SubHeader>Observatório</SubHeader>
          {time2Obs.map(p => (
            <SlotsLista key={p.id} papel={p} alocacoes={alocPorPapel[p.id] || []} brasoes={brasoes} onClick={() => onAbrirGuia(p)} meuId={meuId} />
          ))}
        </>
      )}

      {/* TIME 1. DELEGAÇÕES */}
      {delegacoes.length > 0 && (
        <>
          <SubHeader>Delegações</SubHeader>
          <p className="text-[11px] text-white/45 leading-relaxed -mt-1 mb-3 italic">
            Toque no nome da delegação para abrir o guia (quem são, o que defendem, o que não cedem) e baixar o PDF de apoio.
          </p>
          <div className="space-y-3">
            {delegacoes.map(deleg => {
              const papeisDeleg = papeis
                .filter(p => p.categoria === 'delegacao' && p.delegacao === deleg.codigo)
                .sort((a, b) => a.ordem - b.ordem);
              const membrosDeleg = membrosDelegacoes.filter(m => m.delegacao_codigo === deleg.codigo);
              return (
                <div key={deleg.id} data-augmented-ui="tl-clip tr-clip bl-clip br-clip border" className="sf-panel p-4">
                  <button
                    onClick={() => onAbrirDelegacao(deleg)}
                    className="group flex items-center gap-1.5 text-left"
                  >
                    <span className="text-sm font-serif text-amber-200/90 group-hover:text-amber-200 transition">
                      {deleg.nome}
                    </span>
                    <BookOpen className="w-3 h-3 text-amber-200/50 group-hover:text-amber-200/80 transition" />
                    <ChevronRight className="w-3 h-3 text-amber-200/40 group-hover:text-amber-200/70 group-hover:translate-x-0.5 transition" />
                  </button>
                  {deleg.objetivo && (
                    <div className="text-[11px] text-white/50 mt-1 leading-snug">{deleg.objetivo}</div>
                  )}

                  {/* Membros da delegação */}
                  {membrosDeleg.length > 0 && (
                    <div className="mt-3">
                      <div className="text-[10px] tracking-[0.25em] uppercase text-white/40 mb-1.5">
                        Membros · {membrosDeleg.length}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {membrosDeleg.map(m => {
                          const eh_meu = m.aluno?.id === meuId;
                          return (
                            <span
                              key={m.id}
                              className={cn(
                                'inline-flex items-center gap-1.5 pl-1 pr-2 py-0.5 rounded-full text-[11px]',
                                eh_meu ? 'bg-amber-200/15 ring-1 ring-amber-200/30 text-white' : 'bg-white/[0.04] text-white/85'
                              )}
                            >
                              <Avatar
                                nome={nomeAluno(m.aluno)}
                                url={m.aluno?.avatar_url ?? null}
                                brasao={m.aluno?.casa_id ? brasoes[m.aluno.casa_id] : null}
                                pequeno
                              />
                              {nomeESobrenome(m.aluno)}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Papéis da delegação */}
                  <div className="mt-3">
                    {membrosDeleg.length > 0 && (
                      <div className="text-[10px] tracking-[0.25em] uppercase text-white/40 mb-1.5">Papéis</div>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      {papeisDeleg.map(p => {
                        const alocs = alocPorPapel[p.id] || [];
                        const al = alocs[0];
                        return (
                          <button
                            key={p.id}
                            onClick={() => onAbrirGuia(p)}
                            className={cn(
                              'flex items-center gap-2 p-2 rounded-lg transition text-left',
                              al?.aluno_id === meuId
                                ? 'bg-amber-200/10 ring-1 ring-amber-200/30'
                                : 'bg-white/[0.03] hover:bg-white/[0.07]'
                            )}
                          >
                            <Avatar
                              nome={al ? nomeAluno(al.aluno) : '·'}
                              url={al?.aluno?.avatar_url ?? null}
                              brasao={al?.aluno?.casa_id ? brasoes[al.aluno.casa_id] : null}
                              vazio={!al}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="text-[10px] tracking-wide uppercase text-white/40 leading-none mb-0.5">{p.nome}</div>
                              <div className="text-[12px] text-white/85 leading-tight break-words">
                                {al ? nomeESobrenome(al.aluno) : <span className="text-white/30 italic">vaga aberta</span>}
                              </div>
                              <div className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded-full bg-amber-200/15 ring-1 ring-amber-200/30">
                                <Info className="w-2.5 h-2.5 text-amber-200/90" />
                                <span className="text-[9px] font-semibold text-amber-100 tracking-wide">Saiba mais</span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
};

const SubHeader = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-[11px] tracking-[0.3em] uppercase text-white/55 mt-5 mb-2.5">{children}</h3>
);

const GradeRetabulo = ({ children }: { children: React.ReactNode }) => (
  <div className="grid grid-cols-3 gap-2">{children}</div>
);

const CardElenco = ({
  papel, alocacoes, brasoes, onClick, meuId
}: {
  papel: Papel; alocacoes: AlocacaoComAluno[]; brasoes: Brasoes; onClick: () => void; meuId: string | null;
}) => {
  const al = alocacoes[0];
  const eh_meu = al?.aluno_id === meuId;
  return (
    <button
      onClick={onClick}
      data-augmented-ui="tl-clip br-clip border"
      className={cn(
        'sf-card flex flex-col items-center gap-2 p-3 transition text-center',
        eh_meu && 'sf-accent-border'
      )}
    >
      <Avatar
        nome={al ? nomeAluno(al.aluno) : '·'}
        url={al?.aluno?.avatar_url ?? null}
        brasao={al?.aluno?.casa_id ? brasoes[al.aluno.casa_id] : null}
        vazio={!al}
        grande
      />
      <div className="text-[10px] tracking-wide uppercase text-white/40 leading-none">{papel.nome}</div>
      <div className="text-[12px] text-white/85 leading-tight line-clamp-2 break-words">
        {al ? nomeESobrenome(al.aluno) : <span className="text-white/30 italic">vaga aberta</span>}
      </div>
      <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-amber-200/15 ring-1 ring-amber-200/30">
        <Info className="w-2.5 h-2.5 text-amber-200/90" />
        <span className="text-[9px] font-semibold text-amber-100 tracking-wide">Saiba mais</span>
      </div>
    </button>
  );
};

const SlotsLista = ({
  papel, alocacoes, brasoes, onClick, meuId
}: {
  papel: Papel; alocacoes: AlocacaoComAluno[]; brasoes: Brasoes; onClick: () => void; meuId: string | null;
}) => {
  const ilimitado = papel.vagas_por_turma > 30;
  const slotsCount = ilimitado ? alocacoes.length : papel.vagas_por_turma;
  const slots = Array.from({ length: slotsCount }).map((_, i) => alocacoes[i] ?? null);
  return (
    <div data-augmented-ui="tl-clip tr-clip bl-clip br-clip border" className="sf-panel p-3 mb-2">
      <button onClick={onClick} className="group w-full flex items-center justify-between mb-2.5">
        <span className="flex items-center gap-1.5 text-[11px] tracking-[0.2em] uppercase text-amber-200/90 group-hover:text-amber-200 transition">
          <ScrollText className="w-3 h-3" />
          {papel.nome}
          {ilimitado
            ? alocacoes.length > 0 && <span className="text-white/40 normal-case tracking-normal ml-0.5">· {alocacoes.length}</span>
            : <span className="text-white/40 normal-case tracking-normal ml-0.5">· {papel.vagas_por_turma} vagas</span>}
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-200/15 ring-1 ring-amber-200/30 group-hover:bg-amber-200/25 transition">
          <Info className="w-2.5 h-2.5 text-amber-200/90" />
          <span className="text-[9px] font-semibold text-amber-100 tracking-wide normal-case">Saiba mais</span>
        </span>
      </button>
      {ilimitado && alocacoes.length === 0 && (
        <div className="text-[11px] text-white/30 italic py-1">Ainda sem ninguém alocado.</div>
      )}
      <div className="grid grid-cols-4 gap-2">
        {slots.map((al, i) => (
          <div
            key={i}
            className={cn(
              'flex flex-col items-center p-1.5 rounded-md',
              al?.aluno_id === meuId ? 'bg-amber-200/10 ring-1 ring-amber-200/30' : ''
            )}
          >
            <Avatar
              nome={al ? nomeAluno(al.aluno) : '·'}
              url={al?.aluno?.avatar_url ?? null}
              brasao={al?.aluno?.casa_id ? brasoes[al.aluno.casa_id] : null}
              vazio={!al}
              pequeno
            />
            <div className="text-[10px] text-white/70 mt-1 leading-tight w-full text-center break-words">
              {al ? nomeESobrenome(al.aluno) : <span className="text-white/25 italic">vaga</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const Avatar = ({
  nome, url, brasao, vazio, grande, pequeno
}: { nome: string; url: string | null; brasao?: string | null; vazio?: boolean; grande?: boolean; pequeno?: boolean }) => {
  const size = grande ? 'w-12 h-12 text-sm' : pequeno ? 'w-8 h-8 text-[10px]' : 'w-9 h-9 text-xs';
  return (
    <div className={cn(
      'rounded-full flex items-center justify-center overflow-hidden font-semibold',
      size,
      vazio
        ? 'bg-white/[0.04] text-white/20 border border-dashed border-white/10'
        : 'bg-amber-200/10 text-amber-200/80'
    )}>
      {vazio ? (
        '+'
      ) : url ? (
        <img src={url} alt={nome} className="w-full h-full object-cover" />
      ) : brasao ? (
        <img src={brasao} alt={nome} className="w-full h-full object-contain p-[1px]" />
      ) : (
        iniciais(nome)
      )}
    </div>
  );
};

// ============================================
// SOBRE A ARENA (formato TIMES)
// ============================================
// ATENÇÃO: este conteúdo está hard-coded só para este rascunho da Arena Arboria.
// Depois isto deve vir do banco por capítulo (campo próprio do capítulo TIMES);
// NÃO é genérico para todo capítulo de TIMES, é específico da Arena.
const SobreArena = () => (
  <section>
    <div className="text-[10px] tracking-[0.4em] uppercase text-white/40 mb-3">
      A Arena
    </div>

    <p className="text-sm text-white/80 leading-relaxed mb-4">
      A Arena Arboria é uma competição de projetos. Seu time escolhe um tema, cria um projeto e, no dia da Arena, prova para todos que ele funciona.
    </p>

    <div data-augmented-ui="tl-clip tr-clip bl-clip br-clip border" className="sf-panel p-4">
      <div className="text-[10px] tracking-[0.3em] uppercase text-amber-200/70 mb-3">
        Até o dia da apresentação
      </div>
      <ol className="space-y-2.5 list-none">
        {[
          'Escolham o tema e montem o time.',
          'Criem o projeto do jeito de vocês. O formato e a apresentação são livres.',
          'Testem e ajustem até a ideia se provar.',
          'No dia, subam na Arena e apresentem.',
        ].map((passo, i) => (
          <li key={i} className="text-[13px] text-white/80 flex gap-2 leading-relaxed">
            <span className="text-amber-200/50 font-mono text-[11px] mt-0.5">{i + 1}.</span>
            <span>{passo}</span>
          </li>
        ))}
      </ol>
    </div>

    {/* Bloco DESTACADO · premiação (ponto que o Fundador quer ressaltar) */}
    <div
      data-augmented-ui="tl-clip tr-clip bl-clip br-clip border"
      className="sf-panel mt-4 p-4"
      style={{ ['--aug-border-bg' as string]: 'rgba(252, 211, 77, 0.35)' }}
    >
      <div className="text-[10px] tracking-[0.3em] uppercase text-amber-200/70 mb-2">
        A premiação
      </div>
      <p className="text-sm text-white/85 leading-relaxed">
        O melhor projeto ganha uma premiação.
      </p>
      <p className="text-sm text-white/85 leading-relaxed mt-2">
        A disputa tem duas etapas: primeiro entre as equipes da sua sala, depois entre os melhores de cada sala, até a escola ter um projeto vencedor.
      </p>
      <p className="text-sm text-white/85 leading-relaxed mt-2">
        O vencedor sai da nota do professor mentor, ponderada pelos votos dos pais e dos alunos.
      </p>
    </div>
  </section>
);

// ============================================
// STAGE 3 (TIMES) · SEU TIME
// ============================================
const SeuTime = ({
  time, ehPreview, onAbrirGuia
}: {
  time: Papel | null;
  ehPreview: boolean;
  onAbrirGuia: () => void;
}) => {
  if (!time) {
    return (
      <section>
        <div className="text-[10px] tracking-[0.4em] uppercase text-white/40 mb-3">Você</div>
        <div data-augmented-ui="tl-clip tr-clip bl-clip br-clip border" className="sf-panel p-5 text-center">
          <p className="text-sm text-white/60">
            Você ainda não foi convocado.
          </p>
          <p className="text-xs text-white/40 mt-1">
            Seu professor vai te alocar em um time.
          </p>
        </div>
      </section>
    );
  }

  const pdf = pdfDoTime(time.ordem);

  return (
    <section>
      <div className="text-[10px] tracking-[0.4em] uppercase text-white/40 mb-3 flex items-center gap-2">
        <span>Seu time</span>
        {ehPreview && (
          <span className="px-1.5 py-0.5 rounded-full bg-amber-200/15 ring-1 ring-amber-200/30 text-[9px] tracking-[0.2em] text-amber-100 normal-case">
            prévia
          </span>
        )}
      </div>
      <button
        onClick={onAbrirGuia}
        data-augmented-ui="tl-clip tr-clip bl-clip br-clip border"
        className="sf-panel sf-accent-border w-full text-left p-5 transition"
      >
        <div className="text-[10px] tracking-[0.3em] uppercase text-white/40 mb-2">
          {time.time_label || 'Seu time'}
        </div>
        <div className="font-serif text-2xl text-white leading-tight">{time.nome}</div>
        {time.descricao_curta && (
          <p className="text-sm text-white/75 mt-3 leading-relaxed italic font-serif">
            {time.descricao_curta}
          </p>
        )}
        <div className="flex items-center gap-1 mt-4 text-xs text-amber-200/70">
          <ScrollText className="w-3.5 h-3.5" />
          <span>Abrir guia do time</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </div>
      </button>

      {pdf && (
        <a
          href={pdf}
          download
          target="_blank"
          rel="noopener noreferrer"
          data-augmented-ui="tl-clip br-clip border"
          className="sf-exec mt-3 flex items-center justify-center gap-2 px-4 py-3 transition"
        >
          <Download className="w-4 h-4" />
          <span className="text-sm font-medium">Baixar guia do time</span>
        </a>
      )}
    </section>
  );
};

// ============================================
// STAGE 4 (TIMES) · OS TIMES
// ============================================
const OsTimes = ({
  times, alocacoes, brasoes, meuTimeId, onAbrirGuia
}: {
  times: Papel[];
  alocacoes: AlocacaoComAluno[];
  brasoes: Brasoes;
  meuTimeId: string | null;
  onAbrirGuia: (p: Papel) => void;
}) => {
  const alocPorPapel = useMemo(() => {
    const m: Record<string, AlocacaoComAluno[]> = {};
    alocacoes.forEach(a => {
      if (!m[a.papel_id]) m[a.papel_id] = [];
      m[a.papel_id].push(a);
    });
    return m;
  }, [alocacoes]);

  return (
    <section>
      <div className="text-[10px] tracking-[0.4em] uppercase text-white/40 mb-3 flex items-center gap-2">
        <Users className="w-3 h-3" /> Parte 2 · Os times
      </div>

      <div
        data-augmented-ui="tl-clip br-clip border"
        className="sf-card px-3.5 py-2.5 mb-5 flex items-start gap-2.5"
        style={{ ['--aug-border-bg' as string]: 'rgba(252, 211, 77, 0.35)' }}
      >
        <BookOpen className="w-3.5 h-3.5 text-amber-200/80 mt-0.5 flex-shrink-0" />
        <p className="text-[12px] text-white/75 leading-relaxed">
          <span className="text-amber-200/90 font-semibold">Toque no seu time</span> para abrir o guia.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {times.map(t => (
          <CardTime
            key={t.id}
            time={t}
            alocacoes={alocPorPapel[t.id] || []}
            brasoes={brasoes}
            ehMeu={t.id === meuTimeId}
            onClick={() => onAbrirGuia(t)}
          />
        ))}
      </div>
    </section>
  );
};

// Regra "só o seu time": só o card do time do aluno (ehMeu) abre o guia e mostra
// a descrição/chevron. Os demais times aparecem apenas como nome + avatares +
// contagem, sem ação (renderizados como <div>, não clicáveis).
const CardTime = ({
  time, alocacoes, brasoes, ehMeu, onClick
}: {
  time: Papel; alocacoes: AlocacaoComAluno[]; brasoes: Brasoes; ehMeu: boolean; onClick: () => void;
}) => {
  const ilimitado = time.vagas_por_turma > 30;
  const total = time.vagas_por_turma;

  const contagemEAvatares = (
    <div className="mt-auto pt-3 flex flex-col items-center gap-2">
      <div className="flex items-center justify-center min-h-[2rem]">
        {alocacoes.length === 0 ? (
          <span className="text-[11px] text-white/30">Vagas abertas</span>
        ) : (
          <div className="flex items-center -space-x-1.5">
            {alocacoes.slice(0, 3).map(a => (
              <div key={a.id} className="rounded-full ring-2 ring-[#1A1A2E]">
                <Avatar
                  nome={nomeAluno(a.aluno)}
                  url={a.aluno?.avatar_url ?? null}
                  brasao={a.aluno?.casa_id ? brasoes[a.aluno.casa_id] : null}
                  pequeno
                />
              </div>
            ))}
            {alocacoes.length > 3 && (
              <div className="w-8 h-8 rounded-full ring-2 ring-[#1A1A2E] bg-white/[0.06] flex items-center justify-center text-[10px] text-white/60">
                +{alocacoes.length - 3}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center justify-center gap-1.5">
        <div className="text-[10px] tracking-wide uppercase text-white/45">
          {ilimitado ? (
            <><span className="text-white/80 font-semibold">{alocacoes.length}</span> no time</>
          ) : (
            <><span className="text-white/80 font-semibold">{alocacoes.length}</span> / {total} vagas</>
          )}
        </div>
        {ehMeu && <ChevronRight className="w-3.5 h-3.5 text-amber-200/50 flex-shrink-0" />}
      </div>
    </div>
  );

  // Card dos OUTROS times: só nome + avatares + contagem, sem ação.
  if (!ehMeu) {
    return (
      <div
        data-augmented-ui="tl-clip tr-clip bl-clip br-clip border"
        className="sf-panel w-full h-full flex flex-col p-3.5 min-h-[128px]"
      >
        <h4 className="font-serif text-[15px] text-white text-center leading-snug line-clamp-2 min-h-[2.6em]">
          {time.nome}
        </h4>
        {contagemEAvatares}
      </div>
    );
  }

  // Card do SEU time: completo e clicável (abre o guia).
  return (
    <button
      onClick={onClick}
      data-augmented-ui="tl-clip tr-clip bl-clip br-clip border"
      className="sf-panel sf-accent-border w-full h-full flex flex-col p-3.5 min-h-[128px] transition"
    >
      <span className="self-center mb-2 px-1.5 py-0.5 rounded-full bg-amber-200/15 ring-1 ring-amber-200/30 text-[9px] font-semibold tracking-[0.15em] text-amber-100">
        SEU TIME
      </span>

      <h4 className="font-serif text-[15px] text-white text-center leading-snug line-clamp-2 min-h-[2.6em]">
        {time.nome}
      </h4>

      <p className="text-[11.5px] text-white/60 text-center mt-1 leading-snug line-clamp-2 min-h-[2.4em]">
        {time.descricao_curta}
      </p>

      {contagemEAvatares}
    </button>
  );
};

// ============================================
// STAGE 5 · O DIA
// ============================================
const ODia = ({ capitulo }: { capitulo: Capitulo }) => {
  if (!capitulo.fases_assembleia || capitulo.fases_assembleia.length === 0) return null;
  return (
    <section>
      <div className="text-[10px] tracking-[0.4em] uppercase text-white/40 mb-3">
        Parte 3 · O dia da Assembleia
      </div>
      <div data-augmented-ui="tl-clip tr-clip bl-clip br-clip border" className="sf-panel p-4">
        <div className="space-y-3">
          {capitulo.fases_assembleia.map((f) => (
            <div key={f.numero} className="flex gap-3">
              <div className="flex flex-col items-center pt-0.5">
                <div className="w-6 h-6 rounded-full bg-amber-200/10 ring-1 ring-amber-200/30 flex items-center justify-center text-[10px] font-semibold text-amber-200/80">
                  {f.numero}
                </div>
                {f.numero < capitulo.fases_assembleia!.length && (
                  <div className="w-px flex-1 bg-white/10 my-1" />
                )}
              </div>
              <div className="flex-1 pb-2">
                <div className="flex items-baseline gap-2">
                  <h4 className="text-sm font-serif text-white">{f.nome}</h4>
                  <span className="text-[10px] text-amber-200/60">{f.duracao_min} min</span>
                </div>
                <p className="text-[12px] text-white/55 mt-0.5 leading-snug">{f.descricao}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Traje do dia */}
      <div data-augmented-ui="tl-clip tr-clip bl-clip br-clip border" className="sf-panel mt-4 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Shirt className="w-4 h-4 text-amber-200/80" />
          <div className="text-[10px] tracking-[0.3em] uppercase text-amber-200/70">O que vestir</div>
        </div>
        <p className="text-[13px] text-white/70 leading-relaxed">
          Veja o aviso com os trajes permitidos para o dia da Assembleia.
        </p>
        <a
          href="/docs/aviso-traje-assembleia.pdf"
          download
          data-augmented-ui="tl-clip br-clip border"
          className="sf-exec mt-3 flex items-center justify-center gap-2 px-4 py-3 transition"
        >
          <Download className="w-4 h-4" />
          <span className="text-sm font-medium">Baixar aviso de trajes</span>
        </a>
      </div>

      {capitulo.regra_de_ouro && (
        <div
          data-augmented-ui="tl-clip tr-clip bl-clip br-clip border"
          className="sf-panel mt-4 p-4"
          style={{ ['--aug-border-bg' as string]: 'rgba(252, 211, 77, 0.35)' }}
        >
          <div className="text-[10px] tracking-[0.3em] uppercase text-amber-200/70 mb-2">Regra de ouro</div>
          <p className="text-sm text-white/85 italic font-serif leading-relaxed">{capitulo.regra_de_ouro}</p>
        </div>
      )}
    </section>
  );
};

// ============================================
// DRAWER · GUIA DA FUNÇÃO
// ============================================
const GuiaConteudo = ({ papel, delegacoes, ehMeuTime = false }: { papel: Papel; delegacoes: Delegacao[]; ehMeuTime?: boolean }) => {
  const deleg = papel.delegacao ? delegacoes.find(d => d.codigo === papel.delegacao) : null;
  // Regra "só o seu time": o PDF de apoio só aparece para o time do próprio aluno.
  const pdfTime = papel.categoria === 'time' && ehMeuTime ? pdfDoTime(papel.ordem) : null;
  return (
    <>
      <DrawerHeader className="text-left border-b border-white/10">
        <div className="text-[10px] tracking-[0.3em] uppercase text-white/40 mb-1">
          {papel.time_label}
        </div>
        <DrawerTitle className="font-serif text-2xl text-white">{papel.nome}</DrawerTitle>
        {deleg && (
          <DrawerDescription className="text-amber-200/70 text-sm">
            Delegação {deleg.nome}
          </DrawerDescription>
        )}
        {papel.descricao_curta && (
          <p className="text-sm text-white/70 italic font-serif mt-2">“{papel.descricao_curta}”</p>
        )}
      </DrawerHeader>

      <div className="px-6 pb-10 pt-5 overflow-y-auto space-y-6">
        {/* Seção 01. Seu papel */}
        {papel.roteiro_papel && (
          <div>
            <div className="text-[10px] tracking-[0.3em] uppercase text-amber-200/70 mb-2">Seção 01 · Seu papel</div>
            <div className="text-[14px] text-white/80 leading-relaxed whitespace-pre-line">
              {papel.roteiro_papel}
            </div>
          </div>
        )}

        {/* Seção 02, Como fazer */}
        {papel.roteiro_como_fazer && papel.roteiro_como_fazer.length > 0 && (
          <div>
            <div className="text-[10px] tracking-[0.3em] uppercase text-amber-200/70 mb-3">Seção 02 · Como fazer</div>
            <div className="space-y-4">
              {papel.roteiro_como_fazer.map((bloco, i) => (
                <div key={i}>
                  <h5 className="text-[11px] tracking-wider uppercase text-white/60 mb-2">{bloco.titulo}</h5>
                  <ol className="space-y-1.5 list-none">
                    {bloco.passos.map((passo, j) => (
                      <li key={j} className="text-[13px] text-white/80 flex gap-2 leading-relaxed">
                        <span className="text-amber-200/50 font-mono text-[11px] mt-0.5">{j + 1}.</span>
                        <span>{passo}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Seção 03. Exemplos de fala */}
        {papel.roteiro_exemplos && papel.roteiro_exemplos.length > 0 && (
          <div>
            <div className="text-[10px] tracking-[0.3em] uppercase text-amber-200/70 mb-3">Seção 03 · Exemplos de fala</div>
            <div className="space-y-3">
              {papel.roteiro_exemplos.map((ex, i) => (
                <div key={i} className="rounded-md bg-amber-950/30 border-l-2 border-amber-200/40 pl-3 pr-3 py-2.5">
                  <div className="text-[10px] tracking-wider uppercase text-amber-200/70 mb-1">{ex.titulo}</div>
                  <p className="text-[13px] text-white/85 italic font-serif leading-relaxed">“{ex.fala}”</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Seção 04. Roteiro de falas, momento a momento */}
        {papel.roteiro_falas_cronologico && papel.roteiro_falas_cronologico.length > 0 && (
          <div>
            <div className="text-[10px] tracking-[0.3em] uppercase text-amber-200/70 mb-3 flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              Seção 04 · Roteiro de falas, momento a momento
            </div>
            <p className="text-[11px] text-white/50 leading-relaxed mb-4 italic">
              O que falar e <span className="text-amber-200/80">quando</span> falar. Siga em ordem cronológica durante a Assembleia.
            </p>
            <div className="space-y-5">
              {papel.roteiro_falas_cronologico.map((fase, fi) => (
                <div key={fi} className="rounded-lg border border-white/10 bg-white/[0.02] p-3.5">
                  <div className="mb-3 pb-2.5 border-b border-white/10">
                    <div className="text-[11px] font-semibold tracking-[0.15em] uppercase text-amber-200/90">
                      {fase.fase_nome}
                    </div>
                    <div className="text-[10px] text-white/45 mt-0.5">{fase.fase_intervalo}</div>
                  </div>
                  <div className="space-y-3.5">
                    {fase.momentos.map((m, mi) => (
                      <div key={mi} className="flex gap-2.5">
                        <div className="flex-shrink-0 pt-0.5">
                          <div className="inline-flex items-center justify-center min-w-[3.5rem] px-1.5 py-0.5 rounded-md bg-amber-200/10 ring-1 ring-amber-200/20">
                            <span className="text-[10px] font-mono text-amber-200/90 tracking-tight">{m.tempo}</span>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[12px] font-medium text-white/90 leading-tight mb-1">
                            {m.titulo}
                          </div>
                          {m.instrucao && (
                            <p className="text-[11px] text-white/45 italic leading-relaxed mb-1.5">
                              {m.instrucao}
                            </p>
                          )}
                          <div className="rounded-md bg-amber-950/30 border-l-2 border-amber-200/50 pl-2.5 pr-2.5 py-1.5">
                            <p className="text-[12px] text-white/85 italic font-serif leading-relaxed">
                              “{m.fala}”
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PDF de apoio do time (formato TIMES) */}
        {pdfTime && (
          <div className="pt-2">
            <a
              href={pdfTime}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl bg-amber-200/15 hover:bg-amber-200/25 ring-1 ring-amber-200/40 px-4 py-3.5 text-amber-100 transition"
            >
              <Download className="w-4 h-4" />
              <span className="text-sm font-medium">Baixar guia do time</span>
            </a>
            <p className="text-[11px] text-white/40 text-center mt-2">
              PDF de apoio com o roteiro completo do time.
            </p>
          </div>
        )}
      </div>
    </>
  );
};

// ============================================
// DRAWER · GUIA DA DELEGAÇÃO
// ============================================
const GuiaConteudoDelegacao = ({ delegacao }: { delegacao: Delegacao }) => {
  const pdf = pdfDaDelegacao(delegacao.codigo);
  return (
    <>
      <DrawerHeader className="text-left border-b border-white/10">
        <div className="text-[10px] tracking-[0.3em] uppercase text-white/40 mb-1">
          Delegação
        </div>
        <DrawerTitle className="font-serif text-2xl text-white">{delegacao.nome}</DrawerTitle>
        {delegacao.quem_sao && (
          <DrawerDescription className="text-white/70 text-sm mt-1">
            {delegacao.quem_sao}
          </DrawerDescription>
        )}
      </DrawerHeader>

      <div className="px-6 pb-10 pt-5 overflow-y-auto space-y-6">
        {delegacao.objetivo && (
          <div>
            <div className="text-[10px] tracking-[0.3em] uppercase text-amber-200/70 mb-2">O que defendem</div>
            <p className="text-[14px] text-white/80 leading-relaxed">
              {delegacao.objetivo}
            </p>
          </div>
        )}

        {delegacao.nao_cedem && (
          <div>
            <div className="text-[10px] tracking-[0.3em] uppercase text-amber-200/70 mb-2">Não cedem em</div>
            <p className="text-[14px] text-white/80 leading-relaxed">
              {delegacao.nao_cedem}
            </p>
          </div>
        )}

        {delegacao.topam_negociar && (
          <div>
            <div className="text-[10px] tracking-[0.3em] uppercase text-amber-200/70 mb-2">Topam negociar</div>
            <p className="text-[14px] text-white/80 leading-relaxed">
              {delegacao.topam_negociar}
            </p>
          </div>
        )}

        {pdf && (
          <div className="pt-2">
            <a
              href={pdf}
              download
              className="flex items-center justify-center gap-2 rounded-xl bg-amber-200/15 hover:bg-amber-200/25 ring-1 ring-amber-200/40 px-4 py-3.5 text-amber-100 transition"
            >
              <Download className="w-4 h-4" />
              <span className="text-sm font-medium">Baixar guia completo da delegação</span>
            </a>
            <p className="text-[11px] text-white/40 text-center mt-2">
              PDF com argumentos detalhados, dados e estratégia de negociação.
            </p>
          </div>
        )}
      </div>
    </>
  );
};

export default CapituloPage;
