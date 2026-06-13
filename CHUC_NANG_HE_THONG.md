# TỔNG HỢP & PHÂN TÍCH CHUYÊN SÂU CÁC CHỨC NĂNG HỆ THỐNG QUẢN LÝ CỨU HỘ BÁT XÁT
*(Tài liệu dành cho nhóm phát triển để viết Báo cáo/Thống kê)*

Hệ thống GuardBatXat được thiết kế theo kiến trúc phân quyền (Role-based) với **4 nhóm người dùng chính**, mỗi nhóm giải quyết một bài toán đặc thù trong nghiệp vụ phòng chống thiên tai. Dưới đây là phân tích chi tiết "Đầu vào - Đầu ra - Điểm khác biệt" của từng chức năng.

---

## 👨‍👩‍👧‍👦 1. Role: CITIZEN (Người dân) - `http://localhost:3000/citizen`
**Mục tiêu:** Cung cấp công cụ sinh tồn tự động, dễ sử dụng nhất trong điều kiện khẩn cấp. Tập trung vào "Cá nhân hóa rủi ro".

| Chức năng | Mô tả chi tiết & Phân tích Logic |
| :--- | :--- |
| **Bản đồ Cảnh báo Thiên tai (Citizen Heatmap)** | **Điểm khác biệt:** Heatmap của người dân là dạng **Bản đồ Nhiệt trực quan (Visual Heatmap)**. Hệ thống chỉ trả về danh sách các điểm toạ độ kèm "trọng số rủi ro" (Weight) để vẽ ra các mảng màu Đỏ/Cam/Vàng trên bản đồ. Mục đích là để người dân nhìn vào biết khu vực nào đang nguy hiểm để tránh, không cung cấp các con số phức tạp gây rối mắt. |
| **Kiểm tra an toàn (Safety Check)** | Người dùng click vào một điểm bất kỳ trên bản đồ. Hệ thống lấy toạ độ đó gửi lên Server. AI sẽ đối chiếu toạ độ này với các lớp bản đồ địa hình (độ dốc, sông suối) và lượng mưa để trả về kết quả: "Khu vực an toàn" hay "Nguy cơ sạt lở cao". |
| **Tìm đường an toàn (Safe Routing)** | Khác với Google Maps (chỉ tìm đường ngắn nhất), thuật toán định tuyến của hệ thống sẽ **né tránh các polygon ngập lụt/sạt lở**. Đầu vào là (Điểm A, Điểm B). Đầu ra là lộ trình đã được "nắn" qua các con đường an toàn nhất, kèm theo cảnh báo nếu bắt buộc phải đi qua vùng rủi ro thấp. |
| **Tìm nơi trú ẩn (Safe Shelter)** | Tự động quét trong bán kính quy định để tìm các công trình công cộng (Trường học, Trạm y tế, Nhà văn hoá) nằm trên vùng cao, không bị ngập. Hệ thống sẽ vạch sẵn đường ngắn nhất từ vị trí hiện tại đến nơi trú ẩn đó. |
| **Phát tín hiệu SOS** | Khi gặp nạn, người dân gửi yêu cầu cầu cứu. Gói tin bao gồm: Toạ độ GPS chính xác, tình trạng y tế (bị thương, kẹt trong nhà) và số lượng người. Dữ liệu này lập tức nhảy lên màn hình của Đội Cứu hộ và Chỉ huy. |
| **Hồ sơ sinh tồn (Survival Profile)** | Nơi người dân khai báo trước: Tình trạng bệnh lý nền, nhóm máu, biết bơi hay không, có áo phao hay xuồng không. Khi họ phát SOS, lực lượng cứu hộ sẽ đọc được hồ sơ này để đem theo thuốc men hoặc xuồng cứu sinh phù hợp. |

---

## 🚁 2. Role: RESCUE (Đội Cứu Hộ) - `http://localhost:3000/rescue`
**Mục tiêu:** Công cụ tác chiến hiện trường (Field Operations). Tối ưu cho thiết bị di động, thao tác nhanh, đồng bộ Real-time.

| Chức năng | Mô tả chi tiết & Phân tích Logic |
| :--- | :--- |
| **Quản lý danh sách SOS** | Bảng điều khiển hiển thị toàn bộ người dân đang kêu cứu. Được sắp xếp theo mức độ khẩn cấp (có người bị thương ưu tiên lên đầu). Đội cứu hộ có thể biết SOS nào "Đang chờ", SOS nào "Đã có đội khác nhận". |
| **Tiếp nhận nhiệm vụ (Accept Request)** | Khi 1 nhân viên cứu hộ bấm "Nhận", trạng thái SOS trong Database chuyển sang "Đang xử lý". Tên của nhân viên đó được gắn vào SOS, giúp Trạm chỉ huy biết ai đang chịu trách nhiệm ca cứu hộ này. |
| **Nhật ký hiện trường (Field Updates)** | **Điểm nhấn công nghệ:** Thay vì chỉ có trạng thái Đóng/Mở, đội cứu hộ có thể liên tục gửi các "Log" về trung tâm. VD: Log 1: "Đường vào bị cây đổ, đang cưa cây" -> Log 2: "Đã tiếp cận nạn nhân, nạn nhân bị gãy chân" -> Log 3: "Đang đưa lên cáng về trạm xá". Mỗi log đều lưu kèm thời gian thực (Timestamp). |
| **Báo cáo Vị trí trực tiếp (Live Location)** | Điện thoại của đội cứu hộ liên tục bắn toạ độ GPS (thông qua WebSockets) về Server. Trung tâm chỉ huy sẽ thấy một "chấm xanh" di chuyển trên bản đồ, giúp họ biết đội cứu hộ đã tới đâu. |

