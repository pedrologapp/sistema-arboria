import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChevronRight, X } from 'lucide-react';
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
    subtitle: 'Alunos que precisam de atenção'
  },
  celebrar: {
    icon: '✨',
    title: 'Celebre',
    subtitle: 'Alunos para reconhecer'
  },
  nao_esquecer: {
    icon: '🟡',
    title: 'Não esqueça',
    subtitle: 'Alunos sem observação recente'
  },
  atencao_fase_anterior: {
    icon: '⚠️',
    title: 'Fase anterior',
    subtitle: 'Alertas pendentes da fase anterior'
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
  const count = items.length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#1a1a1a] border-white/10 text-white max-w-md p-0" hideCloseButton>
        {/* Header */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-white font-medium text-base flex items-center gap-2">
                <span>{config.icon}</span>
                {config.title}
              </h2>
              <p className="text-white/40 text-xs mt-0.5">
                {config.subtitle}
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
          <span className="text-white/30 text-xs uppercase tracking-wider">Motivo</span>
        </div>

        {/* Lista compacta */}
        <ScrollArea className="max-h-[50vh]">
          <div className="divide-y divide-white/5">
            {count === 0 ? (
              <p className="text-white/50 text-sm text-center py-8">
                Nenhum alerta nesta categoria
              </p>
            ) : isFaseAnterior ? (
              alertasFaseAnterior.map((alerta) => (
                <button
                  key={alerta.id}
                  onClick={() => {
                    onAlunoClick(alerta.aluno.id);
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 py-2.5 px-4 hover:bg-white/5 transition-colors text-left"
                >
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={alerta.aluno.avatarUrl || ''} />
                    <AvatarFallback className="bg-white/10 text-white text-xs">
                      {getInitials(alerta.aluno.nome)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white text-sm font-medium truncate">
                        {alerta.aluno.nome}
                      </span>
                      <span className="text-white/40 text-xs flex-shrink-0">
                        {alerta.aluno.serie}{alerta.aluno.turma}
                      </span>
                    </div>
                    <div className="text-xs text-white/50 mt-0.5">
                      <span className="mr-1">{alerta.faseAnteriorEmoji}</span>
                      Fase {alerta.faseAnteriorNome}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-white/40 text-xs max-w-[80px] truncate">
                      {alerta.motivo}
                    </span>
                    <ChevronRight className="w-4 h-4 text-white/30" />
                  </div>
                </button>
              ))
            ) : (
              alertas.map((alerta) => (
                <button
                  key={alerta.id}
                  onClick={() => {
                    onAlunoClick(alerta.aluno.id);
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 py-2.5 px-4 hover:bg-white/5 transition-colors text-left"
                >
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={alerta.aluno.avatarUrl || ''} />
                    <AvatarFallback className="bg-white/10 text-white text-xs">
                      {getInitials(alerta.aluno.nome)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white text-sm font-medium truncate">
                        {alerta.aluno.nome}
                      </span>
                      <span className="text-white/40 text-xs flex-shrink-0">
                        {alerta.aluno.serie}{alerta.aluno.turma}
                      </span>
                    </div>
                    {/* Mostrar arquétipo para celebrações */}
                    {tipo === 'celebrar' && alerta.dados_contexto?.arquetipo && (
                      <div className="text-xs text-amber-400 mt-0.5">
                        🏆 "{typeof alerta.dados_contexto.arquetipo === 'object' 
                          ? (alerta.dados_contexto.arquetipo as { nome_arquetipo?: string })?.nome_arquetipo || 'Potencial identificado'
                          : String(alerta.dados_contexto.arquetipo)}"
                      </div>
                    )}
                    {tipo === 'celebrar' && !alerta.dados_contexto?.arquetipo && (
                      <div className="text-xs text-amber-400/70 mt-0.5">
                        ✨ 2 positivos consecutivos
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <ChevronRight className="w-4 h-4 text-white/30" />
                  </div>
                </button>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-3 border-t border-white/10">
          <p className="text-white/40 text-xs text-center">
            {count} {count === 1 ? 'aluno' : 'alunos'}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
