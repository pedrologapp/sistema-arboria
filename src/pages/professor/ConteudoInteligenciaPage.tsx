import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Target, Lightbulb, Eye, FileText, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { CasaBrasao } from '@/components/CasaBrasao';
import { useProfessor } from '@/contexts/ProfessorContext';

// Dados estáticos de conteúdo por inteligência (pode ser migrado para DB futuramente)
const conteudoInteligencias: Record<number, {
  descricao: string;
  objetivos: string[];
  atividades: string[];
  sinais: string[];
}> = {
  1: { // Linguística
    descricao: 'A inteligência linguística envolve a capacidade de usar palavras de forma eficaz, seja oralmente ou por escrito. Crianças com essa inteligência desenvolvida gostam de ler, escrever, contar histórias e brincar com palavras.',
    objetivos: [
      'Desenvolver o prazer pela leitura e escrita',
      'Ampliar o vocabulário de forma lúdica',
      'Estimular a expressão oral e narrativa',
      'Incentivar a criação de histórias e poesias'
    ],
    atividades: [
      'Roda de histórias e contação',
      'Jogos de palavras e rimas',
      'Diário ilustrado',
      'Teatro de fantoches',
      'Criação de pequenos livros'
    ],
    sinais: [
      'Gosta de ouvir e contar histórias',
      'Aprende palavras novas com facilidade',
      'Expressa ideias com clareza',
      'Faz perguntas elaboradas',
      'Cria histórias ou rimas espontaneamente'
    ]
  },
  2: { // Lógico-Matemática
    descricao: 'A inteligência lógico-matemática refere-se à capacidade de usar números, raciocinar logicamente e resolver problemas. Crianças com essa inteligência gostam de puzzles, jogos de estratégia e experimentos.',
    objetivos: [
      'Desenvolver o raciocínio lógico',
      'Estimular a resolução de problemas',
      'Trabalhar conceitos matemáticos de forma concreta',
      'Incentivar a curiosidade científica'
    ],
    atividades: [
      'Jogos de tabuleiro estratégicos',
      'Quebra-cabeças e tangram',
      'Experimentos científicos simples',
      'Classificação e seriação de objetos',
      'Desafios de lógica adaptados à idade'
    ],
    sinais: [
      'Gosta de jogos de encaixe e puzzles',
      'Faz perguntas sobre "como funciona"',
      'Organiza objetos por categorias',
      'Demonstra interesse por números',
      'Busca padrões e sequências'
    ]
  },
  3: { // Espacial
    descricao: 'A inteligência espacial envolve a capacidade de pensar em imagens e visualizar com precisão. Crianças com essa inteligência gostam de desenhar, construir e trabalhar com cores e formas.',
    objetivos: [
      'Desenvolver a percepção visual e espacial',
      'Estimular a criatividade artística',
      'Trabalhar noções de espaço e proporção',
      'Incentivar a expressão através de imagens'
    ],
    atividades: [
      'Desenho e pintura livre',
      'Construções com blocos e massinha',
      'Mapas do tesouro',
      'Origami simples',
      'Jogos de memória visual'
    ],
    sinais: [
      'Gosta de desenhar e colorir',
      'Monta quebra-cabeças com facilidade',
      'Tem boa memória visual',
      'Cria construções elaboradas',
      'Percebe detalhes nas imagens'
    ]
  },
  4: { // Musical
    descricao: 'A inteligência musical refere-se à capacidade de perceber, discriminar e expressar formas musicais. Crianças com essa inteligência são sensíveis a ritmos, melodias e sons.',
    objetivos: [
      'Desenvolver a percepção auditiva',
      'Estimular a expressão através da música',
      'Trabalhar ritmo e coordenação',
      'Ampliar o repertório musical'
    ],
    atividades: [
      'Cantigas e brincadeiras de roda',
      'Exploração de instrumentos musicais',
      'Jogos rítmicos com palmas e batidas',
      'Criação de sons com materiais diversos',
      'Dança e expressão corporal com música'
    ],
    sinais: [
      'Canta espontaneamente',
      'Memoriza melodias com facilidade',
      'Bate palmas ou pés no ritmo',
      'Reconhece sons e instrumentos',
      'Cria músicas ou ritmos próprios'
    ]
  },
  5: { // Corporal-Cinestésica
    descricao: 'A inteligência corporal-cinestésica envolve a capacidade de usar o corpo para expressar ideias e sentimentos. Crianças com essa inteligência aprendem melhor através do movimento e da manipulação.',
    objetivos: [
      'Desenvolver a coordenação motora',
      'Estimular a expressão corporal',
      'Trabalhar equilíbrio e consciência corporal',
      'Incentivar o aprendizado através do movimento'
    ],
    atividades: [
      'Circuitos motores',
      'Dança e expressão corporal',
      'Jogos de imitação',
      'Atividades com bolas e cordas',
      'Teatro e dramatização'
    ],
    sinais: [
      'Tem dificuldade em ficar parado',
      'Aprende fazendo, não apenas ouvindo',
      'Boa coordenação motora',
      'Gosta de atividades físicas',
      'Expressa emoções com o corpo'
    ]
  },
  6: { // Interpessoal
    descricao: 'A inteligência interpessoal refere-se à capacidade de perceber e compreender outras pessoas. Crianças com essa inteligência são boas em interações sociais e trabalho em grupo.',
    objetivos: [
      'Desenvolver habilidades sociais',
      'Estimular a empatia e cooperação',
      'Trabalhar resolução de conflitos',
      'Incentivar a liderança positiva'
    ],
    atividades: [
      'Projetos em grupo',
      'Jogos cooperativos',
      'Roda de conversa sobre sentimentos',
      'Brincadeiras de faz-de-conta social',
      'Ajudante do dia'
    ],
    sinais: [
      'Faz amizades com facilidade',
      'Lidera brincadeiras naturalmente',
      'Percebe quando outros estão tristes',
      'Gosta de trabalhar em grupo',
      'Resolve conflitos entre colegas'
    ]
  },
  7: { // Intrapessoal
    descricao: 'A inteligência intrapessoal envolve o autoconhecimento e a capacidade de usar esse conhecimento para guiar o próprio comportamento. Crianças com essa inteligência são reflexivas e automotivadas.',
    objetivos: [
      'Desenvolver o autoconhecimento',
      'Estimular a reflexão sobre emoções',
      'Trabalhar autorregulação',
      'Incentivar a autonomia'
    ],
    atividades: [
      'Momentos de reflexão guiada',
      'Diário de sentimentos',
      'Cantinho da calma',
      'Escolhas individuais de atividades',
      'Autoavaliação simples'
    ],
    sinais: [
      'Gosta de momentos sozinho',
      'Reflete antes de agir',
      'Expressa seus sentimentos com clareza',
      'Tem opiniões próprias',
      'Demonstra autonomia nas atividades'
    ]
  },
  8: { // Naturalista
    descricao: 'A inteligência naturalista refere-se à capacidade de reconhecer e classificar plantas, animais e outros elementos da natureza. Crianças com essa inteligência têm forte conexão com o mundo natural.',
    objetivos: [
      'Desenvolver a consciência ambiental',
      'Estimular a observação da natureza',
      'Trabalhar classificação de elementos naturais',
      'Incentivar o cuidado com o meio ambiente'
    ],
    atividades: [
      'Exploração do jardim/horta',
      'Observação de insetos e plantas',
      'Coleções naturais (folhas, pedras)',
      'Cuidado com plantas ou animais',
      'Experiências com elementos naturais'
    ],
    sinais: [
      'Gosta de estar ao ar livre',
      'Observa animais e plantas com atenção',
      'Coleciona elementos da natureza',
      'Faz perguntas sobre fenômenos naturais',
      'Demonstra cuidado com seres vivos'
    ]
  }
};

