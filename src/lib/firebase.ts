import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Lấy config từ biến môi trường — KHÔNG hardcode key trực tiếp vào code.
// Tạo file .env (copy từ .env.example) rồi điền giá trị lấy từ:
// Firebase Console → Project settings → General → Your apps → SDK setup and configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);

export const googleProvider = new GoogleAuthProvider();
// Bắt buộc chọn lại tài khoản mỗi lần đăng nhập thay vì tự động dùng tài khoản cuối cùng
googleProvider.setCustomParameters({ prompt: "select_account" });
