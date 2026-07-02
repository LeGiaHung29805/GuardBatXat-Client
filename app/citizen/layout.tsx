"use client"; // Bắt buộc phải có để dùng usePathname xác định trang đang đứng

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Siren, Flame, Navigation, ShieldCheck, User, Home, Megaphone } from "lucide-react";
import GlobalUI from "@/components/ui/GlobalUI";

const navItems = [
  {
    name: "Trang chủ",
    href: "/citizen",
    icon: Home,
    activeClass: "bg-slate-800 text-white border-b-2 md:border-b-0 md:bg-emerald-500/10 md:text-emerald-400 md:border border-emerald-500/20",
  },
  {
    name: "Báo sự cố",
    href: "/citizen/report",
    icon: Megaphone,
    activeClass: "bg-slate-800 text-amber-500 border-b-2 md:border-b-0 md:bg-amber-500/10 md:text-amber-400 md:border border-amber-500/20",
  },
  {
    name: "Điểm sơ tán",
    href: "/citizen/evacuation",
    icon: Siren,
    activeClass: "bg-slate-800 text-red-500 border-b-2 md:border-b-0 md:bg-red-500/10 md:text-red-400 md:border border-red-500/20",
  },
  {
    name: "Bản đồ cảnh báo",
    href: "/citizen/heatmap",
    icon: Flame,
    activeClass: "bg-slate-800 text-orange-500 border-b-2 md:border-b-0 md:bg-orange-500/10 md:text-orange-400 md:border border-orange-500/20",
  },
  {
    name: "Lộ trình an toàn",
    href: "/citizen/routing",
    icon: Navigation,
    activeClass: "bg-slate-800 text-blue-500 border-b-2 md:border-b-0 md:bg-blue-500/10 md:text-blue-400 md:border border-blue-500/20",
  },
  {
    name: "Tra cứu an toàn",
    href: "/citizen/safety-check",
    icon: ShieldCheck,
    activeClass: "bg-slate-800 text-emerald-500 border-b-2 md:border-b-0 md:bg-emerald-500/10 md:text-emerald-400 md:border border-emerald-500/20",
  },
  {
    name: "Hồ sơ cá nhân",
    href: "/citizen/profile",
    icon: User,
    activeClass: "bg-slate-800 text-teal-500 border-b-2 md:border-b-0 md:bg-teal-500/10 md:text-teal-400 md:border border-teal-500/20",
  },
];

export default function CitizenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    // Sử dụng h-screen ở thẻ bao ngoài cùng và overflow-hidden để chống scroll toàn trang
    <div className="flex flex-col h-screen overflow-hidden bg-slate-950 text-slate-100 relative">
      {/* Top Navigation Bar - Ẩn trên mobile hoặc rút gọn để tối ưu diện tích */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/90 backdrop-blur flex items-center justify-between px-6 shrink-0 z-50 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center shadow-lg shadow-red-600/30 animate-pulse">
            <Siren className="w-5 h-5 text-white" />
          </div>
          <span className="font-extrabold text-lg tracking-wider bg-gradient-to-r from-red-500 via-amber-400 to-emerald-500 bg-clip-text text-transparent uppercase">
            Guard Bát Xát
          </span>
        </div>

        {/* Menu ngang chỉ hiện trên Desktop (md trở lên) */}
        <nav className="hidden md:flex items-center gap-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold tracking-wide transition-all ${
                  isActive
                    ? item.activeClass
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Khu vực Auth / Logout */}
        <div className="flex items-center">
          {/* Để trống để GlobalUI.tsx tự render ở góc trên bên phải */}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 bg-slate-950 overflow-y-auto overflow-x-hidden relative pb-16 md:pb-0">
        {children}
      </main>

      {/* Bottom Navigation Bar - Chỉ hiện trên Mobile (dưới md) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-slate-900/95 backdrop-blur border-t border-slate-800 grid grid-cols-7 z-50 shadow-2xl">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1 transition-all ${
                isActive
                  ? "text-emerald-400 bg-slate-800/40"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[9px] font-medium tracking-tight whitespace-nowrap overflow-hidden text-ellipsis max-w-[60px]">
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Nút SOS gọi khẩn cấp nổi trên toàn hệ thống Citizen */}
      <div className="absolute bottom-20 right-4 md:bottom-6 md:right-6 z-[9999]">
        <GlobalUI />
      </div>
    </div>
  );
}

