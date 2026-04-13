import { useMemo } from 'react';
import { agoraBrasil } from '@/utils/timezone';

// Import será preenchido quando o data file estiver pronto
// Por enquanto define a interface
export interface DesafioDiarioData {
  casa_codigo: string;
  numero: number;
  tipo: 'observacao' | 'acao' | 'reflexao' | 'escuta' | 'registro';
  texto_desafio: string;
  texto_para_escrever: string;
  habilidades: string[];
}

// Data base para rotação (1 de janeiro de 2026)
const DATA_BASE = new Date(2026, 0, 1);
const TOTAL_DESAFIOS = 35;

/**
 * Calcula qual desafio mostrar hoje.
 * Regra: muda às 06:00 horário de Brasília.
 * Se antes das 06:00, mostra o desafio do dia anterior.
 */
export const getDesafioHoje = (
  desafios: DesafioDiarioData[],
  casaCodigo: string
): { desafio: DesafioDiarioData | null; saudacao: string } => {
  const agora = agoraBrasil();

  // Se antes das 06:00, considera como dia anterior
  if (agora.getHours() < 6) {
    agora.setDate(agora.getDate() - 1);
  }

  // Dias desde a data base
  const diffMs = agora.getTime() - DATA_BASE.getTime();
  const diasDesdeInicio = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // Número do desafio (1 a 35, rotativo)
  const numeroDesafio = (diasDesdeInicio % TOTAL_DESAFIOS) + 1;

  // Filtrar desafios da casa
  const desafiosCasa = desafios.filter(d => d.casa_codigo === casaCodigo);
  const desafio = desafiosCasa.find(d => d.numero === numeroDesafio) || null;

  // Saudação baseada no tipo e no dia
  const saudacao = desafio ? getSaudacao(desafio.tipo, diasDesdeInicio) : '';

  return { desafio, saudacao };
};

const SAUDACOES: Record<string, string[]> = {
  observacao: ['Olhos abertos hoje!', 'O que você vai perceber?', 'Ative seu radar', 'Hora de observar', 'Preste atenção ao redor'],
  acao: ['Hora de agir!', 'Coloque em prática', 'Faça acontecer', 'Ação gera aprendizado', 'Faça a diferença hoje'],
  reflexao: ['Momento de pensar', 'Olhe pra dentro', 'O que você aprendeu?', 'Pense sobre isso', 'Hora de refletir'],
  escuta: ['Ouvidos atentos!', 'Escute além das palavras', 'Preste atenção', 'O que você vai ouvir?', 'Hora de escutar'],
  registro: ['Hora de registrar', 'Capture o momento', 'Ancore o que viu', 'Escreva o que importa', 'Registre antes que passe'],
};

const getSaudacao = (tipo: string, dia: number): string => {
  const lista = SAUDACOES[tipo] || SAUDACOES.observacao;
  return lista[dia % lista.length];
};

export const useDesafioDiario = (desafios: DesafioDiarioData[], casaCodigo: string | undefined) => {
  return useMemo(() => {
    if (!casaCodigo || desafios.length === 0) return { desafio: null, saudacao: '' };
    return getDesafioHoje(desafios, casaCodigo);
  }, [desafios, casaCodigo]);
};
