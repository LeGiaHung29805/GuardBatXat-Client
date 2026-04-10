'use client'; // Bắt buộc phải có để dùng usePathname xác định trang đang đứng

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Siren, Flame, Navigation, ShieldCheck } from "lucide-react";
import SosButton from "@/components/ui/SosButton";

const navItems = [
    {
        name: "Tìm điểm sơ tán gần nhất",
        href: "/citizen/evacuation",
        icon: Siren,
        activeClass: "bg-red-100 text-red-700",
    },
    {
        name: "Bản đồ cảnh báo cộng đồng",
        href: "/citizen/heatmap",
        icon: Flame,
        activeClass: "bg-orange-100 text-orange-700",
    },
    {
        name: "Tìm lộ trình an toàn nhất",
        href: "/citizen/routing",
        icon: Navigation,
        activeClass: "bg-blue-100 text-blue-700",
    },
    {
        name: "Tra cứu vị trí an toàn",
        href: "/citizen/safety-check",
        icon: ShieldCheck,
        activeClass: "bg-emerald-100 text-emerald-700",
    },
    {
        name: "Trang thông tin cá nhân",
        href: "/citizen/profile",
        icon: ShieldCheck,
        activeClass: "bg-emerald-100 text-emerald-700",
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
        <div className="flex flex-col h-screen overflow-hidden bg-background relative">

            {/* Top Navigation Bar */}
            <header className="h-16 border-b bg-card flex items-center justify-between px-4 shrink-0 z-50">
                <nav className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${isActive
                                    ? item.activeClass
                                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                                    }`}
                            >
                                <Icon className="w-4 h-4" />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>
            </header>

            <main className="min-h-screen bg-slate-900 overflow-x-hidden">
                {children}
            </main>

            {/* Nút SOS gọi khẩn cấp nổi trên toàn hệ thống Citizen */}
            <div className="absolute bottom-6 right-6 z-[9999]">
                <SosButton />
            </div>
        </div>
    );
}