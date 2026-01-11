import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChevronRight } from 'lucide-react';
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
  faseEmoji,
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
      <DialogContent className="sm:max-w-md bg-gray-900 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            {faseEmoji} Fase {faseNome} — Alunos sem observação
          </DialogTitle>
        </DialogHeader>

        <p className="text-gray-400 text-sm">
          {alunos.length} {alunos.length === 1 ? 'aluno' : 'alunos'} ainda {alunos.length === 1 ? 'não foi observado' : 'não foram observados'} nesta fase
        </p>

        <ScrollArea className="max-h-[400px] mt-2">
          <div className="space-y-2 pr-3">
            {alunos.map((aluno) => (
              <button
                key={aluno.id}
                onClick={() => handleAlunoClick(aluno.id)}
                className="w-full flex items-center gap-3 p-3 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors text-left"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={aluno.avatarUrl} alt={aluno.nome} />
                  <AvatarFallback className="bg-blue-900 text-blue-200 text-sm">
                    {getInitials(aluno.nome)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <span className="font-medium text-white block truncate">
                    {aluno.nome}
                  </span>
                  {(aluno.serie || aluno.turma) && (
                    <span className="text-xs text-gray-400">
                      {aluno.serie} {aluno.turma}
                    </span>
                  )}
                </div>

                <ChevronRight className="w-4 h-4 text-gray-500" />
              </button>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
