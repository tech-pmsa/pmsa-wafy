'use client';

import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import { jsPDF } from 'jspdf';

interface KitchenTable {
  id: string;
  table_number: number;
  table_name: string | null;
  is_active: boolean;
  row_number: number;
  row_position: 'left' | 'middle' | 'right';
  orientation: 'horizontal' | 'vertical';
  active_seat_count: number;
  display_order: number;
}

interface KitchenStudent {
  student_uid: string;
  name: string;
  cic: string | null;
  class_id: string;
  batch: string | null;
  council: string | null;
  day_present: boolean;
  noon_present: boolean;
  night_present: boolean;
}

interface SeatAssignment {
  id: string;
  student_uid: string;
  kitchen_table_id: string;
  seat_number: number;
}

interface ChefTablesPdfExportProps {
  tables: KitchenTable[];
  students: KitchenStudent[];
  assignments: SeatAssignment[];
}

interface TableStudentRow {
  seat_number: number;
  name: string;
  cic: string;
  class_id: string;
}

function truncateText(text: string, maxLength: number) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}…`;
}

export function ChefTablesPdfExport({
  tables,
  students,
  assignments,
}: ChefTablesPdfExportProps) {
  const handleExportPdf = () => {
    const activeTables = [...tables]
      .filter((table) => table.is_active)
      .sort((a, b) => {
        if (a.row_number !== b.row_number) return a.row_number - b.row_number;
        if (a.display_order !== b.display_order) return a.display_order - b.display_order;
        return a.table_number - b.table_number;
      });

    if (activeTables.length === 0) {
      return;
    }

    const studentMap = new Map(students.map((student) => [student.student_uid, student]));

    const tableData = activeTables.map((table) => {
      const rows: TableStudentRow[] = assignments
        .filter((assignment) => assignment.kitchen_table_id === table.id)
        .sort((a, b) => a.seat_number - b.seat_number)
        .map((assignment) => {
          const student = studentMap.get(assignment.student_uid);

          return {
            seat_number: assignment.seat_number,
            name: student?.name || 'Unknown',
            cic: student?.cic || '—',
            class_id: student?.class_id || '—',
          };
        });

      return {
        table,
        rows,
      };
    });

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const margin = 10;
    const contentWidth = pageWidth - margin * 2;
    const bottomLimit = pageHeight - 12;

    const colSeat = 16;
    const colName = 78;
    const colCic = 35;
    const colClass = contentWidth - colSeat - colName - colCic;

    let pageNumber = 1;
    let y = 0;

    const drawPageHeader = (isFirstPage = false) => {
      y = margin;

      if (isFirstPage) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(17);
        doc.text('Chef Table Full Report', margin, y);

        y += 6;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(`Active Tables: ${tableData.length}`, margin, y);

        y += 8;
      } else {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.text('Chef Table Full Report', margin, y);
        y += 7;
      }
    };

    const drawPageFooter = () => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(`Page ${pageNumber}`, pageWidth - margin, pageHeight - 5, { align: 'right' });
    };

    const startNewPage = () => {
      drawPageFooter();
      doc.addPage();
      pageNumber += 1;
      drawPageHeader(false);
    };

    const ensureSpace = (neededHeight: number) => {
      if (y + neededHeight > bottomLimit) {
        startNewPage();
      }
    };

    const drawTableSectionHeader = (title: string, totalStudents: number) => {
      ensureSpace(16);

      doc.setDrawColor(180);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(margin, y, contentWidth, 10, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(title, margin + 3, y + 6.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`Total Students: ${totalStudents}`, pageWidth - margin - 3, y + 6.5, {
        align: 'right',
      });

      y += 12;
    };

    const drawTableColumnHeader = () => {
      ensureSpace(8);

      doc.setDrawColor(200);
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, y, contentWidth, 7, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);

      let x = margin;
      doc.text('Seat', x + 2, y + 4.8);
      x += colSeat;

      doc.text('Name', x + 2, y + 4.8);
      x += colName;

      doc.text('CIC', x + 2, y + 4.8);
      x += colCic;

      doc.text('Class', x + 2, y + 4.8);

      y += 7;
    };

    const drawStudentRow = (row: TableStudentRow, index: number) => {
      ensureSpace(7);

      const fill = index % 2 === 0;
      if (fill) {
        doc.setFillColor(250, 250, 250);
        doc.rect(margin, y, contentWidth, 7, 'F');
      }

      doc.setDrawColor(225);
      doc.rect(margin, y, contentWidth, 7);

      let x = margin;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);

      doc.text(String(row.seat_number), x + 2, y + 4.8);
      x += colSeat;

      doc.text(truncateText(row.name, 34), x + 2, y + 4.8);
      x += colName;

      doc.text(truncateText(row.cic, 14), x + 2, y + 4.8);
      x += colCic;

      doc.text(truncateText(row.class_id, 18), x + 2, y + 4.8);

      y += 7;
    };

    drawPageHeader(true);

    tableData.forEach((item, tableIndex) => {
      const tableTitle = item.table.table_name || `Table ${item.table.table_number}`;
      const sectionTitle = `${tableTitle}`;

      drawTableSectionHeader(sectionTitle, item.rows.length);
      drawTableColumnHeader();

      if (item.rows.length === 0) {
        ensureSpace(7);

        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8.5);
        doc.text('No students assigned', margin + 2, y + 4.8);

        doc.setDrawColor(225);
        doc.rect(margin, y, contentWidth, 7);

        y += 9;
      } else {
        item.rows.forEach((row, rowIndex) => {
          if (y + 7 > bottomLimit) {
            startNewPage();
            drawTableSectionHeader(`${sectionTitle} (continued)`, item.rows.length);
            drawTableColumnHeader();
          }

          drawStudentRow(row, rowIndex);
        });

        y += 4;
      }

      if (tableIndex !== tableData.length - 1) {
        ensureSpace(4);
        y += 2;
      }
    });

    drawPageFooter();
    doc.save('chef-table-full-report.pdf');
  };

  return (
    <Button type="button" variant="outline" onClick={handleExportPdf}>
      <FileDown className="mr-2 h-4 w-4" />
      Export PDF
    </Button>
  );
}