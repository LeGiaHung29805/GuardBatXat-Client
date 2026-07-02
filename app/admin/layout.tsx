"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();

  const navLinkClass =
    "block px-4 py-3 text-slate-400 hover:bg-slate-800 hover:text-white rounded-xl font-semibold transition-all duration-200 hover:translate-x-2";

  // Tự động đóng sidebar di động khi chuyển trang
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-slate-50 overflow-hidden text-slate-900">
      {/* MOBILE HEADER */}
      <div className="md:hidden flex items-center justify-between bg-slate-900 text-white px-6 py-4 z-30 shadow-md">
        <Link href="/admin">
          <h1 className="text-xl font-black tracking-tighter text-blue-400">
            GUARD<span className="text-white">BATXAT</span>
          </h1>
        </Link>
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 -mr-2 text-slate-400 hover:text-white transition"
          aria-label="Mở Menu"
        >
          <Menu size={24} />
        </button>
      </div>

      {/* BACKDROP OVERLAY */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm transition-opacity duration-300"
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 text-white flex flex-col shadow-2xl transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Nút đóng Sidebar trên di động */}
        <button
          onClick={() => setIsSidebarOpen(false)}
          className="md:hidden absolute top-5 right-5 p-2 text-slate-400 hover:text-white transition"
          aria-label="Đóng Menu"
        >
          <X size={20} />
        </button>

        <div className="p-8 text-center border-b border-slate-800">
          <Link href="/admin">
            <h1 className="text-2xl font-black tracking-tighter text-blue-400 cursor-pointer hover:text-blue-300 transition">
              GUARD<span className="text-white">BATXAT</span>
            </h1>
          </Link>
          <p className="text-[10px] text-slate-500 mt-2 uppercase font-bold tracking-widest">
            Hệ thống điều hành PCTT
          </p>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <div className="text-[10px] font-black text-slate-600 px-4 py-2 uppercase tracking-wider">
            Hạ tầng và Dữ liệu
          </div>
          <Link href="/admin/users" className={navLinkClass}>
            Tài khoản & Role
          </Link>
          <Link href="/admin/buildings" className={navLinkClass}>
            Quản lý Nhà cửa
          </Link>
          <Link href="/admin/roads" className={navLinkClass}>
            Mạng lưới Đường
          </Link>

          <div className="text-[10px] font-black text-slate-600 px-4 py-2 mt-4 uppercase tracking-wider">
            AI
          </div>
          <Link href="/admin/ai-config" className={navLinkClass}>
            Cấu hình AI
          </Link>
          <Link href="/admin/simulation" className={navLinkClass}>
            Giả lập ngập lụt
          </Link>

          <div className="text-[10px] font-black text-slate-600 px-4 py-2 mt-4 uppercase tracking-wider">
            Giám sát
          </div>
          <Link
            href="/admin/routing"
            className="block px-4 py-3 text-blue-400 hover:bg-slate-800 rounded-xl font-bold transition-all"
          >
            Kiểm chứng lộ trình
          </Link>
        </nav>
        <div className="p-6 border-t border-slate-800 text-[10px] text-slate-500 text-center italic">
          NCKH 2026
        </div>
      </aside>

      {/* MAIN CONTENT CONTAINER */}
      <main className="flex-1 overflow-y-auto p-5 sm:p-8 md:p-10 bg-slate-50">
        {children}
      </main>
    </div>
  );
}

