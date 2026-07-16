// ============================================================
// "Leituras vistas" do aluno: marcador local (por dispositivo) das análises de
// missão que a criança já abriu. Serve pro pop-up na Home avisar SÓ quando há
// leitura nova, e sumir depois que ela vê. Nudge, não estado crítico: se trocar
// de aparelho, no máximo lembra de novo. Nada sensível é guardado, só ids.
// ============================================================
const KEY = 'arboria-leituras-vistas';

export const getLeiturasVistas = (): Set<string> => {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) || '[]') as string[]);
  } catch {
    return new Set();
  }
};

export const marcarLeituraVista = (entregaId: string): void => {
  try {
    const s = getLeiturasVistas();
    s.add(entregaId);
    localStorage.setItem(KEY, JSON.stringify([...s]));
  } catch {
    /* sem localStorage: segue sem marcar */
  }
};

export const marcarLeiturasVistas = (ids: string[]): void => {
  try {
    const s = getLeiturasVistas();
    ids.forEach((i) => s.add(i));
    localStorage.setItem(KEY, JSON.stringify([...s]));
  } catch {
    /* segue */
  }
};
