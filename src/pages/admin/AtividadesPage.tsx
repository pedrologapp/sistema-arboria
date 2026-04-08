import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  LogIn,
  LogOut,
  Send,
  FileText,
  Star,
  MessageCircle,
  Eye,
  User,
  Award,
  Search,
  ChevronDown,
  Activity,
} from 'lucide-react';
import { format, subDays, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

// === Types ===
interface ActivityLog {
  id: string;
  user_id: string | null;
  action: string;
  details: Record<string, any>;
  created_at: string;
  ip_address: string | null;
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
    casa_id: number | null;
  } | null;
}

// === Config ===
const ACTION_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  login: { icon: <LogIn className="w-4 h-4" />, color: '#22c55e', label: 'Login' },
  logout: { icon: <LogOut className="w-4 h-4" />, color: '#6b7280', label: 'Logout' },
  missao_entrega: { icon: <Send className="w-4 h-4" />, color: '#eab308', label: 'Entrega' },
  missao_avaliada: { icon: <Star className="w-4 h-4" />, color: '#f97316', label: 'Avaliação' },
  missao_criada: { icon: <FileText className="w-4 h-4" />, color: '#3b82f6', label: 'Missão criada' },
  observacao_criada: { icon: <Eye className="w-4 h-4" />, color: '#3b82f6', label: 'Observação' },
  chat_mensagem: { icon: <MessageCircle className="w-4 h-4" />, color: '#a855f7', label: 'Mensagem' },
  perfil_atualizado: { icon: <User className="w-4 h-4" />, color: '#6b7280', label: 'Perfil' },
  pontos_creditados: { icon: <Award className="w-4 h-4" />, color: '#f59e0b', label: 'Pontos' },
};

const FILTER_ACTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'login', label: 'Logins' },
  { value: 'missao_entrega', label: 'Entregas' },
  { value: 'missao_avaliada', label: 'Avaliações' },
  { value: 'chat_mensagem', label: 'Chat' },
  { value: 'observacao_criada', label: 'Observações' },
  { value: 'perfil_atualizado', label: 'Perfil' },
];

const PERIOD_OPTIONS = [
  { value: 'today', label: 'Hoje' },
  { value: '7d', label: '7 dias' },
  { value: '30d', label: '30 dias' },
  { value: 'all', label: 'Total' },
];

const PAGE_SIZE = 20;

function getDateFilter(period: string): string {
  switch (period) {
    case 'today':
      return startOfDay(new Date()).toISOString();
    case '7d':
      return subDays(new Date(), 7).toISOString();
    case '30d':
      return subDays(new Date(), 30).toISOString();
    case 'all':
      return '2020-01-01T00:00:00.000Z';
    default:
      return startOfDay(new Date()).toISOString();
  }
}

function getActionConfig(action: string) {
  return ACTION_CONFIG[action] || { icon: <Activity className="w-4 h-4" />, color: '#6b7280', label: action };
}

function getActionDescription(log: ActivityLog): string {
  const d = log.details || {};
  switch (log.action) {
    case 'login':
      return `fez login (${d.device || '?'})`;
    case 'logout':
      return 'fez logout';
    case 'missao_entrega':
      return d.missao_titulo ? `enviou entrega "${d.missao_titulo}"` : 'enviou entrega de missão';
    case 'missao_avaliada':
      return d.aluno_nome ? `avaliou entrega de ${d.aluno_nome}${d.nota ? ` • Nota: ${d.nota}/10` : ''}` : 'avaliou entrega';
    case 'missao_criada':
      return d.missao_titulo ? `criou missão "${d.missao_titulo}"` : 'criou missão';
    case 'observacao_criada':
      return d.aluno_nome ? `registrou observação de ${d.aluno_nome}` : 'registrou observação';
    case 'chat_mensagem':
      return d.canal ? `enviou mensagem no canal ${d.canal}` : 'enviou mensagem';
    case 'perfil_atualizado':
      return d.campo_alterado ? `atualizou ${d.campo_alterado}` : 'atualizou perfil';
    case 'pontos_creditados':
      return d.aluno_nome ? `${d.pontos} pts para ${d.aluno_nome}` : 'creditou pontos';
    default:
      return log.action;
  }
}

