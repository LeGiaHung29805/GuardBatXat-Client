"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ApiClient, setAuthToken } from "@/lib/ApiClient";
import SosButton from "@/components/ui/SosButton";
import websocket from "@/app/commander/utils/websocket";
import ToastContainer, { showToast } from "@/components/ui/Toast";
import { Bell, BellRing, X, AlertOctagon, MapPin, Navigation } from "lucide-react";
import { NotificationItem } from "@/lib/Model";

type RescueTrackingUpdate = {
    missionId?: string | number;
    sosId?: string | number;
    status?: string;
    message?: string;
    lat?: number;
    lng?: number;
    remainingKm?: number;
    timestamp?: string;
};

type RescueTrackingPoint = {
    lat: number;
    lng: number;
    remainingKm?: number;
    timestamp?: string;
};

const RESCUE_TRACKING_STORAGE_KEY = "rescue:latest-tracking-update";
const RESCUE_TRACKING_HISTORY_KEY_PREFIX = "rescue:tracking-history:";
const RESCUE_TRACKING_EVENT_NAME = "rescue-tracking-update";
const TRACKING_UPDATE_MAX_AGE_MS = 6 * 60 * 60 * 1000;
const MAX_TRACKING_HISTORY_POINTS = 700;

const getTrackingHistoryStorageKey = (missionId: string | number) =>
    `${RESCUE_TRACKING_HISTORY_KEY_PREFIX}${missionId}`;

const appendTrackingHistoryUpdate = (data: RescueTrackingUpdate) => {
    if (!data.missionId || typeof data.lat !== "number" || typeof data.lng !== "number") return;

    const historyKey = getTrackingHistoryStorageKey(data.missionId);
    let history: RescueTrackingPoint[] = [];

    try {
        const parsed = JSON.parse(localStorage.getItem(historyKey) || "[]");
        if (Array.isArray(parsed)) {
            history = parsed.filter((point): point is RescueTrackingPoint =>
                typeof point?.lat === "number" &&
                typeof point?.lng === "number",
            );
        }
    } catch {
        history = [];
    }

    const nextPoint: RescueTrackingPoint = {
        lat: data.lat,
        lng: data.lng,
        remainingKm: data.remainingKm,
        timestamp: data.timestamp,
    };

    const lastPoint = history[history.length - 1];
    const nextHistory = lastPoint?.lat === nextPoint.lat && lastPoint?.lng === nextPoint.lng
        ? history
        : [...history, nextPoint].slice(-MAX_TRACKING_HISTORY_POINTS);

    localStorage.setItem(historyKey, JSON.stringify(nextHistory));
};

const parseStoredTrackingUpdate = (value: string | null): RescueTrackingUpdate | null => {
    if (!value) return null;

    try {
        const parsed = JSON.parse(value) as RescueTrackingUpdate;
        if (!parsed || typeof parsed !== "object") return null;

        if (parsed.timestamp) {
            const timestamp = Date.parse(parsed.timestamp);
            if (!Number.isNaN(timestamp) && Date.now() - timestamp > TRACKING_UPDATE_MAX_AGE_MS) {
                return null;
            }
        }

        return parsed;
    } catch {
        return null;
    }
};

