import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { KeyRound, Check, X, Clipboard, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const sb = supabase as any;

interface Solicitacao {
  id: string;
  nome_digitado: string;
  serie_digitada: string;
  turma_digitada: string;
  casa_id: number;
  status: string;
  solicitado_em: string;
}

interface Candidato {
  id: string;
  full_name: string | null;
  nome: string | null;
  avatar_url: string | null;
  email: string | null;
}

const formatarHora = (iso: string) => {
  const d = new Date(iso);
  const hoje = new Date();
  const isHoje = d.toDateString() === hoje.toDateString();
  if (isHoje) return `Hoje, ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) +
    ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

const SolicitacoesRecuperacao = () => {
  const qc = useQueryClient();
  const [aberta, setAberta] = useState<Solicitacao | null>(null);

  const { data: solicitacoes = [], refetch } = useQuery<Solicitacao[]>({
    queryKey: ['recup-pendentes'],
    queryFn: async () => {
      const { data } = await sb.from('recuperacao_solicitacoes')
        .select('id, nome_digitado, serie_digitada, turma_digitada, casa_id, status, solicitado_em')
        .eq('status', 'pendente')
        .order('solicitado_em', { ascending: false });
      return (data as Solicitacao[]) ?? [];
    },
    refetchInterval: 60000,
  });

  if (solicitacoes.length === 0) return null;

  return (
    <section className="rounded-xl border border-amber-200/30 bg-amber-950/20 p-4">
      <div className="flex items-center gap-2 mb-3">
        <KeyRound className="w-4 h-4 text-amber-200" />
        <h3 className="text-sm font-semibold text-amber-100">
          {solicitacoes.length} {solicitacoes.length === 1 ? 'solicitação de acesso' : 'solicitações de acesso'}
        </h3>
      </div>
      <p className="text-[11px] text-white/60 mb-3 leading-relaxed">
        Alguém da sua turma pediu pra recuperar o acesso. Confirme com a pessoa antes de gerar a senha.
      </p>
      <div className="space-y-2">
        {solicitacoes.map(s => (
          <button
            key={s.id}
            onClick={() => setAberta(s)}
            className="w-full text-left flex items-center justify-between gap-2 p-3 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] transition"
          >
            <div className="min-w-0">
              <div className="text-sm text-white truncate">{s.nome_digitado}</div>
              <div className="text-[11px] text-white/50 mt-0.5">
                {s.serie_digitada}º Ano {s.turma_digitada} · {formatarHora(s.solicitado_em)}
              </div>
            </div>
            <span className="text-[10px] tracking-widest uppercase text-amber-200/80 px-2 py-1 rounded-full bg-amber-200/10">
              atender
            </span>
          </button>
        ))}
      </div>

      <ModalAtender
        solicitacao={aberta}
        onClose={(refetched) => {
          setAberta(null);
          if (refetched) {
            refetch();
            qc.invalidateQueries({ queryKey: ['recup-pendentes'] });
          }
        }}
      />
    </section>
  );
};

const ModalAtender = ({
  solicitacao, onClose
}: {
  solicitacao: Solicitacao | null;
  onClose: (refetched: boolean) => void;
}) => {
  const [escolhidoId, setEscolhidoId] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{ email: string; senha: string } | null>(null);
  const [recusando, setRecusando] = useState(false);
  const [autorizando, setAutorizando] = useState(false);
  const [verSenha, setVerSenha] = useState(true);

  const { data: candidatos = [], isLoading } = useQuery<Candidato[]>({
    queryKey: ['recup-candidatos', solicitacao?.id],
    enabled: !!solicitacao?.id,
    queryFn: async () => {
      const { data, error } = await sb.rpc('listar_candidatos_recuperacao', {
        p_solicitacao_id: solicitacao!.id,
      });
      if (error) {
        toast.error(error.message || 'Erro ao listar candidatos');
        return [];
      }
      return (data as Candidato[]) ?? [];
    },
  });

  const sugestao = useMemo(() => {
    if (!solicitacao || candidatos.length === 0) return null;
    const nomeNorm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const alvo = nomeNorm(solicitacao.nome_digitado.trim());
    return candidatos.find(c => {
      const n = nomeNorm(c.full_name || c.nome || '');
      return n === alvo || n.includes(alvo) || alvo.includes(n);
    }) ?? null;
  }, [candidatos, solicitacao]);

  const handleAutorizar = async () => {
    if (!solicitacao || !escolhidoId) return;
    setAutorizando(true);
    const { data, error } = await sb.rpc('autorizar_recuperacao', {
      p_solicitacao_id: solicitacao.id,
      p_aluno_id: escolhidoId,
    });
    setAutorizando(false);
    if (error) {
      toast.error(error.message || 'Erro ao autorizar');
      return;
    }
    setResultado(data as { email: string; senha: string });
  };

  const handleRecusar = async () => {
    if (!solicitacao) return;
    if (!confirm('Tem certeza que quer recusar essa solicitação? O aluno vai ter que pedir de novo.')) return;
    setRecusando(true);
    const { error } = await sb.rpc('recusar_recuperacao', {
      p_solicitacao_id: solicitacao.id,
      p_motivo: 'Recusada pelo coordenador',
    });
    setRecusando(false);
    if (error) {
      toast.error(error.message || 'Erro ao recusar');
      return;
    }
    toast.success('Solicitação recusada');
    onClose(true);
  };

  const copiar = async (texto: string) => {
    try { await navigator.clipboard.writeText(texto); toast.success('Copiado'); }
    catch { toast.error('Não consegui copiar'); }
  };

  if (!solicitacao) return null;

  return (
    <Dialog open={!!solicitacao} onOpenChange={(o) => { if (!o) { onClose(!!resultado); setResultado(null); setEscolhidoId(null); setVerSenha(true); } }}>
      <DialogContent className="bg-[#12122A] border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white font-serif">
            {resultado ? 'Acesso gerado' : 'Atender solicitação'}
          </DialogTitle>
          <DialogDescription className="text-white/60">
            {resultado
              ? 'Anote em papel e entregue ao aluno. Esta tela não vai mostrar a senha de novo.'
              : `${solicitacao.nome_digitado} · ${solicitacao.serie_digitada}º Ano ${solicitacao.turma_digitada}`}
          </DialogDescription>
        </DialogHeader>

        {resultado ? (
          <div className="space-y-4">
            <CampoCopiavel label="Email" valor={resultado.email} onCopy={copiar} />
            <CampoCopiavel
              label="Senha temporária"
              valor={verSenha ? resultado.senha : '••••••'}
              onCopy={() => copiar(resultado.senha)}
              acaoExtra={
                <button onClick={() => setVerSenha(!verSenha)} className="text-white/60 hover:text-white">
                  {verSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
            />
            <p className="text-[11px] text-amber-200/80 leading-relaxed bg-amber-950/30 border border-amber-200/20 rounded-md p-2.5">
              ⚠ Aluno vai precisar trocar a senha no primeiro login. Não conte pra ninguém.
            </p>
            <Button onClick={() => { onClose(true); setResultado(null); setEscolhidoId(null); setVerSenha(true); }} className="w-full">
              Concluir
            </Button>
          </div>
        ) : (
          <>
            <div className="text-[11px] text-white/60 mb-2">
              Quem é essa pessoa? Confirme com ela antes de selecionar.
            </div>
            {isLoading ? (
              <div className="flex justify-center py-6">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-violet-500" />
              </div>
            ) : candidatos.length === 0 ? (
              <div className="text-sm text-white/60 py-4">
                Nenhum aluno encontrado nessa turma+casa. Pode ser que o cadastro esteja diferente: confira com a coordenação.
              </div>
            ) : (
              <div className="space-y-1 max-h-[300px] overflow-y-auto -mx-1 px-1">
                {candidatos.map(c => {
                  const nome = c.full_name || c.nome || 'Aluno';
                  const sel = escolhidoId === c.id;
                  const ehSugestao = sugestao?.id === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setEscolhidoId(c.id)}
                      className={`w-full text-left flex items-center gap-3 p-2 rounded-lg transition ${
                        sel ? 'bg-amber-200/15 ring-1 ring-amber-200/40' : 'hover:bg-white/10'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-amber-200/15 text-amber-200/80 flex items-center justify-center text-xs font-semibold overflow-hidden">
                        {c.avatar_url
                          ? <img src={c.avatar_url} alt="" className="w-full h-full object-cover" />
                          : nome.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm">{nome}</div>
                        {ehSugestao && (
                          <div className="text-[10px] text-emerald-300/80">provável match</div>
                        )}
                      </div>
                      {sel && <Check className="w-4 h-4 text-amber-200" />}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex gap-2 mt-4">
              <Button
                variant="outline"
                onClick={handleRecusar}
                disabled={recusando || autorizando}
                className="border-red-500/30 text-red-300 hover:bg-red-500/10"
              >
                <X className="w-4 h-4 mr-1" /> Recusar
              </Button>
              <Button
                onClick={handleAutorizar}
                disabled={!escolhidoId || autorizando || recusando}
                className="flex-1"
              >
                {autorizando ? 'Gerando...' : 'Autorizar e gerar senha'}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

const CampoCopiavel = ({
  label, valor, onCopy, acaoExtra
}: { label: string; valor: string; onCopy: (v: string) => void; acaoExtra?: React.ReactNode }) => (
  <div>
    <div className="text-[10px] tracking-widest uppercase text-white/50 mb-1">{label}</div>
    <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-md px-3 py-2">
      <span className="flex-1 text-sm font-mono text-white truncate">{valor}</span>
      {acaoExtra}
      <button onClick={() => onCopy(valor)} className="text-white/60 hover:text-white" title="Copiar">
        <Clipboard className="w-4 h-4" />
      </button>
    </div>
  </div>
);

export default SolicitacoesRecuperacao;
