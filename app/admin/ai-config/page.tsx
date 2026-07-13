"use client";
import { useState, useEffect } from "react";
import { ApiClient } from "@/lib/ApiClient";
import { Save, Loader2 } from "lucide-react";

export default function AdminAiConfigPage() {
  const [weights, setWeights] = useState({
    wDistance: 0,
    wFlood: 0,
    wLandslide: 0,
    wCapacity: 0,
    wBridge: 0,
    wReport: 0,
  });

  // State để quản lý chiến lược đang được cấu hình
  const [strategy, setStrategy] = useState("safety");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Lấy trọng số từ backend khi component mount hoặc khi strategy thay đổi
  useEffect(() => {
    const fetchWeights = async () => {
      setIsLoading(true);
      try {
        const response = await ApiClient.getAHPWeights(strategy);
        if (response.data) {
          setWeights({
            wDistance: response.data.wDistance || 0,
            wFlood: response.data.wFlood || 0,
            wLandslide: response.data.wLandslide || 0,
            wCapacity: response.data.wCapacity || 0,
            wBridge: response.data.wBridge || 0,
            wReport: response.data.wReport || 0,
          });
        }
      } catch (error: any) {
        console.error("Lỗi khi tải trọng số:", error);
        alert(`Không thể tải cấu hình trọng số: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWeights();
  }, [strategy]);

  const handleSaveAI = async () => {
    // Kiểm tra tổng trọng số trước khi gửi
    const sum = Object.values(weights).reduce((acc, val) => acc + val, 0);
    if (Math.abs(sum - 1.0) > 0.001) {
      alert(
        `Lỗi: Tổng trọng số phải bằng 1.0. Hiện tại: ${sum.toFixed(3)}\nVui lòng điều chỉnh lại các giá trị.`,
      );
      return;
    }

    setIsSaving(true);
    try {
      await ApiClient.updateAHPWeights(strategy, weights);
      alert(
        `✅ Cập nhật thành công trọng số AHP cho chiến lược "${strategy}"!`,
      );
    } catch (error: any) {
      const errorMsg = error.message || "Lỗi không xác định";
      alert(`❌ Lỗi khi cập nhật: ${errorMsg}`);
    } finally {
      setIsSaving(false);
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

      <div className="bg-white p-5 sm:p-8 md:p-10 rounded-[2rem] border border-slate-100 shadow-sm mb-10">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <span className="ml-3 text-slate-600 font-semibold">
              Đang tải cấu hình...
            </span>
          </div>
        ) : (
          <>
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
                disabled={isSaving || isLoading}
                className="bg-slate-900 w-full md:w-auto justify-center text-white px-8 py-4 rounded-xl font-bold flex items-center gap-2 hover:bg-black transition shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <Save size={20} /> Cập nhật xuống CSDL
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
