import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Histórico de UM aluno para o visor do coordenador (só leitura). Hoje a única
 * fonte com dado real é `observacoes`; o tipo `fonte` já prevê somar outras
 * (entregas de missão, desafios, diário) conforme elas passem a ter conteúdo.
 *
 * ESCOPO: imposto no banco (RLS). O coordenador só lê observações das turmas do
 * seu segmento; um aluno fora do escopo devolve perfil nulo → tela "fora do
 * escopo". Nada de recorte é decidido aqui.
 *
 * Doutrina: isto é um REGISTRO DE PROCESSO (o que foi observado, por quem,
 * quando), nunca um placar nem um rótulo da criança.
 */

const fromAny = (tb: string) =>
  (supabase.from as never as (tb: string) => ReturnType<typeof supabase.from>)(tb);

const nomeCurto = (p: { full_name?: string | null; nome?: string | null; sobrenome?: string | null }) =>
  p.full_name || [p.nome, p.sobrenome].filter(Boolean).join(' ') || 'Aluno';

export interface AlunoHistoricoItem {
  id: string;
  fonte: 'observacao';
  turmaNome: string | null;
  professorNome: string | null;
  faseNome: string | null;
  texto: string;
  createdAt: string;
}

export interface CoordenadorAlunoDetalhe {
  id: string;
  nome: string;
  avatarUrl?: string;
  turmaNome: string | null;
  serie: string | null;
  segmento: string | null;
  totalObservacoes: number;
  historico: AlunoHistoricoItem[];
}

export const useCoordenadorAluno = (alunoId?: string | null) => {
  return useQuery({
    queryKey: ['coordenador-aluno', alunoId],
    enabled: !!alunoId,
    retry: false,
    staleTime: 30_000,
    queryFn: async (): Promise<CoordenadorAlunoDetalhe | null> => {
      if (!alunoId) return null;

      // Perfil (se a RLS não liberar, some → fora do escopo).
      const { data: prof } = await supabase
        .from('profiles')
        .select('id, full_name, nome, sobrenome, avatar_url')
        .eq('id', alunoId)
        .maybeSingle();
      if (!prof) return null;

      const [obsRes, turmaRes] = await Promise.all([
        fromAny('observacoes')
          .select('id, turma_id, professor_id, inteligencia_fase, observacao_texto, created_at')
          .eq('aluno_id', alunoId)
          .is('excluida_em', null)
          .order('created_at', { ascending: false })
          .limit(200),
        // Turma ativa do aluno (para o cabeçalho).
        supabase
          .from('aluno_turma')
          .select('turma_id, turmas!inner ( nome, serie, segmento )')
          .eq('aluno_id', alunoId)
          .eq('ativo', true)
          .limit(1),
      ]);

      const obs = (obsRes.data as Array<{
        id: string;
        turma_id: string | null;
        professor_id: string | null;
        inteligencia_fase: number | null;
        observacao_texto: string | null;
        created_at: string;
      }> | null) || [];

      // Nomes de turma e professor + nome de inteligência (fase).
      const turmaIds = [...new Set(obs.map((o) => o.turma_id).filter(Boolean) as string[])];
      const profIds = [...new Set(obs.map((o) => o.professor_id).filter(Boolean) as string[])];
      const [turmasRes, profsRes, intelRes] = await Promise.all([
        turmaIds.length > 0
          ? supabase.from('turmas').select('id, nome').in('id', turmaIds)
          : Promise.resolve({ data: [] as any[] }),
        profIds.length > 0
          ? supabase.from('profiles').select('id, full_name, nome, sobrenome').in('id', profIds)
          : Promise.resolve({ data: [] as any[] }),
        supabase.from('inteligencias').select('id, nome'),
      ]);

      const turmaNomeMap = new Map<string, string>();
      for (const tr of (turmasRes.data as any[] | null) || []) turmaNomeMap.set(tr.id, tr.nome);
      const profMap = new Map<string, string>();
      for (const p of (profsRes.data as any[] | null) || []) profMap.set(p.id, nomeCurto(p).split(' ')[0]);
      const intelMap = new Map<number, string>();
      for (const i of (intelRes.data as Array<{ id: number; nome: string }> | null) || []) intelMap.set(i.id, i.nome);

      const historico: AlunoHistoricoItem[] = obs.map((o) => ({
        id: o.id,
        fonte: 'observacao',
        turmaNome: o.turma_id ? turmaNomeMap.get(o.turma_id) ?? null : null,
        professorNome: o.professor_id ? profMap.get(o.professor_id) ?? null : null,
        faseNome: o.inteligencia_fase ? intelMap.get(o.inteligencia_fase) ?? null : null,
        texto: o.observacao_texto || '',
        createdAt: o.created_at,
      }));

      const turmaAtiva = ((turmaRes.data as any[] | null) || [])[0]?.turmas as
        | { nome?: string; serie?: string | number | null; segmento?: string | null }
        | undefined;

      return {
        id: prof.id,
        nome: nomeCurto(prof),
        avatarUrl: (prof as { avatar_url?: string | null }).avatar_url || undefined,
        turmaNome: turmaAtiva?.nome ?? null,
        serie: turmaAtiva?.serie == null ? null : String(turmaAtiva.serie),
        segmento: turmaAtiva?.segmento ?? null,
        totalObservacoes: historico.length,
        historico,
      };
    },
  });
};
