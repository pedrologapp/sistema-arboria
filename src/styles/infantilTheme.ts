/**
 * Tema do app do PROFESSOR — Infantil.
 *
 * Pele NEUTRA e CALMA, de ferramenta de trabalho (não o sci-fi do app do aluno).
 * Tudo que é cor mora aqui: quando o Fundador trouxer referências de identidade
 * visual, reskin = trocar este arquivo. Por isso preferimos consumir estas
 * constantes a espalhar hex pelas telas.
 *
 * Passada de profundidade: o fundo foi escurecido e ganhamos sombras +
 * superfícies afundadas, pra criar hierarquia sem trocar a identidade (índigo).
 */
export const infantilTheme = {
  // Superfícies
  bg: '#EEF0F2',          // fundo geral escurecido — faz o card branco "subir"
  surface: '#FFFFFF',     // cards / barras
  surfaceAlt: '#F6F7F9',  // blocos sutis dentro de cards
  surfaceSunken: '#E8EAED', // campos de input / áreas afundadas
  border: '#DDE0E6',      // borda um tom mais definida

  // Texto
  text: '#1C2230',        // quase-preto azulado (títulos / corpo)
  textMuted: '#5A6473',   // secundário
  textFaint: '#6E7788',   // legendas / placeholders (escurecido p/ AA em texto pequeno — sol no pátio)

  // Acento (trocável) — indigo calmo. MANTER (troca de identidade é decisão futura do Fundador).
  accent: '#4F46E5',
  accentSoft: '#EEF0FE',  // fundo suave do acento
  accentBorder: '#D6D9FB', // borda tingida p/ cards em accentSoft (borda cinza deixava o convite "indeciso")
  accentText: '#4338CA',  // acento legível sobre claro
  accentDeep: '#3730A3',  // acento mais profundo

  // Sombras (profundidade / hierarquia)
  shadowSm: '0 1px 2px rgba(28,34,48,0.05)',
  shadowMd: '0 2px 8px rgba(28,34,48,0.07)',
  shadowLg: '0 6px 20px rgba(28,34,48,0.10)',

  // Estados de presença (lista de alunos)
  presente: '#22A06B',    // tem registro — verde sóbrio (ícones/fundos)
  presenteText: '#177A50', // o mesmo verde p/ TEXTO pequeno (AA sobre branco)
  silencio: '#C2C8D2',    // sem registro — cinza neutro (NUNCA "vermelho de falta")
} as const;

export type InfantilTheme = typeof infantilTheme;
