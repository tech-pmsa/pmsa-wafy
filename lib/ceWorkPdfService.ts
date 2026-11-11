export interface CeWorkItemPdf {
  id: string;
  batch: string;
  semester?: string;
  work_name: string;
  subject_name: string;
  teacher_name?: string | null;
  started_date: string;
  submission_date: string;
  mark?: number | null;
}

export interface CeWorkStudentPdf {
  id?: string;
  work_id: string;
  student_uid: string;
  student_name: string;
  cic?: string | null;
  is_submitted: boolean;
}

export interface ExportCeWorkPdfParams {
  className: string;
  semester: string;
  works: CeWorkItemPdf[];
  workStudents: CeWorkStudentPdf[];
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

function displayDate(value?: string | null) {
  if (!value) return '-';
  const [year, month, day] = value.split('T')[0].split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
}

export async function exportCeWorkPdf({
  className,
  semester,
  works,
  workStudents,
}: ExportCeWorkPdfParams): Promise<void> {
  if (typeof window === 'undefined') return;

  const semLabel = semester === 'SEM-1' ? 'Semester 1 (SEM-1)' : 'Semester 2 (SEM-2)';
  const now = new Date();
  const generatedAt = `${now.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })} at ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;

  const totalWorks = works.length;
  let totalSubmitted = 0;
  let totalPending = 0;

  workStudents.forEach((ws) => {
    if (ws.is_submitted) totalSubmitted++;
    else totalPending++;
  });

  const totalPossible = totalSubmitted + totalPending;
  const completionRate =
    totalPossible > 0 ? ((totalSubmitted / totalPossible) * 100).toFixed(1) : '0.0';

  // Group student rows by work_id
  const rowsByWork: Record<string, CeWorkStudentPdf[]> = {};
  workStudents.forEach((ws) => {
    if (!rowsByWork[ws.work_id]) rowsByWork[ws.work_id] = [];
    rowsByWork[ws.work_id].push(ws);
  });

  const worksTableHtml = works
    .map((w, idx) => {
      const rows = rowsByWork[w.id] || [];
      const submittedCount = rows.filter((r) => r.is_submitted).length;
      const totalCount = rows.length;
      const percent = totalCount > 0 ? Math.round((submittedCount / totalCount) * 100) : 0;
      const statusBadge =
        percent === 100
          ? `<span class="badge badge-success">Completed</span>`
          : percent > 50
          ? `<span class="badge badge-info">${percent}% Done</span>`
          : `<span class="badge badge-warning">${percent}% Done</span>`;

      return `
      <tr>
        <td style="text-align: center; font-weight: 600;">${idx + 1}</td>
        <td>
          <div class="work-name">${escapeHtml(w.work_name)}</div>
          <div class="sub-text">${escapeHtml(w.subject_name)}</div>
        </td>
        <td>${escapeHtml(w.teacher_name || '—')}</td>
        <td style="text-align: center; font-weight: 600;">${w.mark ?? '—'}</td>
        <td style="white-space: nowrap; font-size: 11px;">
          <div><span style="color: #64748B;">Start:</span> ${displayDate(w.started_date)}</div>
          <div><span style="color: #64748B;">Due:</span> ${displayDate(w.submission_date)}</div>
        </td>
        <td style="text-align: center;">
          <div style="font-weight: 700; font-size: 13px;">${submittedCount} / ${totalCount}</div>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${percent}%;"></div>
          </div>
        </td>
        <td style="text-align: center;">${statusBadge}</td>
      </tr>
      `;
    })
    .join('');

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>CE Work Report - ${escapeHtml(className)}</title>
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
      background: linear-gradient(135deg, #0A2540 0%, #1A365D 100%);
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
      color: #93C5FD;
      margin-top: 4px;
      letter-spacing: 0.3px;
    }
    .header-meta {
      font-size: 11px;
      color: #CBD5E1;
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
      color: #0A2540;
    }
    .summary-label {
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748B;
      margin-top: 2px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      overflow: hidden;
    }
    th {
      background: #F1F5F9;
      color: #334155;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 10px 12px;
      border-bottom: 1px solid #CBD5E1;
      text-align: left;
    }
    td {
      padding: 10px 12px;
      border-bottom: 1px solid #E2E8F0;
      font-size: 11.5px;
      color: #0F172A;
      vertical-align: middle;
    }
    tr:nth-child(even) {
      background: #F8FAFC;
    }
    .work-name {
      font-weight: 700;
      color: #0F172A;
    }
    .sub-text {
      font-size: 11px;
      color: #64748B;
      margin-top: 2px;
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
    .badge-success {
      background: #DCFCE7;
      color: #15803D;
      border: 1px solid #BBF7D0;
    }
    .badge-info {
      background: #EFF6FF;
      color: #1D4ED8;
      border: 1px solid #BFDBFE;
    }
    .badge-warning {
      background: #FEF3C7;
      color: #B45309;
      border: 1px solid #FDE68A;
    }
    .progress-bar {
      width: 80px;
      height: 6px;
      background: #E2E8F0;
      border-radius: 3px;
      overflow: hidden;
      margin: 4px auto 0;
    }
    .progress-fill {
      height: 100%;
      background: #0A2540;
      border-radius: 3px;
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
    }
  </style>
</head>
<body>
  <div class="header-banner">
    <div>
      <div class="college-name">PMSA Orphanage College</div>
      <div class="report-title">Continuous Evaluation (CE Work) Report</div>
      <div class="header-meta">Class: <strong>${escapeHtml(className)}</strong> &nbsp;|&nbsp; ${semLabel}</div>
    </div>
    <div style="text-align: right;">
      <div style="font-size: 11px; color: #CBD5E1;">Generated on</div>
      <div style="font-size: 12px; font-weight: 600; color: #F8FAFC; margin-top: 2px;">${generatedAt}</div>
    </div>
  </div>

  <div class="summary-grid">
    <div class="summary-box">
      <div class="summary-value">${totalWorks}</div>
      <div class="summary-label">Total Works</div>
    </div>
    <div class="summary-box">
      <div class="summary-value" style="color: #15803D;">${totalSubmitted}</div>
      <div class="summary-label">Submitted</div>
    </div>
    <div class="summary-box">
      <div class="summary-value" style="color: #DC2626;">${totalPending}</div>
      <div class="summary-label">Pending</div>
    </div>
    <div class="summary-box">
      <div class="summary-value" style="color: #0284C7;">${completionRate}%</div>
      <div class="summary-label">Completion Rate</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 36px; text-align: center;">#</th>
        <th>Work & Subject</th>
        <th>Teacher</th>
        <th style="width: 50px; text-align: center;">Mark</th>
        <th style="width: 140px;">Dates</th>
        <th style="width: 110px; text-align: center;">Submissions</th>
        <th style="width: 90px; text-align: center;">Status</th>
      </tr>
    </thead>
    <tbody>
      ${worksTableHtml}
    </tbody>
  </table>

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
