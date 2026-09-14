// ============================================================
// titulos — o nome e o numero de cada projeto da Arena.
//
// POR QUE ISTO E' UM ARQUIVO E NAO UMA TABELA. A entrega da 2a fase nao guarda
// titulo: o aluno mandou foto, video e uma descricao em prosa, e mais nada. O
// nome do projeto so' existe dentro do texto. Enquanto a pagina de curadoria
// nao existir, os nomes moram aqui, onde da' para corrigir em um minuto e sem
// tocar no banco. Quando a curadoria for construida, esta lista vira as
// primeiras linhas da tabela de publicacao e este arquivo some.
//
// DE ONDE VIERAM. Foram lidos do proprio texto da equipe, nunca inventados.
// Dois nao dizem o nome do projeto em lugar nenhum da prosa, e por isso estao
// marcados com CONFERIR: precisam da palavra do Fundador antes de qualquer
// coisa ir ao ar.
//
// O NUMERO E' IDENTIDADE, NAO COLOCACAO. Ele fica preso ao projeto para o link
// nunca quebrar. A ORDEM da galeria e' outra coisa: embaralha a cada visita,
// justamente para o numero nao ser lido como classificacao.
//
// A chave e' o id da entrega que venceu a juncao por grupo (a mais completa).
// Se um grupo enviar de novo e outra entrega passar a vencer, o projeto cai
// no titulo provisorio, que e' visivel na hora e barato de consertar.
// ============================================================

export interface FichaProjeto {
  numero: number;
  titulo: string;
  /** true quando o nome nao esta' escrito na prosa e foi deduzido do assunto. */
  conferir?: boolean;
}

export const TITULO_PROVISORIO = 'Projeto sem nome cadastrado';

export const TITULOS: Record<string, FichaProjeto> = {
  '9224884e-15a1-4f5e-8c70-a51579910be6': { numero: 1, titulo: 'Empire Box' },
  'b22a1bf4-31ed-429d-9cc7-31b10d450165': { numero: 2, titulo: 'Caixa de Som Ecológica' },
  '3e2f6da9-d51f-4266-9ae2-cd23380eba80': { numero: 3, titulo: 'Decoder: Terminal Lógico' },
  'bc3c4687-8877-40d3-bded-f34004cc7880': { numero: 4, titulo: 'Metrô Sustentável' },
  '58c15371-af5d-4293-9982-eccf129c1685': { numero: 5, titulo: 'ReMember' },
  'f96e6023-9bbe-4811-aaa9-e09bf562fe8a': { numero: 6, titulo: 'O Caso do Policial Billy', conferir: true },
  '474821f0-b13f-4ac2-a009-c9c6a7d774e4': { numero: 7, titulo: 'PulsePay' },
  '0ff2ae29-0289-4991-949f-de458dd4d55f': { numero: 8, titulo: 'Chacina na Fazenda', conferir: true },
  'ae187cce-14b1-44bb-aaca-528639754fbe': { numero: 9, titulo: 'Global Trade Coin' },
  '40578b2f-08b1-4d93-8aa4-ea66910d22d1': { numero: 10, titulo: 'Projeto Pirólise' },
  '85eb8a94-b5f8-4c2b-8337-23fa444d6ac9': { numero: 11, titulo: 'Song Maker' },
};
