import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Plus, X, Copy, Check, Ban, Dices } from 'lucide-react';
import { cn } from '@/lib/utils';
import { infantilTheme as t } from '@/styles/infantilTheme';
import { toast } from 'sonner';

// Cores semanticas (so nos estados; o acento do painel e o indigo do tema).
const OK = { text: '#177A50', bg: '#E9F6F0', border: '#C7E9D8' };
const DANGER = { text: '#B4231F', bg: '#FBEAEA', border: '#F2CFCE' };

const SEGMENTOS: { id: string; label: string }[] = [
  { id: 'infantil', label: 'Infantil' },
  { id: 'fundamental1', label: 'Fundamental 1' },
  { id: 'fundamental2', label: 'Fundamental 2' },
];

const labelSegmento = (id: string): string => SEGMENTOS.find((s) => s.id === id)?.label ?? id;

interface Instituicao {
  id: string;
  name: string;
}

interface SegmentoConcessao {
  segmento: string;
  ativo: boolean;
}

interface Coordenador {
  userId: string;
  nome: string;
  email: string;
  bloqueado: boolean;
  segmentos: SegmentoConcessao[];
}

const gerarSenha = (): string => {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let sufixo = '';
  const rnd = new Uint32Array(6);
  crypto.getRandomValues(rnd);
  for (let i = 0; i < 6; i++) sufixo += chars[rnd[i] % chars.length];
  return `arboria${sufixo}`;
};

// Chama a edge function e extrai a mensagem real de erro (o invoke devolve um
// "non-2xx status code" generico; a mensagem util esta no corpo).
async function invocar(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.functions.invoke('admin-coordenadores', { body });
  if (error) {
    let msg = error.message;
    const ctx = (error as { context?: { json?: () => Promise<unknown> } }).context;
    if (ctx?.json) {
      try {
        const b = (await ctx.json()) as { error?: string };
        if (b?.error) msg = b.error;
      } catch {
        /* mantem a mensagem generica */
      }
    }
    throw new Error(msg);
  }
  const d = (data || {}) as { error?: string };
  if (d.error) throw new Error(d.error);
  return d as Record<string, unknown>;
}

const inputStyle: React.CSSProperties = {
  backgroundColor: t.surfaceSunken,
  border: `1px solid ${t.border}`,
  color: t.text,
};
const cardStyle: React.CSSProperties = {
  backgroundColor: t.surface,
  border: `1px solid ${t.border}`,
  boxShadow: t.shadowSm,
};
const modalStyle: React.CSSProperties = {
  backgroundColor: t.surface,
  border: `1px solid ${t.border}`,
  boxShadow: t.shadowMd,
};

