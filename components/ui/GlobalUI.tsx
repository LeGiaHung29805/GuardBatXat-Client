"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ApiClient, setAuthToken } from "@/lib/ApiClient"; // Đã thêm setAuthToken
import SosButton from "@/components/ui/SosButton";
import websocket from "@/app/commander/utils/websocket";
import ToastContainer, { showToast } from "@/components/ui/Toast";

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

    // Kiểm tra đăng nhập ngay khi load trang
    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem("jwt_token");
            if (token) {
                // Phục hồi token vào Axios Instance khi tải lại trang
                setAuthToken(token);
                try {
                    const res = await ApiClient.getMyProfile();
                    setIsLoggedIn(true);
                    setUserName(res.data.fullName);
                    setUserRole(res.data.roleName); // Đã sửa thành roleName do dùng MapStruct
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
            // Nếu người dùng là Citizen hoặc Guest thì mới hiển thị popup báo động
            if (userRole === "CITIZEN" || userRole === "GUEST") {
                // Tính khoảng cách nếu có tọa độ trung tâm và bán kính
                if (data.centerLat && data.centerLng && data.radius && "geolocation" in navigator) {
                    navigator.geolocation.getCurrentPosition(
                        (pos) => {
                            const userLat = pos.coords.latitude;
                            const userLng = pos.coords.longitude;
                            
                            // Hàm tính khoảng cách Haversine (m)
                            const R = 6371e3; // metres
                            const φ1 = userLat * Math.PI/180;
                            const φ2 = data.centerLat * Math.PI/180;
                            const Δφ = (data.centerLat - userLat) * Math.PI/180;
                            const Δλ = (data.centerLng - userLng) * Math.PI/180;

                            const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                                    Math.cos(φ1) * Math.cos(φ2) *
                                    Math.sin(Δλ/2) * Math.sin(Δλ/2);
                            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                            const distance = R * c; // in metres

                            if (distance <= data.radius) {
                                showToast("danger", data.title || "⚠️ LỆNH TỪ BAN CHỈ HUY", data.content || "Có lệnh sơ tán khẩn cấp.");
                            } else {
                                console.log("Bạn nằm ngoài vùng nguy hiểm. Khoảng cách: ", distance);
                            }
                        },
                        (err) => {
                            // Không lấy được GPS -> Mặc định vẫn cảnh báo để an toàn
                            showToast("danger", data.title || "⚠️ LỆNH TỪ BAN CHỈ HUY", data.content || "Có lệnh sơ tán khẩn cấp.");
                        }
                    );
                } else {
                    // Cảnh báo chung toàn vùng
                    showToast("danger", data.title || "⚠️ LỆNH TỪ BAN CHỈ HUY", data.content || "Có lệnh sơ tán khẩn cấp.");
                }
            }
        };

        websocket.on("MANUAL_ALERT", handleAlert);

        return () => {
            websocket.off("MANUAL_ALERT", handleAlert);
        };
    }, [userRole]);

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
        </>
    );
}