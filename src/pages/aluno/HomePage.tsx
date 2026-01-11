import { useNavigate } from 'react-router-dom';
import { useStudent } from '@/contexts/StudentContext';
import { useNotificacoes } from '@/hooks/useNotificacoes';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CasaBrasao } from '@/components/CasaBrasao';
import { Target, MessageCircle, Home, ChevronRight, Star } from 'lucide-react';

const CARGO_LABEL: Record<string, string> = {
  lider: 'Líder',
  coordenador: 'Coordenador',
  embaixador: 'Embaixador',
};

const HomePage = () => {
  const navigate = useNavigate();
  const { profile, casa, casaColor, ranking, faseAtual, isLoading } = useStudent();
  const { mensagensNaoLidas } = useNotificacoes();

  // Query: Buscar cargo do aluno
  const { data: meuCargo } = useQuery({
    queryKey: ['meu-cargo', profile?.id, casa?.id],
    queryFn: async () => {
      if (!profile?.id || !casa?.id) return null;
      
      const { data } = await supabase
        .from('cargos_casa')
        .select('cargo')
        .eq('aluno_id', profile.id)
        .eq('casa_id', casa.id)
        .eq('ativo', true)
        .maybeSingle();
      
      return data?.cargo || null;
    },
    enabled: !!profile?.id && !!casa?.id,
    staleTime: 60000,
  });

  const primeiroNome = profile?.nome || profile?.full_name?.split(' ')[0] || 'Aluno';
  const cargoLabel = meuCargo ? CARGO_LABEL[meuCargo] || 'Membro' : 'Membro';
  const pontos = ranking?.total_pontos || 0;

  // Calcular semana atual da fase
  const semanaAtual = faseAtual?.semana_atual || 1;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500" />
      </div>
    );
  }

  const acoesRapidas = [
    {
      id: 'missoes',
      icon: Target,
      titulo: 'Missões',
      subtitulo: 'Ver missões da fase',
      path: '/aluno/missoes',
      badge: null,
    },
    {
      id: 'chat',
      icon: MessageCircle,
      titulo: 'Chat',
      subtitulo: 'Conversar com mentor',
      path: '/aluno/chat',
      badge: mensagensNaoLidas > 0 ? mensagensNaoLidas : null,
    },
    {
      id: 'casa',
      icon: Home,
      titulo: 'Minha Casa',
      subtitulo: `Conhecer a Casa ${casa?.nome || ''}`,
      path: '/aluno/casa',
      badge: null,
    },
  ];

  return (
    <div className="min-h-screen bg-black pb-24 px-4 pt-4">
      {/* Saudação */}
      <h1 className="text-2xl font-bold text-white text-center mb-6">
        Olá, {primeiroNome}!
      </h1>

      {/* Card Principal - Brasão e Info */}
      <div 
        className="rounded-2xl p-6 mb-8 border"
        style={{
          backgroundColor: casaColor ? `${casaColor}10` : 'rgba(255,255,255,0.05)',
          borderColor: casaColor ? `${casaColor}30` : 'rgba(255,255,255,0.1)',
        }}
      >
        <div className="flex flex-col items-center text-center space-y-3">
          {/* Brasão */}
          <CasaBrasao
            brasaoUrl={casa?.brasao_url}
            emoji={casa?.emoji}
            nome={casa?.nome}
            size="xl"
          />

          {/* Nome da Casa */}
          <h2 className="text-xl font-semibold text-white">
            Casa {casa?.nome || 'Desconhecida'}
          </h2>

          {/* Cargo */}
          <span 
            className="text-sm font-medium px-3 py-1 rounded-full"
            style={{
              backgroundColor: casaColor ? `${casaColor}20` : 'rgba(255,255,255,0.1)',
              color: casaColor || 'rgba(255,255,255,0.7)',
            }}
          >
            {cargoLabel}
          </span>

          {/* Pontos */}
          <div className="flex items-center gap-2 text-white">
            <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
            <span className="text-lg font-bold">{pontos} pontos</span>
          </div>

          {/* Card Fase Atual */}
          {faseAtual && (
            <div 
              className="w-full mt-4 rounded-xl p-4 border"
              style={{
                backgroundColor: casaColor ? `${casaColor}15` : 'rgba(255,255,255,0.05)',
                borderColor: casaColor ? `${casaColor}40` : 'rgba(255,255,255,0.15)',
              }}
            >
              <p className="text-white font-medium">
                Fase atual: <span className="uppercase">{faseAtual.inteligencia?.nome || 'Indefinida'}</span>
              </p>
              <p className="text-white/60 text-sm mt-1">
                Semana {semanaAtual} de 4
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Ações Rápidas */}
      <div className="space-y-3">
        <h3 className="text-xs font-medium text-white/50 uppercase tracking-wider px-1">
          Ações Rápidas
        </h3>

        {acoesRapidas.map((acao) => {
          const IconComponent = acao.icon;
          return (
            <button
              key={acao.id}
              onClick={() => navigate(acao.path)}
              className="w-full flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-left"
            >
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  backgroundColor: casaColor ? `${casaColor}20` : 'rgba(255,255,255,0.1)',
                }}
              >
                <IconComponent 
                  className="w-5 h-5" 
                  style={{ color: casaColor || 'white' }}
                />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium">{acao.titulo}</span>
                  {acao.badge && (
                    <span className="px-2 py-0.5 text-xs font-bold bg-red-500 text-white rounded-full">
                      {acao.badge}
                    </span>
                  )}
                </div>
                <p className="text-white/50 text-sm truncate">{acao.subtitulo}</p>
              </div>

              <ChevronRight className="w-5 h-5 text-white/30 flex-shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default HomePage;
