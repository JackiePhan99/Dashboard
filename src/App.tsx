import { useState } from "react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { Login } from "./components/Login/Login";
import { Dashboard } from "./components/Dashboard/Dashboard";
import { PicDetail } from "./components/PicDetail/PicDetail";
import { Account } from "./components/Account/Account";
import { Settings } from "./components/Settings/Settings";
import { Sidebar, type PageKey } from "./components/Sidebar/Sidebar";

function AppContent() {
  const { user, loading } = useAuth();
  const [page, setPage] = useState<PageKey>("dashboard");

  // Đang chờ Firebase kiểm tra phiên đăng nhập đã lưu trước đó
  if (loading) return null;
  if (!user) return <Login />;

  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      <Sidebar active={page} onNavigate={setPage} />
      <div style={{ minWidth: 0, width: "100%" }}>
        {page === "dashboard" && <Dashboard />}
        {page === "pic" && <PicDetail />}
        {page === "account" && <Account />}
        {page === "settings" && <Settings />}
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;