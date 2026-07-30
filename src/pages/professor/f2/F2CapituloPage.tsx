import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  Paperclip,
  Users,
  ScrollText,
  Plus,
  X,
  Search,
  Send,
  Shield,
  Route as RouteIcon,
  PenLine,
  CheckCircle2,
  Clock,
  Split,
  Merge,
  ArrowLeftRight,
  MessageSquare,
  Trophy,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useProfessor } from '@/contexts/ProfessorContext';
import { corDaCasa, F2_REFORMA_ATIVA } from '@/config/f2Reforma';
import { useTurmasF2Instituicao, type TurmaF2Diario } from '@/hooks/useF2Diario';
import { formatTurmaLabel } from '@/lib/infantil';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import LequeObservacao from '@/components/professor/LequeObservacao';
import { GrupoConversaModal } from '@/components/professor/GrupoConversaModal';
import BlocoObservacaoAoVivo from '@/components/professor/f2/BlocoObservacaoAoVivo';

/**
 * ADMINISTRAR CAPÍTULO: Fundamental 2 (reforma, atrás do flag F2_REFORMA_ATIVA).
 *
 * Centro de comando do mentor para UMA turma cuja vez é da Casa dele. Pele
 * IMERSIVA: índigo profundo (o mesmo santuário das Inteligências), tingido pela
 * COR DA CASA da fase (corDaCasa). Texto branco, cards em branco translúcido, a
 * cor da Casa como acento (brasão, selos, papéis cheios, botões).
 *
 * Reaproveita o MODELO DE DADOS e a LÓGICA da tela clara anterior sem tocar o
 * comportamento: só a pele mudou (claro -> imersivo). A tela escura antiga
 * (CapituloProfessorPage) segue servindo o F2 com o flag desligado.
 *
 * Estado "Capítulo ainda não liberado": quando a fase/Casa da turma ainda não
 * tem capítulo montado (sem capítulo ativo, OU capítulo sem papéis), em vez de
 * tela vazia mostramos uma tela imersiva limpa na cor da Casa. Hoje só a Casa
 * Interpessoal (A Grande Assembleia) tem elenco montado; as outras caem nesse
 * estado até ganharem o próprio layout (ver PONTO DE ESCOLHA POR CASA abaixo).
 */

// Tabelas da reforma podem não estar nos tipos gerados: via `sb` (any), como as
// demais telas do capítulo, para o build não quebrar por tipagem.
const sb = supabase as any;

type Categoria = 'mesa' | 'mediador' | 'observatorio' | 'delegacao' | 'time';

interface Capitulo {
  id: string;
  numero: number;
  nome: string;
  frase_ancora: string | null;
  descricao: string | null;
  institution_id: string;
  fase_id: string;
}
interface TurmaInfo {
  id: string;
  nome: string;
  serie: string | null;
  turma_letra: string | null;
}
interface Encontro {
  id: string;
  ordem: number;
  titulo: string;
  objetivo: string | null;
  instrucoes: string | null;
}
interface Anexo {
  id: string;
  encontro_id: string;
  url: string;
  nome: string | null;
  tipo: string | null;
}
interface EncontroTurma {
  encontro_id: string;
  data_prevista: string | null;
  realizado: boolean;
}
interface Papel {
  id: string;
  nome: string;
  categoria: Categoria;
  delegacao: string | null;
  descricao_curta: string | null;
  vagas_por_turma: number;
  ordem: number;
  time_label: string | null;
}
interface Delegacao {
  id: string;
  codigo: string;
  nome: string;
  objetivo: string | null;
  ordem: number;
}
interface Alocacao {
  id: string;
  papel_id: string;
  aluno_id: string;
  grupo?: number | null; // subgrupo (1|2) do time; ausente = 1 (formato Assembleia / pré-migration)
}
interface MembroDelegacao {
  id: string;
  delegacao_codigo: string;
  aluno_id: string;
}
interface Aluno {
  id: string;
  nome: string | null;
  full_name: string | null;
  avatar_url: string | null;
  casa_id: number | null;
}
interface GrupoMeta {
  numero: number;
  subtema: string | null;
}
interface TurmaConfig {
  id?: string;
  data_evento: string | null;
  delegacoes_ativas: string[];
  missoes_liberadas_em?: string | null;
  missoes_data_prazo?: string | null;
  times_divididos?: string[]; // legado: papel_ids que o mentor dividiu (formato antigo de 2 grupos)
  time_grupos?: Record<string, GrupoMeta[]>; // por papel_id (tema): grupos {numero, subtema}. N grupos.
}
interface Missao {
  id: string;
  titulo: string;
  papel_id: string | null;
  para_membros_delegacao: boolean | null;
  status: string | null;
  entrega_coletiva: boolean | null;
}
type Brasoes = Record<number, string | null>;

const MAX_MEMBROS_DELEG = 99;

// ============================================================
// Paleta IMERSIVA (escuro). Tudo que é acento vem de corDaCasa (accent);
// os tons neutros abaixo são fixos (branco translúcido sobre o índigo).
// ============================================================
const D = {
  text: '#FFFFFF',
  soft: 'rgba(244,246,255,0.92)',
  sub: 'rgba(244,246,255,0.62)',
  faint: 'rgba(244,246,255,0.5)',
  line: 'rgba(255,255,255,0.14)',
  card: 'rgba(255,255,255,0.05)',
  card2: 'rgba(255,255,255,0.08)',
  chip: 'rgba(255,255,255,0.09)',
  sunken: 'rgba(0,0,0,0.22)',
  presente: '#34D399', // verde sóbrio, legível no escuro
  silencio: 'rgba(255,255,255,0.3)', // ausência de registro; nunca "falta"
} as const;

// Sufixos de opacidade em hex (accent + alpha) para tingir sem util de cor:
const A = {
  a08: '14', // ~8%
  a10: '1A', // ~10%
  a15: '26', // ~15%
  a20: '33', // ~20%
  a34: '57', // ~34%
  a40: '66', // ~40%
  glow: '4D', // ~30%
} as const;

// ============================================================
// Derivação de cor por Casa (contraste). O Fundador definiu: fundo ESCURO na
// matiz da Casa + LETRAS claras (alto contraste); a cor da Casa nunca no corpo
// do texto, só como acento (traço, chip, borda, ícone). Como as 8 cores canônicas
// variam muito de luminância (ex.: ouro #B8860B, vinho #7F1D1D, marrom #78350F),
// derivamos por HSL 3 tons por Casa, garantindo legibilidade AA nas 8:
//  - corFundo/corFundoTopo: fundo PROFUNDO (texto branco lê bem);
//  - corAcento: versão CLARA e saturada, pra ícones/rótulos/bordas sobre o escuro;
//  - corSolida: cor RICA pra preenchimentos com TEXTO BRANCO (brasão, botões),
//    escurecida só nas Casas claras o bastante pro branco passar (~5:1).
// ============================================================
type RGB = [number, number, number];

