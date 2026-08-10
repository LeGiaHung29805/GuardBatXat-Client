# BÁO CÁO PHÂN TÍCH LỖI LOGIC - HỆ THỐNG GUARDBATXAT

> **Ngày tạo:** 2026-08-05  
> **Phạm vi:** Backend (Spring Boot `e:\NCKH\BatXat`) ↔ Frontend (Next.js `e:\NCKH\BatXat-Client`)  
> **Nguồn tham chiếu:** `PROJECT_OVERVIEW.md`

---

## TÓM TẮT

| Mức độ | Số lượng |
|--------|----------|
| 🔴 HIGH (Nghiêm trọng) | 5 |
| 🟡 MEDIUM (Trung bình) | 7 |
| 🟢 LOW (Nhỏ / Code smell) | 5 |

---

## 🔴 LỖI NGHIÊM TRỌNG (HIGH)

---

### BUG-01: Tắt hoàn toàn phân quyền bảo mật

**File:** `SecurityConfig.java` — Dòng 91  
**Vị trí:** `src/main/java/.../security/SecurityConfig.java`

```java
// COMMENT OUT toàn bộ phân quyền RESCUE / COMMANDER / ADMIN
// .requestMatchers("/api/v1/rescue/**").authenticated()
// .requestMatchers("/api/v1/commander/**").authenticated()
.anyRequest().permitAll()  // ← MỌI REQUEST ĐỀU ĐƯỢC PHÉP
```

**Mô tả lỗi:** `.anyRequest().permitAll()` đang bật cho **toàn bộ endpoint**, bao gồm:
- `/api/v1/rescue/sos/{id}/accept` — Đội cứu hộ nhận nhiệm vụ  
- `/api/commander/evacuation/activate` — Kích hoạt lệnh sơ tán
- `/api/v1/admin/**` — Toàn bộ chức năng quản trị

**Hệ quả:** Bất kỳ ai (không cần đăng nhập) đều có thể nhận/hoàn thành nhiệm vụ cứu hộ, kích hoạt lệnh sơ tán, hoặc chỉnh sửa dữ liệu không gian. Nghiêm trọng về mặt bảo mật và an toàn nghiệp vụ.

**Fix đề xuất:**
```java
.requestMatchers("/api/v1/rescue/**").hasAnyRole("RESCUE_TEAM", "COMMANDER", "ADMIN")
.requestMatchers("/api/commander/**").hasAnyRole("COMMANDER", "ADMIN")
.requestMatchers("/api/v1/admin/**").hasRole("ADMIN")
.anyRequest().authenticated()
```

---

### BUG-02: `completeSosRequest` không kiểm tra quyền — ai cũng hoàn thành được

**File:** `SosServiceImpl.java` — Dòng 162–165  
**Vị trí:** `src/main/java/.../service/impl/SosServiceImpl.java`

```java
@Override
public void completeSosRequest(Integer id, String identifier) {
    ...
    // Kiểm tra xem người hoàn thành có phải là người đã nhận không
    if (sos.getAssignedUser() == null || !sos.getAssignedUser().getUsername().equals(identifier)) {
        // Có thể bỏ qua kiểm tra này...
    }  // ← KHỐI IF RỖNG, không throw exception
    
    sos.setStatus("COMPLETED");
    sosRequestRepository.save(sos);
}
```

**Mô tả lỗi:** Khối `if` kiểm tra quyền hoàn toàn trống. Bất kỳ người dùng RESCUE nào (kể cả người không nhận nhiệm vụ) đều có thể đóng nhiệm vụ của người khác.

**Fix đề xuất:**
```java
if (sos.getAssignedUser() == null || !sos.getAssignedUser().getUsername().equals(identifier)) {
    throw new AppException(ErrorCode.FORBIDDEN);
}
```

---

### BUG-03: `RoutingServiceImpl.findOptimalRoute` chưa triển khai — ném `UnsupportedOperationException`

**File:** `RoutingServiceImpl.java` — Dòng 166–170

```java
@Override
public RoutingResponse findOptimalRoute(String strategyName, RoutingRequest request) {
    // TODO Auto-generated method stub
    throw new UnsupportedOperationException("Unimplemented method 'findOptimalRoute'");
}
```

