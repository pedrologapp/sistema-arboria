import { useProfessor } from '@/contexts/ProfessorContext';
import ProfessorConfiguracoesPage from './ProfessorConfiguracoesPage';
import InfantilConfiguracoesPage from './infantil/InfantilConfiguracoesPage';

/**
 * Configurações do professor por segmento:
 * - Infantil: pele do caderno claro (a versão compartilhada era do tema escuro
 *   do F2 e ficava branca/ilegível no layout claro) + entrada do tutorial.
 * - F1/F2: versão original (tema escuro), intacta.
 */
const ProfessorConfiguracoesWrapper = () => {
  const { segmento } = useProfessor();

  if (segmento === 'infantil') {
    return <InfantilConfiguracoesPage />;
  }

  return <ProfessorConfiguracoesPage />;
};

export default ProfessorConfiguracoesWrapper;