const ArboriaCoordenadoresPage = () => {
  const queryClient = useQueryClient();

  const [institucaoSel, setInstitucaoSel] = useState<string | null>(null);

  const [showCriar, setShowCriar] = useState(false);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [segsSel, setSegsSel] = useState<string[]>([]);

  const [credenciais, setCredenciais] = useState<{ email: string; senha: string; nome: string } | null>(null);
  const [coordParaDesativar, setCoordParaDesativar] = useState<Coordenador | null>(null);

  const [processando, setProcessando] = useState(false);
  const [copiado, setCopiado] = useState<string | null>(null);

  const { data: instituicoes = [] } = useQuery({
    queryKey: ['coord-instituicoes'],
    queryFn: async () => {
      const d = await invocar({ acao: 'listar_instituicoes' });
      return (d.instituicoes || []) as Instituicao[];
    },
  });

  // Instituicao unica (Amadeus hoje): ja seleciona sozinha.
  useEffect(() => {
    if (!institucaoSel && instituicoes.length === 1) {
      setInstitucaoSel(instituicoes[0].id);
    }
  }, [instituicoes, institucaoSel]);

  const { data: coordenadores = [], isLoading } = useQuery({
    queryKey: ['coordenadores', institucaoSel],
    queryFn: async () => {
      const d = await invocar({ acao: 'listar', institutionId: institucaoSel });
      return (d.coordenadores || []) as Coordenador[];
    },
    enabled: !!institucaoSel,
  });

  const invalidar = () => queryClient.invalidateQueries({ queryKey: ['coordenadores'] });

  const copiarTexto = async (texto: string, chave: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(chave);
      setTimeout(() => setCopiado(null), 1500);
    } catch {
      toast.error('Falha ao copiar');
    }
  };

  const abrirCriar = () => {
    setNome('');
    setEmail('');
    setSenha(gerarSenha());
    setSegsSel([]);
    setShowCriar(true);
  };

  const toggleSegCriar = (id: string) => {
    setSegsSel((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  };

  const criar = async () => {
    if (!institucaoSel) {
      toast.error('Escolha a instituicao primeiro');
      return;
    }
    if (!nome.trim() || !email.trim() || segsSel.length === 0) {
      toast.error('Preencha nome, email e ao menos um segmento');
      return;
    }
    if (senha.length < 8) {
      toast.error('A senha deve ter pelo menos 8 caracteres');
      return;
    }
    setProcessando(true);
    try {
      await invocar({
        acao: 'criar',
        email: email.trim().toLowerCase(),
        senha,
        nomeExibicao: nome.trim(),
        institutionId: institucaoSel,
        segmentos: segsSel,
      });
      setShowCriar(false);
      setCredenciais({ email: email.trim().toLowerCase(), senha, nome: nome.trim() });
      toast.success('Coordenador criado');
      invalidar();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar o coordenador');
    } finally {
      setProcessando(false);
    }
  };

  const alternarSegmento = async (coord: Coordenador, segmento: string, ativo: boolean) => {
    if (!institucaoSel) return;
    setProcessando(true);
    try {
      await invocar({
        acao: 'toggle_segmento',
        userId: coord.userId,
        institutionId: institucaoSel,
        segmento,
        ativo,
      });
      invalidar();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao ajustar o segmento');
    } finally {
      setProcessando(false);
    }
  };

  const desativar = async () => {
    if (!coordParaDesativar) return;
    setProcessando(true);
    try {
      await invocar({ acao: 'desativar', userId: coordParaDesativar.userId });
      setCoordParaDesativar(null);
      toast.success('Coordenador desativado');
      invalidar();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao desativar o coordenador');
    } finally {
      setProcessando(false);
    }
  };

  const segmentoAtivo = (coord: Coordenador, segId: string): boolean =>
    coord.segmentos.some((s) => s.segmento === segId && s.ativo);

  return (
    <div className="pb-8">
      <div className="flex items-center justify-between gap-3 mb-1">
        <h1 className="font-serif text-[22px]" style={{ color: t.text }}>
          Coordenadores
        </h1>
        <button
          onClick={abrirCriar}
          disabled={!institucaoSel}
          className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold flex-shrink-0 disabled:opacity-50"
          style={{ backgroundColor: t.accent, color: '#FFFFFF', boxShadow: t.shadowSm }}
        >
          <Plus size={15} /> Novo coordenador
        </button>
      </div>
      <p className="text-sm mb-4" style={{ color: t.textMuted }}>
        O coordenador acompanha, so em leitura, as turmas do segmento atribuido. Atribuir um segmento
        libera todas as turmas dele na instituicao.
      </p>

      {/* Instituicao (aparece so quando ha mais de uma) */}
      {instituicoes.length > 1 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {instituicoes.map((inst) => {
            const ativa = inst.id === institucaoSel;
            return (
              <button
                key={inst.id}
                onClick={() => setInstitucaoSel(inst.id)}
                className="rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors"
                style={
                  ativa
                    ? { backgroundColor: t.accent, color: '#FFFFFF' }
                    : { backgroundColor: t.surface, color: t.textMuted, border: `1px solid ${t.border}` }
                }
              >
                {inst.name}
              </button>
            );
          })}
        </div>
      )}

      {/* Lista de coordenadores */}
      <div className="rounded-2xl p-3" style={cardStyle}>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-20 rounded-xl animate-pulse" style={{ backgroundColor: t.surfaceSunken }} />
            ))}
          </div>
        ) : coordenadores.length === 0 ? (
          <p className="text-[13px] py-6 text-center" style={{ color: t.textFaint }}>
            Nenhum coordenador nesta instituicao ainda. Use "Novo coordenador" para criar a conta e
            atribuir os segmentos.
          </p>
        ) : (
          <div className="space-y-2.5">
            {coordenadores.map((coord) => (
              <div
                key={coord.userId}
                className={cn('p-3 rounded-xl', coord.bloqueado && 'opacity-60')}
                style={{ backgroundColor: t.surfaceSunken, border: `1px solid ${t.border}` }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[14px] font-medium truncate" style={{ color: t.text }}>
                      {coord.nome || 'Sem nome'}
                    </p>
                    <p className="text-[11px] font-mono truncate" style={{ color: t.textFaint }}>
                      {coord.email}
                    </p>
                  </div>
                  {coord.bloqueado && (
                    <span
                      className="shrink-0 px-2 py-0.5 rounded-full text-[9px] font-medium border"
                      style={{ backgroundColor: DANGER.bg, color: DANGER.text, borderColor: DANGER.border }}
                    >
                      Desativado
                    </span>
                  )}
                </div>

                {/* Segmentos: chip por segmento, clique alterna atribuicao */}
                {!coord.bloqueado && (
                  <>
                    <p className="text-[10px] uppercase tracking-wider mt-2.5 mb-1.5" style={{ color: t.textFaint }}>
                      Segmentos atribuidos
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {SEGMENTOS.map((seg) => {
                        const ativo = segmentoAtivo(coord, seg.id);
                        return (
                          <button
                            key={seg.id}
                            type="button"
                            disabled={processando}
                            onClick={() => alternarSegmento(coord, seg.id, !ativo)}
                            className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-colors disabled:opacity-60"
                            style={
                              ativo
                                ? { backgroundColor: t.accent, borderColor: t.accent, color: '#FFFFFF' }
                                : { backgroundColor: t.surface, borderColor: t.border, color: t.textMuted }
                            }
                          >
                            {ativo ? <Check className="inline w-3 h-3 mr-1 -mt-0.5" /> : null}
                            {seg.label}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex gap-1.5 flex-wrap mt-3">
                      <button
                        onClick={() => setCoordParaDesativar(coord)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium border transition-colors"
                        style={{ backgroundColor: DANGER.bg, color: DANGER.text, borderColor: DANGER.border }}
                      >
                        <Ban className="w-3 h-3" /> Desativar
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: criar coordenador */}
      {showCriar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto" style={modalStyle}>
            <div className="flex items-center justify-between">
              <p className="font-medium" style={{ color: t.text }}>
                Novo coordenador
              </p>
              <button onClick={() => setShowCriar(false)} className="p-1" style={{ color: t.textFaint }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] block mb-1" style={{ color: t.textFaint }}>
                  Nome
                </label>
                <input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Nome do coordenador"
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                  style={inputStyle}
                />
              </div>

              <div>
                <label className="text-[10px] block mb-1" style={{ color: t.textFaint }}>
                  Email de acesso
                </label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="coordenador@arboria.com"
                  className="w-full rounded-lg px-3 py-2 text-sm font-mono outline-none"
                  style={inputStyle}
                />
              </div>

              <div>
                <label className="text-[10px] block mb-1" style={{ color: t.textFaint }}>
                  Senha provisoria
                </label>
                <div className="flex gap-2">
                  <input
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="Minimo 8 caracteres"
                    className="flex-1 rounded-lg px-3 py-2 text-sm font-mono outline-none"
                    style={inputStyle}
                  />
                  <button
                    type="button"
                    onClick={() => setSenha(gerarSenha())}
                    title="Gerar senha"
                    className="px-2.5 rounded-lg border transition-colors"
                    style={{ backgroundColor: t.surfaceSunken, borderColor: t.border, color: t.textMuted }}
                  >
                    <Dices className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => copiarTexto(senha, 'senha-form')}
                    title="Copiar senha"
                    className="px-2.5 rounded-lg border transition-colors"
                    style={{ backgroundColor: t.surfaceSunken, borderColor: t.border, color: t.textMuted }}
                  >
                    {copiado === 'senha-form' ? (
                      <Check className="w-4 h-4" style={{ color: OK.text }} />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <p className="text-[9px] mt-1" style={{ color: t.textFaint }}>
                  A senha aparece uma vez, na proxima tela. Anote antes de fechar.
                </p>
              </div>

              <div>
                <label className="text-[10px] block mb-1.5" style={{ color: t.textFaint }}>
                  Segmentos
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {SEGMENTOS.map((seg) => {
                    const ativo = segsSel.includes(seg.id);
                    return (
                      <button
                        key={seg.id}
                        type="button"
                        onClick={() => toggleSegCriar(seg.id)}
                        className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-colors"
                        style={
                          ativo
                            ? { backgroundColor: t.accent, borderColor: t.accent, color: '#FFFFFF' }
                            : { backgroundColor: t.surfaceSunken, borderColor: t.border, color: t.textMuted }
                        }
                      >
                        {ativo ? <Check className="inline w-3 h-3 mr-1 -mt-0.5" /> : null}
                        {seg.label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[9px] mt-1" style={{ color: t.textFaint }}>
                  Pode marcar mais de um. Cada segmento libera todas as turmas dele na instituicao.
                </p>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setShowCriar(false)}
                className="flex-1 rounded-lg px-3 py-2 text-sm font-medium border"
                style={{ backgroundColor: t.surface, borderColor: t.border, color: t.textMuted }}
              >
                Cancelar
              </button>
              <button
                onClick={criar}
                disabled={processando}
                className="flex-1 rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-60"
                style={{ backgroundColor: t.accent, color: '#FFFFFF' }}
              >
                {processando ? 'Criando...' : 'Criar coordenador'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: credenciais (mostradas uma vez) */}
      {credenciais && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl p-5 space-y-4" style={modalStyle}>
            <div className="flex items-center justify-between">
              <p className="font-medium" style={{ color: t.text }}>
                {credenciais.nome}
              </p>
              <button onClick={() => setCredenciais(null)} className="p-1" style={{ color: t.textFaint }}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-[11px]" style={{ color: t.textMuted }}>
              Anote e entregue estas credenciais ao coordenador. A senha nao fica salva e nao pode ser
              recuperada depois.
            </p>
            <div className="rounded-xl p-3 space-y-2" style={{ backgroundColor: t.surfaceSunken, border: `1px solid ${t.border}` }}>
              {[
                { rotulo: 'Email', valor: credenciais.email, chave: 'cred-email' },
                { rotulo: 'Senha', valor: credenciais.senha, chave: 'cred-senha' },
              ].map((linha) => (
                <div key={linha.chave} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[9px] uppercase tracking-wider" style={{ color: t.textFaint }}>
                      {linha.rotulo}
                    </p>
                    <p className="text-[13px] font-mono truncate" style={{ color: t.text }}>
                      {linha.valor}
                    </p>
                  </div>
                  <button
                    onClick={() => copiarTexto(linha.valor, linha.chave)}
                    className="px-2.5 py-1.5 rounded-lg border flex-shrink-0"
                    style={{ backgroundColor: t.surface, borderColor: t.border, color: t.textMuted }}
                  >
                    {copiado === linha.chave ? (
                      <Check className="w-4 h-4" style={{ color: OK.text }} />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() => setCredenciais(null)}
              className="w-full rounded-lg px-3 py-2 text-sm font-semibold"
              style={{ backgroundColor: t.accent, color: '#FFFFFF' }}
            >
              Ja anotei
            </button>
          </div>
        </div>
      )}

      {/* Modal: confirmar desativacao */}
      {coordParaDesativar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl p-5 space-y-4" style={modalStyle}>
            <p className="font-medium" style={{ color: t.text }}>
              Desativar {coordParaDesativar.nome || 'coordenador'}?
            </p>
            <p className="text-[13px]" style={{ color: t.textMuted }}>
              O login e bloqueado e todas as atribuicoes de segmento sao encerradas. A conta nao e
              apagada e pode ser reativada no banco depois, se necessario.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setCoordParaDesativar(null)}
                className="flex-1 rounded-lg px-3 py-2 text-sm font-medium border"
                style={{ backgroundColor: t.surface, borderColor: t.border, color: t.textMuted }}
              >
                Cancelar
              </button>
              <button
                onClick={desativar}
                disabled={processando}
                className="flex-1 rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-60"
                style={{ backgroundColor: DANGER.text, color: '#FFFFFF' }}
              >
                {processando ? 'Desativando...' : 'Desativar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArboriaCoordenadoresPage;
