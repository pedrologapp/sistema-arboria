import { useState } from 'react';
import { X, MessageCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useProfessor } from '@/contexts/ProfessorContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface RegistrarConversaModalProps {
  isOpen: boolean;
  onClose: () => void;
  nomeAluno: string;
  alunoId: string;
  alertaId?: string;
  subtipo?: 'descoberta' | 'confirmacao';
  onSalvar: () => void;
}

const tiposAcao = [
  { value: 'conversei', label: 'Conversei', emoji: '💬' },
  { value: 'desafio', label: 'Desafio', emoji: '🎯' },
  { value: 'mentor', label: 'Mentor', emoji: '🤝' }
];

const reacoesAluno = [
  { value: 'animado', label: 'Animado', emoji: '🤩', bgColor: 'bg-green-500/20', borderColor: 'border-green-500/40' },
  { value: 'receptivo', label: 'Receptivo', emoji: '😊', bgColor: 'bg-blue-500/20', borderColor: 'border-blue-500/40' },
  { value: 'indiferente', label: 'Indiferente', emoji: '😐', bgColor: 'bg-yellow-500/20', borderColor: 'border-yellow-500/40' },
  { value: 'desconfortavel', label: 'Desconfortável', emoji: '😬', bgColor: 'bg-red-500/20', borderColor: 'border-red-500/40' }
];

const RegistrarConversaModal = ({
  isOpen,
  onClose,
  nomeAluno,
  alunoId,
  alertaId,
  subtipo = 'descoberta',
  onSalvar
}: RegistrarConversaModalProps) => {
  const { profile } = useProfessor();
  const queryClient = useQueryClient();
  
  const [tipoAcao, setTipoAcao] = useState<string>('');
  const [reacaoAluno, setReacaoAluno] = useState<string>('');
  const [observacoes, setObservacoes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Validação: apenas tipo de ação é obrigatório
  const podeSubmeter = tipoAcao !== '';

  const handleSalvar = async () => {
    if (!profile?.institution_id || !podeSubmeter) {
      toast.error('Selecione o que você fez');
      return;
    }

    setIsSaving(true);
    try {
      // 1. Inserir ação na tabela acoes_celebracao
      const { error: acaoError } = await supabase
        .from('acoes_celebracao')
        .insert({
          aluno_id: alunoId,
          professor_id: profile.id,
          institution_id: profile.institution_id,
          alerta_id: alertaId || null,
          tipo_acao: tipoAcao,
          reacao_aluno: reacaoAluno || null,
          observacoes: observacoes.trim() || null
        });

      if (acaoError) throw acaoError;

      // 2. Se tem alertaId, atualizar para "em_acompanhamento"
      if (alertaId) {
        const { error: alertaError } = await supabase
          .from('alertas_alunos')
          .update({
            status: 'em_acompanhamento',
            notificacao_ativa: false
          })
          .eq('id', alertaId);

        if (alertaError) throw alertaError;
      }

      // 3. Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['alertas-alunos'] });
      queryClient.invalidateQueries({ queryKey: ['perfil-aluno'] });

      toast.success('Conversa registrada com sucesso!');

      // 4. Limpar estado e fechar
      setTipoAcao('');
      setReacaoAluno('');
      setObservacoes('');
      onSalvar();
      onClose();
    } catch (error) {
      console.error('Erro ao salvar conversa:', error);
      toast.error('Erro ao salvar. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setTipoAcao('');
    setReacaoAluno('');
    setObservacoes('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-md bg-[#1a1a1a] rounded-2xl border border-white/10 overflow-hidden max-h-[70vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-white/10 bg-amber-900/20">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-5 h-5">
              <MessageCircle className="w-4 h-4 text-amber-400" strokeWidth={1.5} />
            </div>
            <span className="text-white font-medium text-sm">Registrar conversa com {nomeAluno}</span>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4 text-white/60" strokeWidth={1.5} />
          </button>
        </div>

        {/* Body */}
        <div className="p-3 space-y-4">
          {/* Campo: O que você fez? - Chips horizontais */}
          <div>
            <label className="block text-white/80 text-sm mb-2">
              O que você fez? <span className="text-red-400">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {tiposAcao.map((tipo) => (
                <button
                  key={tipo.value}
                  onClick={() => setTipoAcao(tipo.value)}
                  className={`px-3 py-2 rounded-xl border-2 text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
                    tipoAcao === tipo.value
                      ? 'bg-amber-500/20 border-amber-500/60 text-amber-300'
                      : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:border-white/20'
                  }`}
                >
                  <span className="text-base">{tipo.emoji}</span>
                  <span>{tipo.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Campo: Como foi? (sempre visível, opcional) */}
          <div className="border-t border-white/10 pt-3">
            <label className="block text-white/80 text-sm mb-2">
              Como foi? <span className="text-white/40 text-xs">(opcional)</span>
            </label>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Conte brevemente como foi..."
              className="w-full h-20 px-3 py-2 rounded-xl bg-white/5 border-2 border-dashed border-amber-500/30 text-white placeholder-white/40 text-sm resize-none focus:outline-none focus:border-amber-500/60 transition-colors"
            />
          </div>

          {/* Campo: Reação do aluno (sempre visível, opcional) */}
          <div className="border-t border-white/10 pt-3">
            <label className="block text-white/80 text-sm mb-2">
              Reação do aluno? <span className="text-white/40 text-xs">(opcional)</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {reacoesAluno.map((reacao) => (
                <button
                  key={reacao.value}
                  onClick={() => setReacaoAluno(reacaoAluno === reacao.value ? '' : reacao.value)}
                  className={`p-2 rounded-xl border-2 text-center transition-all duration-200 flex flex-col items-center gap-1 ${
                    reacaoAluno === reacao.value
                      ? `${reacao.bgColor} ${reacao.borderColor} scale-105`
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <span className="text-xl">{reacao.emoji}</span>
                  <span className={`text-xs ${reacaoAluno === reacao.value ? 'text-white font-medium' : 'text-white/60'}`}>
                    {reacao.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-3 border-t border-white/10">
          <button
            onClick={handleClose}
            disabled={isSaving}
            className="flex-1 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSalvar}
            disabled={isSaving || !podeSubmeter}
            className={`flex-1 py-2 rounded-xl text-white text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              podeSubmeter 
                ? 'bg-amber-600 hover:bg-amber-700' 
                : 'bg-amber-600/50 cursor-not-allowed'
            } disabled:opacity-50`}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Salvando...</span>
              </>
            ) : (
              <span>Salvar registro</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RegistrarConversaModal;
