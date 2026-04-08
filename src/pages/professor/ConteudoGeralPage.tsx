import { useNavigate } from 'react-router-dom';
import { ArrowLeft, TreePine, Heart, Eye, BookOpen, Sparkles, Users, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ConteudoGeralPage = () => {
  const navigate = useNavigate();

  const pilares = [
    {
      icon: Heart,
      title: 'Acolhimento',
      description: 'Criar um ambiente seguro onde cada criança se sinta valorizada e respeitada em sua individualidade.'
    },
    {
      icon: Eye,
      title: 'Observação',
      description: 'Desenvolver um olhar atento para identificar os talentos, interesses e necessidades de cada aluno.'
    },
    {
      icon: Sparkles,
      title: 'Potencialização',
      description: 'Oferecer oportunidades para que cada inteligência seja desenvolvida e celebrada.'
    },
    {
      icon: Users,
      title: 'Comunidade',
      description: 'Fortalecer os vínculos entre alunos, professores e famílias em torno do desenvolvimento integral.'
    }
  ];

  const guias = [
    {
      title: 'Como Observar Alunos',
      description: 'Técnicas e dicas para identificar sinais das inteligências múltiplas no dia a dia da sala de aula.',
      icon: Eye
    },
    {
      title: 'Registro de Observações',
      description: 'Orientações sobre como e quando registrar suas observações no sistema Arboria.',
      icon: BookOpen
    },
    {
      title: 'Atividades por Inteligência',
      description: 'Sugestões de atividades que estimulam cada uma das 8 inteligências.',
      icon: Target
    }
  ];

  return (
    <div className="space-y-6 py-4">
      {/* Header com voltar */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/professor/conteudo')}
          className="text-white/70 hover:text-white hover:bg-white/10"
        >
          <ArrowLeft size={20} />
        </Button>
        <div className="flex items-center gap-2">
          <TreePine className="w-6 h-6 text-emerald-400" />
          <h1 className="text-xl font-semibold text-white">Conteúdo Geral</h1>
        </div>
      </div>

      {/* Essência do Arboria */}
      <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 
        border border-emerald-500/20">
        <h2 className="text-lg font-semibold text-white mb-2">Essência do Arboria</h2>
        <p className="text-white/70 text-sm leading-relaxed">
          O Arboria é um sistema pedagógico baseado na Teoria das Inteligências Múltiplas 
          de Howard Gardner. Acreditamos que cada criança possui um conjunto único de 
          talentos e potenciais que merecem ser descobertos, nutridos e celebrados.
        </p>
      </div>

      {/* Pilares */}
      <div className="space-y-3">
        <h2 className="text-white/50 text-xs uppercase tracking-wider px-1">
          Os 4 Pilares
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {pilares.map((pilar, index) => (
            <div 
              key={index}
              className="p-3 rounded-xl bg-white/5 border border-violet-500/10"
            >
              <pilar.icon className="w-5 h-5 text-emerald-400 mb-2" />
              <p className="text-white font-medium text-sm">{pilar.title}</p>
              <p className="text-white/50 text-xs mt-1 leading-relaxed">
                {pilar.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Filosofia do Projeto */}
      <div className="space-y-3">
        <h2 className="text-white/50 text-xs uppercase tracking-wider px-1">
          Filosofia do Projeto
        </h2>
        <div className="p-4 rounded-xl bg-white/5 border border-violet-500/10 space-y-3">
          <p className="text-white/80 text-sm leading-relaxed">
            No Arboria, não existem crianças "melhores" ou "piores" - existem crianças 
            com diferentes combinações de inteligências. Nossa missão é ajudar cada 
            uma a descobrir seus pontos fortes e desenvolver todo seu potencial.
          </p>
          <p className="text-white/80 text-sm leading-relaxed">
            As 8 inteligências - Linguística, Lógico-Matemática, Espacial, Musical, 
            Corporal-Cinestésica, Interpessoal, Intrapessoal e Naturalista - são 
            trabalhadas em fases ao longo do ano letivo, permitindo que todos os 
            alunos tenham oportunidades de brilhar.
          </p>
        </div>
      </div>

      {/* Guias para o Professor */}
      <div className="space-y-3">
        <h2 className="text-white/50 text-xs uppercase tracking-wider px-1">
          Guias para o Professor
        </h2>
        <div className="space-y-2">
          {guias.map((guia, index) => (
            <div 
              key={index}
              className="p-3 rounded-xl bg-white/5 border border-violet-500/10 
                flex items-start gap-3"
            >
              <div className="w-10 h-10 rounded-lg bg-indigo-500/20 
                flex items-center justify-center flex-shrink-0">
                <guia.icon className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <p className="text-white font-medium text-sm">{guia.title}</p>
                <p className="text-white/50 text-xs mt-0.5">{guia.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Nota informativa */}
      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
        <p className="text-amber-200/80 text-xs text-center">
          💡 Em breve: materiais em PDF para download e vídeos tutoriais.
        </p>
      </div>
    </div>
  );
};

export default ConteudoGeralPage;
