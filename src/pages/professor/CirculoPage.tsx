import { useNavigate } from 'react-router-dom';
import { useProfessor } from '@/contexts/ProfessorContext';

// Séries por segmento
const SERIES_POR_SEGMENTO = {
  infantil: [
    { numero: 2, label: 'MATERNAL 2' },
    { numero: 3, label: 'MATERNAL 3' },
    { numero: 4, label: 'GRUPO IV' },
    { numero: 5, label: 'GRUPO V' },
  ],
  fundamental1: [
    { numero: 1, label: '1º ANO' },
    { numero: 2, label: '2º ANO' },
    { numero: 3, label: '3º ANO' },
    { numero: 4, label: '4º ANO' },
    { numero: 5, label: '5º ANO' },
  ],
  fundamental2: [
    { numero: 6, label: '6º ANO' },
    { numero: 7, label: '7º ANO' },
    { numero: 8, label: '8º ANO' },
    { numero: 9, label: '9º ANO' },
  ],
};

const CirculoPage = () => {
  const { casaColor, segmento, turmasVinculadas } = useProfessor();
  const navigate = useNavigate();

  // Cor de destaque (usa cor da casa para F2, cor fixa para outros)
  const accentColor = segmento === 'fundamental2' ? casaColor : '#6366f1';

  // Para Infantil/F1: mostrar turmas vinculadas
  const isSimplificado = segmento === 'infantil' || segmento === 'fundamental1';

  const handleSerieClick = (serie: number) => {
    navigate(`/professor/circulo/serie/${serie}`);
  };

  const handleTurmaClick = (turmaId: string) => {
    navigate(`/professor/circulo/turma/${turmaId}`);
  };

  // Se for Infantil/F1 com turmas vinculadas, mostrar cards de turmas
  if (isSimplificado && turmasVinculadas && turmasVinculadas.length > 0) {
    return (
      <div className="space-y-6 pt-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">Círculo das Inteligências</h1>
        </div>

        {/* Subtitle */}
        <p className="text-white/60 text-sm">SELECIONE A TURMA</p>

        {/* Grid de Turmas */}
        <div className="grid grid-cols-2 gap-4">
          {turmasVinculadas.map((turma) => (
            <button
              key={turma.id}
              onClick={() => handleTurmaClick(turma.id)}
              className="aspect-square rounded-2xl flex flex-col items-center justify-center gap-2 transition-all active:scale-95"
              style={{ 
                backgroundColor: `${accentColor}15`,
                border: `1px solid ${accentColor}30`
              }}
            >
              <span 
                className="text-3xl font-bold"
                style={{ color: accentColor }}
              >
                {turma.serie}º {turma.turma_letra}
              </span>
              <span className="text-white/70 text-xs font-medium px-2 text-center">
                {turma.nome}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Para F2 ou fallback: mostrar séries do segmento
  const series = SERIES_POR_SEGMENTO[segmento || 'fundamental2'] || SERIES_POR_SEGMENTO.fundamental2;

  return (
    <div className="space-y-6 pt-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Círculo das Inteligências</h1>
      </div>

      {/* Subtitle */}
      <p className="text-white/60 text-sm">SELECIONE A SÉRIE</p>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-4">
        {series.map((serie) => (
          <button
            key={serie.numero}
            onClick={() => handleSerieClick(serie.numero)}
            className="aspect-square rounded-2xl flex flex-col items-center justify-center gap-2 transition-all active:scale-95"
            style={{ 
              backgroundColor: `${accentColor}15`,
              border: `1px solid ${accentColor}30`
            }}
          >
            <span 
              className="text-4xl font-bold"
              style={{ color: accentColor }}
            >
              {serie.numero}º
            </span>
            <span className="text-white/70 text-sm font-medium">
              {serie.label.replace(`${serie.numero}º `, '')}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default CirculoPage;
