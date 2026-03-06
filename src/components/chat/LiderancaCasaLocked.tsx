import { Zap, Lock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface LiderancaCasaLockedProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  casaColor?: string;
}

export const LiderancaCasaLocked = ({ open, onOpenChange, casaColor = '#6366f1' }: LiderancaCasaLockedProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1a1a2e] border-white/10 text-white max-w-sm" style={{ borderColor: `${casaColor}40` }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" style={{ color: casaColor }}>
            <Zap className="w-5 h-5" />
            Canal Exclusivo
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="flex justify-center">
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${casaColor}15`, border: `1px solid ${casaColor}30` }}
            >
              <Lock className="w-8 h-8" style={{ color: `${casaColor}90` }} />
            </div>
          </div>
          <p className="text-center text-white/80 text-sm leading-relaxed">
            Este canal é exclusivo para a{' '}
            <span className="font-semibold" style={{ color: casaColor }}>Liderança da Casa</span>.
          </p>
          <p className="text-center text-white/50 text-xs italic">
            Continue sua jornada — quem sabe um dia você estará aqui. ⚡
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