**Mô tả lỗi:** Hàm `findOptimalRoute` vẫn là stub chưa implement, sẽ crash ngay khi bất kỳ component nào gọi tới. Theo `PROJECT_OVERVIEW.md`, đây là hàm trung tâm của phân hệ định tuyến MCDM.

**Fix:** Triển khai hoặc xóa khỏi interface nếu không sử dụng.

---

### BUG-04: `getEvacuationCenter` — Parse chuỗi level không có xử lý lỗi

**File:** `NotificationServiceImpl.java` — Dòng 65

```java
public Map<String, Double> getEvacuationCenter(String level) {
    ...
    Double numLevel = Double.valueOf(level); // ← Ném NumberFormatException nếu level = "80m"
    ...
}
```

**Mô tả lỗi:** Frontend gửi level dạng `"80"`, `"82"`, `"83.5"` (không có 'm'). Tuy nhiên API endpoint lấy `defaultValue = "80"` làm String. Nếu bất kỳ caller nào gửi `"80m"`, `Double.valueOf()` sẽ ném `NumberFormatException`, crash toàn bộ request.

**Fix đề xuất:**
```java
Double numLevel;
try {
    numLevel = Double.valueOf(level.replace("m", "").trim());
} catch (NumberFormatException e) {
    log.warn("Level không hợp lệ: {}", level);
    // Trả về tâm mặc định Bát Xát
    return Map.of("centerLat", 22.6133, "centerLng", 103.8647);
}
```

---

### BUG-05: WebSocket SOS — Frontend dùng field `lat/lng` nhưng payload backend dùng `gpsLat/gpsLng`

**Mô tả lỗi:**  
Backend (`SosServiceImpl.java` dòng 75) gửi object `SosRequest` qua WebSocket — DTO này có field `lat`/`lng`.

Khi tải từ REST API (`GET /api/v1/rescue/sos`), backend trả về `SosResponse` với field `gpsLat`/`gpsLng`.

Frontend Rescue (`rescue/page.tsx`):
```typescript
// WebSocket (dòng 157): đọc data.lat, data.lng ← đúng với SosRequest DTO
`Tọa độ: [${data.lat}, ${data.lng}]`

// REST API (dòng 120): đọc sos.gpsLat, sos.gpsLng ← đúng với SosResponse DTO
lat: sos.gpsLat, lng: sos.gpsLng
```

Hai field này **nhất quán** trong từng bối cảnh nhưng tạo ra sự nhầm lẫn khi dev sau này đọc code. Nên chuẩn hóa tên field thống nhất trong toàn bộ hệ thống.

---

## 🟡 LỖI TRUNG BÌNH (MEDIUM)

---

### BUG-06: `acceptSosRequest` ghi đè `assignedUser` nếu SOS đã được nhận

**File:** `SosServiceImpl.java` — Dòng 113–151

```java
public void acceptSosRequest(Integer id, String identifier) {
    SosEntity sos = sosRequestRepository.findById(id)...;
    // Không check sos.getStatus() == "OPEN"
    sos.setStatus("RESCUING");
    sos.setAssignedUser(user); // Ghi đè người đã nhận trước đó
    sosRequestRepository.save(sos);
}
```

**Mô tả lỗi:** Nếu SOS đã ở trạng thái `RESCUING`, rescue khác vẫn có thể "cướp" nhiệm vụ, ghi đè `assignedUser`.

**Fix:**
```java
if (!"OPEN".equals(sos.getStatus())) {
    throw new AppException(ErrorCode.INVALID_STATE);
}
```

---

### BUG-07: `UserServiceImpl.getMyProfile` dùng `@Transactional` trên read-only query

**File:** `UserServiceImpl.java` — Dòng 151–159

```java
@Override
@Transactional  // ← Không cần, hoặc phải là readOnly = true
@Cacheable(value = "userProfile", key = "#identifier")
public UserResponse getMyProfile(String identifier) { ... }
```

`@Cacheable` + `@Transactional` (readWrite) trên cùng method public tạo overhead không cần thiết. Nên dùng `@Transactional(readOnly = true)`.

