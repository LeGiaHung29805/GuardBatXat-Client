"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Siren, Flame, Navigation, ShieldCheck, User, AlertTriangle, PhoneCall, Megaphone } from "lucide-react";
import { ApiClient } from "@/lib/ApiClient";
import { NotificationItem, IncidentStats } from "@/lib/Model";

export default function CitizenDashboardPage() {
    const [stats, setStats] = useState<IncidentStats | null>(null);
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadDashboardData = async () => {
            try {
                const [statsRes, notifyRes] = await Promise.all([
                    ApiClient.getIncidentStats(),
                    ApiClient.getPublicNotifications()
                ]);
                if (statsRes.code === 200) setStats(statsRes.data);
                if (notifyRes.code === 200) {
                    const publicOnly = notifyRes.data.filter((n: NotificationItem) => 
                        !n.isPersonal && 
                        !n.title?.includes("Field Update") && 
                        !n.targetArea?.includes("RESCUE_LOG")
                    );
                    setNotifications(publicOnly.slice(0, 5));
                }
            } catch (err) {
                console.error("Lỗi tải thông tin trang chủ:", err);
            } finally {
                setLoading(false);
            }
        };
        loadDashboardData();
    }, []);

    const features = [
        {
            title: "Tìm Điểm Sơ Tán",
            desc: "Dò tìm các nhà văn hóa, trường học, điểm tránh lũ an toàn gần nhất và ít bị ngập lụt, sạt lở nhất xung quanh bạn.",
            href: "/citizen/evacuation",
            icon: Siren,
            color: "border-red-500/30 hover:border-red-500",
            iconBg: "bg-red-500/10 text-red-400 group-hover:bg-red-500 group-hover:text-white",
            shadow: "hover:shadow-red-950/20"
        },
        {
            title: "Bản Đồ Cảnh Báo",
            desc: "Theo dõi bản đồ nhiệt rủi ro Real-time toàn huyện Bát Xát được tổng hợp từ dữ liệu địa hình và báo cáo sự cố.",
            href: "/citizen/heatmap",
            icon: Flame,
            color: "border-orange-500/30 hover:border-orange-500",
            iconBg: "bg-orange-500/10 text-orange-400 group-hover:bg-orange-500 group-hover:text-white",
            shadow: "hover:shadow-orange-950/20"
        },
        {
            title: "Lộ Trình An Toàn",
            desc: "Tìm đường di chuyển an toàn từ vị trí hiện tại đến đích, né tránh các điểm cản trở, cầu hỏng hoặc vùng nguy hiểm.",
            href: "/citizen/routing",
            icon: Navigation,
            color: "border-blue-500/30 hover:border-blue-500",
            iconBg: "bg-blue-500/10 text-blue-400 group-hover:bg-blue-500 group-hover:text-white",
            shadow: "hover:shadow-blue-950/20"
        },
        {
            title: "Tra Cứu An Toàn",
            desc: "Đánh giá mức độ an toàn nhà ở dựa trên cao độ mặt đất và khoảng cách sông ngòi xung quanh vị trí của bạn.",
            href: "/citizen/safety-check",
            icon: ShieldCheck,
            color: "border-emerald-500/30 hover:border-emerald-500",
            iconBg: "bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white",
            shadow: "hover:shadow-emerald-950/20"
        },
        {
            title: "Báo Cáo Sự Cố",
            desc: "Gửi báo cáo ngập úng, sạt lở đường sá hoặc cầu cống hỏng hóc để cảnh báo cho cộng đồng và cơ quan chức năng cứu nạn.",
            href: "/citizen/report",
            icon: AlertTriangle,
            color: "border-amber-500/30 hover:border-amber-500",
            iconBg: "bg-amber-500/10 text-amber-400 group-hover:bg-amber-500 group-hover:text-white",
            shadow: "hover:shadow-amber-950/20"
        },
        {
            title: "Hồ Sơ Cứu Hộ",
            desc: "Cập nhật số điện thoại gia đình, người già, trẻ em và ghi chú y tế để đội cứu hộ chủ động nắm bắt khi có khẩn cấp.",
            href: "/citizen/profile",
            icon: User,
            color: "border-teal-500/30 hover:border-teal-500",
            iconBg: "bg-teal-500/10 text-teal-400 group-hover:bg-teal-500 group-hover:text-white",
            shadow: "hover:shadow-teal-950/20"
        }
    ];

    const hasEmergency = notifications.some(n => 
        n.title.includes("Sơ Tán") || n.title.includes("khẩn cấp") || n.title.includes("Khẩn Cấp")
    );

    return (
        <div className="min-h-full bg-slate-950 text-slate-100 p-4 md:p-8 flex flex-col items-center">
            <div className="max-w-5xl w-full space-y-8">
                
                {/* Banner cảnh báo khẩn cấp */}
                <div className={`bg-gradient-to-r ${
                    hasEmergency 
                        ? 'from-red-950/80 via-red-900/60 to-slate-900 border-red-500/55' 
                        : 'from-slate-900 via-slate-900/90 to-slate-900 border-slate-800'
                    } border rounded-2xl p-5 md:p-6 shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center gap-6`}
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/10 rounded-full blur-3xl pointer-events-none"></div>
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 border ${
                        hasEmergency 
                            ? 'bg-red-500/20 border-red-500/30 text-red-400 animate-pulse' 
                            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    }`}>
                        <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div className="flex-1 text-center md:text-left space-y-1">
                        <h2 className={`text-lg font-extrabold uppercase tracking-wide ${
                            hasEmergency ? 'text-red-400' : 'text-emerald-400'
                        }`}>
                            {hasEmergency ? 'Tình trạng khẩn cấp & SOS' : 'Hệ thống đang An Toàn'}
                        </h2>
                        <p className="text-slate-300 text-sm">
                            {hasEmergency 
                                ? 'Ban chỉ huy đã phát lệnh khẩn cấp. Hãy xem chi tiết bảng tin bên dưới hoặc nhấn SOS màu đỏ để nhận hỗ trợ.' 
                                : 'Hiện tại chưa có cảnh báo nguy hại khẩn cấp. Vui lòng theo dõi dự báo thời tiết thường xuyên.'
                            }
                        </p>
                    </div>
                    <div className="flex gap-3 shrink-0 w-full md:w-auto">
                        <a 
                            href="tel:112"
                            className="flex-1 md:flex-initial py-2.5 px-5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm rounded-xl border border-slate-700 flex items-center justify-center gap-2 transition-all"
                        >
                            <PhoneCall className="w-4 h-4 text-slate-400" />
                            Gọi 112
                        </a>
                    </div>
                </div>

                {/* Thanh trạng thái thời gian thực (Feature #3) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-slate-900/60 backdrop-blur border border-slate-800 rounded-xl p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div>
                            <span className="text-[10px] text-slate-500 uppercase font-black block">Sự cố cộng đồng</span>
                            <span className="text-sm font-bold text-slate-200">
                                {stats ? `${stats.pending} vụ đang xử lý` : 'Đang tải...'}
                            </span>
                        </div>
                    </div>

                    <div className="bg-slate-900/60 backdrop-blur border border-slate-800 rounded-xl p-4 flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${
                            hasEmergency
                                ? "bg-red-500/10 text-red-400 border-red-500/20 animate-pulse"
                                : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        }`}>
                            <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div>
                            <span className="text-[10px] text-slate-500 uppercase font-black block">Cấp cảnh báo</span>
                            <span className="text-sm font-bold text-slate-200">
                                {hasEmergency ? "🚨 BÁO ĐỘNG" : "🟢 BÌNH THƯỜNG"}
                            </span>
                        </div>
                    </div>

                    <div className="bg-slate-900/60 backdrop-blur border border-slate-800 rounded-xl p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
                            <Megaphone className="w-5 h-5" />
                        </div>
                        <div>
                            <span className="text-[10px] text-slate-500 uppercase font-black block">Bản tin BCH mới</span>
                            <span className="text-sm font-bold text-slate-200">
                                {notifications ? `${notifications.length} bản tin` : 'Đang tải...'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Tiêu đề trang chính */}
                <div className="text-center space-y-2 mt-4">
                    <h1 className="text-3xl md:text-5xl font-black tracking-tight uppercase">
                        Cổng Hỗ Trợ Thiên Tai <br className="md:hidden" />
                        <span className="bg-gradient-to-r from-red-500 via-amber-400 to-emerald-400 bg-clip-text text-transparent">
                            Bát Xát
                        </span>
                    </h1>
                    <p className="text-slate-400 text-sm md:text-base max-w-xl mx-auto">
                        Hệ thống định vị cứu hộ ứng dụng công nghệ bản đồ số, bảo vệ an toàn cho người dân toàn huyện 24/7.
                    </p>
                </div>

                {/* Grid chứa các thẻ điều hướng */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
                    {features.map((item, idx) => {
                        const Icon = item.icon;
                        return (
                            <Link href={item.href} key={idx} className="group">
                                <div className={`h-full bg-slate-900/60 backdrop-blur border rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:bg-slate-900 flex flex-col justify-between ${item.color} ${item.shadow}`}>
                                    <div>
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-all duration-300 ${item.iconBg}`}>
                                            <Icon className="w-6 h-6" />
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-100 mb-2 group-hover:text-white">
                                            {item.title}
                                        </h3>
                                        <p className="text-slate-400 text-xs md:text-sm leading-relaxed mb-4">
                                            {item.desc}
                                        </p>
                                    </div>
                                    <div className="flex items-center text-xs font-bold text-slate-400 group-hover:text-slate-200 transition-colors pt-2">
                                        Truy cập ngay &rarr;
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>

                {/* Bảng Tin Thông Báo Chính Thức (Feature #5) */}
                <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                        <Megaphone className="w-5 h-5 text-emerald-400" />
                        <h2 className="text-lg font-bold text-slate-100 uppercase tracking-wide">
                            📋 Thông Báo Mới Từ Ban Chỉ Huy
                        </h2>
                    </div>

                    <div className="space-y-3">
                        {notifications.length > 0 ? (
                            notifications.map((n) => {
                                const isEmergency = n.title.includes("Sơ Tán") || n.title.includes("khẩn cấp") || n.title.includes("Khẩn Cấp");
                                return (
                                    <div
                                        key={n.notifyId}
                                        className={`p-4 rounded-xl border transition-all ${
                                            isEmergency
                                                ? "bg-red-950/15 border-red-500/20"
                                                : n.isPersonal
                                                    ? "bg-sky-950/15 border-sky-500/20"
                                                    : "bg-slate-900/60 border-slate-800/80"
                                        }`}
                                    >
                                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    {isEmergency ? (
                                                        <span className="px-2 py-0.5 bg-red-600 text-white rounded text-[9px] font-black uppercase tracking-wider animate-pulse">
                                                            Khẩn cấp
                                                        </span>
                                                    ) : n.isPersonal ? (
                                                        <span className="px-2 py-0.5 bg-sky-500/25 border border-sky-400/30 text-sky-300 rounded text-[9px] font-black uppercase tracking-wider">
                                                            Cá nhân
                                                        </span>
                                                    ) : (
                                                        <span className="px-2 py-0.5 bg-slate-800 text-slate-400 rounded text-[9px] font-bold uppercase tracking-wider">
                                                            Tin báo
                                                        </span>
                                                    )}
                                                    <h4 className="font-extrabold text-slate-200 text-sm">{n.title}</h4>
                                                </div>
                                                <p className="text-slate-350 text-xs leading-relaxed">{n.content}</p>
                                            </div>
                                            <span className="text-[10px] text-slate-500 font-mono shrink-0 sm:text-right mt-1 sm:mt-0">
                                                {n.time}
                                            </span>
                                        </div>
                                        {n.targetArea && (
                                            <div className="mt-2 text-[10px] text-slate-550 font-bold">
                                                Khu vực: {n.targetArea}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        ) : (
                            <div className="text-center py-8 text-slate-500 text-xs border border-dashed border-slate-850 rounded-xl">
                                Chưa có thông báo chính thức nào được phát đi.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}