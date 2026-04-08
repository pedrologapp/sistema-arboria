import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { X, Key, Loader2, Check, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';

interface ModalGerarContasProps {
  institutionId: string;
  totalSemConta: number;
  segmentos: string[];
  onClose: () => void;
  onSuccess: () => void;
}

const ModalGerarContas = ({ 
  institutionId, 
  totalSemConta, 
  segmentos,
  onClose, 
  onSuccess 
}: ModalGerarContasProps) => {
  const [segmentoSelecionado, setSegmentoSelecionado] = useState<string>('');
  const [processando, setProcessando] = useState(false);
  const [resultado, setResultado] = useState<{
    criados: number;
    errors: string[];
  } | null>(null);

  const handleGerarContas = async () => {
    setProcessando(true);
    setResultado(null);

    try {
      const { data, error } = await supabase.functions.invoke('gerar-contas-alunos', {
        body: { 
          institutionId, 
          segmento: segmentoSelecionado || undefined,
          limite: 50 // Processar em lotes de 50 para evitar timeout
        }
      });

      if (error) {
        console.error('Erro ao gerar contas:', error);
        toast.error('Erro ao gerar contas: ' + error.message);
        setProcessando(false);
        return;
      }

      setResultado({
        criados: data?.criados || 0,
        errors: data?.errors || []
      });

      if ((data?.criados || 0) > 0) {
        toast.success(`${data.criados} contas criadas com sucesso!`);
        onSuccess();
      }

      if ((data?.errors?.length || 0) > 0) {
        toast.warning(`${data.errors.length} erros durante a criação`);
      }

    } catch (err: any) {
      console.error('Erro inesperado:', err);
      toast.error('Erro inesperado: ' + err.message);
    } finally {
      setProcessando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#12122A]/95 p-4">
      <div className="w-full max-w-md bg-[#1A1A2E] border border-violet-500/10 rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-violet-500/10">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-semibold text-white">Gerar Contas de Acesso</h2>
          </div>
          <button 
            onClick={onClose} 
            disabled={processando}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-white/60" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-4 space-y-4">
          {/* Info */}
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <p className="text-sm text-amber-400 font-medium">
              {totalSemConta} alunos sem conta de acesso
            </p>
            <p className="text-xs text-amber-300/70 mt-1">
              Ao gerar contas, os alunos poderão fazer login com email e senha.
            </p>
          </div>

          {/* Seletor de segmento */}
          {segmentos.length > 0 && (
            <div>
              <label className="text-sm text-white/60 block mb-2">
                Filtrar por segmento (opcional)
              </label>
              <select
                value={segmentoSelecionado}
                onChange={(e) => setSegmentoSelecionado(e.target.value)}
                disabled={processando}
                className="w-full p-3 bg-white/5 border border-violet-500/10 rounded-xl text-white"
              >
                <option value="">Todos os segmentos</option>
                {segmentos.map(seg => (
                  <option key={seg} value={seg}>{seg}</option>
                ))}
              </select>
            </div>
          )}

          {/* Progresso */}
          {processando && (
            <div className="p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-xl">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                <span className="text-sm font-medium text-indigo-400">
                  Gerando contas...
                </span>
              </div>
              <p className="text-xs text-indigo-300/80 mt-2">
                Isso pode levar alguns minutos. Cada conta está sendo criada com email e senha.
              </p>
            </div>
          )}

          {/* Resultado */}
          {resultado && (
            <>
              {resultado.criados > 0 && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <p className="text-sm text-emerald-400 font-medium">
                      {resultado.criados} contas criadas!
                    </p>
                  </div>
                  <p className="text-xs text-emerald-300/80 mt-1">
                    Senha padrão: sobrenome + 123 (sem acentos)
                  </p>
                </div>
              )}

              {resultado.errors.length > 0 && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4 text-red-400" />
                    <p className="text-sm text-red-400 font-medium">
                      {resultado.errors.length} erro(s)
                    </p>
                  </div>
                  <div className="space-y-1 max-h-24 overflow-y-auto">
                    {resultado.errors.slice(0, 5).map((e, i) => (
                      <p key={i} className="text-xs text-red-400/80">{e}</p>
                    ))}
                    {resultado.errors.length > 5 && (
                      <p className="text-xs text-red-400/60">
                        ... e mais {resultado.errors.length - 5} erros
                      </p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Info sobre credenciais */}
          {!resultado && !processando && (
            <div className="p-3 bg-white/5 rounded-lg">
              <p className="text-sm text-white/80 font-medium mb-1">Credenciais geradas:</p>
              <p className="text-xs text-white/50">
                Email: nome.sobrenome.matricula@aluno.arboria.com
              </p>
              <p className="text-xs text-white/50">
                Senha: sobrenome + 123 (sem acentos, minúsculas)
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-violet-500/10 flex gap-3">
          <button
            onClick={onClose}
            disabled={processando}
            className="flex-1 p-3 bg-white/5 text-white rounded-xl hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            {resultado ? 'Fechar' : 'Cancelar'}
          </button>
          {!resultado && (
            <button
              onClick={handleGerarContas}
              disabled={processando}
              className="flex-1 p-3 bg-amber-500 text-black font-medium rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {processando ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Key className="w-4 h-4" />
                  Gerar Contas
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModalGerarContas;
