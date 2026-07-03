import { Crown, Lock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ConselhoLideresLockedProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ConselhoLideresLocked = ({ open, onOpenChange }: ConselhoLideresLockedProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1a1a2e] border-yellow-500/30 text-white max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-yellow-400">
            <Crown className="w-5 h-5" />
            Canal Exclusivo
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
              <Lock className="w-8 h-8 text-yellow-500/60" />
            </div>
          </div>
          <p className="text-center text-white/80 text-sm leading-relaxed">
            Este canal é exclusivo para <span className="text-yellow-400 font-semibold">Líderes das Casas</span> e a <span className="text-yellow-400 font-semibold">Diretoria</span>.
          </p>
          <p className="text-center text-white/50 text-xs italic">
            Continue sua jornada: quem sabe um dia você estará aqui. 👑
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
