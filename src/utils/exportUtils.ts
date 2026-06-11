/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as XLSX from 'xlsx';
import { AttendanceRecord } from '../types';

/**
 * Utility to convert raw Base64 image to image size suitable for tables
 * (Optional if needed, but for Word HTML it works natively inline)
 */
function cleanBase64ForWord(base64?: string): string {
  if (!base64) return '';
  return `<img src="${base64}" width="80" height="35" style="border: 1px solid #e2e8f0; border-radius: 4px;" />`;
}

/**
 * 1. Export to Excel (.xlsx) using the installed SheetJS library
 */
export function exportToExcel(records: AttendanceRecord[], meetingDate: string) {
  const formattedDate = new Date(meetingDate).toLocaleDateString('km-KH', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  // Flat data for Excel rows
  const excelData = records.map((rec, index) => ({
    'ល.រ': index + 1,
    'គោត្តនាម-នាម': rec.name,
    'ភេទ': rec.gender,
    'សាលារៀន': rec.school,
    'តួនាទី / ឯកទេស': rec.role,
    'វេនបង្រៀន': rec.shift,
    'ម៉ោងចូល': rec.timeIn || 'មិនទាន់ចូល',
    'ទីតាំងចូល GPS': rec.locationIn ? `${rec.locationIn.latitude.toFixed(5)}, ${rec.locationIn.longitude.toFixed(5)}` : 'គ្មាន',
    'ហត្ថលេខាចូល': rec.signatureIn ? 'បានចុះឈ្មោះ' : 'គ្មាន',
    'ម៉ោងចេញ': rec.timeOut || 'មិនទាន់ចេញ',
    'ទីតាំងចេញ GPS': rec.locationOut ? `${rec.locationOut.latitude.toFixed(5)}, ${rec.locationOut.longitude.toFixed(5)}` : 'គ្មាន',
    'ហត្ថលេខាចេញ': rec.signatureOut ? 'បានចុះឈ្មោះ' : 'គ្មាន',
    'ផ្សេងៗ': rec.remarks || ''
  }));

  // Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(excelData);

  // Set column widths matching the Khmer content lengths
  const wscols = [
    { wch: 6 },  // ល.រ
    { wch: 22 }, // ឈ្មោះ
    { wch: 8 },  // ភេទ
    { wch: 30 }, // សាលារៀន
    { wch: 22 }, // តួនាទី
    { wch: 10 }, // វេន
    { wch: 12 }, // ម៉ោងចូល
    { wch: 25 }, // GPS ចូល
    { wch: 15 }, // ហត្ថលេខាចូល
    { wch: 12 }, // ម៉ោងចេញ
    { wch: 25 }, // GPS ចេញ
    { wch: 15 }, // ហត្ថលេខាចេញ
    { wch: 20 }  // ផ្សេងៗ
  ];
  worksheet['!cols'] = wscols;

  // Create workbook and append sheet
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'វត្តមានប្រជុំ');

  // Trigger download file
  XLSX.writeFile(workbook, `បញ្ជីវត្តមានកម្រងអូរស្រឡៅ_${meetingDate}.xlsx`);
}

/**
 * 2. Export to MS Word (.doc) using HTML-based XML wrapper.
 * This is the ultimate client-side approach for Word because it retains the
 * complex Khmer script ligatures, full table grids, signature image previews, 
 * and Cambodia's national header format natively!
 */
