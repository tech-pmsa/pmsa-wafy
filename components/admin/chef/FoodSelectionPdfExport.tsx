'use client';

import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import { jsPDF } from 'jspdf';

interface FoodItem {
  id: string;
  name: string;
  is_active: boolean;
  display_order: number;
}

interface KitchenStudent {
  student_uid: string;
  name: string;
  cic: string | null;
  class_id: string;
}

interface StudentFoodPreference {
  id: string;
  student_uid: string;
  food_item_id: string;
  is_needed: boolean;
}

interface Props {
  foods: FoodItem[];
  students: KitchenStudent[];
  preferences: StudentFoodPreference[];
}

export function FoodSelectionPdfExport({ foods, students, preferences }: Props) {
  const handleExport = () => {
    const activeFoods = [...foods]
      .filter((f) => f.is_active)
      .sort((a, b) => a.display_order - b.display_order || a.name.localeCompare(b.name));

    const studentMap = new Map(students.map((s) => [s.student_uid, s]));

    const foodSections = activeFoods
      .map((food) => {
        const falseStudents = preferences
          .filter((p) => p.food_item_id === food.id && p.is_needed === false)
          .map((p) => studentMap.get(p.student_uid))
          .filter(Boolean)
          .map((s) => ({
            name: s!.name,
            class_id: s!.class_id,
            cic: s!.cic || '',
          }))
          .sort((a, b) => {
            const classCmp = a.class_id.localeCompare(b.class_id, undefined, { numeric: true, sensitivity: 'base' });
            if (classCmp !== 0) return classCmp;
            return a.cic.localeCompare(b.cic, undefined, { numeric: true, sensitivity: 'base' });
          });

        return {
          foodName: food.name,
          rows: falseStudents,
        };
      })
      .filter((section) => section.rows.length > 0);

    if (foodSections.length === 0) {
      return;
    }

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const margin = 10;
    const headerHeight = 14;
    const footerHeight = 8;
    const gap = 4;
    const colWidth = (pageWidth - margin * 2 - gap * 2) / 3;
    const usableTop = margin + headerHeight;
    const usableBottom = pageHeight - footerHeight;
    const sectionGap = 4;

    let pageNumber = 1;
    let currentColumn = 0;
    let yPositions = [usableTop, usableTop, usableTop];

    const drawPageHeader = () => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.text('Students Not Needing Foods', margin, margin + 5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text('Grouped by food item • Class-wise readable summary', margin, margin + 10);
    };

    const drawPageFooter = () => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(`Page ${pageNumber}`, pageWidth - margin, pageHeight - 4, { align: 'right' });
    };

    const addNewPage = () => {
      drawPageFooter();
      doc.addPage();
      pageNumber += 1;
      currentColumn = 0;
      yPositions = [usableTop, usableTop, usableTop];
      drawPageHeader();
    };

    const getColumnX = (columnIndex: number) => margin + columnIndex * (colWidth + gap);

    const ensureColumnSpace = (neededHeight: number) => {
      while (yPositions[currentColumn] + neededHeight > usableBottom) {
        if (currentColumn < 2) {
          currentColumn += 1;
        } else {
          addNewPage();
        }
      }
    };

    drawPageHeader();

    foodSections.forEach((section) => {
      const sectionBaseHeight = 8;
      ensureColumnSpace(sectionBaseHeight);

      const x = getColumnX(currentColumn);
      let y = yPositions[currentColumn];

      doc.setFillColor(245, 245, 245);
      doc.setDrawColor(200);
      doc.roundedRect(x, y, colWidth, 7, 1.5, 1.5, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(section.foodName, x + 2, y + 4.8);

      y += 9;

      let currentClass = '';
      section.rows.forEach((row) => {
        const isNewClass = row.class_id !== currentClass;
        const needed = isNewClass ? 8 : 4.5;

        ensureColumnSpace(needed);
        const actualX = getColumnX(currentColumn);

        if (yPositions[currentColumn] !== y) {
          y = yPositions[currentColumn];
        }

        if (isNewClass) {
          currentClass = row.class_id;
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);
          doc.text(currentClass, actualX + 1, y + 3.5);
          y += 4.5;
        }

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.text(`• ${row.name}`, actualX + 3, y + 3.5);
        y += 4;
        yPositions[currentColumn] = y;
      });

      y += sectionGap;
      yPositions[currentColumn] = y;
    });

    drawPageFooter();
    doc.save('students-food-false-report.pdf');
  };

  return (
    <Button type="button" variant="outline" onClick={handleExport}>
      <FileDown className="mr-2 h-4 w-4" />
      Export Foods PDF
    </Button>
  );
}