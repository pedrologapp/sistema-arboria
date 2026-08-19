import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useState, useEffect, type CSSProperties } from 'react';
import { Target, MessageCircle, Shield, User, Star, AlertTriangle, Trophy, Sparkles, Bell, HelpCircle, Send, Loader2, LayoutDashboard, ArrowRight, ChevronRight, Smile, CalendarDays } from 'lucide-react';
import { useStudent } from '@/contexts/StudentContext';
import { useNotificacoes } from '@/hooks/useNotificacoes';
import { useFaseAtualAluno } from '@/hooks/useFaseAtualAluno';
import { useCapituloHome } from '@/hooks/useCapituloHome';
import { F2_ALUNO_FASE_TRILHA } from '@/config/f2AlunoFase';
import { F2_ALUNO_HOME_NOVA } from '@/config/f2AlunoHomeNova';
import { F2_ALUNO_TOUR } from '@/config/f2AlunoTour';
import { CasaBrasao } from '@/components/CasaBrasao';
import { supabase } from '@/integrations/supabase/client';
import { Progress } from '@/components/ui/progress';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { hojeBrasil } from '@/utils/timezone';
import RelatarProblema from '@/components/aluno/RelatarProblema';
import { CROSS_IM_COMBINACOES, MECANISMOS_CASA } from '@/data/crossImData';
import OnboardingModal from '@/components/aluno/OnboardingModal';
import PopupLeiturasNovas from '@/components/aluno/PopupLeiturasNovas';
import { corAcento, corSolida, hexParaRgb } from '@/lib/corCasa';
import '@/styles/missoes-scifi.css';

const saudacoes = [
  'Bom te ver por aqui',
  'Que bom que voce veio',
  'Pronto para mais um dia',
  'Sua jornada continua',
  'O conhecimento te espera',
  'Cada dia conta',
];

const frasesVivas: Record<string, string[]> = {
  linguistica: [
    'As palavras certas mudam tudo',
    'Sua voz tem poder: use com sabedoria',
    'Cada historia que voce conta deixa uma marca',
    'O mundo precisa ouvir o que voce tem a dizer',
  ],
  logico_matematica: [
    'Cada problema esconde um padrao esperando por voce',
    'Sua mente afiada e o maior instrumento que voce tem',
    'A logica e a arte de pensar sem medo',
    'Questione tudo. A resposta esta nos detalhes',
  ],
  espacial: [
    'Feche os olhos. O que voce ve?',
    'Voce enxerga o que outros ainda nao imaginam',
    'O mundo e uma tela, e voce esta pintando',
    'Cada forma esconde uma ideia esperando nascer',
  ],
  musical: [
    'O ritmo do dia esta em voce',
    'Voce ouve o que outros nao percebem',
    'A musica nao e so som, e como voce sente o mundo',
    'Cada silencio tem um compasso',
  ],
  corporal_cinestesica: [
    'Seu corpo sabe mais do que imagina',
    'O movimento e a sua linguagem',
    'Nao pense demais: sinta e aja',
    'Cada gesto seu conta uma historia',
  ],
  naturalista: [
    'Olhe ao redor. O que voce nota?',
    'A natureza fala: voce so precisa ouvir',
    'Padroes estao em todo lugar esperando por voce',
    'O mundo e um sistema vivo, e voce faz parte dele',
  ],
  interpessoal: [
    'Alguem precisa de voce hoje',
    'Voce entende as pessoas como ninguem',
    'Conexoes verdadeiras mudam o mundo',
    'Liderar e servir, e voce sabe como',
  ],
  intrapessoal: [
    'O que voce esta sentindo agora?',
    'Quem se conhece nao se perde',
    'Sua forca vem de dentro',
    'Respire. Voce sabe exatamente quem voce e',
  ],
  geral: [
    'Ja olhou sua missao hoje?',
    'Sua casa precisa de voce',
    'Cada ponto conta nessa jornada',
    'Voce esta construindo algo grande',
    'O Arboria vive atraves de voce',
    'Hoje e um bom dia para crescer',
  ],
};

const getSaudacao = () => {
  const hora = new Date().getHours();
  if (hora < 12) return 'Bom dia';
  if (hora < 18) return 'Boa tarde';
  return 'Boa noite';
};

const getFraseMotivacional = () => {
  const hoje = new Date().getDate();
  return saudacoes[hoje % saudacoes.length];
};

