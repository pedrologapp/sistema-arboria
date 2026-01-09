import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const MissaoDetalhePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  return (
    <div className="py-6 space-y-6">
      {/* Back button */}
      <button
        onClick={() => navigate('/aluno/missoes')}
        className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Voltar</span>
      </button>

      {/* Placeholder content */}
      <div className="p-6 rounded-xl border border-white/10 bg-white/5 text-center">
        <h1 className="text-xl font-bold mb-4">Detalhes da Missão</h1>
        <p className="text-white/60 mb-4">
          ID: {id}
        </p>
        <p className="text-white/40 text-sm">
          A página de detalhes e entrega de missão será implementada em breve.
        </p>
        <Button
          className="mt-6"
          onClick={() => navigate('/aluno/missoes')}
        >
          Voltar para Missões
        </Button>
      </div>
    </div>
  );
};

export default MissaoDetalhePage;
