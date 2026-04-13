import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Target, Brain, Ear, PenLine, Check, Flame, Loader2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useStudent } from '@/contexts/StudentContext';
import { toast } from 'sonner';
import { agoraBrasil } from '@/utils/timezone';

interface DesafioData {
  casa_codigo: string;
  numero: number;
  tipo: 'observacao' | 'acao' | 'reflexao' | 'escuta' | 'registro';
  texto_desafio: string;
  texto_para_escrever: string;
  habilidades: string[];
}

interface DesafioDiarioCardProps {
  desafio: DesafioData | null;
  saudacao: string;
}

const TIPO_CONFIG: Record<string, { label: string; icon: typeof Eye; cor: string }> = {
  observacao: { label: 'Observação', icon: Eye, cor: '#3B82F6' },
  acao: { label: 'Ação', icon: Target, cor: '#22C55E' },
  reflexao: { label: 'Reflexão', icon: Brain, cor: '#8B5CF6' },
  escuta: { label: 'Escuta', icon: Ear, cor: '#F59E0B' },
  registro: { label: 'Registro', icon: PenLine, cor: '#F97316' },
};

const DesafioDiarioCard = ({ desafio, saudacao }: DesafioDiarioCardProps) => {
  const { user } = useAuth();
  const { profile } = useStudent();
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [jaFez, setJaFez] = useState(false);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [streak, setStreak] = useState(0);
  const [quantosFizeram, setQuantosFizeram] = useState(0);

  const getDataDesafio = () => {
    const agora = agoraBrasil();
    if (agora.getHours() < 6) {
      agora.setDate(agora.getDate() - 1);
    }
    return agora.toLocaleDateString('en-CA');
  };

  const dataDesafio = getDataDesafio();

  useEffect(() => {
    if (!user?.id || !desafio || !profile?.institution_id) return;

    const verificar = async () => {
      const { data: resposta } = await supabase
        .from('desafio_diario_respostas' as any)
        .select('id')
        .eq('aluno_id', user.id)
        .eq('data', dataDesafio)
        .maybeSingle();

      if (resposta) setJaFez(true);

      const { count } = await supabase
        .from('desafio_diario_respostas' as any)
        .select('id', { count: 'exact', head: true })
        .eq('data', dataDesafio)
        .eq('institution_id', profile.institution_id);

      setQuantosFizeram(count || 0);

      const { data: respostas } = await supabase
        .from('desafio_diario_respostas' as any)
        .select('data')
        .eq('aluno_id', user.id)
        .order('data', { ascending: false })
        .limit(30);

      if (respostas && respostas.length > 0) {
        let consecutivos = 0;
        const hoje = new Date(dataDesafio);
        for (let i = 0; i < 30; i++) {
          const dia = new Date(hoje);
          dia.setDate(dia.getDate() - i);
          const diaStr = dia.toLocaleDateString('en-CA');
          if (respostas.some((r: any) => r.data === diaStr)) {
            consecutivos++;
          } else {
            break;
          }
        }
        setStreak(consecutivos);
      }
    };

    verificar();
  }, [user?.id, desafio, dataDesafio, profile?.institution_id]);

  const enviar = async () => {
    if (!user?.id || !desafio || !texto.trim() || enviando || !profile?.institution_id) return;
    setEnviando(true);

    const { error } = await supabase
      .from('desafio_diario_respostas' as any)
      .insert({
        aluno_id: user.id,
        desafio_casa_codigo: desafio.casa_codigo,
        desafio_numero: desafio.numero,
        desafio_tipo: desafio.tipo,
        habilidades: desafio.habilidades,
        texto: texto.trim(),
        data: dataDesafio,
        institution_id: profile.institution_id,
      });

    if (!error) {
      setJaFez(true);
      setMostrarFormulario(false);
      setStreak(s => s + 1);
      setQuantosFizeram(q => q + 1);
      setTexto('');
      toast.success('Desafio registrado!');
    } else {
      toast.error('Erro ao registrar. Tente novamente.');
    }
    setEnviando(false);
  };

  if (!desafio) return null;

  const config = TIPO_CONFIG[desafio.tipo] || TIPO_CONFIG.observacao;
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden border"
      style={{ borderColor: `${config.cor}25`, background: `linear-gradient(135deg, ${config.cor}06, #252547)` }}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center gap-2 mb-1">
          <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${config.cor}20` }}>
            <Icon className="w-4 h-4" style={{ color: config.cor }} />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: config.cor }}>
            Desafio do dia · {config.label}
          </span>
          {streak > 1 && (
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-orange-500/15 ml-auto">
              <Flame className="w-3 h-3 text-orange-400" />
              <span className="text-[9px] text-orange-400 font-bold">{streak}</span>
            </div>
          )}
        </div>
        <p className="text-[11px] text-white/30 italic">{saudacao}</p>
      </div>

      {/* Texto do desafio */}
      <div className="px-4 py-3">
        <p className="text-white/75 text-sm leading-relaxed">
          {desafio.texto_desafio}
        </p>
      </div>

      {/* Se já fez */}
      {jaFez ? (
        <div className="px-4 pb-4">
          <div className="flex items-center gap-2 p-3 rounded-xl bg-green-500/10 border border-green-500/20">
            <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-green-400 text-sm font-medium">Desafio registrado!</p>
              <p className="text-white/30 text-[10px] mt-0.5">
                {quantosFizeram > 1 ? `${quantosFizeram} alunos já fizeram hoje` : 'Você foi o primeiro hoje!'}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="px-4 pb-4">
          <AnimatePresence mode="wait">
            {!mostrarFormulario ? (
              /* Botão "Eu fiz" */
              <motion.button
                key="botao"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, height: 0 }}
                onClick={() => setMostrarFormulario(true)}
                className="w-full py-2.5 rounded-xl text-sm font-medium transition-colors"
                style={{ backgroundColor: `${config.cor}15`, color: config.cor, border: `1px solid ${config.cor}30` }}
              >
                Eu fiz!
              </motion.button>
            ) : (
              /* Formulário de texto */
              <motion.div
                key="formulario"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                <p className="text-xs text-white/40 italic">
                  {desafio.texto_para_escrever}
                </p>
                <Textarea
                  value={texto}
                  onChange={e => setTexto(e.target.value)}
                  placeholder="Escreva o que percebeu..."
                  rows={3}
                  maxLength={500}
                  disabled={enviando}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/20 resize-none text-sm"
                  autoFocus
                />
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-white/20">{texto.length}/500</span>
                  {quantosFizeram > 0 && (
                    <span className="text-[10px] text-white/20">{quantosFizeram} já fizeram hoje</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setMostrarFormulario(false)}
                    className="flex-1 py-2.5 rounded-xl text-sm text-white/40 bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={enviar}
                    disabled={!texto.trim() || enviando}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white transition-colors disabled:opacity-30"
                    style={{ backgroundColor: config.cor }}
                  >
                    {enviando ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Enviando...
                      </span>
                    ) : (
                      'Registrar'
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
};

export default DesafioDiarioCard;
