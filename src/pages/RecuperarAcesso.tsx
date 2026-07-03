import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, KeyRound, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const sb = supabase as any;

interface OpcoesData {
  institutions: { id: string; name: string }[];
  casas: { id: number; nome: string; codigo: string; cor_hex: string | null; brasao_url: string | null }[];
  turmas: { institution_id: string; serie: string; turma_letra: string }[];
}

const RecuperarAcesso = () => {
  const [opcoes, setOpcoes] = useState<OpcoesData | null>(null);
  const [loadingOpcoes, setLoadingOpcoes] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const [institutionId, setInstitutionId] = useState('');
  const [nome, setNome] = useState('');
  const [serie, setSerie] = useState('');
  const [turma, setTurma] = useState('');
  const [casaId, setCasaId] = useState<number | ''>('');

  useEffect(() => {
    sb.rpc('opcoes_recuperacao').then(({ data, error }: any) => {
      if (error) {
        toast.error('Erro ao carregar opções');
        setLoadingOpcoes(false);
        return;
      }
      setOpcoes(data as OpcoesData);
      // Se há só 1 instituição, seleciona automaticamente
      if (data?.institutions?.length === 1) {
        setInstitutionId(data.institutions[0].id);
      }
      setLoadingOpcoes(false);
    });
  }, []);

  const seriesDisponiveis = useMemo(() => {
    if (!opcoes || !institutionId) return [];
    const set = new Set<string>();
    opcoes.turmas
      .filter(t => t.institution_id === institutionId)
      .forEach(t => set.add(String(t.serie).replace(/\D/g, '')));
    return Array.from(set).filter(Boolean).sort();
  }, [opcoes, institutionId]);

  const turmasDisponiveis = useMemo(() => {
    if (!opcoes || !institutionId || !serie) return [];
    const set = new Set<string>();
    opcoes.turmas
      .filter(t => t.institution_id === institutionId
        && String(t.serie).replace(/\D/g, '') === serie)
      .forEach(t => set.add(t.turma_letra));
    return Array.from(set).sort();
  }, [opcoes, institutionId, serie]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!institutionId || !nome.trim() || !serie || !turma || !casaId) {
      toast.error('Preencha todos os campos');
      return;
    }
    if (nome.trim().split(/\s+/).length < 2) {
      toast.error('Digite seu nome completo (nome e sobrenome)');
      return;
    }
    setEnviando(true);
    const { error } = await sb.rpc('criar_solicitacao_recuperacao', {
      p_institution_id: institutionId,
      p_nome: nome.trim(),
      p_serie: serie,
      p_turma: turma,
      p_casa_id: casaId,
    });
    setEnviando(false);
    if (error) {
      toast.error(error.message || 'Erro ao enviar solicitação');
      return;
    }
    setEnviado(true);
  };

  if (loadingOpcoes) {
    return (
      <div className="min-h-screen bg-[#1A1A2E] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-violet-500" />
      </div>
    );
  }

  if (enviado) {
    const casaNome = opcoes?.casas.find(c => c.id === casaId)?.nome ?? '';
    return (
      <div className="min-h-screen w-full bg-black flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center text-white">
          <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-5" />
          <h1 className="text-2xl font-bold mb-3">Solicitação enviada!</h1>
          <p className="text-white/70 leading-relaxed">
            Procure o <span className="text-amber-200/90">coordenador da Casa {casaNome}</span> da
            sua turma. Ele já recebeu sua solicitação e vai te entregar o acesso pessoalmente.
          </p>
          <p className="text-white/40 text-sm mt-6">
            Não conta pra ninguém quando receber sua nova senha. Troque assim que conseguir entrar.
          </p>
          <div className="mt-8">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 transition-colors text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar pro login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-black flex items-center justify-center p-6">
      <div className="w-full max-w-md text-white">
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors mb-8 text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar pro login
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-amber-200/15 flex items-center justify-center">
            <KeyRound className="w-5 h-5 text-amber-200" />
          </div>
          <h1 className="text-2xl font-bold">Não consegue acessar?</h1>
        </div>
        <p className="text-white/60 text-sm mb-8 leading-relaxed">
          Sem problema. Preenche os dados abaixo e o coordenador da sua casa vai te ajudar a recuperar
          seu acesso. Não vai vir email: você vai receber direto da pessoa.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {opcoes && opcoes.institutions.length > 1 && (
            <div className="space-y-1.5">
              <Label className="text-white/80 text-sm">Escola</Label>
              <select
                value={institutionId}
                onChange={(e) => { setInstitutionId(e.target.value); setSerie(''); setTurma(''); }}
                required
                className="w-full bg-white/5 border border-violet-500/10 rounded-md px-3 py-2 text-sm text-white"
              >
                <option value="">Selecione</option>
                {opcoes.institutions.map(i => (
                  <option key={i.id} value={i.id}>{i.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-white/80 text-sm">Nome completo</Label>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Como está cadastrado na escola"
              required
              className="bg-white/5 border-violet-500/10 text-white placeholder:text-white/30"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-white/80 text-sm">Série</Label>
              <select
                value={serie}
                onChange={(e) => { setSerie(e.target.value); setTurma(''); }}
                required
                disabled={!institutionId}
                className="w-full bg-white/5 border border-violet-500/10 rounded-md px-3 py-2 text-sm text-white disabled:opacity-50"
              >
                <option value="">: </option>
                {seriesDisponiveis.map(s => (
                  <option key={s} value={s}>{s}º Ano</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/80 text-sm">Turma</Label>
              <select
                value={turma}
                onChange={(e) => setTurma(e.target.value)}
                required
                disabled={!serie}
                className="w-full bg-white/5 border border-violet-500/10 rounded-md px-3 py-2 text-sm text-white disabled:opacity-50"
              >
                <option value="">: </option>
                {turmasDisponiveis.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-white/80 text-sm">Casa</Label>
            <div className="grid grid-cols-2 gap-2">
              {opcoes?.casas.map(c => {
                const sel = casaId === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCasaId(c.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md border text-sm transition text-left ${
                      sel
                        ? 'bg-amber-200/10 border-amber-200/40 text-white'
                        : 'bg-white/5 border-violet-500/10 text-white/70 hover:bg-white/10'
                    }`}
                  >
                    {c.brasao_url && (
                      <img src={c.brasao_url} alt="" className="w-5 h-5 object-contain" />
                    )}
                    <span className="truncate">{c.nome}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <Button type="submit" size="lg" className="w-full" disabled={enviando}>
            {enviando ? 'Enviando...' : 'Enviar solicitação'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default RecuperarAcesso;
