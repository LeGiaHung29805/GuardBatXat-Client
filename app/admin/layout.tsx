"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { LogOut, Menu, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { ApiClient } from "@/lib/ApiClient";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Route Guard: Kiểm tra quyền ADMIN
  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        const response = await ApiClient.getMyProfile();
        if (response.data && response.data.roleName === "ADMIN") {
          setIsAuthorized(true);
        } else {
          setIsAuthorized(false);
          router.push("/");
        }
      } catch (error) {
        console.error("Lỗi kiểm tra quyền admin:", error);
        setIsAuthorized(false);
        router.push("/auth");
      } finally {
        setIsLoading(false);
      }
    };

    checkAdminAccess();
  }, [router]);

  // Tự động đóng sidebar di động khi chuyển trang
  useEffect(() => {
    const animationFrame = window.requestAnimationFrame(() => {
      setIsSidebarOpen(false);
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, [pathname]);

  const navLinkClass =
    "block px-4 py-3 text-slate-400 hover:bg-slate-800 hover:text-white rounded-xl font-semibold transition-all duration-200 hover:translate-x-2";

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    const token =
      localStorage.getItem("jwt_token") || localStorage.getItem("token");

    try {
      if (token) {
        await fetch("/api/v1/auth/logout", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch {
      // Token cục bộ vẫn phải được xóa kể cả khi backend đang không phản hồi.
    } finally {
      localStorage.removeItem("jwt_token");
      localStorage.removeItem("token");
      localStorage.removeItem("sos:my_sos_id");
      localStorage.removeItem("sos:my_phone");
      window.location.replace("/auth");
    }
  };

  // Loading state: Hiển thị khi đang kiểm tra quyền
  if (isLoading) {
    return (
      <div className="flex h-dvh w-full items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mb-4"></div>
          <p className="text-white font-semibold">
            Đang kiểm tra quyền truy cập...
          </p>
        </div>
      </div>
    );
  }

  // Nếu không có quyền ADMIN, không render giao diện
  if (!isAuthorized) {
    return null;
  }

  return (
    <div className="flex h-dvh min-h-0 w-full flex-col overflow-hidden bg-slate-50 text-slate-900 md:flex-row">
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
          <Link href="/admin/qr-login" className={navLinkClass}>
            QR đăng nhập trải nghiệm
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
        <div className="space-y-4 border-t border-slate-800 p-4">
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 font-semibold text-red-300 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <LogOut size={18} />
            {isLoggingOut ? "Đang đăng xuất..." : "Đăng xuất"}
          </button>
          <p className="text-center text-[10px] italic text-slate-500">
            NCKH 2026
          </p>
        </div>
      </aside>

      {/* MAIN CONTENT CONTAINER */}
      <main
        className={`min-h-0 flex-1 bg-slate-50 ${
          pathname === "/admin/routing"
            ? "overflow-hidden p-0"
            : "overflow-y-auto p-5 sm:p-8 md:p-10"
        }`}
      >
        {children}
      </main>
    </div>
  );
}