export default function GlobalUI() {
    const router = useRouter();
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [isLoginMode, setIsLoginMode] = useState(true);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    // Trạng thái người dùng
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userRole, setUserRole] = useState<string>("GUEST");
    const [userName, setUserName] = useState<string>("");
    const [showGreeting, setShowGreeting] = useState(false);
    const [userId, setUserId] = useState<number | null>(null);

    // Mới: Trạng thái thông báo và popup
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [unreadCount, setUnreadCount] = useState<number>(0);
    const [isBellPanelOpen, setIsBellPanelOpen] = useState(false);
    const [activeAlert, setActiveAlert] = useState<{ title: string; content: string; targetArea?: string } | null>(null);
    const [alertCountdown, setAlertCountdown] = useState(30);

    const [rescueTracking, setRescueTracking] = useState<RescueTrackingUpdate | null>(null);
    const [isTrackingCollapsed, setIsTrackingCollapsed] = useState(false);

    // Tự động ẩn lời chào sau 3 giây
    useEffect(() => {
        if (isLoggedIn && userName) {
            setShowGreeting(true);
            const timer = setTimeout(() => {
                setShowGreeting(false);
            }, 3000);
            return () => clearTimeout(timer);
        } else {
            setShowGreeting(false);
        }
    }, [isLoggedIn, userName]);

    const [formData, setFormData] = useState({
        identifier: "",
        emailOrPhone: "",
        password: "",
        fullName: "",
    });

    // Lấy thông báo ban đầu & tính unread
    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const res = await ApiClient.getPublicNotifications();
                if (res.code === 200 && res.data) {
                    const filtered = res.data.filter((n: any) => {
                        const isRescue = 
                            n.targetArea?.includes("RESCUE_LOG") || 
                            n.title?.includes("Field Update") || 
                            n.title?.includes("cứu hộ") || 
                            n.title?.includes("Cứu hộ");
                        return !isRescue || !!userId;
                    });
                    setNotifications(filtered);
                    const lastReadId = Number(localStorage.getItem("last_read_notify_id") || "0");
                    const unread = filtered.filter((n: any) => n.notifyId > lastReadId).length;
                    setUnreadCount(unread);
                }
            } catch (err) {
                console.error("Lỗi lấy thông báo:", err);
            }
        };
        if (userRole === "CITIZEN" || userRole === "GUEST") {
            fetchNotifications();
        }
    }, [userRole, userId]);

    // Đồng hồ đếm ngược 30 giây cho cảnh báo khẩn cấp real-time
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (activeAlert && alertCountdown > 0) {
            timer = setTimeout(() => {
                setAlertCountdown(prev => prev - 1);
            }, 1000);
        } else if (activeAlert && alertCountdown === 0) {
            setActiveAlert(null); // tự động đóng về chuông
        }
        return () => clearTimeout(timer);
    }, [activeAlert, alertCountdown]);

    // Kiểm tra đăng nhập ngay khi load trang
    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem("jwt_token");
            if (token) {
                setAuthToken(token);
                try {
                    const res = await ApiClient.getMyProfile();
                    setIsLoggedIn(true);
                    setUserName(res.data.fullName);
                    setUserRole(res.data.roleName);
                    setUserId(res.data.userId);
                } catch (error) {
                    localStorage.removeItem("jwt_token");
                    setAuthToken(null);
                    setIsLoggedIn(false);
                    setUserRole("GUEST");
                }
            }
        };
        checkAuth();

        // Đăng ký nhận thông báo cảnh báo toàn cục (Global Alert) từ Commander
        const token = localStorage.getItem("jwt_token") || "guest";
        websocket.connect(token);
        const handleAlert = (data: any) => {
            if (userRole === "CITIZEN" || userRole === "GUEST") {
                // Nếu là thông báo cá nhân dành riêng cho user khác, bỏ qua
                if (data.targetUser && data.targetUser !== userId) {
                    return;
                }

                // Nếu là thông báo cứu hộ/nhật ký hiện trường nhưng là khách vãng lai, bỏ qua
                const isRescueMsg = 
                    data.level === "Cứu hộ" || 
                    data.title?.includes("cứu hộ") || 
                    data.title?.includes("Cứu hộ") || 
                    data.title?.includes("Field Update") || 
                    data.targetArea?.includes("RESCUE_LOG");
                
                if (isRescueMsg && !userId) {
                    return;
                }

                const triggerLiveAlert = () => {
                    setActiveAlert({
                        title: data.title || "Lệnh Sơ Tán Khẩn Cấp",
                        content: data.content || "Yêu cầu di chuyển khẩn cấp.",
                        targetArea: data.targetArea
                    });
                    setAlertCountdown(30);

                    // Thêm trực tiếp vào state thông báo
                    const newNotify: NotificationItem = {
                        notifyId: data.notifyId || Date.now(),
                        title: data.title || "Cảnh báo khẩn cấp",
                        content: data.content || "Có thông báo mới.",
                        targetArea: data.targetArea || "Huyện Bát Xát",
                        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                    };
                    setNotifications(prev => [newNotify, ...prev]);
                    setUnreadCount(prev => prev + 1);
                };

                // Tính khoảng cách nếu có tọa độ trung tâm và bán kính
                if (data.centerLat && data.centerLng && data.radius && "geolocation" in navigator) {
                    navigator.geolocation.getCurrentPosition(
                        (pos) => {
                            const userLat = pos.coords.latitude;
                            const userLng = pos.coords.longitude;

                            const R = 6371e3;
                            const φ1 = userLat * Math.PI / 180;
                            const φ2 = data.centerLat * Math.PI / 180;
                            const Δφ = (data.centerLat - userLat) * Math.PI / 180;
                            const Δλ = (data.centerLng - userLng) * Math.PI / 180;

                            const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                                Math.cos(φ1) * Math.cos(φ2) *
                                Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
                            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                            const distance = R * c;

                            if (distance <= data.radius) {
                                triggerLiveAlert();
                                showToast("danger", data.title || "⚠️ LỆNH TỪ BAN CHỈ HUY", data.content || "Có lệnh sơ tán khẩn cấp.");
                            } else {
                                console.log("Bạn nằm ngoài vùng nguy hiểm. Khoảng cách: ", distance);
                            }
                        },
                        (err) => {
                            triggerLiveAlert();
                            showToast("danger", data.title || "⚠️ LỆNH TỪ BAN CHỈ HUY", data.content || "Có lệnh sơ tán khẩn cấp.");
                        }
                    );
                } else {
                    triggerLiveAlert();
                    showToast("danger", data.title || "⚠️ LỆNH TỪ BAN CHỈ HUY", data.content || "Có lệnh sơ tán khẩn cấp.");
                }
            }
        };

        websocket.on("MANUAL_ALERT", handleAlert);

        websocket.subscribe("/topic/rescue-tracking", (data: RescueTrackingUpdate) => {
            if (userRole === "CITIZEN" || userRole === "GUEST") {
                setRescueTracking(data);
                try {
                    appendTrackingHistoryUpdate(data);
                    localStorage.setItem(RESCUE_TRACKING_STORAGE_KEY, JSON.stringify(data));
                    window.dispatchEvent(new CustomEvent(RESCUE_TRACKING_EVENT_NAME, { detail: data }));
                } catch {
                    // Browser storage can be unavailable in private modes.
                }
            }
        });

        return () => {
            websocket.off("MANUAL_ALERT", handleAlert);
            websocket.unsubscribe("/topic/rescue-tracking");
        };
    }, [userRole, userId]);

    useEffect(() => {
        if (userRole !== "CITIZEN" && userRole !== "GUEST") return;

        const applyTrackingUpdate = (data: RescueTrackingUpdate | null) => {
            if (data) setRescueTracking(data);
        };

        applyTrackingUpdate(parseStoredTrackingUpdate(localStorage.getItem(RESCUE_TRACKING_STORAGE_KEY)));

        const handleStorageTracking = (event: StorageEvent) => {
            if (event.key !== RESCUE_TRACKING_STORAGE_KEY) return;
            applyTrackingUpdate(parseStoredTrackingUpdate(event.newValue));
        };

        const handleLocalTracking = (event: Event) => {
            applyTrackingUpdate((event as CustomEvent<RescueTrackingUpdate>).detail);
        };

        window.addEventListener("storage", handleStorageTracking);
        window.addEventListener(RESCUE_TRACKING_EVENT_NAME, handleLocalTracking);

        return () => {
            window.removeEventListener("storage", handleStorageTracking);
            window.removeEventListener(RESCUE_TRACKING_EVENT_NAME, handleLocalTracking);
        };
    }, [userRole, userId]);

    const handleToggleBellPanel = () => {
        setIsBellPanelOpen(prev => !prev);
        if (!isBellPanelOpen) {
            setUnreadCount(0);
            if (notifications.length > 0) {
                const maxId = Math.max(...notifications.map(n => n.notifyId || 0));
                localStorage.setItem("last_read_notify_id", maxId.toString());
            }
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleAuthSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg("");

        try {
            if (isLoginMode) {
                const res = await ApiClient.login({
                    identifier: formData.identifier,
                    password: formData.password,
                });

                const token = res.data;
                localStorage.setItem("jwt_token", token);

                setAuthToken(token);

                const profileRes = await ApiClient.getMyProfile();
                setIsLoggedIn(true);
                setUserName(profileRes.data.fullName);
                const roleName = profileRes.data.roleName;
                setUserRole(roleName);
                setUserId(profileRes.data.userId);

                setIsAuthModalOpen(false);

                // Chuyển hướng theo Role sau khi đăng nhập thành công
                if (roleName === "RESCUE_TEAM") {
                    router.push("/rescue");
                } else if (roleName === "ADMIN") {
                    router.push("/admin");
                } else {
                    // Nếu đang ở trang chủ, có thể chuyển sang trang sơ tán
                    if (window.location.pathname === "/") {
                        router.push("/citizen/evacuation");
                    }
                }
            } else {
                await ApiClient.register({
                    emailOrPhone: formData.emailOrPhone,
                    password: formData.password,
                    fullName: formData.fullName,
                    roleName: "CITIZEN",
                });
                setIsLoginMode(true);
                setErrorMsg("Đăng ký thành công! Hãy đăng nhập.");
            }
        } catch (error: any) {
            setErrorMsg(error.message || "Lỗi xác thực.");
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("jwt_token");
        setAuthToken(null);
        setIsLoggedIn(false);
        setUserRole("GUEST");
        setUserName("");
        setUserId(null);

        // Thoát về trang chủ (màn hình lúc mới chạy) thay vì chỉ refresh tại chỗ
        window.location.href = "/";
    };
    return (
        <>
            <ToastContainer />
            <div className="fixed top-4 right-4 z-50 flex items-center gap-4">
                {isLoggedIn ? (
                    <div className="flex items-center gap-3 bg-slate-900/80 backdrop-blur border border-slate-700 p-2 rounded-full shadow-lg">
                        {showGreeting && (
                            <span className="text-emerald-400 text-sm font-medium px-2 transition-all duration-500 animate-in fade-in slide-in-from-right-2">
                                Chào, {userName === "Doi cuu ho Bat Xat" ? "Đội cứu hộ Bát Xát" : userName}
                            </span>
                        )}
                        <button
                            onClick={handleLogout}
                            className="bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white text-xs py-1 px-3 rounded-full transition-colors"
                        >
                            Thoát
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => setIsAuthModalOpen(true)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-6 rounded-full shadow-lg transition-transform hover:scale-105"
                    >
                        Đăng nhập
                    </button>
                )}
            </div>

            {/* 2. AUTH MODAL (POPUP ĐĂNG NHẬP/ĐĂNG KÝ) */}
            {isAuthModalOpen && !isLoggedIn && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-slate-800 border border-slate-700 w-full max-w-md rounded-2xl p-6 relative shadow-2xl">

                        {/* Nút Đóng Modal */}
                        <button
                            onClick={() => setIsAuthModalOpen(false)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-white"
                        >
                            ✕
                        </button>

                        <h2 className="text-2xl font-bold text-center mb-6 text-emerald-400">
                            {isLoginMode ? "Đăng nhập" : "Tạo tài khoản"}
                        </h2>

                        {errorMsg && (
                            <div className={`text-sm p-3 rounded mb-4 text-center ${errorMsg.includes('thành công') ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/50' : 'bg-red-500/10 text-red-400 border border-red-500/50'}`}>
                                {errorMsg}
                            </div>
                        )}

                        <form onSubmit={handleAuthSubmit} className="space-y-4 text-slate-200">
                            {!isLoginMode && (
                                <div>
                                    <label className="block text-sm mb-1 text-slate-400">Họ và tên</label>
                                    <input
                                        type="text"
                                        name="fullName"
                                        required
                                        value={formData.fullName}
                                        onChange={handleChange}
                                        className="w-full bg-slate-900 border border-slate-700 rounded px-4 py-2 focus:ring-1 focus:ring-emerald-500 outline-none"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-sm mb-1 text-slate-400">Email hoặc SĐT</label>
                                <input
                                    type="text"
                                    name={isLoginMode ? "identifier" : "emailOrPhone"}
                                    required
                                    value={isLoginMode ? formData.identifier : formData.emailOrPhone}
                                    onChange={handleChange}
                                    className="w-full bg-slate-900 border border-slate-700 rounded px-4 py-2 focus:ring-1 focus:ring-emerald-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm mb-1 text-slate-400">Mật khẩu</label>
                                <input
                                    type="password"
                                    name="password"
                                    required
                                    value={formData.password}
                                    onChange={handleChange}
                                    className="w-full bg-slate-900 border border-slate-700 rounded px-4 py-2 focus:ring-1 focus:ring-emerald-500 outline-none"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded mt-2 disabled:opacity-50"
                            >
                                {loading ? "Đang xử lý..." : isLoginMode ? "Đăng nhập" : "Đăng ký"}
                            </button>
                        </form>

                        <div className="mt-4 text-center text-sm">
                            <button
                                onClick={() => { setIsLoginMode(!isLoginMode); setErrorMsg(""); }}
                                className="text-emerald-400 hover:underline"
                            >
                                {isLoginMode ? "Chưa có tài khoản? Đăng ký" : "Đã có tài khoản? Đăng nhập"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 3. NÚT SOS NỔI TOÀN CỤC */}
            {/* Logic: Chỉ hiện nút SOS nếu là Khách vãng lai (GUEST) hoặc Người dân (CITIZEN). Giấu đi với ADMIN hoặc RESCUE_TEAM */}
            {(userRole === "GUEST" || userRole === "CITIZEN") && (
                <div className="fixed bottom-4 right-4 z-50">
                    <SosButton />
                </div>
            )}

            {/* 4. NÚT CHUÔNG CẢNH BÁO NỔI & PANEL THÔNG BÁO */}
            {(userRole === "GUEST" || userRole === "CITIZEN") && (
                <div className="fixed bottom-24 right-6 z-50 flex flex-col items-end">
                    {/* Panel thông báo */}
                    {isBellPanelOpen && (
                        <div className="mb-3 w-80 sm:w-96 bg-slate-900/95 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md animate-fade-in-up">
                            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/60">
                                <span className="font-extrabold text-sm text-slate-200 flex items-center gap-1.5">
                                    <Bell className="w-4 h-4 text-emerald-400" />
                                    Thông báo Ban chỉ huy
                                </span>
                                <button
                                    onClick={() => setIsBellPanelOpen(false)}
                                    className="text-slate-500 hover:text-slate-200"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="max-h-80 overflow-y-auto p-3 space-y-2.5">
                                {notifications.length > 0 ? (
                                    notifications.map((n) => (
                                        <div
                                            key={n.notifyId}
                                            className={`p-3 rounded-xl border text-xs space-y-1.5 transition-all ${n.title.includes("Sơ Tán") || n.title.includes("khẩn cấp") || n.title.includes("Khẩn Cấp")
                                                ? "bg-red-950/15 border-red-500/20 animate-pulse"
                                                : n.isPersonal
                                                    ? "bg-sky-950/15 border-sky-500/20"
                                                    : "bg-slate-950/40 border-slate-800"
                                                }`}
                                        >
                                            <div className="flex justify-between items-start">
                                                <h4 className="font-bold text-slate-200 flex items-center flex-wrap gap-1">
                                                    {n.isPersonal && (
                                                        <span className="px-1.5 py-0.5 bg-sky-500/25 border border-sky-400/30 text-sky-300 rounded text-[9px] font-black uppercase tracking-wider shrink-0">
                                                            Cá nhân
                                                        </span>
                                                    )}
                                                    {n.title}
                                                </h4>
                                                <span className="text-[10px] text-slate-500 font-mono shrink-0 ml-2">{n.time}</span>
                                            </div>
                                            <p className="text-slate-400 leading-relaxed font-medium">{n.content}</p>
                                            {n.targetArea && (
                                                <span className="inline-block px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded text-[9px] font-bold">
                                                    Khu vực: {n.targetArea}
                                                </span>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div className="py-8 text-center text-slate-500 text-xs">
                                        Chưa có thông báo nào từ Ban chỉ huy.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Nút chuông */}
                    <button
                        onClick={handleToggleBellPanel}
                        className={`w-14 h-14 rounded-full flex items-center justify-center border shadow-2xl relative transition-all duration-300 active:scale-95 ${unreadCount > 0
                            ? "bg-red-600 hover:bg-red-700 border-red-500 text-white animate-pulse"
                            : "bg-slate-900/90 hover:bg-slate-800 border-slate-700 text-slate-300"
                            }`}
                        title="Thông báo từ Ban chỉ huy"
                    >
                        {unreadCount > 0 ? (
                            <BellRing className="w-6 h-6 animate-bounce" />
                        ) : (
                            <Bell className="w-6 h-6" />
                        )}

                        {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 bg-amber-400 border border-slate-950 text-slate-950 font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center">
                                {unreadCount}
                            </span>
                        )}
                    </button>
                </div>
            )}

            {/* 5. LIVE ALERT OVERLAY CARD (Tự đóng sau 30s) */}
            {activeAlert && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
                    <div className="relative max-w-md w-full bg-slate-900 border-2 border-red-500 rounded-3xl p-6 shadow-2xl shadow-red-950/50 space-y-4 overflow-hidden animate-fade-in-up">
                        {/* Top red warning bar */}
                        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-600 via-amber-500 to-red-600"></div>

                        <div className="flex items-center gap-3 text-red-500">
                            <AlertOctagon className="w-8 h-8 shrink-0 animate-pulse" />
                            <h3 className="text-lg font-black uppercase tracking-wide">Lệnh từ Ban chỉ huy</h3>
                        </div>

                        <div className="space-y-2">
                            <h4 className="text-xl font-bold text-white leading-tight">{activeAlert.title}</h4>
                            <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">{activeAlert.content}</p>
                            {activeAlert.targetArea && (
                                <div className="flex items-center gap-1.5 text-xs text-amber-400 font-bold bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg w-fit">
                                    <MapPin className="w-3.5 h-3.5" />
                                    Vùng ảnh hưởng: {activeAlert.targetArea}
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                            <span className="text-xs text-slate-400 font-medium">
                                Tự động thu gọn sau <span className="font-mono font-bold text-red-400 text-sm">{alertCountdown}</span> giây
                            </span>
                            <button
                                onClick={() => setActiveAlert(null)}
                                className="px-5 py-2 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all"
                            >
                                Đóng / Xem sau
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 6. THEO DÕI HÀNH TRÌNH CỨU HỘ DI CHUYỂN */}
            {(userRole === "GUEST" || userRole === "CITIZEN") && rescueTracking && isTrackingCollapsed && (
                <button
                    type="button"
                    onClick={() => setIsTrackingCollapsed(false)}
                    className="fixed bottom-24 left-4 z-50 flex max-w-[calc(100vw-2rem)] items-center gap-2 rounded-full border border-cyan-400/40 bg-slate-950/90 px-3 py-2 text-white shadow-2xl backdrop-blur-md hover:border-cyan-300 hover:bg-slate-900"
                    aria-label="Mở theo dõi cứu hộ"
                >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-300">
                        <Navigation className="h-4 w-4" />
                    </span>
                    <span className="max-w-40 truncate text-xs font-bold text-cyan-100">
                        {typeof rescueTracking.remainingKm === "number"
                            ? `${rescueTracking.remainingKm} km tới SOS`
                            : "Đội cứu hộ"}
                    </span>
                </button>
            )}

            {(userRole === "GUEST" || userRole === "CITIZEN") && rescueTracking && !isTrackingCollapsed && (
                <div className="fixed bottom-24 left-4 z-50 w-[min(360px,calc(100vw-2rem))] rounded-2xl border border-cyan-400/40 bg-slate-950/90 p-4 text-white shadow-2xl backdrop-blur-md">
                    <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-300">
                            <Navigation className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-xs font-black uppercase tracking-widest text-cyan-300">
                                    Đội cứu hộ đang tới
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setIsTrackingCollapsed(true)}
                                    className="rounded-md px-2 py-1 text-xs font-bold text-slate-400 hover:bg-slate-800 hover:text-white"
                                    aria-label="Ẩn theo dõi cứu hộ"
                                >
                                    Ẩn
                                </button>
                            </div>
                            <p className="mt-1 text-sm font-semibold text-slate-100">
                                {typeof rescueTracking.remainingKm === "number"
                                    ? `Còn khoảng ${rescueTracking.remainingKm} km tới điểm SOS`
                                    : rescueTracking.message || "Đang cập nhật vị trí realtime"}
                            </p>
                            {rescueTracking.message && typeof rescueTracking.remainingKm === "number" && (
                                <p className="mt-1 line-clamp-2 text-xs text-slate-400">{rescueTracking.message}</p>
                            )}
                            {typeof rescueTracking.lat === "number" && typeof rescueTracking.lng === "number" && (
                                <p className="mt-2 font-mono text-[11px] text-slate-500">
                                    {rescueTracking.lat.toFixed(5)}, {rescueTracking.lng.toFixed(5)}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
