import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChevronRight } from 'lucide-react';
import { AlertaAluno, AlertaFaseAnterior } from '@/hooks/useAlertasAlunos';

interface AlertaDetalheModalProps {
  isOpen: boolean;
  onClose: () => void;
  tipo: 'precisa_atencao' | 'celebrar' | 'nao_esquecer' | 'atencao_fase_anterior';
  alertas: AlertaAluno[];
  alertasFaseAnterior: AlertaFaseAnterior[];
  onAlunoClick: (alunoId: string) => void;
}

const configByTipo = {
  precisa_atencao: {
    icon: '🔴',
    title: 'Precisam de você',
    color: '#8B0000'
  },
  celebrar: {
    icon: '✨',
    title: 'Celebre',
    color: '#B8860B'
  },
  nao_esquecer: {
    icon: '🟡',
    title: 'Não esqueça',
    color: '#CC7000'
  },
  atencao_fase_anterior: {
    icon: '⚠️',
    title: 'Atenção da fase anterior',
    color: '#8B4000'
  }
};

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
};

export const AlertaDetalheModal = ({
  isOpen,
  onClose,
  tipo,
  alertas,
  alertasFaseAnterior,
  onAlunoClick
}: AlertaDetalheModalProps) => {
  const config = configByTipo[tipo];
  const isFaseAnterior = tipo === 'atencao_fase_anterior';
  const items = isFaseAnterior ? alertasFaseAnterior : alertas;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#1a1a1a] border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle 
            className="flex items-center gap-2 text-lg font-semibold"
            style={{ color: config.color }}
          >
            <span>{config.icon}</span>
            {config.title}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-2">
          <div className="space-y-2">
            {items.length === 0 ? (
              <p className="text-white/50 text-sm text-center py-4">
                Nenhum alerta nesta categoria
              </p>
            ) : isFaseAnterior ? (
              // Render fase anterior items
              alertasFaseAnterior.map((alerta) => (
                <button
                  key={alerta.id}
                  onClick={() => {
                    onAlunoClick(alerta.aluno.id);
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-left"
                >
                  <Avatar className="h-10 w-10 border border-white/20">
                    <AvatarImage src={alerta.aluno.avatarUrl || ''} />
                    <AvatarFallback className="bg-white/10 text-white text-sm">
                      {getInitials(alerta.aluno.nome)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white truncate">
                        {alerta.aluno.nome}
                      </span>
                      <span className="text-xs text-white/50">
                        {alerta.aluno.serie} {alerta.aluno.turma}
                      </span>
                    </div>
                    <div className="text-xs text-white/60 mt-0.5">
                      <span className="mr-1">{alerta.faseAnteriorEmoji}</span>
                      Fase {alerta.faseAnteriorNome}
                    </div>
                    <p className="text-xs text-white/40 truncate mt-0.5">
                      {alerta.motivo}
                    </p>
                  </div>

                  <ChevronRight className="w-4 h-4 text-white/30 flex-shrink-0" />
                </button>
              ))
            ) : (
              // Render regular alerts
              alertas.map((alerta) => (
                <button
                  key={alerta.id}
                  onClick={() => {
                    onAlunoClick(alerta.aluno.id);
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-left"
                >
                  <Avatar className="h-10 w-10 border border-white/20">
                    <AvatarImage src={alerta.aluno.avatarUrl || ''} />
                    <AvatarFallback className="bg-white/10 text-white text-sm">
                      {getInitials(alerta.aluno.nome)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white truncate">
                        {alerta.aluno.nome}
                      </span>
                      <span className="text-xs text-white/50">
                        {alerta.aluno.serie} {alerta.aluno.turma}
                      </span>
                    </div>
                    <p className="text-xs text-white/40 truncate mt-0.5">
                      {alerta.motivo}
                    </p>
                  </div>

                  <ChevronRight className="w-4 h-4 text-white/30 flex-shrink-0" />
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
