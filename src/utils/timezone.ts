import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import { ptBR } from 'date-fns/locale';

// Timezone do Brasil (Natal/Recife - UTC-3)
export const TIMEZONE_BRASIL = 'America/Recife';

// Obter data/hora atual no timezone do Brasil
export const agoraBrasil = (): Date => {
  return toZonedTime(new Date(), TIMEZONE_BRASIL);
};

// Formatar data no timezone do Brasil
export const formatarDataBrasil = (
  data: Date | string,
  formato: string = 'dd/MM/yyyy'
): string => {
  const dataObj = typeof data === 'string' ? new Date(data) : data;
  return formatInTimeZone(dataObj, TIMEZONE_BRASIL, formato, { locale: ptBR });
};

// Formatar hora no timezone do Brasil
export const formatarHoraBrasil = (
  data: Date | string,
  formato: string = 'HH:mm'
): string => {
  const dataObj = typeof data === 'string' ? new Date(data) : data;
  return formatInTimeZone(dataObj, TIMEZONE_BRASIL, formato, { locale: ptBR });
};

// Verificar se uma data já passou (no timezone do Brasil)
export const jaPassou = (data: Date | string): boolean => {
  const dataObj = typeof data === 'string' ? new Date(data) : data;
  const agora = agoraBrasil();
  return dataObj < agora;
};

// Verificar se estamos dentro de um período
export const estaDentroDoPeriodo = (dataInicio: string, dataFim: string): boolean => {
  const agora = agoraBrasil();
  const inicio = new Date(dataInicio);
  const fim = new Date(dataFim);
  fim.setHours(23, 59, 59, 999);
  return agora >= inicio && agora <= fim;
};

// Calcular semana atual dentro de uma fase (1-4)
export const calcularSemanaAtual = (dataInicio: string, dataFim: string): number => {
  const agora = agoraBrasil();
  const inicio = new Date(dataInicio);
  const fim = new Date(dataFim);

  if (agora < inicio) return 0; // Ainda não começou
  if (agora > fim) return 4; // Já terminou

  const diffMs = agora.getTime() - inicio.getTime();
  const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const semana = Math.floor(diffDias / 7) + 1;

  return Math.min(semana, 4);
};

// Obter início do dia no timezone Brasil
export const inicioDoDiaBrasil = (data?: Date): Date => {
  const d = data ? new Date(data) : agoraBrasil();
  d.setHours(0, 0, 0, 0);
  return d;
};

// Obter fim do dia no timezone Brasil
export const fimDoDiaBrasil = (data?: Date): Date => {
  const d = data ? new Date(data) : agoraBrasil();
  d.setHours(23, 59, 59, 999);
  return d;
};
