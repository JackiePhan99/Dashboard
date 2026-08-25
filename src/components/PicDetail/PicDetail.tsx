import { useMemo, useState } from "react";
import { ArrowLeft, Briefcase, TrendingUp, Wallet, UserCheck, Search, Award } from "lucide-react";
import { useSheetData, type SheetRow } from "../../hooks/useSheetData";
import styles from "./PicDetail.module.scss";

type PicRole = "bd" | "account";

function normalizeName(s: string) {
  if (!s) return "";
  return s.trim().replace(/\s+/g, " ").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

function groupByPic(rows: SheetRow[], role: PicRole) {
  const groups: Record<string, { name: string; rows: SheetRow[]; revenue: number; gross: number }> = {};
  rows.forEach((r) => {
    const raw = (role === "bd" ? r.bd : r.accountPic) || "Chưa rõ";
    const key = normalizeName(raw);
    if (!groups[key]) groups[key] = { name: raw, rows: [], revenue: 0, gross: 0 };
    const revenue = r.netPost || r.netPre || 0;
    const gross = r.netPost ? r.grossPost : r.grossPre || 0;
    groups[key].rows.push(r);
    groups[key].revenue += revenue;
    groups[key].gross += gross;
  });
  return Object.values(groups).sort((a, b) => b.gross - a.gross);
}

export const PicDetail = () => {
  const { rows, status } = useSheetData();
  const [role, setRole] = useState<PicRole>("bd");
  const [selected, setSelected] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const groups = useMemo(() => groupByPic(rows, role), [rows, role]);
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return groups;
    return groups.filter((g) => normalizeName(g.name).includes(normalizeName(searchQuery)));
  }, [groups, searchQuery]);

  const selectedGroup = groups.find((g) => g.name === selected) || null;

  const fmtVND = (n: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(n);

  if (status !== "live" && !rows.length) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <p>Đang tải dữ liệu từ Google Sheets...</p>
        </div>
      </div>
    );
  }

  // --- MÀN HÌNH CHI TIẾT 1 PIC ---
  if (selectedGroup) {
    return (
      <div className={styles.container}>
        <button type="button" className={styles.backBtn} onClick={() => setSelected(null)}>
          <ArrowLeft size={16} /> Quay lại danh sách PIC
        </button>

        <div className={styles.detailHeader}>
          <div className={styles.avatarLg}>{selectedGroup.name.charAt(0).toUpperCase()}</div>
          <div className={styles.headerInfo}>
            <div className={styles.nameBadge}>
              <h1>{selectedGroup.name}</h1>
              <span className={styles.roleTag}>
                <UserCheck size={14} />
                {role === "bd" ? "BD PIC" : "Account PIC"}
              </span>
            </div>
            <p className={styles.subLabel}>Đang quản lý {selectedGroup.rows.length} dự án / hợp đồng active</p>
          </div>
        </div>

        <div className={styles.summaryRow}>
          <div className={styles.summaryCard}>
            <div className={styles.cardIcon} style={{ backgroundColor: "rgba(16, 185, 129, 0.1)", color: "#10B981" }}>
              <Wallet size={20} />
            </div>
            <div>
              <div className={styles.summaryLabel}>Tong Doanh Thu</div>
              <div className={styles.summaryValue}>{fmtVND(selectedGroup.revenue)}</div>
            </div>
          </div>

          <div className={styles.summaryCard}>
            <div className={styles.cardIcon} style={{ backgroundColor: "rgba(99, 102, 241, 0.1)", color: "#6366F1" }}>
              <TrendingUp size={20} />
            </div>
            <div>
              <div className={styles.summaryLabel}>Tong Gross Profit</div>
              <div className={styles.summaryValue}>{fmtVND(selectedGroup.gross)}</div>
            </div>
          </div>

          <div className={styles.summaryCard}>
            <div className={styles.cardIcon} style={{ backgroundColor: "rgba(245, 158, 11, 0.1)", color: "#F59E0B" }}>
              <Briefcase size={20} />
            </div>
            <div>
              <div className={styles.summaryLabel}>So Job Dang Phu Trach</div>
              <div className={styles.summaryValue}>{selectedGroup.rows.length} Jobs</div>
            </div>
          </div>
        </div>

        <div className={styles.tableWrap}>
          <div className={styles.tableTitle}>
            <h3>Danh sách Job & Dự án phụ trách</h3>
          </div>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Mã đơn</th>
                <th>Job / Dự án</th>
                <th>Khách hàng</th>
                <th>Ngày ký</th>
                <th style={{ textAlign: "right" }}>Doanh thu</th>
                <th style={{ textAlign: "right" }}>Gross Profit</th>
              </tr>
            </thead>
            <tbody>
              {selectedGroup.rows
                .sort((a, b) => (b.month || 0) - (a.month || 0))
                .map((r, i) => {
                  const revenue = r.netPost || r.netPre || 0;
                  const gross = r.netPost ? r.grossPost : r.grossPre || 0;
                  return (
                    <tr key={i}>
                      <td className={styles.mono}>
                        <span className={styles.codeTag}>{r.id}</span>
                      </td>
                      <td className={styles.projectName}>{r.projectName || "—"}</td>
                      <td>{r.company}</td>
                      <td className={styles.dateCell}>{r.signDate}</td>
                      <td className={`${styles.mono} ${styles.numCell}`}>{fmtVND(revenue)}</td>
                      <td className={`${styles.mono} ${styles.numCell} ${styles.highlight}`}>
                        {fmtVND(gross)}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // --- MÀN HÌNH DANH SÁCH TẤT CẢ PIC ---
  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <div>
          <h1>Thông tin PIC & Quản lý Doanh số</h1>
          <p className={styles.headerSub}>Theo dõi hiệu suất doanh thu và lợi nhuận gộp theo từng nhân sự</p>
        </div>

        <div className={styles.controlsGroup}>
          <div className={styles.searchBox}>
            <Search size={16} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Tìm kiếm PIC..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className={styles.roleToggle}>
            <button
              type="button"
              className={role === "bd" ? styles.roleActive : ""}
              onClick={() => setRole("bd")}
            >
              BD PIC
            </button>
            <button
              type="button"
              className={role === "account" ? styles.roleActive : ""}
              onClick={() => setRole("account")}
            >
              Account PIC
            </button>
          </div>
        </div>
      </div>

      <div className={styles.picGrid}>
        {filteredGroups.map((g, index) => (
          <button key={g.name} type="button" className={styles.picCard} onClick={() => setSelected(g.name)}>
            {index === 0 && (
              <div className={styles.topBadge} title="Top Performance">
                <Award size={14} />
                <span>Top 1</span>
              </div>
            )}
            <div className={styles.cardHeader}>
              <div className={styles.avatar}>{g.name.charAt(0).toUpperCase()}</div>
              <div>
                <div className={styles.picName}>{g.name}</div>
                <div className={styles.picMeta}>{g.rows.length} jobs phụ trách</div>
              </div>
            </div>

            <div className={styles.cardMetrics}>
              <div className={styles.metricItem}>
                <span>Doanh thu:</span>
                <strong>{fmtVND(g.revenue)}</strong>
              </div>
              <div className={styles.metricItem}>
                <span>Gross Profit:</span>
                <strong className={styles.grossValue}>{fmtVND(g.gross)}</strong>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}