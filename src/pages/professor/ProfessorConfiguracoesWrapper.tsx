import { useProfessor } from '@/contexts/ProfessorContext';
import ProfessorConfiguracoesPage from './ProfessorConfiguracoesPage';
import InfantilConfiguracoesPage from './infantil/InfantilConfiguracoesPage';
import { F2_REFORMA_ATIVA } from '@/config/f2Reforma';

/**
 * Configurações do professor por segmento:
 * - Infantil e F1: pele do caderno claro (o F1 usa o mesmo shell claro do
 *   Infantil; a versão escura ficava branca/ilegível ali) + entrada do tutorial.
 * - F2 na reforma: usa o mesmo shell claro (o F2 reformado e claro; a versao
 *   escura ficava branca/ilegivel ali, igual o F1).
 * - F2 sem reforma: versão original (tema escuro), intacta.
 */
const ProfessorConfiguracoesWrapper = () => {
  const { segmento } = useProfessor();

  if (
    segmento === 'infantil' ||
    segmento === 'fundamental1' ||
    (segmento === 'fundamental2' && F2_REFORMA_ATIVA)
  ) {
    return <InfantilConfiguracoesPage />;
  }

  return <ProfessorConfiguracoesPage />;
};

export default ProfessorConfiguracoesWrapper;