export function exportToWord(records: AttendanceRecord[], meetingDate: string, selectedSchool?: string) {
  const formattedDate = new Date(meetingDate).toLocaleDateString('km-KH', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const solarDateKhmer = (() => {
    try {
      const d = new Date(meetingDate);
      const day = d.getDate();
      const month = d.getMonth();
      const year = d.getFullYear();
      const khmerNumbers = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];
      const khmerMonths = [
        'មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា',
        'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'
      ];
      const toKhmer = (num: number) => num.toString().split('').map(x => {
        const idx = parseInt(x, 10);
        return !isNaN(idx) ? khmerNumbers[idx] : x;
      }).join('');
      return `ថ្ងៃទី ${toKhmer(day)} ខែ ${khmerMonths[month]} ឆ្នាំ ${toKhmer(year)}`;
    } catch {
      return '';
    }
  })();

  const tableRows = records.map((rec, index) => {
    return `
      <tr style="mso-yfti-irow:${index + 1}; height: 45pt;">
        <td style="border:solid #cbd5e1 1.0pt; padding:6px; text-align:center; font-family:'Khmer OS Battambang', 'Inter', sans-serif; font-size:10.5pt;">
          ${index + 1}
        </td>
        <td style="border:solid #cbd5e1 1.0pt; padding:6px; font-weight:bold; font-family:'Khmer OS Battambang', 'Inter', sans-serif; font-size:10.5pt;">
          ${rec.name}
        </td>
        <td style="border:solid #cbd5e1 1.0pt; padding:6px; text-align:center; font-family:'Khmer OS Battambang', 'Inter', sans-serif; font-size:10.5pt;">
          ${rec.gender}
        </td>
        <td style="border:solid #cbd5e1 1.0pt; padding:6px; font-family:'Khmer OS Battambang', 'Inter', sans-serif; font-size:9.5pt;">
          ${rec.school}
        </td>
        <td style="border:solid #cbd5e1 1.0pt; padding:6px; font-family:'Khmer OS Battambang', 'Inter', sans-serif; font-size:9.5pt;">
          ${rec.role}
        </td>
        <td style="border:solid #cbd5e1 1.0pt; padding:6px; text-align:center; font-family:'Khmer OS Battambang', 'Inter', sans-serif; font-size:9.5pt;">
          ${rec.shift}
        </td>
        <td style="border:solid #cbd5e1 1.0pt; padding:6px; text-align:center; font-family:'Consolas', monospace; font-size:9.5pt; color: #0284c7;">
          ${rec.timeIn || '-'}
        </td>
        <td style="border:solid #cbd5e1 1.0pt; padding:6px; text-align:center;">
          ${rec.signatureIn ? cleanBase64ForWord(rec.signatureIn) : '-'}
        </td>
        <td style="border:solid #cbd5e1 1.0pt; padding:4px; text-align:center; font-family:'Consolas', monospace; font-size:8pt; color: #475569;">
          ${rec.locationIn ? `${rec.locationIn.latitude.toFixed(4)},<br>${rec.locationIn.longitude.toFixed(4)}` : '-'}
        </td>
        <td style="border:solid #cbd5e1 1.0pt; padding:6px; text-align:center; font-family:'Consolas', monospace; font-size:9.5pt; color: #059669;">
          ${rec.timeOut || '-'}
        </td>
        <td style="border:solid #cbd5e1 1.0pt; padding:6px; text-align:center;">
          ${rec.signatureOut ? cleanBase64ForWord(rec.signatureOut) : '-'}
        </td>
        <td style="border:solid #cbd5e1 1.0pt; padding:4px; text-align:center; font-family:'Consolas', monospace; font-size:8pt; color: #475569;">
          ${rec.locationOut ? `${rec.locationOut.latitude.toFixed(4)},<br>${rec.locationOut.longitude.toFixed(4)}` : '-'}
        </td>
        <td style="border:solid #cbd5e1 1.0pt; padding:6px; font-family:'Khmer OS Battambang', 'Inter', sans-serif; font-size:9.5pt;">
          ${rec.remarks || ''}
        </td>
      </tr>
    `;
  }).join('');

  const wordHtml = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <title>បញ្ជីវត្តមានកិច្ចប្រជុំ</title>
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>90</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
        @page {
          size: A4 landscape;
          margin: 1.0in 0.75in 1.0in 0.75in;
        }
        body {
          font-family: 'Khmer OS Battambang', 'Inter', Arial, sans-serif;
          color: #1e293b;
          line-height: 1.4;
        }
        .header-table {
          width: 100%;
          border-collapse: collapse;
          border: none;
          margin-bottom: 24pt;
        }
        .header-table td {
          border: none;
          vertical-align: top;
        }
        .title {
          text-align: center;
          font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', sans-serif;
          font-size: 16pt;
          font-weight: bold;
          color: #0c4a6e;
          margin-bottom: 5pt;
        }
        .subtitle {
          text-align: center;
          font-family: 'Khmer OS Battambang', sans-serif;
          font-size: 11pt;
          color: #475569;
          margin-bottom: 18pt;
        }
        .attendance-table {
          width: 100%;
          border-collapse: collapse;
          border: 1.0pt solid #cbd5e1;
        }
        .attendance-table th {
          background-color: #f1f5f9;
          border: 1.0pt solid #94a3b8;
          padding: 8px;
          font-family: 'Khmer OS Battambang', sans-serif;
          font-size: 10pt;
          font-weight: bold;
          text-align: center;
          color: #1e293b;
        }
      </style>
    </head>
    <body>
      <!-- Khmer Letterhead Table -->
      <table class="header-table">
        <tr>
          <!-- Left Header -->
          <td style="width: 55%; font-family:'Khmer OS Battambang', 'Inter', sans-serif; font-size:11pt; line-height: 1.5; vertical-align: top;">
            <p style="margin:0 0 4pt 0; color:#1e293b;">កម្រងសាលារៀន <strong>${selectedSchool && selectedSchool !== 'all' ? selectedSchool : 'អូរស្រឡៅ..................'}</strong></p>
            <p style="margin:0; color:#1e293b;">ឃុំ៖ .............................................</p>
          </td>
          <!-- Right Header -->
          <td style="width: 45%; text-align:center; font-family:'Khmer OS Battambang', 'Inter', sans-serif; font-size:10pt; line-height: 1.4; vertical-align: top;">
            <p style="margin:0 0 3pt 0; font-family:'Khmer OS Muol Light', 'Khmer OS Muol', sans-serif; font-size:13pt; font-weight:bold; color:#0f172a;">ព្រះរាជាណាចក្រកម្ពុជា</p>
            <p style="margin:0 0 4pt 0; font-family:'Khmer OS Muol Light', 'Khmer OS Muol', sans-serif; font-size:11pt; font-weight:bold; color:#0f172a;">ជាតិ សាសនា ព្រះមហាក្សត្រ</p>
            <p style="margin:0; font-size:11pt; color:#0f172a; font-weight:bold;">~ ~ ~ ~ ~</p>
          </td>
        </tr>
      </table>

      <!-- Title -->
      <div class="title">បញ្ជីវត្តមានលោកគ្រូ-អ្នកគ្រូ ចូលរួមប្រជុំបច្ចេកទេស</div>
      <div class="subtitle">កម្រងសាលារៀនអូរស្រឡៅ កាលបរិច្ឆេទ៖ ${formattedDate}</div>

      <!-- Main Attendance Table -->
      <table class="attendance-table">
        <thead>
          <tr>
            <th style="width: 4%;">ល.រ</th>
            <th style="width: 15%;">ឈ្មោះគ្រូ</th>
            <th style="width: 6%;">ភេទ</th>
            <th style="width: 18%;">សាលារៀន</th>
            <th style="width: 14%;">តួនាទី / ឯកទេស</th>
            <th style="width: 7%;">វេន</th>
            <th style="width: 8%;">ម៉ោងចូល</th>
            <th style="width: 10%;">ហត្ថលេខាចូល</th>
            <th style="width: 10%;">GPS ចូល</th>
            <th style="width: 8%;">ម៉ោងចេញ</th>
            <th style="width: 10%;">ហត្ថលេខាចេញ</th>
            <th style="width: 10%;">GPS ចេញ</th>
            <th style="width: 10%;">ផ្សេងៗ</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>

      <!-- Footer Signatures -->
      <table class="header-table" style="margin-top: 40pt;">
        <tr>
          <!-- Left Footer (បានឃើញនិងឯកភាព, នាយក/នាយិកា) -->
          <td style="width: 50%; font-family:'Khmer OS Battambang', sans-serif; font-size:10.5pt; text-align: center; line-height: 1.5; vertical-align: top;">
            <p style="margin:0; font-family:'Khmer OS Muol Light', 'Khmer OS Muol', sans-serif; font-weight:bold; color:#4a5d45; font-size:11pt; text-transform:uppercase;">បានឃើញ និងឯកភាព</p>
            <p style="margin:2pt 0 45pt 0; font-weight:bold; color:#1e293b;">នាយក / នាយិកា</p>
            <p style="margin:0; color:#94a3b8;">............................................................</p>
          </td>
          <!-- Right Footer (កាលបរិច្ឆេទចន្ទគតិ, សុរិយគតិ, អ្នកធ្វើតារាង) -->
          <td style="width: 50%; font-family:'Khmer OS Battambang', sans-serif; font-size:10pt; text-align: center; line-height: 1.5; vertical-align: top;">
            <p style="margin:0; color:#475569; font-size:9pt; font-style:italic;">ថ្ងៃ.................... ១.......កើត/រោច ខែ................ ឆ្នាំ................ ព.ស. ២៥.........</p>
            <p style="margin:2pt 0 4pt 0; font-weight:bold; color:#1e293b; font-size:10.5pt;">អូរស្រឡៅ, ${solarDateKhmer}</p>
            <p style="margin:0 0 45pt 0; font-family:'Khmer OS Muol Light', 'Khmer OS Muol', sans-serif; font-weight:bold; color:#4a5d45; font-size:11pt; text-transform:uppercase;">អ្នកធ្វើតារាង</p>
            <p style="margin:0; color:#94a3b8;">............................................................</p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  // Create blobed file with correct MS Word context types
  const blob = new Blob(['\ufeff' + wordHtml], {
    type: 'application/msword;charset=utf-8'
  });
  
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `បញ្ជីវត្តមានកម្រងអូរស្រឡៅ_${meetingDate}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 3. Export to High-Fidelity Print-A4 window (PDF).
 * In modern web browsers, the absolutely most high-fidelity PDF generation in Khmer OS (or any
 * complex script) is achieved using custom CSS A4 Landscape @media print layout.
 * It renders all vector icons, Canvas drawing signatures, fonts, and borders pixel-perfect!
 * Users can either print directly to their local printer or select "Save as PDF".
 */
export function printPDFLayout() {
  window.print();
}
