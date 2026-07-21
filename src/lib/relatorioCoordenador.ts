// ============================================================
// Relatorio do segmento (coordenador) em PDF. So COBERTURA/CONTAGEM (decisao do
// Fundador 21/07): sem texto de observacao, so metadados/agregados que o
// coordenador ja ve no visor. Uma foto da FASE ATUAL de cada turma:
// professor, fase, "observados na fase" (cobertura), atividades feitas, ultimo acesso.
// ============================================================
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { SerieGrupo } from '@/hooks/useCoordenadorGestao';

const fmtData = (iso: string | null): string =>
  iso ? new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

export function gerarRelatorioSegmentoPDF(
  segLabel: string,
  coordNome: string | null,
  grupos: SerieGrupo[],
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const hoje = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  // Cabecalho
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(28, 34, 48);
  doc.text('Projeto Arboria · Relatório da fase atual', 40, 46);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(90, 100, 115);
  doc.text(`Segmento: ${segLabel}`, 40, 64);
  doc.text(`Coordenação: ${coordNome || '—'}   ·   Gerado em ${hoje}`, 40, 78);

  let y = 98;
  for (const g of grupos) {
    const linhas = g.turmas.map((t) => [
      t.nome,
      t.professorNome || (t.segmento === 'fundamental2' ? 'Mentoria por Casa' : 'Sem professor'),
      t.faseNome || 'Não iniciada',
      `${t.nObservados}/${t.nAlunos}`,
      `${t.atividadesFeitas}/${t.atividadesTotal}`,
      fmtData(t.ultimaAtividade),
    ]);
    autoTable(doc, {
      startY: y,
      head: [[g.serieLabel, 'Professor', 'Fase atual', 'Observados', 'Atividades', 'Último acesso']],
      body: linhas,
      styles: { fontSize: 9, cellPadding: 4, textColor: [40, 46, 60] },
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [246, 247, 249] },
      margin: { left: 40, right: 40 },
      theme: 'grid',
    });
    // finalY vem do plugin; tipagem nao expoe, entao lemos com cast controlado.
    y = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 18;
    if (y > 730) {
      doc.addPage();
      y = 46;
    }
  }

  // Nota de doutrina (a mesma do visor): cobertura protege, nao ranqueia.
  doc.setFontSize(8);
  doc.setTextColor(120, 128, 140);
  doc.text(
    'Cobertura "observados na fase" mostra se todos os alunos estão sendo vistos pelo professor. Protege a criança silenciosa. Não é nota, não compara crianças.',
    40,
    Math.min(y + 4, 805),
    { maxWidth: 515 },
  );

  const nomeArq = `relatorio-${segLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${hoje.replace(/\//g, '-')}.pdf`;
  doc.save(nomeArq);
}
