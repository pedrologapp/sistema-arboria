import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useProfessor } from '@/contexts/ProfessorContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Sparkles, CheckCircle, AlertTriangle, AlertCircle, X, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type Quadrante = 'surpreendeu' | 'foi_bem' | 'teve_dificuldades' | 'atencao';

interface AlunoSimples {
  id: string;
  nome: string;
  nomeCompleto: string;
  avatar_url: string | null;
}

const QUADRANTES: { key: Quadrante; label: string; emoji: string; icon: React.ReactNode; bgColor: string; borderColor: string; textColor: string }[] = [
  { key: 'surpreendeu', label: 'Surpreendeu', emoji: '✨', icon: <Sparkles size={16} />, bgColor: 'rgba(255, 193, 7, 0.15)', borderColor: '#FFC107', textColor: '#FFC107' },
  { key: 'foi_bem', label: 'Foi bem', emoji: '✅', icon: <CheckCircle size={16} />, bgColor: 'rgba(76, 175, 80, 0.15)', borderColor: '#4CAF50', textColor: '#4CAF50' },
  { key: 'teve_dificuldades', label: 'Teve dificuldades', emoji: '🔶', icon: <AlertTriangle size={16} />, bgColor: 'rgba(255, 152, 0, 0.15)', borderColor: '#FF9800', textColor: '#FF9800' },
  { key: 'atencao', label: 'Atenção', emoji: '🔴', icon: <AlertCircle size={16} />, bgColor: 'rgba(244, 67, 54, 0.15)', borderColor: '#F44336', textColor: '#F44336' },
];

