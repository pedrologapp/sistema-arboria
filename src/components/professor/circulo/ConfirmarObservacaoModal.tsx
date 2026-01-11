import { useState } from 'react';
import { X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface Sinal {
  id: number;
  codigo: string;
  label_pt: string;
  valencia: string;
}

interface AlunoSimples {
  id: string;
  full_name: string;
}

interface ConfirmarObservacaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  sinal: Sinal | null;
  aluno: AlunoSimples | null;
  alunos?: AlunoSimples[]; // Para múltiplos alunos
  onConfirm: (nota: string | null) => void;
  saving?: boolean;
}

const ConfirmarObservacaoModal = ({
  isOpen,
  onClose,
  sinal,
  aluno,
  alunos,
  onConfirm,
  saving = false
}: ConfirmarObservacaoModalProps) => {
  const [nota, setNota] = useState('');

  const handleSoRegistrar = () => {
    onConfirm(null);
    setNota('');
  };

  const handleSalvar = () => {
    onConfirm(nota.trim() || null);
    setNota('');
  };

  const handleClose = () => {
    setNota('');
    onClose();
  };

  // Suporte para múltiplos alunos ou aluno único
  const temAlunos = alunos && alunos.length > 0;
  const temAluno = aluno !== null;
  
  if (!sinal || (!temAluno && !temAlunos)) return null;

  const getNomesResumo = () => {
    if (!alunos || alunos.length === 0) return '';
    const nomes = alunos.map(a => a.full_name.split(' ')[0]);
    if (nomes.length <= 3) return nomes.join(', ');
    return `${nomes.slice(0, 2).join(', ')} e +${nomes.length - 2}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="bg-[#1a1a2e] border-white/10 text-white max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold flex items-center justify-between">
            Adicionar observação?
            <button onClick={handleClose} className="p-1 hover:bg-white/10 rounded">
              <X size={18} />
            </button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Info do sinal e aluno(s) */}
          <div className="space-y-1 text-sm">
            <p>
              <span className="text-white/60">Sinal:</span>{' '}
              <span 
                className="font-medium"
                style={{ color: sinal.valencia === 'positivo' ? '#22C55E' : '#EF4444' }}
              >
                {sinal.label_pt}
              </span>
            </p>
            {temAlunos ? (
              <div>
                <span className="text-white/60">Alunos:</span>{' '}
                <span className="font-medium">{alunos.length} selecionados</span>
                <p className="text-white/50 text-xs mt-0.5">{getNomesResumo()}</p>
              </div>
            ) : (
              <p>
                <span className="text-white/60">Aluno:</span>{' '}
                <span className="font-medium">{aluno?.full_name}</span>
              </p>
            )}
          </div>

          {/* Nota opcional */}
          <div className="space-y-2">
            <label className="text-sm text-white/80">
              Quer adicionar uma nota? (opcional)
            </label>
            <Textarea
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Ex: Participou muito da discussão sobre poesia..."
              className="bg-white/5 border-white/10 text-white placeholder:text-white/40 min-h-[80px] resize-none"
              disabled={saving}
            />
          </div>

          {/* Botões */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={handleSoRegistrar}
              disabled={saving}
              className="flex-1 bg-transparent border-white/20 text-white hover:bg-white/10"
            >
              Só registrar
            </Button>
            <Button
              onClick={handleSalvar}
              disabled={saving}
              className="flex-1 bg-white text-black hover:bg-white/90"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ConfirmarObservacaoModal;
