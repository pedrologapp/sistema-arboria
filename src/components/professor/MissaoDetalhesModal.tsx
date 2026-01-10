import { X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import ReactMarkdown from 'react-markdown';

interface MissaoDetalhesModalProps {
  isOpen: boolean;
  onClose: () => void;
  missaoId: string | null;
}

const MissaoDetalhesModal = ({ isOpen, onClose, missaoId }: MissaoDetalhesModalProps) => {
  const { data: missao, isLoading } = useQuery({
    queryKey: ['missao-modal', missaoId],
    queryFn: async () => {
      if (!missaoId) return null;
      const { data, error } = await supabase
        .from('missoes')
        .select(`
          *,
          inteligencia_cross_rel:inteligencias!missoes_inteligencia_cross_fkey(nome, emoji)
        `)
        .eq('id', missaoId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!missaoId && isOpen
  });

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div 
        className="bg-[#1a1a1a] rounded-xl p-5 max-w-md w-full max-h-[85vh] overflow-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-white font-bold">Detalhes da Missão</h3>
          <button 
            onClick={onClose} 
            className="text-white/60 hover:text-white p-1 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Loading */}
        {isLoading && (
          <div className="space-y-3">
            <div className="h-6 bg-white/10 rounded animate-pulse w-3/4" />
            <div className="h-4 bg-white/10 rounded animate-pulse w-1/2" />
            <div className="h-20 bg-white/10 rounded animate-pulse" />
          </div>
        )}
        
        {/* Conteúdo */}
        {!isLoading && missao && (
          <div className="space-y-4">
            {/* Badges */}
            <div className="flex gap-2 flex-wrap">
              {missao.serie_filtro && (
                <span className="bg-blue-600/20 text-blue-400 px-2 py-1 rounded text-xs">
                  {missao.serie_filtro}º ano
                </span>
              )}
              {missao.semana && (
                <span className="bg-purple-600/20 text-purple-400 px-2 py-1 rounded text-xs">
                  Semana {missao.semana}
                </span>
              )}
              <span className="bg-white/10 text-white/60 px-2 py-1 rounded text-xs">
                {missao.pontos_base} pts
              </span>
              {missao.tipo_missao && (
                <span className="bg-emerald-600/20 text-emerald-400 px-2 py-1 rounded text-xs capitalize">
                  {missao.tipo_missao}
                </span>
              )}
            </div>
            
            {/* Título e Descrição */}
            <div>
              <h4 className="text-xl text-white font-semibold mb-2">{missao.titulo}</h4>
              {missao.descricao && (
                <p className="text-white/70">{missao.descricao}</p>
              )}
            </div>
            
            {/* Instruções */}
            {missao.instrucoes && (
              <div className="pt-2 border-t border-white/10">
                <p className="text-white/40 text-sm mb-2 font-medium">📋 Instruções:</p>
                <div className="text-white/70 prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown>{missao.instrucoes}</ReactMarkdown>
                </div>
              </div>
            )}
            
            {/* Dicas */}
            {missao.dicas && (
              <div className="pt-2 border-t border-white/10">
                <p className="text-white/40 text-sm mb-2 font-medium">💡 Dicas:</p>
                <div className="text-white/70 prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown>{missao.dicas}</ReactMarkdown>
                </div>
              </div>
            )}

            {/* Reflexão */}
            {missao.reflexao && (
              <div className="pt-2 border-t border-white/10">
                <p className="text-white/40 text-sm mb-2 font-medium">🤔 Reflexão:</p>
                <div className="text-white/70 prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown>{missao.reflexao}</ReactMarkdown>
                </div>
              </div>
            )}
            
            {/* Requisitos e Prazo */}
            <div className="pt-2 border-t border-white/10 space-y-2">
              <div className="flex items-center gap-2 text-white/50 text-sm">
                <span>📝 Requer texto:</span>
                <span className={missao.requer_texto ? 'text-green-400' : 'text-white/30'}>
                  {missao.requer_texto ? 'Sim' : 'Não'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-white/50 text-sm">
                <span>📎 Requer arquivo:</span>
                <span className={missao.requer_arquivo ? 'text-green-400' : 'text-white/30'}>
                  {missao.requer_arquivo ? 'Sim' : 'Não'}
                </span>
              </div>
              <p className="text-white/40 text-sm">
                ⏰ Prazo: {new Date(missao.data_prazo).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>
        )}

        {/* Sem missão */}
        {!isLoading && !missao && (
          <div className="text-center py-8">
            <p className="text-white/40">Missão não encontrada</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MissaoDetalhesModal;
