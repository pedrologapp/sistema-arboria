import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChevronRight, Sparkles, X } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AlunoSimples {
  id: string;
  nome: string;
  avatarUrl?: string;
  serie?: string;
  turma?: string;
}

interface AlunosSemObservacaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  faseNome: string;
  faseEmoji: string;
  alunos: AlunoSimples[];
  onAlunoClick: (alunoId: string) => void;
}

export const AlunosSemObservacaoModal = ({
  isOpen,
  onClose,
  faseNome,
  alunos,
  onAlunoClick
}: AlunosSemObservacaoModalProps) => {
  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const handleAlunoClick = (alunoId: string) => {
    onAlunoClick(alunoId);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-[#1a1a1a] border-white/10 p-0" hideCloseButton>
        {/* Header */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-white font-medium text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-400" />
                Seu olhar importa
              </h2>
              <p className="text-white/40 text-xs mt-0.5">
                Alunos aguardando observação na Fase {faseNome}
              </p>
            </div>
            <button 
              onClick={onClose}
              className="p-1 rounded hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5 text-white/40 hover:text-white" />
            </button>
          </div>
        </div>

        {/* Cabeçalho de colunas */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
          <span className="text-white/30 text-xs uppercase tracking-wider">Aluno</span>
        </div>

        {/* Lista compacta */}
        <ScrollArea className="max-h-[50vh]">
          <div className="divide-y divide-white/5">
            {alunos.map((aluno) => (
              <button
                key={aluno.id}
                onClick={() => handleAlunoClick(aluno.id)}
                className="w-full flex items-center gap-3 py-2.5 px-4 hover:bg-white/5 transition-colors text-left"
              >
                <Avatar className="h-7 w-7">
                  <AvatarImage src={aluno.avatarUrl} alt={aluno.nome} />
                  <AvatarFallback className="bg-blue-900/50 text-blue-200 text-xs">
                    {getInitials(aluno.nome)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-white text-sm font-medium truncate">
                    {aluno.nome}
                  </span>
                  {(aluno.serie || aluno.turma) && (
                    <span className="text-white/40 text-xs flex-shrink-0">
                      {aluno.serie}{aluno.turma}
                    </span>
                  )}
                </div>

                <ChevronRight className="w-4 h-4 text-white/30 flex-shrink-0" />
              </button>
            ))}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-3 border-t border-white/10">
          <p className="text-white/40 text-xs text-center">
            {alunos.length} {alunos.length === 1 ? 'aluno aguardando' : 'alunos aguardando'}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
