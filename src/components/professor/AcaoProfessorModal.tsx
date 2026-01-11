import { useState } from 'react';
import { X, MessageCircle, Eye, Users, Home, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useProfessor } from '@/contexts/ProfessorContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface AcaoProfessorModalProps {
  isOpen: boolean;
  onClose: () => void;
  tipoAcao: string;
  nomeAluno: string;
  alertaId: string;
  onSalvar: () => void;
}

const tipoAcaoConfig: Record<string, { icon: typeof MessageCircle; label: string; color: string }> = {
  conversar: { icon: MessageCircle, label: 'Conversar com', color: 'text-blue-400' },
  'message-circle': { icon: MessageCircle, label: 'Conversar com', color: 'text-blue-400' },
  observar: { icon: Eye, label: 'Observar mais', color: 'text-purple-400' },
  eye: { icon: Eye, label: 'Observar mais', color: 'text-purple-400' },
  falar_colegas: { icon: Users, label: 'Falar com outros profs sobre', color: 'text-green-400' },
  users: { icon: Users, label: 'Falar com outros profs sobre', color: 'text-green-400' },
  verificar_familia: { icon: Home, label: 'Verificar com a família de', color: 'text-orange-400' },
  home: { icon: Home, label: 'Verificar com a família de', color: 'text-orange-400' }
};

const categorias = [
  { value: 'fator_escolar', label: 'Fator escolar' },
  { value: 'fator_externo', label: 'Fator externo (família)' },
  { value: 'fator_social', label: 'Fator social (colegas)' },
  { value: 'indefinido', label: 'Ainda não sei' }
];

const AcaoProfessorModal = ({
  isOpen,
  onClose,
  tipoAcao,
  nomeAluno,
  alertaId,
  onSalvar
}: AcaoProfessorModalProps) => {
  const { profile } = useProfessor();
  const queryClient = useQueryClient();
  
  const [descoberta, setDescoberta] = useState('');
  const [categoria, setCategoria] = useState<string>('indefinido');
  const [isSaving, setIsSaving] = useState(false);

  const config = tipoAcaoConfig[tipoAcao] || tipoAcaoConfig.conversar;
  const IconComponent = config.icon;

  const handleSalvar = async () => {
    if (!profile?.institution_id || !alertaId) {
      toast.error('Erro ao salvar ação');
      return;
    }

    setIsSaving(true);
    try {
      // Inserir ação do professor
      const { error: acaoError } = await supabase
        .from('acoes_professor')
        .insert({
          alerta_id: alertaId,
          professor_id: profile.id,
          institution_id: profile.institution_id,
          tipo_acao: tipoAcao,
          descoberta: descoberta.trim() || null,
          categoria_descoberta: categoria as 'fator_escolar' | 'fator_externo' | 'fator_social' | 'indefinido'
        });

      if (acaoError) throw acaoError;

      // Atualizar alerta para desativar notificação
      const { error: alertaError } = await supabase
        .from('alertas_alunos')
        .update({ 
          notificacao_ativa: false,
          status: 'visualizado'
        })
        .eq('id', alertaId);

      if (alertaError) throw alertaError;

      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['alertas-alunos'] });
      queryClient.invalidateQueries({ queryKey: ['perfil-aluno'] });

      toast.success('Ação registrada com sucesso');
      
      // Limpar estado e fechar
      setDescoberta('');
      setCategoria('indefinido');
      onSalvar();
      onClose();
    } catch (error) {
      console.error('Erro ao salvar ação:', error);
      toast.error('Erro ao salvar ação. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-md bg-[#1a1a1a] rounded-2xl border border-white/10 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <IconComponent className={`w-5 h-5 ${config.color}`} strokeWidth={1.5} />
            <span className="text-white font-medium">
              {config.label} {nomeAluno}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-white/60" strokeWidth={1.5} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {/* Campo de texto */}
          <div>
            <label className="block text-white/60 text-sm mb-2">
              O que você descobriu?
            </label>
            <textarea
              value={descoberta}
              onChange={(e) => setDescoberta(e.target.value)}
              placeholder="Descreva o que você observou ou descobriu..."
              className="w-full h-24 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-sm resize-none focus:outline-none focus:border-white/20"
            />
          </div>

          {/* Categorias */}
          <div>
            <label className="block text-white/60 text-sm mb-2">
              Isso é:
            </label>
            <div className="space-y-2">
              {categorias.map((cat) => (
                <label
                  key={cat.value}
                  className="flex items-center gap-3 cursor-pointer group"
                >
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                      categoria === cat.value
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-white/30 group-hover:border-white/50'
                    }`}
                  >
                    {categoria === cat.value && (
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                  </div>
                  <span className="text-white/80 text-sm">{cat.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-4 border-t border-white/10">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSalvar}
            disabled={isSaving}
            className="flex-1 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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

export default AcaoProfessorModal;
