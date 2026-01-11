import { useState } from 'react';
import { X, MessageCircle, Loader2, Smile, Meh, ThumbsDown, Sparkles } from 'lucide-react';
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
  { value: 'conversei_descoberta', label: 'Conversei com o aluno sobre a descoberta' },
  { value: 'propus_desafio', label: 'Propus um desafio/próximo passo' },
  { value: 'papel_mentor', label: 'Dei papel de mentor para ajudar colega' },
  { value: 'ainda_nao_conversei', label: 'Ainda não conversei' }
];

const reacoesAluno = [
  { value: 'animado', label: 'Animado/motivado', icon: Sparkles, color: 'text-green-400' },
  { value: 'receptivo', label: 'Receptivo', icon: Smile, color: 'text-blue-400' },
  { value: 'indiferente', label: 'Indiferente', icon: Meh, color: 'text-yellow-400' },
  { value: 'desconfortavel', label: 'Desconfortável (não gostou de ser destacado)', icon: ThumbsDown, color: 'text-red-400' }
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

  // Validação: tipo de ação obrigatório, reação opcional se "ainda não conversei"
  const ehAindaNaoConversei = tipoAcao === 'ainda_nao_conversei';
  const podeSubmeter = tipoAcao !== '' && (ehAindaNaoConversei || reacaoAluno !== '');

  const handleSalvar = async () => {
    if (!profile?.institution_id || !podeSubmeter) {
      toast.error('Preencha os campos obrigatórios');
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
          reacao_aluno: ehAindaNaoConversei ? null : reacaoAluno,
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

      toast.success(
        ehAindaNaoConversei 
          ? 'Lembrete registrado. Não esqueça de conversar!' 
          : 'Conversa registrada com sucesso!'
      );

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

  const titulo = subtipo === 'descoberta' 
    ? `Conversa sobre Descoberta` 
    : `Conversa sobre Confirmação`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-md bg-[#1a1a1a] rounded-2xl border border-white/10 overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-amber-900/20">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-amber-400" strokeWidth={1.5} />
            <span className="text-white font-medium">{titulo}</span>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-white/60" strokeWidth={1.5} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-5">
          {/* Campo: O que você fez? */}
          <div>
            <label className="block text-white/80 text-sm mb-3">
              O que você fez? <span className="text-red-400">*</span>
            </label>
            <div className="space-y-2">
              {tiposAcao.map((tipo) => (
                <label
                  key={tipo.value}
                  className="flex items-start gap-3 cursor-pointer group"
                  onClick={() => setTipoAcao(tipo.value)}
                >
                  <div
                    className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                      tipoAcao === tipo.value
                        ? 'border-amber-500 bg-amber-500'
                        : 'border-white/30 group-hover:border-white/50'
                    }`}
                  >
                    {tipoAcao === tipo.value && (
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                  </div>
                  <span className="text-white/80 text-sm">{tipo.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Campo: Como foi a reação? (se não for "ainda não conversei") */}
          {tipoAcao && !ehAindaNaoConversei && (
            <>
              <div className="border-t border-white/10" />
              <div>
                <label className="block text-white/80 text-sm mb-3">
                  Como foi a reação de {nomeAluno}? <span className="text-red-400">*</span>
                </label>
                <div className="space-y-2">
                  {reacoesAluno.map((reacao) => {
                    const IconComponent = reacao.icon;
                    return (
                      <button
                        key={reacao.value}
                        onClick={() => setReacaoAluno(reacao.value)}
                        className={`w-full p-3 rounded-xl border text-left transition-colors flex items-center gap-3 ${
                          reacaoAluno === reacao.value
                            ? 'bg-white/10 border-white/20'
                            : 'bg-white/5 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        <IconComponent 
                          className={`w-5 h-5 ${reacaoAluno === reacao.value ? reacao.color : 'text-white/40'}`} 
                          strokeWidth={1.5} 
                        />
                        <span className={`text-sm ${reacaoAluno === reacao.value ? 'text-white' : 'text-white/80'}`}>
                          {reacao.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* Campo: Observações (opcional) */}
          {tipoAcao && (
            <>
              <div className="border-t border-white/10" />
              <div>
                <label className="block text-white/80 text-sm mb-2">
                  Observações <span className="text-white/40">(opcional)</span>
                </label>
                <textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Como foi a conversa? O aluno topou o desafio? Algo que você percebeu?"
                  className="w-full h-24 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-sm resize-none focus:outline-none focus:border-amber-500/50"
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-4 border-t border-white/10">
          <button
            onClick={handleClose}
            disabled={isSaving}
            className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSalvar}
            disabled={isSaving || !podeSubmeter}
            className={`flex-1 py-2.5 rounded-xl text-white text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
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
              <span>Salvar</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RegistrarConversaModal;
