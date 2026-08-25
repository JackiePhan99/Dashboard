import {LayoutDashboard, Users, User, Settings, type LucideIcon } from "lucide-react";
import styles from "./Sidebar.module.scss";

export type PageKey = "dashboard" | "pic" | "account" | "settings";

interface NavItem {
  key: PageKey;
  label: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", label: "Dashboards", icon: LayoutDashboard },
  { key: "pic", label: "PIC", icon: Users },
  { key: "account", label: "Account", icon: User },
  { key: "settings", label: "Settings", icon: Settings },
];

export const Sidebar = ({
  active,
  onNavigate,
}: {
  active: PageKey;
  onNavigate: (key: PageKey) => void;
}) => {
  return (
    <nav className={styles.sidebar}>
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = active === item.key;
        return (
          <button
            key={item.key}
            type="button"
            className={`${styles.item} ${isActive ? styles.itemActive : ""}`}
            onClick={() => onNavigate(item.key)}
          >
            <span className={styles.iconSlot}>
              <Icon size={20} strokeWidth={1.8} />
            </span>
            <span className={styles.label}>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
