import { coordenadorTheme as t } from '@/styles/coordenadorTheme';

/**
 * Sinal de ÚLTIMO ACESSO (verde/âmbar/vermelho). É um sinal de SUPORTE (esta
 * turma precisa de um empurrão?), nunca um ranking do professor: mede há quanto
 * tempo alguém não mexe no Arboria naquela turma.
 *  hoje            -> ok (verde)
 *  1 a 3 dias      -> warn (âmbar)
 *  4+ dias / nunca -> crit (vermelho)
 */
export const sinalUltimoAcesso = (iso: string | null | undefined) => {
  if (!iso) return { cor: t.crit, label: 'sem acesso' };
  const dias = diffDias(iso);
  if (dias <= 0) return { cor: t.ok, label: 'hoje' };
  if (dias === 1) return { cor: t.warn, label: 'ontem' };
  if (dias <= 3) return { cor: t.warn, label: `há ${dias} dias` };
  return { cor: t.crit, label: `há ${dias} dias` };
};

/**
 * Cor da barra de COBERTURA ("X de N observados na fase"). Mede a cobertura do
 * professor (todos os alunos estão sendo vistos?), nunca compara crianças.
 *  0 observados   -> neutro (barra apagada)
 *  < 80%          -> âmbar (em andamento)
 *  >= 80%         -> verde (cobertura alta)
 */
export const corCobertura = (observados: number, total: number) => {
  if (total <= 0 || observados <= 0) return 'transparent';
  return observados / total >= 0.8 ? t.ok : t.warn;
};

/**
 * Rótulo CONCRETO do último acesso (login) para o card da Gestão: mostra a data
 * de fato ("hoje 16:47", "ontem 09:12", "10/07 16:47"), não um relativo vago.
 * O Fundador quer ver o dia real do último login daquele professor.
 */
export const rotuloAcesso = (iso: string | null | undefined): string => {
  if (!iso) return 'sem acesso';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'sem acesso';
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const dias = diffDias(iso);
  if (dias <= 0) return `hoje ${hora}`;
  if (dias === 1) return `ontem ${hora}`;
  return `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} ${hora}`;
};

/** Rótulo curto e humano de quando algo aconteceu (mural). */
export const tempoRelativo = (iso: string | null | undefined): string => {
  if (!iso) return '';
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return '';
  const min = Math.floor((Date.now() - d) / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const horas = Math.floor(min / 60);
  if (horas < 24) return `há ${horas} h`;
  const dias = diffDias(iso);
  if (dias === 1) return 'ontem';
  if (dias < 7) return `há ${dias} dias`;
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

/** Diferença em dias de calendário local entre agora e a data ISO. */
const diffDias = (iso: string): number => {
  const then = new Date(iso);
  const hoje0 = new Date();
  hoje0.setHours(0, 0, 0, 0);
  const then0 = new Date(then);
  then0.setHours(0, 0, 0, 0);
  return Math.round((hoje0.getTime() - then0.getTime()) / 86400000);
};
