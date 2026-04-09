import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Target,
  Eye,
  Heart,
  MessageSquare,
  Award,
  Shield,
  CheckCircle,
  RefreshCw,
  Star,
  Filter,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { CasaBrasao } from '@/components/CasaBrasao';
import { cn } from '@/lib/utils';

interface EventoRegistro {
  id: string;
  tipo: 'missao_entregue' | 'missao_aprovada' | 'missao_refazer' | 'observacao' | 'checkin' | 'relato' | 'cargo' | 'evidencia';
  data: Date;
  titulo: string;
  descricao: string;
  cor: string;
  icon: any;
  meta?: Record<string, any>;
}

const tipoLabels: Record<string, string> = {
  missao_entregue: 'Missao',
  missao_aprovada: 'Aprovacao',
  missao_refazer: 'Refazer',
  observacao: 'Observacao',
  checkin: 'Emocional',
  relato: 'Relato',
  cargo: 'Cargo',
  evidencia: 'Evidencia',
};

const tipoCores: Record<string, string> = {
  missao_entregue: '#3b82f6',
  missao_aprovada: '#10b981',
  missao_refazer: '#f59e0b',
  observacao: '#8b5cf6',
  checkin: '#ec4899',
  relato: '#06b6d4',
  cargo: '#f97316',
  evidencia: '#22c55e',
};

const tipoIcons: Record<string, any> = {
  missao_entregue: Target,
  missao_aprovada: CheckCircle,
  missao_refazer: RefreshCw,
  observacao: Eye,
  checkin: Heart,
  relato: MessageSquare,
  cargo: Shield,
  evidencia: Award,
};

const RegistroVivoPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [filtroTipo, setFiltroTipo] = useState<string | null>(null);

  // Dados do aluno
  const { data: aluno } = useQuery({
    queryKey: ['registro-vivo-aluno', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, nome, sobrenome, full_name, serie, turma, casa_id, avatar_url')
        .eq('id', id)
        .single();
      return data;
    },
    enabled: !!id,
  });

  const { data: casa } = useQuery({
    queryKey: ['registro-vivo-casa', aluno?.casa_id],
    queryFn: async () => {
      if (!aluno?.casa_id) return null;
      const { data } = await supabase
        .from('inteligencias')
        .select('id, nome, cor_hex, emoji, brasao_url')
        .eq('id', aluno.casa_id)
        .single();
      return data;
    },
    enabled: !!aluno?.casa_id,
  });

  const { data: ranking } = useQuery({
    queryKey: ['registro-vivo-ranking', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('ranking_alunos_por_casa')
        .select('total_pontos, posicao_na_casa, missoes_completadas')
        .eq('aluno_id', id)
        .maybeSingle();
      return data;
    },
    enabled: !!id,
  });

  // Inteligências do aluno
  const { data: inteligencias = [] } = useQuery({
    queryKey: ['registro-vivo-inteligencias', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('perfil_inteligencias_aluno')
        .select('*')
        .eq('aluno_id', id)
        .order('score_atual', { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  // Entregas (missões)
  const { data: entregas = [] } = useQuery({
    queryKey: ['registro-vivo-entregas', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('entregas')
        .select('id, status, data_entrega, nota, pontos_concedidos, feedback_professor, numero_tentativa, missao_id, missoes(titulo)')
        .eq('aluno_id', id)
        .order('data_entrega', { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  // Observações
  const { data: observacoes = [] } = useQuery({
    queryKey: ['registro-vivo-observacoes', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('observacoes')
        .select('id, observacao_texto, data_observacao, intensidade, professor_id, profiles!observacoes_professor_id_fkey(nome)')
        .eq('aluno_id', id)
        .order('data_observacao', { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  // Check-ins emocionais
  const { data: checkins = [] } = useQuery({
    queryKey: ['registro-vivo-checkins', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('checkin_emocional')
        .select('id, emoji, label, data, created_at')
        .eq('aluno_id', id)
        .order('data', { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  // Relatos
  const { data: relatos = [] } = useQuery({
    queryKey: ['registro-vivo-relatos', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('relatos_alunos')
        .select('id, texto, semana, created_at')
        .eq('aluno_id', id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  // Cargos
  const { data: cargos = [] } = useQuery({
    queryKey: ['registro-vivo-cargos', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('cargos_casa')
        .select('id, cargo, data_nomeacao, ativo')
        .eq('aluno_id', id)
        .order('data_nomeacao', { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  // Evidências
  const { data: evidencias = [] } = useQuery({
    queryKey: ['registro-vivo-evidencias', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('inteligencia_evidencias')
        .select('id, pontos, tipo, created_at, inteligencia_id, inteligencias(nome)')
        .eq('aluno_id', id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  // Montar timeline unificada
  const eventos: EventoRegistro[] = useMemo(() => {
    const lista: EventoRegistro[] = [];

    // Entregas
    entregas.forEach(e => {
      const titulo = (e as any).missoes?.titulo || 'Missao';
      if (e.status === 'pendente' || e.status === 'entregue') {
        lista.push({
          id: `entrega-${e.id}`,
          tipo: 'missao_entregue',
          data: new Date(e.data_entrega),
          titulo: `Entregou: ${titulo}`,
          descricao: e.numero_tentativa > 1 ? `Tentativa ${e.numero_tentativa}` : 'Primeira entrega',
          cor: tipoCores.missao_entregue,
          icon: tipoIcons.missao_entregue,
        });
      }
      if (e.status === 'aprovado') {
        lista.push({
          id: `aprovada-${e.id}`,
          tipo: 'missao_aprovada',
          data: new Date(e.data_entrega),
          titulo: `Aprovada: ${titulo}`,
          descricao: e.feedback_professor
            ? `"${e.feedback_professor}" — ${e.pontos_concedidos || 0} pts`
            : `${e.pontos_concedidos || 0} pontos concedidos`,
          cor: tipoCores.missao_aprovada,
          icon: tipoIcons.missao_aprovada,
        });
      }
      if (e.status === 'refazer') {
        lista.push({
          id: `refazer-${e.id}`,
          tipo: 'missao_refazer',
          data: new Date(e.data_entrega),
          titulo: `Refazer: ${titulo}`,
          descricao: e.feedback_professor || 'Precisa refazer',
          cor: tipoCores.missao_refazer,
          icon: tipoIcons.missao_refazer,
        });
      }
    });

    // Observações
    observacoes.forEach(o => {
      const prof = (o as any).profiles?.nome || 'Professor';
      lista.push({
        id: `obs-${o.id}`,
        tipo: 'observacao',
        data: new Date(o.data_observacao),
        titulo: `Observacao de ${prof}`,
        descricao: o.observacao_texto || '',
        cor: tipoCores.observacao,
        icon: tipoIcons.observacao,
        meta: { intensidade: o.intensidade },
      });
    });

    // Check-ins
    checkins.forEach(c => {
      lista.push({
        id: `checkin-${c.id}`,
        tipo: 'checkin',
        data: new Date(c.data + 'T12:00:00'),
        titulo: `${c.emoji} Se sentiu: ${c.label || ''}`,
        descricao: '',
        cor: tipoCores.checkin,
        icon: tipoIcons.checkin,
      });
    });

    // Relatos
    relatos.forEach(r => {
      lista.push({
        id: `relato-${r.id}`,
        tipo: 'relato',
        data: new Date(r.created_at),
        titulo: 'Relato do aluno',
        descricao: `"${r.texto}"`,
        cor: tipoCores.relato,
        icon: tipoIcons.relato,
        meta: { semana: r.semana },
      });
    });

    // Cargos
    cargos.forEach(c => {
      lista.push({
        id: `cargo-${c.id}`,
        tipo: 'cargo',
        data: new Date(c.data_nomeacao),
        titulo: `Nomeado: ${c.cargo.charAt(0).toUpperCase() + c.cargo.slice(1)}`,
        descricao: c.ativo ? 'Cargo ativo' : 'Cargo encerrado',
        cor: tipoCores.cargo,
        icon: tipoIcons.cargo,
      });
    });

    // Evidências
    evidencias.forEach(ev => {
      const intNome = (ev as any).inteligencias?.nome || 'Inteligencia';
      lista.push({
        id: `ev-${ev.id}`,
        tipo: 'evidencia',
        data: new Date(ev.created_at),
        titulo: `+${ev.pontos} pts em ${intNome}`,
        descricao: `Tipo: ${ev.tipo}`,
        cor: tipoCores.evidencia,
        icon: tipoIcons.evidencia,
      });
    });

    // Ordenar por data (mais recente primeiro)
    return lista.sort((a, b) => b.data.getTime() - a.data.getTime());
  }, [entregas, observacoes, checkins, relatos, cargos, evidencias]);

  const eventosFiltrados = filtroTipo
    ? eventos.filter(e => e.tipo === filtroTipo)
    : eventos;

  // Agrupar por data
  const eventosPorDia = useMemo(() => {
    const grupos: { data: string; eventos: EventoRegistro[] }[] = [];
    const mapa = new Map<string, EventoRegistro[]>();

    eventosFiltrados.forEach(e => {
      const key = e.data.toLocaleDateString('pt-BR');
      if (!mapa.has(key)) mapa.set(key, []);
      mapa.get(key)!.push(e);
    });

    mapa.forEach((evts, data) => {
      grupos.push({ data, eventos: evts });
    });

    return grupos;
  }, [eventosFiltrados]);

  const corCasa = casa?.cor_hex || '#444';
  const maxScore = Math.max(...inteligencias.map(i => i.score_atual || 0), 1);

  const tiposPresentes = [...new Set(eventos.map(e => e.tipo))];

  if (!aluno) {
    return (
      <div className="p-4 flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-violet-500" />
        <p className="text-xs text-white/30">Carregando perfil...</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-5 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/admin/arboria')}
          className="p-2 -ml-1 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold text-white">Registro Vivo</h1>
      </div>

      {/* Card do aluno */}
      <div
        className="relative overflow-hidden rounded-2xl border p-5"
        style={{ borderColor: `${corCasa}30`, background: `linear-gradient(160deg, ${corCasa}15, #252547 60%)` }}
      >
        <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-20 pointer-events-none" style={{ backgroundColor: corCasa }} />

        <div className="relative flex items-center gap-4">
          <div className="w-16 h-16 rounded-full overflow-hidden border-2 shrink-0" style={{ borderColor: corCasa }}>
            {aluno.avatar_url ? (
              <img src={aluno.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span
                className="flex items-center justify-center w-full h-full text-xl text-white/40"
                style={{ backgroundColor: `${corCasa}20` }}
              >
                {(aluno.nome || '?').charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-white">{aluno.full_name}</h2>
            <p className="text-sm" style={{ color: corCasa }}>{casa?.nome || 'Sem casa'}</p>
            <p className="text-xs text-white/40">{aluno.serie} - Turma {aluno.turma}</p>
          </div>
        </div>

        {/* Stats inline */}
        <div className="flex items-center gap-4 mt-4 pt-3 border-t" style={{ borderColor: `${corCasa}15` }}>
          <div className="flex-1 text-center">
            <div className="flex items-center justify-center gap-1">
              <Star className="w-3 h-3 text-yellow-500" fill="currentColor" />
              <span className="text-lg font-bold text-white">{ranking?.total_pontos || 0}</span>
            </div>
            <p className="text-[9px] text-white/30">pontos</p>
          </div>
          <div className="w-px h-7 bg-white/10" />
          <div className="flex-1 text-center">
            <span className="text-lg font-bold text-white">{ranking?.posicao_na_casa || '--'}</span>
            <span className="text-white/30 text-xs">o</span>
            <p className="text-[9px] text-white/30">na casa</p>
          </div>
          <div className="w-px h-7 bg-white/10" />
          <div className="flex-1 text-center">
            <span className="text-lg font-bold text-white">{ranking?.missoes_completadas || 0}</span>
            <p className="text-[9px] text-white/30">missoes</p>
          </div>
          <div className="w-px h-7 bg-white/10" />
          <div className="flex-1 text-center">
            <span className="text-lg font-bold text-white">{eventos.length}</span>
            <p className="text-[9px] text-white/30">registros</p>
          </div>
        </div>
      </div>

      {/* Radar de inteligências (barras) */}
      {inteligencias.length > 0 && (
        <div className="rounded-2xl border border-violet-500/10 bg-[#252547] p-4">
          <p className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-3">Inteligencias</p>
          <div className="space-y-2">
            {inteligencias.map(int => {
              const pct = maxScore > 0 ? ((int.score_atual || 0) / maxScore) * 100 : 0;
              return (
                <div key={int.inteligencia_nome} className="flex items-center gap-2">
                  {int.inteligencia_emoji && <span className="text-sm w-5 text-center">{int.inteligencia_emoji}</span>}
                  <span className="text-[11px] text-white/50 w-24 truncate">{int.inteligencia_nome}</span>
                  <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.max(pct, 2)}%`,
                        backgroundColor: int.inteligencia_cor || '#666',
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-white/30 w-8 text-right">{int.score_atual || 0}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filtros da timeline */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-white/30" />
          <p className="text-xs font-semibold text-white/50 uppercase tracking-widest">Timeline</p>
          <span className="text-[10px] text-white/20 ml-auto">{eventosFiltrados.length} eventos</span>
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-2 no-scrollbar">
          <button
            onClick={() => setFiltroTipo(null)}
            className={cn(
              'px-3 py-1.5 rounded-full text-[10px] font-medium whitespace-nowrap transition-colors border',
              !filtroTipo ? 'bg-white/10 border-white/20 text-white' : 'bg-transparent border-white/5 text-white/30'
            )}
          >
            Todos
          </button>
          {tiposPresentes.map(tipo => (
            <button
              key={tipo}
              onClick={() => setFiltroTipo(filtroTipo === tipo ? null : tipo)}
              className={cn(
                'px-3 py-1.5 rounded-full text-[10px] font-medium whitespace-nowrap transition-colors border',
                filtroTipo === tipo
                  ? 'bg-white/10 border-white/20 text-white'
                  : 'bg-transparent border-white/5 text-white/30'
              )}
              style={filtroTipo === tipo ? { borderColor: `${tipoCores[tipo]}50`, color: tipoCores[tipo] } : undefined}
            >
              {tipoLabels[tipo] || tipo}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      {eventosPorDia.length === 0 && (
        <div className="text-center py-12">
          <p className="text-white/30 text-sm">Nenhum registro encontrado</p>
        </div>
      )}

      {eventosPorDia.map(grupo => (
        <div key={grupo.data}>
          {/* Data separator */}
          <div className="flex items-center gap-3 mb-3">
            <div className="h-px flex-1 bg-white/5" />
            <span className="text-[10px] text-white/25 font-medium">{grupo.data}</span>
            <div className="h-px flex-1 bg-white/5" />
          </div>

          {/* Eventos do dia */}
          <div className="space-y-2 mb-4">
            {grupo.eventos.map(evento => {
              const Icon = evento.icon;
              return (
                <div
                  key={evento.id}
                  className="flex gap-3 p-3 rounded-xl bg-[#252547]/70 border border-violet-500/5 hover:bg-white/[0.04] transition-colors"
                >
                  {/* Ícone */}
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                    style={{ backgroundColor: `${evento.cor}15` }}
                  >
                    <Icon className="w-4 h-4" style={{ color: evento.cor }} />
                  </div>

                  {/* Conteúdo */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-white leading-tight">{evento.titulo}</p>
                    {evento.descricao && (
                      <p className="text-[12px] text-white/40 mt-0.5 leading-snug">{evento.descricao}</p>
                    )}
                    <p className="text-[9px] text-white/20 mt-1">
                      {evento.data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  {/* Tag tipo */}
                  <span
                    className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded h-fit shrink-0"
                    style={{ backgroundColor: `${evento.cor}15`, color: evento.cor }}
                  >
                    {tipoLabels[evento.tipo]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default RegistroVivoPage;