const _hexToRgb = (hex: string): RGB => {
  const h = hex.replace('#', '');
  const n = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const int = parseInt(n, 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
};
const _toHex = (v: number): string =>
  Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0');
const _rgbToHex = ([r, g, b]: RGB): string => `#${_toHex(r)}${_toHex(g)}${_toHex(b)}`;

const _rgbToHsl = ([r, g, b]: RGB): [number, number, number] => {
  const rr = r / 255,
    gg = g / 255,
    bb = b / 255;
  const max = Math.max(rr, gg, bb),
    min = Math.min(rr, gg, bb);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0, l];
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rr) h = (gg - bb) / d + (gg < bb ? 6 : 0);
  else if (max === gg) h = (bb - rr) / d + 2;
  else h = (rr - gg) / d + 4;
  return [h / 6, s, l];
};
const _hue = (p: number, q: number, t: number): number => {
  let tt = t;
  if (tt < 0) tt += 1;
  if (tt > 1) tt -= 1;
  if (tt < 1 / 6) return p + (q - p) * 6 * tt;
  if (tt < 1 / 2) return q;
  if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
  return p;
};
const _hslToRgb = ([h, s, l]: [number, number, number]): RGB => {
  if (s === 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [_hue(p, q, h + 1 / 3) * 255, _hue(p, q, h) * 255, _hue(p, q, h - 1 / 3) * 255];
};
const _relLum = ([r, g, b]: RGB): number => {
  const f = (c: number) => {
    const cc = c / 255;
    return cc <= 0.03928 ? cc / 12.92 : Math.pow((cc + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};

/** Fundo imersivo PROFUNDO na matiz da Casa (texto branco lê bem nas 8). */
const corFundo = (base: string): string => {
  const [h, s] = _rgbToHsl(_hexToRgb(base));
  return _rgbToHex(_hslToRgb([h, Math.min(s, 0.55), 0.11]));
};
/** Topo do gradiente: a mesma matiz, um tico mais viva. */
const corFundoTopo = (base: string): string => {
  const [h, s] = _rgbToHsl(_hexToRgb(base));
  return _rgbToHex(_hslToRgb([h, Math.min(s, 0.6), 0.17]));
};
/** Acento LEGÍVEL: matiz da Casa, clara e saturada, pra ícones/rótulos/traços/
 *  bordas sobre o fundo escuro. Nunca no corpo do texto (esse é branco/claro). */
const corAcento = (base: string): string => {
  const [h, s] = _rgbToHsl(_hexToRgb(base));
  return _rgbToHex(_hslToRgb([h, Math.max(s, 0.55), 0.66]));
};
/** Acento SÓLIDO: cor rica da Casa pra preenchimentos com TEXTO BRANCO (brasão,
 *  botões). Só escurece as Casas claras o bastante pro branco passar (AA ~5:1). */
const corSolida = (base: string): string => {
  const rgb = _hexToRgb(base);
  if (_relLum(rgb) <= 0.16) return base;
  const [h, s] = _rgbToHsl(rgb);
  let l = 0.3;
  let out = _hslToRgb([h, s, l]);
  while (_relLum(out) > 0.16 && l > 0.08) {
    l -= 0.02;
    out = _hslToRgb([h, s, l]);
  }
  return _rgbToHex(out);
};

const nomeCompleto = (a: Aluno | undefined): string =>
  !a ? 'Aluno' : a.full_name || a.nome || 'Aluno';

const normalizar = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const filtrarAlunos = (lista: Aluno[], busca: string): Aluno[] => {
  const q = normalizar(busca.trim());
  if (!q) return lista;
  return lista.filter((a) => normalizar(nomeCompleto(a)).includes(q));
};

/** Formata YYYY-MM-DD para "12 de agosto" (meio-dia p/ evitar salto de fuso). */
const dataLonga = (iso: string): string => {
  try {
    return new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'long',
    });
  } catch {
    return iso;
  }
};

/** Brasão/escudo da Casa em placa preenchida (cabeçalho e "não liberado"). */
const BrasaoCasa = ({
  accent,
  brasao,
  size = 56,
}: {
  accent: string;
  brasao: string | null;
  size?: number;
}) => (
  <span
    className="rounded-2xl flex items-center justify-center flex-shrink-0 mx-auto"
    style={{
      width: size,
      height: size,
      background: `linear-gradient(160deg, ${accent}, ${accent}CC)`,
      boxShadow: `0 8px 22px ${accent}${A.glow}, inset 0 1px 0 rgba(255,255,255,0.35)`,
    }}
  >
    {brasao ? (
      <img src={brasao} alt="" className="object-contain p-1.5 w-full h-full" />
    ) : (
      <Shield size={size * 0.5} color="#FFFFFF" strokeWidth={1.7} />
    )}
  </span>
);

/** Avatar pequeno do aluno (foto, brasão da casa ou inicial) sobre o escuro. */
const AvatarAluno = ({ aluno, brasoes, size = 22 }: { aluno: Aluno | undefined; brasoes: Brasoes; size?: number }) => {
  const brasao = aluno?.casa_id ? brasoes[aluno.casa_id] : null;
  const inicial = nomeCompleto(aluno).slice(0, 1).toUpperCase();
  return (
    <span
      className="rounded-full flex items-center justify-center font-bold overflow-hidden flex-shrink-0"
      style={{
        width: size,
        height: size,
        backgroundColor: 'rgba(255,255,255,0.14)',
        color: '#FFFFFF',
        border: '1px solid rgba(255,255,255,0.3)',
        fontSize: size * 0.42,
      }}
    >
      {aluno?.avatar_url ? (
        <img src={aluno.avatar_url} alt="" className="w-full h-full object-cover" />
      ) : brasao ? (
        <img src={brasao} alt="" className="w-full h-full object-contain p-[1px]" />
      ) : (
        inicial
      )}
    </span>
  );
};

/** Título de seção com ícone, sobre o escuro (ícone na cor da Casa). */
const SecaoTitulo = ({ icon, accent, children }: { icon: React.ReactNode; accent: string; children: React.ReactNode }) => (
  <div className="flex items-center gap-2 mb-2.5 px-0.5">
    <span style={{ color: accent }}>{icon}</span>
    <h2 className="text-[13px] tracking-[0.14em] uppercase font-bold" style={{ color: D.text }}>
      {children}
    </h2>
  </div>
);

// ============================================================
// Página
// ============================================================
const F2CapituloPage = () => {
  const navigate = useNavigate();
  const { turmaId } = useParams<{ turmaId: string }>();
  const qc = useQueryClient();
  const { profile, casaMentor, segmento, isLoading: ctxLoading } = useProfessor();

  // Tons derivados da cor da Casa (contraste AA nas 8): fundo escuro na matiz,
  // acento CLARO pra foreground (o `accent` propagado pra tudo), e um tom sólido
  // rico só pros preenchimentos com texto branco (brasão, botões).
  const casaBase = corDaCasa(casaMentor?.id);
  const accent = corAcento(casaBase);
  const accentSolid = corSolida(casaBase);
  const bgDeep = corFundo(casaBase);
  const bgTop = corFundoTopo(casaBase);
  const anoLetivo = new Date().getFullYear();

  // Só o F2 reformado entra aqui. Segmento errado / flag off: volta pra home.
  useEffect(() => {
    if (ctxLoading) return;
    if (!F2_REFORMA_ATIVA || segmento !== 'fundamental2') navigate('/professor', { replace: true });
  }, [ctxLoading, segmento, navigate]);

  // ---- Turma ----
  const { data: turma } = useQuery<TurmaInfo | null>({
    queryKey: ['f2cap-turma', turmaId],
    enabled: !!turmaId,
    queryFn: async () => {
      const { data } = await sb.from('turmas').select('id, nome, serie, turma_letra').eq('id', turmaId!).maybeSingle();
      return (data as TurmaInfo | null) ?? null;
    },
  });

  // ---- Turmas do F2 (para o seletor no topo) ----
  // Mesma fonte da aba Diário (F2AlunosPage): TODAS as turmas do F2 da instituição
  // (acesso compartilhado, sem vinculação por turma). Trocar de turma no seletor
  // navega para o capítulo daquela turma; a atual fica destacada/desabilitada.
  const { data: turmasF2 = [] } = useTurmasF2Instituicao(profile?.institution_id);

  // ---- Capítulo ativo da fase da Casa do mentor ----
  const { data: capitulo, isLoading: loadingCap } = useQuery<Capitulo | null>({
    queryKey: ['f2cap-capitulo', profile?.institution_id, casaMentor?.id, anoLetivo],
    enabled: !!profile?.institution_id && !!casaMentor?.id,
    queryFn: async () => {
      const { data: fase } = await sb
        .from('fases')
        .select('id')
        .eq('institution_id', profile!.institution_id)
        .eq('segmento', 'fundamental2')
        .eq('ano_letivo', anoLetivo)
        .eq('inteligencia_id', casaMentor!.id)
        .maybeSingle();
      if (!fase) return null;
      const { data: cap } = await sb
        .from('capitulos')
        .select('id, numero, nome, frase_ancora, descricao_convocacao, institution_id, fase_id')
        .eq('institution_id', profile!.institution_id)
        .eq('fase_id', fase.id)
        .eq('ativo', true)
        .maybeSingle();
      if (!cap) return null;
      return {
        id: cap.id,
        numero: cap.numero,
        nome: cap.nome,
        frase_ancora: cap.frase_ancora ?? null,
        descricao: cap.descricao_convocacao ?? null,
        institution_id: cap.institution_id,
        fase_id: cap.fase_id,
      } as Capitulo;
    },
  });

  const capId = capitulo?.id ?? null;

  // ---- Encontros + anexos + instância por turma ----
  const { data: encontros = [] } = useQuery<Encontro[]>({
    queryKey: ['f2cap-encontros', capId],
    enabled: !!capId,
    queryFn: async () => {
      const { data } = await sb
        .from('capitulo_encontros')
        .select('id, ordem, titulo, objetivo, instrucoes')
        .eq('capitulo_id', capId!)
        .order('ordem');
      return (data as Encontro[]) ?? [];
    },
  });

  const encontroIds = useMemo(() => encontros.map((e) => e.id), [encontros]);

  const { data: anexos = [] } = useQuery<Anexo[]>({
    queryKey: ['f2cap-anexos', capId, encontroIds.length],
    enabled: encontroIds.length > 0,
    queryFn: async () => {
      const { data } = await sb
        .from('capitulo_encontro_anexos')
        .select('id, encontro_id, url, nome, tipo, ordem')
        .in('encontro_id', encontroIds)
        .order('ordem');
      return (data as Anexo[]) ?? [];
    },
  });

  const { data: encontroTurma = [], refetch: refetchEncTurma } = useQuery<EncontroTurma[]>({
    queryKey: ['f2cap-encontro-turma', capId, turmaId, encontroIds.length],
    enabled: encontroIds.length > 0 && !!turmaId,
    queryFn: async () => {
      const { data } = await sb
        .from('capitulo_encontro_turma')
        .select('encontro_id, data_prevista, realizado')
        .eq('turma_id', turmaId!)
        .in('encontro_id', encontroIds);
      return (data as EncontroTurma[]) ?? [];
    },
  });

  // ---- Papéis / delegações / alocações / membros ----
  const { data: papeis = [], isLoading: loadingPapeis } = useQuery<Papel[]>({
    queryKey: ['f2cap-papeis', capId],
    enabled: !!capId,
    queryFn: async () => {
      const { data } = await sb
        .from('capitulo_papeis')
        .select('id, nome, categoria, delegacao, descricao_curta, vagas_por_turma, ordem, time_label')
        .eq('capitulo_id', capId!)
        .order('ordem');
      return (data as Papel[]) ?? [];
    },
  });

  const { data: delegacoes = [] } = useQuery<Delegacao[]>({
    queryKey: ['f2cap-delegacoes', capId],
    enabled: !!capId,
    queryFn: async () => {
      const { data } = await sb
        .from('capitulo_delegacoes')
        .select('id, codigo, nome, objetivo, ordem')
        .eq('capitulo_id', capId!)
        .order('ordem');
      return (data as Delegacao[]) ?? [];
    },
  });

  const { data: turmaConfig, refetch: refetchConfig } = useQuery<TurmaConfig | null>({
    queryKey: ['f2cap-config', capId, turmaId],
    enabled: !!capId && !!turmaId,
    queryFn: async () => {
      // select('*') tolera a coluna `times_divididos` existir ou não (pré/pós
      // migration do formato times), sem quebrar a config da Assembleia.
      const { data } = await sb
        .from('capitulo_turma_config')
        .select('*')
        .eq('capitulo_id', capId!)
        .eq('turma_id', turmaId!)
        .maybeSingle();
      return (data as TurmaConfig | null) ?? null;
    },
  });

  const { data: alocacoes = [], refetch: refetchAloc } = useQuery<Alocacao[]>({
    queryKey: ['f2cap-aloc', capId, turmaId],
    enabled: !!capId && !!turmaId,
    queryFn: async () => {
      // select('*') tolera a coluna `grupo` existir ou não (pré/pós migration
      // do formato times), sem quebrar a Assembleia se ela ainda não foi aplicada.
      const { data } = await sb
        .from('capitulo_alocacoes')
        .select('*')
        .eq('capitulo_id', capId!)
        .eq('turma_id', turmaId!);
      return (data as Alocacao[]) ?? [];
    },
  });

  const { data: membros = [], refetch: refetchMembros } = useQuery<MembroDelegacao[]>({
    queryKey: ['f2cap-membros', capId, turmaId],
    enabled: !!capId && !!turmaId,
    queryFn: async () => {
      const { data } = await sb
        .from('capitulo_delegacao_membros')
        .select('id, delegacao_codigo, aluno_id')
        .eq('capitulo_id', capId!)
        .eq('turma_id', turmaId!);
      return (data as MembroDelegacao[]) ?? [];
    },
  });

  const { data: alunosDaTurma = [] } = useQuery<Aluno[]>({
    queryKey: ['f2cap-alunos', turmaId],
    enabled: !!turmaId,
    queryFn: async () => {
      const { data } = await sb
        .from('aluno_turma')
        .select('profiles!inner(id, nome, full_name, avatar_url, casa_id)')
        .eq('turma_id', turmaId!)
        .eq('ativo', true);
      const list = ((data ?? []) as any[]).map((r) => r.profiles as Aluno);
      return list.sort((a, b) => nomeCompleto(a).localeCompare(nomeCompleto(b)));
    },
  });

  const { data: brasoes = {} } = useQuery<Brasoes>({
    queryKey: ['f2cap-brasoes'],
    queryFn: async () => {
      const { data } = await sb.from('inteligencias').select('id, brasao_url');
      const map: Brasoes = {};
      ((data ?? []) as any[]).forEach((i) => {
        map[i.id as number] = i.brasao_url ?? null;
      });
      return map;
    },
  });

  const { data: observacoes = [], refetch: refetchObs } = useQuery<{ id: string; aluno_id: string; observacao_texto: string | null }[]>({
    queryKey: ['f2cap-obs', capId, turmaId],
    enabled: !!capId && !!turmaId,
    queryFn: async () => {
      const { data } = await sb
        .from('observacoes')
        .select('id, aluno_id, observacao_texto')
        .eq('capitulo_id', capId!)
        .eq('turma_id', turmaId!)
        .is('excluida_em', null);
      return (data ?? []) as { id: string; aluno_id: string; observacao_texto: string | null }[];
    },
  });

  // ---- Arena: grupos que concorrem (só a Casa Lógico-Matemática tem Arena) ----
  const ehArena = casaMentor?.id === 2;
  const { data: arenaProjetos = [] } = useQuery<{ papel_id: string; grupo: number; concorre: boolean }[]>({
    queryKey: ['f2cap-arena', capId, turmaId],
    enabled: !!capId && !!turmaId && ehArena,
    queryFn: async () => {
      const { data } = await (sb as any)
        .from('capitulo_arena_projeto')
        .select('papel_id, grupo, concorre')
        .eq('capitulo_id', capId!)
        .eq('turma_id', turmaId!);
      return (data ?? []) as { papel_id: string; grupo: number; concorre: boolean }[];
    },
  });
  const concorrePorGrupo = useMemo(() => {
    const m: Record<string, boolean> = {};
    for (const r of arenaProjetos) if (r.concorre) m[`${r.papel_id}::${r.grupo}`] = true;
    return m;
  }, [arenaProjetos]);

  // ---- Missões do capítulo + entregas da turma (faltantes) ----
  const { data: missoes = [] } = useQuery<Missao[]>({
    queryKey: ['f2cap-missoes', capId],
    enabled: !!capId,
    queryFn: async () => {
      const { data } = await sb
        .from('missoes')
        .select('id, titulo, papel_id, para_membros_delegacao, status, entrega_coletiva')
        .eq('capitulo_id', capId!);
      return (data as Missao[]) ?? [];
    },
  });

  const missaoIds = useMemo(() => missoes.map((m) => m.id), [missoes]);
  const alunoIds = useMemo(() => alunosDaTurma.map((a) => a.id), [alunosDaTurma]);

  const { data: entregas = [] } = useQuery<{ missao_id: string; aluno_id: string; grupo_ref: string | null }[]>({
    queryKey: ['f2cap-entregas', missaoIds.length, alunoIds.length, turmaId],
    enabled: missaoIds.length > 0 && alunoIds.length > 0,
    queryFn: async () => {
      const { data } = await sb
        .from('entregas')
        .select('missao_id, aluno_id, grupo_ref')
        .in('missao_id', missaoIds)
        .in('aluno_id', alunoIds);
      return (data ?? []) as { missao_id: string; aluno_id: string; grupo_ref: string | null }[];
    },
  });

  // ---- Derivados ----
  const alunosById = useMemo(() => {
    const m: Record<string, Aluno> = {};
    alunosDaTurma.forEach((a) => {
      m[a.id] = a;
    });
    return m;
  }, [alunosDaTurma]);

  const alocPorPapel = useMemo(() => {
    const m: Record<string, Alocacao[]> = {};
    alocacoes.forEach((a) => {
      (m[a.papel_id] ||= []).push(a);
    });
    return m;
  }, [alocacoes]);

  const anexosPorEncontro = useMemo(() => {
    const m: Record<string, Anexo[]> = {};
    anexos.forEach((a) => {
      (m[a.encontro_id] ||= []).push(a);
    });
    return m;
  }, [anexos]);

  const dataPrevistaPorEncontro = useMemo(() => {
    const m: Record<string, string | null> = {};
    encontroTurma.forEach((e) => {
      m[e.encontro_id] = e.data_prevista ?? null;
    });
    return m;
  }, [encontroTurma]);

  const delegacoesAtivas = useMemo(() => new Set(turmaConfig?.delegacoes_ativas ?? []), [turmaConfig]);

  const membrosPorDelegacao = useMemo(() => {
    const m: Record<string, MembroDelegacao[]> = {};
    membros.forEach((mem) => {
      (m[mem.delegacao_codigo] ||= []).push(mem);
    });
    return m;
  }, [membros]);

  const alunosEmMembros = useMemo(() => new Set(membros.map((m) => m.aluno_id)), [membros]);
  const alunosEmTimeFixo = useMemo(() => {
    const set = new Set<string>();
    alocacoes.forEach((a) => {
      const p = papeis.find((pp) => pp.id === a.papel_id);
      if (p && p.categoria !== 'delegacao') set.add(a.aluno_id);
    });
    return set;
  }, [alocacoes, papeis]);

  const obsByAluno = useMemo(() => {
    const m = new Map<string, { id: string; aluno_id: string; observacao_texto: string | null }>();
    observacoes.forEach((o) => m.set(o.aluno_id, o));
    return m;
  }, [observacoes]);

  // Papel de cada aluno (rótulo), pra roster de observações e faltantes
  const papelDoAluno = useMemo(() => {
    const m: Record<string, string> = {};
    alocacoes.forEach((a) => {
      const p = papeis.find((pp) => pp.id === a.papel_id);
      if (p) m[a.aluno_id] = p.nome;
    });
    membros.forEach((mem) => {
      if (!m[mem.aluno_id]) {
        const d = delegacoes.find((dd) => dd.codigo === mem.delegacao_codigo);
        if (d) m[mem.aluno_id] = d.nome;
      }
    });
    return m;
  }, [alocacoes, membros, papeis, delegacoes]);

  // ---- Canais de chat dos grupos (Arena) ----
  // Garante 1 canal por grupo dividido (idempotente). O aluno NÃO pode criar o
  // canal (RLS); o mentor tem policy ALL. Assim, dividiu em grupos -> os canais
  // existem -> os alunos já enxergam a conversa do grupo. Roda quando o mentor
  // abre a turma ou edita os grupos (cobre grupos criados antes desta feature).
  useEffect(() => {
    if (!capId || !turmaId || !capitulo?.institution_id || !profile?.id) return;
    // Temas = papéis de categoria 'time'.
    const temaIds = new Set(papeis.filter((p) => p.categoria === 'time').map((p) => p.id));
    if (temaIds.size === 0) return;
    // Pares (tema, grupo) que precisam de canal:
    //  (a) todo grupo COM aluno alocado — cobre o time NÃO dividido (grupo 1);
    //  (b) todo grupo definido em time_grupos — cobre grupo dividido ainda vazio.
    const pares = new Set<string>();
    alocacoes.forEach((a) => {
      if (temaIds.has(a.papel_id)) pares.add(`${a.papel_id}::${a.grupo ?? 1}`);
    });
    Object.entries(turmaConfig?.time_grupos ?? {}).forEach(([papelId, gs]) => {
      if (temaIds.has(papelId)) (gs as GrupoMeta[]).forEach((g) => pares.add(`${papelId}::${g.numero}`));
    });
    if (pares.size === 0) return;
    const rows = [...pares].map((k) => {
      const [papelId, grupoStr] = k.split('::');
      return {
        institution_id: capitulo.institution_id,
        capitulo_id: capId,
        turma_id: turmaId,
        papel_id: papelId,
        grupo: Number(grupoStr),
        criado_por: profile.id,
      };
    });
    sb.from('capitulo_grupo_canais').upsert(rows, {
      onConflict: 'capitulo_id,turma_id,papel_id,grupo',
      ignoreDuplicates: true,
    });
  }, [alocacoes, papeis, turmaConfig?.time_grupos, capId, turmaId, capitulo?.institution_id, profile?.id]);

  // Modal de leitura da conversa de um grupo (supervisão do mentor, só leitura).
  const [verConversa, setVerConversa] = useState<
    { papelId: string; grupo: number; titulo: string; subtitulo?: string } | null
  >(null);
  // Bloco de observacao ao vivo (abre a partir de um grupo na apresentacao)
  const [blocoGrupo, setBlocoGrupo] = useState<
    { papelId: string; grupo: number; titulo: string } | null
  >(null);

  // ---- Mutations ----
  const [savingConfig, setSavingConfig] = useState(false);

  const upsertConfig = async (patch: Partial<TurmaConfig>) => {
    if (!capId || !turmaId || !profile?.id) return;
    setSavingConfig(true);
    const proxima = {
      capitulo_id: capId,
      turma_id: turmaId,
      data_evento: turmaConfig?.data_evento ?? null,
      delegacoes_ativas: turmaConfig?.delegacoes_ativas ?? [],
      configurado_por: profile.id,
      // Só carrega times_divididos quando a coluna existe (pós-migration); assim
      // salvar data/missões na Assembleia não tenta escrever coluna inexistente.
      ...(turmaConfig?.times_divididos !== undefined
        ? { times_divididos: turmaConfig.times_divididos }
        : {}),
      // time_grupos: só carrega quando a coluna existe (pós-migration ...0003).
      ...(turmaConfig?.time_grupos !== undefined
        ? { time_grupos: turmaConfig.time_grupos }
        : {}),
      ...patch,
    };
    const { error } = await sb.from('capitulo_turma_config').upsert(proxima, { onConflict: 'capitulo_id,turma_id' });
    setSavingConfig(false);
    if (error) {
      toast.error(error.message || 'Erro ao salvar');
      return;
    }
    refetchConfig();
  };

  const salvarDataEncontro = async (encontroId: string, data: string) => {
    if (!turmaId) return;
    const { error } = await sb
      .from('capitulo_encontro_turma')
      .upsert(
        { encontro_id: encontroId, turma_id: turmaId, data_prevista: data || null },
        { onConflict: 'encontro_id,turma_id' }
      );
    if (error) {
      toast.error(error.message || 'Erro ao salvar a data da etapa');
      return;
    }
    refetchEncTurma();
  };

  const liberarMissoes = async (prazoISO: string) => {
    await upsertConfig({
      missoes_liberadas_em: new Date().toISOString(),
      missoes_data_prazo: prazoISO,
    });
    toast.success(`Missões liberadas. Prazo: ${new Date(prazoISO).toLocaleDateString('pt-BR')}`);
  };

  const alocar = async (papelId: string, alunoId: string) => {
    if (!capId || !turmaId || !profile?.id) return;
    const { error } = await sb
      .from('capitulo_alocacoes')
      .insert({ capitulo_id: capId, papel_id: papelId, aluno_id: alunoId, turma_id: turmaId, alocado_por: profile.id });
    if (error) {
      toast.error(error.message || 'Erro ao alocar');
      return;
    }
    refetchAloc();
    qc.invalidateQueries({ queryKey: ['f2cap-aloc', capId, turmaId] });
  };

  const desalocar = async (id: string) => {
    const { error } = await sb.from('capitulo_alocacoes').delete().eq('id', id);
    if (error) {
      toast.error(error.message || 'Erro ao remover');
      return;
    }
    refetchAloc();
  };

  // Marca/desmarca um grupo como concorrente na Arena (só na Casa Lógico-Matemática).
  const toggleConcorre = async (papelId: string, grupo: number) => {
    if (!capId || !turmaId || !capitulo?.institution_id || !profile?.id) return;
    const novo = !concorrePorGrupo[`${papelId}::${grupo}`];
    const { error } = await (sb as any).from('capitulo_arena_projeto').upsert(
      {
        institution_id: capitulo.institution_id,
        capitulo_id: capId,
        turma_id: turmaId,
        papel_id: papelId,
        grupo,
        concorre: novo,
        criado_por: profile.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'capitulo_id,turma_id,papel_id,grupo' }
    );
    if (error) {
      toast.error('Não deu pra salvar. Tente de novo.');
      return;
    }
    qc.invalidateQueries({ queryKey: ['f2cap-arena', capId, turmaId] });
  };

  const addMembro = async (delegacaoCodigo: string, alunoId: string) => {
    if (!capId || !turmaId || !profile?.id) return;
    const { error } = await sb.from('capitulo_delegacao_membros').insert({
      capitulo_id: capId,
      turma_id: turmaId,
      delegacao_codigo: delegacaoCodigo,
      aluno_id: alunoId,
      alocado_por: profile.id,
    });
    if (error) {
      toast.error(error.message || 'Erro ao adicionar');
      return;
    }
    refetchMembros();
  };

  const removerMembro = async (membroId: string, alunoId: string) => {
    if (!capId || !turmaId) return;
    await sb
      .from('capitulo_alocacoes')
      .delete()
      .eq('capitulo_id', capId)
      .eq('turma_id', turmaId)
      .eq('aluno_id', alunoId);
    const { error } = await sb.from('capitulo_delegacao_membros').delete().eq('id', membroId);
    if (error) {
      toast.error(error.message || 'Erro ao remover');
      return;
    }
    refetchMembros();
    refetchAloc();
  };

  const atribuirPapel = async (papelId: string, alunoId: string) => {
    if (!capId || !turmaId || !profile?.id) return;
    if ((alocPorPapel[papelId] || []).some((a) => a.aluno_id === alunoId)) return;
    const { error } = await sb
      .from('capitulo_alocacoes')
      .insert({ capitulo_id: capId, papel_id: papelId, aluno_id: alunoId, turma_id: turmaId, alocado_por: profile.id });
    if (error) {
      toast.error(error.message || 'Erro ao atribuir');
      return;
    }
    refetchAloc();
  };

  const removerPapelDeAluno = async (papelId: string, alunoId: string) => {
    if (!capId || !turmaId) return;
    const { error } = await sb
      .from('capitulo_alocacoes')
      .delete()
      .eq('capitulo_id', capId)
      .eq('turma_id', turmaId)
      .eq('papel_id', papelId)
      .eq('aluno_id', alunoId);
    if (error) {
      toast.error(error.message || 'Erro');
      return;
    }
    refetchAloc();
  };

  // ---- Times (formato Arena/Musical) ----
  // Alocar um aluno a um TIME (tema/frente), no subgrupo indicado (1|2).
  const alocarTime = async (papelId: string, alunoId: string, grupo: number) => {
    if (!capId || !turmaId || !profile?.id) return;
    const { error } = await sb.from('capitulo_alocacoes').insert({
      capitulo_id: capId,
      papel_id: papelId,
      aluno_id: alunoId,
      turma_id: turmaId,
      grupo,
      alocado_por: profile.id,
    });
    if (error) {
      toast.error(error.message || 'Erro ao alocar');
      return;
    }
    refetchAloc();
  };

  // Mover um aluno para outro grupo do time (qualquer grupo >= 1).
  const moverGrupo = async (alocId: string, grupo: number) => {
    const { error } = await sb.from('capitulo_alocacoes').update({ grupo }).eq('id', alocId);
    if (error) {
      toast.error(error.message || 'Erro ao mover de grupo');
      return;
    }
    refetchAloc();
  };

  // --- Grupos do tema (N grupos + subtema), guardados na config da turma ---
  const gruposDoTema = (papelId: string): GrupoMeta[] =>
    turmaConfig?.time_grupos?.[papelId] ?? [];

  const setGruposDoTema = async (papelId: string, grupos: GrupoMeta[]) => {
    const atual = turmaConfig?.time_grupos ?? {};
    const proximo: Record<string, GrupoMeta[]> = { ...atual };
    if (grupos.length === 0) delete proximo[papelId];
    else proximo[papelId] = grupos;
    await upsertConfig({ time_grupos: proximo });
  };

  // Divide o tema: garante 2 grupos. Quem já estava alocado (grupo 1 por padrão)
  // cai no Grupo 1 automaticamente. Preserva o tema do Grupo 1 se já existir
  // (o time não dividido pode ter só o Grupo 1 com um tema definido).
  const dividirTime = async (papelId: string) => {
    const atuais = gruposDoTema(papelId);
    if (atuais.length > 1) return;
    const g1 = atuais.find((g) => g.numero === 1) ?? { numero: 1, subtema: null };
    await setGruposDoTema(papelId, [g1, { numero: 2, subtema: null }]);
  };

  // Cria mais um grupo no tema (numero = maior existente + 1).
  const criarMaisUmGrupo = async (papelId: string) => {
    const atuais = gruposDoTema(papelId);
    const prox = atuais.length ? Math.max(...atuais.map((g) => g.numero)) + 1 : 1;
    await setGruposDoTema(papelId, [...atuais, { numero: prox, subtema: null }]);
  };

  // Remove um grupo: quem estava nele volta pro Grupo 1.
  const removerGrupo = async (papelId: string, numero: number) => {
    if (!capId || !turmaId) return;
    await sb
      .from('capitulo_alocacoes')
      .update({ grupo: 1 })
      .eq('capitulo_id', capId)
      .eq('turma_id', turmaId)
      .eq('papel_id', papelId)
      .eq('grupo', numero);
    await setGruposDoTema(
      papelId,
      gruposDoTema(papelId).filter((g) => g.numero !== numero)
    );
    refetchAloc();
  };

  // Junta tudo: todos voltam pro Grupo 1 e o tema deixa de estar dividido.
  // Mantém o Grupo 1 (só ele) se tiver tema definido, pra não perder o recorte.
  const juntarTime = async (papelId: string) => {
    if (!capId || !turmaId) return;
    await sb
      .from('capitulo_alocacoes')
      .update({ grupo: 1 })
      .eq('capitulo_id', capId)
      .eq('turma_id', turmaId)
      .eq('papel_id', papelId)
      .neq('grupo', 1);
    const g1 = gruposDoTema(papelId).find((g) => g.numero === 1);
    await setGruposDoTema(papelId, g1?.subtema ? [{ numero: 1, subtema: g1.subtema }] : []);
    refetchAloc();
  };

  // Salva o subtema (recorte) de um grupo já existente.
  const salvarSubtema = async (papelId: string, numero: number, subtema: string) => {
    await setGruposDoTema(
      papelId,
      gruposDoTema(papelId).map((g) =>
        g.numero === numero ? { ...g, subtema: subtema.trim() || null } : g
      )
    );
  };

  // Define o tema do time NÃO dividido (Grupo 1), criando a entrada se preciso.
  const definirTemaUnico = async (papelId: string, texto: string) => {
    const val = texto.trim() || null;
    const atuais = gruposDoTema(papelId);
    if (atuais.some((g) => g.numero === 1)) {
      await salvarSubtema(papelId, 1, texto);
    } else if (val !== null) {
      await setGruposDoTema(papelId, [{ numero: 1, subtema: val }]);
    }
  };

  // ---- Observação ao vivo ----
  const [alunoObs, setAlunoObs] = useState<{ id: string; nome: string; papel: string } | null>(null);
  const [textoObs, setTextoObs] = useState('');
  const [salvandoObs, setSalvandoObs] = useState(false);
  // Busca da grade de alunos (padrão "iniciar aula" do Infantil/F1).
  const [buscaObs, setBuscaObs] = useState('');
  const alunosObsFiltrados = useMemo(
    () => filtrarAlunos(alunosDaTurma, buscaObs),
    [alunosDaTurma, buscaObs]
  );

  const abrirObs = (aluno: Aluno) => {
    const nome = nomeCompleto(aluno);
    const existente = obsByAluno.get(aluno.id);
    setAlunoObs({ id: aluno.id, nome, papel: papelDoAluno[aluno.id] || 'Sem papel' });
    setTextoObs(existente?.observacao_texto || '');
  };

  const fecharObs = () => {
    setAlunoObs(null);
    setTextoObs('');
  };

  const salvarObs = async () => {
    if (!alunoObs || !capitulo || !turmaId || !profile?.id) return;
    if (!textoObs.trim()) {
      toast.error('Escreva algo antes de salvar.');
      return;
    }
    setSalvandoObs(true);
    const existente = obsByAluno.get(alunoObs.id);
    let error: unknown;
    if (existente) {
      const res = await sb
        .from('observacoes')
        .update({ observacao_texto: textoObs.trim(), origem: 'manual' })
        .eq('id', existente.id);
      error = res.error;
    } else {
      const res = await sb.from('observacoes').insert({
        institution_id: capitulo.institution_id,
        aluno_id: alunoObs.id,
        professor_id: profile.id,
        turma_id: turmaId,
        fase_id: capitulo.fase_id,
        capitulo_id: capitulo.id,
        observacao_texto: textoObs.trim(),
        origem: 'manual',
      });
      error = res.error;
    }
    setSalvandoObs(false);
    if (error) {
      toast.error((error as { message?: string }).message || 'Erro ao salvar observação');
      return;
    }
    toast.success('Observação salva');
    refetchObs();
    fecharObs();
  };

  // ---- Dialog state (alocação) ----
  const [papelParaAlocar, setPapelParaAlocar] = useState<Papel | null>(null);
  const [delegParaAddMembro, setDelegParaAddMembro] = useState<Delegacao | null>(null);
  const [timeParaAlocar, setTimeParaAlocar] = useState<{ papel: Papel; grupo: number } | null>(null);

  // ===================== Render =====================
  // Fundo imersivo, reutilizado em todos os estados (carregando / não liberado /
  // montado): índigo profundo tingido no topo pela cor da Casa.
  const fundo = (
    <div
      className="fixed inset-0 z-0"
      style={{
        backgroundColor: bgDeep,
        background: `radial-gradient(125% 92% at 50% -12%, ${accent}22 0%, ${bgTop} 42%, ${bgDeep} 100%)`,
        transition: 'background 500ms ease',
      }}
      aria-hidden="true"
    />
  );

  // Espera o contexto, o capítulo e (se houver capítulo) os papéis resolverem,
  // pra não piscar o estado "não liberado" antes de saber se há elenco.
  const carregando = ctxLoading || loadingCap || (!!capitulo && loadingPapeis);

  if (carregando) {
    return (
      <>
        {fundo}
        <div className="relative z-10 pt-24 flex justify-center" aria-live="polite" aria-busy="true">
          <div
            className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2"
            style={{ borderColor: 'rgba(255,255,255,0.6)' }}
          />
        </div>
      </>
    );
  }

  const turmaLabel = turma ? formatTurmaLabel(turma.serie, turma.turma_letra) || turma.nome : '';

  // PONTO DE ESCOLHA POR CASA / INTELIGÊNCIA.
  // Hoje a regra é única e simples: tem capítulo COM papéis montados -> mostra o
  // elenco; senão -> "ainda não liberado". Quando cada Casa ganhar o seu próprio
  // layout de capítulo, este é o ponto para ramificar por casaMentor?.id.
  const capituloMontado = !!capitulo && papeis.length > 0;

  if (!capituloMontado) {
    return (
      <>
        {fundo}
        <div className="relative z-10 pt-2">
          <div className="flex items-center justify-between gap-2">
            <BotaoVoltar onClick={() => navigate('/professor')} />
            <SeletorTurma
              turmas={turmasF2}
              turmaAtualId={turmaId}
              accent={accent}
              panelBg={bgDeep}
              onEscolher={(id) => navigate(`/professor/f2/capitulo/${id}`)}
            />
          </div>
          <div className="min-h-[62vh] flex flex-col items-center justify-center text-center px-6 vf-rise">
            <BrasaoCasa accent={accentSolid} brasao={casaMentor?.brasao_url ?? null} size={64} />
            <p
              className="text-[11px] uppercase font-bold mt-5"
              style={{ color: accent, letterSpacing: '0.22em' }}
            >
              Casa {casaMentor?.nome ?? ''}
              {turmaLabel ? ` · ${turmaLabel}` : ''}
            </p>
            <h1 className="font-serif text-[26px] leading-tight mt-3" style={{ color: D.text }}>
              Capítulo ainda não liberado
            </h1>
            <p className="text-sm leading-relaxed mt-3 max-w-xs" style={{ color: D.sub }}>
              O capítulo desta Casa ainda não foi montado. Quando o elenco estiver pronto, ele
              aparece aqui para você administrar.
            </p>
          </div>
        </div>
      </>
    );
  }

  // A partir daqui: capítulo montado (com elenco). capitulo é não-nulo.
  const cap = capitulo!;
  const missoesLiberadas = !!turmaConfig?.missoes_liberadas_em;

  const papeisMesa = papeis.filter((p) => p.categoria === 'mesa');
  const papeisMed = papeis.filter((p) => p.categoria === 'mediador');
  const papeisObs = papeis.filter((p) => p.categoria === 'observatorio');
  const delegAtivasList = delegacoes.filter((d) => delegacoesAtivas.has(d.codigo));

  // Formato TIMES (Arena/Musical): temas/frentes alocáveis diretamente.
  const papeisTime = papeis.filter((p) => p.categoria === 'time');
  // Rótulo por Casa: Musical (id 4) fala em "Frentes"; demais, "Temas".
  const rotuloTime = casaMentor?.id === 4
    ? { plural: 'Frentes', singular: 'frente' }
    : { plural: 'Temas', singular: 'tema' };

  return (
    <>
      {fundo}
      <div className="relative z-10 pt-2 pb-10 space-y-6">
        <div className="flex items-center justify-between gap-2">
          <BotaoVoltar onClick={() => navigate('/professor')} />
          <SeletorTurma
            turmas={turmasF2}
            turmaAtualId={turmaId}
            accent={accent}
            panelBg={bgDeep}
            onEscolher={(id) => navigate(`/professor/f2/capitulo/${id}`)}
          />
        </div>

        {/* 1. CABEÇALHO na cor da Casa */}
        <header
          className="text-center rounded-2xl px-5 pt-6 pb-6 relative overflow-hidden vf-rise"
          style={{
            border: `1px solid ${D.line}`,
            background: `radial-gradient(120% 130% at 50% -30%, ${accent}${A.glow} 0%, rgba(0,0,0,0) 62%)`,
          }}
        >
          <BrasaoCasa accent={accentSolid} brasao={casaMentor?.brasao_url ?? null} size={56} />
          <p
            className="text-[10px] uppercase font-extrabold mt-3.5"
            style={{ color: accent, letterSpacing: '0.2em' }}
          >
            Casa {casaMentor?.nome ?? ''}
          </p>
          <h1 className="font-serif text-[24px] leading-tight mt-1" style={{ color: D.text }}>
            {cap.nome}
          </h1>
          <p className="text-[12px] mt-1" style={{ color: D.sub }}>
            {turmaLabel ? `${turmaLabel} · ` : ''}Capítulo {String(cap.numero).padStart(2, '0')}
          </p>
          {(cap.descricao || cap.frase_ancora) && (
            <p className="text-[13px] mt-4 leading-relaxed" style={{ color: D.soft }}>
              {cap.descricao || cap.frase_ancora}
            </p>
          )}
        </header>

        {/* 3. ETAPAS DO CAPÍTULO */}
        <section className="vf-rise">
          <SecaoTitulo icon={<RouteIcon size={16} strokeWidth={1.75} />} accent={accent}>
            Etapas do capítulo
          </SecaoTitulo>
          {encontros.length === 0 ? (
            <div
              className="rounded-2xl p-4 text-sm"
              style={{ backgroundColor: D.card, border: `1px dashed ${D.line}`, color: D.faint }}
            >
              As etapas deste capítulo ainda não foram cadastradas.
            </div>
          ) : (
            <div className="space-y-2">
              {encontros.map((e, i) => (
                <EtapaEncontro
                  key={e.id}
                  encontro={e}
                  posicao={i + 1}
                  accent={accent}
                  dataPrevista={dataPrevistaPorEncontro[e.id] ?? null}
                  anexos={anexosPorEncontro[e.id] ?? []}
                  onSalvarData={(d) => salvarDataEncontro(e.id, d)}
                />
              ))}
            </div>
          )}
        </section>

        {/* 4. ELENCO / PAPÉIS */}
        <section className="vf-rise">
          <SecaoTitulo icon={<Users size={16} strokeWidth={1.75} />} accent={accent}>
            Elenco e papéis
          </SecaoTitulo>
          <div className="space-y-3">
            {papeisTime.length > 0 && (
              <BlocoPapeis
                titulo={rotuloTime.plural}
                accent={accent}
                contagem={contagemBloco(papeisTime, alocPorPapel)}
              >
                <div className="space-y-2.5">
                  {papeisTime.map((p) => (
                    <TimeCard
                      key={p.id}
                      papel={p}
                      alocacoes={alocPorPapel[p.id] || []}
                      grupos={turmaConfig?.time_grupos?.[p.id] ?? []}
                      alunosById={alunosById}
                      brasoes={brasoes}
                      accent={accent}
                      accentSolid={accentSolid}
                      rotulo={rotuloTime}
                      onAlocar={(numero) => setTimeParaAlocar({ papel: p, grupo: numero })}
                      onRemover={desalocar}
                      onMoverGrupo={moverGrupo}
                      onDividir={() => dividirTime(p.id)}
                      onCriarGrupo={() => criarMaisUmGrupo(p.id)}
                      onRemoverGrupo={(numero) => removerGrupo(p.id, numero)}
                      onSalvarSubtema={(numero, txt) => salvarSubtema(p.id, numero, txt)}
                      onDefinirTema={(txt) => definirTemaUnico(p.id, txt)}
                      onJuntar={() => juntarTime(p.id)}
                      onVerConversa={(numero) =>
                        setVerConversa({
                          papelId: p.id,
                          grupo: numero,
                          titulo: p.nome,
                          subtitulo: `Grupo ${numero} · só leitura`,
                        })
                      }
                      onObservar={(numero) =>
                        setBlocoGrupo({ papelId: p.id, grupo: numero, titulo: p.nome })
                      }
                      ehArena={ehArena}
                      concorrePorGrupo={concorrePorGrupo}
                      onToggleConcorre={toggleConcorre}
                    />
                  ))}
                </div>
              </BlocoPapeis>
            )}
            {papeisMesa.length > 0 && (
              <BlocoPapeis titulo="Mesa diretora" accent={accent} contagem={contagemBloco(papeisMesa, alocPorPapel)}>
                {papeisMesa.map((p) => (
                  <PapelLinha
                    key={p.id}
                    papel={p}
                    alocacoes={alocPorPapel[p.id] || []}
                    alunosById={alunosById}
                    brasoes={brasoes}
                    accent={accent}
                    onAdd={() => setPapelParaAlocar(p)}
                    onRemove={desalocar}
                  />
                ))}
              </BlocoPapeis>
            )}
            {papeisMed.length > 0 && (
              <BlocoPapeis titulo="Mediadores" accent={accent} contagem={contagemBloco(papeisMed, alocPorPapel)}>
                {papeisMed.map((p) => (
                  <PapelLinha
                    key={p.id}
                    papel={p}
                    alocacoes={alocPorPapel[p.id] || []}
                    alunosById={alunosById}
                    brasoes={brasoes}
                    accent={accent}
                    onAdd={() => setPapelParaAlocar(p)}
                    onRemove={desalocar}
                  />
                ))}
              </BlocoPapeis>
            )}
            {papeisObs.length > 0 && (
              <BlocoPapeis titulo="Observatório" accent={accent} contagem={contagemBloco(papeisObs, alocPorPapel)}>
                {papeisObs.map((p) => (
                  <PapelLinha
                    key={p.id}
                    papel={p}
                    alocacoes={alocPorPapel[p.id] || []}
                    alunosById={alunosById}
                    brasoes={brasoes}
                    accent={accent}
                    onAdd={() => setPapelParaAlocar(p)}
                    onRemove={desalocar}
                  />
                ))}
              </BlocoPapeis>
            )}
            {delegAtivasList.length > 0 && (
              <BlocoPapeis titulo="Delegações" accent={accent} contagem={`${delegAtivasList.length} grupo${delegAtivasList.length === 1 ? '' : 's'}`}>
                <div className="space-y-2.5">
                  {delegAtivasList.map((deleg) => (
                    <CartaoDelegacao
                      key={deleg.id}
                      delegacao={deleg}
                      papeisDeleg={papeis
                        .filter((p) => p.categoria === 'delegacao' && p.delegacao === deleg.codigo)
                        .sort((a, b) => a.ordem - b.ordem)}
                      membros={membrosPorDelegacao[deleg.codigo] || []}
                      alunosById={alunosById}
                      brasoes={brasoes}
                      accent={accent}
                      alocPorPapel={alocPorPapel}
                      onAddMembro={() => setDelegParaAddMembro(deleg)}
                      onRemoverMembro={removerMembro}
                      onAtribuirPapel={atribuirPapel}
                      onRemoverPapel={removerPapelDeAluno}
                    />
                  ))}
                </div>
              </BlocoPapeis>
            )}
          </div>
        </section>

        {/* 5. MISSÕES */}
        <section className="vf-rise">
          <SecaoTitulo icon={<Send size={16} strokeWidth={1.75} />} accent={accent}>
            Missões do capítulo
          </SecaoTitulo>
          <SecaoMissoes
            missoes={missoes}
            entregas={entregas}
            papeis={papeis}
            alunosDaTurma={alunosDaTurma}
            alunosById={alunosById}
            brasoes={brasoes}
            alocPorPapel={alocPorPapel}
            alunosEmMembros={alunosEmMembros}
            liberadas={missoesLiberadas}
            prazo={turmaConfig?.missoes_data_prazo ?? null}
            savingConfig={savingConfig}
            accent={accentSolid}
            onLiberar={liberarMissoes}
          />
        </section>

        {/* 6. OBSERVAÇÕES AO VIVO - grade de alunos (padrão "iniciar aula" do
            Infantil/F1: a turma inteira à mão, toque num aluno pra registrar ali
            mesmo, um por um, durante o encontro). O registro grava em `observacoes`
            ligado ao capítulo, mesmo fluxo/salvamento de antes; só a superfície
            mudou (de botão + roster em diálogo para a grade inline). */}
        <section className="vf-rise">
          <SecaoTitulo icon={<PenLine size={16} strokeWidth={1.75} />} accent={accent}>
            Observações do projeto
          </SecaoTitulo>
          <p className="text-[12.5px] leading-snug mb-3 px-0.5" style={{ color: D.sub }}>
            No encontro, acompanhe os grupos e toque num aluno pra registrar como ele conduziu o seu papel.
            {observacoes.length > 0 && (
              <span style={{ color: accent }}>
                {' '}
                {observacoes.length} já registrada{observacoes.length === 1 ? '' : 's'}.
              </span>
            )}
          </p>

          {alunosDaTurma.length === 0 ? (
            <div
              className="rounded-2xl p-4 text-sm"
              style={{ backgroundColor: D.card, border: `1px dashed ${D.line}`, color: D.faint }}
            >
              Nenhum aluno nesta turma ainda.
            </div>
          ) : (
            <>
              {/* Busca */}
              <div className="relative mb-3">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: D.faint }} />
                <input
                  type="text"
                  value={buscaObs}
                  onChange={(e) => setBuscaObs(e.target.value)}
                  placeholder="Buscar aluno..."
                  className="w-full rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: D.sunken,
                    border: `1px solid ${D.line}`,
                    color: D.text,
                    // @ts-expect-error CSS var for focus ring
                    '--tw-ring-color': `${accent}${A.a40}`,
                  }}
                />
              </div>

              {/* Grade da turma: toque abre o editor de observação do aluno */}
              {alunosObsFiltrados.length === 0 ? (
                <p className="text-sm text-center py-8" style={{ color: D.faint }}>
                  Nenhum aluno com esse nome.
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {alunosObsFiltrados.map((al) => {
                    const temObs = obsByAluno.has(al.id);
                    const papel = papelDoAluno[al.id];
                    return (
                      <button
                        key={al.id}
                        onClick={() => abrirObs(al)}
                        className="flex flex-col items-center gap-1.5 p-2.5 rounded-2xl text-center active:scale-[0.98] transition-transform"
                        style={{
                          backgroundColor: temObs ? `${accent}${A.a10}` : D.card,
                          border: `1px solid ${temObs ? `${accent}${A.a34}` : D.line}`,
                        }}
                      >
                        <span className="relative">
                          <AvatarAluno aluno={al} brasoes={brasoes} size={54} />
                          {temObs && (
                            <span
                              className="absolute -bottom-1 -right-1 rounded-full flex items-center justify-center"
                              style={{ backgroundColor: bgDeep, padding: 1 }}
                              aria-label="observação registrada"
                            >
                              <CheckCircle2 size={16} style={{ color: D.presente }} strokeWidth={2.4} />
                            </span>
                          )}
                        </span>
                        <span className="block text-[11.5px] font-medium leading-tight line-clamp-2" style={{ color: D.text }}>
                          {nomeCompleto(al)}
                        </span>
                        {papel && (
                          <span className="block w-full text-[10px] leading-tight line-clamp-1" style={{ color: D.faint }}>
                            {papel}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </section>

        {/* Rodapé: tudo salvo automaticamente */}
        <p className="text-center text-[11px]" style={{ color: D.faint }}>
          Cada mudança é salva automaticamente.
        </p>
      </div>

      {/* ===== Dialog: alocar papel ===== */}
      <AlocarDialog
        open={!!papelParaAlocar}
        titulo={papelParaAlocar?.nome ?? ''}
        subtitulo={papelParaAlocar?.time_label ?? 'Escolha quem assume este papel'}
        alunos={alunosDaTurma}
        brasoes={brasoes}
        accent={accent}
        estaBloqueado={(al) => {
          if (!papelParaAlocar) return { bloqueado: false, motivo: '' };
          const jaNoPapel = (alocPorPapel[papelParaAlocar.id] || []).some((a) => a.aluno_id === al.id);
          const emDeleg = alunosEmMembros.has(al.id);
          const emOutroFixo = alunosEmTimeFixo.has(al.id) && !jaNoPapel;
          if (jaNoPapel) return { bloqueado: true, motivo: 'já no papel' };
          if (emDeleg) return { bloqueado: true, motivo: 'em uma delegação' };
          if (emOutroFixo) return { bloqueado: true, motivo: 'já em time fixo' };
          return { bloqueado: false, motivo: '' };
        }}
        onEscolher={(al) => {
          if (papelParaAlocar) alocar(papelParaAlocar.id, al.id);
          setPapelParaAlocar(null);
        }}
        onClose={() => setPapelParaAlocar(null)}
      />

      {/* ===== Dialog: adicionar membro à delegação ===== */}
      <AlocarDialog
        open={!!delegParaAddMembro}
        titulo={delegParaAddMembro ? `Adicionar à ${delegParaAddMembro.nome}` : ''}
        subtitulo="Escolha quem entra nesta delegação. Os papéis você define depois."
        alunos={alunosDaTurma}
        brasoes={brasoes}
        accent={accent}
        estaBloqueado={(al) => {
          const emDeleg = alunosEmMembros.has(al.id);
          const emFixo = alunosEmTimeFixo.has(al.id);
          if (emDeleg) return { bloqueado: true, motivo: 'já em delegação' };
          if (emFixo) return { bloqueado: true, motivo: 'em time fixo' };
          return { bloqueado: false, motivo: '' };
        }}
        onEscolher={(al) => {
          if (delegParaAddMembro) addMembro(delegParaAddMembro.codigo, al.id);
          setDelegParaAddMembro(null);
        }}
        onClose={() => setDelegParaAddMembro(null)}
      />

      {/* ===== Dialog: alocar aluno num time (tema/frente) ===== */}
      <AlocarDialog
        open={!!timeParaAlocar}
        titulo={timeParaAlocar ? timeParaAlocar.papel.nome : ''}
        subtitulo={
          timeParaAlocar
            ? (turmaConfig?.time_grupos?.[timeParaAlocar.papel.id]?.length ?? 0) > 1
              ? `Escolha quem entra no Grupo ${timeParaAlocar.grupo}`
              : `Escolha quem entra neste ${rotuloTime.singular}`
            : ''
        }
        alunos={alunosDaTurma}
        brasoes={brasoes}
        accent={accent}
        estaBloqueado={(al) => {
          const emDeleg = alunosEmMembros.has(al.id);
          const emFixo = alunosEmTimeFixo.has(al.id);
          if (emFixo) return { bloqueado: true, motivo: `já em um ${rotuloTime.singular}` };
          if (emDeleg) return { bloqueado: true, motivo: 'em uma delegação' };
          return { bloqueado: false, motivo: '' };
        }}
        onEscolher={(al) => {
          if (timeParaAlocar) alocarTime(timeParaAlocar.papel.id, al.id, timeParaAlocar.grupo);
          setTimeParaAlocar(null);
        }}
        onClose={() => setTimeParaAlocar(null)}
      />

      {/* ===== Dialog: editor de observação de um aluno ===== */}
      <Dialog open={!!alunoObs} onOpenChange={(o) => !o && fecharObs()}>
        <DialogContent
          className="max-w-lg"
          style={{ backgroundColor: bgDeep, border: `1px solid ${D.line}`, color: D.text }}
        >
          {alunoObs && (
            <>
              <DialogHeader>
                <DialogTitle style={{ color: D.text }}>{alunoObs.nome}</DialogTitle>
                <DialogDescription style={{ color: D.sub }}>
                  Papel: <span style={{ color: D.text }}>{alunoObs.papel}</span>
                </DialogDescription>
              </DialogHeader>
              <textarea
                value={textoObs}
                onChange={(e) => setTextoObs(e.target.value)}
                placeholder="Como este aluno chegou? (o mecanismo que apareceu, o caminho que ele usou)"
                rows={6}
                className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none resize-none"
                style={{ backgroundColor: D.sunken, border: `1px solid ${D.line}`, color: D.text }}
              />
              <div className="flex items-center justify-between gap-2 pt-1">
                <LequeObservacao
                  inteligenciaId={casaMentor?.id ?? null}
                  valorAtual={textoObs}
                  onInserir={(trecho) => setTextoObs((v) => (v ? `${v} ${trecho}` : trecho))}
                  cores={{ acento: accent }}
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={fecharObs}
                    disabled={salvandoObs}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-40"
                    style={{ color: D.sub }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={salvarObs}
                    disabled={salvandoObs || !textoObs.trim()}
                    className="px-4 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-40"
                    style={{ backgroundColor: accentSolid, color: '#FFFFFF' }}
                  >
                    {salvandoObs ? 'Salvando...' : obsByAluno.has(alunoObs.id) ? 'Salvar alterações' : 'Salvar'}
                  </button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ===== Modal: conversa do grupo (mentor, só leitura) ===== */}
      <GrupoConversaModal
        open={!!verConversa}
        onClose={() => setVerConversa(null)}
        capituloId={capId}
        turmaId={turmaId ?? null}
        papelId={verConversa?.papelId ?? null}
        grupo={verConversa?.grupo ?? null}
        titulo={verConversa?.titulo ?? ''}
        subtitulo={verConversa?.subtitulo}
        accent={accent}
        bgDeep={bgDeep}
        line={D.line}
      />

      {/* ===== Bloco de observacao ao vivo (a partir de um grupo) ===== */}
      {blocoGrupo && capitulo && turmaId && profile?.id && (
        <BlocoObservacaoAoVivo
          onFechar={() => setBlocoGrupo(null)}
          capitulo={{
            id: capitulo.id,
            institution_id: capitulo.institution_id,
            fase_id: capitulo.fase_id,
            nome: (capitulo as { nome?: string }).nome,
          }}
          turmaId={turmaId}
          papelId={blocoGrupo.papelId}
          grupo={blocoGrupo.grupo}
          tituloGrupo={`${blocoGrupo.titulo} · Grupo ${blocoGrupo.grupo}`}
          membros={(alocPorPapel[blocoGrupo.papelId] || [])
            .filter((a) => (a.grupo ?? 1) === blocoGrupo.grupo)
            .map((a) => alunosById[a.aluno_id])
            .filter(Boolean)
            .map((al) => ({ id: al.id, nome: nomeCompleto(al), avatarUrl: al.avatar_url, corCasa: null }))}
          professorId={profile.id}
          accent={accent}
          accentSolid={accentSolid}
          ehArena={ehArena}
          temaGrupo={
            turmaConfig?.time_grupos?.[blocoGrupo.papelId]?.find(
              (g) => g.numero === blocoGrupo.grupo
            )?.subtema ?? ''
          }
          onDefinirTema={(txt) =>
            blocoGrupo.grupo === 1
              ? definirTemaUnico(blocoGrupo.papelId, txt)
              : salvarSubtema(blocoGrupo.papelId, blocoGrupo.grupo, txt)
          }
        />
      )}
    </>
  );
};

// ============================================================
// Subcomponentes
// ============================================================

/** Contagem "N de M alocados" de um bloco de papéis (ignora papéis ilimitados). */
const contagemBloco = (lista: Papel[], alocPorPapel: Record<string, Alocacao[]>): string => {
  let alocados = 0;
  let vagas = 0;
  let temIlimitado = false;
  lista.forEach((p) => {
    alocados += (alocPorPapel[p.id] || []).length;
    if (p.vagas_por_turma > 30) temIlimitado = true;
    else vagas += p.vagas_por_turma;
  });
  if (temIlimitado) return `${alocados} alocado${alocados === 1 ? '' : 's'}`;
  return `${alocados} de ${vagas} alocado${vagas === 1 ? '' : 's'}`;
};

const BotaoVoltar = ({ onClick }: { onClick: () => void }) => (
  <button
    onClick={onClick}
    className="inline-flex items-center gap-1.5 text-sm font-medium rounded-lg px-2 py-1 -ml-2 transition-colors"
    style={{ color: 'rgba(255,255,255,0.72)' }}
  >
    <ArrowLeft size={16} /> Voltar
  </button>
);

/**
 * SELETOR DE TURMA (topo da tela imersiva). Deixa o mentor trocar de turma sem
 * voltar: escolher outra navega para /professor/f2/capitulo/<id>. Sobre o fundo
 * escuro, lê em texto BRANCO; a cor da Casa entra só como acento (ícone, seleção),
 * nunca no corpo do texto. Uma turma só: mostra o rótulo sem dropdown.
 */
const SeletorTurma = ({
  turmas,
  turmaAtualId,
  accent,
  panelBg,
  onEscolher,
}: {
  turmas: TurmaF2Diario[];
  turmaAtualId: string | undefined;
  accent: string;
  panelBg: string;
  onEscolher: (id: string) => void;
}) => {
  const [aberto, setAberto] = useState(false);
  const rotulo = (t: TurmaF2Diario) => formatTurmaLabel(t.serie, t.turma_letra) || t.nome;
  const atual = turmas.find((t) => t.id === turmaAtualId);
  const labelAtual = atual ? rotulo(atual) : 'Turma';

  const pilula = (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5"
      style={{ backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)' }}
    >
      <Users size={13} style={{ color: accent }} strokeWidth={2} />
      <span className="text-[12.5px] font-semibold" style={{ color: '#FFFFFF' }}>
        {labelAtual}
      </span>
    </span>
  );

  // Só uma turma: nada pra escolher, mostra o rótulo em placa estática.
  if (turmas.length <= 1) return pilula;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-full pl-3 pr-2.5 py-1.5 active:scale-[0.98] transition-transform"
        style={{ backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)' }}
        aria-haspopup="listbox"
        aria-expanded={aberto}
      >
        <Users size={13} style={{ color: accent }} strokeWidth={2} />
        <span className="text-[12.5px] font-semibold" style={{ color: '#FFFFFF' }}>
          {labelAtual}
        </span>
        <ChevronDown
          size={14}
          style={{ color: 'rgba(255,255,255,0.6)' }}
          className={cn('transition-transform', aberto && 'rotate-180')}
        />
      </button>
      {aberto && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setAberto(false)} aria-hidden="true" />
          <ul
            role="listbox"
            className="absolute right-0 top-full mt-2 z-50 min-w-[190px] max-h-[60vh] overflow-y-auto rounded-2xl p-1.5"
            style={{
              backgroundColor: panelBg,
              border: '1px solid rgba(255,255,255,0.16)',
              boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
            }}
          >
            {turmas.map((t) => {
              const eAtual = t.id === turmaAtualId;
              return (
                <li key={t.id} role="option" aria-selected={eAtual}>
                  <button
                    type="button"
                    disabled={eAtual}
                    onClick={() => {
                      setAberto(false);
                      if (!eAtual) onEscolher(t.id);
                    }}
                    className="w-full flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-left disabled:cursor-default"
                    style={{ backgroundColor: eAtual ? `${accent}1F` : 'transparent' }}
                  >
                    <span
                      className="text-[13px]"
                      style={{ color: '#FFFFFF', fontWeight: eAtual ? 700 : 500 }}
                    >
                      {rotulo(t)}
                    </span>
                    {eAtual && <CheckCircle2 size={15} style={{ color: accent }} strokeWidth={2.2} />}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
};

const BlocoPapeis = ({
  titulo,
  accent,
  contagem,
  children,
}: {
  titulo: string;
  accent: string;
  contagem?: string;
  children: React.ReactNode;
}) => (
  <div>
    <div className="flex items-center justify-between mb-2 px-1">
      <h3 className="text-[11px] tracking-[0.16em] uppercase font-extrabold flex items-center gap-1.5" style={{ color: accent }}>
        <ScrollText size={12} /> Elenco · {titulo}
      </h3>
      {contagem && (
        <span className="text-[11px] font-semibold" style={{ color: D.sub }}>
          {contagem}
        </span>
      )}
    </div>
    <div className="space-y-2">{children}</div>
  </div>
);

const ChipAluno = ({
  aluno,
  brasoes,
  onRemove,
}: {
  aluno: Aluno | undefined;
  brasoes: Brasoes;
  onRemove: () => void;
}) => (
  <button
    onClick={onRemove}
    className="group flex items-center gap-1.5 pl-1 pr-2 py-0.5 rounded-full text-xs font-semibold transition-colors"
    style={{ backgroundColor: D.chip, color: D.text, border: `1px solid ${D.line}` }}
    title="Toque para remover"
    aria-label={`Remover ${nomeCompleto(aluno)}`}
  >
    <AvatarAluno aluno={aluno} brasoes={brasoes} size={18} />
    <span>{nomeCompleto(aluno)}</span>
    <X size={12} className="opacity-50 group-hover:opacity-100" />
  </button>
);

const BotaoAlocar = ({ label, accent, onClick }: { label: string; accent: string; onClick: () => void }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-1 pl-2 pr-3 py-1 rounded-full text-xs font-bold transition-colors"
    style={{ border: `1px dashed ${accent}${A.a40}`, color: accent, backgroundColor: `${accent}${A.a08}` }}
  >
    <Plus size={12} strokeWidth={2.6} /> {label}
  </button>
);

const PapelLinha = ({
  papel,
  alocacoes,
  alunosById,
  brasoes,
  accent,
  onAdd,
  onRemove,
}: {
  papel: Papel;
  alocacoes: Alocacao[];
  alunosById: Record<string, Aluno>;
  brasoes: Brasoes;
  accent: string;
  onAdd: () => void;
  onRemove: (id: string) => void;
}) => {
  const ilimitado = papel.vagas_por_turma > 30;
  const cheio = !ilimitado && alocacoes.length >= papel.vagas_por_turma;
  const badge = ilimitado
    ? alocacoes.length > 0
      ? `${alocacoes.length}`
      : 'aberto'
    : cheio
      ? `${papel.vagas_por_turma} de ${papel.vagas_por_turma}`
      : alocacoes.length > 0
        ? `${alocacoes.length} de ${papel.vagas_por_turma}`
        : papel.vagas_por_turma > 1
          ? `0 de ${papel.vagas_por_turma}`
          : 'vaga';
  return (
    <div
      className="rounded-2xl p-3 transition-colors"
      style={{
        border: `1px solid ${cheio ? `${accent}${A.a34}` : D.line}`,
        backgroundColor: cheio ? `${accent}${A.a10}` : D.card,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="text-sm font-bold leading-tight" style={{ color: D.text }}>
          {papel.nome}
        </div>
        <span
          className="flex-shrink-0 text-[10px] font-extrabold rounded-full px-2 py-0.5 whitespace-nowrap"
          style={
            cheio
              ? { color: accent, backgroundColor: `${accent}${A.a20}`, border: `1px solid ${accent}${A.a34}` }
              : { color: D.sub, backgroundColor: D.card, border: `1px solid ${D.line}` }
          }
        >
          {badge}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5 mt-2.5">
        {alocacoes.map((a) => (
          <ChipAluno key={a.id} aluno={alunosById[a.aluno_id]} brasoes={brasoes} onRemove={() => onRemove(a.id)} />
        ))}
        {!cheio && <BotaoAlocar label="Alocar aluno" accent={accent} onClick={onAdd} />}
      </div>
    </div>
  );
};

/**
 * TIME (formato Arena/Musical): um tema/frente alocável diretamente.
 * Sem dividir: chips + "Alocar aluno". Dividido: dois grupos, cada aluno pode
 * ser movido entre eles. A regra "1 tema por aluno" é imposta no backend
 * (trigger validar_capitulo_alocacao) e espelhada no bloqueio do diálogo.
 */
// Cor-assinatura da Arena (mesma do site de votação), usada só nos controles da Arena.
const COR_ARENA = '#5EE0D0';

/** Campo de tema/recorte de um grupo (usado no time não dividido e no Observar). */
const TemaInput = ({
  value,
  onSave,
  placeholder = 'Tema do grupo (ex: games)',
}: {
  value: string;
  onSave: (texto: string) => void;
  placeholder?: string;
}) => {
  const [v, setV] = useState(value);
  useEffect(() => {
    setV(value);
  }, [value]);
  return (
    <input
      type="text"
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => {
        if ((v.trim() || null) !== (value.trim() || null)) onSave(v);
      }}
      placeholder={placeholder}
      className="w-full rounded-lg px-2.5 py-1.5 text-[12px] focus:outline-none"
      style={{ backgroundColor: D.sunken, border: `1px solid ${D.line}`, color: D.text }}
    />
  );
};

/** Botão de marcar/desmarcar um grupo como concorrente na Arena. */
const ConcorreBotao = ({ on, onClick }: { on: boolean; onClick: () => void }) => (
  <button
    onClick={onClick}
    className="mt-2.5 ml-1.5 inline-flex items-center gap-1 text-[11px] font-bold rounded-full px-2.5 py-1 transition-colors"
    style={
      on
        ? { color: '#08201C', backgroundColor: COR_ARENA }
        : { color: COR_ARENA, backgroundColor: `${COR_ARENA}14`, border: `1px solid ${COR_ARENA}55` }
    }
  >
    <Trophy size={12} strokeWidth={2.4} /> {on ? 'Concorre na Arena' : 'Marcar p/ Arena'}
  </button>
);

const TimeCard = ({
  papel,
  alocacoes,
  grupos,
  alunosById,
  brasoes,
  accent,
  accentSolid,
  rotulo,
  onAlocar,
  onRemover,
  onMoverGrupo,
  onDividir,
  onCriarGrupo,
  onRemoverGrupo,
  onSalvarSubtema,
  onDefinirTema,
  onJuntar,
  onVerConversa,
  onObservar,
  ehArena,
  concorrePorGrupo,
  onToggleConcorre,
}: {
  papel: Papel;
  alocacoes: Alocacao[];
  grupos: GrupoMeta[];
  alunosById: Record<string, Aluno>;
  brasoes: Brasoes;
  accent: string;
  accentSolid: string;
  rotulo: { plural: string; singular: string };
  onAlocar: (numero: number) => void;
  onRemover: (id: string) => void;
  onMoverGrupo: (id: string, numero: number) => void;
  onDividir: () => void;
  onCriarGrupo: () => void;
  onRemoverGrupo: (numero: number) => void;
  onSalvarSubtema: (numero: number, texto: string) => void;
  onDefinirTema: (texto: string) => void;
  onJuntar: () => void;
  onVerConversa: (numero: number) => void;
  onObservar: (numero: number) => void;
  ehArena: boolean;
  concorrePorGrupo: Record<string, boolean>;
  onToggleConcorre: (papelId: string, grupo: number) => void;
}) => {
  const ilimitado = papel.vagas_por_turma > 30;
  const cheio = !ilimitado && alocacoes.length >= papel.vagas_por_turma;
  const dividido = grupos.length > 1;
  const temaUnico = grupos.find((g) => g.numero === 1)?.subtema ?? '';
  const doGrupo = (n: number) => alocacoes.filter((a) => (a.grupo ?? 1) === n);
  const gruposOrdenados = [...grupos].sort((a, b) => a.numero - b.numero);
  const numeros = gruposOrdenados.map((g) => g.numero);

  const badge = ilimitado
    ? `${alocacoes.length}`
    : `${alocacoes.length} de ${papel.vagas_por_turma}`;

  return (
    <div
      className="rounded-2xl p-3 transition-colors"
      style={{
        border: `1px solid ${alocacoes.length > 0 ? `${accent}${A.a34}` : D.line}`,
        backgroundColor: alocacoes.length > 0 ? `${accent}${A.a10}` : D.card,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-bold leading-tight" style={{ color: D.text }}>
            {papel.nome}
          </div>
          {papel.descricao_curta && (
            <p className="text-[11px] mt-1 leading-snug" style={{ color: D.sub }}>
              {papel.descricao_curta}
            </p>
          )}
        </div>
        <span
          className="flex-shrink-0 text-[10px] font-extrabold rounded-full px-2 py-0.5 whitespace-nowrap"
          style={{ color: D.sub, backgroundColor: D.card, border: `1px solid ${D.line}` }}
        >
          {badge}
        </span>
      </div>

      {!dividido ? (
        <>
          <div className="mt-2.5">
            <TemaInput value={temaUnico} onSave={(txt) => onDefinirTema(txt)} />
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {alocacoes.map((a) => (
              <ChipAluno
                key={a.id}
                aluno={alunosById[a.aluno_id]}
                brasoes={brasoes}
                onRemove={() => onRemover(a.id)}
              />
            ))}
            {!cheio && <BotaoAlocar label="Alocar aluno" accent={accent} onClick={() => onAlocar(1)} />}
          </div>
          <button
            onClick={onDividir}
            className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-semibold rounded-full px-2 py-0.5"
            style={{ color: accent, backgroundColor: `${accent}${A.a08}`, border: `1px dashed ${accent}${A.a34}` }}
          >
            <Split size={12} strokeWidth={2.2} /> Dividir em grupos
          </button>
          {alocacoes.length > 0 && (
            <button
              onClick={() => onObservar(1)}
              className="mt-2.5 ml-1.5 inline-flex items-center gap-1 text-[11px] font-bold rounded-full px-2.5 py-1"
              style={{ color: '#FFFFFF', backgroundColor: accentSolid }}
            >
              <PenLine size={12} strokeWidth={2.4} /> Observar
            </button>
          )}
          {ehArena && alocacoes.length > 0 && (
            <ConcorreBotao
              on={!!concorrePorGrupo[`${papel.id}::1`]}
              onClick={() => onToggleConcorre(papel.id, 1)}
            />
          )}
        </>
      ) : (
        <>
          <div className="space-y-2 mt-2.5">
            {gruposOrdenados.map((g) => (
              <GrupoBloco
                key={g.numero}
                grupo={g}
                membros={doGrupo(g.numero)}
                outrosNumeros={numeros.filter((n) => n !== g.numero)}
                alunosById={alunosById}
                brasoes={brasoes}
                accent={accent}
                accentSolid={accentSolid}
                podeAlocar={!cheio}
                podeRemover={grupos.length > 1}
                onAlocar={() => onAlocar(g.numero)}
                onRemover={onRemover}
                onMover={onMoverGrupo}
                onSalvarSubtema={(txt) => onSalvarSubtema(g.numero, txt)}
                onRemoverGrupo={() => onRemoverGrupo(g.numero)}
                onVerConversa={() => onVerConversa(g.numero)}
                onObservar={() => onObservar(g.numero)}
                ehArena={ehArena}
                concorre={!!concorrePorGrupo[`${papel.id}::${g.numero}`]}
                onToggleConcorre={() => onToggleConcorre(papel.id, g.numero)}
              />
            ))}
          </div>
          <div className="flex items-center gap-2 mt-2.5 flex-wrap">
            <button
              onClick={onCriarGrupo}
              className="inline-flex items-center gap-1 text-[11px] font-semibold rounded-full px-2 py-0.5"
              style={{ color: accent, backgroundColor: `${accent}${A.a08}`, border: `1px dashed ${accent}${A.a34}` }}
            >
              <Plus size={12} strokeWidth={2.4} /> Criar mais um grupo
            </button>
            <button
              onClick={onJuntar}
              className="inline-flex items-center gap-1 text-[11px] font-semibold rounded-full px-2 py-0.5"
              style={{ color: D.sub, backgroundColor: D.card, border: `1px solid ${D.line}` }}
            >
              <Merge size={12} strokeWidth={2.2} /> Juntar em um grupo
            </button>
          </div>
        </>
      )}
    </div>
  );
};

/** Um grupo dentro de um time dividido: subtema editável, membros (cada um com
 *  "mover para" quando há outros grupos), botão de alocar e remover o grupo. */
const GrupoBloco = ({
  grupo,
  membros,
  outrosNumeros,
  alunosById,
  brasoes,
  accent,
  accentSolid,
  podeAlocar,
  podeRemover,
  onAlocar,
  onRemover,
  onMover,
  onSalvarSubtema,
  onRemoverGrupo,
  onVerConversa,
  onObservar,
  ehArena,
  concorre,
  onToggleConcorre,
}: {
  grupo: GrupoMeta;
  membros: Alocacao[];
  outrosNumeros: number[];
  alunosById: Record<string, Aluno>;
  brasoes: Brasoes;
  accent: string;
  accentSolid: string;
  podeAlocar: boolean;
  podeRemover: boolean;
  onAlocar: () => void;
  onRemover: (id: string) => void;
  onMover: (id: string, numero: number) => void;
  onSalvarSubtema: (texto: string) => void;
  onRemoverGrupo: () => void;
  onVerConversa: () => void;
  onObservar: () => void;
  ehArena: boolean;
  concorre: boolean;
  onToggleConcorre: () => void;
}) => {
  const [subtema, setSubtema] = useState(grupo.subtema ?? '');
  useEffect(() => {
    setSubtema(grupo.subtema ?? '');
  }, [grupo.subtema]);

  return (
    <div className="rounded-xl p-2.5" style={{ backgroundColor: D.sunken, border: `1px solid ${D.line}` }}>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-[10px] uppercase tracking-wide font-bold" style={{ color: accent }}>
          Grupo {grupo.numero}
        </span>
        {podeRemover && (
          <button
            onClick={onRemoverGrupo}
            className="flex-shrink-0 p-0.5 rounded-md"
            style={{ color: D.faint }}
            title="Remover grupo (os alunos voltam pro Grupo 1)"
            aria-label="Remover grupo"
          >
            <X size={13} />
          </button>
        )}
      </div>

      <input
        type="text"
        value={subtema}
        onChange={(e) => setSubtema(e.target.value)}
        onBlur={() => {
          if ((subtema.trim() || null) !== (grupo.subtema ?? null)) onSalvarSubtema(subtema);
        }}
        placeholder="Subtema (o recorte que o grupo escolheu)"
        className="w-full rounded-lg px-2.5 py-1.5 text-[12px] mb-2 focus:outline-none"
        style={{ backgroundColor: D.card, border: `1px solid ${D.line}`, color: D.text }}
      />

      <div className="space-y-1">
        {membros.map((a) => (
          <div key={a.id} className="flex items-center gap-1">
            <span className="min-w-0 flex-1">
              <ChipAluno aluno={alunosById[a.aluno_id]} brasoes={brasoes} onRemove={() => onRemover(a.id)} />
            </span>
            {outrosNumeros.length > 0 && (
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) onMover(a.id, Number(e.target.value));
                }}
                className="flex-shrink-0 rounded-md px-1.5 py-0.5 text-[10px] focus:outline-none"
                style={{ backgroundColor: D.card, border: `1px solid ${D.line}`, color: D.sub, colorScheme: 'dark' }}
                title="Mover para outro grupo"
                aria-label="Mover para outro grupo"
              >
                <option value="">mover</option>
                {[...outrosNumeros].sort((x, y) => x - y).map((n) => (
                  <option key={n} value={n}>
                    Grupo {n}
                  </option>
                ))}
              </select>
            )}
          </div>
        ))}
        {membros.length === 0 && (
          <p className="text-[11px] italic py-0.5" style={{ color: D.faint }}>
            Sem ninguém neste grupo ainda.
          </p>
        )}
        {podeAlocar && (
          <button
            onClick={onAlocar}
            className="flex items-center gap-1 pl-1.5 pr-2 py-0.5 rounded-full text-[11px] font-bold mt-1"
            style={{ border: `1px dashed ${accent}${A.a40}`, color: accent }}
          >
            <Plus size={11} strokeWidth={2.6} /> aluno
          </button>
        )}
      </div>

      {/* Acoes do grupo: observar ao vivo + ver a conversa (so leitura). */}
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        <button
          onClick={onObservar}
          className="inline-flex items-center gap-1 text-[11px] font-bold rounded-full px-2.5 py-1"
          style={{ color: '#FFFFFF', backgroundColor: accentSolid }}
        >
          <PenLine size={12} strokeWidth={2.4} /> Observar
        </button>
        <button
          onClick={onVerConversa}
          className="inline-flex items-center gap-1 text-[11px] font-semibold rounded-full px-2 py-1"
          style={{ color: accent, backgroundColor: `${accent}${A.a08}`, border: `1px solid ${accent}${A.a34}` }}
        >
          <MessageSquare size={12} strokeWidth={2.2} /> Ver conversa do grupo
        </button>
        {ehArena && (
          <button
            onClick={onToggleConcorre}
            className="inline-flex items-center gap-1 text-[11px] font-bold rounded-full px-2.5 py-1 transition-colors"
            style={
              concorre
                ? { color: '#08201C', backgroundColor: COR_ARENA }
                : { color: COR_ARENA, backgroundColor: `${COR_ARENA}14`, border: `1px solid ${COR_ARENA}55` }
            }
          >
            <Trophy size={12} strokeWidth={2.4} /> {concorre ? 'Concorre na Arena' : 'Marcar p/ Arena'}
          </button>
        )}
      </div>
    </div>
  );
};

const CartaoDelegacao = ({
  delegacao,
  papeisDeleg,
  membros,
  alunosById,
  brasoes,
  accent,
  alocPorPapel,
  onAddMembro,
  onRemoverMembro,
  onAtribuirPapel,
  onRemoverPapel,
}: {
  delegacao: Delegacao;
  papeisDeleg: Papel[];
  membros: MembroDelegacao[];
  alunosById: Record<string, Aluno>;
  brasoes: Brasoes;
  accent: string;
  alocPorPapel: Record<string, Alocacao[]>;
  onAddMembro: () => void;
  onRemoverMembro: (membroId: string, alunoId: string) => void;
  onAtribuirPapel: (papelId: string, alunoId: string) => void;
  onRemoverPapel: (papelId: string, alunoId: string) => void;
}) => {
  const cheio = membros.length >= MAX_MEMBROS_DELEG;
  return (
    <div className="rounded-2xl p-3" style={{ backgroundColor: D.card, border: `1px solid ${D.line}` }}>
      <div className="flex items-center justify-between mb-2.5">
        <div className="text-sm font-bold flex items-center gap-2" style={{ color: D.text }}>
          <span className="w-2.5 h-2.5 rounded-[3px] flex-shrink-0" style={{ backgroundColor: accent }} />
          {delegacao.nome}
        </div>
        {membros.length > 0 && (
          <span className="text-[10px] font-bold" style={{ color: D.sub }}>
            {membros.length} membro{membros.length === 1 ? '' : 's'}
          </span>
        )}
      </div>

      {/* Time */}
      <div className="mb-3">
        <div className="text-[10px] tracking-wide uppercase mb-1.5 font-semibold" style={{ color: D.faint }}>
          Time
        </div>
        <div className="flex flex-wrap gap-1.5">
          {membros.map((m) => (
            <ChipAluno
              key={m.id}
              aluno={alunosById[m.aluno_id]}
              brasoes={brasoes}
              onRemove={() => onRemoverMembro(m.id, m.aluno_id)}
            />
          ))}
          {!cheio && <BotaoAlocar label="Membro" accent={accent} onClick={onAddMembro} />}
        </div>
      </div>

      {/* Papéis */}
      <div>
        <div className="text-[10px] tracking-wide uppercase mb-1.5 font-semibold" style={{ color: D.faint }}>
          Papéis
        </div>
        {membros.length === 0 ? (
          <div className="text-[11px] italic py-1" style={{ color: D.faint }}>
            Adicione membros à delegação primeiro.
          </div>
        ) : (
          <div className="space-y-2">
            {papeisDeleg.map((p) => {
              const alocs = alocPorPapel[p.id] || [];
              const alocadosIds = new Set(alocs.map((a) => a.aluno_id));
              const disponiveis = membros.filter((m) => !alocadosIds.has(m.aluno_id));
              return (
                <div key={p.id} className="flex flex-wrap items-center gap-1.5">
                  <div className="text-[12px] min-w-[100px] font-medium" style={{ color: D.soft }}>
                    {p.nome}
                  </div>
                  {alocs.map((a) => (
                    <ChipAluno
                      key={a.id}
                      aluno={alunosById[a.aluno_id]}
                      brasoes={brasoes}
                      onRemove={() => onRemoverPapel(p.id, a.aluno_id)}
                    />
                  ))}
                  {disponiveis.length > 0 && (
                    <select
                      value=""
                      onChange={(e) => {
                        if (e.target.value) onAtribuirPapel(p.id, e.target.value);
                      }}
                      className="rounded-full px-2 py-0.5 text-[11px] focus:outline-none"
                      style={{
                        backgroundColor: D.sunken,
                        border: `1px dashed ${D.line}`,
                        color: D.sub,
                        colorScheme: 'dark',
                      }}
                    >
                      <option value="">+ atribuir</option>
                      {disponiveis.map((m) => (
                        <option key={m.aluno_id} value={m.aluno_id}>
                          {nomeCompleto(alunosById[m.aluno_id])}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const EtapaEncontro = ({
  encontro,
  posicao,
  accent,
  dataPrevista,
  anexos,
  onSalvarData,
}: {
  encontro: Encontro;
  posicao: number;
  accent: string;
  dataPrevista: string | null;
  anexos: Anexo[];
  onSalvarData: (data: string) => void;
}) => {
  const [aberto, setAberto] = useState(false);
  return (
    <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: D.card, border: `1px solid ${D.line}` }}>
      <button
        onClick={() => setAberto((v) => !v)}
        className="w-full flex items-center gap-2.5 p-3 text-left"
        aria-expanded={aberto}
      >
        <span
          className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
          style={{ backgroundColor: `${accent}${A.a20}`, color: accent }}
        >
          {posicao}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold truncate" style={{ color: D.text }}>
            {encontro.titulo}
          </span>
        </span>
        <ChevronDown
          size={16}
          style={{ color: D.faint, transform: aberto ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}
        />
      </button>

      {aberto && (
        <div className="px-3 pb-3 pt-2.5 space-y-2.5" style={{ borderTop: `1px solid ${D.line}` }}>
          {encontro.objetivo && (
            <p className="text-xs leading-relaxed" style={{ color: D.soft }}>
              <span className="font-semibold" style={{ color: D.text }}>
                Objetivo.{' '}
              </span>
              {encontro.objetivo}
            </p>
          )}
          {encontro.instrucoes ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: D.soft }}>
              {encontro.instrucoes}
            </p>
          ) : (
            <p className="text-xs italic" style={{ color: D.faint }}>
              Sem instruções cadastradas para esta etapa.
            </p>
          )}
          {anexos.length > 0 && (
            <div className="space-y-1.5 pt-1">
              {anexos.map((a) => (
                <a
                  key={a.id}
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm"
                  style={{ backgroundColor: D.card2, color: accent }}
                >
                  <Paperclip size={14} strokeWidth={2} />
                  <span className="truncate">{a.nome || a.tipo || 'Anexo'}</span>
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const SecaoMissoes = ({
  missoes,
  entregas,
  alunosDaTurma,
  alunosById,
  brasoes,
  alocPorPapel,
  alunosEmMembros,
  liberadas,
  prazo,
  savingConfig,
  accent,
  onLiberar,
  papeis,
}: {
  missoes: Missao[];
  entregas: { missao_id: string; aluno_id: string; grupo_ref: string | null }[];
  papeis: Papel[];
  alunosDaTurma: Aluno[];
  alunosById: Record<string, Aluno>;
  brasoes: Brasoes;
  alocPorPapel: Record<string, Alocacao[]>;
  alunosEmMembros: Set<string>;
  liberadas: boolean;
  prazo: string | null;
  savingConfig: boolean;
  accent: string;
  onLiberar: (prazoISO: string) => void;
}) => {
  const [prazoDate, setPrazoDate] = useState(() => new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10));
  const hoje = new Date().toISOString().slice(0, 10);
  const entreguesPorMissao = useMemo(() => {
    const m: Record<string, Set<string>> = {};
    entregas.forEach((e) => {
      (m[e.missao_id] ||= new Set()).add(e.aluno_id);
    });
    return m;
  }, [entregas]);

  // Missões coletivas: contagem POR GRUPO (tema+numero), não por aluno.
  const nomePapel = useMemo(() => {
    const m: Record<string, string> = {};
    papeis.forEach((pp) => { m[pp.id] = pp.nome; });
    return m;
  }, [papeis]);
  const todosGrupos = useMemo(() => {
    const s = new Set<string>();
    Object.entries(alocPorPapel).forEach(([papelId, arr]) => {
      (arr || []).forEach((a) => s.add(`${papelId}::${a.grupo ?? 1}`));
    });
    return [...s];
  }, [alocPorPapel]);
  const entreguesGruposPorMissao = useMemo(() => {
    const m: Record<string, Set<string>> = {};
    entregas.forEach((e) => { if (e.grupo_ref) (m[e.missao_id] ||= new Set()).add(e.grupo_ref); });
    return m;
  }, [entregas]);
  const rotuloGrupo = (ref: string) => {
    const [papelId, g] = ref.split('::');
    return `${nomePapel[papelId] || 'Grupo'} · Grupo ${g}`;
  };

  const elegiveisDe = (missao: Missao): Aluno[] => {
    if (missao.papel_id) {
      const ids = new Set((alocPorPapel[missao.papel_id] || []).map((a) => a.aluno_id));
      return alunosDaTurma.filter((a) => ids.has(a.id));
    }
    if (missao.para_membros_delegacao) {
      return alunosDaTurma.filter((a) => alunosEmMembros.has(a.id));
    }
    return alunosDaTurma;
  };

  return (
    <div className="space-y-3">
      {/* Liberar */}
      <div className="rounded-2xl p-4" style={{ backgroundColor: D.card, border: `1px solid ${D.line}` }}>
        {liberadas ? (
          <div className="text-sm" style={{ color: D.soft }}>
            <p className="flex items-center gap-1.5 font-semibold" style={{ color: D.presente }}>
              <CheckCircle2 size={16} /> Missões liberadas para esta turma.
            </p>
            {prazo && (
              <p className="mt-1 text-[12px]" style={{ color: D.faint }}>
                Prazo de entrega: {new Date(prazo).toLocaleDateString('pt-BR')}
              </p>
            )}
          </div>
        ) : (
          <>
            <p className="text-sm leading-relaxed" style={{ color: D.soft }}>
              Ao liberar, cada aluno passa a ver as missões da Arena. Escolha até quando ficam ativas.
            </p>
            <label className="block mt-3 mb-1 text-[12px] font-semibold" style={{ color: D.sub }}>
              Prazo de entrega
            </label>
            <input
              type="date"
              value={prazoDate}
              min={hoje}
              onChange={(e) => setPrazoDate(e.target.value)}
              className="w-full rounded-xl px-3 py-2 text-sm"
              style={{ backgroundColor: D.sunken, border: `1px solid ${D.line}`, color: D.text }}
            />
            <button
              onClick={() => prazoDate && onLiberar(new Date(prazoDate + 'T23:59:59').toISOString())}
              disabled={savingConfig || !prazoDate}
              className="w-full mt-3 rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50 transition-transform active:scale-[0.99]"
              style={{ backgroundColor: accent, color: '#FFFFFF' }}
            >
              <Send size={16} /> Liberar missões do capítulo
            </button>
          </>
        )}
      </div>

      {/* Faltantes por missão (só faz sentido quando liberadas) */}
      {liberadas && missoes.length > 0 && (
        <div className="space-y-2">
          {missoes.map((missao) => {
            if (missao.entrega_coletiva) {
              const gEntregues = entreguesGruposPorMissao[missao.id] || new Set<string>();
              const faltamG = todosGrupos.filter((g) => !gEntregues.has(g));
              const entreguesN = todosGrupos.length - faltamG.length;
              return (
                <div key={missao.id} className="rounded-2xl p-3.5" style={{ backgroundColor: D.card, border: `1px solid ${D.line}` }}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold min-w-0 truncate" style={{ color: D.text }}>{missao.titulo}</p>
                    <span className="text-[11px] whitespace-nowrap font-bold" style={{ color: faltamG.length === 0 && todosGrupos.length > 0 ? D.presente : D.sub }}>
                      {entreguesN}/{todosGrupos.length} grupos
                    </span>
                  </div>
                  {todosGrupos.length === 0 ? (
                    <p className="text-[11px] italic mt-1" style={{ color: D.faint }}>Nenhum grupo formado ainda.</p>
                  ) : faltamG.length === 0 ? (
                    <p className="text-[11px] mt-1 flex items-center gap-1" style={{ color: D.presente }}><CheckCircle2 size={12} /> Todos os grupos entregaram.</p>
                  ) : (
                    <div className="mt-2">
                      <p className="text-[10px] uppercase tracking-wide font-semibold mb-1.5" style={{ color: D.faint }}>Grupos que faltam</p>
                      <div className="flex flex-wrap gap-1.5">
                        {faltamG.map((g) => (
                          <span key={g} className="px-2.5 py-1 rounded-full text-xs" style={{ backgroundColor: D.sunken, color: D.sub }}>{rotuloGrupo(g)}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            }
            const elegiveis = elegiveisDe(missao);
            const entregues = entreguesPorMissao[missao.id] || new Set<string>();
            const faltantes = elegiveis.filter((a) => !entregues.has(a.id));
            return (
              <div
                key={missao.id}
                className="rounded-2xl p-3.5"
                style={{ backgroundColor: D.card, border: `1px solid ${D.line}` }}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold min-w-0 truncate" style={{ color: D.text }}>
                    {missao.titulo}
                  </p>
                  <span
                    className="text-[11px] whitespace-nowrap font-bold"
                    style={{ color: faltantes.length === 0 ? D.presente : D.sub }}
                  >
                    {elegiveis.length - faltantes.length}/{elegiveis.length} entregaram
                  </span>
                </div>
                {elegiveis.length === 0 ? (
                  <p className="text-[11px] italic mt-1" style={{ color: D.faint }}>
                    Ninguém elegível ainda (aloque os papéis).
                  </p>
                ) : faltantes.length === 0 ? (
                  <p className="text-[11px] mt-1 flex items-center gap-1" style={{ color: D.presente }}>
                    <CheckCircle2 size={12} /> Todos entregaram.
                  </p>
                ) : (
                  <div className="mt-2">
                    <p className="text-[10px] uppercase tracking-wide font-semibold mb-1.5" style={{ color: D.faint }}>
                      Faltam entregar
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {faltantes.map((a) => (
                        <span
                          key={a.id}
                          className="flex items-center gap-1.5 pl-1 pr-2 py-0.5 rounded-full text-xs"
                          style={{ backgroundColor: D.sunken, color: D.sub }}
                        >
                          <AvatarAluno aluno={alunosById[a.id]} brasoes={brasoes} size={18} />
                          {nomeCompleto(a)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const AlocarDialog = ({
  open,
  titulo,
  subtitulo,
  alunos,
  brasoes,
  accent,
  estaBloqueado,
  onEscolher,
  onClose,
}: {
  open: boolean;
  titulo: string;
  subtitulo: string;
  alunos: Aluno[];
  brasoes: Brasoes;
  accent: string;
  estaBloqueado: (a: Aluno) => { bloqueado: boolean; motivo: string };
  onEscolher: (a: Aluno) => void;
  onClose: () => void;
}) => {
  const [busca, setBusca] = useState('');
  useEffect(() => {
    if (!open) setBusca('');
  }, [open]);
  const lista = filtrarAlunos(alunos, busca);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-md"
        style={{ backgroundColor: '#241E63', border: `1px solid ${D.line}`, color: D.text }}
      >
        <DialogHeader>
          <DialogTitle style={{ color: D.text }}>{titulo}</DialogTitle>
          <DialogDescription style={{ color: D.sub }}>{subtitulo}</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: D.faint }} />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar pelo nome..."
            autoFocus
            className="w-full rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none"
            style={{ backgroundColor: D.sunken, border: `1px solid ${D.line}`, color: D.text }}
          />
        </div>
        <div className="max-h-[50vh] overflow-y-auto -mx-1 px-1">
          {alunos.length === 0 ? (
            <p className="text-sm py-4" style={{ color: D.sub }}>
              Nenhum aluno nesta turma.
            </p>
          ) : lista.length === 0 ? (
            <p className="text-sm py-4 text-center" style={{ color: D.faint }}>
              Nenhum resultado.
            </p>
          ) : (
            <div className="space-y-1">
              {lista.map((al) => {
                const { bloqueado, motivo } = estaBloqueado(al);
                return (
                  <button
                    key={al.id}
                    disabled={bloqueado}
                    onClick={() => onEscolher(al)}
                    className={cn('w-full text-left flex items-center gap-3 p-2 rounded-lg transition-colors', bloqueado && 'opacity-40 cursor-not-allowed')}
                    style={{ backgroundColor: bloqueado ? 'transparent' : D.card }}
                  >
                    <AvatarAluno aluno={al} brasoes={brasoes} size={32} />
                    <span className="text-sm" style={{ color: D.text }}>
                      {nomeCompleto(al)}
                    </span>
                    {motivo && (
                      <span className="ml-auto text-[10px]" style={{ color: D.faint }}>
                        {motivo}
                      </span>
                    )}
                    {!bloqueado && <Plus size={16} className="ml-auto" style={{ color: accent }} />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default F2CapituloPage;
