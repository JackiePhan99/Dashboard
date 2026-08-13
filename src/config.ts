// ============================================================
// CÔNG TẮC TÍNH NĂNG
// ============================================================
// Bật/tắt đăng nhập Google. Khi false: bỏ qua hoàn toàn Firebase,
// vào thẳng Dashboard — dùng khi CHƯA kết nối Firebase Console.
// Đổi thành true khi đã điền xong .env (xem .env.example) và đã
// bật Google sign-in trong Firebase Console.
export const AUTH_ENABLED = false;

// Domain công ty — chỉ áp dụng cho đăng nhập bằng GOOGLE (chặn nếu email
// Google không thuộc domain này). Đăng nhập bằng Email/Mật khẩu KHÔNG bị
// giới hạn bởi domain này, dùng để tạo tài khoản phụ cho khách xem báo cáo
// (tạo thủ công trong Firebase Console → Authentication → Users → Add user).
export const COMPANY_DOMAIN = "themiracle.com";