---

### BUG-08: Hai service Safety Check song song với logic cảnh báo khác nhau

**Mô tả lỗi:** Hệ thống có **hai implementation** xử lý Safety Check độc lập:

1. **`RiskServiceImpl.checkLocationSafety()`** — Logic Java thuần:
   - `isSafe = (floodDepth == 0) && (combinedLsScore < 0.55)`
   - Ngưỡng DANGER: `floodDepth > 2 || combinedLsScore >= 0.75`

2. **`SafetyCheckServiceImpl.evaluateLocationSafety()`** — Dùng LATERAL JOIN PostGIS:
   - `isDanger = floodStatus.contains("Nguy cơ Rất cao") || floodStatus.contains("Nguy cơ Cao")`
   - Logic khác hoàn toàn với service kia

Cùng một tọa độ có thể cho kết quả SAFE/DANGER khác nhau tùy endpoint được gọi → mâu thuẫn dữ liệu.

---

### BUG-09: Commander thấy thông báo cá nhân của nạn nhân SOS

**File:** `NotificationServiceImpl.java` — Dòng 107–124

Hàm `getNotificationHistory()` (dành cho Commander) lấy `findTop20ByOrderByCreatedAtDesc()` — **không lọc** thông báo cá nhân (`target_user_id IS NOT NULL`). Commander sẽ thấy thông báo như "Đội cứu hộ đang đến với bạn" gửi cho nạn nhân cụ thể, vi phạm quyền riêng tư.

---

### BUG-10: `addSosUpdate` — mọi user đã đăng nhập đều thêm được field update

**File:** `SosServiceImpl.java` — Dòng 209–257

Chỉ check `anonymousUser`, không kiểm tra user có phải người được giao nhiệm vụ `sos.getAssignedUser()`. Citizen hay Rescue của nhiệm vụ khác đều thêm update được.

---

### BUG-11: Endpoint `updateStatus` incident không kiểm tra role Commander

**File:** `AuthIncidentReportController.java` — Dòng 58–68

```java
@PutMapping("/{id}/status")
public ResponseEntity<?> updateStatus(@PathVariable Integer id, @RequestParam String status) {
    // Không lấy identifier, không check role
    IncidentReportResponse data = incidentReportService.updateStatus(id, status);
}
```

Theo nghiệp vụ, chỉ **Commander** kiểm duyệt sự cố. Endpoint này không kiểm tra quyền gì cả.

---

### BUG-12: Frontend Rescue — thiếu mapping cho status `VERIFIED`

**File:** `rescue/page.tsx` — Dòng 112–114

```typescript
let mappedStatus: 'pending' | 'accepted' | 'completed' = 'pending';
if (sos.status === 'RESCUING') mappedStatus = 'accepted';
if (sos.status === 'COMPLETED') mappedStatus = 'completed';
// 'VERIFIED' → rơi vào 'pending' mà không có xử lý rõ ràng
```

Entity SOS định nghĩa 4 trạng thái: `OPEN, VERIFIED, RESCUING, COMPLETED`. Frontend chỉ xử lý 2. SOS đã `VERIFIED` hiển thị sai vào danh sách "chờ xử lý".

---

## 🟢 LỖI NHỎ / CODE SMELL (LOW)

---

### BUG-13: Hard-code URL Python AI Service

**File:** `RoutingServiceImpl.java` — Dòng 28–31

```java
private final String PYTHON_AI_URL = "http://localhost:5000/api/v1/ai/safe-routing";
```

Cần đưa vào `application.properties`:
```properties
ai.service.base-url=http://localhost:5000
```

---

### BUG-14: `RestTemplate` khởi tạo thẳng trong field, không dùng `@Bean`

**File:** `RiskServiceImpl.java` — Dòng 32

```java
private final RestTemplate restTemplate = new RestTemplate();
```

Không configure được timeout, retry, interceptor. Nên inject qua `@Bean`.

---

### BUG-15: Frontend Commander — `BAT_XAT_POPULATION = 3241` là số tĩnh

**File:** `commander/page.tsx` — Dòng 24

