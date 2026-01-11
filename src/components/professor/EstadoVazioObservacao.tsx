import { CheckCircle, Eye, PlusCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface EstadoVazioObservacaoProps {
  tipo: 'tudo_bem' | 'aguardando';
  nomeAluno: string;
  ultimaObservacao?: { sinal: string; dataHora: string } | null;
  onRegistrarClick: () => void;
  casaColor: string;
}

const EstadoVazioObservacao = ({
  tipo,
  nomeAluno,
  ultimaObservacao,
  onRegistrarClick,
  casaColor
}: EstadoVazioObservacaoProps) => {
  if (tipo === 'tudo_bem') {
    const tempoRelativo = ultimaObservacao?.dataHora 
      ? formatDistanceToNow(new Date(ultimaObservacao.dataHora), { addSuffix: true, locale: ptBR })
      : null;

    return (
      <div className="rounded-xl bg-[#14532D] border border-green-500/30 p-4">
        <div className="flex items-center gap-2 text-green-400 font-semibold mb-2">
          <CheckCircle className="w-4 h-4" strokeWidth={2} />
          <span className="text-sm">Tudo bem com {nomeAluno}</span>
        </div>
        
        <p className="text-white/60 text-sm">
          Nenhum alerta no momento.
        </p>
        
        {ultimaObservacao && (
          <p className="text-white/40 text-xs mt-2">
            Última observação: "{ultimaObservacao.sinal}" ({tempoRelativo})
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-[#374151] border border-gray-500/30 p-4">
      <div className="flex items-center gap-2 text-gray-300 font-semibold mb-2">
        <Eye className="w-4 h-4" strokeWidth={2} />
        <span className="text-sm">Aguardando seu olhar</span>
      </div>
      
      <p className="text-white/60 text-sm mb-4">
        {nomeAluno} ainda não foi observado nesta fase.
      </p>
      
      <button
        onClick={onRegistrarClick}
        className="flex items-center gap-2 text-blue-400 text-sm hover:text-blue-300 transition-colors"
      >
        <PlusCircle className="w-4 h-4" strokeWidth={1.5} />
        <span>Registrar primeira observação</span>
      </button>
    </div>
  );
};

export default EstadoVazioObservacao;