// === Component ===
const AtividadesPage = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filters
  const [actionFilter, setActionFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState('30d');
  const [searchQuery, setSearchQuery] = useState('');

  // Summary counts
  const [counts, setCounts] = useState({ logins: 0, entregas: 0, mensagens: 0, observacoes: 0 });

  const fetchCounts = useCallback(async () => {
    const dateFrom = getDateFilter(periodFilter);

    const countFor = async (action: string) => {
      const { count } = await supabase
        .from('activity_logs' as any)
        .select('*', { count: 'exact', head: true })
        .eq('action', action)
        .gte('created_at', dateFrom);
      return count || 0;
    };

    const [logins, entregas, mensagens, observacoes] = await Promise.all([
      countFor('login'),
      countFor('missao_entrega'),
      countFor('chat_mensagem'),
      countFor('observacao_criada'),
    ]);

    setCounts({ logins, entregas, mensagens, observacoes });
  }, [periodFilter]);

  const fetchLogs = useCallback(async (append = false) => {
    if (append) setLoadingMore(true);
    else setLoading(true);

    const dateFrom = getDateFilter(periodFilter);
    const from = append ? logs.length : 0;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from('activity_logs' as any)
      .select('*, profiles!activity_logs_user_id_fkey(full_name, avatar_url, casa_id)')
      .gte('created_at', dateFrom)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (actionFilter !== 'all') {
      query = query.eq('action', actionFilter);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao buscar logs:', error);
      if (!append) setLoading(false);
      else setLoadingMore(false);
      return;
    }

    let filtered = (data || []) as unknown as ActivityLog[];

    // Client-side name search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (l) => l.profiles?.full_name?.toLowerCase().includes(q)
      );
    }

    if (append) {
      setLogs((prev) => [...prev, ...filtered]);
    } else {
      setLogs(filtered);
    }

    setHasMore((data || []).length === PAGE_SIZE);
    setLoading(false);
    setLoadingMore(false);
  }, [actionFilter, periodFilter, searchQuery, logs.length]);

  // Refetch when filters change
  useEffect(() => {
    fetchLogs(false);
    fetchCounts();
  }, [actionFilter, periodFilter]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => fetchLogs(false), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const summaryCards = [
    { label: 'Logins', value: counts.logins, color: '#22c55e', icon: <LogIn className="w-5 h-5" />, actionValue: 'login' },
    { label: 'Entregas', value: counts.entregas, color: '#eab308', icon: <Send className="w-5 h-5" />, actionValue: 'missao_entrega' },
    { label: 'Mensagens', value: counts.mensagens, color: '#a855f7', icon: <MessageCircle className="w-5 h-5" />, actionValue: 'chat_mensagem' },
    { label: 'Observações', value: counts.observacoes, color: '#3b82f6', icon: <Eye className="w-5 h-5" />, actionValue: 'observacao_criada' },
  ];

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* Title */}
      <div className="flex items-center gap-3 mb-6">
        <Activity className="w-6 h-6 text-indigo-400" />
        <h1 className="text-2xl font-bold text-white">Atividades do Sistema</h1>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-[140px] bg-white/5 border-violet-500/10 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FILTER_ACTIONS.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={periodFilter} onValueChange={setPeriodFilter}>
          <SelectTrigger className="w-[120px] bg-white/5 border-violet-500/10 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <Input
            placeholder="Buscar aluno..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-white/5 border-violet-500/10 text-white placeholder:text-white/30"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {summaryCards.map((card) => {
          const isActive = actionFilter === card.actionValue;
          return (
            <button
              key={card.label}
              onClick={() => setActionFilter(isActive ? 'all' : card.actionValue)}
              className="text-left"
            >
              <Card className={cn(
                "bg-white/5 border-violet-500/10 transition-all",
                isActive && "ring-2 ring-offset-0",
              )} style={isActive ? { borderColor: card.color, boxShadow: `0 0 12px ${card.color}30` } : undefined}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${card.color}20`, color: card.color }}
                  >
                    {card.icon}
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{card.value}</p>
                    <p className="text-xs text-white/50">{card.label}</p>
                  </div>
                </CardContent>
              </Card>
            </button>
          );
        })}
      </div>

      {/* Timeline */}
      <div className="space-y-1">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3">
              <Skeleton className="w-8 h-8 rounded-full bg-white/10" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4 bg-white/10" />
                <Skeleton className="h-3 w-1/2 bg-white/10" />
              </div>
            </div>
          ))
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-white/40">
            <Activity className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Nenhuma atividade encontrada</p>
          </div>
        ) : (
          logs.map((log) => {
            const config = getActionConfig(log.action);
            const isExpanded = expandedId === log.id;
            const time = format(new Date(log.created_at), 'HH:mm', { locale: ptBR });
            const fullDate = format(new Date(log.created_at), "dd/MM 'às' HH:mm", { locale: ptBR });

            return (
              <div key={log.id}>
                <button
                  onClick={() => setExpandedId(isExpanded ? null : log.id)}
                  className="w-full flex items-start gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors text-left"
                >
                  {/* Icon */}
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                    style={{ backgroundColor: `${config.color}20`, color: config.color }}
                  >
                    {config.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs text-white/40 font-mono">{time}</span>
                      <span className="text-sm text-white font-medium truncate">
                        {log.profiles?.full_name || 'Usuário'}
                      </span>
                    </div>
                    <p className="text-sm text-white/60 mt-0.5 line-clamp-2">
                      {getActionDescription(log)}
                    </p>
                  </div>

                  {/* Expand indicator */}
                  <ChevronDown
                    className={cn(
                      'w-4 h-4 text-white/20 shrink-0 mt-1 transition-transform',
                      isExpanded && 'rotate-180'
                    )}
                  />
                </button>

                {/* Expanded details */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="ml-11 mb-3 p-3 rounded-lg bg-white/5 border border-violet-500/10 text-xs space-y-1">
                        <p className="text-white/50">📅 {fullDate}</p>
                        <p className="text-white/50">🏷️ Ação: <span className="text-white/70">{config.label}</span></p>
                        {log.ip_address && (
                          <p className="text-white/50">🌐 IP: <span className="text-white/70 font-mono">{log.ip_address}</span></p>
                        )}
                        {log.details?.device && (
                          <p className="text-white/50">📱 Dispositivo: <span className="text-white/70">{log.details.device}</span></p>
                        )}
                        {log.details?.user_agent && (
                          <p className="text-white/50">🖥️ Navegador: <span className="text-white/70 break-all">{log.details.user_agent}</span></p>
                        )}
                        {log.details && Object.keys(log.details).filter(k => !['device', 'user_agent'].includes(k)).length > 0 && (
                          <pre className="text-white/40 mt-2 overflow-x-auto whitespace-pre-wrap break-all">
                            {JSON.stringify(Object.fromEntries(Object.entries(log.details).filter(([k]) => !['device', 'user_agent'].includes(k))), null, 2)}
                          </pre>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>

      {/* Load more */}
      {hasMore && !loading && logs.length > 0 && (
        <div className="flex justify-center mt-6">
          <Button
            variant="outline"
            onClick={() => fetchLogs(true)}
            disabled={loadingMore}
            className="border-violet-500/10 text-white/60 hover:text-white hover:bg-white/5"
          >
            {loadingMore ? 'Carregando...' : 'Carregar mais'}
          </Button>
        </div>
      )}
    </div>
  );
};

export default AtividadesPage;
