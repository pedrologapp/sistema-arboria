import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

const MembrosPage = () => {
  const navigate = useNavigate();

  return (
    <div className="py-4 space-y-4">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/aluno/chat')}
          className="text-white/60 hover:text-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <Users className="w-5 h-5 text-white/60" />
        <h1 className="text-lg font-bold text-white">Membros da Casa</h1>
      </div>
      
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
          <Users className="w-8 h-8 text-white/40" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Em breve!</h2>
        <p className="text-white/60 max-w-xs">
          A lista de membros está sendo preparada. Você poderá iniciar conversas com colegas da sua casa.
        </p>
      </div>
    </div>
  );
};

export default MembrosPage;
