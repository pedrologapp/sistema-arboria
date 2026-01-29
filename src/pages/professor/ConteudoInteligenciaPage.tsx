import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Target, Lightbulb, Eye, FileText, Loader2, Download, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { CasaBrasao } from '@/components/CasaBrasao';
import { useProfessor } from '@/contexts/ProfessorContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Dados estáticos de conteúdo por inteligência
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

const SERIES_LABELS: Record<number, string> = {
  1: '1º ano',
  2: '2º ano',
  3: '3º ano',
  4: '4º ano',
  5: '5º ano',
  6: '6º ano',
  7: '7º ano',
  8: '8º ano',
  9: '9º ano',
};

interface ConteudoPDF {
  id: string;
  semana: number;
  titulo: string | null;
  arquivo_nome: string;
  arquivo_url: string;
  arquivo_tamanho: number | null;
}

const ConteudoInteligenciaPage = () => {
  const navigate = useNavigate();
  const { inteligenciaId } = useParams<{ inteligenciaId: string }>();
  const { segmento } = useProfessor();
  const { user } = useAuth();
  const [serieSelecionada, setSerieSelecionada] = useState<number | null>(null);

  // Buscar dados do professor (institution_id e turmas)
  const { data: professorData } = useQuery({
    queryKey: ['professor-turmas', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      // Buscar profile com institution_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('institution_id')
        .eq('id', user.id)
        .single();
      
      // Buscar turmas do professor
      const { data: turmas } = await supabase
        .from('professor_turma')
        .select('turma_id, turmas(serie)')
        .eq('professor_id', user.id)
        .eq('ativo', true);
      
      const series = [...new Set(turmas?.map((t: any) => t.turmas?.serie).filter(Boolean) || [])].sort((a, b) => a - b);
      
      return {
        institutionId: profile?.institution_id,
        series: series as number[]
      };
    },
    enabled: !!user?.id
  });

  // Selecionar primeira série automaticamente
  const serieAtiva = serieSelecionada || professorData?.series?.[0] || null;

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

  // Buscar PDFs do banco de dados
  const { data: conteudosPDF, isLoading: loadingPDFs } = useQuery({
    queryKey: ['conteudo-professor', professorData?.institutionId, inteligenciaId, serieAtiva],
    queryFn: async () => {
      if (!professorData?.institutionId || !serieAtiva) return [];
      
      const { data, error } = await supabase
        .from('conteudo_inteligencia')
        .select('id, semana, titulo, arquivo_nome, arquivo_url, arquivo_tamanho')
        .eq('institution_id', professorData.institutionId)
        .eq('inteligencia_id', parseInt(inteligenciaId || '0'))
        .eq('serie', serieAtiva)
        .order('semana');
      
      if (error) throw error;
      return (data as ConteudoPDF[]) || [];
    },
    enabled: !!professorData?.institutionId && !!serieAtiva && !!inteligenciaId
  });

  const conteudo = inteligenciaId ? conteudoInteligencias[parseInt(inteligenciaId)] : null;

  const formatarTamanho = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const baixarPDF = async (url: string, nomeArquivo: string) => {
    try {
      toast.info('Iniciando download...');
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = nomeArquivo;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      
      toast.success('Download concluído!');
    } catch {
      toast.error('Erro no download');
    }
  };

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
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-white/50" />
            <h2 className="text-white/50 text-xs uppercase tracking-wider">
              Materiais de Apoio
            </h2>
          </div>
          
          {/* Seletor de série se tiver múltiplas */}
          {professorData?.series && professorData.series.length > 1 && (
            <div className="relative">
              <select
                value={serieAtiva || ''}
                onChange={(e) => setSerieSelecionada(Number(e.target.value))}
                className="appearance-none bg-white/10 text-white text-sm px-3 py-1.5 pr-8 rounded-lg border border-white/20 focus:outline-none focus:border-white/40"
              >
                {professorData.series.map((serie) => (
                  <option key={serie} value={serie} className="bg-[#1E293B] text-white">
                    {SERIES_LABELS[serie]}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50 pointer-events-none" />
            </div>
          )}
        </div>

        {/* Título da série atual */}
        {serieAtiva && professorData?.series && professorData.series.length === 1 && (
          <p className="text-white/60 text-sm px-1">
            {SERIES_LABELS[serieAtiva]}
          </p>
        )}

        {loadingPDFs ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-white/40" />
          </div>
        ) : conteudosPDF && conteudosPDF.length > 0 ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((semana) => {
              const pdf = conteudosPDF.find(p => p.semana === semana);
              
              if (!pdf) {
                return (
                  <div key={semana} className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-white/40 text-sm">Semana {semana} — Nenhum material</p>
                  </div>
                );
              }
              
              return (
                <div key={semana} className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${corHex}20` }}
                      >
                        <FileText className="w-5 h-5" style={{ color: corHex }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium text-sm">Semana {semana}</p>
                        <p className="text-white/50 text-xs truncate">
                          {pdf.arquivo_nome}
                          {pdf.arquivo_tamanho && ` • ${formatarTamanho(pdf.arquivo_tamanho)}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={pdf.arquivo_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 text-xs text-white/70 hover:text-white border border-white/20 rounded-lg hover:bg-white/5 transition-colors"
                      >
                        Ver
                      </a>
                      <button
                        onClick={() => baixarPDF(pdf.arquivo_url, pdf.arquivo_nome)}
                        className="p-1.5 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <p className="text-amber-200/80 text-sm text-center">
              📚 Nenhum material disponível para {serieAtiva ? SERIES_LABELS[serieAtiva] : 'esta série'} ainda.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConteudoInteligenciaPage;
