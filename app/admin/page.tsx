"use client";
import axios from "axios";
import { useState } from "react";

export default function FullAdminDashboard() {
  const [activeTab, setActiveTab] = useState<"ai" | "simulation" | "users">(
    "ai",
  );

  // ==========================================
  // MODULE 2: CẤU HÌNH AI (UC_A2)
  // ==========================================
  const [weights, setWeights] = useState({
    wDistance: 0.1,
    wFlood: 0.4,
    wLandslide: 0.3,
    wCapacity: 0.1,
    wBridge: 0.05,
    wReport: 0.05,
  });
  const handleSaveAI = async () => {
    const total = Object.values(weights).reduce((a, b) => a + b, 0);
    if (Math.abs(total - 1.0) > 0.001)
      return alert(
        `Tổng trọng số phải bằng 1.0! Hiện tại là ${total.toFixed(2)}`,
      );

    try {
      // Chọc thẳng xuống API Backend của bạn
      const res = await axios.put(
        "http://localhost:8080/api/admin/system/weights/rescue",
        weights,
      );

      if (res.data.code === 200) {
        alert("✅ Cập nhật não bộ AI (AHP) xuống PostGIS thành công!");
      }
    } catch (error: any) {
      console.error("Lỗi API:", error);
      alert(
        "❌ Lỗi kết nối Backend: " +
          (error.response?.data?.message || error.message),
      );
    }
  };

  // ==========================================
  // MODULE 3 & 5: GIẢ LẬP LŨ LỤT & THỐNG KÊ (UC_A3 + UC_A5)
  // ==========================================
  const [waterLevel, setWaterLevel] = useState("83.5");
  const [simData, setSimData] = useState<any>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const handleRunSimulation = async () => {
    setIsSimulating(true);

    try {
      // Gọi API thực thi Stored Procedure quét vùng ngập lụt
      const res = await axios.post(
        "http://localhost:8080/api/admin/simulation/flood",
        {
          waterLevel: parseFloat(waterLevel),
        },
      );

      // Nếu Backend trả về mảng các ngôi nhà bị ngập, ta đếm số lượng
      if (res.data.code === 200) {
        const floodedHousesList = res.data.data;
        const count = floodedHousesList.length;

        // Cập nhật lên 3 cái thẻ Card thống kê
        setSimData({
          floodedHouses: count,
          // Tạm tính nhanh: trung bình 85m2 và 4 người/nhà (Nếu Backend chưa có API JPQL gom nhóm)
          totalArea: (count * 85).toLocaleString(),
          evacuatedPeople: count * 4,
          status: count > 50 ? "Nguy hiểm cấp độ 3" : "Cảnh báo mức 1",
        });
      }
    } catch (error: any) {
      console.error("Lỗi API:", error);
      alert(
        "❌ Lỗi chạy mô phỏng: " +
          (error.response?.data?.message || error.message),
      );
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">
          Trung tâm Điều hành Huyện Bát Xát
        </h1>
        <p className="text-slate-500 mt-1">
          Quản lý Dữ liệu Không gian & Thuật toán Trí tuệ Nhân tạo
        </p>
      </div>

      {/* Menu Tabs */}
      <div className="flex space-x-2 mb-6 bg-white p-2 rounded-xl shadow-sm border border-slate-200 w-fit">
        <button
          onClick={() => setActiveTab("ai")}
          className={`px-6 py-2 rounded-lg font-bold transition-all ${activeTab === "ai" ? "bg-blue-600 text-white shadow" : "text-slate-500 hover:bg-slate-100"}`}
        >
          🧠 Cấu hình AI (AHP)
        </button>
        <button
          onClick={() => setActiveTab("simulation")}
          className={`px-6 py-2 rounded-lg font-bold transition-all ${activeTab === "simulation" ? "bg-blue-600 text-white shadow" : "text-slate-500 hover:bg-slate-100"}`}
        >
          🌊 Giả lập & Thống kê
        </button>
        <button
          onClick={() => setActiveTab("users")}
          className={`px-6 py-2 rounded-lg font-bold transition-all ${activeTab === "users" ? "bg-blue-600 text-white shadow" : "text-slate-500 hover:bg-slate-100"}`}
        >
          👥 Quản lý Đội cứu hộ
        </button>
      </div>

      {/* NỘI DUNG TỪNG TAB */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 min-h-[500px]">
        {/* TAB 1: CẤU HÌNH AI */}
        {activeTab === "ai" && (
          <div className="animate-in fade-in zoom-in-95 duration-300">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">
              Trọng số Đa tiêu chí (MCDM)
            </h2>
            <p className="text-slate-500 mb-8">
              Điều chỉnh não bộ thuật toán pgRouting. Tổng phải bằng 1.0
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {Object.entries(weights).map(([key, val]) => (
                <div
                  key={key}
                  className="bg-slate-50 p-4 rounded-xl border border-slate-100"
                >
                  <label className="block font-bold text-slate-700 mb-2 uppercase text-xs">
                    {key}
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    value={val}
                    onChange={(e) =>
                      setWeights({
                        ...weights,
                        [key]: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none font-mono text-lg text-blue-600"
                  />
                </div>
              ))}
            </div>
            <div className="mt-8 flex justify-between items-center bg-slate-900 p-4 rounded-xl text-white">
              <span className="font-bold">
                Tổng trọng số:{" "}
                <span
                  className={
                    Object.values(weights).reduce((a, b) => a + b, 0) === 1
                      ? "text-green-400"
                      : "text-red-400"
                  }
                >
                  {Object.values(weights)
                    .reduce((a, b) => a + b, 0)
                    .toFixed(2)}
                </span>
              </span>
              <button
                onClick={handleSaveAI}
                className="bg-blue-500 hover:bg-blue-400 px-6 py-2 rounded-lg font-bold transition"
              >
                💾 Lưu Cấu Hình
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: GIẢ LẬP LŨ LỤT & THỐNG KÊ */}
        {activeTab === "simulation" && (
          <div className="animate-in fade-in zoom-in-95 duration-300">
            <div className="flex items-end gap-4 mb-8 bg-blue-50 p-6 rounded-xl border border-blue-100">
              <div className="flex-1">
                <label className="block font-bold text-blue-900 mb-2">
                  Mực nước cảnh báo (m)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={waterLevel}
                  onChange={(e) => setWaterLevel(e.target.value)}
                  className="w-full p-3 border border-blue-200 rounded-lg text-xl font-bold text-blue-700 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={handleRunSimulation}
                disabled={isSimulating}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-bold transition-all h-[52px]"
              >
                {isSimulating ? "⏳ Đang quét Data..." : "🚀 Chạy Mô Phỏng"}
              </button>
            </div>

            {simData && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 border-t border-slate-100 pt-8">
                <div className="bg-red-50 border border-red-100 p-6 rounded-2xl">
                  <p className="text-red-600 font-bold text-sm uppercase">
                    Nhà bị ngập
                  </p>
                  <p className="text-4xl font-extrabold text-red-700 mt-2">
                    {simData.floodedHouses}
                  </p>
                  <p className="text-xs text-red-500 mt-2">
                    Dữ liệu từ PostGIS
                  </p>
                </div>
                <div className="bg-orange-50 border border-orange-100 p-6 rounded-2xl">
                  <p className="text-orange-600 font-bold text-sm uppercase">
                    Diện tích thiệt hại
                  </p>
                  <p className="text-4xl font-extrabold text-orange-700 mt-2">
                    {simData.totalArea} m²
                  </p>
                  <p className="text-xs text-orange-500 mt-2">
                    Dựa trên Polygon
                  </p>
                </div>
                <div className="bg-purple-50 border border-purple-100 p-6 rounded-2xl">
                  <p className="text-purple-600 font-bold text-sm uppercase">
                    Cần Sơ Tán
                  </p>
                  <p className="text-4xl font-extrabold text-purple-700 mt-2">
                    {simData.evacuatedPeople}
                  </p>
                  <p className="text-xs text-purple-500 mt-2">
                    Người dân bị ảnh hưởng
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: QUẢN LÝ NGƯỜI DÙNG */}
        {activeTab === "users" && (
          <div className="animate-in fade-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-800">
                Danh sách Tài khoản
              </h2>
              <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold">
                + Thêm User
              </button>
            </div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-600 uppercase text-xs">
                  <th className="p-4 rounded-tl-lg">Tài khoản</th>
                  <th className="p-4">Vai trò</th>
                  <th className="p-4">Trạm cứu hộ</th>
                  <th className="p-4 rounded-tr-lg">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="p-4 font-bold text-slate-800">hieu_admin</td>
                  <td className="p-4">
                    <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-bold">
                      ADMIN
                    </span>
                  </td>
                  <td className="p-4 text-slate-500">-</td>
                  <td className="p-4">
                    <span className="text-green-600 font-bold text-sm">
                      ● Đang hoạt động
                    </span>
                  </td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="p-4 font-bold text-slate-800">
                    team_cuuho_01
                  </td>
                  <td className="p-4">
                    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">
                      RESCUE_TEAM
                    </span>
                  </td>
                  <td className="p-4 text-slate-500">UBND Mường Hum</td>
                  <td className="p-4">
                    <span className="text-green-600 font-bold text-sm">
                      ● Đang hoạt động
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
