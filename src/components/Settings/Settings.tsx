import { useState } from "react";
import { Save, Database, Sliders, RefreshCw } from "lucide-react";
import styles from "./Settings.module.scss";

export const Settings = () => {
  const [sheetUrl, setSheetUrl] = useState(
    "https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
  );
  const [currency, setCurrency] = useState("VND");
  const [refreshInterval, setRefreshInterval] = useState("5");

  const handleSave = () => {
    alert("Đã lưu cấu hình thành công!");
  };

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <div>
          <h1>Cấu hình hệ thống</h1>
          <p>Quản lý kết nối dữ liệu Google Sheets và các thiết lập hiển thị</p>
        </div>

        <button type="button" className={styles.saveBtn} onClick={handleSave}>
          <Save size={16} /> Lưu cấu hình
        </button>
      </div>

      {/* Section 1: Google Sheets Connection */}
      <div className={styles.sectionCard}>
        <div className={styles.sectionTitle}>
          <Database size={18} />
          <span>Nguồn dữ liệu (Google Sheets)</span>
        </div>

        <div className={styles.formGroup} style={{ marginBottom: "16px" }}>
          <label>Đường dẫn Google Sheet (Spreadsheet URL / ID)</label>
          <input
            type="text"
            value={sheetUrl}
            onChange={(e) => setSheetUrl(e.target.value)}
            placeholder="https://docs.google.com/spreadsheets/d/..."
          />
          <p className={styles.hint}>
            Đảm bảo Google Sheet đã được mở quyền truy cập (Viewer/Editor) cho API Key hoặc Service Account.
          </p>
        </div>

        <div className={styles.statusBanner}>
          <div className={styles.statusInfo}>
            <div className={styles.pulseDot} />
            <div>
              <div className={styles.projectName}>Đã kết nối Google Sheet</div>
              <div className={styles.projectSub}>Cập nhật lần cuối: Vừa xong</div>
            </div>
          </div>

          <button type="button" className={styles.refreshBtn}>
            <RefreshCw size={14} /> Đồng bộ ngay
          </button>
        </div>
      </div>

      {/* Section 2: Display & Format Settings */}
      <div className={styles.sectionCard}>
        <div className={styles.sectionTitle}>
          <Sliders size={18} />
          <span>Tùy chọn hiển thị</span>
        </div>

        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label>Đơn vị tiền tệ</label>
            <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
              <option value="VND">VNĐ (Việt Nam Đồng)</option>
              <option value="USD">USD (Đô la Mỹ)</option>
            </select>
            <p className={styles.hint}>Định dạng số hiển thị trong các bảng báo cáo</p>
          </div>

          <div className={styles.formGroup}>
            <label>Tần suất tự động làm mới (Phút)</label>
            <select value={refreshInterval} onChange={(e) => setRefreshInterval(e.target.value)}>
              <option value="1">1 phút</option>
              <option value="5">5 phút</option>
              <option value="15">15 phút</option>
              <option value="0">Tắt tự động làm mới</option>
            </select>
            <p className={styles.hint}>Thời gian tự động tải lại dữ liệu từ Sheet</p>
          </div>
        </div>
      </div>
    </div>
  );
}