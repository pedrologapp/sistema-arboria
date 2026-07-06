/**
 * Utilidades do FUNDAMENTAL 1 (a Academia).
 *
 * No F1 cada turma vive uma "Academia": 1º-3º ano = Academia de Superpoderes;
 * 4º-5º = Academia de Talentos. A trilha do ano continua sendo as 8
 * inteligências (mesma turma_trilha/fases do Infantil), mas cada uma é
 * apresentada com um nome de ação (o "módulo").
 */

/**
 * Rótulo de cada módulo da trilha (id 1..8, mesma ordem da tabela inteligencias).
 * Decisão do Fundador (05/07): a trilha se chama "Os 8 superpoderes/talentos",
 * mas cada módulo é lido pelo nome REAL da inteligência. Sem nomes fictícios:
 * nome inventado vira rótulo, e rótulo é o que o Arboria não faz.
 */
export const ACADEMIA_F1: Record<number, string> = {
  1: 'Inteligência Linguística',
  2: 'Inteligência Lógico-Matemática',
  3: 'Inteligência Espacial',
  4: 'Inteligência Musical',
  5: 'Inteligência Corporal-Cinestésica',
  6: 'Inteligência Naturalista',
  7: 'Inteligência Interpessoal',
  8: 'Inteligência Intrapessoal',
};

/**
 * "Uma atividade, oito caminhos" na versão FUNDAMENTAL 1: a mesma peça
 * comparativa do santuário do Infantil (a professora entende cada inteligência
 * COMPARANDO), mas com uma atividade de SALA de 1º a 5º ano em vez da caixa de
 * blocos. Escrita pelo setor de Conteúdo, aprovada pelo Fundador (05/07).
 */
export const ATIVIDADE_OITO_CAMINHOS_F1 = {
  titulo: 'Uma atividade, oito caminhos',
  atividade: 'O cartaz em grupo',
  intro:
    'O mesmo cartaz, o mesmo tema, o mesmo grupo. Repare por onde cada aluno entra: o caminho é o que importa, não o cartaz pronto.',
  caminhos: {
    1: 'Assume o texto: escolhe o título, cuida de cada palavra e vai narrando o cartaz enquanto ele nasce. O tema só fica real depois que vira frase.',
    2: 'Antes de colar qualquer coisa, quer a ordem: o que vem primeiro, o que explica o quê. Agrupa as informações por causa e efeito, e o cartaz só anda quando a lógica fecha.',
    3: 'Enxerga o cartaz pronto antes de existir: decide onde entra cada imagem, quanto espaço cabe em cada parte, e mede com os olhos se vai caber. Distribui o espaço na cabeça antes da primeira colagem.',
    4: 'Transforma o conteúdo em som: inventa uma rima ou um refrão pra apresentar, ou vai batucando baixinho o compasso enquanto recorta. O que precisa decorar, ele fixa cantarolando.',
    5: 'Pega o material antes de combinar o plano: recorta, cola, testa na mão como fica. Entende o trabalho fazendo, e, na hora de apresentar, é o corpo que conta, com gesto e encenação.',
    6: 'Diante do monte de recortes e informações, começa separando: por tipo, por grupo, o que pertence e o que sobra. Acha na hora o dado fora do lugar. O cartaz vira uma coleção posta em ordem.',
    7: 'Organiza o grupo: distribui quem faz o quê, percebe quem ficou de fora e chama, resolve o impasse sobre a cor do título. O trabalho anda porque é ele que costura as pessoas.',
    8: 'Escolhe a parte que combina com ela e faz um pouco à parte, no próprio ritmo. Sabe dizer "essa parte não é pra mim, me deixa cuidar do texto". Entra quando está pronta, sabendo exatamente o que quer.',
  } as Record<number, string>,
};

/** Rótulo de módulo a partir do nome técnico vindo do banco ("Linguística" -> "Inteligência Linguística"). */
export const nomeModulo = (nomeInteligencia: string) =>
  nomeInteligencia.startsWith('Inteligência') ? nomeInteligencia : `Inteligência ${nomeInteligencia}`;

/** 1º-3º ano ("1º Ano".."3º Ano") = faixa 1. */
export const ehFaixa1 = (serie?: string | null) => /^[1-3]/.test((serie ?? '').trim());

/** Turma sem série identificável cai em "Academia de Talentos" (inofensivo). */
export const nomeAcademia = (serie?: string | null) =>
  ehFaixa1(serie) ? 'Academia de Superpoderes' : 'Academia de Talentos';

export const palavraPoder = (serie?: string | null) =>
  ehFaixa1(serie) ? 'superpoder' : 'talento';

export const palavraPoderPlural = (serie?: string | null) =>
  ehFaixa1(serie) ? 'superpoderes' : 'talentos';
