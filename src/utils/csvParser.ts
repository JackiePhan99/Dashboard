// ============================================================
// CSV PARSING & DATA UTILITIES
// ============================================================

// Vị trí cột cố định theo đúng sheet thật (0-based: A=0, B=1, C=2 ...)
// D=3 Tên công ty/đối tác · E=4 Ngày ký HĐ · J=9 Giá trị HĐ (Chưa VAT) Pre PNL
// L=11 Gross Profit Pre PNL · M=12 BD PIC · O=14 Giá trị HĐ (Chưa VAT) Post PNL
// Q=16 Gross Profit Post PNL
export const CSV_COLUMN_INDEXES = {
  orderId: 0,
  company: 3,
  signDate: 4,
  preNetVat: 9,
  preGrossProfit: 12,
  bdPic: 13,
  postNetVat: 14,
  postGrossProfit: 17,
} as const;

export const DATA_START_ROW = 3;

export function splitCSVLine(line: string) {
  const out: string[] = [];
  let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') inQ = !inQ;
    else if (c === "," && !inQ) { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

export function num(v: unknown) {
  if (v === null || v === undefined) return 0;
  let s = String(v).replace(/[đ₫]/gi, "").trim();
  s = s.replace(/\./g, "");   // bỏ dấu chấm ngăn cách hàng nghìn kiểu VN
  s = s.replace(/,/g, ".");   // nếu có dấu phẩy dùng như thập phân
  s = s.replace(/[^0-9.\-]/g, "");
  const n = Number(s);
  return isNaN(n) ? 0 : n;
}

export function parseSheet(csvText: string, columnIndexes = CSV_COLUMN_INDEXES, dataStartRow = DATA_START_ROW) {
  const lines = csvText.replace(/\r/g, "").split("\n");
  if (lines.length <= dataStartRow) return [];

  const rows = [] as Array<{
    id: string;
    company: string;
    signDate: string;
    bd: string;
    netPre: number;
    netPost: number;
    grossPre: number;
    grossPost: number;
  }>;

  for (let i = dataStartRow; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const cells = splitCSVLine(lines[i]);
    const company = (cells[columnIndexes.company] || "").trim();
    if (!company) continue;

    rows.push({
      id: (cells[columnIndexes.orderId] || "").trim(),
      company,
      signDate: cells[columnIndexes.signDate] || "",
      bd: ((cells[columnIndexes.bdPic] || "").trim().replace(/\s+/g, " ")) || "Chưa rõ",
      netPre: num(cells[columnIndexes.preNetVat]),
      netPost: num(cells[columnIndexes.postNetVat]),
      grossPre: num(cells[columnIndexes.preGrossProfit]),
      grossPost: num(cells[columnIndexes.postGrossProfit]),
    });
  }

  return rows;
}
