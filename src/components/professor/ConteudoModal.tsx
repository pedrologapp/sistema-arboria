import { useState, useEffect } from 'react';
import { X, FileText, ExternalLink, Download, BookOpen, TreePine, Calendar, ChevronDown, Loader2 } from 'lucide-react';
import AnimatedTextCycle from '@/components/ui/animated-text-cycle';
import { supabase } from '@/integrations/supabase/client';
import { useProfessor } from '@/contexts/ProfessorContext';

interface FaseAtual {
  inteligencia?: {
    id?: number;
    nome?: string;
  };
}

interface ConteudoModalProps {
  isOpen: boolean;
  onClose: () => void;
  faseAtual: FaseAtual | null;
}

interface ConteudoItem {
  id: string;
  semana: number;
  titulo: string | null;
  descricao: string | null;
  arquivo_url: string;
  arquivo_nome: string;
}

const pilares = ['Consciência', 'Integralidade', 'Necessidade', 'Acreditar'];

const series = [
  { num: 6, label: '6º ano', emoji: '📘' },
  { num: 7, label: '7º ano', emoji: '📗' },
  { num: 8, label: '8º ano', emoji: '📙' },
  { num: 9, label: '9º ano', emoji: '📕' },
];

const coresSemana = [
  { bg: 'bg-blue-500/20', text: 'text-blue-400', glow: 'hover:shadow-blue-500/20' },
  { bg: 'bg-purple-500/20', text: 'text-purple-400', glow: 'hover:shadow-purple-500/20' },
  { bg: 'bg-emerald-500/20', text: 'text-emerald-400', glow: 'hover:shadow-emerald-500/20' },
  { bg: 'bg-orange-500/20', text: 'text-orange-400', glow: 'hover:shadow-orange-500/20' },
  { bg: 'bg-pink-500/20', text: 'text-pink-400', glow: 'hover:shadow-pink-500/20' },
];

