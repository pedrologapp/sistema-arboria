import { useState, useMemo, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Send, ImagePlus, X, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfessor } from '@/contexts/ProfessorContext';
import { useAlunoThread, type AlunoThreadData, type ObservacaoThread } from '@/hooks/useAlunoThread';
import { useFaseTurma } from '@/hooks/useFaseTurma';
import { getIniciais } from '@/lib/infantil';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { infantilTheme as t } from '@/styles/infantilTheme';

const fmtDataHora = (iso: string) => {
  try {
    return format(parseISO(iso), "d 'de' MMM 'às' HH:mm", { locale: ptBR });
  } catch {
    return iso;
  }
};

const fmtDia = (isoDate: string) => {
  try {
    return format(parseISO(isoDate), "d 'de' MMMM", { locale: ptBR });
  } catch {
    return isoDate;
  }
};

// No celular não existe Shift+Enter. Enter precisa quebrar linha, não enviar.
const isTouch =
  typeof window !== 'undefined' &&
  ('ontouchstart' in window || (navigator.maxTouchPoints ?? 0) > 0);

// Motivos da exclusão (auditoria: parecer Riscos 01/07). Presets, não texto livre.
const MOTIVOS_EXCLUSAO = ['Criança errada', 'Erro de digitação', 'Foto errada', 'Outro'] as const;

// Pergunta do composer RODA por dia (pergunta fixa vira gabarito; simulação 1000)
const PERGUNTAS_COMPOSER = [
  (n: string) => `O que ${n} te mostrou hoje?`,
  (n: string) => `Como ${n} chegou no que fez hoje?`,
  (n: string) => `O que ${n} fez primeiro hoje?`,
  (n: string) => `O que ${n} fez sem ninguém pedir?`,
];
const INICIOS_FRASE = [
  'Começou por',
  'Só entrou quando',
  'Diante do obstáculo,',
  'Sem ninguém pedir,',
] as const;
const diaDeHoje = () => Math.floor(Date.now() / 86400000);

/**
 * Modal da "borracha": remover um registro do diário (soft-delete auditado).
 * Corrigir = remover + reescrever. O registro some da UI mas permanece
 * auditável no banco; a foto sai do bucket imediatamente (RPC).
 */