const HomePage = () => {
  const navigate = useNavigate();
  const { profile, casa, ranking, faseAtual, casaColor, isLoading } = useStudent();
  const { missoesPendentes, mensagensNaoLidas } = useNotificacoes();
  // Passo 1 reforma aluno F2: fase atual pela trilha (atras do flag). null quando
  // flag off ou sem fase -> cai no faseAtual (por data) de sempre.
  const { data: faseTrilha } = useFaseAtualAluno();
  // Capitulo ativo da fase da turma (so roda com F2_ALUNO_HOME_NOVA ligado).
  const { capitulo: capituloHome } = useCapituloHome();

  const { data: cargo } = useQuery({
    queryKey: ['cargo-aluno', profile?.id, casa?.id],
    queryFn: async () => {
      if (!profile?.id || !casa?.id) return 'Membro';
      const { data } = await supabase
        .from('cargos_casa')
        .select('cargo')
        .eq('aluno_id', profile.id)
        .eq('casa_id', casa.id)
        .eq('ativo', true)
        .maybeSingle();
      if (!data?.cargo) return 'Membro';
      const cargoMap: Record<string, string> = { 'lider': 'Lider', 'coordenador': 'Coordenador', 'embaixador': 'Embaixador' };
      return cargoMap[data.cargo.toLowerCase()] || 'Membro';
    },
    enabled: !!profile?.id && !!casa?.id,
  });

  // Resumo da casa para líder/coordenador
  const isLiderOuCoord = cargo === 'Lider' || cargo === 'Coordenador';
  const { data: resumoCasa } = useQuery({
    queryKey: ['resumo-casa-lider', casa?.id, faseAtual?.id],
    queryFn: async () => {
      if (!casa?.id || !profile?.institution_id) return null;
      const { data: membros } = await supabase
        .from('ranking_alunos_por_casa')
        .select('aluno_id, total_pontos, missoes_completadas')
        .eq('casa_id', casa.id)
        .eq('institution_id', profile.institution_id);
      const total = membros?.length || 0;
      const comEntrega = membros?.filter((m: any) => (m.missoes_completadas || 0) > 0).length || 0;
      return { totalMembros: total, comEntrega, pctEntrega: total > 0 ? Math.round((comEntrega / total) * 100) : 0 };
    },
    enabled: isLiderOuCoord && !!casa?.id && !!profile?.institution_id,
    staleTime: 120000,
  });

  // Posicao da CASA no ranking (coletivo). Substitui o rank INDIVIDUAL do aluno
  // na Home: doutrina do Fundador, nada de comparar criancas; mostra o time.
  const { data: casaRank } = useQuery({
    queryKey: ['home-casa-rank', casa?.id, profile?.institution_id],
    enabled: !!casa?.id && !!profile?.institution_id,
    staleTime: 120000,
    queryFn: async () => {
      const { data } = await supabase
        .from('ranking_casas')
        .select('posicao, pontos_casa, total_membros')
        .eq('casa_id', casa!.id)
        .eq('institution_id', profile!.institution_id)
        .maybeSingle();
      return (data as { posicao: number; pontos_casa: number; total_membros: number } | null) ?? null;
    },
  });

  // Missões urgentes (prazo em menos de 2 dias e não entregues)
  const { data: missoesUrgentes } = useQuery({
    queryKey: ['missoes-urgentes', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data } = await supabase.rpc('get_missoes_do_aluno', { p_aluno_id: profile.id });
      if (!data) return [];
      const agora = new Date();
      const limite = new Date(agora.getTime() + 2 * 24 * 60 * 60 * 1000); // +2 dias
      return data.filter((m: any) =>
        !m.ja_entregou
        && m.status_entrega === 'pendente'
        && new Date(m.data_prazo) <= limite
        && new Date(m.data_prazo) > agora
      );
    },
    enabled: !!profile?.id,
    staleTime: 120000,
  });

  // ---------------------------------------------------------- Arena, 2ª fase
  // A convocação não pode depender do cartão de urgência: aquele só acende com
  // prazo em menos de 2 dias, e a 2ª fase abre com uma semana. Sem isto o aluno
  // selecionado entra no app e não vê nada.
  const { data: arena2Fase } = useQuery({
    queryKey: ['arena-2fase', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return null;
      const { data } = await supabase.rpc('get_missoes_do_aluno', { p_aluno_id: profile.id });
      // Compara pelo comeco do titulo, e nao pela string inteira: o "2ª" tem
      // caractere ordinal e um acento fora do lugar deixaria a convocacao
      // invisivel sem erro nenhum aparecer.
      const m = (data ?? []).find(
        (x: any) => typeof x?.titulo === 'string' && x.titulo.startsWith('Arena Arboria') && !x.ja_entregou,
      );
      return m ?? null;
    },
    enabled: !!profile?.id,
    staleTime: 120000,
  });

  // O pop-up abre sozinho uma vez. Depois disso o cartão fica na home, para ele
  // voltar quando tiver o material na mão.
  useEffect(() => {
    if (!arena2Fase || !profile?.id) return;
    const chave = `arboria_arena_2fase_visto_${profile.id}`;
    if (localStorage.getItem(chave)) return;
    localStorage.setItem(chave, '1');
    navigate('/aluno/arena/2fase');
  }, [arena2Fase, profile?.id, navigate]);

  // Até quando as missões do aluno ficam abertas. Sai do próprio prazo das missões
  // dele (nunca de uma data escrita no código), então acompanha o que o mentor definir.
  const { data: prazoMissoes } = useQuery({
    queryKey: ['prazo-missoes-aluno', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return null;
      const prazos: string[] = [];

      // Missões de CAPÍTULO (Arena): o prazo é por turma, definido quando o mentor
      // libera. É aqui que ele mora, não em missoes.data_prazo.
      const { data: turmas } = await supabase
        .from('aluno_turma')
        .select('turma_id')
        .eq('aluno_id', profile.id)
        .eq('ativo', true);
      const turmaIds = (turmas ?? []).map((t: any) => t.turma_id).filter(Boolean);
      if (turmaIds.length > 0) {
        const { data: cfgs } = await supabase
          .from('capitulo_turma_config')
          .select('missoes_data_prazo, missoes_liberadas_em')
          .in('turma_id', turmaIds)
          .not('missoes_liberadas_em', 'is', null);
        (cfgs ?? []).forEach((c: any) => { if (c.missoes_data_prazo) prazos.push(c.missoes_data_prazo); });
      }

      // Missões de CASA (fase/semana), que seguem outro caminho.
      const { data: daCasa } = await supabase.rpc('get_missoes_do_aluno', { p_aluno_id: profile.id });
      (daCasa ?? []).forEach((m: any) => { if (!m.ja_entregou && m.data_prazo) prazos.push(m.data_prazo); });

      const agora = new Date();
      const futuros = prazos.filter((p) => new Date(p) > agora);
      if (futuros.length === 0) return null;
      return futuros.reduce((a, b) => (new Date(b) > new Date(a) ? b : a));
    },
    enabled: !!profile?.id,
    staleTime: 120000,
  });

  // Onboarding ANTIGO: mostra uma vez para cada aluno (chave versionada).
  // Substituido pelo tour novo (AlunoTour, no header) quando F2_ALUNO_TOUR liga:
  // nesse caso o modal antigo nunca dispara, evitando dois pop-ups de inicializacao.
  const onboardingKey = `arboria_onboarding_v2_${profile?.id}`;
  const [showOnboarding, setShowOnboarding] = useState(false);
  // Drawer de utilidades da HomeNova (check-in, avisos, relatos, cross-im, etc.)
  const [utilAberto, setUtilAberto] = useState(false);

  useEffect(() => {
    if (F2_ALUNO_TOUR) return; // tour novo assume a inicializacao
    if (!profile?.id) return;
    if (!localStorage.getItem(onboardingKey)) {
      setShowOnboarding(true);
    }
  }, [profile?.id, onboardingKey]);

  const fecharOnboarding = () => {
    localStorage.setItem(onboardingKey, 'done');
    setShowOnboarding(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white/20" />
      </div>
    );
  }

  const firstName = profile?.nome?.split(' ')[0] || 'Aluno';
  const isPrimeiro = ranking?.posicao_na_casa === 1 && (ranking?.total_pontos || 0) > 0;
  const semanaAtual = faseAtual?.semana_atual || 1;
  // Quanto os pontos do aluno viraram na Casa (ponderado): pontos x 10 / membros.
  const membrosDaCasa = Number(casaRank?.total_membros) || 0;
  const contribuicaoCasa = membrosDaCasa > 0 ? Math.round(((ranking?.total_pontos || 0) * 10) / membrosDaCasa) : 0;

  // Frase animada rotativa
  const casaCodigo = casa?.codigo || 'geral';
  const frasesDisponiveis = [...(frasesVivas[casaCodigo] || []), ...frasesVivas.geral];
  const [fraseIndex, setFraseIndex] = useState(0);
  const [fraseVisible, setFraseVisible] = useState(true);

  useEffect(() => {
    if (frasesDisponiveis.length === 0) return;
    const interval = setInterval(() => {
      setFraseVisible(false);
      setTimeout(() => {
        setFraseIndex(prev => (prev + 1) % frasesDisponiveis.length);
        setFraseVisible(true);
      }, 400);
    }, 5000);
    return () => clearInterval(interval);
  }, [frasesDisponiveis.length]);

  // Cor da Casa, derivada pra LEGIBILIDADE (fonte: corCasa.ts):
  //  - acento: TEXTO/ícone/borda (clara, lê no escuro);
  //  - solida: preenchimento cheio com texto branco (CTA).
  // A cor CRUA (casaBase) só entra em glow/tile/borda com alpha, nunca em texto.
  const casaBase = casaColor || casa?.cor_hex || '#a78bfa';
  const acento = corAcento(casaBase);
  const solida = corSolida(casaBase);
  const accentRgb = hexParaRgb(acento);
  const scifiVars = { '--sf-accent': acento, '--sf-accent-rgb': accentRgb } as CSSProperties;

  // Texto coletivo da fase da turma (nunca a identidade do aluno): pela trilha
  // quando resolvida, senao pela fase por data. Reaproveita a regra do card atual.
  const nomeFaseTurma = F2_ALUNO_FASE_TRILHA && faseTrilha
    ? faseTrilha.nome
    : faseAtual?.inteligencia?.nome ?? null;

  // ================= HOME NOVA (atras do flag F2_ALUNO_HOME_NOVA) =================
  // Reproduz o mockup aprovado (home_aluno_proposta.html): jornada no topo,
  // capitulo em destaque, missoes, e um unico cartao compacto que abre um drawer
  // com as utilidades (check-in, avisos, relatos, cross-im). Reaproveita os mesmos
  // dados e subcomponentes de hoje. Desligada, cai no return abaixo (home de hoje).
  if (F2_ALUNO_HOME_NOVA) {
    const dataHoje = (() => {
      const s = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
      return s.charAt(0).toUpperCase() + s.slice(1);
    })();

    return (
      <div className="scifi p-4 space-y-3.5 pb-24" style={scifiVars}>
        <PopupLeiturasNovas />
        <OnboardingModal
          isOpen={showOnboarding}
          onClose={fecharOnboarding}
          casaNome={casa?.nome}
          casaCor={casaColor}
          casaBrasaoUrl={casa?.brasao_url}
          casaEmoji={casa?.emoji}
          alunoNome={firstName}
        />

        {/* 1. Saudacao (mockup .hi) */}
        <div className="pt-1 animate-fade-in">
          <h1 className="font-serif text-[21px] font-semibold text-white leading-tight">
            {getSaudacao()}, {firstName}
          </h1>
          <p className="text-[12.5px] text-white/30 mt-1">{dataHoje}</p>
        </div>

        {/* Prazo das missões */}
        {prazoMissoes && (
          <div className="rounded-[14px] border border-white/[0.09] bg-white/[0.035] p-3 animate-fade-in">
            <div className="flex items-center gap-3">
              <CalendarDays className="w-[18px] h-[18px] text-white/40 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-white text-[13px] font-medium">
                  Missões abertas até {new Date(prazoMissoes).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                </p>
                <p className="text-white/35 text-[11px] mt-0.5">
                  Dá para enviar ou corrigir sua entrega até essa data.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 1.5 Arena, 2a fase: so aparece para quem foi selecionado */}
        {arena2Fase && (
          <button
            onClick={() => navigate('/aluno/arena/2fase')}
            className="rounded-[14px] w-full p-3.5 text-left active:scale-[0.98] transition-transform"
            style={{
              border: '1px solid rgba(94,224,208,.42)',
              background: 'linear-gradient(135deg, rgba(94,224,208,.13), rgba(94,224,208,.04))',
            }}
          >
            <div className="flex items-center gap-3">
              <Trophy className="w-5 h-5 shrink-0" style={{ color: '#5EE0D0' }} />
              <div className="flex-1">
                <p className="text-[10px] font-extrabold uppercase tracking-[.22em]" style={{ color: '#5EE0D0' }}>
                  Arena Arboria
                </p>
                <p className="text-white text-sm font-semibold mt-0.5">Você passou para a 2ª fase</p>
                <p className="text-white/45 text-[11px] mt-0.5">Toque para ver o que enviar</p>
              </div>
            </div>
          </button>
        )}

        {/* 2. Urgencia (mesmo cartao de hoje) */}
        {missoesUrgentes && missoesUrgentes.length > 0 && (
          <button
            onClick={() => {
              if (missoesUrgentes.length === 1) {
                navigate(`/aluno/missoes/${missoesUrgentes[0].id}`);
              } else {
                navigate('/aluno/missoes');
              }
            }}
            className="rounded-[14px] border border-amber-500/40 bg-amber-500/[0.06] w-full p-3 text-left active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
              <div className="flex-1">
                <p className="text-white text-sm font-medium">
                  {missoesUrgentes.length === 1 ? '1 missão para entregar' : `${missoesUrgentes.length} missões para entregar`}
                </p>
                <p className="text-amber-400/60 text-[10px] mt-0.5">
                  {missoesUrgentes.length === 1 ? 'Toque para abrir' : 'Prazo encerrando'}
                </p>
              </div>
            </div>
          </button>
        )}

        {/* Relatar problema: alto na pagina, porque quem esta travado precisa
            achar isto sem rolar. */}
        <RelatarProblema userId={profile?.id} institutionId={profile?.institution_id} contexto={{ tela: 'home' }} />

        {/* Aluno sem casa */}
        {!casa && (
          <div className="rounded-[18px] border border-white/[0.08] bg-white/[0.04] animate-fade-in p-5 text-center">
            <p className="text-white font-medium">Bem-vindo ao Arboria!</p>
            <p className="text-white/40 text-sm mt-2">Você ainda não foi alocado a uma casa. Aguarde seu professor: em breve você vai descobrir a qual casa pertence!</p>
          </div>
        )}

        {/* 3. Cartao de JORNADA (mockup .journey) */}
        {casa && (
          <div className="relative overflow-hidden rounded-[18px] border border-white/[0.08] bg-white/[0.04] animate-fade-in animate-fade-in-d1">
            <div className="relative z-10 p-4">
              {/* linha: crest + casa + cargo */}
              <div className="flex items-center gap-[14px]">
                <div
                  className="shrink-0 w-[52px] h-[52px] rounded-full flex items-center justify-center"
                  style={{
                    background: `radial-gradient(circle, ${casaColor}59 0%, transparent 70%)`,
                    boxShadow: `inset 0 0 0 1px ${casaColor}80, 0 0 26px ${casaColor}38`,
                  }}
                >
                  <CasaBrasao brasaoUrl={casa.brasao_url} emoji={casa.emoji} nome={casa.nome} size="small" className="w-10 h-10" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-serif text-[20px] font-semibold leading-tight" style={{ color: acento }}>
                    Casa {casa.nome}
                  </h3>
                  <p className="text-[12px] text-white/50 mt-0.5">
                    {cargo || 'Membro'}
                    {profile?.serie && ` · ${profile.serie}° ${profile.turma || ''}`}
                  </p>
                </div>
              </div>

              {/* divisor fino */}
              <div className="h-px my-[14px]" style={{ backgroundColor: 'rgba(255,255,255,0.07)' }} />

              {/* linha coletiva da fase */}
              {nomeFaseTurma ? (
                <p className="text-[12.5px] text-white/50 leading-relaxed">
                  A turma está na fase da Casa <span className="text-white/85 font-semibold">{nomeFaseTurma}</span>
                </p>
              ) : (
                <p className="text-[12.5px] text-white/40">A turma ainda não iniciou uma fase.</p>
              )}

              {/* placar discreto: pontos do aluno + posicao E pontos da CASA
                  (nunca rank individual: doutrina do Fundador, sem comparar criancas) */}
              <p className="mt-3 text-[11.5px] text-white/40 leading-relaxed">
                Você conquistou <span className="text-white/60 font-semibold tabular-nums">{ranking?.total_pontos || 0}</span> pontos
                {contribuicaoCasa > 0 && (
                  <> e <span className="text-white/60 font-semibold tabular-nums">{contribuicaoCasa}</span> pontos para sua Casa</>
                )}.
                {casaRank?.posicao ? (
                  <>
                    <br />
                    Casa em <span className="text-white/60 font-semibold tabular-nums">{casaRank.posicao}º</span>
                    {' · '}
                    <span className="text-white/60 font-semibold tabular-nums">{(casaRank.pontos_casa || 0).toLocaleString('pt-BR')}</span> pontos da Casa.
                  </>
                ) : null}
              </p>
            </div>
          </div>
        )}

        {/* 4. Cartao do CAPITULO DA VEZ (mockup .cap). So renderiza se houver capitulo ativo. */}
        {capituloHome && (
          <button
            onClick={() => navigate('/aluno/capitulo')}
            className="relative overflow-hidden rounded-[18px] border border-white/[0.08] bg-white/[0.04] w-full text-left p-4 active:scale-[0.99] transition-transform animate-fade-in animate-fade-in-d2"
          >
            <div className="relative z-10">
              <div className="text-[10px] tracking-[0.34em] uppercase text-white/30">Capítulo da vez</div>
              <h3 className="font-serif text-[24px] font-semibold text-white mt-2 leading-tight">{capituloHome.nome}</h3>
              {capituloHome.frase_ancora && (
                <p className="font-serif italic text-[13px] mt-2 leading-[1.5]" style={{ color: acento }}>
                  {capituloHome.frase_ancora}
                </p>
              )}

              {capituloHome.timeNome && (
                <div className="flex items-center gap-2.5 mt-[14px]">
                  <span className="inline-flex items-center gap-[7px] text-[12px] text-white/50">
                    Seu time
                    <span
                      className="px-[9px] py-[3px] rounded-full text-[10.5px] font-semibold"
                      style={{ color: acento, backgroundColor: `${casaBase}24`, border: `1px solid ${acento}4d` }}
                    >
                      {capituloHome.timeNome}
                    </span>
                  </span>
                </div>
              )}

              {/* botao preenchido (mockup .cta) */}
              <div
                className="mt-[14px] flex items-center justify-center gap-2 rounded-[12px] py-3 text-white font-bold text-[13.5px]"
                style={{ backgroundColor: solida }}
              >
                <span>Entrar no capítulo</span>
                <ArrowRight className="w-[18px] h-[18px]" />
              </div>
            </div>
          </button>
        )}

        {/* 5. Cartao de MISSOES (mockup .strip) */}
        <button
          onClick={() => navigate('/aluno/missoes')}
          className="rounded-[18px] border border-white/[0.08] bg-white/[0.04] w-full text-left active:scale-[0.98] transition-transform animate-fade-in animate-fade-in-d2"
        >
          <div className="flex items-center gap-3 px-[15px] py-[13px]">
            <div className="w-[38px] h-[38px] rounded-[11px] shrink-0 flex items-center justify-center" style={{ backgroundColor: `${casaBase}24` }}>
              <Target className="w-[18px] h-[18px]" style={{ color: acento }} />
            </div>
            <div className="flex-1">
              <p className="text-white font-semibold text-[13.5px]">Missões da Fase</p>
              <p className="text-white/30 text-[11px] mt-0.5">
                {nomeFaseTurma ?? 'Nenhuma fase ativa'}
              </p>
            </div>
            {missoesPendentes > 0 && (
              <span className="min-w-[20px] h-[20px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10.5px] font-bold px-1.5">
                {missoesPendentes}
              </span>
            )}
          </div>
        </button>

        {/* 6. Cartao SECUNDARIO compacto (mockup .secondary): abre o drawer de utilidades */}
        <button
          onClick={() => setUtilAberto(true)}
          className="rounded-[18px] border border-white/[0.08] bg-white/[0.04] w-full text-left opacity-90 active:scale-[0.98] transition-transform animate-fade-in animate-fade-in-d3"
        >
          <div className="flex items-center gap-[10px] px-[14px] py-[11px]">
            <div className="w-[30px] h-[30px] rounded-[9px] shrink-0 flex items-center justify-center bg-white/[0.05]">
              <Smile className="w-[15px] h-[15px] text-white/50" />
            </div>
            <div className="flex-1">
              <p className="text-[12.5px] font-semibold text-white/50">Como você está hoje?</p>
              <p className="text-[10.5px] text-white/30 mt-0.5">Check-in do dia · avisos</p>
            </div>
            <ChevronRight className="w-4 h-4 text-white/30" />
          </div>
        </button>

        {/* 7. Frase viva (mesma de hoje) */}
        {frasesDisponiveis.length > 0 && (
          <div className="animate-fade-in animate-fade-in-d5 text-center py-6 mb-4">
            <p
              className="text-lg italic leading-relaxed transition-all duration-400 px-4"
              style={{
                color: acento,
                opacity: fraseVisible ? 1 : 0,
                transform: fraseVisible ? 'translateY(0)' : 'translateY(6px)',
              }}
            >
              "{frasesDisponiveis[fraseIndex]}"
            </p>
          </div>
        )}

        {/* DRAWER de utilidades: mantem todas as funcoes, so saem da tela principal */}
        <Drawer open={utilAberto} onOpenChange={setUtilAberto}>
          <DrawerContent className="bg-[#1A1A2E] border-white/10 text-white max-h-[92vh]">
            <DrawerHeader className="text-left">
              <DrawerTitle className="font-serif text-white">Como você está hoje?</DrawerTitle>
              <DrawerDescription className="text-white/50">
                Check-in do dia, avisos e um espaço para você falar.
              </DrawerDescription>
            </DrawerHeader>
            <div className="scifi px-4 pb-8 space-y-4 overflow-y-auto" style={scifiVars}>
              {isLiderOuCoord && resumoCasa && (
                <button
                  onClick={() => { setUtilAberto(false); navigate('/aluno/dashboard'); }}
                  className="rounded-[14px] border border-white/[0.07] bg-white/[0.03] w-full p-3.5 text-left active:scale-[0.98] transition-transform"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-[11px]" style={{ backgroundColor: `${casaBase}24` }}>
                      <Shield className="w-5 h-5" style={{ color: acento }} />
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium text-sm">Painel de {cargo}</p>
                      <p className="text-white/40 text-[11px] mt-0.5">
                        {resumoCasa.comEntrega}/{resumoCasa.totalMembros} membros com entregas · {resumoCasa.pctEntrega}%
                      </p>
                    </div>
                    <div className="text-lg font-bold" style={{ color: acento }}>{resumoCasa.pctEntrega}%</div>
                  </div>
                </button>
              )}

              <CheckInEmocional userId={profile?.id} casaColor={casaColor} />
              <AvisosCard />
              <CrossImHomeCard casaCodigo={casa?.codigo} faseCodigo={faseAtual?.inteligencia?.codigo} corCasa={casaColor} />
              {casa?.codigo && <DesafioDiarioLembrete casaCodigo={casa.codigo} casaColor={casaColor} />}
              <CampoRelato userId={profile?.id} institutionId={profile?.institution_id} faseId={faseAtual?.id} semana={semanaAtual} casaColor={casaColor} />
              <RelatarProblema userId={profile?.id} institutionId={profile?.institution_id} contexto={{ tela: 'home' }} />
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    );
  }

  return (
    <div className="scifi p-4 space-y-4 pb-24" style={scifiVars}>
      <PopupLeiturasNovas />
      {/* Onboarding primeiro acesso */}
      <OnboardingModal
        isOpen={showOnboarding}
        onClose={fecharOnboarding}
        casaNome={casa?.nome}
        casaCor={casaColor}
        casaBrasaoUrl={casa?.brasao_url}
        casaEmoji={casa?.emoji}
        alunoNome={firstName}
      />

      {/* Saudacao */}
      <div className="pt-2 animate-fade-in">
        <h1 className="text-xl font-bold text-white">
          {getSaudacao()}, {firstName}!
        </h1>
        <p className="text-sm text-white/35 mt-0.5">{getFraseMotivacional()}</p>
      </div>

      {/* Prazo das missões */}
      {prazoMissoes && (
        <div className="rounded-[14px] border border-white/[0.09] bg-white/[0.035] p-3 animate-fade-in">
          <div className="flex items-center gap-3">
            <CalendarDays className="w-[18px] h-[18px] text-white/40 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-white text-[13px] font-medium">
                Missões abertas até {new Date(prazoMissoes).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
              </p>
              <p className="text-white/35 text-[11px] mt-0.5">
                Dá para enviar ou corrigir sua entrega até essa data.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Card de Urgência */}
      {missoesUrgentes && missoesUrgentes.length > 0 && (
        <button
          onClick={() => {
            if (missoesUrgentes.length === 1) {
              navigate(`/aluno/missoes/${missoesUrgentes[0].id}`);
            } else {
              navigate('/aluno/missoes');
            }
          }}
          data-augmented-ui="tl-clip br-clip border"
          className="sf-card w-full p-3 text-left active:scale-[0.98] transition-transform"
          style={{ ['--aug-border-bg' as string]: 'rgba(245, 158, 11, 0.4)' }}
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <div className="flex-1">
              <p className="text-white text-sm font-medium">
                {missoesUrgentes.length === 1 ? '1 missão para entregar' : `${missoesUrgentes.length} missões para entregar`}
              </p>
              <p className="text-amber-400/60 text-[10px] mt-0.5">
                {missoesUrgentes.length === 1 ? 'Toque para abrir' : 'Prazo encerrando'}
              </p>
            </div>
          </div>
        </button>
      )}

      {/* CARD: Aluno sem casa */}
      {!casa && (
        <div data-augmented-ui="tl-clip tr-clip bl-clip br-clip border" className="sf-panel animate-fade-in p-5 text-center">
          <p className="text-white font-medium">Bem-vindo ao Arboria!</p>
          <p className="text-white/40 text-sm mt-2">Você ainda não foi alocado a uma casa. Aguarde seu professor: em breve você vai descobrir a qual casa pertence!</p>
        </div>
      )}

      {/* CARD DA CASA */}
      {casa && (
        <div
          data-augmented-ui="tl-clip tr-clip bl-clip br-clip border"
          className="sf-panel sf-accent-border relative overflow-hidden animate-fade-in animate-fade-in-d1"
          style={{ boxShadow: `0 20px 50px -12px ${casaColor}35` }}
        >
          {/* Background gradient com cor da casa */}
          <div className="absolute inset-0 pointer-events-none" style={{ background: `linear-gradient(160deg, ${casaColor}20 0%, transparent 50%, transparent 100%)` }} />
          <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full blur-3xl opacity-25 pointer-events-none" style={{ backgroundColor: casaColor }} />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full blur-2xl opacity-15 pointer-events-none" style={{ backgroundColor: casaColor }} />

          <div className="relative z-10 p-6">
            {/* Celebracao 1o lugar */}
            {isPrimeiro && (
              <div className="flex items-center gap-1.5 mb-3">
                <div className="px-2.5 py-1 rounded-full bg-yellow-500/20 border border-yellow-500/30">
                  <span className="text-[10px] font-bold text-yellow-400 animate-pulse">1º LUGAR NA CASA</span>
                </div>
              </div>
            )}

            {/* Brasao + Nome */}
            <div className="flex items-center gap-5">
              <div className="shrink-0">
                <CasaBrasao brasaoUrl={casa.brasao_url} emoji={casa.emoji} nome={casa.nome} size="large" className="w-20 h-20" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-2xl font-extrabold tracking-tight" style={{ color: casaColor }}>
                  Casa {casa.nome}
                </h2>
                <p className="text-white/50 text-sm mt-0.5">
                  {cargo || 'Membro'}
                  {profile?.serie && ` · ${profile.serie}° ${profile.turma || ''}`}
                </p>
              </div>
            </div>

            {/* Metricas dentro do card */}
            <div className="flex items-center gap-4 mt-5">
              <div className="flex-1 text-center">
                <div className="flex items-center justify-center gap-1">
                  <Star className="w-3.5 h-3.5 text-yellow-500" fill="currentColor" />
                  <span className="text-xl font-bold text-white">{ranking?.total_pontos || 0}</span>
                </div>
                <p className="text-[10px] text-white/30 mt-0.5">pontos</p>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div className="flex-1 text-center">
                <span className="text-xl font-bold text-white">{casaRank?.posicao || '--'}</span>
                <span className="text-white/30 text-xs align-top">º</span>
                <p className="text-[10px] text-white/30 mt-0.5">sua Casa</p>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div className="flex-1 text-center">
                <span className="text-xl font-bold text-white">{ranking?.missoes_completadas || 0}</span>
                <p className="text-[10px] text-white/30 mt-0.5">missoes</p>
              </div>
            </div>

            {/* Fase. Com o flag ligado e a trilha resolvida, mostra a fase da
                TURMA pela trilha (igual ao professor), em texto coletivo (nunca
                a identidade do aluno). Senao, o comportamento atual (por data). */}
            {F2_ALUNO_FASE_TRILHA && faseTrilha ? (
              <div className="mt-4 pt-4 border-t" style={{ borderColor: `${casaColor}15` }}>
                <p className="text-xs text-white/50">
                  A turma está na fase da Casa {faseTrilha.nome}
                </p>
              </div>
            ) : faseAtual && faseAtual.inteligencia ? (
              <div className="mt-4 pt-4 border-t" style={{ borderColor: `${casaColor}15` }}>
                <p className="text-xs text-white/50">
                  Fase {faseAtual.numero_fase}: {faseAtual.inteligencia.nome}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Card do Líder/Coordenador */}
      {isLiderOuCoord && resumoCasa && (
        <button
          onClick={() => navigate('/aluno/dashboard')}
          data-augmented-ui="tl-clip br-clip border"
          className="sf-card w-full p-3.5 text-left animate-fade-in animate-fade-in-d2 active:scale-[0.98] transition-transform"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl" style={{ backgroundColor: `${casaColor}20` }}>
              <Shield className="w-5 h-5" style={{ color: casaColor }} />
            </div>
            <div className="flex-1">
              <p className="text-white font-medium text-sm">Painel de {cargo}</p>
              <p className="text-white/40 text-[11px] mt-0.5">
                {resumoCasa.comEntrega}/{resumoCasa.totalMembros} membros com entregas · {resumoCasa.pctEntrega}%
              </p>
            </div>
            <div className="text-lg font-bold" style={{ color: casaColor }}>{resumoCasa.pctEntrega}%</div>
          </div>
        </button>
      )}

      {/* Cross-IM */}
      {/* Avisos do admin */}
      <AvisosCard />

      {/* Cross-IM */}
      <CrossImHomeCard casaCodigo={casa?.codigo} faseCodigo={faseAtual?.inteligencia?.codigo} corCasa={casaColor} />

      {/* Lembrete desafio diário */}
      {casa?.codigo && <DesafioDiarioLembrete casaCodigo={casa.codigo} casaColor={casaColor} />}

      {/* MISSOES em destaque */}
      <button
        onClick={() => navigate('/aluno/missoes')}
        data-augmented-ui="tl-clip br-clip border"
        className="sf-card relative w-full p-4 text-left overflow-hidden active:scale-[0.98] transition-transform animate-fade-in animate-fade-in-d2"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl" style={{ backgroundColor: `${casaColor}20` }}>
            <Target className="w-6 h-6" style={{ color: casaColor }} />
          </div>
          <div className="flex-1">
            <p className="text-white font-semibold text-sm">Missões da Fase</p>
            <p className="text-white/40 text-[11px] mt-0.5">
              {faseAtual ? faseAtual.inteligencia?.nome ?? 'Fase ativa' : 'Nenhuma fase ativa'}
            </p>
          </div>
          {missoesPendentes > 0 && (
            <span className="min-w-[22px] h-[22px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1.5">
              {missoesPendentes}
            </span>
          )}
        </div>
      </button>

      {/* Atalhos menores */}
      <div className="flex gap-3 animate-fade-in animate-fade-in-d3">
        {[
          ...(isLiderOuCoord ? [{ icon: LayoutDashboard, label: 'Painel', path: '/aluno/dashboard' }] : []),
          { icon: MessageCircle, label: 'Chat', path: '/aluno/chat', badge: mensagensNaoLidas },
          { icon: Shield, label: 'Casa', path: '/aluno/casa' },
          { icon: Trophy, label: 'Conquistas', path: '/aluno/conquistas' },
          { icon: User, label: 'Perfil', path: '/aluno/perfil' },
        ].map(item => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              data-augmented-ui="tl-clip br-clip border"
              className="sf-card relative flex-1 flex flex-col items-center gap-1.5 py-3 active:scale-[0.95] transition-transform"
            >
              {(item.badge ?? 0) > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
              )}
              <Icon className="w-5 h-5" style={{ color: casaColor }} />
              <span className="text-[10px] text-white/60">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Check-in emocional (so aparece 1x por dia) */}
      <CheckInEmocional userId={profile?.id} casaColor={casaColor} />

      {/* Campo de relato */}
      <CampoRelato userId={profile?.id} institutionId={profile?.institution_id} faseId={faseAtual?.id} semana={semanaAtual} casaColor={casaColor} />

      {/* Frase viva: rotativa com fade */}
      {frasesDisponiveis.length > 0 && (
        <div className="animate-fade-in animate-fade-in-d5 text-center py-6 mb-4">
          <p
            className="text-lg italic leading-relaxed transition-all duration-400 px-4"
            style={{
              color: acento,
              opacity: fraseVisible ? 1 : 0,
              transform: fraseVisible ? 'translateY(0)' : 'translateY(6px)',
            }}
          >
            "{frasesDisponiveis[fraseIndex]}"
          </p>
        </div>
      )}
    </div>
  );
};

// === Check-in Emocional (1x por dia) ===
const emojisCheckin = [
  { emoji: '😄', label: 'Feliz' },
  { emoji: '😊', label: 'Bem' },
  { emoji: '😐', label: 'Normal' },
  { emoji: '😔', label: 'Triste' },
  { emoji: '😤', label: 'Irritado' },
  { emoji: '😴', label: 'Cansado' },
  { emoji: '🤩', label: 'Animado' },
  { emoji: '😰', label: 'Ansioso' },
];

const CheckInEmocional = ({ userId, casaColor }: { userId?: string; casaColor: string }) => {
  const [jaRespondeu, setJaRespondeu] = useState(false);
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!userId) return;
    const hoje = hojeBrasil();
    supabase
      .from('checkin_emocional')
      .select('emoji')
      .eq('aluno_id', userId)
      .eq('data', hoje)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setSelecionado(data.emoji);
          setJaRespondeu(true);
        }
      });
  }, [userId]);

  const salvar = async (emoji: string, label: string) => {
    if (!userId || salvando) return;
    setSalvando(true);
    setSelecionado(emoji);
    const hoje = hojeBrasil();
    const { error } = await supabase.from('checkin_emocional').upsert(
      { aluno_id: userId, emoji, label, data: hoje },
      { onConflict: 'aluno_id,data' }
    );
    if (!error) {
      setJaRespondeu(true);
    } else {
      setSelecionado(null);
    }
    setSalvando(false);
  };

  if (jaRespondeu) return null;

  return (
    <div className="rounded-[18px] border border-white/[0.08] bg-white/[0.035] animate-fade-in animate-fade-in-d4 p-4">
      <p className="text-sm text-white/60 mb-3">Como voce esta se sentindo hoje?</p>
      <div className="grid grid-cols-4 gap-2">
        {emojisCheckin.map(({ emoji, label }) => (
          <button
            key={emoji}
            onClick={() => salvar(emoji, label)}
            className={`flex flex-col items-center gap-1 py-2 rounded-xl transition-all active:scale-90 ${
              selecionado === emoji ? 'bg-white/10 scale-110' : 'hover:bg-white/5'
            }`}
          >
            <span className="text-xl">{emoji}</span>
            <span className="text-[9px] text-white/30">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

// === Campo de Relato ===
const CampoRelato = ({ userId, institutionId, faseId, semana, casaColor }: {
  userId?: string;
  institutionId?: string;
  faseId?: string;
  semana: number;
  casaColor: string;
}) => {
  const [texto, setTexto] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const enviar = async () => {
    if (!userId || !institutionId || !texto.trim() || salvando) return;
    setSalvando(true);
    const { error } = await supabase.from('relatos_alunos').insert({
      aluno_id: userId,
      institution_id: institutionId,
      fase_id: faseId || null,
      semana,
      texto: texto.trim(),
    });
    if (!error) {
      setTexto('');
      setEnviado(true);
      setTimeout(() => setEnviado(false), 3000);
    }
    setSalvando(false);
  };

  const acento = corAcento(casaColor);
  return (
    <div className="rounded-[18px] border border-white/[0.08] bg-white/[0.035] animate-fade-in animate-fade-in-d4 p-4">
      <p className="text-sm text-white/60 mb-2">Quer falar algo sobre essa fase? Ou sobre voce?</p>
      <textarea
        value={texto}
        onChange={e => setTexto(e.target.value)}
        placeholder="Escreva o que quiser... como esta sendo, o que sentiu, o que aprendeu"
        maxLength={500}
        rows={3}
        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white placeholder:text-white/20 resize-none focus:outline-none focus:border-white/20 transition-colors"
      />
      <div className="flex items-center justify-between mt-2">
        <span className="text-[10px] text-white/20">{texto.length}/500</span>
        {enviado ? (
          <span className="text-xs text-green-400">Enviado!</span>
        ) : (
          <button
            onClick={enviar}
            disabled={!texto.trim() || salvando}
            className="px-4 py-1.5 rounded-full text-xs font-medium transition-all disabled:opacity-30"
            style={{ backgroundColor: `${acento}26`, color: acento }}
          >
            {salvando ? 'Enviando...' : 'Enviar'}
          </button>
        )}
      </div>
    </div>
  );
};

// === Cross-IM Card compacto (expande no lugar) ===
const CrossImHomeCard = ({ casaCodigo, faseCodigo, corCasa }: {
  casaCodigo?: string;
  faseCodigo?: string;
  corCasa: string;
}) => {
  const [expandido, setExpandido] = useState(false);

  if (!casaCodigo || !faseCodigo) return null;

  const comb = CROSS_IM_COMBINACOES.find(
    c => c.casa_codigo === casaCodigo && c.fase_codigo === faseCodigo
  );
  if (!comb) return null;

  const mecanismo = !comb.fase_propria ? MECANISMOS_CASA[casaCodigo] : null;
  const acento = corAcento(corCasa);

  return (
    <div className="rounded-[18px] border border-white/[0.08] bg-white/[0.035] animate-fade-in animate-fade-in-d2 overflow-hidden transition-all">
      <button
        onClick={() => setExpandido(!expandido)}
        className="w-full p-3.5 text-left hover:bg-white/[0.02] transition-colors"
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-1.5" style={{ color: acento }}>
          {comb.fase_propria ? 'Sua fase, seu território' : 'Você nesta fase'}
        </p>
        <p className={`text-xs text-white/55 leading-relaxed ${expandido ? '' : 'line-clamp-2'}`}>
          {comb.texto_aluno}
        </p>
        <p className="text-[10px] mt-2" style={{ color: `${acento}b3` }}>
          {expandido ? 'Fechar' : 'Ler mais'}
        </p>
      </button>

      {expandido && (
        <div className="px-3.5 pb-3.5 space-y-3" style={{ borderTop: `1px solid ${corCasa}10` }}>
          {/* Mecanismo da casa (só quando casa ≠ fase) */}
          {mecanismo && (
            <div className="pt-2 rounded-lg p-2.5" style={{ backgroundColor: `${corCasa}06`, borderLeft: `2px solid ${acento}40` }}>
              <p className="text-white/35 text-xs italic leading-relaxed">
                {mecanismo}
              </p>
            </div>
          )}

          {/* Caminhos */}
          {comb.caminhos_possiveis.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] mb-2" style={{ color: acento }}>
                Onde isso pode te levar
              </p>
              <div className="space-y-1.5">
                {comb.caminhos_possiveis.map((caminho, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: `${acento}66` }} />
                    <span className="text-[11px] text-white/45 leading-relaxed">{caminho}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// === Lembrete Desafio Diário ===
const DesafioDiarioLembrete = ({ casaCodigo, casaColor }: { casaCodigo?: string; casaColor: string }) => {
  const navigate = useNavigate();
  const { profile } = useStudent();
  const [jaFez, setJaFez] = useState(true); // assume que fez até confirmar

  useEffect(() => {
    if (!profile?.id || !casaCodigo) return;
    const agora = new Date();
    const dataStr = agora.getHours() < 6
      ? new Date(agora.getTime() - 86400000).toLocaleDateString('en-CA')
      : agora.toLocaleDateString('en-CA');

    supabase
      .from('desafio_diario_respostas' as any)
      .select('id')
      .eq('aluno_id', profile.id)
      .eq('data', dataStr)
      .maybeSingle()
      .then(({ data }) => {
        setJaFez(!!data);
      });
  }, [profile?.id, casaCodigo]);

  if (jaFez || !casaCodigo) return null;

  const frasesCuriosidade = [
    'Tem algo esperando por você hoje...',
    'Você consegue perceber o que ninguém percebe?',
    'Um pequeno desafio pode mudar seu dia',
    'Algo para testar sobre você mesmo',
    'O que você vai descobrir hoje?',
  ];
  const frase = frasesCuriosidade[new Date().getDate() % frasesCuriosidade.length];
  const acento = corAcento(casaColor);

  return (
    <button
      onClick={() => navigate('/aluno/casa')}
      className="rounded-[14px] border border-white/[0.07] bg-white/[0.03] w-full p-3.5 text-left animate-fade-in animate-fade-in-d3 active:scale-[0.98] transition-transform"
    >
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-[11px]" style={{ backgroundColor: `${casaColor}24` }}>
          <Sparkles className="w-5 h-5" style={{ color: acento }} />
        </div>
        <div className="flex-1">
          <p className="text-white font-medium text-sm">Desafio do dia</p>
          <p className="text-white/40 text-[11px] mt-0.5 italic">{frase}</p>
        </div>
      </div>
    </button>
  );
};

// === Avisos do Admin ===
const AvisosCard = () => {
  const { data: avisos = [] } = useQuery({
    queryKey: ['avisos-ativos'],
    queryFn: async () => {
      const { data } = await supabase.from('avisos')
        .select('id, texto, created_at')
        .eq('ativo', true)
        .order('created_at', { ascending: false })
        .limit(3);
      return data || [];
    },
    staleTime: 60000,
  });

  const [fechados, setFechados] = useState<Set<string>>(new Set());

  if (avisos.length === 0) return null;

  const visiveis = avisos.filter((a: any) => !fechados.has(a.id));
  if (visiveis.length === 0) return null;

  return (
    <div className="space-y-2 animate-fade-in">
      {visiveis.map((aviso: any) => (
        <div
          key={aviso.id}
          className="rounded-[18px] border border-amber-500/40 bg-amber-500/[0.05] p-3.5 relative"
        >
          <button onClick={() => setFechados(prev => new Set(prev).add(aviso.id))}
            className="absolute top-2 right-2 text-amber-400/40 hover:text-amber-400/80 text-xs p-1">
            x
          </button>
          <div className="flex items-start gap-3">
            <Bell className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-white/80 leading-relaxed">{aviso.texto}</p>
              <p className="text-[10px] text-amber-400/40 mt-1">
                {new Date(aviso.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};


export default HomePage;
