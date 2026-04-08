// Sistema de temas dinâmicos baseado na Casa do aluno
// Cada Casa tem uma cor primária que é aplicada em todo o app

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : null;
}

export function applyTheme(casaColor: string) {
  const root = document.documentElement;
  const rgb = hexToRgb(casaColor);

  if (!rgb) return;

  root.style.setProperty('--casa-color', casaColor);
  root.style.setProperty('--casa-color-10', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`);
  root.style.setProperty('--casa-color-15', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`);
  root.style.setProperty('--casa-color-20', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2)`);
  root.style.setProperty('--casa-color-30', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`);
}
