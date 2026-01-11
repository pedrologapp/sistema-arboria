import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ThumbsUp, AlertTriangle, Loader2 } from 'lucide-react';

interface ObservacaoPersonalizadaModalProps {
  isOpen: boolean;
  tipo: 'positivo' | 'atencao';
  alunoNome: string;
  onClose: () => void;
  onConfirm: (texto: string) => void;
  saving: boolean;
}

export function ObservacaoPersonalizadaModal({
  isOpen,
  tipo,
  alunoNome,
  onClose,
  onConfirm,
  saving
}: ObservacaoPersonalizadaModalProps) {
  const [texto, setTexto] = useState('');
  
  const isPositivo = tipo === 'positivo';
  const minChars = 3;
  const maxChars = 500;
  const isValid = texto.trim().length >= minChars;

  // Limpar texto quando modal fecha
  useEffect(() => {
    if (!isOpen) {
      setTexto('');
    }
  }, [isOpen]);

  const handleConfirm = () => {
    if (isValid && !saving) {
      onConfirm(texto.trim());
    }
  };

  const handleClose = () => {
    setTexto('');
    onClose();
  };

  const placeholder = isPositivo
    ? "Ex: Mostrou memória fotográfica, lembrou de todos os detalhes da aula anterior..."
    : "Ex: Parecia distraído, olhando pela janela durante toda a atividade...";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="bg-[#1A1F2C] border-white/10 text-white max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-white">
            Observação {isPositivo ? 'Positiva' : 'de Atenção'} Personalizada
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Textarea */}
          <div className="space-y-2">
            <label className="text-sm text-white/70">
              Descreva o que você observou:
            </label>
            <Textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value.slice(0, maxChars))}
              placeholder={placeholder}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/40 
                         min-h-[100px] resize-none focus:border-white/30"
              disabled={saving}
            />
            <div className="flex justify-between text-xs text-white/50">
              <span>
                {texto.trim().length < minChars 
                  ? `Mínimo ${minChars} caracteres` 
                  : ''}
              </span>
              <span>{texto.length}/{maxChars}</span>
            </div>
          </div>

          {/* Indicador de tipo */}
          <div className="flex items-center gap-2 text-sm text-white/70 bg-white/5 rounded-lg p-3">
            <span>Este registro será salvo como:</span>
            <div 
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
              style={{
                backgroundColor: isPositivo ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                color: isPositivo ? '#22C55E' : '#EF4444'
              }}
            >
              {isPositivo ? <ThumbsUp size={12} /> : <AlertTriangle size={12} />}
              {isPositivo ? 'POSITIVO' : 'ATENÇÃO'}
            </div>
          </div>

          {/* Botões */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={saving}
              className="flex-1 bg-transparent border-white/20 text-white hover:bg-white/10"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!isValid || saving}
              className="flex-1"
              style={{
                backgroundColor: isValid 
                  ? (isPositivo ? '#22C55E' : '#EF4444')
                  : '#4B5563',
                color: 'white'
              }}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Registrar'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
