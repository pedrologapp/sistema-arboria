export type StatusOnline = 'online' | 'ausente' | 'offline';

export interface StatusInfo {
  status: StatusOnline;
  cor: string;
  icone: string;
  label: string;
}

export const getStatusOnline = (ultimaAtividade: string | null): StatusInfo => {
  if (!ultimaAtividade) {
    return { status: 'offline', cor: '#6B7280', icone: '⚫', label: 'Offline' };
  }
  
  const diff = Date.now() - new Date(ultimaAtividade).getTime();
  const minutos = diff / 60000;
  
  if (minutos < 5) {
    return { status: 'online', cor: '#22C55E', icone: '🟢', label: 'Online' };
  }
  if (minutos < 15) {
    return { status: 'ausente', cor: '#EAB308', icone: '🟡', label: 'Ausente' };
  }
  return { status: 'offline', cor: '#6B7280', icone: '⚫', label: 'Offline' };
};
