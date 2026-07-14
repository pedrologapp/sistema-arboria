/**
 * Tema do VISOR DO COORDENADOR. DARK (paleta exata dos mockups aprovados,
 * scratchpad/mock_coordenador_gestao.html e mock_coordenador_turma.html).
 *
 * Professores ficam no claro; o coordenador vive no preto (decisão do Fundador).
 * Tudo que é cor mora aqui: reskin = trocar este arquivo.
 */
export const coordenadorTheme = {
  // Superfícies
  bg: '#0E1017',
  panel: '#161A24',
  panel2: '#1C2130',
  line: 'rgba(255,255,255,0.08)',
  line2: 'rgba(255,255,255,0.14)',

  // Texto
  ink: '#EAECF2',
  ink2: '#AEB4C2',
  mut: '#7A8194',
  mut2: '#565D70',

  // Acento
  accent: '#5E8BD8',
  accent2: '#8FB2E8',
  accentDim: 'rgba(94,139,216,0.16)',

  // Estados de sinal (último acesso / cobertura)
  ok: '#5FD39A',
  warn: '#E6B45E',
  crit: '#E5776A',

  // Fundo atmosférico (radial do topo, igual ao mock)
  bgGradient: 'radial-gradient(ellipse at 50% -5%, #191d2b 0%, #0E1017 55%)',
} as const;

export type CoordenadorTheme = typeof coordenadorTheme;
