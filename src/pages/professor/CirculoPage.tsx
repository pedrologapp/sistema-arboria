import { useNavigate } from 'react-router-dom';
import { useProfessor } from '@/contexts/ProfessorContext';

const SERIES = [
  { numero: 6, label: '6º ANO' },
  { numero: 7, label: '7º ANO' },
  { numero: 8, label: '8º ANO' },
  { numero: 9, label: '9º ANO' },
];

const CirculoPage = () => {
  const { casaColor } = useProfessor();
  const navigate = useNavigate();

  const handleSerieClick = (serie: number) => {
    navigate(`/professor/circulo/serie/${serie}`);
  };

  return (
    <div className="space-y-6 pt-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Círculo das Inteligências</h1>
      </div>

      {/* Subtitle */}
      <p className="text-white/60 text-sm">SELECIONE A SÉRIE</p>

      {/* Grid 2x2 */}
      <div className="grid grid-cols-2 gap-4">
        {SERIES.map((serie) => (
          <button
            key={serie.numero}
            onClick={() => handleSerieClick(serie.numero)}
            className="aspect-square rounded-2xl flex flex-col items-center justify-center gap-2 transition-all active:scale-95"
            style={{ 
              backgroundColor: `${casaColor}15`,
              border: `1px solid ${casaColor}30`
            }}
          >
            <span 
              className="text-4xl font-bold"
              style={{ color: casaColor }}
            >
              {serie.numero}º
            </span>
            <span className="text-white/70 text-sm font-medium">ANO</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default CirculoPage;
