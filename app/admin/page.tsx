"use client";
import { Activity, ShieldCheck, Database, Cpu } from "lucide-react";

export default function AdminOverviewPage() {
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
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="bg-green-100 p-4 rounded-2xl text-green-600">
            <Activity size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Trạng thái Server
            </p>
            <p className="text-xl font-black text-slate-800">Hoạt động tốt</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="bg-blue-100 p-4 rounded-2xl text-blue-600">
            <Database size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Kết nối PostGIS
            </p>
            <p className="text-xl font-black text-slate-800">Đã đồng bộ</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="bg-purple-100 p-4 rounded-2xl text-purple-600">
            <Cpu size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              AI Engine (Python)
            </p>
            <p className="text-xl font-black text-slate-800">Đang chờ lệnh</p>
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
        <ShieldCheck size={80} className="text-blue-400 opacity-50" />
      </div>
    </div>
  );
}
