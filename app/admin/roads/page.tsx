"use client";
import { useState, useEffect, useMemo } from "react";
import { ApiClient } from "@/lib/ApiClient";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export default function AdminRoadsPage() {
  const [roads, setRoads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20; // Render đúng 50 dòng để nhẹ DOM

  useEffect(() => {
    let isMounted = true; // Chống Memory Leak

    const fetchRoads = async () => {
      try {
        const res = await ApiClient.getAdminRoads();
        if (isMounted && res.code === 200) {
          // Phòng hờ Backend trả về GeoJSON FeatureCollection thay vì Array thuần
          const dataArray = Array.isArray(res.data)
            ? res.data
            : res.data?.features || [];
          setRoads(dataArray);
        }
      } catch (error) {
        console.error("Lỗi lấy dữ liệu mạng lưới đường:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchRoads();
    return () => {
      isMounted = false;
    };
  }, []);

  // TỐI ƯU HÓA CỰC ĐẠI: Cắt đứt vòng lặp nếu không gõ tìm kiếm
  const filteredRoads = useMemo(() => {
    // Nếu không có từ khóa, trả về thẳng mảng gốc. Tránh việc duyệt qua hàng vạn phần tử!
    if (!searchTerm || !searchTerm.trim()) return roads;

    const term = searchTerm.toLowerCase().trim();
    return roads.filter(
      (r: any) =>
        r.id?.toString().includes(term) ||
        r.edgeKey?.toString().includes(term) ||
        r.u?.toString().includes(term) ||
        r.v?.toString().includes(term),
    );
  }, [roads, searchTerm]);

  // LOGIC PHÂN TRANG
  const totalPages = Math.ceil(filteredRoads.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredRoads.slice(indexOfFirstItem, indexOfLastItem);

  const handleSearch = (e: any) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  return (
    <div className="animate-in fade-in duration-500 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-black text-slate-800">
            Mạng lưới Giao thông
          </h2>
          <p className="text-slate-500">
            Quản lý cung chặng và trọng số di chuyển ({roads.length} đoạn đường)
          </p>
        </div>
        <button className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-black transition shadow-lg">
          <Plus size={20} /> Thêm đoạn đường
        </button>
      </div>

      <div className="mb-6 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Tìm theo ID, Nút nguồn (u), Nút đích (v)..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            value={searchTerm}
            onChange={handleSearch}
          />
        </div>
        <div className="bg-amber-50 border border-amber-200 px-4 py-2.5 rounded-xl flex items-center gap-2 text-amber-700 text-sm font-medium">
          <ShieldAlert size={16} />
          <span>Dữ liệu này ảnh hưởng trực tiếp đến thuật toán AI</span>
        </div>
      </div>

      <div className="bg-white border border-slate-100 rounded-[2rem] overflow-hidden shadow-sm flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-black tracking-widest border-b border-slate-100">
              <tr>
                <th className="p-6">ID Đoạn</th>
                <th className="p-6">Từ Nút (Source)</th>
                <th className="p-6">Đến Nút (Target)</th>
                <th className="p-6">Chiều dài (m)</th>
                <th className="p-6">Độ dốc Max</th>
                <th className="p-6 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="p-20 text-center text-slate-400 animate-pulse font-medium"
                  >
                    Đang tải dữ liệu mạng lưới (Có thể mất vài giây nếu file
                    lớn)...
                  </td>
                </tr>
              ) : currentItems.length > 0 ? (
                currentItems.map((r: any, index: number) => {
                  // Hứng mọi trường hợp đặt tên biến từ JSON của Spring Boot
                  const u = r.uNode ?? r.unode ?? r.UNode ?? r.u ?? "N/A";
                  const v = r.vNode ?? r.vnode ?? r.VNode ?? r.v ?? "N/A";
                  const edgeKey = r.edgeKey ?? r.edgekey ?? r.id ?? 0;
                  const length = r.lengthM ?? r.lengthm ?? r.length_m ?? 0;
                  const slope = r.avgSlope ?? r.avgslope ?? r.avg_slope ?? 0;

                  // Thêm index vào cuối để đảm bảo key độc nhất 100% trong mọi tình huống
                  const uniqueKey = `${u}-${v}-${edgeKey}-${index}`;

                  return (
                    <tr
                      key={uniqueKey}
                      className="hover:bg-slate-50 transition font-mono text-xs"
                    >
                      <td className="p-6 font-bold text-slate-700">
                        {edgeKey}
                      </td>
                      <td className="p-6 text-slate-500">{u}</td>
                      <td className="p-6 text-slate-500">{v}</td>
                      <td className="p-6 text-blue-600 font-bold">
                        {Number(length).toFixed(1)}
                      </td>
                      <td className="p-6 font-bold">
                        {Number(slope).toFixed(1)}°
                      </td>
                      <td className="p-6 text-center space-x-2">
                        <button className="p-2 text-slate-300 hover:text-blue-600 transition">
                          <Edit size={18} />
                        </button>
                        <button className="p-2 text-slate-300 hover:text-red-600 transition">
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="p-20 text-center text-slate-400 font-medium"
                  >
                    Không tìm thấy dữ liệu
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* KHỐI ĐIỀU KHIỂN PHÂN TRANG */}
        {!loading && filteredRoads.length > 0 && (
          <div className="p-4 border-t border-slate-100 bg-slate-50 flex flex-col md:flex-row items-center justify-between gap-4">
            <span className="text-xs font-bold text-slate-500">
              Hiển thị {indexOfFirstItem + 1} -{" "}
              {Math.min(indexOfLastItem, filteredRoads.length)} trong số{" "}
              {filteredRoads.length} bản ghi
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg bg-white border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs font-bold text-slate-700 px-3">
                Trang {currentPage} / {totalPages || 1}
              </span>
              <button
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
                disabled={currentPage === totalPages || totalPages === 0}
                className="p-2 rounded-lg bg-white border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
