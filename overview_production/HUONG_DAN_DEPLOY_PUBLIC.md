# 🚀 HƯỚNG DẪN DEPLOY PUBLIC - DỰ ÁN GUARDBATXAT
> **Mục tiêu:** Cho ~8 thầy cô/người dùng vào test sản phẩm qua internet, **miễn phí, không cần server**, chạy ngay trên máy của bạn.

---

## 📊 KIẾN TRÚC CẦN EXPOSE RA NGOÀI

```
Internet (8 người thầy/cô)
        ↓
  [ngrok HTTPS URL]          ← Chỉ cần expose cổng này ra ngoài
        ↓
  Frontend :3000  (Next.js)
        ↓ (rewrite /api/* → :8080, /ws/* → :8080)
  Backend :8080   (Spring Boot)
        ↓
  ┌──────────────────┐
  │  PostgreSQL :5432│
  │  Redis      :6379│
  │  Flask AI   :5000│
  └──────────────────┘
```

**Điểm mấu chốt:** Next.js đã cấu hình sẵn proxy `/api/*` và `/ws/*` về `localhost:8080`.
Vì vậy bạn **CHỈ CẦN expose duy nhất cổng 3000** ra internet. Thầy cô truy cập Frontend, mọi API call/WebSocket đều tự động đi qua proxy nội bộ — bảo mật hơn và chỉ cần 1 URL.

---

## ⚡ PHƯƠNG ÁN 1 — NGROK (Khuyến nghị — Nhanh nhất, 0 đồng)

### Tại sao chọn ngrok?
- ✅ **Miễn phí** cho ≤8 người dùng đồng thời
- ✅ **URL HTTPS ngay lập tức**, không cần cấu hình firewall/router
- ✅ **Không cần cloud server**, chạy thẳng trên máy bạn
- ✅ **Có dashboard** theo dõi request real-time tại `localhost:4040`
- ✅ **Hỗ trợ WebSocket** (cần thiết cho tính năng Live Location, SOS, Evacuation Alert)

---

### BƯỚC 1 — Cài đặt ngrok

```powershell
# Cách 1: Tải installer (Dễ nhất)
# Truy cập https://ngrok.com/download → tải file .exe cho Windows
# Giải nén vào thư mục nào đó (VD: C:\ngrok\ngrok.exe)

# Cách 2: Dùng Winget (nếu bạn có Windows 11)
winget install ngrok.ngrok

# Cách 3: Dùng Chocolatey
choco install ngrok
```

**Tạo tài khoản miễn phí:** https://dashboard.ngrok.com/signup
Sau khi đăng ký, vào **Dashboard → Your Authtoken**, copy token.

```powershell
# Xác thực máy của bạn với ngrok (chỉ làm 1 lần)
ngrok config add-authtoken YOUR_TOKEN_HERE
```

---

### BƯỚC 2 — Khởi động toàn bộ hệ thống (theo thứ tự)

#### 2a. Khởi động Database và Redis

```powershell
# Mở terminal trong thư mục NCKH
cd E:\NCKH

# Đảm bảo Docker Desktop đang chạy, sau đó:
docker-compose up -d postgres-db redis

# Kiểm tra
docker ps
# Phải thấy: batxat_postgres (port 5432) và batxat_redis (port 6379)
```

#### 2b. Khởi động Flask AI Service

```powershell
# Mở terminal mới
cd E:\NCKH\GuardBaXat\Spatial-Intelligence

# Kích hoạt môi trường ảo (nếu đã tạo)
.venv\Scripts\activate

# Hoặc cài mới nếu chưa có
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt

# Chạy Flask API (cổng 5000)
python app.py
```

#### 2c. Khởi động Spring Boot Backend

```powershell
# Mở terminal mới
cd E:\NCKH\BatXat

# Chạy backend (cổng 8080)
# Cách 1: Maven wrapper
.\mvnw.cmd spring-boot:run

# Cách 2: Nếu đã build sẵn .jar
java -jar target/*.jar
```

> ⚠️ **Chờ** cho đến khi thấy log `Started ... in X.XX seconds` trước khi tiếp tục.

#### 2d. Khởi động Frontend Next.js

```powershell
# Mở terminal mới
cd E:\NCKH\BatXat-Client

npm run dev
# Mặc định chạy trên cổng 3000
```

Kiểm tra tại: `http://localhost:3000` — Nếu thấy giao diện là OK.

---

### BƯỚC 3 — Expose cổng 3000 ra internet bằng ngrok

```powershell
# Mở terminal mới
ngrok http 3000
```

