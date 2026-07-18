// ============================================================
// THEME & COLOR PALETTE
// ============================================================
export const PALETTE = {
  bg: "#F3F5F8",
  card: "#FFFFFF",
  ink: "#161A23",
  sub: "#6B7280",
  faint: "#9CA3AF",
  border: "#E7EAF0",
  teal: "#0E7C66",
  tealSoft: "#E4F4EF",
  amber: "#C97A2B",
  amberSoft: "#FBEEDE",
  indigo: "#4338CA",
  rose: "#B4444B",
  roseSoft: "#F8E9EA",
} as const;

export const SALE_COLORS = [
  PALETTE.teal,
  PALETTE.indigo,
  PALETTE.amber,
  PALETTE.rose,
  "#3D7FB8",
  "#7A5AA6",
  "#5C8A3A",
] as const;

// Font đã được khai báo tập trung ở src/styles/global.scss (import 1 lần ở main.jsx),
// không cần định nghĩa lại ở đây nữa.
