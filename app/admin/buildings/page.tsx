"use client";
import { useDebounce } from "@/hooks/useDebounce";
import { useState, useEffect, useMemo } from "react";
import { ApiClient } from "@/lib/ApiClient";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export default function AdminBuildingsPage() {
  const [buildings, setBuildings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // --- STATE PHÂN TRANG ---
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20; // Giới hạn 50 dòng/trang để DOM không bị treo

  useEffect(() => {
    let isMounted = true; // Chống Memory Leak khi unmount component

    const fetchBuildings = async () => {
      try {
        const res = await ApiClient.getAdminBuildings();
        if (isMounted && res.code === 200) {
          // Xử lý an toàn nếu Backend trả về GeoJSON FeatureCollection
          const dataArray = Array.isArray(res.data)
            ? res.data
            : res.data?.features || [];
          setBuildings(dataArray);
        }
      } catch (error) {
        console.error("Lỗi lấy dữ liệu nhà cửa:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchBuildings();

    return () => {
      isMounted = false;
    };
  }, []);

  // --- TỐI ƯU TÌM KIẾM CỰC ĐẠI ---
  const filteredBuildings = useMemo(() => {
    if (!debouncedSearchTerm || !debouncedSearchTerm.trim()) return buildings; // Ngắt vòng lặp nếu ô tìm kiếm rỗng

    const term = debouncedSearchTerm.toLowerCase().trim();
    return buildings.filter(
      (b: any) =>
        b.id?.toString().includes(term) ||
        (b.buildingType || b.buildingtype || "")?.toLowerCase().includes(term),
    );
  }, [buildings, debouncedSearchTerm]);

  // --- LOGIC CẮT TRANG ---
  const totalPages = Math.ceil(filteredBuildings.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredBuildings.slice(
    indexOfFirstItem,
    indexOfLastItem,
  );

  // Reset về trang 1 khi gõ tìm kiếm mới
  const handleSearch = (e: any) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  return (
    <div className="animate-in fade-in duration-500 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-black text-slate-800">
            Quản lý Nhà cửa
          </h2>
          <p className="text-slate-500">
            Dữ liệu hạ tầng GIS huyện Bát Xát ({buildings.length} công trình)
          </p>
        </div>
        <button className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition shadow-lg shadow-blue-100 w-full md:w-auto justify-center">
          <Plus size={20} /> Nhập SHP/GeoJSON
        </button>
      </div>

      <div className="mb-6 relative max-w-md">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          size={18}
        />
        <input
          type="text"
          placeholder="Tìm theo ID hoặc Loại công trình..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          value={searchTerm}
          onChange={handleSearch}
        />
      </div>

      <div className="bg-white border border-slate-100 rounded-[2rem] overflow-hidden shadow-sm flex flex-col">
        {/* DESKTOP TABLE VIEW */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-black tracking-widest border-b border-slate-100">
              <tr>
                <th className="p-6">Mã công trình</th>
                <th className="p-6">Loại</th>
                <th className="p-6">Diện tích (m²)</th>
                <th className="p-6">Sức chứa</th>
                <th className="p-6 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="p-20 text-center text-slate-400 animate-pulse font-medium"
                  >
                    Đang tải dữ liệu hạ tầng (Có thể mất vài giây)...
                  </td>
                </tr>
              ) : currentItems.length > 0 ? (
                currentItems.map((b: any, index: number) => {
                  const id = b.id ?? "N/A";
                  const type = b.buildingType ?? b.buildingtype ?? "Dân dụng";
                  const area =
                    b.areaInMeters ?? b.areainmeters ?? b.area_in_meters ?? 0;
                  const capacity =
                    b.maxCapacity ?? b.maxcapacity ?? b.max_capacity ?? 0;

                  const uniqueKey = `bld-${id}-${index}`;

                  return (
                    <tr
                      key={uniqueKey}
                      className="hover:bg-slate-50 transition"
                    >
                      <td className="p-6 font-mono font-bold text-slate-700">
                        {id !== "N/A" ? `BLD-${id}` : "N/A"}
                      </td>
                      <td className="p-6">
                        <span className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide">
                          {type}
                        </span>
                      </td>
                      <td className="p-6 font-mono text-blue-600 font-bold">
                        {Number(area).toFixed(1)}
                      </td>
                      <td className="p-6 font-medium text-slate-500">
                        {capacity} người
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
                    colSpan={5}
                    className="p-20 text-center text-slate-400 font-medium"
                  >
                    Không tìm thấy dữ liệu
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* MOBILE CARD VIEW */}
        <div className="block md:hidden divide-y divide-slate-100">
          {loading ? (
            <div className="p-10 text-center text-slate-400 animate-pulse font-medium">
              Đang tải dữ liệu hạ tầng...
            </div>
          ) : currentItems.length > 0 ? (
            currentItems.map((b: any, index: number) => {
              const id = b.id ?? "N/A";
              const type = b.buildingType ?? b.buildingtype ?? "Dân dụng";
              const area =
                b.areaInMeters ?? b.areainmeters ?? b.area_in_meters ?? 0;
              const capacity =
                b.maxCapacity ?? b.maxcapacity ?? b.max_capacity ?? 0;
              const uniqueKey = `bld-card-${id}-${index}`;

              return (
                <div key={uniqueKey} className="p-5 flex flex-col gap-3 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-mono font-bold text-slate-700">
                      {id !== "N/A" ? `BLD-${id}` : "N/A"}
                    </span>
                    <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded text-[9px] font-bold uppercase tracking-wide">
                      {type}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-[11px] text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <div>
                      <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Diện tích</span>
                      <span className="font-mono text-blue-600 font-bold">{Number(area).toFixed(1)} m²</span>
                    </div>
                    <div>
                      <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Sức chứa</span>
                      <span className="text-slate-700 font-bold">{capacity} người</span>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1 border-t border-slate-50">
                    <button className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-bold transition flex items-center gap-1">
                      <Edit size={14} /> Sửa
                    </button>
                    <button className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-xs font-bold transition flex items-center gap-1">
                      <Trash2 size={14} /> Xóa
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-10 text-center text-slate-400 font-medium">
              Không tìm thấy dữ liệu
            </div>
          )}
        </div>

        {/* --- KHỐI ĐIỀU KHIỂN PHÂN TRANG --- */}
        {!loading && filteredBuildings.length > 0 && (
          <div className="p-4 border-t border-slate-100 bg-slate-50 flex flex-col md:flex-row items-center justify-between gap-4">
            <span className="text-xs font-bold text-slate-500">
              Hiển thị {indexOfFirstItem + 1} -{" "}
              {Math.min(indexOfLastItem, filteredBuildings.length)} trong số{" "}
              {filteredBuildings.length} bản ghi
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg bg-white border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
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
                className="p-2 rounded-lg bg-white border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
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
