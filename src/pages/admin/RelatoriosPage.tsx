import { useState } from 'react';
import { FileText, Download, Loader2, FileSpreadsheet } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';

const PREPOSICOES = ['de', 'da', 'do', 'dos', 'das', 'e', 'del', 'di'];

function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[''`]/g, '')
    .replace(/\s+/g, '')
    .toLowerCase()
    .trim();
}

function getPrimeiroSobrenomeSignificativo(sobrenome: string): string {
  const partes = sobrenome.split(' ').filter(p => p.trim());
  for (const parte of partes) {
    if (!PREPOSICOES.includes(parte.toLowerCase())) {
      return parte;
    }
  }
  return partes[partes.length - 1] || sobrenome;
}

function reconstruirSenha(sobrenome: string): string {
  const primeiro = getPrimeiroSobrenomeSignificativo(sobrenome);
  return normalizeText(primeiro) + '123';
}

interface AlunoCredencial {
  nome: string;
  serie: string;
  turma: string;
  casa: string;
  email: string;
  senha: string;
}

const RelatoriosPage = () => {
  const { user } = useAuth();
  const [exportando, setExportando] = useState<'pdf' | 'csv' | null>(null);

  const { data: adminProfile } = useQuery({
    queryKey: ['admin-profile-inst', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('institution_id')
        .eq('id', user?.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  const institutionId = adminProfile?.institution_id;

  const fetchCredenciais = async (): Promise<AlunoCredencial[]> => {
    if (!institutionId) throw new Error('Sem instituição');

    const { data: alunos, error } = await supabase
      .from('profiles')
      .select('full_name, nome, sobrenome, serie, turma, casa_id, email_gerado, matricula_externa')
      .eq('institution_id', institutionId)
      .eq('segmento', 'fundamental2')
      .eq('conta_criada', true)
      .order('serie')
      .order('turma')
      .order('full_name');

    if (error) throw error;

    // Fetch casas
    const { data: casas } = await supabase
      .from('inteligencias')
      .select('id, nome, emoji');

    const casaMap = new Map((casas || []).map(c => [c.id, `${c.emoji || ''} ${c.nome}`]));

    return (alunos || []).map(a => ({
      nome: a.full_name || `${a.nome || ''} ${a.sobrenome || ''}`.trim(),
      serie: a.serie || '-',
      turma: a.turma || '-',
      casa: a.casa_id ? (casaMap.get(a.casa_id) || '-') : '-',
      email: a.email_gerado || '-',
      senha: a.sobrenome ? reconstruirSenha(a.sobrenome) : '-',
    }));
  };

  const handleExportPDF = async () => {
    setExportando('pdf');
    try {
      const dados = await fetchCredenciais();
      if (dados.length === 0) {
        toast.warning('Nenhum aluno F2 com conta criada encontrado.');
        return;
      }

      const doc = new jsPDF({ orientation: 'landscape' });
      doc.setFontSize(16);
      doc.text('Credenciais dos Alunos - Fundamental 2', 14, 15);
      doc.setFontSize(9);
      doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 14, 22);
      doc.text(`Total: ${dados.length} alunos`, 14, 27);

      autoTable(doc, {
        startY: 32,
        head: [['Nome', 'Série', 'Turma', 'Casa', 'Email (login)', 'Senha']],
        body: dados.map(d => [d.nome, d.serie, d.turma, d.casa, d.email, d.senha]),
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [30, 30, 30], textColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        columnStyles: {
          0: { cellWidth: 50 },
          4: { cellWidth: 70 },
        },
      });

      doc.save('credenciais-f2.pdf');
      toast.success(`PDF gerado com ${dados.length} alunos!`);
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao gerar PDF: ' + err.message);
    } finally {
      setExportando(null);
    }
  };

  const handleExportCSV = async () => {
    setExportando('csv');
    try {
      const dados = await fetchCredenciais();
      if (dados.length === 0) {
        toast.warning('Nenhum aluno F2 com conta criada encontrado.');
        return;
      }

      const csv = Papa.unparse({
        fields: ['Nome', 'Série', 'Turma', 'Casa', 'Email (login)', 'Senha'],
        data: dados.map(d => [d.nome, d.serie, d.turma, d.casa, d.email, d.senha]),
      });

      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'credenciais-f2.csv';
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`CSV gerado com ${dados.length} alunos!`);
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao gerar CSV: ' + err.message);
    } finally {
      setExportando(null);
    }
  };

  // === Líderes e Coordenadores ===
  interface LiderancaRow {
    casa: string;
    nome: string;
    cargo: string;
    serie: string;
    turma: string;
    email: string;
    senha: string;
    mentor: string;
  }

  const fetchLideranca = async (): Promise<LiderancaRow[]> => {
    if (!institutionId) throw new Error('Sem instituicao');

    const [cargosRes, casasRes, mentoresRes] = await Promise.all([
      supabase.from('cargos_casa')
        .select('aluno_id, cargo, casa_id')
        .eq('institution_id', institutionId)
        .eq('ativo', true)
        .eq('ano_letivo', new Date().getFullYear()),
      supabase.from('inteligencias').select('id, nome'),
      supabase.from('professor_casa')
        .select('casa_id, professor:profiles!professor_casa_professor_id_fkey(full_name)')
        .eq('institution_id', institutionId)
        .eq('ativo', true),
    ]);

    if (!cargosRes.data?.length) return [];

    const alunoIds = cargosRes.data.map(c => c.aluno_id);
    const { data: alunos } = await supabase.from('profiles')
      .select('id, full_name, nome, sobrenome, serie, turma, email_gerado')
      .in('id', alunoIds);

    const casaMap = new Map((casasRes.data || []).map(c => [c.id, c.nome]));
    const mentorMap = new Map((mentoresRes.data || []).map((m: any) => [m.casa_id, m.professor?.full_name || '-']));
    const alunoMap = new Map((alunos || []).map(a => [a.id, a]));

    return cargosRes.data.map(c => {
      const a = alunoMap.get(c.aluno_id);
      if (!a) return null;
      const cargoLabel = c.cargo === 'lider' ? 'Lider' : c.cargo === 'coordenador' ? 'Coordenador' : c.cargo;
      return {
        casa: casaMap.get(c.casa_id) || '-',
        nome: a.full_name || `${a.nome || ''} ${a.sobrenome || ''}`.trim(),
        cargo: cargoLabel,
        serie: a.serie || '-',
        turma: a.turma || '-',
        email: a.email_gerado || '-',
        senha: a.sobrenome ? reconstruirSenha(a.sobrenome) : '-',
        mentor: mentorMap.get(c.casa_id) || '-',
      };
    }).filter(Boolean) as LiderancaRow[];
  };

  const handleExportLiderancaPDF = async () => {
    setExportando('pdf');
    try {
      const dados = await fetchLideranca();
      if (dados.length === 0) { toast.warning('Nenhum lider/coordenador encontrado.'); return; }

      const doc = new jsPDF({ orientation: 'landscape' });
      doc.setFontSize(16);
      doc.text('Lideres e Coordenadores - Arboria', 14, 15);
      doc.setFontSize(9);
      doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} as ${new Date().toLocaleTimeString('pt-BR')}`, 14, 22);
      doc.text(`Total: ${dados.length}`, 14, 27);

      autoTable(doc, {
        startY: 32,
        head: [['Casa', 'Nome', 'Cargo', 'Serie', 'Turma', 'Email', 'Senha', 'Professor Mentor']],
        body: dados.map(d => [d.casa, d.nome, d.cargo, d.serie, d.turma, d.email, d.senha, d.mentor]),
        styles: { fontSize: 7, cellPadding: 2 },
        headStyles: { fillColor: [30, 30, 30], textColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: [245, 245, 245] },
      });

      doc.save('lideranca-arboria.pdf');
      toast.success(`PDF gerado com ${dados.length} registros!`);
    } catch (err: any) { toast.error('Erro: ' + err.message); }
    finally { setExportando(null); }
  };

  const handleExportLiderancaCSV = async () => {
    setExportando('csv');
    try {
      const dados = await fetchLideranca();
      if (dados.length === 0) { toast.warning('Nenhum lider/coordenador encontrado.'); return; }

      const csv = Papa.unparse({
        fields: ['Casa', 'Nome', 'Cargo', 'Serie', 'Turma', 'Email', 'Senha', 'Professor Mentor'],
        data: dados.map(d => [d.casa, d.nome, d.cargo, d.serie, d.turma, d.email, d.senha, d.mentor]),
      });

      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'lideranca-arboria.csv';
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`CSV gerado com ${dados.length} registros!`);
    } catch (err: any) { toast.error('Erro: ' + err.message); }
    finally { setExportando(null); }
  };

  return (
    <div className="min-h-screen bg-[#1A1A2E] px-4 py-6">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-indigo-500/10 flex items-center justify-center">
            <FileText className="w-8 h-8 text-indigo-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Relatórios</h1>
          <p className="text-white/50 text-sm">Exportações e documentos da instituição</p>
        </div>

        {/* Card: Credenciais F2 */}
        <div className="p-5 bg-white/5 border border-violet-500/10 rounded-2xl space-y-4">
          <div>
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              🔑 Credenciais dos Alunos — F2
            </h2>
            <p className="text-sm text-white/50 mt-1">
              Exporta nome, série, turma, casa, email de login e senha de todos os alunos do Fundamental 2 que possuem conta criada.
            </p>
          </div>

          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <p className="text-xs text-amber-400">
              ⚠️ Documento sensível — contém senhas. Compartilhe com cuidado.
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleExportPDF}
              disabled={!!exportando || !institutionId}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {exportando === 'pdf' ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Baixar PDF
            </Button>
            <Button
              onClick={handleExportCSV}
              disabled={!!exportando || !institutionId}
              variant="outline"
              className="flex-1 border-violet-500/10 text-white hover:bg-white/10"
            >
              {exportando === 'csv' ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <FileSpreadsheet className="w-4 h-4 mr-2" />
              )}
              Baixar CSV
            </Button>
          </div>
        </div>

        {/* Card: Líderes e Coordenadores */}
        <div className="p-5 bg-white/5 border border-violet-500/10 rounded-2xl space-y-4">
          <div>
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              Lideres e Coordenadores
            </h2>
            <p className="text-sm text-white/50 mt-1">
              Lista com casa, nome, cargo, ano, turma, email, senha e professor mentor.
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleExportLiderancaPDF}
              disabled={!!exportando || !institutionId}
              className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
            >
              {exportando === 'pdf' ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Baixar PDF
            </Button>
            <Button
              onClick={handleExportLiderancaCSV}
              disabled={!!exportando || !institutionId}
              variant="outline"
              className="flex-1 border-violet-500/10 text-white hover:bg-white/10"
            >
              {exportando === 'csv' ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <FileSpreadsheet className="w-4 h-4 mr-2" />
              )}
              Baixar CSV
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RelatoriosPage;
