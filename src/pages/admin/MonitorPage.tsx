import { Activity } from 'lucide-react';

const MonitorPage = () => {
  return (
    <div className="min-h-screen bg-[#0A0A0A] px-4 py-6">
      <div className="max-w-lg mx-auto text-center py-20">
        {/* Ícone grande */}
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-indigo-500/10 flex items-center justify-center">
          <Activity className="w-10 h-10 text-indigo-400" />
        </div>
        
        {/* Título */}
        <h1 className="text-2xl font-bold text-white mb-3">
          Monitoramento
        </h1>
        
        {/* Descrição */}
        <p className="text-white/60 text-sm leading-relaxed max-w-sm mx-auto">
          Dashboard em tempo real com visão geral de alunos, 
          engajamento, alertas e atividades.
        </p>
        
        {/* Badge "Em breve" */}
        <div className="mt-8 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10">
          <span className="text-xs text-white/40">Em breve...</span>
        </div>
      </div>
    </div>
  );
};

export default MonitorPage;
