import { useState } from "react";
import { Mail, Lock, User as UserIcon, Loader2 } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import styles from "./Login.module.scss";

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
  const { signInWithGoogle, signInWithEmail, resetPassword, loading, error } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setSubmitting(true);
    setResetSent(false);
    await signInWithEmail(email, password, rememberMe);
    setSubmitting(false);
  };

  const handleForgotPassword = async () => {
    if (!email) return;
    setResetSent(false);
    try {
      await resetPassword(email);
      setResetSent(true);
    } catch {
      // lỗi đã được đưa vào `error` bởi AuthContext
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.panel}>
        <div className={styles.avatar}>
          <UserIcon size={40} strokeWidth={1.5} />
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <Mail size={16} className={styles.fieldIcon} />
            <input
              type="email"
              placeholder="Email ID"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
            />
          </div>

          <div className={styles.field}>
            <Lock size={16} className={styles.fieldIcon} />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          <div className={styles.row}>
            <label className={styles.remember}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              Remember me
            </label>
            <button type="button" className={styles.forgotLink} onClick={handleForgotPassword}>
              Forgot Password?
            </button>
          </div>

          {resetSent && (
            <p className={styles.infoText}>Đã gửi email đặt lại mật khẩu, kiểm tra hộp thư của bạn.</p>
          )}
          {error && <p className={styles.errorText}>{error}</p>}

          <button type="submit" className={styles.loginBtn} disabled={submitting || loading}>
            {submitting ? <Loader2 size={16} className={styles.spin} /> : "LOGIN"}
          </button>
        </form>

        <div className={styles.divider}>
          <span>hoặc</span>
        </div>

        <button type="button" className={styles.googleBtn} onClick={signInWithGoogle} disabled={loading}>
          <GoogleIcon />
          Đăng nhập bằng Google
        </button>
      </div>
    </div>
  );
}
