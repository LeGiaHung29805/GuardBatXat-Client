"use client";
import { useState } from "react";
import { ApiClient } from "@/lib/ApiClient";
import { Save } from "lucide-react";

export default function AdminAiConfigPage() {
  const [weights, setWeights] = useState({
    wDistance: 0.1,
    wFlood: 0.4,
    wLandslide: 0.3,
    wCapacity: 0.1,
    wBridge: 0.05,
    wReport: 0.05,
  });

  // State để quản lý chiến lược đang được cấu hình
  const [strategy, setStrategy] = useState("safety");

  const handleSaveAI = async () => {
    try {
      // Truyền biến strategy linh hoạt thay vì hardcode "rescue"
      await ApiClient.updateAHPWeights(strategy, weights);
      alert(
        ` Não bộ AI (chiến lược ${strategy}) đã được cập nhật thành công xuống PostGIS!`,
      );
    } catch (e) {
      alert("Lỗi kết nối Backend!");
    }
  };

  return (
    <div className="animate-in fade-in duration-500 max-w-6xl mx-auto">
      <div className="mb-10 border-b border-slate-200 pb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800">
            Cấu hình Trọng số Tìm đường (AHP)
          </h2>
          <p className="text-slate-500 font-medium mt-2">
            Can thiệp trực tiếp vào hệ số tính toán của pgRouting và AI Python
          </p>
        </div>

        {/* Khối chọn chiến lược */}
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 md:text-right">
            Đang cấu hình cho kịch bản
          </label>
          <select
            value={strategy}
            onChange={(e) => setStrategy(e.target.value)}
            className="px-4 py-2.5 bg-blue-50 text-blue-700 font-bold rounded-xl outline-none border border-blue-200 focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer w-full md:w-auto"
          >
            <option value="safety">Sơ tán Dân sự (Safety)</option>
            <option value="rescue">Cứu hộ Khẩn cấp (Rescue)</option>
          </select>
        </div>
      </div>

      <div className="bg-white p-10 rounded-[2rem] border border-slate-100 shadow-sm mb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(weights).map(([k, v]) => (
            <div
              key={k}
              className="p-6 bg-slate-50 rounded-2xl border border-slate-100 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all"
            >
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                {k}
              </label>
              <input
                type="number"
                step="0.05"
                value={v}
                onChange={(e) =>
                  setWeights({
                    ...weights,
                    [k]: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full bg-transparent text-3xl font-black text-blue-600 outline-none"
              />
            </div>
          ))}
        </div>
        <div className="mt-10 pt-8 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-sm font-bold text-slate-500">
            Lưu ý: Tổng trọng số nên bằng 1.0 để thuật toán tối ưu nhất.
          </p>
          <button
            onClick={handleSaveAI}
            className="bg-slate-900 w-full md:w-auto justify-center text-white px-8 py-4 rounded-xl font-bold flex items-center gap-2 hover:bg-black transition shadow-xl"
          >
            <Save size={20} /> Cập nhật xuống CSDL
          </button>
        </div>
      </div>
    </div>
  );
}
