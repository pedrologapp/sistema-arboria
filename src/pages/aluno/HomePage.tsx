import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { Target, MessageCircle, Shield, User, Star, AlertTriangle, Trophy } from 'lucide-react';
import { useStudent } from '@/contexts/StudentContext';
import { useNotificacoes } from '@/hooks/useNotificacoes';
import { CasaBrasao } from '@/components/CasaBrasao';
import { supabase } from '@/integrations/supabase/client';
import { Progress } from '@/components/ui/progress';

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
    'Sua voz tem poder — use com sabedoria',
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
    'O mundo e uma tela — e voce esta pintando',
    'Cada forma esconde uma ideia esperando nascer',
  ],
  musical: [
    'O ritmo do dia esta em voce',
    'Voce ouve o que outros nao percebem',
    'A musica nao e so som — e como voce sente o mundo',
    'Cada silencio tem um compasso',
  ],
  corporal_cinestesica: [
    'Seu corpo sabe mais do que imagina',
    'O movimento e a sua linguagem',
    'Nao pense demais — sinta e aja',
    'Cada gesto seu conta uma historia',
  ],
  naturalista: [
    'Olhe ao redor. O que voce nota?',
    'A natureza fala — voce so precisa ouvir',
    'Padroes estao em todo lugar esperando por voce',
    'O mundo e um sistema vivo — e voce faz parte dele',
  ],
  interpessoal: [
    'Alguem precisa de voce hoje',
    'Voce entende as pessoas como ninguem',
    'Conexoes verdadeiras mudam o mundo',
    'Liderar e servir — e voce sabe como',
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white/20" />
      </div>
    );
  }

  const firstName = profile?.nome?.split(' ')[0] || 'Aluno';

  const quickActions = [
    { id: 'missoes', icon: Target, label: 'Missoes', description: 'Ver missoes da fase', path: '/aluno/missoes', badge: missoesPendentes > 0 ? missoesPendentes : undefined, color: '#f59e0b', bgColor: 'rgba(245,158,11,0.12)' },
    { id: 'chat', icon: MessageCircle, label: 'Chat', description: 'Conversar com a casa', path: '/aluno/chat', badge: mensagensNaoLidas > 0 ? mensagensNaoLidas : undefined, color: '#8b5cf6', bgColor: 'rgba(139,92,246,0.12)' },
    { id: 'casa', icon: Shield, label: 'Minha Casa', description: 'Membros e ranking', path: '/aluno/casa', color: '#10b981', bgColor: 'rgba(16,185,129,0.12)' },
    { id: 'conquistas', icon: Trophy, label: 'Conquistas', description: 'Desbloqueie premios', path: '/aluno/conquistas', color: '#f59e0b', bgColor: 'rgba(245,158,11,0.12)' },
    { id: 'perfil', icon: User, label: 'Perfil', description: 'Suas inteligencias', path: '/aluno/perfil', color: '#ec4899', bgColor: 'rgba(236,72,153,0.12)' },
  ];

  const isPrimeiro = ranking?.posicao_na_casa === 1 && (ranking?.total_pontos || 0) > 0;
  const semanaAtual = faseAtual?.semana_atual || 1;

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

  return (
    <div className="p-4 space-y-4 pb-24">
      {/* Saudacao */}
      <div className="pt-2 animate-fade-in">
        <h1 className="text-xl font-bold text-white">
          {getSaudacao()}, {firstName}!
        </h1>
        <p className="text-sm text-white/35 mt-0.5">{getFraseMotivacional()}</p>
      </div>

      {/* Card de Urgencia */}
      {missoesUrgentes && missoesUrgentes.length > 0 && (
        <button
          onClick={() => navigate('/aluno/missoes')}
          className="w-full p-3 rounded-2xl text-left bg-amber-500/10 border border-amber-500/25 hover:bg-amber-500/15 transition-colors active:scale-[0.98]"
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <div className="flex-1">
              <p className="text-white text-sm font-medium">
                {missoesUrgentes.length === 1 ? '1 missao para entregar' : `${missoesUrgentes.length} missoes para entregar`}
              </p>
              <p className="text-amber-400/50 text-[10px] mt-0.5">Prazo encerrando</p>
            </div>
          </div>
        </button>
      )}

      {/* CARD DA CASA */}
      {casa && (
        <div
          className="relative overflow-hidden rounded-3xl border animate-fade-in animate-fade-in-d1"
          style={{ borderColor: `${casaColor}30`, boxShadow: `0 20px 50px -12px ${casaColor}35` }}
        >
          {/* Background gradient com cor da casa */}
          <div className="absolute inset-0" style={{ background: `linear-gradient(160deg, ${casaColor}20 0%, #252547 50%, #1A1A2E 100%)` }} />
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
                <p className="text-white/50 text-sm mt-0.5">{cargo || 'Membro'}</p>
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
                <span className="text-xl font-bold text-white">{ranking?.posicao_na_casa || '--'}</span>
                <span className="text-white/30 text-xs align-top">º</span>
                <p className="text-[10px] text-white/30 mt-0.5">na casa</p>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div className="flex-1 text-center">
                <span className="text-xl font-bold text-white">{ranking?.missoes_completadas || 0}</span>
                <p className="text-[10px] text-white/30 mt-0.5">missoes</p>
              </div>
            </div>

            {/* Fase */}
            {faseAtual && faseAtual.inteligencia && (
              <div className="mt-4 pt-4 border-t" style={{ borderColor: `${casaColor}15` }}>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-white/50">
                    Fase {faseAtual.numero_fase} — {faseAtual.inteligencia.nome}
                  </p>
                  <span className="text-[10px] text-white/30">S{semanaAtual}/4</span>
                </div>
                <div className="mt-1.5 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${(semanaAtual / 4) * 100}%`, backgroundColor: casaColor }} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MISSOES em destaque */}
      <button
        onClick={() => navigate('/aluno/missoes')}
        className="relative w-full p-4 rounded-2xl text-left overflow-hidden border active:scale-[0.98] transition-all animate-fade-in animate-fade-in-d2"
        style={{ borderColor: `${casaColor}20`, background: `linear-gradient(135deg, ${casaColor}12, #252547)` }}
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl" style={{ backgroundColor: `${casaColor}20` }}>
            <Target className="w-6 h-6" style={{ color: casaColor }} />
          </div>
          <div className="flex-1">
            <p className="text-white font-semibold text-sm">Missoes da Fase</p>
            <p className="text-white/40 text-[11px] mt-0.5">Semana {semanaAtual} de 4</p>
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
          { icon: MessageCircle, label: 'Chat', path: '/aluno/chat', badge: mensagensNaoLidas, color: '#8b5cf6' },
          { icon: Shield, label: 'Casa', path: '/aluno/casa', color: '#10b981' },
          { icon: Trophy, label: 'Conquistas', path: '/aluno/conquistas', color: '#f59e0b' },
          { icon: User, label: 'Perfil', path: '/aluno/perfil', color: '#ec4899' },
        ].map(item => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className="relative flex-1 flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-[#252547] border border-violet-500/10 hover:bg-white/[0.06] transition-all active:scale-[0.95]"
            >
              {item.badge && item.badge > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
              )}
              <Icon className="w-5 h-5" style={{ color: item.color }} />
              <span className="text-[10px] text-white/50">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Check-in emocional (so aparece 1x por dia) */}
      <CheckInEmocional userId={profile?.id} casaColor={casaColor} />

      {/* Campo de relato */}
      <CampoRelato userId={profile?.id} institutionId={profile?.institution_id} faseId={faseAtual?.id} semana={semanaAtual} casaColor={casaColor} />

      {/* Frase viva — rotativa com fade */}
      {frasesDisponiveis.length > 0 && (
        <div className="animate-fade-in animate-fade-in-d5 text-center py-6 mb-4">
          <p
            className="text-lg italic leading-relaxed transition-all duration-400 px-4"
            style={{
              color: `${casaColor}90`,
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
    const hoje = new Date().toISOString().split('T')[0];
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
    const hoje = new Date().toISOString().split('T')[0];
    await supabase.from('checkin_emocional').upsert(
      { aluno_id: userId, emoji, label, data: hoje },
      { onConflict: 'aluno_id,data' }
    );
    setJaRespondeu(true);
    setSalvando(false);
  };

  if (jaRespondeu) return null;

  return (
    <div className="animate-fade-in animate-fade-in-d4 rounded-2xl border p-4" style={{ borderColor: `${casaColor}20`, background: `linear-gradient(135deg, ${casaColor}08, #252547)` }}>
      <p className="text-sm text-white/60 mb-3">Como voce esta se sentindo hoje?</p>
      <div className="flex justify-between gap-1">
        {emojisCheckin.map(({ emoji, label }) => (
          <button
            key={emoji}
            onClick={() => salvar(emoji, label)}
            className={`flex flex-col items-center gap-1 p-1.5 rounded-xl transition-all active:scale-90 ${
              selecionado === emoji ? 'bg-white/10 scale-110' : 'hover:bg-white/5'
            }`}
          >
            <span className="text-2xl">{emoji}</span>
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
    await supabase.from('relatos_alunos').insert({
      aluno_id: userId,
      institution_id: institutionId,
      fase_id: faseId || null,
      semana,
      texto: texto.trim(),
    });
    setTexto('');
    setEnviado(true);
    setSalvando(false);
    setTimeout(() => setEnviado(false), 3000);
  };

  return (
    <div className="animate-fade-in animate-fade-in-d4 rounded-2xl border p-4" style={{ borderColor: `${casaColor}20`, background: `linear-gradient(135deg, ${casaColor}08, #252547)` }}>
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
            style={{ backgroundColor: `${casaColor}30`, color: casaColor }}
          >
            {salvando ? 'Enviando...' : 'Enviar'}
          </button>
        )}
      </div>
    </div>
  );
};

export default HomePage;