---

## 👮‍♂️ 3. Role: COMMANDER (Trung tâm Chỉ huy) - `http://localhost:3000/commander`
**Mục tiêu:** Cung cấp cái nhìn toàn cảnh (Bird-eye view). Tập trung vào Phân tích dữ liệu vĩ mô (Data Analytics) và Ra Quyết định (Decision Making).

| Chức năng | Mô tả chi tiết & Phân tích Logic |
| :--- | :--- |
| **Bản đồ Phân tích (Commander Heatmap)** | **Khác biệt cốt lõi với Citizen Heatmap:** Bản đồ của Commander không chỉ có "màu sắc". Khi Commander tải một kịch bản ngập lụt, Server trả về một tập hợp dữ liệu vĩ mô (CommanderFloodProjection): Toạ độ điểm ngập + **Diện tích bị ngập (m2) + Ước tính số người bị ảnh hưởng tại toạ độ đó**. Điều này giúp Commander đánh giá chính xác mức độ thiệt hại kinh tế và nhân mạng. |
| **Dashboard Thống Kê Tổng Hợp** | Hệ thống tự động tính toán tổng (Sum) toàn bộ dữ liệu từ Heatmap để hiển thị ra các con số khổng lồ: **Tổng số nhà bị ngập, Tổng số người cần sơ tán khẩn cấp, Tổng số tuyến đường bị đứt đoạn**. Commander chỉ cần đổi kịch bản (ví dụ từ ngập 80m lên ngập 82m), các con số này sẽ nhảy theo thời gian thực. |
| **Kích hoạt Sơ Tán Khẩn Cấp (Evacuation)** | Chức năng vũ khí: Commander vẽ một vòng tròn bán kính (Radius) quanh tâm bão/tâm ngập. Khi nhấn "Kích hoạt", Server dùng WebSocket bắn thẳng một lệnh "ĐỎ" (Alert) nổ chuông cảnh báo trên màn hình điện thoại của **tất cả người dân (Role Citizen)** đang đứng trong vòng tròn đó. |
| **Gửi Cảnh báo diện rộng (Broadcast)** | Tương tự tin nhắn khẩn cấp của chính phủ. Commander gõ một tin nhắn (VD: "Sắp xả lũ thuỷ điện, bà con di dời") và gửi đi. Tin nhắn này lưu vào Database (Notification History) và thông báo Real-time đến mọi Role. |

---

## ⚙️ 4. Role: ADMIN (Quản trị Hệ thống) - `http://localhost:3000/admin`
**Mục tiêu:** Duy trì, bảo trì, cấu hình "Luật chơi" (Business Rules) và Dữ liệu lõi (Core Data) của toàn hệ thống. Cấp quyền cao nhất.

| Chức năng | Mô tả chi tiết & Phân tích Logic |
| :--- | :--- |
| **Quản trị Dữ liệu Không Gian (Spatial Data)** | Khác biệt lớn: Admin là người "vẽ" ra bản đồ. Admin thêm mới dữ liệu Nhà (Building - chứa thông tin có bao nhiêu nhân khẩu) và Đường (RoadEdge). Khi có một khu dân cư mới xây, Admin nhập liệu vào đây. Dữ liệu này chính là đầu vào để thuật toán của Commander tính toán xem "có bao nhiêu nhà bị ngập". |
| **Quản trị Mô hình Trí tuệ Nhân tạo (Model Registry)** | Hệ thống có thể có nhiều mô hình AI (VD: AI dự báo sạt lở Version 1.0, Version 2.0). Admin có quyền xem độ chính xác (Accuracy), sai số của từng mô hình. Nếu Model V2.0 dự đoán tốt hơn, Admin bấm "Kích hoạt" (Activate). Toàn bộ hệ thống tự động ngắt Model cũ và chuyển sang tính toán bằng Model mới mà không cần tắt Server. |
| **Tinh chỉnh Trọng số Tìm đường (AHP Weights)** | **Rất quan trọng cho báo cáo:** Thuật toán tìm đường của dự án phụ thuộc vào "Trọng số". Ví dụ: Vào mùa khô, Admin chỉnh trọng số "Độ dốc" cao lên (ưu tiên đường bằng phẳng). Nhưng vào mùa mưa lũ, Admin chỉnh trọng số "Khoảng cách tới sông ngòi" lên cao nhất (để hệ thống tuyệt đối không dẫn người dân đi gần bờ sông). Việc này tạo ra tính linh hoạt vô đối cho thuật toán Routing. |
| **So sánh Thuật toán (Routing Compare)** | Admin chạy thử 2 thuật toán song song trên cùng một lộ trình (A->B) để đo đạc xem thuật toán mới (có AI) giúp tránh được bao nhiêu vùng nguy hiểm so với thuật toán Dijsktra thông thường. Tính năng này sinh ra đặc biệt để lấy số liệu làm báo cáo NCKH. |
| **Quản trị Phân Quyền (User Management)** | Đóng/mở tài khoản. Quyết định ai được làm Cứu hộ (Rescue), ai được cấp quyền Chỉ huy (Commander). Khoá tài khoản nếu phát hiện người dân spam tín hiệu SOS giả mạo. |