const ConteudoModal = ({ isOpen, onClose, faseAtual }: ConteudoModalProps) => {
  const { casaMentor } = useProfessor();
  const [serieAberta, setSerieAberta] = useState<number | null>(null);
  const [conteudos, setConteudos] = useState<Record<number, ConteudoItem[]>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !casaMentor?.id) return;
    
    const fetchConteudos = async () => {
      setLoading(true);
      try {
        // Buscar fases ativas para essa inteligência, segmento fundamental2, séries 6-9
        const { data: fasesData } = await supabase
          .from('fases')
          .select('id, serie')
          .eq('inteligencia_id', casaMentor!.id)
          .eq('segmento', 'fundamental2')
          .in('serie', [6, 7, 8, 9]);

        if (!fasesData || fasesData.length === 0) {
          setConteudos({});
          setLoading(false);
          return;
        }

        const faseIds = fasesData.map(f => f.id);
        const faseSerieMap: Record<string, number> = {};
        fasesData.forEach(f => { if (f.serie) faseSerieMap[f.id] = f.serie; });

        const { data: conteudosData } = await supabase
          .from('fase_conteudos')
          .select('id, semana, titulo, descricao, arquivo_url, arquivo_nome, fase_id')
          .in('fase_id', faseIds)
          .order('semana', { ascending: true });

        // Agrupar por série
        const agrupado: Record<number, ConteudoItem[]> = {};
        conteudosData?.forEach(c => {
          const serie = faseSerieMap[(c as any).fase_id];
          if (serie) {
            if (!agrupado[serie]) agrupado[serie] = [];
            agrupado[serie].push(c);
          }
        });

        setConteudos(agrupado);
      } catch (err) {
        console.error('Erro ao buscar conteúdos:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchConteudos();
  }, [isOpen, casaMentor?.id]);

  if (!isOpen) return null;

  const handleDownload = async (url: string, nome: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = nome;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (err) {
      console.error('Erro ao baixar:', err);
      window.open(url, '_blank');
    }
  };

  const toggleSerie = (serie: number) => {
    setSerieAberta(prev => prev === serie ? null : serie);
  };

  const getLabelSemana = (semana: number) => {
    if (semana === 0) return 'Conteúdo Geral';
    return `Semana ${semana}`;
  };

  return (
    <div 
      className="fixed inset-0 bg-[#12122A]/95 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div 
        className="bg-[#252547] backdrop-blur-xl rounded-2xl w-full max-w-md max-h-[70vh] overflow-hidden flex flex-col border border-violet-500/10 shadow-2xl shadow-black/50"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-violet-500/10">
          <div>
            <h3 className="text-white font-semibold flex items-center gap-2">
              <BookOpen className="w-4 h-4" /> Conteúdo
            </h3>
            <p className="text-white/50 text-xs mt-0.5 font-light">
              Materiais da {casaMentor?.nome || 'sua casa'}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 text-white/40 hover:bg-white/10 hover:text-white transition-all duration-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Conteúdo com scroll */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          
          {/* Essência do Arboria */}
          <div>
            <p className="text-white/50 text-xs uppercase tracking-widest mb-3 flex items-center gap-2 font-medium">
              <TreePine className="w-4 h-4" /> Essência do Arboria
            </p>
            
            <div className="relative overflow-hidden rounded-xl p-6 bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-sm border border-violet-500/10">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
              
              <p className="relative text-white/70 text-sm font-light text-center mb-1">
                O Projeto Arboria é construído
              </p>
              <p className="relative text-white/70 text-sm font-light text-center mb-6">
                sobre o pilar da
              </p>
              
              <div className="relative flex justify-center min-h-[40px] items-center">
                <div className="relative">
                  <div className="absolute inset-0 blur-xl bg-emerald-500/30 scale-150" />
                  <AnimatedTextCycle
                    words={pilares}
                    interval={3000}
                    className="relative text-2xl font-bold bg-gradient-to-r from-emerald-300 to-emerald-500 bg-clip-text text-transparent"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Materiais por Série */}
          <div>
            <p className="text-white/50 text-xs uppercase tracking-widest mb-3 flex items-center gap-2 font-medium">
              <Calendar className="w-4 h-4" /> Materiais por Série
            </p>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 text-white/40 animate-spin" />
              </div>
            ) : (
              <div className="space-y-2">
                {series.map((serie) => {
                  const itens = conteudos[serie.num] || [];
                  const isOpen = serieAberta === serie.num;

                  return (
                    <div key={serie.num} className="rounded-xl border border-violet-500/10 overflow-hidden">
                      <button
                        onClick={() => toggleSerie(serie.num)}
                        className={`w-full p-4 text-left flex items-center gap-3
                          bg-gradient-to-r from-white/[0.06] to-white/[0.02]
                          hover:from-white/[0.10] hover:to-white/[0.04]
                          transition-all duration-300 ease-out`}
                      >
                        <span className="text-lg">{serie.emoji}</span>
                        <span className="flex-1 text-white font-semibold">{serie.label}</span>
                        {itens.length > 0 && (
                          <span className="text-white/30 text-xs mr-2">{itens.length} {itens.length === 1 ? 'arquivo' : 'arquivos'}</span>
                        )}
                        <ChevronDown className={`w-4 h-4 text-white/40 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {isOpen && (
                        <div className="border-t border-violet-500/5 p-2 space-y-1">
                          {itens.length === 0 ? (
                            <p className="text-white/30 text-sm text-center py-4 font-light">
                              Nenhum material disponível
                            </p>
                          ) : (
                            itens.map((item, idx) => {
                              const cor = coresSemana[item.semana % coresSemana.length];
                              return (
                                <button
                                  key={item.id}
                                  onClick={() => window.open(item.arquivo_url, '_blank')}
                                  className={`w-full p-3 rounded-lg text-left flex items-center gap-3
                                    bg-white/[0.03] hover:bg-white/[0.07]
                                    hover:scale-[1.01]
                                    transition-all duration-200 ease-out
                                    active:scale-[0.99]`}
                                >
                                  <div className={`w-8 h-8 rounded-lg ${cor.bg} flex items-center justify-center`}>
                                    <FileText className={`w-4 h-4 ${cor.text}`} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-white font-medium text-sm">
                                      {getLabelSemana(item.semana)}
                                    </p>
                                    {item.titulo && (
                                      <p className="text-white/40 text-xs truncate">{item.titulo}</p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      onClick={(e) => handleDownload(item.arquivo_url, item.arquivo_nome, e)}
                                      className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-white/10 transition-colors"
                                      title="Baixar arquivo"
                                    >
                                      <Download className="w-3.5 h-3.5 text-white/40 hover:text-white/70" />
                                    </button>
                                    <ExternalLink className="w-3.5 h-3.5 text-white/25" />
                                  </div>
                                </button>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-violet-500/10">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl font-medium text-sm text-white
              bg-gradient-to-r from-white/10 to-white/5
              border border-violet-500/10
              hover:from-white/15 hover:to-white/10
              hover:border-white/20
              transition-all duration-300
              active:scale-[0.98]"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConteudoModal;
