"use client";
import { useState, useMemo } from "react";
import { ApiClient } from "@/lib/ApiClient";
import {
  Play,
  FileText,
  ChevronLeft,
  ChevronRight,
  BarChart3,
} from "lucide-react";
// Import Recharts
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export default function SimulationPage() {
  const [waterLevel, setWaterLevel] = useState("83.5");
  const [simData, setSimData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // --- Logic Phân trang ---
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // --- LOGIC XỬ LÝ DỮ LIỆU BIỂU ĐỒ ---
  const chartData = useMemo(() => {
    if (simData.length === 0) return [];
    const stats = simData.reduce((acc: any, curr: any) => {
      const status = curr.status || "Chưa xác định";
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    return Object.keys(stats).map((key) => ({
      name: key,
      value: stats[key],
    }));
  }, [simData]);

  // Màu sắc cho biểu đồ
  const COLORS = ["#bdca06", "#013ff8", "#ea0808", "#f89d00", "#8b5cf6"];

  const totalPages = Math.ceil(simData.length / itemsPerPage);

  // Lấy dữ liệu của trang hiện tại cho bảng
  const currentTableData = useMemo(() => {
    const firstPageIndex = (currentPage - 1) * itemsPerPage;
    return simData.slice(firstPageIndex, firstPageIndex + itemsPerPage);
  }, [currentPage, simData]);

  const handleRun = async () => {
    setLoading(true);
    try {
      const cleanWaterLevel = waterLevel.replace(",", ".");
      const res = await ApiClient.runFloodSimulation(
        parseFloat(cleanWaterLevel),
      );

      if (res.code === 200) {
        setSimData(res.data);
        setCurrentPage(1);
      }
    } catch (e) {
      alert("Lỗi kết nối hoặc xử lý giả lập");
    }
    setLoading(false);
  };

  return (
    <div className="animate-in fade-in duration-500 max-w-6xl mx-auto p-4">
      {/* 1. Header: Cỡ chữ vừa phải, không quá to như bản đầu, không nhỏ như bản trước */}
      <div className="mb-6 border-b border-slate-200 pb-4">
        <h2 className="text-2xl font-black text-slate-800">
          Giả lập & Báo cáo thiệt hại
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Hệ thống phân tích rủi ro ngập lụt huyện Bát Xát
        </p>
      </div>

      {/* 2. Khung nhập liệu: Lấy lại style bo tròn [2rem] nhưng dùng p-6 thay vì p-8 */}
      <div className="bg-blue-50 p-6 rounded-[2rem] border border-blue-100 flex flex-col md:flex-row gap-6 md:items-end mb-8 shadow-sm">
        <div className="flex-1">
          <label className="block text-blue-900 font-bold mb-2 uppercase text-xs tracking-widest">
            Nhập cao độ nước lũ dự báo (mét)
          </label>
          <input
            type="text"
            value={waterLevel}
            onChange={(e) => setWaterLevel(e.target.value)}
            // Ô input dài vừa phải, chữ to rõ (text-2xl)
            className="w-full p-4 bg-white rounded-2xl text-2xl font-black text-blue-600 outline-none border border-blue-200 focus:ring-4 focus:ring-blue-500/20 transition-all"
          />
        </div>
        <button
          onClick={handleRun}
          disabled={loading}
          className="bg-blue-600 text-white px-10 h-[64px] rounded-2xl font-black hover:bg-blue-700 transition-all flex items-center justify-center gap-3 shadow-lg shadow-blue-200 w-full md:w-auto"
        >
          {loading ? (
            "Đang xử lý..."
          ) : (
            <>
              <Play size={24} /> Chạy mô phỏng
            </>
          )}
        </button>
      </div>

      {simData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4">
          {/* CỘT TRÁI: THỐNG KÊ & BIỂU ĐỒ */}
          <div className="lg:col-span-1 space-y-6">
            {/* Card Dân số: Trả lại text-5xl cho hoành tráng */}
            <div className="bg-red-600 p-7 rounded-[2rem] text-white shadow-xl shadow-red-200">
              <p className="text-red-100 text-xs font-bold uppercase tracking-widest">
                Dân số bị ảnh hưởng
              </p>
              <p className="text-5xl font-black mt-2">
                {simData.length * 4}{" "}
                <span className="text-lg font-medium">người</span>
              </p>
              <p className="text-[10px] text-red-200 mt-4">
                *Dựa trên ước tính {simData.length.toLocaleString()} công trình.
              </p>
            </div>

            {/* Biểu đồ: Để h-250 là con số vàng cho Dashboard */}
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
              <h4 className="font-bold flex items-center gap-2 mb-4 text-slate-800 uppercase text-[10px] tracking-widest">
                <BarChart3 size={16} className="text-blue-500" /> Phân bổ mức độ
                rủi ro
              </h4>
              <div
                className="w-full relative"
                style={{ height: 250, minHeight: 250 }}
              >
                {/* 2. ResponsiveContainer có thể để width="100%" height="100%" nhưng tốt nhất là gán thẳng chiều cao nếu container thỉnh thoảng bị lỗi DOM */}
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      innerRadius={55}
                      outerRadius={75}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: "15px",
                        border: "none",
                        boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                      }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      iconType="circle"
                      wrapperStyle={{ fontSize: "10px", paddingTop: "15px" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* CỘT PHẢI: BẢNG CHI TIẾT */}
          <div className="lg:col-span-2 bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col h-full">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h3 className="font-bold text-slate-800">
                Chi tiết công trình ngập lụt
              </h3>
              <span className="text-[10px] font-black text-slate-400 bg-white px-3 py-1 rounded-full border uppercase">
                Trang {currentPage} / {totalPages}
              </span>
            </div>

            {/* Max-height 450px để bảng dài thoải mái nhưng không phá layout */}
            <div className="overflow-y-auto max-h-[450px]">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 border-b sticky top-0">
                  <tr>
                    <th className="p-4 px-6">Mã công trình</th>
                    <th className="p-4">Độ sâu ngập</th>
                    <th className="p-4 text-right px-6">Trạng thái rủi ro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {currentTableData.map((house, idx) => (
                    <tr
                      key={house.buildingId || idx}
                      className="hover:bg-slate-50 transition"
                    >
                      <td className="p-4 px-6 font-mono font-bold text-slate-700">
                        BUILD-{house.buildingId ?? idx}
                      </td>
                      <td className="p-4 font-black text-blue-600">
                        {house.depth ?? "0"} m
                      </td>
                      <td className="p-4 px-6 text-right">
                        <span className="bg-red-50 text-red-600 px-3 py-1 rounded-full text-[10px] font-black uppercase">
                          {house.status || "Nguy Hiểm"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Phân trang giữ nguyên logic mượt mà */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-center gap-4">
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-xl bg-white border border-slate-200 disabled:opacity-30"
              >
                <ChevronLeft size={20} />
              </button>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold">
                  Trang {currentPage} / {totalPages}
                </span>
              </div>
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(p + 1, totalPages))
                }
                disabled={currentPage === totalPages}
                className="p-2 rounded-xl bg-white border border-slate-200 disabled:opacity-30"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
