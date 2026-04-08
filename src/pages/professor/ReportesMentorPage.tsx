import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, MessageCircle, CheckCircle, Clock, Send, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

type StatusReporte = 'aberto' | 'respondido' | 'finalizado';

const statusConfig: Record<StatusReporte, { label: string; color: string; icon: any }> = {
  aberto: { label: 'Aberto', color: '#f59e0b', icon: Clock },
  respondido: { label: 'Respondido', color: '#3b82f6', icon: MessageCircle },
  finalizado: { label: 'Finalizado', color: '#10b981', icon: CheckCircle },
};

const ReportesMentorPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filtro, setFiltro] = useState<StatusReporte | 'todos'>('aberto');
  const [respondendoId, setRespondendoId] = useState<string | null>(null);
  const [resposta, setResposta] = useState('');
  const [salvando, setSalvando] = useState(false);

  const { data: reportes = [], isLoading } = useQuery({
    queryKey: ['reportes-mentor'],
    queryFn: async () => {
      const { data } = await supabase
        .from('reportes_mentor')
        .select('*, aluno:profiles!reportes_mentor_aluno_id_fkey(nome, sobrenome, full_name, serie, turma, avatar_url, casa_id), casa:inteligencias!reportes_mentor_casa_id_fkey(nome, cor_hex)')
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  const filtrados = filtro === 'todos' ? reportes : reportes.filter(r => r.status === filtro);

  const contagem = {
    aberto: reportes.filter(r => r.status === 'aberto').length,
    respondido: reportes.filter(r => r.status === 'respondido').length,
    finalizado: reportes.filter(r => r.status === 'finalizado').length,
  };

  const responder = async (id: string) => {
    if (!resposta.trim() || salvando) return;
    setSalvando(true);
    await supabase.from('reportes_mentor').update({
      resposta_professor: resposta.trim(),
      respondido_por: user?.id,
      respondido_em: new Date().toISOString(),
      status: 'respondido',
    }).eq('id', id);
    setResposta('');
    setRespondendoId(null);
    setSalvando(false);
    queryClient.invalidateQueries({ queryKey: ['reportes-mentor'] });
  };

  const finalizar = async (id: string) => {
    await supabase.from('reportes_mentor').update({
      status: 'finalizado',
      finalizado_em: new Date().toISOString(),
    }).eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['reportes-mentor'] });
  };

  const reabrir = async (id: string) => {
    await supabase.from('reportes_mentor').update({
      status: 'aberto',
      finalizado_em: null,
    }).eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['reportes-mentor'] });
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="h-10 bg-white/5 rounded-xl animate-pulse" />
        {[1, 2, 3].map(i => <div key={i} className="h-32 bg-white/5 rounded-xl animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 -ml-1 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-lg font-semibold text-white">Reportes dos Alunos</h1>
          <p className="text-xs text-white/30">{reportes.length} reportes</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2">
        <button
          onClick={() => setFiltro('todos')}
          className={cn('px-3 py-1.5 rounded-full text-[10px] font-medium border transition-colors',
            filtro === 'todos' ? 'bg-white/10 border-white/20 text-white' : 'border-white/5 text-white/30'
          )}
        >
          Todos ({reportes.length})
        </button>
        {(Object.keys(statusConfig) as StatusReporte[]).map(s => {
          const cfg = statusConfig[s];
          return (
            <button
              key={s}
              onClick={() => setFiltro(s)}
              className={cn('px-3 py-1.5 rounded-full text-[10px] font-medium border transition-colors',
                filtro === s ? 'bg-white/10 border-white/20 text-white' : 'border-white/5 text-white/30'
              )}
              style={filtro === s ? { borderColor: `${cfg.color}50`, color: cfg.color } : undefined}
            >
              {cfg.label} ({contagem[s]})
            </button>
          );
        })}
      </div>

      {/* Cards */}
      {filtrados.length === 0 && (
        <div className="text-center py-12">
          <p className="text-white/30 text-sm">Nenhum reporte {filtro !== 'todos' ? statusConfig[filtro as StatusReporte].label.toLowerCase() : ''}</p>
        </div>
      )}

      <div className="space-y-3">
        {filtrados.map(r => {
          const aluno = r.aluno as any;
          const casaInfo = r.casa as any;
          const cfg = statusConfig[r.status as StatusReporte];
          const Icon = cfg.icon;
          const isRespondendo = respondendoId === r.id;

          return (
            <div
              key={r.id}
              className="rounded-2xl border bg-[#252547] overflow-hidden"
              style={{ borderColor: `${cfg.color}20` }}
            >
              {/* Header do card */}
              <div className="flex items-center gap-3 p-3.5 pb-2">
                <div className="w-9 h-9 rounded-full overflow-hidden border-2 shrink-0" style={{ borderColor: casaInfo?.cor_hex || '#444' }}>
                  {aluno?.avatar_url ? (
                    <img src={aluno.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="flex items-center justify-center w-full h-full text-sm text-white/40" style={{ backgroundColor: `${casaInfo?.cor_hex || '#444'}20` }}>
                      {(aluno?.nome || '?').charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{aluno?.full_name}</p>
                  <p className="text-[10px] text-white/30">{aluno?.serie} - Turma {aluno?.turma} · {casaInfo?.nome}</p>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full" style={{ backgroundColor: `${cfg.color}15` }}>
                  <Icon className="w-3 h-3" style={{ color: cfg.color }} />
                  <span className="text-[9px] font-medium" style={{ color: cfg.color }}>{cfg.label}</span>
                </div>
              </div>

              {/* Conteúdo */}
              <div className="px-3.5 pb-2">
                <p className="text-sm text-white/70 leading-relaxed">"{r.texto}"</p>
                <p className="text-[9px] text-white/20 mt-1">
                  {new Date(r.created_at).toLocaleDateString('pt-BR')} as {new Date(r.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>

              {/* Resposta existente */}
              {r.resposta_professor && (
                <div className="mx-3.5 mb-2 p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/15">
                  <p className="text-[10px] text-blue-400/60 mb-1">Resposta do mentor</p>
                  <p className="text-sm text-white/60">{r.resposta_professor}</p>
                </div>
              )}

              {/* Campo de resposta */}
              {isRespondendo && (
                <div className="mx-3.5 mb-2">
                  <textarea
                    value={resposta}
                    onChange={e => setResposta(e.target.value)}
                    placeholder="Escreva sua resposta..."
                    rows={2}
                    autoFocus
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white placeholder:text-white/20 resize-none focus:outline-none focus:border-white/20"
                  />
                </div>
              )}

              {/* Ações */}
              <div className="flex items-center gap-2 px-3.5 pb-3">
                {r.status === 'aberto' && !isRespondendo && (
                  <button
                    onClick={() => setRespondendoId(r.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 transition-colors"
                  >
                    <MessageCircle className="w-3 h-3" /> Responder
                  </button>
                )}
                {isRespondendo && (
                  <>
                    <button
                      onClick={() => responder(r.id)}
                      disabled={!resposta.trim() || salvando}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 transition-colors disabled:opacity-30"
                    >
                      <Send className="w-3 h-3" /> {salvando ? 'Enviando...' : 'Enviar'}
                    </button>
                    <button
                      onClick={() => { setRespondendoId(null); setResposta(''); }}
                      className="p-1.5 rounded-lg text-white/30 hover:text-white/50 hover:bg-white/5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
                {(r.status === 'aberto' || r.status === 'respondido') && (
                  <button
                    onClick={() => finalizar(r.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 transition-colors ml-auto"
                  >
                    <CheckCircle className="w-3 h-3" /> Finalizar
                  </button>
                )}
                {r.status === 'finalizado' && (
                  <button
                    onClick={() => reabrir(r.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 transition-colors ml-auto"
                  >
                    <Clock className="w-3 h-3" /> Reabrir
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ReportesMentorPage;
