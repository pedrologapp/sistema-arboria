import { MessageCircle } from 'lucide-react';
import { useStudent } from '@/contexts/StudentContext';

const ChatPage = () => {
  const { casaColor } = useStudent();

  return (
    <div className="py-6 flex flex-col items-center justify-center min-h-[60vh]">
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
        style={{ backgroundColor: `${casaColor}20` }}
      >
        <MessageCircle className="w-10 h-10" style={{ color: casaColor }} />
      </div>
      
      <h1 className="text-2xl font-bold mb-2">Em breve!</h1>
      
      <p className="text-white/60 text-center max-w-xs">
        O chat com seu mentor e colegas de casa está sendo preparado.
      </p>
      
      <div className="mt-8 p-4 rounded-xl border border-white/10 bg-white/5 max-w-xs text-center">
        <p className="text-sm text-white/40">
          Aqui você poderá tirar dúvidas, receber orientações e interagir com os membros da sua casa.
        </p>
      </div>
    </div>
  );
};

export default ChatPage;
