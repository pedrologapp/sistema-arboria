import { useState } from 'react';
import { AlertTriangle, Trash2, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ModalExcluirAlunosMassaProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalAlunos: number;
  institutionId: string;
  onSuccess: () => void;
}

type Step = 'confirm' | 'type';

const ModalExcluirAlunosMassa = ({
  open,
  onOpenChange,
  totalAlunos,
  institutionId,
  onSuccess,
}: ModalExcluirAlunosMassaProps) => {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>('confirm');
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleClose = () => {
    setStep('confirm');
    setConfirmText('');
    onOpenChange(false);
  };

  const handleConfirmStep = () => {
    setStep('type');
  };

  const handleDelete = async () => {
    if (confirmText !== 'EXCLUIR') return;

    setIsDeleting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-users-bulk`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            institutionId,
            deleteAllStudents: true,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao excluir alunos');
      }

      toast({
        title: 'Alunos excluídos',
        description: result.message,
      });

      handleClose();
      onSuccess();
    } catch (error) {
      console.error('Error deleting students:', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao excluir alunos',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-[#1A1A1A] border-violet-500/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-400">
            <AlertTriangle className="w-5 h-5" />
            Excluir Todos os Alunos
          </DialogTitle>
          <DialogDescription className="text-white/60">
            Esta ação não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>

        {step === 'confirm' && (
          <div className="space-y-4">
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <p className="text-white/80 text-sm">
                Você está prestes a excluir permanentemente{' '}
                <span className="font-bold text-red-400">{totalAlunos} alunos</span> da
                instituição.
              </p>
              <p className="text-white/60 text-sm mt-2">
                Todos os dados relacionados (entregas, observações, pontos, etc.) serão
                removidos.
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleClose}
                className="flex-1 bg-transparent border-white/20 text-white hover:bg-white/10"
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmStep}
                className="flex-1"
              >
                Continuar
              </Button>
            </div>
          </div>
        )}

        {step === 'type' && (
          <div className="space-y-4">
            <div className="bg-white/5 border border-violet-500/10 rounded-lg p-4">
              <p className="text-white/80 text-sm mb-3">
                Para confirmar, digite <span className="font-bold text-white">EXCLUIR</span>{' '}
                no campo abaixo:
              </p>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                placeholder="Digite EXCLUIR"
                className="bg-white/5 border-white/20 text-white placeholder:text-white/30"
                disabled={isDeleting}
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setStep('confirm')}
                className="flex-1 bg-transparent border-white/20 text-white hover:bg-white/10"
                disabled={isDeleting}
              >
                Voltar
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={confirmText !== 'EXCLUIR' || isDeleting}
                className="flex-1"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Excluindo...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Excluir {totalAlunos} alunos
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ModalExcluirAlunosMassa;
