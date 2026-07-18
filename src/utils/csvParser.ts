// ============================================================
// CSV PARSING & DATA UTILITIES
// ============================================================

export const CSV_COLUMN_INDEXES = {
  orderId: 0,
  company: 3,
  signDate: 4,
  month: 6,               // G — Tháng
  preNetVat: 10,        // K — Giá trị HĐ (Chưa VAT), Pre PNL
  preGrossProfit: 12,    // M — Gross Profit, Pre PNL
  bdPic: 13,             // N — BD PIC
  postNetVat: 15,        // P — Giá trị HĐ (Chưa VAT), Post PNL
  postGrossProfit: 17,   // R — Gross Profit, Post PNL
} as const;

export const DATA_START_ROW = 3;

export function parseCSV(text: string): string[][] {
  const result: string[][] = [];
  let row: string[] = [];
  let currField = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currField += '"';
        i++; 
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(currField);
      currField = "";
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      row.push(currField);
      result.push(row);
      row = [];
      currField = "";
      if (char === '\r' && nextChar === '\n') {
        i++; 
      }
    } else {
      currField += char;
    }
  }

  if (row.length > 0 || currField !== "") {
    row.push(currField);
    result.push(row);
  }

  return result;
}

export function num(v: unknown) {
  if (v === null || v === undefined) return 0;
  let s = String(v).replace(/[đ₫]/gi, "").trim();
  s = s.replace(/\./g, "");   
  s = s.replace(/,/g, ".");   
  s = s.replace(/[^0-9.\-]/g, "");
  const n = Number(s);
  return isNaN(n) ? 0 : n;
}

export function parseSheet(csvText: string, columnIndexes = CSV_COLUMN_INDEXES, dataStartRow = DATA_START_ROW) {
  const allRows = parseCSV(csvText);
  if (allRows.length <= dataStartRow) return [];

  const rows = [] as Array<{
    id: string;
    company: string;
    signDate: string;
    month: number | null;
    bd: string;
    netPre: number;
    netPost: number;
    grossPre: number;
    grossPost: number;
  }>;

  for (let i = dataStartRow; i < allRows.length; i++) {
    const cells = allRows[i];
    if (!cells || cells.length === 0) continue;

    const company = (cells[columnIndexes.company] || "").trim();
    if (!company) continue; // Bỏ qua dòng trống hoàn toàn (ở cuối trang tính)

    const po = (cells[columnIndexes.po] || "").trim();
    // ĐÃ LOẠI BỎ ĐOẠN CHECK CANCEL TẠI ĐÂY ĐỂ TÍNH ĐỦ HẾT CÁC DÒNG

    const monthRaw = parseInt((cells[columnIndexes.month] || "").trim(), 10);
    const month = monthRaw >= 1 && monthRaw <= 12 ? monthRaw : null;

    rows.push({
      id: (cells[columnIndexes.orderId] || "").trim(),
      po,
      company,
      signDate: cells[columnIndexes.signDate] || "",
      month,
      bd: ((cells[columnIndexes.bdPic] || "").trim().replace(/\s+/g, " ")) || "Chưa rõ",
      netPre: num(cells[columnIndexes.preNetVat]),
      netPost: num(cells[columnIndexes.postNetVat]),
      grossPre: num(cells[columnIndexes.preGrossProfit]),
      grossPost: num(cells[columnIndexes.postGrossProfit]),
    });
  }

  return rows;
}