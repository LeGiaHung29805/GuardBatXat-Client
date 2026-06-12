"use client";
import { useState, useEffect } from "react";
import {
  Activity,
  ShieldCheck,
  Database,
  Cpu,
  AlertTriangle,
} from "lucide-react";
import { ApiClient } from "@/lib/ApiClient";

export default function AdminOverviewPage() {
  // 1. STATE LƯU TRỮ TRẠNG THÁI
  const [health, setHealth] = useState({
    server: { status: "loading", text: "Đang kiểm tra..." },
    database: { status: "loading", text: "Đang kiểm tra..." },
    ai: { status: "loading", text: "Đang kiểm tra..." },
  });

  // 2. FETCH DỮ LIỆU HEALTH CHECK
  useEffect(() => {
    let isMounted = true;

    const checkHealth = async () => {
      try {
        const res: any = await ApiClient.getSystemHealth();

        // 🛠 CHÌA KHÓA GIẢI QUYẾT NẰM Ở ĐÂY: Tự động tìm đúng ruột JSON
        // Nếu res có sẵn code -> lấy res. Nếu code nằm trong res.data -> lấy res.data
        const responseBody = res.code ? res : res.data;

        // Bây giờ responseBody chắc chắn là { code: 200, data: {...}, message: "..." }
        if (isMounted && responseBody?.code === 200) {
          const serverStatus = String(responseBody.data?.server || "")
            .toLowerCase()
            .trim();
          const dbStatus = String(responseBody.data?.database || "")
            .toLowerCase()
            .trim();
          const aiStatus = String(responseBody.data?.ai || "")
            .toLowerCase()
            .trim();

          setHealth({
            server: {
              status: serverStatus === "ok" ? "success" : "error",
              text: serverStatus === "ok" ? "Hoạt động tốt" : "Bất thường",
            },
            database: {
              status: dbStatus === "ok" ? "success" : "error",
              text: dbStatus === "ok" ? "Đã đồng bộ" : "Mất kết nối",
            },
            ai: {
              status: aiStatus === "ok" ? "success" : "warning",
              text: aiStatus === "ok" ? "Đang chạy" : "Đang chờ lệnh",
            },
          });
        }
      } catch (error) {
        if (isMounted) {
          setHealth({
            server: { status: "error", text: "Mất kết nối Server" },
            database: { status: "error", text: "Lỗi kết nối DB" },
            ai: { status: "error", text: "Lỗi AI Engine" },
          });
        }
      }
    };

    checkHealth();

    // Tùy chọn: Đặt setInterval để tự động kiểm tra mỗi 30 giây
    // const interval = setInterval(checkHealth, 30000);
    // return () => { isMounted = false; clearInterval(interval); };

    return () => {
      isMounted = false;
    };
  }, []);

  // 3. HÀM HELPER ĐỂ ĐỔI MÀU GIAO DIỆN THEO TRẠNG THÁI
  const getStatusColor = (status: string, defaultColor: string) => {
    if (status === "loading") return "text-slate-400 bg-slate-100";
    if (status === "error") return "text-red-600 bg-red-100";
    if (status === "warning") return "text-amber-600 bg-amber-100";
    return defaultColor; // success
  };

  return (
    <div className="animate-in fade-in duration-500 max-w-6xl mx-auto">
      <div className="mb-10 border-b border-slate-200 pb-6">
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">
          Tổng quan Hệ thống
        </h1>
        <p className="text-slate-500 font-medium mt-2">
          Ban chỉ huy Phòng chống Thiên tai & Tìm kiếm cứu nạn Huyện Bát Xát
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* CARD SERVER */}
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4 transition-all">
          <div
            className={`p-4 rounded-2xl ${getStatusColor(health.server.status, "text-green-600 bg-green-100")}`}
          >
            {health.server.status === "error" ? (
              <AlertTriangle size={24} />
            ) : (
              <Activity size={24} />
            )}
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Trạng thái Server
            </p>
            <p
              className={`text-xl font-black ${health.server.status === "error" ? "text-red-600" : "text-slate-800"}`}
            >
              {health.server.text}
            </p>
          </div>
        </div>

        {/* CARD DATABASE */}
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4 transition-all">
          <div
            className={`p-4 rounded-2xl ${getStatusColor(health.database.status, "text-blue-600 bg-blue-100")}`}
          >
            {health.database.status === "error" ? (
              <AlertTriangle size={24} />
            ) : (
              <Database size={24} />
            )}
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Kết nối PostGIS
            </p>
            <p
              className={`text-xl font-black ${health.database.status === "error" ? "text-red-600" : "text-slate-800"}`}
            >
              {health.database.text}
            </p>
          </div>
        </div>

        {/* CARD AI ENGINE */}
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4 transition-all">
          <div
            className={`p-4 rounded-2xl ${getStatusColor(health.ai.status, "text-purple-600 bg-purple-100")}`}
          >
            {health.ai.status === "error" ? (
              <AlertTriangle size={24} />
            ) : (
              <Cpu size={24} />
            )}
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              AI Engine
            </p>
            <p
              className={`text-xl font-black ${health.ai.status === "error" ? "text-red-600" : "text-slate-800"}`}
            >
              {health.ai.text}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-blue-600 rounded-[2rem] p-10 text-white shadow-xl shadow-blue-200 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black mb-2">Xin chào, Quản trị viên!</h2>
          <p className="text-blue-100">
            Vui lòng sử dụng menu bên trái để truy cập các tính năng quản lý hạ
            tầng và vận hành AI.
          </p>
        </div>
        <ShieldCheck
          size={80}
          className="text-blue-400 opacity-50 hidden md:block"
        />
      </div>
    </div>
  );
}
