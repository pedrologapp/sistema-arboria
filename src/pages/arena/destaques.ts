// ============================================================
// destaques — as palavras que o texto de cada projeto realça.
//
// POR QUE ISTO E' UMA LISTA ESCOLHIDA A MAO, e nao um algoritmo. O texto e' da
// equipe, e esta' na pagina sob o rotulo "Nas palavras da equipe". Decidir o
// que fica em destaque e' um ato editorial sobre a fala de uma crianca: muda
// onde o leitor pousa o olho e, no limite, muda o que o texto parece dizer.
// Isso precisa ser escolha de gente, revisavel, e nao de uma regra automatica
// que amanha realca a palavra errada.
//
// DUAS REGRAS QUE O RENDERIZADOR IMPOE, e que valem mais que o gosto:
//  1. So' a PRIMEIRA aparicao de cada termo e' realcada. Sem isso, um termo que
//     se repete oito vezes pinta o texto inteiro de verde e o destaque perde a
//     funcao de destacar.
//  2. No maximo SEIS termos por projeto. Acima disso nao e' mais enfase, e' so'
//     ruido colorido.
//
// O que NAO entra aqui: nada que a equipe nao tenha escrito. O destaque realca
// palavra que ja' esta' no texto, nunca acrescenta.
// ============================================================

export const MAX_DESTAQUES = 6;

// PRIMEIRA VERSAO, escrita pelo CEO lendo os onze textos, e sujeita a correcao
// do Fundador. O criterio foi: realcar o que o projeto E' e como ele FUNCIONA,
// nunca adjetivo de elogio. Todos os termos existem literalmente no texto da
// equipe.
/** chave = numero do projeto. */
export const DESTAQUES: Record<number, string[]> = {
  1: ['Empire Box', 'Empire OS', 'um único lugar', 'gestão', 'Dashboard'],
  2: ['caixa de som ecológica', 'alto-falantes', 'Bluetooth', 'bateria', 'acessíveis'],
  3: ['lógica matemática', 'raciocínio dedutivo', 'engenharia reversa',
      'pistas encadeadas', 'testes de unicidade'],
  4: ['congestionamentos', 'energia elétrica', 'geradores de emergência',
      'sustentável', '600 bilhões'],
  5: ['memória externa', 'inteligência artificial', 'checklist', 'categorias', 'protótipo'],
  6: ['lógica', 'pistas', 'quebra-cabeça', 'culpado', 'ponto fraco'],
  7: ['pulseira inteligente', 'pagamentos por aproximação', 'documentos digitais',
      'rastreamento', 'bloqueada'],
  8: ['códigos de programação', 'culpado', 'bugs', 'boletim de ocorrência'],
  9: ['Global Trade Coin', 'moeda internacional', 'dólar', 'variações cambiais',
      'Banco Global de Transações'],
  10: ['pirólise', 'biomassa', 'bio-óleo', 'biochar', 'combustível renovável'],
  11: ['música e matemática', 'Song Maker', 'padrões', 'repetições', 'musicas chicletes'],
};
