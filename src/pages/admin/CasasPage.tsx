import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CasaBrasao } from '@/components/CasaBrasao';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Users, Crown, Star, UserCircle } from 'lucide-react';

interface Inteligencia {
  id: number;
  nome: string;
  codigo: string;
  cor_hex: string | null;
  emoji: string | null;
  brasao_url: string | null;
  ordem: number | null;
}

interface Membro {
  id: string;
  casa_id: number;
  serie: string | null;
  turma: string | null;
  full_name: string | null;
}

interface Mentor {
  casa_id: number;
  professor_name: string;
}

interface Cargo {
  casa_id: number;
  cargo: string;
  aluno_name: string;
  aluno_serie: string | null;
  aluno_turma: string | null;
}

const SERIES = ['6', '7', '8', '9'];

const CasasPage = () => {
  const [inteligencias, setInteligencias] = useState<Inteligencia[]>([]);
  const [membros, setMembros] = useState<Membro[]>([]);
  const [mentores, setMentores] = useState<Mentor[]>([]);
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [resInt, resMembros, resMentores, resCargos] = await Promise.all([
      supabase.from('inteligencias').select('*').order('ordem'),
      supabase.from('profiles').select('id, casa_id, serie, turma, full_name').not('casa_id', 'is', null),
      supabase.from('professor_casa').select('casa_id, professor_id, profiles!professor_casa_professor_id_fkey(full_name)').eq('ativo', true),
      supabase.from('cargos_casa').select('casa_id, cargo, aluno_id, profiles!cargos_casa_aluno_id_fkey(full_name, serie, turma)').eq('ativo', true),
    ]);

    if (resInt.data) setInteligencias(resInt.data);
    if (resMembros.data) setMembros(resMembros.data as Membro[]);
    if (resMentores.data) {
      setMentores(
        resMentores.data.map((m: any) => ({
          casa_id: m.casa_id,
          professor_name: m.profiles?.full_name || 'Sem nome',
        }))
      );
    }
    if (resCargos.data) {
      setCargos(
        resCargos.data.map((c: any) => ({
          casa_id: c.casa_id,
          cargo: c.cargo,
          aluno_name: c.profiles?.full_name || 'Sem nome',
          aluno_serie: c.profiles?.serie || null,
          aluno_turma: c.profiles?.turma || null,
        }))
      );
    }
    setLoading(false);
  };

  const extractSerieNum = (serie: string | null): string | null => {
    if (!serie) return null;
    const match = serie.match(/(\d+)/);
    return match ? match[1] : null;
  };

  const getMembrosForCasa = (casaId: number) => membros.filter((m) => m.casa_id === casaId);

  const getMentorForCasa = (casaId: number) => mentores.find((m) => m.casa_id === casaId);

  const getCargosForCasaSerie = (casaId: number, serie: string) =>
    cargos.filter((c) => c.casa_id === casaId && extractSerieNum(c.aluno_serie) === serie);

  const getCargosForCasaSerieTurma = (casaId: number, serie: string, turmaLetra: string) =>
    cargos.filter((c) => c.casa_id === casaId && extractSerieNum(c.aluno_serie) === serie && (c.aluno_turma || '').toUpperCase() === turmaLetra.toUpperCase());

  // Get unique turma letters for coordinators of a casa+serie
  const getTurmaLetrasForCasaSerie = (casaId: number, serie: string): string[] => {
    const ms = getMembrosForCasaSerie(casaId, serie);
    const turmas = [...new Set(ms.map((m) => (m.turma || '').toUpperCase()).filter(Boolean))].sort();
    return turmas.length > 0 ? turmas : [''];
  };

  const getMembrosForCasaSerie = (casaId: number, serie: string) =>
    getMembrosForCasa(casaId).filter((m) => extractSerieNum(m.serie) === serie);

  // Get unique turma letters for a casa+serie combo
  const getTurmasForCasaSerie = (casaId: number, serie: string): string[] => {
    const ms = getMembrosForCasaSerie(casaId, serie);
    const turmas = [...new Set(ms.map((m) => m.turma || '').filter(Boolean))].sort();
    return turmas.length > 0 ? turmas : [''];
  };

  const getMembrosForCasaSerieTurma = (casaId: number, serie: string, turma: string) =>
    getMembrosForCasaSerie(casaId, serie).filter((m) => (m.turma || '') === turma);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] px-4 py-6 flex items-center justify-center">
        <p className="text-white/40 text-sm">Carregando casas...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] px-4 py-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-xl font-bold text-white mb-6">Casas</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {inteligencias.map((casa) => {
            const casaMembros = getMembrosForCasa(casa.id);
            const mentor = getMentorForCasa(casa.id);
            const corHex = casa.cor_hex || '#6366f1';

            return (
              <div
                key={casa.id}
                className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden"
              >
                {/* Header colorido */}
                <div
                  className="px-4 py-3 flex items-center gap-3"
                  style={{ backgroundColor: corHex + '20', borderBottom: `2px solid ${corHex}40` }}
                >
                  <CasaBrasao brasaoUrl={casa.brasao_url} emoji={casa.emoji} nome={casa.nome} size="small" />
                  <div className="flex-1 min-w-0">
                    <h2 className="text-sm font-semibold text-white truncate">{casa.nome}</h2>
                    <p className="text-xs text-white/50">
                      {mentor ? `Mentor: ${mentor.professor_name}` : 'Sem mentor'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-white/40">
                    <Users className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium">{casaMembros.length}</span>
                  </div>
                </div>

                {/* Cargos por série e turma */}
                <div className="px-4 py-3 space-y-1">
                  {SERIES.map((serie) => {
                    const turmaLetras = getTurmaLetrasForCasaSerie(casa.id, serie);
                    
                    return turmaLetras.map((turmaLetra) => {
                      const cargosT = turmaLetra 
                        ? getCargosForCasaSerieTurma(casa.id, serie, turmaLetra) 
                        : getCargosForCasaSerie(casa.id, serie);
                      const coord = cargosT.find((c) => c.cargo === 'coordenador');
                      const membrosCount = turmaLetra
                        ? getMembrosForCasaSerieTurma(casa.id, serie, turmaLetra).length
                        : getMembrosForCasaSerie(casa.id, serie).length;
                      const label = turmaLetra ? `${serie}º ${turmaLetra}` : `${serie}º`;

                      return (
                        <div key={`${serie}-${turmaLetra}`} className="text-xs">
                          <div className="flex items-center gap-2">
                            <span className="text-white/30 w-8 font-medium">{label}</span>
                            <Star className="w-3 h-3 text-blue-400 flex-shrink-0" />
                            <span className="text-white/70 truncate">
                              {coord ? coord.aluno_name : <span className="text-white/25 italic">(vago)</span>}
                            </span>
                            <span className="text-white/20 ml-auto text-[10px]">{membrosCount}</span>
                          </div>
                        </div>
                      );
                    });
                  })}
                  {/* Líder do 9º ano (único por casa) */}
                  {(() => {
                    const lider = getCargosForCasaSerie(casa.id, '9').find((c) => c.cargo === 'líder');
                    return (
                      <div className="flex items-center gap-2 mt-1 ml-8 text-xs">
                        <Crown className="w-3 h-3 text-yellow-400 flex-shrink-0" />
                        <span className="text-white/70 truncate">
                          {lider ? lider.aluno_name : <span className="text-white/25 italic">(vago)</span>}
                        </span>
                      </div>
                    );
                  })()}
                </div>

                {/* Accordion para membros */}
                <Accordion type="single" collapsible>
                  <AccordionItem value="membros" className="border-t border-white/5 border-b-0">
                    <AccordionTrigger className="px-4 py-2 text-xs text-white/40 hover:text-white/60 hover:no-underline">
                      Ver todos os membros
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-3">
                      {SERIES.map((serie) => {
                        const turmasLetras = getTurmasForCasaSerie(casa.id, serie);
                        return turmasLetras.map((turmaLetra) => {
                          const membrosS = getMembrosForCasaSerieTurma(casa.id, serie, turmaLetra);
                          if (membrosS.length === 0) return null;
                          const label = turmaLetra ? `${serie}º ${turmaLetra}` : `${serie}º ano`;
                          return (
                            <div key={`${serie}-${turmaLetra}`} className="mb-3">
                              <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">
                                {label} ({membrosS.length})
                              </p>
                              <div className="space-y-0.5">
                                {membrosS
                                  .sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''))
                                  .map((m) => {
                                    const cargoAluno = cargos.find(
                                      (c) => c.casa_id === casa.id && c.aluno_name === m.full_name
                                    );
                                    return (
                                      <div key={m.id} className="flex items-center gap-2 text-xs text-white/60">
                                        <UserCircle className="w-3 h-3 text-white/20 flex-shrink-0" />
                                        <span className="truncate">{m.full_name}</span>
                                        {cargoAluno?.cargo === 'coordenador' && (
                                          <Badge className="text-[9px] px-1.5 py-0 bg-blue-500/20 text-blue-300 border-blue-500/30">
                                            ⭐ Coord.
                                          </Badge>
                                        )}
                                        {cargoAluno?.cargo === 'líder' && (
                                          <Badge className="text-[9px] px-1.5 py-0 bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
                                            👑 Líder
                                          </Badge>
                                        )}
                                      </div>
                                    );
                                  })}
                              </div>
                            </div>
                          );
                        });
                      })}
                      {casaMembros.length === 0 && (
                        <p className="text-xs text-white/25 italic">Nenhum membro nesta casa</p>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CasasPage;
