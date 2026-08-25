import React, { createContext, useContext, useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { AUTH_ENABLED, COMPANY_DOMAIN } from "../config";

// Kiểu người dùng tối giản dùng khi AUTH_ENABLED = false (không cần Firebase thật).
type FakeUser = { email: string };

interface AuthContextValue {
  user: User | FakeUser | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string, rememberMe: boolean) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | FakeUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // ------------------------------------------------------------
    // CHƯA KẾT NỐI FIREBASE: bỏ qua đăng nhập, coi như đã đăng nhập
    // bằng 1 tài khoản giả để Dashboard hiển thị được ngay.
    // ------------------------------------------------------------
    if (!AUTH_ENABLED) {
      setUser({ email: "dev@local" });
      setLoading(false);
      return;
    }

    // ------------------------------------------------------------
    // ĐÃ KẾT NỐI FIREBASE: import động để code không đụng tới
    // firebase/app khi AUTH_ENABLED = false (tránh lỗi config rỗng).
    // ------------------------------------------------------------
    let unsubscribe: (() => void) | undefined;
    import("../lib/firebase").then(({ auth }) => {
      import("firebase/auth").then(({ onAuthStateChanged }) => {
        unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
          setUser(firebaseUser);
          setLoading(false);
        });
      });
    });

    return () => unsubscribe?.();
  }, []);

  // Đăng nhập Google chỉ chấp nhận email thuộc domain công ty (COMPANY_DOMAIN).
  // Tài khoản khách/phụ tạo thủ công trong Firebase Console nên dùng đăng nhập
  // Email/Mật khẩu bên dưới, không bị chặn bởi domain này.
  const signInWithGoogle = async () => {
    if (!AUTH_ENABLED) return;
    setError(null);
    try {
      const { auth, googleProvider } = await import("../lib/firebase");
      const { signInWithPopup, signOut: firebaseSignOut } = await import("firebase/auth");
      const result = await signInWithPopup(auth, googleProvider);
      const email = result.user.email || "";
      if (!email.toLowerCase().endsWith(`@${COMPANY_DOMAIN.toLowerCase()}`)) {
        await firebaseSignOut(auth);
        setError(`Hệ thống chỉ hỗ trợ đăng nhập bằng tài khoản nội bộ công ty.`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Đăng nhập thất bại, thử lại sau.");
    }
  };

  const signInWithEmail = async (email: string, password: string, rememberMe: boolean) => {
    if (!AUTH_ENABLED) return;
    setError(null);
    try {
      const { auth } = await import("../lib/firebase");
      const {
        signInWithEmailAndPassword,
        setPersistence,
        browserLocalPersistence,
        browserSessionPersistence,
      } = await import("firebase/auth");
      // "Remember me" bật -> giữ đăng nhập sau khi đóng trình duyệt.
      // Tắt -> chỉ giữ trong phiên làm việc hiện tại (đóng tab là mất).
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      await signInWithEmailAndPassword(auth, email, password);
    } catch (e) {
      setError(mapAuthError(e));
    }
  };

  const resetPassword = async (email: string) => {
    if (!AUTH_ENABLED) return;
    setError(null);
    try {
      const { auth } = await import("../lib/firebase");
      const { sendPasswordResetEmail } = await import("firebase/auth");
      await sendPasswordResetEmail(auth, email);
    } catch (e) {
      setError(mapAuthError(e));
      throw e;
    }
  };

  const signOut = async () => {
    if (!AUTH_ENABLED) return;
    const { auth } = await import("../lib/firebase");
    const { signOut: firebaseSignOut } = await import("firebase/auth");
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, error, signInWithGoogle, signInWithEmail, resetPassword, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Dịch vài mã lỗi Firebase phổ biến sang tiếng Việt dễ hiểu hơn.
function mapAuthError(e: unknown): string {
  const code = (e as { code?: string })?.code || "";
  const map: Record<string, string> = {
    "auth/invalid-email": "Email không hợp lệ.",
    "auth/user-not-found": "Không tìm thấy tài khoản với email này.",
    "auth/wrong-password": "Sai mật khẩu.",
    "auth/invalid-credential": "Email hoặc mật khẩu không đúng.",
    "auth/too-many-requests": "Đăng nhập sai quá nhiều lần, thử lại sau ít phút.",
  };
  return map[code] || (e instanceof Error ? e.message : "Có lỗi xảy ra, thử lại sau.");
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth phải được gọi bên trong <AuthProvider>");
  return ctx;
}
