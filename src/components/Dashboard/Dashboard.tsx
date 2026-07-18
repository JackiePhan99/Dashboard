import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  ComposedChart, Area, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { RefreshCw, CheckCircle2, AlertCircle, Link2, Wallet, Receipt, TrendingUp, Percent } from "lucide-react";
import styles from "./Dashboard.module.scss";
import { PALETTE, SALE_COLORS } from "../../utils/constants";
import { useAuth } from "../../contexts/AuthContext";
import { parseSheet } from "../../utils/csvParser";

// ============================================================
// CẤU HÌNH — DÁN URL CSV CỦA SHEET VÀO ĐÂY
// ============================================================
// File -> Share -> Publish to web -> chọn đúng sheet/tab -> định dạng CSV -> Publish
// Lưu ý: sheet phải ở chế độ "Anyone with the link can view" thì mới publish CSV được.
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRmsAsX0kXlO5WF90XkzpqbgWsFuaqtXAAkrdt-t0lwcJB2QdtoxIw5ork8BypMpKiaZbtOErhSA57l/pub?gid=1482763963&single=true&output=csv";
const POLL_INTERVAL_MS = 20000;
// ============================================================


function normalizeName(s: string) {
  if (!s) return "";
  // trim, collapse whitespace, remove diacritics, lowercase
  const trimmed = s.trim().replace(/\s+/g, " ");
  const noDiacritics = trimmed.normalize("NFD").replace(/\p{Diacritic}/gu, "");
  return noDiacritics.toLowerCase();
}

function StatusPill({ status }: { status: string }) {
  const map = {
    live: { icon: CheckCircle2, label: "Đã đồng bộ" },
    error: { icon: AlertCircle, label: "Lỗi tải dữ liệu — kiểm tra link CSV" },
    empty: { icon: AlertCircle, label: "Không đọc được cấu trúc cột" },
    not_public: { icon: AlertCircle, label: "Sheet chưa công khai — nhận về trang HTML thay vì CSV" },
    not_connected: { icon: Link2, label: "Chưa kết nối Sheet" },
  };
  const currentStatus = (map as Record<string, { icon: React.ElementType; label: string }>)[status] || map.not_connected;
  const Icon = currentStatus.icon;

  const statusClassName =
    status === "live"
      ? styles.live
      : status === "error" || status === "not_public"
        ? styles.error
        : status === "empty"
          ? styles.empty
          : styles.notConnected;

  return (
    <div className={`${styles.statusPill} ${statusClassName}`}>
      <Icon size={13} strokeWidth={2.4} />
      {currentStatus.label}
    </div>
  );
}

function Box({ children, style, title, className }: { children: React.ReactNode; style?: React.CSSProperties; title?: string; className?: string }) {
  return (
    <div className={`${styles.box} ${className || ""}`} style={style}>
      {title && <div className={styles.boxTitle}>{title}</div>}
      {children}
    </div>
  );
}

function MetricBox({ icon: Icon, label, value, accent }: { icon: React.ElementType; label: string; value: string; accent: string }) {
  return (
    <div className={styles.metricBox}>
      <div className={styles.metricIcon} style={{ backgroundColor: `${accent}1A` }}>
        <Icon size={18} color={accent} strokeWidth={2.2} />
      </div>
      <div className={styles.metricContent}>
        <div className={styles.metricLabel}>{label}</div>
        <div className={styles.metricValue}>{value}</div>
      </div>
    </div>
  );
}

