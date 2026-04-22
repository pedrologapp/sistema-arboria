import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Timezone do Brasil (Natal/Recife - UTC-3)
export const TIMEZONE_BRASIL = 'America/Recife';

// Obter data/hora atual no timezone do Brasil
export const agoraBrasil = (): Date => {
  return new Date(new Date().toLocaleString('en-US', { timeZone: TIMEZONE_BRASIL }));
};

// IMPORTANTE: Criar Date a partir de string de data SEM conversão de timezone
// Isso evita o bug de virar o dia anterior (ex: 16/02 → 15/02)
export const parseDataLocal = (dataString: string): Date => {
  if (!dataString) return new Date();
  
  // Adicionar T12:00:00 para garantir que fique no dia correto
  // independente do timezone
  const [ano, mes, dia] = dataString.split('-').map(Number);
  return new Date(ano, mes - 1, dia, 12, 0, 0);
};

// Formatar data para exibição (formato simples, sem conversão timezone)
export const formatarData = (data: Date | string, formato: string = 'dd/MM'): string => {
  const dataObj = typeof data === 'string' ? parseDataLocal(data) : data;
  return format(dataObj, formato, { locale: ptBR });
};

// Formatar data no timezone do Brasil
export const formatarDataBrasil = (
  data: Date | string,
  formato: string = 'dd/MM/yyyy'
): string => {
  const dataObj = typeof data === 'string' ? parseDataLocal(data) : data;
  return format(dataObj, formato, { locale: ptBR });
};

// Formatar hora no timezone do Brasil
export const formatarHoraBrasil = (
  data: Date | string,
  formato: string = 'HH:mm'
): string => {
  const dataObj = typeof data === 'string' ? new Date(data) : data;
  return format(dataObj, formato, { locale: ptBR });
};

// Verificar se uma data já passou (comparando apenas a data, não hora)
export const jaPassou = (data: Date | string): boolean => {
  const dataObj = typeof data === 'string' ? parseDataLocal(data) : data;
  const agora = agoraBrasil();
  
  // Comparar apenas ano, mês e dia
  const dataComparacao = new Date(dataObj.getFullYear(), dataObj.getMonth(), dataObj.getDate());
  const hojeComparacao = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  
  return dataComparacao < hojeComparacao;
};

// Verificar se estamos dentro de um período
export const estaDentroDoPeriodo = (dataInicio: string, dataFim: string): boolean => {
  const agora = agoraBrasil();
  const inicio = parseDataLocal(dataInicio);
  const fim = parseDataLocal(dataFim);
  
  // Comparar apenas datas (sem horas)
  const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  const inicioData = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate());
  const fimData = new Date(fim.getFullYear(), fim.getMonth(), fim.getDate());
  
  return hoje >= inicioData && hoje <= fimData;
};

// Calcular semana atual dentro de uma fase (1-4)
export const calcularSemanaAtual = (dataInicio: string, dataFim: string): number => {
  const agora = agoraBrasil();
  const inicio = parseDataLocal(dataInicio);
  const fim = parseDataLocal(dataFim);

  if (agora < inicio) return 0; // Ainda não começou
  if (agora > fim) return 4; // Já terminou

  const diffMs = agora.getTime() - inicio.getTime();
  const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const semana = Math.floor(diffDias / 7) + 1;

  return Math.min(semana, 4);
};

// Calcular semana atual de uma fase baseado nas datas (1-4)
// Divide a duração total da fase em 4 partes iguais
export const calcularSemanaAtualDaFase = (dataInicio: string, dataFim: string): number => {
  const agora = agoraBrasil();
  const inicio = parseDataLocal(dataInicio);
  const fim = parseDataLocal(dataFim);
  const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  const inicioData = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate());
  const fimData = new Date(fim.getFullYear(), fim.getMonth(), fim.getDate());

  if (hoje < inicioData) return 0; // fase não começou
  if (hoje > fimData) return 4; // fase já terminou

  const totalDias = Math.floor((fimData.getTime() - inicioData.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const diasPorSemana = Math.ceil(totalDias / 4);
  const diffDias = Math.floor((hoje.getTime() - inicioData.getTime()) / (1000 * 60 * 60 * 24));

  const semana = Math.floor(diffDias / diasPorSemana) + 1;
  return Math.min(semana, 4);
};

// Obter data de hoje no timezone Brasil em formato YYYY-MM-DD
export const hojeBrasil = (): string => {
  return agoraBrasil().toLocaleDateString('en-CA'); // en-CA retorna YYYY-MM-DD
};

// Obter início do dia no timezone Brasil
export const inicioDoDiaBrasil = (data?: Date): Date => {
  const d = data ? new Date(data) : agoraBrasil();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
};

// Obter fim do dia no timezone Brasil
export const fimDoDiaBrasil = (data?: Date): Date => {
  const d = data ? new Date(data) : agoraBrasil();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
};
