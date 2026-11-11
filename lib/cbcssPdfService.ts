export interface CbcssRecordPdf {
  id: string;
  batch: string;
  semester: string;
  course_type: 'OFF COURSE' | 'IN COURSE';
  course_name: string;
  instead_of: string;
  credits: number;
}

export interface CbcssStudentPdf {
  id?: string;
  record_id: string;
  student_uid: string;
  student_name: string;
  cic?: string | null;
}

export interface ExportCbcssPdfParams {
  className: string;
  semester: string;
  records: CbcssRecordPdf[];
  recordStudents: CbcssStudentPdf[];
}

function escapeHtml(text: string | null | undefined): string {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export async function exportCbcssPdf({
  className,
  semester,
  records,
  recordStudents,
}: ExportCbcssPdfParams): Promise<void> {
  if (typeof window === 'undefined') return;

  const semLabel = semester === 'SEM-1' ? 'Semester 1 (SEM-1)' : 'Semester 2 (SEM-2)';
  const now = new Date();
  const generatedAt = `${now.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })} at ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;

  const totalCourses = records.length;
  const inCourses = records.filter((r) => r.course_type === 'IN COURSE').length;
  const offCourses = records.filter((r) => r.course_type === 'OFF COURSE').length;
  const totalCredits = records.reduce((sum, r) => sum + (Number(r.credits) || 0), 0);

  // Group students by record_id
  const studentsByRecord: Record<string, CbcssStudentPdf[]> = {};
  recordStudents.forEach((s) => {
    if (!studentsByRecord[s.record_id]) studentsByRecord[s.record_id] = [];
    studentsByRecord[s.record_id].push(s);
  });

  const cardsHtml = records
    .map((rec, idx) => {
      const students = studentsByRecord[rec.id] || [];
      const isOff = rec.course_type === 'OFF COURSE';
      const badgeClass = isOff ? 'badge-off' : 'badge-in';

      const studentChips = students.length
        ? students
            .map(
              (s) =>
                `<span class="student-chip">${escapeHtml(s.student_name)}${
                  s.cic ? ` <small>(${escapeHtml(s.cic)})</small>` : ''
                }</span>`
            )
            .join(' ')
        : `<span style="color: #94A3B8; font-style: italic;">No students enrolled</span>`;

      return `
      <div class="course-card">
        <div class="course-header">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="course-number">#${idx + 1}</span>
            <span class="badge ${badgeClass}">${escapeHtml(rec.course_type)}</span>
            <span class="course-title">${escapeHtml(rec.course_name)}</span>
          </div>
          <div class="credits-badge">${rec.credits} Credits</div>
        </div>

        <div class="course-body">
          <div class="instead-of-box">
            <span class="instead-label">Instead of (Replaced Subject):</span>
            <span class="instead-value">${escapeHtml(rec.instead_of)}</span>
          </div>

          <div style="margin-top: 10px;">
            <div class="students-label">Enrolled Students (${students.length}):</div>
            <div class="chip-container">${studentChips}</div>
          </div>
        </div>
      </div>
      `;
    })
    .join('');

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>CBCSS Report - ${escapeHtml(className)}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 14mm 12mm 14mm 12mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Arabic", Arial, sans-serif;
      color: #0F172A;
      background: #FFFFFF;
      font-size: 12px;
      line-height: 1.5;
      padding: 16px;
    }
    .header-banner {
      background: linear-gradient(135deg, #1E1B4B 0%, #312E81 100%);
      color: #FFFFFF;
      padding: 22px 24px;
      border-radius: 12px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .college-name {
      font-size: 18px;
      font-weight: 800;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      color: #F8FAFC;
    }
    .report-title {
      font-size: 14px;
      font-weight: 700;
      color: #A5B4FC;
      margin-top: 4px;
      letter-spacing: 0.3px;
    }
    .header-meta {
      font-size: 11px;
      color: #C7D2FE;
      margin-top: 6px;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 16px;
    }
    .summary-box {
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      padding: 10px 12px;
      text-align: center;
    }
    .summary-value {
      font-size: 18px;
      font-weight: 800;
      color: #1E1B4B;
    }
    .summary-label {
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748B;
      margin-top: 2px;
    }
    .course-card {
      border: 1px solid #E2E8F0;
      border-radius: 10px;
      margin-bottom: 12px;
      page-break-inside: avoid;
      background: #FFFFFF;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
      overflow: hidden;
    }
    .course-header {
      background: #F8FAFC;
      border-bottom: 1px solid #E2E8F0;
      padding: 10px 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .course-number {
      font-size: 12px;
      font-weight: 800;
      color: #64748B;
    }
    .course-title {
      font-size: 14px;
      font-weight: 700;
      color: #0F172A;
    }
    .badge {
      display: inline-block;
      font-size: 10px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .badge-in {
      background: #EFF6FF;
      color: #1D4ED8;
      border: 1px solid #BFDBFE;
    }
    .badge-off {
      background: #FEF3C7;
      color: #B45309;
      border: 1px solid #FDE68A;
    }
    .credits-badge {
      background: #1E1B4B;
      color: #FFFFFF;
      font-size: 11px;
      font-weight: 700;
      padding: 3px 10px;
      border-radius: 6px;
    }
    .course-body {
      padding: 12px 14px;
    }
    .instead-of-box {
      background: #F1F5F9;
      border-left: 3px solid #6366F1;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 11.5px;
    }
    .instead-label {
      font-weight: 600;
      color: #475569;
    }
    .instead-value {
      font-weight: 700;
      color: #0F172A;
      margin-left: 4px;
    }
    .students-label {
      font-size: 11px;
      font-weight: 700;
      color: #475569;
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .chip-container {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .student-chip {
      background: #F8FAFC;
      border: 1px solid #CBD5E1;
      border-radius: 6px;
      padding: 3px 8px;
      font-size: 11px;
      font-weight: 500;
      color: #1E293B;
    }
    .student-chip small {
      color: #64748B;
      font-weight: 600;
    }
    .footer {
      margin-top: 24px;
      padding-top: 10px;
      border-top: 1px solid #E2E8F0;
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: #94A3B8;
    }
    @media print {
      body {
        padding: 0;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="header-banner">
    <div>
      <div class="college-name">PMSA Orphanage College</div>
      <div class="report-title">Choice Based Credit Semester System (CBCSS)</div>
      <div class="header-meta">Class: <strong>${escapeHtml(className)}</strong> &nbsp;|&nbsp; ${semLabel}</div>
    </div>
    <div style="text-align: right;">
      <div style="font-size: 11px; color: #C7D2FE;">Generated on</div>
      <div style="font-size: 12px; font-weight: 600; color: #F8FAFC; margin-top: 2px;">${generatedAt}</div>
    </div>
  </div>

  <div class="summary-grid">
    <div class="summary-box">
      <div class="summary-value">${totalCourses}</div>
      <div class="summary-label">Total Courses</div>
    </div>
    <div class="summary-box">
      <div class="summary-value" style="color: #2563EB;">${inCourses}</div>
      <div class="summary-label">In Course</div>
    </div>
    <div class="summary-box">
      <div class="summary-value" style="color: #D97706;">${offCourses}</div>
      <div class="summary-label">Off Course</div>
    </div>
    <div class="summary-box">
      <div class="summary-value" style="color: #059669;">${totalCredits}</div>
      <div class="summary-label">Total Credits</div>
    </div>
  </div>

  ${cardsHtml}

  <div class="footer">
    <div>PMSA Wafy Portal &bull; Official Academic Record</div>
    <div>Page 1 of 1</div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 300);
    };
  </script>
</body>
</html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  }
}
