import React, { createContext, useContext, useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { AUTH_ENABLED } from "../config";

// Kiểu người dùng tối giản dùng khi AUTH_ENABLED = false (không cần Firebase thật).
type FakeUser = { email: string };

interface AuthContextValue {
  user: User | FakeUser | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
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

  const signInWithGoogle = async () => {
    if (!AUTH_ENABLED) return; // không làm gì khi đang tắt đăng nhập
    setError(null);
    try {
      const { auth, googleProvider } = await import("../lib/firebase");
      const { signInWithPopup } = await import("firebase/auth");
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Đăng nhập thất bại, thử lại sau.");
    }
  };

  const signOut = async () => {
    if (!AUTH_ENABLED) return; // không làm gì khi đang tắt đăng nhập
    const { auth } = await import("../lib/firebase");
    const { signOut: firebaseSignOut } = await import("firebase/auth");
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth phải được gọi bên trong <AuthProvider>");
  return ctx;
}
