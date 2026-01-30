// Contrato de dados exato que o N8N envia
export interface SugestaoN8NPayload {
  // Identificação
  aluno_id?: string;
  aluno_matricula?: string;
  
  // Estado geral
  estado: 'precisa_atencao' | 'celebrar' | 'neutro' | 'aguardando_explicacao';
  prioridade: 'urgente' | 'importante' | 'normal';
  
  // Cabeçalho da recomendação
  tipo_recomendacao: string;        // Ex: "INVESTIGAÇÃO GENTIL"
  nome_recomendacao: string;        // Ex: "Resgate da Confiança Linguística"
  
  // Elemento de ponte
  elemento_ponte: {
    forcas: string;                 // Ex: "Linguística"
    area_dificuldade: string;       // Ex: "comunicação e engajamento"
  };
  
  // Justificativa
  por_que_este_tipo: string;
  
  // Ação principal
  o_que_fazer_agora: {
    objetivo: string;
    contexto: string;
    script_principal: string;       // FRASE EXATA para o professor dizer
    como_escutar: string;
  };
  
  // Opções alternativas
  use_a_forca: {
    forcas_utilizadas: string;
    opcao_a: {
      nome: string;
      script: string;               // FRASE EXATA
      por_que_funciona: string;
    };
    opcao_b: {
      nome: string;
      script: string;               // FRASE EXATA
      por_que_funciona: string;
    };
  };
  
  // Reações
  como_reagir: {
    se_aceitar: string;
    se_recusar: string;
    alerta: string;
  };
  
  // Proibições
  o_que_nao_fazer: string[];
  
  // Mensagem final
  mensagem_professor: string;
  
  // Padrão detectado
  padrao_identificado: {
    nome: string;
    significado: string;
  };
  
  // Sinal gatilho
  sinal_principal: string;
  sinal_codigo: string;
}

// Interface para props do componente (mapeamento direto)
export interface SugestaoN8NCardProps {
  // Header
  tipoRecomendacao?: string;
  nomeRecomendacao?: string;
  prioridade?: 'urgente' | 'importante' | 'normal';
  
  // Elemento de ponte
  elementoPonte?: {
    forcas: string;
    areaDificuldade: string;
  };
  
  // Padrão
  padraoIdentificado?: {
    nome: string;
    significado: string;
  };
  
  // Justificativa
  porQueEsteTipo?: string;
  
  // Ação principal
  oQueFazerAgora?: {
    objetivo: string;
    contexto: string;
    scriptPrincipal: string;
    comoEscutar: string;
  };
  
  // Opções
  useAForca?: {
    forcasUtilizadas: string;
    opcaoA?: {
      nome: string;
      script: string;
      porQueFunciona: string;
    };
    opcaoB?: {
      nome: string;
      script: string;
      porQueFunciona: string;
    };
  };
  
  // Reações
  comoReagir?: {
    seAceitar: string;
    seRecusar: string;
    alerta?: string;
  };
  
  // Proibições
  oQueNaoFazer?: string[];
  
  // Mensagem
  mensagemProfessor?: string;
  
  // Ações
  onRegistrarAcao?: () => void;
}
