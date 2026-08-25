import { User, Shield, CheckCircle } from "lucide-react";
import styles from "./Account.module.scss";

export const Account = () => {
  const user = {
    name: "Nguyen Van A",
    email: "anv@company.com",
    role: "Senior BD / Account Manager",
    department: "Business Development",
    joinDate: "01/01/2023",
    status: "Active",
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Tài khoản của tôi</h1>
        <p>Quản lý thông tin cá nhân và quyền truy cập hệ thống</p>
      </div>

      <div className={styles.profileCard}>
        <div className={styles.profileHeader}>
          <div className={styles.avatarLg}>{user.name.charAt(0).toUpperCase()}</div>
          <div>
            <div className={styles.titleGroup}>
              <h2>{user.name}</h2>
              <span className={styles.verifiedBadge}>
                <CheckCircle size={14} /> Đã xác thực
              </span>
            </div>
            <p className={styles.emailSub}>{user.email}</p>
          </div>
        </div>

        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <label>Chức danh / Vai trò</label>
            <div className={styles.valueBox}>{user.role}</div>
          </div>

          <div className={styles.infoItem}>
            <label>Phòng ban</label>
            <div className={styles.valueBox}>{user.department}</div>
          </div>

          <div className={styles.infoItem}>
            <label>Ngày tham gia</label>
            <div className={styles.valueBox}>{user.joinDate}</div>
          </div>

          <div className={styles.infoItem}>
            <label>Trạng thái tài khoản</label>
            <div className={styles.valueBox}>
              <span>{user.status}</span>
              <CheckCircle size={16} className={styles.iconCheck} />
            </div>
          </div>
        </div>
      </div>

      <div className={styles.securityCard}>
        <div className={styles.cardTitle}>
          <Shield size={18} />
          <span>Bảo mật & Quyền hạn</span>
        </div>
        <p className={styles.cardDesc}>
          Tài khoản của bạn được phân quyền dựa trên vai trò trong Google Sheets và hệ thống nội bộ.
        </p>

        <div className={styles.statusBox}>
          <div className={styles.statusLeft}>
            <div className={styles.dot} />
            <span>Xác thực qua Google Workspace</span>
          </div>
          <span className={styles.badgeActive}>ĐANG HOẠT ĐỘNG</span>
        </div>
      </div>
    </div>
  );
}