import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Login from "./components/Login/Login";
import Dashboard from "./components/Dashboard/Dashboard";

function AppContent() {
  const { user, loading } = useAuth();

  // Đang chờ Firebase kiểm tra phiên đăng nhập đã lưu trước đó
  if (loading) return null;

  return user ? <Dashboard /> : <Login />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