const MapaDesenvolvimentoPage = () => {
  const { profile, faseAtual, turmasVinculadas } = useProfessor();
  const queryClient = useQueryClient();

  const [selectedTurmaId, setSelectedTurmaId] = useState<string>('');
  const [selectedSemana, setSelectedSemana] = useState<number>(faseAtual?.semana_atual || 1);
  const [alocacoes, setAlocacoes] = useState<Record<string, Quadrante>>({});
  const [drawerAluno, setDrawerAluno] = useState<AlunoSimples | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Set default turma
  useEffect(() => {
    if (turmasVinculadas && turmasVinculadas.length > 0 && !selectedTurmaId) {
      setSelectedTurmaId(turmasVinculadas[0].id);
    }
  }, [turmasVinculadas, selectedTurmaId]);

  const semanaAtual = faseAtual?.semana_atual || 1;
  const isSemanaPassada = selectedSemana < semanaAtual;
  const isSemanaFutura = selectedSemana > semanaAtual;
  const canEdit = !isSemanaFutura && (!isSemanaPassada || (isSemanaPassada && selectedSemana === semanaAtual - 1 && isEditing));
  

  // Fetch alunos da turma
  const { data: alunos = [] } = useQuery({
    queryKey: ['mapa-alunos', selectedTurmaId],
    queryFn: async () => {
      if (!selectedTurmaId) return [];
      const { data, error } = await supabase
        .from('aluno_turma')
        .select('aluno_id, profiles!aluno_turma_aluno_id_fkey(id, full_name, nome, sobrenome, avatar_url)')
        .eq('turma_id', selectedTurmaId)
        .eq('ativo', true);
      if (error) throw error;
      return (data || []).map(at => {
        const p = at.profiles as unknown as { id: string; full_name: string | null; nome: string | null; sobrenome: string | null; avatar_url: string | null };
        const primeiro = p.nome || p.full_name?.split(' ')[0] || 'Aluno';
        const sobrenome = p.sobrenome || (p.full_name ? p.full_name.split(' ').slice(1).join(' ') : '');
        const inicialSobrenome = sobrenome ? ` ${sobrenome.charAt(0).toUpperCase()}.` : '';
        return {
          id: p.id,
          nome: `${primeiro}${inicialSobrenome}`,
          nomeCompleto: p.full_name || `${primeiro} ${sobrenome}`.trim(),
          avatar_url: p.avatar_url
        } as AlunoSimples;
      }).sort((a, b) => a.nome.localeCompare(b.nome));
    },
    enabled: !!selectedTurmaId
  });

  // Fetch alocações existentes
  const { data: savedAlocacoes } = useQuery({
    queryKey: ['mapa-alocacoes', faseAtual?.id, selectedSemana, selectedTurmaId],
    queryFn: async () => {
      if (!faseAtual?.id || !selectedTurmaId) return {};
      const { data, error } = await supabase
        .from('mapa_desenvolvimento')
        .select('aluno_id, quadrante')
        .eq('fase_id', faseAtual.id)
        .eq('semana_numero', selectedSemana)
        .eq('turma_id', selectedTurmaId);
      if (error) throw error;
      const map: Record<string, Quadrante> = {};
      (data || []).forEach(r => { map[r.aluno_id] = r.quadrante as Quadrante; });
      return map;
    },
    enabled: !!faseAtual?.id && !!selectedTurmaId
  });

  // Update local state when saved data changes
  useEffect(() => {
    if (savedAlocacoes) {
      setAlocacoes(savedAlocacoes);
    }
  }, [savedAlocacoes]);

  const hasSavedData = savedAlocacoes && Object.keys(savedAlocacoes).length > 0;

  const alunosNaoAlocados = useMemo(() => 
    alunos.filter(a => !alocacoes[a.id]),
    [alunos, alocacoes]
  );

  const alunosPorQuadrante = useMemo(() => {
    const result: Record<Quadrante, AlunoSimples[]> = {
      surpreendeu: [], foi_bem: [], teve_dificuldades: [], atencao: []
    };
    alunos.forEach(a => {
      const q = alocacoes[a.id];
      if (q) result[q].push(a);
    });
    return result;
  }, [alunos, alocacoes]);

  const todosAlocados = alunos.length > 0 && alunosNaoAlocados.length === 0;

  const handleAlocar = useCallback((alunoId: string, quadrante: Quadrante) => {
    setAlocacoes(prev => ({ ...prev, [alunoId]: quadrante }));
    setDrawerAluno(null);
  }, []);

  const handleRemover = useCallback((alunoId: string) => {
    setAlocacoes(prev => {
      const next = { ...prev };
      delete next[alunoId];
      return next;
    });
    setDrawerAluno(null);
  }, []);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!faseAtual?.id || !selectedTurmaId || !profile?.id || !profile?.institution_id) {
        throw new Error('Dados incompletos');
      }

      const records = Object.entries(alocacoes).map(([aluno_id, quadrante]) => ({
        aluno_id,
        turma_id: selectedTurmaId,
        professor_id: profile.id,
        fase_id: faseAtual.id,
        semana_numero: selectedSemana,
        institution_id: profile.institution_id!,
        quadrante
      }));

      const { error } = await supabase
        .from('mapa_desenvolvimento')
        .upsert(records, { onConflict: 'aluno_id,fase_id,semana_numero' });

      if (error) throw error;

      // Webhook fire-and-forget
      const webhookUrl = import.meta.env.VITE_WEBHOOK_MAPA_URL;
      if (webhookUrl) {
        const turmaInfo = turmasVinculadas?.find(t => t.id === selectedTurmaId);
        const resumo = { total_alunos: alunos.length, surpreendeu: 0, foi_bem: 0, teve_dificuldades: 0, atencao: 0 };
        const alocacoesPayload = Object.entries(alocacoes).map(([aluno_id, quadrante]) => {
          resumo[quadrante]++;
          const aluno = alunos.find(a => a.id === aluno_id);
          return { aluno_id, aluno_nome: aluno?.nome || '', quadrante };
        });

        fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            evento: 'mapa_desenvolvimento_salvo',
            timestamp: new Date().toISOString(),
            professor: { id: profile.id, nome: profile.full_name || profile.nome },
            turma: { id: selectedTurmaId, nome: turmaInfo?.nome || '' },
            fase: { id: faseAtual.id, numero: faseAtual.numero_fase, inteligencia: faseAtual.inteligencia?.nome || '' },
            semana_numero: selectedSemana,
            alocacoes: alocacoesPayload,
            resumo
          })
        }).catch(err => console.error('Webhook mapa erro:', err));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mapa-alocacoes'] });
      setIsEditing(false);
      toast({ title: `Semana ${selectedSemana} salva com sucesso! ✅` });
    },
    onError: (err) => {
      toast({ title: 'Erro ao salvar', description: String(err), variant: 'destructive' });
    }
  });

  const getInitials = (nome: string) => nome.slice(0, 2).toUpperCase();

  const AlunoChip = ({ aluno, onClick, small }: { aluno: AlunoSimples; onClick: () => void; small?: boolean }) => {
    const longPressTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const [showFullName, setShowFullName] = React.useState(false);

    const handleTouchStart = () => {
      longPressTimer.current = setTimeout(() => {
        setShowFullName(true);
        setTimeout(() => setShowFullName(false), 2000);
      }, 500);
    };
    const handleTouchEnd = () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    };

    return (
      <div className="relative">
        <motion.button
          layout
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.2 }}
          onClick={onClick}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          title={aluno.nomeCompleto}
          className={`flex items-center gap-1.5 rounded-full bg-white/10 border border-white/10 
            hover:bg-white/15 active:scale-95 transition-all ${small ? 'px-2 py-1' : 'px-3 py-1.5'}`}
        >
          <Avatar className={small ? 'h-5 w-5' : 'h-6 w-6'}>
            <AvatarImage src={aluno.avatar_url || undefined} />
            <AvatarFallback className="text-[8px] bg-white/20 text-white">{getInitials(aluno.nome)}</AvatarFallback>
          </Avatar>
          <span className={`text-white font-medium ${small ? 'text-[10px]' : 'text-xs'}`}>{aluno.nome}</span>
        </motion.button>
        <AnimatePresence>
          {showFullName && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded bg-black/90 text-white text-[10px] whitespace-nowrap z-50 pointer-events-none"
            >
              {aluno.nomeCompleto}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="p-4 pb-24 space-y-4">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-xl font-bold text-white">Mapa de Desenvolvimento</h1>
        {faseAtual && (
          <p className="text-sm text-white/50 mt-1">
            Fase {faseAtual.numero_fase} — <span style={{ color: faseAtual.inteligencia?.cor_hex || '#fff' }}>{faseAtual.inteligencia?.nome}</span> | Semana {selectedSemana}
          </p>
        )}
      </div>

      {/* Seletor de turma */}
      {turmasVinculadas && turmasVinculadas.length > 1 && (
        <Select value={selectedTurmaId} onValueChange={setSelectedTurmaId}>
          <SelectTrigger className="bg-white/5 border-white/10 text-white">
            <SelectValue placeholder="Selecione a turma" />
          </SelectTrigger>
          <SelectContent>
            {turmasVinculadas.map(t => (
              <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Seletor de semana */}
      <div className="flex gap-2 justify-center">
        {[1, 2, 3, 4].map(s => (
          <button
            key={s}
            disabled={s > semanaAtual}
            onClick={() => { setSelectedSemana(s); setIsEditing(false); }}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all
              ${s === selectedSemana 
                ? 'bg-primary text-primary-foreground shadow-lg' 
                : s > semanaAtual 
                  ? 'bg-white/5 text-white/20 cursor-not-allowed' 
                  : 'bg-white/10 text-white/60 hover:bg-white/15'}`}
          >
            S{s}
          </button>
        ))}
      </div>

      {/* Banner visualização */}
      {isSemanaPassada && !isEditing && hasSavedData && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <Info size={16} className="text-blue-400 flex-shrink-0" />
          <span className="text-xs text-blue-300">
            📋 Visualizando registro da Semana {selectedSemana}
          </span>
          {selectedSemana === semanaAtual - 1 && (
            <button onClick={() => setIsEditing(true)} className="ml-auto text-xs text-blue-400 underline">
              Editar
            </button>
          )}
        </div>
      )}

      {/* Grid 2x2 */}
      <div className="grid grid-cols-2 gap-3">
        {QUADRANTES.map(q => {
          const alunosQuadrante = alunosPorQuadrante[q.key];
          return (
            <div
              key={q.key}
              className="rounded-xl p-3 min-h-[120px] border"
              style={{ backgroundColor: q.bgColor, borderColor: q.borderColor + '40' }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5" style={{ color: q.textColor }}>
                  {q.icon}
                  <span className="text-xs font-semibold">{q.label}</span>
                </div>
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-black/20" style={{ color: q.textColor }}>
                  {alunosQuadrante.length}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <AnimatePresence>
                  {alunosQuadrante.map(aluno => (
                    <AlunoChip 
                      key={aluno.id} 
                      aluno={aluno} 
                      small 
                      onClick={() => canEdit ? setDrawerAluno(aluno) : undefined} 
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          );
        })}
      </div>

      {/* Alunos não alocados */}
      {canEdit && (
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-white/50 uppercase tracking-widest">
            Alunos não posicionados ({alunosNaoAlocados.length})
          </h3>
          {alunosNaoAlocados.length === 0 ? (
            <p className="text-sm text-green-400 text-center py-4">✅ Todos os alunos foram posicionados</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              <AnimatePresence>
                {alunosNaoAlocados.map(aluno => (
                  <AlunoChip key={aluno.id} aluno={aluno} onClick={() => setDrawerAluno(aluno)} />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

      {/* Drawer de alocação */}
      <Drawer open={!!drawerAluno && canEdit} onOpenChange={(open) => { if (!open) setDrawerAluno(null); }}>
        <DrawerContent className="bg-zinc-900 border-white/10">
          <DrawerHeader className="text-center">
            <DrawerTitle className="text-white flex items-center justify-center gap-2">
              {drawerAluno && (
                <>
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={drawerAluno.avatar_url || undefined} />
                    <AvatarFallback className="bg-white/20 text-white text-xs">{getInitials(drawerAluno.nome)}</AvatarFallback>
                  </Avatar>
                  {drawerAluno.nome}
                </>
              )}
            </DrawerTitle>
          </DrawerHeader>
          <div className="p-4 space-y-3 pb-8">
            {QUADRANTES.map(q => (
              <button
                key={q.key}
                onClick={() => drawerAluno && handleAlocar(drawerAluno.id, q.key)}
                className="w-full flex items-center gap-3 p-4 rounded-xl border transition-all active:scale-[0.98]"
                style={{ 
                  backgroundColor: q.bgColor, 
                  borderColor: alocacoes[drawerAluno?.id || ''] === q.key ? q.borderColor : q.borderColor + '30'
                }}
              >
                <span className="text-xl">{q.emoji}</span>
                <span className="font-semibold" style={{ color: q.textColor }}>{q.label}</span>
                {alocacoes[drawerAluno?.id || ''] === q.key && (
                  <span className="ml-auto text-xs" style={{ color: q.textColor }}>atual</span>
                )}
              </button>
            ))}
            {drawerAluno && alocacoes[drawerAluno.id] && (
              <button
                onClick={() => drawerAluno && handleRemover(drawerAluno.id)}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-white/10 text-white/60 hover:text-white hover:bg-white/5 transition-all"
              >
                <X size={16} />
                <span className="text-sm">Remover posição</span>
              </button>
            )}
          </div>
        </DrawerContent>
      </Drawer>

      {/* Botão Salvar */}
      {canEdit && (
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={!todosAlocados || saveMutation.isPending}
          className="w-full py-6 text-base font-semibold rounded-xl shadow-lg"
          size="lg"
        >
          {saveMutation.isPending 
            ? 'Salvando...' 
            : hasSavedData 
              ? `Atualizar Semana ${selectedSemana}` 
              : `Salvar Semana ${selectedSemana}`}
        </Button>
      )}
    </div>
  );
};

export default MapaDesenvolvimentoPage;
