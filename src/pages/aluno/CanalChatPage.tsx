import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const CanalChatPage = () => {
  const { canalId } = useParams();
  const navigate = useNavigate();

  const { data: canal, isLoading } = useQuery({
    queryKey: ['canal', canalId],
    queryFn: async () => {
      const { data } = await supabase
        .from('canais_casa')
        .select('*')
        .eq('id', canalId)
        .single();
      return data;
    },
    enabled: !!canalId,
  });

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
        {canal?.icone ? (
          <span className="text-lg">{canal.icone}</span>
        ) : (
          <Hash className="w-5 h-5 text-white/60" />
        )}
        <h1 className="text-lg font-bold text-white">
          {isLoading ? 'Carregando...' : `# ${canal?.nome || 'Canal'}`}
        </h1>
      </div>
      
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
          {canal?.icone ? (
            <span className="text-3xl">{canal.icone}</span>
          ) : (
            <Hash className="w-8 h-8 text-white/40" />
          )}
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Em breve!</h2>
        <p className="text-white/60 max-w-xs">
          O chat de canal está sendo preparado. Você poderá conversar com membros da sua casa aqui.
        </p>
      </div>
    </div>
  );
};

export default CanalChatPage;
