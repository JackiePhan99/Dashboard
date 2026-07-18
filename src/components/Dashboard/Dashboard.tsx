import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  ComposedChart, Area, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { RefreshCw, CheckCircle2, AlertCircle, Link2, Wallet, Receipt, TrendingUp, Percent, Pencil } from "lucide-react";
import styles from "./Dashboard.module.scss";
import { FONT_IMPORT, PALETTE, SALE_COLORS } from "../../utils/constants";
import { parseSheet } from "../../utils/csvParser";

const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRmsAsX0kXlO5WF90XkzpqbgWsFuaqtXAAkrdt-t0lwcJB2QdtoxIw5ork8BypMpKiaZbtOErhSA57l/pub?gid=1482763963&single=true&output=csv";
const POLL_INTERVAL_MS = 20000;

function normalizeName(s: string) {
  if (!s) return "";
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

function MetricBox({ icon: Icon, label, value, accent, className }: { icon: React.ElementType; label: string; value: string; accent: string; className?: string }) {
  return (
    <div className={`${styles.metricBox} ${className || ""}`}>
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

  // State quản lý việc sửa KPI mục tiêu
  const [kpiTarget, setKpiTarget] = useState<number>(() => {
    const saved = localStorage.getItem("pnl_kpi_target");
    return saved ? Number(saved) : 3000000000; 
  });
  const [isEditingKpi, setIsEditingKpi] = useState(false);
  const [kpiInput, setKpiInput] = useState(String(kpiTarget));

  // State gạt cột mốc biểu đồ: 'detailed' (100tr-200tr) hoặc 'wide' (500tr-1 tỷ)
  const [chartStepMode, setChartStepMode] = useState<'detailed' | 'wide'>('wide');

  const handleKpiTargetChange = (val: number) => {
    setKpiTarget(val);
    localStorage.setItem("pnl_kpi_target", String(val));
  };

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
      const title = chosen.split(/\s+/).map(w => w ? (w[0].toUpperCase() + w.slice(1)) : '').join(' ');
      autoCanonical[normalized] = title;
    });

    rows.forEach((r) => {
      const revenue = r.netPre; 
      const gross = r.grossPre; 
      const cost = revenue - gross;

      revenueSum += revenue;
      costSum += cost;
      grossSum += gross;

      preRevSum += r.netPre;
      preGrossSum += r.grossPre;
      
      postGrossSum += r.grossPost; 
      if (r.netPost) {
        postRevSum += r.netPost;
      }

      if (r.month) {
        const key = `T${r.month}`;
        byMonth[key] = (byMonth[key] || 0) + revenue;
        byMonthGross[key] = (byMonthGross[key] || 0) + gross;
      }

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
      preGrossSum,
      postGrossSum,
      kpiPre: preRevSum ? (preGrossSum / preRevSum) * 100 : 0,
      kpiPost: postRevSum ? (postGrossSum / postRevSum) * 100 : 0,
      monthlyData,
      saleData,
      customerData,
    };
  }, [rows]);

  // Bộ tính toán trục dọc Y-Axis dựa trên mốc gạt tùy chỉnh
  const yAxisTicks = useMemo(() => {
    if (!stats || !stats.monthlyData.length) return [];
    const maxVal = Math.max(...stats.monthlyData.map(d => d.doanh_thu));
    
    let step = 500000000;
    
    if (chartStepMode === 'detailed') {
      step = maxVal <= 1000000000 ? 100000000 : 200000000;
    } else {
      step = maxVal <= 5000000000 ? 500000000 : 1000000000;
    }
    
    const ticks: number[] = [];
    const roundedMax = Math.ceil(maxVal / step) * step;
    for (let v = 0; v <= roundedMax; v += step) {
      ticks.push(v);
    }
    return ticks;
  }, [stats, chartStepMode]);

  const fmtVND = (n: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(n);
  const fmtPct = (n: number) => `${Math.round(n)}%`;
  const fmtTime = (d: Date | null) => (d ? d.toLocaleTimeString("vi-VN") : "--:--:--");

  return (
    <div className={styles.container}>
      <style>{FONT_IMPORT}</style>

      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <h1>Báo cáo doanh thu &amp; KPI</h1>
        </div>
        <div className={styles.headerRight}>
          <StatusPill status={status} />
          {status === "live" && (
            <div className={styles.statusSync}>
              <RefreshCw size={13} /> {fmtTime(lastSync)}
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
            Không tải được cấu trúc dữ liệu hoặc bảng trống.
          </div>
        </Box>
      ) : (
        <>
          <div className={styles.metricsRow}>
            {/* Block 1: DOANH THU */}
            <MetricBox 
              icon={Wallet} 
              label="DOANH THU" 
              value={fmtVND(stats.revenueSum)} 
              accent={PALETTE.teal} 
              className={styles.revenueBox} 
            />

            {/* Block 2: CHI PHÍ */}
            <div className={styles.metricBoxSplit}>
              <div className={styles.metricIcon} style={{ backgroundColor: `${PALETTE.rose}1A` }}>
                <Receipt size={18} color={PALETTE.rose} strokeWidth={2.2} />
              </div>
              <div className={styles.splitContent}>
                <div className={styles.splitCol}>
                  <div className={styles.metricLabel}>CHI PHÍ VẬN HÀNH</div>
                  <div className={styles.metricValue} style={{ marginTop: '14px' }}>
                    {fmtVND(stats.costSum)}
                  </div>
                  <div style={{ fontSize: '11px', color: PALETTE.sub, marginTop: '10px' }}>
                    Tạm tính (Bằng CP dự án)
                  </div>
                </div>
                <div className={styles.splitDivider} />
                <div className={styles.splitCol}>
                  <div className={styles.metricLabel}>CHI PHÍ DỰ ÁN</div>
                  <div className={styles.metricValue} style={{ marginTop: '14px' }}>
                    {fmtVND(stats.costSum)}
                  </div>
                  <div style={{ fontSize: '11px', color: PALETTE.sub, marginTop: '10px' }}>
                    Tự động (Doanh thu - GP)
                  </div>
                </div>
              </div>
            </div>

            {/* Block 3: LỢI NHUẬN GỘP */}
            <div className={styles.metricBoxSplit}>
              <div className={styles.metricIcon} style={{ backgroundColor: `${PALETTE.indigo}1A` }}>
                <TrendingUp size={18} color={PALETTE.indigo} strokeWidth={2.2} />
              </div>
              <div className={styles.splitContent}>
                <div className={styles.splitCol}>
                  <div className={styles.metricLabel}>PRE GROSS PROFIT</div>
                  <div className={styles.metricValue} style={{ marginTop: '14px' }}>
                    {fmtVND(stats.preGrossSum)}
                  </div>
                  <div style={{ fontSize: '11px', color: PALETTE.sub, marginTop: '10px' }}>
                    Lợi nhuận dự kiến
                  </div>
                </div>
                <div className={styles.splitDivider} />
                <div className={styles.splitCol}>
                  <div className={styles.metricLabel}>POST GROSS PROFIT</div>
                  <div className={styles.metricValue} style={{ marginTop: '14px', color: PALETTE.indigo }}>
                    {fmtVND(stats.postGrossSum)}
                  </div>
                  <div style={{ fontSize: '11px', color: PALETTE.sub, marginTop: '10px' }}>
                    Thực tế nghiệm thu
                  </div>
                </div>
              </div>
            </div>

            {/* Block 4: KPI */}
            <Box className={styles.kpiBox}>
              <div className={styles.kpiHeader}>
                <div className={styles.kpiIcon}>
                  <Percent size={18} color={PALETTE.amber} strokeWidth={2.2} />
                </div>
                <div className={styles.kpiLabel}>% KPI BIÊN LỢI NHUẬN</div>
              </div>
              <div className={styles.splitContent}>
                <div className={styles.splitCol} style={{ position: "relative", minHeight: "85px" }}>
                  <div className={styles.metricLabel}>KPI MỤC TIÊU</div>
                  
                  {isEditingKpi ? (
                    <div className={styles.kpiEditRow}>
                      <input
                        type="number"
                        value={kpiInput}
                        onChange={(e) => setKpiInput(e.target.value)}
                        className={styles.kpiInlineInput}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleKpiTargetChange(Number(kpiInput));
                            setIsEditingKpi(false);
                          }
                        }}
                        onBlur={() => {
                          handleKpiTargetChange(Number(kpiInput));
                          setIsEditingKpi(false);
                        }}
                      />
                      <button 
                        onClick={() => {
                          handleKpiTargetChange(Number(kpiInput));
                          setIsEditingKpi(false);
                        }}
                        className={styles.kpiSaveButton}
                      >
                        Lưu
                      </button>
                    </div>
                  ) : (
                    <div className={styles.kpiValueRow}>
                      <div className={styles.metricValue}>{fmtVND(kpiTarget)}</div>
                    </div>
                  )}

                  <div style={{ fontSize: '11px', color: PALETTE.sub, marginTop: '10px' }}>
                    KPI đặt ra năm 2026
                  </div>

                  {!isEditingKpi && (
                    <button 
                      onClick={() => {
                        setKpiInput(String(kpiTarget));
                        setIsEditingKpi(true);
                      }}
                      className={styles.kpiEditButtonCorner}
                      title="Sửa KPI mục tiêu"
                    >
                      <Pencil size={11} strokeWidth={2.5} />
                    </button>
                  )}
                </div>
                
                <div className={styles.splitDivider} />
                
                <div className={styles.splitCol} style={{ textAlign: "center" }}>
                  <div className={styles.metricLabel}>% HOÀN THÀNH</div>
                  <div className={styles.kpiMetricValue} style={{ color: PALETTE.amber, fontSize: "20px", marginTop: "14px" }}>
                    {kpiTarget > 0 ? fmtPct((stats.postGrossSum / kpiTarget) * 100) : "0%"}
                  </div>
                  <div style={{ fontSize: '11px', color: PALETTE.sub, marginTop: '10px' }}>
                    Tỷ lệ / Post Gross Profit
                  </div>
                </div>
              </div>
            </Box>
          </div>

          <div className={styles.chartsRow}>
            {/* Biểu đồ tháng (Sử dụng thêm thuộc tính key để ép Recharts vẽ lại mốc khi chọn nút gạt) */}
            <Box className={`${styles.chartBox} ${styles.areaChart}`}>
              <div className={styles.chartHeader}>
                <div className={styles.boxTitle} style={{ marginBottom: 0 }}>
                  Doanh thu / Gross profit theo từng tháng 2026
                </div>
                <div className={styles.chartToggleGroup}>
                  <button 
                    className={`${styles.toggleBtn} ${chartStepMode === 'detailed' ? styles.toggleBtnActive : ''}`}
                    onClick={() => setChartStepMode('detailed')}
                  >
                    Mốc 100tr - 200tr
                  </button>
                  <button 
                    className={`${styles.toggleBtn} ${chartStepMode === 'wide' ? styles.toggleBtnActive : ''}`}
                    onClick={() => setChartStepMode('wide')}
                  >
                    Mốc 500tr - 1 tỷ
                  </button>
                </div>
              </div>

              <ResponsiveContainer width="100%" height={230}>
                <ComposedChart key={chartStepMode} data={stats.monthlyData}>
                  <defs>
                    <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={PALETTE.teal} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={PALETTE.teal} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={PALETTE.border} vertical={false} />
                  <XAxis dataKey="thang" tick={{ fontSize: 12, fill: PALETTE.sub }} axisLine={false} tickLine={false} />
                  <YAxis 
                    ticks={yAxisTicks}
                    domain={[0, 'auto']}
                    tick={{ fontSize: 11, fill: PALETTE.sub }} 
                    axisLine={false} 
                    tickLine={false} 
                    tickFormatter={(v) => (v / 1000000).toFixed(0) + "tr"} 
                  />
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
                          // Định dạng nhãn % cố định ở tâm lát bánh để loại bỏ lỗi nhấp nháy hoặc ẩn đi khi di chuột (hover)
                          const renderLabel = ({ cx, cy, midAngle, percent }: any) => {
                            if (percent === undefined || percent === null || percent < 0.01) return null;
                            const RADIAN = Math.PI / 180;
                            // Bán kính tĩnh cố định ở giữa lòng các lát bánh (bán kính trong 44 + bán kính ngoài 92) / 2 = 68
                            const radius = 68; 
                            const x = cx + radius * Math.cos(-midAngle * RADIAN);
                            const y = cy + radius * Math.sin(-midAngle * RADIAN);

                            return (
                              <text 
                                x={x} 
                                y={y} 
                                fill="#ffffff" 
                                fontSize={12} 
                                fontWeight="bold" 
                                textAnchor="middle" 
                                dominantBaseline="central"
                                pointerEvents="none" // Loại bỏ bắt sự kiện hover của text để tránh nhấp nháy mất chữ
                              >
                                {`${Math.round(percent * 100)}%`}
                              </text>
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