```typescript
const BAT_XAT_POPULATION = 3241;
// sentTo: BAT_XAT_POPULATION — luôn hiện "gửi đến 3241 người"
```

Số tĩnh, không thực tế, nên tính từ dữ liệu thực hoặc xóa trường này.

---

### BUG-16: `activateModel` — Race condition khi deactivate rồi activate

**File:** `AdminSystemConfigServiceImpl.java` — Dòng 68–72

Hai query (deactivate all → activate one) không atomic. Nên dùng native query hoặc pessimistic lock để tránh race condition.

---

### BUG-17: `getSosUpdates` trả về DESC, Timeline hiển thị ngược thời gian

**File:** `SosServiceImpl.java` — Dòng 188

```java
findBySosRequestIdOrderByCreatedAtDesc(sosId); // ← Mới nhất trước
```

`UpdateTimeline.tsx` thường render từ trên xuống = cũ → mới. Với kết quả DESC, người dùng đọc timeline "ngược chiều thời gian". Nên đổi sang ASC hoặc reverse trong frontend.

---

## BẢNG TỔNG HỢP

| ID | Mô tả ngắn | File(s) | Mức độ | Loại lỗi |
|----|-----------|---------|--------|----------|
| BUG-01 | `anyRequest().permitAll()` tắt toàn bộ phân quyền | `SecurityConfig.java` | 🔴 HIGH | Security |
| BUG-02 | `completeSosRequest` — khối kiểm tra quyền rỗng | `SosServiceImpl.java` | 🔴 HIGH | Business Logic |
| BUG-03 | `findOptimalRoute` chưa implement | `RoutingServiceImpl.java` | 🔴 HIGH | Missing Impl. |
| BUG-04 | `getEvacuationCenter` — parse level string có thể crash | `NotificationServiceImpl.java` | 🔴 HIGH | Runtime Error |
| BUG-05 | Tên field lat/lng không nhất quán giữa WS và REST | `rescue/page.tsx` | 🔴 HIGH | Data Contract |
| BUG-06 | `acceptSosRequest` không check status — cướp nhiệm vụ | `SosServiceImpl.java` | 🟡 MEDIUM | Business Logic |
| BUG-07 | `@Transactional` + `@Cacheable` không phù hợp | `UserServiceImpl.java` | 🟡 MEDIUM | Performance |
| BUG-08 | Hai service Safety Check, logic cảnh báo khác nhau | `RiskServiceImpl` + `SafetyCheckServiceImpl` | 🟡 MEDIUM | Design |
| BUG-09 | Commander thấy thông báo cá nhân nạn nhân | `NotificationServiceImpl.java` | 🟡 MEDIUM | Privacy |
| BUG-10 | `addSosUpdate` — mọi user đăng nhập đều thêm được | `SosServiceImpl.java` | 🟡 MEDIUM | Authorization |
| BUG-11 | `updateStatus` incident — không kiểm tra role | `AuthIncidentReportController.java` | 🟡 MEDIUM | Authorization |
| BUG-12 | Frontend thiếu map cho status `VERIFIED` | `rescue/page.tsx` | 🟡 MEDIUM | UI Logic |
| BUG-13 | Hard-code `localhost:5000` Python AI URL | `RoutingServiceImpl.java` | 🟢 LOW | Config |
| BUG-14 | `RestTemplate` khởi tạo thẳng, không dùng Bean | `RiskServiceImpl.java` | 🟢 LOW | Code Quality |
| BUG-15 | `BAT_XAT_POPULATION` là số tĩnh vô nghĩa | `commander/page.tsx` | 🟢 LOW | UI Logic |
| BUG-16 | Race condition khi activate AI model | `AdminSystemConfigServiceImpl.java` | 🟢 LOW | Concurrency |
| BUG-17 | `getSosUpdates` DESC nhưng Timeline hiển thị ngược | `SosServiceImpl.java` | 🟢 LOW | UX |

---

*Phân tích được thực hiện bằng cách đọc trực tiếp source code, không chạy kiểm thử tự động.*
> **Ngày tạo:** Đã xử lý xong vào ngày 5/8/2026 