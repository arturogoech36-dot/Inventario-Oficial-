import { today } from './format';

declare const XLSX: any;

/**
 * Downloads data as a CSV file with UTF-8 BOM encoding for perfect Excel compatibility.
 */
export function downloadCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const escapeCell = (val: string | number | undefined | null): string => {
    if (val === undefined || val === null) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const csvRows: string[] = [];
  csvRows.push(headers.map(escapeCell).join(';'));

  rows.forEach((row) => {
    csvRows.push(row.map(escapeCell).join(';'));
  });

  const csvContent = '\uFEFF' + csvRows.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Downloads data as Excel (.xlsx) if XLSX library is available, or falls back to CSV.
 */
export function downloadExcelOrCSV(
  filenameBase: string,
  sheetTitle: string,
  documentTitle: string,
  headers: string[],
  rows: (string | number)[][]
) {
  if (typeof XLSX !== 'undefined') {
    try {
      const wb = XLSX.utils.book_new();
      const excelRows: (string | number)[][] = [
        [documentTitle + ' — ' + today()],
        [],
        headers,
        ...rows,
      ];
      const ws = XLSX.utils.aoa_to_sheet(excelRows);
      XLSX.utils.book_append_sheet(wb, ws, sheetTitle.substring(0, 31));
      XLSX.writeFile(wb, `${filenameBase}_${today().replace(/\//g, '-')}.xlsx`);
      return;
    } catch (e) {
      console.warn('Fallo exportación XLSX, usando fallback CSV:', e);
    }
  }

  // Fallback to CSV
  downloadCSV(`${filenameBase}_${today().replace(/\//g, '-')}.csv`, headers, rows);
}
