import { useState, useMemo, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Send, ImagePlus, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfessor } from '@/contexts/ProfessorContext';
import { useAlunoThread, type AlunoThreadData, type ObservacaoThread } from '@/hooks/useAlunoThread';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { infantilTheme as t } from '@/styles/infantilTheme';

const getIniciais = (nome: string) => {
  const parts = nome.split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

const fmtDataHora = (iso: string) => {
  try {
    return format(parseISO(iso), "d 'de' MMM 'às' HH:mm", { locale: ptBR });
  } catch {
    return iso;
  }
};

/**
 * Thread de observações de um aluno — estilo conversa (WhatsApp).
 * O "rio" do Infantil: cada observação é uma mensagem; agrupadas por fase.
 * Campo livre embaixo = registro avulso (a qualquer hora). Inc.2.
 */
const InfantilAlunoThreadPage = () => {
  const { id: alunoId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { faseAtual, profile } = useProfessor();
  const { data: thread, isLoading } = useAlunoThread(alunoId);

  const primeiroNome = (thread?.aluno?.nome || '').split(' ')[0] || 'a criança';
  const totalMomentos = thread?.observacoes.length || 0;

  const [texto, setTexto] = useState('');
  const [imagem, setImagem] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const fimRef = useRef<HTMLDivElement>(null);

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

  const podeRegistrar = !!user?.id && !!thread?.turmaId && !!faseAtual?.id;

  const registrar = useMutation({
    mutationFn: async ({ textoObs, file }: { textoObs: string; file: File | null }) => {
      if (!alunoId || !user?.id || !thread?.turmaId || !faseAtual?.id) {
        throw new Error('Sem fase ativa ou turma — não dá pra registrar agora.');
      }

      // Se há foto, sobe primeiro no bucket privado 'observacoes'.
      // Convenção de caminho: {aluno_id}/{uuid}.{ext}
      let anexoPath: string | null = null;
      if (file) {
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
        // crypto.randomUUID só existe em contexto seguro (https/localhost);
        // no celular via IP da rede (http) ele é undefined — usar fallback.
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
        fase_id: faseAtual.id,
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
          faseNome:
            faseAtual?.inteligencia?.nome || prev.observacoes.at(-1)?.faseNome || 'Fase',
          anexoUrl: file ? URL.createObjectURL(file) : undefined,
        };
        queryClient.setQueryData<AlunoThreadData>(['aluno-thread', alunoId], {
          ...prev,
          observacoes: [...prev.observacoes, novaObs],
        });
      }
      return { prev };
    },
    onError: (e: Error, _vars, context) => {
      if (context?.prev) queryClient.setQueryData(['aluno-thread', alunoId], context.prev);
      toast.error(e.message || 'Erro ao registrar');
    },
    onSuccess: () => {
      toast.success(`Você enxergou ${primeiroNome}. Mais um momento na história. 🌱`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['aluno-thread', alunoId] });
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
        className="fixed top-14 left-0 right-0 z-30"
        style={{ backgroundColor: t.surface, borderBottom: `1px solid ${t.border}` }}
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

      {/* Thread */}
      <div className="max-w-lg mx-auto px-4 pt-32 pb-28">
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
                {/* Separador de fase — pílula central estilo "balão de data" */}
                <div className="flex items-center gap-2 my-3">
                  <div className="flex-1 h-px" style={{ backgroundColor: t.border }} />
                  <span
                    className="rounded-full px-3 py-1 text-[11px] font-medium"
                    style={{ backgroundColor: t.accentSoft, color: t.accentText }}
                  >
                    Fase {grupo.faseNome}
                  </span>
                  <div className="flex-1 h-px" style={{ backgroundColor: t.border }} />
                </div>

                {grupo.itens.map((obs) => (
                  <div
                    key={obs.id}
                    className="rounded-2xl rounded-tl-sm p-3 max-w-[85%]"
                    style={{
                      backgroundColor: t.surface,
                      borderLeft: `3px solid ${t.accent}`,
                      boxShadow: t.shadowSm,
                    }}
                  >
                    {obs.texto && (
                      <p className="text-sm leading-relaxed" style={{ color: t.text }}>
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
                    <p className="text-[11px] mt-1.5 text-right" style={{ color: t.textFaint }}>
                      {fmtDataHora(obs.dataHora)}
                    </p>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
        <div ref={fimRef} />
      </div>

      {/* Campo de registro (fixo embaixo) */}
      <div
        className="fixed bottom-0 left-0 right-0 z-30"
        style={{ backgroundColor: t.surface, borderTop: `1px solid ${t.border}` }}
      >
        {/* Input de arquivo escondido — câmera traseira por padrão no celular */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
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
              Foto do trabalho, não da criança 🌿
            </p>
          </div>
        )}

        <div className="max-w-lg mx-auto px-3 py-2.5 flex items-end gap-2">
          <button
            onClick={() => fileRef.current?.click()}
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
            onChange={(e) => setTexto(e.target.value)}
            placeholder={podeRegistrar ? `O que ${primeiroNome} te mostrou hoje?` : 'Sem fase ativa para registrar'}
            disabled={!podeRegistrar}
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
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
    </div>
  );
};

export default InfantilAlunoThreadPage;
