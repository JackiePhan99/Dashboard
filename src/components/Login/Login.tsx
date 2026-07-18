import { useAuth } from "../../contexts/AuthContext";
import styles from "./Login.module.scss";

// Icon Google chính thức (4 màu), giữ nguyên màu gốc nên vẽ trực tiếp bằng SVG
// thay vì dùng icon 1 màu từ lucide-react.
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.66 9c0-.59.1-1.17.29-1.7V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.03l2.99-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.47.89 11.43 0 9 0A9 9 0 0 0 .96 4.97l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58z" />
    </svg>
  );
}

export default function Login() {
  const { signInWithGoogle, loading, error } = useAuth();

  return (
    <div className={styles.wrapper}>
      <div className={`card ${styles.panel}`}>
        <div className={styles.logo}>DB</div>
        <h1 className={styles.title}>Đăng nhập</h1>
        <p className={styles.subtitle}>Đăng nhập bằng tài khoản Google để tiếp tục vào báo cáo</p>

        <button
          type="button"
          className={`btn ${styles.googleBtn}`}
          onClick={signInWithGoogle}
          disabled={loading}
        >
          <GoogleIcon />
          {loading ? "Đang kiểm tra phiên đăng nhập..." : "Đăng nhập bằng Google"}
        </button>

        {error && <p className={styles.errorText}>{error}</p>}
      </div>
    </div>
  );
}