Bạn sẽ thấy output như sau:

```
Session Status        online
Account               your-email@gmail.com
Version               3.x.x
Region                Asia Pacific (ap)
Forwarding            https://xxxx-xxx-xxx.ngrok-free.app -> http://localhost:3000
Web Interface         http://127.0.0.1:4040
```

**🎉 URL dòng `Forwarding`** chính là link để gửi cho thầy cô!
Ví dụ: `https://rounding-slate-brisket.ngrok-free.app`

> **Lưu ý:** URL ngrok miễn phí sẽ thay đổi mỗi lần khởi động lại ngrok.
> Hãy khởi động ngrok 1 lần và giữ nguyên trong suốt buổi demo.

---

### BƯỚC 4 — Cấu hình Next.js chấp nhận domain ngrok

Mở file `E:\NCKH\BatXat-Client\next.config.ts` và **thêm URL ngrok của bạn** vào `allowedDevOrigins`:

```typescript
const nextConfig: NextConfig = {
  reactStrictMode: false,

  allowedDevOrigins: [
    "localhost",
    "192.168.102.21",
    "127.0.0.1",
    // Thêm URL ngrok của bạn vào đây (không có https://)
    "xxxx-xxx-xxx.ngrok-free.app",
  ],
  // ... phần còn lại giữ nguyên
};
```

> Sau khi sửa, Next.js dev server tự hot-reload, **không cần restart**.

---

### BƯỚC 5 — Gửi link cho thầy cô

Gửi thông tin sau qua Zalo/Email:

```
🌐 Link hệ thống: https://xxxx-xxx-xxx.ngrok-free.app

👥 Tài khoản test:

| Vai trò     | Username        | Password   | Đường dẫn                  |
|-------------|-----------------|------------|----------------------------|
| Người dân   | citizen01       | 123456     | /citizen                   |
| Đội cứu hộ  | rescue01        | 123456     | /rescue                    |
| Chỉ huy     | commander01     | 123456     | /commander                 |
| Quản trị    | admin           | admin123   | /admin                     |

💡 Nếu ngrok hiện cảnh báo "This site was created with ngrok"
   → Bấm "Visit Site" để tiếp tục.
```

> ⚠️ Thay username/password bằng tài khoản thật trong database của bạn!

---

## 🖥️ PHƯƠNG ÁN 2 — VS CODE PORT FORWARDING (Đơn giản nhất nếu dùng GitHub Codespaces / Dev Container)

> **Lưu ý:** VS Code Port Forwarding chỉ hoạt động tốt khi bạn đang chạy trong **GitHub Codespaces** hoặc **Remote SSH**. Nếu bạn đang làm việc local trên Windows, **ngrok (Phương án 1) là lựa chọn tốt hơn nhiều.**

Nếu vẫn muốn thử:

1. Mở VS Code
2. Nhấn `Ctrl + Shift + P` → gõ `Forward a Port`
3. Nhập `3000` → Enter
4. VS Code sẽ tạo link dạng `https://PORT-USERNAME.app.github.dev`
5. **Giới hạn:** Yêu cầu người dùng đăng nhập GitHub, không phù hợp cho thầy cô.

---

## 🌐 PHƯƠNG ÁN 3 — CLOUDFLARE TUNNEL (Miễn phí, URL cố định)

Nếu bạn muốn **URL không thay đổi** (không cần trả tiền):

```powershell
# Cài Cloudflare Tunnel
winget install Cloudflare.cloudflared

# Tạo tunnel tạm (không cần tài khoản)
cloudflared tunnel --url http://localhost:3000
```

Cloudflare sẽ cấp URL dạng: `https://something.trycloudflare.com`
URL này **ổn định hơn ngrok miễn phí** và không có giới hạn kết nối đồng thời.

---

## 📋 CHECKLIST TRƯỚC BUỔI BẢO VỆ

```
□ Docker Desktop đang chạy
□ batxat_postgres (port 5432)  ← docker ps kiểm tra
□ batxat_redis (port 6379)     ← docker ps kiểm tra
□ Flask AI app.py (port 5000)  ← thử http://localhost:5000
□ Spring Boot (port 8080)      ← thử http://localhost:8080/api/v1/health
□ Next.js frontend (port 3000) ← thử http://localhost:3000
□ ngrok đang forward cổng 3000 ← copy URL Forwarding
□ next.config.ts đã thêm domain ngrok
□ Tài khoản demo đã tạo sẵn trong DB (4 vai trò)
□ Dữ liệu mẫu đã import (risk heatmap, road network...)
□ Thử mở link ngrok trên điện thoại/máy khác trước
```