export default function PnlDashboard() {
  const { user, signOut } = useAuth();
  const [rows, setRows] = useState<Array<{
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
  }>>([]);
  const [status, setStatus] = useState("not_connected");
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(() => {
    if (!rows.length) return null;

    let revenueSum = 0;
    let costSum = 0;
    let grossSum = 0;
    let preRevSum = 0;
    let preGrossSum = 0;
    let postRevSum = 0;
    let postGrossSum = 0;
    const byMonth: Record<string, number> = {};
    const byMonthGross: Record<string, number> = {};
    const bySale: Record<string, { total: number; count: number; name: string }> = {};
    const byCustomer: Record<string, number> = {};

    // Auto-build canonical mapping from actual BD values when alias groups are not provided.
    const nameGroups: Record<string, Record<string, number>> = {};
    rows.forEach(r => {
      const raw = (r.bd || "Chưa rõ").trim();
      const normalized = normalizeName(raw);
      nameGroups[normalized] = nameGroups[normalized] || {};
      nameGroups[normalized][raw] = (nameGroups[normalized][raw] || 0) + 1;
    });

    const autoCanonical: Record<string, string> = {};
    Object.entries(nameGroups).forEach(([normalized, originals]) => {
      const entries = Object.entries(originals).sort((a, b) => b[1] - a[1]);
      const chosen = entries[0]?.[0] || normalized;
      // Title-case chosen for nicer display
      const title = chosen.split(/\s+/).map(w => w ? (w[0].toUpperCase() + w.slice(1)) : '').join(' ');
      autoCanonical[normalized] = title;
    });

    rows.forEach((r) => {
      const revenue = r.netPost || r.netPre;
      const gross = r.netPost ? r.grossPost : r.grossPre;
      const cost = revenue - gross;

      revenueSum += revenue;
      costSum += cost;
      grossSum += gross;

      preRevSum += r.netPre;
      preGrossSum += r.grossPre;
      if (r.netPost) {
        postRevSum += r.netPost;
        postGrossSum += r.grossPost;
      }

      if (r.month) {
        const key = `T${r.month}`;
        byMonth[key] = (byMonth[key] || 0) + revenue;
        byMonthGross[key] = (byMonthGross[key] || 0) + gross;
      }

      // Normalize BD name and apply canonical display names inferred from parsed values
      const rawBd = (r.bd || "Chưa rõ").trim();
      const normalized = normalizeName(rawBd);
      const canonical = autoCanonical[normalized] || rawBd.replace(/\s+/g, " ");
      const bdKey = canonical.toLowerCase();
      if (!bySale[bdKey]) bySale[bdKey] = { total: 0, count: 0, name: canonical };
      bySale[bdKey].total += gross;
      bySale[bdKey].count += 1;

      byCustomer[r.company] = (byCustomer[r.company] || 0) + revenue;
    });

    const monthOrder = Array.from({ length: 12 }, (_, i) => `T${i + 1}`);
    const monthlyData = monthOrder
      .filter((m) => byMonth[m])
      .map((m) => ({ thang: m, doanh_thu: byMonth[m], gross_profit: byMonthGross[m] || 0 }));
    const TOP_N_SALES = 3;
    const saleDataFull = Object.entries(bySale)
      .map(([, v]) => ({ name: v.name, value: v.total, count: v.count, fraction: grossSum ? (v.total / grossSum) : 0 }))
      .sort((a, b) => b.value - a.value);

    // Group small contributors into "Khác" to avoid too many tiny slices
    const othersValue = saleDataFull.slice(TOP_N_SALES).reduce((s, it) => s + it.value, 0);
    const othersCount = saleDataFull.slice(TOP_N_SALES).reduce((s, it) => s + it.count, 0);
    const saleData = saleDataFull.slice(0, TOP_N_SALES).concat(
      othersValue > 0 ? [{ name: "Khác", value: othersValue, count: othersCount, fraction: grossSum ? (othersValue / grossSum) : 0 }] : []
    );
    const customerData = Object.entries(byCustomer)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 12);

    return {
      revenueSum,
      costSum,
      grossSum,
      kpiPre: preRevSum ? (preGrossSum / preRevSum) * 100 : 0,
      kpiPost: postRevSum ? (postGrossSum / postRevSum) * 100 : 0,
      monthlyData,
      saleData,
      customerData,
    };
  }, [rows]);

  const fmtVND = (n: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(n);
  const fmtPct = (n: number) => `${Math.round(n)}%`;
  const fmtTime = (d: Date | null) => (d ? d.toLocaleTimeString("vi-VN") : "--:--:--");

  return (
    <div className={styles.container}>

      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <h1>Báo cáo doanh thu &amp; KPI</h1>
          {/* <p>Làm mới mỗi {POLL_INTERVAL_MS / 1000}s</p> */}
        </div>
        <div className={styles.headerRight}>
          <StatusPill status={status} />
          {status === "live" && (
            <div className={styles.statusSync}>
              <RefreshCw size={13} /> {fmtTime(lastSync)}
            </div>
          )}
          {user && (
            <div className={styles.userMenu}>
              <span className={styles.userEmail}>{user.email}</span>
              <button type="button" className="btn" onClick={signOut}>Đăng xuất</button>
            </div>
          )}
        </div>
      </div>

      {!stats ? (
        <Box className={styles.errorBox}>
          <div className={styles.errorIcon}>
            <Link2 size={20} color={PALETTE.amber} />
          </div>
          <div className={styles.errorTitle}>
            {status === "empty"
              ? "Đã tải được file nhưng không nhận diện được các cột."
              : status === "not_public"
                ? "Sheet chưa được công khai — nhận về trang HTML thay vì dữ liệu CSV."
                : status === "error"
                  ? "Không tải được dữ liệu từ link CSV."
                  : "Chưa nối dữ liệu."}
          </div>
          <div className={styles.errorMessage}>
            {status === "not_public" ? (
              <>
                Link bạn dán chưa phải link CSV công khai hợp lệ. Làm theo đúng thứ tự:<br />
                1. Mở Sheet → <b>File → Share → Publish to web</b><br />
                2. Ở mục "Link", chọn đúng <b>tab/sheet</b> cần lấy (không chọn "Entire document")<br />
                3. Chọn định dạng <b>Comma-separated values (.csv)</b><br />
                4. Bấm <b>Publish</b>, copy link dạng
                <code>.../pub?output=csv</code> (không phải link <code>/edit</code> hay
                <code>/export</code>) vào biến <code>SHEET_CSV_URL</code>.<br />
                Sheet cũng cần ở chế độ chia sẻ "Anyone with the link — Viewer".
              </>
            ) : (
              <>
                Dán URL CSV của Sheet vào biến <code>SHEET_CSV_URL</code> ở đầu file
                (File → Share → Publish to web → chọn đúng tab → định dạng CSV).<br />
                Dashboard đọc dữ liệu theo đúng vị trí cột cố định của sheet (khai báo trong
                hằng số <code>CSV_COLUMN_INDEXES</code> trong utils: D = Tên công ty/đối tác,
                E = Ngày ký HĐ, J/O = Giá trị HĐ Pre/Post, L/Q = Gross Profit Pre/Post, M = BD PIC)
                và bắt đầu đọc dữ liệu từ dòng 4.
              </>
            )}
          </div>
        </Box>
      ) : (
        <>
          <div className={styles.metricsRow}>
            <MetricBox icon={Wallet} label="DOANH THU" value={fmtVND(stats.revenueSum)} accent={PALETTE.teal} />
            <MetricBox icon={Receipt} label="CHI PHÍ" value={fmtVND(stats.costSum)} accent={PALETTE.rose} />
            <MetricBox icon={TrendingUp} label="LỢI NHUẬN GỘP" value={fmtVND(stats.grossSum)} accent={PALETTE.indigo} />

            <Box className={styles.kpiBox}>
              <div className={styles.kpiHeader}>
                <div className={styles.kpiIcon}>
                  <Percent size={18} color={PALETTE.amber} strokeWidth={2.2} />
                </div>
                <div className={styles.kpiLabel}>% KPI BIÊN LỢI NHUẬN</div>
              </div>
              <div className={styles.kpiContent}>
                <div className={styles.kpiMetric}>
                  <div className={styles.kpiMetricLabel}>Pre gross profit</div>
                  <div className={styles.kpiMetricValue}>{fmtPct(stats.kpiPre)}</div>
                </div>
                <div className={styles.kpiMetric}>
                  <div className={styles.kpiMetricLabel}>Post gross profit</div>
                  <div className={styles.kpiMetricValue}>{fmtPct(stats.kpiPost)}</div>
                </div>
              </div>
            </Box>
          </div>

          <div className={styles.chartsRow}>
            <Box className={`${styles.chartBox} ${styles.areaChart}`} title="Doanh thu / Gross profit theo từng tháng 2026">
              <ResponsiveContainer width="100%" height={230}>
                <ComposedChart data={stats.monthlyData}>
                  <defs>
                    <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={PALETTE.teal} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={PALETTE.teal} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={PALETTE.border} vertical={false} />
                  <XAxis dataKey="thang" tick={{ fontSize: 12, fill: PALETTE.sub }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: PALETTE.sub }} axisLine={false} tickLine={false} tickFormatter={(v) => (v / 1000000).toFixed(0) + "tr"} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload || !payload.length) return null;
                      const revenueEntry = payload.find((p) => p.dataKey === "doanh_thu");
                      const grossEntry = payload.find((p) => p.dataKey === "gross_profit");
                      return (
                        <div className={styles.monthlyTooltip}>
                          <div className={styles.monthlyTooltipLabel}>{label}</div>
                          {revenueEntry && (
                            <div className={styles.monthlyTooltipRow} style={{ color: PALETTE.teal }}>
                              Doanh thu : {fmtVND(revenueEntry.value as number)}
                            </div>
                          )}
                          {grossEntry && (
                            <div className={styles.monthlyTooltipRow} style={{ color: PALETTE.indigo }}>
                              Gross profit : {fmtVND(grossEntry.value as number)}
                            </div>
                          )}
                        </div>
                      );
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    align="center"
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 12.5, paddingTop: 8 }}
                    formatter={(value) => (value === "doanh_thu" ? "Doanh thu" : "Gross profit")}
                  />
                  <Area type="monotone" dataKey="doanh_thu" name="doanh_thu" stroke={PALETTE.teal} fill="url(#revFill)" strokeWidth={2.5} dot={{ r: 3, fill: PALETTE.teal, strokeWidth: 0 }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="gross_profit" name="gross_profit" stroke={PALETTE.indigo} strokeWidth={2.5} dot={{ r: 3, fill: PALETTE.indigo, strokeWidth: 0 }} activeDot={{ r: 5 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </Box>

            <Box className={`${styles.chartBox} ${styles.pieChart}`} title="Tỉ trọng đóng góp Gross Profit theo từng sale">
              <div className={styles.pieWrapper}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <ResponsiveContainer width="100%" height={230}>
                    <PieChart>
                      {
                        (() => {
                          const renderLabel = (props: any) => {
                            const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props;
                            if (percent == null) return null;
                            const RAD = Math.PI / 180;
                            const sin = Math.sin(-midAngle * RAD);
                            const cos = Math.cos(-midAngle * RAD);

                            // Points for connector when label is outside
                            const sx = cx + (outerRadius + 2) * cos; // start point (on arc)
                            const sy = cy + (outerRadius + 2) * sin;
                            const mx = cx + (outerRadius + 18) * cos; // mid point
                            const my = cy + (outerRadius + 18) * sin;
                            const ex = mx + (cos >= 0 ? 18 : -18); // end point (text anchor)
                            const ey = my;

                            const pctText = `${Math.round(percent * 100)}%`;

                            // Show percent inside when slice is reasonably large, otherwise draw outside with a small connector
                            if (percent >= 0.06) {
                              const r = innerRadius + (outerRadius - innerRadius) / 2;
                              const ix = cx + r * cos;
                              const iy = cy + r * sin;
                              return (
                                <text x={ix} y={iy} fill="#fff" fontSize={12} textAnchor="middle" dominantBaseline="central">{pctText}</text>
                              );
                            }

                            const textAnchor = cos >= 0 ? "start" : "end";
                            const tx = ex + (cos >= 0 ? 4 : -4);

                            return (
                              <g>
                                <polyline points={`${sx},${sy} ${mx},${my} ${ex},${ey}`} stroke="#9AA3AD" fill="none" strokeWidth={1} />
                                <text x={tx} y={ey} fill="#123" fontSize={12} textAnchor={textAnchor} dominantBaseline="central">{pctText}</text>
                              </g>
                            );
                          };

                          return (
                            <Pie
                              data={stats.saleData}
                              dataKey="value"
                              nameKey="name"
                              innerRadius={44}
                              outerRadius={92}
                              paddingAngle={2}
                              label={renderLabel}
                              labelLine={false}
                            >
                              {stats.saleData.map((_, i) => (
                                <Cell key={i} fill={SALE_COLORS[i % SALE_COLORS.length]} stroke={PALETTE.card} strokeWidth={2} />
                              ))}
                            </Pie>
                          );
                        })()
                      }
                      <Tooltip
                        formatter={(value, _, payload) => {
                          const val = value as number;
                          const pct = stats && stats.grossSum ? Math.round((val / stats.grossSum) * 100) : 0;
                          return [`${fmtVND(val)} · ${payload.payload.count} hợp đồng · ${pct}%`, payload.payload.name];
                        }}
                        contentStyle={{ borderRadius: 10, border: `1px solid ${PALETTE.border}`, fontSize: 13, boxShadow: "0 8px 20px -8px rgba(0,0,0,0.15)" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className={styles.pieLegend}>
                  {stats.saleData.map((item, i) => (
                    <div key={i} className={styles.legendItem}>
                      <div className={styles.legendDot} style={{ background: SALE_COLORS[i % SALE_COLORS.length] }} />
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ color: SALE_COLORS[i % SALE_COLORS.length], fontWeight: 600 }}>{item.name}</span>
                        <span style={{ color: SALE_COLORS[i % SALE_COLORS.length] }}>{fmtVND(item.value)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Box>
          </div>

          <Box className={styles.tableBox} title="Tổng doanh thu của các khách hàng">
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead className={styles.tableHead}>
                  <tr>
                    <th className={styles.tableHeadCell}>#</th>
                    <th className={styles.tableHeadCell}>Khách hàng</th>
                    <th className={`${styles.tableHeadCell} ${styles.tableHeadCellRight}`}>Tổng doanh thu</th>
                    <th className={styles.tableHeadCell}> </th>
                  </tr>
                </thead>
                <tbody className={styles.tableBody}>
                  {stats.customerData.map((c, i) => {
                    const max = stats.customerData[0]?.value || 1;
                    const pct = Math.max(4, (c.value / max) * 100);
                    return (
                      <tr key={i} className={styles.tableRow}>
                        <td className={styles.tableCellIndex}>{i + 1}</td>
                        <td className={styles.tableCellCustomer}>{c.name}</td>
                        <td className={styles.tableCellRevenue}>{fmtVND(c.value)}</td>
                        <td className={styles.tableCellBar}>
                          <div className={styles.barBackground}>
                            <div className={styles.barFill} style={{ width: `${pct}%` }} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Box>
        </>
      )}
    </div>
  );
}
