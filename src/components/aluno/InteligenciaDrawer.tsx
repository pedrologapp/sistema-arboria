import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import { CasaBrasao } from '@/components/CasaBrasao';
import { supabase } from '@/integrations/supabase/client';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface InteligenciaDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inteligencia: {
    id: number;
    nome: string;
    codigo: string;
    emoji: string;
    cor: string;
    score: number;
    brasaoUrl?: string | null;
  } | null;
  alunoId: string;
  ehMinhaCasa: boolean;
}

interface HistoricoItem {
  fase_numero: number;
  score_apos_formula: number;
}

interface EvidenciaItem {
  tipo: string;
  pontos: number;
  created_at: string;
}

const InteligenciaDrawer = ({
  open,
  onOpenChange,
  inteligencia,
  alunoId,
  ehMinhaCasa,
}: InteligenciaDrawerProps) => {
  const [historico, setHistorico] = useState<HistoricoItem[]>([]);
  const [evidencias, setEvidencias] = useState<EvidenciaItem[]>([]);
  const [totalEvidencias, setTotalEvidencias] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open && inteligencia && alunoId) {
      fetchData();
    }
  }, [open, inteligencia, alunoId]);

  const fetchData = async () => {
    if (!inteligencia) return;
    
    setIsLoading(true);
    try {
      // Fetch historical evolution
      const { data: historicoData } = await supabase
        .from('inteligencia_historico')
        .select('fase_numero, score_apos_formula')
        .eq('aluno_id', alunoId)
        .eq('inteligencia_id', inteligencia.id)
        .order('fase_numero');

      // Add initial point (Fase 0 = 35%)
      const historicoComInicio = [
        { fase_numero: 0, score_apos_formula: 35 },
        ...(historicoData || []),
      ];

      // If no history yet, add current score as "current" point
      if (!historicoData || historicoData.length === 0) {
        historicoComInicio.push({
          fase_numero: 1,
          score_apos_formula: inteligencia.score,
        });
      }

      setHistorico(historicoComInicio);

      // Fetch recent evidences
      const { data: evidenciasData, count } = await supabase
        .from('inteligencia_evidencias')
        .select('tipo, pontos, created_at', { count: 'exact' })
        .eq('aluno_id', alunoId)
        .eq('inteligencia_id', inteligencia.id)
        .order('created_at', { ascending: false })
        .limit(5);

      setEvidencias(evidenciasData || []);
      setTotalEvidencias(count || 0);
    } catch (error) {
      console.error('Error fetching intelligence data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getTipoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      'missao_propria': 'Missão da casa',
      'missao_cross': 'Missão cross-IM',
      'obs_propria': 'Observação',
      'obs_cross': 'Observação cross-IM',
    };
    return labels[tipo] || tipo;
  };

  // Map codigo to brasao URL
  const brasaoMap: Record<string, string> = {
    'LIN': '/brasoes/linguistica.png',
    'LOG': '/brasoes/logico_matematica.png',
    'ESP': '/brasoes/espacial.png',
    'MUS': '/brasoes/musical.png',
    'COR': '/brasoes/corporal_cinestesica.png',
    'NAT': '/brasoes/naturalista.png',
    'INT': '/brasoes/interpessoal.png',
    'INTRA': '/brasoes/intrapessoal.png',
  };

  if (!inteligencia) return null;

  const brasaoUrl = inteligencia.brasaoUrl || brasaoMap[inteligencia.codigo] || null;

  // Chart data
  const chartData = historico.map((h) => ({
    fase: `F${h.fase_numero}`,
    score: Math.round(h.score_apos_formula),
  }));

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="bg-[#1a1a2e] border-white/10 max-h-[85vh]">
        <DrawerHeader className="border-b border-white/10 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CasaBrasao
                brasaoUrl={brasaoUrl}
                emoji={inteligencia.emoji}
                nome={inteligencia.nome}
                size="medium"
              />
              <div>
                <DrawerTitle className="text-white flex items-center gap-2">
                  {inteligencia.nome}
                  {ehMinhaCasa && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/60">
                      ⭐ Minha Casa
                    </span>
                  )}
                </DrawerTitle>
                <DrawerDescription className="text-white/60">
                  Detalhes da inteligência
                </DrawerDescription>
              </div>
            </div>
            <div 
              className="text-3xl font-bold"
              style={{ color: inteligencia.cor }}
            >
              {Math.round(inteligencia.score)}%
            </div>
          </div>
        </DrawerHeader>

        <div className="p-4 space-y-6 overflow-y-auto">
          {/* Evolution Chart */}
          <div>
            <h3 className="text-sm font-semibold text-white/60 mb-3 flex items-center gap-2">
              📈 EVOLUÇÃO POR FASE
            </h3>
            
            {isLoading ? (
              <div className="h-40 bg-white/5 rounded-lg animate-pulse" />
            ) : (
              <div className="h-40 bg-white/5 rounded-lg p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <XAxis 
                      dataKey="fase" 
                      stroke="#ffffff40"
                      tick={{ fill: '#ffffff60', fontSize: 12 }}
                      axisLine={{ stroke: '#ffffff20' }}
                    />
                    <YAxis 
                      domain={[0, 100]}
                      stroke="#ffffff40"
                      tick={{ fill: '#ffffff60', fontSize: 12 }}
                      axisLine={{ stroke: '#ffffff20' }}
                      ticks={[0, 25, 50, 75, 100]}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1a1a2e',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        color: 'white',
                      }}
                      formatter={(value: number) => [`${value}%`, 'Score']}
                    />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke={inteligencia.cor}
                      strokeWidth={3}
                      dot={{ fill: inteligencia.cor, strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, fill: inteligencia.cor }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Recent Evidence */}
          <div>
            <h3 className="text-sm font-semibold text-white/60 mb-3 flex items-center gap-2">
              📋 ÚLTIMAS EVIDÊNCIAS
            </h3>
            
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-white/5 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : evidencias.length > 0 ? (
              <div className="space-y-2">
                {evidencias.map((ev, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                        style={{ backgroundColor: `${inteligencia.cor}20` }}
                      >
                        <span style={{ color: inteligencia.cor }}>
                          {ev.pontos > 0 ? '+' : ''}{ev.pontos.toFixed(0)}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm text-white/80">{getTipoLabel(ev.tipo)}</p>
                        <p className="text-xs text-white/40">
                          {format(new Date(ev.created_at), "dd 'de' MMM", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
                
                {totalEvidencias > 5 && (
                  <p className="text-xs text-white/40 text-center pt-2">
                    Total de {totalEvidencias} evidências
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-6 text-white/40">
                <p>Nenhuma evidência registrada ainda</p>
                <p className="text-xs mt-1">Complete missões e participe das aulas!</p>
              </div>
            )}
          </div>

          {/* Info Text */}
          <div className="text-xs text-white/40 text-center pb-4">
            <p>
              O score evolui a cada fase com base nas suas missões e 
              observações dos professores.
            </p>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default InteligenciaDrawer;
