import { Info, Clock, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Inteligencia {
  id: number;
  nome: string;
  codigo: string;
  cor_hex: string | null;
}

interface FaseAtual {
  id: string;
  numero_fase: number;
  inteligencia: Inteligencia | null;
}

interface FaseCasaMentor {
  id: string;
  numero_fase: number;
  data_inicio: string;
  data_fim: string;
  inteligencia_id: number;
}

interface BannerFaseInfoProps {
  faseAtual: FaseAtual | null;
  faseCasaMentor: FaseCasaMentor | null;
  casaMentor: Inteligencia | null;
}

type BannerTipo = 'futura' | 'proxima' | 'passada';

interface BannerInfo {
  linha1: string;
  linha2: string;
  tipo: BannerTipo;
}

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long'
  }).format(date);
};

const getBannerInfo = (
  faseAtual: FaseAtual | null,
  faseCasaMentor: FaseCasaMentor | null,
  casaMentor: Inteligencia | null
): BannerInfo | null => {
  // Não mostrar se dados incompletos
  if (!faseAtual || !faseCasaMentor || !casaMentor || !faseAtual.inteligencia) {
    return null;
  }

  // Se é a fase do professor, não mostrar banner
  if (faseAtual.inteligencia.id === casaMentor.id) {
    return null;
  }

  const hoje = new Date();
  const inicioFaseProf = new Date(faseCasaMentor.data_inicio);
  const fimFaseProf = new Date(faseCasaMentor.data_fim);
  const faseAtualNome = faseAtual.inteligencia.nome;
  const casaNome = casaMentor.nome;

  // Caso 1: Fase do professor já passou
  if (hoje > fimFaseProf) {
    return {
      linha1: `Estamos na Fase ${faseAtualNome}`,
      linha2: `Sua fase (${casaNome}) foi concluída em ${formatDate(faseCasaMentor.data_fim)}`,
      tipo: 'passada'
    };
  }

  // Caso 2: Fase do professor é a próxima
  if (faseCasaMentor.numero_fase === faseAtual.numero_fase + 1) {
    return {
      linha1: `Estamos na Fase ${faseAtualNome}`,
      linha2: `Sua fase (${casaNome}) é a próxima!`,
      tipo: 'proxima'
    };
  }

  // Caso 3: Fase do professor ainda vai chegar
  return {
    linha1: `Estamos na Fase ${faseAtualNome}`,
    linha2: `Sua fase (${casaNome}) começa em ${formatDate(faseCasaMentor.data_inicio)}`,
    tipo: 'futura'
  };
};

const bannerStyles: Record<BannerTipo, { 
  bg: string; 
  border: string; 
  iconColor: string;
  Icon: typeof Info;
}> = {
  futura: {
    bg: 'bg-blue-950/50',
    border: 'border-l-blue-500',
    iconColor: 'text-blue-400',
    Icon: Info
  },
  proxima: {
    bg: 'bg-emerald-950/50',
    border: 'border-l-emerald-500',
    iconColor: 'text-emerald-400',
    Icon: Clock
  },
  passada: {
    bg: 'bg-slate-800/50',
    border: 'border-l-slate-500',
    iconColor: 'text-slate-400',
    Icon: CheckCircle2
  }
};

const BannerFaseInfo = ({ faseAtual, faseCasaMentor, casaMentor }: BannerFaseInfoProps) => {
  const bannerInfo = getBannerInfo(faseAtual, faseCasaMentor, casaMentor);

  // Não mostrar se é a fase do professor ou dados incompletos
  if (!bannerInfo) return null;

  const styles = bannerStyles[bannerInfo.tipo];
  const IconComponent = styles.Icon;

  return (
    <div 
      className={cn(
        "mb-4 p-3 rounded-lg border-l-[3px]",
        styles.bg,
        styles.border
      )}
    >
      <div className="flex items-start gap-3">
        <IconComponent className={cn("w-5 h-5 mt-0.5 flex-shrink-0", styles.iconColor)} />
        <div className="text-left">
          <p className="text-sm font-medium text-white">
            {bannerInfo.linha1}
          </p>
          <p className="text-sm text-slate-400">
            {bannerInfo.linha2}
          </p>
        </div>
      </div>
    </div>
  );
};

export default BannerFaseInfo;