const ConteudoInteligenciaPage = () => {
  const navigate = useNavigate();
  const { inteligenciaId } = useParams<{ inteligenciaId: string }>();
  const { segmento } = useProfessor();

  const { data: inteligencia, isLoading } = useQuery({
    queryKey: ['inteligencia', inteligenciaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inteligencias')
        .select('id, nome, emoji, cor_hex, brasao_url, descricao')
        .eq('id', parseInt(inteligenciaId || '0'))
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!inteligenciaId
  });

  const conteudo = inteligenciaId ? conteudoInteligencias[parseInt(inteligenciaId)] : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-white/50" />
      </div>
    );
  }

  if (!inteligencia || !conteudo) {
    return (
      <div className="py-8 text-center">
        <p className="text-white/50">Inteligência não encontrada.</p>
        <Button
          variant="ghost"
          onClick={() => navigate('/professor/conteudo')}
          className="mt-4 text-white/70"
        >
          Voltar
        </Button>
      </div>
    );
  }

  const corHex = inteligencia.cor_hex || '#6366f1';

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
        <CasaBrasao 
          brasaoUrl={inteligencia.brasao_url}
          emoji={inteligencia.emoji}
          nome={inteligencia.nome}
          size="small"
        />
        <h1 className="text-xl font-semibold text-white">{inteligencia.nome}</h1>
      </div>

      {/* Descrição da Fase */}
      <div 
        className="p-4 rounded-xl border"
        style={{ 
          backgroundColor: `${corHex}15`,
          borderColor: `${corHex}30`
        }}
      >
        <h2 className="text-lg font-semibold text-white mb-2">Sobre esta Inteligência</h2>
        <p className="text-white/70 text-sm leading-relaxed">
          {conteudo.descricao}
        </p>
      </div>

      {/* Objetivos */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <Target className="w-4 h-4 text-white/50" />
          <h2 className="text-white/50 text-xs uppercase tracking-wider">
            Objetivos da Fase
          </h2>
        </div>
        <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
          {conteudo.objetivos.map((objetivo, index) => (
            <div key={index} className="flex items-start gap-2">
              <div 
                className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0"
                style={{ backgroundColor: corHex }}
              />
              <p className="text-white/80 text-sm">{objetivo}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Atividades Sugeridas */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <Lightbulb className="w-4 h-4 text-white/50" />
          <h2 className="text-white/50 text-xs uppercase tracking-wider">
            Atividades Sugeridas
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-2">
          {conteudo.atividades.map((atividade, index) => (
            <div 
              key={index} 
              className="p-3 rounded-xl bg-white/5 border border-white/10
                flex items-center gap-3"
            >
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-medium text-sm"
                style={{ backgroundColor: `${corHex}30` }}
              >
                {index + 1}
              </div>
              <p className="text-white/80 text-sm">{atividade}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Sinais para Observar */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <Eye className="w-4 h-4 text-white/50" />
          <h2 className="text-white/50 text-xs uppercase tracking-wider">
            Sinais para Observar
          </h2>
        </div>
        <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
          {conteudo.sinais.map((sinal, index) => (
            <div key={index} className="flex items-start gap-2">
              <Eye 
                className="w-4 h-4 mt-0.5 flex-shrink-0"
                style={{ color: corHex }}
              />
              <p className="text-white/80 text-sm">{sinal}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Materiais de Apoio */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <FileText className="w-4 h-4 text-white/50" />
          <h2 className="text-white/50 text-xs uppercase tracking-wider">
            Materiais de Apoio
          </h2>
        </div>
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <p className="text-amber-200/80 text-xs text-center">
            💡 Em breve: PDFs com atividades detalhadas para cada semana.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ConteudoInteligenciaPage;
