import { supabase } from '@/integrations/supabase/client';

/**
 * LOG de leitura do coordenador (coordenador_leitura_log). Mitigação central da
 * decisão de 14/07: o coordenador passou a ter acesso em massa ao TEXTO das
 * observações do seu segmento; registrar quem leu, quando e qual turma é a
 * garantia de rastreabilidade que ficou (e ficou mais importante).
 *
 * FIRE-AND-FORGET por design: nunca bloqueia a UI, nunca lança. coordenador_id é
 * preenchido no banco (default auth.uid()) mas mandamos também para clareza;
 * qualquer falha (tabela ausente antes da migration, rede) é engolida.
 */
const fromAny = (tb: string) =>
  (supabase.from as never as (tb: string) => ReturnType<typeof supabase.from>)(tb);

export type ContextoLeitura = 'mural' | 'turma' | 'aluno' | 'casa';

export const logCoordenadorLeitura = (
  coordenadorId: string | null | undefined,
  turmaId: string | null,
  contexto: ContextoLeitura
): void => {
  if (!coordenadorId) return;
  try {
    void fromAny('coordenador_leitura_log')
      .insert({ coordenador_id: coordenadorId, turma_id: turmaId ?? null, contexto })
      .then(() => undefined, () => undefined);
  } catch {
    /* silencioso por design */
  }
};

/** Versão em lote (uma turma por linha), para a aba Gestão que mostra vários murais. */
export const logCoordenadorLeituraLote = (
  coordenadorId: string | null | undefined,
  turmaIds: string[],
  contexto: ContextoLeitura
): void => {
  if (!coordenadorId || turmaIds.length === 0) return;
  try {
    const rows = turmaIds.map((turma_id) => ({ coordenador_id: coordenadorId, turma_id, contexto }));
    void fromAny('coordenador_leitura_log')
      .insert(rows)
      .then(() => undefined, () => undefined);
  } catch {
    /* silencioso por design */
  }
};
