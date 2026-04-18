// Génération du relevé de notes PDF
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { GlobalReport, getAppreciation, MODULE_LABELS } from './grading';

interface ReportMeta {
  studentName: string;
  studentPhone?: string;
  generatedAt: Date;
}

export function generateGradeReportPDF(report: GlobalReport, meta: ReportMeta): Blob {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(245, 158, 11);
  doc.rect(0, 0, pageW, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Relevé de notes — Classe FITILA', pageW / 2, 13, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Bariba — Apprentissage de la langue', pageW / 2, 22, { align: 'center' });

  // Student info
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Apprenant :', 14, 42);
  doc.setFont('helvetica', 'normal');
  doc.text(meta.studentName, 45, 42);
  if (meta.studentPhone) {
    doc.text(`Tél : ${meta.studentPhone}`, pageW - 14, 42, { align: 'right' });
  }
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(`Édité le ${meta.generatedAt.toLocaleDateString('fr-FR')} à ${meta.generatedAt.toLocaleTimeString('fr-FR')}`, 14, 48);

  // Moyenne globale
  const avg = report.global_average;
  const appreciation = getAppreciation(avg);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 54, pageW - 28, 22, 3, 3, 'F');
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text('MOYENNE GÉNÉRALE', 18, 62);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(245, 158, 11);
  doc.text(`${avg !== null ? avg.toFixed(2) : '—'} / 20`, 18, 72);
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text(`Appréciation : ${appreciation}`, pageW - 18, 68, { align: 'right' });
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(`${report.total_graded}/${report.total_questions} questions corrigées`, pageW - 18, 74, { align: 'right' });

  let y = 84;

  // Détail par module
  for (const mod of report.modules) {
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(`${MODULE_LABELS[mod.module] ?? mod.module} — ${mod.level}`, 14, y);
    doc.setFontSize(11);
    doc.setTextColor(245, 158, 11);
    doc.text(`${mod.average !== null ? mod.average.toFixed(2) : '—'}/20`, pageW - 14, y, { align: 'right' });
    y += 4;

    const rows: (string | number)[][] = [];
    for (const ch of mod.chapters) {
      rows.push([
        `📚 ${ch.title_fr}`,
        '',
        ch.average !== null ? `${ch.average.toFixed(2)}/20` : '—',
        getAppreciation(ch.average),
      ]);
      for (const lesson of ch.lessons) {
        rows.push([
          `   Leçon ${lesson.lesson_id}`,
          `${lesson.sections.length} section(s)`,
          lesson.average !== null ? `${lesson.average.toFixed(2)}/20` : '—',
          getAppreciation(lesson.average),
        ]);
      }
    }

    autoTable(doc, {
      startY: y,
      head: [['Chapitre / Leçon', 'Détails', 'Note', 'Appréciation']],
      body: rows,
      theme: 'striped',
      headStyles: { fillColor: [245, 158, 11], textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      margin: { left: 14, right: 14 },
    });
    // @ts-expect-error lastAutoTable is added by jspdf-autotable
    y = (doc.lastAutoTable?.finalY ?? y) + 8;
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `FITILA Classe — Page ${i}/${pageCount}`,
      pageW / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'center' }
    );
  }

  return doc.output('blob');
}