const ExcluirModal = ({
  alunoNome,
  loading,
  onConfirmar,
  onFechar,
}: {
  alunoNome: string;
  loading: boolean;
  onConfirmar: (motivo: string) => void;
  onFechar: () => void;
}) => {
  const [motivo, setMotivo] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFechar();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onFechar]);

  const primeiroNome = alunoNome.split(' ')[0];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md"
      style={{ backgroundColor: 'rgba(28,34,48,0.30)' }}
      onClick={onFechar}
      role="dialog"
      aria-modal="true"
      aria-label="Remover registro"
    >
      <div
        className="w-full max-w-[360px] rounded-2xl overflow-hidden"
        style={{ backgroundColor: t.surface, boxShadow: t.shadowLg }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ height: 3, backgroundColor: t.accent }} />
        <div className="p-5 space-y-4">
          <div className="space-y-1.5">
            <p className="text-[11px] uppercase tracking-wide font-semibold" style={{ color: t.accentText }}>
              Corrigir o diário
            </p>
            <h2 className="text-lg font-bold leading-snug" style={{ color: t.text }}>
              Remover este registro do diário de {primeiroNome}?
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: t.textMuted }}>
              Se algo ficou no lugar errado, remova e escreva de novo. O que aconteceu?
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {MOTIVOS_EXCLUSAO.map((m) => {
              const ativo = motivo === m;
              return (
                <button
                  key={m}
                  onClick={() => setMotivo(m)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
                  style={
                    ativo
                      ? { backgroundColor: t.accent, color: '#FFFFFF' }
                      : { backgroundColor: t.surfaceSunken, color: t.textMuted, border: `1px solid ${t.border}` }
                  }
                >
                  {m}
                </button>
              );
            })}
          </div>

          <div className="space-y-2 pt-1">
            <button
              onClick={() => motivo && onConfirmar(motivo)}
              disabled={!motivo || loading}
              className="w-full rounded-xl py-3 text-sm font-semibold disabled:opacity-50"
              style={{ backgroundColor: t.accent, color: '#FFFFFF', boxShadow: t.shadowMd }}
            >
              Remover registro
            </button>
            <button
              onClick={onFechar}
              disabled={loading}
              className="w-full rounded-xl py-3 text-sm font-medium disabled:opacity-60"
              style={{ backgroundColor: 'transparent', color: t.textMuted }}
            >
              Voltar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Thread de observações de um aluno: estilo conversa (WhatsApp).
 * O "rio" do Infantil: cada observação é uma mensagem; agrupadas por fase.
 * Campo livre embaixo = registro avulso (a qualquer hora). Inc.2.
 */
const InfantilAlunoThreadPage = () => {
  const { id: alunoId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { profile } = useProfessor();
  const { data: thread, isLoading } = useAlunoThread(alunoId);
  // A fase vem da TURMA DESTA CRIANÇA (não do contexto, que só vê a 1ª turma do professor)
  const { data: faseTurma } = useFaseTurma(thread?.turmaId, profile?.institution_id);
  const faseAtual = faseTurma?.fase ?? null;

  const primeiroNome = (thread?.aluno?.nome || '').split(' ')[0] || 'a criança';
  const totalMomentos = thread?.observacoes.length || 0;

  const [texto, setTexto] = useState('');
  const [imagem, setImagem] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [excluirObs, setExcluirObs] = useState<ObservacaoThread | null>(null);
  const [avisoFotoOpen, setAvisoFotoOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const fimRef = useRef<HTMLDivElement>(null);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Aviso da foto ANTES do seletor abrir (uma vez só): a simulação pegou fotos
  // DA CRIANÇA sendo anexadas porque o aviso só aparecia depois, em letra miúda.
  const abrirSeletorFoto = () => {
    let visto = false;
    try {
      visto = localStorage.getItem('infantil-aviso-foto') === 'ok';
    } catch {
      /* sem localStorage */
    }
    if (visto) fileRef.current?.click();
    else setAvisoFotoOpen(true);
  };
  const confirmarAvisoFoto = () => {
    try {
      localStorage.setItem('infantil-aviso-foto', 'ok');
    } catch {
      /* segue */
    }
    setAvisoFotoOpen(false);
    fileRef.current?.click();
  };

  // Long-press no balão próprio = caminho alternativo pra "Corrigir o diário"
  // (a lixeira é discreta de propósito; discreta demais pros segmentos básicos)
  const iniciarLongPress = (obs: ObservacaoThread) => {
    longPressRef.current = setTimeout(() => setExcluirObs(obs), 550);
  };
  const cancelarLongPress = () => {
    if (longPressRef.current) clearTimeout(longPressRef.current);
    longPressRef.current = null;
  };

  const escolherArquivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setImagem(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
    e.target.value = '';
  };

  const removerImagem = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setImagem(null);
    setPreviewUrl(null);
  };

  // Rola pro fim quando as observações carregam/mudam
  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [thread?.observacoes.length]);

  // O avulso NÃO exige fase ativa: antes da fase 1 (adaptação) e depois da 8,
  // o registro segue vivo: grava com fase_id null ("não havia fase de exploração").
  const podeRegistrar = !!user?.id && !!thread?.turmaId;

  const registrar = useMutation({
    mutationFn: async ({ textoObs, file }: { textoObs: string; file: File | null }) => {
      if (!alunoId || !user?.id || !thread?.turmaId) {
        throw new Error('Sem turma, não dá pra registrar agora.');
      }

      // Se há foto, sobe primeiro no bucket privado 'observacoes'.
      // Convenção de caminho: {aluno_id}/{uuid}.{ext}
      let anexoPath: string | null = null;
      if (file) {
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
        // crypto.randomUUID só existe em contexto seguro (https/localhost);
        // no celular via IP da rede (http) ele é undefined: usar fallback.
        const rid =
          typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        const path = `${alunoId}/${rid}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('observacoes')
          .upload(path, file);
        if (upErr) throw upErr;
        anexoPath = path;
      }

      const { error } = await supabase.from('observacoes').insert({
        aluno_id: alunoId,
        professor_id: user.id,
        turma_id: thread.turmaId,
        // null SÓ quando a turma não tem fase ativa (nunca silenciador de bug de carregamento)
        fase_id: faseAtual?.id ?? null,
        institution_id: profile?.institution_id,
        observacao_texto: textoObs,
        anexo_url: anexoPath,
      } as any);
      if (error) throw error;
    },
    // Atualização otimista: a mensagem aparece na hora; reconcilia depois.
    onMutate: async ({ textoObs, file }: { textoObs: string; file: File | null }) => {
      setTexto('');
      removerImagem();
      await queryClient.cancelQueries({ queryKey: ['aluno-thread', alunoId] });
      const prev = queryClient.getQueryData<AlunoThreadData>(['aluno-thread', alunoId]);
      if (prev) {
        const agora = new Date();
        const novaObs: ObservacaoThread = {
          id: `temp-${agora.getTime()}`,
          texto: textoObs,
          data: agora.toISOString().slice(0, 10),
          dataHora: agora.toISOString(),
          origem: 'manual',
          faseNome: faseAtual?.inteligencia?.nome || 'Registro avulso',
          anexoUrl: file ? URL.createObjectURL(file) : undefined,
        };
        queryClient.setQueryData<AlunoThreadData>(['aluno-thread', alunoId], {
          ...prev,
          observacoes: [...prev.observacoes, novaObs],
        });
      }
      return { prev };
    },
    onError: (e: Error, vars, context) => {
      if (context?.prev) queryClient.setQueryData(['aluno-thread', alunoId], context.prev);
      toast.error(e.message || 'Erro ao registrar');
      // NUNCA perder o que foi escrito: devolve texto E foto pro composer
      // (a simulação pegou o textão da noite evaporando quando o wifi caía)
      setTexto(vars.textoObs);
      if (vars.file) {
        setImagem(vars.file);
        setPreviewUrl(URL.createObjectURL(vars.file));
      }
    },
    onSuccess: () => {
      toast.success(`Você enxergou ${primeiroNome}. Mais um momento na história.`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['aluno-thread', alunoId] });
    },
  });

  // Borracha: soft-delete auditado via RPC (nunca DELETE físico; o rio é preservado)
  const excluir = useMutation({
    mutationFn: async ({ obsId, motivo }: { obsId: string; motivo: string }) => {
      const { error } = await (supabase.rpc as any)('excluir_observacao', {
        p_obs_id: obsId,
        p_motivo: motivo,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setExcluirObs(null);
      toast.success('Registro removido. Se quiser, escreva de novo do jeito certo.');
      queryClient.invalidateQueries({ queryKey: ['aluno-thread', alunoId] });
      queryClient.invalidateQueries({ queryKey: ['rajada-turma'] });
      queryClient.invalidateQueries({ queryKey: ['alunos-turmas-com-status'] });
    },
    onError: (e: Error) => {
      toast.error(e.message || 'Não foi possível remover agora.');
    },
  });

  // Agrupa por fase, preservando a ordem cronológica
  const grupos = useMemo(() => {
    const out: { faseNome: string; itens: typeof thread.observacoes }[] = [];
    for (const obs of thread?.observacoes || []) {
      const ultimo = out[out.length - 1];
      if (ultimo && ultimo.faseNome === obs.faseNome) ultimo.itens.push(obs);
      else out.push({ faseNome: obs.faseNome, itens: [obs] });
    }
    return out;
  }, [thread?.observacoes]);

  const enviar = () => {
    const conteudo = texto.trim();
    if ((!conteudo && !imagem) || registrar.isPending || !podeRegistrar) return;
    registrar.mutate({ textoObs: conteudo, file: imagem });
  };

  return (
    <div style={{ backgroundColor: t.bg, minHeight: '100vh' }}>
      {/* Header do aluno (sob o header da instituição) */}
      <div
        className="fixed top-14 left-0 right-0 z-30 glass-light"
        style={{ borderBottom: `1px solid ${t.border}` }}
      >
        <div className="max-w-lg mx-auto h-14 px-2 flex items-center gap-2">
          <button
            onClick={() => navigate('/professor/alunos')}
            className="p-1.5 rounded-full active:scale-95"
            style={{ color: t.textMuted }}
            aria-label="Voltar"
          >
            <ChevronLeft size={22} />
          </button>
          {isLoading ? (
            <Skeleton className="h-9 w-40 rounded" />
          ) : (
            <div className="flex items-center gap-2 min-w-0">
              <Avatar className="h-9 w-9">
                <AvatarImage src={thread?.aluno?.avatarUrl} className="object-cover" />
                <AvatarFallback
                  className="text-xs font-semibold"
                  style={{ backgroundColor: t.accentSoft, color: t.accentText }}
                >
                  {getIniciais(thread?.aluno?.nome || '?')}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: t.text }}>
                  {thread?.aluno?.nome}
                </p>
                <p className="text-[11px]" style={{ color: t.textFaint }}>
                  {[
                    thread?.aluno?.serie
                      ? `${thread.aluno.serie}${thread.aluno.turma ? ` · ${thread.aluno.turma}` : ''}`
                      : null,
                    totalMomentos > 0
                      ? `${totalMomentos} ${totalMomentos === 1 ? 'momento' : 'momentos'}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Thread (o layout já dá pt-14/px-4/pb-24: aqui só limpa o sub-header do aluno) */}
      <div className="pt-16">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-3/4 rounded-2xl" />
            ))}
          </div>
        ) : grupos.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm" style={{ color: t.textMuted }}>
              A história de {primeiroNome} ainda está em branco.
            </p>
            <p className="text-xs mt-1" style={{ color: t.textFaint }}>
              Escreva o primeiro capítulo aqui embaixo.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {grupos.map((grupo, gi) => (
              <div key={gi} className="space-y-2">
                {/* Separador de fase: pílula central estilo "balão de data" */}
                <div className="flex items-center gap-2 my-3">
                  <div className="flex-1 h-px" style={{ backgroundColor: t.border }} />
                  <span
                    className="rounded-full px-3 py-1 text-[11px] font-medium"
                    style={{ backgroundColor: t.accentSoft, color: t.accentText }}
                  >
                    {grupo.faseNome === 'Registro avulso' ? grupo.faseNome : `Exploração ${grupo.faseNome}`}
                  </span>
                  <div className="flex-1 h-px" style={{ backgroundColor: t.border }} />
                </div>

                {grupo.itens.map((obs, oi) => {
                  // Separador de dia dentro da fase: uma fase dura semanas;
                  // sem isso, escanear o rio fica difícil.
                  const diaAnterior = oi > 0 ? grupo.itens[oi - 1].data : null;
                  const mudouDia = obs.data !== diaAnterior && oi > 0;
                  const deOutroProfessor = !!obs.professorId && obs.professorId !== user?.id;
                  return (
                    <div key={obs.id}>
                      {mudouDia && (
                        <div className="flex justify-center my-2.5">
                          <span
                            className="rounded-full px-2.5 py-0.5 text-[10px] font-medium"
                            style={{ backgroundColor: t.surfaceSunken, color: t.textMuted }}
                          >
                            {fmtDia(obs.data)}
                          </span>
                        </div>
                      )}
                      <div
                        className="rounded-2xl rounded-tl-sm p-3 max-w-[85%]"
                        style={{
                          backgroundColor: t.surface,
                          borderLeft: `3px solid ${t.accent}`,
                          boxShadow: t.shadowSm,
                        }}
                        onTouchStart={
                          deOutroProfessor || obs.id.startsWith('temp-')
                            ? undefined
                            : () => iniciarLongPress(obs)
                        }
                        onTouchEnd={cancelarLongPress}
                        onTouchMove={cancelarLongPress}
                      >
                        {deOutroProfessor && obs.professorNome && (
                          <p className="text-[11px] font-semibold mb-0.5" style={{ color: t.accentText }}>
                            {obs.professorNome}
                          </p>
                        )}
                        {obs.texto && (
                          <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: t.text }}>
                            {obs.texto}
                          </p>
                        )}
                        {obs.anexoUrl && (
                          <img
                            src={obs.anexoUrl}
                            alt="Trabalho da criança"
                            className="mt-2 rounded-lg max-h-48 w-auto"
                            style={{ border: '1px solid ' + t.border }}
                          />
                        )}
                        <div className="flex items-center justify-between mt-1.5 gap-2">
                          {/* Borracha, só no registro PRÓPRIO já salvo (não no otimista) */}
                          {obs.professorId === user?.id && !obs.id.startsWith('temp-') ? (
                            <button
                              onClick={() => setExcluirObs(obs)}
                              className="p-3 -m-2.5 rounded-full"
                              style={{ color: t.textFaint }}
                              aria-label="Corrigir: remover este registro"
                            >
                              <Trash2 size={15} />
                            </button>
                          ) : (
                            <span />
                          )}
                          <p className="text-[11px] text-right" style={{ color: t.textFaint }}>
                            {fmtDataHora(obs.dataHora)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
        <div ref={fimRef} />
      </div>

      {/* Campo de registro (fixo embaixo; pb-safe = não encosta na barra de gesto do iPhone) */}
      <div
        className="fixed bottom-0 left-0 right-0 z-30 pb-safe glass-light"
        style={{ borderTop: `1px solid ${t.border}` }}
      >
        {/* Input de arquivo escondido, sem `capture`: câmera OU galeria (pedido do Fundador 02/07) */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={escolherArquivo}
          className="hidden"
        />

        {/* Preview da foto escolhida + frase-guia */}
        {previewUrl && (
          <div className="max-w-lg mx-auto px-3 pt-2.5 flex items-center gap-3">
            <div className="relative flex-shrink-0">
              <img
                src={previewUrl}
                alt="Pré-visualização do trabalho"
                className="h-14 w-14 object-cover rounded-lg"
                style={{ border: `1px solid ${t.border}` }}
              />
              <button
                onClick={removerImagem}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center focus:outline-none focus-visible:ring-2"
                style={{
                  backgroundColor: t.surface,
                  border: `1px solid ${t.border}`,
                  color: t.textMuted,
                  ['--tw-ring-color' as string]: t.accent,
                }}
                aria-label="Remover foto"
              >
                <X size={12} />
              </button>
            </div>
            <p className="text-[11px] leading-snug" style={{ color: t.textFaint }}>
              Foto do trabalho, não da criança
            </p>
          </div>
        )}

        {/* Audiência declarada: mata o recado pra família E o desabafo clínico
            (a simulação pegou metade supondo que a família lê, metade supondo
            sigilo absoluto; as duas suposições erram) */}
        <p className="max-w-lg mx-auto px-3 pt-1.5 text-[10.5px] text-center" style={{ color: t.textFaint }}>
          Só educadores veem este diário. A família não vê.
        </p>

        {/* Chips de início de frase, só com o campo vazio */}
        {podeRegistrar && !texto && (
          <div className="max-w-lg mx-auto px-3 pt-1.5 flex gap-1.5 overflow-x-auto">
            {INICIOS_FRASE.map((c) => (
              <button
                key={c}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setTexto(`${c} `)}
                className="flex-shrink-0 px-2.5 py-1 rounded-full text-xs"
                style={{ backgroundColor: t.surfaceSunken, border: `1px solid ${t.border}`, color: t.textMuted }}
              >
                {c}…
              </button>
            ))}
          </div>
        )}

        <div className="max-w-lg mx-auto px-3 py-2.5 flex items-end gap-2">
          <button
            onClick={abrirSeletorFoto}
            disabled={!podeRegistrar}
            className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-opacity disabled:opacity-40 focus:outline-none focus-visible:ring-2"
            style={{
              backgroundColor: t.surfaceSunken,
              border: `1px solid ${t.border}`,
              color: t.textMuted,
              ['--tw-ring-color' as string]: t.accent,
            }}
            aria-label="Anexar foto do trabalho"
          >
            <ImagePlus size={18} />
          </button>
          <textarea
            value={texto}
            onChange={(e) => {
              setTexto(e.target.value);
              // Auto-grow: observação de 3 linhas não vira fresta com scroll interno
              e.currentTarget.style.height = 'auto';
              e.currentTarget.style.height = `${Math.min(e.currentTarget.scrollHeight, 128)}px`;
            }}
            placeholder={
              podeRegistrar
                ? PERGUNTAS_COMPOSER[diaDeHoje() % PERGUNTAS_COMPOSER.length](primeiroNome)
                : 'Sem turma ativa para registrar'
            }
            disabled={!podeRegistrar}
            rows={1}
            onKeyDown={(e) => {
              // No touch, Enter quebra linha (não há Shift no teclado do celular);
              // o envio é sempre pelo botão. No desktop, Enter envia.
              if (!isTouch && e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                enviar();
              }
            }}
            className="flex-1 resize-none rounded-2xl px-3 py-2 text-sm max-h-32 focus:outline-none focus-visible:ring-2"
            style={{
              backgroundColor: t.surfaceSunken,
              border: `1px solid ${t.border}`,
              color: t.text,
              ['--tw-ring-color' as string]: t.accent,
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = t.accent;
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = t.border;
            }}
          />
          <button
            onClick={enviar}
            disabled={(!texto.trim() && !imagem) || registrar.isPending || !podeRegistrar}
            className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-opacity disabled:opacity-40"
            style={{ backgroundColor: t.accent, color: '#FFFFFF', boxShadow: t.shadowSm }}
            aria-label="Registrar"
          >
            <Send size={18} />
          </button>
        </div>
      </div>

      {excluirObs && thread?.aluno && (
        <ExcluirModal
          alunoNome={thread.aluno.nome}
          loading={excluir.isPending}
          onConfirmar={(motivo) => excluir.mutate({ obsId: excluirObs.id, motivo })}
          onFechar={() => setExcluirObs(null)}
        />
      )}

      {/* Aviso da foto, ANTES do seletor, uma vez só */}
      {avisoFotoOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md"
          style={{ backgroundColor: 'rgba(28,34,48,0.30)' }}
          onClick={() => setAvisoFotoOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Sobre a foto"
        >
          <div
            className="w-full max-w-[340px] rounded-2xl overflow-hidden"
            style={{ backgroundColor: t.surface, boxShadow: t.shadowLg }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ height: 3, backgroundColor: t.accent }} />
            <div className="p-5 space-y-3">
              <h2 className="text-base font-bold leading-snug" style={{ color: t.text }}>
                Fotografe o trabalho, não a criança.
              </h2>
              <p className="text-sm leading-relaxed" style={{ color: t.textMuted }}>
                A torre, o desenho, a coleção: o que as mãos dela fizeram. O rosto dela não
                entra no diário.
              </p>
              <button
                onClick={confirmarAvisoFoto}
                autoFocus
                className="w-full rounded-xl py-3 text-sm font-semibold"
                style={{ backgroundColor: t.accent, color: '#FFFFFF', boxShadow: t.shadowMd }}
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InfantilAlunoThreadPage;
