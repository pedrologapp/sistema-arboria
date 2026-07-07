/**
 * O LEQUE DE OBSERVAÇÃO (menu radial / marking menu dentro da aula).
 *
 * A professora abre o aluno pra observar e um círculo abre no centro: ela toca,
 * a cena se escreve, e ela fecha com o detalhe no teclado. Aprovado pelo Fundador
 * 07/07. Serve Infantil e F1.
 *
 * A LEI DO LEQUE (inegociável): toda opção é uma CENA (o que a criança fez),
 * nunca um veredito ("foi bem", "é esperta"). É isso que guarda o COMO.
 *
 * Estrutura da cascata:
 *  - COMECOS (universal): abre a frase.
 *  - MECANISMO (por inteligência da fase): a cena do mecanismo, sorteada de um
 *    CONJUNTO pra a professora não viciar nas mesmas frases.
 *  - OUTRO + CAMINHOS: o Cross-IM. "foi por um caminho inesperado" abre os 8
 *    caminhos como COMPORTAMENTO, nunca o nome da inteligência (a leitura de
 *    qual mecanismo é isso fica pro santuário e pra IA, jamais pra ela apertar).
 *
 * `l` = rótulo curto (o chip no círculo). `t` = o texto que entra na observação.
 */
export interface LequeOpcao {
  l: string;
  t: string;
  /** Cor da inteligência: usada só nos 8 caminhos, pro chip sair na cor da IM. */
  cor?: string;
}

/** Começos universais: abrem a cena, nunca julgam. */
export const LEQUE_COMECOS: LequeOpcao[] = [
  { l: 'Do seu jeito', t: 'Do seu jeito,' },
  { l: 'Reparei que', t: 'Reparei que' },
  { l: 'Sem eu pedir', t: 'Sem eu pedir,' },
  { l: 'Na hora de fazer', t: 'Na hora de fazer,' },
];

/** O galho do Cross-IM. Rótulo claro pra a professora (decisão do Fundador 07/07). */
export const LEQUE_OUTRO: LequeOpcao = {
  l: 'de um jeito diferente',
  t: 'foi por um caminho inesperado:',
};

/** Os 8 caminhos, como COMPORTAMENTO (mapeiam as 8 inteligências, sem nomear).
 *  `cor` = cor oficial da inteligência correspondente, na ordem 1..8. */
export const LEQUE_CAMINHOS: LequeOpcao[] = [
  { l: 'em voz alta', t: 'contou tudo em voz alta, como uma história...', cor: '#1E3A8A' },
  { l: 'por uma regra', t: 'montou uma regra: se um é assim, o outro tem que ser...', cor: '#047857' },
  { l: 'pela imagem', t: 'foi pela imagem, desenhou pra enxergar...', cor: '#7C3AED' },
  { l: 'no ritmo', t: 'no ritmo, marcando uma batida enquanto fazia...', cor: '#7F1D1D' },
  { l: 'com as mãos', t: 'com as mãos, só entendeu depois de pegar...', cor: '#B8860B' },
  { l: 'nas diferenças', t: 'reparou nas diferenças finas que ninguém viu...', cor: '#78350F' },
  { l: 'com o grupo', t: 'puxando os colegas, lendo o grupo...', cor: '#0891B2' },
  { l: 'no seu tempo', t: 'no seu tempo, sabendo a hora de parar...', cor: '#EA580C' },
];

/**
 * Conjunto de cenas por inteligência (id 1-8). A UI mostra 3 sorteadas de cada
 * vez + o "outro caminho". Preenchido pela Naturalista (6); as demais chegam do
 * setor de Conteúdo (validadas por Pesquisa) na mesma estrutura.
 */
export const LEQUE_MECANISMO: Record<number, LequeOpcao[]> = {
  1: [ // Linguística
    { l: 'narrou brincando', t: 'narrou a própria brincadeira em voz alta enquanto brincava...' },
    { l: 'a palavra trocada', t: 'reclamou quando troquei uma palavra da história de sempre...' },
    { l: 'inventou nome', t: 'inventou um nome, e o nome tinha som e intenção...' },
    { l: 'começo meio fim', t: 'recontou o que viveu com começo, meio e fim...' },
    { l: 'a fala exata', t: 'guardou a fala exata de alguém e devolveu dias depois...' },
    { l: 'gostou do som', t: 'repetiu uma palavra nova pelo gosto do som...' },
    { l: 'virou história', t: 'transformou a tarefa numa história pra dar conta dela...' },
  ],
  2: [ // Lógico-Matemática
    { l: 'conferiu a regra', t: 'repetiu a mesma ação mudando um detalhe, pra ver se mudava junto...' },
    { l: 'a ordem quebrou', t: 'percebeu na hora que a rotina tinha mudado de ordem...' },
    { l: 'por quê em cadeia', t: 'emendou um porquê no outro, cada resposta puxando a próxima...' },
    { l: 'um pra cada', t: 'distribuiu um pra cada um por uma regra que achou...' },
    { l: 'cair igual', t: 'derrubou a torre de novo só pra conferir se caía igual...' },
    { l: 'o que tem dentro', t: 'desmontou o brinquedo pra ver o que tinha dentro...' },
    { l: 'se isso então', t: 'montou um se isso, então aquilo, e seguiu a cadeia...' },
  ],
  3: [ // Espacial
    { l: 'olhou antes', t: 'olhou os blocos um tempo antes de tocar, e montou quase sem errar...' },
    { l: 'girou na cabeça', t: 'girou a peça na cabeça, e a mão já chegou certa...' },
    { l: 'pela forma', t: 'encaixou pela forma, sem tentativa e erro...' },
    { l: 'onde estava', t: 'sabia onde a coisa estava guardada, até o que eu tinha perdido...' },
    { l: 'mudou de lugar', t: 'notou que algo tinha mudado de lugar antes de todo mundo...' },
    { l: 'achou o caminho', t: 'achou o caminho de volta no pátio sem hesitar...' },
    { l: 'a peça certa', t: 'procurou uma peça específica, a que já tinha lugar na cabeça...' },
  ],
  4: [ // Musical
    { l: 'o ritmo voltou', t: 'devolveu o ritmo certo dias depois de ouvir uma vez só...' },
    { l: 'o tom mudou', t: 'estranhou a música de sempre num tom diferente, antes de saber dizer o quê...' },
    { l: 'bateu na mesa', t: 'bateu um ritmo na mesa enquanto fazia outra coisa...' },
    { l: 'parou no som', t: 'parou tudo quando apareceu um som novo...' },
    { l: 'a entrada certa', t: 'completou a cantiga no ponto exato, sem errar a entrada...' },
    { l: 'cantou baixinho', t: 'cantou baixinho pra si enquanto brincava de outra coisa...' },
    { l: 'virou cantiga', t: 'guardou em cantiga o que não tinha ficado falado...' },
  ],
  5: [ // Corporal-Cinestésica
    { l: 'a mão foi antes', t: 'pôs a mão na tarefa antes de a instrução acabar...' },
    { l: 'mostrou de novo', t: 'não soube explicar como fez, então mostrou de novo...' },
    { l: 'precisou pegar', t: 'só entendeu depois que pegou e mexeu com as mãos...' },
    { l: 'gesto de uma vez', t: 'pegou um gesto novo vendo uma vez só...' },
    { l: 'contou com o corpo', t: 'contou a história com o corpo: encenou, imitou, virou o personagem...' },
    { l: 'a mão sentiu', t: 'equilibrou a torre porque a mão sentiu onde apoiar...' },
    { l: 'a força certa', t: 'calculou o pulo, o equilíbrio e a força exata no pátio...' },
  ],
  6: [ // Naturalista
    { l: 'por critério', t: 'separou por um critério próprio...' },
    { l: 'o intruso', t: 'achou o que não pertencia ao grupo...' },
    { l: 'nomeou grupos', t: 'nomeou as categorias por conta própria...' },
    { l: 'mesma família', t: 'juntou o que era da mesma família...' },
    { l: 'diferença fina', t: 'reparou numa diferença fina que ninguém viu...' },
    { l: 'coleção', t: 'colecionou e sabia o que faltava...' },
    { l: 'comparou', t: 'comparou dois e apontou o que os separa...' },
  ],
  7: [ // Interpessoal
    { l: 'antes de chorar', t: 'percebeu que o colega ia chorar antes de qualquer adulto...' },
    { l: 'mudou pro parceiro', t: 'ajustou o jeito de brincar conforme o parceiro, sem ninguém ensinar...' },
    { l: 'leu o seu rosto', t: 'olhou o meu rosto pra decidir se podia...' },
    { l: 'o clima virou', t: 'mudou de comportamento na hora em que o clima da sala mudou...' },
    { l: 'leu o grupo', t: 'leu a dinâmica do grupo inteiro só olhando da beirada...' },
    { l: 'o que ele queria', t: 'entregou ao colega justo o brinquedo que ele queria, sem ninguém pedir...' },
    { l: 'acalmou os dois', t: 'na disputa, procurou a saída que acalmava os dois lados...' },
  ],
  8: [ // Intrapessoal
    { l: 'nomeou o sentir', t: 'nomeou o que sentia com exatidão: não era só bravo, era queria e não deu...' },
    { l: 'achou o canto', t: 'procurou um canto quieto pra se recompor, e voltou...' },
    { l: 'disse o porquê', t: 'recusou a atividade e soube dizer por quê...' },
    { l: 'olhou antes de entrar', t: 'observou a brincadeira um tempo antes de entrar nela...' },
    { l: 'voltou por conta', t: 'voltou pro grupo por conta própria, sem precisar de chamado...' },
    { l: 'sabia o que queria', t: 'escolheu sabendo o que queria, não pegou qualquer um...' },
    { l: 'a hora de parar', t: 'soube a hora de parar antes de passar do ponto...' },
  ],
};

/** Sorteia n opções do conjunto de uma inteligência (fallback: começos se vazio). */
export const sortearMecanismo = (inteligenciaId: number, n = 3): LequeOpcao[] => {
  const pool = LEQUE_MECANISMO[inteligenciaId] ?? [];
  if (pool.length === 0) return [];
  const idx = pool.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx.slice(0, n).map((i) => pool[i]);
};