---

## ⚠️ CÁC VẤN ĐỀ THƯỜNG GẶP & CÁCH XỬ LÝ

### Lỗi: "ERR_NGROK_3200 - Tunnel not found"
→ ngrok đã bị đóng. Mở lại terminal và chạy `ngrok http 3000`

### Lỗi: "Host header does not match" / "Invalid Host Header"
→ Chưa thêm domain ngrok vào `allowedDevOrigins` trong `next.config.ts`

### Lỗi WebSocket bị disconnect
→ Thêm header đặc biệt khi khởi động ngrok:
```powershell
ngrok http 3000 --host-header="localhost:3000"
```

### Thầy cô thấy cảnh báo "Deceptive site" của ngrok
→ Đây là cảnh báo bình thường của ngrok free tier. Bảo họ bấm **"Visit Site"** hoặc **"Proceed anyway"**.

### Backend không kết nối được từ ngrok
→ Kiểm tra `next.config.ts`: đảm bảo `rewrites` đang trỏ về `http://127.0.0.1:8080` (đã đúng)

### Màn hình chậm, giật lag
→ Mở `http://127.0.0.1:4040` để xem ngrok dashboard, kiểm tra độ trễ.
→ Đảm bảo máy tính đang cắm sạc và kết nối mạng ổn định.

---

## 🗓️ KẾ HOẠCH BUỔI BẢO VỆ

### Trước hôm bảo vệ (tối hôm trước)
1. Khởi động toàn bộ hệ thống theo BƯỚC 2
2. Mở ngrok, lấy URL
3. Cập nhật `next.config.ts`
4. Test thử 4 vai trò: Citizen → Rescue → Commander → Admin
5. Để nguyên máy tính **không tắt máy, không sleep**

### Trong buổi bảo vệ
1. Gửi URL ngrok cho thầy cô qua Zalo/nhóm chat
2. Mỗi người vào 1 vai trò khác nhau để demo luồng:
   - Citizen phát SOS → Rescue nhận → Commander xem dashboard → Admin xem thống kê
3. Mở `http://127.0.0.1:4040` trên mày chiếu để show traffic real-time (gây ấn tượng với hội đồng)

---

## 💡 MẸO NÂNG CAO: CHẠY NHANH TOÀN BỘ HỆ THỐNG

Tạo file `start-demo.ps1` trong thư mục `E:\NCKH\`:

```powershell
# File: E:\NCKH\start-demo.ps1
# Chạy: Right-click → Run with PowerShell

Write-Host "🚀 Khởi động GuardBatXat Demo..." -ForegroundColor Cyan

# 1. Start Docker services
Write-Host "📦 Khởi động PostgreSQL + Redis..." -ForegroundColor Yellow
docker-compose -f E:\NCKH\docker-compose.yml up -d postgres-db redis
Start-Sleep -Seconds 5

# 2. Start Flask AI (trong cửa sổ mới)
Write-Host "🤖 Khởi động Flask AI Service..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit -Command cd 'E:\NCKH\GuardBaXat\Spatial-Intelligence'; .venv\Scripts\activate; python app.py"
Start-Sleep -Seconds 3

# 3. Start Spring Boot (trong cửa sổ mới)
Write-Host "☕ Khởi động Spring Boot..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit -Command cd 'E:\NCKH\BatXat'; .\mvnw.cmd spring-boot:run"
Start-Sleep -Seconds 30

# 4. Start Next.js (trong cửa sổ mới)
Write-Host "⚛️  Khởi động Next.js Frontend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit -Command cd 'E:\NCKH\BatXat-Client'; npm run dev"
Start-Sleep -Seconds 10

# 5. Start ngrok
Write-Host "🌐 Khởi động ngrok tunnel..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit -Command ngrok http 3000"

Write-Host ""
Write-Host "✅ Tất cả dịch vụ đã khởi động!" -ForegroundColor Green
Write-Host "👉 Mở http://127.0.0.1:4040 để lấy URL ngrok" -ForegroundColor Cyan
Write-Host "👉 Mở http://localhost:3000 để kiểm tra local" -ForegroundColor Cyan
```

Lưu file và chạy 1 lần duy nhất là xong!

---

*Tài liệu được tạo cho dự án GuardBatXat - Hệ thống hỗ trợ cứu hộ & phòng chống thiên tai Bát Xát, Lào Cai*
*Cập nhật lần cuối: 2026-08-04*
