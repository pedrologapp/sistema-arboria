import { useState } from 'react';
import { X, ClipboardCheck, CheckCircle, Eye, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useProfessor } from '@/contexts/ProfessorContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface RegistrarAcaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  nomeAluno: string;
  alunoId: string;
  alertaId: string;
  onSalvar: () => void;
  // Dados adicionais para payload N8N
  alunoData?: {
    matricula?: string;
    serie?: string;
    turma?: string;
    casaId?: number;
    turmaId?: string;
    segmento?: string;
    institutionId?: string;
    faseId?: string;
  };
}

const categorias = [
  { value: 'fator_escolar', label: 'Fator escolar' },
  { value: 'fator_externo', label: 'Fator externo (família)' },
  { value: 'fator_social', label: 'Fator social (colegas)' },
  { value: 'indefinido', label: 'Ainda não sei' }
];

const RegistrarAcaoModal = ({
  isOpen,
  onClose,
  nomeAluno,
  alunoId,
  alertaId,
  onSalvar,
  alunoData
}: RegistrarAcaoModalProps) => {
  const { profile } = useProfessor();
  const queryClient = useQueryClient();
  
  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState<string>('indefinido');
  const [statusAluno, setStatusAluno] = useState<'melhorou' | 'nao_melhorou' | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Validação: tudo preenchido
  const podeSubmeter = descricao.trim().length > 0 && statusAluno !== null;

  // Função para enviar dados ao webhook N8N (fire-and-forget)
  const enviarParaN8N = async () => {
    const timestampAtual = new Date().toISOString();
    const dataAtual = timestampAtual.split('T')[0]; // YYYY-MM-DD
    
    const payload = {
      evento: 'acao_professor_registrada',
      
      aluno: {
        id: alunoId,
        nome: nomeAluno,
        matricula: alunoData?.matricula || '',
        serie: alunoData?.serie || '',
        turma: alunoData?.turma || '',
        casa_id: alunoData?.casaId || 0
      },
      
      contexto: {
        fase_id: alunoData?.faseId || '',
        turma_id: alunoData?.turmaId || '',
        turma_completa: `${alunoData?.serie || ''} ${alunoData?.turma || ''}`.trim(),
        segmento: alunoData?.segmento || '',
        institution_id: alunoData?.institutionId || profile?.institution_id || ''
      },
      
      professor: {
        id: profile?.id || '',
        nome: profile?.full_name || ''
      },
      
      acao: {
        tipo_registro: 'acao_professor',
        descricao: descricao.trim(),
        causa_provavel: categoria,
        status_aluno: statusAluno === 'melhorou' ? 'melhorou' : 'em_acompanhamento',
        alerta_id: alertaId
      },
      
      sinal: {
        codigo: 'acao_professor',
        nome: 'Ação do Professor',
        valencia: 'acao'
      },
      
      timestamp: timestampAtual,
      data_observacao: dataAtual
    };
    
    try {
      await fetch('https://webhook.escolaamadeus.com/webhook/projetoarboria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      console.log('Ação enviada para N8N:', payload);
    } catch (error) {
      console.warn('Falha ao enviar para N8N (não crítico):', error);
    }
  };

  const handleSalvar = async () => {
    if (!profile?.institution_id || !alertaId || !podeSubmeter) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setIsSaving(true);
    try {
      // 1. Inserir ação na tabela acoes_professor
      const { error: acaoError } = await supabase
        .from('acoes_professor')
        .insert({
          alerta_id: alertaId,
          aluno_id: alunoId,
          professor_id: profile.id,
          institution_id: profile.institution_id,
          tipo_acao: 'acao_registrada',
          descricao: descricao.trim(),
          categoria_descoberta: categoria as 'fator_escolar' | 'fator_externo' | 'fator_social' | 'indefinido',
          status_aluno: statusAluno
        });

      if (acaoError) throw acaoError;

      // 2. Atualizar alerta baseado no status
      if (statusAluno === 'melhorou') {
        const { error: alertaError } = await supabase
          .from('alertas_alunos')
          .update({
            status: 'resolvido',
            resolved_at: new Date().toISOString(),
            resolved_by: profile.id,
            notificacao_ativa: false
          })
          .eq('id', alertaId);

        if (alertaError) throw alertaError;
        toast.success('Ação registrada. Alerta resolvido!');
      } else {
        const { error: alertaError } = await supabase
          .from('alertas_alunos')
          .update({
            status: 'em_acompanhamento',
            notificacao_ativa: false
          })
          .eq('id', alertaId);

        if (alertaError) throw alertaError;
        toast.success('Ação registrada. Continue acompanhando.');
      }

      // 3. Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['alertas-alunos'] });
      queryClient.invalidateQueries({ queryKey: ['perfil-aluno'] });

      // 4. Enviar para N8N (fire-and-forget, não bloqueia o fluxo)
      enviarParaN8N();

      // 5. Limpar estado e fechar
      setDescricao('');
      setCategoria('indefinido');
      setStatusAluno(null);
      onSalvar();
      onClose();
    } catch (error) {
      console.error('Erro ao salvar ação:', error);
      toast.error('Erro ao salvar ação. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setDescricao('');
    setCategoria('indefinido');
    setStatusAluno(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-md bg-[#1E1E3A] rounded-2xl border border-violet-500/10 overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-violet-500/10">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-blue-400" strokeWidth={1.5} />
            <span className="text-white font-medium">Registrar Ação</span>
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
          {/* Campo de texto - obrigatório */}
          <div>
            <label className="block text-white/80 text-sm mb-2">
              O que você fez? <span className="text-red-400">*</span>
            </label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descreva a ação que você tomou..."
              className="w-full h-28 px-3 py-2 rounded-xl bg-white/5 border border-violet-500/10 text-white placeholder-white/30 text-sm resize-none focus:outline-none focus:border-blue-500/50"
            />
          </div>

          {/* Categorias - radio buttons */}
          <div>
            <label className="block text-white/80 text-sm mb-2">
              Qual a causa provável?
            </label>
            <div className="space-y-2">
              {categorias.map((cat) => (
                <label
                  key={cat.value}
                  className="flex items-center gap-3 cursor-pointer group"
                  onClick={() => setCategoria(cat.value)}
                >
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                      categoria === cat.value
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-white/30 group-hover:border-violet-500/50'
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

          {/* Divider */}
          <div className="border-t border-violet-500/10" />

          {/* Status do aluno - obrigatório */}
          <div>
            <label className="block text-white/80 text-sm mb-3">
              Como está {nomeAluno} agora? <span className="text-red-400">*</span>
            </label>
            
            <div className="space-y-3">
              {/* Opção Melhorou */}
              <button
                onClick={() => setStatusAluno('melhorou')}
                className={`w-full p-3 rounded-xl border text-left transition-colors ${
                  statusAluno === 'melhorou'
                    ? 'bg-green-500/20 border-green-500/40'
                    : 'bg-white/5 border-violet-500/10 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <CheckCircle 
                    className={`w-5 h-5 ${statusAluno === 'melhorou' ? 'text-green-400' : 'text-white/40'}`} 
                    strokeWidth={1.5} 
                  />
                  <div>
                    <p className={`text-sm font-medium ${statusAluno === 'melhorou' ? 'text-green-400' : 'text-white/80'}`}>
                      Melhorou
                    </p>
                    <p className="text-xs text-white/40 mt-0.5">
                      O alerta será resolvido
                    </p>
                  </div>
                </div>
              </button>

              {/* Opção Ainda não melhorou */}
              <button
                onClick={() => setStatusAluno('nao_melhorou')}
                className={`w-full p-3 rounded-xl border text-left transition-colors ${
                  statusAluno === 'nao_melhorou'
                    ? 'bg-white/10 border-white/20'
                    : 'bg-white/5 border-violet-500/10 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Eye 
                    className={`w-5 h-5 ${statusAluno === 'nao_melhorou' ? 'text-white/80' : 'text-white/40'}`} 
                    strokeWidth={1.5} 
                  />
                  <div>
                    <p className={`text-sm font-medium ${statusAluno === 'nao_melhorou' ? 'text-white' : 'text-white/80'}`}>
                      Ainda não melhorou
                    </p>
                    <p className="text-xs text-white/40 mt-0.5">
                      Continuarei acompanhando
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-4 border-t border-violet-500/10">
          <button
            onClick={handleClose}
            disabled={isSaving}
            className="flex-1 py-2.5 rounded-xl bg-white/5 border border-violet-500/10 text-white/60 text-sm hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSalvar}
            disabled={isSaving || !podeSubmeter}
            className={`flex-1 py-2.5 rounded-xl text-white text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              podeSubmeter 
                ? 'bg-blue-600 hover:bg-blue-700' 
                : 'bg-blue-600/50 cursor-not-allowed'
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

export default RegistrarAcaoModal;
