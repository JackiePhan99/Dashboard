import { useCallback, useEffect, useState } from "react";
import { parseSheet } from "../utils/csvParser";

const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRmsAsX0kXlO5WF90XkzpqbgWsFuaqtXAAkrdt-t0lwcJB2QdtoxIw5ork8BypMpKiaZbtOErhSA57l/pub?gid=1482763963&single=true&output=csv";
const POLL_INTERVAL_MS = 20000;

export type SheetRow = ReturnType<typeof parseSheet>[number];
export type SheetStatus = "not_connected" | "live" | "error" | "empty" | "not_public";

// Hook dùng chung: fetch + tự làm mới CSV mỗi POLL_INTERVAL_MS.
// Dùng ở cả Dashboard và trang chi tiết PIC để không phải gọi fetch 2 lần
// và luôn đồng bộ cùng 1 nguồn dữ liệu.
export function useSheetData() {
  const [rows, setRows] = useState<SheetRow[]>([]);
  const [status, setStatus] = useState<SheetStatus>("not_connected");
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    if (!SHEET_CSV_URL.trim()) {
      setStatus("not_connected");
      return;
    }
    try {
      const res = await fetch(SHEET_CSV_URL, { cache: "no-store" });
      if (!res.ok) throw new Error("fetch failed");
      const text = await res.text();

      const looksLikeHtml = /^\s*<(!doctype|html)/i.test(text) || text.includes("DOCS_timingPromises");
      if (looksLikeHtml) {
        setStatus("not_public");
        return;
      }

      const parsed = parseSheet(text);
      if (!parsed.length) {
        setStatus("empty");
        return;
      }
      setRows(parsed);
      setStatus("live");
      setLastSync(new Date());
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    fetchData();
    const id = window.setInterval(fetchData, POLL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [fetchData]);

  return { rows, status, lastSync, refetch: fetchData };
}
