// ============================================================
// CSV PARSING & DATA UTILITIES
// ============================================================

// Vị trí cột cố định theo đúng sheet thật (0-based: A=0, B=1, C=2 ...)
// B=1 Số Hợp đồng/PO · D=3 Tên công ty/đối tác · E=4 Ngày ký HĐ · G=6 Tháng (cột có sẵn, không phải cột ẩn)
// J=9 Giá trị HĐ (Gồm VAT) Pre · K=10 Giá trị HĐ (Chưa VAT) Pre · L=11 VAT Pre · M=12 Gross Profit Pre
// N=13 BD PIC
// O=14 Giá trị HĐ (Gồm VAT) Post · P=15 Giá trị HĐ (Chưa VAT) Post · Q=16 VAT Post · R=17 Gross Profit Post
export const CSV_COLUMN_INDEXES = {
  orderId: 0,
  po: 1,                 // B — Số Hợp đồng/PO (dùng để nhận diện deal "Cancel")
  company: 3,
  signDate: 4,
  month: 6,               // G — Tháng (cột có sẵn trong sheet, ưu tiên dùng thay vì tự parse ngày)
  preNetVat: 10,        // K — Giá trị HĐ (Chưa VAT), Pre PNL
  preGrossProfit: 12,    // M — Gross Profit, Pre PNL
  bdPic: 13,             // N — BD PIC
  postNetVat: 15,        // P — Giá trị HĐ (Chưa VAT), Post PNL
  postGrossProfit: 17,   // R — Gross Profit, Post PNL
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
    po: string;
    company: string;
    signDate: string;
    month: number | null;
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

    const po = (cells[columnIndexes.po] || "").trim();
    // Loại các deal đã huỷ (PO ghi rõ "Cancel"), giữ lại các deal khác kể cả loại "Special"
    if (/cancel/i.test(po)) continue;

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
